import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ALL_LEGACY_PERMISSIONS,
  checkSalaryAccess,
  createDefaultFrontendPermissions,
  FrontendPermissions,
  hasModuleAccess,
  hasSubModuleAccess,
  LegacyPermissionDefinition,
  LEGACY_PERMISSION_DEFINITIONS,
  LegacyPermissionKey,
  ModulePermission,
  UserPermissionProfile,
} from '../dashboard/pt-permissions/permissions.types';
import {
  getAllSubModuleIds,
  getModuleById,
  getSubModuleById,
  ModuleDefinition,
  SubModule,
  SYSTEM_MODULES,
} from '../dashboard/pt-permissions/module-permissions.types';
import { Employee, Position } from '../models';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';
import { PositionsStore } from '../stores/positions.store';

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  private store = inject(DashboardStore);
  private employeesStore = inject(EmployeesStore);
  private positionsStore = inject(PositionsStore);

  // ============================================
  // CONFIGURACIÓN DE MÓDULOS DEL SISTEMA
  // ============================================

  /**
   * Retorna todos los módulos del sistema con sus submódulos
   */
  public getSystemModules(): ModuleDefinition[] {
    return SYSTEM_MODULES;
  }

  /**
   * Obtiene un módulo específico por ID
   */
  public getModuleById(moduleId: string): ModuleDefinition | undefined {
    return getModuleById(moduleId);
  }

  /**
   * Obtiene un submódulo específico por ID
   */
  public getSubModuleById(subModuleId: string): { module: ModuleDefinition; subModule: SubModule } | undefined {
    return getSubModuleById(subModuleId);
  }

  // ============================================
  // PERMISOS LEGADOS (MANTENIDOS PARA COMPATIBILIDAD)
  // ============================================

  /**
   * Returns all system permission definitions (legados)
   */
  public getPermissionDefinitions(): LegacyPermissionDefinition[] {
    return ALL_LEGACY_PERMISSIONS.map((key) => LEGACY_PERMISSION_DEFINITIONS[key]);
  }

  // ============================================
  // PERFILES DE USUARIO
  // ============================================

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

    // 1. Initial State (No Access)
    const basePermissions: Record<LegacyPermissionKey, boolean> = {
      admin: false,
      schedule_admin: false,
      schedule_approver: false,
      dashboard_access: false,
      view_salaries: false,
    };

    // 2. Build Legacy Permissions (from Employee Override ONLY)
    const legacyOverride = this.parseLegacyOverride(employee);
    // Legacy override is now the ONLY source of permissions

    const finalPermissions: Record<LegacyPermissionKey, boolean> = { ...basePermissions };
    const sources: Record<LegacyPermissionKey, 'position' | 'user_override'> = {
      admin: 'user_override',
      schedule_admin: 'user_override',
      schedule_approver: 'user_override',
      dashboard_access: 'user_override',
      view_salaries: 'user_override',
    };

    if (legacyOverride) {
      Object.entries(legacyOverride).forEach(([key, value]) => {
        const permKey = key as LegacyPermissionKey;
        // Only valid keys
        if (permKey in finalPermissions) {
          finalPermissions[permKey] = value;
          sources[permKey] = 'user_override';
        }
      });
    } else {
      // FALLBACK: If no override exists (migration didn't run), use Position permissions
      // This ensures admins don't lose access before migration
      if (position?.admin) {
        finalPermissions.admin = true;
        sources.admin = 'position';
      }
      if (position?.schedule_admin) {
        finalPermissions.schedule_admin = true;
        sources.schedule_admin = 'position';
      }
      if (position?.schedule_approver) {
        finalPermissions.schedule_approver = true;
        sources.schedule_approver = 'position';
      }
      if (position?.dashboard_access) {
        finalPermissions.dashboard_access = true;
        sources.dashboard_access = 'position';
      }
      if (checkSalaryAccess(position?.name)) {
        finalPermissions.view_salaries = true;
        sources.view_salaries = 'position';
      }
    }

    // 3. Build Frontend Permissions (from Employee Override ONLY)
    // We no longer read from Position. Defaults are all FALSE.
    const defaultFrontend = { version: 1, modules: {} } as FrontendPermissions;

    // 4. Apply employee override if exists
    const employeeOverride = this.parseEmployeeOverride(employee);
    const hasFrontendOverride = employeeOverride !== null;

    // If override exists, use it. If not, fallback to Position permissions (for backward compatibility)
    const frontendPermissions = hasFrontendOverride
      ? employeeOverride
      : this.buildFrontendPermissions(position);

    return {
      employeeId: employee.id,
      employeeName:
        employee.full_name || `${employee.first_name} ${employee.father_name}`,
      positionId: employee.position_id,
      positionName: position?.name || 'Sin Cargo',
      branchName: employee.branch?.name || 'Sin Sucursal',
      permissions: finalPermissions,
      sources: sources,
      frontendPermissions: frontendPermissions,
      employeeFrontendPermissions: employeeOverride ?? undefined,
      hasEmployeeOverride: true, // Always considered "custom"/employee-level now
      userType: this.determineUserType(employee, finalPermissions),
      isSupportUser: this.store.testMode.isSupportUser(employee.work_email),
      testMode: false,
    };
  }

  /**
   * Helper to create empty frontend permissions (all disabled)
   */
  private createEmptyFrontendPermissions(): FrontendPermissions {
    const perms = createDefaultFrontendPermissions();
    // Ensure everything is disabled
    Object.values(perms.modules).forEach(m => {
      m.enabled = false;
      Object.keys(m.subModules).forEach(k => m.subModules[k] = false);
    });
    return perms;
  }

  /**
   * Parsea el override de permisos legacy del empleado
   */
  private parseLegacyOverride(employee: Employee): Record<string, boolean> | null {
    if (!employee.legacy_permissions_override) return null;

    try {
      const parsed = typeof employee.legacy_permissions_override === 'string'
        ? JSON.parse(employee.legacy_permissions_override)
        : employee.legacy_permissions_override;

      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, boolean>;
      }
      return null;
    } catch (e) {
      console.warn('Error parsing legacy_permissions_override for employee:', employee.id, e);
      return null;
    }
  }

  /**
   * Parsea el override de permisos de frontend del empleado
   */
  private parseEmployeeOverride(employee: Employee): FrontendPermissions | null {
    if (!employee.frontend_permissions_override) return null;

    try {
      const parsed = typeof employee.frontend_permissions_override === 'string'
        ? JSON.parse(employee.frontend_permissions_override)
        : employee.frontend_permissions_override;

      if (parsed && parsed.modules) {
        return parsed as FrontendPermissions;
      }
      return null;
    } catch (e) {
      console.warn('Error parsing frontend_permissions_override for employee:', employee.id, e);
      return null;
    }
  }

  /**
   * Mergea permisos de frontend: por cada módulo en override, reemplaza el módulo completo.
   * Los módulos no definidos en override mantienen el valor del cargo.
   */
  private mergeFrontendPermissions(
    base: FrontendPermissions,
    override: FrontendPermissions
  ): FrontendPermissions {
    const merged: FrontendPermissions = {
      version: override.version || base.version || 1,
      modules: { ...base.modules },
    };

    // Override reemplaza módulo por módulo
    for (const [moduleId, modulePerm] of Object.entries(override.modules)) {
      merged.modules[moduleId] = { ...modulePerm };
    }

    return merged;
  }

  /**
   * Construye los permisos de frontend basados en el cargo
   * Si el cargo tiene frontend_permissions en la DB, los usa
   * Si no, usa los valores por defecto basados en el tipo de cargo
   */
  private buildFrontendPermissions(position?: Position): FrontendPermissions {
    const defaultPerms = createDefaultFrontendPermissions();

    // Si el cargo tiene permisos de frontend guardados, usarlos
    if (position?.frontend_permissions) {
      try {
        const saved = typeof position.frontend_permissions === 'string'
          ? JSON.parse(position.frontend_permissions)
          : position.frontend_permissions;

        return {
          version: saved.version || 1,
          modules: { ...defaultPerms.modules, ...saved.modules },
        };
      } catch (e) {
        console.warn('Error parsing frontend_permissions for position:', position.id, e);
      }
    }

    // Si no hay permisos guardados, aplicar defaults basados en el tipo de cargo
    return this.getDefaultFrontendPermissions(position);
  }

  /**
   * Genera permisos por defecto basados en el tipo de cargo
   */
  private getDefaultFrontendPermissions(position?: Position): FrontendPermissions {
    const perms: FrontendPermissions = {
      version: 1,
      modules: {},
    };

    // Por defecto, todos los módulos están desactivados
    SYSTEM_MODULES.forEach(module => {
      perms.modules[module.id] = {
        moduleId: module.id,
        enabled: false,
        subModules: {},
      };

      // Todos los submódulos desactivados por defecto
      module.subModules.forEach(sub => {
        perms.modules[module.id].subModules[sub.id] = false;
      });
    });

    if (!position) return perms;

    // Aplicar reglas basadas en el tipo de cargo

    // Administradores: acceso a casi todo
    if (position.admin) {
      SYSTEM_MODULES.forEach(module => {
        // El portal del empleado y reloj checador no son para admins por defecto
        if (module.id !== 'employee_portal' && module.id !== 'timeclock') {
          perms.modules[module.id].enabled = true;
          module.subModules.forEach(sub => {
            perms.modules[module.id].subModules[sub.id] = true;
          });
        }
      });
    }

    // Schedule admin: acceso a gestión de tiempo
    if (position.schedule_admin) {
      const tmModule = perms.modules['time_management'];
      if (tmModule) {
        tmModule.enabled = true;
        tmModule.subModules['timelogs'] = true;
        tmModule.subModules['timetables'] = true;
        tmModule.subModules['schedules'] = true;
        tmModule.subModules['shifts'] = true;
      }
    }

    // Dashboard access: acceso básico a admin
    if (position.dashboard_access) {
      const adminModule = perms.modules['admin'];
      if (adminModule) {
        adminModule.enabled = true;
        // Solo acceso a empleados y organigrama por defecto
        adminModule.subModules['employees'] = true;
        adminModule.subModules['organigrama'] = true;
      }
    }

    return perms;
  }

  private determineUserType(
    employee: Employee,
    permissions?: Record<LegacyPermissionKey, boolean>
  ): 'employee' | 'manager' | 'admin' | 'superadmin' {
    // If we have calculated permissions, use them (handles overrides)
    if (permissions) {
      if (permissions.admin) return 'admin';
      if (permissions.schedule_admin) return 'manager';
      return 'employee';
    }

    // Fallback to position properties (legacy behavior)
    if (employee.position?.admin) return 'admin';
    if (employee.position?.schedule_admin) return 'manager';
    return 'employee';
  }

  // ============================================
  // ACTUALIZACIÓN DE PERMISOS
  // ============================================

  /**
   * DEPRECATED: Position permissions are no longer used.
   * Steps to remove completely:
   * 1. Remove calls from UI (permissions-management.component.ts)
   * 2. Remove calls from any other service
   * 3. Delete these methods.
   * For now, we leave empty implementations or warnings to avoid breaking build if called.
   */
  public async updatePositionPermissions(
    positionId: string,
    permissions: Partial<Record<LegacyPermissionKey, boolean>>
  ): Promise<void> {
    console.warn('updatePositionPermissions is deprecated. Use updateEmployeeLegacyPermissions instead.');
  }

  public async updatePositionFrontendPermissions(
    positionId: string,
    frontendPermissions: FrontendPermissions
  ): Promise<void> {
    console.warn('updatePositionFrontendPermissions is deprecated. Use updateEmployeeFrontendPermissions instead.');
  }


  /**
   * Updates frontend module permissions at the Employee level (override)
   */
  public async updateEmployeeFrontendPermissions(
    employeeId: string,
    frontendPermissions: FrontendPermissions
  ): Promise<void> {
    const updates: Partial<Employee> = {
      frontend_permissions_override: JSON.stringify(frontendPermissions),
    };

    await firstValueFrom(
      this.employeesStore.editItem({ id: employeeId, ...updates } as any)
    );
  }

  /**
   * Clears the employee override, restoring position-level permissions
   */
  public async clearEmployeeFrontendPermissions(
    employeeId: string
  ): Promise<void> {
    await firstValueFrom(
      this.employeesStore.editItem({ id: employeeId, frontend_permissions_override: null } as any)
    );
  }

  /**
   * Updates legacy permissions at the Employee level (override)
   */
  public async updateEmployeeLegacyPermissions(
    employeeId: string,
    permissions: Partial<Record<LegacyPermissionKey, boolean>>
  ): Promise<void> {
    const updates: Partial<Employee> = {
      legacy_permissions_override: JSON.stringify(permissions),
    };

    await firstValueFrom(
      this.employeesStore.editItem({ id: employeeId, ...updates } as any)
    );
  }

  /**
   * Clears the legacy employee override
   */
  public async clearEmployeeLegacyPermissions(
    employeeId: string
  ): Promise<void> {
    await firstValueFrom(
      this.employeesStore.editItem({ id: employeeId, legacy_permissions_override: null } as any)
    );
  }

  /**
   * Clears ALL employee overrides (frontend + legacy)
   */
  public async clearAllEmployeeOverrides(
    employeeId: string
  ): Promise<void> {
    await firstValueFrom(
      this.employeesStore.editItem({
        id: employeeId,
        frontend_permissions_override: null,
        legacy_permissions_override: null
      } as any)
    );
  }

  // ============================================
  // VERIFICACIÓN DE PERMISOS (HELPERS)
  // ============================================

  /**
   * Helper checks for current user (consumed by guards/components)
   * These parallel the existing checks in DashboardStore but centralized
   */
  public canCurrentUser(action: LegacyPermissionKey): boolean {
    const currentEmployee = this.store.currentEmployee();
    if (!currentEmployee) return false;

    const profile = this.buildUserProfile(currentEmployee);
    return profile.permissions[action];
  }

  /**
   * Verifica si el usuario actual tiene acceso a un submódulo específico
   * USO PRINCIPAL: Guards de rutas
   */
  public canAccessSubModule(moduleId: string, subModuleId: string): boolean {
    const currentEmployee = this.store.currentEmployee();
    if (!currentEmployee) return false;

    const profile = this.buildUserProfile(currentEmployee);
    return hasSubModuleAccess(profile.frontendPermissions, moduleId, subModuleId);
  }

  /**
   * Verifica si el usuario actual tiene acceso a un módulo completo
   */
  public canAccessModule(moduleId: string): boolean {
    const currentEmployee = this.store.currentEmployee();
    if (!currentEmployee) return false;

    const profile = this.buildUserProfile(currentEmployee);
    return hasModuleAccess(profile.frontendPermissions, moduleId);
  }

  /**
   * Obtiene los permisos de frontend del usuario actual
   */
  public getCurrentUserFrontendPermissions(): FrontendPermissions | null {
    const currentEmployee = this.store.currentEmployee();
    if (!currentEmployee) return null;

    const profile = this.buildUserProfile(currentEmployee);
    return profile.frontendPermissions;
  }

  /**
   * Obtiene la lista de submódulos permitidos para el usuario actual
   */
  public getCurrentUserAllowedSubModules(): string[] {
    const perms = this.getCurrentUserFrontendPermissions();
    if (!perms) return [];

    const allowed: string[] = [];

    for (const [moduleId, modulePerm] of Object.entries(perms.modules)) {
      if (!modulePerm.enabled) continue;

      for (const [subModuleId, enabled] of Object.entries(modulePerm.subModules)) {
        if (enabled) {
          allowed.push(subModuleId);
        }
      }
    }

    return allowed;
  }

  /**
   * Obtiene la lista de módulos permitidos para el usuario actual
   */
  public getCurrentUserAllowedModules(): string[] {
    const perms = this.getCurrentUserFrontendPermissions();
    if (!perms) return [];

    return Object.entries(perms.modules)
      .filter(([_, modulePerm]) => modulePerm.enabled)
      .map(([moduleId, _]) => moduleId);
  }
}
