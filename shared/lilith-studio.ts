// The Studio imports the built public SDK, never internal inference modules.
import {createSeparator,SynchronizedPlayer,waveformPeaks,safeFilename,listModels} from '@lilith/audio-engine';
import type {SeparationEngine,SeparationResult,SeparatorOptions,StemName,ProgressEvent} from '@lilith/audio-engine';
export const ENGLISH={
  upload:'Choose your audio',browse:'Browse files',drop:'Drop a file here, or browse from your device.',formats:'Mono or stereo · Up to 4 minutes / 96 MiB · Codecs depend on your browser',
  model:'AI model',modelInfo:'UVR-MDX-NET-Voc_FT · 66.8 MB · First run downloads the model and a 26.8 MB runtime. Quality varies by recording.',
  backend:'Processing backend',auto:'Auto (WebGPU → WASM)',wasm:'WASM / CPU',gpu:'WebGPU only',action:'Separation action',
  removeVocals:'Remove Vocals',removeInstrumental:'Remove Instrumental',extractVocals:'Extract / Download Vocals',extractInstrumental:'Extract / Download Instrumental',
  separate:'Separate audio',cancel:'Cancel',ready:'Ready when you are.',privacy:'Your audio is never uploaded. Only public model files are downloaded. No tracking, ads or hidden server processing.',
  results:'Your separated stems',vocals:'Vocals',instrumental:'Instrumental',play:'Play',pause:'Pause',both:'Play Both',pauseBoth:'Pause Both',seek:'Seek',volume:'Volume',mute:'Mute',
  wav:'Download WAV',zip:'Download Both · ZIP',cache:'Remove cached model',storage:'Model storage',empty:'Choose an audio file first.',canceled:'Canceled. Audio and inference resources released.',
  failed:'Unable to process this file.',working:'Processing',download:'Downloading model',cached:'Using verified cached model',decoding:'Decoding audio',
  runtime:'Loading inference runtime',loading:'Initializing model',verify:'Verifying model integrity',tensors:'Preparing tensors',inference:'Running AI inference',reconstructing:'Reconstructing audio',
  complete:'Ready for playback',fallback:'WebGPU failed; trying WASM / CPU',error:'Error',cleared:'Cached model removed.',cacheError:'Cannot clear cache while processing.',credits:'Model: Anjok07 and aufr33 / UVR. MDX-Net: Kuielab. Not a Lilith-trained neural network.',
  waveform:'Waveform',limitError:'Choose a shorter or smaller file; mono/stereo up to 4 minutes and 96 MiB.',decodeError:'This browser could not decode the file. Try WAV or MP3.',modelError:'Model download or verification failed. Check your connection and try again.',runtimeError:'Local inference failed. Try a shorter file in WASM / CPU mode.',
  browserError:'Local AI processing is unavailable in this browser. Use a current browser on a secure connection.',
  uploadStep:'Upload your track',configureStep:'Shape your sound',resultsStep:'Listen & download',replaceFile:'Change track',
  unlock:'Choose a track to unlock the separation options.',visualTitle:'One track. Two possibilities.',visualCopy:'Find the voice. Rediscover the music.',
  settings:'Engine settings',vocalsHint:'Isolate the voice',instrumentalHint:'Keep the music',trackReady:'Track selected',
  longWarning:'Up to four minutes. Longer tracks use more memory and may take several minutes on a GPU or much longer on a CPU. Keep this tab open.',

};
export type StudioStrings=typeof ENGLISH;
export function mountStudio(root:HTMLElement,overrides:Partial<StudioStrings>={},options:SeparatorOptions={}) {
  const t={...ENGLISH,...overrides};let engine:SeparationEngine|undefined,result:SeparationResult|undefined,player:SynchronizedPlayer|undefined;
  let file:File|undefined,processedFile:File|undefined,processedBackend='',controller:AbortController|undefined,busy=false,generation=0,frame=0,destroyed=false;
  const urls=new Set<string>(),timers=new Set<ReturnType<typeof setTimeout>>();
  const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,cls?:string)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
  root.dataset.state='upload';
  const icon=(kind:string)=>{
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.5');svg.setAttribute('aria-hidden','true');
    const paths:Record<string,string>={upload:'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',vocals:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1m-6 7v4m-4 0h8',instrumental:'M9 18V6l11-3v12M9 7l11-3M9 18c0 2-5 4-5 1s5-4 5-1Zm11-3c0 2-5 4-5 1s5-4 5-1Z',shield:'m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Zm-4 9 3 3 5-6'};
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[kind]??paths.upload);svg.append(path);return svg;
  };
  const stepper=el('ol',undefined,'studio-steps');
  for(const [index,text] of [t.uploadStep,t.configureStep,t.resultsStep].entries()){
    const step=el('li');step.dataset.step=String(index+1);step.append(el('span',String(index+1).padStart(2,'0'),'step-number'),el('span',text));stepper.append(step);
  }
  const layout=el('div',undefined,'workspace-grid'),card=el('section',undefined,'audio-card upload-panel'),label=el('h2',t.upload),drop=el('div',undefined,'drop-area');
  const uploadHeading=el('div',undefined,'panel-heading');uploadHeading.append(el('span','01','panel-number'),label);
  const input=el('input');input.type='file';input.accept='audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac,.webm';input.id='lilith-file';input.className='file-input';
  const browse=el('label',t.browse,'button');browse.htmlFor=input.id;
  const filename=el('p',t.drop,'filename'),uploadMark=el('span',undefined,'upload-icon');uploadMark.append(icon('upload'));drop.append(uploadMark,filename,input,browse,el('small',t.formats));
  const replace=el('button',t.replaceFile,'replace-track');replace.hidden=true;replace.onclick=()=>input.click();
  const selected=el('span',t.trackReady,'selected-badge');selected.hidden=true;
  const privacy=el('div',undefined,'privacy-note');privacy.append(icon('shield'),el('p',t.privacy));
  card.append(uploadHeading,selected,drop,replace,privacy);
  const welcome=el('aside',undefined,'welcome-panel');
  const artwork=el('div',undefined,'record-art');artwork.setAttribute('aria-hidden','true');
  const disc=el('div',undefined,'record-disc');disc.append(el('span',undefined,'record-label'),el('span',undefined,'record-hole'));artwork.append(el('span',undefined,'orbit-ring orbit-one'),el('span',undefined,'orbit-ring orbit-two'),disc);
  welcome.append(artwork,el('h2',t.visualTitle),el('p',t.visualCopy),el('small',t.unlock));
  const configuration=el('section',undefined,'audio-card configuration-panel');configuration.hidden=true;
  const configurationHeading=el('div',undefined,'panel-heading');configurationHeading.append(el('span','02','panel-number'),el('h2',t.configureStep));
  const settings=el('details',undefined,'engine-settings'),settingsTitle=el('summary',t.settings);settings.append(settingsTitle);
  const fields=el('div',undefined,'fields'),modelLabel=el('label',t.model),select=el('select');select.setAttribute('aria-label',t.model);
  for(const model of listModels()){const option=el('option',model.name);option.value=model.id;select.append(option);}modelLabel.append(select);
  const backendLabel=el('label',t.backend),backend=el('select');backend.setAttribute('aria-label',t.backend);
  for(const [value,text] of [['auto',t.auto],['wasm',t.wasm],['webgpu',t.gpu]]){const option=el('option',text);option.value=value;backend.append(option);}backendLabel.append(backend);fields.append(modelLabel,backendLabel);
  const choices=el('fieldset'),legend=el('legend',t.action);choices.append(legend);
  for(const [value,text] of [['instrumental',t.removeVocals],['vocals',t.removeInstrumental],['vocals',t.extractVocals],['instrumental',t.extractInstrumental]]){
    const option=el('label',undefined,'choice'),radio=el('input');radio.type='radio';radio.name='lilith-action';radio.value=value;radio.checked=choices.children.length===1;
    const glyph=el('span',undefined,'choice-icon');glyph.append(icon(value==='vocals'?'vocals':'instrumental'));
    const copy=el('span',undefined,'choice-copy');copy.append(el('strong',text),el('small',value==='vocals'?t.vocalsHint:t.instrumentalHint));
    option.append(radio,glyph,copy);choices.append(option);
  }
  const actions=el('div',undefined,'actions'),start=el('button',t.separate,'primary'),cancel=el('button',t.cancel);cancel.disabled=true;actions.append(start,cancel);
  const status=el('p',t.ready,'status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const progress=el('progress');progress.hidden=true;progress.max=1;progress.setAttribute('aria-label',t.working);
  settings.append(fields,el('p',t.modelInfo,'model-info'));
  configuration.append(configurationHeading,choices,settings,el('p',t.longWarning,'device-note'),actions,status,progress);
  const uploadStatus=el('p',t.empty,'upload-status');uploadStatus.hidden=true;uploadStatus.setAttribute('role','alert');card.append(uploadStatus);
  layout.append(card,welcome,configuration);
  const output=el('section',undefined,'results');output.hidden=true;output.setAttribute('aria-label',t.results);
  const cacheBar=el('div',undefined,'cache-bar'),storage=el('span',t.storage),clear=el('button',t.cache);cacheBar.append(storage,clear);
  root.replaceChildren(stepper,layout,output,cacheBar,el('p',t.credits,'credits'));
  const updateStorage=async()=>{try{const sdk=engine??await createSeparator();const info=await sdk.storageInfo();storage.textContent=`${t.storage}: ${(info.cachedBytes/1e6).toFixed(1)} MB`;}catch{storage.textContent=t.storage;}};
  void updateStorage();
  const updateFile=(next:File|undefined)=>{
    if(busy||!next)return;
    if(next.size>(options.maxFileBytes??96*1024*1024)){uploadStatus.hidden=false;uploadStatus.textContent=t.limitError;return;}
    uploadStatus.hidden=true;file=next;filename.textContent=`${next.name} · ${(next.size/1024/1024).toFixed(1)} MiB`;
    status.textContent=t.ready;configuration.hidden=false;welcome.hidden=true;replace.hidden=false;selected.hidden=false;root.dataset.state='configure';
    if(result){output.hidden=true;void clearResults();}
    if(matchMedia('(max-width: 760px)').matches)configuration.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };
  input.addEventListener('change',()=>updateFile(input.files?.[0]));
  drop.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('dragging');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));
  drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('dragging');updateFile(event.dataTransfer?.files[0]);});
  const setBusy=(value:boolean)=>{busy=value;start.disabled=value;cancel.disabled=!value;clear.disabled=value;input.disabled=value;replace.disabled=value;select.disabled=value;backend.disabled=value;for(const radio of choices.querySelectorAll('input'))radio.disabled=value;progress.hidden=!value;root.dataset.state=value?'processing':result?'results':file?'configure':'upload';root.setAttribute('aria-busy',String(value));};
  const time=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  const download=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob);urls.add(url);const link=el('a');link.href=url;link.download=name;root.append(link);link.click();link.remove();const timer=setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);timers.delete(timer);},60000);timers.add(timer);};
  const clearResults=async()=>{cancelAnimationFrame(frame);await player?.dispose();player=undefined;result?.dispose();result=undefined;processedFile=undefined;output.replaceChildren();output.hidden=true;};
  const report=(event:ProgressEvent)=>{
    const names:Record<string,string>={'decoding':t.decoding,'model-download':event.cached?t.cached:t.download,'model-verify':t.verify,'runtime':t.runtime,'model-load':t.loading,'preparing-tensors':t.tensors,'inference':t.inference,'reconstructing':t.reconstructing,'ready':t.complete,'cpu-fallback':t.fallback};
    status.textContent=(names[event.stage]??t.working)+(event.completed!==undefined?` · ${event.completed}/${event.total}`:event.loaded!==undefined&&!event.cached?` · ${(event.loaded/1e6).toFixed(1)} / ${((event.total??0)/1e6).toFixed(1)} MB`:'');
    if(event.progress!==undefined){progress.value=event.progress;}else progress.removeAttribute('value');
  };
  async function showResults(value:SeparationResult) {
    result=value;player=new SynchronizedPlayer(value);output.hidden=false;
    const heading=el('div',undefined,'results-heading'),both=el('button',t.both,'primary'),zip=el('button',t.zip);
    heading.append(el('h2',t.results),both,zip);output.append(heading,el('p',`${value.vocals.duration.toFixed(2)}s · 44.1 kHz · ${value.metadata.backend.toUpperCase()} · ${value.metadata.inferenceSeconds.toFixed(1)}s inference`,'model-info'));
    const stems=el('div',undefined,'stem-grid');output.append(stems);
    const updates:(()=>void)[]=[];
    const tick=()=>{for(const update of updates)update();both.textContent=player?.playing&&player.playbackMode==='both'?t.pauseBoth:t.both;if(player?.playing)frame=requestAnimationFrame(tick);};
    const playback=async(name:'both'|StemName)=>{try{if(player?.playing&&player.playbackMode===name)player.pause();else await player?.play(name);cancelAnimationFrame(frame);tick();}catch(error){status.textContent=String(error);}};
    both.onclick=()=>void playback('both');zip.onclick=async()=>{zip.disabled=true;try{download(await value.exportZip(file?.name),safeFilename(file?.name)+'_stems.zip');}catch(error){status.textContent=String(error);}finally{zip.disabled=false;}};
    const preferred=(choices.querySelector('input:checked') as HTMLInputElement).value as StemName;
    for(const name of [preferred,preferred==='vocals'?'instrumental':'vocals'] as StemName[]){
      const row=el('article',undefined,'stem-card'),title=el('h3',t[name]),canvas=el('canvas');canvas.width=1000;canvas.height=120;canvas.setAttribute('aria-label',`${t[name]} ${t.waveform}`);
      const peaks=waveformPeaks(value[name].channels,500),ctx=canvas.getContext('2d')!;
      const layers=[document.createElement('canvas'),document.createElement('canvas')];
      const palette=getComputedStyle(root),colors=[palette.getPropertyValue('--wave-idle').trim()||'#615879',palette.getPropertyValue('--accent').trim()||'#bda4ef'];
      for(const [index,layer] of layers.entries()){
        layer.width=1000;layer.height=120;const context=layer.getContext('2d')!;context.fillStyle=colors[index];
        for(let i=0;i<peaks.length;i++){const height=Math.max(1,Math.min(1,peaks[i])*110);context.fillRect(i*2,60-height/2,1,height);}
      }
      const seek=el('input');seek.type='range';seek.min='0';seek.max=String(value[name].duration);seek.step='.01';seek.value='0';seek.setAttribute('aria-label',`${t[name]} ${t.seek}`);
      const controls=el('div',undefined,'player-controls'),play=el('button',t.play),clock=el('span',`0:00 / ${time(value[name].duration)}`),volume=el('input');volume.type='range';volume.min='0';volume.max='1';volume.step='.01';volume.value='1';volume.setAttribute('aria-label',`${t[name]} ${t.volume}`);
      const mute=el('button',t.mute),wav=el('button',t.wav);mute.setAttribute('aria-pressed','false');
      volume.oninput=()=>player?.volume(name,Number(volume.value));mute.onclick=()=>{const active=mute.getAttribute('aria-pressed')!=='true';mute.setAttribute('aria-pressed',String(active));player?.mute(name,active);};
      play.onclick=()=>void playback(name);wav.onclick=()=>download(value.exportWav(name),safeFilename(file?.name)+'_'+name+'.wav');
      seek.oninput=()=>{void player?.seek(Number(seek.value)).then(()=>{cancelAnimationFrame(frame);tick();}).catch(error=>{status.textContent=String(error);});};
      const draw=()=>{const fraction=(player?.currentTime??0)/value[name].duration;ctx.clearRect(0,0,1000,120);ctx.drawImage(layers[0],0,0);ctx.save();ctx.beginPath();ctx.rect(0,0,1000*fraction,120);ctx.clip();ctx.drawImage(layers[1],0,0);ctx.restore();clock.textContent=`${time(player?.currentTime??0)} / ${time(value[name].duration)}`;seek.value=String(player?.currentTime??0);play.textContent=player?.playing&&(player.playbackMode===name||player.playbackMode==='both')?t.pause:t.play;};
      controls.append(play,clock,el('span',t.volume),volume,mute,wav);row.append(title,canvas,seek,controls);stems.append(row);updates.push(draw);
    }
    tick();
  }
  start.onclick=async()=>{
    if(busy)return;if(!file){status.textContent=t.empty;input.focus();return;}
    if(result&&processedFile===file&&processedBackend===backend.value&&result.metadata.model===select.value){output.scrollIntoView({block:'start'});status.textContent=t.complete;return;}
    setBusy(true);controller=new AbortController();const token=++generation;
    try{await clearResults();await engine?.dispose();engine=await createSeparator({model:select.value,backend:backend.value as 'auto'|'wasm'|'webgpu',maxDuration:240,maxFileBytes:96*1024*1024,...options});
      const value=await engine.separate(file,{signal:controller.signal,onProgress:report});if(token!==generation||destroyed){value.dispose();return;}await showResults(value);processedFile=file;processedBackend=backend.value;status.textContent=t.complete;void updateStorage();
    }catch(error){if(!destroyed){const code=error instanceof Error&&'code' in error?String(error.code):'';const messages:Record<string,string>={ABORTED:t.canceled,LIMIT:t.limitError,DECODE:t.decodeError,MODEL:t.modelError,INTEGRITY:t.modelError,RUNTIME:t.runtimeError,WORKER:t.runtimeError,UNSUPPORTED:t.browserError};status.textContent=messages[code]??t.failed;}}
    finally{if(!destroyed)setBusy(false);}
  };
  cancel.onclick=()=>controller?.abort();
  clear.onclick=async()=>{try{await (engine??await createSeparator()).clearCache();status.textContent=t.cleared;await updateStorage();}catch(error){status.textContent=`${t.cacheError} ${String(error)}`;}};
  const destroy=async()=>{destroyed=true;++generation;controller?.abort();await engine?.dispose();await clearResults();for(const url of urls)URL.revokeObjectURL(url);for(const timer of timers)clearTimeout(timer);urls.clear();timers.clear();};
  window.addEventListener('pagehide',()=>void destroy(),{once:true});
  return {destroy};
}
