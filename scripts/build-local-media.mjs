import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('frontend/vendor', { recursive: true });
await build({ entryPoints: ['scripts/local-media-worker.js'], outfile: 'frontend/vendor/local-media-worker.js', bundle: true, minify: true, format: 'esm', platform: 'browser', target: 'es2022', legalComments: 'eof' });
await copyFile('node_modules/mediabunny/LICENSE', 'frontend/vendor/mediabunny-LICENSE.txt');
