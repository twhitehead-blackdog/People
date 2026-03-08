import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TextDecoder, TextEncoder } from 'util';

// Make this file a module
export {};

// Polyfill para librerías que requieren TextEncoder/TextDecoder en Jest/Node
// Must be set BEFORE any module that uses them (e.g. @auth0/auth0-angular → dpop)
(globalThis as any).TextEncoder ??= TextEncoder;
(globalThis as any).TextDecoder ??= TextDecoder;

// Mock @auth0/auth0-angular globally to avoid InjectionToken auth0.client errors
// and dpop/crypto issues in jsdom. Uses @Injectable({providedIn:'root'}) so
// Angular DI auto-provides MockAuthService anywhere AuthService is injected.
jest.mock('@auth0/auth0-angular', () => {
  const { Injectable } = require('@angular/core');
  const { of } = require('rxjs');

  class MockAuthService {
    user$ = of(null);
    isAuthenticated$ = of(false);
    isLoading$ = of(false);
    idTokenClaims$ = of(null);
    appState$ = of(null);
    error$ = of(null);
    accessToken$ = of('');
    getAccessTokenSilently = () => of('mock-token');
    getAccessTokenWithPopup = () => of('mock-token');
    getIdTokenClaims = () => of(null);
    loginWithRedirect = () => of(void 0);
    loginWithPopup = () => of(void 0);
    logout = () => of(void 0);
    handleRedirectCallback = () => of({ appState: {} });
  }

  // Apply Angular's @Injectable decorator so DI auto-provides it
  Injectable({ providedIn: 'root' })(MockAuthService);

  return {
    __esModule: true,
    AuthService: MockAuthService,
    AuthModule: { forRoot: () => ({ ngModule: class {} }) },
    provideAuth0: () => [],
  };
});

// Mock ng2-charts to avoid chart.js canvas errors in jsdom
jest.mock('ng2-charts', () => {
  const { Directive } = require('@angular/core');
  const MockChart = Directive({
    selector: 'canvas[baseChart]',
    standalone: true,
    inputs: ['data', 'datasets', 'labels', 'options', 'type', 'legend', 'chartType'],
  })(class {});
  return { __esModule: true, BaseChartDirective: MockChart };
});

// Mock qrcode to avoid process.nextTick errors in jsdom
jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock') },
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

// Polyfill: ResizeObserver (not available in jsdom)
(globalThis as any).ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill: window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

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

// ---------------------------------------------------------------------------
// Global TestBed enhancement: auto-inject common providers into every spec
// so individual test files don't need to repeat boilerplate imports.
// ---------------------------------------------------------------------------
const _origConfigure = TestBed.configureTestingModule.bind(TestBed);
(TestBed as any).configureTestingModule = function (moduleDef: any) {
  const extra = [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    MessageService,
    ConfirmationService,
    DialogService,
    DynamicDialogRef,
    { provide: DynamicDialogConfig, useValue: { data: {} } },
  ];

  // Global defaults go FIRST so spec-level providers can override them
  moduleDef.providers = [...extra, ...(moduleDef.providers || [])];
  return _origConfigure(moduleDef);
};
