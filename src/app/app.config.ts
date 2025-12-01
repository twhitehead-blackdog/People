import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-MX';
import {
  ApplicationConfig,
  importProvidersFrom,
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
import { definePreset } from '@primeng/themes';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import es from '../../public/i18n/es.json';
import { appRoutes } from './app.routes';
import { httpInterceptor } from './interceptors/http.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { AuthStore } from './stores/auth.store';
import { BanksStore } from './stores/banks.store';
import { BranchesStore } from './stores/branches.store';
import { CompaniesStore } from './stores/companies.store';
import { DashboardStore } from './stores/dashboard.store';
import { DepartmentsStore } from './stores/departments.store';
import { EmployeesStore } from './stores/employees.store';
import { JobApplicationsStore } from './stores/job-applications.store';
import { PayrollsStore } from './stores/payrolls.store';
import { PositionsStore } from './stores/positions.store';
import { SchedulesStore } from './stores/schedules.store';
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
    provideHttpClient(withInterceptors([httpInterceptor, errorInterceptor])),
    provideAuth0({
      domain: process.env['ENV_AUTH0_DOMAIN'] ?? '',
      clientId: process.env['ENV_AUTH0_CLIENT_ID'] ?? '',
      authorizationParams: {
        redirect_uri: process.env['ENV_APP_URL'],
        audience: process.env['ENV_AUTH0_AUDIENCE'] ?? '',
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
    MessageService,
    ConfirmationService,
    importProvidersFrom(
      NgxSpinnerModule.forRoot({ type: 'ball-scale-multiple' })
    ),
    // Stores proporcionados a nivel de aplicación
    // Orden importante: stores base primero, luego los que dependen de ellos
    AuthStore,
    CompaniesStore,
    BranchesStore,
    DepartmentsStore,
    PositionsStore,
    BanksStore,
    SchedulesStore,
    PayrollsStore,
    EmployeesStore,
    JobApplicationsStore,
    DashboardStore,
  ],
};
