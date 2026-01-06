import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getEnv } from './env.utils';

export type SettingsMap = Record<string, string | null>;

/**
 * Lee settings desde Supabase (tabla `settings`) por keys.
 * - Devuelve null si no existe la key o el value viene vacío.
 * - Si falla la petición, devuelve {}.
 */
export async function getSettingsByKeys(
  http: HttpClient,
  keys: string[]
): Promise<SettingsMap> {
  if (!keys.length) return {};

  try {
    const baseUrl = getEnv('ENV_SUPABASE_URL');
    if (!baseUrl) {
      console.warn('[getSettingsByKeys] ENV_SUPABASE_URL no configurada');
      return {};
    }

    const rows = await firstValueFrom(
      http.get<Array<{ key: string; value: string | null }>>(
        `${baseUrl}/rest/v1/settings`,
        {
          params: {
            select: 'key,value',
            key: `in.(${keys.join(',')})`,
          },
        }
      )
    );

    const map: SettingsMap = {};
    for (const k of keys) map[k] = null;

    for (const row of rows ?? []) {
      map[row.key] = row.value ?? null;
    }

    return map;
  } catch (error) {
    console.warn('[getSettingsByKeys] No se pudieron cargar settings:', error);
    return {};
  }
}

export async function getBooleanSetting(
  http: HttpClient,
  key: string,
  defaultValue: boolean
): Promise<boolean> {
  const map = await getSettingsByKeys(http, [key]);
  const value = map[key];

  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes')
    return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no')
    return false;

  return defaultValue;
}
