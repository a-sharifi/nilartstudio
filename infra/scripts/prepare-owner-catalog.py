#!/usr/bin/env python3
"""Make display derivatives only. Original print files are never published or modified."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image, ImageOps
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
collections=[('gorbe','گربه','Cats'),('roh','روح','Ghosts'),('gav','گاو','Cows'),('qolche','غولچه','qolche'),('love','لاو','Love')]
papers=[('drawing-cream-110gsm','نخودی ۱۱۰ گرم','Cream drawing 110 gsm'),('drawing-cream-127gsm','نخودی ۱۲۷ گرم','Cream drawing 127 gsm'),('kraft-coffee-100gsm','کرافت قهوه‌ای ۱۰۰ گرم','Coffee kraft 100 gsm'),('kraft-dark-70gsm','کرافت تیره ۷۰ گرم','Dark kraft 70 gsm')]
assets={}
def image(source,name):
 if name in assets:return name
 with Image.open(source) as im:
  im=ImageOps.exif_transpose(im);im.thumbnail((1600,1600),Image.Resampling.LANCZOS)
  rgba=im.convert('RGBA');bg=Image.new('RGBA',rgba.size,'white');bg.alpha_composite(rgba);bg.convert('RGB').save(a.output/(name+'.jpg'),quality=90,optimize=True)
  preview=bg.convert('RGB');preview.thumbnail((480,480));preview.save(a.output/(name+'.webp'),quality=65,method=6)
 assets[name]=dict(file=name+'.jpg',thumbnail=name+'.webp',source=str(source.relative_to(a.source)),sha256=hashlib.sha256((a.output/(name+'.jpg')).read_bytes()).hexdigest())
 return name
entries=[]
for slug,fa,en in collections:
 variants=[]
 for size in ['A3','A4','A5']:
  root=a.source/f'notebooks/{slug}/{size}'
  front=image(root/f'covers/{slug}-{size}-front.png',f'{slug}-{size}-front')
  for kind in ['sketchbook','notebook']:
   inside=next((root/('sketchbooks' if kind=='sketchbook' else 'notebooks')/'previews').glob('*first-page.png'))
   inner=image(inside,f'{slug}-{size}-{kind}-inside')
   for paper,pfa,pen in (papers if kind=='sketchbook' else [('writing-paper','کاغذ خط‌دار','Ruled writing paper')]):
    leaves=40 if kind=='sketchbook' else 80
    back=root/f'covers/{"40-leaves" if kind=="sketchbook" else "notebook-80-leaves"}/{slug}-{size}-back-{leaves}-{paper}.png'
    b=image(back,f'{slug}-{size}-{paper}-back')
    variants.append(dict(kind=kind,size=size,paper=paper,paper_fa=pfa,paper_en=pen,leaves=leaves,gallery=[front,inner,b]))
 entries.append(dict(slug=slug,title_fa=fa,title_en=en,variants=variants))
logo=a.source/'branding/nil-logo/nil-main-with-website-transparent.png'
with Image.open(logo) as im:
 im=im.convert('RGBA');bounds=im.getbbox();im=im.crop(bounds);im.thumbnail((480,220),Image.Resampling.LANCZOS)
 target=Path(__file__).resolve().parents[2]/'Frontend/public/brand';target.mkdir(exist_ok=True);im.save(target/'nilart-logo.webp',quality=90,method=6)
(a.output/'manifest.json').write_text(json.dumps(dict(collections=entries,assets=assets),ensure_ascii=False,indent=2))
print(f'Prepared {len(entries)} collections, {sum(len(c["variants"]) for c in entries)} variants, {len(assets)} display images. Original print files unchanged.')
