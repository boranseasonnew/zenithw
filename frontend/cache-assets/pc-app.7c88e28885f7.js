(() => {
  'use strict';
  const previews = {
    workspace: ['/cache-assets/workspace.989ccacf2862.png', 'ZenithW Desktop indirmeler ve geçmiş', 'ZenithW Desktop downloads and history'],
    settings: ['/cache-assets/settings.33ee340439ab.png', 'ZenithW Desktop ayarları', 'ZenithW Desktop settings'],
    setup: ['/cache-assets/setup.b07d68cf347e.png', 'ZenithW Desktop ilk açılış', 'ZenithW Desktop setup']
  };
  document.querySelectorAll('[data-preview]').forEach(button => {
    button.addEventListener('click', () => {
      const preview = previews[button.dataset.preview];
      const image = document.getElementById('desktop-shot');
      if (!preview || !image) return;
      image.src = preview[0];
      image.dataset.trAlt = preview[1];
      image.dataset.enAlt = preview[2];
      image.alt = preview[document.documentElement.lang === 'en' ? 2 : 1];
      document.querySelectorAll('[data-preview]').forEach(other => {
        other.classList.toggle('selected', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      });
    });
  });
})();
