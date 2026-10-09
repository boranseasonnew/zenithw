const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {loadMain}=require('./main-harness.cjs');
const {EventEmitter}=require('node:events');
const {PassThrough}=require('node:stream');
function fixture(t,options={}){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zenith-workspace-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const api=loadMain({directory,...options});api.initialize({});return {directory,api};}
test('restart clears session metadata while settings and downloaded files remain',t=>{
 const {directory,api}=fixture(t);const userData=path.join(directory,'Zenith Stable');fs.mkdirSync(userData,{recursive:true});
 const file=path.join(directory,'video.mp4');fs.writeFileSync(file,'downloaded file');
 api.invoke('settings:save',{theme:'light',maxDownloads:5});
 fs.writeFileSync(path.join(userData,'history.json'),JSON.stringify([{id:'old',files:[file]}]));
 api.remember({id:'new',title:'New'},{files:[file]});assert.equal(api.invoke('history:get').length,1);
 api.resetSessionHistory();assert.equal(api.invoke('history:get').length,0);assert.ok(!fs.existsSync(path.join(userData,'history.json')));
 assert.equal(fs.readFileSync(file,'utf8'),'downloaded file');assert.equal(api.readSettings().theme,'light');assert.equal(api.readSettings().maxDownloads,5);
});
test('new controls reach real downloader arguments without changing the original URL',t=>{
 const {directory,api}=fixture(t);const current={...api.defaults,forceOverwrites:true,restrictFilenames:true,formatSort:'res,fps',remuxVideo:'mkv',playlist:true,concatPlaylist:'always',playlistItems:'1,3',sponsorBlock:true,sponsorMarkCategories:'intro,outro',sponsorApi:'https://sponsor.ajay.app'};
 const job={kind:'video',url:'https://example.org/video',videoQuality:1080};const args=api.downloadArgs(job,current,directory);
 for(const flag of ['--force-overwrites','--restrict-filenames','--format-sort','--remux-video','--concat-playlist','--playlist-items','--sponsorblock-api','--sponsorblock-remove','--sponsorblock-mark'])assert.ok(args.includes(flag),flag);
 assert.ok(!args.includes('--download-archive'));assert.ok(!args.includes('--recode-video'));assert.equal(args[args.indexOf('--remux-video')+1],'mkv');assert.equal(args.at(-1),job.url);
 const converted=api.downloadArgs(job,{...current,remuxVideo:'',recodeVideo:'webm'},directory);assert.equal(converted[converted.indexOf('--recode-video')+1],'webm');
});
test('unsafe settings and conflicting processing modes are rejected',t=>{
 const {api}=fixture(t);for(const value of [{theme:'invalid'},{sponsorApi:'http://example.org'},{remuxVideo:'mkv',recodeVideo:'webm'},{concatPlaylist:'always',lazyPlaylist:true}])assert.throws(()=>api.invoke('settings:save',value));
 const saved=api.invoke('settings:save',{maxDownloads:100});assert.equal(saved.maxDownloads,8);
});
test('playlist selection accepts large bounded metadata and preserves original playlist indexes',async t=>{
 let args;const data={title:'Playlist',entries:Array.from({length:200},(_,index)=>({playlist_index:index+3,title:'Video '+index,description:'x'.repeat(700)}))};
 const {api}=fixture(t,{childProcess:{spawn(_file,value){args=value;const child=Object.assign(new EventEmitter(),{stdout:new PassThrough(),stderr:new PassThrough()});setImmediate(()=>{child.stdout.write(JSON.stringify(data));child.emit('close',0);});return child;}}});
 const result=await api.invoke('media:playlist','https://example.org/list');assert.equal(result.entries.length,200);assert.equal(result.entries[0].index,3);assert.equal(result.entries[199].index,202);
 assert.equal(args[args.indexOf('--playlist-end')+1],'200');assert.equal(args.at(-1),'https://example.org/list');
 await assert.rejects(api.invoke('download:start',{url:'https://example.org/list',playlistItems:'1 --exec test'}),/playlist items/i);
});
test('sleep protection is released only when all downloads finish and respects preference changes',t=>{
 const calls=[];const {api}=fixture(t,{electronOverrides:{powerSaveBlocker:{start:type=>{calls.push(['start',type]);return 42;},stop:id=>calls.push(['stop',id])}}});
 api.invoke('settings:save',{preventSleep:true});assert.equal(calls.length,0);
 api.activeJobs.set('one',{});api.activeJobs.set('two',{});api.syncSleepBlocker();assert.equal(calls[0][1],'prevent-app-suspension');
 api.releaseJob('one');assert.equal(calls.length,1);api.releaseJob('two');assert.deepEqual(calls[1],['stop',42]);
 api.activeJobs.set('three',{});api.syncSleepBlocker();api.invoke('settings:save',{preventSleep:false});assert.equal(calls.length,4);
});
test('configured concurrent limit blocks excess jobs',async t=>{
 const {api}=fixture(t);api.invoke('settings:save',{maxDownloads:1});api.activeJobs.set('existing',{});
 await assert.rejects(api.invoke('download:start',{url:'https://example.org/video'}),/concurrent|eşzamanlı/i);
});
test('tray preference creates one instance, refreshes its menu and destroys it when disabled',t=>{
 const calls=[];class Tray { constructor(){calls.push('created');} setToolTip(){} on(){} setContextMenu(menu){calls.push(menu.map(item=>item.label).filter(Boolean));} destroy(){calls.push('destroyed');} }
 const {api}=fixture(t,{electronOverrides:{Tray,Menu:{buildFromTemplate:items=>items}}});
 api.invoke('settings:save',{trayEnabled:true});api.syncTray();assert.equal(calls.filter(x=>x==='created').length,1);
 api.invoke('settings:save',{trayEnabled:false});assert.equal(calls.at(-1),'destroyed');
});
test('OS notifications only fire for terminal events and respect the preference',t=>{
 const calls=[];class Notification { static isSupported(){return true;} constructor(value){calls.push(value);} on(){} show(){calls.push('shown');} }
 const {api}=fixture(t,{electronOverrides:{Notification}});const job={id:'one',title:'Test video'};
 api.emit(job,'complete',{});assert.equal(calls.length,0);api.invoke('settings:save',{systemNotifications:true});
 api.emit(job,'progress',{});assert.equal(calls.length,0);api.emit(job,'complete',{});assert.equal(calls[0].body,job.title);assert.equal(calls[1],'shown');
});
test('overwrite replaces the intended file while normal publication creates a unique name',t=>{
 const {directory,api}=fixture(t,{childProcess:{execFileSync:()=> 'video\naudio\n'}});const work=path.join(directory,'work'),out=path.join(directory,'out');fs.mkdirSync(work);fs.mkdirSync(out);
 const make=()=>fs.writeFileSync(path.join(work,'video.mp4'),Buffer.alloc(2048,7));const target=path.join(out,'video.mp4');fs.writeFileSync(target,Buffer.alloc(2048,3));make();
 const files=api.publishMedia(work,out,{kind:'video',forceOverwrites:true});assert.equal(files[0],target);assert.equal(fs.readFileSync(target)[0],7);assert.ok(!fs.existsSync(path.join(out,'video (1).mp4')));
 make();const second=api.publishMedia(work,out,{kind:'video',forceOverwrites:false});assert.equal(path.basename(second[0]),'video (1).mp4');
});
