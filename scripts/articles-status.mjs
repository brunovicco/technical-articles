import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import {articleDirectories,readArticleMetadata,statusOf,isPublished} from './article-status.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const paths=await fs.readFile(path.join(root,'content/paths.json'),'utf8').then(JSON.parse,()=>[]);
const rows=[];
for(const entry of await articleDirectories(root)){
  const metadata=await readArticleMetadata(root,entry.name);
  rows.push({id:metadata.id,status:statusOf(metadata),date:metadata.date,series:metadata.series?`${metadata.series.id} #${metadata.series.part}`:'-',
    paths:paths.filter(rp=>rp.items.some(item=>item.article===metadata.id)).map(rp=>rp.id),title:metadata.versions['pt-br']?.title||metadata.versions.en?.title||metadata.id});
}
const held=rows.filter(row=>row.status!=='published').sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
console.log(`Ready, not yet published: ${held.length}`);
for(const row of held){
  console.log(`  ${row.date}${row.date<=today?'  (date reached: ready to release)':''}  ${row.id}`);
  console.log(`    ${row.title}`);
  console.log(`    series: ${row.series}${row.paths.length?` · paths: ${row.paths.join(', ')}`:''}`);
}
console.log(`Published: ${rows.length-held.length}`);
if(held.length)console.log('\nTo release: remove "status" (or set it to "published") in article.json, then run npm run check and deploy manually.');
