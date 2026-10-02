import { useEffect, useState } from 'react';
import { html } from '@codemirror/lang-html';
import CodeSplit from './CodeSplit.jsx';

const extensions = [html()];

export default function HtmlEditor({ initial, onChange, theme, view }) {
  const [code, setCode] = useState(initial);
  const [rendered, setRendered] = useState(initial);

  // Debounce iframe reloads while typing.
  useEffect(() => {
    const t = setTimeout(() => setRendered(code), 300);
    return () => clearTimeout(t);
  }, [code]);

  return (
    <CodeSplit
      value={code}
      onChange={(v) => { setCode(v); onChange(v); }}
      extensions={extensions}
      theme={theme}
      view={view}
    >
      {/* No allow-same-origin: page scripts run, but can't touch the app or its storage. */}
      <iframe title="HTML preview" className="html-frame" sandbox="allow-scripts allow-popups allow-forms" srcDoc={rendered} />
    </CodeSplit>
  );
}
