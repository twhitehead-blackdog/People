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
  if (key === 'ENV_API_URL' && !value)
    value = process.env['ENV_API_URL'];
  if (key === 'ENV_APP_URL' && !value)
    value = process.env['ENV_APP_URL'];
  if (key === 'ENV_AUTH0_DOMAIN' && !value)
    value = process.env['ENV_AUTH0_DOMAIN'];
  if (key === 'ENV_AUTH0_CLIENT_ID' && !value)
    value = process.env['ENV_AUTH0_CLIENT_ID'];
  if (key === 'ENV_AUTH0_AUDIENCE' && !value)
    value = process.env['ENV_AUTH0_AUDIENCE'];

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
