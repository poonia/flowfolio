// Edits made in the browser are kept as drafts in localStorage, keyed by
// diagram path. GitHub Pages is static, so "saving" back to the repo means
// downloading the file and committing it.
const PREFIX = 'flowfolio:draft:';
const LOCAL_KEY = 'flowfolio:local-diagrams';

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

export const getDraft = (path) => safe(() => localStorage.getItem(PREFIX + path), null);
export const setDraft = (path, content) => safe(() => localStorage.setItem(PREFIX + path, content));
export const clearDraft = (path) => safe(() => localStorage.removeItem(PREFIX + path));
export const draftPaths = () =>
  safe(() => Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).map((k) => k.slice(PREFIX.length)), []);

// Diagrams created in the browser (not in the repo yet).
export const getLocalDiagrams = () => safe(() => JSON.parse(localStorage.getItem(LOCAL_KEY)) ?? [], []);
export const setLocalDiagrams = (list) => safe(() => localStorage.setItem(LOCAL_KEY, JSON.stringify(list)));

export function download(filename, content, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
