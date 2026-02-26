import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';
import { Employee, GroomerBranchAssignment } from '../models';

@Component({
  selector: 'pt-groomer-branch-cell',
  standalone: true,
  imports: [DatePipe, Button, Popover, Tooltip, SelectModule, FormsModule],
  template: `
    <div class="flex flex-col items-center gap-1 min-w-[100px]">
      <!-- Asignaciones existentes -->
      @for (a of assignments(); track a.id) {
      <div
        class="inline-flex gap-1 py-0.5 px-1.5 rounded-sm font-medium items-center text-[11px] cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border border-black/20 shadow-sm text-white opacity-80 hover:opacity-100"
        [style.background-color]="getEmployeeColor(a)"
        [pTooltip]="groomerTooltip"
        tooltipPosition="top"
      >
        @if (isEmployeeNonWorking(a.employee_id)) {
        <span class="truncate max-w-[90px] font-semibold leading-tight line-through">
          {{ a.employee?.first_name }} {{ a.employee?.father_name?.charAt(0) }}.
        </span>
        } @else {
        <span class="truncate max-w-[90px] font-semibold leading-tight">
          {{ a.employee?.first_name }} {{ a.employee?.father_name?.charAt(0) }}.
        </span>
        }
        @if (canManage()) {
        <i
          class="pi pi-times text-[9px] cursor-pointer hover:text-red-300 ml-0.5"
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
        </div>
      </ng-template>
      }

      <!-- Botón para agregar -->
      @if (canManage()) {
      <div class="flex items-center gap-1">
        <p-button
          icon="pi pi-plus"
          outlined
          size="small"
          severity="secondary"
          (onClick)="addPopover.toggle($event)"
          pTooltip="Agregar peluquero"
          tooltipPosition="top"
          class="hover:bg-neutral-700 hover:border-amber-400 hover:text-amber-400 transition-all"
          [style]="{ width: '24px', height: '24px' }"
        />
        @if (assignments().length === 0) {
        <p-button
          icon="pi pi-calendar-plus"
          outlined
          size="small"
          severity="info"
          (onClick)="onBulkAssign()"
          pTooltip="Asignar rango de fechas"
          tooltipPosition="top"
          [style]="{ width: '24px', height: '24px' }"
        />
        }
      </div>

      <p-popover #addPopover>
        <div class="w-52">
          <span class="font-medium block mb-2 text-sm">Seleccionar peluquero</span>
          @if (availableEmployees().length === 0) {
          <p class="text-xs text-gray-400">No hay peluqueros disponibles</p>
          } @else {
          <p-select
            [options]="availableEmployees()"
            optionLabel="first_name"
            placeholder="Buscar..."
            [filter]="true"
            filterBy="first_name,father_name"
            [showClear]="false"
            appendTo="body"
            (onChange)="onSelectEmployee($event.value, addPopover)"
            styleClass="w-full"
          >
            <ng-template let-emp #item>
              <div class="flex flex-col">
                <span class="text-sm font-medium">{{ emp.first_name }} {{ emp.father_name }}</span>
                <span class="text-xs text-gray-400">{{ emp.position?.name }}</span>
              </div>
            </ng-template>
            <ng-template let-emp #selectedItem>
              <span>{{ emp.first_name }} {{ emp.father_name }}</span>
            </ng-template>
          </p-select>
          }
        </div>
      </p-popover>
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
  public availableEmployees = input<Employee[]>([]);
  public nonWorkingMap = input<Record<string, string>>({});

  // Outputs
  public assign = output<{ branchId: string; date: Date; employeeId: string }>();
  public remove = output<{ assignment: GroomerBranchAssignment }>();
  public bulkAssign = output<{ branchId: string; date: Date }>();

  // Colores alternos
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

  onSelectEmployee(employee: Employee, popover: Popover): void {
    if (employee) {
      this.assign.emit({
        branchId: this.branchId(),
        date: this.date(),
        employeeId: employee.id,
      });
      popover.hide();
    }
  }

  onRemove(assignment: GroomerBranchAssignment): void {
    this.remove.emit({ assignment });
  }

  onBulkAssign(): void {
    this.bulkAssign.emit({ branchId: this.branchId(), date: this.date() });
  }
}
