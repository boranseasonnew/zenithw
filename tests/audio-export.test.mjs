import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {encodeWavAsync,zipWavStems} from '../shared/audio-export.mjs';
import {encodeWav} from '../frontend/vendor/lilith-engine/index.js';

const channels=()=>[Float32Array.from([0,1,-1,.5,-.5,1.2]),Float32Array.from([.1,-.1,0,-1.2,.8,-.8])];

test('cooperative WAV export keeps PCM16 bytes, clipping and sample rates identical to the SDK',async()=>{
 for(const rate of [8000,44100,48000,192000]){
  const pcm=channels(),expected=await encodeWav(pcm,rate).arrayBuffer();
  const actual=await (await encodeWavAsync(pcm,rate)).arrayBuffer();
  assert.deepEqual(Buffer.from(actual),Buffer.from(expected));
 }
 await assert.rejects(encodeWavAsync([new Float32Array(1),new Float32Array(2)]));
 await assert.rejects(encodeWavAsync([Float32Array.from([NaN]),new Float32Array(1)]));
 await assert.rejects(encodeWavAsync(channels(),0));
});

test('large WAV encoding remains cancellable while CPU preparation is running',async()=>{
 const signal=new AbortController(),pcm=[new Float32Array(5000000),new Float32Array(5000000)];
 let ticked=false;const timer=setTimeout(()=>{ticked=true;signal.abort();},0);
 try{await assert.rejects(encodeWavAsync(pcm,44100,signal.signal),{name:'AbortError'});assert.ok(ticked);}
 finally{clearTimeout(timer);}
});

test('ZIP exports contain two valid independent WAV files and standard CRC32 records',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'zenith-export-'));
 try{
  const result={vocals:{channels:channels(),sampleRate:44100},instrumental:{channels:channels(),sampleRate:48000}};
  const zip=await zipWavStems(result,'../../unsafe/name');
  const path=join(directory,'stems.zip');await writeFile(path,Buffer.from(await zip.arrayBuffer()));
  for(const name of ['vocals','instrumental'])await writeFile(join(directory,name+'.wav'),Buffer.from(await encodeWav(result[name].channels,result[name].sampleRate).arrayBuffer()));
  execFileSync(process.platform==='win32'?'python':'python3',['-c',[
   'import sys,zipfile,pathlib,wave,io',
   'p=pathlib.Path(sys.argv[1])',
   'with zipfile.ZipFile(p) as archive:',
   ' assert archive.testzip() is None',
   ' assert len(archive.namelist()) == 2',
   ' for name in archive.namelist():',
   '  assert "/" not in name and "\\\\" not in name and ".." not in name',
   '  kind="instrumental" if name.endswith("_instrumental.wav") else "vocals"',
   '  data=archive.read(name)',
   '  assert data == (p.parent/(kind+".wav")).read_bytes()',
   '  with wave.open(io.BytesIO(data)) as audio:',
   '   assert audio.getnchannels() == 2 and audio.getsampwidth() == 2 and audio.getnframes() == 6'
  ].join('\n'),path]);
  const abort=new AbortController();abort.abort();await assert.rejects(zipWavStems(result,'audio',abort.signal),{name:'AbortError'});
 }finally{await rm(directory,{recursive:true,force:true});}
});
