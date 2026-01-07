import { format } from 'date-fns';

/**
 * Formatea horas y minutos de manera legible
 */
export function formatHoursMinutes(hours: number): string {
  if (hours === 0) return '0m';

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (wholeHours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${wholeHours}h`;
  } else {
    return `${wholeHours}h ${minutes}m`;
  }
}

/**
 * Calcula días entre dos fechas
 */
export function calculateDays(start: string | Date, end: string | Date): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Calcula horas entre dos fechas
 */
export function calculateHoursFromDates(
  dateFrom: Date | string,
  dateTo: Date | string
): number {
  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);

  // Validar que las fechas sean válidas
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffHours = diffTime / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100; // Redondear a 2 decimales
}

/**
 * Formatea fecha a DD/MM/YYYY
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString + 'T00:00:00');
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    return dateString;
  }
}

/**
 * Parsea fecha DD/MM/YYYY a ISO
 */
export function parseDDMMYYYYToISO(dateStr: string): string | null {
  const parts = String(dateStr).trim().split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year)
  )
    return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900)
    return null;
  try {
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return null;
    return format(d, 'yyyy-MM-dd');
  } catch {
    return null;
  }
}

/**
 * Formatea tamaño de archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Verifica si hay retraso en los logs
 */
export function hasDelay(delayHours: string | undefined): boolean {
  if (!delayHours) return false;
  const delay = parseFloat(delayHours);
  return !isNaN(delay) && delay > 0;
}