export type TimelogAlert = 'Día Libre' | 'Feriado' | 'Sin Horario' | string;

export function getAlertSeverity(alert: string): 'warn' | 'danger' | 'info' {
  switch (alert) {
    case 'Día Libre':
      return 'warn';
    case 'Feriado':
      return 'info';
    case 'Sin Horario':
      return 'danger';
    default:
      return 'warn';
  }
}

export function getAlertIcon(alert: string): string {
  switch (alert) {
    case 'Día Libre':
      return 'pi pi-calendar-times';
    case 'Feriado':
      return 'pi pi-calendar';
    case 'Sin Horario':
      return 'pi pi-exclamation-triangle';
    default:
      return 'pi pi-info-circle';
  }
}

export function getAlertTooltip(alert: string): string {
  switch (alert) {
    case 'Día Libre':
      return 'El empleado marcó en un día que está configurado como día libre en su horario';
    case 'Feriado':
      return 'El empleado marcó en un día que tiene un permiso/feriado aprobado';
    case 'Sin Horario':
      return 'El empleado marcó pero no tiene un horario establecido para este día';
    default:
      return '';
  }
}

export function formatLunchExceededTotal(minutes: number): string {
  if (minutes === 0) {
    return '0';
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}
