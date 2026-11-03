"""Create small public display derivatives of owner-supplied cover designs, excluding photos/print packages."""
import argparse
import json
from pathlib import Path
from PIL import Image,ImageOps,ImageChops
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
items=[('maryam-ali','دفتر اختصاصی مریم و علی','Maryam & Ali custom notebook','assets/covers/front-art.png'),('sadra-sepideh','دفتر اختصاصی صدرا و سپیده','Sadra & Sepideh custom notebook','assets/covers/front-art.png'),('mahsa','دفتر اختصاصی مهسا','Mahsa custom notebook','assets/covers/front-art.png'),('delvin','دفتر اختصاصی دلوین','Delvin custom notebook','assets/covers/front-art.png'),('rana-javad','دفتر اختصاصی رعنا','Rana custom notebook','A5/covers/rana-javad-A5-front-centered-on-A4.png'),('sadi','دفتر اختصاصی سعدی','Saadi custom notebook','A4/covers/sadi-A4-front-centered-on-A3.png')]
result=[]
for slug,fa,en,relative in items:
 path=a.source/slug/relative
 with Image.open(path) as image:
  image=ImageOps.exif_transpose(image).convert('RGBA');bg=Image.new('RGBA',image.size,'white');bg.alpha_composite(image);image=bg.convert('RGB')
  # Trim paper-only margins from centered print-sheet previews.
  if 'centered-on' in relative:
   bbox=ImageChops.difference(image,Image.new('RGB',image.size,'white')).convert('L').point(lambda p:255 if p>25 else 0).getbbox()
   if bbox:image=image.crop(bbox)
  image.thumbnail((1000,1200),Image.Resampling.LANCZOS);image.save(a.output/(slug+'.jpg'),quality=86,optimize=True)
 result.append(dict(slug=slug,title_fa=fa,title_en=en,file=slug+'.jpg'))
(a.output/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(f'Prepared {len(result)} cover display images; originals remain private.')
