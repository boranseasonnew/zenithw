export const DURATIONS = [15, 30, 60, 120];
export const MAX_WPM = 400;
export function username(value) {
  const name = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(name)) throw new Error('Kullanıcı adı 3–20 harf, rakam veya alt çizgi olmalı.');
  return name;
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) throw new Error('Şifre 10–128 karakter olmalı.');
  return value;
}
export function options(body) {
  if (!DURATIONS.includes(body.duration) || !['tr','en'].includes(body.language) || !['easy','normal','hard'].includes(body.difficulty)) throw new Error('Geçersiz test ayarı.');
  return { duration:body.duration, language:body.language, difficulty:body.difficulty };
}
export function randomWords(lists, language, difficulty, count = 1500) {
  const list = difficulty === 'easy' ? lists[language].easy : difficulty === 'hard' ? [...lists[language].normal,...lists[language].hard] : [...lists[language].easy,...lists[language].normal];
  const random = new Uint32Array(count * 3); crypto.getRandomValues(random);
  let previous = '';
  return Array.from({length:count},(_,i) => {
    let word = list[random[i*3] % list.length];
    if (word === previous) word = list[(random[i*3]+1) % list.length];
    previous = word;
    if (difficulty === 'hard') {
      if (i % 6 === 0) word = word[0].toLocaleUpperCase(language === 'tr' ? 'tr-TR':'en-US') + word.slice(1);
      if (i % 7 === 4) word += [',','.','!','?',':',';'][random[i*3+1] % 6];
      if (i % 13 === 9) word = String(100 + random[i*3+2] % 900);
    }
    return word;
  }).join(' ');
}
export function validateBatch(previous, batch, elapsed, duration) {
  if (!Array.isArray(batch) || batch.length < 1 || batch.length > 150 || previous.length + batch.length > 12000) throw new Error('Geçersiz vuruş paketi.');
  let lastTime = previous.at(-1)?.t ?? 0;
  const combined = previous.slice(-60);
  for (let i=0; i<batch.length; i++) {
    const event = batch[i];
    if (!event || event.s !== previous.length+i || !Number.isInteger(event.t) || event.t < lastTime || event.t > duration*1000 || event.t > elapsed+750 || event.t < elapsed-4500) throw new Error('Vuruş zamanlaması doğrulanamadı.');
    if (event.k !== 'b' && (event.k !== 'i' || typeof event.c !== 'string' || event.c.length !== 1 || /[\x00-\x1f\x7f]/.test(event.c))) throw new Error('Geçersiz vuruş.');
    const clean = event.k === 'i' ? {s:event.s,t:event.t,k:'i',c:event.c} : {s:event.s,t:event.t,k:'b'};
    combined.push(clean);
    if (combined.filter(e=>event.t-e.t<1000).length > 50) throw new Error('Olağandışı vuruş hızı.');
    lastTime = event.t;
  }
  return batch.map(e=>e.k==='i'?{s:e.s,t:e.t,k:'i',c:e.c}:{s:e.s,t:e.t,k:'b'});
}
export function replay(text, events, duration) {
  let value = '', hits = 0, attempts = 0;
  for (const event of events) {
    if (event.k === 'b') { value = value.slice(0,-1); continue; }
    if (value.length >= text.length) throw new Error('Metin sınırı aşıldı.');
    if (event.c === text[value.length]) hits++;
    attempts++; value += event.c;
  }
  let correct = 0;
  for (let i=0;i<value.length;i++) if (value[i]===text[i]) correct++;
  const wpm = Math.round(correct / 5 / (duration / 60));
  const accuracy = attempts ? Math.round(hits / attempts * 100) : 0;
  if (attempts < 10 || wpm > MAX_WPM || accuracy < 50) throw new Error('Bu sonuç sıralama koşullarını karşılamıyor.');
  return {wpm,accuracy,errors:attempts-hits,characters:value.length};
}

export async function readBoundedBody(request, maxBytes) {
  if (!request.body) return new Uint8Array();
  const reader=request.body.getReader(),chunks=[];let size=0;
  try {
    while(true){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>maxBytes){await reader.cancel();const error=new Error('İstek gövdesi çok büyük.');error.code='payload_too_large';throw error;}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  const output=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength;}
  return output;
}
export function rateLimitAddress(headers) {
  // Supabase's edge proxy supplies these values. Never trust the client-controlled
  // leftmost X-Forwarded-For component when the proxy appends its own address.
  const address=(headers.get('cf-connecting-ip')||headers.get('x-forwarded-for')?.split(',').at(-1)||'').trim();
  return address.length<=64&&/^[0-9a-f:.]+$/i.test(address)?address:'unknown';
}
