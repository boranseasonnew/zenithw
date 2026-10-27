import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../frontend/typing-seasons.js',import.meta.url),'utf8');
const span=2592000000,anchor=Date.parse('2026-10-27T18:00:00Z');
const season=(id,server=anchor+id*span)=>({id,startsAt:new Date(anchor+id*span).toISOString(),endsAt:new Date(anchor+(id+1)*span).toISOString(),serverNow:new Date(server).toISOString()});
async function setup(){
 const nodes=new Map(),events=[],visibility=new Map();let clock=0,interval,calls=0,response={};
 const document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,{textContent:'',dataset:{}});return nodes.get(id);},addEventListener(name,fn){visibility.set(name,fn);}};
 const window={TypeOnline:{async request(){calls++;if(response instanceof Error)throw response;return response;}},TypeI18n:{t:value=>value,locale:'tr-TR'},dispatchEvent(event){events.push(event);}};
 const ctx={window,document,performance:{now:()=>clock},Date,Number,String,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},setInterval(fn){interval=fn;return 1;},clearInterval(){}};
 vm.runInNewContext(source,ctx);await new Promise(resolve=>setImmediate(resolve));
 return {api:window.TypeSeason,nodes,events,document,setClock:value=>clock=value,setResponse:value=>response=value,tick:()=>interval(),get calls(){return calls;}};
}
test('season countdown uses server time and monotonic seconds, not the device calendar',async()=>{
 const f=await setup();f.api.sync(season(0));assert.equal(f.nodes.get('season-remaining').textContent,'30 gün 00:00:00');
 f.setClock(1100);f.tick();assert.equal(f.nodes.get('season-remaining').textContent,'29 gün 23:59:59');
 assert.equal(f.api.contains('2020-01-01T00:00:00Z'),true,'legacy results stay in the first season');
});
test('expiry fetches the authoritative next season once and refuses a late previous-season response',async()=>{
 const f=await setup();f.api.sync(season(0,anchor+span-1000));f.setResponse({season:season(1,anchor+span+1000)});f.setClock(2000);f.tick();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.api.current.id,1);assert.equal(f.events.filter(x=>x.detail.changed).length,1);
 f.api.sync(season(0));assert.equal(f.api.current.id,1);
 assert.equal(f.api.contains(new Date(anchor).toISOString()),false);assert.equal(f.api.contains(new Date(anchor+span).toISOString()),true);assert.equal(f.api.contains(new Date(anchor+2*span).toISOString()),false);
});
test('offline rollover stays at zero and throttles retries instead of inventing a new season',async()=>{
 const f=await setup();f.api.sync(season(0,anchor+span-1000));f.setResponse(Error('offline'));const before=f.calls;
 f.setClock(2000);f.tick();await new Promise(resolve=>setImmediate(resolve));f.setClock(3000);f.tick();
 assert.equal(f.api.current.id,0);assert.equal(f.nodes.get('season-remaining').textContent,'0 gün 00:00:00');assert.equal(f.calls-before,1);
});
test('invalid season payloads cannot replace a valid 30-day clock',async()=>{
 const f=await setup();f.api.sync(season(0));f.api.sync({...season(1),endsAt:new Date(anchor+span+100).toISOString()});assert.equal(f.api.current.id,0);
 f.document.hidden=true;const before=f.calls;f.setClock(span*2);f.tick();assert.equal(f.calls,before);
});
