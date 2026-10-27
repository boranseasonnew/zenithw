import test from 'node:test';
import assert from 'node:assert/strict';
import { username,password,options,randomWords,validateBatch,replay,readBoundedBody,rateLimitAddress } from '../supabase/functions/typing-api/core.mjs';
import { wordLists } from '../supabase/functions/typing-api/words.mjs';
test('usernames are canonical and credentials reject malformed input',()=>{
 assert.equal(username('  BoRan_7  '),'boran_7');
 for(const value of ['ab','x@y','<script>','a'.repeat(21)])assert.throws(()=>username(value));
 assert.throws(()=>password('short'));assert.equal(password('strong password 42'),'strong password 42');
 assert.throws(()=>options({duration:600,language:'tr',difficulty:'normal'}));
});
test('new server challenges differ and hard mode includes punctuation and numbers',()=>{
 const a=randomWords(wordLists,'tr','normal',120),b=randomWords(wordLists,'tr','normal',120);
 assert.notEqual(a,b);assert.ok(a.length>200);
 const hard=randomWords(wordLists,'tr','hard',100);assert.match(hard,/[0-9]/);assert.match(hard,/[,.!?:;]/);assert.match(hard,/[A-ZÇĞİÖŞÜ]/);
});
test('vuruş packets reject stale, future, reordered and bulk injected input',()=>{
 const good=[{s:0,t:300,k:'i',c:'a'},{s:1,t:500,k:'i',c:'b'}];
 assert.deepEqual(validateBatch([],good,800,30),good);
 assert.throws(()=>validateBatch([],good,6000,30));
 assert.throws(()=>validateBatch([],[{s:0,t:2000,k:'i',c:'x'}],0,30));
 assert.throws(()=>validateBatch([],[{s:1,t:100,k:'i',c:'x'}],100,30));
 assert.throws(()=>validateBatch([],[{s:0,t:100,k:'i',c:'paste'}],100,30));
 assert.throws(()=>validateBatch([],Array.from({length:51},(_,s)=>({s,t:100,k:'i',c:'x'})),100,30));
});
test('server replay recomputes WPM and includes corrected mistakes in accuracy',()=>{
 const text='abcdefghij',events=[{k:'i',c:'x'},{k:'b'},...Array.from(text,c=>({k:'i',c}))];
 const score=replay(text,events,30);
 assert.deepEqual(score,{wpm:4,accuracy:91,errors:1,characters:10});
 assert.throws(()=>replay(text,[],30));
 assert.throws(()=>replay('abcdefghij',Array.from('xxxxxxxxxx',c=>({k:'i',c})),30));
});

test('body limits apply to chunked requests without a Content-Length header',async()=>{
 const bytes=new TextEncoder().encode('123456789');
 const stream=new ReadableStream({start(controller){controller.enqueue(bytes.slice(0,4));controller.enqueue(bytes.slice(4));controller.close();}});
 const request=new Request('https://example.test',{method:'POST',body:stream,duplex:'half'});
 await assert.rejects(readBoundedBody(request,8),error=>error.code==='payload_too_large');
 const normal=new Request('https://example.test',{method:'POST',body:'123'});
 assert.equal(new TextDecoder().decode(await readBoundedBody(normal,3)),'123');
});
test('spoofed leftmost forwarded addresses cannot create fresh rate-limit buckets',()=>{
 assert.equal(rateLimitAddress(new Headers({'x-forwarded-for':'6.6.6.6, 203.0.113.7'})),'203.0.113.7');
 assert.equal(rateLimitAddress(new Headers({'cf-connecting-ip':'2001:db8::1','x-forwarded-for':'6.6.6.6'})),'2001:db8::1');
 assert.equal(rateLimitAddress(new Headers({'x-forwarded-for':'bad-address'})),'unknown');
});
