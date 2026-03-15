/**
 * Reglas y advertencias visuales para posiciones Gerente de Tienda y Sub Gerente.
 * Las limitaciones son solo advertencias, no bloquean la asignación.
 */

import { getDay, getHours, getMinutes } from 'date-fns';

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
  return getDay(date) === 0;
}

/** Anteriormente mostraba advertencias de turnos recomendados para Gerente/Subgerente. Desactivado. */
export function getScheduleWarningForManager(
  _scheduleId: string | undefined | null,
  _date: Date,
  _positionId: string | undefined | null,
  _dayOff?: boolean
): string | null {
  return null;
}

/** Clave para detectar conflicto "mismo turno misma sucursal mismo día" entre Gerente y Subgerente. */
export function conflictKey(date: Date, branchId: string | undefined, scheduleId: string | undefined): string {
  const d = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
  return `${d}|${branchId ?? ''}|${scheduleId ?? ''}`;
}

/** Clave (date|branch_id) para buscar por día y sucursal (ej. mínimo entrada Asistente). */
export function branchDayKey(date: Date, branchId: string | undefined): string {
  const d = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
  return `${d}|${branchId ?? ''}`;
}

// --- Peluquería: Peluquero y Asistente de peluquería (solo advertencias) ---

export const PELUQUERO_POSITION_ID = '6c3cc3d1-c594-423c-8d26-339b1ba1fc77';
export const ASISTENTE_PELUQUERIA_POSITION_ID = '287fcb18-49c0-48d4-94c2-74a385161a12';

export function isPeluqueroPosition(positionId: string | undefined | null): boolean {
  return !!positionId && positionId === PELUQUERO_POSITION_ID;
}

export function isAsistentePeluqueriaPosition(positionId: string | undefined | null): boolean {
  return !!positionId && positionId === ASISTENTE_PELUQUERIA_POSITION_ID;
}

/** Parsea entry_time (string "HH:mm:ss", "HH:mm", ISO "YYYY-MM-DDTHH:mm:ss..." o Date) a minutos desde medianoche. Devuelve null si no se puede parsear. */
export function parseEntryTimeToMinutes(entryTime: Date | string | null | undefined): number | null {
  if (entryTime == null) return null;
  if (typeof entryTime === 'string') {
    let s = entryTime.trim();
    if (s.includes('T')) s = s.split('T')[1] ?? s;
    const parts = s.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!Number.isNaN(h) && !Number.isNaN(m)) return h * 60 + m;
    }
    return null;
  }
  if (entryTime instanceof Date) {
    return getHours(entryTime) * 60 + getMinutes(entryTime);
  }
  return null;
}

/** Mensaje si el peluquero debe entrar después del asistente (solo advertencia). */
export function getPeluqueroAfterAsistenteWarning(
  peluqueroEntryMinutes: number | null,
  asistenteMinEntryMinutes: number | null
): string | null {
  if (peluqueroEntryMinutes == null || asistenteMinEntryMinutes == null) return null;
  if (peluqueroEntryMinutes < asistenteMinEntryMinutes) {
    return 'El peluquero debe entrar después del asistente de peluquería.';
  }
  return null;
}
