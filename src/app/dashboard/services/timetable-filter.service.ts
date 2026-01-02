import { computed, inject, Injectable, signal } from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';

// NOTA: No usar providedIn:'root' porque depende de DashboardStore (scope dashboard/layout).
// Se provee explícitamente en EmployeesTimetableComponent para compartir el mismo injector.
@Injectable()
export class TimetableFilterService {
  private store = inject(DashboardStore);

  // Signals de filtros (usar signal en lugar de model en servicios)
  public employeeSearch = signal<string>('');
  public currentBranch = signal<string | undefined>(undefined);
  public currentPosition = signal<string | undefined>(undefined);

  /**
   * Computed que filtra los empleados según los criterios de búsqueda
   * Retorna empleados activos filtrados por:
   * - Búsqueda de nombre
   * - Sucursal
   * - Puesto
   * - Restricciones de gerente de tienda
   */
  public filteredEmployees = computed(() => {
    const employees = this.store.employees
      .employeesList()
      .filter((employee) => employee.is_active);

    // Si es gerente de tienda (schedule_admin pero no admin), filtrar estrictamente por su sucursal
    const isManager = !!(this.store.isScheduleAdmin() && !this.store.isAdmin());
    const managerBranchId = isManager ? this.store.currentBranch()?.id : null;

    return employees
      .filter((employee) => {
        // Si es gerente, solo mostrar empleados de su sucursal
        if (isManager && managerBranchId) {
          if (employee.branch_id !== managerBranchId) {
            return false;
          }
        }

        // Filtro por búsqueda de nombre
        const searchTerm = this.employeeSearch()?.toLowerCase().trim() || '';
        const matchesSearch =
          !searchTerm ||
          `${employee.first_name} ${employee.father_name}`
            .toLowerCase()
            .includes(searchTerm) ||
          employee.first_name.toLowerCase().includes(searchTerm) ||
          employee.father_name.toLowerCase().includes(searchTerm);

        // Filtro por sucursal (selector manual)
        const matchesBranch =
          !this.currentBranch() || employee.branch_id === this.currentBranch();

        // Filtro por puesto
        const matchesPosition =
          !this.currentPosition() ||
          employee.position_id === this.currentPosition();

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
        }) => ({
          id,
          first_name,
          father_name,
          branch,
          branch_id,
          position,
          position_id,
        })
      );
  });
}
