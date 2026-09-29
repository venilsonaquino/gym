import { readFile, writeFile } from 'node:fs/promises';

const catalogPath = new URL('../data/catalog.json', import.meta.url);
const cachePath = new URL('../data/.pt-br-translation-cache.json', import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
let cache = {};
try { cache = JSON.parse(await readFile(cachePath, 'utf8')); } catch { /* first run */ }

const sourceStrings = new Set();
for (const exercise of catalog) {
  for (const field of [exercise.name, exercise.category, exercise.equipment, exercise.target, ...exercise.secondary, ...exercise.steps]) {
    if (field?.trim()) sourceStrings.add(field.trim());
  }
}
const pending = [...sourceStrings].filter(text => !cache[text]);
const batches = [];
let batch = [], length = 0;
for (const phrase of pending) {
  const extra = phrase.length + 24;
  if (batch.length && length + extra > 1050) { batches.push(batch); batch = []; length = 0; }
  batch.push(phrase); length += extra;
}
if (batch.length) batches.push(batch);

let next = 0, complete = 0, failure;
async function translateBatch(combined, attempt = 1) {
  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    for (const [key, value] of Object.entries({ client: 'gtx', sl: 'en', tl: 'pt-BR', dt: 't', q: combined })) url.searchParams.set(key, value);
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error(`Translation service returned ${response.status}.`);
    const payload = await response.json();
    const result = payload[0]?.map(part => part[0]).join('');
    if (typeof result !== 'string' || !result.trim()) throw new Error('Translation service returned no text.');
    return result.trim();
  } catch (e) {
    if (attempt >= 5) throw new Error(`Translation failed after ${attempt} attempts: ${e.message}`);
    await new Promise(resolve => setTimeout(resolve, Math.min(1000 * (2 ** (attempt - 1)), 8000)));
    return translateBatch(combined, attempt + 1);
  }
}

async function worker() {
  while (!failure) {
    const index = next++;
    if (index >= batches.length) return;
    const phrases = batches[index];
    try {
      const prefix = `QZXVBRK${String(index).padStart(5, '0')}`;
      const separator = n => `${prefix}S${String(n).padStart(3, '0')}QZX`;
      const translated = await translateBatch(phrases.map((phrase, i) => `${separator(i)} ${phrase}`).join(' '));
      for (let i = 0; i < phrases.length; i++) {
        const start = translated.indexOf(separator(i));
        const end = i + 1 < phrases.length ? translated.indexOf(separator(i + 1), start + 1) : translated.length;
        if (start < 0 || end < 0) throw new Error(`The translation service changed separator ${i} in batch ${index}.`);
        const value = translated.slice(start + separator(i).length, end).trim();
        if (!value) {
          if (phrases.length > 1) {
            for (const phrase of phrases) if (!cache[phrase]) cache[phrase] = await translateBatch(phrase);
            complete++;
            if (complete % 12 === 0 || complete === batches.length) {
              await writeFile(cachePath, JSON.stringify(cache));
              console.log(`Translated ${complete}/${batches.length} batches (${Object.keys(cache).length}/${sourceStrings.size} unique phrases).`);
            }
            return;
          }
          throw new Error(`The translation service returned an empty segment in batch ${index}.`);
        }
        cache[phrases[i]] = value;
      }
      complete++;
      if (complete % 12 === 0 || complete === batches.length) {
        await writeFile(cachePath, JSON.stringify(cache));
        console.log(`Translated ${complete}/${batches.length} batches (${Object.keys(cache).length}/${sourceStrings.size} unique phrases).`);
      }
  } catch (e) {
    failure = new Error(`Could not translate batch ${index}: ${e.message}`);
    await writeFile(cachePath, JSON.stringify(cache));
    console.error(`Saved partial translation progress (${Object.keys(cache).length}/${sourceStrings.size} unique phrases). Re-run npm run translate:pt-BR when the translation service is available.`);
    return;
  }
  }
}

console.log(`Translating ${pending.length} unique English phrases from ${catalog.length} exercises in ${batches.length} batches.`);
await Promise.all(Array.from({ length: 4 }, worker));
await writeFile(cachePath, JSON.stringify(cache));

for (const exercise of catalog) {
  exercise.ptBR = {
    name: cache[exercise.name.trim()] || exercise.name,
    category: cache[exercise.category.trim()] || exercise.category,
    equipment: cache[exercise.equipment.trim()] || exercise.equipment,
    target: cache[exercise.target.trim()] || exercise.target,
    secondary: exercise.secondary.map(item => cache[item.trim()] || item),
    steps: exercise.steps.map(step => cache[step.trim()] || step),
  };
}
await writeFile(catalogPath, `${JSON.stringify(catalog)}\n`);
console.log(`Updated Portuguese fields for ${catalog.length} exercises. ${pending.length} source phrases were pending at start; untranslated text remains in English so no source data is lost.`);
if (failure) process.exitCode = 1;
