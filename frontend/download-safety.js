// Small control helpers; no network, storage, tracking or dependencies.
export function normalizeMediaUrl(value){
  if(typeof value!=='string'||value.length>4096||/[\x00-\x20\x7f]/.test(value))throw new TypeError('Invalid media URL');
  const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!url.hostname)throw new TypeError('Invalid media URL');
  url.hash='';return url.href;
}
export function normalizeBulkUrls(text){
  if(typeof text!=='string'||text.length>40960)throw new TypeError('Invalid bulk input');
  const urls=[...new Set(text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(normalizeMediaUrl))];
  if(!urls.length||urls.length>10)throw new RangeError('Bulk supports 1–10 unique URLs');return urls;
}
export function preparedUrl(value,api,base,status=false){
  if(typeof value!=='string'||value.length>4096)throw new TypeError('Invalid prepared URL');
  const endpoint=new URL(api,base),url=new URL(/^https?:\/\//.test(value)?value:api.replace(/\/$/,'')+value,base);
  const prefix=endpoint.pathname.replace(/\/$/,'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(!['https:','http:'].includes(url.protocol)||url.origin!==endpoint.origin||url.username||url.password||url.search||url.hash||!new RegExp('^'+prefix+'/files/[A-Za-z0-9_-]{40,64}'+(status?'/status':'')+'$').test(url.pathname))throw new TypeError('Invalid prepared URL');
  return url.href;
}
export function retryDelay(header,now=Date.now()){
  const seconds=Number(header),date=Date.parse(header||'');
  const value=header&&Number.isFinite(seconds)?seconds:Number.isFinite(date)?Math.ceil((date-now)/1000):10;
  return Math.max(1,Math.ceil(value))*1000;
}
export function abortableWait(ms,signal){
  if(signal?.aborted)return Promise.reject(new DOMException('Canceled','AbortError'));
  return new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new DOMException('Canceled','AbortError'));};const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);signal?.addEventListener('abort',abort,{once:true});});
}
export async function readBoundedBlob(response,limit,expected,onProgress,signal){
  if(!Number.isSafeInteger(limit)||limit<1)throw new RangeError('Invalid byte limit');
  const declared=Number(response.headers.get('Content-Length'))||0;
  if(declared>limit||expected>limit){await response.body?.cancel();throw new RangeError('File exceeds memory limit');}
  if(!response.body?.getReader)throw new Error('Streaming is unavailable; use native download');
  const reader=response.body.getReader(),chunks=[];let received=0;
  const abort=()=>void reader.cancel().catch(()=>{});signal?.addEventListener('abort',abort,{once:true});
  try{while(true){if(signal?.aborted)throw new DOMException('Canceled','AbortError');const part=await reader.read();if(signal?.aborted)throw new DOMException('Canceled','AbortError');if(part.done)break;received+=part.value.byteLength;if(received>limit)throw new RangeError('File exceeds memory limit');chunks.push(part.value);onProgress?.(received,expected||declared);}
    if(!received||(expected>0&&received!==expected))throw new Error('Incomplete file transfer');
    return new Blob(chunks,{type:response.headers.get('Content-Type')||'application/octet-stream'});
  }catch(error){await reader.cancel().catch(()=>{});throw error;}finally{signal?.removeEventListener('abort',abort);reader.releaseLock();}
}
