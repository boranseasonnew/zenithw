import { writeFileWithRetry as writeFileSync } from '../shared/build-files.mjs';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadCopy } from './downloads-content.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const frontend = join(root,'frontend');
const config = JSON.parse(readFileSync(join(root,'shared/site-config.json'),'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const write = (file, text) => { const path=join(frontend,file); if(existsSync(path)&&readFileSync(path,'utf8')===text)return; mkdirSync(dirname(path),{recursive:true});writeFileSync(path,text); };
for(const value of [config.telegram,config.windows.release,config.windows.installer.url,config.windows.portable.url,config.android.release,...config.android.apks.map(apk=>apk.url)].filter(Boolean)) {
 const url=new URL(value);if(url.protocol!=='https:')throw new Error('Downloads require HTTPS URLs');
}
for(const platform of ['windows','android'])for(const store of Object.values(config[platform].stores)) {
 if(!['available','coming','review'].includes(store.status))throw new Error('Unknown store status');
 if(store.status==='available'&&!store.url&& !store.packageId)throw new Error('Available store requires a destination');
}
for(const [lang,copy] of Object.entries(downloadCopy)) {
 const path=join(frontend,'locales',lang+'.json');const catalog=JSON.parse(readFileSync(path,'utf8'));
 for(const [key,value] of Object.entries(copy)){catalog[key]=value;catalog[downloadCopy.tr[key]]=value;}
 write('locales/'+lang+'.json',JSON.stringify(catalog,null,2)+'\n');
}
const copy=downloadCopy.tr;
const t=key=>escape(copy[key]||key);
const label=(key)=>`data-l10n="${escape(JSON.stringify({'text:0':key}))}"`;
const text=(tag,key,attrs='')=>`<${tag} ${attrs} ${label(key)}>${t(key)}</${tag}>`;
const external=(url,key,cls='download-action')=>`<a class="${cls}" href="${escape(url)}" target="_blank" rel="noopener noreferrer" ${label(key)}>${t(key)}</a>`;
const status=state=>text('span',({available:'Available',coming:'Coming Soon',review:'Under Review'})[state],`class="status status-${state}"`);
function storeCard(name,store,logo) {
 const brand=logo?`<img class="${name==='Microsoft Store'?'store-badge':'store-wordmark'}" src="/brands/${logo}" width="${name==='Microsoft Store'?160:110}" height="${name==='Microsoft Store'?40:32}" alt="${name}">`:`<h3>${name}</h3>`;
 return `<article class="download-option"><div class="option-heading"><h3>${brand}</h3>${status(store.status)}</div>${store.status==='available'?external(store.url,name):text('p','Store publication is pending. Download the current release from GitHub.')}${store.reviewUrl?external(store.reviewUrl,'View submission'):''}</article>`;
}
const size=(bytes)=>(bytes/1e6).toFixed(1)+' MB';
const command=`winget install --id ${config.windows.stores.winget.packageId} --exact --source winget`;
let windows=`<section class="platform" id="windows" aria-labelledby="windows-title"><div class="platform-heading"><h2 id="windows-title">Windows</h2><p>v${config.windows.version} · ${escape(config.windows.requirements)}</p></div>${text('p','Windows 10/11, 64-bit. The Store package requires Windows 10 version 2004 or newer.','class="platform-lead"')}<details class="channel-picker"><summary ${label('Downloads')}>${t('Downloads')} <span aria-hidden="true">↓</span></summary><div class="download-options">
${storeCard('Microsoft Store',config.windows.stores.microsoft,'microsoft-store.svg')}
<article class="download-option"><div class="option-heading"><h3>WinGet</h3>${status(config.windows.stores.winget.status)}</div>${config.windows.stores.winget.status==='available'?'':text('p','This command will be available after the WinGet package is approved.','class="command-preview"')}<div class="command"><code>${escape(command)}</code><button type="button" data-copy-command="${escape(command)}" hidden ${label('Copy')}>${t('Copy')}</button></div></article>
<article class="download-option"><div class="option-heading"><h3>GitHub Releases</h3>${status('available')}</div><p>ZenithW ${config.windows.version}</p>${external(config.windows.release,'View release')}${external(config.windows.checksums,'Checksums')}</article>
<article class="download-option"><div class="option-heading"><h3>EXE · x64</h3>${status('available')}</div><ul class="file-list"><li>${external(config.windows.installer.url,'Download installer','download-action primary')}<p>${size(config.windows.installer.bytes)}</p></li><li>${external(config.windows.portable.url,'Portable EXE')}<p>${size(config.windows.portable.bytes)}</p></li></ul></article></div></details>
<details class="download-details"><summary ${label('Features and requirements')}>${t('Features and requirements')}</summary><ul>${text('li','Choose format and quality, queue downloads, and select subtitles before saving.')}${text('li','Manage browser sessions, SponsorBlock, proxies and playlist preferences in separate settings categories.')}${text('li','Downloads use your device’s connection. Source availability and access conditions still apply.')}</ul><figure class="download-preview"><img src="/desktop-preview/workspace.png" width="1222" height="791" alt="${t('Windows interface')}" loading="lazy" decoding="async"><figcaption ${label('Windows interface')}>${t('Windows interface')}</figcaption></figure></details></section>`;
let android=`<section class="platform" id="android" aria-labelledby="android-title"><div class="platform-heading"><h2 id="android-title">Android</h2><p>v${config.android.version} · ${escape(config.android.requirements)}</p></div>${text('p','Android 7.0 or newer. Select the APK matching your device architecture.','class="platform-lead"')}<details class="channel-picker"><summary ${label('Downloads')}>${t('Downloads')} <span aria-hidden="true">↓</span></summary><div class="download-options">${storeCard('F-Droid',config.android.stores.fdroid,'f-droid.svg')}${storeCard('Uptodown',config.android.stores.uptodown,'uptodown.svg')}
<article class="download-option"><div class="option-heading"><h3>GitHub Releases</h3>${status('available')}</div><p>ZenithW ${config.android.version}</p>${external(config.android.release,'View release')}${external(config.android.checksums,'Checksums')}</article><article class="download-option"><div class="option-heading">${text('h3','Direct APK download')}${status('available')}</div><ul class="file-list">${config.android.apks.map((apk,index)=>`<li><a href="${escape(apk.url)}"><span>${escape(apk.abi)}<br><span ${label(['Most modern Android phones','Older 32-bit Android devices','Android x64 devices and emulators'][index])}>${t(['Most modern Android phones','Older 32-bit Android devices','Android x64 devices and emulators'][index])}</span></span><small>${size(apk.bytes)} ↗</small></a></li>`).join('')}</ul></article></div></details>
<details class="download-details"><summary ${label('Features and requirements')}>${t('Features and requirements')}</summary><ul>${text('li','Choose format and quality, queue downloads, and select subtitles before saving.')}${text('li','Manage browser sessions, SponsorBlock, proxies and playlist preferences in separate settings categories.')}${text('li','Downloads use your device’s connection. Source availability and access conditions still apply.')}${text('li','The F-Droid edition will receive engine updates through app releases, instead of downloading stable or nightly engines separately.')}</ul></details></section>`;
// Put usable direct files before distribution channels that are still under review.
function prioritizeFiles(markup){return markup.replace(/(<div class="download-options">)([\s\S]*?)(<\/div><\/details>)/,(_,open,content,close)=>{
 const articles=[...content.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(match=>match[0]);
 return open+articles.at(-1)+articles.slice(0,-1).join('')+close;
});}
function revealChannels(markup,key){
 markup=prioritizeFiles(markup);
 markup=markup.replace(/<details class="channel-picker"><summary[^>]*>[\s\S]*?<\/summary>/,'');
 markup=markup.replace('<\/div><\/details>','<\/div>');
 return markup.replace(/<ul class="file-list">[\s\S]*?<\/ul>/,list=>`<details class="file-picker"><summary ${label(key)}>${t(key)} <span aria-hidden="true">↓</span></summary>${list}</details>`);
}
windows=revealChannels(windows,'Download installer');android=revealChannels(android,'Direct APK download');
const telegram=config.telegram?`<section class="telegram-updates" data-community="downloads"><div>${text('h2','Stay Updated')}${text('p','Get the latest ZenithW releases, announcements and development updates.')}</div><a class="download-action telegram-link" href="${escape(config.telegram)}" target="_blank" rel="noopener noreferrer"><img src="/brands/telegram.svg" width="22" height="22" alt=""><span ${label('Join Telegram')}>${t('Join Telegram')}</span></a></section>`:'';
write('downloads.html',`<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${t('Download ZenithW')} | Windows &amp; Android</title><meta name="description" content="${t('Your downloader. Your platform. Your choice.')} Windows ${config.windows.version} · Android ${config.android.version}"><link rel="canonical" href="${config.origin}/downloads"><meta name="robots" content="index, follow"><meta name="theme-color" content="#101113"><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/downloads.css"><link rel="stylesheet" href="/site-language.css"><script src="/site-language.js"></script><script src="/workspace-choices.js" defer></script><script src="/downloads.js" defer></script></head><body><a class="downloads-skip" href="#main">${escape('İçeriğe geç')}</a><div class="downloads-shell"><header class="downloads-header"><a class="downloads-brand" href="/" aria-label="ZenithW"><img src="/zenithw.png" width="28" height="28" alt="">ZenithW</a><nav aria-label="ZenithW"><a href="/guides">Rehberler</a><a href="/updates">Güncellemeler</a><a href="/settings">Ayarlar</a></nav></header><main id="main"><header class="downloads-hero"><span class="downloads-eyebrow">ZENITHW / WINDOWS · ANDROID</span>${text('h1','Download ZenithW')}${text('p','Your downloader. Your platform. Your choice.')}</header><div class="platform-grid">${windows}${android}</div><p class="copy-status" id="copy-status" role="status" aria-live="polite"></p>${telegram}</main><footer class="downloads-footer"><span>ZenithW · <span ${label('Downloads')}>${t('Downloads')}</span></span><nav aria-label="ZenithW"><a href="/about">Hakkında</a><a href="/support">Destek</a></nav></footer></div></body></html>\n`);
console.log('Downloads source and eight catalogs generated from shared/site-config.json.');
