import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {waveformPeaksAsync} from '../shared/audio-preview.mjs';
import {waveformPeaks} from '../frontend/vendor/lilith-engine/index.js';

test('cooperative waveform preparation matches SDK peaks without changing PCM',async()=>{
 const a=Float32Array.from({length:100003},(_,i)=>Math.sin(i/13)),b=Float32Array.from(a,x=>-x*.8);
 assert.deepEqual(await waveformPeaksAsync([a,b],400),waveformPeaks([a,b],400));
 assert.equal(a[1000],Math.fround(Math.sin(1000/13)));
 const abort=new AbortController();abort.abort();
 await assert.rejects(waveformPeaksAsync([a,b],400,abort.signal),{name:'AbortError'});
});

test('long preview preparation yields to other work and can be cancelled',async()=>{
 const abort=new AbortController(),channels=[new Float32Array(12000000),new Float32Array(12000000)];
 let ticked=false;const timer=setTimeout(()=>{ticked=true;abort.abort();},0);
 try{await assert.rejects(waveformPeaksAsync(channels,400,abort.signal),{name:'AbortError'});assert.ok(ticked);}
 finally{clearTimeout(timer);}
});

test('remux waits for explicit start and submits the chosen output without transcoding',async()=>{
 const source=readFileSync(new URL('../frontend/app.d4596317c4a7.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf("let remuxBusy="),source.indexOf('// ── CONVERT'));
 const elements={remuxFormat:{value:'mp4'},remuxStart:{disabled:true}},jobs=[];
 const context=vm.createContext({FormData,Set,document:{getElementById:id=>elements[id]},window:{},
  validateToolFile:f=>!!f,clearToolError(){},showSelectedToolFile(){},toast(){},t:key=>key,
  fetchMediaJob:async form=>{jobs.push(form);return {localMedia:{blob:new Blob(['ok']),filename:form.get('download_name')}};},
  openSaveModal(){},showPublicError(){},resetRemuxDrop(){}});
 vm.runInContext(code,context);
 const file=new File(['fixture'],'source.mkv');context.handleRemuxFile({files:[file]});
 assert.equal(jobs.length,0);assert.equal(elements.remuxStart.disabled,false);
 await context.startRemux();
 assert.equal(jobs[0].get('target_format'),'mp4');assert.equal(jobs[0].get('mode'),'remux');
 assert.equal(jobs[0].get('download_name'),'remuxed_source.mp4');
 elements.remuxFormat.value='mkv';context.handleRemuxFile({files:[new File(['fixture'],'source.mp4')]});
 await context.startRemux();assert.equal(jobs[1].get('target_format'),'mkv');
 elements.remuxFormat.value='';await context.startRemux();assert.equal(jobs[2].get('target_format'),'mp4');
});

test('separator explanations, remux controls and search metadata are localized in all eight languages',()=>{
 const english=JSON.parse(readFileSync(new URL('../frontend/locales/en.json',import.meta.url),'utf8'));
 assert.equal(english['İndirmeler'],'Downloads','separator header must not change other pages’ download labels');
 for(const lang of ['tr','en','de','fr','ru','vi','zh','ja']){
  const prefix=lang==='tr'?'':lang+'/';
  const audio=readFileSync(new URL('../frontend/'+prefix+'audio-separator.html',import.meta.url),'utf8');
  const remux=readFileSync(new URL('../frontend/'+prefix+'remux.html',import.meta.url),'utf8');
  const catalog=JSON.parse(readFileSync(new URL('../frontend/locales/'+lang+'.json',import.meta.url),'utf8'));
  assert.ok(audio.includes('id="separator-guide-heading"'));
  assert.ok(audio.includes(catalog['Separate vocals and instrumentals in your browser']));
  assert.ok(remux.includes(catalog['Output container']));assert.ok(remux.includes(catalog['Start remux']));
  assert.match(remux,/id="remuxFormat"/);assert.match(remux,/value="mp4"/);assert.match(remux,/value="mkv"/);
  assert.match(audio, /"@type":"WebApplication"/);
  assert.ok(audio.includes(`rel="canonical" href="https://zenithw.space/${prefix}audio-separator"`));
 }
});

test('the separately shipped Socket.IO browser bundle matches its reviewed version and integrity',()=>{
 const pin=JSON.parse(readFileSync(new URL('../shared/browser-dependencies.json',import.meta.url),'utf8'))['socket.io-client'];
 const bytes=readFileSync(new URL('../'+pin.path,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.sha256);
 assert.match(bytes.toString(),/Socket.IO v4\.8\.4/);
 const sri='sha512-'+createHash('sha512').update(bytes).digest('base64');assert.equal(sri,pin.integrity);
 for(const lang of ['tr','en','de','fr','ru','vi','zh','ja']){
  const html=readFileSync(new URL('../frontend/'+(lang==='tr'?'':lang+'/')+'index.html',import.meta.url),'utf8');
  assert.ok(html.includes('/vendor/socket.io-4.8.4.min.js'));assert.ok(html.includes(sri));
  assert.doesNotMatch(html, /src="[^"]*socket\.io-4\.7\.2/);
 }
});
