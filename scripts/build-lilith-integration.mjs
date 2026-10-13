import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const root=new URL('../',import.meta.url),path=p=>fileURLToPath(new URL(p,root));
// Independent Lilith 0.1.0 SDK snapshot. No second inference implementation.
const sdk=path('frontend/vendor/lilith-engine/');
const worker=readFileSync(sdk+'separation-worker.js','utf8').replaceAll('"./runtime/','"/vendor/lilith-engine/runtime/');
writeFileSync(path('frontend/audio-separator-worker.js'),worker);
const workerHash=createHash('sha256').update(worker).digest('hex').slice(0,12),sdkHash=createHash('sha256').update(readFileSync(sdk+'index.js')).digest('hex').slice(0,12);
const source=readFileSync(path('shared/lilith-page.ts'),'utf8').replace('__WORKER_URL__','/audio-separator-worker.js?v='+workerHash);
await build({stdin:{contents:source,resolveDir:path('shared'),loader:'ts'},outfile:path('frontend/audio-tools.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',legalComments:'eof',plugins:[{name:'public-lilith-sdk',setup(builder){builder.onResolve({filter:/^@lilith\/audio-engine$/},()=>({path:'/vendor/lilith-engine/index.js?v='+sdkHash,external:true}));}}]});
console.log('ZenithW integration built from the independent Lilith SDK and Studio component.');
