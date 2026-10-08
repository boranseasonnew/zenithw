(() => {
  'use strict';
  const descriptions = {
    desktop: ['Zenith Windows uygulaması: yerel video ve ses indirme, format seçenekleri, 4.0 arayüzü ve hazır ayar profilleri.', 'Zenith for Windows: local video and audio downloads, format options, and Desktop 4.0 with preset settings.'],
    android: ['Zenith Android 2.1: video ve ses indirme, kolay kullanılan kontroller ve resmi APK sürümleri.', 'Zenith Android 2.1: video and audio downloads, accessible controls, and official APK releases.']
  };
  const titles = {
    desktop: ['Zenith Desktop — Windows Video ve Ses İndirici', 'Zenith Desktop — Video and Audio Downloader for Windows'],
    android: ['Zenith Android — Video ve Ses İndirme Uygulaması', 'Zenith Android — Video and Audio Download App']
  };
  const platform = document.body.classList.contains('mobile-page') ? 'android' : 'desktop';
  function applyLanguage() {
    // A saved language follows visitors across application and information pages.
    const preferred = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
    const language = window.ZWLanguage?.current || (preferred.startsWith('tr') ? 'tr' : 'en');
    const english = language !== 'tr';
    const localize = value => window.ZWLanguage ? ZWLanguage.translate(value,language) : value;
    document.documentElement.lang = language;
    document.querySelectorAll('[data-en]').forEach(node => {
      node.dataset.tr ??= node.textContent;
      node.textContent = english ? localize(node.dataset.en) : node.dataset.tr;
    });
    for (const [key, attribute] of [['Alt', 'alt'], ['Aria', 'aria-label'], ['Href', 'href']]) {
      document.querySelectorAll('[data-en-' + key.toLowerCase() + ']').forEach(node => {
        node.dataset['tr' + key] ??= node.getAttribute(attribute) || '';
        node.setAttribute(attribute, english ? (key==='Href'?node.dataset['en'+key]:localize(node.dataset['en'+key])) : node.dataset['tr' + key]);
      });
    }
    document.title = localize(titles[platform][english ? 1 : 0]);
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      document.querySelector(selector)?.setAttribute('content', localize(descriptions[platform][english ? 1 : 0]));
    }
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      document.querySelector(selector)?.setAttribute('content', document.title);
    }
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', window.ZWLanguage ? ZWLanguage.locales[language].replace('-','_') : (english ? 'en_US' : 'tr_TR'));
  }
  if(window.ZWLanguage)ZWLanguage.onChange(applyLanguage);
  applyLanguage();
  window.addEventListener('languagechange', applyLanguage);

  const pauseMotion=()=>document.body.classList.toggle('page-paused',document.hidden);
  document.addEventListener('visibilitychange',pauseMotion);pauseMotion();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const nativeMotion = CSS.supports('animation-timeline: view()') && CSS.supports('animation-range: 0% 100%');
  if (!reduced.matches && !nativeMotion && 'IntersectionObserver' in window) {
    // Small one-shot fallback, without scroll handlers or a motion library.
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    document.querySelectorAll('[data-reveal]').forEach(node => {
      node.classList.add('reveal-pending');
      observer.observe(node);
    });
    reduced.addEventListener('change', event => {
      if (!event.matches) return;
      observer.disconnect();
      document.querySelectorAll('.reveal-pending').forEach(node => node.classList.remove('reveal-pending'));
    }, { once: true });
  }
})();
