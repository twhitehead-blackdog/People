import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { format } from 'date-fns';
import { Button } from 'primeng/button';
import { Tooltip } from 'primeng/tooltip';
import { Employee, GroomerBranchAssignment } from '../models';

@Component({
  selector: 'pt-groomer-branch-cell',
  standalone: true,
  imports: [DatePipe, Button, Tooltip],
  template: `
    <div class="flex flex-col items-center gap-1 min-w-[100px]">

      <!-- Asignaciones existentes -->
      @for (a of assignments(); track a.id) {
        <div
          class="inline-flex gap-1 py-0.5 px-1.5 rounded-sm font-medium items-center text-[11px] cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border border-black/20 shadow-sm text-white opacity-80 hover:opacity-100 w-full max-w-[110px]"
          [style.background-color]="getEmployeeColor(a)"
          [pTooltip]="groomerTooltip"
          tooltipPosition="top"
          (click)="canManage() && onEdit(a)"
        >
          @if (isEmployeeNonWorking(a.employee_id)) {
            <span class="truncate font-semibold leading-tight line-through flex-1">
              {{ a.employee?.first_name }} {{ a.employee?.father_name?.charAt(0) }}.
            </span>
          } @else {
            <span class="truncate font-semibold leading-tight flex-1">
              {{ a.employee?.first_name }} {{ a.employee?.father_name?.charAt(0) }}.
            </span>
          }
          @if (canManage()) {
            <i
              class="pi pi-times text-[9px] cursor-pointer hover:text-red-300 ml-0.5 flex-shrink-0"
              (click)="onRemove(a); $event.stopPropagation()"
            ></i>
          }
        </div>
        <ng-template #groomerTooltip>
          <div class="flex flex-col gap-1">
            <div>
              Peluquero:
              <span class="font-bold">{{ a.employee?.first_name }} {{ a.employee?.father_name }}</span>
            </div>
            <div>
              Cargo:
              <span class="font-bold">{{ a.employee?.position?.name || 'Peluquero' }}</span>
            </div>
            <div>
              Fecha:
              <span class="font-bold">{{ date() | date : 'dd/MM/yyyy' : 'UTC' }}</span>
            </div>
            @if (isEmployeeNonWorking(a.employee_id)) {
              <div class="text-yellow-300 italic">
                {{ getNonWorkingLabel(a.employee_id) }}
              </div>
            }
            @if (canManage()) {
              <div class="text-gray-300 text-[10px] mt-0.5">Click para cambiar sucursal</div>
            }
          </div>
        </ng-template>
      }

      <!-- Área de agregar -->
      @if (canManage()) {
        @if (assignments().length === 0) {
          <!-- Celda vacía: área grande clickeable -->
          <div
            class="w-full min-h-[40px] flex items-center justify-center cursor-pointer rounded border border-dashed border-neutral-600 hover:border-amber-400 hover:bg-amber-400/10 transition-all duration-150"
            (click)="onOpenDialog()"
            pTooltip="Asignar peluquero"
            tooltipPosition="top"
          >
            <i class="pi pi-plus text-neutral-500 hover:text-amber-400 text-xs transition-colors"></i>
          </div>
        } @else {
          <!-- Con asignaciones: botón + -->
          <p-button
            icon="pi pi-plus"
            outlined
            size="small"
            severity="secondary"
            (onClick)="onOpenDialog()"
            pTooltip="Agregar peluquero"
            tooltipPosition="top"
            [style]="{ width: '28px', height: '28px' }"
          />
        }
      }

    </div>
  `,
})
export class GroomerBranchCellComponent {
  // Inputs
  public assignments = input<GroomerBranchAssignment[]>([]);
  public date = input.required<Date>();
  public branchId = input.required<string>();
  public canManage = input.required<boolean>();
  public nonWorkingMap = input<Record<string, string>>({});

  // Outputs
  public openAssignDialog = output<{ branchId: string; date: Date }>();
  public editAssignment = output<{ assignment: GroomerBranchAssignment; date: Date }>();
  public remove = output<{ assignment: GroomerBranchAssignment }>();

  private readonly empColors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
    '#EF4444', '#06B6D4', '#EC4899', '#84CC16',
  ];

  getEmployeeColor(assignment: GroomerBranchAssignment): string {
    const hash = assignment.employee_id
      .split('')
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return this.empColors[hash % this.empColors.length];
  }

  isEmployeeNonWorking(employeeId: string): boolean {
    const dateKey = format(this.date(), 'yyyy-MM-dd');
    const key = `${employeeId}|${dateKey}`;
    return !!this.nonWorkingMap()[key];
  }

  getNonWorkingLabel(employeeId: string): string {
    const dateKey = format(this.date(), 'yyyy-MM-dd');
    const key = `${employeeId}|${dateKey}`;
    return this.nonWorkingMap()[key] || 'No laborable';
  }

  onOpenDialog(): void {
    this.openAssignDialog.emit({ branchId: this.branchId(), date: this.date() });
  }

  onEdit(assignment: GroomerBranchAssignment): void {
    this.editAssignment.emit({ assignment, date: this.date() });
  }

  onRemove(assignment: GroomerBranchAssignment): void {
    this.remove.emit({ assignment });
  }
}
