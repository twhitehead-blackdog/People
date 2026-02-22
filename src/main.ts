import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Log de inicio solo en desarrollo
if (isDevMode()) {
  console.log('🚀 Iniciando aplicación en modo desarrollo...');
  console.log('📊 Supabase URL:', process.env['ENV_SUPABASE_URL']);
}

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  console.error('Error fatal al iniciar aplicación:', err);
});

// Register service worker for PWA (portal usa su propio SW)
if (!isDevMode() && 'serviceWorker' in navigator) {
  const swFile = window.location.hostname === 'portal.blackdogpanama.com'
    ? '/portal-sw.js'
    : '/sw.js';
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swFile).catch(() => {});
  });
}
