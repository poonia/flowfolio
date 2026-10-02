export const TYPES = {
  excalidraw: { label: 'Excalidraw', short: 'EX', ext: '.excalidraw', mime: 'application/json' },
  mermaid: { label: 'Mermaid', short: 'MM', ext: '.mmd', mime: 'text/plain' },
  html: { label: 'HTML', short: 'HT', ext: '.html', mime: 'text/html' },
};

export function template(type, title) {
  if (type === 'excalidraw') {
    return JSON.stringify({ type: 'excalidraw', version: 2, source: 'flowfolio', elements: [], appState: {}, files: {} }, null, 2);
  }
  if (type === 'mermaid') {
    return `%% title: ${title}\nflowchart TD\n  A[Start] --> B{Decision}\n  B -- yes --> C[Do it]\n  B -- no --> D[Skip]\n`;
  }
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${title}</title>\n<style>\n  body { font-family: system-ui, sans-serif; margin: 32px; }\n</style>\n</head>\n<body>\n  <h1>${title}</h1>\n</body>\n</html>\n`;
}
