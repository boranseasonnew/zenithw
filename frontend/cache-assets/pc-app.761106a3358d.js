(() => {
  'use strict';
  const previews = {
    workspace: ['/cache-assets/workspace.ed6a7db72c0d.png', 'Zenith Desktop indirmeler ve geçmiş', 'Zenith Desktop downloads and history'],
    settings: ['/cache-assets/settings.b7e8ef229d29.png', 'Zenith Desktop ayarları', 'Zenith Desktop settings'],
    setup: ['/cache-assets/setup.54a8e8c46b20.png', 'Zenith Desktop ilk açılış', 'Zenith Desktop setup']
  };
  document.querySelectorAll('[data-preview]').forEach(button => {
    button.addEventListener('click', () => {
      const preview = previews[button.dataset.preview];
      const image = document.getElementById('desktop-shot');
      if (!preview || !image) return;
      image.src = preview[0];
      image.dataset.trAlt = preview[1];
      image.dataset.enAlt = preview[2];
      image.alt = window.ZWLanguage?ZWLanguage.translate(preview[2]):preview[document.documentElement.lang === 'en' ? 2 : 1];
      document.querySelectorAll('[data-preview]').forEach(other => {
        other.classList.toggle('selected', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      });
    });
  });
})();
