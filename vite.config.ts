import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { optimizeCss } from 'carbon-preprocess-svelte';

export default defineConfig({
  plugins: [svelte(), optimizeCss()],
  base: './',
  build: {
    outDir: 'app/src/main/assets/dist',
    emptyOutDir: true
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0',
    watch: { ignored: ['**/src-tauri/**'] }
  }
});
