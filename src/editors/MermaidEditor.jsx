import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { mermaid as mermaidLang } from 'codemirror-lang-mermaid';
import CodeSplit from './CodeSplit.jsx';

const extensions = [mermaidLang()];
let renderSeq = 0;

// Mermaid emits width="100%" + max-width, which shrinks inside the scroll
// container. Pin the SVG to its natural size so zoom is predictable.
function naturalSize(svg) {
  const vb = svg.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);
  if (!vb) return svg;
  return svg.replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1')
    .replace(/<svg([^>]*?)\sstyle="[^"]*"/, '<svg$1')
    .replace('<svg', `<svg width="${vb[1]}" height="${vb[2]}"`);
}

export default function MermaidEditor({ initial, onChange, theme, view }) {
  const [code, setCode] = useState(initial);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState('fit'); // 'fit' or a scale factor
  const latest = useRef(0);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default', securityLevel: 'strict' });
    const seq = ++renderSeq;
    latest.current = seq;
    const t = setTimeout(async () => {
      try {
        const { svg } = await mermaid.render(`mmd-${seq}`, code);
        if (latest.current === seq) { setSvg(naturalSize(svg)); setError(null); }
      } catch (e) {
        // Keep the last good render visible and show the parse error over it.
        if (latest.current === seq) setError(String(e?.message ?? e));
        document.getElementById(`dmmd-${seq}`)?.remove();
      }
    }, 250);
    return () => clearTimeout(t);
  }, [code, theme]);

  return (
    <CodeSplit
      value={code}
      onChange={(v) => { setCode(v); onChange(v); }}
      extensions={extensions}
      theme={theme}
      view={view}
    >
      <div className="mermaid-preview">
        <div className="zoom">
          <button onClick={() => setZoom((z) => Math.max(0.25, (z === 'fit' ? 1 : z) - 0.25))} aria-label="Zoom out">−</button>
          <button onClick={() => setZoom((z) => (z === 'fit' ? 1 : 'fit'))} title="Toggle fit / 100%">
            {zoom === 'fit' ? 'Fit' : `${Math.round(zoom * 100)}%`}
          </button>
          <button onClick={() => setZoom((z) => Math.min(4, (z === 'fit' ? 1 : z) + 0.25))} aria-label="Zoom in">+</button>
        </div>
        <div
          className={`mermaid-canvas ${zoom === 'fit' ? 'fit' : ''}`}
          style={zoom === 'fit' ? undefined : { zoom }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {error && <pre className="error">{error}</pre>}
      </div>
    </CodeSplit>
  );
}
