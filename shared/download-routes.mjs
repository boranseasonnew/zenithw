// The Pages Function handles these too: _redirects alone cannot redirect Function routes.
export function legacyDownloadRoute(path) {
  const match = /^\/(?:((?:en|de|fr|ru|vi|zh|ja))\/)?(app|pc-app)(?:\.html)?\/?$/.exec(path);
  if (!match) return null;
  return `${match[1] ? '/' + match[1] : ''}/downloads#${match[2] === 'app' ? 'android' : 'windows'}`;
}
