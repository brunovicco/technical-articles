import fs from 'node:fs/promises';
import path from 'node:path';

// An article is "published" unless its article.json says otherwise.
// "ready" means finished and reviewed, but held back from the generated site until the status is removed or set to "published".
export const STATUSES=['published','ready'];
export const statusOf=metadata=>metadata.status??'published';
export const isPublished=metadata=>statusOf(metadata)==='published';

export async function articleDirectories(root){
  return (await fs.readdir(path.join(root,'content/articles'),{withFileTypes:true})).filter(entry=>entry.isDirectory());
}

export async function readArticleMetadata(root,name){
  return JSON.parse(await fs.readFile(path.join(root,'content/articles',name,'article.json'),'utf8'));
}

export async function publishedEntries(root){
  const published=[];
  for(const entry of await articleDirectories(root))if(isPublished(await readArticleMetadata(root,entry.name)))published.push(entry);
  return published;
}
