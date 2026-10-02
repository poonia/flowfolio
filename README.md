# Flowfolio

A GitHub Pages app for browsing and editing diagrams. Every diagram in
`diagrams/` shows up in the side panel; click one to open it in its own editor:

| Type | Files | Editor |
|---|---|---|
| Excalidraw | `.excalidraw` | Full Excalidraw canvas |
| Mermaid | `.mmd`, `.mermaid` | Code editor + live preview (zoom / fit) |
| HTML page | `.html` | Code editor + sandboxed live preview |

Mermaid and HTML have **Code / Split / Preview** views. Links are shareable:
`…/#/phase2-diagrams/excalidraw/00-overview`.

## Editing and saving

GitHub Pages is static, so edits are kept **in your browser** (localStorage)
as drafts. Edited diagrams show a dot in the side panel and an *Edited locally*
badge. **Download** gives you the updated file to commit back into
`diagrams/`; **Reset** throws the draft away. **+ New** creates a diagram in
the browser that you can download and add to the repo.

## Adding diagrams

Drop files anywhere under `diagrams/`. The top-level folder becomes a group in
the side panel. Titles come from, in order:

1. the folder's `manifest.json` (`diagrams[].title`, matched by file path),
2. `<title>` for HTML, a `%% title: …` line for Mermaid,
3. the file name.

`scripts/build-index.mjs` builds `diagrams/index.json` automatically on
`npm run dev` and `npm run build`.

## Run locally

Needs Node 22 (`nvm use`).

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.
One-time setup: in the repo, go to **Settings → Pages → Build and deployment**
and set **Source** to **GitHub Actions**.
