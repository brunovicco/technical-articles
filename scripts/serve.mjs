import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const port=Number(process.env.PORT || 4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.xml':'application/xml; charset=utf-8'};
http.createServer(async(req,res)=>{
  try {
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    // Accept both project Pages paths and a root-mounted local preview.
    if(pathname.startsWith('/technical-articles/')) pathname=pathname.slice('/technical-articles'.length);
    const file=path.resolve(root,'.'+pathname,pathname.endsWith('/')?'index.html':'');
    if(!file.startsWith(root+path.sep)&&file!==root)throw new Error('outside root');
    const content=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(content);
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('404 · Page not found / Página não encontrada');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/technical-articles/pt-br/`));
