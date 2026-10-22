// The Pages Function handles these too: _redirects alone cannot redirect Function routes.
export function legacyDownloadRoute(path) {
  const match = /^\/(?:((?:en|de|fr|ru|vi|zh|ja))\/)?(app|pc-app|download)(?:\.html)?\/?$/.exec(path);
  if (!match) return null;
  const anchor = match[2] === 'download' ? '' : `#${match[2] === 'app' ? 'android' : 'windows'}`;
  return `${match[1] ? '/' + match[1] : ''}/downloads${anchor}`;
}
