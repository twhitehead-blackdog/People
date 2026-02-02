import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  PermissionKey,
  UserPermissionOverride,
} from '../../dashboard/pt-permissions/permissions.types';
import { Position } from '../../models';
import { resolvePermissions } from './permissions.resolver';

export interface PermissionsState {
  permissions: Record<PermissionKey, boolean>;
  isLoaded: boolean;
}

const initialState: PermissionsState = {
  permissions: {
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
  },
  isLoaded: false,
};

/**
 * PERMANENT CONTRACT: PermissionsStore Public API
 * - load(position, userOverrides) - Load permissions for current user
 * - can(permissionKey) - Check if permission is granted
 * - permissions() - Get all resolved permissions
 */
export const PermissionsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    load(
      position: Position | null | undefined,
      userOverrides: UserPermissionOverride[]
    ): void {
      const resolved = resolvePermissions(position, userOverrides);
      patchState(store, { permissions: resolved, isLoaded: true });
    },

    can(key: PermissionKey): boolean {
      return store.permissions()[key] ?? false;
    },

    reset(): void {
      patchState(store, initialState);
    },
  }))
);
