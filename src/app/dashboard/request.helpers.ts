/**
 * Helper functions for request management (Gestiones)
 * Shared between BranchManagerComponent and BranchManagerGestionesComponent
 */

export function getRequestIcon(requestType: string): string {
  const icons: Record<string, string> = {
    compensatorio: 'pi-clock',
    incapacidad: 'pi-heart',
    vacaciones: 'pi-sun',
    documentos: 'pi-file',
    uniform_request: 'pi-tag',
    supply_request: 'pi-box',
    timelog_correction: 'pi-exclamation-triangle',
    work_permit: 'pi-id-card',
    schedule_change: 'pi-calendar-clock',
  };
  return icons[requestType] || 'pi-question';
}

export function getRequestColorClass(
  requestType: string,
  isActive: boolean
): string {
  const colors: Record<string, { bg: string; active: string }> = {
    compensatorio: {
      bg: 'bg-amber-500/20 border-amber-500',
      active: 'text-amber-400',
    },
    incapacidad: {
      bg: 'bg-blue-500/20 border-blue-500',
      active: 'text-blue-400',
    },
    vacaciones: {
      bg: 'bg-purple-500/20 border-purple-500',
      active: 'text-purple-400',
    },
    documentos: {
      bg: 'bg-green-500/20 border-green-500',
      active: 'text-green-400',
    },
    uniform_request: {
      bg: 'bg-teal-500/20 border-teal-500',
      active: 'text-teal-400',
    },
    supply_request: {
      bg: 'bg-amber-500/20 border-amber-500',
      active: 'text-amber-400',
    },
    timelog_correction: {
      bg: 'bg-orange-500/20 border-orange-500',
      active: 'text-orange-400',
    },
    work_permit: {
      bg: 'bg-amber-600/20 border-amber-600',
      active: 'text-amber-500',
    },
    schedule_change: {
      bg: 'bg-orange-500/20 border-orange-500',
      active: 'text-orange-400',
    },
  };
  const color = colors[requestType] || {
    bg: 'bg-gray-500/20 border-gray-500',
    active: 'text-gray-400',
  };
  return isActive ? color.active : color.bg;
}

export function getRequestStatusLabel(request: any): string {
  const status = request.status || request.review_status;
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    completed: 'Completado',
    rejected: 'Rechazado',
  };
  return labels[status] || 'Sin estado';
}

export function getRequestStatusSeverity(
  request: any
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  const status = request.status || request.review_status;
  const severities: Record<
    string,
    'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
  > = {
    pending: 'warn',
    approved: 'success',
    completed: 'success',
    rejected: 'danger',
  };
  return severities[status] || 'secondary';
}

export function getRequestTypeLabel(requestType: string): string {
  const labels: Record<string, string> = {
    compensatorio: 'Compensatorio',
    incapacidad: 'Incapacidad',
    vacaciones: 'Vacaciones',
    documentos: 'Documento',
    uniform_request: 'Uniforme',
    supply_request: 'Solicitud de Insumo',
    timelog_correction: 'Omisión de Marcación',
    work_permit: 'Permiso',
    schedule_change: 'Cambio de Horario',
  };
  return labels[requestType] || 'Solicitud';
}

export function getRequestTypeSeverity(
  requestType: string
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  const severities: Record<
    string,
    'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
  > = {
    compensatorio: 'warn',
    incapacidad: 'info',
    vacaciones: 'contrast',
    documentos: 'success',
    uniform_request: 'info',
    supply_request: 'warn',
    timelog_correction: 'warn',
    work_permit: 'warn',
    schedule_change: 'warn',
  };
  return severities[requestType] || 'secondary';
}

export function getSeverityColor(severity: string | undefined): string {
  const colors: Record<string, string> = {
    success: '#4ade80', // green-400
    info: '#22d3ee', // cyan-400
    warn: '#fbbf24', // amber-400
    danger: '#f87171', // red-400
    secondary: '#94a3b8', // slate-400
  };
  return colors[severity || ''] || '#94a3b8';
}
