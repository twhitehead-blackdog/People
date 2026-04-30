import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { getEnv } from './app/utils/env.utils';

// Log de inicio solo en desarrollo
if (isDevMode()) {
  console.log('🚀 Iniciando aplicación en modo desarrollo...');
  console.log('📊 Supabase URL:', getEnv('ENV_SUPABASE_URL'));
}

// Recovery global: si el SDK de Auth0 lanza "Missing Refresh Token" en
// background (cache stale de un build con useRefreshTokens=true), limpiamos
// las entradas @@auth0spa@@ y recargamos. Al volver, silent auth via cookie
// SSO emite un token nuevo sin intervencion del usuario.
if (typeof window !== 'undefined') {
  let recovering = false;
  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    const msg = String((ev?.reason as any)?.message || ev?.reason || '');
    if (!recovering && /Missing Refresh Token/i.test(msg)) {
      recovering = true;
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('@@auth0spa@@')) localStorage.removeItem(k);
        }
      } catch {}
      setTimeout(() => window.location.reload(), 100);
      ev.preventDefault();
    }
  });
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
