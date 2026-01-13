/**
 * Shared HR request status utilities.
 * Provides consistent status labels and severities across all HR modules.
 */

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type TagSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast';

/**
 * Get localized label for a request status.
 */
export function getStatusLabel(status: RequestStatus | string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  };
  return labels[status] || status;
}

/**
 * Get PrimeNG tag severity for a request status.
 */
export function getStatusSeverity(status: RequestStatus | string): TagSeverity {
  switch (status) {
    case 'pending':
      return 'warn';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return 'info';
  }
}

/**
 * Standard status options for dropdowns.
 */
export const STATUS_OPTIONS = [
  { label: 'Pendiente', value: 'pending' },
  { label: 'Aprobada', value: 'approved' },
  { label: 'Rechazada', value: 'rejected' },
];

/**
 * Calculate the number of days between two dates (inclusive).
 */
export function calculateDaysBetween(
  start: string | Date,
  end: string | Date
): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Format hours as "Xh Ym" string.
 */
export function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
