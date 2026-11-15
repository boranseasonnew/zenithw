// Only the public SDK is used by the Studio.
import {createSeparator,SynchronizedPlayer,safeFilename,inspectAudio,exportAudio} from '@lilith/audio-engine';
import {waveformPeaksAsync,yieldToBrowser} from './audio-preview.mjs';
import {createRepeatController} from './audio-repeat.mjs';
import {encodeWavAsync,zipWavStems} from './audio-export.mjs';
import type {SeparationEngine,SeparationResult,SeparatorOptions,StemName,ProgressEvent,AudioExportFormat} from '@lilith/audio-engine';
export const ENGLISH={
  upload:'Choose your audio',browse:'Browse files',drop:'Drop a file here, or browse from your device.',formats:'Mono or stereo · Up to 4 minutes / 96 MiB · Codecs depend on your browser',
  modelInfo:'UVR-MDX-NET-Voc_FT · 66.8 MB · First run downloads the model and a 26.8 MB runtime. Quality varies by recording.',
  cancel:'Cancel',ready:'Ready when you are.',privacy:'Your audio is never uploaded. Only public model files are downloaded. No tracking, ads or hidden server processing.',
  results:'Your separated stems',vocals:'Vocals',instrumental:'Instrumental',play:'Play',pause:'Pause',both:'Play Both',pauseBoth:'Pause Both',repeat:'Repeat playback',seek:'Seek',volume:'Volume',mute:'Mute',
  zip:'Download Both · ZIP',cache:'Remove cached model',storage:'Model storage',canceled:'Canceled. Audio and inference resources released.',
  failed:'Unable to process this file.',working:'Processing',download:'Downloading model',cached:'Using verified cached model',decoding:'Decoding audio',
  runtime:'Loading inference runtime',loading:'Initializing model',verify:'Verifying model integrity',tensors:'Preparing tensors',inference:'Running AI inference',reconstructing:'Reconstructing audio',
  complete:'Ready for playback',fallback:'WebGPU failed; trying WASM / CPU',cleared:'Cached model removed.',cacheError:'Cannot clear cache while processing.',credits:'Model: Anjok07 and aufr33 / UVR. MDX-Net: Kuielab. Not a Lilith-trained neural network.',
  waveform:'Waveform',decodeError:'This browser could not decode the file. Try WAV or MP3.',modelError:'Model download or verification failed. Check your connection and try again.',runtimeError:'Local inference failed. Try a shorter file and retry.',
  browserError:'Local AI processing is unavailable in this browser. Use a current browser on a secure connection.',
  locale:'en-US',resultsInfo:'{duration} s · 44.1 kHz · {backend} · Processing: {time} s',playbackError:'Playback failed. Try playing the track again.',exportError:'The download could not be prepared. Try again.',cacheFailed:'The model cache could not be cleared. Try again.',
  replaceFile:'Change track',vocalsHint:'Isolate the voice',instrumentalHint:'Keep the music',
  warm:'Model ready — processing this track',cacheWarning:'Your browser could not keep the model cache. A later visit may download it again.',
  automatic:'Automatic separation',automaticCopy:'Choose a file to separate vocals and music automatically. No settings needed.',
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
  let lastProgressPaint=0;
  const urls=new Set<string>(),timers=new Set<ReturnType<typeof setTimeout>>();
  const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,cls?:string)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
  const number=(v:number,digits=1)=>new Intl.NumberFormat(t.locale,{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(v);
  const time=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const icon=(kind:string)=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');const isSolid=['play','pause','rewind','forward'].includes(kind);svg.setAttribute('fill',isSolid?'currentColor':'none');svg.setAttribute('stroke',isSolid?'none':'currentColor');if(!isSolid)svg.setAttribute('stroke-width','1.6');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',({upload:'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',vocals:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1m-6 7v4m-4 0h8',instrumental:'M9 18V6l11-3v12M9 7l11-3M9 18c0 2-5 4-5 1s5-4 5-1Zm11-3c0 2-5 4-5 1s5-4 5-1Z',shield:'m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Zm-4 9 3 3 5-6',play:'M8 5v14l11-7z',pause:'M6 19h4V5H6v14zm8-14v14h4V5h-4z',rewind:'M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z',forward:'M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z',repeat:'m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h18M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3'} as Record<string,string>)[kind]);svg.append(p);return svg;};
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
    try{const stem=result[selectedStem],onProgress=(f:number)=>{if(!destroyed)exportStatus.textContent=`${t.encoding} · ${number(f*100,0)}%`;};const blob=format==='wav'?await encodeWavAsync(stem.channels,stem.sampleRate,exportController.signal,onProgress):await exportAudio(stem,format,{signal:exportController.signal,workerUrl:options.exportWorkerUrl,onProgress});if(!destroyed&&dialog.open){download(blob,`${safeFilename(file?.name)}_${selectedStem}.${format}`);dialog.close();}}
    catch(error){if(!destroyed)exportStatus.textContent=exportController.signal.aborted?t.exportCanceled:t.exportError;}
    finally{exporting=false;formatButtons.forEach(b=>b.disabled=false);}
  };
  let lastProgressStage='';
  const report=(event:ProgressEvent)=>{if(destroyed)return;const now=performance.now();if(event.stage===lastProgressStage&&!event.warning&&event.progress!==1&&now-lastProgressPaint<100)return;lastProgressPaint=now;lastProgressStage=event.stage;if(event.warning&&/unavailable|quota/.test(event.warning)){firstRun.textContent=t.cacheWarning;}const names:Record<string,string>={decoding:t.decoding,'model-download':event.cached?t.cached:t.download,'model-verify':t.verify,'model-ready':t.warm,runtime:t.runtime,'model-load':t.loading,'preparing-tensors':t.tensors,inference:t.inference,reconstructing:t.reconstructing,ready:t.complete,'cpu-fallback':t.fallback};status.textContent=(names[event.stage]??t.working)+(event.completed!==undefined?` · ${event.completed}/${event.total}`:event.loaded!==undefined&&!event.cached?` · ${number(event.loaded/1e6)} / ${number((event.total??0)/1e6)} MB`:'');if(event.progress!==undefined)progress.value=event.progress;else progress.removeAttribute('value');};
  const messages:Record<string,string>={ABORTED:t.canceled,LIMIT:t.durationError,SIZE:t.sizeError,DURATION:t.durationError,CHANNELS:t.channelError,DECODE:t.decodeError,MODEL:t.modelError,INTEGRITY:t.modelError,RUNTIME:t.runtimeError,WORKER:t.runtimeError,UNSUPPORTED:t.browserError};
  async function process(range?:{start:number;duration:number}){
    if(!file||busy||exporting)return;setBusy(true);statusPanel.hidden=false;rangePanel.hidden=true;controller=new AbortController();const token=++generation;
    try{await clearResults();if(!engine)engine=await createSeparator({...options,model:'mdx-default',backend:'auto',maxDuration:240,maxFileBytes:96*1024*1024});const value=await engine.separate(file,{signal:controller.signal,onProgress:report,range});if(token!==generation||destroyed){value.dispose();return;}await showResults(value,controller.signal);status.textContent=t.complete;retry.hidden=true;void updateStorage();}
    catch(error){if(!destroyed){if(controller.signal.aborted){await clearResults();status.textContent=t.canceled;}else{const code=error instanceof Error&&'code' in error?String(error.code):'';status.textContent=range&&code==='UNSUPPORTED'?t.rangeBrowser:messages[code]??t.failed;if(code==='DURATION'&&duration>240)showRange();}}}
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
  retry.onclick=()=>void updateFile(file);cancel.onclick=()=>{if(exporting)exportController?.abort();else controller?.abort();};
  async function showResults(value:SeparationResult,signal:AbortSignal){
    const volumes:Record<StemName,number>={vocals:1,instrumental:1};
    const userMuted:Record<StemName,boolean>={vocals:false,instrumental:false};
    const soloState:Record<StemName,boolean>={vocals:false,instrumental:false};
    // Resume the audio context on the original click, before allocating large PCM buffers.
    // Delaying AudioContext.resume() until after buffer copies can lose transient user activation.
    let previewContext:AudioContext|undefined;
    const ensurePlayer=()=>{
      if(!player){
        previewContext??=new AudioContext();
        player=new SynchronizedPlayer(value,previewContext);
        for(const name of ['vocals','instrumental'] as StemName[]){
          player.volume(name,volumes[name]);
        }
        applyMuteSolo();
      }
      return player;
    };
    const applyMuteSolo=()=>{
      if(!player)return;
      const hasSolo=soloState.vocals||soloState.instrumental;
      for(const s of ['vocals','instrumental'] as StemName[]){
        if(hasSolo){
          player.mute(s,!soloState[s]||userMuted[s]);
        }else{
          player.mute(s,userMuted[s]);
        }
      }
    };
    result=value;
    output.hidden=false;

    const heading=el('div',undefined,'results-heading');
    const titleGroup=el('div',undefined,'results-title-group');
    const trackReady=el('h2',file?.name?`"${file.name}"`:t.results);
    const metaTag=el('span',t.resultsInfo.replace('{duration}',number(value.vocals.duration,2)).replace('{backend}',value.metadata.backend.toUpperCase()).replace('{time}',number(value.metadata.totalSeconds??value.metadata.inferenceSeconds)),'results-meta-pill');
    titleGroup.append(trackReady,metaTag);
    const replaceBtn=el('button',t.replaceFile,'btn-replace');
    replaceBtn.onclick=()=>input.click();
    heading.append(titleGroup,replaceBtn);
    output.append(heading);

    const updates:(()=>void)[]=[];
    const repeat=createRepeatController();
    let repeatRestarting=false;
    const tick=()=>{
      updates.forEach(fn=>fn());
      const isBoth=Boolean(player?.isPlaying('vocals')&&player?.isPlaying('instrumental'));
      both.textContent=isBoth?t.pauseBoth:t.both;
      masterPlayBtn.setAttribute('aria-label',isBoth?t.pauseBoth:t.both);
      const repeatMode=repeat.observe({
        playing:Boolean(player?.playing),
        vocals:Boolean(player?.isPlaying('vocals')),
        instrumental:Boolean(player?.isPlaying('instrumental')),
        currentTime:player?.currentTime??0,
        duration:value.vocals.duration,
      });
      if(repeatMode&&player&&!repeatRestarting&&!busy&&!destroyed&&result===value){
        repeatRestarting=true;
        void player.play(repeatMode).then(()=>{
          repeatRestarting=false;
          if(!destroyed&&result===value){cancelAnimationFrame(frame);tick();}
        }).catch(error=>{
          repeatRestarting=false;
          console.error('[ZenithW audio preview] Repeat failed:',error);
          if(!destroyed&&result===value)status.textContent=t.playbackError;
        });
        return;
      }
      if(player?.playing){
        masterPlayBtn.replaceChildren(icon('pause'));
        masterPlayBtn.classList.add('is-playing');
        frame=requestAnimationFrame(tick);
      }else{
        masterPlayBtn.replaceChildren(icon('play'));
        masterPlayBtn.classList.remove('is-playing');
      }
    };
    const playback=async(name:StemName|'both')=>{
      try{
        if(!result||busy||destroyed)return;
        previewContext??=new AudioContext();
        await previewContext.resume();
        ensurePlayer();
        if(name==='both'){
          if(player!.isPlaying('vocals')&&player!.isPlaying('instrumental')){
            player!.pause();
            repeat.cancel();
          }else await player!.play('both');
        }else if(player!.isPlaying(name)){
          player!.pauseStem(name);
          if(!player!.playing)repeat.cancel();
        }else await player!.playStem(name);
        cancelAnimationFrame(frame);
        tick();
      }catch(error){
        console.error('[ZenithW audio preview] Playback failed:',error);
        status.textContent=t.playbackError;
      }
    };

    const handleZip=async()=>{
      if(busy||exporting||destroyed)return;
      exporting=true;setBusy(true);zip.disabled=true;exportController=new AbortController();
      status.textContent=t.encoding;
      try{
        const blob=await zipWavStems(value,safeFilename(file?.name),exportController.signal,(fraction:number)=>{
          if(!destroyed){
            progress.value=fraction;
            status.textContent=`${t.encoding} · ${number(fraction*100,0)}%`;
          }
        });
        if(!destroyed){
          download(blob,safeFilename(file?.name)+'_stems.zip');
          status.textContent=t.complete;
        }
      }catch{
        if(!destroyed)status.textContent=exportController.signal.aborted?t.exportCanceled:t.exportError;
      }finally{
        exporting=false;
        if(!destroyed){setBusy(false);zip.disabled=false;}
      }
    };

    const stemsContainer=el('div',undefined,'stems-container');
    const updateSoloButtons:(()=>void)[]=[];

    for(const name of ['instrumental','vocals'] as StemName[]){
      const row=el('article',undefined,'stem-card');
      row.dataset.stem=name;

      const stemPlay=el('button',undefined,'stem-play-btn');
      stemPlay.type='button';
      stemPlay.setAttribute('aria-label',`${t.play} ${t[name]}`);
      stemPlay.setAttribute('aria-pressed','false');
      stemPlay.append(icon('play'));
      stemPlay.onclick=()=>void playback(name);
      updates.push(()=>{
        const active=Boolean(player?.isPlaying(name));
        if(stemPlay.dataset.playing!==String(active)){
          stemPlay.dataset.playing=String(active);
          stemPlay.setAttribute('aria-pressed',String(active));
          stemPlay.setAttribute('aria-label',`${active?t.pause:t.play} ${t[name]}`);
          stemPlay.replaceChildren(icon(active?'pause':'play'));
        }
      });

      const mixerStrip=el('div',undefined,'stem-mixer-strip');
      const dialWrap=el('div',undefined,'stem-vol-dial');
      dialWrap.setAttribute('title',`${t[name]} ${t.volume}`);
      const gaugeSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      gaugeSvg.setAttribute('viewBox','0 0 44 44');
      gaugeSvg.setAttribute('class','vol-gauge-svg');
      const arcBg=document.createElementNS(gaugeSvg.namespaceURI,'circle');
      arcBg.setAttribute('cx','22');arcBg.setAttribute('cy','22');arcBg.setAttribute('r','16');arcBg.setAttribute('class','vol-arc-bg');
      const arcProg=document.createElementNS(gaugeSvg.namespaceURI,'circle');
      arcProg.setAttribute('cx','22');arcProg.setAttribute('cy','22');arcProg.setAttribute('r','16');arcProg.setAttribute('class','vol-arc-prog');
      gaugeSvg.append(arcBg,arcProg);
      const volNum=el('span','100','vol-value-text');
      const volumeInput=el('input',undefined,'vol-hidden-range');
      volumeInput.type='range';volumeInput.min='0';volumeInput.max='1';volumeInput.step='.01';volumeInput.value='1';
      volumeInput.setAttribute('aria-label',`${t[name]} ${t.volume}`);
      const updateVolGauge=(v:number)=>{
        const circumference=100.53;
        const arcSpan=circumference*0.75;
        arcProg.style.strokeDashoffset=String(arcSpan*(1-v));
        volNum.textContent=String(Math.round(v*100));
      };
      updateVolGauge(1);
      volumeInput.oninput=()=>{
        const v=Number(volumeInput.value);
        volumes[name]=v;
        player?.volume(name,v);
        updateVolGauge(v);
      };
      dialWrap.append(gaugeSvg,volNum,volumeInput);

      const msGroup=el('div',undefined,'stem-ms-group');
      const muteBtn=el('button','M','btn-ms btn-mute');
      muteBtn.setAttribute('title',`${t.mute} (${t[name]})`);
      muteBtn.setAttribute('aria-pressed','false');
      muteBtn.onclick=()=>{
        userMuted[name]=!userMuted[name];
        muteBtn.setAttribute('aria-pressed',String(userMuted[name]));
        applyMuteSolo();
      };
      const soloBtn=el('button','S','btn-ms btn-solo');
      soloBtn.setAttribute('title',`Solo (${t[name]})`);
      soloBtn.setAttribute('aria-pressed','false');
      soloBtn.onclick=()=>{
        soloState[name]=!soloState[name];
        soloBtn.setAttribute('aria-pressed',String(soloState[name]));
        applyMuteSolo();
        updateSoloButtons.forEach(fn=>fn());
      };
      updateSoloButtons.push(()=>{
        soloBtn.setAttribute('aria-pressed',String(soloState[name]));
      });
      msGroup.append(muteBtn,soloBtn);
      mixerStrip.append(dialWrap,msGroup);

      const centerArea=el('div',undefined,'stem-center-area');
      const metaRow=el('div',undefined,'stem-meta-row');
      const badge=el('span',t[name],'stem-badge');
      badge.prepend(icon(name));
      const clock=el('span',`0:00 / ${time(value[name].duration)}`,'stem-time-badge');
      metaRow.append(badge,clock);

      await yieldToBrowser();signal.throwIfAborted();
      const waveformWrap=el('div',undefined,'waveform-wrap');
      const canvas=el('canvas');
      canvas.width=1200;canvas.height=144;
      canvas.setAttribute('aria-label',`${t[name]} ${t.waveform}`);
      const peaks=await waveformPeaksAsync(value[name].channels,400,signal);
      const ctx=canvas.getContext('2d')!,layers=[document.createElement('canvas'),document.createElement('canvas')];
      const isVoc=name==='vocals';
      const colors=['#171922',isVoc?'#a855f7':'#22c55e'];
      for(const [index,layer] of layers.entries()){
        layer.width=1200;layer.height=144;
        const c=layer.getContext('2d')!;
        c.fillStyle=colors[index];
        const barW=2.2,count=peaks.length,step=1200/count;
        for(let i=0;i<count;i++){
          const h=Math.max(3,Math.min(1,peaks[i])*132);
          const x=i*step,y=72-h/2;
          if(typeof c.roundRect==='function'){
            c.beginPath();c.roundRect(x,y,barW,h,1.2);c.fill();
          }else{
            c.fillRect(x,y,barW,h);
          }
        }
      }

      const seek=el('input',undefined,'seek');
      seek.type='range';seek.min='0';seek.max=String(value[name].duration);seek.step='.01';seek.value='0';
      seek.setAttribute('aria-label',`${t[name]} ${t.seek}`);

      const seekFromPointer=(e:PointerEvent|MouseEvent)=>{
        if(!result||busy||destroyed)return;
        const rect=canvas.getBoundingClientRect();
        const frac=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
        const targetSec=frac*value[name].duration;
        ensurePlayer().seek(targetSec).then(()=>{cancelAnimationFrame(frame);tick();}).catch(()=>{status.textContent=t.playbackError;});
      };
      canvas.addEventListener('pointerdown',e=>{
        canvas.setPointerCapture(e.pointerId);
        seekFromPointer(e);
        const onMove=(ev:PointerEvent)=>seekFromPointer(ev);
        const onUp=(ev:PointerEvent)=>{
          canvas.removeEventListener('pointermove',onMove);
          canvas.removeEventListener('pointerup',onUp);
          try{canvas.releasePointerCapture(ev.pointerId);}catch{}
        };
        canvas.addEventListener('pointermove',onMove);
        canvas.addEventListener('pointerup',onUp);
      });

      seek.oninput=()=>{
        if(!result||busy||destroyed)return;
        try{
          void ensurePlayer().seek(Number(seek.value)).then(()=>{cancelAnimationFrame(frame);tick();}).catch(()=>{status.textContent=t.playbackError;});
        }catch{
          status.textContent=t.playbackError;
        }
      };

      waveformWrap.append(canvas,seek);
      centerArea.append(metaRow,waveformWrap);

      const actionsArea=el('div',undefined,'stem-actions');
      const save=el('button',undefined,'stem-download-btn');
      save.append(icon('download'));
      save.setAttribute('title',`${t[name]} ${t.downloadAudio}`);
      save.setAttribute('aria-label',`${t[name]} ${t.downloadAudio}`);
      save.onclick=()=>{
        selectedStem=name;
        returnFocus=save;
        exportTarget.textContent=t[name];
        exportStatus.textContent='';
        dialog.showModal();
      };
      actionsArea.append(save);

      row.append(stemPlay,mixerStrip,centerArea,actionsArea);
      stemsContainer.append(row);

      let lastPixel=-1,lastTime='';
      const draw=()=>{
        const seconds=player?.currentTime??0;
        const fraction=seconds/value[name].duration;
        const pixel=Math.min(1198,Math.floor(1200*fraction));
        if(pixel!==lastPixel){
          lastPixel=pixel;
          ctx.clearRect(0,0,1200,144);
          ctx.drawImage(layers[0],0,0);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0,0,1200*fraction,144);
          ctx.clip();
          ctx.drawImage(layers[1],0,0);
          ctx.restore();
          ctx.save();
          ctx.shadowColor='#ffffff';
          ctx.shadowBlur=6;
          ctx.fillStyle='#ffffff';
          ctx.fillRect(pixel,0,2,144);
          ctx.restore();
        }
        const label=`${time(seconds)} / ${time(value[name].duration)}`;
        if(label!==lastTime){
          lastTime=label;
          clock.textContent=label;
          seek.setAttribute('aria-valuetext',label);
          masterClock.textContent=label;
        }
        seek.value=String(seconds);
        row.dataset.playing=String(player?.isPlaying(name)??false);
      };
      updates.push(draw);
    }
    output.append(stemsContainer);

    const transportBar=el('div',undefined,'master-transport-bar');
    const transportLeft=el('div',undefined,'transport-left');
    const masterPlayBtn=el('button',undefined,'master-play-btn');
    masterPlayBtn.setAttribute('aria-label',t.both);
    masterPlayBtn.append(icon('play'));
    masterPlayBtn.onclick=()=>void playback('both');

    const seekBackBtn=el('button',undefined,'transport-sub-btn');
    seekBackBtn.setAttribute('title','-5s');
    seekBackBtn.setAttribute('aria-label','Rewind 5s');
    seekBackBtn.append(icon('rewind'));
    seekBackBtn.onclick=()=>{
      if(!result||!player)return;
      const target=Math.max(0,player.currentTime-5);
      player.seek(target).then(()=>{cancelAnimationFrame(frame);tick();}).catch(()=>{});
    };

    const seekFwdBtn=el('button',undefined,'transport-sub-btn');
    seekFwdBtn.setAttribute('title','+5s');
    seekFwdBtn.setAttribute('aria-label','Forward 5s');
    seekFwdBtn.append(icon('forward'));
    seekFwdBtn.onclick=()=>{
      if(!result||!player)return;
      const target=Math.min(value.vocals.duration,player.currentTime+5);
      player.seek(target).then(()=>{cancelAnimationFrame(frame);tick();}).catch(()=>{});
    };
    const repeatBtn=el('button',undefined,'transport-sub-btn repeat-btn');
    repeatBtn.type='button';
    repeatBtn.setAttribute('aria-label',t.repeat);
    repeatBtn.setAttribute('title',t.repeat);
    repeatBtn.setAttribute('aria-pressed','false');
    repeatBtn.append(icon('repeat'));
    repeatBtn.onclick=()=>{
      repeatBtn.setAttribute('aria-pressed',String(repeat.toggle()));
    };
    transportLeft.append(masterPlayBtn,seekBackBtn,seekFwdBtn,repeatBtn);

    const transportCenter=el('div',undefined,'transport-center');
    const masterClock=el('span',`0:00 / ${time(value.vocals.duration)}`,'master-digital-clock');
    transportCenter.append(masterClock);

    const transportRight=el('div',undefined,'transport-right');
    const both=el('button',t.both,'btn-both');
    both.onclick=()=>void playback('both');
    const zip=el('button',undefined,'master-download-btn primary');
    zip.append(icon('download'),el('span',t.zip));
    zip.onclick=()=>handleZip();
    transportRight.append(both,zip);

    transportBar.append(transportLeft,transportCenter,transportRight);
    output.append(transportBar);
    tick();
  }
  clear.onclick=async()=>{try{await (engine??await createSeparator()).clearCache();statusPanel.hidden=false;status.textContent=t.cleared;await updateStorage();}catch{status.textContent=busy?t.cacheError:t.cacheFailed;}};
  const destroy=async()=>{destroyed=true;++generation;controller?.abort();exportController?.abort();if(dialog.open)dialog.close();await engine?.dispose();await clearResults();for(const url of urls)URL.revokeObjectURL(url);for(const timer of timers)clearTimeout(timer);urls.clear();timers.clear();};window.addEventListener('pagehide',()=>void destroy(),{once:true});return {destroy};
}
