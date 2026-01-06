import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

import { Employee, Schedule } from '../models';
import { DashboardStore } from '../stores/dashboard.store';

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
  ],
  providers: [DynamicDialogRef, DialogService],
  templateUrl: './vet-schedule.component.html',
  styles: [`
    /* Estilos específicos del componente */
    .vet-schedule-header {
      @apply flex items-center justify-between w-full;
    }

    .vet-schedule-title {
      @apply m-0;
    }

    .vet-schedule-subtitle {
      @apply text-sm text-gray-400 m-0 mt-1;
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VetScheduleComponent {
  private store = inject(DashboardStore);
  private message = inject(MessageService);
  private dialogService = inject(DialogService);
  private ref = inject(DynamicDialogRef);

  // Estado del componente
  public selectedBranchId = signal<string | null>(null);

  // Computed signals
  public branches = computed(() => this.store.branches.entities());

  public vetEmployees = computed(() => {
    const branchId = this.selectedBranchId();
    if (!branchId) return [];

    return this.store.employees.entities()
      .filter(employee =>
        employee.branch_id === branchId &&
        employee.is_active &&
        this.isVetPosition(employee)
      )
      .map(employee => ({
        ...employee,
        full_name: `${employee.first_name} ${employee.father_name}`,
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  });

  // Métodos utilitarios (lógica pura)
  private isVetPosition(employee: Employee): boolean {
    const positionName = employee.position?.name?.toLowerCase() || '';
    return positionName.includes('veterinario') ||
           positionName.includes('vet') ||
           positionName.includes('médico veterinario');
  }

  // Métodos de acción
  public onBranchChange(): void {
    // El computed signal se actualizará automáticamente
  }

  public getCurrentSchedule(employee: Employee): Schedule | null {
    // Buscar el horario actual del empleado
    // Esto requiere acceder a los horarios de empleados
    // Por ahora retornamos null, se implementará cuando tengamos el store de horarios
    return null;
  }

  public assignSchedule(employee: Employee): void {
    if (!this.store.isAdmin()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo los administradores pueden asignar horarios.',
      });
      return;
    }

    // TODO: Implementar apertura del formulario de asignación de horarios
    this.message.add({
      severity: 'info',
      summary: 'Funcionalidad pendiente',
      detail: 'Asignación de horarios próximamente.',
    });
  }

  public viewSchedule(employee: Employee): void {
    // TODO: Implementar vista de horario actual del empleado
    this.message.add({
      severity: 'info',
      summary: 'Funcionalidad pendiente',
      detail: 'Vista de horario actual próximamente.',
    });
  }
}