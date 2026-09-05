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
    port: 3000,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true
  },
  preview: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true
  }
});
