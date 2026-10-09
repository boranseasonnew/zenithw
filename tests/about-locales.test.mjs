import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const frontend=new URL('../frontend/',import.meta.url);
const read=path=>readFileSync(new URL(path,frontend),'utf8');
const files=['about.html','about/community.html','about/credit.html','about/privacy.html','about/terms.html'];
const languages=['tr','en','fr','de','ru','vi','zh','ja'];
const decode=text=>text.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');

test('Every About section uses the current static copy and translates in all eight languages',async()=>{
  for(const file of files){
    const html=read(file);
    assert.doesNotMatch(html,/about-locales|info-page\.[a-f0-9]+\.js|const COPY\s*=/,file);
    assert.match(html,/site-language\.[a-f0-9]{12}\.js/,file);
    const fields=[...html.matchAll(/data-l10n="([^"]+)"/g)].map(match=>JSON.parse(decode(match[1])));
    assert.ok(fields.length>15,file);
    for(const language of languages){
      const catalog=JSON.parse(read(`locales/${language}.json`));
      const elements=fields.map(field=>({
        childNodes:Array.from({length:1+Math.max(0,...Object.keys(field).filter(key=>key.startsWith('text:')).map(key=>Number(key.slice(5))))},()=>({nodeType:3,textContent:''})),
        attributes:{},getAttribute:()=>JSON.stringify(field),setAttribute(key,value){this.attributes[key]=value;}
      }));
      const document={readyState:'complete',documentElement:{},getElementById:()=>null,querySelectorAll:selector=>selector==='[data-l10n]'?elements:[]};
      const window={dispatchEvent(){}};
      vm.runInNewContext(read('site-language.js'),{window,document,navigator:{languages:[`${language}-XX`]},CustomEvent:class{},localStorage:{getItem:()=>null},fetch:async()=>({ok:true,json:async()=>catalog}),console});
      await window.ZWLanguage.ready;
      assert.equal(document.documentElement.lang,language);
      fields.forEach((field,index)=>{
        for(const [key,original] of Object.entries(field)){
          const translated=catalog[original.trim()];
          assert.ok(translated,`${file} ${language}: ${original}`);
          const actual=key.startsWith('text:')?elements[index].childNodes[Number(key.slice(5))].textContent:elements[index].attributes[key];
          assert.equal(actual.trim(),translated,`${file} ${language}: ${key}`);
        }
      });
    }
  }
});

test('Language controls occur only in Settings, including generated update pages',()=>{
  function walk(directory=''){
    for(const entry of readdirSync(new URL(directory||'./',frontend),{withFileTypes:true})){
      const path=`${directory}${entry.name}`;
      if(entry.isDirectory())walk(`${path}/`);
      else if(path.endsWith('.html')){
        const html=read(path);
        assert.doesNotMatch(html,/langSwitch|legalLangToggle|data-site-language/,path);
        if(path==='settings.html')assert.match(html,/id="langSelect"/);
        else assert.doesNotMatch(html,/id="langSelect"/,path);
      }
    }
  }
  walk();
  for(const source of ['updates-core.99daf4ea6088.js','status.html'])assert.doesNotMatch(read(source),/localStorage\.setItem\('zw_lang'/,source);
});

