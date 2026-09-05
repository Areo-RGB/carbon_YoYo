import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { optimizeCss } from 'carbon-preprocess-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte(), optimizeCss()],
  resolve: {
    alias: {
      $lib: resolve('./src/lib')
    }
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: false,
    host: '0.0.0.0'
  }
});
