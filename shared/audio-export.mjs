import {yieldToBrowser} from './audio-preview.mjs';

function writeFrames(view, channels, start, end) {
  for (let i=start;i<end;i++) for(let channel=0;channel<2;channel++) {
    const sample=channels[channel][i];
    if(!Number.isFinite(sample))throw new RangeError('Non-finite PCM');
    const value=Math.max(-1,Math.min(1,sample));
    view.setInt16(44+i*4+channel*2,Math.round(value*(value<0?32768:32767)),true);
  }
}

// Produce the same stereo PCM16 WAV bytes as the SDK, with bounded CPU slices.
export async function encodeWavAsync(channels, rate=44100, signal, onProgress) {
  const count=channels[0]?.length;
  if(!count||channels[1]?.length!==count||!Number.isSafeInteger(rate)||rate<8000||rate>192000||count*4>0xffffffff-36)throw new RangeError('Invalid PCM dimensions/rate');
  signal?.throwIfAborted();
  const buffer=new ArrayBuffer(44+count*4),view=new DataView(buffer);
  for(const [offset,text] of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']])for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));
  for(const [offset,value] of [[4,buffer.byteLength-8],[16,16],[24,rate],[28,rate*4],[40,count*4]])view.setUint32(offset,value,true);
  for(const [offset,value] of [[20,1],[22,2],[32,4],[34,16]])view.setUint16(offset,value,true);
  let deadline=performance.now()+8;
  for(let start=0;start<count;start+=16384){
    writeFrames(view,channels,start,Math.min(count,start+16384));signal?.throwIfAborted();
    if(performance.now()>=deadline){onProgress?.(Math.min(1,(start+16384)/count));await yieldToBrowser();deadline=performance.now()+8;}
  }
  signal?.throwIfAborted();onProgress?.(1);
  return new Blob([buffer],{type:'audio/wav'});
}

const crcTable=Uint32Array.from({length:256},(_,value)=>{
  for(let i=0;i<8;i++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;
  return value>>>0;
});
function updateCrc(crc,bytes,start,end){for(let i=start;i<end;i++)crc=crcTable[(crc^bytes[i])&255]^(crc>>>8);return crc;}
async function blobCrc(blob,signal){
  let crc=0xffffffff,deadline=performance.now()+8;
  const reader=blob.stream().getReader();
  try{
    while(true){
      signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;
      for(let offset=0;offset<value.length;offset+=32768){
        crc=updateCrc(crc,value,offset,Math.min(value.length,offset+32768));signal?.throwIfAborted();
        if(performance.now()>=deadline){await yieldToBrowser();deadline=performance.now()+8;}
      }
    }
  }finally{await reader.cancel();reader.releaseLock();}
  return (crc^0xffffffff)>>>0;
}

// Two stored WAV entries: stream CRC input rather than duplicate whole WAV buffers.
export async function zipWavStems(result,name='audio',signal,onProgress){
  const base=String(name).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)||'audio';
  const localParts=[],directory=[];let offset=0,directorySize=0;
  for(const [index,stemName] of ['vocals','instrumental'].entries()){
    signal?.throwIfAborted();const stem=result[stemName];
    const wav=await encodeWavAsync(stem.channels,stem.sampleRate,signal,value=>onProgress?.((index+value*.7)/2));
    const crc=await blobCrc(wav,signal),filename=new TextEncoder().encode(base+'_'+stemName+'.wav');
    const local=new Uint8Array(30+filename.length),header=new DataView(local.buffer);
    header.setUint32(0,0x04034b50,true);header.setUint16(4,20,true);header.setUint16(6,0x800,true);header.setUint16(12,0x21,true);
    for(const [position,value] of [[14,crc],[18,wav.size],[22,wav.size]])header.setUint32(position,value,true);
    header.setUint16(26,filename.length,true);local.set(filename,30);
    const central=new Uint8Array(46+filename.length),entry=new DataView(central.buffer);
    entry.setUint32(0,0x02014b50,true);entry.setUint16(4,20,true);entry.setUint16(6,20,true);entry.setUint16(8,0x800,true);entry.setUint16(14,0x21,true);
    for(const [position,value] of [[16,crc],[20,wav.size],[24,wav.size],[42,offset]])entry.setUint32(position,value,true);
    entry.setUint16(28,filename.length,true);central.set(filename,46);
    localParts.push(local,wav);directory.push(central);offset+=local.length+wav.size;directorySize+=central.length;
    onProgress?.((index+1)/2);
  }
  signal?.throwIfAborted();const end=new Uint8Array(22),view=new DataView(end.buffer);
  view.setUint32(0,0x06054b50,true);view.setUint16(8,2,true);view.setUint16(10,2,true);view.setUint32(12,directorySize,true);view.setUint32(16,offset,true);
  return new Blob([...localParts,...directory,end],{type:'application/zip'});
}
