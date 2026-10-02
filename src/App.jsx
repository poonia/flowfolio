import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearDraft, download, draftPaths, getDraft, getLocalDiagrams, setDraft, setLocalDiagrams,
} from './drafts.js';
import { template, TYPES } from './templates.js';
import { useColorScheme } from './useColorScheme.js';

const EDITORS = {
  excalidraw: lazy(() => import('./editors/ExcalidrawEditor.jsx')),
  mermaid: lazy(() => import('./editors/MermaidEditor.jsx')),
  html: lazy(() => import('./editors/HtmlEditor.jsx')),
};

const BASE = import.meta.env.BASE_URL;
const LOCAL_COLLECTION = 'local';

const idFromHash = () => decodeURIComponent(window.location.hash.replace(/^#\/?/, ''));

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
}

export default function App() {
  const theme = useColorScheme();
  const [index, setIndex] = useState(null);
  const [indexError, setIndexError] = useState(null);
  const [localDiagrams, setLocal] = useState(getLocalDiagrams);
  const [selectedId, setSelectedId] = useState(idFromHash);
  const [query, setQuery] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [edited, setEdited] = useState(() => new Set(draftPaths()));
  const [doc, setDoc] = useState(null); // { diagram, original, initial, key }
  const [docError, setDocError] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem('flowfolio:view') || 'split');
  const [creating, setCreating] = useState(false);
  const contentRef = useRef('');

  useEffect(() => {
    fetch(`${BASE}index.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setIndex)
      .catch((e) => setIndexError(e.message));
  }, []);

  useEffect(() => {
    const onHash = () => { setSelectedId(idFromHash()); setNavOpen(false); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => { try { localStorage.setItem('flowfolio:view', view); } catch {} }, [view]);

  const collections = useMemo(() => {
    const list = index?.collections ?? [];
    if (!localDiagrams.length) return list;
    return [...list, { id: LOCAL_COLLECTION, title: 'Created in browser', diagrams: localDiagrams }];
  }, [index, localDiagrams]);

  const all = useMemo(() => collections.flatMap((c) => c.diagrams), [collections]);
  const selected = all.find((d) => d.id === selectedId) ?? null;

  // Pick the first diagram when nothing (or something stale) is in the URL.
  useEffect(() => {
    if (index && !selected && all.length) window.location.replace(`#/${all[0].id}`);
  }, [index, selected, all]);

  // Load the selected diagram: browser draft first, then the published file.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setDocError(null);
    const load = selected.local
      ? Promise.resolve(selected.original)
      : fetch(`${BASE}${selected.path}`, { cache: 'no-cache' }).then((r) =>
          r.ok ? r.text() : Promise.reject(new Error(`Could not load ${selected.path} (HTTP ${r.status})`)));
    load
      .then((original) => {
        if (cancelled) return;
        const initial = getDraft(selected.path) ?? original;
        contentRef.current = initial;
        setDoc({ diagram: selected, original, initial, key: `${selected.path}:${Date.now()}` });
      })
      .catch((e) => !cancelled && setDocError(e.message));
    return () => { cancelled = true; };
  }, [selected?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = useCallback((content) => {
    if (!doc) return;
    contentRef.current = content;
    const path = doc.diagram.path;
    const isEdited = content !== doc.original;
    if (isEdited) setDraft(path, content);
    else clearDraft(path);
    setEdited((prev) => {
      if (prev.has(path) === isEdited) return prev;
      const next = new Set(prev);
      isEdited ? next.add(path) : next.delete(path);
      return next;
    });
  }, [doc]);

  const resetDoc = () => {
    if (!doc || !window.confirm('Discard your local edits and restore the published version?')) return;
    clearDraft(doc.diagram.path);
    setEdited((prev) => { const n = new Set(prev); n.delete(doc.diagram.path); return n; });
    contentRef.current = doc.original;
    setDoc({ ...doc, initial: doc.original, key: `${doc.diagram.path}:${Date.now()}` });
  };

  const downloadDoc = () => {
    if (!doc) return;
    const { diagram } = doc;
    download(diagram.path.split('/').pop(), contentRef.current, TYPES[diagram.type].mime);
  };

  const createDiagram = (type, title) => {
    const base = slugify(title);
    let name = base;
    for (let i = 2; all.some((d) => d.id === `${LOCAL_COLLECTION}/${name}`); i++) name = `${base}-${i}`;
    const diagram = {
      id: `${LOCAL_COLLECTION}/${name}`,
      title,
      type,
      path: `${LOCAL_COLLECTION}/${name}${TYPES[type].ext}`,
      local: true,
      original: template(type, title),
    };
    const next = [...localDiagrams, diagram];
    setLocal(next);
    setLocalDiagrams(next);
    setCreating(false);
    window.location.hash = `#/${diagram.id}`;
  };

  const deleteLocal = () => {
    if (!doc?.diagram.local || !window.confirm(`Delete "${doc.diagram.title}" from this browser?`)) return;
    clearDraft(doc.diagram.path);
    const next = localDiagrams.filter((d) => d.id !== doc.diagram.id);
    setLocal(next);
    setLocalDiagrams(next);
    setDoc(null);
    window.location.hash = '';
  };

  const q = query.trim().toLowerCase();
  const filtered = collections
    .map((c) => ({
      ...c,
      diagrams: c.diagrams.filter((d) => !q || d.title.toLowerCase().includes(q) || d.type.includes(q)),
    }))
    .filter((c) => c.diagrams.length);

  const Editor = doc ? EDITORS[doc.diagram.type] : null;
  const isEdited = doc && edited.has(doc.diagram.path) && !doc.diagram.local;
  const codeView = doc && doc.diagram.type !== 'excalidraw';

  return (
    <div className={`app ${navOpen ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <span>Flowfolio</span>
          <button className="btn small new" onClick={() => setCreating(true)} title="New diagram">+ New</button>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Filter diagrams…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <nav className="list">
          {indexError && <p className="muted pad">Couldn’t load diagram index ({indexError}).</p>}
          {!index && !indexError && <p className="muted pad">Loading…</p>}
          {index && !filtered.length && <p className="muted pad">No diagrams match.</p>}
          {filtered.map((c) => (
            <section key={c.id}>
              <h2>{c.title}</h2>
              <ul>
                {c.diagrams.map((d) => (
                  <li key={d.id}>
                    <a href={`#/${d.id}`} className={d.id === selectedId ? 'active' : ''} title={d.title}>
                      <span className={`chip t-${d.type}`}>{TYPES[d.type].short}</span>
                      <span className="title">{d.title}</span>
                      {edited.has(d.path) && !d.local && <span className="dot" title="Edited in this browser" />}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
        <footer className="muted">
          Edits are saved in this browser. Download a file to commit it.
        </footer>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} />

      <main className="main">
        <header className="toolbar">
          <button className="btn icon menu" onClick={() => setNavOpen(true)} aria-label="Show diagrams">☰</button>
          {doc && (
            <>
              <div className="doc-title">
                <span className={`chip t-${doc.diagram.type}`}>{TYPES[doc.diagram.type].label}</span>
                <h1>{doc.diagram.title}</h1>
                {isEdited && <span className="badge">Edited locally</span>}
                {doc.diagram.local && <span className="badge">Browser only</span>}
              </div>
              <div className="actions">
                {codeView && (
                  <div className="seg" role="group" aria-label="View">
                    {['code', 'split', 'preview'].map((v) => (
                      <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
                        {v[0].toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
                {isEdited && <button className="btn" onClick={resetDoc}>Reset</button>}
                {doc.diagram.local && <button className="btn" onClick={deleteLocal}>Delete</button>}
                <button className="btn primary" onClick={downloadDoc}>Download</button>
              </div>
            </>
          )}
        </header>

        <div className="stage">
          {docError && <div className="empty">{docError}</div>}
          {!docError && !doc && <div className="empty muted">{index ? 'Select a diagram' : ''}</div>}
          {!docError && doc && (
            <Suspense fallback={<div className="empty muted">Loading {TYPES[doc.diagram.type].label} editor…</div>}>
              <Editor key={doc.key} initial={doc.initial} onChange={onChange} theme={theme} view={view} />
            </Suspense>
          )}
        </div>
      </main>

      {creating && <NewDiagramDialog onCreate={createDiagram} onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewDiagramDialog({ onCreate, onClose }) {
  const [type, setType] = useState('excalidraw');
  const [title, setTitle] = useState('');
  return (
    <div className="modal" onClick={onClose}>
      <form
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onCreate(type, title.trim() || 'Untitled'); }}
      >
        <h2>New diagram</h2>
        <label>
          Title
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
        </label>
        <fieldset>
          <legend>Editor</legend>
          {Object.entries(TYPES).map(([key, t]) => (
            <label key={key} className={`option ${type === key ? 'on' : ''}`}>
              <input type="radio" name="type" value={key} checked={type === key} onChange={() => setType(key)} />
              <span className={`chip t-${key}`}>{t.short}</span> {t.label}
            </label>
          ))}
        </fieldset>
        <p className="muted small-text">Stored in this browser until you download it and add it to <code>diagrams/</code>.</p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Create</button>
        </div>
      </form>
    </div>
  );
}
