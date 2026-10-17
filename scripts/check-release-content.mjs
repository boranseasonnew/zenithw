import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const version = runInNewContext(`${readFileSync('frontend/version.js', 'utf8')}\nZW_VERSION`);
const { ver, repo, asset } = version.desktop;
const expectedUrl = `${repo}/releases/download/${ver}/${asset}`;
const config = JSON.parse(readFileSync('shared/site-config.json', 'utf8'));
const app = readFileSync('frontend/app.d4596317c4a7.js', 'utf8');
const index = readFileSync('frontend/index.html', 'utf8');

const latestUrl=`${repo}/releases/latest`;
assert.equal(config.windows.version, ver.slice(1), 'Downloads and desktop version metadata must agree');
assert.equal(config.windows.installer.url, expectedUrl);
assert.equal(config.windows.installer.name, asset);
assert.equal(config.windows.release, latestUrl);
assert.equal(config.android.release, 'https://github.com/boranseasonnew/zenithw-android/releases/latest');
const assets = [config.windows.installer, config.windows.portable, ...config.android.apks];
for (const platform of ['windows', 'android']) {
  const release = config[platform];
  const files = platform === 'windows' ? [release.installer, release.portable] : release.apks;
  for (const url of [release.checksums, ...files.map(file => file.url)]) {
    assert.ok(url.includes(`/releases/download/v${release.version}/`), `${platform}: asset version must match displayed version`);
  }
  for (const file of files) assert.ok(Number.isInteger(file.bytes) && file.bytes > 0, `${platform}: valid file size`);
}
for (const lang of ['tr', 'en', 'de', 'fr', 'ru', 'vi', 'zh', 'ja']) {
  const downloads = readFileSync(`frontend/${lang === 'tr' ? '' : lang + '/'}downloads.html`, 'utf8');
  for (const platform of ['windows', 'android']) {
    const release = config[platform];
    assert.ok(downloads.includes(`v${release.version} · ${release.requirements}`), `${lang}: ${platform} version and requirements`);
    for (const url of [release.release, release.checksums]) assert.ok(downloads.includes(`href="${url}"`), `${lang}: ${url}`);
  }
  for (const { url, name } of assets) {
    assert.ok(url.endsWith('/' + name), name);
    assert.ok(downloads.includes(`href="${url}"`), `${lang}: ${name}`);
  }
}
assert.match(expectedUrl, /\/releases\/download\/v\d+\.\d+\.\d+\/Zenith-\d+\.\d+\.\d+-Windows-Setup\.exe$/);
assert.equal(asset, `Zenith-${ver.slice(1)}-Windows-Setup.exe`);
for (const file of ['README.md', 'README.tr.md', 'README.fr.md', 'README.de.md', 'README.ja.md']) {
  assert.match(readFileSync(file, 'utf8'), new RegExp(`ZenithW Desktop ${ver.replaceAll('.', '\\.')}`), file);
}
if (existsSync('desktop/package.json')) {
  assert.equal(`v${JSON.parse(readFileSync('desktop/package.json', 'utf8')).version}`, ver);
}
assert.doesNotMatch(app, /kakangeldi82-netizen|youtube support is active|youtube desteği aktif|le support youtube est actif|youtube-unterstützung ist aktiv/i);
assert.doesNotMatch(index, /<span class=>/);
console.log(`Desktop release content matches ${ver} and the current repository.`);
