import CodeMirror from '@uiw/react-codemirror';

// Code editor on the left, live preview on the right. `view` picks
// code-only, split, or preview-only.
export default function CodeSplit({ value, onChange, extensions, theme, view, children }) {
  return (
    <div className={`split view-${view}`}>
      <div className="pane code">
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={extensions}
          theme={theme}
          height="100%"
          basicSetup={{ foldGutter: true, highlightActiveLine: true }}
        />
      </div>
      <div className="pane preview">{children}</div>
    </div>
  );
}
