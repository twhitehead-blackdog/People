import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-MX';
import {
  ApplicationConfig,
  importProvidersFrom,
  isDevMode,
  LOCALE_ID,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  provideRouter,
  withComponentInputBinding,
  withDisabledInitialNavigation,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import Aura from '@primeng/themes/aura';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAuth0 } from '@auth0/auth0-angular';
import { AuthService } from '@auth0/auth0-angular';
import { definePreset } from '@primeng/themes';
import { Provider, FactoryProvider } from '@angular/core';
import { Observable, of } from 'rxjs';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import es from '../../public/i18n/es.json';
import { appRoutes } from './app.routes';
import { httpInterceptor } from './interceptors/http.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
registerLocaleData(localeEs, 'es-MX');

// Factory para Auth0 que se ejecuta en runtime
// Esto permite verificar el origen seguro cuando la aplicación se carga
function createAuth0Providers(): Provider[] {
  // Verificar si estamos en un origen seguro (se ejecuta en runtime)
  if (typeof window === 'undefined') {
    // SSR - usar configuración normal
    return provideAuth0({
      domain: process.env['ENV_AUTH0_DOMAIN'] ?? '',
      clientId: process.env['ENV_AUTH0_CLIENT_ID'] ?? '',
      authorizationParams: {
        redirect_uri: process.env['ENV_APP_URL'] || 'http://localhost:4200',
        audience: process.env['ENV_AUTH0_AUDIENCE'] ?? '',
      },
      httpInterceptor: { allowedList: ['*'] },
      skipRedirectCallback: false,
      useRefreshTokens: false,
      cacheLocation: 'localstorage' as const,
    });
  }

  const isSecureOrigin = 
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!isSecureOrigin) {
    // IP local sin HTTPS - usar AuthService mock
    console.warn('⚠️ Acceso desde IP local sin HTTPS - Auth0 deshabilitado. Usa localhost para autenticación completa.');
    const mockAuthService: Partial<AuthService> = {
      isAuthenticated$: of(false) as Observable<boolean>,
      user$: of(null) as Observable<any>,
      loginWithRedirect: () => Promise.resolve(),
      logout: () => Promise.resolve(),
      getAccessTokenSilently: () => Promise.resolve(''),
      handleRedirectCallback: () => Promise.resolve(),
    };
    return [
      { provide: AuthService, useValue: mockAuthService },
    ];
  }

  // Origen seguro - usar Auth0 real
  return provideAuth0({
    domain: process.env['ENV_AUTH0_DOMAIN'] ?? '',
    clientId: process.env['ENV_AUTH0_CLIENT_ID'] ?? '',
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: process.env['ENV_AUTH0_AUDIENCE'] ?? '',
    },
    httpInterceptor: { allowedList: ['*'] },
    skipRedirectCallback: false,
    useRefreshTokens: false,
    cacheLocation: 'localstorage' as const,
  });
}

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

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withDisabledInitialNavigation(),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withViewTransitions()
    ),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([httpInterceptor, errorInterceptor])),
    // Auth0 condicional - solo se inicializa en orígenes seguros
    // En IP local, usa un AuthService mock
    ...createAuth0Providers(),
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
    importProvidersFrom(
      NgxSpinnerModule.forRoot({ type: 'ball-scale-multiple' })
    ),
  ],
};
