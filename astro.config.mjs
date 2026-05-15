import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://goodgithub.pages.dev',
  output: 'static',
  build: { format: 'directory' },
});
