#!/usr/bin/env python3
"""Split the supplied three-pose bookmark sheets without changing original artwork."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
a.output.mkdir(parents=True,exist_ok=True)
assets={};products=[]
for slug,fa,en in [('gorbe','گربه','Cats'),('roh','روح','Ghosts'),('gav','گاو','Cows'),('qolche','غولچه','qolche')]:
 source=a.source/(slug+('-3-color-poses-v4-branded.png' if slug=='qolche' else '-3-color-poses-v3-branded.png'))
 names=[]
 with Image.open(source) as im:
  im=ImageOps.exif_transpose(im).convert('RGBA')
  for i in range(3):
   cropped=im.crop((round(i*im.width/3),0,round((i+1)*im.width/3),im.height))
   bounds=cropped.getbbox()
   if not bounds:raise ValueError('Empty bookmark crop')
   cropped=cropped.crop(bounds);cropped.thumbnail((1200,1400),Image.Resampling.LANCZOS)
   canvas=Image.new('RGBA',(cropped.width+64,cropped.height+64),'white');canvas.alpha_composite(cropped,(32,32));canvas=canvas.convert('RGB')
   name=f'{slug}-bookmark-design-{i+1}';names.append(name)
   canvas.save(a.output/(name+'.jpg'),quality=90,optimize=True)
   thumb=canvas.copy();thumb.thumbnail((480,480));thumb.save(a.output/(name+'.webp'),quality=65,method=6)
   assets[name]=dict(file=name+'.jpg',thumbnail=name+'.webp',source=str(source),source_region=[round(i*im.width/3),0,round((i+1)*im.width/3),im.height],sha256=hashlib.sha256((a.output/(name+'.jpg')).read_bytes()).hexdigest())
 products.append(dict(collection=slug,title_fa=fa,title_en=en,gallery=names))
(a.output/'manifest.json').write_text(json.dumps(dict(kind='bookmarks',products=products,assets=assets),ensure_ascii=False,indent=2))
print('Prepared four bookmark products with twelve original design variants.')
