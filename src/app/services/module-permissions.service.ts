import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AccessState,
  buildPermissionTree,
  calculateAccessState,
  ClonePermissionsPayload,
  EffectivePermission,
  ModuleAction,
  ModulePermissionNode,
  ModuleUserPermissionProfile,
  SystemModule,
  UpdateOverridePayload,
} from '../dashboard/pt-permissions/permissions.types';
import { Employee } from '../models';
import { ApiUrlService } from './api-url.service';
import { OrganizationService } from './organization.service';

interface EffectivePermissionRow {
  module_id: string;
  module_code: string;
  module_name: string;
  module_icon: string;
  module_route: string;
  parent_id: string | null;
  order_index: number;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  is_blocked: boolean;
  source: string;
  expires_at: string | null;
}

interface SystemModuleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  route: string;
  parent_id: string | null;
  order_index: number;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ModulePermissionsService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);

  // Cache de módulos del sistema
  private systemModules = signal<SystemModule[]>([]);

  // Cache de permisos efectivos del usuario actual
  private currentUserPermissions = signal<EffectivePermission[]>([]);

  // Estado de carga
  private loading = signal(false);
  private initialized = signal(false);

  // =====================================================
  // COMPUTED SIGNALS
  // =====================================================

  /** Módulos accesibles para el menú principal */
  public accessibleModules = computed(() => {
    const perms = this.currentUserPermissions();
    return perms
      .filter((p) => p.canView && !p.isBlocked && !p.parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  });

  /** Árbol de permisos para UI */
  public permissionTree = computed(() => {
    return buildPermissionTree(this.currentUserPermissions());
  });

  /** Estado de acceso general del usuario actual */
  public currentAccessState = computed<AccessState>(() => {
    return calculateAccessState(this.currentUserPermissions());
  });

  /** Indica si está cargando */
  public isLoading = computed(() => this.loading());

  /** Indica si ya se inicializó */
  public isInitialized = computed(() => this.initialized());

  // =====================================================
  // MÉTODOS PÚBLICOS
  // =====================================================

  /**
   * Inicializa el servicio cargando módulos del sistema
   */
  async initialize(): Promise<void> {
    if (this.initialized()) return;

    this.loading.set(true);
    try {
      await this.loadSystemModules();
      this.initialized.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Carga los permisos efectivos del usuario actual
   */
  async loadCurrentUserPermissions(employeeId: string): Promise<void> {
    if (!employeeId) return;

    this.loading.set(true);
    try {
      const permissions = await this.fetchEffectivePermissions(employeeId);
      this.currentUserPermissions.set(permissions);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Verifica si el usuario actual tiene acceso a un módulo
   */
  canAccess(moduleCode: string, action: ModuleAction = 'view'): boolean {
    const perms = this.currentUserPermissions();
    const perm = perms.find((p) => p.moduleCode === moduleCode);

    if (!perm || perm.isBlocked) return false;

    switch (action) {
      case 'view':
        return perm.canView;
      case 'create':
        return perm.canCreate;
      case 'edit':
        return perm.canEdit;
      case 'delete':
        return perm.canDelete;
      default:
        return false;
    }
  }

  /**
   * Verifica acceso por ID de módulo
   */
  canAccessById(moduleId: string, action: ModuleAction = 'view'): boolean {
    const perms = this.currentUserPermissions();
    const perm = perms.find((p) => p.moduleId === moduleId);

    if (!perm || perm.isBlocked) return false;

    switch (action) {
      case 'view':
        return perm.canView;
      case 'create':
        return perm.canCreate;
      case 'edit':
        return perm.canEdit;
      case 'delete':
        return perm.canDelete;
      default:
        return false;
    }
  }

  /**
   * Obtiene el perfil completo de permisos de un empleado
   */
  async getEmployeeProfile(
    employee: Employee
  ): Promise<ModuleUserPermissionProfile> {
    const permissions = await this.fetchEffectivePermissions(employee.id);

    const totalModules = permissions.filter((p) => !p.parentId).length;
    const accessibleModules = permissions.filter(
      (p) => !p.parentId && p.canView && !p.isBlocked
    ).length;
    const blockedModules = permissions.filter(
      (p) => !p.parentId && p.isBlocked
    ).length;

    const hasOverrides = await this.hasEmployeeOverrides(employee.id);

    return {
      employeeId: employee.id,
      employeeName:
        employee.full_name ||
        `${employee.first_name} ${employee.father_name}`.trim(),
      positionId: employee.position_id,
      positionName: employee.position?.name || 'Sin Cargo',
      branchId: employee.branch_id,
      branchName: employee.branch?.name || 'Sin Sucursal',
      modulePermissions: permissions,
      accessState: calculateAccessState(permissions),
      totalModules,
      accessibleModules,
      blockedModules,
      hasOverrides,
    };
  }

  /**
   * Obtiene los perfiles de todos los empleados activos
   */
  async getAllProfiles(
    employees: Employee[]
  ): Promise<ModuleUserPermissionProfile[]> {
    const profiles: ModuleUserPermissionProfile[] = [];

    for (const employee of employees.filter((e) => e.is_active)) {
      const profile = await this.getEmployeeProfile(employee);
      profiles.push(profile);
    }

    return profiles;
  }

  // =====================================================
  // OPERACIONES DE MODIFICACIÓN
  // =====================================================

  /**
   * Actualiza un override para un empleado
   */
  async updateEmployeeOverride(payload: UpdateOverridePayload): Promise<void> {
    const companyId = this.orgService.getCurrentCompanyId();

    const body: Record<string, unknown> = {
      employee_id: payload.employeeId,
      module_id: payload.moduleId,
      company_id: companyId,
    };

    if (payload.canView !== undefined) body['can_view'] = payload.canView;
    if (payload.canCreate !== undefined) body['can_create'] = payload.canCreate;
    if (payload.canEdit !== undefined) body['can_edit'] = payload.canEdit;
    if (payload.canDelete !== undefined) body['can_delete'] = payload.canDelete;
    if (payload.isBlocked !== undefined) body['is_blocked'] = payload.isBlocked;
    if (payload.reason) body['reason'] = payload.reason;

    const url = this.apiUrl.build('employee_permission_overrides');

    await firstValueFrom(
      this.http.post(url, body, {
        headers: { Prefer: 'resolution=merge-duplicates' },
      })
    );
  }

  /**
   * Bloquea un módulo para un empleado
   */
  async blockModule(
    employeeId: string,
    moduleId: string,
    reason?: string
  ): Promise<void> {
    await this.updateEmployeeOverride({
      employeeId,
      moduleId,
      isBlocked: true,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      reason,
    });
  }

  /**
   * Desbloquea un módulo para un empleado
   */
  async unblockModule(employeeId: string, moduleId: string): Promise<void> {
    const url = this.apiUrl.build('employee_permission_overrides', {
      employee_id: `eq.${employeeId}`,
      module_id: `eq.${moduleId}`,
    });

    await firstValueFrom(this.http.delete(url));
  }

  /**
   * Clona permisos de un empleado a otro
   */
  async clonePermissions(payload: ClonePermissionsPayload): Promise<void> {
    const url = this.apiUrl.build('rpc/clone_employee_permissions');

    await firstValueFrom(
      this.http.post(url, {
        p_source_employee_id: payload.sourceEmployeeId,
        p_target_employee_id: payload.targetEmployeeId,
        p_include_overrides: payload.includeOverrides,
      })
    );
  }

  /**
   * Resetea los permisos de un empleado a los de su cargo
   */
  async resetToPosition(employeeId: string): Promise<void> {
    const url = this.apiUrl.build('rpc/reset_employee_permissions');

    await firstValueFrom(
      this.http.post(url, {
        p_employee_id: employeeId,
      })
    );
  }

  /**
   * Bloquea todos los módulos para un empleado
   */
  async blockAllModules(employeeId: string, reason?: string): Promise<void> {
    const modules = this.systemModules();

    for (const module of modules.filter((m) => !m.parentId)) {
      await this.blockModule(employeeId, module.id, reason);
    }
  }

  /**
   * Actualiza múltiples permisos de un empleado de una vez
   */
  async bulkUpdateOverrides(
    employeeId: string,
    updates: Array<{
      moduleId: string;
      canView?: boolean;
      canCreate?: boolean;
      canEdit?: boolean;
      canDelete?: boolean;
      isBlocked?: boolean;
    }>
  ): Promise<void> {
    for (const update of updates) {
      await this.updateEmployeeOverride({
        employeeId,
        ...update,
      });
    }
  }

  // =====================================================
  // MÉTODOS PRIVADOS
  // =====================================================

  /**
   * Carga los módulos del sistema desde la BD
   */
  private async loadSystemModules(): Promise<void> {
    const url = this.apiUrl.build('system_modules', {
      is_active: 'eq.true',
      order: 'order_index.asc',
    });

    const response = await firstValueFrom(
      this.http.get<SystemModuleRow[]>(url)
    );

    const modules: SystemModule[] = response.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || undefined,
      icon: row.icon,
      route: row.route,
      parentId: row.parent_id,
      orderIndex: row.order_index,
      isActive: row.is_active,
    }));

    this.systemModules.set(modules);
  }

  /**
   * Obtiene los permisos efectivos de un empleado
   */
  private async fetchEffectivePermissions(
    employeeId: string
  ): Promise<EffectivePermission[]> {
    const url = this.apiUrl.build('rpc/get_effective_permissions');

    try {
      const response = await firstValueFrom(
        this.http.post<EffectivePermissionRow[]>(url, {
          p_employee_id: employeeId,
        })
      );

      return response.map((row) => ({
        moduleId: row.module_id,
        moduleCode: row.module_code,
        moduleName: row.module_name,
        moduleIcon: row.module_icon,
        moduleRoute: row.module_route,
        parentId: row.parent_id,
        orderIndex: row.order_index,
        canView: row.can_view,
        canCreate: row.can_create,
        canEdit: row.can_edit,
        canDelete: row.can_delete,
        isBlocked: row.is_blocked,
        source: row.source as EffectivePermission['source'],
        expiresAt: row.expires_at,
      }));
    } catch {
      // Si la función RPC no existe aún, retornar permisos vacíos
      console.warn(
        '[ModulePermissionsService] RPC get_effective_permissions not available yet'
      );
      return [];
    }
  }

  /**
   * Verifica si un empleado tiene overrides
   */
  private async hasEmployeeOverrides(employeeId: string): Promise<boolean> {
    const url = this.apiUrl.build('employee_permission_overrides', {
      employee_id: `eq.${employeeId}`,
      select: 'id',
      limit: '1',
    });

    try {
      const response = await firstValueFrom(
        this.http.get<{ id: string }[]>(url)
      );
      return response.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Espera a que el empleado esté cargado (para guards)
   */
  async waitForInitialization(maxWait = 5000): Promise<boolean> {
    const checkInterval = 100;
    let waited = 0;

    while (!this.initialized() && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    return this.initialized();
  }

  // =====================================================
  // GETTERS
  // =====================================================

  /** Obtiene todos los módulos del sistema */
  getSystemModules(): SystemModule[] {
    return this.systemModules();
  }

  /** Obtiene un módulo por código */
  getModuleByCode(code: string): SystemModule | undefined {
    return this.systemModules().find((m) => m.code === code);
  }

  /** Obtiene un módulo por ID */
  getModuleById(id: string): SystemModule | undefined {
    return this.systemModules().find((m) => m.id === id);
  }

  /** Obtiene los permisos actuales */
  getCurrentPermissions(): EffectivePermission[] {
    return this.currentUserPermissions();
  }

  /** Obtiene el árbol de permisos */
  getPermissionTree(): ModulePermissionNode[] {
    return this.permissionTree();
  }
}
