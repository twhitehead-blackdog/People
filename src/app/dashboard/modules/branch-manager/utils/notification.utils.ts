/**
 * Pure helper functions for branch manager notifications.
 */

export const notificationTypeOptions = [
  { label: 'Todas', value: null },
  { label: 'Retrasos', value: 'delay' },
  { label: 'A tiempo', value: 'on_time' },
  { label: 'Sin marcar', value: 'missing' },
  { label: 'Salida temprana', value: 'early_exit' },
  { label: 'Almuerzo excedido', value: 'lunch_exceeded' },
] as const;

export function getNotificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    delay: 'Retraso',
    on_time: 'A tiempo',
    missing: 'Sin marcar',
    early_exit: 'Salida temprana',
    lunch_exceeded: 'Almuerzo excedido',
  };
  return labels[type] || type;
}

export function getNotificationSeverity(
  type: string
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
  const severities: Record<
    string,
    'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
  > = {
    delay: 'danger',
    on_time: 'success',
    missing: 'warn',
    early_exit: 'danger',
    lunch_exceeded: 'danger',
  };
  return severities[type] || 'info';
}

export function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    delay: 'pi pi-clock',
    on_time: 'pi pi-check-circle',
    missing: 'pi pi-exclamation-triangle',
    early_exit: 'pi pi-arrow-down',
    lunch_exceeded: 'pi pi-clock',
  };
  return icons[type] || 'pi pi-info-circle';
}
