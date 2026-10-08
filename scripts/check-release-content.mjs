import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const version = runInNewContext(`${readFileSync('frontend/version.js', 'utf8')}\nZW_VERSION`);
const { ver, repo, asset } = version.desktop;
const expectedUrl = `${repo}/releases/download/${ver}/${asset}`;
const pc = readFileSync('frontend/pc-app.html', 'utf8');
const app = readFileSync('frontend/app.d4596317c4a7.js', 'utf8');
const index = readFileSync('frontend/index.html', 'utf8');

const latestUrl=`${repo}/releases/latest`;
assert.equal(pc.split(latestUrl).length-1,2,'Both Windows download buttons open the official latest release');
assert.ok(pc.includes(`Desktop ${ver.slice(1,-2)}`),'App page advertises the current desktop generation');
assert.ok(expectedUrl.includes('/releases/download/v4.0.0/Zenith-4.0.0-Windows-Setup.exe'));
for (const file of ['README.md', 'README.tr.md', 'README.fr.md', 'README.de.md', 'README.ja.md']) {
  assert.match(readFileSync(file, 'utf8'), new RegExp(`ZenithW Desktop ${ver.replaceAll('.', '\\.')}`), file);
}
if (existsSync('desktop/package.json')) {
  assert.equal(`v${JSON.parse(readFileSync('desktop/package.json', 'utf8')).version}`, ver);
}
assert.doesNotMatch(app, /kakangeldi82-netizen|youtube support is active|youtube desteği aktif|le support youtube est actif|youtube-unterstützung ist aktiv/i);
assert.doesNotMatch(index, /<span class=>/);
console.log(`Desktop release content matches ${ver} and the current repository.`);
