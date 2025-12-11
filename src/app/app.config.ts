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
import { AdoptionRequirementsStore } from './stores/adoption-requirements.store';
import { FAQStore } from './stores/faq.store';
import { EventsStore } from './stores/events.store';
import { AdoptiveFamiliesStore } from './stores/adoptive-families.store';
import { PartnersStore } from './stores/partners.store';
import { PetInterestsStore } from './stores/pet-interests.store';
import { AuditLogsStore } from './stores/audit-logs.store';
import { AdminUsersStore } from './stores/admin-users.store';
import { SystemSettingsStore } from './stores/system-settings.store';
import { PersonalityTraitsStore } from './stores/personality-traits.store';
// Importar web components de Phosphor Icons para registrarlos globalmente
import '@phosphor-icons/webcomponents';
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
        // IMPORTANTE: El redirect_uri debe coincidir EXACTAMENTE con el configurado en Auth0 Dashboard
        // Usar ENV_APP_URL si está disponible, de lo contrario usar window.location.origin
        redirect_uri: (() => {
          // Priorizar ENV_APP_URL si está definido (más confiable)
          const envUrl = process.env['ENV_APP_URL'];
          if (envUrl) {
            // Asegurar que no tenga barra final
            return envUrl.replace(/\/$/, '');
          }
          
          // Fallback a window.location.origin si está disponible
          if (typeof window !== 'undefined' && window.location) {
            return window.location.origin;
          }
          
          // Último fallback
          return 'http://localhost:3000';
        })(),
        // Audience solo se incluye si está configurado (opcional para aplicaciones SPA)
        ...(process.env['ENV_AUTH0_AUDIENCE'] ? { audience: process.env['ENV_AUTH0_AUDIENCE'] } : {}),
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
    AdoptionRequirementsStore,
    FAQStore,
    EventsStore,
    AdoptiveFamiliesStore,
    PartnersStore,
    PetInterestsStore,
    AuditLogsStore,
    AdminUsersStore,
    SystemSettingsStore,
    PersonalityTraitsStore,
  ],
};
