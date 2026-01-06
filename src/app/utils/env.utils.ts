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
  return env[key];
}
