/* Local file processing beta. Dependencies are bundled on our own origin.
   Never upload a failed local job without an explicit per-job choice. */
(() => {
  const words = {
    en: ['Processing location · Beta', 'Server', 'Prefer this device', 'Only this device', 'Compatible audio/video streams only; no re-encoding. Subtitles, chapters and attachments are not preserved. Link downloads still use the server. Mobile: 24 MB; desktop: 64 MB; maximum 30 minutes.', 'Preparing on this device…', 'Processing on this device…', 'Ready — processed on this device', 'Local processing is unavailable for this file, format or browser. No file was uploaded.', 'Upload this file and use the server', 'Cancel', 'Cancelled — no file uploaded', 'Local processing timed out. No file was uploaded.'],
    tr: ['İşlem yeri · Beta', 'Sunucu', 'Önce bu cihaz', 'Yalnızca bu cihaz', 'Yalnızca uyumlu ses/video akışları; yeniden kodlama yapılmaz. Altyazılar, bölümler ve ekler korunmaz. Bağlantı indirmeleri sunucuyu kullanır. Mobil: 24 MB; masaüstü: 64 MB; en fazla 30 dakika.', 'Bu cihazda hazırlanıyor…', 'Bu cihazda işleniyor…', 'Hazır — bu cihazda işlendi', 'Bu dosya, format veya tarayıcı yerel işleme için uygun değil. Dosya yüklenmedi.', 'Bu dosyayı yükle ve sunucuda işle', 'İptal', 'İptal edildi — dosya yüklenmedi', 'Yerel işlem zaman aşımına uğradı. Dosya yüklenmedi.'],
    de: ['Verarbeitung · Beta', 'Server', 'Dieses Gerät bevorzugen', 'Nur dieses Gerät', 'Nur kompatible Audio-/Videospuren; keine Neukodierung. Untertitel, Kapitel und Anhänge bleiben nicht erhalten. Link-Downloads nutzen den Server. Mobil: 24 MB; Desktop: 64 MB; maximal 30 Minuten.', 'Wird auf diesem Gerät vorbereitet…', 'Wird auf diesem Gerät verarbeitet…', 'Bereit — auf diesem Gerät verarbeitet', 'Datei, Format oder Browser nicht unterstützt. Keine Datei hochgeladen.', 'Diese Datei hochladen und Server verwenden', 'Abbrechen', 'Abgebrochen — keine Datei hochgeladen', 'Zeitlimit erreicht. Keine Datei hochgeladen.'],
    fr: ['Traitement · Bêta', 'Serveur', 'Préférer cet appareil', 'Cet appareil uniquement', 'Flux audio/vidéo compatibles uniquement, sans réencodage. Sous-titres, chapitres et pièces jointes non conservés. Les liens utilisent le serveur. Mobile : 24 Mo ; ordinateur : 64 Mo ; 30 minutes maximum.', 'Préparation sur cet appareil…', 'Traitement sur cet appareil…', 'Prêt — traité sur cet appareil', 'Fichier, format ou navigateur non pris en charge. Aucun fichier envoyé.', 'Envoyer ce fichier et utiliser le serveur', 'Annuler', 'Annulé — aucun fichier envoyé', 'Délai dépassé. Aucun fichier envoyé.'],
    ja: ['処理する場所 · ベータ', 'サーバー', 'この端末を優先', 'この端末のみ', '互換性のある音声・動画トラックのみ。再エンコードは行いません。字幕・チャプター・添付データは保持されません。リンクはサーバーで処理します。モバイル24 MB、PC 64 MB、最大30分。', 'この端末で準備中…', 'この端末で処理中…', '完了 — この端末で処理しました', 'このファイル・形式・ブラウザには対応していません。ファイルは送信されていません。', 'このファイルを送信してサーバーで処理', 'キャンセル', 'キャンセルしました — 送信していません', '時間制限に達しました。送信していません。'],
  };
  let panel, select, status, progress, cancel, retry, active = false;
  const text = index => (words[document.documentElement.lang] || words.en)[index];
  function render() {
    panel.querySelector('label').textContent = text(0);
    [...select.options].forEach((option, i) => option.textContent = text(i + 1));
    panel.querySelector('p').textContent = text(4);
    cancel.textContent = text(10); retry.textContent = text(9);
  }
  function init() {
    const drop = document.getElementById('convDrop') || document.getElementById('remuxDrop');
    if (!drop) return;
    panel = document.createElement('section'); panel.className = 'local-media-panel';
    panel.innerHTML = '<label for="localMediaMode"></label><select id="localMediaMode"><option value="server"></option><option value="preferred"></option><option value="only"></option></select><p></p><output aria-live="polite"></output><progress max="1" hidden></progress><div><button type="button" hidden></button><button type="button" hidden></button></div>';
    drop.before(panel); select = panel.querySelector('select'); status = panel.querySelector('output'); progress = panel.querySelector('progress');
    [cancel, retry] = panel.querySelectorAll('button');
    try { const saved = localStorage.getItem('zw_local_media'); if (['server', 'preferred', 'only'].includes(saved)) select.value = saved; } catch {}
    select.addEventListener('change', () => { try { localStorage.setItem('zw_local_media', select.value); } catch {} });
    render(); new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }
  async function run(form) {
    if (!panel || select.value === 'server') return null;
    if (active) throw new DOMException('Busy', 'AbortError');
    active = true; select.disabled = true; status.textContent = text(5); progress.hidden = false; progress.removeAttribute('value'); cancel.hidden = false;
    const mode = select.value;
    try {
      const blob = await new Promise((resolve, reject) => {
        let worker, timer, settled = false;
        const finish = (error, result) => { if (settled) return; settled = true; clearTimeout(timer); worker?.terminate(); cancel.onclick = null; error ? reject(error) : resolve(result); };
        cancel.onclick = () => finish(new DOMException('Cancelled', 'AbortError'));
        const mobile = navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
        const limit = (mobile || (navigator.deviceMemory && navigator.deviceMemory < 4) ? 24 : 64) * 1024 * 1024;
        const file = form.get('file');
        if (!window.isSecureContext || !window.Worker || !(file instanceof Blob) || !file.size || file.size > limit) return finish(Error('unsupported'));
        try {
          worker = new Worker('/vendor/local-media-worker.js?v=1', { type: 'module' });
          worker.onmessage = ({ data }) => {
            if (data.type === 'progress') { status.textContent = text(6); progress.value = data.value; }
            if (data.type === 'done') finish(null, data.blob);
            if (data.type === 'error') finish(Error(data.code));
          };
          worker.onerror = () => finish(Error('unsupported'));
          timer = setTimeout(() => finish(Error('timeout')), 120000);
          worker.postMessage({ file, format: form.get('target_format'), limit });
        } catch (error) { finish(error); }
      });
      if (!(blob instanceof Blob) || !blob.size) throw Error('empty');
      status.textContent = text(7); progress.value = 1;
      return { blob, filename: form.get('download_name') || 'media' };
    } catch (error) {
      progress.hidden = true;
      status.textContent = text(error.name === 'AbortError' ? 11 : error.message === 'timeout' ? 12 : 8);
      if (error.name === 'AbortError' || mode === 'only') { error.localMedia = true; throw error; }
      // A separate choice is required for this file, even in preferred mode.
      await new Promise((resolve, reject) => {
        retry.hidden = false;
        retry.onclick = () => { status.textContent = text(1); resolve(); };
        cancel.onclick = () => { status.textContent = text(11); const abort = new DOMException('Cancelled', 'AbortError'); abort.localMedia = true; reject(abort); };
      });
      return null;
    } finally {
      active = false; select.disabled = false; cancel.hidden = true; retry.hidden = true;
      cancel.onclick = null; retry.onclick = null;
    }
  }
  window.ZenithLocalMedia = { run, isLocal: () => !!panel && select.value !== 'server' };
  document.addEventListener('DOMContentLoaded', init);
})();
