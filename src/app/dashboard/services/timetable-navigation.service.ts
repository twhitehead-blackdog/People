import { computed, Injectable, signal } from '@angular/core';
import { addWeeks, endOfMonth, endOfWeek, startOfMonth, startOfWeek, subWeeks } from 'date-fns';
import { formatWeekRange } from '../utils/timetable-date.utils';

@Injectable({
  providedIn: 'root',
})
export class TimetableNavigationService {
  // Signal de fecha actual
  public currentDate = signal(new Date());

  /**
   * Computed que calcula el inicio de la semana (domingo)
   */
  public start = computed(() => {
    // Usar startOfWeek con weekStartsOn: 0 para que comience en domingo
    return startOfWeek(this.currentDate(), { weekStartsOn: 0 });
  });

  /**
   * Computed que calcula el fin de la semana (sábado)
   */
  public end = computed(() => {
    // Usar endOfWeek con weekStartsOn: 0 para que termine en sábado
    return endOfWeek(this.currentDate(), { weekStartsOn: 0 });
  });

  /**
   * Computed que formatea el rango de la semana actual
   */
  public currentWeek = computed(() => formatWeekRange(this.start(), this.end()));

  /**
   * Navega a la semana siguiente
   */
  public nextWeek(): void {
    this.currentDate.update((value) => addWeeks(value, 1));
  }

  /**
   * Navega a la semana anterior
   */
  public previousWeek(): void {
    this.currentDate.update((value) => subWeeks(value, 1));
  }

  /**
   * Navega a la semana actual
   */
  public goToToday(): void {
    this.currentDate.set(new Date());
  }

  /**
   * Navega a una fecha específica
   */
  public goToDate(date: Date): void {
    this.currentDate.set(date);
  }

  /**
   * Navega a una semana específica de un mes
   * @param month Mes objetivo
   * @param weekNumber Número de semana del mes (1, 2, 3, etc.)
   */
  public goToSelectedWeek(month: Date, weekNumber: number): void {
    // Calcular la fecha de inicio de la semana seleccionada
    const monthStart = startOfMonth(month);
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const targetWeekStart = addWeeks(firstWeekStart, weekNumber - 1);
    
    // Asegurarse de que la semana esté dentro del mes
    const monthEnd = endOfMonth(month);
    if (targetWeekStart > monthEnd) {
      // Si la semana está fuera del mes, usar el último día del mes
      this.currentDate.set(monthEnd);
    } else {
      this.currentDate.set(targetWeekStart);
    }
  }
}
