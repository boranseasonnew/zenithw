import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)), frontend=join(root,'frontend');
const {telegram}=JSON.parse(readFileSync(join(root,'shared/site-config.json'),'utf8'));
function write(file,text) {
 for(let attempt=0;;attempt++) {
  try {writeFileSync(file,text);return;} catch(error) {
   if(attempt===5||!['EACCES','EBUSY','EPERM','UNKNOWN','EINVAL'].includes(error.code))throw error;
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);
  }
 }
}
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]);
if(telegram && !/^https:\/\/t\.me\/(?:[a-zA-Z0-9_]+|\+[a-zA-Z0-9_-]+)$/.test(telegram))throw new Error('Invalid Telegram destination');
const icon='<img src="/brands/telegram.svg" width="18" height="18" alt="">';
const field=key=>'data-l10n="'+JSON.stringify({'text:0':key}).replaceAll('&','&amp;').replaceAll('"','&quot;')+'"';
for(const file of walk(frontend).filter(file=>file.endsWith('.html'))) {
 let source=readFileSync(file,'utf8');
 source=source
  .replace(/\s*<!-- generated community footer -->[\s\S]*?<!-- end generated community footer -->/g,'')
  .replace(/\s*<!-- generated community updates -->[\s\S]*?<!-- end generated community updates -->/g,'')
  .replace(/<link\b[^>]*href="\/(?:cache-assets\/)?site-community(?:\.[a-f0-9]+)?\.css"[^>]*>\s*/g,'');
 source=source.replace(/\b(href|src|poster)="(?![a-z]+:|\/|#)([^"?]+\.(?:js|css|png|jpg|svg|ico|woff2?)(?:\?[^"<>]*)?)"/g,'$1="/$2"');
 // Rewrite actual anchors, leaving the checked-in translation catalog and visitor data untouched.

 if(source!==readFileSync(file,'utf8'))write(file,source);
}
console.log(telegram?'Shared Telegram footer and changelog links generated.':'Telegram is unconfigured: community links omitted.');
