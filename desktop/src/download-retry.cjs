// Retry transport failures without changing cookies, proxy, or the selected quality.
function retryDownload({ attempt, code, error, useAria2, refreshed }) {
  if (code === 0 || attempt >= 2) return null;
  if (useAria2 && /aria2c exited with code \d+/i.test(error)) {
    return { useAria2: false, refreshed: true, reason: 'aria2' };
  }
  if (!refreshed && /(?:HTTP Error|HTTP status|status=)\s*(?:403|410)\b/i.test(error)) {
    return { useAria2: false, refreshed: true, reason: 'expired' };
  }
  return null;
}

function redactDiagnostic(value) {
  return String(value).replace(/https?:\/\/\S+/gi, '[URL]')
    .replace(/((?:cookie|authorization|proxy-authorization|set-cookie)\s*[:=])[^\r\n]*/gi, '$1 [REDACTED]')
    .slice(-12000);
}

module.exports = { retryDownload, redactDiagnostic };
