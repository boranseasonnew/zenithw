/* Optional, page-scoped effects. The links and localized copy work without JS. */
(() => {
  'use strict';
  const copyNodes = [...document.querySelectorAll('[data-support-copy]')];
  if (!copyNodes.length) return;
  let copy;
  function applyCopy() {
    if (!copy) return;
    const language = (window.ZWLanguage?.current || document.documentElement.lang).split('-')[0];
    const text = copy[language] || copy.en;
    copyNodes.forEach(node => {
      const value = text[node.dataset.supportCopy];
      if (typeof value === 'string' && node.textContent !== value) node.textContent = value;
    });
  }
  fetch('/cache-assets/support-copy.3d639d29b1cb.json', { cache: 'no-cache' }).then(response => {
    if (!response.ok) throw new Error('Support copy unavailable');
    return response.json();
  }).then(data => { copy = data; applyCopy(); }).catch(() => { /* Keep the readable static copy. */ });
  window.addEventListener('zw-language-ready', applyCopy);

  const card = document.querySelector('.sponsor-card');
  const button = card?.querySelector('.sponsor-button');
  const stage = card?.querySelector('.sponsor-friends');
  const layer = card?.querySelector('.sponsor-particles');
  if (!button || !stage || !layer) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(any-pointer: fine)');
  const eyes = [...stage.querySelectorAll('.friend-eye')];
  const pupils = eyes.map(eye => eye.querySelector('.friend-pupil'));
  const characters = [...stage.querySelectorAll('.sponsor-character')];
  const colors = ['#ff6398', '#eb426f', '#ff9bcc', '#f475aa'];
  let pointer = { x: 0, y: 0 }, frame = 0, hoverTimer = 0, touchTimer = 0;
  let hovering = false, focusing = false, visible = true;

  function centerEyes() {
    pupils.forEach(pupil => {
      pupil.style.setProperty('--look-x', '0px');
      pupil.style.setProperty('--look-y', '0px');
    });
  }
  function updateEyes() {
    frame = 0;
    if (reduced.matches || !visible || document.hidden) return;
    // Read every eye first, then write transforms: no layout work per pointer event.
    const offsets = eyes.map(eye => {
      const rect = eye.getBoundingClientRect();
      const dx = pointer.x - rect.left - rect.width / 2;
      const dy = pointer.y - rect.top - rect.height / 2;
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(3, distance / 60);
      return [dx / distance * reach, dy / distance * reach];
    });
    pupils.forEach((pupil, index) => {
      pupil.style.setProperty('--look-x', `${offsets[index][0].toFixed(2)}px`);
      pupil.style.setProperty('--look-y', `${offsets[index][1].toFixed(2)}px`);
    });
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !fine.matches || reduced.matches || !visible || document.hidden) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(updateEyes);
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) centerEyes(); }, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '40px' }).observe(stage);
  }

  function burst(count = 7, point) {
    if (reduced.matches || document.hidden || !visible) return;
    const cardRect = card.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const centerX = (point?.x ?? buttonRect.left + buttonRect.width / 2) - cardRect.left;
    const centerY = (point?.y ?? buttonRect.top + buttonRect.height / 3) - cardRect.top;
    for (let index = 0; index < count && layer.childElementCount < 24; index++) {
      const bubble = document.createElement('span');
      bubble.className = 'heart-bubble';
      bubble.textContent = '♥';
      bubble.style.left = `${Math.max(24, Math.min(cardRect.width - 24, centerX + (Math.random() - .5) * 100))}px`;
      bubble.style.top = `${centerY + Math.random() * 10}px`;
      bubble.style.setProperty('--heart-color', colors[index % colors.length]);
      bubble.style.setProperty('--bubble-size', `${22 + Math.random() * 12}px`);
      bubble.style.setProperty('--drift', `${(Math.random() - .5) * 44}px`);
      bubble.style.setProperty('--rise', `${-100 - Math.random() * 70}px`);
      bubble.style.setProperty('--flight', `${1.35 + Math.random() * .5}s`);
      bubble.addEventListener('animationend', () => bubble.remove(), { once: true });
      layer.append(bubble);
    }
  }
  function jump() {
    if (reduced.matches || !visible || document.hidden) return;
    characters.forEach((character, index) => {
      if (typeof character.animate !== 'function') return;
      character.getAnimations().forEach(animation => animation.cancel());
      character.animate([
        { transform: 'translateY(0) scale(1,1)', offset: 0 },
        { transform: 'translateY(2px) scale(1.04,.94)', offset: .16 },
        { transform: 'translateY(-12px) scale(.97,1.05)', offset: .45 },
        { transform: 'translateY(0) scale(1.04,.97)', offset: .78 },
        { transform: 'translateY(0) scale(1,1)', offset: 1 }
      ], { duration: 620, delay: index * 65, easing: 'cubic-bezier(.22,.7,.3,1)' });
    });
  }
  function updateMood() { card.classList.toggle('is-celebrating', hovering || focusing || Boolean(touchTimer)); }
  function beginHover() {
    if (!fine.matches) return;
    hovering = true;
    updateMood(); jump(); burst();
    clearInterval(hoverTimer);
    if (!reduced.matches) hoverTimer = setInterval(() => burst(4), 650);
  }
  function endHover() {
    hovering = false;
    clearInterval(hoverTimer); hoverTimer = 0;
    updateMood();
  }
  button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') beginHover(); });
  button.addEventListener('pointerleave', endHover);
  button.addEventListener('focus', () => { focusing = true; updateMood(); if (!hovering) { jump(); burst(); } });
  button.addEventListener('blur', () => { focusing = false; updateMood(); });
  button.addEventListener('pointerdown', event => {
    clearTimeout(touchTimer);
    touchTimer = setTimeout(() => { touchTimer = 0; updateMood(); }, 950);
    updateMood(); jump(); burst(10, { x: event.clientX, y: event.clientY });
    // Do not intercept the link: mouse, touch and keyboard navigate normally.
  }, { passive: true });
  button.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.repeat) { jump(); burst(10); } });
  function stopEffects() {
    endHover(); focusing = false;
    clearTimeout(touchTimer); touchTimer = 0;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    characters.forEach(character => character.getAnimations?.().forEach(animation => animation.cancel()));
    layer.replaceChildren(); centerEyes(); updateMood();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopEffects(); });
  window.addEventListener('blur', stopEffects);
  window.addEventListener('pagehide', stopEffects);
  reduced.addEventListener('change', stopEffects);
})();
