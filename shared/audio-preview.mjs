// Keep preview preparation responsive without copying or transferring result PCM.
export const yieldToBrowser = () => globalThis.scheduler?.yield
  ? globalThis.scheduler.yield() : new Promise(resolve => setTimeout(resolve, 0));

function peakBetween(left, right, start, end) {
  let peak = 0;
  for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  return peak;
}

export async function waveformPeaksAsync(channels, points = 400, signal) {
  if (!Number.isSafeInteger(points) || points < 1 || points > 10000) throw new RangeError('Invalid waveform resolution');
  const n = channels[0].length;
  const peaks = new Float32Array(Math.min(n, points));
  let deadline = performance.now() + 8;
  signal?.throwIfAborted();
  for (let p = 0; p < peaks.length; p++) {
    const start = Math.floor(p * n / peaks.length), end = Math.floor((p + 1) * n / peaks.length);
    let peak = 0;
    for (let i = start; i < end; i += 32768) {
      peak = Math.max(peak, peakBetween(channels[0], channels[1], i, Math.min(end, i + 32768)));
      signal?.throwIfAborted();
      if (performance.now() >= deadline) {
        await yieldToBrowser();
        deadline = performance.now() + 8;
      }
    }
    peaks[p] = peak;
  }
  signal?.throwIfAborted();
  return peaks;
}
