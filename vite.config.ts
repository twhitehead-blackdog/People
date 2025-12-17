import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: [
      'people-production.up.railway.app',
      '.railway.app', // Permite todos los subdominios de Railway
      'localhost',
      '127.0.0.1',
    ],
    host: '0.0.0.0',
  },
});

