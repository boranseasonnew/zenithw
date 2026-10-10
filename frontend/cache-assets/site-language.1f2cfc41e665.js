/* Site-owned copy only. Media titles, filenames, URLs and visitor data are never translated. */
(() => {
  'use strict';
  const names = {tr:'Türkçe',en:'English',fr:'Français',de:'Deutsch',ru:'Русский',vi:'Tiếng Việt',zh:'中文（简体）',ja:'日本語'};
  const files = {tr:'/cache-assets/tr.991747086e8e.json',en:'/cache-assets/en.6340430f875c.json',fr:'/cache-assets/fr.8bca4eb9712d.json',de:'/cache-assets/de.6e37f85f5649.json',ru:'/cache-assets/ru.2a4b61728149.json',vi:'/cache-assets/vi.cf7244dbd32d.json',zh:'/cache-assets/zh.8cdec433a653.json',ja:'/cache-assets/ja.49fb3f9f58d8.json'};
  const locales = {tr:'tr-TR',en:'en-US',fr:'fr-FR',de:'de-DE',ru:'ru-RU',vi:'vi-VN',zh:'zh-CN',ja:'ja-JP'};
  const normalize = value => String(value || '').toLowerCase().split(/[-_]/)[0];
  /* generated localized routes */
  const localizedRoutes = new Set(["/", "/about", "/about/community", "/about/credit", "/convert", "/downloads", "/guides", "/guides/convert-vs-remux", "/guides/instagram-reels-download", "/guides/tiktok-video-download", "/guides/youtube-web-and-apps", "/remux", "/support", "/updates"]);
  const location = window.location;
  const requestedReturn = location && new URLSearchParams(location.search || '').get('return');
  const prefix = /^\/(en|de|fr|ru|vi|zh|ja)(?:\/|$)/.exec(requestedReturn || location?.pathname || '')?.[1];
  const basePath = value => (String(value).replace(/^\/(en|de|fr|ru|vi|zh|ja)(?=\/|$)/,'').replace(/\.html$/,'') || '/');
  function path(value, language = current) {
    if (!names[language] || !String(value).startsWith('/') || String(value).startsWith('//')) return value;
    const parts=/^([^?#]*)(.*)$/.exec(String(value));
    const pathname=parts[1], suffix=parts[2];
    let route=basePath(pathname), anchor='';
    if (['/app','/pc-app'].includes(route)) { anchor=route==='/app'?'#android':'#windows'; route='/downloads'; }
    if (!localizedRoutes.has(route)) return value;
    return (language==='tr'?route:'/'+language+(route==='/'?'/':route))+(anchor || suffix);
  }
  function navigation() {
    if (!location) return;
    document.querySelectorAll('a[href]').forEach(link => {
      const original=link.getAttribute('href');
      if (!original?.startsWith('/') || original.startsWith('//')) return;
      let destination=path(original);
      if (/^\/settings(?:\.html)?$/.test(original) && localizedRoutes.has(basePath(location.pathname))) {
        destination='/settings?return='+encodeURIComponent(location.pathname+(location.hash||''));
      }
      if (destination!==original) link.setAttribute('href',destination);
    });
  }
  let saved;
  try { saved = localStorage.getItem('zw_lang'); } catch {}
  let current = prefix || (names[saved] ? saved : ((navigator.languages || [navigator.language]).map(normalize).find(value => names[value]) || 'en'));
  let revision = 0;
  const catalogs = new Map(), requests = new Map(), listeners = new Set();
  function translate(value, language = current) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim(), result = catalogs.get(language)?.[trimmed];
    return result === undefined ? value : value.slice(0,value.length-value.trimStart().length) + result + value.slice(value.trimEnd().length);
  }
  function map(value, language, key) {
    if (typeof value === 'function') return (...args) => translate(value(...args), language);
    if (typeof value === 'string') return key === 'locale' ? locales[language] : translate(value, language);
    if (Array.isArray(value)) return value.map(item => map(item, language));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,map(item,language,key)]));
    return value;
  }
  function copy(dictionary, language = current) {
    return dictionary[language] || map(dictionary.en, language);
  }
  function applyStatic() {
    document.querySelectorAll('[data-l10n]').forEach(element => {
      const fields = JSON.parse(element.getAttribute('data-l10n'));
      for (const [field, original] of Object.entries(fields)) {
        if (field==='html') {
          // Only checked-in, reviewed site copy can carry this marker.
          const translated=translate(original);
          if (element.innerHTML!==translated) element.innerHTML=translated;
        } else if (field.startsWith('text:')) {
          const node = element.childNodes[Number(field.slice(5))];
          if (node?.nodeType === 3) node.textContent = translate(original);
        } else element.setAttribute(field, translate(original));
      }
    });
    document.querySelectorAll('[data-site-language],#langSelect').forEach(select => {
      select.value = current;
      if (select.hasAttribute('data-site-language')) select.setAttribute('aria-label', translate('Language'));
    });
  }
  function notify() {
    document.documentElement.lang = current==='zh'?'zh-CN':current;
    applyStatic();
    listeners.forEach(listener => listener(current));
    window.dispatchEvent(new CustomEvent('zw-language-ready', {detail:current}));
    document.documentElement.lang = current==='zh'?'zh-CN':current;
    navigation();
  }
  async function load(language) {
    if (!requests.has(language)) requests.set(language, fetch(files[language]).then(response => {
      if (!response.ok) throw new Error('Language resource unavailable');
      return response.json();
    }).then(catalog => { catalogs.set(language,catalog); return catalog; }).catch(error => {requests.delete(language); throw error;}));
    return requests.get(language);
  }
  async function use(language) {
    if (!names[language]) return;
    const ticket = ++revision;
    document.querySelectorAll('[data-site-language],#langSelect').forEach(select => select.setAttribute('aria-busy','true'));
    try {
      await load(language);
      if (ticket !== revision) return;
      current = language;
      try { localStorage.setItem('zw_lang',current); } catch {}
      const returnRoute = location && new URLSearchParams(location.search || '').get('return');
      const sourceRoute = returnRoute || document.documentElement.getAttribute?.('data-localized-route');
      if (location && sourceRoute && localizedRoutes.has(basePath(sourceRoute.split(/[?#]/)[0]))) {
        const destination=path(sourceRoute,language);
        if (destination!==location.pathname+(location.search||'')+(location.hash||'')) { location.assign(destination); return; }
      }
      notify();
    } catch (error) {
      // Leave the last readable language and preference intact so a retry can recover.
      document.querySelectorAll('[data-site-language],#langSelect').forEach(select => select.value = current);
      console.error(error);
    } finally {
      if (ticket === revision) document.querySelectorAll('[data-site-language],#langSelect').forEach(select => select.removeAttribute('aria-busy'));
    }
  }
  function selector() {
    const select = document.getElementById('langSelect');
    // Settings owns this control; other pages only use the shared preference.
    if (!select) return;
    select.replaceChildren(...Object.entries(names).map(([code,name]) => {const option=document.createElement('option');option.value=code;option.textContent=name;option.lang=code;return option;}));
    select.value=current;
    if (select.hasAttribute('data-site-language')) select.addEventListener('change', () => use(select.value));
  }
  const domReady = document.readyState === 'loading' ? new Promise(resolve => document.addEventListener('DOMContentLoaded',resolve,{once:true})) : Promise.resolve();
  const ready = Promise.all([domReady.then(selector),load(current)]).then(notify).catch(error => console.error(error));
  window.ZWLanguage = {names,locales,ready,translate,copy,use,path,navigation,get current(){return current;},onChange(listener){listeners.add(listener);return ()=>listeners.delete(listener);}};
  document.documentElement.lang=current==='zh'?'zh-CN':current;
  domReady.then(() => {
    if (typeof MutationObserver==='undefined' || !document.body) return;
    let pending=false;
    new MutationObserver(() => {
      if (pending) return;
      pending=true;queueMicrotask(()=>{pending=false;navigation();});
    }).observe(document.body,{childList:true,subtree:true});
  });
})();
