import { useMemo, useRef } from 'react';
import { Excalidraw, restore, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const sceneVersion = (elements) => elements.reduce((sum, el) => sum + el.version, elements.length);

export default function ExcalidrawEditor({ initial, onChange, theme }) {
  const initialData = useMemo(() => {
    let data = {};
    try { data = JSON.parse(initial); } catch { /* empty canvas */ }
    const restored = restore(data, null, null);
    return { ...restored, appState: { ...restored.appState, collaborators: new Map() }, scrollToContent: true };
  }, [initial]);

  const lastVersion = useRef(sceneVersion(initialData.elements));
  const timer = useRef(null);

  // onChange also fires for selection/scroll; only serialize when elements change.
  const handleChange = (elements, appState, files) => {
    const v = sceneVersion(elements);
    if (v === lastVersion.current) return;
    lastVersion.current = v;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(serializeAsJSON(elements, appState, files, 'local')), 400);
  };

  return (
    <div className="excalidraw-wrap">
      <Excalidraw initialData={initialData} onChange={handleChange} theme={theme} />
    </div>
  );
}
