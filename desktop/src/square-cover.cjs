'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const SUPPORTED = new Set(['.mp3', '.m4a', '.mp4', '.flac', '.mkv', '.mov']);
const UNSUPPORTED = new Set(['.opus', '.ogg', '.wav', '.aac', '.webm', '.avi', '.flv']);
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const FILTER = 'crop=min(iw\\,ih):min(iw\\,ih),scale=3000:3000:flags=lanczos,setsar=1';
const PROBE_FIELDS = 'stream=index,codec_type,codec_name,width,height,sample_rate,channels:stream_disposition:stream_tags:format=duration:chapter=id,start_time,end_time';

function abortError() {
  const error = new Error('Cover processing cancelled.');
  error.name = 'AbortError';
  return error;
}

function checkAbort(signal) {
  if (signal?.aborted) throw abortError();
}

function coverStream(stream) {
  if (stream.disposition?.attached_pic) return true;
  const filename = String(stream.tags?.filename || '');
  return stream.codec_type === 'attachment'
    && /^image\/(?:jpeg|png|webp)$/i.test(stream.tags?.mimetype || '')
    && /^(?:small_)?cover(?:_land)?\.(?:jpe?g|png|webp)$/i.test(filename);
}

function mediaSignature(stream) {
  return [stream.codec_type, stream.codec_name, stream.width || '', stream.height || '',
    stream.sample_rate || '', stream.channels || ''].join('|');
}

function safeDetail(error) {
  return String(error?.message || error).replace(/https?:\/\/\S+/gi, '[URL]').slice(0, 500);
}

/**
 * Replace cover art on completed files inside their private working directory.
 * No original file is removed or changed until its replacement passes probing.
 * Returns { converted: string[], warnings: { file, code, message }[] }.
 */
async function squareCover({ files, ffmpeg, ffprobe, runTool, signal } = {}) {
  if (!Array.isArray(files) || typeof runTool !== 'function' || !ffmpeg || !ffprobe) {
    throw new TypeError('squareCover requires finished files, FFmpeg, FFprobe, and runTool.');
  }
  const converted = [], warnings = [];
  const warn = (file, code, message) => warnings.push({ file, code, message });
  const command = async (tool, args, timeout = 30000) => {
    checkAbort(signal);
    const record = {};
    const abort = () => record.abort?.();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const promise = runTool(tool, args, timeout, 1024 * 1024, {}, record);
      if (signal?.aborted) abort();
      const result = await promise;
      checkAbort(signal);
      return result;
    } catch (error) {
      if (signal?.aborted) throw abortError();
      throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  };
  const probe = async file => {
    const result = await command(ffprobe, ['-v', 'error', '-show_entries', PROBE_FIELDS, '-of', 'json', file], 15000);
    const data = JSON.parse(result.stdout);
    if (!Array.isArray(data.streams) || data.streams.length > 256) throw new Error('Media stream information is missing or too large.');
    if (data.streams.some(stream => !Number.isSafeInteger(stream.index) || stream.index < 0)) throw new Error('Invalid media stream index.');
    return data;
  };
  const base = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y'];

  for (const supplied of [...new Set(files)]) {
    checkAbort(signal);
    if (typeof supplied !== 'string' || !path.isAbsolute(supplied)) throw new TypeError('Finished media paths must be absolute.');
    const file = path.resolve(supplied), extension = path.extname(file).toLowerCase();
    if (!SUPPORTED.has(extension)) {
      if (UNSUPPORTED.has(extension)) warn(file, 'unsupported_cover_container', 'Square embedded artwork is not supported reliably in this output format; the original file was kept.');
      continue;
    }
    let temporaryDirectory;
    try {
      const originalStat = await fs.lstat(file);
      if (!originalStat.isFile() || originalStat.isSymbolicLink()) throw new Error('Finished media must be a regular file.');
      const original = await probe(file);
      const oldCovers = original.streams.filter(coverStream);
      const retained = original.streams.filter(stream => !coverStream(stream));
      const firstMedia = retained.find(stream => stream.codec_type === 'audio' || stream.codec_type === 'video');
      if (!firstMedia) {
        throw new Error('No normal audio or video stream was found.');
      }
      const existing = oldCovers.find(stream => stream.disposition?.attached_pic) || oldCovers[0];
      let sourceImage;
      if (!existing) {
        const parsed = path.parse(file);
        for (const suffix of IMAGE_EXTENSIONS) {
          const candidate = path.join(parsed.dir, parsed.name + suffix);
          try {
            const imageStat = await fs.lstat(candidate);
            if (imageStat.isFile() && !imageStat.isSymbolicLink()) { sourceImage = candidate; break; }
          } catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
        if (!sourceImage) {
          warn(file, 'cover_missing', 'No embedded cover or matching cover image was found; the original file was kept.');
          continue;
        }
      }
      temporaryDirectory = await fs.mkdtemp(path.join(path.dirname(file), '.zenith-cover-'));
      const cover = path.join(temporaryDirectory, 'cover.jpg');
      if (existing?.codec_type === 'attachment') {
        sourceImage = path.join(temporaryDirectory, 'original-cover.bin');
        await command(ffmpeg, [...base, `-dump_attachment:${existing.index}`, sourceImage, '-i', file,
          '-map', `0:${firstMedia.index}`, '-t', '0', '-c', 'copy', '-f', 'null', '-']);
      }
      const imageInput = existing && existing.codec_type !== 'attachment'
        ? ['-i', file, '-map', `0:${existing.index}`] : ['-i', sourceImage, '-map', '0:v:0'];
      await command(ffmpeg, [...base, ...imageInput, '-frames:v', '1', '-vf', FILTER,
        '-c:v', 'mjpeg', '-q:v', '2', '-pix_fmt', 'yuvj420p', '-update', '1', cover]);
      const imageProbe = await probe(cover);
      if (!imageProbe.streams.some(stream => stream.codec_type === 'video' && stream.width === 3000 && stream.height === 3000)) {
        throw new Error('The generated cover did not validate as 3000 by 3000 pixels.');
      }

      const replacement = path.join(temporaryDirectory, 'finished' + extension);
      const args = [...base, '-i', file];
      if (extension !== '.mkv') args.push('-i', cover);
      for (const stream of retained) args.push('-map', `0:${stream.index}`);
      if (extension !== '.mkv') args.push('-map', '1:v:0');
      args.push('-map_metadata', '0', '-map_chapters', '0', '-copy_unknown', '-c', 'copy');
      for (let index = 0; index < retained.length; index += 1) {
        // Explicit stream metadata mapping preserves languages, titles, and
        // subtitle/font attachment information after old art is removed.
        args.push(`-map_metadata:s:${index}`, `0:s:${retained[index].index}`);
      }
      if (extension === '.mkv') {
        // Matroska stores artwork as an attachment, not a regular video track.
        args.push('-attach', cover, `-metadata:s:${retained.length}`, 'filename=cover.jpg',
          `-metadata:s:${retained.length}`, 'mimetype=image/jpeg',
          `-metadata:s:${retained.length}`, 'title=Album cover');
      } else {
        const imageVideoIndex = retained.filter(stream => stream.codec_type === 'video').length;
        args.push(`-disposition:v:${imageVideoIndex}`, 'attached_pic',
          `-metadata:s:v:${imageVideoIndex}`, 'title=Album cover',
          `-metadata:s:v:${imageVideoIndex}`, 'comment=Cover (front)');
        if (extension === '.mp3') args.push('-id3v2_version', '3');
      }
      args.push(replacement);
      await command(ffmpeg, args, 180000);
      const output = await probe(replacement);
      const outputMedia = output.streams.filter(stream => !coverStream(stream));
      if (outputMedia.length !== retained.length || retained.some((stream, index) => mediaSignature(stream) !== mediaSignature(outputMedia[index]))) {
        throw new Error('A normal media stream changed or disappeared during cover embedding.');
      }
      if ((output.chapters || []).length !== (original.chapters || []).length) {
        throw new Error('Chapter information changed during cover embedding.');
      }
      let validCover = output.streams.some(stream => stream.disposition?.attached_pic && stream.width === 3000 && stream.height === 3000);
      if (!validCover && extension === '.mkv') {
        // Some FFprobe versions expose Matroska artwork as an attachment;
        // verify its actual bytes instead of inventing width/height metadata.
        const attachment = output.streams.find(coverStream);
        if (attachment?.codec_type === 'attachment') {
          const extracted = path.join(temporaryDirectory, 'verified-cover.jpg');
          await command(ffmpeg, [...base, `-dump_attachment:${attachment.index}`, extracted, '-i', replacement,
            '-map', `0:${outputMedia.find(stream => stream.codec_type === 'audio' || stream.codec_type === 'video').index}`,
            '-t', '0', '-c', 'copy', '-f', 'null', '-']);
          const attachedImage = await probe(extracted);
          validCover = attachedImage.streams.some(stream => stream.width === 3000 && stream.height === 3000);
        }
      }
      if (!validCover) throw new Error('The output file did not contain verified 3000 by 3000 cover art.');
      const durationBefore = Number(original.format?.duration), durationAfter = Number(output.format?.duration);
      if (Number.isFinite(durationBefore) && Number.isFinite(durationAfter)
        && Math.abs(durationBefore - durationAfter) > Math.max(1, durationBefore * 0.005)) {
        throw new Error('The media duration changed during cover embedding.');
      }
      checkAbort(signal);
      const currentStat = await fs.lstat(file);
      if (currentStat.size !== originalStat.size || currentStat.mtimeMs !== originalStat.mtimeMs) {
        throw new Error('The source file changed while cover art was being prepared.');
      }
      await fs.chmod(replacement, originalStat.mode & 0o777);
      // Same-volume rename replaces the private original in one operation.
      // A failure leaves that original intact; never unlink it first.
      await fs.rename(replacement, file);
      converted.push(file);
    } catch (error) {
      if (signal?.aborted || error.name === 'AbortError') throw abortError();
      warn(file, 'cover_processing_failed', `Square cover could not be verified; the original file was kept. ${safeDetail(error)}`);
    } finally {
      if (temporaryDirectory) {
        const resolved = path.resolve(temporaryDirectory);
        if (path.dirname(resolved) === path.dirname(file) && path.basename(resolved).startsWith('.zenith-cover-')) {
          await fs.rm(resolved, { recursive: true, force: true }).catch(() => {});
        }
      }
    }
  }
  return { converted, warnings };
}

module.exports = { squareCover };
