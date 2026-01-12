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

  if (!value) return undefined;

  // Limpieza robusta: eliminar espacios y comillas accidentales
  value = value.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    try {
      // Intentar parsear JSON para manejar strings escapados correctamente
      value = JSON.parse(value);
    } catch {
      // Si falla, simplemente quitar la primera y última comilla
      value = value.substring(1, value.length - 1);
    }
  }

  return value;
}
