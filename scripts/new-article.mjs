import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [id,originalLanguage='pt-br',...extra]=process.argv.slice(2);
if(!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !['en','pt-br'].includes(originalLanguage) || extra.length){
  console.error('Usage: npm run new:article -- <lowercase-article-slug> [pt-br|en]');
  process.exit(1);
}
const target=path.join(root,'content/articles',id);
await fs.mkdir(path.dirname(target),{recursive:true});
try{
  await fs.mkdir(target);
}catch(error){
  if(error.code!=='EEXIST')throw error;
  console.error(`Article already exists: ${id}`);
  process.exit(1);
}
await fs.cp(path.join(root,'templates/article'),target,{recursive:true});
const metadata=JSON.parse(await fs.readFile(path.join(target,'article.json'),'utf8'));
metadata.id=id;
metadata.date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
metadata.originalLanguage=originalLanguage;
for(const lang of ['en','pt-br']){
  metadata.versions[lang]={title:metadata.versions[lang].title,kind:lang===originalLanguage?'original':'translation',
    ...(lang===originalLanguage?{}:{translatedFrom:originalLanguage,reviewStatus:'unreviewed'})};
}
await fs.writeFile(path.join(target,'article.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(`Created content/articles/${id}/. Replace both sample bodies and titles before merging. Run npm run check, then npm run serve to preview. Deployment is manual.`);
