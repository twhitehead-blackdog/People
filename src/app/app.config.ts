import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-MX';
import {
  ApplicationConfig,
  importProvidersFrom,
  LOCALE_ID,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  provideRouter,
  withComponentInputBinding,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import Aura from '@primeng/themes/aura';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { definePreset } from '@primeng/themes';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { provideAuth0 } from '@auth0/auth0-angular';
import es from '../../public/i18n/es.json';
import { appRoutes } from './app.routes';
import { httpInterceptor } from './interceptors/http.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { FoundationsStore } from './stores/foundations.store';
import { PetsStore } from './stores/pets.store';
import { AdoptionApplicationsStore } from './stores/adoption-applications.store';
registerLocaleData(localeEs, 'es-MX');

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{yellow.50}',
      100: '{yellow.100}',
      200: '{yellow.200}',
      300: '{yellow.300}',
      400: '{yellow.400}',
      500: '{yellow.500}',
      600: '{yellow.600}',
      700: '{yellow.700}',
      800: '{yellow.800}',
      900: '{yellow.900}',
      950: '{yellow.950}',
    },
  },
});

// Debug: Verificar variables de entorno de Auth0
if (typeof window !== 'undefined') {
  console.log('🔍 [Auth0 Config Debug] Variables de entorno:');
  console.log('  - ENV_AUTH0_DOMAIN:', process.env['ENV_AUTH0_DOMAIN'] || 'NO DEFINIDO');
  console.log('  - ENV_AUTH0_CLIENT_ID:', process.env['ENV_AUTH0_CLIENT_ID'] || 'NO DEFINIDO');
  console.log('  - ENV_AUTH0_AUDIENCE:', process.env['ENV_AUTH0_AUDIENCE'] || 'NO DEFINIDO (esto está bien si no usas API)');
  console.log('  - ENV_APP_URL:', process.env['ENV_APP_URL'] || 'NO DEFINIDO');
  console.log('  - window.location.origin:', window.location.origin);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withViewTransitions()
    ),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([httpInterceptor, errorInterceptor])),
    provideAuth0({
      domain: process.env['ENV_AUTH0_DOMAIN'] ?? '',
      clientId: process.env['ENV_AUTH0_CLIENT_ID'] ?? '',
      authorizationParams: {
        // IMPORTANTE: El redirect_uri debe coincidir EXACTAMENTE con el configurado en Auth0 Dashboard
        // Usar ENV_APP_URL si está disponible, de lo contrario usar window.location.origin
        redirect_uri: (() => {
          // Priorizar ENV_APP_URL si está definido (más confiable)
          const envUrl = process.env['ENV_APP_URL'];
          if (envUrl) {
            // Asegurar que no tenga barra final
            const cleanUrl = envUrl.replace(/\/$/, '');
            console.log('🔍 [Auth0 Config] redirect_uri desde ENV_APP_URL:', cleanUrl);
            return cleanUrl;
          }
          
          // Fallback a window.location.origin si está disponible
          if (typeof window !== 'undefined' && window.location) {
            const origin = window.location.origin;
            console.log('🔍 [Auth0 Config] redirect_uri desde window.location.origin:', origin);
            return origin;
          }
          
          // Último fallback
          const fallback = 'http://localhost:3000';
          console.log('🔍 [Auth0 Config] redirect_uri usando fallback:', fallback);
          return fallback;
        })(),
        // Audience solo se incluye si está configurado (opcional para aplicaciones SPA)
        ...(process.env['ENV_AUTH0_AUDIENCE'] ? (() => {
          const audience = process.env['ENV_AUTH0_AUDIENCE'];
          console.log('⚠️ [Auth0 Config] AUDIENCE CONFIGURADO:', audience);
          return { audience };
        })() : (() => {
          console.log('✅ [Auth0 Config] No se usará audience (normal para SPA sin API)');
          return {};
        })()),
      },
      useRefreshTokens: true,
      cacheLocation: 'localstorage',
    }),
    providePrimeNG({
      theme: {
        preset: MyPreset,
        options: {
          darkModeSelector: 'html.dark',
          cssLayer: {
            name: 'primeng',
            order:
              'tw-base, primeng, tw-components, tw-utilities, tw-variants;',
          },
        },
      },
      translation: es,
    }),
    provideCharts(withDefaultRegisterables()),
    { provide: LOCALE_ID, useValue: 'es-MX' },
    MessageService,
    ConfirmationService,
    importProvidersFrom(
      NgxSpinnerModule.forRoot({ type: 'ball-scale-multiple' })
    ),
    // Stores de adopciones
    FoundationsStore,
    PetsStore,
    AdoptionApplicationsStore,
  ],
};
