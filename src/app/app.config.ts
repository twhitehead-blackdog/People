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
import { PetMatchesStore } from './stores/pet-matches.store';
import { UserPetsStore } from './stores/user-pets.store';
import { PetBreedsStore } from './stores/pet-breeds.store';
import { PetFavoritesStore } from './stores/pet-favorites.store';
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
      domain: (() => {
        // Función helper para limpiar valores (remover comillas y espacios)
        const cleanValue = (val: string | undefined): string => {
          if (!val || val === '' || val === 'undefined') return '';
          // Remover comillas dobles y simples del inicio y final
          let cleaned = val.trim();
          if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
              (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1);
          }
          return cleaned.trim();
        };
        
        const domain = cleanValue(process.env['ENV_AUTH0_DOMAIN']);
        if (!domain || domain === '') {
          console.error('❌ ERROR: ENV_AUTH0_DOMAIN no está configurado. Auth0 no funcionará correctamente.');
          console.error('   Valor recibido:', process.env['ENV_AUTH0_DOMAIN']);
          return '';
        }
        console.log('✅ ENV_AUTH0_DOMAIN configurado:', domain);
        return domain;
      })(),
      clientId: (() => {
        const cleanValue = (val: string | undefined): string => {
          if (!val || val === '' || val === 'undefined') return '';
          let cleaned = val.trim();
          if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
              (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1);
          }
          return cleaned.trim();
        };
        
        const clientId = cleanValue(process.env['ENV_AUTH0_CLIENT_ID']);
        if (!clientId || clientId === '') {
          console.error('❌ ERROR: ENV_AUTH0_CLIENT_ID no está configurado. Auth0 no funcionará correctamente.');
          console.error('   Valor recibido:', process.env['ENV_AUTH0_CLIENT_ID']);
          return '';
        }
        console.log('✅ ENV_AUTH0_CLIENT_ID configurado:', clientId.substring(0, 10) + '...');
        return clientId;
      })(),
      authorizationParams: {
        // IMPORTANTE: El redirect_uri debe coincidir EXACTAMENTE con el configurado en Auth0 Dashboard
        // Usar ENV_APP_URL si está disponible, de lo contrario usar window.location.origin
        redirect_uri: (() => {
          // IMPORTANTE: Auth0 requiere que el redirect_uri coincida EXACTAMENTE con las URLs permitidas
          // Las URLs permitidas en Auth0 son:
          // - https://frontend-dev-production-c157.up.railway.app
          // - https://adoptions-production.up.railway.app/*
          // - http://localhost:4200
          // - http://localhost:4200/*
          //
          // Para que funcione con wildcards, debemos usar window.location.origin en tiempo de ejecución
          // para que coincida exactamente con la URL actual del navegador
          
          // SIEMPRE usar window.location.origin en el navegador para que coincida exactamente
          if (typeof window !== 'undefined' && window.location) {
            const origin = window.location.origin;
            console.log('✅ Usando window.location.origin como redirect_uri:', origin);
            console.log('   Esto asegura que coincida exactamente con la URL actual del navegador');
            return origin;
          }
          
          // Solo usar ENV_APP_URL como fallback si window no está disponible (SSR)
          const cleanValue = (val: string | undefined): string => {
            if (!val || val === '' || val === 'undefined') return '';
            let cleaned = val.trim();
            if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
                (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
              cleaned = cleaned.slice(1, -1);
            }
            return cleaned.trim();
          };
          
          const envUrl = cleanValue(process.env['ENV_APP_URL']);
          if (envUrl && envUrl !== '') {
            const redirectUri = envUrl.replace(/\/$/, '');
            console.warn('⚠️ Usando ENV_APP_URL como fallback (window no disponible):', redirectUri);
            return redirectUri;
          }
          
          // Último fallback
          console.warn('⚠️ No se pudo determinar redirect_uri, usando fallback localhost');
          return 'http://localhost:4200';
        })(),
        // Audience solo se incluye si está configurado (opcional para aplicaciones SPA)
        ...((() => {
          const cleanValue = (val: string | undefined): string => {
            if (!val || val === '' || val === 'undefined') return '';
            let cleaned = val.trim();
            if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
                (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
              cleaned = cleaned.slice(1, -1);
            }
            return cleaned.trim();
          };
          
          const audience = cleanValue(process.env['ENV_AUTH0_AUDIENCE']);
          if (audience && audience !== '') {
            console.log('✅ ENV_AUTH0_AUDIENCE configurado:', audience);
            return { audience };
          }
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
    PetMatchesStore,
    UserPetsStore,
    PetBreedsStore,
    PetFavoritesStore,
  ],
};
