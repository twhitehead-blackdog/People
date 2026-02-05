/**
 * Reglas y advertencias visuales para posiciones Gerente de Tienda y Sub Gerente.
 * Las limitaciones son solo advertencias, no bloquean la asignación.
 */

/** IDs de posiciones que tienen restricciones de horario (Gerente de Tienda, Sub Gerente) */
export const MANAGER_POSITION_IDS = [
  '0b660014-936f-498b-80ea-c13bbf43f59c', // Gerente de Tienda
  '4e58edc4-2943-4a71-920c-a2f0f4d31bcc', // Sub Gerente
];

/** Horarios recomendados entre semana para Gerente/Subgerente (solo advertencia si usan otro) */
export const ALLOWED_SCHEDULE_IDS_WEEKDAY = [
  '34ac4bc2-6294-4b31-891f-6db2a08c1b3b', // 7:00 AM - 4:00 PM
  '68c3c2cc-c08b-433c-9423-9bb1abba0d78', // 12:30 PM - 9:00 PM
];

/** Horarios recomendados los domingos para Gerente/Subgerente (solo advertencia si usan otro) */
export const ALLOWED_SCHEDULE_IDS_SUNDAY = [
  '34ac4bc2-6294-4b31-891f-6db2a08c1b3b', // 7:00 AM - 4:00 PM
  '5d908594-89a1-4a9a-8ab7-e8b7df3e031f', // 8:00 AM - 5:00 PM
  'af7ede83-ffc9-4b98-b481-665ee9dea624', // 10:30 AM - 7:00 PM
];

/** ID del turno "Día Libre" (para mensajes de conflicto Gerente/Subgerente). */
export const SCHEDULE_ID_DIA_LIBRE = 'c01dff8f-ce0d-498f-a473-46418576e589';

/** Turnos especiales: no mostrar advertencia de "no recomendado" para Gerente/Subgerente. */
export const EXCLUDED_SCHEDULE_IDS_FROM_WARNING = [
  '3d07f626-d58f-4203-bac5-f6e35557e0ad', // Feriado
  '54c7486b-a6a3-41be-a48a-1926feda064b', // Lactancia 1
  '78bb5045-d107-41b1-87e4-c11985788964', // A. Justificada
  'bc0acbd7-1dd7-4a22-babf-f284cf560701', // Lactancia 2
  SCHEDULE_ID_DIA_LIBRE, // Dia Libre
  'c983a3dc-d4b7-43cf-8fea-ad585e5dd1bb', // A. Injus
  'd3fdaf49-2c3e-4293-bf6d-3ae2d4b7bbdf', // Licencia maternidad
];

export function isManagerPosition(positionId: string | undefined | null): boolean {
  return !!positionId && MANAGER_POSITION_IDS.includes(positionId);
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

/** Devuelve mensaje de advertencia si el turno no es recomendado para Gerente/Subgerente, o null. */
export function getScheduleWarningForManager(
  scheduleId: string | undefined | null,
  date: Date,
  positionId: string | undefined | null,
  dayOff?: boolean
): string | null {
  if (!scheduleId || !isManagerPosition(positionId)) return null;
  if (dayOff === true) return null;
  if (EXCLUDED_SCHEDULE_IDS_FROM_WARNING.includes(scheduleId)) return null;
  const allowed = isSunday(date) ? ALLOWED_SCHEDULE_IDS_SUNDAY : ALLOWED_SCHEDULE_IDS_WEEKDAY;
  if (allowed.includes(scheduleId)) return null;
  return isSunday(date)
    ? 'Domingo: turnos recomendados son 7:00 AM - 4:00 PM, 8:00 AM - 5:00 PM o 10:30 AM - 7:00 PM.'
    : 'Entre semana se recomienda 7:00 AM - 4:00 PM o 12:30 PM - 9:00 PM.';
}

/** Clave para detectar conflicto "mismo turno misma sucursal mismo día" entre Gerente y Subgerente. */
export function conflictKey(date: Date, branchId: string | undefined, scheduleId: string | undefined): string {
  const d = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
  return `${d}|${branchId ?? ''}|${scheduleId ?? ''}`;
}
