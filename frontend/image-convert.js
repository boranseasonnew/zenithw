(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const input=$('imageFiles'), drop=$('imageDrop'), select=$('formatSelect');
  const search=$('formatSearch'), quality=$('imageQuality'), qualityValue=$('qualityValue');
  const convertButton=$('convertImages'), queue=$('imageQueue'), empty=$('queueEmpty');
  const queueCount=$('queueCount'), status=$('imageStatus'), formatMeta=$('formatMeta');
  const modal=$('imageModal'), preview=$('imagePreview'), previewDimensions=$('previewDimensions');
  const resizeWidth=$('resizeWidth'), resizeHeight=$('resizeHeight'), resizeEnabled=$('resizeEnabled');
  const aspectLock=$('aspectLock'), originalDimensions=$('originalDimensions');
  let selectedId=null, aspectRatio=1, lockAspect=true;
  if (!input || !drop || !select || !queue || !convertButton) return;
  const tr = {
    ready:'Dönüştürücü hazır. Görsellerin bu cihazda işlenir.',
    invalid:'Desteklenen bir görsel dosyası seç.',
    selected:'{count} görsel kuyruğa eklendi.',
    maxFiles:'Bir seferde en fazla 25 görsel ekleyebilirsin.',
    working:'Dönüştürme sürüyor…',
    processing:'{name} dönüştürülüyor…',
    complete:'Dönüştürme tamamlandı.',
    empty:'Dönüştürülecek görsel yok.',
    unsupported:'Bu biçim tarayıcında desteklenmiyor.',
    tooLarge:'Görsel çok büyük. En fazla 28 megapiksel destekleniyor.',
    download:'İndir',
    remove:'Kaldır',
    queued:'Bekliyor',
    failed:'Dönüştürme başarısız',
    formatCount:'{count} çıkış biçimi kullanılabilir',
    engine:'Tarayıcında kullanılabilen biçimler listelenir. Dosyalar sunucuya gönderilmez.',
    pngQuality:'PNG kayıpsızdır; kalite ayarı kullanılmaz.',
    originalDims:'Orijinal: {width} × {height}'
  };
  const t = key => window.ZWLanguage ? window.ZWLanguage.translate(key) : (tr[key] || key);
  const msg = (key, vars={}) => String(t(tr[key] || key)).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] == null ? '' : vars[name]));
  const state = { files: [], formats: [], busy: false, serial: 0 };
  const nativeFormats = [
    {id:'jpeg',label:'JPEG',ext:'jpg',mime:'image/jpeg',kind:'canvas',quality:true},
    {id:'png',label:'PNG',ext:'png',mime:'image/png',kind:'canvas'},
    {id:'webp',label:'WebP',ext:'webp',mime:'image/webp',kind:'canvas',quality:true},
    {id:'avif',label:'AVIF',ext:'avif',mime:'image/avif',kind:'canvas',quality:true},
    {id:'ico',label:'ICO',ext:'ico',kind:'ico'},
    {id:'svg',label:'SVG · raster',ext:'svg',kind:'svg'},
    {id:'xbm',label:'XBM',ext:'xbm',kind:'xbm'},
    {id:'bmp',label:'BMP',ext:'bmp',kind:'bmp'},
    {id:'tga',label:'TGA',ext:'tga',kind:'tga'},
    {id:'qoi',label:'QOI',ext:'qoi',kind:'qoi'},
    {id:'ppm',label:'PPM',ext:'ppm',kind:'ppm'},
    {id:'pgm',label:'PGM',ext:'pgm',kind:'pgm'},
    {id:'pbm',label:'PBM',ext:'pbm',kind:'pbm'},
    {id:'pam',label:'PAM',ext:'pam',kind:'pam'},
    {id:'farbfeld',label:'Farbfeld',ext:'ff',kind:'farbfeld'}
  ];
  const formatSize = n => n < 1048576 ? Math.max(1,Math.round(n/1024)) + ' KB' : (n/1048576).toFixed(2) + ' MB';
  const cleanName = name => name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]/g,'_').slice(0,120) || 'image';
  const setStatus = (text, mode='ready') => { status.dataset.state=mode; status.lastElementChild.textContent=text; };
  function updateActions() {
    convertButton.disabled = state.busy || !state.files.some(item=>item.status!=='done');
    queueCount.textContent = String(state.files.length);
    empty.hidden = state.files.length > 0;
    if (!state.files.length) empty.textContent = 'Henüz dosya eklenmedi. Bir veya daha fazla görsel seçerek başla.';
  }
  function release(item) {
    if(item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    if(item.outputUrl) URL.revokeObjectURL(item.outputUrl);
  }
  function render() {
    queue.replaceChildren();
    state.files.forEach(item => {
      const row=document.createElement('article'); row.className='image-file-row'+(item.id===selectedId?' selected':'');
      row.tabIndex=0; row.setAttribute('role','button'); row.setAttribute('aria-label',item.file.name);
      row.addEventListener('click',event=>{if(event.target.closest('button,a'))return;selectFile(item);});
      const thumb=document.createElement('div'); thumb.className='image-file-icon';
      const image=document.createElement('img'); image.src=item.previewUrl; image.alt=''; image.loading='lazy'; thumb.append(image);
      const meta=document.createElement('div'); meta.className='image-file-meta';
      const name=document.createElement('div'); name.className='image-file-name'; name.textContent=item.file.name;
      const detail=document.createElement('div'); detail.className='image-file-sub';
      detail.textContent = item.status==='done' ? formatSize(item.output.size) : item.status==='working' ? msg('working') : item.status==='error' ? item.error : msg('queued');
      meta.append(name,detail);
      const actions=document.createElement('div'); actions.className='image-file-result';
      if(item.status==='done' && item.outputUrl) {
        const link=document.createElement('a'); link.className='image-file-download'; link.href=item.outputUrl;
        link.download=cleanName(item.file.name)+'.'+item.format.ext; link.textContent=msg('download'); actions.append(link);
      }
      const remove=document.createElement('button'); remove.type='button'; remove.className='image-file-remove'; remove.textContent=msg('remove');
      remove.disabled=state.busy;
      remove.addEventListener('click',()=>{release(item);state.files=state.files.filter(x=>x.id!==item.id);if(selectedId===item.id){selectedId=null;const next=state.files[0];if(next)selectFile(next);else{preview.removeAttribute('src');previewDimensions.textContent='Önizleme';originalDimensions.textContent='Orijinal: —';}}render();});
      actions.append(remove); row.append(thumb,meta,actions); queue.append(row);
    });
    updateActions();
  }
  function selectFile(item) {
    selectedId=item.id;
    preview.src=item.previewUrl;
    preview.onload=()=>{
      const w=preview.naturalWidth,h=preview.naturalHeight;
      aspectRatio=w/h; resizeWidth.value=w; resizeHeight.value=h;
      originalDimensions.textContent=msg('originalDims',{width:w,height:h});
      previewDimensions.textContent=w+' × '+h+' px';
    };
    render();
  }
  function openModal(){modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
  function closeModal(){if(state.busy)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';}
  function addFiles(list) {
    const files=Array.from(list||[]).filter(file=>file.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|jxl|heic|heif|tiff?|bmp|gif|svg|ico|qoi|tga|psd|dng|jp2|j2k)$/i.test(file.name));
    if(!files.length){setStatus(msg('invalid'),'error');return;}
    if(state.files.length+files.length>25){setStatus(msg('maxFiles'),'error');return;}
    let count=0;
    for(const file of files){
      if(!file.size || file.size>60*1048576)continue;
      state.files.push({id:++state.serial,file,previewUrl:URL.createObjectURL(file),outputUrl:null,output:null,status:'queued',format:null,error:''}); count++;
    }
    if(!count){setStatus(msg('invalid'),'error');return;}
    if(!selectedId||!state.files.some(item=>item.id===selectedId))selectFile(state.files[0]);else render();
    openModal(); setStatus(msg('selected',{count:count}),'ready');
  }
  const u32 = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
  function bmp(data,w,h) {
    const stride=Math.ceil(w*3/4)*4, size=54+stride*h, out=new Uint8Array(size), view=new DataView(out.buffer);
    out[0]=66;out[1]=77;view.setUint32(2,size,true);view.setUint32(10,54,true);view.setUint32(14,40,true);
    view.setInt32(18,w,true);view.setInt32(22,h,true);view.setUint16(26,1,true);view.setUint16(28,24,true);view.setUint32(34,stride*h,true);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=(y*w+x)*4,d=54+(h-1-y)*stride+x*3;out[d]=data[s+2];out[d+1]=data[s+1];out[d+2]=data[s];}
    return new Blob([out],{type:'image/bmp'});
  }
  function tga(data,w,h) {
    if(w>65535||h>65535)throw new Error('TGA dimensions');
    const alpha=data.some((v,i)=>i%4===3&&v!==255),channels=alpha?4:3,out=new Uint8Array(18+w*h*channels);
    out[2]=2;out[12]=w&255;out[13]=w>>>8;out[14]=h&255;out[15]=h>>>8;out[16]=channels*8;out[17]=0x20|(alpha?8:0);
    for(let i=0,j=18;i<data.length;i+=4){out[j++]=data[i+2];out[j++]=data[i+1];out[j++]=data[i];if(alpha)out[j++]=data[i+3];}
    return new Blob([out],{type:'image/x-tga'});
  }
  function qoi(data,w,h) {
    const out=[81,79,73,102,...u32(w),...u32(h),4,0],index=new Array(64),px=[0,0,0,255];
    const hash=p=>(p[0]*3+p[1]*5+p[2]*7+p[3]*11)%64, put=(...bytes)=>out.push(...bytes);
    let run=0;
    for(let i=0;i<data.length;i+=4){
      const next=[data[i],data[i+1],data[i+2],data[i+3]];
      if(next.every((v,j)=>v===px[j])){run++;if(run===62||i===data.length-4){put(0xc0|(run-1));run=0;}continue;}
      if(run){put(0xc0|(run-1));run=0;}
      const hsh=hash(next),old=index[hsh];
      if(old&&old.every((v,j)=>v===next[j]))put(hsh);
      else{
        index[hsh]=next.slice();
        if(next[3]===px[3]){
          const dr=next[0]-px[0],dg=next[1]-px[1],db=next[2]-px[2];
          if(dr>=-2&&dr<=1&&dg>=-2&&dg<=1&&db>=-2&&db<=1)put(0x40|((dr+2)<<4)|((dg+2)<<2)|(db+2));
          else{const drdg=dr-dg,dbdg=db-dg;if(dg>=-32&&dg<=31&&drdg>=-8&&drdg<=7&&dbdg>=-8&&dbdg<=7)put(0x80|(dg+32),((drdg+8)<<4)|(dbdg+8));else put(0xfe,next[0],next[1],next[2]);}
        }else put(0xff,next[0],next[1],next[2],next[3]);
      }
      for(let j=0;j<4;j++)px[j]=next[j];
    }
    put(0,0,0,0,0,0,0,1);
    return new Blob([new Uint8Array(out)],{type:'image/qoi'});
  }
  function portable(data,w,h,kind) {
    let header=kind==='pam'?'P7\nWIDTH '+w+'\nHEIGHT '+h+'\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n':kind==='ppm'?'P6\n'+w+' '+h+'\n255\n':kind==='pgm'?'P5\n'+w+' '+h+'\n255\n':'P4\n'+w+' '+h+'\n';
    const bytes=[];
    if(kind==='ppm'||kind==='pam'){for(let i=0;i<data.length;i+=4){bytes.push(data[i],data[i+1],data[i+2]);if(kind==='pam')bytes.push(data[i+3]);}}
    else if(kind==='pgm'){for(let i=0;i<data.length;i+=4)bytes.push(Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]));}
    else{for(let y=0;y<h;y++)for(let x=0;x<w;x+=8){let b=0;for(let bit=0;bit<8&&x+bit<w;bit++){const p=(y*w+x+bit)*4,gray=.2126*data[p]+.7152*data[p+1]+.0722*data[p+2];if(gray<128)b|=1<<(7-bit);}bytes.push(b);}}
    return new Blob([header,new Uint8Array(bytes)],{type:'application/octet-stream'});
  }
  function farbfeld(data,w,h) {
    const out=new Uint8Array(16+data.length*2);out.set([102,97,114,98,102,101,108,100]);out.set(u32(w),8);out.set(u32(h),12);
    for(let i=0,j=16;i<data.length;i++,j+=2){const n=data[i]*257;out[j]=n>>>8;out[j+1]=n&255;}
    return new Blob([out],{type:'application/octet-stream'});
  }
  const canvasBlob=(canvas,mime,q)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('encoder')),mime,q));
  async function canEncode(mime){const canvas=document.createElement('canvas');canvas.width=canvas.height=1;try{return (await canvasBlob(canvas,mime,.8)).type===mime;}catch{return false;}}
  async function encode(item,fmt){
    const bitmap=await createImageBitmap(item.file);
    try{
      const sourceW=bitmap.width,sourceH=bitmap.height;
      const w=resizeEnabled.checked?Math.max(1,Math.min(12000,Number.parseInt(resizeWidth.value,10)||sourceW)):sourceW;
      const h=resizeEnabled.checked?Math.max(1,Math.min(12000,Number.parseInt(resizeHeight.value,10)||sourceH)):sourceH;
      if(!sourceW||!sourceH||w*h>28000000)throw new Error(msg('tooLarge'));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{willReadFrequently:fmt.kind!=='canvas'});if(!ctx)throw new Error('canvas');
      if(fmt.id==='jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
      ctx.drawImage(bitmap,0,0,w,h);
      if(fmt.kind==='ico'){
        const scale=Math.min(1,256/Math.max(w,h)),iw=Math.max(1,Math.round(w*scale)),ih=Math.max(1,Math.round(h*scale));
        const iconCanvas=document.createElement('canvas');iconCanvas.width=iw;iconCanvas.height=ih;iconCanvas.getContext('2d').drawImage(canvas,0,0,iw,ih);
        const png=await canvasBlob(iconCanvas,'image/png');const bytes=new Uint8Array(22+png.size),view=new DataView(bytes.buffer);
        view.setUint16(2,1,true);view.setUint16(4,1,true);bytes[6]=iw===256?0:iw;bytes[7]=ih===256?0:ih;view.setUint16(10,1,true);view.setUint16(12,32,true);view.setUint32(14,png.size,true);view.setUint32(18,22,true);bytes.set(new Uint8Array(await png.arrayBuffer()),22);
        return new Blob([bytes],{type:'image/x-icon'});
      }
      if(fmt.kind==='xbm'){
        const pixels=ctx.getImageData(0,0,w,h).data,rows=[];
        for(let y=0;y<h;y++){const bytes=[];for(let x=0;x<w;x+=8){let value=0;for(let bit=0;bit<8&&x+bit<w;bit++){const p=((y*w+x+bit)*4),gray=.2126*pixels[p]+.7152*pixels[p+1]+.0722*pixels[p+2];if(gray<128)value|=1<<bit;}bytes.push('0x'+value.toString(16).padStart(2,'0'));}rows.push(bytes.join(', '));}
        const source='#define image_width '+w+'\\n#define image_height '+h+'\\nstatic unsigned char image_bits[] = {\\n'+rows.join(',\\n')+'\\n};';
        return new Blob([source],{type:'image/x-xbitmap'});
      }
      if(fmt.kind==='svg'){
        const png=await canvasBlob(canvas,'image/png');let binary='';for(const byte of new Uint8Array(await png.arrayBuffer()))binary+=String.fromCharCode(byte);
        const encoded=btoa(binary),svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><image width="'+w+'" height="'+h+'" xlink:href="data:image/png;base64,'+encoded+'"/></svg>';
        return new Blob([svg],{type:'image/svg+xml'});
      }
      if(fmt.kind==='canvas'){const blob=await canvasBlob(canvas,fmt.mime,fmt.quality?Number(quality.value)/100:undefined);if(blob.type!==fmt.mime)throw new Error(msg('unsupported'));return blob;}
      const data=ctx.getImageData(0,0,w,h).data;
      if(fmt.kind==='bmp')return bmp(data,w,h);
      if(fmt.kind==='tga')return tga(data,w,h);
      if(fmt.kind==='qoi')return qoi(data,w,h);
      if(['ppm','pgm','pbm','pam'].includes(fmt.kind))return portable(data,w,h,fmt.kind);
      if(fmt.kind==='farbfeld')return farbfeld(data,w,h);
      throw new Error(msg('unsupported'));
    }finally{bitmap.close&&bitmap.close();}
  }
  async function initFormats(){
    const formats=[];
    for(const fmt of nativeFormats){if(fmt.kind!=='canvas'||await canEncode(fmt.mime))formats.push(fmt);}
    state.formats=formats;select.replaceChildren();
    formats.forEach(fmt=>{const option=document.createElement('option');option.value=fmt.id;option.textContent=fmt.label;select.append(option);});
    select.disabled=false;
    $('formatCount').textContent=msg('formatCount',{count:formats.length});
    formatMeta.textContent=msg('engine');
    setStatus(msg('ready'),'ready');updateActions();
  }
  input.addEventListener('change',()=>{addFiles(input.files);input.value='';});
  $('closeImageModal').addEventListener('click',closeModal);
  modal.addEventListener('click',event=>{if(event.target.hasAttribute('data-close-modal'))closeModal();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modal.classList.contains('open'))closeModal();});
  aspectLock.addEventListener('click',()=>{lockAspect=!lockAspect;aspectLock.classList.toggle('active',lockAspect);aspectLock.setAttribute('aria-pressed',String(lockAspect));});
  resizeWidth.addEventListener('input',()=>{const w=Math.max(1,Number(resizeWidth.value)||1);if(lockAspect)resizeHeight.value=Math.max(1,Math.round(w/aspectRatio));});
  resizeHeight.addEventListener('input',()=>{const h=Math.max(1,Number(resizeHeight.value)||1);if(lockAspect)resizeWidth.value=Math.max(1,Math.round(h*aspectRatio));});
  $('resetDimensions').addEventListener('click',()=>{const item=state.files.find(x=>x.id===selectedId);if(!item)return;const img=new Image();img.onload=()=>{resizeWidth.value=img.naturalWidth;resizeHeight.value=img.naturalHeight;aspectRatio=img.naturalWidth/img.naturalHeight;};img.src=item.previewUrl;});
  ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add('drag');}));
  ['dragleave','drop'].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove('drag');if(type==='drop')addFiles(event.dataTransfer&&event.dataTransfer.files);}));
  quality.addEventListener('input',()=>{qualityValue.value=quality.value;});
  search.addEventListener('input',()=>{const term=search.value.trim().toLowerCase();Array.from(select.options).forEach(option=>{option.hidden=!!term&&!option.textContent.toLowerCase().includes(term);});const current=select.selectedOptions[0];if(current&&current.hidden){const first=Array.from(select.options).find(option=>!option.hidden);if(first)select.value=first.value;}});
  convertButton.addEventListener('click',async()=>{
    if(state.busy)return;const fmt=state.formats.find(item=>item.id===select.value);
    if(!fmt){setStatus(msg('unsupported'),'error');return;}
    const pending=state.files.filter(item=>item.status!=='done');if(!pending.length){setStatus(msg('empty'),'error');return;}
    state.busy=true;convertButton.disabled=true;setStatus(msg('working'),'working');
    for(const item of pending){
      item.status='working';render();setStatus(msg('processing',{name:item.file.name}),'working');
      try{const blob=await encode(item,fmt);if(item.outputUrl)URL.revokeObjectURL(item.outputUrl);item.output=blob;item.outputUrl=URL.createObjectURL(blob);item.status='done';item.format=fmt;item.error='';}
      catch(error){item.status='error';item.error=error.message||msg('failed');}
      render();
    }
    state.busy=false;updateActions();
    const failed=state.files.filter(item=>item.status==='error').length;
    setStatus(failed?msg('failed'):msg('complete'),failed?'error':'ready');
    const current=state.files.find(item=>item.id===selectedId);if(current)previewDimensions.textContent=resizeEnabled.checked?resizeWidth.value+' × '+resizeHeight.value+' px':current.file.name;
  });
  window.addEventListener('beforeunload',()=>state.files.forEach(release));
  updateActions();initFormats().catch(error=>setStatus(error.message||msg('unsupported'),'error'));
  const first=state.files[0];if(first)selectFile(first);
})();