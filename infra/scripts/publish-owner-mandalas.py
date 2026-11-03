"""Owner-approved forty original framed A5 mandalas; deterministic identities and audits."""
import base64,inspect,json,runpy,sys
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID,uuid4,uuid5
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request
from nilart.shared.database import engine
from nilart.contexts.catalog.presentation import artwork_authoring as a
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.inventory.router import Command
from nilart.contexts.inventory.service import apply_adjustment
folder=Path(sys.argv[1]);media=SimpleNamespace(**runpy.run_path(str(folder/'media_helper.py')))
ns=UUID('249df780-ddc1-4e88-8083-b95078ae199a');request=Request({'type':'http','headers':[]})
reason='Owner approved 40 distinct mandala mixed-media originals by Niloufar Moradi, A5 14.8x21cm, framed sale1000000 IRT each, one unit, estimated weight500g; duplicate source photographs omitted.'
with Session(engine) as db:
 actor=SimpleNamespace(id=db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id LIMIT 1")))
 if not actor.id:raise RuntimeError('Existing admin required')
 principal=SqlIdentityRepository(db).principal(actor.id)
 if not all(principal.allows(p) for p in ['catalog.manage','pricing.publish','inventory.manage','content.manage']):raise RuntimeError('Existing permissions required')
 source=inspect.getsource(a.save);source=source[source.index('def save('):];start=source.index('    db.execute(text("SELECT pg_advisory_xact_lock')
 scope=dict(a.save.__globals__);exec(compile('def publish_owned(id,key,body,request,db,actor):\n'+source[start:],'<owner-artwork-publication>','exec'),scope)
 for index,item in enumerate(json.loads((folder/'manifest.json').read_text())['items'],1):
  slug='mandala-'+item['source'].rsplit('.',1)[0].lower().replace('_','-');id=uuid5(ns,slug);aid=uuid5(id,'image');rid=uuid5(aid,'web-v1')
  old=a.read_record(db,id)
  if old and old['published']:print(slug,'preserved');continue
  fa=f'ماندالا ترکیبی {index:02d} — با قاب';en=f'Mixed-media mandala {index:02d} — framed'
  if not db.scalar(text('SELECT id FROM media_assets WHERE id=:id'),dict(id=aid)):
   body=media.Upload(expected_version=0,action='publish',purpose='public_image',metadata=media.Metadata(title_fa=fa,title_en=en,alt_fa=fa,alt_en=en,notes='Web derivative from owner RAW photograph; original HEIC remains private; EXIF omitted.'),file_name=item['file'],content_base64=base64.b64encode((folder/'images'/item['file']).read_bytes()).decode(),reason=reason)
   if not isinstance(media.save_record(db,actor,aid,rid,body,request),dict):raise RuntimeError('Media rejected')
  content=a.Content(slug=slug,title_fa=fa,title_en=en,description_fa='اثر اصل ماندالا با تکنیک ترکیبی از نیلوفر مرادی. اندازه کاغذ A5 (۱۴٫۸ × ۲۱ سانتی‌متر). قیمت یک میلیون تومان شامل قاب است. موجودی یک عدد. تصویر، عکس اصل اثر پیش از قاب‌گذاری است؛ وزن ارسال ۵۰۰ گرم تخمینی است.',description_en='Original mixed-media mandala by Niloufar Moradi. A5 paper, 14.8 × 21 cm. Price includes the frame; one original available. The image shows the original artwork before framing. Estimated shipping weight: 500 g.',artist_fa='نیلوفر مرادی',artist_en='Niloufar Moradi',medium='mixed-media',style='abstract',width_cm=14.8,height_cm=21,edition='original',price_amount='1000000',weight_grams=500,returnable=True,frame_fa='قاب همراه اثر؛ داخل قیمت',frame_en='Frame included in the price',image_credit='نیلوفر مرادی | Niloufar Moradi',gallery=[dict(asset_id=aid,revision_id=rid,alt_fa=fa,alt_en=en)])
  result=scope['publish_owned'](id,uuid4(),a.Command(expected_version=old['version'] if old else 0,action='publish',content=content,reason=reason),request,db,actor)
  if not isinstance(result,dict):raise RuntimeError('Artwork publication rejected')
  if not db.scalar(text("SELECT id FROM inventory_positions WHERE kind='artwork' AND reference_id=:id"),dict(id=id)):
   result=apply_adjustment(db,actor,request,uuid5(id,'opening'),Command(kind='artwork',reference_id=id,expected_version=0,action='opening',quantity='1',value='500000',reason=reason+' Owner confirmed unit cost 500000 IRT including frame.'))
   if not isinstance(result,dict):raise RuntimeError('Opening rejected')
  print(slug,'published')
