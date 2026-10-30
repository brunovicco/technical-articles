import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const config=JSON.parse(await fs.readFile(path.join(root,'site.config.json'),'utf8'));
const info=JSON.parse(await fs.readFile(path.join(dist,'build-info.json'),'utf8'));
const base=new URL(info.siteUrl).pathname.replace(/\/$/,'');
const entries=(await fs.readdir(path.join(root,'content/articles'),{withFileTypes:true})).filter(entry=>entry.isDirectory());
const read=file=>fs.readFile(file,'utf8');
const strip=html=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
async function files(directory){const found=[];for(const entry of await fs.readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);found.push(...(entry.isDirectory()?await files(file):[file]));}return found;}
const outputFiles=await files(dist);

test('English is the default entry point and fallback language while Portuguese remains available',async()=>{
  assert.equal(config.defaultLanguage,'en');
  const landing=await read(path.join(dist,'index.html'));
  assert.ok(landing.includes('<html lang="en">'));
  assert.ok(landing.includes(`content="0;url=${base}/en/"`));
  assert.ok(landing.includes(`<link rel="canonical" href="${info.siteUrl}/en/">`));
  assert.ok(!landing.includes('Technical notes / Notas técnicas'));
  const fallback=await read(path.join(dist,'404.html'));
  assert.ok(fallback.includes('<html lang="en"'));
  assert.ok(fallback.includes('Page not found'));
  assert.ok(fallback.includes(`${base}/pt-br/`));
  const portuguese=await read(path.join(dist,'pt-br/index.html'));
  assert.ok(portuguese.includes('<html lang="pt-BR"'));
  assert.ok(portuguese.includes('Notas técnicas'));
});

test('language choices list English first and preserve the matching article in both languages',async()=>{
  const id='quem-esta-chamando-a-tool';
  for(const lang of ['en','pt-br']){
    const html=await read(path.join(dist,lang,lang==='en'?'articles':'artigos',id,'index.html'));
    const navigation=html.match(/<nav class="languages"[^>]*>([\s\S]*?)<\/nav>/)[1];
    assert.ok(navigation.indexOf('lang="en"')<navigation.indexOf('lang="pt-BR"'));
    assert.ok(navigation.includes(`${base}/en/articles/${id}/`));
    assert.ok(navigation.includes(`${base}/pt-br/artigos/${id}/`));
    assert.equal((navigation.match(/aria-current="page"/g)||[]).length,1);
    assert.ok(navigation.includes(`lang="${lang==='en'?'en':'pt-BR'}" hreflang="${lang==='en'?'en':'pt-BR'}" title="${lang==='en'?'English':'Português do Brasil'}" href="${base}/${lang}/${lang==='en'?'articles':'artigos'}/${id}/" aria-current="page"`));
  }
});

test('every published article has two complete versions and recorded provenance',async()=>{
  assert.equal(info.articles,entries.length);
  assert.equal(info.versions,entries.length*2);
  for(const entry of entries){
    const dir=path.join(root,'content/articles',entry.name);
    const data=JSON.parse(await read(path.join(dir,'article.json')));
    assert.deepEqual(Object.keys(data.versions).sort(),['en','pt-br']);
    const original=await read(path.join(dir,`${data.originalLanguage}.html`));
    const target=data.originalLanguage==='en'?'pt-br':'en';
    const translated=await read(path.join(dir,`${target}.html`));
    assert.equal(data.versions[data.originalLanguage].kind,'original');
    assert.equal(data.versions[target].kind,'translation');
    assert.equal(data.versions[target].translatedFrom,data.originalLanguage);
    assert.ok(['unreviewed','reviewed'].includes(data.versions[target].reviewStatus));
    assert.deepEqual(original.match(/<\/?[a-z][^>]*>/gi),translated.match(/<\/?[a-z][^>]*>/gi),`${entry.name}: translation changed structural markup, links or assets`);
    assert.deepEqual(original.match(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi),translated.match(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi),`${entry.name}: code changed`);
    const ratio=strip(translated).length/strip(original).length;
    assert.ok(ratio>.6&&ratio<1.65,`${entry.name}: suspicious translation length ${ratio}`);
    if(data.sourceUrl)assert.equal(new URL(data.sourceUrl).protocol,'https:',`${entry.name}: invalid original publication URL`);
  }
});

test('all local HTML links, assets and section targets resolve within the deployed project path',async()=>{
  for(const file of outputFiles.filter(file=>file.endsWith('.html'))){
    const html=await read(file);
    const refs=[...html.matchAll(/(?:href|src)="([^\"]+)"/g)].map(match=>match[1]);
    for(const ref of refs){
      if(/^(https?:|mailto:|data:)/.test(ref))continue;
      const link=new URL(ref,info.siteUrl+'/'+path.relative(dist,file));
      let route=decodeURIComponent(link.pathname);
      if(base){assert.ok(route.startsWith(base+'/')||route===base,`${file}: link escapes project base: ${ref}`);route=route.slice(base.length);}
      let target=path.join(dist,route.replace(/^\//,''));
      if(route.endsWith('/'))target=path.join(target,'index.html');
      await assert.doesNotReject(fs.access(target),`${file}: broken local reference ${ref}`);
      if(link.hash&&target.endsWith('.html')){
        const content=target===file?html:await read(target);
        assert.ok(content.includes(`id="${decodeURIComponent(link.hash.slice(1))}"`),`${file}: missing anchor ${ref}`);
      }
    }
  }
});

test('each article route has the correct language, counterpart, canonical URL and translation notice',async()=>{
  for(const entry of entries){
    const data=JSON.parse(await read(path.join(root,'content/articles',entry.name,'article.json')));
    for(const lang of ['pt-br','en']){
      const route=`/${lang}/${lang==='pt-br'?'artigos':'articles'}/${entry.name}/`;
      const html=await read(path.join(dist,route,'index.html'));
      assert.ok(html.includes(`<html lang="${lang==='pt-br'?'pt-BR':'en'}"`));
      assert.ok(html.includes(`<link rel="canonical" href="${info.siteUrl}${route}">`));
      assert.ok(html.includes('application/ld+json'));
      assert.ok(html.includes(`/${lang==='en'?'pt-br/artigos':'en/articles'}/${entry.name}/`));
      assert.ok(!html.includes('translation-note'));
      assert.ok(!/<img[^>]+src="https?:/i.test(html),'article image still depends on a remote CDN');
      assert.ok(!html.includes('image-fallback'),'unrecovered figure in output');
    }
  }
});

test('media files have a safe file signature and every imported image is local',async()=>{
  const media=JSON.parse(await read(path.join(root,'public/assets/media.json')));
  const keys=new Set();
  for(const entry of entries){const metadata=JSON.parse(await read(path.join(root,'content/articles',entry.name,'article.json')));for(const image of metadata.images || [])keys.add(image.key);}
  for(const key of keys){
    assert.ok(media[key]?.file,`${key}: unavailable media`);
    const buffer=await fs.readFile(path.join(dist,'assets/media',media[key].file));
    assert.ok(buffer.subarray(0,4).equals(Buffer.from([0x89,0x50,0x4e,0x47]))||buffer[0]===0xff&&buffer[1]===0xd8||buffer.subarray(0,4).toString()==='RIFF'||buffer.subarray(0,4).toString()==='GIF8');
  }
  assert.equal(info.localImages,keys.size);
});

test('both rendered DSPy versions include inline identifiers and the screenshot code example',async()=>{
  const id='dspy-o-framework-que-trata-prompts-como-codigo-compilavel-nao-como-strings';
  for(const lang of ['pt-br','en']){
    const html=await read(path.join(dist,lang,lang==='pt-br'?'artigos':'articles',id,'index.html'));
    for(const identifier of ['Signature','Modules','dspy.Predict','dspy.ChainOfThought','dspy.ReAct','dspy.Retrieve']){
      assert.ok(html.includes(`<code>${identifier}</code>`),`${lang}: missing inline code ${identifier}`);
    }
    assert.ok(html.includes('<pre><code>&quot;question → answer&quot;</code></pre>'));
    assert.ok(!/<pre>\s*<\/pre>/.test(html));
  }
});

test('catalogue and feeds include every article in each language, without private export data',async()=>{
  for(const lang of ['pt-br','en']){
    const homepage=await read(path.join(dist,lang,'index.html'));
    const search=JSON.parse(await read(path.join(dist,lang,'search-index.json')));
    const feed=await read(path.join(dist,lang,'feed.xml'));
    assert.equal((homepage.match(/class="article-row"/g)||[]).length,entries.length);
    assert.equal(search.length,entries.length);
    assert.equal(new Set(search.map(entry=>entry.id)).size,entries.length);
    assert.equal((feed.match(/<item>/g)||[]).length,entries.length);
  }
  for(const file of outputFiles.filter(file=>/\.(html|json|xml)$/.test(file))){
    const content=await read(file);
    assert.ok(!content.includes('/Users/brunovicco/'),`Local source path leaked into ${file}`);
    assert.ok(!content.includes('Complete_LinkedInDataExport_'),`Export path leaked into ${file}`);
    assert.ok(!/\b(?:gho|ghp)_[A-Za-z0-9]{20,}/.test(content),`Credential pattern found in ${file}`);
    assert.ok(!content.includes('bfvicco@gmail.com'),`Private export contact leaked into ${file}`);
  }
});
