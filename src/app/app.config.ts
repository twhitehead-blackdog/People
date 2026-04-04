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
import { portalRoutes } from './portal.routes';
import { isPortalDomain } from './utils/domain.utils';
import { apiUrlInterceptor } from './interceptors/api-url.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { httpInterceptor } from './interceptors/http.interceptor';
import { EmployeePortalStore } from './stores/employee-portal.store';
import { JobApplicationsStore } from './stores/job-applications.store';
import { PositionsStore } from './stores/positions.store';
import { RecruitmentRulesStore } from './stores/recruitment-rules.store';
import { RecruitmentClassificationsStore } from './stores/recruitment-classifications.store';
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
      isPortalDomain() ? portalRoutes : appRoutes,
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
        // Usar origin dinámico para soportar múltiples dominios (people, portal, localhost)
        redirect_uri: window.location.origin,
        audience: getEnv('ENV_AUTH0_AUDIENCE') ?? '',
      },
      useRefreshTokens: true,
      cacheLocation: 'localstorage',
      // @ts-ignore - onRedirectCallback is valid in this version
      onRedirectCallback: (appState: any) => {
        // Después del login, redirigir a returnTo si existe (ej: dashboards.blackdogpanama.com)
        const returnTo = (appState?.returnTo as string | undefined)
          || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('auth_returnTo') : null)
          || null;
        if (returnTo && returnTo.startsWith('https://') && returnTo.includes('blackdogpanama.com')) {
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('auth_returnTo');
          window.location.href = '/api/auth/issue-session?returnTo=' + encodeURIComponent(returnTo);
        }
      },
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
    // Stores para el módulo de Feria de Empleo y Reclutamiento
    PositionsStore,
    JobApplicationsStore,
    RecruitmentRulesStore,
    RecruitmentClassificationsStore,
    // Store para el Portal de Empleados
    EmployeePortalStore,
  ],
};
