import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Log de inicio solo en desarrollo
if (isDevMode()) {
  console.log('🚀 Iniciando aplicación en modo desarrollo...');
  console.log('📊 Supabase URL:', process.env['ENV_SUPABASE_URL']);
}

bootstrapApplication(AppComponent, appConfig).catch((err: unknown) => {
  console.error('Error fatal al iniciar aplicación:', err);
  // En producción, aquí se podría mostrar una página de error amigable
});
