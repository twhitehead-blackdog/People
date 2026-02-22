/**
 * Detecta si la app se está ejecutando en el dominio del portal de empleados.
 */
export function isPortalDomain(): boolean {
  return window.location.hostname === 'portal.blackdogpanama.com';
}
