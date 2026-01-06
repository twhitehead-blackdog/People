import { DatePipe, NgClass, registerLocaleData } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import esLocale from '@angular/common/locales/es';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

// Registrar locale español para Angular
registerLocaleData(esLocale);

import { Branch, Employee, VetBranchAssignment } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { VetBranchAuditService } from '../services/vet-branch-audit.service';
import { DashboardStore } from '../stores/dashboard.store';
import { VetBranchCellComponent } from './vet-branch-cell.component';
import { VetBranchSelectionDialogComponent } from './vet-branch-selection-dialog.component';

type VetWithAssignments = {
  employee: Employee;
  assignments: Map<string, VetBranchAssignment>; // date string -> assignment
};

@Component({
  selector: 'pt-vet-schedule',
  imports: [
    Card,
    TableModule,
    Button,
    NgClass,
    FormsModule,
    Tag,
    DatePipe,
    VetBranchCellComponent,
    VetBranchSelectionDialogComponent,
  ],
  providers: [DynamicDialogRef, DialogService],
  templateUrl: './vet-schedule.component.html',
  styles: [
    `
      .vet-schedule-header {
        @apply flex items-center justify-between w-full;
      }

      .vet-schedule-title {
        @apply m-0;
      }

      .vet-schedule-subtitle {
        @apply text-sm text-gray-400 m-0 mt-1;
      }

      .week-navigation {
        @apply flex items-center gap-2;
      }

      .branch-cell {
        @apply text-center min-w-[80px] max-w-[80px] p-1;
      }

      .branch-tag {
        @apply text-xs font-bold;
      }

      .empty-state {
        @apply text-center py-12;
      }

      .empty-state-icon {
        @apply text-4xl text-gray-400 mb-4;
      }

      .empty-state-text {
        @apply text-gray-400 text-lg;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VetScheduleComponent {
  private store = inject(DashboardStore);
  private http = inject(HttpClient);
  private organizationService = inject(OrganizationService);
  private message = inject(MessageService);
  private dialogService = inject(DialogService);
  private apiUrl = inject(ApiUrlService);
  private auditService = inject(VetBranchAuditService);
  private ref = inject(DynamicDialogRef);

  // Estado del componente
  currentWeekStart = signal<Date>(startOfWeek(new Date(), { weekStartsOn: 0 })); // Domingo
  assignments = signal<VetBranchAssignment[]>([]);
  nonWorkingMap = signal<Record<string, string>>({});

  // Estado del diálogo
  dialogVisible = signal<boolean>(false);
  selectedEmployee = signal<Employee | undefined>(undefined);
  selectedDate = signal<Date | undefined>(undefined);
  selectedAssignment = signal<VetBranchAssignment | undefined>(undefined);

  // Computed signals
  branches = computed(() => this.store.branches.entities());

  daysOfWeek = computed(() => {
    const start = this.currentWeekStart();
    const end = endOfWeek(start, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  });

  vetEmployeesWithAssignments = computed((): VetWithAssignments[] => {
    const vets = this.store.employees
      .entities()
      .filter((employee) => employee.is_active && this.isVetPosition(employee))
      .sort((a, b) => a.first_name.localeCompare(b.first_name));

    const assignmentsMap = new Map<string, VetBranchAssignment[]>();
    this.assignments().forEach((assignment) => {
      const key = assignment.employee_id;
      if (!assignmentsMap.has(key)) {
        assignmentsMap.set(key, []);
      }
      assignmentsMap.get(key)!.push(assignment);
    });

    return vets.map((employee) => {
      const employeeAssignments = assignmentsMap.get(employee.id) || [];
      const assignmentMap = new Map<string, VetBranchAssignment>();

      employeeAssignments.forEach((assignment) => {
        const dateKey = format(assignment.date, 'yyyy-MM-dd');
        assignmentMap.set(dateKey, assignment);
      });

      return {
        employee,
        assignments: assignmentMap,
      };
    });
  });

  // Métodos utilitarios
  private isVetPosition(employee: Employee): boolean {
    const positionName = employee.position?.name?.toLowerCase() || '';
    return (
      positionName.includes('veterinario') ||
      positionName.includes('vet') ||
      positionName.includes('médico veterinario')
    );
  }

  // Navegación de semanas
  goToPreviousWeek(): void {
    this.currentWeekStart.set(addDays(this.currentWeekStart(), -7));
    this.loadAssignments();
    this.loadNonWorkingDays();
  }

  goToNextWeek(): void {
    this.currentWeekStart.set(addDays(this.currentWeekStart(), 7));
    this.loadAssignments();
    this.loadNonWorkingDays();
  }

  goToCurrentWeek(): void {
    this.currentWeekStart.set(startOfWeek(new Date(), { weekStartsOn: 0 }));
    this.loadAssignments();
    this.loadNonWorkingDays();
  }

  constructor() {
    // Carga inicial
    this.loadAssignments();
    this.loadNonWorkingDays();
  }

  // Cargar asignaciones desde la API
  private loadAssignments(): void {
    const startDate = this.currentWeekStart();
    const endDate = endOfWeek(startDate, { weekStartsOn: 0 });

    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la compañía.',
      });
      return;
    }

    this.http
      .get<VetBranchAssignment[]>(
        this.apiUrl.build('rest/v1/vet_branch_assignments', {
          // PostgREST: no podemos repetir la key "date" porque ApiUrlService usa searchParams.set,
          // así que usamos el operador and=(...) para rango.
          and: `(date.gte.${format(startDate, 'yyyy-MM-dd')},date.lte.${format(
            endDate,
            'yyyy-MM-dd'
          )})`,
          company_id: `eq.${companyId}`,
          select:
            '*,branch:branches(id,name,short_name),employee:employees(id,first_name,father_name,position:positions(name))',
        }),
        {}
      )
      .subscribe({
        next: (assignments) => {
          this.assignments.set(assignments);
        },
        error: (error) => {
          console.error('[VetSchedule] Error loading assignments:', error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar las asignaciones veterinarias',
          });
          this.assignments.set([]);
        },
      });
  }

  /**
   * Cargar días no laborables desde Turnos:
   * employee_schedules donde schedule.day_off = true y el rango intersecta la semana actual.
   * Bloquea asignación de sucursal en esos días.
   */
  private loadNonWorkingDays(): void {
    const startDate = this.currentWeekStart();
    const endDate = endOfWeek(startDate, { weekStartsOn: 0 });

    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      this.nonWorkingMap.set({});
      return;
    }

    const vetIds = this.store.employees
      .entities()
      .filter((e) => e.is_active && this.isVetPosition(e))
      .map((e) => e.id);

    if (vetIds.length === 0) {
      this.nonWorkingMap.set({});
      return;
    }

    // Overlap de rangos: start_date <= endDate AND end_date >= startDate
    const and = `(start_date.lte.${format(
      endDate,
      'yyyy-MM-dd'
    )},end_date.gte.${format(startDate, 'yyyy-MM-dd')})`;

    this.http
      .get<any[]>(
        this.apiUrl.build('rest/v1/employee_schedules', {
          company_id: `eq.${companyId}`,
          employee_id: `in.(${vetIds.join(',')})`,
          and,
          select:
            'employee_id,start_date,end_date,schedule:schedules(day_off,name)',
        }),
        {}
      )
      .subscribe({
        next: (rows) => {
          const map: Record<string, string> = {};
          const days = eachDayOfInterval({ start: startDate, end: endDate });

          for (const row of rows || []) {
            const schedule = row.schedule;
            if (!schedule?.day_off) continue;

            const rowStart = new Date(row.start_date);
            const rowEnd = new Date(row.end_date);

            for (const d of days) {
              const dStr = format(d, 'yyyy-MM-dd');
              // Comparación inclusive
              if (d >= rowStart && d <= rowEnd) {
                const key = `${row.employee_id}|${dStr}`;
                // Si hay varias, deja la primera
                if (!map[key]) {
                  map[key] = schedule.name || 'NO LABORA';
                }
              }
            }
          }

          this.nonWorkingMap.set(map);
        },
        error: (error) => {
          console.error('[VetSchedule] Error loading non-working days:', error);
          this.nonWorkingMap.set({});
        },
      });
  }

  isNonWorking(employeeId: string, date: Date): boolean {
    const key = `${employeeId}|${format(date, 'yyyy-MM-dd')}`;
    return !!this.nonWorkingMap()[key];
  }

  getNonWorkingLabel(employeeId: string, date: Date): string | null {
    const key = `${employeeId}|${format(date, 'yyyy-MM-dd')}`;
    return this.nonWorkingMap()[key] ?? null;
  }

  // Obtener asignación para empleado y fecha específica
  getAssignmentForDate(
    employee: Employee,
    date: Date
  ): VetBranchAssignment | null {
    const dateKey = format(date, 'yyyy-MM-dd');
    const employeeAssignments = this.assignments().filter(
      (a) =>
        a.employee_id === employee.id &&
        format(a.date, 'yyyy-MM-dd') === dateKey
    );
    return employeeAssignments[0] || null;
  }

  // Asignar sucursal a empleado en fecha específica
  assignBranch(employee: Employee, date: Date, branch: Branch): void {
    if (!this.store.isAdmin()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo los administradores pueden asignar sucursales.',
      });
      return;
    }

    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la compañía.',
      });
      return;
    }
    const currentEmployeeId = this.store.currentEmployee()?.id;

    if (!currentEmployeeId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la compañía o el usuario actual.',
      });
      return;
    }

    // Buscar asignación actual (para auditoría/UX)
    const existingAssignment = this.assignments().find(
      (a) =>
        a.employee_id === employee.id &&
        format(a.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    const assignmentData = {
      employee_id: employee.id,
      branch_id: branch.id,
      date: format(date, 'yyyy-MM-dd'),
      company_id: companyId,
    };

    // UPSERT para evitar 409 (unique: company_id, employee_id, date)
    // PostgREST: on_conflict y Prefer: resolution=merge-duplicates
    this.http
      .post(
        this.apiUrl.build('rest/v1/vet_branch_assignments', {
          on_conflict: 'company_id,employee_id,date',
          select:
            '*,branch:branches(id,name,short_name),employee:employees(id,first_name,father_name,position:positions(name))',
        }),
        assignmentData,
        {
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
        }
      )
      .subscribe({
        next: (resp: any) => {
          const saved = Array.isArray(resp) ? resp[0] : resp;
          if (!saved?.id) {
            // Fallback: recargar
            this.loadAssignments();
            return;
          }

          // Actualizar estado local: reemplazar si existe, si no agregar
          const withoutOld = this.assignments().filter(
            (a) => a.id !== saved.id
          );
          this.assignments.set([...withoutOld, saved]);

          const wasUpdate =
            !!existingAssignment && existingAssignment.branch_id !== branch.id;

          this.message.add({
            severity: 'success',
            summary: wasUpdate ? 'Actualizado' : 'Asignado',
            detail: wasUpdate
              ? `Sucursal actualizada para ${employee.first_name} ${employee.father_name}`
              : `Sucursal asignada para ${employee.first_name} ${employee.father_name}`,
          });

          // Auditoría
          this.auditService.logChange({
            vetBranchAssignmentId: saved.id,
            changedBy: currentEmployeeId,
            action: wasUpdate ? 'updated' : 'assigned',
            oldBranchId: existingAssignment?.branch_id,
            newBranchId: branch.id,
            oldValue: existingAssignment
              ? { branch_id: existingAssignment.branch_id }
              : null,
            newValue: { ...assignmentData },
            comment: wasUpdate
              ? `Cambio de sucursal: ${
                  existingAssignment?.branch?.short_name || 'N/A'
                } → ${branch.short_name}`
              : `Asignación inicial de sucursal: ${branch.short_name}`,
          });
        },
        error: (error) => {
          console.error('[VetSchedule] Error upserting assignment:', error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al guardar la asignación',
          });
        },
      });
  }

  // Remover asignación
  removeAssignment(employee: Employee, date: Date): void {
    if (!this.store.isAdmin()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo los administradores pueden remover asignaciones.',
      });
      return;
    }

    const currentEmployeeId = this.store.currentEmployee()?.id;
    if (!currentEmployeeId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar el usuario actual.',
      });
      return;
    }

    // Buscar la asignación existente
    const existingAssignment = this.assignments().find(
      (a) =>
        a.employee_id === employee.id &&
        format(a.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    if (!existingAssignment) {
      this.message.add({
        severity: 'warn',
        summary: 'No encontrado',
        detail: 'No se encontró una asignación para remover.',
      });
      return;
    }

    // Eliminar la asignación
    this.http
      .delete(
        this.apiUrl.build('rest/v1/vet_branch_assignments', {
          id: `eq.${existingAssignment.id}`,
        }),
        {}
      )
      .subscribe({
        next: () => {
          // Remover del estado local
          const updatedAssignments = this.assignments().filter(
            (a) => a.id !== existingAssignment.id
          );
          this.assignments.set(updatedAssignments);

          this.message.add({
            severity: 'success',
            summary: 'Removido',
            detail: `Asignación removida para ${employee.first_name} ${employee.father_name}`,
          });

          // Registrar en auditoría
          this.auditService.logChange({
            vetBranchAssignmentId: existingAssignment.id,
            changedBy: currentEmployeeId,
            action: 'unassigned',
            oldBranchId: existingAssignment.branch_id,
            oldValue: {
              branch_id: existingAssignment.branch_id,
              date: existingAssignment.date,
            },
            comment: `Remoción de asignación de sucursal: ${
              existingAssignment.branch?.short_name || 'N/A'
            }`,
          });
        },
        error: (error) => {
          console.error('[VetSchedule] Error deleting assignment:', error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al remover la asignación',
          });
        },
      });
  }

  // Formatear nombre completo del empleado
  getEmployeeFullName(employee: Employee): string {
    return `${employee.first_name} ${employee.father_name}`;
  }

  // Obtener semana actual formateada
  getCurrentWeekLabel(): string {
    const start = this.currentWeekStart();
    const end = endOfWeek(start, { weekStartsOn: 0 });
    const startStr = format(start, 'dd MMM', { locale: es });
    const endStr = format(end, 'dd MMM yyyy', { locale: es });
    return `${startStr} - ${endStr}`;
  }

  // Manejadores de eventos del componente de celda
  onEditAssignment(event: {
    assignment: VetBranchAssignment;
    date: Date;
  }): void {
    // Abrir diálogo para cambiar sucursal
    this.selectedEmployee.set(event.assignment.employee);
    this.selectedDate.set(event.date);
    this.selectedAssignment.set(event.assignment);
    this.dialogVisible.set(true);
  }

  onDeleteAssignment(event: {
    assignment: VetBranchAssignment;
    date: Date;
  }): void {
    this.removeAssignment(event.assignment.employee!, event.date);
  }

  onAddAssignment(event: { employeeId: string; date: Date }): void {
    const employee = this.store.employees
      .entities()
      .find((e) => e.id === event.employeeId);
    if (employee) {
      // Abrir diálogo para seleccionar sucursal
      this.selectedEmployee.set(employee);
      this.selectedDate.set(event.date);
      this.selectedAssignment.set(undefined);
      this.dialogVisible.set(true);
    }
  }

  onViewAudit(event: { employeeId: string; date: Date }): void {
    this.message.add({
      severity: 'info',
      summary: 'Funcionalidad pendiente',
      detail: 'Vista de auditoría próximamente',
    });
  }

  // Manejadores del diálogo
  onDialogConfirm(selectedBranchId: string): void {
    const employee = this.selectedEmployee();
    const date = this.selectedDate();
    const assignment = this.selectedAssignment();

    if (employee && date) {
      const selectedBranch = this.store.branches
        .entities()
        .find((b) => b.id === selectedBranchId);
      if (selectedBranch) {
        this.assignBranch(employee, date, selectedBranch);
      }
    }

    this.closeDialog();
  }

  onDialogCancel(): void {
    this.closeDialog();
  }

  private closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedEmployee.set(undefined);
    this.selectedDate.set(undefined);
    this.selectedAssignment.set(undefined);
  }

  // Getter para acceder a funcionalidades del store desde el template
  get isAdmin(): boolean {
    return this.store.isAdmin();
  }
}
