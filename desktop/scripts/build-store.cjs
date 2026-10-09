'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {build, Platform, Arch} = require('electron-builder');

async function main() {
  if (process.platform !== 'win32') throw new Error('Store packages must be built on Windows.');
  const root=path.resolve(__dirname,'..');
  const assetScript=fs.readFileSync(path.join(__dirname,'store-assets.ps1'),'utf8')
    .replace('$repoDesktop = Split-Path $PSScriptRoot -Parent',`$repoDesktop = '${root.replaceAll("'","''")}'`);
  require('node:child_process').execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',assetScript],{stdio:'inherit',windowsHide:true});
  const draft=process.argv.includes('--draft');
  const identityFile=process.argv.find(argument=>argument.startsWith('--identity='))?.slice(11);
  const identity=draft?{
    identityName:'ZenithW.LocalPreparation',publisher:'CN=ZenithW.LocalPreparation',publisherDisplayName:'ZenithW (local draft)'
  }:JSON.parse(fs.readFileSync(path.resolve(identityFile||path.join(root,'store/identity.json')),'utf8'));
  if (!/^[A-Za-z0-9.-]{3,50}$/.test(identity.identityName||'') || !/^CN=.+/.test(identity.publisher||'') || !identity.publisherDisplayName?.trim()) {
    throw new Error('Copy all three Product identity values from Partner Center into identity.json.');
  }
  if(!draft && /LocalPreparation|local draft|placeholder/i.test(Object.values(identity).join(' ')))throw new Error('A draft identity cannot be submitted to the Store.');
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const output=path.resolve(root,'../ZenithW-Builds/Microsoft-Store-Preparation');
  process.env.CSC_IDENTITY_AUTO_DISCOVERY='false';
  const kits=path.join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','Windows Kits/10/bin');
  if (!process.env.ELECTRON_BUILDER_WINDOWS_KITS_PATH && fs.existsSync(kits)) {
    const version=fs.readdirSync(kits).filter(name=>/^10\.0\.\d+\.0$/.test(name))
      .sort((a,b)=>Number(b.split('.')[2])-Number(a.split('.')[2]))
      .find(name=>fs.existsSync(path.join(kits,name,'x64/MakeAppx.exe')));
    if(version)process.env.ELECTRON_BUILDER_WINDOWS_KITS_PATH=path.join(kits,version,'x64');
  }
  const files=await build({projectDir:root,targets:Platform.WINDOWS.createTarget(['appx'],Arch.x64),publish:'never',config:{
    extends:null,
    toolsets:{winCodeSign:'1.1.0'},
    directories:{output},
    appx:{...identity,applicationId:'ZenithW',displayName:'ZenithW Desktop',backgroundColor:'#151515',
      languages:['tr-TR','en-US','de-DE','ru-RU'],capabilities:['runFullTrust'],
      minVersion:'10.0.19041.0',maxVersionTested:'10.0.26100.0',
      artifactName:`ZenithW-${pkg.version}-Store-x64${draft?'-DRAFT':''}.appx`}
  }});
  const crypto=require('node:crypto');
  const sums=files.filter(file=>file.endsWith('.appx')).map(file=>`${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}  ${path.basename(file)}`);
  fs.writeFileSync(path.join(output,draft?'DRAFT-SHA256SUMS.txt':'SHA256SUMS.txt'),sums.join('\n')+'\n');
  console.log(draft?'Local draft built; do not upload this identity.':'Store package built with the supplied Partner Center identity.');
}
main().catch(error=>{console.error(error.message);process.exit(1);});
