import { Pipe, PipeTransform } from '@angular/core';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

type PanamaDateInput = Date | string | number | null | undefined;

/**
 * Formatea fechas SIEMPRE en zona horaria de Panamá (America/Panama).
 *
 * Uso:
 * - {{ value | panamaDate:'HH:mm' }}
 * - {{ value | panamaDate:'yyyy-MM-dd' }}
 *
 * Nota: si el input es string tipo 'yyyy-MM-dd' (solo fecha), se interpreta como
 * fecha en Panamá a medianoche, para evitar corrimientos por timezone del dispositivo.
 */
@Pipe({
  name: 'panamaDate',
  standalone: true,
})
export class PanamaDatePipe implements PipeTransform {
  private readonly TZ = 'America/Panama';

  transform(value: PanamaDateInput, pattern: string): string {
    if (!value) return '';
    if (!pattern) return '';

    const date = this.toDate(value);
    if (!date) return '';

    const resolvedPattern = this.resolvePattern(pattern);

    try {
      return formatInTimeZone(date, this.TZ, resolvedPattern, { locale: es });
    } catch {
      return '';
    }
  }

  /**
   * Permite usar aliases tipo Angular DatePipe (fullDate/mediumDate/short*)
   * sin forzar a cambiar todos los templates.
   */
  private resolvePattern(pattern: string): string {
    switch (pattern) {
      case 'fullDate':
        return "EEEE, d 'de' MMMM 'de' yyyy";
      case 'mediumDate':
        return 'd MMM yyyy';
      case 'shortDate':
        return 'dd/MM/yyyy';
      case 'shortTime':
        return 'HH:mm';
      case 'short':
        return 'dd/MM/yyyy HH:mm';
      default:
        return pattern;
    }
  }

  private toDate(value: PanamaDateInput): Date | null {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof value === 'string') {
      const v = value.trim();
      if (!v) return null;

      // Caso especial: 'yyyy-MM-dd' (date-only)
      // Interpretarlo como medianoche en Panamá para que el día no cambie con TZ local.
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const d = new Date(`${v}T00:00:00-05:00`);
        return isNaN(d.getTime()) ? null : d;
      }

      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  }
}

