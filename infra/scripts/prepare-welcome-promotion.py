"""Owner-requested first-purchase coupon and banner, initially inactive for review."""
import inspect
from datetime import date
from types import SimpleNamespace
from uuid import UUID,uuid5
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request
from nilart.shared.database import engine
from nilart.contexts.discounts import router as d
from nilart.contexts.marketing import router as m
from nilart.contexts.marketing.service import current
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
ns=UUID('ca1d5a71-e97e-44a7-a032-a10dc688c0dc');request=Request({'type':'http','headers':[]})
with Session(engine) as db:
 actor=SimpleNamespace(id=db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id LIMIT 1")))
 if not actor.id or not SqlIdentityRepository(db).principal(actor.id).allows('catalog.manage'):raise RuntimeError('Existing admin required')
 code='WELCOME-NIL-100';id=uuid5(ns,code)
 existing=db.scalar(text('SELECT id FROM discount_rules WHERE code=:code'),dict(code=code))
 if not existing:
  source=inspect.getsource(d.save);source=source[source.index('def save('):];source=source[source.index('    db.execute(text("SELECT pg_advisory_xact_lock'):]
  scope=dict(d.save.__globals__);exec(compile('def seed(id,revision,body,request,db,actor):\n'+source,'<owner-welcome-discount>','exec'),scope)
  body=d.SaveResource(expected_version=0,content=d.Resource(kind='fixed',code=code,title_fa='خوش‌آمدگویی — خرید اول',title_en='Welcome — first purchase',value='100000',minimum='0',valid_from=date(2026,11,2),valid_to=date(9999,12,31),customer_limit=1,first_purchase_only=True,active=False),reason='Owner requested WELCOME-NIL-100 for first purchase, 100000 toman; inactive draft pending campaign dates and minimum-spend review')
  if not isinstance(scope['seed'](id,uuid5(id,'initial'),body,request,db,actor),dict):raise RuntimeError('Discount draft rejected')
  print('First-purchase coupon draft prepared:',code)
 else:print('Existing coupon preserved:',code)
 version,_=current(db)
 if version==0:
  src=inspect.getsource(m.save);src=src[src.index('def save('):];src=src[src.index('    db.execute(text("SELECT pg_advisory_xact_lock'):]
  scope=dict(m.save.__globals__);exec(compile('def seed(key,body,request,db,actor):\n'+src,'<owner-banner-draft>','exec'),scope)
  body=m.Save(expected_version=0,content=m.Content(banner=m.Banner(active=False,text_fa='خرید اولت با ۱۰۰ هزار تومان تخفیف؛ کد WELCOME-NIL-100',text_en='100,000 toman off your first purchase with WELCOME-NIL-100',code=code,link='/fa/shop')),reason='Owner requested editable welcome banner; initially hidden until campaign review and activation')
  if not isinstance(scope['seed'](uuid5(ns,'initial-banner'),body,request,db,actor),dict):raise RuntimeError('Banner draft rejected')
  print('Editable welcome banner draft prepared; no sale prices activated.')
