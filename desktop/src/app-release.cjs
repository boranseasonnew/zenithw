'use strict';

const RELEASES_API = 'https://api.github.com/repos/boranseasonnew/zenithw/releases';
const RELEASES_PAGE = 'https://github.com/boranseasonnew/zenithw/releases';
const MAX_BODY_BYTES = 256 * 1024;
const CACHE_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 12000;

// Accept a whole, unambiguous SemVer tag. Web v16.0 and arbitrary title digits
// must never be mistaken for an installable desktop version.
function parseVersion(value) {
  if (typeof value !== 'string' || value.length > 160) return null;
  const match = /^(?:v)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(value);
  if (!match) return null;
  const prerelease = match[4] ? match[4].split('.') : [];
  if (prerelease.some(part => /^\d+$/.test(part) && part.length > 1 && part[0] === '0')) return null;
  return { version: value.replace(/^v/, ''), core: match.slice(1, 4), prerelease };
}

function compareNumber(left, right) {
  return left.length === right.length ? (left === right ? 0 : left > right ? 1 : -1) : left.length > right.length ? 1 : -1;
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    const difference = compareNumber(left.core[index], right.core[index]);
    if (difference) return difference;
  }
  if (!left.prerelease.length || !right.prerelease.length) {
    return left.prerelease.length ? -1 : right.prerelease.length ? 1 : 0;
  }
  for (let index = 0; index < Math.max(left.prerelease.length, right.prerelease.length); index += 1) {
    const a = left.prerelease[index], b = right.prerelease[index];
    if (a === undefined || b === undefined) return a === undefined ? -1 : 1;
    if (a === b) continue;
    const numericA = /^\d+$/.test(a), numericB = /^\d+$/.test(b);
    if (numericA && numericB) return compareNumber(a, b);
    if (numericA !== numericB) return numericA ? -1 : 1;
    return a > b ? 1 : -1;
  }
  return 0;
}

function desktopRelease(release, includePrerelease) {
  if (!release || typeof release !== 'object' || release.draft) return null;
  const parsed = parseVersion(release.tag_name);
  if (!parsed || (!includePrerelease && (release.prerelease || parsed.prerelease.length))) return null;
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const title = typeof release.name === 'string' ? release.name : '';
  const versionedNames = new Set([
    `Zenith-${parsed.version}-Windows-Setup.exe`, `Zenith-${parsed.version}-Windows.exe`,
    `ZenithW-${parsed.version}-Windows-Setup.exe`, `ZenithW-${parsed.version}-Windows.exe`
  ]);
  const modernAsset = assets.some(asset => versionedNames.has(asset?.name));
  const legacyAsset = /\b(?:desktop|windows)\b/i.test(title)
    && assets.some(asset => asset?.name === 'ZenithW-Setup.exe');
  if (!modernAsset && !legacyAsset) return null;
  const url = `${RELEASES_PAGE}/tag/${encodeURIComponent(release.tag_name)}`;
  const publishedAt = typeof release.published_at === 'string'
    && Number.isFinite(Date.parse(release.published_at)) ? release.published_at : null;
  return { parsed, url, publishedAt };
}

async function readJson(response, signal) {
  const length = response.headers?.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > MAX_BODY_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new Error('GitHub release information exceeded the 256 KiB safety limit.');
  }
  if (!response.body || typeof response.body.getReader !== 'function') {
    throw new Error('GitHub returned an unreadable release response.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let total = 0, text = '';
  try {
    while (true) {
      if (signal.aborted) throw new Error('Update check timed out. Please try again.');
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) throw new Error('GitHub release information exceeded the 256 KiB safety limit.');
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error instanceof SyntaxError || error instanceof TypeError) {
      throw new Error('GitHub returned invalid release information. Please try again later.');
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function createReleaseChecker({ currentVersion, fetch: fetchRelease = globalThis.fetch } = {}) {
  const current = parseVersion(currentVersion);
  if (!current) throw new Error('The installed desktop version is not a valid semantic version.');
  if (typeof fetchRelease !== 'function') throw new Error('An HTTPS fetch implementation is required to check updates.');
  let cached = null, cachedAt = 0, pending = null;

  async function load() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    timeout.unref?.();
    async function request(url, allowMissing = false) {
      const response = await fetchRelease(url, {
        method: 'GET', signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ZenithW-Desktop-Update-Check' }
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        if (response.status === 404 && allowMissing) return null;
        if (response.status === 403 || response.status === 429) {
          throw new Error('GitHub temporarily limited update checks. Please try again later.');
        }
        throw new Error(`GitHub update check failed (HTTP ${response.status}). Please try again later.`);
      }
      return readJson(response, controller.signal);
    }
    try {
      const latest = await request(`${RELEASES_API}/latest`, true);
      let release = desktopRelease(latest, !!current.prerelease.length);
      // The repository also contains the website. If its latest release is not
      // a desktop installer, search only this bounded page of official releases.
      if (!release || current.prerelease.length) {
        const listed = await request(`${RELEASES_API}?per_page=30`);
        if (!Array.isArray(listed)) throw new Error('GitHub returned an invalid release list.');
        const candidates = listed.slice(0, 30).map(item => desktopRelease(item, !!current.prerelease.length)).filter(Boolean);
        if (release) candidates.push(release);
        candidates.sort((a, b) => compareVersions(b.parsed, a.parsed));
        release = candidates[0];
      }
      if (!release) {
        throw new Error('No desktop release with an unambiguous version and Windows installer was found in the latest 30 releases. Check the official Releases page.');
      }
      const order = compareVersions(current, release.parsed);
      return { currentVersion: current.version, latestVersion: release.parsed.version,
        status: order < 0 ? 'available' : order === 0 ? 'current' : 'ahead',
        url: release.url, publishedAt: release.publishedAt };
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Update check timed out after 12 seconds. Please try again.');
      if (error instanceof TypeError) throw new Error('Could not reach GitHub securely. Check your connection and try again.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  return async function checkRelease() {
    if (cached && Date.now() - cachedAt < CACHE_MS) return { ...cached };
    if (!pending) {
      pending = load().then(result => { cached = result; cachedAt = Date.now(); return result; }).finally(() => { pending = null; });
    }
    return { ...await pending };
  };
}

module.exports = { createReleaseChecker };
