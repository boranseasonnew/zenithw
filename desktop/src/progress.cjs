// yt-dlp reports 0–100% for each input stream, before merging and postprocessing.
// Reserve the final 10% for those steps and report 100% only after publication.
function createProgressTracker() {
  let streamCount = 1;
  let streamIndex = 0;
  let percent = 0;

  return (line) => {
    const formats = line.match(/^\[info\].*Downloading \d+ format\(s\):\s+(\S+)/i);
    if (formats) streamCount = Math.max(1, formats[1].split('+').length);

    if (/^\[download\] Destination:/i.test(line)) streamIndex += 1;

    const download = line.match(/^\[download\]\s+(\d+(?:\.\d+)?)%/i);
    if (download) {
      const part = Math.min(100, Math.max(0, Number(download[1])));
      const index = Math.max(1, Math.min(streamIndex, streamCount));
      percent = Math.max(percent, Math.floor((index - 1 + part / 100) * 90 / streamCount));
      return { percent, detail: `${index}/${streamCount} · ${line.slice(download[0].length).trim() || 'İndiriliyor…'}` };
    }

    // SponsorBlock can run before any media is downloaded; it is not a
    // postprocessing milestone and must not advance the progress bar.
    if (streamIndex === 0) return null;
    let stage = null;
    if (/^\[Merger\]/i.test(line)) stage = { percent: 93, detail: 'Video ve ses birleştiriliyor…' };
    else if (/^\[VideoRemuxer\]/i.test(line)) stage = { percent: 95, detail: 'Dosya biçimi hazırlanıyor…' };
    else if (/^\[(?:Metadata|ModifyChapters|ThumbnailsConvertor|EmbedThumbnail|EmbedSubtitle|ExtractAudio|SplitChapters)\]/i.test(line)) {
      stage = { percent: 97, detail: 'Son işlemler yapılıyor…' };
    }
    if (!stage) return null;
    percent = Math.max(percent, stage.percent);
    return { percent: Math.min(99, percent), detail: stage.detail };
  };
}

module.exports = { createProgressTracker };
