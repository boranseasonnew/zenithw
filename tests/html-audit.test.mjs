import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,relative,dirname,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../frontend/',import.meta.url));
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(directory,entry.name)):[join(directory,entry.name)]);
const pages=walk(root).filter(path=>path.endsWith('.html'));
const aliases=readFileSync(join(root,'_redirects'),'utf8').split(/\r?\n/).filter(line=>line.trim()&&!line.startsWith('#')).map(line=>line.trim().split(/\s+/)[0]);
const isFile=path=>existsSync(path)&&statSync(path).isFile();

test('all generated HTML pages have valid public metadata or explicit private index policy',()=>{
 for(const path of pages){
  const html=readFileSync(path,'utf8'),name=relative(root,path);
  assert.doesNotMatch(html,/\uFFFD/,name+' has malformed replacement characters');
  if(/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html))continue;
  assert.equal([...html.matchAll(/<title\b[^>]*>[^<]+<\/title>/g)].length,1,name);
  assert.equal([...html.matchAll(/<meta\b[^>]*name="description"[^>]*content="[^"]+"/g)].length,1,name);
  const canonical=[...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/g)];
  assert.equal(canonical.length,1,name);
  assert.equal(new URL(canonical[0][1]).origin,'https://zenithw.space',name);
 }
});

test('every static internal anchor resolves to a page, asset or configured redirect',()=>{
 const broken=[];
 for(const path of pages){
  const html=readFileSync(path,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  for(const [,href] of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gi)){
   if(!href||href.startsWith('#')||/^(?:[a-z][\w+.-]*:|\/\/)/i.test(href))continue;
   const url=new URL(href.replaceAll('&amp;','&'),'https://zenithw.space/'+relative(root,path).replaceAll('\\','/'));
   const route=decodeURIComponent(url.pathname);
   if(aliases.some(alias=>alias===route||(alias.includes('*')&&route.startsWith(alias.split('*')[0]))))continue;
   const destination=resolve(root,'.'+route);
   if(!destination.startsWith(resolve(root))) {broken.push([relative(root,path),href]);continue;}
   if(![destination,...(extname(destination)?[]:[destination+'.html']),join(destination,'index.html')].some(isFile))broken.push([relative(root,path),href]);
  }
 }
 assert.deepEqual(broken,[],'Broken local navigation links');
});
