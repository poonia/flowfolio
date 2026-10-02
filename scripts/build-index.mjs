// Lists the diagram files in diagrams/ and writes diagrams/index.json,
// which the app reads to build the side panel.
// Supported: .excalidraw, .mmd / .mermaid, .html
// diagrams/manifest.json (optional) supplies the group title and per-file titles.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('diagrams');
const TYPES = { '.excalidraw': 'excalidraw', '.mmd': 'mermaid', '.mermaid': 'mermaid', '.html': 'html' };

const prettify = (s) =>
  s.replace(/^\d+[-_]/, '').replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

let manifest = {};
try { manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8')); } catch {}
const titles = new Map((manifest.diagrams ?? []).map((d) => [d.file, d.title]));

async function titleFor(file, type) {
  if (titles.has(file)) return titles.get(file);
  if (type === 'html') {
    const m = (await readFile(path.join(ROOT, file), 'utf8')).match(/<title>([^<]+)<\/title>/i);
    if (m) return m[1].trim();
  }
  if (type === 'mermaid') {
    const m = (await readFile(path.join(ROOT, file), 'utf8')).match(/^\s*(?:%%\s*title:|title:)\s*(.+)$/m);
    if (m) return m[1].trim();
  }
  return prettify(path.basename(file, path.extname(file)));
}

const diagrams = [];
for (const file of (await readdir(ROOT)).sort()) {
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) continue;
  diagrams.push({ id: path.basename(file, path.extname(file)), title: await titleFor(file, type), type, path: file });
}

const index = { collections: [{ id: 'diagrams', title: manifest.title ?? 'Diagrams', diagrams }] };
await writeFile(path.join(ROOT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`diagrams/index.json: ${diagrams.length} diagrams`);
