import { Injectable } from '@angular/core';
import { Employee } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class VetScheduleUtilsService {
  /**
   * Determina si un empleado tiene una posición veterinaria
   */
  isVetPosition(employee: Employee): boolean {
    const positionName = employee.position?.name?.toLowerCase() || '';
    return (
      positionName.includes('veterinar') || // Más amplio: cubre "veterinario", "veterinaria", etc.
      positionName.includes('vet') ||
      (positionName.includes('médic') && positionName.includes('veterinar')) || // "médica veterinaria"
      (positionName.includes('asistente') && positionName.includes('vet')) || // "asistente vet"
      positionName.includes('auxiliar veterinario') // posiciones auxiliares
    );
  }

  /**
   * Parsea una fecha sin problemas de zona horaria
   */
  parseDateWithoutTimezone(dateStr: string): Date {
    // Crear fecha a las 12:00:00 del día para evitar problemas de zona horaria
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  /**
   * Determina si un schedule es considerado no laborable
   */
  isNonWorkingSchedule(schedule: any): boolean {
    if (!schedule) return false;

    // Schedule específico de feriados por ID
    if (schedule.id === '3d07f626-d58f-4203-bac5-f6e35557e0ad') return true;

    // Schedules con nombres que indican días no laborables
    const nonWorkingNames = [
      'feriado',
      'incapacidad',
      'vacaciones',
      'ausencia justificada',
      'a. justificada',
      'dia libre',
      'día libre',
      'd.l.',
      'dl',
      'permiso',
      'licencia',
      'reposo',
      'enfermedad',
      'ausencia',
      'baja',
      'suspensión',
      // Variaciones con años
      'vacaciones 202',
      'ausencia 202',
      // Abreviaturas comunes
      'vac',
      'incap',
      'dl',
      'd.l'
    ];

    const scheduleName = schedule.name?.toLowerCase() || '';
    return nonWorkingNames.some((name) => scheduleName.includes(name));
  }

  /**
   * Obtiene la etiqueta apropiada para un schedule no laborable
   */
  getScheduleLabel(schedule: any): string {
    if (!schedule) return 'NO LABORA';

    // Etiquetas específicas para ciertos tipos
    const scheduleName = schedule.name?.toLowerCase() || '';

    if (
      scheduleName.includes('feriado') ||
      schedule.id === '3d07f626-d58f-4203-bac5-f6e35557e0ad'
    ) {
      return 'Feriado';
    }
    if (scheduleName.includes('incapacidad')) {
      return 'Incapacidad';
    }
    if (scheduleName.includes('vacaciones')) {
      return 'Vacaciones';
    }
    if (
      scheduleName.includes('ausencia justificada') ||
      scheduleName.includes('a. justificada')
    ) {
      return 'Ausencia Justificada';
    }
    if (
      scheduleName.includes('dia libre') ||
      scheduleName.includes('día libre')
    ) {
      return 'Día Libre';
    }

    // Para otros casos, usar el nombre del schedule o "NO LABORA"
    return schedule.name || 'NO LABORA';
  }
}