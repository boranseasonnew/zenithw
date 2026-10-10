import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('native format selection and existing modal buttons update the same conversion target and reject unknown formats',()=>{
 const functionSource=read('frontend/app.d4596317c4a7.js').match(/function setConvFmt\(el\)\{[\s\S]*?\n\}/)[0];
 let renders=0,updates=0;const preview={textContent:''};
 const ctx=vm.createContext({convTargetFmt:'mp3',document:{querySelectorAll:()=>[],getElementById:()=>preview},renderConvPreflight:()=>renders++,_updateConvBtn:()=>updates++});
 vm.runInContext(functionSource,ctx);
 ctx.setConvFmt({tagName:'SELECT',value:'mp4'});assert.equal(ctx.convTargetFmt,'mp4');assert.equal(preview.textContent,'MP4');assert.equal(updates,1);
 const pressed=[];ctx.setConvFmt({tagName:'BUTTON',dataset:{v:'flac'},classList:{add(){}},setAttribute:(...args)=>pressed.push(args)});
 assert.equal(ctx.convTargetFmt,'flac');assert.deepEqual(pressed,[['aria-pressed','true']]);assert.equal(renders,2);
 ctx.setConvFmt({tagName:'SELECT',value:'unsupported'});assert.equal(ctx.convTargetFmt,'flac');assert.equal(updates,2);
 const page=read('frontend/en/convert.html');assert.match(page,/<select id="convFormat" name="format" onchange="setConvFmt\(this\)"/);assert.equal((page.match(/<option value=/g)||[]).length,18);assert.ok(!page.includes('class="chip'));
});
test('choice popups dismiss on Escape with focus restored, outside clicks and opening another picker',()=>{
 const listeners={};function picker(){const result={open:false,focused:false,addEventListener:(event,fn)=>result.toggle=fn,contains:target=>target===result,querySelector:()=>({focus:()=>result.focused=true})};return result;}
 const first=picker(),second=picker();const ctx=vm.createContext({document:{querySelectorAll:()=>[first,second],addEventListener:(type,fn)=>listeners[type]=fn}});
 vm.runInContext(read('frontend/workspace-choices.js'),ctx);
 first.open=true;second.open=true;second.toggle();assert.equal(first.open,false);
 listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(second.open,false);assert.equal(second.focused,true);
 first.open=true;listeners.click({target:first});assert.equal(first.open,true);listeners.click({target:{}});assert.equal(first.open,false);
});
