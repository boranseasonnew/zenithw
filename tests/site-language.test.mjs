import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const frontend = new URL('../frontend/', import.meta.url);
const languages = ['tr','en','fr','de','ru','vi','zh','ja'];
const read = path => readFileSync(new URL(path, frontend), 'utf8');
const catalogs = Object.fromEntries(languages.map(lang => [lang, JSON.parse(read(`locales/${lang}.json`))]));
const tokens = text => [...text.matchAll(/\{[^{}]+\}/g)].map(match=>match[0]).sort();
const tags = text => [...text.matchAll(/<\/?[a-zA-Z][^>]*>/g)].map(match=>match[0]);

test('Every language preserves variable slots and link markup across the full catalog',()=>{
  const keys=Object.keys(catalogs.en).sort();
  for(const lang of languages){
    assert.deepEqual(Object.keys(catalogs[lang]).sort(),keys,lang);
    for(const key of keys){
      const value=catalogs[lang][key];
      assert.ok(typeof value==='string' && value.trim(),`${lang}: ${key}`);
      assert.deepEqual(tokens(value),tokens(key),`${lang} placeholders: ${key}`);
      assert.doesNotMatch(value,/<script\b|\son\w+\s*=|href\s*=\s*["']javascript:/i,`${lang} unsafe markup`);
      assert.doesNotMatch(value,/ZXQPH\d+QXZ/,`${lang} unresolved token`);
    }
  }
});

test('All release titles, introductions and sections have translations in eight languages',()=>{
  const core=read('updates-core.99daf4ea6088.js');
  const context=vm.createContext({window:{}});
  vm.runInContext(core.slice(0,core.indexOf('let CUR_LANG='))+';globalThis.releases=CURRENT_RELEASES;',context);
  vm.runInContext(read('updates-archive.07c744021db2.js'),context);
  for(const release of [...context.releases,...context.window.ZW_UPDATE_ARCHIVE]){
    const strings=[release.titleEn,...release.introEn,...release.sections.flatMap(section=>[section.hEn,section.pEn])];
    for(const text of strings){
      if(!/[a-zA-Z]/.test(text)||['Windows','Android','FFmpeg','yt-dlp'].includes(text))continue;
      for(const lang of languages){
        assert.ok(Object.hasOwn(catalogs[lang],text.trim()),`${lang} ${release.ver}: ${text}`);
        assert.deepEqual(tags(catalogs[lang][text.trim()]),tags(text),`${lang} ${release.ver} link structure`);
      }
    }
  }
});

function runtime(saved='ru', {settings=true, browser=['ja-JP']}={}){
  const pending=[], writes=[];
  const select={value:'',setAttribute(){},removeAttribute(){},hasAttribute:()=>false,replaceChildren(){}};
  const document={readyState:'complete',documentElement:{},querySelectorAll:()=>[],getElementById:()=>settings?select:null,
    createElement:tag=>{assert.equal(tag,'option');return {};},querySelector:()=>null};
  const window={dispatchEvent(){}};
  const context=vm.createContext({window,document,navigator:{languages:browser},console:{error(){}},
    CustomEvent:class{},localStorage:{getItem:()=>saved,setItem:(key,value)=>writes.push([key,value])},
    fetch:url=>new Promise(resolve=>pending.push({url,resolve}))});
  vm.runInContext(read('site-language.js'),context);
  const complete=(index,ok=true)=>pending[index].resolve({ok,json:async()=>catalogs[pending[index].url.match(/([a-z]+)\.json$/)[1]]});
  return {api:window.ZWLanguage,pending,writes,document,complete};
}

test('Saved language wins over browser language and remains readable if loading fails',async()=>{
  const state=runtime();
  assert.equal(state.api.current,'ru');
  state.complete(0);await state.api.ready;
  assert.equal(state.document.documentElement.lang,'ru');
  assert.equal(state.api.translate('Language'),catalogs.ru.Language);
  const result=state.api.use('vi');state.complete(1,false);await result;
  assert.equal(state.api.current,'ru');assert.equal(state.writes.length,0);
  assert.equal(state.api.translate('visitor filename.mov'),'visitor filename.mov');
});

test('A slow earlier selection cannot replace a newer language choice',async()=>{
  const state=runtime('en');state.complete(0);await state.api.ready;
  const earlier=state.api.use('ru'),latest=state.api.use('ja');
  state.complete(2);await latest;state.complete(1);await earlier;
  assert.equal(state.api.current,'ja');
  assert.deepEqual(state.writes,[['zw_lang','ja']]);
});

test('Pages without a Settings selector detect browser language without saving a preference',async()=>{
  for(const [browser,expected] of [[['es-ES','de-DE'],'de'],[['vi-VN'],'vi'],[['ko-KR'],'en']]){
    const state=runtime(null,{settings:false,browser});
    state.complete(0);await state.api.ready;
    assert.equal(state.api.current,expected);
    assert.equal(state.document.documentElement.lang,expected);
    assert.deepEqual(state.writes,[]);
  }
});
