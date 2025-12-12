/**
 * Utilidades para generar números de empleado basados en el company_id
 *
 * Formato:
 * - Black Dog: BD0001, BD0002, BD0123, BD9999 (prefijo "BD" + 4 dígitos)
 * - Naz: NZ0001, NZ0002, etc. (prefijo "NZ" + 4 dígitos)
 *
 * Longitud total: 6 caracteres
 */

/**
 * Obtiene el prefijo basado en el company_id
 */
export function getEmployeeNumberPrefix(
  companyId: string | null,
  nazCompanyId: string | null,
  blackdogCompanyId: string | null
): string {
  if (!companyId) {
    return 'XX'; // Prefijo por defecto si no hay company_id
  }

  if (companyId === nazCompanyId) {
    return 'NZ';
  }

  if (companyId === blackdogCompanyId) {
    return 'BD';
  }

  // Si no coincide con ninguno conocido, usar las primeras 2 letras del ID en mayúsculas
  // o un prefijo genérico
  return 'XX';
}

/**
 * Genera el siguiente número de empleado disponible
 * @param existingNumbers Array de números de empleado existentes (formato: "BD0001", "NZ0002", etc.)
 * @param prefix Prefijo a usar (ej: "BD", "NZ")
 * @returns El siguiente número disponible (ej: "BD0001")
 */
export function generateNextEmployeeNumber(
  existingNumbers: string[],
  prefix: string
): string {
  // Filtrar solo los números que empiezan con el prefijo y extraer el correlativo
  const numbersWithPrefix = existingNumbers
    .filter((num) => num.startsWith(prefix))
    .map((num) => {
      const correlative = num.substring(prefix.length);
      const parsed = parseInt(correlative, 10);
      return isNaN(parsed) ? 0 : parsed;
    });

  // Encontrar el máximo correlativo
  const maxCorrelative =
    numbersWithPrefix.length > 0 ? Math.max(...numbersWithPrefix) : 0;

  // Generar el siguiente número (incrementar en 1)
  const nextCorrelative = maxCorrelative + 1;

  // Formatear con 4 dígitos rellenados con ceros
  const formattedCorrelative = nextCorrelative.toString().padStart(4, '0');

  return `${prefix}${formattedCorrelative}`;
}

/**
 * Valida el formato de un número de empleado
 * @param employeeNumber Número de empleado a validar
 * @returns true si el formato es válido
 */
export function isValidEmployeeNumberFormat(employeeNumber: string): boolean {
  // Debe tener 6 caracteres: 2 letras + 4 dígitos
  const pattern = /^[A-Z]{2}\d{4}$/;
  return pattern.test(employeeNumber);
}

/**
 * Extrae el prefijo de un número de empleado
 * @param employeeNumber Número de empleado (ej: "BD0001")
 * @returns Prefijo (ej: "BD")
 */
export function extractPrefix(employeeNumber: string): string {
  return employeeNumber.substring(0, 2);
}

/**
 * Extrae el correlativo de un número de empleado
 * @param employeeNumber Número de empleado (ej: "BD0001")
 * @returns Correlativo numérico (ej: 1)
 */
export function extractCorrelative(employeeNumber: string): number {
  const correlative = employeeNumber.substring(2);
  return parseInt(correlative, 10) || 0;
}
