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
 if(/data-static-language="(?:en|de|fr|ru|vi|zh|ja)"/.test(source))continue;
 source=source.replace(/\s*<!-- generated community footer -->[\s\S]*?<!-- end generated community footer -->/g,'').replace(/\s*<!-- generated community updates -->[\s\S]*?<!-- end generated community updates -->/g,'');
 // Keep original social links intact; this small shared footer also works on pages without one.
 if(telegram) {
  const footer=`\n<!-- generated community footer --><footer class="site-community-footer" data-community="footer"><a href="https://github.com/boranseasonnew/zenithw" target="_blank" rel="noopener noreferrer">GitHub</a><a href="https://www.instagram.com/zenithwonline/" target="_blank" rel="noopener noreferrer">Instagram</a><a class="telegram-link" href="${telegram}" target="_blank" rel="noopener noreferrer">${icon}<span ${field('Join Telegram')}>Telegram’a katıl</span></a></footer><!-- end generated community footer -->\n`;
  source=source.replace('</body>',footer+'</body>');
  if(/class="updates-page"/.test(source))source=source.replace('</main>',`<!-- generated community updates --><p class="telegram-changelog"><a href="${telegram}" target="_blank" rel="noopener noreferrer" ${field('Follow updates on Telegram')}>Güncellemeleri Telegram’da takip et</a></p><!-- end generated community updates -->\n</main>`);
  source=source.replace(/<link\b[^>]*href="\/(?:cache-assets\/)?site-community(?:\.[a-f0-9]+)?\.css"[^>]*>\s*/g,'');
  source=source.replace('</head>','<link rel="stylesheet" href="/site-community.css">\n</head>');
 }
 source=source.replace(/\b(href|src|poster)="(?![a-z]+:|\/|#)([^"?]+\.(?:js|css|png|jpg|svg|ico|woff2?)(?:\?[^"<>]*)?)"/g,'$1="/$2"');
 // Rewrite actual anchors, leaving the checked-in translation catalog and visitor data untouched.

 if(source!==readFileSync(file,'utf8'))write(file,source);
}
console.log(telegram?'Shared Telegram footer and changelog links generated.':'Telegram is unconfigured: community links omitted.');
