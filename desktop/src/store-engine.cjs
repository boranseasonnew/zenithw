'use strict';
const fs = require('node:fs');
const path = require('node:path');

// MSIX installations are read-only. Keep only the self-updating engine outside
// the package; immutable FFmpeg, aria2 and Deno still run from the package.
function storeEnginePath(bundledPath, userData, windowsStore) {
  if (!windowsStore) return bundledPath;
  const directory = path.join(userData, 'engine');
  const destination = path.join(directory, 'yt-dlp.exe');
  fs.mkdirSync(directory, { recursive: true });
  try { fs.copyFileSync(bundledPath, destination, fs.constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return destination;
}
module.exports = { storeEnginePath };
