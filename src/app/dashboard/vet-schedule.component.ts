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
import { DropdownModule } from 'primeng/dropdown';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

// Registrar locale español para Angular
registerLocaleData(esLocale);

import { Branch, Employee, VetBranchAssignment } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { VetBranchAuditService } from '../services/vet-branch-audit.service';
import { DashboardStore } from '../stores/dashboard.store';

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
    DropdownModule,
    Tag,
    DatePipe,
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
  private message = inject(MessageService);
  private dialogService = inject(DialogService);
  private apiUrl = inject(ApiUrlService);
  private auditService = inject(VetBranchAuditService);
  private ref = inject(DynamicDialogRef);

  // Estado del componente
  currentWeekStart = signal<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })); // Lunes
  assignments = signal<VetBranchAssignment[]>([]);

  // Computed signals
  daysOfWeek = computed(() => {
    const start = this.currentWeekStart();
    const end = endOfWeek(start, { weekStartsOn: 1 });
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
  }

  goToNextWeek(): void {
    this.currentWeekStart.set(addDays(this.currentWeekStart(), 7));
    this.loadAssignments();
  }

  goToCurrentWeek(): void {
    this.currentWeekStart.set(startOfWeek(new Date(), { weekStartsOn: 1 }));
    this.loadAssignments();
  }

  // Cargar asignaciones desde la API
  private loadAssignments(): void {
    const startDate = this.currentWeekStart();
    const endDate = endOfWeek(startDate, { weekStartsOn: 1 });

    const companyId = this.store.currentEmployee()?.company_id;
    if (!companyId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la compañía.',
      });
      return;
    }
    if (!companyId) {
      console.warn('[VetSchedule] No company ID available');
      this.assignments.set([]);
      return;
    }

    this.http
      .get<VetBranchAssignment[]>(
        this.apiUrl.build('rest/v1/vet_branch_assignments', {
          'date.gte': format(startDate, 'yyyy-MM-dd'),
          'date.lte': format(endDate, 'yyyy-MM-dd'),
          company_id: `eq.${companyId}`,
          select: '*,branch:branches(id,name,short_name),employee:employees(id,first_name,father_name,position:positions(name))',
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

    const companyId = this.store.currentEmployee()?.company_id;
    if (!companyId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la compañía.',
      });
      return;
    }
    const currentEmployeeId = this.store.currentEmployee()?.id;

    if (!companyId || !currentEmployeeId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la compañía o el usuario actual.',
      });
      return;
    }

    // Verificar si ya existe una asignación para este empleado en esta fecha
    const existingAssignment = this.assignments().find(
      a => a.employee_id === employee.id && format(a.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    const assignmentData = {
      employee_id: employee.id,
      branch_id: branch.id,
      date: format(date, 'yyyy-MM-dd'),
      company_id: companyId,
    };

    if (existingAssignment) {
      // Actualizar asignación existente
      this.http
        .patch(
          this.apiUrl.build('rest/v1/vet_branch_assignments', { id: `eq.${existingAssignment.id}` }),
          {
            branch_id: branch.id,
            updated_at: new Date().toISOString(),
          },
          {}
        )
        .subscribe({
          next: () => {
            // Actualizar el estado local
            const updatedAssignments = this.assignments().map(a =>
              a.id === existingAssignment.id
                ? { ...a, branch_id: branch.id, branch, updated_at: new Date() }
                : a
            );
            this.assignments.set(updatedAssignments);

            this.message.add({
              severity: 'success',
              summary: 'Actualizado',
              detail: `Sucursal actualizada para ${employee.first_name} ${employee.father_name}`,
            });

            // Registrar en auditoría
            this.auditService.logChange({
              vetBranchAssignmentId: existingAssignment.id,
              changedBy: currentEmployeeId,
              action: 'updated',
              oldBranchId: existingAssignment.branch_id,
              newBranchId: branch.id,
              oldValue: { branch_id: existingAssignment.branch_id },
              newValue: { branch_id: branch.id },
              comment: `Cambio de sucursal: ${existingAssignment.branch?.short_name || 'N/A'} → ${branch.short_name}`,
            });
          },
          error: (error) => {
            console.error('[VetSchedule] Error updating assignment:', error);
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al actualizar la asignación',
            });
          },
        });
    } else {
      // Crear nueva asignación
      this.http
        .post(
          this.apiUrl.build('rest/v1/vet_branch_assignments'),
          assignmentData,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
        .subscribe({
          next: (created: any) => {
            // Agregar al estado local
            this.assignments.set([...this.assignments(), created[0]]);

            this.message.add({
              severity: 'success',
              summary: 'Asignado',
              detail: `Sucursal asignada para ${employee.first_name} ${employee.father_name}`,
            });

            // Registrar en auditoría
            this.auditService.logChange({
              vetBranchAssignmentId: created[0].id,
              changedBy: currentEmployeeId,
              action: 'assigned',
              newBranchId: branch.id,
              newValue: assignmentData,
              comment: `Asignación inicial de sucursal: ${branch.short_name}`,
            });
          },
          error: (error) => {
            console.error('[VetSchedule] Error creating assignment:', error);
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al crear la asignación',
            });
          },
        });
    }
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
      a => a.employee_id === employee.id && format(a.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
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
        this.apiUrl.build('rest/v1/vet_branch_assignments', { id: `eq.${existingAssignment.id}` }),
        {}
      )
      .subscribe({
        next: () => {
          // Remover del estado local
          const updatedAssignments = this.assignments().filter(a => a.id !== existingAssignment.id);
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
            oldValue: { branch_id: existingAssignment.branch_id, date: existingAssignment.date },
            comment: `Remoción de asignación de sucursal: ${existingAssignment.branch?.short_name || 'N/A'}`,
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
    const end = endOfWeek(start, { weekStartsOn: 1 });
    const startStr = format(start, 'dd MMM', { locale: es });
    const endStr = format(end, 'dd MMM yyyy', { locale: es });
    return `${startStr} - ${endStr}`;
  }

  // Getter para acceder a funcionalidades del store desde el template
  get isAdmin(): boolean {
    return this.store.isAdmin();
  }
}
