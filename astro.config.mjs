import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  vite: {
    server: {
      allowedHosts: [
        'jakoblangtry.com',
        'www.jakoblangtry.com',
        'jjalangtry.com',
        'www.jjalangtry.com'
      ]
    },
    preview: {
      allowedHosts: [
        'jakoblangtry.com',
        'www.jakoblangtry.com',
        'jjalangtry.com',
        'www.jjalangtry.com'
      ]
    }
  }
});
