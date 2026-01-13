import { computed, inject, Injectable } from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';

// NOTA: No usar providedIn:'root' porque depende de DashboardStore, que se provee en el scope del dashboard/layout.
// Se provee explícitamente en EmployeesTimetableComponent para compartir el mismo injector.
//
// @deprecated / Legacy
// Consider using the new centralized PermissionsService (src/app/services/permissions.service.ts)
// for generic permission checks. This service is kept for backward compatibility with the Timetable module.
@Injectable()
export class TimetablePermissionsService {
  private store = inject(DashboardStore);

  /**
   * Determina si el empleado actual pertenece al departamento de Recursos Humanos
   */
  public isHRDepartment = computed(() => {
    const currentEmp = this.store.currentEmployee();
    const deptName = currentEmp?.department?.name?.toLowerCase() || '';
    return (
      deptName.includes('recursos humanos') ||
      deptName.includes('rrhh') ||
      deptName.includes('hr')
    );
  });

  /**
   * Determina si el usuario puede agregar empleados a sucursales
   * Pueden: admins, HR, gerentes de tienda con sucursal asignada, o schedule admins
   */
  public canAddEmployees(): boolean {
    const isAdmin = this.store.isAdmin();
    const isHR = this.isHRDepartment();
    const isManager = this.isStoreManager();
    const hasBranch = !!this.store.currentBranch()?.id;
    const isScheduleAdmin = this.store.isScheduleAdmin();

    return isAdmin || isHR || isScheduleAdmin || (isManager && hasBranch);
  }

  /**
   * Determina si el usuario puede aprobar horarios
   */
  public canApproveSchedules(): boolean {
    return this.store.isScheduleApprover();
  }

  /**
   * Determina si el usuario es gerente de tienda
   * (schedule_admin pero no admin)
   */
  public isStoreManager(): boolean {
    return !!(this.store.isScheduleAdmin() && !this.store.isAdmin());
  }

  /**
   * Determina si el usuario puede seleccionar sucursal en filtros
   * Pueden: admins y HR
   */
  public canSelectBranch(): boolean {
    return this.store.isAdmin() || this.isHRDepartment();
  }

  /**
   * Obtiene el ID de sucursal que debe usarse para filtrar
   * - Admin: puede seleccionar cualquier sucursal (retorna null para permitir selección)
   * - Gerente de tienda: debe usar su sucursal asignada
   * - Otros usuarios: usan su sucursal asignada
   */
  public getFilterBranchId(): string | null | undefined {
    if (this.store.isAdmin()) {
      // Admin puede seleccionar cualquier sucursal
      return null;
    }

    // Si es gerente de tienda (schedule_admin pero no admin), forzar su sucursal
    if (this.isStoreManager()) {
      return this.store.currentBranch()?.id;
    }

    // Para otros usuarios no-admin, también filtrar por sucursal
    return this.store.currentBranch()?.id;
  }

  /**
   * Determina si el selector de sucursal debe estar deshabilitado
   * Deshabilitado para: gerentes de tienda (deben usar su sucursal)
   * Habilitado para: admins y HR
   */
  public shouldDisableBranchSelector(): boolean {
    if (this.store.isAdmin()) {
      return false;
    }

    // Si es gerente de tienda, bloquear cambio de sucursal
    if (this.isStoreManager()) {
      return true;
    }

    return false;
  }
}
