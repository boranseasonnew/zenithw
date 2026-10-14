import {mountStudio,ENGLISH} from './lilith-studio.js';
type LanguageApi={ready:Promise<unknown>;translate:(text:string)=>string;onChange:(callback:()=>void)=>()=>void};
const api=(window as Window & {ZWLanguage?:LanguageApi}).ZWLanguage;
if(api)await api.ready;
const root=document.getElementById('studio')!;
const strings=Object.fromEntries(Object.entries(ENGLISH).map(([key,text])=>[key,api?.translate(text)??text]));
mountStudio(root,strings,{workerUrl:'__WORKER_URL__',exportWorkerUrl:'__EXPORT_WORKER_URL__'});
