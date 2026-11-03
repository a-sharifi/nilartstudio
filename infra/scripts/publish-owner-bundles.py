"""Owner-authorized initial matching sets, using audited bundle publication logic.
Run in the production API environment. Default previews; --apply publishes.
"""
import inspect
import sys
from types import SimpleNamespace
from uuid import UUID,uuid4,uuid5
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request
from nilart.shared.database import engine
from nilart.contexts.catalog.presentation import bundle_authoring as b
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository

namespace=UUID('460c53e0-22b4-4507-bd32-e54331b67cbc')
with Session(engine) as db:
 actor=SimpleNamespace(id=db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id LIMIT 1")))
 if not actor.id:raise RuntimeError('Existing admin required')
 principal=SqlIdentityRepository(db).principal(actor.id)
 if not all(principal.allows(p) for p in ['catalog.manage','pricing.publish']):raise RuntimeError('Existing admin permissions required')
 # Reuse the exact domain transaction after its HTTP-only session checks.
 source=inspect.getsource(b.save)
 source=source[source.index('def save('):]
 start=source.index('    # Match existing catalogue publication lock')
 domain='def publish_owned_bundle(id,key,body,request,db,actor):\n'+source[start:]
 scope=dict(b.save.__globals__);exec(compile(domain,'<owner-bundle-publication>','exec'),scope)
 for slug,fa,en in [('gav','گاو','Cows'),('love','لاو','Love'),('gorbe','گربه','Cats'),('roh','روح','Ghosts'),('qolche','غولچه','Qolche')]:
  collection=db.scalar(text('SELECT id FROM catalog_collections WHERE slug=:slug AND published'),dict(slug=slug))
  codes=[f'NIL-{slug.upper()}-SKETCHBOOK-A5-KRAFT-DARK-70GSM',f'NIL-{slug.upper()}-NOTEBOOK-A5-WRITING-PAPER' if slug=='love' else f'NIL-{slug.upper()}-BOOKMARK-1']
  components=[];gallery=[];amount=0
  for code in codes:
   row=db.execute(text("SELECT s.id,s.price_amount,s.currency,p.id product_id FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id JOIN inventory_positions i ON i.reference_id=s.id AND i.kind='sku' WHERE s.code=:code AND s.published AND p.published AND i.quantity-i.reserved>=1"),dict(code=code)).mappings().one()
   if row['currency']!='IRT' or row['price_amount'] is None:raise RuntimeError('Unpriced component')
   components.append(dict(sku_id=row['id'],quantity=1,allowed_sku_ids=[row['id']]))
   amount+=row['price_amount']
   profile=db.scalar(text("SELECT content FROM catalog_profiles WHERE kind='products' AND entity_id=:id AND published_revision IS NOT NULL"),dict(id=row['product_id']))
   if not profile or not profile.get('gallery'):raise RuntimeError('Approved component gallery required')
   for image in profile['gallery'][:1]:
    if image['asset_id'] not in [g['asset_id'] for g in gallery]:gallery.append(image)
  title=f'پکیج {fa} — '+('نوشتن و طراحی' if slug=='love' else 'طراحی و نشانک')
  content=b.Content(slug=slug+'-bundle',title_fa=title,title_en=f'{en} — '+('Writing and sketching set' if slug=='love' else 'Sketchbook and bookmark set'),description_fa=('یک دفتر طراحی A5 با کاغذ کرافت ۷۰ گرم و یک دفتر خط‌دار A5، هر دو با طرح لاو.' if slug=='love' else f'یک دفتر طراحی A5 با کاغذ کرافت ۷۰ گرم و یک نشانک هم‌طرح از کالکشن {fa}.')+' تصاویر، طرح اجزای پکیج را نشان می‌دهند. جعبهٔ هدیهٔ جداگانه شامل پکیج نیست.',description_en='One A5 70gsm kraft sketchbook and '+('one matching A5 ruled notebook.' if slug=='love' else 'one matching bookmark.')+' Images show the individual component designs. No separate gift box is included.',collection_ids=[collection],components=components,gallery=gallery,discount_kind='fixed',discount_amount='0',packaging_cost='0',service_cost='0',allow_discount_stacking=False)
  b.validate_dependencies(db,content,True)
  id=uuid5(namespace,slug);old=b.get_record(db,id)
  if old and old['published']:
   print(slug,'already published; preserved');continue
  print(slug,'total_toman',amount,'gallery',len(gallery))
  if '--apply' in sys.argv:
   result=scope['publish_owned_bundle'](id,uuid4(),b.Command(expected_version=old['version'] if old else 0,action='publish',content=content,reason='Owner requested matching gav, love and other collection bundles; sum of existing component sale prices, no discount or added service charge; no stock created'),Request({'type':'http','headers':[]}),db,actor)
   if not isinstance(result,dict):raise RuntimeError('Publication rejected')
 print('Done. Published.' if '--apply' in sys.argv else 'Preview only.')
