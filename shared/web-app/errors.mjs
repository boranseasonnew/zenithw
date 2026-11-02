// ZenithW errors; built into the existing classic-script entry point.
import {isYT} from './input.mjs';
import {t} from './language.mjs';
import {state} from './state.mjs';
import {toast} from './ui.mjs';

export function showErr(icon,msg){document.getElementById('errIcon').textContent=icon;document.getElementById('errTxt').textContent=msg;document.getElementById('errorWrap').classList.add('show');}


export const PUBLIC_ERROR_TX={
  youtube_restricted:'errYoutubeRestricted',format_unavailable:'errFormatUnavailable',
  private_video:'errPrivate',copyright_restricted:'errPlatformRestricted',age_restricted:'errUnavailable',video_unavailable:'errUnavailable',live_not_supported:'errLive',
  instagram_ratelimit:'igBusy',platform_restricted:'errPlatformRestricted',unsupported_url:'errUnsupported',playlist_not_supported:'errUnsupported',video_too_long:'errUnavailable',
  invalid_url:'errInvalidUrl',network_error:'errNetwork',request_timeout:'errTimeout',file_too_large:'errFileTooLarge',server_busy:'errServerBusy',media_probe_failed:'errConversion',conversion_too_long:'errConversion',conversion_failed:'errConversion',remux_incompatible:'errConversion',request_failed:'errGeneric'
};


export function publicErrorMessage(payload,status,url){
  const code=payload&&payload.error_code;
  if(code&&PUBLIC_ERROR_TX[code])return t(PUBLIC_ERROR_TX[code]);
  // Older API deployments return these validation errors without a code.
  // Match known messages only; never display raw upstream errors or URLs.
  const legacy=typeof payload?.error==='string'?payload.error.trim().toLowerCase():'';
  if(['this platform is not supported.','this link or platform is not supported.'].includes(legacy)||legacy.startsWith('unsupported url:'))return t('errUnsupported');
  if(['invalid or disallowed url.','url required'].includes(legacy))return t('errInvalidUrl');
  if(status===429)return t('errRateLimited');
  if(status===503)return t('errServerBusy');
  if(status===504)return t('errTimeout');
  if(isYT(url||''))return t('errYoutubeRestricted');
  return t('errGeneric');
}


export function renderToolError(code){
  const card=document.getElementById('toolError');
  if(!card)return false;
  const copy={
    remux_incompatible:['toolErrorRemuxTitle','toolErrorRemuxText'],
    media_probe_failed:['toolErrorProbeTitle','toolErrorProbeText'],
    file_too_large:['toolErrorSizeTitle','toolErrorSizeText'],
    request_timeout:['toolErrorTimeoutTitle','toolErrorTimeoutText'],
    conversion_too_long:['toolErrorTimeoutTitle','toolErrorTimeoutText'],
    conversion_failed:['toolErrorConversionTitle','toolErrorConversionText']
  }[code]||['toolErrorConversionTitle','toolErrorConversionText'];
  state.toolErrorCode=code;
  const title=document.getElementById('toolErrorTitle'),text=document.getElementById('toolErrorText');
  if(title)title.textContent=t(copy[0]);
  if(text)text.textContent=t(copy[1]);
  card.hidden=false;
  return true;
}


export function clearToolError(){const card=document.getElementById('toolError');if(card)card.hidden=true;state.toolErrorCode='';}


export function showPublicError(payload,status,url,inline){
  const msg=publicErrorMessage(payload,status,url);
  if(!inline&&renderToolError((payload&&payload.error_code)||''))return;
  if(inline)showErr('!',msg);else toast(msg,'#ed4245');
}
