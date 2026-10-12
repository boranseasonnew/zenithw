// @ts-check
/** Extract an ID only from supported HTTPS YouTube URLs. @param {string} source */
export function youtubeVideoId(source) {
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    let id;
    if (url.hostname === 'youtu.be') id = /^\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:embed|shorts)\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

/** Build from a validated ID; never reuse arbitrary source parameters. @param {string} source @param {string} language */
export function tutorialEmbedUrl(source, language = 'en') {
  const id = youtubeVideoId(source);
  if (!id) return null;
  const url = new URL('https://www.youtube-nocookie.com/embed/' + id);
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('rel', '0');
  url.searchParams.set('autoplay', '1');
  url.searchParams.set('hl', /^(tr|en|de|fr|ru|vi|zh|ja)(?:-[A-Za-z]+)?$/.test(language) ? language : 'en');
  return url.href;
}

function initializeTutorial() {
  const modal = document.getElementById('androidTutorialDialog');
  const slot = document.getElementById('androidTutorialPlayer');
  const close = document.getElementById('androidTutorialClose');
  const trigger = document.getElementById('androidTutorialTrigger');
  if (!(modal instanceof HTMLDialogElement) || !slot || !(close instanceof HTMLButtonElement) || !(trigger instanceof HTMLButtonElement)) return;
  const dialog = modal;
  const player = slot;
  const button = trigger;
  let previousOverflow = '';
  let closeTimer = 0;
  let locked = false;
  let closing = false;
  function cleanup() {
    // Removing the browsing context stops playback, audio and iframe activity.
    player.replaceChildren();
    clearTimeout(closeTimer);
    if (locked) document.documentElement.style.overflow = previousOverflow;
    locked = false;
    closing = false;
    dialog.removeAttribute('data-closing');
    button.setAttribute('aria-expanded', 'false');
  }
  function dismiss() {
    if (!dialog.open || closing) return;
    closing = true;
    player.replaceChildren(); // Stop immediately, before the exit animation.
    dialog.setAttribute('data-closing', '');
    const finish = () => { dialog.close(); cleanup(); button.focus({preventScroll: true}); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else closeTimer = window.setTimeout(finish, 160);
  }
  button.addEventListener('click', () => {
    if (dialog.open) return;
    const src = tutorialEmbedUrl(button.dataset.videoUrl || '', document.documentElement.lang);
    if (!src) return;
    cleanup();
    previousOverflow = document.documentElement.style.overflow;
    dialog.showModal();
    locked = true;
    document.documentElement.style.overflow = 'hidden';
    button.setAttribute('aria-expanded', 'true');
    close.focus({preventScroll: true});
    const frame = document.createElement('iframe');
    frame.title = document.getElementById('androidTutorialPlayerTitle')?.textContent || 'ZenithW Android tutorial';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    frame.src = src;
    player.replaceChildren(frame);
  });
  close.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('close', () => { cleanup(); button.focus({preventScroll: true}); });
  // Safari and older Firefox do not implement closedby="any" yet.
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    let startedOutside = false;
    /** @param {PointerEvent} event */
    const outside = event => {
      const rect = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    };
    dialog.addEventListener('pointerdown', event => { startedOutside = outside(event); });
    dialog.addEventListener('pointerup', event => { if (startedOutside && outside(event)) dismiss(); startedOutside = false; });
  }
  window.addEventListener('pagehide', () => { if (dialog.open) dialog.close(); cleanup(); });
}

if (typeof document !== 'undefined') initializeTutorial();
