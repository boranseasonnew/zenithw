(() => {
  'use strict';
  const descriptions = {
    desktop: ['ZenithW Windows uygulaması: yerel video ve ses indirme, format seçenekleri ve masaüstü 2.0 arayüz önizlemesi.', 'ZenithW for Windows: local video and audio downloads, format options, and a preview of the Desktop 2.0 interface.'],
    android: ['ZenithW Android 2.0 önizlemesi: video ve ses indirme, kolay kullanılan kontroller ve resmi APK sürümleri.', 'ZenithW Android 2.0 preview: video and audio downloads, accessible controls, and official APK releases.']
  };
  const titles = {
    desktop: ['ZenithW Desktop — Windows Video ve Ses İndirici', 'ZenithW Desktop — Video and Audio Downloader for Windows'],
    android: ['ZenithW Android — Video ve Ses İndirme Uygulaması', 'ZenithW Android — Video and Audio Download App']
  };
  const platform = document.body.classList.contains('mobile-page') ? 'android' : 'desktop';
  function applyLanguage() {
    // The preferred browser/phone language wins; unrelated saved site settings do not override it.
    const preferred = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
    const language = preferred.startsWith('tr') ? 'tr' : 'en';
    const english = language === 'en';
    document.documentElement.lang = language;
    document.querySelectorAll('[data-en]').forEach(node => {
      node.dataset.tr ??= node.textContent;
      node.textContent = english ? node.dataset.en : node.dataset.tr;
    });
    for (const [key, attribute] of [['Alt', 'alt'], ['Aria', 'aria-label'], ['Href', 'href']]) {
      document.querySelectorAll('[data-en-' + key.toLowerCase() + ']').forEach(node => {
        node.dataset['tr' + key] ??= node.getAttribute(attribute) || '';
        node.setAttribute(attribute, english ? node.dataset['en' + key] : node.dataset['tr' + key]);
      });
    }
    document.title = titles[platform][english ? 1 : 0];
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      document.querySelector(selector)?.setAttribute('content', descriptions[platform][english ? 1 : 0]);
    }
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      document.querySelector(selector)?.setAttribute('content', document.title);
    }
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', english ? 'en_US' : 'tr_TR');
  }
  applyLanguage();
  window.addEventListener('languagechange', applyLanguage);

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
