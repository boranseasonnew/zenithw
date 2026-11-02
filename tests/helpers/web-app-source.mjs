// Isolated legacy contracts inject their own collaborators in a VM.
// Browser regressions execute the real bundled modules and HTML callbacks.
import {readFileSync} from 'node:fs';
export function moduleSource(name){
 return readFileSync(new URL('../../shared/web-app/'+name+'.mjs',import.meta.url),'utf8')
  .replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')
  .replace(/\bstate\./g,'');
}
