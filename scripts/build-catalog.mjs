import { readFile, writeFile, mkdir } from 'node:fs/promises';
const source = JSON.parse(await readFile(new URL('../exercises-dataset/data/exercises.json', import.meta.url), 'utf8'));
const catalog = source.map(ex => ({
  id: ex.id, name: ex.name, category: ex.category, equipment: ex.equipment,
  target: ex.target, secondary: ex.secondary_muscles,
  steps: ex.instruction_steps.en, image: ex.image, gif: ex.gif_url,
  attribution: ex.attribution,
}));
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/catalog.json', import.meta.url), JSON.stringify(catalog));
console.log(`Built English catalog: ${catalog.length} exercises, ${(Buffer.byteLength(JSON.stringify(catalog)) / 1024).toFixed(0)} KiB.`);
