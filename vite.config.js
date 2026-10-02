import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps asset URLs relative, so the build works at
// https://<user>.github.io/<repo>/ without hard-coding the repo name.
// Everything in diagrams/ is served as-is next to the app.
export default defineConfig({
  base: './',
  publicDir: 'diagrams',
  plugins: [react()],
  define: { 'process.env.IS_PREACT': JSON.stringify('false') },
  build: { chunkSizeWarningLimit: 4000 },
});
