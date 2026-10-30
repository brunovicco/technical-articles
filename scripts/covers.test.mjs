import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const info=JSON.parse(await fs.readFile(path.join(dist,'build-info.json'),'utf8'));
const base=new URL(info.siteUrl).pathname.replace(/\/$/,'');
const entries=(await fs.readdir(path.join(root,'content/articles'),{withFileTypes:true})).filter(entry=>entry.isDirectory());

test('article banners are served locally only on the languages that declare them',async()=>{
  let covered=0;
  for(const entry of entries){
    const article=JSON.parse(await fs.readFile(path.join(root,'content/articles',entry.name,'article.json'),'utf8'));
    for(const lang of ['en','pt-br']){
      const html=await fs.readFile(path.join(dist,lang,lang==='pt-br'?'artigos':'articles',article.id,'index.html'),'utf8');
      const file=article.cover?.[lang];
      if(!file){assert.ok(!html.includes('article-banner'));continue;}
      covered++;
      assert.ok(html.includes(`<figure class="article-banner"><img src="${base}/assets/banners/${file}"`));
      assert.ok(html.includes(`<meta property="og:image" content="${info.siteUrl}/assets/banners/${file}">`));
      assert.ok(!html.includes('class="article-cover"'));
      const image=await fs.readFile(path.join(dist,'assets/banners',file));
      assert.ok(image.subarray(0,4).equals(Buffer.from([0x89,0x50,0x4e,0x47]))||image[0]===0xff&&image[1]===0xd8||image.subarray(0,4).toString()==='RIFF');
    }
  }
  assert.ok(covered>0);
});
