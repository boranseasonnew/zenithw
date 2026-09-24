// Optional browser smoke test: PLAYWRIGHT_MODULE may point to an existing install.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {}) });
const fixtureDir = await mkdtemp(join(tmpdir(), 'zenithw-browser-test-'));
try {
  const fixture = join(fixtureDir, 'source.mp4');
  execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i','testsrc2=size=160x90:rate=15','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','2','-c:v','libx264','-c:a','aac',fixture]);
  const headersFile = await readFile('frontend/_headers', 'utf8');
  const csp = headersFile.match(/Content-Security-Policy: (.+)/)[1];
  const page = await browser.newPage();
  let uploads = 0;
  await page.route('**/*', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      uploads++;
      return route.fulfill({ status: 400, contentType: 'application/json', body: '{"error_code":"conversion_failed"}' });
    }
    if (!request.url().startsWith('http://127.0.0.1:8766/')) return route.abort();
    if (request.isNavigationRequest()) {
      const response = await route.fetch();
      return route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
    }
    return route.continue();
  });
  await page.goto('http://127.0.0.1:8766/convert.html');
  await page.locator('#localMediaMode').selectOption('only');
  await page.locator('#convFileInput').setInputFiles(fixture);
  await page.locator('.chip[data-v="mp4"]').click();
  await page.locator('#convBtn').click();
  await page.waitForFunction(() => document.querySelector('.local-media-panel progress').value === 1);
  assert.equal(uploads, 0, 'Local success must not upload');
  await page.reload();
  await page.locator('#localMediaMode').selectOption('only');
  await page.locator('#convFileInput').setInputFiles({ name: 'broken.mp4', mimeType: 'video/mp4', buffer: Buffer.from('broken media') });
  await page.locator('#convBtn').click();
  await page.waitForFunction(() => !document.querySelector('#localMediaMode').disabled);
  assert.equal(uploads, 0, 'Only-device failure must not upload');
  await page.locator('#localMediaMode').selectOption('preferred');
  await page.locator('#convBtn').click();
  const buttons = page.locator('.local-media-panel button');
  await buttons.nth(1).waitFor({ state: 'visible' });
  assert.equal(uploads, 0, 'Preferred failure must wait for consent');
  await buttons.nth(0).click();
  await page.waitForFunction(() => !document.querySelector('#localMediaMode').disabled);
  assert.equal(uploads, 0, 'Cancellation must not upload');
  await page.locator('#convBtn').click();
  await buttons.nth(1).click();
  await page.waitForTimeout(200);
  assert.equal(uploads, 1, 'Explicit consent permits one server request');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No mobile horizontal overflow');
  await page.goto('http://127.0.0.1:8766/remux.html');
  await page.locator('#localMediaMode').selectOption('only');
  await page.locator('input[type=file]').first().setInputFiles(fixture);
  await page.waitForFunction(() => document.querySelector('.local-media-panel progress').value === 1);
  assert.equal(uploads, 1, 'Remux local success must not upload');
  console.log('PASS: CSP, real Convert/Remux browser workers, failure privacy, cancel, explicit fallback, mobile width');
} finally { await browser.close(); await rm(fixtureDir, { recursive: true, force: true }); }
