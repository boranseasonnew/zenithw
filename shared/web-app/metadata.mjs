// ZenithW metadata; built into the existing classic-script entry point.
import {API} from './api.mjs';
import {showPublicError} from './errors.mjs';
import {handleYoutubeAppRequired, hideQR, shouldRouteYoutubeToApps, showQR, showYoutubeAppRequired} from './input.mjs';
import {t} from './language.mjs';
import {openDlModal} from './progress.mjs';
import {renderPlaylist} from './queue.mjs';
import {state} from './state.mjs';
import {toast} from './ui.mjs';


export async function fetchVideo(opts){
  opts=opts||{};
  const url=document.getElementById('urlInput').value.trim();
  // Her denemede eski sonucu temizle — bulk'ta fail olan link bir önceki
  // videoyu tekrar indirmesin / başarı sayılmasın.
  state.videoInfo={};
  if(!url){if(!opts.silent)toast(t('enterLink'),'#ed4245');return false;}
  if(shouldRouteYoutubeToApps(url)){showYoutubeAppRequired();return false;}
  if(state.infoController)state.infoController.abort();
  const controller=new AbortController();
  const sequence=++state.infoSequence;
  state.infoController=controller;
  document.getElementById('urlSpinWrap').innerHTML='<div class="spinner"></div>';
  document.getElementById('playlistCard').classList.remove('show');
  document.getElementById('errorWrap').classList.remove('show');
  hideQR();
  try{
    const res=await fetch(API+'/info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:controller.signal});
    const d=await res.json();
    if(sequence!==state.infoSequence||document.getElementById('urlInput').value.trim()!==url)return false;
    if(d.error){if(handleYoutubeAppRequired(d))return false;if(!opts.silent)showPublicError(d,res.status,url,true);return false;}

    if(d.is_playlist){
      // Toplu indirme tek video bekler; playlist bulursa bu URL fail sayılır.
      if(opts.forBulk)return false;
      renderPlaylist(d,url);
      toast((d.playlist_count||0)+' video bulundu','#3bba64');
      return true;
    }

    state.videoInfo={url,title:d.title,thumbnail:d.thumbnail,uploader:d.uploader,duration:d.duration};
    // Analiz sonucu küçük bir kartta kaybolmak yerine doğrudan karar modalında
    // gösterilir; kullanıcı indirmenin hangi medya için başlayacağını doğrular.
    openDlModal();
    if(!opts.silent){toast(t('found'),'#3bba64');showQR(url);}
    return true;
  }catch(e){
    if(e.name!=='AbortError'&&sequence===state.infoSequence&&!opts.silent)showPublicError({error_code:'network_error'},0,url,true);
    return false;
  }
  finally{
    if(state.infoController===controller)state.infoController=null;
    if(sequence===state.infoSequence)document.getElementById('urlSpinWrap').innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text3)"><circle cx="12" cy="12" r="10"/></svg>';
  }
}
