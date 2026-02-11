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

    // 1. Get Base Permissions from Position
    const basePermissions: Record<LegacyPermissionKey, boolean> = {
      admin: position?.admin || false,
      schedule_admin: position?.schedule_admin || false,
      schedule_approver: position?.schedule_approver || false,
      dashboard_access: position?.dashboard_access || false,
      view_salaries: checkSalaryAccess(position?.name),
    };

    // 2. Build Frontend Permissions from Position
    const positionFrontendPermissions = this.buildFrontendPermissions(position);

    // 3. Apply employee override if exists
    const employeeOverride = this.parseEmployeeOverride(employee);
    const hasEmployeeOverride = employeeOverride !== null;
    const frontendPermissions = hasEmployeeOverride
      ? this.mergeFrontendPermissions(positionFrontendPermissions, employeeOverride)
      : positionFrontendPermissions;

    // 4. Merge Permissions (Hybrid Logic)
    const finalPermissions: Record<LegacyPermissionKey, boolean> = {
      ...basePermissions,
    };
    const sources: Record<LegacyPermissionKey, 'position' | 'user_override'> = {
      admin: 'position',
      schedule_admin: 'position',
      schedule_approver: 'position',
      dashboard_access: 'position',
      view_salaries: 'position',
    };

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
      hasEmployeeOverride,
      userType: this.determineUserType(employee),
      isSupportUser: this.store.testMode.isSupportUser(employee.work_email),
      testMode: false,
    };
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
    employee: Employee
  ): 'employee' | 'manager' | 'admin' | 'superadmin' {
    if (employee.position?.admin) return 'admin';
    if (employee.position?.schedule_admin) return 'manager';
    return 'employee';
  }

  // ============================================
  // ACTUALIZACIÓN DE PERMISOS
  // ============================================

  /**
   * Updates permissions at the Position level (legacy)
   */
  public async updatePositionPermissions(
    positionId: string,
    permissions: Partial<Record<LegacyPermissionKey, boolean>>
  ): Promise<void> {
    const updates: Partial<Position> = {};

    if (permissions.admin !== undefined) updates.admin = permissions.admin;
    if (permissions.schedule_admin !== undefined)
      updates.schedule_admin = permissions.schedule_admin;
    if (permissions.schedule_approver !== undefined)
      updates.schedule_approver = permissions.schedule_approver;
    if (permissions.dashboard_access !== undefined)
      updates.dashboard_access = permissions.dashboard_access;

    if (Object.keys(updates).length > 0) {
      await firstValueFrom(
        this.positionsStore.editItem({ id: positionId, ...updates } as any)
      );
    }
  }

  /**
   * Updates frontend module permissions at the Position level
   * NUEVO: Actualiza los permisos de frontend por módulo/submódulo
   */
  public async updatePositionFrontendPermissions(
    positionId: string,
    frontendPermissions: FrontendPermissions
  ): Promise<void> {
    const updates: Partial<Position> = {
      frontend_permissions: JSON.stringify(frontendPermissions),
    };

    await firstValueFrom(
      this.positionsStore.editItem({ id: positionId, ...updates } as any)
    );
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

    // Support users tienen acceso a todo
    if (this.store.testMode.isSupportUser(currentEmployee.work_email)) {
      return true;
    }

    const profile = this.buildUserProfile(currentEmployee);
    return hasSubModuleAccess(profile.frontendPermissions, moduleId, subModuleId);
  }

  /**
   * Verifica si el usuario actual tiene acceso a un módulo completo
   */
  public canAccessModule(moduleId: string): boolean {
    const currentEmployee = this.store.currentEmployee();
    if (!currentEmployee) return false;

    // Support users tienen acceso a todo
    if (this.store.testMode.isSupportUser(currentEmployee.work_email)) {
      return true;
    }

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
