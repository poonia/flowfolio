// Scans diagrams/ for editable diagram files and writes diagrams/index.json,
// which the app reads to build the side panel.
// Supported: .excalidraw, .mmd / .mermaid, .html
// A folder's optional manifest.json (with a `diagrams` array) supplies titles.
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('diagrams');
const TYPES = { '.excalidraw': 'excalidraw', '.mmd': 'mermaid', '.mermaid': 'mermaid', '.html': 'html' };

const prettify = (s) =>
  s.replace(/^\d+[-_]/, '').replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; }
}

async function titleFor(file, type, manifestTitles) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (manifestTitles.has(rel)) return manifestTitles.get(rel);
  const base = path.basename(file, path.extname(file));
  if (type === 'html') {
    const m = (await readFile(file, 'utf8')).match(/<title>([^<]+)<\/title>/i);
    if (m) return m[1].trim();
  }
  if (type === 'mermaid') {
    const m = (await readFile(file, 'utf8')).match(/^\s*(?:%%\s*title:|title:)\s*(.+)$/m);
    if (m) return m[1].trim();
  }
  return prettify(base);
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const collections = new Map();
for (const file of (await walk(ROOT)).sort()) {
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) continue;
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const collection = rel.includes('/') ? rel.split('/')[0] : 'general';

  if (!collections.has(collection)) {
    const manifest = await readJson(path.join(ROOT, collection, 'manifest.json'));
    const titles = new Map();
    for (const d of manifest?.diagrams ?? []) {
      for (const key of ['excalidraw', 'mermaid', 'html', 'file']) {
        if (d[key]) titles.set(`${collection}/${d[key]}`, d.title);
      }
    }
    collections.set(collection, {
      id: collection,
      title: manifest?.title ?? manifest?.diagrams?.[0]?.section ?? prettify(collection),
      titles,
      diagrams: [],
    });
  }
  const c = collections.get(collection);
  const { mtimeMs } = await stat(file);
  c.diagrams.push({
    id: rel.replace(/\.[^.]+$/, ''),
    title: await titleFor(file, type, c.titles),
    type,
    path: rel,
    updated: new Date(mtimeMs).toISOString(),
  });
}

const index = {
  generated: new Date().toISOString(),
  // `examples` sorts last so real content leads the side panel.
  collections: [...collections.values()]
    .sort((a, b) => (a.id === 'examples') - (b.id === 'examples') || a.id.localeCompare(b.id))
    .map(({ titles, ...c }) => c),
};
await writeFile(path.join(ROOT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
const n = index.collections.reduce((s, c) => s + c.diagrams.length, 0);
console.log(`diagrams/index.json: ${n} diagrams in ${index.collections.length} collections`);
