import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';
import { PAGES_CSP } from '../shared/pages-security.mjs';
import { TYPING_CSP } from '../shared/typing-security.mjs';
function context(path){return {request:new Request('https://zenithw.space'+path),env:{MAINTENANCE_MODE:'off'},next:async()=>new Response('<html></html>',{headers:{'Content-Type':'text/html'}})};}
test('only typing routes receive the isolated Supabase policy',async()=>{
 for(const route of ['/typing','/typing.html','/typing/']){
  const policy=(await onRequest(context(route))).headers.get('Content-Security-Policy');
  assert.match(policy,/script-src 'nonce-[^']+'/);
  assert.equal(policy.replace(/ 'nonce-[^']+'/g,''),TYPING_CSP);
 }
 assert.match(TYPING_CSP,/connect-src 'self' https:\/\/woxxdgekdgapcsruicci\.supabase\.co/);
 for(const route of ['/','/downloads','/typing-other']){
  const policy=(await onRequest(context(route))).headers.get('Content-Security-Policy');
  assert.match(policy,/script-src 'nonce-[^']+'/);
  assert.equal(policy.replace(/ 'nonce-[^']+'/g,''),PAGES_CSP);
 }
});
