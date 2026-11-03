"""Publish approved small cover derivatives through audited domain helpers.
Run in the API environment, pointing at a prepared release folder.
No inventory, purchase policy or source print files are changed.
"""
import base64
import hashlib
import json
import runpy
import sys
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4,uuid5
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request
from nilart.shared.database import engine
from nilart.contexts.catalog.infrastructure.authoring import SqlCatalogAuthoringRepository
from nilart.contexts.catalog.domain.authoring import EntryContent,EntryKind
from nilart.contexts.commissions.notebooks import PORTFOLIO_ID

folder=Path(sys.argv[1]); media=SimpleNamespace(**runpy.run_path(str(folder/'media_helper.py'))); profiles=SimpleNamespace(**runpy.run_path(str(folder/'profile_helper.py')))
reason='Owner requested publication of six prepared custom notebook cover portfolio examples from /home/ez/Documents/nilart; only display derivatives, no source print files or reference photographs.'
with Session(engine) as db:
 actor=SimpleNamespace(id=db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id LIMIT 1")))
 if not actor.id:raise RuntimeError('Existing administrator required')
 repo=SqlCatalogAuthoringRepository(db)
 if not db.scalar(text('SELECT id FROM catalog_collections WHERE id=:id'),dict(id=PORTFOLIO_ID)):
  record=repo.create(EntryKind.COLLECTIONS,PORTFOLIO_ID,actor.id,EntryContent(slug='custom-notebook-portfolio',title_fa='نمونه‌کار دفتر اختصاصی',title_en='Custom notebook portfolio',description_fa='نمونه‌های طراحی اختصاصی جلد دفتر؛ ثبت درخواست و قیمت نهایی پس از بررسی.',description_en='Custom cover designs; final price and execution follow review.'),reason)
 else:record=repo.read(EntryKind.COLLECTIONS,PORTFOLIO_ID)
 if not record['published']:repo.publish(EntryKind.COLLECTIONS,PORTFOLIO_ID,actor.id,record['version'],True,reason)
 db.commit()
 gallery=[]; request=Request({'type':'http','headers':[]})
 for item in json.loads((folder/'images/manifest.json').read_text()):
  aid=uuid5(PORTFOLIO_ID,item['slug']);rid=uuid5(aid,'display-v1');data=(folder/'images'/item['file']).read_bytes()
  existing=db.execute(text('SELECT sha256,published_revision FROM media_assets WHERE id=:id'),dict(id=aid)).mappings().first()
  if existing:
   if existing['sha256']!=hashlib.sha256(data).hexdigest() or existing['published_revision']!=rid:raise RuntimeError('Existing portfolio asset requires review')
  else:
   body=media.Upload(expected_version=0,action='publish',purpose='public_image',metadata=media.Metadata(title_fa=item['title_fa'],title_en=item['title_en'],alt_fa=item['title_fa'],alt_en=item['title_en'],notes='Public cover display derivative; print originals remain private.'),file_name=item['file'],content_base64=base64.b64encode(data).decode(),reason=reason)
   if not isinstance(media.save_record(db,actor,aid,rid,body,request),dict):raise RuntimeError('Media publication rejected')
  gallery.append(dict(asset_id=aid,revision_id=rid,alt_fa=item['title_fa'],alt_en=item['title_en']))
 old=profiles.record(db,'collections',PORTFOLIO_ID)
 content=profiles.Content.model_validate(old['content'] or {})
 known={str(g.asset_id) for g in content.gallery}; merged=content.gallery+[g for g in gallery if str(g['asset_id']) not in known]
 if len(merged)!=len(content.gallery) or not old.get('published_revision'):
  body=profiles.Command(expected_version=old['version'],action='publish',content=profiles.Content.model_validate({**content.model_dump(mode='json'),'gallery':merged}),reason=reason)
  if not isinstance(profiles.save_record(db,actor,'collections',PORTFOLIO_ID,uuid4(),body,request),dict):raise RuntimeError('Portfolio profile rejected')
 print('Published six approved notebook cover examples; existing portfolio entries preserved.')
