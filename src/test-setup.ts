// Make this file a module
export {};

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

window.process = {
  env: {
    ENV_APP_URL: 'http://localhost:4200',
    ENV_SUPABASE_URL: 'https://fsrptlzaqjkcutoiivjr.supabase.co',
    ENV_SUPABASE_API_KEY: 'your-public',
    ENV_SUPABASE_TOKEN: '',
  },
};

// jest-preset-angular 15.0.0+ handles setup automatically via preset
// No manual import needed
