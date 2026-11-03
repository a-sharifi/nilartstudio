#!/usr/bin/env python3
"""Apply owner-confirmed Persian display names through versioned catalogue APIs."""
from pathlib import Path
from uuid import uuid4

# Reuse the authenticated API helpers; do not rerun the catalogue importer.
source=(Path(__file__).parent/'import-owner-catalog.py').read_text()
exec(compile(source.split('# Bookmark-only manifests')[0],str(Path(__file__).parent/'import-owner-catalog.py'),'exec'))
reason='Owner explicitly renamed Persian collection labels to غولچه and لاو'
def renamed(text):
    return text.replace('qolche','غولچه').replace('عشق','لاو')

def rename_profile(kind,id):
    current=request(f'{base}/profiles/{kind}/{id}')
    published=request(f'/api/v1/catalog/profiles/{kind}/{id}',optional=True)
    if not published:return
    updated=json.loads(json.dumps(published))
    for image in updated['gallery']:image['alt_fa']=renamed(image['alt_fa'])
    for item in updated['specifications']:
        item['label_fa']=renamed(item['label_fa']);item['value_fa']=renamed(item['value_fa'])
    if updated==published:return
    request(f'{base}/profiles/{kind}/{id}/commands/{uuid4()}',dict(expected_version=current['version'],action='publish',content=updated,reason=reason),'PUT')

for slug in ['qolche','love']:
    pairs=[('collections',slug)]+[('products',slug+'-'+kind) for kind in (['sketchbook','notebook','bookmark'] if slug=='qolche' else ['sketchbook','notebook'])]
    for kind,key in pairs:
        id=uid(kind+':'+key);record=request(f'{base}/entries/{kind}/{id}')
        content={k:record[k] for k in ['slug','title_fa','title_en','description_fa','description_en','collection_ids','category_ids']}
        content['title_fa']=renamed(content['title_fa']);content['description_fa']=renamed(content['description_fa'])
        if content['title_fa']!=record['title_fa'] or content['description_fa']!=record['description_fa']:
            request(f'{base}/entries/{kind}/{id}',dict(**content,version=record['version'],reason=reason),'PUT')
        rename_profile(kind,id)
        if kind=='products':
            for sku in request(f'{base}/entries/products/{id}/skus'):rename_profile('skus',sku['id'])
        print('Updated '+kind+'/'+key+' → '+content['title_fa'],flush=True)
