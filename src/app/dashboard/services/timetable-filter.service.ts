import { computed, inject, Injectable, signal } from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';
import { isStoreManagerRole } from '../../utils/permission.utils';

/** Orden fijo de cargos para la grilla de turnos */
const POSITION_ORDER: Record<string, number> = {
  'gerente de tienda': 1,
  'sub gerente': 2,
  'piso de venta': 3,
  'peluquero': 4,
  'asistente de peluquería': 5,
  'conductor': 6,
  'médico veterinario': 7,
};

// NOTA: No usar providedIn:'root' porque depende de DashboardStore (scope dashboard/layout).
// Se provee explícitamente en EmployeesTimetableComponent para compartir el mismo injector.
@Injectable()
export class TimetableFilterService {
  private store = inject(DashboardStore);

  // Signals de filtros (usar signal en lugar de model en servicios)
  public employeeSearch = signal<string>('');
  public currentBranch = signal<string | undefined>(undefined);
  public currentPosition = signal<string | undefined>(undefined);

  /** Gerente o subgerente de tienda: mismo criterio que TimetablePermissionsService.isStoreManager() */
  private isStoreManager(): boolean {
    return isStoreManagerRole(
      this.store.isScheduleAdmin(),
      this.store.isAdmin(),
      this.store.currentEmployee()?.position?.name || ''
    );
  }

  /**
   * Computed que filtra los empleados según los criterios de búsqueda
   * Retorna empleados activos filtrados por:
   * - Búsqueda de nombre
   * - Sucursal
   * - Puesto
   * - Restricciones de gerente/subgerente de tienda
   */
  public filteredEmployees = computed(() => {
    const employees = this.store.employees
      .employeesList()
      .filter((employee) => employee.is_active);

    const isManager = this.isStoreManager();
    const managerBranchId = isManager ? this.store.currentBranch()?.id : null;

    const searchTerm = this.employeeSearch()?.toLowerCase().trim() || '';
    const branchId = this.currentBranch();
    const positionId = this.currentPosition();

    return employees
      .filter((employee) => {
        if (isManager && managerBranchId && employee.branch_id !== managerBranchId) {
          return false;
        }
        const matchesSearch =
          !searchTerm ||
          `${employee.first_name} ${employee.father_name}`.toLowerCase().includes(searchTerm) ||
          (employee.first_name?.toLowerCase().includes(searchTerm) ?? false) ||
          (employee.father_name?.toLowerCase().includes(searchTerm) ?? false);
        const matchesBranch = !branchId || employee.branch_id === branchId;
        const matchesPosition = !positionId || employee.position_id === positionId;
        return matchesSearch && matchesBranch && matchesPosition;
      })
      .map(
        ({
          id,
          first_name,
          father_name,
          branch,
          branch_id,
          position_id,
          position,
          start_date,
          is_floating,
        }: any) => ({
          id,
          first_name,
          father_name,
          branch,
          branch_id,
          position,
          position_id,
          start_date,
          is_floating,
        })
      )
      .sort((a, b) => {
        const nameA = (a.position?.name || '').toLowerCase();
        const nameB = (b.position?.name || '').toLowerCase();
        const orderA = POSITION_ORDER[nameA] ?? 99;
        const orderB = POSITION_ORDER[nameB] ?? 99;
        return orderA - orderB || nameA.localeCompare(nameB);
      });
  });
}
