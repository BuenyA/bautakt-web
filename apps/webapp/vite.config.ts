import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    /**
     * ⚠️ Ohne diese Zeile bekommt eine Abhaengigkeit, die ueber `packages/ui`
     * hereinkommt (z. B. sonner), eine ZWEITE React-Instanz — sichtbar als
     * „Cannot read properties of null (reading 'useState')" und weisser Seite.
     * Im Monorepo aufloesen beide Pfade auf dieselbe Datei nur, wenn man es
     * hier erzwingt.
     */
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
  },
});
