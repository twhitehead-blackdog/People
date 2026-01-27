export function getEnvString(key: string): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  const value = env[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * Obtiene una variable de entorno sin validaciones adicionales
 * @param key Nombre de la variable de entorno
 * @returns Valor de la variable o undefined si no existe
 */
export function getEnv(key: string): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  // Intenta recuperar el valor usando acceso dinámico o fallbacks explícitos
  let value = env[key];

  // Fallbacks explícitos para asegurar que el bundler reemplace estas variables (DefinePlugin)
  if (key === 'ENV_SUPABASE_URL' && !value)
    value = process.env['ENV_SUPABASE_URL'];
  if (key === 'ENV_SUPABASE_ANON_KEY' && !value)
    value = process.env['ENV_SUPABASE_ANON_KEY'];
  if (key === 'ENV_SUPABASE_SERVICE_ROLE_KEY' && !value)
    value = process.env['ENV_SUPABASE_SERVICE_ROLE_KEY'];
  if (key === 'ENV_SUPABASE_API_KEY' && !value)
    value = process.env['ENV_SUPABASE_API_KEY'];
  if (key === 'ENV_SUPABASE_TOKEN' && !value)
    value = process.env['ENV_SUPABASE_TOKEN'];
  // Naz Hardening - Mandatory
  if (key === 'ENV_NAZ_COMPANY_ID' && !value) {
    value = process.env['ENV_NAZ_COMPANY_ID'];
    // Fallback for Dev/Seed environment
    if (!value) {
      // In production, this should fail hard. In dev, we use the known Naz ID.
      // Ideally this comes from the .env file, but for legacy dev setup we fallback.
      console.warn(
        '⚠️ ENV_NAZ_COMPANY_ID missing. FALLBACK to known Naz ID for development.'
      );
      value = 'ddff33e5-1585-48ed-8689-fe4b8e77a63f';
    }
  }

  // Legacy Optional - Warn only, do not block
  if ((key === 'ENV_API_URL' || key === 'ENV_APP_URL') && !value) {
    console.debug(`[Env] Optional legacy var ${key} not found.`);
    return undefined;
  }

  if (!value) return undefined;

  // Limpieza robusta: eliminar espacios y comillas accidentales
  let cleanValue = value.trim();
  if (
    (cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
    (cleanValue.startsWith("'") && cleanValue.endsWith("'"))
  ) {
    cleanValue = cleanValue.substring(1, cleanValue.length - 1);
  }

  return cleanValue;
}
