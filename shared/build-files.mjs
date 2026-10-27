import { writeFileSync } from 'node:fs';
// File scanners on Windows can briefly hold generated HTML open during a large build.
export function writeFileWithRetry(path, data, options) {
 for(let attempt=0;;attempt++) {
  try {return writeFileSync(path,data,options);} catch(error) {
   if(process.platform!=='win32'||attempt===19||!['UNKNOWN','EBUSY','EPERM','EACCES','EINVAL'].includes(error.code))throw error;
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);
  }
 }
}
