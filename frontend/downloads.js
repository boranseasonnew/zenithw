(() => {
  'use strict';
  document.querySelectorAll('[data-copy-command]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const status = document.getElementById('copy-status');
      const t = text => window.ZWLanguage?.translate(text) || text;
      try {
        await navigator.clipboard.writeText(button.dataset.copyCommand);
        status.textContent = t('Command copied.');
      } catch {
        status.textContent = t('Select the command and copy it manually.');
      }
    });
  });
})();
