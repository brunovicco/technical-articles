#!/usr/bin/env python3
"""Import published LinkedIn HTML articles; never imports the rest of the export."""
import argparse
import collections
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {'p','h2','h3','h4','ul','ol','li','strong','em','b','i','blockquote',
           'pre','code','a','figure','figcaption','img','hr','br','table','thead',
           'tbody','tr','th','td','sup','sub'}
VOID = {'img','hr','br'}
ENGLISH = ('AI Platform Security', 'AI Regulation in the USA', 'The Art and Science',
           'Building an End-to-End', 'Choosing the Right', 'The EU Artificial',
           'Fine-tuning LLMs', 'From RAG', 'From Search', 'From Theory', 'Proactive Security',
           'Resilient AI Architectures', 'Seven frameworks', 'Summary of AI',
           'Understanding AI Security')

def slug(text):
    text = unicodedata.normalize('NFKD',text).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',text).strip('-')[:110].rstrip('-')

def safe_url(value, image=False):
    value = html.unescape(value or '').strip()
    u = urlparse(value)
    if image:
        return value if u.scheme == 'https' and u.hostname == 'media.licdn.com' else ''
    return value if u.scheme in {'https','http'} or value.startswith('#') else ''

class Importer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title=''; self.source=''; self.created=''; self.published=''
        self.h1=False; self.meta=None; self.in_content=False; self.depth=0
        self.out=[]; self.text=[]; self.images=[]; self.stack=[]; self.skip=0

    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if not self.in_content:
            if tag=='h1':self.h1=True
            if self.h1 and tag=='a':self.source=safe_url(attrs.get('href'))
            if attrs.get('class') in {'created','published'}:self.meta=attrs['class']
            if tag=='div' and self.published:
                self.in_content=True;self.depth=1
            return
        if tag=='div':self.depth+=1
        if tag in {'script','style','iframe','object','svg'}:self.skip+=1;return
        if self.skip or tag not in ALLOWED:return
        if tag=='img':
            src=safe_url(attrs.get('src'),image=True)
            if not src:return
            # The build replaces these URLs with verified local assets when available.
            key=hashlib.sha256(src.encode()).hexdigest()[:20]
            self.images.append({'key':key,'url':src,'alt':attrs.get('alt','')})
            self.out.append(f'<img src="{html.escape(src,quote=True)}" data-asset="{key}" alt="{html.escape(attrs.get("alt", ""),quote=True)}" loading="lazy" decoding="async">')
            return
        extra=''
        if tag=='a':
            href=safe_url(attrs.get('href'))
            if href:extra=f' href="{html.escape(href,quote=True)}"'
            extra+=' rel="noopener noreferrer"'
        self.out.append(f'<{tag}{extra}>')
        if tag not in VOID:self.stack.append(tag)

    def handle_endtag(self,tag):
        if self.skip:
            if tag in {'script','style','iframe','object','svg'}:self.skip-=1
            return
        if not self.in_content:
            if tag=='h1':self.h1=False
            if tag=='p':self.meta=None
            return
        if tag=='div':
            self.depth-=1
            if self.depth==0:self.in_content=False
            return
        if tag in self.stack:
            # Close malformed markup conservatively instead of carrying formatting forward.
            while self.stack:
                current=self.stack.pop();self.out.append(f'</{current}>')
                if current==tag:break

    def handle_data(self,data):
        if self.in_content and not self.skip:
            self.out.append(html.escape(data));self.text.append(data)
        elif self.h1:self.title+=data
        elif self.meta:setattr(self,self.meta,getattr(self,self.meta)+data)

def tags_for(title,text):
    value=(title+' '+text[:500]).lower()
    groups=[('security',r'seguran|security|autoriza|authority|identidade|identity|oauth|tool\?'),
            ('governance',r'govern|regula|framework|compliance|lgpd|bacen|cvm|anbima'),
            ('agents',r'agent|agente|a2a|mcp|langgraph|agno|crewai|harness'),
            ('observability',r'observab|trace|tracing|langfuse|telemetr'),
            ('engineering',r'dspy|retriev|rag\b|redis|pydantic|query|prompt|fine.tun|mem[oó]ria|pipeline'),
            ('platforms',r'plataforma|platform|sdlc|dora|produtiv|custo|cost|infraestrutura|nuvem|cloud')]
    tags=[key for key,pattern in groups if re.search(pattern,value)]
    return tags[:3] or ['engineering']

def run():
    parser=argparse.ArgumentParser()
    parser.add_argument('source',type=Path)
    parser.add_argument('--report',type=Path)
    args=parser.parse_args()
    if not args.source.is_dir():raise SystemExit('Source must be a directory of article HTML files.')
    report={'published':[],'skipped_unpublished':[],'images':[]}
    for path in sorted(args.source.glob('*.html')):
        source=Importer();source.feed(path.read_text(encoding='utf-8'))
        match=re.search(r'Published on (\d{4}-\d{2}-\d{2})',source.published)
        if not match:
            report['skipped_unpublished'].append(path.name);continue
        article_id=slug(source.title)
        directory=ROOT/'content/articles'/article_id;directory.mkdir(parents=True,exist_ok=True)
        language='en' if source.title.startswith(ENGLISH) else 'pt-br'
        cleaned=''.join(source.out)
        while source.stack:cleaned+=f'</{source.stack.pop()}>'
        cleaned=re.sub(r'<(h[234]|p)>\s*</\1>','',cleaned)
        (directory/f'{language}.html').write_text(cleaned,encoding='utf-8')
        metadata={
            'id':article_id,'originalLanguage':language,'date':match.group(1),
            'sourceUrl':source.source,'tags':tags_for(source.title,' '.join(source.text)),
            'versions':{language:{'title':source.title.strip(),'kind':'original'}},
            'images':source.images,
        }
        metadata_file=directory/'article.json'
        if metadata_file.exists():
            existing=json.loads(metadata_file.read_text())
            metadata['versions'].update({k:v for k,v in existing.get('versions',{}).items() if k!=language})
        metadata_file.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
        report['published'].append(article_id);report['images']+=source.images
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True)
        args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({'published':len(report['published']),'skipped_unpublished':len(report['skipped_unpublished']),'inline_images':len(report['images'])}))

if __name__=='__main__':run()
