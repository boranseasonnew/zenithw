// Only the public SDK is used by the Studio.
import {createSeparator,SynchronizedPlayer,waveformPeaks,safeFilename,inspectAudio,exportAudio} from '@lilith/audio-engine';
import type {SeparationEngine,SeparationResult,SeparatorOptions,StemName,ProgressEvent,AudioExportFormat} from '@lilith/audio-engine';
export const ENGLISH={
  upload:'Choose your audio',browse:'Browse files',drop:'Drop a file here, or browse from your device.',formats:'Mono or stereo · Up to 4 minutes / 96 MiB · Codecs depend on your browser',
  modelInfo:'UVR-MDX-NET-Voc_FT · 66.8 MB · First run downloads the model and a 26.8 MB runtime. Quality varies by recording.',
  cancel:'Cancel',ready:'Ready when you are.',privacy:'Your audio is never uploaded. Only public model files are downloaded. No tracking, ads or hidden server processing.',
  results:'Your separated stems',vocals:'Vocals',instrumental:'Instrumental',play:'Play',pause:'Pause',both:'Play Both',pauseBoth:'Pause Both',seek:'Seek',volume:'Volume',mute:'Mute',
  zip:'Download Both · ZIP',cache:'Remove cached model',storage:'Model storage',canceled:'Canceled. Audio and inference resources released.',
  failed:'Unable to process this file.',working:'Processing',download:'Downloading model',cached:'Using verified cached model',decoding:'Decoding audio',
  runtime:'Loading inference runtime',loading:'Initializing model',verify:'Verifying model integrity',tensors:'Preparing tensors',inference:'Running AI inference',reconstructing:'Reconstructing audio',
  complete:'Ready for playback',fallback:'WebGPU failed; trying WASM / CPU',cleared:'Cached model removed.',cacheError:'Cannot clear cache while processing.',credits:'Model: Anjok07 and aufr33 / UVR. MDX-Net: Kuielab. Not a Lilith-trained neural network.',
  waveform:'Waveform',decodeError:'This browser could not decode the file. Try WAV or MP3.',modelError:'Model download or verification failed. Check your connection and try again.',runtimeError:'Local inference failed. Try a shorter file and retry.',
  browserError:'Local AI processing is unavailable in this browser. Use a current browser on a secure connection.',
  locale:'en-US',resultsInfo:'{duration} s · 44.1 kHz · {backend} · Processing: {time} s',playbackError:'Playback failed. Try playing the track again.',exportError:'The download could not be prepared. Try again.',cacheFailed:'The model cache could not be cleared. Try again.',
  replaceFile:'Change track',vocalsHint:'Isolate the voice',instrumentalHint:'Keep the music',
  warm:'Model ready — processing this track',cacheWarning:'Your browser could not keep the model cache. A later visit may download it again.',
  automatic:'Automatic separation',automaticCopy:'Upload once. Get vocals and music together. No settings needed.',
  local:'On your device',retry:'Try again',checking:'Checking your audio',sizeError:'This file exceeds 96 MiB. Choose a smaller file.',channelError:'Only mono or stereo audio is supported. Convert this file to stereo first.',
  longFile:'This track is {duration}. Select a section of up to four minutes to keep memory use manageable.',rangeStart:'Start time (seconds)',rangeEnd:'End time (seconds)',rangeAction:'Separate this section',rangeError:'Choose a valid section between 1 second and 4 minutes within the track.',
  durationError:'This track exceeds four minutes. Select a section or choose a shorter file.',rangeBrowser:'Your browser cannot decode a selected section. Try a current Chromium browser or trim the file locally first.',
  exportTitle:'Download your audio',exportCopy:'Choose a format. Encoding happens on your device.',downloadAudio:'Download',close:'Close',mp3Hint:'Smaller file · 256 kbps',flacHint:'Lossless compression · 24-bit',wavHint:'Uncompressed · 16-bit PCM',encoding:'Preparing download',exportCanceled:'Download canceled.',
  playbackHint:'Play either track or blend both. Both stay in sync.',firstRun:'The first run downloads the AI model. CPU processing can take much longer; keep this tab open.',
};
export type StudioStrings=typeof ENGLISH;
export function mountStudio(root:HTMLElement,overrides:Partial<StudioStrings>={},options:SeparatorOptions={}){
  const t={...ENGLISH,...overrides};let engine:SeparationEngine|undefined,result:SeparationResult|undefined,player:SynchronizedPlayer|undefined,file:File|undefined;
  let controller:AbortController|undefined,exportController:AbortController|undefined,busy=false,exporting=false,frame=0,generation=0,destroyed=false,duration=0;
  const urls=new Set<string>(),timers=new Set<ReturnType<typeof setTimeout>>();
  const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,cls?:string)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
  const number=(v:number,digits=1)=>new Intl.NumberFormat(t.locale,{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(v);
  const time=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const icon=(kind:string)=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',({upload:'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',vocals:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1m-6 7v4m-4 0h8',instrumental:'M9 18V6l11-3v12M9 7l11-3M9 18c0 2-5 4-5 1s5-4 5-1Zm11-3c0 2-5 4-5 1s5-4 5-1Z',shield:'m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Zm-4 9 3 3 5-6'} as Record<string,string>)[kind]);svg.append(p);return svg;};
  root.dataset.state='upload';
  const workspace=el('section',undefined,'audio-workspace'),top=el('div',undefined,'workspace-top'),heading=el('div');heading.append(el('span',t.local,'local-badge'),el('h2',t.automatic),el('p',t.automaticCopy));top.append(heading);
  const input=el('input');input.type='file';input.accept='audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac,.webm';input.id='lilith-file';input.className='file-input';
  const browse=el('button',t.browse,'primary');browse.onclick=()=>input.click();
  const drop=el('div',undefined,'drop-area'),uploadGlyph=el('span',undefined,'upload-icon'),filename=el('p',t.drop,'filename');uploadGlyph.append(icon('upload'));drop.append(uploadGlyph,el('h3',t.upload),filename,input,browse,el('small',t.formats));
  const track=el('div',undefined,'track-strip');track.hidden=true;const trackIcon=el('span',undefined,'track-icon');trackIcon.append(icon('instrumental'));const trackCopy=el('div'),trackName=el('strong'),trackMeta=el('small'),replace=el('button',t.replaceFile);replace.onclick=()=>input.click();trackCopy.append(trackName,trackMeta);track.append(trackIcon,trackCopy,replace);
  const statusPanel=el('div',undefined,'processing-panel');statusPanel.hidden=true;const status=el('p',t.ready,'status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const progress=el('progress');progress.max=1;progress.hidden=true;progress.setAttribute('aria-label',t.working);
  const cancel=el('button',t.cancel),retry=el('button',t.retry,'primary');cancel.hidden=true;retry.hidden=true;const processActions=el('div',undefined,'process-actions');processActions.append(cancel,retry);
  statusPanel.append(status,progress,processActions);
  const rangePanel=el('section',undefined,'range-panel');rangePanel.hidden=true;const rangeCopy=el('p'),rangeFields=el('div',undefined,'range-fields'),startLabel=el('label',t.rangeStart),endLabel=el('label',t.rangeEnd),rangeStart=el('input'),rangeEnd=el('input'),rangeAction=el('button',t.rangeAction,'primary');
  for(const r of [rangeStart,rangeEnd]){r.type='number';r.step='1';r.min='0';}startLabel.append(rangeStart);endLabel.append(rangeEnd);rangeFields.append(startLabel,endLabel,rangeAction);rangePanel.append(rangeCopy,rangeFields);
  const output=el('section',undefined,'results');output.hidden=true;output.setAttribute('aria-label',t.results);
  const privacy=el('div',undefined,'privacy-note');privacy.append(icon('shield'),el('p',t.privacy));const firstRun=el('p',t.firstRun,'device-note');
  workspace.append(top,drop,track,rangePanel,statusPanel,output,firstRun,privacy);
  const cacheBar=el('div',undefined,'cache-bar'),storage=el('span',t.storage),clear=el('button',t.cache);cacheBar.append(storage,clear);
  const dialog=el('dialog',undefined,'export-dialog');dialog.setAttribute('closedby','any');dialog.setAttribute('aria-labelledby','lilith-export-title');
  const modalHead=el('div',undefined,'modal-heading'),modalTitle=el('h2',t.exportTitle);modalTitle.id='lilith-export-title';const close=el('button','×','dialog-close');close.setAttribute('aria-label',t.close);close.onclick=()=>dialog.close();modalHead.append(modalTitle,close);
  const modalSub=el('p',t.exportCopy),exportTarget=el('strong',undefined,'export-target'),formatGrid=el('div',undefined,'format-grid'),exportStatus=el('p',undefined,'export-status');exportStatus.setAttribute('role','status');
  let selectedStem:StemName='vocals',returnFocus:HTMLButtonElement|undefined;
  const formatButtons:HTMLButtonElement[]=[];
  for(const format of ['mp3','flac','wav'] as AudioExportFormat[]){const button=el('button',undefined,'format-choice');button.dataset.format=format;button.append(el('strong',format.toUpperCase()),el('small',t[`${format}Hint`]));button.onclick=()=>void encode(format);formatButtons.push(button);formatGrid.append(button);}
  dialog.append(modalHead,exportTarget,modalSub,formatGrid,exportStatus);
  if(!('closedBy' in HTMLDialogElement.prototype))dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{exportController?.abort();returnFocus?.focus();});
  root.replaceChildren(workspace,cacheBar,el('p',t.credits,'credits'),dialog);
  const updateStorage=async()=>{try{const sdk=engine??await createSeparator();const info=await sdk.storageInfo();storage.textContent=`${t.storage}: ${number(info.cachedBytes/1e6)} MB`;}catch{storage.textContent=t.storage;}};void updateStorage();
  const setBusy=(value:boolean)=>{busy=value;root.setAttribute('aria-busy',String(value));root.dataset.state=value?'processing':result?'results':file?'selected':'upload';cancel.hidden=!value;retry.hidden=value;clear.disabled=value;replace.disabled=value;input.disabled=value;browse.disabled=value;rangeAction.disabled=value;progress.hidden=!value;};
  const clearResults=async()=>{cancelAnimationFrame(frame);await player?.dispose();player=undefined;result?.dispose();result=undefined;output.replaceChildren();output.hidden=true;};
  const download=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob);urls.add(url);const link=el('a');link.href=url;link.download=name;root.append(link);link.click();link.remove();const timer=setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);timers.delete(timer);},60000);timers.add(timer);};
  const encode=async(format:AudioExportFormat)=>{
    if(!result||exporting)return;exporting=true;exportController=new AbortController();formatButtons.forEach(b=>b.disabled=true);exportStatus.textContent=t.encoding;
    try{const blob=await exportAudio(result[selectedStem],format,{signal:exportController.signal,workerUrl:options.exportWorkerUrl,onProgress:f=>{exportStatus.textContent=`${t.encoding} · ${number(f*100,0)}%`;}});if(!destroyed&&dialog.open){download(blob,`${safeFilename(file?.name)}_${selectedStem}.${format}`);dialog.close();}}
    catch(error){if(!destroyed)exportStatus.textContent=exportController.signal.aborted?t.exportCanceled:t.exportError;}
    finally{exporting=false;formatButtons.forEach(b=>b.disabled=false);}
  };
  const report=(event:ProgressEvent)=>{if(event.warning&&/unavailable|quota/.test(event.warning)){firstRun.textContent=t.cacheWarning;}const names:Record<string,string>={decoding:t.decoding,'model-download':event.cached?t.cached:t.download,'model-verify':t.verify,'model-ready':t.warm,runtime:t.runtime,'model-load':t.loading,'preparing-tensors':t.tensors,inference:t.inference,reconstructing:t.reconstructing,ready:t.complete,'cpu-fallback':t.fallback};status.textContent=(names[event.stage]??t.working)+(event.completed!==undefined?` · ${event.completed}/${event.total}`:event.loaded!==undefined&&!event.cached?` · ${number(event.loaded/1e6)} / ${number((event.total??0)/1e6)} MB`:'');if(event.progress!==undefined)progress.value=event.progress;else progress.removeAttribute('value');};
  const messages:Record<string,string>={ABORTED:t.canceled,LIMIT:t.durationError,SIZE:t.sizeError,DURATION:t.durationError,CHANNELS:t.channelError,DECODE:t.decodeError,MODEL:t.modelError,INTEGRITY:t.modelError,RUNTIME:t.runtimeError,WORKER:t.runtimeError,UNSUPPORTED:t.browserError};
  async function process(range?:{start:number;duration:number}){
    if(!file||busy||exporting)return;setBusy(true);statusPanel.hidden=false;rangePanel.hidden=true;controller=new AbortController();const token=++generation;
    try{await clearResults();if(!engine)engine=await createSeparator({...options,model:'mdx-default',backend:'auto',maxDuration:240,maxFileBytes:96*1024*1024});const value=await engine.separate(file,{signal:controller.signal,onProgress:report,range});if(token!==generation||destroyed){value.dispose();return;}showResults(value);status.textContent=t.complete;retry.hidden=true;void updateStorage();}
    catch(error){if(!destroyed){const code=error instanceof Error&&'code' in error?String(error.code):'';status.textContent=range&&code==='UNSUPPORTED'?t.rangeBrowser:messages[code]??t.failed;if(code==='DURATION'&&duration>240)showRange();}}
    finally{if(!destroyed){setBusy(false);retry.hidden=!!result||!Boolean(rangePanel.hidden);}}
  }
  function showRange(){rangePanel.hidden=false;rangeCopy.textContent=t.longFile.replace('{duration}',time(duration));rangeStart.value='0';rangeEnd.value=String(Math.min(240,Math.floor(duration)));rangeStart.max=String(Math.floor(duration)-1);rangeEnd.max=String(Math.floor(duration));}
  async function updateFile(next:File|undefined){
    if(!next||busy||exporting||destroyed)return;const token=++generation;file=next;statusPanel.hidden=false;status.textContent=t.checking;rangePanel.hidden=true;retry.hidden=true;drop.hidden=true;track.hidden=false;trackName.textContent=next.name;trackMeta.textContent=`${number(next.size/1024/1024)} MiB`;await clearResults();
    if(next.size>96*1024*1024){status.textContent=t.sizeError;return;}setBusy(true);cancel.hidden=true;
    try{const info=await inspectAudio(next);if(destroyed||token!==generation)return;duration=info.duration;trackMeta.textContent=`${time(duration)} · ${number(next.size/1024/1024)} MiB`;if((info.channels??2)>2){status.textContent=t.channelError;return;}if(duration>240){status.textContent=t.durationError;showRange();return;}}
    catch{duration=0;/* The SDK decoder remains the authority when metadata is unavailable. */}
    finally{if(!destroyed)setBusy(false);}
    if(!destroyed&&token===generation)await process();
  }
  input.addEventListener('change',()=>void updateFile(input.files?.[0]));drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragging');});drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragging');void updateFile(e.dataTransfer?.files[0]);});
  rangeAction.onclick=()=>{const start=Number(rangeStart.value),end=Number(rangeEnd.value);if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>duration||end-start<1||end-start>240){status.textContent=t.rangeError;return;}void process({start,duration:end-start});};
  retry.onclick=()=>void updateFile(file);cancel.onclick=()=>controller?.abort();
  function showResults(value:SeparationResult){
    result=value;player=new SynchronizedPlayer(value);output.hidden=false;const heading=el('div',undefined,'results-heading'),both=el('button',t.both),zip=el('button',t.zip);heading.append(el('h2',t.results),both,zip);output.append(heading,el('p',t.playbackHint,'playback-hint'));
    const updates:(()=>void)[]=[];const tick=()=>{updates.forEach(fn=>fn());both.textContent=player?.isPlaying('vocals')&&player.isPlaying('instrumental')?t.pauseBoth:t.both;if(player?.playing)frame=requestAnimationFrame(tick);};
    const playback=async(name:StemName|'both')=>{try{if(!player)return;if(name==='both'){if(player.isPlaying('vocals')&&player.isPlaying('instrumental'))player.pause();else await player.play('both');}else if(player.isPlaying(name))player.pauseStem(name);else await player.playStem(name);cancelAnimationFrame(frame);tick();}catch{status.textContent=t.playbackError;}};
    both.onclick=()=>void playback('both');zip.onclick=async()=>{zip.disabled=true;try{download(await value.exportZip(file?.name),safeFilename(file?.name)+'_stems.zip');}catch{status.textContent=t.exportError;}finally{zip.disabled=false;}};
    for(const name of ['vocals','instrumental'] as StemName[]){
      const row=el('article',undefined,'stem-card');row.dataset.stem=name;const rowHead=el('div',undefined,'stem-heading'),glyph=el('span',undefined,'stem-icon');glyph.append(icon(name));const title=el('div');title.append(el('h3',t[name]),el('small',t[name==='vocals'?'vocalsHint':'instrumentalHint']));const clock=el('span',`0:00 / ${time(value[name].duration)}`,'track-clock');rowHead.append(glyph,title,clock);
      const canvas=el('canvas');canvas.width=1200;canvas.height=144;canvas.setAttribute('aria-label',`${t[name]} ${t.waveform}`);const peaks=waveformPeaks(value[name].channels,400),ctx=canvas.getContext('2d')!,layers=[document.createElement('canvas'),document.createElement('canvas')];
      const colors=['#36343f',name==='vocals'?'#c9acff':'#87d9ce'];for(const [index,layer] of layers.entries()){layer.width=1200;layer.height=144;const c=layer.getContext('2d')!;c.fillStyle=colors[index];for(let i=0;i<peaks.length;i++){const height=Math.max(2,Math.min(1,peaks[i])*132);c.fillRect(i*3,72-height/2,2,height);}}
      const seek=el('input');seek.className='seek';seek.type='range';seek.min='0';seek.max=String(value[name].duration);seek.step='.01';seek.value='0';seek.setAttribute('aria-label',`${t[name]} ${t.seek}`);
      const controls=el('div',undefined,'player-controls'),play=el('button',t.play,'play-button'),save=el('button',undefined,'download-button');save.append(icon('download'),el('span',t.downloadAudio));save.setAttribute('aria-label',`${t[name]} ${t.downloadAudio}`);
      save.onclick=()=>{selectedStem=name;returnFocus=save;exportTarget.textContent=t[name];exportStatus.textContent='';dialog.showModal();};play.onclick=()=>void playback(name);
      const volume=el('input');volume.type='range';volume.min='0';volume.max='1';volume.step='.01';volume.value='1';volume.setAttribute('aria-label',`${t[name]} ${t.volume}`);volume.oninput=()=>player?.volume(name,Number(volume.value));const mute=el('button',t.mute,'mute-button');mute.setAttribute('aria-pressed','false');mute.onclick=()=>{const active=mute.getAttribute('aria-pressed')!=='true';mute.setAttribute('aria-pressed',String(active));player?.mute(name,active);};const volumeGroup=el('div',undefined,'volume-group');volumeGroup.append(mute,volume);
      seek.oninput=()=>void player?.seek(Number(seek.value)).then(()=>{cancelAnimationFrame(frame);tick();}).catch(()=>{status.textContent=t.playbackError;});
      const draw=()=>{const seconds=player?.currentTime??0,fraction=seconds/value[name].duration;ctx.clearRect(0,0,1200,144);ctx.drawImage(layers[0],0,0);ctx.save();ctx.beginPath();ctx.rect(0,0,1200*fraction,144);ctx.clip();ctx.drawImage(layers[1],0,0);ctx.restore();ctx.fillStyle=colors[1];ctx.fillRect(Math.min(1198,1200*fraction),0,2,144);clock.textContent=`${time(seconds)} / ${time(value[name].duration)}`;seek.value=String(seconds);seek.setAttribute('aria-valuetext',`${time(seconds)} / ${time(value[name].duration)}`);play.textContent=player?.isPlaying(name)?t.pause:t.play;row.dataset.playing=String(player?.isPlaying(name)??false);};
      controls.append(play,save,volumeGroup);row.append(rowHead,canvas,seek,controls);output.append(row);updates.push(draw);
    }
    output.append(el('p',t.resultsInfo.replace('{duration}',number(value.vocals.duration,2)).replace('{backend}',value.metadata.backend.toUpperCase()).replace('{time}',number(value.metadata.totalSeconds??value.metadata.inferenceSeconds)),'model-info'));tick();
  }
  clear.onclick=async()=>{try{await (engine??await createSeparator()).clearCache();statusPanel.hidden=false;status.textContent=t.cleared;await updateStorage();}catch{status.textContent=busy?t.cacheError:t.cacheFailed;}};
  const destroy=async()=>{destroyed=true;++generation;controller?.abort();exportController?.abort();if(dialog.open)dialog.close();await engine?.dispose();await clearResults();for(const url of urls)URL.revokeObjectURL(url);for(const timer of timers)clearTimeout(timer);urls.clear();timers.clear();};window.addEventListener('pagehide',()=>void destroy(),{once:true});return {destroy};
}
