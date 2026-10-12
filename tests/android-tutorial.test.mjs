import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {youtubeVideoId, tutorialEmbedUrl} from '../frontend/android-tutorial.js';
import {downloadCopy} from '../scripts/downloads-content.mjs';
import {PAGES_CSP} from '../shared/pages-security.mjs';

const config = JSON.parse(readFileSync(new URL('../shared/site-config.json', import.meta.url), 'utf8'));
const id = 'N-Xws_fw8xs';
test('extracts the configured video from supported YouTube HTTPS formats', () => {
  for (const url of [config.android.tutorial, `https://youtu.be/${id}?si=ignored`, `https://www.youtube.com/watch?v=${id}`, `https://m.youtube.com/shorts/${id}`, `https://youtube.com/embed/${id}`]) assert.equal(youtubeVideoId(url), id);
});
test('rejects untrusted origins, credentials, ports, schemes and malformed IDs', () => {
  for (const url of ['', id, `http://youtu.be/${id}`, `https://youtu.be.evil.example/${id}`, `https://evil.example/watch?v=${id}`, `https://user@youtu.be/${id}`, `https://youtu.be:8080/${id}`, `javascript:alert(1)`, `https://youtu.be/${id}/extra`, 'https://youtube.com/watch?v=<script>', 'https://www.youtube.com/watch?v=short']) assert.equal(youtubeVideoId(url), null, url);
});
test('constructs a fixed privacy-enhanced embed without carrying source parameters', () => {
  const url = new URL(tutorialEmbedUrl(`https://youtu.be/${id}?si=secret&autoplay=0&origin=https://evil.example`, 'tr'));
  assert.equal(url.origin, 'https://www.youtube-nocookie.com');
  assert.equal(url.pathname, '/embed/' + id);
  assert.equal(url.searchParams.get('hl'), 'tr');
  assert.equal(url.searchParams.get('playsinline'), '1');
  assert.equal(url.searchParams.get('autoplay'), '1');
  assert.equal(url.searchParams.has('si'), false);
  assert.equal(url.searchParams.has('origin'), false);
  assert.equal(tutorialEmbedUrl('https://evil.example/video', 'en'), null);
});
test('all eight generated Downloads pages contain translated accessible controls and no eager YouTube resources', () => {
  for (const lang of ['tr', 'en', 'de', 'fr', 'ru', 'vi', 'zh', 'ja']) {
    const path = '../frontend/' + (lang === 'tr' ? '' : lang + '/') + 'downloads.html';
    const html = readFileSync(new URL(path, import.meta.url), 'utf8');
    const copy = downloadCopy[lang];
    assert.ok(html.includes(copy['Watch Android Tutorial']), lang);
    assert.ok(html.includes(copy['Learn how to use the Android app, step by step.']), lang);
    assert.ok(html.includes(`aria-label="${copy['Close tutorial']}"`), lang);
    assert.ok(html.includes('aria-haspopup="dialog"'));
    assert.ok(html.includes('aria-labelledby="androidTutorialTitle"'));
    assert.ok(html.includes('closedby="any"'));
    assert.doesNotMatch(html, /<iframe\b|<[^>]+(?:src|href)="https:\/\/(?:www\.)?(?:youtube|youtu\.be|ytimg)/);
    for (const apk of config.android.apks) assert.ok(html.includes('href="' + apk.url + '"'));
  }
});
test('the parent CSP permits only the self origin and privacy-enhanced frame origin', () => {
  assert.ok(PAGES_CSP.includes("frame-src 'self' https://www.youtube-nocookie.com;"));
  assert.doesNotMatch(PAGES_CSP, /script-src[^;]*youtube/);
});

test('the redesigned hub retains direct files and progressive mobile controls in every language', () => {
  for (const lang of ['tr', 'en', 'de', 'fr', 'ru', 'vi', 'zh', 'ja']) {
    const html = readFileSync(new URL('../frontend/' + (lang === 'tr' ? '' : lang + '/') + 'downloads.html', import.meta.url), 'utf8');
    assert.ok(html.includes(downloadCopy[lang]['Your device. Your ZenithW.']), lang);
    assert.ok(html.includes(downloadCopy[lang]['Download for Windows']), lang);
    assert.ok(html.includes(downloadCopy[lang]['Download for Android']), lang);
    assert.ok(html.includes('id="platformTabs" hidden'));
    assert.ok(html.includes('aria-controls="android"'));
    assert.ok(html.includes('aria-controls="windows"'));
    assert.ok(html.includes('href="'+config.windows.installer.url+'"'));
    assert.ok(html.includes('href="'+config.windows.portable.url+'"'));
    assert.ok(html.includes('class="downloads-menu"'));
    assert.ok(html.includes('href="'+config.android.apks[0].url+'"'));
  }
});

test('brand SVGs are local and contain no executable code or remote dependencies', () => {
  for (const file of ['windows.svg','android.svg','github.svg','microsoft-store-icon.svg','f-droid-icon.svg','uptodown-icon.svg']) {
    const svg = readFileSync(new URL('../frontend/brands/'+file, import.meta.url), 'utf8');
    assert.match(svg, /<svg\b/);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\son\w+=|(?:href|src)="https?:\/\//i);
  }
});
