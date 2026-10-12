// @ts-check
(() => {
  'use strict';
  const language = /** @type {Window & {ZWLanguage?: {translate: (text: string) => string}}} */ (window);
  document.querySelectorAll('[data-copy-command]').forEach(element => {
    if (!(element instanceof HTMLButtonElement)) return;
    const button = element;
    button.hidden = false;
    button.addEventListener('click', async () => {
      const status = document.getElementById('copy-status');
      if (!status) return;
      const t = (/** @type {string} */ value) => language.ZWLanguage?.translate(value) || value;
      try {
        await navigator.clipboard.writeText(button.dataset.copyCommand || '');
        status.textContent = t('Command copied.');
      } catch {
        status.textContent = t('Select the command and copy it manually.');
      }
    });
  });

  const menu = document.querySelector('.downloads-menu');
  if (menu instanceof HTMLDetailsElement) {
    document.addEventListener('click',event => { if(event.target instanceof Node && !menu.contains(event.target))menu.open=false; });
    document.addEventListener('keydown',event => { if(event.key==='Escape' && menu.open){menu.open=false;menu.querySelector('summary')?.focus();} });
  }

  const candidate = document.getElementById('platformTabs');
  if (!candidate) return;
  const bar = candidate;
  const tabs = [...bar.querySelectorAll('button[data-platform]')].filter(tab => tab instanceof HTMLButtonElement);
  const panels = ['android','windows'].map(id => document.getElementById(id)).filter(panel => panel instanceof HTMLElement);
  const mobile = matchMedia('(max-width:720px)');
  let selected = location.hash === '#windows' ? 'windows' : 'android';
  function render() {
    bar.hidden = !mobile.matches;
    bar.setAttribute('role','tablist');
    tabs.forEach(tab => {
      const active = tab.dataset.platform === selected;
      tab.setAttribute('role','tab');
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => {
      panel.hidden = mobile.matches && panel.id !== selected;
      if (mobile.matches) {
        panel.setAttribute('role','tabpanel');
        panel.setAttribute('aria-labelledby',panel.id+'Tab');
        panel.tabIndex = 0;
      } else {
        panel.removeAttribute('role');
        panel.setAttribute('aria-labelledby',panel.id+'-title');
        panel.removeAttribute('tabindex');
      }
    });
  }
  /** @param {string} id @param {boolean} [updateHash] */
  function select(id, updateHash=false) {
    if (!['android','windows'].includes(id)) return;
    selected = id;
    if(updateHash) history.replaceState(null,'','#'+id);
    render();
  }
  tabs.forEach(tab => tab.addEventListener('click',() => select(tab.dataset.platform || 'android',true)));
  bar.addEventListener('keydown', event => {
    if (!(event.target instanceof HTMLButtonElement)) return;
    const index = tabs.indexOf(event.target);
    let next;
    if (event.key === 'ArrowRight') next = (index+1)%tabs.length;
    else if (event.key === 'ArrowLeft') next = (index-1+tabs.length)%tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length-1;
    else return;
    event.preventDefault();
    select(tabs[next].dataset.platform || 'android',true);
    tabs[next].focus();
  });
  mobile.addEventListener('change',() => {
    const active = document.activeElement?.closest('.platform');
    if (active) selected = active.id;
    render();
  });
  window.addEventListener('hashchange',() => {
    if (location.hash.startsWith('#android')) select('android');
    else if (location.hash === '#windows') select('windows');
    document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start'});
  });
  document.getElementById('androidTutorialTrigger')?.addEventListener('click',() => {selected='android';});
  render();
})();
