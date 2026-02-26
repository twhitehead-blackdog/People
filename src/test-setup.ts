import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { TextDecoder, TextEncoder } from 'util';

// Make this file a module
export {};

// @ts-expect-error https://thymikee.github.io/jest-preset-angular/docs/getting-started/test-environment
globalThis.ngJest = {
  testEnvironmentOptions: {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  },
};

// Inicializa el entorno de pruebas de Angular para Jest (TestBed, Zone.js, etc.)
setupZoneTestEnv();

declare global {
  interface Window {
    process: {
      env: {
        ENV_APP_URL: string;
        ENV_SUPABASE_URL: string;
        ENV_SUPABASE_API_KEY: string;
        ENV_SUPABASE_TOKEN: string;
      };
    };
  }
}

window.process = {
  env: {
    ENV_APP_URL: 'http://localhost:4200',
    ENV_SUPABASE_URL: 'https://fsrptlzaqjkcutoiivjr.supabase.co',
    ENV_SUPABASE_API_KEY: 'your-public',
    ENV_SUPABASE_TOKEN: '',
  },
};

// Polyfill para librerías (ej: Auth0) que requieren TextEncoder/TextDecoder en Jest/Node
(globalThis as any).TextEncoder ??= TextEncoder;
(globalThis as any).TextDecoder ??= TextDecoder;

// jest-preset-angular 15.0.0+ handles setup automatically via preset
// No manual import needed
