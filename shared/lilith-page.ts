import {mountStudio,ENGLISH} from './lilith-studio.js';
type LanguageApi={ready:Promise<unknown>;translate:(text:string)=>string;onChange:(callback:()=>void)=>()=>void};
const api=(window as Window & {ZWLanguage?:LanguageApi}).ZWLanguage;
if(api)await api.ready;
const root=document.getElementById('studio')!;
const strings=Object.fromEntries(Object.entries(ENGLISH).map(([key,text])=>[key,api?.translate(text)??text]));
const repeatLabels:Record<string,string>={
  tr: "Döngüde oynat",
  en: "Repeat playback",
  de: "Wiedergabe wiederholen",
  fr: "Répéter la lecture",
  ru: "Повторять воспроизведение",
  vi: "Phát lặp lại",
  zh: "循环播放",
  ja: "リピート再生"
};
const audioLocale=document.documentElement.dataset.staticLanguage||document.documentElement.lang?.slice(0,2)||'en';
strings.repeat=repeatLabels[audioLocale]??ENGLISH.repeat;
mountStudio(root,strings,{workerUrl:'__WORKER_URL__',exportWorkerUrl:'__EXPORT_WORKER_URL__'});
