import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: true, // Permite todos los hosts (incluye Railway)
    host: '0.0.0.0',
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    allowedHosts: true,
  },
});
