import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { resolvePermissions } from '../core/permissions/permissions.resolver';
import { PermissionsStore } from '../core/permissions/permissions.store';
import {
  ALL_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  PermissionDefinition,
  PermissionKey,
  UserPermissionOverride,
  UserPermissionProfile,
} from '../dashboard/pt-permissions/permissions.types';
import { Employee, Position } from '../models';
import { DashboardStore } from '../stores/dashboard.store';
import { PositionsStore } from '../stores/positions.store';
import { ApiUrlService } from './api-url.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  private store = inject(DashboardStore);
  private positionsStore = inject(PositionsStore);
  private permissionsStore = inject(PermissionsStore);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

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
   * Loads permissions for the current user into the PermissionsStore
   * Should be called on login or reload
   */
  public async loadUserPermissions(employee: Employee | null): Promise<void> {
    if (!employee) {
      this.permissionsStore.reset();
      return;
    }

    try {
      // Phase 2: Fetch overrides from DB
      const overrides = await this.fetchUserOverrides(employee.id);
      this.permissionsStore.load(employee.position, overrides);
    } catch (error) {
      console.error('Error loading permissions:', error);
      // Fallback: load only position permissions
      this.permissionsStore.load(employee.position, []);
    }
  }

  /**
   * Build a single user profile merging Position + Overrides
   */
  private buildUserProfile(employee: Employee): UserPermissionProfile {
    // 1. Resolve effective permissions using central resolver
    // Overrides are loaded async and cached in the store for the current user.
    // For the admin list view, we resolve from position only (overrides load on detail).
    const finalPermissions = resolvePermissions(employee.position, []);

    // 2. Determine sources
    const sources: Record<PermissionKey, 'position' | 'user_override'> =
      {} as any;
    (Object.keys(finalPermissions) as PermissionKey[]).forEach((key) => {
      sources[key] = 'position';
    });

    return {
      employeeId: employee.id,
      employeeName:
        employee.full_name || `${employee.first_name} ${employee.father_name}`,
      positionId: employee.position_id,
      positionName: employee.position?.name || 'Sin Cargo',
      branchName: employee.branch?.name || 'Sin Sucursal',
      permissions: finalPermissions,
      sources: sources,
      userType: this.determineUserType(employee),
      isSupportUser: this.store.testMode.isSupportUser(employee.work_email),
      testMode: false,
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
   * Updates permissions at the Position level.
   * Only accepts the 4 actual DB columns: admin, dashboard_access, schedule_admin, schedule_approver.
   */
  public async updatePositionPermissions(
    positionId: string,
    flags: Record<string, boolean>
  ): Promise<void> {
    const updates: Partial<Position> = {};

    if (flags['admin'] !== undefined) updates.admin = flags['admin'];
    if (flags['dashboard_access'] !== undefined)
      updates.dashboard_access = flags['dashboard_access'];
    if (flags['schedule_admin'] !== undefined)
      updates.schedule_admin = flags['schedule_admin'];
    if (flags['schedule_approver'] !== undefined)
      updates.schedule_approver = flags['schedule_approver'];

    if (Object.keys(updates).length > 0) {
      await firstValueFrom(
        this.positionsStore.editItem({ id: positionId, ...updates } as any)
      );
    }
  }

  /**
   * Helper checks for current user (consumed by guards/components)
   * Delegates to PermissionsStore
   */
  public canCurrentUser(action: PermissionKey): boolean {
    return this.permissionsStore.can(action);
  }

  /**
   * Fetch user overrides from employee_permissions table (v2)
   */
  public async fetchUserOverrides(
    employeeId: string
  ): Promise<UserPermissionOverride[]> {
    const url = this.apiUrl.build('rest/v1/employee_permissions', {
      employee_id: `eq.${employeeId}`,
      allowed: 'eq.true',
      or: '(expires_at.is.null,expires_at.gt.now())',
      select: 'permission_key,allowed,expires_at',
    });

    const records = await firstValueFrom(
      this.http.get<any[]>(url)
    );

    return (records || []).map((row) => ({
      employeeId,
      permissionKey: row.permission_key as PermissionKey,
      granted: row.allowed,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    }));
  }

  /**
   * Save a single user override via set_employee_permission RPC (v2)
   */
  public async saveUserOverride(
    employeeId: string,
    permissionKey: PermissionKey,
    granted: boolean,
    reason?: string
  ): Promise<void> {
    const url = this.apiUrl.build('rest/v1/rpc/set_employee_permission');

    await firstValueFrom(
      this.http.post(url, {
        p_employee_id: employeeId,
        p_key: permissionKey,
        p_allowed: granted,
        p_reason: reason || null,
      })
    );
  }
}
