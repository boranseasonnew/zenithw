'use strict';

// Print only the fields needed by the UI, never signed media URLs or headers.
function progressArgs() {
  return [
    '--newline', '--progress', '--progress-delta', '0.25', '--no-simulate',
    '--print', 'before_dl:ZENITH_MEDIA:%(.{id,title,format_id,filesize,filesize_approx,playlist_index,playlist_count,section_start,section_end})j\t%(requested_formats.:.{format_id,filesize,filesize_approx})j',
    '--progress-template', 'download:ZENITH_PROGRESS:%(progress.{status,downloaded_bytes,total_bytes,total_bytes_estimate,speed,eta})j\t%(info.{id,format_id})j',
    '--no-quiet',
  ];
}

function positive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
function nonnegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
function counter(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
function identifier(value) {
  return typeof value === 'string' ? value.slice(0, 300) : '';
}
function parseFrame(line, prefix) {
  if (!line.startsWith(prefix) || line.length > 32768) return null;
  try {
    return line.slice(prefix.length).split('\t').map((field) => field === 'NA' ? null : JSON.parse(field));
  } catch {
    return null;
  }
}

function createProgressTracker() {
  let mediaId = '';
  let streams = [];
  let streamIndex = 0;
  let legacyStreamCount = 1;
  let itemIndex = null;
  let itemCount = null;
  let structured = false;

  function streamFrom(format) {
    return {
      id: identifier(format?.format_id), size: positive(format?.filesize),
      estimate: positive(format?.filesize_approx), downloaded: 0, finished: false,
    };
  }
  function processing(stage, detail) {
    return {
      phase: 'processing', stage, percent: null, downloadedBytes: null,
      totalBytes: null, speed: null, eta: null, estimated: false,
      percentScope: null, etaScope: null, itemIndex, itemCount,
      streamIndex: Math.max(1, streamIndex),
      streamCount: Math.max(1, streams.length, legacyStreamCount), detail,
    };
  }

  return (rawLine) => {
    if (typeof rawLine !== 'string') return null;
    const line = rawLine.trim();
    const media = parseFrame(line, 'ZENITH_MEDIA:');
    if (media && media[0] && typeof media[0] === 'object' && !Array.isArray(media[0])) {
      const info = media[0];
      mediaId = identifier(info.id);
      itemIndex = counter(info.playlist_index);
      itemCount = counter(info.playlist_count);
      const selected = Array.isArray(media[1]) ? media[1].filter((entry) => entry && typeof entry === 'object').slice(0, 64) : [];
      streams = (selected.length ? selected : [info]).map(streamFrom);
      // A trimmed clip inherits the full source's metadata filesize. Those
      // bytes cannot predict a partial FFmpeg transfer's percentage or ETA.
      if (nonnegative(info.section_start) !== null || positive(info.section_end) !== null) {
        for (const stream of streams) { stream.size = null; stream.estimate = null; }
      }
      streamIndex = 0;
      legacyStreamCount = streams.length;
      structured = true;
      const allSizesKnown = streams.every((stream) => stream.size !== null);
      return {
        phase: 'downloading', stage: 'download', percent: 0, title: identifier(info.title),
        downloadedBytes: 0, totalBytes: allSizesKnown ? streams.reduce((sum, stream) => sum + stream.size, 0) : null,
        speed: null, eta: null, estimated: false, percentScope: allSizesKnown ? 'download' : 'stream',
        etaScope: null, itemIndex, itemCount, streamIndex: 1,
        streamCount: streams.length, detail: 'İndiriliyor…',
      };
    }

    const frame = parseFrame(line, 'ZENITH_PROGRESS:');
    if (frame && frame[0] && typeof frame[0] === 'object' && !Array.isArray(frame[0])) {
      const progress = frame[0];
      if (!['downloading', 'finished'].includes(progress.status)) return null;
      const info = frame[1] && typeof frame[1] === 'object' ? frame[1] : {};
      const nextMediaId = identifier(info.id);
      if (nextMediaId && mediaId && nextMediaId !== mediaId) {
        // Playlist items must not inherit the previous item's downloaded bytes.
        streams = [];
        streamIndex = 0;
        legacyStreamCount = 1;
        itemIndex = null;
        itemCount = null;
      }
      if (nextMediaId) mediaId = nextMediaId;
      structured = true;
      const formatId = identifier(info.format_id);
      // Some external downloaders report a merged transfer instead of one
      // event series per selected format. Do not count that transfer twice.
      const mergedIds = formatId.split('+');
      if (streams.length > 1 && mergedIds.length === streams.length && streams.every((stream) => mergedIds.includes(stream.id))) {
        streams = [{
          id: formatId,
          size: streams.every((stream) => stream.size !== null) ? streams.reduce((sum, stream) => sum + stream.size, 0) : null,
          estimate: streams.every((stream) => stream.size || stream.estimate) ? streams.reduce((sum, stream) => sum + (stream.size || stream.estimate), 0) : null,
          downloaded: 0, finished: false,
        }];
        legacyStreamCount = 1;
      }
      let index = formatId ? streams.findIndex((stream) => stream.id === formatId) : -1;
      if (index < 0 && streams.length === 1 && !streams[0].id) index = 0;
      if (index < 0 && !formatId && streams.length) index = Math.max(0, streams.findIndex((stream) => !stream.finished));
      if (index < 0) {
        if (streams.length >= 64) return null;
        streams.push(streamFrom(info));
        index = streams.length - 1;
      }
      streamIndex = index + 1;
      const stream = streams[index];
      const bytes = nonnegative(progress.downloaded_bytes);
      if (bytes !== null) stream.downloaded = bytes;
      const exactTotal = positive(progress.total_bytes);
      if (exactTotal) stream.size = exactTotal;
      const estimate = positive(progress.total_bytes_estimate);
      if (estimate) stream.estimate = estimate;
      stream.finished = progress.status === 'finished';
      if (stream.finished && !stream.size && bytes > 0) stream.size = bytes;
      if (stream.finished && stream.size) stream.downloaded = stream.size;

      // Publication validates the final file. Network completion alone cannot
      // report 100%; merging, conversion and embedding have no honest percent.
      if (streams.every((entry) => entry.finished)) return processing('finalize', 'Son işlemler yapılıyor…');

      const allSizesKnown = streams.every((entry) => entry.size !== null);
      const totalBytes = allSizesKnown ? streams.reduce((sum, entry) => sum + entry.size, 0) : stream.size || stream.estimate;
      const downloadedBytes = allSizesKnown
        ? streams.reduce((sum, entry) => sum + Math.min(entry.downloaded, entry.size), 0)
        : stream.downloaded;
      const speed = positive(progress.speed);
      const remainingBytes = totalBytes ? Math.max(0, totalBytes - downloadedBytes) : null;
      const eta = stream.finished ? null : allSizesKnown && remainingBytes !== null && speed
        ? remainingBytes / speed
        : nonnegative(progress.eta);
      return {
        phase: 'downloading', stage: 'download',
        percent: totalBytes ? Math.min(99, Math.max(0, downloadedBytes * 100 / totalBytes)) : null,
        downloadedBytes, totalBytes, speed: stream.finished ? null : speed,
        eta, estimated: !allSizesKnown && !stream.size && !!stream.estimate,
        percentScope: allSizesKnown ? 'download' : 'stream',
        etaScope: eta === null ? null : allSizesKnown ? 'transfer' : 'stream',
        itemIndex, itemCount, streamIndex, streamCount: Math.max(streams.length, legacyStreamCount),
        detail: 'İndiriliyor…',
      };
    }

    // Compatibility with older engines; never manufacture a job-wide ETA or
    // reserve arbitrary percentages for postprocessing.
    const formats = line.match(/^\[info\].*Downloading \d+ format\(s\):\s+(\S+)/i);
    if (formats && !structured) legacyStreamCount = Math.max(1, formats[1].split('+').length);
    if (/^\[download\] Destination:/i.test(line) && !structured) streamIndex += 1;
    const download = line.match(/^\[download\]\s+(\d+(?:\.\d+)?)%/i);
    if (download && !structured) {
      return {
        phase: 'downloading', stage: 'download', percent: Math.min(99, Math.max(0, Number(download[1]))),
        downloadedBytes: null, totalBytes: null, speed: null, eta: null, estimated: false,
        percentScope: 'stream', etaScope: null, itemIndex, itemCount,
        streamIndex: Math.max(1, Math.min(streamIndex, legacyStreamCount)), streamCount: legacyStreamCount,
        detail: 'İndiriliyor…',
      };
    }
    if (/^\[Merger\]/i.test(line)) return processing('merge', 'Video ve ses birleştiriliyor…');
    if (/^\[VideoRemuxer\]/i.test(line)) return processing('remux', 'Dosya biçimi hazırlanıyor…');
    if (/^\[(?:Metadata|ModifyChapters|ThumbnailsConvertor|EmbedThumbnail|EmbedSubtitle|ExtractAudio|SplitChapters)\]/i.test(line)) {
      return processing('postprocess', 'Son işlemler yapılıyor…');
    }
    return null;
  };
}

module.exports = { createProgressTracker, progressArgs };
