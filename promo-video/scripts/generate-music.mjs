import {writeFileSync} from 'node:fs';

const sampleRate = 44100;
const seconds = 36;
const total = sampleRate * seconds;
const out = Buffer.allocUnsafe(44 + total * 4);
const chords = [
  [174.61, 207.65, 261.63],
  [138.59, 174.61, 207.65],
  [207.65, 261.63, 311.13],
  [155.56, 196.00, 233.08],
];

out.write('RIFF', 0);
out.writeUInt32LE(out.length - 8, 4);
out.write('WAVE', 8);
out.write('fmt ', 12);
out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20);
out.writeUInt16LE(2, 22);
out.writeUInt32LE(sampleRate, 24);
out.writeUInt32LE(sampleRate * 4, 28);
out.writeUInt16LE(4, 32);
out.writeUInt16LE(16, 34);
out.write('data', 36);
out.writeUInt32LE(total * 4, 40);

for (let i = 0; i < total; i++) {
  const t = i / sampleRate;
  const section = Math.min(3, Math.floor(t / 9));
  const chord = chords[section];
  const within = t % 9;
  const padEnv = Math.min(1, within / 0.65) * Math.min(1, (9 - within) / 1.25);
  const beat = t % 0.75;
  const subBeat = t % 0.375;
  const arpIndex = Math.floor(t / 0.375) % 6;
  const arpHz = chord[arpIndex % 3] * (arpIndex < 3 ? 2 : 4);
  const arp = Math.sin(2 * Math.PI * arpHz * subBeat) * Math.exp(-subBeat * 9) * 0.075;
  const kickHz = 52 + 70 * Math.exp(-beat * 35);
  const kick = Math.sin(2 * Math.PI * kickHz * beat) * Math.exp(-beat * 17) * 0.23;
  const hatNoise = Math.sin(i * 0.825) * Math.sin(i * 2.127) * Math.sin(i * 0.077);
  const hat = hatNoise * Math.exp(-subBeat * 63) * 0.045;
  const fade = Math.min(1, t / 0.7) * Math.min(1, (seconds - t) / 1.1);
  for (let ch = 0; ch < 2; ch++) {
    let pad = 0;
    for (let n = 0; n < 3; n++) {
      const phase = 2 * Math.PI * chord[n] * t + ch * (n + 1) * 0.18;
      pad += (Math.sin(phase) + 0.22 * Math.sin(phase * 2)) * 0.043;
    }
    const value = Math.max(-1, Math.min(1, (pad * padEnv + arp + kick + hat) * fade * 0.77));
    out.writeInt16LE(Math.round(value * 32767), 44 + i * 4 + ch * 2);
  }
}

writeFileSync(new URL('../public/music.wav', import.meta.url), out);
console.log('Generated original 36-second instrumental:', out.length, 'bytes');
