const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {storeEnginePath} = require('../src/store-engine.cjs');

test('Store engine runs from writable data, preserving later engine updates and packaged bytes',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zenith-store-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const bundled=path.join(directory,'yt-dlp.exe');
  const userData=path.join(directory,'userdata');
  fs.writeFileSync(bundled,'bundled engine');
  const writable=storeEnginePath(bundled,userData,true);
  assert.notEqual(writable,bundled);
  assert.equal(fs.readFileSync(writable,'utf8'),'bundled engine');
  fs.writeFileSync(writable,'nightly update');
  assert.equal(storeEnginePath(bundled,userData,true),writable);
  assert.equal(fs.readFileSync(writable,'utf8'),'nightly update');
  assert.equal(fs.readFileSync(bundled,'utf8'),'bundled engine');
  assert.equal(storeEnginePath(bundled,userData,false),bundled);
});
