// Local-only preview, including the same Pages middleware used in production.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest } from '../functions/_middleware.js';
const frontend=fileURLToPath(new URL('../frontend/',import.meta.url));
const port=Number(process.env.PORT || 8770);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.xml':'application/xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain'};
function asset(url, method='GET') {
 const pathname=decodeURIComponent(url.pathname);
 const raw=resolve(frontend,'.'+pathname);
 if(raw!==resolve(frontend)&&!raw.startsWith(resolve(frontend)+sep))return new Response(null,{status:400});
 let file=raw;
 if(pathname.endsWith('.html')) {
  const destination=new URL(url);destination.pathname=pathname.replace(/index\.html$/,'').replace(/\.html$/,'');
  return new Response(null,{status:301,headers:{Location:destination.href}});
 }
 if(existsSync(file)&&statSync(file).isDirectory()) {
  if(!pathname.endsWith('/')) { const dest=new URL(url);dest.pathname+='/';return new Response(null,{status:301,headers:{Location:dest.href}}); }
  file=resolve(file,'index.html');
 } else if(!existsSync(file)&&existsSync(file+'.html'))file+='.html';
 const found=existsSync(file)&&statSync(file).isFile();
 if(!found)file=resolve(frontend,'404.html');
 return new Response(method==='HEAD'?null:readFileSync(file),{status:found?200:404,headers:{'Content-Type':types[extname(file)] || 'application/octet-stream'}});
}
const server=http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://127.0.0.1:'+port);
  const request=new Request(url,{method:req.method,headers:req.headers});
  const result=await onRequest({request,env:{MAINTENANCE_MODE:'false',ASSETS:{fetch:async target=>asset(new URL(target))}},next:async()=>asset(url,req.method)});
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
 } catch(error){console.error(error);res.writeHead(500);res.end('Preview error');}
});
server.listen(port,'127.0.0.1',()=>console.log('Pages preview: http://127.0.0.1:'+port));
