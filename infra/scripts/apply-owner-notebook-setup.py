"""Owner-approved local setup: estimated shipping dimensions and managed custom notebook portfolio.
Run in the API environment with /tmp/nilart-notebook-portfolio containing display derivatives.
"""
import base64
import json
import math
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4,uuid5
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request
from nilart.shared.database import engine
from nilart.contexts.catalog.presentation import profiles
from nilart.contexts.media import router as media
from nilart.contexts.catalog.infrastructure.authoring import SqlCatalogAuthoringRepository
from nilart.contexts.catalog.domain.authoring import EntryContent,EntryKind
from nilart.contexts.commissions.notebooks import PORTFOLIO_ID
from nilart.contexts.business import router as business

reason='Owner requested estimated shipping from paper size, sheet count and GSM; bookmark 10x5 cm, 50g; automatic Tapin pricing and custom cover portfolio'
request=Request({'type':'http','headers':[]})
with Session(engine) as db:
 actor=SimpleNamespace(id=db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id LIMIT 1")))
 if not actor.id:raise RuntimeError('Existing admin required')
 rows=db.execute(text("SELECT s.id,s.code,p.slug,d.document FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id LEFT JOIN catalog_product_presentations d ON d.product_id=p.id WHERE p.published AND s.published ORDER BY s.id")).mappings().all()
 count=0
 for row in rows:
  document=row['document'] or {};slug=row['slug'];is_book=document.get('kind')=='book'
  if 'bookmark' in slug:length,width,height,weight=10,5,.3,50
  elif is_book:
   selected=next((c['selections'] for c in document.get('option_combinations',[]) if c['code']==row['code']),{})
   size=selected.get('size','A5').upper();length,width={'A3':(42,29.7),'A4':(29.7,21),'A5':(21,14.8),'A6':(14.8,10.5)}[size]
   specs={s['label']['en'].lower():s['value']['en'] for s in document.get('specifications',[])}
   import re
   paper=' '.join(specs.values())+' '+slug
   gsm_match=re.search(r'(70|80|100|110|127)\s*(?:gsm|g/m|گرم)',paper,re.I)
   gsm=int(gsm_match[1]) if gsm_match else (127 if 'sketchbook' in slug else 80)
   sheets=int(selected.get('sheets','40' if 'sketchbook' in slug else '80'))
   cover_mm=3 if selected.get('cover')=='3mm' else 2
   # Explicit estimates: board density 700kg/m3 + 25g binding; paper caliper .12mm at 100gsm.
   area=length*width/10000
   weight=math.ceil(area*gsm*sheets+2*area*(cover_mm/1000)*700*1000+25)
   height=round((sheets*.12*gsm/100+2*cover_mm+2)/10,2)
  elif 'sticker' in slug:length,width,height,weight=12.7,10,.2,20
  else:continue
  old=profiles.record(db,'skus',row['id'])
  content=profiles.Content.model_validate(old['content'] or {})
  content=content.model_copy(update=dict(delivery='physical',returnable=True,length_cm=length,width_cm=width,height_cm=height,weight_grams=weight,weight_estimated=True))
  body=profiles.Command(expected_version=old['version'],action='publish',content=content,reason=reason)
  result=profiles.save_record(db,actor,'skus',row['id'],uuid4(),body,request)
  if not isinstance(result,dict):raise RuntimeError(f"Profile rejected: {result.body}")
  count+=1
 repo=SqlCatalogAuthoringRepository(db)
 existing=db.scalar(text('SELECT id FROM catalog_collections WHERE id=:id'),dict(id=PORTFOLIO_ID))
 if not existing:
  record=repo.create(EntryKind.COLLECTIONS,PORTFOLIO_ID,actor.id,EntryContent(slug='custom-notebook-portfolio',title_fa='نمونه‌کار دفتر اختصاصی',title_en='Custom notebook portfolio',description_fa='نمونه‌های طراحی اختصاصی جلد دفتر؛ ثبت درخواست و قیمت نهایی پس از بررسی.',description_en='Custom cover portfolio; final pricing follows review.'),reason)
 else:record=repo.read(EntryKind.COLLECTIONS,PORTFOLIO_ID)
 if not record['published']:repo.publish(EntryKind.COLLECTIONS,PORTFOLIO_ID,actor.id,record['version'],True,reason)
 db.commit()
 folder=Path('/tmp/nilart-notebook-portfolio');gallery=[]
 for item in json.loads((folder/'manifest.json').read_text()):
  aid=uuid5(PORTFOLIO_ID,item['slug']);rid=uuid5(aid,'display-v1')
  body=media.Upload(expected_version=0,action='publish',purpose='public_image',metadata=media.Metadata(title_fa=item['title_fa'],title_en=item['title_en'],alt_fa=item['title_fa'],alt_en=item['title_en'],notes='Owner-approved public cover derivative; original print files and reference photographs remain private.'),file_name=item['file'],content_base64=base64.b64encode((folder/item['file']).read_bytes()).decode(),reason=reason)
  result=media.save_record(db,actor,aid,rid,body,request)
  if not isinstance(result,dict):raise RuntimeError('Media import rejected')
  gallery.append(dict(asset_id=aid,revision_id=rid,alt_fa=item['title_fa'],alt_en=item['title_en']))
 old=profiles.record(db,'collections',PORTFOLIO_ID)
 if not old['version']:
  result=profiles.save_record(db,actor,'collections',PORTFOLIO_ID,uuid4(),profiles.Command(expected_version=0,action='publish',content=profiles.Content(gallery=gallery),reason=reason),request)
  if not isinstance(result,dict):raise RuntimeError('Portfolio publication rejected')
 # Preserve all policies, including the existing free-shipping threshold, but remove manual rate calculation.
 version,settings,_=business.current_settings(db)
 content=settings.model_dump(mode='json')
 for method in content['shipping_methods']:
  if method['active']:
   method.update(carrier='tapin',base_amount='0',per_kg_amount='0',packaging_weight_grams=100,padding_cm=1.0,title_fa='پست پیشتاز — محاسبه خودکار تاپین',title_en='Express post — automatic Tapin quote')
 # This is an owner-authorized import through the same versioned settings writer used by the API.
 result=business.save_record(db,actor,uuid4(),business.Save(expected_version=version,content=business.Settings.model_validate(content),reason=reason),request)
 if not isinstance(result,dict):raise RuntimeError('Settings publication rejected')
 print(f'Published estimated dimensions/weights for {count} SKU profiles, six managed portfolio images, and Tapin shipping mode (no manual fallback).')
