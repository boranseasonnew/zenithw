import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../frontend/', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const write = (name, value) => {
  const file = new URL(name, root);
  mkdirSync(new URL('.', file), { recursive: true });
  writeFileSync(file, value, 'utf8');
};
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// The release objects are the same trusted, checked-in data used by the browser.
// Evaluate only their declarations, not the DOM rendering code.
const context = { window: {} };
vm.createContext(context);
vm.runInContext(read('version.js'), context);
const core = read('updates-core.99daf4ea6088.js');
vm.runInContext(core.slice(0, core.indexOf('let CUR_LANG=')) + '\nglobalThis.releaseData={versions:UPDATE_VERSIONS,current:CURRENT_RELEASES};', context);
vm.runInContext(read('updates-archive.07c744021db2.js'), context);
const { versions, current } = context.releaseData;
const releases = [...current, ...context.window.ZW_UPDATE_ARCHIVE];
if (releases.length !== versions.length || releases.some((release, index) => release.ver !== versions[index])) {
  throw new Error('Release data and version list are out of sync');
}

const template = readFileSync(new URL('./updates-template.html', import.meta.url), 'utf8');
const render = (release, index) => {
  const title = `${release.ver} — ${release.titleTr} — ZenithW`;
  const description = `ZenithW ${release.ver}: ${release.titleTr}. ${release.introTr[0]}`.slice(0, 220);
  const canonical = index === 0 ? 'https://zenithw.space/updates' : `https://zenithw.space/updates/${release.ver}`;
  const intro = release.introTr.map(paragraph => `<p>${paragraph}</p>`).join('\n');
  const sections = release.sections.map(section => `<div class="upd-section"><h3>${escape(section.hTr)}</h3><p>${section.pTr}</p></div>`).join('\n');
  const newer = index > 0 ? `<a class="upd-nav-link" href="/updates/${versions[index - 1]}"><span class="upd-nav-label">yeni sürüm</span>← ${versions[index - 1]}</a>` : '<span aria-hidden="true"></span>';
  const older = index < versions.length - 1 ? `<a class="upd-nav-link next" href="/updates/${versions[index + 1]}"><span class="upd-nav-label">eski sürüm</span>${versions[index + 1]} →</a>` : '<span aria-hidden="true"></span>';
  return template
    .replace(/<title id="pgTitle">.*?<\/title>/, `<title id="pgTitle">${escape(title)}</title>`)
    .replace(/<meta name="description" id="pgDesc" content="[^"]*">/, `<meta name="description" id="pgDesc" content="${escape(description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`)
    .replace(/(<span class="upd-ver-badge" id="updBadge">).*?(<\/span>)/, `$1${escape(release.ver)}$2`)
    .replace(/(<span class="upd-top-date" id="updDate">).*?(<\/span>)/, `$1${escape(release.dateTr)}$2`)
    .replace('<select id="verPicker" aria-label="Sürüm seç" onchange="jumpTo(this.value)"></select>', `<select id="verPicker" aria-label="Sürüm seç" onchange="jumpTo(this.value)">${versions.map(version => `<option value="${version}"${version === release.ver ? ' selected' : ''}>${version}</option>`).join('')}</select>`)
    .replace('<h2 class="upd-post-title" id="updPostTitle"></h2>', `<h2 class="upd-post-title" id="updPostTitle">${escape(release.titleTr)}</h2>`)
    .replace('<div class="upd-intro" id="updIntro"></div>', `<div class="upd-intro" id="updIntro">${intro}</div>`)
    .replace('<div id="updSections"></div>', `<div id="updSections">${sections}</div>`)
    .replace('<div class="upd-outro" id="updOutro"></div>', `<div class="upd-outro" id="updOutro">${escape(release.outroTr)}</div>`)
    .replace('<nav class="upd-nav-row" id="updNavRow" aria-label="Sürüm gezinmesi"></nav>', `<nav class="upd-nav-row" id="updNavRow" aria-label="Sürüm gezinmesi">${newer}${older}</nav>`);
};

releases.forEach((release, index) => write(index === 0 ? 'updates.html' : `updates/${release.ver}/index.html`, render(release, index)));
let sitemap = read('sitemap.xml').replace(/\s*<!-- generated update versions -->[\s\S]*?<!-- end generated update versions -->/, '');
const entries = versions.slice(1).map(version => `  <url><loc>https://zenithw.space/updates/${version}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`).join('\n');
sitemap = sitemap.replace('</urlset>', `  <!-- generated update versions -->\n${entries}\n  <!-- end generated update versions -->\n</urlset>`);
write('sitemap.xml', sitemap);
console.log(`Generated ${releases.length} update pages`);
