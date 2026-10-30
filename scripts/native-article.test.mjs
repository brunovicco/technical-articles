import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('the bilingual template builds native articles and preserves external provenance when supplied',async t=>{
  const fixture=await fs.mkdtemp(path.join(os.tmpdir(),'native-article-'));
  t.after(()=>fs.rm(fixture,{recursive:true,force:true}));
  for(const dir of ['scripts','templates'])await fs.cp(path.join(root,dir),path.join(fixture,dir),{recursive:true});
  for(const file of ['site.config.json','package.json'])await fs.copyFile(path.join(root,file),path.join(fixture,file));
  await fs.mkdir(path.join(fixture,'public'));
  const run=(script,...args)=>spawnSync(process.execPath,[path.join(fixture,'scripts',script),...args],{encoding:'utf8',env:{...process.env,GITHUB_REPOSITORY:'',ALLOW_INCOMPLETE_TRANSLATIONS:''}});
  for(const original of ['pt-br','en']){
    const result=run('new-article.mjs',`native-${original}`,original);
    assert.equal(result.status,0,result.stderr);
    const metadata=JSON.parse(await fs.readFile(path.join(fixture,'content/articles',`native-${original}`,'article.json'),'utf8'));
    assert.equal(metadata.versions[original].kind,'original');
    assert.equal(metadata.sourceUrl,undefined);
    assert.match(metadata.date,/^\d{4}-\d{2}-\d{2}$/);
  }
  assert.notEqual(run('new-article.mjs','native-en').status,0,'must not overwrite an existing article');
  assert.notEqual(run('new-article.mjs','../escape').status,0,'must reject path traversal');
  assert.notEqual(run('new-article.mjs','invalid-language','fr').status,0);
  assert.equal(run('build.mjs').status,0);
  for(const lang of ['en','pt-br']){
    const route=`${lang}/${lang==='en'?'articles':'artigos'}/native-pt-br/index.html`;
    const html=await fs.readFile(path.join(fixture,'dist',route),'utf8');
    assert.ok(html.includes(lang==='en'?'Originally published on this site':'Publicado originalmente neste site'));
    assert.ok(!html.includes('Originally published on LinkedIn'));
    assert.ok(!html.includes('Publicado originalmente no LinkedIn'));
    assert.ok(!html.includes('undefined'));
    const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema.isBasedOn,undefined);
    const feed=await fs.readFile(path.join(fixture,'dist',lang,'feed.xml'),'utf8');
    assert.ok(feed.includes('native-pt-br'));
  }
  const metadataFile=path.join(fixture,'content/articles/native-pt-br/article.json');
  const metadata=JSON.parse(await fs.readFile(metadataFile,'utf8'));
  for(const sourceUrl of ['https://www.linkedin.com/pulse/example','https://example.org/original']){
    await fs.writeFile(metadataFile,JSON.stringify({...metadata,sourceUrl}));
    const build=run('build.mjs');assert.equal(build.status,0,build.stderr);
    const html=await fs.readFile(path.join(fixture,'dist/en/articles/native-pt-br/index.html'),'utf8');
    assert.ok(html.includes(`href="${sourceUrl}"`));
    const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema.isBasedOn,sourceUrl);
  }
  await fs.writeFile(metadataFile,JSON.stringify({...metadata,sourceUrl:'javascript:alert(1)'}));
  assert.notEqual(run('build.mjs').status,0,'must reject unsafe source URLs');
});
