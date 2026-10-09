import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { guides, GUIDE_DATE } from './seo-content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const frontend = join(root, 'frontend');
const origin = 'https://zenithw.space';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const read = path => readFileSync(join(frontend, path), 'utf8').replaceAll('\r\n', '\n');
const write = (path, text) => {
  const destination = join(frontend, path);
  if (existsSync(destination) && readFileSync(destination, 'utf8') === text) return;
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, text, 'utf8');
};
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
const routeFor = path => '/' + path.replaceAll('\\', '/').replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
const guideRoot = lang => lang === 'tr' ? '/guides' : '/en/guides';
const guideUrl = (lang, slug) => `${guideRoot(lang)}/${slug}`;
const linkList = links => `<div class="guide-actions">${links.map(([href, label]) => `<a href="${escape(href)}">${escape(label)} <span aria-hidden="true">↗</span></a>`).join('')}</div>`;
const cards = lang => `<div class="guide-grid">${guides.map((guide, index) => `<a class="guide-card" href="${guideUrl(lang, guide.slug)}"><span class="guide-index">${String(index + 1).padStart(2, '0')}</span><h2>${escape(guide[lang].heading)}</h2><p>${escape(guide[lang].description)}</p><span class="guide-card-end">${lang === 'tr' ? 'Rehberi oku' : 'Read the guide'} <span aria-hidden="true">↗</span></span></a>`).join('')}</div>`;

function guidePage(lang, guide) {
  const hub = !guide;
  const copy = guide?.[lang];
  const heading = copy?.heading || (lang === 'tr' ? 'Bağlantıdan dosyaya. Yolunu seç.' : 'From link to file. Find your way.');
  const title = copy?.title || (lang === 'tr' ? 'Video İndirme ve Dönüştürme Rehberleri | ZenithW' : 'Video Download and Conversion Guides | ZenithW');
  const description = copy?.description || (lang === 'tr' ? 'TikTok, Instagram Reels, video dönüştürme ve YouTube uygulama kullanımı için ZenithW rehberleri. Web, Android ve Windows seçeneklerini öğren.' : 'Practical ZenithW guides for TikTok, Instagram Reels, video conversion, and YouTube app access. Explore web, Android, and Windows options.');
  const lead = copy?.lead || (lang === 'tr' ? 'Doğru bağlantı, uygun format, cihazına uyan araç. Bu rehberler ZenithW’nin mevcut akışını ve erişim sınırlarını açıklar.' : 'The right link, a suitable format, and the tool for your device. These guides explain the current ZenithW workflow and its access limits.');
  const path = hub ? guideRoot(lang) : guideUrl(lang, guide.slug);
  const alternate = hub ? guideRoot(lang === 'tr' ? 'en' : 'tr') : guideUrl(lang === 'tr' ? 'en' : 'tr', guide.slug);
  const article = hub ? cards(lang) : `<div class="guide-layout"><nav class="guide-contents" aria-label="${lang === 'tr' ? 'Bu rehberde' : 'On this page'}"><span>${lang === 'tr' ? 'BU REHBERDE' : 'ON THIS PAGE'}</span>${copy.sections.map((section, index) => `<a href="#section-${index + 1}">${escape(section.heading)}</a>`).join('')}</nav><article class="guide-article">${copy.sections.map((section, index) => `<section id="section-${index + 1}"><h2>${escape(section.heading)}</h2>${section.paragraphs?.map(paragraph => `<p>${escape(paragraph)}</p>`).join('') || ''}${section.steps ? `<ol class="guide-steps">${section.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol>` : ''}${section.links ? linkList(section.links) : ''}</section>`).join('')}<aside class="guide-note"><h2>${lang === 'tr' ? 'İçeriği kullanmadan önce' : 'Before using the content'}</h2><p>${lang === 'tr' ? 'Kendi içeriğin veya kullanma iznin olan içerikler için işlem yap. Kaynağın erişim sınırları ve kullanım koşulları geçerlidir.' : 'Process your own content or content you have permission to use. Source access limits and usage terms still apply.'} <a href="/about/terms">${lang === 'tr' ? 'Kullanım koşulları' : 'Usage terms'}</a></p></aside></article></div>`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${origin + path}">
<link rel="alternate" hreflang="tr" href="${origin + (lang === 'tr' ? path : alternate)}">
<link rel="alternate" hreflang="en" href="${origin + (lang === 'en' ? path : alternate)}">
<link rel="alternate" hreflang="x-default" href="${origin + (lang === 'en' ? path : alternate)}">
<meta name="theme-color" content="#101113">
<link rel="stylesheet" href="/guides.css">
</head>
<body class="reader-body">
<a class="guide-skip" href="#main">${lang === 'tr' ? 'İçeriğe geç' : 'Skip to content'}</a>
<div class="guide-shell">
<header class="guide-header"><a class="guide-brand" href="/" aria-label="ZenithW"><img src="/zenithw.png" width="28" height="28" alt="">ZenithW</a><nav aria-label="${lang === 'tr' ? 'Sayfa bağlantıları' : 'Page links'}"><a href="${guideRoot(lang)}">${lang === 'tr' ? 'Rehberler' : 'Guides'}</a><a class="guide-open" href="/">${lang === 'tr' ? 'İndiriciyi aç' : 'Open downloader'} <span aria-hidden="true">↗</span></a></nav></header>
<main id="main"><nav class="guide-breadcrumb" aria-label="${lang === 'tr' ? 'İçerik yolu' : 'Breadcrumb'}"><a href="/">${lang === 'tr' ? 'Ana sayfa' : 'Home'}</a><span aria-hidden="true">/</span>${hub ? `<span>${lang === 'tr' ? 'Rehberler' : 'Guides'}</span>` : `<a href="${guideRoot(lang)}">${lang === 'tr' ? 'Rehberler' : 'Guides'}</a>`}</nav>
<header class="guide-hero"><span class="guide-kicker">ZENITHW / ${lang === 'tr' ? 'KULLANIM REHBERLERİ' : 'PRACTICAL GUIDES'}</span><h1>${escape(heading)}</h1><p>${escape(lead)}</p>${hub ? '' : `<p class="guide-byline">${lang === 'tr' ? 'ZenithW ekibi · Güncellendi' : 'ZenithW team · Updated'} <time datetime="${GUIDE_DATE}">${lang === 'tr' ? '7 Ekim 2026' : 'October 7, 2026'}</time></p>`}</header>
${article}
${hub ? `<section class="guide-apps"><h2>${lang === 'tr' ? 'Cihazına uygun devam et.' : 'Continue on your device.'}</h2><p>${lang === 'tr' ? 'Web indiricisi, Android uygulaması ve Windows uygulaması farklı erişim yolları sunar. Kullanılabilir içerik ve formatlar kaynağa bağlıdır.' : 'The web downloader, Android app, and Windows app offer different access paths. Available content and formats depend on the source.'}</p>${linkList([['/', lang === 'tr' ? 'Web indiricisi' : 'Web downloader'], ['/app', 'Android'], ['/pc-app', 'Windows']])}</section>` : `<section class="guide-related"><h2>${lang === 'tr' ? 'Diğer rehberleri keşfet' : 'Explore the other guides'}</h2>${cards(lang)}</section>`}
</main>
<footer class="guide-footer"><span>ZenithW · ${lang === 'tr' ? 'Bağımsız ve açık kaynak' : 'Independent and open source'}</span><nav aria-label="${lang === 'tr' ? 'Proje bilgileri' : 'Project information'}"><a href="/about">${lang === 'tr' ? 'Hakkında' : 'About'}</a><a href="/about/privacy">${lang === 'tr' ? 'Gizlilik' : 'Privacy'}</a><a href="/support">${lang === 'tr' ? 'Destek' : 'Support'}</a><a href="https://github.com/boranseasonnew/zenithw" rel="noopener noreferrer">GitHub ↗</a></nav></footer>
</div>
</body>
</html>
`;
}

for (const lang of ['tr', 'en']) {
  write(`${guideRoot(lang).slice(1)}.html`, guidePage(lang));
  guides.forEach(guide => write(`${guideUrl(lang, guide.slug).slice(1)}.html`, guidePage(lang, guide)));
}

// About is authoritative static markup translated by the shared language catalog.
// Older legal pages still render their trusted Turkish COPY at build time.
// Only trusted checked-in COPY declarations are evaluated, with no browser or network API.
for (const path of ['privacy.html', 'terms.html', 'dmca.html']) {
  let source = read(path);
  const declaration = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].find(match => /const COPY\s*=/.test(match[1]));
  if (!declaration) throw new Error(`Missing trusted COPY declaration: ${path}`);
  const context = vm.createContext({});
  vm.runInContext(declaration[1] + '\nglobalThis.pageCopy = COPY;', context, { timeout: 1000 });
  const copy = context.pageCopy.tr;
  for (const [id, content] of [['pgBody', copy.body], ['pgFooter', copy.footer]]) {
    if (typeof content !== 'string') throw new Error(`Missing ${id} copy: ${path}`);
    const pattern = new RegExp(`(<(article|footer)[^>]*id="${id}"[^>]*>)[\\s\\S]*?(<\\/\\2>)`);
    source = source.replace(pattern, (_, opening, tag, closing) => opening + content + closing);
  }
  write(path, source);
}

const homeBlock = `<!-- generated discovery content -->
<section class="discovery" aria-labelledby="discovery-title" lang="tr">
  <span class="guide-kicker">ZENITHW / WEB · ANDROID · WINDOWS</span>
  <h1 id="discovery-title">Ücretsiz video ve ses indirici.</h1>
  <p class="discovery-lead">TikTok, Instagram, X, Reddit, Pinterest ve SoundCloud gibi desteklenen kaynaklardan video veya ses kaydet. Bağlantını yukarıya yapıştır, uygun modu seç ve dosyanı indir.</p>
  <div class="discovery-platforms"><a href="/app">Android uygulaması ↗</a><a href="/pc-app">Windows uygulaması ↗</a><a href="/convert">Video ve ses dönüştür ↗</a><a href="/remux">Kayıpsız remux ↗</a></div>
  <section class="discovery-how"><h2>Nasıl kullanılır?</h2><ol class="guide-steps"><li>Profil adresi yerine kaydetmek istediğin paylaşımın bağlantısını kopyala.</li><li>Bağlantıyı yapıştırıp devam et. Video ve ses için otomatik, yalnızca ses için ses modunu kullan.</li><li>İndirme planını kontrol et ve indir. Kullanılabilir kalite, kaynak paylaşımın sunduğu akışlara bağlıdır.</li></ol></section>
  <div class="discovery-heading"><h2>İlk bağlantından son dosyana.</h2><a href="/guides">Tüm rehberler ↗</a></div>
  ${cards('tr')}
  <section class="discovery-faq"><h2>Sık sorulan sorular</h2>
    <details><summary>ZenithW ücretsiz mi, hesap gerekiyor mu?</summary><p>Web araçları ücretsizdir ve ZenithW hesabı açmanı gerektirmez. Kaynak platformun erişim kısıtları yine geçerlidir.</p></details>
    <details><summary>YouTube bağlantıları webde çalışıyor mu?</summary><p>YouTube indirmeleri şu anda web sürümünde kapalıdır. <a href="/app">Android</a> veya <a href="/pc-app">Windows</a> uygulamasında cihaz bağlantın üzerinden deneyebilirsin. Erişim yine videoya ve kaynak koşullarına bağlıdır.</p></details>
    <details><summary>Özel veya silinmiş paylaşımlar indirilebilir mi?</summary><p>Kaynağa erişilemiyorsa dosya hazırlanamaz. Tarayıcında açık olan hesap, oturumunu otomatik olarak web sunucusuna aktarmaz.</p></details>
    <details><summary>Dönüştürme ile remux arasındaki fark ne?</summary><p>Remux uyumlu akışları yeniden kodlamadan taşır. Farklı bir codec gerektiğinde dönüştürme kullanılır. <a href="/guides/convert-vs-remux">Format ve uyumluluk rehberini oku.</a></p></details>
  </section>
  <footer class="guide-footer"><span>Bağımsız, reklamsız ve açık kaynak.</span><nav aria-label="Proje ve destek"><a href="/about">Hakkında</a><a href="/about/privacy">Gizlilik</a><a href="/about/terms">Koşullar</a><a href="/support">İletişim</a><a href="/updates">Güncellemeler</a><a href="https://www.instagram.com/zenithwonline/" rel="noopener noreferrer">Instagram ↗</a></nav></footer>
</section>
<!-- end generated discovery content -->`;
let homepage = read('index.html');
if (homepage.includes('<!-- generated discovery content -->')) {
  homepage = homepage.replace(/<!-- generated discovery content -->[\s\S]*?<!-- end generated discovery content -->/, homeBlock);
} else {
  homepage = homepage.replace('<!-- SUPPORTED SERVICES POPOVER -->', homeBlock + '\n\n<!-- SUPPORTED SERVICES POPOVER -->');
}
if (!homepage.includes('href="/guides.css"') && !homepage.includes('/cache-assets/guides.')) homepage = homepage.replace('</head>', '<link rel="stylesheet" href="/guides.css">\n</head>');
homepage = homepage.replace('id="urlInput" data-i18n-ph=', 'id="urlInput" aria-label="Video veya ses paylaşım bağlantısı" data-i18n-ph=');
if (!homepage.includes('<main id="home-main">')) {
  homepage = homepage.replace('<div class="page">', '<main id="home-main">\n<div class="page">');
  homepage = homepage.replace('<!-- end generated discovery content -->', '<!-- end generated discovery content -->\n</main>');
}
write('index.html', homepage);

// Canonical URLs are also used in ordinary, crawlable navigation.
for (const file of walk(frontend).filter(file => file.endsWith('.html'))) {
  const path = relative(frontend, file).replaceAll('\\', '/');
  let source = read(path).replace(/href="\/(app|pc-app|convert|remux|support)\.html"/g, 'href="/$1"');
  if (['convert.html', 'remux.html', 'app.html', 'pc-app.html', 'support.html', 'about.html'].includes(path) && !source.includes('class="guide-entry"')) {
    source = source.replace('</main>', '<nav class="guide-entry" aria-label="Kullanım rehberleri"><a href="/guides">Kullanım rehberleri ↗</a></nav>\n</main>');
    if (!source.includes('href="/guides.css"') && !source.includes('/cache-assets/guides.')) source = source.replace('</head>', '<link rel="stylesheet" href="/guides.css">\n</head>');
  }
  write(path, source);
}

const titles = {
  '/': ['Ücretsiz Video İndirici: TikTok, Instagram | ZenithW', 'TikTok, Instagram, X ve desteklenen diğer kaynaklardan video veya ses indir. ZenithW web araçlarını, Android ve Windows uygulamalarını keşfet.'],
  '/app': ['ZenithW Android: Ücretsiz Video İndirme Uygulaması', 'ZenithW Android uygulamasını resmi indirme bağlantısından edin. Video ve ses indirme seçeneklerini cihazının internet bağlantısıyla kullan.'],
  '/pc-app': ['ZenithW Windows: Ücretsiz Video ve Ses İndirici', 'ZenithW Windows uygulamasını keşfet. Cihaz bağlantısıyla video ve ses indir, uygun format ve kalite seçeneklerini kullan.'],
  '/convert': ['Ücretsiz Video ve Ses Dönüştürücü: MP4, MP3 | ZenithW', 'Video ve ses dosyalarını ZenithW ile uygun formatlara dönüştür. MP4, WebM ve MP3 seçeneklerini, uyumluluk ve işlem planını incele.'],
  '/remux': ['Kayıpsız Video Remux Aracı | ZenithW', 'Uyumlu video ve ses akışlarını yeniden kodlamadan paketle. ZenithW remux aracıyla konteyner ve codec uyumluluğunu koruyan yolu seç.'],
  '/about': ['ZenithW Nedir? Web, Android ve Windows Medya Araçları', 'ZenithW’nin açık kaynak yaklaşımını, video ve ses araçlarını, veri işleme sınırlarını ve proje iletişim bilgilerini öğren.'],
};
const organization = {
  '@type': 'Organization', '@id': origin + '/#organization', name: 'ZenithW', url: origin + '/',
  logo: { '@type': 'ImageObject', url: origin + '/zenithw.png' },
  sameAs: ['https://github.com/boranseasonnew/zenithw', 'https://www.instagram.com/zenithwonline/'],
};
function breadcrumbs(path, lang, label) {
  const items = [{ name: lang === 'en' ? 'Home' : 'Ana sayfa', item: origin + '/' }];
  const hub = guideRoot(lang);
  if (path.startsWith(hub + '/')) items.push({ name: lang === 'en' ? 'Guides' : 'Rehberler', item: origin + hub });
  else if (path.startsWith('/updates/')) items.push({ name: 'Güncellemeler', item: origin + '/updates' });
  else if (path.startsWith('/about/')) items.push({ name: 'Hakkında', item: origin + '/about' });
  if (path !== '/') items.push({ name: label, item: origin + path });
  return { '@type': 'BreadcrumbList', '@id': origin + path + '#breadcrumb', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })) };
}
const sitemapPages = new Map();
for (const file of walk(frontend).filter(file => file.endsWith('.html'))) {
  const path = relative(frontend, file).replaceAll('\\', '/');
  let source = read(path);
  if (/name="robots"[^>]*content="[^"]*noindex/.test(source)) continue;
  const canonical = /rel="canonical"\s+href="([^"]+)"/.exec(source)?.[1];
  if (!canonical?.startsWith(origin)) continue;
  const url = new URL(canonical), pathname = url.pathname;
  const lang = /<html\s+lang="([^"]+)"/.exec(source)?.[1] || 'tr';
  const guide = guides.find(guide => guideUrl(lang, guide.slug) === pathname);
  const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
  const title = titles[pathname]?.[0] || decode(/<title[^>]*>(.*?)<\/title>/s.exec(source)?.[1] || 'ZenithW');
  const description = titles[pathname]?.[1] || decode(/<meta\s+name="description"[^>]*content="([^"]*)"/.exec(source)?.[1] || title);
  source = source.replace(/(<title[^>]*>)[\s\S]*?(<\/title>)/, (_, opening, closing) => opening + escape(title) + closing);
  source = source.replace(/(<meta\s+name="description"[^>]*content=")[^"]*(")/, (_, opening, closing) => opening + escape(description) + closing);
  const graph = [organization, { '@type': 'WebSite', '@id': origin + '/#website', url: origin + '/', name: 'ZenithW', alternateName: 'ZenithW Video Downloader', inLanguage: ['tr', 'en'], publisher: { '@id': origin + '/#organization' } }];
  const page = { '@type': guide ? 'TechArticle' : 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, description, inLanguage: lang, isPartOf: { '@id': origin + '/#website' }, publisher: { '@id': origin + '/#organization' } };
  if (guide) Object.assign(page, { headline: guide[lang].heading, datePublished: GUIDE_DATE, dateModified: GUIDE_DATE, author: { '@id': origin + '/#organization' }, mainEntityOfPage: canonical });
  graph.push(page);
  if (pathname !== '/') graph.push(breadcrumbs(pathname, lang, guide?.[lang].heading || title));
  if (['/', '/convert', '/remux', '/app', '/pc-app'].includes(pathname)) graph.push({ '@type': pathname === '/app' || pathname === '/pc-app' ? 'SoftwareApplication' : 'WebApplication', '@id': canonical + '#app', name: pathname === '/app' ? 'ZenithW Android' : pathname === '/pc-app' ? 'ZenithW Windows' : pathname === '/convert' ? 'ZenithW Converter' : pathname === '/remux' ? 'ZenithW Remux' : 'ZenithW', url: canonical, description, applicationCategory: 'MultimediaApplication', operatingSystem: pathname === '/app' ? 'Android' : pathname === '/pc-app' ? 'Windows' : 'Web browser', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@id': origin + '/#organization' } });
  const separator = source.indexOf('</head>');
  let head = source.slice(0, separator);
  head = head.replace(/\s*<!-- generated SEO metadata -->[\s\S]*?<!-- end generated SEO metadata -->/g, '')
    .replace(/\s*<meta\s+(?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g, '')
    .replace(/\s*<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replaceAll('<', '\\u003c');
  const metadata = `\n<!-- generated SEO metadata -->
<meta property="og:type" content="${guide ? 'article' : 'website'}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="ZenithW">
<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'tr_TR'}">
<meta property="og:image" content="${origin}/zenithw.png">
<meta property="og:image:alt" content="ZenithW">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${origin}/zenithw.png">
<script type="application/ld+json">\n${schema}\n</script>
<!-- end generated SEO metadata -->\n`;
  if (!head.includes('name="robots"')) head += '\n<meta name="robots" content="index, follow, max-image-preview:large">\n';
  if (!head.includes('rel="icon"')) head += '\n<link rel="icon" href="/favicon.ico">\n';
  source = head.trimEnd() + metadata + source.slice(separator);
  write(path, source);
  // Exclude physical aliases and the latest release copy, whose canonical is /updates.
  if (routeFor(path) === pathname) sitemapPages.set(canonical, { path, guide: !!guide || pathname === '/guides' || pathname === '/en/guides' });
}

const oldSitemap = read('sitemap.xml');
const oldDates = new Map([...oldSitemap.matchAll(/<url>\s*<loc>(.*?)<\/loc>(?:\s*<lastmod>(.*?)<\/lastmod>)?/g)].map(match => [match[1], match[2]]));
const changedContent = new Set(['/', '/app', '/pc-app', '/convert', '/remux', '/about', '/about/privacy', '/about/terms', '/dmca']);
const entries = [...sitemapPages].sort(([a], [b]) => a.localeCompare(b)).map(([url, details]) => {
  const date = details.guide || changedContent.has(new URL(url).pathname) ? GUIDE_DATE : oldDates.get(url);
  return `  <url><loc>${escape(url)}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`;
});
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
// The crawler must be able to see noindex on private UI and inspect legitimate assets.
// Keep API/transfer restrictions on the separate backend, not as a site-wide robots block.
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`SEO HTML generated: ${sitemapPages.size} canonical URLs, ${guides.length * 2} articles, 2 guide hubs; existing private pages remain noindex.`);
