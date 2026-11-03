"""Publish lossless binding-at-top JPEG revisions; preserve all artwork prices and inventory."""
import base64,inspect,json,runpy,sys
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID,uuid5
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request
from nilart.shared.database import engine
from nilart.contexts.catalog.presentation import artwork_authoring as a
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
folder=Path(sys.argv[1]);m=SimpleNamespace(**runpy.run_path(str(folder/'media_helper.py')))
ns=UUID('249df780-ddc1-4e88-8083-b95078ae199a');request=Request({'type':'http','headers':[]})
reason='Owner requested all photographed notebook bindings at the top. Lossless JPEG quarter-turn only; original artwork, price and inventory preserved.'
with Session(engine) as db:
 actor=SimpleNamespace(id=db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id LIMIT 1")))
 if not actor.id:raise RuntimeError('Existing admin required')
 principal=SqlIdentityRepository(db).principal(actor.id)
 if not all(principal.allows(p) for p in ['catalog.manage','pricing.publish','content.manage']):raise RuntimeError('Existing permissions required')
 src=inspect.getsource(a.save);src=src[src.index('def save('):];start=src.index('    db.execute(text("SELECT pg_advisory_xact_lock')
 scope=dict(a.save.__globals__);exec(compile('def publish_owned(id,key,body,request,db,actor):\n'+src[start:],'<owner-artwork-orientation>','exec'),scope)
 for item in json.loads((folder/'manifest.json').read_text()):
  id=uuid5(ns,item['slug']);aid=uuid5(id,'image');rid=uuid5(aid,'binding-top-v2');key=uuid5(id,'binding-top-publication-v2')
  old=a.read_record(db,id)
  if not old or not old['published']:raise RuntimeError('Published mandala missing')
  content=a.Content.model_validate(old['content'])
  if content.gallery[0].revision_id==rid:print(item['slug'],'already oriented');continue
  asset=db.execute(text('SELECT * FROM media_assets WHERE id=:id'),dict(id=aid)).mappings().one()
  if asset['published_revision']!=rid:
   body=m.Upload(expected_version=asset['version'],action='publish',purpose='public_image',metadata=m.Metadata.model_validate(asset['metadata']),file_name=asset['file_name'],content_base64=base64.b64encode((folder/'images'/item['file']).read_bytes()).decode(),reason=reason)
   if not isinstance(m.save_record(db,actor,aid,rid,body,request),dict):raise RuntimeError('Media revision rejected')
  content.gallery[0].revision_id=rid
  result=scope['publish_owned'](id,key,a.Command(expected_version=old['version'],action='publish',content=content,reason=reason),request,db,actor)
  if not isinstance(result,dict):raise RuntimeError('Artwork revision rejected')
  print(item['slug'],'binding at top')
