#!/usr/bin/env python3
"""Attempt to preserve public article images locally. No LinkedIn authentication."""
import concurrent.futures
import json
from pathlib import Path
import urllib.request
import urllib.error

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/media'
OUT.mkdir(parents=True,exist_ok=True)
images={image['key']:image for file in (ROOT/'content/articles').glob('*/article.json') for image in json.loads(file.read_text()).get('images',[])}
manifest={}
manifest_file=ROOT/'public/assets/media.json'
if manifest_file.exists():manifest=json.loads(manifest_file.read_text())

def recover(item):
    key,image=item
    previous=manifest.get(key,{})
    if previous.get('file') and (OUT/previous['file']).exists():return key,previous
    try:
        request=urllib.request.Request(image['url'],headers={'User-Agent':'Mozilla/5.0 (compatible; ArticleArchive/1.0)'})
        with urllib.request.urlopen(request,timeout=12) as response:
            kind=response.headers.get_content_type()
            extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}.get(kind)
            if not extension:return key,{'status':'unsupported-content-type'}
            content=response.read(12*1024*1024+1)
            if len(content)>12*1024*1024:return key,{'status':'too-large'}
            signature_ok=(kind=='image/png' and content.startswith(b'\x89PNG')) or (kind=='image/jpeg' and content.startswith(b'\xff\xd8')) or (kind=='image/webp' and content.startswith(b'RIFF') and content[8:12]==b'WEBP') or (kind=='image/gif' and content.startswith(b'GIF8'))
            if not signature_ok:return key,{'status':'invalid-image-content'}
            filename=f'{key}.{extension}';(OUT/filename).write_bytes(content)
            return key,{'file':filename,'status':'downloaded','bytes':len(content)}
    except urllib.error.HTTPError as error:return key,{'status':f'http-{error.code}'}
    except Exception as error:return key,{'status':type(error).__name__}

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for i,(key,value) in enumerate(pool.map(recover,images.items()),1):
        manifest[key]=value
        if i%40==0:print(f'Checked {i}/{len(images)} article images',flush=True)
manifest_file.write_text(json.dumps(manifest,indent=2)+'\n')
counts={}
for value in manifest.values():counts[value['status']]=counts.get(value['status'],0)+1
print(json.dumps({'total':len(images),'results':counts}))
