// @ts-expect-error https://thymikee.github.io/jest-preset-angular/docs/getting-started/test-environment
globalThis.ngJest = {
  testEnvironmentOptions: {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  },
};

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

window.process.env.ENV_APP_URL = 'http://localhost:4200';
window.process.env.ENV_SUPABASE_URL =
  'https://fsrptlzaqjkcutoiivjr.supabase.co';
window.process.env.ENV_SUPABASE_API_KEY = 'your-public';
window.process.env.ENV_SUPABASE_TOKEN = '';

import 'jest-preset-angular/setup-jest';
