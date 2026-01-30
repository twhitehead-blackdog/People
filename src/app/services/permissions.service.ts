import { computed, inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ALL_PERMISSIONS,
  checkSalaryAccess,
  PERMISSION_DEFINITIONS,
  PermissionDefinition,
  PermissionKey,
  UserPermissionProfile,
} from '../dashboard/pt-permissions/permissions.types';
import { Employee, Position } from '../models';
import { DashboardStore } from '../stores/dashboard.store';
import { PositionsStore } from '../stores/positions.store';

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  private store = inject(DashboardStore);
  private positionsStore = inject(PositionsStore);

  // TODO: In the future, this signal will hold the user overrides fetched from DB
  // private employeeOverrides = signal<Record<string, Record<PermissionKey, boolean>>>({});

  /**
   * Returns all system permission definitions
   */
  public getPermissionDefinitions(): PermissionDefinition[] {
    return ALL_PERMISSIONS.map((key) => PERMISSION_DEFINITIONS[key]);
  }

  /**
   * Computed signal returning permission profiles for all active employees
   * This is the main data source for the Admin > Permissions view
   */
  public allUserProfiles = computed<UserPermissionProfile[]>(() => {
    const employees = this.store.employees
      .entities()
      .filter((e) => e.is_active);

    return employees.map((employee) => this.buildUserProfile(employee));
  });

  /**
   * Get a specific user's permission profile
   */
  public getUserProfile(employeeId: string): UserPermissionProfile | undefined {
    const employee = this.store.employees
      .entities()
      .find((e) => e.id === employeeId);
    if (!employee) return undefined;
    return this.buildUserProfile(employee);
  }

  /**
   * Build a single user profile merging Position + Overrides
   */
  private buildUserProfile(employee: Employee): UserPermissionProfile {
    const position = employee.position;

    // 1. Get Base Permissions from Position
    const basePermissions: Record<PermissionKey, boolean> = {
      admin: position?.admin || false,
      schedule_admin: position?.schedule_admin || false,
      schedule_approver: position?.schedule_approver || false,
      dashboard_access: position?.dashboard_access || false,
      view_salaries: checkSalaryAccess(position?.name),
    };

    // 2. Get User Overrides (Placeholder for now)
    // const overrides = this.employeeOverrides()[employee.id] || {};

    // 3. Merge Permissions (Hybrid Logic)
    // For now, source is always 'position' as overrides are not implemented in DB yet
    const finalPermissions: Record<PermissionKey, boolean> = {
      ...basePermissions,
    };
    const sources: Record<PermissionKey, 'position' | 'user_override'> = {
      admin: 'position',
      schedule_admin: 'position',
      schedule_approver: 'position',
      dashboard_access: 'position',
      view_salaries: 'position',
    };

    /* Future Override Logic:
    ALL_PERMISSIONS.forEach(key => {
      if (overrides[key] !== undefined) {
        finalPermissions[key] = overrides[key];
        sources[key] = 'user_override';
      }
    });
    */

    return {
      employeeId: employee.id,
      employeeName:
        employee.full_name || `${employee.first_name} ${employee.father_name}`,
      positionId: employee.position_id,
      positionName: position?.name || 'Sin Cargo',
      branchName: employee.branch?.name || 'Sin Sucursal',
      permissions: finalPermissions,
      sources: sources,
      userType: this.determineUserType(employee),
      isSupportUser: this.store.testMode.isSupportUser(employee.work_email),
      testMode: false, // Can come from TestModeService if needed for context
    };
  }

  private determineUserType(
    employee: Employee
  ): 'employee' | 'manager' | 'admin' | 'superadmin' {
    if (employee.position?.admin) return 'admin';
    if (employee.position?.schedule_admin) return 'manager';
    return 'employee';
  }

  /**
   * Updates permissions at the Position level
   */
  public async updatePositionPermissions(
    positionId: string,
    permissions: Partial<Record<PermissionKey, boolean>>
  ): Promise<void> {
    // Delegate to PositionsStore
    // We map our PermissionKey to the partial Position object expected by store
    const updates: Partial<Position> = {};

    if (permissions.admin !== undefined) updates.admin = permissions.admin;
    if (permissions.schedule_admin !== undefined)
      updates.schedule_admin = permissions.schedule_admin;
    if (permissions.schedule_approver !== undefined)
      updates.schedule_approver = permissions.schedule_approver;
    if (permissions.dashboard_access !== undefined)
      updates.dashboard_access = permissions.dashboard_access;
    // Note: view_salaries is currently derived from role name, not persisted in DB column yet.

    if (Object.keys(updates).length > 0) {
      // Cast to any/Position because editItem expects T (full entity) but we only want to patch specific fields
      // The implementation of editItem uses patch, so it should handle partial updates if the API supports it.
      await firstValueFrom(
        this.positionsStore.editItem({ id: positionId, ...updates } as any)
      );
    }
  }

  /**
   * Helper checks for current user (consumed by guards/components)
   * These parallel the existing checks in DashboardStore but centralized
   */
  public canCurrentUser(action: PermissionKey): boolean {
    const currentEmployee = this.store.currentEmployee();
    if (!currentEmployee) return false;

    const profile = this.buildUserProfile(currentEmployee);
    return profile.permissions[action];
  }
}
