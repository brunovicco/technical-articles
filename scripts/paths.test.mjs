import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isPublished} from './article-status.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const info=JSON.parse(await fs.readFile(path.join(dist,'build-info.json'),'utf8'));
const base=new URL(info.siteUrl).pathname.replace(/\/$/,'');
const read=file=>fs.readFile(path.join(dist,file),'utf8');
const esc=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const held=new Set();
for(const id of await fs.readdir(path.join(root,'content/articles'))){
  const metadata=JSON.parse(await fs.readFile(path.join(root,'content/articles',id,'article.json'),'utf8'));
  if(!isPublished(metadata))held.add(metadata.id);
}
// Held-back articles are left out of the paths, and a path with nothing published is not generated.
const paths=JSON.parse(await fs.readFile(path.join(root,'content/paths.json'),'utf8'))
  .map(rp=>({...rp,items:rp.items.filter(item=>!held.has(item.article))})).filter(rp=>rp.items.length);

test('every reading path has a localized page listing its articles in order',async()=>{
  assert.ok(paths.length>0);
  for(const [lang,segment,articles] of [['en','paths','articles'],['pt-br','caminhos','artigos']]){
    for(const rp of paths){
      const html=await read(`${lang}/${segment}/${rp.id}/index.html`);
      assert.ok(html.includes(`<h1>${esc(rp.title[lang])}</h1>`));
      const positions=rp.items.map(item=>html.indexOf(`${base}/${lang}/${articles}/${item.article}/`));
      assert.ok(positions.every(position=>position>-1));
      assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
      for(const soon of rp.comingSoon||[]){
        const at=html.indexOf(`<h2>${esc(soon.title[lang])}</h2>`);
        assert.ok(at>-1,`coming-soon item missing: ${soon.title[lang]}`);
        assert.ok(!html.slice(at,html.indexOf('</li>',at)).includes('<a '),'coming-soon item must not link anywhere');
      }
    }
  }
});

test('home pages link to the paths section and navigation',async()=>{
  for(const lang of ['en','pt-br']){
    const html=await read(`${lang}/index.html`);
    assert.ok(html.includes('id="paths"'));
    assert.ok(html.includes(`href="${base}/${lang}/#paths"`));
    for(const rp of paths)assert.ok(html.includes(esc(rp.title[lang])));
  }
});

test('sitemap includes the reading path pages',async()=>{
  const sitemap=await read('sitemap.xml');
  for(const rp of paths){
    assert.ok(sitemap.includes(`/en/paths/${rp.id}/`));
    assert.ok(sitemap.includes(`/pt-br/caminhos/${rp.id}/`));
  }
});
