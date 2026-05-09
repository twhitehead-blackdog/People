/**
 * Shared permission utilities.
 * Extracted from dashboard.store.ts to avoid circular dependencies
 * and consolidate duplicated isStoreManager logic.
 */

export type LegacyPermissionKey = 'admin' | 'schedule_admin' | 'schedule_approver';

/**
 * Reads a specific legacy permission from the employee's override,
 * falling back to position property if no override exists.
 */
export function getEmployeePermission(
  employee: { legacy_permissions_override?: any; position?: any } | undefined,
  key: LegacyPermissionKey
): boolean {
  if (!employee) return false;

  // 1. Try legacy_permissions_override (primary source)
  const raw = employee.legacy_permissions_override;
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object' && key in parsed) {
        return !!parsed[key];
      }
    } catch {
      // Fall through to position
    }
  }

  // 2. Fallback to position (for employees without override yet)
  const position = employee.position;
  if (!position) return false;
  return !!(position as any)[key];
}

/**
 * Determines if the user is a store manager (gerente/subgerente de tienda).
 * True if: schedule_admin and not admin, OR position name matches.
 */
export function isStoreManagerRole(
  isScheduleAdmin: boolean,
  isAdmin: boolean,
  positionName: string
): boolean {
  if (isScheduleAdmin && !isAdmin) return true;
  const name = positionName.toLowerCase();
  return (
    name.includes('gerente de tienda') ||
    name.includes('subgerente') ||
    name.includes('sub gerente') ||
    name.includes('sub-gerente')
  );
}
