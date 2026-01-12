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
  // Fallbacks explícitos para asegurar que el bundler reemplace estas variables
  // incluso si el objeto process.env completo no se inyecta correctamente
  if (key === 'ENV_SUPABASE_URL') return process.env['ENV_SUPABASE_URL'];
  if (key === 'ENV_SUPABASE_ANON_KEY')
    return process.env['ENV_SUPABASE_ANON_KEY'];
  if (key === 'ENV_SUPABASE_SERVICE_ROLE_KEY')
    return process.env['ENV_SUPABASE_SERVICE_ROLE_KEY'];
  if (key === 'ENV_SUPABASE_API_KEY')
    return process.env['ENV_SUPABASE_API_KEY'];
  if (key === 'ENV_SUPABASE_TOKEN') return process.env['ENV_SUPABASE_TOKEN'];
  if (key === 'ENV_PRODUCTION') return process.env['ENV_PRODUCTION'];

  const env = process.env as Record<string, string | undefined>;
  return env[key];
}
