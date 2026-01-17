import { Injectable } from '@angular/core';
import { getEnv } from '../utils/env.utils';

@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  private base = getEnv('ENV_SUPABASE_URL') ?? '';

  get baseUrl(): string {
    return this.base;
  }

  build(
    resource: string,
    params?: Record<string, string | number | boolean | null | undefined>
  ) {
    const url = new URL(`${this.base}/${resource}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '')
          url.searchParams.set(k, String(v));
      });
    }
    return url.toString();
  }
}
