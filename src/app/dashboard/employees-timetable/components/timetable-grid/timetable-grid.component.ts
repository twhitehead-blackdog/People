import { CommonModule } from '@angular/common';
import { Component, input, output, TemplateRef } from '@angular/core';
import { TableModule } from 'primeng/table';
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
    scheduleWarning?: string | null;
  }>;
};

@Component({
  selector: 'pt-timetable-grid',
  standalone: true,
  imports: [CommonModule, TableModule, ShiftCellComponent],
  template: `
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
              [isSelected]="isShiftSelected(day.shift?.id, day.date)"
              [isStoreManager]="isStoreManager()"
              [scheduleWarning]="day.scheduleWarning ?? null"
              (edit)="onEditShift($event)"
              (delete)="onDeleteShift($event)"
              (approve)="onApproveShift($event)"
              (add)="onAddShift($event)"
              (viewAudit)="onViewAudit($event)"
              (toggleSelection)="onToggleSelection($event)"
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

  // Selection inputs from parent
  public selectionMode = input<boolean>(false);
  public selectedKeys = input<Set<string>>(new Set());

  // Indica si el usuario es gerente de tienda (para ocultar estados de aprobación)
  public isStoreManager = input<boolean>(false);

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
  public toggleSelection = output<{ shiftId: string; date: Date }>();

  // Check if a shift is selected using composite key
  public isShiftSelected(shiftId: string | undefined, date: Date): boolean {
    if (!shiftId) return false;
    const key = `${shiftId}|${date.toISOString()}`;
    return this.selectedKeys().has(key);
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

  public onToggleSelection(event: { shiftId: string; date: Date }): void {
    this.toggleSelection.emit(event);
  }

  public hasPendingShifts(employee: EmployeeWithDays): boolean {
    return employee.days.some((d) => d.shift && !d.shift.approved);
  }

  public hasAnyShift(employee: EmployeeWithDays): boolean {
    return employee.days.some((d) => d.shift);
  }
}
