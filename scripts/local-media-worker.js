import { Input, Output, Conversion, ALL_FORMATS, BlobSource, StreamTarget,
  Mp4OutputFormat, WebMOutputFormat, MkvOutputFormat, MovOutputFormat,
  Mp3OutputFormat, OggOutputFormat, FlacOutputFormat, WavOutputFormat,
  AdtsOutputFormat } from 'mediabunny';

const formats = {
  mp4: Mp4OutputFormat, m4v: Mp4OutputFormat, m4a: Mp4OutputFormat,
  webm: WebMOutputFormat, mkv: MkvOutputFormat, mov: MovOutputFormat,
  mp3: Mp3OutputFormat, ogg: OggOutputFormat, opus: OggOutputFormat,
  flac: FlacOutputFormat, wav: WavOutputFormat, aac: AdtsOutputFormat,
};
const audioOnly = new Set(['m4a', 'mp3', 'ogg', 'opus', 'flac', 'wav', 'aac']);

// One disposable worker per job: terminating it also releases parser memory.
self.onmessage = async ({ data: { file, format, limit } }) => {
  let input, verification;
  try {
    if (!Number.isFinite(limit) || limit <= 0 || !(file instanceof Blob) || !file.size || file.size > limit || limit > 64 * 1024 * 1024) throw Error('size');
    const Format = formats[format];
    if (!Format) throw Error('unsupported');
    input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const tracks = await input.getTracks();
    // Attachments/subtitles and arbitrary metadata are outside this beta contract.
    if (tracks.some(t => !t.isVideoTrack() && !t.isAudioTrack())) throw Error('unsupported');
    const expected = tracks.filter(t => !audioOnly.has(format) || t.isAudioTrack());
    if (!expected.length) throw Error('unsupported');
    if (format === 'opus' && (await Promise.all(expected.map(t => t.getCodec()))).some(codec => codec !== 'opus')) throw Error('unsupported');
    const duration = await input.computeDuration(expected);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 1800) throw Error('duration');
    const outputLimit = Math.min(128 * 1024 * 1024, limit * 2);
    let buffer = new Uint8Array(Math.min(outputLimit, file.size + 1024 * 1024)), size = 0;
    const target = new StreamTarget(new WritableStream({ write({ data, position }) {
      const end = position + data.length;
      if (end > outputLimit || position < 0) throw Error('size');
      if (end > buffer.length) {
        const next = new Uint8Array(Math.min(outputLimit, Math.max(end, buffer.length * 2)));
        next.set(buffer); buffer = next;
      }
      buffer.set(data, position); size = Math.max(size, end);
    }}));
    const output = new Output({ format: new Format(), target });
    const conversion = await Conversion.init({ input, output, tracks: 'all',
      copy: { mode: 'forced' }, video: { discard: audioOnly.has(format) } });
    if (!conversion.isValid || conversion.discardedTracks.some(t => t.reason !== 'discarded_by_user') || conversion.utilizedTracks.length !== expected.length) throw Error('unsupported');
    conversion.onProgress = value => self.postMessage({ type: 'progress', value: Math.min(0.95, value * 0.95) });
    await conversion.execute();
    if (!size) throw Error('empty');
    const blob = new Blob([buffer.subarray(0, size)], { type: audioOnly.has(format) && format === 'm4a' ? 'audio/mp4' : output.format.mimeType });
    verification = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
    const actual = await verification.getTracks();
    if (actual.length !== expected.length) throw Error('verification');
    for (let i = 0; i < actual.length; i++) {
      if (actual[i].isVideoTrack() !== expected[i].isVideoTrack() || await actual[i].getCodec() !== await expected[i].getCodec()) throw Error('verification');
      const before = await expected[i].computeDuration(), after = await actual[i].computeDuration();
      if (!Number.isFinite(after) || Math.abs(after - before) > Math.max(0.25, before * 0.01)) throw Error('verification');
    }
    const outDuration = await verification.computeDuration();
    if (!Number.isFinite(outDuration) || Math.abs(outDuration - duration) > Math.max(0.25, duration * 0.01)) throw Error('verification');
    self.postMessage({ type: 'done', blob });
  } catch (error) {
    const codes = ['size', 'unsupported', 'duration', 'empty', 'verification'];
    self.postMessage({ type: 'error', code: codes.includes(error.message) ? error.message : 'unsupported' });
  } finally {
    verification?.dispose(); input?.dispose();
  }
};
