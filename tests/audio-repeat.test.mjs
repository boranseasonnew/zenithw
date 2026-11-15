import test from 'node:test';
import assert from 'node:assert/strict';
import {createRepeatController} from '../shared/audio-repeat.mjs';
const state=(playing,vocals,instrumental,currentTime,duration=10)=>({playing,vocals,instrumental,currentTime,duration});

test('repeat defaults to off and does not restart on natural completion',()=>{
  const r=createRepeatController();
  assert.equal(r.observe(state(true,true,false,5)),null);
  assert.equal(r.observe(state(false,false,false,10)),null);
});

for(const [mode,vocals,instrumental] of [['vocals',true,false],['instrumental',false,true],['both',true,true]]){
  test('repeat restarts only the previously playing '+mode+' stem selection',()=>{
    const r=createRepeatController();
    assert.equal(r.toggle(),true);
    assert.equal(r.observe(state(true,vocals,instrumental,2)),null);
    assert.equal(r.observe(state(false,false,false,10)),mode);
    assert.equal(r.observe(state(false,false,false,10)),null,'must not restart twice');
  });
}
test('changing from both to vocal preserves the last live channel',()=>{
  const r=createRepeatController();
  r.toggle();
  r.observe(state(true,true,true,2));
  r.observe(state(true,true,false,8));
  assert.equal(r.observe(state(false,false,false,10)),'vocals');
});
test('changing from vocal to both preserves the synchronized selection',()=>{
  const r=createRepeatController();
  r.toggle();
  r.observe(state(true,true,false,2));
  r.observe(state(true,true,true,8));
  assert.equal(r.observe(state(false,false,false,10)),'both');
});
test('manual pause at the very end cannot trigger repeat',()=>{
  const r=createRepeatController();
  r.toggle();
  r.observe(state(true,false,true,9.9));
  r.cancel();
  assert.equal(r.observe(state(false,false,false,10)),null);
});
test('disabling repeat while playing stops naturally',()=>{
  const r=createRepeatController();
  r.toggle();
  r.observe(state(true,true,false,8));
  assert.equal(r.toggle(),false);
  assert.equal(r.observe(state(false,false,false,10)),null);
});
test('repeat never restarts a paused stream before the end',()=>{
  const r=createRepeatController();
  r.toggle();
  r.observe(state(true,false,true,5));
  assert.equal(r.observe(state(false,false,false,5)),null);
});
test('repeat is scoped to one separation session',()=>{
  const first=createRepeatController();
  first.toggle();
  const second=createRepeatController();
  second.observe(state(true,true,true,8));
  assert.equal(second.observe(state(false,false,false,10)),null);
});
