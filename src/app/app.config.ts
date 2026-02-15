import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-MX';
import {
  ApplicationConfig,
  LOCALE_ID,
} from '@angular/core';
import { getEnv } from './utils/env.utils';
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
import { provideAuth0 } from '@auth0/auth0-angular';
import { definePreset } from '@primeng/themes';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import es from '../../public/i18n/es.json';
import { appRoutes } from './app.routes';
import { apiUrlInterceptor } from './interceptors/api-url.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { httpInterceptor } from './interceptors/http.interceptor';
import { EmployeePortalStore } from './stores/employee-portal.store';
import { JobApplicationsStore } from './stores/job-applications.store';
import { PositionsStore } from './stores/positions.store';
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withViewTransitions()
    ),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([apiUrlInterceptor, httpInterceptor, errorInterceptor])
    ),
    provideAuth0({
      domain: getEnv('ENV_AUTH0_DOMAIN') ?? '',
      clientId: getEnv('ENV_AUTH0_CLIENT_ID') ?? '',
      authorizationParams: {
        // En desarrollo, siempre usar localhost para Auth0 (requisito de seguridad)
        // El servidor escucha en 0.0.0.0 para permitir acceso desde dispositivos móviles
        redirect_uri: getEnv('ENV_APP_URL') ?? 'http://localhost:4200',
        audience: getEnv('ENV_AUTH0_AUDIENCE') ?? '',
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
    // Servicios de PrimeNG deben estar antes de los stores
    MessageService,
    ConfirmationService,
    // Stores para el módulo de Feria de Empleo
    PositionsStore,
    JobApplicationsStore,
    // Store para el Portal de Empleados
    EmployeePortalStore,
  ],
};
