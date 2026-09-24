import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('local media copies tracks, rejects incompatible codecs and malformed input', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zenithw-media-test-'));
  let response;
  globalThis.self = { postMessage: data => { if (data.type !== 'progress') response = data; } };
  await import('../scripts/local-media-worker.js');
  const run = async (file, format, limit = 64 * 1024 * 1024) => {
    response = null;
    await self.onmessage({ data: { file, format, limit } });
    return response;
  };
  try {
    execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i','testsrc2=size=160x90:rate=15','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','2','-c:v','libx264','-c:a','aac',join(dir,'source.mp4')]);
    const file = new Blob([await readFile(join(dir,'source.mp4'))]);
    const copied = await run(file, 'mp4');
    assert.equal(copied.type, 'done', JSON.stringify(copied));
    assert.ok(copied.blob.size > 0);
    const audio = await run(file, 'm4a');
    assert.equal(audio.type, 'done', JSON.stringify(audio));
    assert.equal(audio.blob.type, 'audio/mp4');
    const incompatible = await run(file, 'webm');
    assert.equal(incompatible.type, 'error');
    assert.equal(incompatible.code, 'unsupported');
    assert.equal((await run(new Blob(['broken media']), 'mp4')).type, 'error');
    assert.equal((await run(file, 'mp4', 1)).code, 'size');
    assert.equal((await run(file, 'avi')).code, 'unsupported');
    assert.equal((await run(file, 'mp4', NaN)).code, 'size');
    assert.equal((await run(new Blob([]), 'mp4')).code, 'size');
    execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1','-c:a','libvorbis',join(dir,'vorbis.ogg')]);
    const vorbis = new Blob([await readFile(join(dir,'vorbis.ogg'))]);
    assert.equal((await run(vorbis, 'opus')).code, 'unsupported');
    assert.equal((await run(vorbis, 'ogg')).type, 'done');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
