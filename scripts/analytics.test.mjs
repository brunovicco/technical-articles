import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {goatcounterCode,goatcounterTag} from './analytics.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const config=JSON.parse(await fs.readFile(path.join(root,'site.config.json'),'utf8'));
const info=JSON.parse(await fs.readFile(path.join(dist,'build-info.json'),'utf8'));
const base=new URL(info.siteUrl).pathname.replace(/\/$/,'');
const code=goatcounterCode(process.env.GOATCOUNTER ?? config.goatcounter);

async function pages(directory){
  const found=[];
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())found.push(...await pages(file));
    else if(entry.name.endsWith('.html'))found.push(file);
  }
  return found;
}

test('site codes are validated and an empty value disables counting',()=>{
  assert.equal(goatcounterCode(''),'');
  assert.equal(goatcounterCode(undefined),'');
  assert.equal(goatcounterCode('  My-Site  '),'my-site');
  for(const bad of ['a','-bad','has space','evil.com/x','a"b','x'.repeat(64)])assert.throws(()=>goatcounterCode(bad),/Invalid GoatCounter site code/,bad);
  assert.equal(goatcounterTag('',`${base}/assets/goatcounter.js`),'');
  assert.equal(goatcounterTag('my-site','/assets/goatcounter.js'),'<script data-goatcounter="https://my-site.goatcounter.com/count" async src="/assets/goatcounter.js"></script>');
});

test('the counter script is self-hosted, ISC-licensed, and no page loads a third-party script',async()=>{
  const script=await fs.readFile(path.join(dist,'assets/goatcounter.js'),'utf8');
  assert.match(script.split('\n').slice(0,3).join('\n'),/ISC license/);
  for(const file of await pages(dist)){
    const html=await fs.readFile(file,'utf8');
    for(const [,src] of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g))assert.ok(src.startsWith(`${base}/`),`${path.relative(dist,file)} loads ${src}`);
  }
});

test('counting is present on every page only when a site code is configured',async()=>{
  const tag=code?goatcounterTag(code,`${base}/assets/goatcounter.js`):'';
  for(const file of await pages(dist)){
    const html=await fs.readFile(file,'utf8');
    const relative=path.relative(dist,file);
    if(relative==='index.html'){assert.ok(!html.includes('goatcounter'),'redirect page stays free of scripts');continue;}
    if(code)assert.equal(html.split(tag).length-1,1,`${relative} should include the counter once`);
    else assert.ok(!html.includes('goatcounter'),`${relative} must not include the counter when disabled`);
  }
});
