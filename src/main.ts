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

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  console.error('Error fatal al iniciar aplicación:', err);
  // En producción, aquí se podría mostrar una página de error amigable
});
