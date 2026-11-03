"""Exact discount eligibility and deterministic historical line allocation."""
from datetime import UTC, datetime
from decimal import Decimal, localcontext
from fractions import Fraction
from zoneinfo import ZoneInfo

from sqlalchemy import text

from nilart.contexts.discounts.router import Resource


class DiscountError(ValueError):
    pass


def counts(db, id, owner=None):
    row=db.execute(text("SELECT count(*) FILTER (WHERE state='redeemed') redeemed, count(*) FILTER (WHERE state='reserved') reserved, "
        "count(*) FILTER (WHERE state IN ('reserved','redeemed') AND account_id=CAST(:owner AS uuid)) customer "
        "FROM discount_usage WHERE discount_id=:id"),{'id':id,'owner':owner}).mappings().one()
    return dict(row)


def rule_by_code(db,code):
    row=db.execute(text('SELECT * FROM discount_rules WHERE code=:code'),{'code':code.strip().upper()}).mappings().first()
    if not row:
        raise DiscountError('discount_unavailable')
    return row


def product_matches(db,sku_id,rule):
    row=db.execute(text('SELECT product_id FROM catalog_skus WHERE id=:id'),{'id':sku_id}).mappings().first()
    if not row:
        return False
    product=row['product_id']
    if product in rule.product_ids:
        return True
    for name,ids in [('collection',rule.collection_ids),('category',rule.category_ids)]:
        if ids and db.scalar(text(f"SELECT 1 FROM catalog_product_{'collections' if name=='collection' else 'categories'} WHERE product_id=:id AND {name}_id=ANY(CAST(:ids AS uuid[])) LIMIT 1"),{'id':product,'ids':[str(v) for v in ids]}):
            return True
    return False


def allocate(cents, weights):
    """Largest remainder; stable line ID breaks ties. Totals never exceed capacity."""
    total=sum(weights.values())
    result={key:0 for key in weights}
    if not total or not cents:
        return result
    exact={key:Fraction(cents*weight,total) for key,weight in weights.items()}
    for key,value in exact.items():
        result[key]=value.numerator//value.denominator
    remaining=cents-sum(result.values())
    order=sorted(exact,key=lambda key:(-(exact[key]-result[key]),key))
    for key in order[:remaining]:
        result[key]+=1
    return result


def money(cents):
    return f'{cents//100}.{cents%100:02d}'


def evaluate(db,row,basket,owner,phone,on=None):
    rule=Resource.model_validate(row['content'])
    on=on or datetime.now(UTC).astimezone(ZoneInfo('Asia/Tehran')).date()
    if not rule.active or not rule.valid_from<=on<=rule.valid_to:
        raise DiscountError('discount_not_valid')
    if rule.customer_phones and phone not in rule.customer_phones:
        raise DiscountError('discount_customer_ineligible')
    if rule.first_purchase_only and db.scalar(text("SELECT 1 FROM customer_orders WHERE account_id=:id AND state->>'payment' IN ('paid','refunded','partially_refunded') LIMIT 1"),{'id':owner}):
        raise DiscountError('discount_first_purchase_only')
    used=counts(db,row['id'],owner)
    if (rule.total_limit is not None and used['reserved']+used['redeemed']>=rule.total_limit) or (rule.customer_limit is not None and used['customer']>=rule.customer_limit):
        raise DiscountError('discount_limit_reached')
    scoped=bool(rule.product_ids or rule.collection_ids or rule.category_ids)
    weights={}
    component_rows={}
    component_capacities={}
    for line in basket['lines']:
        if line['issue']:
            raise DiscountError('basket_requires_review')
        q,item=line['quote'],line['item']
        net=Fraction(q['unit'])*item['quantity']
        eligible=net
        if item['kind']=='bundle':
            bases={}
            for index,part in enumerate(q['parts']):
                value=Fraction(part['unit'])*part['quantity']*item['quantity']*100
                if value.denominator!=1:
                    raise DiscountError('discount_precision_unsupported')
                bases[f"{index:04d}:{part['sku_id']}"]=int(value)
            saving=Fraction(q['saving'])*item['quantity']*100
            if saving.denominator!=1 or saving<0 or saving>sum(bases.values()):
                raise DiscountError('discount_precision_unsupported')
            if Fraction(sum(bases.values()),100)!=Fraction(q['base'])*item['quantity'] or Fraction(sum(bases.values())-saving,100)!=net:
                raise DiscountError('basket_requires_review')
            bundle_allocations=allocate(int(saving),bases)
            capacities={}
            rows=[]
            for (key,base),part in zip(bases.items(),q['parts'],strict=True):
                remaining=base-bundle_allocations[key]
                allowed=(not saving or rule.allow_bundle_stacking) and (not scoped or product_matches(db,part['sku_id'],rule))
                capacities[key]=remaining if allowed else 0
                rows.append({'key':key,'sku_id':str(part['sku_id']),'quantity':part['quantity']*item['quantity'],
                    'unit_amount':part['unit'],'base_amount':money(base),'bundle_discount_amount':money(bundle_allocations[key]),
                    'before_code_amount':money(remaining)})
            component_rows[line['id']]=rows
            component_capacities[line['id']]=capacities
            weights[line['id']]=sum(capacities.values())
            continue
        if scoped and (item['kind']!='product' or not product_matches(db,item['item_id'],rule)):
            eligible=Fraction(0)
        # Eligible standalone line amounts round down to historical cents.
        weights[line['id']]=max(0,(eligible*100).numerator//(eligible*100).denominator)
    eligible=sum(weights.values())
    if not eligible or eligible<Fraction(rule.minimum)*100:
        raise DiscountError('discount_minimum_not_met')
    saving=Fraction(eligible,100)*Fraction(rule.value)/100 if rule.kind=='percent' else Fraction(rule.value)
    if rule.maximum:
        saving=min(saving,Fraction(rule.maximum))
    saving=min(saving,Fraction(eligible,100))
    # The coupon benefit is rounded down once to whole toman, then apportioned in cents.
    whole=saving.numerator//saving.denominator
    if whole<=0:
        raise DiscountError('discount_too_small')
    allocations=allocate(whole*100,weights)
    for key,rows in component_rows.items():
        allocated=allocate(allocations[key],component_capacities[key])
        for component in rows:
            cents=allocated[component['key']]
            component['code_discount_amount']=money(cents)
            component['total_amount']=money(int(Fraction(component['before_code_amount'])*100)-cents)
    with localcontext() as context:
        context.prec=80
        total=format(Decimal(basket['totals']['total'])-Decimal(whole),'f')
    return {'discount_id':str(row['id']),'version':row['version'],'code':rule.code,'basket_version':basket['version'],
            'amount':money(whole*100),'eligible':money(eligible),'total':total,
            'allocations':allocations,'components':component_rows}
