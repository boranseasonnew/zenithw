import { writeFileWithRetry as writeFileSync } from '../shared/build-files.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const frontend = join(repository, 'frontend');
const output = join(frontend, 'cache-assets');
const manifestPath = join(repository, 'scripts/cache-assets-manifest.json');
const check = process.argv.includes('--check');
execFileSync(process.platform === 'win32' ? 'python' : 'python3',
  [join(repository, 'scripts/update_csp.py'), ...(check ? ['--check'] : [])], { stdio: 'inherit' });
// Keep the checked-in source URLs available for old pages and development.
// Only generated, content-hashed copies receive immutable response headers.
const sources = [
  'downloads.js', 'downloads.css', 'site-community.css', ...['microsoft-store','f-droid','uptodown','telegram'].map(brand=>'brands/'+brand+'.svg'),
  'site-language.js', 'site-language.css', ...['tr','en','fr','de','ru','vi','zh','ja'].map(lang=>'locales/'+lang+'.json'),
  'app.d4596317c4a7.js', 'style.487d49f0164d.css',
  'updates-core.99daf4ea6088.js', 'updates-archive.07c744021db2.js',
  'updates.4afebabda436.css', 'info.6c44eb6f52e7.css',
  'info-page.412ae0f21fba.js', 'compare.a0575b77ab4c.css',
  'fonts.css', 'fonts/GeistMono-Variable.woff2', 'guides.css',
  'pc-app.css', 'pc-app.js', 'app-pages.js', 'desktop-preview/quick-options.png', 'desktop-preview/workspace.png',
  'desktop-preview/settings.png', 'desktop-preview/setup.png',
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
const changed = [];
function write(path, bytes) {
  const buffer = Buffer.from(bytes);
  if (existsSync(path) && readFileSync(path).equals(buffer)) return;
  changed.push(relative(repository, path).replaceAll('\\', '/'));
  if (!check) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, buffer);
  }
}
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const manifest = {};
const building = new Set();
const replaceReference = (text, source, url) => {
  const escaped = source.replace(/[.*+?^$(){\}|[\]\\]/g, '\\$&');
  return text.replace(new RegExp('(?<![\\w/.-])/?' + escaped + '(?:\\?[^\\s\\x22\\x27<>)]*)?', 'g'), url);
};
function fingerprint(source) {
  if (manifest[source]) return manifest[source].url;
  if (building.has(source)) throw new Error('Circular static asset dependency: ' + source);
  building.add(source);
  let bytes = readFileSync(join(frontend, source));
  if (['.js', '.css'].includes(extname(source))) {
    let text = bytes.toString('utf8').replaceAll('\r\n', '\n');
    for (const dependency of sources) {
      if (dependency === source || !text.includes(dependency)) continue;
      const url = fingerprint(dependency);
      text = replaceReference(text, dependency, url);
    }
    bytes = Buffer.from(text);
  }
  const digest = hash(bytes);
  const filename = source.split('/').at(-1).replace(/(?:\.[a-f0-9]{12})?(\.[^.]+)$/, '.' + digest.slice(0, 12) + '$1');
  const url = '/cache-assets/' + filename;
  manifest[source] = { url, sha256: digest };
  write(join(frontend, url.slice(1)), bytes);
  building.delete(source);
  return url;
}
sources.forEach(fingerprint);
for (const path of walk(frontend).filter(path => path.endsWith('.html'))) {
  let text = readFileSync(path, 'utf8');
  for (const source of sources) {
    const url = manifest[source].url;
    if (previous[source]) text = text.replaceAll(previous[source].url, url);
    text = replaceReference(text, source, url);
    // The hash already versions this URL; remove old ?v= cache-key variants.
    text = replaceReference(text, url.slice(1), url);
  }
  write(path, text);
}
write(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const immutable = new Set(Object.values(manifest).map(entry => entry.url));
if (existsSync(output)) {
  for (const path of walk(output)) {
    const filename = path.split(/[\\/]/).at(-1);
    const match = /\.([a-f0-9]{12})\.[^.]+$/.exec(filename);
    if (!match || hash(readFileSync(path)).slice(0, 12) !== match[1]) {
      throw new Error('Unsafe file in the immutable output directory: ' + path);
    }
    immutable.add('/' + relative(frontend, path).replaceAll('\\', '/'));
  }
}
const assetExtensions = new Set(['.js', '.css', '.woff', '.woff2', '.ttf', '.otf', '.ico', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.txt', '.xml']);
const ordinary = walk(frontend)
  .map(path => '/' + relative(frontend, path).replaceAll('\\', '/'))
  .filter(url => !url.startsWith('/cache-assets/') && (assetExtensions.has(extname(url)) || (url.startsWith('/locales/') && extname(url)==='.json')))
  .sort();
const noStore = new Set(['/runtime-config.js']);
const revalidate = new Set(['/version.js']);
const cachePolicy = url => {
  if (immutable.has(url)) return 'public, max-age=31536000, immutable';
  if (noStore.has(url)) return 'no-store, max-age=0, must-revalidate';
  if (revalidate.has(url)) return 'public, max-age=0, must-revalidate';
  if (['/robots.txt', '/sitemap.xml'].includes(url)) return 'public, max-age=0, s-maxage=300, must-revalidate';
  if (url.startsWith('/fonts/')) return 'public, max-age=86400, s-maxage=604800, must-revalidate';
  return 'public, max-age=3600, must-revalidate';
};
const originalHeaders = readFileSync(join(frontend, '_headers'), 'utf8');
const security = originalHeaders.split(/\r?\n\r?\n/)[0];
const blocks = [security, '# Generated by scripts/build-cache-assets.mjs; do not add a global cache policy.'];
// Every file in cache-assets was verified above. One scoped rule keeps older
// fingerprints available without spending a Pages rule for each release.
for (const url of [...ordinary].sort()) {
  blocks.push(url + '\n  Cache-Control: ' + cachePolicy(url)
    + (noStore.has(url) || revalidate.has(url) ? '\n  CDN-Cache-Control: no-store\n  Cloudflare-CDN-Cache-Control: no-store' : ''));
}
blocks.push('/cache-assets/*\n  Cache-Control: public, max-age=31536000, immutable');
for (const url of ['/maintenance', '/maintenance.html', '/maintenance-config.json']) {
  blocks.push(url + '\n  Cache-Control: no-store, max-age=0, must-revalidate\n  CDN-Cache-Control: no-store\n  Cloudflare-CDN-Cache-Control: no-store\n  X-Robots-Tag: noindex, nofollow, noarchive');
}
// The Function sets HTML headers after the maintenance decision. Do not match
// /*.html here: Pages merges matching headers instead of replacing earlier ones.
const headers = blocks.join('\n\n') + '\n';
if (headers.split('\n').some(line => line.length > 2000)) throw new Error('A Pages _headers line exceeds 2000 characters.');
if (blocks.filter(block => block.startsWith('/')).length > 100) throw new Error('Pages _headers exceeds 100 rules. Review retained immutable assets.');
write(join(frontend, '_headers'), headers);
const exclude = [...new Set(['/cache-assets/*', '/fonts/*', '/vendor/*', ...ordinary.filter(url => !url.startsWith('/fonts/') && !url.startsWith('/vendor/'))])];
if (exclude.length + 1 > 100 || exclude.some(url => url.length > 100)) throw new Error('Pages Function route limits exceeded.');
write(join(frontend, '_routes.json'), JSON.stringify({ version: 1, include: ['/*'], exclude }, null, 2) + '\n');
write(join(repository, 'shared/pages-cache-assets.mjs'),
  '// Generated by scripts/build-cache-assets.mjs.\nexport const STATIC_ASSET_PATHS = new Set('
  + JSON.stringify([...new Set([...ordinary, ...immutable])].sort(), null, 2) + ');\n');
if (check && changed.length) {
  console.error('Cache outputs are stale; run npm run build:cache:\n' + changed.join('\n'));
  process.exitCode = 1;
} else console.log('Cache configuration ' + (check ? 'verified' : 'generated') + ': ' + immutable.size + ' immutable assets, ' + ordinary.length + ' ordinary assets.');
