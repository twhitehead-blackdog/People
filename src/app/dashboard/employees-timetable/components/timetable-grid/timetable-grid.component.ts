import { CommonModule } from '@angular/common';
import { Component, input, output, TemplateRef } from '@angular/core';
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
          @if (canApproveSchedules()) {
          <th
            pFrozenColumn
            class="w-[50px] text-center p-datatable-frozen-column p-datatable-frozen-column-left"
            style="left: 0px; z-index: 10; position: sticky;"
          ></th>
          }
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
          @if (canApproveSchedules()) {
          <td
            pFrozenColumn
            class="text-center p-datatable-frozen-column p-datatable-frozen-column-left"
            style="left: 0px; z-index: 10; position: sticky;"
          >
            @if (hasPendingShifts(item)) {
            <p-button
              icon="pi pi-check-circle"
              [rounded]="true"
              [text]="true"
              severity="success"
              size="small"
              pTooltip="Confirmar toda la semana"
              tooltipPosition="right"
              (onClick)="onConfirmWeek(item)"
            />
            } @else if (hasAnyShift(item)) {
            <i
              class="pi pi-check-circle text-green-500 opacity-50"
              pTooltip="Semana confirmada"
            ></i>
            }
          </td>
          }
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
              (edit)="onEditShift($event)"
              (delete)="onDeleteShift($event)"
              (approve)="onApproveShift($event)"
              (add)="onAddShift($event)"
              (viewAudit)="onViewAudit($event)"
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

  constructor() {
    // Note: Do NOT access required inputs in constructor - they are not yet available
    // Use effect() to react to input changes instead if needed
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
