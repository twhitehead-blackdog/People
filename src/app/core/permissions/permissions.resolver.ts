import {
  PermissionKey,
  UserPermissionOverride,
} from '../../dashboard/pt-permissions/permissions.types';
import { Position } from '../../models';

/**
 * PERMANENT CONTRACT: Permission Resolution Logic
 *
 * Resolution Rule: final_permission = position_permission OR user_override
 * - Position permissions are the baseline
 * - User overrides ONLY elevate permissions (additive only)
 */
export function resolvePermissions(
  position: Position | null | undefined,
  userOverrides: UserPermissionOverride[]
): Record<PermissionKey, boolean> {
  // 1. Initialize all permissions to false
  const result: Record<PermissionKey, boolean> = {
    'dashboard.access': false,
    'employees.read': false,
    'employees.write': false,
    'structure.read': false,
    'structure.write': false,
    'hr.time.read': false,
    'hr.time.write': false,
    'schedules.read': false,
    'schedules.write': false,
    'payroll.read': false,
    'payroll.write': false,
    'finance.read': false,
    'finance.write': false,
    'salaries.view': false,
    'admin.users': false,
    'admin.permissions': false,
    'admin.settings': false,
    // Legacy Bridge
    admin: false,
    schedule_admin: false,
    schedule_approver: false,
    dashboard_access: false,
    view_salaries: false,
  };

  // 2. Apply position-based permissions (PHASE 1 MAPPING)
  if (position) {
    // Admin gets ALL permissions
    if (position.admin) {
      // Set legacy admin key
      result['admin'] = true;
      (Object.keys(result) as PermissionKey[]).forEach((key) => {
        result[key] = true;
      });
    } else {
      // Map legacy boolean columns to new keys
      if (position.dashboard_access) {
        result['dashboard.access'] = true;
        result['dashboard_access'] = true; // Set legacy key
      }

      if (position.schedule_admin) {
        result['schedules.read'] = true;
        result['schedules.write'] = true;
        // Schedule admins typically need employee read access
        result['employees.read'] = true;
        // Also time management
        result['hr.time.read'] = true;
        // Legacy key
        result['schedule_admin'] = true;
      }

      if (position.schedule_approver) {
        result['schedules.read'] = true;
        // Approvers can view employees
        result['employees.read'] = true;
        // And time dashboard
        result['hr.time.read'] = true;
        // Legacy key
        result['schedule_approver'] = true;
      }

      // Legacy check for salary access based on Role Name
      // This logic was in PermissionsService/models.ts, moving here to centralize
      const salaryRoles = [
        'Desarrollador y Soporte IT',
        'Encargada de Recursos Humanos',
        'Encargada de Contabilidad',
      ];
      if (
        position.name &&
        salaryRoles.some((r) => r.toLowerCase() === position.name.toLowerCase())
      ) {
        result['salaries.view'] = true;
        result['payroll.read'] = true;
        result['view_salaries'] = true; // Legacy key
      }

      // Finance logic - usually accounting
      if (
        position.name &&
        position.name.toLowerCase() === 'encargada de contabilidad'
      ) {
        result['finance.read'] = true;
        result['finance.write'] = true;
        result['payroll.write'] = true;
      }
    }
  }

  // 3. Apply user overrides (additive only)
  for (const override of userOverrides) {
    if (override.granted) {
      result[override.permissionKey] = true;
    }
  }

  return result;
}
