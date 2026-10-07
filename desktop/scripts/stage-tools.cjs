const fs = require('node:fs');
const path = require('node:path');

const required = ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe', 'aria2c.exe'];
const source = process.env.ZENITHW_TOOL_SOURCE
  || path.join(process.env.LOCALAPPDATA || '', 'Programs', 'ZenithW', 'resources', 'bin');
const destination = path.join(__dirname, '..', 'resources', 'bin');

const hasAll = (folder) => required.every((name) => fs.existsSync(path.join(folder, name)));
if (!fs.existsSync(source)) {
  if (hasAll(destination)) {
    console.log(`Reusing previously staged embedded tools from ${destination}`);
    process.exit(0);
  }
  throw new Error(`ZenithW tool source was not found: ${source}`);
}
fs.mkdirSync(destination, { recursive: true });
for (const name of required) {
  const from = path.join(source, name);
  const to = path.join(destination, name);
  if (!fs.existsSync(from)) throw new Error(`Required embedded tool is missing: ${from}`);
  fs.copyFileSync(from, to);
}
console.log(`Staged ${required.length} embedded tools from ${source}`);
