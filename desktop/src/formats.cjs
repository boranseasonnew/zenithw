function videoFormats(data, container = 'mp4') {
  const direct = (format) => format.protocol === 'https' ? 1 : 0;
  const h264 = (format) => /^avc1\./i.test(format.vcodec || '') ? 1 : 0;
  const all = data.formats || [];
  const audio = (extension) => all
    .filter((format) => format.vcodec === 'none' && format.acodec !== 'none'
      && (extension === 'webm' ? format.ext === 'webm' : ['m4a', 'mp4'].includes(format.ext))
      && !/-drc$/i.test(format.format_id || ''))
    .sort((a, b) => (direct(b) - direct(a))
      || ((b.ext === 'm4a' ? 1 : 0) - (a.ext === 'm4a' ? 1 : 0))
      || ((b.language_preference || 0) - (a.language_preference || 0))
      || (b.tbr || 0) - (a.tbr || 0))[0];
  const videos = all.filter((format) => format.vcodec !== 'none' && format.height);
  const matching = ['mp4', 'webm'].includes(container) ? videos.filter((format) => format.ext === container) : [];
  return (matching.length ? matching : videos)
    .sort((a, b) => (b.height - a.height) || ((b.fps || 0) - (a.fps || 0))
      || (direct(b) - direct(a)) || (h264(b) - h264(a)))
    .map((format) => ({
      id: format.acodec && format.acodec !== 'none' ? format.format_id : `${format.format_id}+${audio(format.ext)?.format_id || 'bestaudio'}/best`,
      height: format.height, ext: format.ext, fps: format.fps, codec: format.vcodec,
      size: format.filesize || format.filesize_approx || 0
    }))
    .filter((format, index, list) => list.findIndex((item) => item.height === format.height && item.ext === format.ext && item.fps === format.fps) === index)
    .slice(0, 12);
}

module.exports = { videoFormats };
