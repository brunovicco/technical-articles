import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const info=JSON.parse(await fs.readFile(path.join(dist,'build-info.json'),'utf8'));
const base=new URL(info.siteUrl).pathname.replace(/\/$/,'');
const read=file=>fs.readFile(path.join(dist,file),'utf8');
const tracks=JSON.parse(await fs.readFile(path.join(root,'content/tracks.json'),'utf8'));
const articles=await Promise.all((await fs.readdir(path.join(root,'content/articles'))).map(async id=>JSON.parse(await fs.readFile(path.join(root,'content/articles',id,'article.json'),'utf8'))));

test('every track has a localized page listing its articles in part order',async()=>{
  for(const [lang,segment] of [['en','tracks'],['pt-br','trilhas']]){
    for(const track of tracks){
      const html=await read(`${lang}/${segment}/${track.id}/index.html`);
      assert.ok(html.includes(`<h1>${track.title[lang]}</h1>`));
      const members=articles.filter(a=>a.series?.id===track.id).sort((a,b)=>a.series.part-b.series.part);
      assert.ok(members.length>0);
      const positions=members.map(a=>html.indexOf(`${base}/${lang}/${lang==='pt-br'?'artigos':'articles'}/${a.id}/`));
      assert.ok(positions.every(position=>position>-1));
      assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
    }
  }
});

test('home pages link to the tracks section and navigation',async()=>{
  for(const lang of ['en','pt-br']){
    const html=await read(`${lang}/index.html`);
    assert.ok(html.includes('id="tracks"'));
    assert.ok(html.includes(`href="${base}/${lang}/#tracks"`));
    for(const track of tracks)assert.ok(html.includes(track.title[lang]));
  }
});

test('track articles show the track eyebrow and rail, and other articles do not',async()=>{
  for(const article of articles){
    const html=await read(`en/articles/${article.id}/index.html`);
    if(article.series){
      const total=articles.filter(a=>a.series?.id===article.series.id).length;
      assert.ok(html.includes(`PART ${article.series.part} OF ${total}`));
      assert.ok(html.includes('class="track-rail"'));
      assert.equal((html.match(/aria-current="page"><span>/g)||[]).length,1);
    }else{
      assert.ok(!html.includes('track-rail'));
    }
  }
});

test('sitemap includes the track pages',async()=>{
  const sitemap=await read('sitemap.xml');
  for(const track of tracks){
    assert.ok(sitemap.includes(`${info.siteUrl}/en/tracks/${track.id}/`));
    assert.ok(sitemap.includes(`${info.siteUrl}/pt-br/trilhas/${track.id}/`));
  }
});
