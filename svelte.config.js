import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { optimizeImports } from 'carbon-preprocess-svelte';

export default {
  preprocess: [vitePreprocess({ script: true }), optimizeImports()]
};
