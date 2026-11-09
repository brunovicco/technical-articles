import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('ready articles are validated but kept out of the site until released',async t=>{
  const fixture=await fs.mkdtemp(path.join(os.tmpdir(),'article-status-'));
  t.after(()=>fs.rm(fixture,{recursive:true,force:true}));
  for(const dir of ['scripts','templates'])await fs.cp(path.join(root,dir),path.join(fixture,dir),{recursive:true});
  for(const file of ['site.config.json','package.json'])await fs.copyFile(path.join(root,file),path.join(fixture,file));
  await fs.mkdir(path.join(fixture,'public/assets/banners'),{recursive:true});
  await fs.mkdir(path.join(fixture,'public/assets/media'),{recursive:true});
  await fs.copyFile(path.join(root,'public/assets/profile-content.mjs'),path.join(fixture,'public/assets/profile-content.mjs'));
  await fs.cp(path.join(root,'content/profile'),path.join(fixture,'content/profile'),{recursive:true});
  const run=(script,...args)=>spawnSync(process.execPath,[path.join(fixture,'scripts',script),...args],{encoding:'utf8',env:{...process.env,GITHUB_REPOSITORY:'',ALLOW_INCOMPLETE_TRANSLATIONS:''}});
  assert.equal(run('new-article.mjs','live-one').status,0);
  assert.equal(run('new-article.mjs','held-two').status,0);
  await fs.writeFile(path.join(fixture,'public/assets/banners/held.jpg'),'x');
  await fs.writeFile(path.join(fixture,'public/assets/media/held.svg'),'<svg xmlns="http://www.w3.org/2000/svg"/>');
  await fs.writeFile(path.join(fixture,'content/tracks.json'),JSON.stringify([{id:'t',title:{en:'T',['pt-br']:'T'},description:{en:'d',['pt-br']:'d'}}]));
  const file=id=>path.join(fixture,'content/articles',id,'article.json');
  const edit=async(id,change)=>{const data=JSON.parse(await fs.readFile(file(id),'utf8'));await fs.writeFile(file(id),JSON.stringify(change(data)));};
  await edit('live-one',d=>({...d,series:{id:'t',part:1}}));
  await edit('held-two',d=>({...d,status:'ready',series:{id:'t',part:2},cover:{en:'held.jpg','pt-br':'held.jpg'}}));
  for(const lang of ['en','pt-br'])await fs.appendFile(path.join(fixture,'content/articles/held-two',`${lang}.html`),'<figure><img src="/technical-articles/assets/media/held.svg" alt="x"></figure>');
  await fs.writeFile(path.join(fixture,'content/paths.json'),JSON.stringify([
    {id:'mixed',audience:{en:'a','pt-br':'a'},title:{en:'M','pt-br':'M'},description:{en:'d','pt-br':'d'},items:[{article:'live-one',note:{en:'n','pt-br':'n'}},{article:'held-two',note:{en:'n','pt-br':'n'}}]},
    {id:'only-held',audience:{en:'a','pt-br':'a'},title:{en:'H','pt-br':'H'},description:{en:'d','pt-br':'d'},items:[{article:'held-two',note:{en:'n','pt-br':'n'}}]}]));

  const build=run('build.mjs');assert.equal(build.status,0,build.stderr);
  assert.match(build.stdout,/held back as ready: held-two/);
  const dist=path.join(fixture,'dist');
  const missing=route=>fs.access(path.join(dist,route)).then(()=>false,()=>true);
  assert.ok(await missing('en/articles/held-two/index.html'));
  assert.ok(await missing('pt-br/artigos/held-two/index.html'));
  assert.ok(!(await fs.access(path.join(dist,'en/articles/live-one/index.html')).then(()=>false,()=>true)));
  assert.ok(await missing('assets/banners/held.jpg'),'held banner must not ship');
  assert.ok(await missing('assets/media/held.svg'),'held figure must not ship');
  assert.ok(await missing('en/paths/only-held/index.html'),'a path with nothing published is skipped');
  const mixed=await fs.readFile(path.join(dist,'en/paths/mixed/index.html'),'utf8');
  assert.ok(mixed.includes('/articles/live-one/')&&!mixed.includes('held-two'));
  const track=await fs.readFile(path.join(dist,'en/tracks/t/index.html'),'utf8');
  assert.ok(!track.includes('held-two'));
  for(const out of ['en/feed.xml','sitemap.xml','en/search-index.json'])assert.ok(!(await fs.readFile(path.join(dist,out),'utf8')).includes('held-two'),out);
  assert.equal(JSON.parse(await fs.readFile(path.join(dist,'build-info.json'),'utf8')).held,1);

  const listing=run('articles-status.mjs');assert.equal(listing.status,0,listing.stderr);
  assert.match(listing.stdout,/Ready, not yet published: 1/);assert.match(listing.stdout,/held-two/);

  await edit('held-two',d=>{delete d.status;return d;});
  const released=run('build.mjs');assert.equal(released.status,0,released.stderr);
  assert.ok(!(await missing('en/articles/held-two/index.html')));
  assert.ok(!(await missing('assets/banners/held.jpg')));
  assert.ok(!(await missing('en/paths/only-held/index.html')));

  await edit('held-two',d=>({...d,status:'draft'}));
  assert.notEqual(run('build.mjs').status,0,'unknown statuses must fail the build');
});
