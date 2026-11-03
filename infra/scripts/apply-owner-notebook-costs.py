"""Apply owner-confirmed November 2026 costs through audited inventory commands.
Default is a preview; --apply persists the changes. Prices are IRT.
Only explicit A5/A4 GSM variants and bookmarks are included.
"""
import sys
import re
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request
from nilart.shared.database import engine
from nilart.contexts.catalog.infrastructure.prices import SqlSKUPriceRepository
from nilart.contexts.inventory.router import Command
from nilart.contexts.inventory.service import apply_adjustment

COSTS={70:160000,100:190000,110:190000,127:210000}
SALES={'A5':{70:298000,100:398000,110:428000,127:448000},'A4':{70:398000,100:498000,110:598000,127:658000}}
reason='Owner confirmed A5 notebook costs by GSM: 70=160000,100=190000,110=190000,127=210000 IRT; A4 double; writing notebook A5=350000/A4=700000 IRT; A3 unavailable. Earlier confirmed one test unit per variant, bookmark sale150000/cost30000 IRT.'
with Session(engine) as db:
    db.execute(text('SELECT pg_advisory_xact_lock(78214,35)'))
    actor=SimpleNamespace(id=db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id LIMIT 1")))
    if not actor.id: raise RuntimeError('Existing administrator required')
    rows=db.execute(text("SELECT s.id,s.code,p.slug FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE p.slug LIKE '%bookmark%' OR p.slug LIKE '%sketchbook%' OR p.slug LIKE '%notebook%' ORDER BY s.code")).mappings().all()
    plans=[]; skipped=[]
    for row in rows:
        code=row['code']; match=re.search(r'-(A[45])-.+?-(70|100|110|127)GSM$',code)
        if 'bookmark' in row['slug']: cost=30000; sale=150000
        elif re.search(r'-NOTEBOOK-A[45]-WRITING-PAPER$',code): cost=350000 * (2 if '-A4-' in code else 1); sale=1398000 if '-A4-' in code else 598000
        elif match: cost=COSTS[int(match[2])] * (2 if match[1]=='A4' else 1); sale=SALES[match[1]][int(match[2])]
        else: skipped.append(code); continue
        plans.append((row,cost,sale))
    if not plans: raise RuntimeError('No matching variants')
    for row,cost,sale in plans:
        print(f"{row['code']}: unit_cost={cost} IRT"+(f', sale={sale} IRT' if sale else ''))
    print(f'Matched {len(plans)} variants; skipped {len(skipped)} A3/writing-paper variants.')
    if '--apply' not in sys.argv: sys.exit(0)
    for sku,cost,sale in plans:
        repo=SqlSKUPriceRepository(db)
        if sale is not None:
            old=repo.read(sku['id'])
            if not old['price'] or Decimal(old['price']['amount'])!=sale or old['price']['currency']!='IRT':
                repo.save(sku['id'],actor.id,old['version'],dict(amount=Decimal(sale),currency='IRT'))
        pos=db.execute(text("SELECT * FROM inventory_positions WHERE kind='sku' AND reference_id=:id FOR UPDATE"),dict(id=sku['id'])).mappings().first()
        version=pos['version'] if pos else 0
        qty=pos['quantity'] if pos else Decimal(0)
        def adjust(action,quantity='0',value=None):
            global version
            result=apply_adjustment(db,actor,Request({'type':'http','headers':[]}),uuid4(),Command(kind='sku',reference_id=sku['id'],expected_version=version,action=action,quantity=quantity,value=value,reason=reason),commit=False)
            if not isinstance(result,dict): raise RuntimeError('Inventory command rejected; entire transaction rolled back')
            version+=1
        if not pos:
            adjust('opening','1',str(cost));qty=Decimal(1)
        elif qty==0:
            # Existing zero stock may represent a real sale; never replenish it implicitly.
            raise RuntimeError('Existing zero stock requires explicit review')
        value= db.scalar(text("SELECT value FROM inventory_positions WHERE kind='sku' AND reference_id=:id"),dict(id=sku['id']))
        if value != qty*cost: adjust('revalue',value=str(qty*cost))
    from nilart.contexts.catalog.infrastructure.sku_authoring import SqlSKUAuthoringRepository
    authoring=SqlSKUAuthoringRepository(db)
    removed=0
    for row in rows:
        if '-A3-' not in row['code']: continue
        old=authoring.read(row['id'])
        if old['published']:
            authoring.publication(row['id'],actor.id,old['version'],False,'Owner requested A3 variants unavailable for now, November 2026')
            removed+=1
    db.commit()
    print(f'A3 variants unpublished: {removed}')
    print(f'COMMITTED {len(plans)} variants; sales set from owner-provided price-list image; existing quantities preserved.')
