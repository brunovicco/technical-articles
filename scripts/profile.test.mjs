import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {extractAbout,renderProfile} from '../public/assets/profile-content.mjs';
import {refreshProfile} from '../public/assets/profile-sync.mjs';

test('profile extraction selects the localized About section without importing the rest of the profile',()=>{
  for(const [locale,heading] of [['en','About'],['pt-br','Sobre mim']]){
    assert.equal(extractAbout(`# Name\n\n## ${heading}\r\n\r\nFirst **paragraph**.\r\n\r\n---\r\n\r\n## Projects\r\nExcluded`,locale),'First **paragraph**.');
    assert.equal(extractAbout(`## ${heading}\nText\n## Next\nExcluded`,locale),'Text');
    assert.throws(()=>extractAbout('## Projects\nOnly projects',locale));
    assert.throws(()=>extractAbout(`## ${heading}\n\n---`,locale));
  }
});

test('profile rendering preserves supported Markdown and cannot execute remote HTML or unsafe links',()=>{
  const html=renderProfile('Hello **world** and `code`.\n\n> **A principle**\n\n- One\n- Two\n\n<script>alert(1)</script> [unsafe](javascript:alert) [safe](https://example.org/)','en');
  assert.ok(html.includes('<strong>world</strong>'));
  assert.ok(html.includes('<blockquote><p><strong>A principle</strong></p></blockquote>'));
  assert.ok(html.includes('<ul><li>One</li><li>Two</li></ul>'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('href="https://example.org/"'));
});

test('live profile refresh updates each language and retains the snapshot on errors',async()=>{
  for(const [locale,heading,file] of [['en','About','README.md'],['pt-br','Sobre mim','README.pt-BR.md']]){
    const element={innerHTML:'Offline snapshot',dataset:{}};
    const fetcher=async(url,options)=>{
      assert.equal(url,`https://raw.githubusercontent.com/brunovicco/brunovicco/main/${file}`);
      assert.equal(options.credentials,'omit');
      return {ok:true,text:async()=>`## ${heading}\nNew content\n\n---\nIgnored`};
    };
    assert.equal(await refreshProfile(element,locale,fetcher),true);
    assert.equal(element.innerHTML,'<p>New content</p>');
    assert.equal(element.dataset.profileState,'live');
    for(const failure of [async()=>{throw new Error('Offline');},async()=>({ok:false}),async()=>({ok:true,text:async()=>'## Missing\nWrong section'})]){
      assert.equal(await refreshProfile(element,locale,failure),false);
      assert.equal(element.innerHTML,'<p>New content</p>');
      assert.equal(element.dataset.profileState,'snapshot');
    }
  }
});

test('built About pages contain the localized snapshot and load sync only on About pages',async()=>{
  for(const locale of ['en','pt-br']){
    const html=await fs.readFile(new URL(`../dist/${locale}/${locale==='en'?'about':'sobre'}/index.html`,import.meta.url),'utf8');
    const snapshot=await fs.readFile(new URL(`../content/profile/${locale}.md`,import.meta.url),'utf8');
    assert.ok(html.includes(renderProfile(snapshot,locale)));
    assert.ok(html.includes('type="module" src="/technical-articles/assets/profile-sync.mjs"'));
    const home=await fs.readFile(new URL(`../dist/${locale}/index.html`,import.meta.url),'utf8');
    assert.ok(!home.includes('profile-sync.mjs'));
  }
});
