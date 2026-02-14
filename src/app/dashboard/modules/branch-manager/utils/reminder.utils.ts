/**
 * Pure helper functions for branch manager reminders.
 */

export function isOverdue(reminder: { due_date: Date | string; is_completed: boolean }): boolean {
  return new Date(reminder.due_date) < new Date() && !reminder.is_completed;
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
  };
  return labels[priority] || priority;
}

export function getPrioritySeverity(
  priority: string
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  const severities: Record<
    string,
    'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
  > = {
    low: 'secondary',
    medium: 'info',
    high: 'warn',
    urgent: 'danger',
  };
  return severities[priority] || 'info';
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    inventario: 'Inventario',
    limpieza: 'Limpieza',
    seguridad: 'Seguridad',
    administrativo: 'Administrativo',
    capacitacion: 'Capacitación',
    mantenimiento: 'Mantenimiento',
    calidad: 'Calidad',
    otro: 'Otro',
  };
  return labels[category] || category;
}
