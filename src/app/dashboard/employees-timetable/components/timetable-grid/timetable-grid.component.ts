import { CommonModule } from '@angular/common';
import { Component, input, output, signal, TemplateRef } from '@angular/core';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { ShiftCellComponent } from '../shift-cell/shift-cell.component';

type EmployeeWithDays = {
  id: string;
  first_name: string;
  father_name: string;
  position: { name: string };
  days: Array<{
    date: Date;
    day: number;
    shift?: any;
  }>;
};

@Component({
  selector: 'pt-timetable-grid',
  standalone: true,
  imports: [CommonModule, TableModule, ShiftCellComponent, Button, Tooltip],
  template: `
    <!-- Selection Mode Toolbar -->
    @if (canApproveSchedules()) {
    <div
      class="flex items-center justify-between gap-4 p-3 mb-3 bg-neutral-800/50 rounded-lg border border-neutral-700"
    >
      @if (!selectionMode()) {
      <div class="flex items-center gap-2">
        <p-button
          label="Seleccionar turnos"
          icon="pi pi-check-square"
          severity="info"
          [outlined]="true"
          size="small"
          (onClick)="toggleSelectionMode()"
          pTooltip="Activar modo de selección para aprobar múltiples turnos"
          tooltipPosition="top"
        />
        <span class="text-sm text-gray-400">
          {{ getPendingCount() }} turnos pendientes
        </span>
      </div>
      } @else {
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium text-cyan-400">
          <i class="pi pi-check-square mr-1"></i>
          Modo selección activo
        </span>
        <span class="text-sm text-gray-300">
          {{ selectedShiftIds().size }} seleccionados
        </span>
      </div>
      <div class="flex items-center gap-2">
        @if (selectedShiftIds().size > 0) {
        <p-button
          [label]="'Aprobar (' + selectedShiftIds().size + ')'"
          icon="pi pi-check"
          severity="success"
          size="small"
          (onClick)="onBatchApprove()"
        />
        }
        <p-button
          label="Cancelar"
          icon="pi pi-times"
          severity="secondary"
          [outlined]="true"
          size="small"
          (onClick)="cancelSelection()"
        />
      </div>
      }
    </div>
    }

    <p-table
      [value]="employees()"
      paginator
      [rows]="10"
      [tableStyle]="{ 'min-width': '50rem' }"
      [rowsPerPageOptions]="[10, 20, 50]"
      paginatorDropdownAppendTo="body"
    >
      @if (captionTemplate(); as template) {
      <ng-template caption>
        <ng-container *ngTemplateOutlet="template" />
      </ng-template>
      }
      <ng-template #header>
        <tr>
          <th pFrozenColumn>Nombre</th>
          <th>Cargo</th>
          @for(day of days(); track day.date){
          <th class="text-center min-w-[100px] max-w-[100px]">
            <div class="flex flex-col items-center gap-0 leading-[1.1]">
              <span class="text-xs font-bold uppercase">{{
                day.date | date : 'EEE'
              }}</span>
              <span class="text-[10px]">{{ day.date | date : 'd MMM' }}</span>
            </div>
          </th>
          }
        </tr>
      </ng-template>
      <ng-template #body let-item>
        <tr>
          <td pFrozenColumn>{{ item.first_name }} {{ item.father_name }}</td>
          <td>{{ item.position.name }}</td>
          @for(day of item.days; track day.date){
          <td class="text-center">
            <pt-shift-cell
              [shift]="day.shift"
              [date]="day.date"
              [employeeId]="item.id"
              [canManageSchedules]="canManageSchedules()"
              [canApprove]="canApproveSchedules()"
              [selectionMode]="selectionMode()"
              [isSelected]="isShiftSelected(day.shift?.id)"
              (edit)="onEditShift($event)"
              (delete)="onDeleteShift($event)"
              (approve)="onApproveShift($event)"
              (add)="onAddShift($event)"
              (viewAudit)="onViewAudit($event)"
              (toggleSelection)="toggleShiftSelection($event)"
            />
          </td>
          }
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class TimetableGridComponent {
  // Inputs
  public employees = input.required<EmployeeWithDays[]>();
  public days =
    input.required<Array<{ date: Date; day: number; shift: any }>>();
  public canManageSchedules = input.required<boolean>();
  public canApproveSchedules = input.required<boolean>();
  public captionTemplate = input<TemplateRef<any>>();

  // Selection state
  public selectionMode = signal<boolean>(false);
  public selectedShiftIds = signal<Set<string>>(new Set());

  // Outputs
  public editShift = output<{
    employee_schedule?: any;
    employee_id?: string;
    date: Date;
  }>();
  public deleteShift = output<{ shift: any; date?: Date }>();
  public approveShift = output<string>();
  public confirmWeek = output<EmployeeWithDays>();
  public addShift = output<{ employee_id: string; date: Date }>();
  public viewAudit = output<{ employeeId: string; date: Date }>();
  public batchApprove = output<string[]>();

  // Computed: count of pending shifts
  public getPendingCount(): number {
    let count = 0;
    for (const emp of this.employees()) {
      for (const day of emp.days) {
        if (day.shift && !day.shift.approved) {
          count++;
        }
      }
    }
    return count;
  }

  // Toggle selection mode
  public toggleSelectionMode(): void {
    this.selectionMode.set(true);
  }

  // Cancel selection and exit mode
  public cancelSelection(): void {
    this.selectionMode.set(false);
    this.selectedShiftIds.set(new Set());
  }

  // Toggle a single shift's selection
  public toggleShiftSelection(shiftId: string): void {
    if (!shiftId) return;

    const current = this.selectedShiftIds();
    const newSet = new Set(current);

    if (newSet.has(shiftId)) {
      newSet.delete(shiftId);
    } else {
      newSet.add(shiftId);
    }

    this.selectedShiftIds.set(newSet);
  }

  // Check if a shift is selected
  public isShiftSelected(shiftId: string | undefined): boolean {
    if (!shiftId) return false;
    return this.selectedShiftIds().has(shiftId);
  }

  // Batch approve all selected shifts
  public onBatchApprove(): void {
    const ids = Array.from(this.selectedShiftIds());
    if (ids.length > 0) {
      this.batchApprove.emit(ids);
      this.cancelSelection();
    }
  }

  constructor() {
    // Note: Do NOT access required inputs in constructor - they are not yet available
  }

  public onEditShift(event: { shift: any; date: Date }): void {
    this.editShift.emit({ employee_schedule: event.shift, date: event.date });
  }

  public onDeleteShift(event: { shift: any; date?: Date }): void {
    this.deleteShift.emit(event);
  }

  public onApproveShift(shiftId: string): void {
    this.approveShift.emit(shiftId);
  }

  public onConfirmWeek(employee: EmployeeWithDays): void {
    this.confirmWeek.emit(employee);
  }

  public onAddShift(event: { employeeId: string; date: Date }): void {
    this.addShift.emit({ employee_id: event.employeeId, date: event.date });
  }

  public onViewAudit(event: { employeeId: string; date: Date }): void {
    this.viewAudit.emit(event);
  }

  public hasPendingShifts(employee: EmployeeWithDays): boolean {
    return employee.days.some((d) => d.shift && !d.shift.approved);
  }

  public hasAnyShift(employee: EmployeeWithDays): boolean {
    return employee.days.some((d) => d.shift);
  }
}
