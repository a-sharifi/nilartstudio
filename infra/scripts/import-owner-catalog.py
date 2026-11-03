#!/usr/bin/env python3
"""Explicit owner-approved catalogue import through audited APIs. Never invent money/stock."""
import argparse,base64,http.cookiejar,json,urllib.request,urllib.error
from pathlib import Path
from uuid import UUID,uuid5,uuid4
p=argparse.ArgumentParser();p.add_argument('directory',type=Path);p.add_argument('--origin',required=True);p.add_argument('--credentials',required=True,type=Path);p.add_argument('--api-endpoint',help='Private Docker/loopback API transport; Origin remains the public HTTPS site');a=p.parse_args()
if not a.origin.startswith('https://') and not a.origin.startswith(('http://127.0.0.1:','http://localhost:')):raise SystemExit('HTTPS or loopback required')
if a.api_endpoint not in {None,'http://api:8000','http://127.0.0.1:8000'}:raise SystemExit('Private endpoint must be Docker API or loopback')
data=json.loads((a.directory/'manifest.json').read_text());credentials=json.loads(a.credentials.read_text());ns=UUID('17b599e1-b11f-4838-88d8-f58ea760fabe')
def uid(name):return str(uuid5(ns,name))
csrf_token=None
jar=http.cookiejar.CookieJar();opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def request(path,body=None,method='GET',optional=False):
 headers={'Accept':'application/json','Origin':a.origin}
 if body is not None:headers['Content-Type']='application/json'
 if method not in {'GET'} and path not in {'/api/v1/auth/login/password','/api/v1/auth/session/csrf'}:
  headers['X-CSRF-Token']=csrf_token
 if a.api_endpoint:
  headers['Cookie']='; '.join(f'{cookie.name}={cookie.value}' for cookie in jar)
 req=urllib.request.Request((a.api_endpoint or a.origin)+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method)
 try:
  with opener.open(req,timeout=40) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  if optional and e.code==404:return None
  try:code=json.load(e).get('code','request_failed')
  except Exception:code='request_failed'
  raise RuntimeError(f'{method} {path}: {e.code} {code}') from None
# Password route is the normal application sign-in, not a synthetic session.
csrf_token=request('/api/v1/auth/login/password',dict(phone=credentials['phone'],password=credentials['password']),'POST')['csrf_token']
reason='Owner-approved five collections imported from supplied original design archives'
base='/api/v1/admin/catalog'
def entry(kind,slug,fa,en,collections=None,categories=None):
 id=uid(kind+':'+slug);old=request(f'{base}/entries/{kind}/{id}',optional=True)
 if old:return old
 return request(f'{base}/entries/{kind}',dict(id=id,slug=slug,title_fa=fa,title_en=en,description_fa='',description_en='',collection_ids=collections or [],category_ids=categories or [],reason=reason),'POST')
def publish(kind,record):
 if not record['published']:return request(f'{base}/entries/{kind}/{record["id"]}/publication',dict(version=record['version'],published=True,reason=reason),'POST')
 return record
media={}
def gallery(names,fa,en):
 result=[]
 for i,name in enumerate(names):
  if name not in media:
   asset=uid('media:'+name);version=uid('media-version:'+name)
   old=request(f'/api/v1/admin/media/{asset}',optional=True)
   if not old:
    old=request(f'/api/v1/admin/media/{asset}/versions/{version}',dict(expected_version=0,action='publish',purpose='public_image',metadata=dict(title_fa=fa,title_en=en,alt_fa=fa,alt_en=en,sku_id=None,print_size='',notes='Display derivative; original print files kept private.'),file_name=name+'.jpg',content_base64=base64.b64encode((a.directory/data['assets'][name]['file']).read_bytes()).decode(),reason=reason),'PUT')
    revision=old['revision_id']
   else:revision=old['published_revision']
   if not revision:raise RuntimeError('Existing imported asset is not published; review manually')
   media[name]=dict(asset_id=asset,revision_id=revision)
  labels=[('طرح جلد','Cover artwork'),('نمونه صفحات داخلی','Interior page preview'),('مشخصات کاغذ و پشت جلد','Paper specification and back cover')]
  label=labels[min(i,2)];result.append(dict(**media[name],alt_fa=f'{fa} — {label[0]}',alt_en=f'{en} — {label[1]}'))
 return result

def profile(kind,id,images,specs):
 current=request(f'{base}/profiles/{kind}/{id}')
 if current['version']:return
 request(f'{base}/profiles/{kind}/{id}/commands/{uid("profile:"+kind+":"+id)}',dict(expected_version=0,action='publish',content=dict(gallery=images,specifications=specs,delivery=None,weight_grams=None,returnable=None),reason=reason),'PUT')
def spec(fa,en,vfa,ven):return dict(label_fa=fa,label_en=en,value_fa=vfa,value_en=ven)
# Bookmark-only manifests use the same audited import identities and recovery rules.
if data.get('kind')=='bookmarks':
 reason='Owner-approved bookmark designs imported from supplied original archives'
 category=publish('categories',entry('categories','bookmarks','نشانک','Bookmarks'))
 for item in data['products']:
  collection=request(f'{base}/entries/collections/{uid("collections:"+item["collection"])}')
  fa='نشانک '+item['title_fa'];en=item['title_en']+' bookmark'
  product=entry('products',item['collection']+'-bookmark',fa,en,[collection['id']],[category['id']])
  images=gallery(item['gallery'],fa,en)
  for i,image in enumerate(images):
   image['alt_fa']=fa+' — طرح '+str(i+1);image['alt_en']=en+' — design '+str(i+1)
  profile('products',product['id'],images,[])
  path=f'{base}/products/{product["id"]}/options';options=request(path)
  option=uid(product['id']+':design')
  values=[dict(id=uid(product['id']+':design:'+str(i)),title_fa='طرح '+str(i),title_en='Design '+str(i),order=i-1) for i in range(1,4)]
  codes=[('NIL-'+item['collection']+'-BOOKMARK-'+str(i)).upper() for i in range(1,4)]
  if not options['version']:
   options=request(path,dict(version=0,options=[dict(id=option,title_fa='طرح',title_en='Design',order=0,values=values)],combinations=[dict(code=code,selections=[dict(option_id=option,value_id=values[i]['id'])]) for i,code in enumerate(codes)]),'PUT')
  publish('products',product)
  existing={row['code']:row for row in request(f'{base}/entries/products/{product["id"]}/skus')}
  for i,code in enumerate(codes):
   sku=existing.get(code) or request(f'{base}/products/{product["id"]}/skus',dict(code=code),'POST')
   sid=sku.get('sku_id') or sku['id'];mapping=request(f'{base}/skus/{sid}/options')
   if not mapping['mapping']:
    mapping=request(f'{base}/skus/{sid}/options',dict(version=mapping['version'],mapping=dict(configuration_id=options['configuration_id'],configuration_version=options['version'],combination_code=code)),'PUT')
   profile('skus',sid,[images[i]],[spec('طرح','Design','طرح '+str(i+1),'Design '+str(i+1))])
   if not mapping['published']:request(f'{base}/skus/{sid}/publication',dict(version=mapping['version'],published=True,reason=reason),'POST')
  print('Imported '+product['slug']+': 3 designs',flush=True)
 print('Four bookmark products and twelve design variants imported; prices and stock remain unset.')
 raise SystemExit(0)

categories={}
for kind,fa,en in [('sketchbook','دفتر طراحی','Sketchbooks'),('notebook','دفتر خط‌دار','Ruled notebooks')]:categories[kind]=publish('categories',entry('categories',kind+'s',fa,en))['id']
count=0
for c in data['collections']:
 collection=publish('collections',entry('collections',c['slug'],c['title_fa'],c['title_en']))
 profile('collections',collection['id'],gallery([c['slug']+'-A5-front'],c['title_fa'],c['title_en']),[])
 for kind,fa,en in [('sketchbook','دفتر طراحی','Sketchbook'),('notebook','دفتر خط‌دار','Ruled notebook')]:
  pfa=f'{fa} {c["title_fa"]}';pen=f'{c["title_en"]} {en}'
  product=entry('products',c['slug']+'-'+kind,pfa,pen,[collection['id']],[categories[kind]])
  variants=[v for v in c['variants'] if v['kind']==kind]
  profile('products',product['id'],gallery(next(v for v in variants if v['size']=='A5')['gallery'],pfa,pen),[spec('تعداد برگ','Leaves',str(variants[0]['leaves']),str(variants[0]['leaves']))])
  optpath=f'{base}/products/{product["id"]}/options';options=request(optpath)
  sizeid=uid(product['id']+':size');paperid=uid(product['id']+':paper')
  sizes=[dict(id=uid(product['id']+':'+size),title_fa=size,title_en=size,order=i) for i,size in enumerate(['A3','A4','A5'])]
  papers=list({v['paper']:(v['paper_fa'],v['paper_en']) for v in variants}.items())
  paper_values=[dict(id=uid(product['id']+':'+key),title_fa=labels[0],title_en=labels[1],order=i) for i,(key,labels) in enumerate(papers)]
  def code(v):return ('NIL-'+c['slug']+'-'+kind+'-'+v['size']+'-'+v['paper']).upper()
  combinations=[dict(code=code(v),selections=[dict(option_id=sizeid,value_id=uid(product['id']+':'+v['size'])),dict(option_id=paperid,value_id=uid(product['id']+':'+v['paper']))]) for v in variants]
  if not options['version']:options=request(optpath,dict(version=0,options=[dict(id=sizeid,title_fa='سایز',title_en='Size',order=0,values=sizes),dict(id=paperid,title_fa='کاغذ',title_en='Paper',order=1,values=paper_values)],combinations=combinations),'PUT')
  product=publish('products',product)
  existing={s['code']:s for s in request(f'{base}/entries/products/{product["id"]}/skus')}
  for v in variants:
   sku=existing.get(code(v))
   if not sku:sku=request(f'{base}/products/{product["id"]}/skus',dict(code=code(v)),'POST');sku['id']=sku['sku_id']
   sid=sku.get('sku_id') or sku['id'];mapping=request(f'{base}/skus/{sid}/options')
   if mapping['mapping'] is None:mapping=request(f'{base}/skus/{sid}/options',dict(version=mapping['version'],mapping=dict(configuration_id=options['configuration_id'],configuration_version=options['version'],combination_code=code(v))),'PUT')
   profile('skus',sid,gallery(v['gallery'],pfa+' '+v['size']+' '+v['paper_fa'],pen+' '+v['size']+' '+v['paper_en']),[spec('سایز','Size',v['size'],v['size']),spec('کاغذ','Paper',v['paper_fa'],v['paper_en']),spec('تعداد برگ','Leaves',str(v['leaves']),str(v['leaves']))])
   if not mapping['published']:request(f'{base}/skus/{sid}/publication',dict(version=mapping['version'],published=True,reason=reason),'POST')
   count+=1
  print(f'Imported {product["slug"]}: {len(variants)} variants',flush=True)
print(f'Imported {len(data["collections"])} collections, 10 products and {count} variants. Prices, costs, stock, weight and policies deliberately unset.')
