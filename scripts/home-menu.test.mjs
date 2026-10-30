import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const info=JSON.parse(await fs.readFile(path.join(dist,'build-info.json'),'utf8'));
const base=new URL(info.siteUrl).pathname.replace(/\/$/,'');
const read=file=>fs.readFile(file,'utf8');
const entries=(await fs.readdir(path.join(root,'content/articles'),{withFileTypes:true})).filter(entry=>entry.isDirectory());
const articles=await Promise.all(entries.map(async entry=>JSON.parse(await read(path.join(root,'content/articles',entry.name,'article.json')))));
const newest=articles.filter(a=>a.versions.en).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))[0];

test('featured article shows its banner, excerpt and call to action without the old arrow',async()=>{
  for(const lang of ['en','pt-br']){
    const html=await read(path.join(dist,lang,'index.html'));
    const section=html.match(/<section class="featured[^"]*"[\s\S]*?<\/section>/)[0];
    const featured=articles.filter(a=>a.versions[lang]).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))[0];
    const href=`${base}/${lang}/${lang==='pt-br'?'artigos':'articles'}/${featured.id}/`;
    assert.ok(section.includes(`href="${href}"`));
    assert.ok(section.includes('class="featured-excerpt"'));
    assert.ok(section.includes('class="text-cta"'));
    assert.ok(!section.includes('featured-arrow'));
    const cover=featured.cover?.[lang];
    if(cover){
      assert.ok(section.startsWith('<section class="featured has-cover"'));
      assert.ok(section.includes(`<img src="${base}/assets/banners/${cover}" alt=""`));
      assert.ok(section.includes('aria-hidden="true"')&&section.includes('tabindex="-1"'),'decorative banner link must stay out of the tab order');
    }else{
      assert.ok(!section.includes('featured-media'));
    }
    const excerpt=section.match(/<p class="featured-excerpt">([\s\S]*?)<\/p>/)[1];
    assert.ok(!/\s[,.;:!?]/.test(excerpt),'excerpt has whitespace before punctuation');
  }
  assert.ok(newest.cover?.en,'the newest article is expected to have a banner for this check to exercise has-cover');
});

test('featured banner keeps the 16:9 ratio of the banners so nothing is cropped',async()=>{
  const css=await read(path.join(root,'public/assets/journal.css'));
  assert.match(css,/\.featured-media img\{[^}]*aspect-ratio:16\/9/);
  assert.ok(!/\.featured-media img\{[^}]*aspect-ratio:16\/10/.test(css));
});

test('every page ships a hidden menu button wired to the navigation',async()=>{
  const pages=['en/index.html','pt-br/index.html','en/about/index.html','pt-br/sobre/index.html',`en/articles/${newest.id}/index.html`,'404.html'];
  for(const page of pages){
    const html=await read(path.join(dist,page));
    assert.ok(html.includes('<nav class="main-nav" id="main-nav"'),page);
    assert.ok(html.includes('<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" hidden>Menu</button>'),page);
  }
});

test('menu script toggles, closes on Escape, outside click and navigation, and stays inert without the markup',async()=>{
  const source=await read(path.join(root,'public/assets/site.js'));
  const start=source.lastIndexOf("(()=>{\n  'use strict';\n  const header");
  assert.ok(start>-1,'menu script not found at the end of site.js');
  const snippet=source.slice(start);
  const listeners={doc:{},win:{},nav:{},button:{}};
  const make=store=>({addEventListener:(type,fn)=>{store[type]=fn;}});
  const run=(locale,{missing=false}={})=>{
    const header={dataset:{},contains:node=>node===header||node===button||node===nav||node===link};
    const button={hidden:true,textContent:'Menu',focused:false,attrs:{},setAttribute(name,value){this.attrs[name]=value;},focus(){this.focused=true;},...make(listeners.button)};
    const link={closest:selector=>selector==='a'?link:null};
    const nav={...make(listeners.nav)};
    const document={body:{dataset:{locale}},querySelector:selector=>missing?null:({'.site-header':header,'.menu-toggle':button,'#main-nav':nav})[selector]??null,...make(listeners.doc)};
    vm.runInNewContext(snippet,{document,addEventListener:make(listeners.win).addEventListener});
    return {header,button,nav,link};
  };

  let page=run('en');
  assert.equal(page.button.hidden,false,'script reveals the button');
  assert.equal(page.header.dataset.menu,'closed');
  assert.equal(page.button.attrs['aria-expanded'],'false');
  listeners.button.click();
  assert.equal(page.header.dataset.menu,'open');
  assert.equal(page.button.attrs['aria-expanded'],'true');
  assert.equal(page.button.textContent,'Close');
  listeners.win.keydown({key:'Escape'});
  assert.equal(page.header.dataset.menu,'closed');
  assert.equal(page.button.focused,true,'focus returns to the button after Escape');
  assert.equal(page.button.textContent,'Menu');

  listeners.button.click();
  listeners.doc.click({target:{}});
  assert.equal(page.header.dataset.menu,'closed','outside click closes');
  listeners.button.click();
  listeners.doc.click({target:page.button});
  assert.equal(page.header.dataset.menu,'open','clicks inside the header do not close');
  listeners.nav.click({target:page.link});
  assert.equal(page.header.dataset.menu,'closed','following a link closes');
  listeners.win.keydown({key:'Escape'});
  assert.equal(page.button.focused,true);

  page=run('pt-br');
  listeners.button.click();
  assert.equal(page.button.textContent,'Fechar');

  page=run('en',{missing:true});
  assert.equal(page.button.hidden,true,'without the markup the script does nothing');
  assert.equal(page.header.dataset.menu,undefined);
});
