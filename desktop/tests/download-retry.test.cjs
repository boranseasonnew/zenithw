const { test } = require('node:test');
const assert = require('node:assert/strict');
const { retryDownload, redactDiagnostic } = require('../src/download-retry.cjs');

test('aria2 transport failure switches to native and refreshes only once', () => {
  assert.deepEqual(retryDownload({ attempt: 0, code: 1, error: 'ERROR: aria2c exited with code 22', useAria2: true }),
    { useAria2: false, refreshed: true, reason: 'aria2' });
  assert.equal(retryDownload({ attempt: 1, code: 1, error: 'HTTP Error 403: Forbidden', useAria2: false, refreshed: true }), null);
});
test('expired native media URLs are re-extracted without an unbounded retry', () => {
  assert.equal(retryDownload({ attempt: 0, code: 1, error: 'HTTP Error 403: Forbidden', useAria2: false }).reason, 'expired');
  assert.equal(retryDownload({ attempt: 2, code: 1, error: 'HTTP Error 410', useAria2: false }), null);
});
test('success and unrelated failures do not trigger a download retry', () => {
  for (const [code, error] of [[0, ''], [1, 'ffmpeg: conversion failed'], [1, 'Sign in to confirm your age'], [1, 'Video unavailable']]) {
    assert.equal(retryDownload({ attempt: 0, code, error, useAria2: true }), null);
  }
});
test('private headers and signed URLs are removed from recovery diagnostics', () => {
  const result = redactDiagnostic('HTTP Error 403 https://media.test/video?sig=secret\nCookie: SID=secret\nAuthorization: Bearer secret');
  assert.doesNotMatch(result, /secret/);
  assert.match(result, /HTTP Error 403/);
});
