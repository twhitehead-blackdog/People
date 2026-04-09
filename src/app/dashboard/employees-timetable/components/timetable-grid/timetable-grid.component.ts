import { CommonModule } from '@angular/common';
import { Component, computed, HostListener, input, output, signal, TemplateRef } from '@angular/core';
import { isToday as dateFnsIsToday } from 'date-fns';
import { TableModule } from 'primeng/table';
import { ShiftCellComponent } from '../shift-cell/shift-cell.component';

type EmployeeWithDays = {
  id: string;
  first_name: string;
  father_name: string;
  position: { name: string };
  isNewHire?: boolean;
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
    <!-- Mobile View: horizontal scroll per employee -->
    <div class="md:hidden space-y-2">
      @for(employee of paginatedEmployees(); track employee.id){
      <div
        class="bg-neutral-800/60 rounded-xl border overflow-hidden"
        [ngClass]="
          employee.isNewHire
            ? 'border-green-500/40 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]'
            : lockedPositions().has(employee.position.name || '')
              ? 'border-amber-500/40 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]'
              : 'border-neutral-700/40'
        "
      >
        <!-- Employee header -->
        <div
          class="px-3 py-2 border-b flex items-center gap-2"
          [ngClass]="
            employee.isNewHire
              ? 'bg-green-500/10 border-green-500/30'
              : lockedPositions().has(employee.position.name || '')
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-neutral-700/20 border-neutral-700/30'
          "
        >
          <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            [ngClass]="employee.isNewHire ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-500/10 border border-amber-500/20'">
            <span class="text-[10px] font-bold" [ngClass]="employee.isNewHire ? 'text-green-400' : 'text-amber-400'">{{ employee.first_name.charAt(0) }}{{ employee.father_name.charAt(0) }}</span>
          </div>
          <div class="min-w-0">
            <p class="text-[13px] font-semibold text-white m-0 truncate">{{ employee.first_name }} {{ employee.father_name }}</p>
            <p class="text-[10px] m-0 truncate flex items-center gap-1"
              [ngClass]="employee.isNewHire ? 'text-green-300' : lockedPositions().has(employee.position.name || '') ? 'text-amber-300' : 'text-gray-500'">
              @if (employee.isNewHire) {
                <i class="pi pi-star-fill text-green-400 text-[9px]"></i>
                <span class="text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 rounded px-1">NUEVO</span>
              } @else if (lockedPositions().has(employee.position.name || '')) {
                <i class="pi pi-lock text-amber-400 text-[9px]"></i>
              }
              {{ employee.position.name || 'Sin cargo' }}
            </p>
          </div>
        </div>
        <!-- Days scroll -->
        <div class="flex overflow-x-auto py-2 px-2 gap-1.5" style="-webkit-overflow-scrolling: touch; scrollbar-width: none;">
          @for(day of employee.days; track day.date){
          <div class="flex-shrink-0 w-[58px] text-center">
            <div class="text-[9px] text-gray-500 uppercase font-medium mb-0.5">{{ day.date | date : 'EEE' }}</div>
            <div class="text-[11px] font-semibold mb-1" [class]="isToday(day.date) ? 'text-amber-400' : 'text-gray-400'">{{ day.date | date : 'd' }}</div>
            <div class="w-full">
              <pt-shift-cell
                [shift]="day.shift"
                [date]="day.date"
                [employeeId]="employee.id"
                [canManageSchedules]="canManageSchedules()"
                [canApprove]="canApproveSchedules()"
                [isStoreManager]="isStoreManager()"
                [isLocked]="!employee.isNewHire && lockedPositions().has(employee.position.name || '')"
                [scheduleWarning]="day.scheduleWarning ?? null"
                (edit)="onEditShift($event)"
                (delete)="onDeleteShift($event)"
                (approve)="onApproveShift($event)"
                (add)="onAddShift($event)"
                (viewAudit)="onViewAudit($event)"
                (lockedClick)="lockedShift.emit()"
              />
            </div>
          </div>
          }
        </div>
      </div>
      }
      @if (employees().length === 0) {
        <div class="text-center py-12 text-gray-500">
          <i class="pi pi-calendar-times text-3xl block mb-2"></i>
          <p class="text-sm m-0">No hay empleados para mostrar</p>
        </div>
      }
      <!-- Mobile pagination -->
      @if (employees().length > mobilePageSize) {
        <div class="flex items-center justify-between px-2 py-3">
          <span class="text-xs text-gray-500">{{ mobilePage() * mobilePageSize + 1 }}-{{ Math.min((mobilePage() + 1) * mobilePageSize, employees().length) }} de {{ employees().length }}</span>
          <div class="flex gap-1">
            <button class="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/50 text-gray-400 flex items-center justify-center disabled:opacity-30" [disabled]="mobilePage() === 0" (click)="mobilePage.set(mobilePage() - 1)"><i class="pi pi-chevron-left text-xs"></i></button>
            <button class="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/50 text-gray-400 flex items-center justify-center disabled:opacity-30" [disabled]="(mobilePage() + 1) * mobilePageSize >= employees().length" (click)="mobilePage.set(mobilePage() + 1)"><i class="pi pi-chevron-right text-xs"></i></button>
          </div>
        </div>
      }
    </div>

    <!-- Desktop View: Table layout -->
    <div class="hidden md:block overflow-x-auto">
      <p-table
        [value]="employees()"
        [paginator]="!disablePagination()"
        [rows]="disablePagination() ? 9999 : rowsPerPage()"
        [tableStyle]="{ 'min-width': '50rem' }"
        [rowsPerPageOptions]="[10, 20, 50]"
        paginatorDropdownAppendTo="body"
        responsiveLayout="scroll"
      >
        @if (captionTemplate(); as template) {
        <ng-template caption>
          <ng-container *ngTemplateOutlet="template" />
        </ng-template>
        }
        <ng-template #header>
          <tr>
            <th pFrozenColumn class="min-w-[120px]">Cargo</th>
            <th class="min-w-[150px]">Nombre</th>
            @for(day of days(); track day.date){
            <th class="text-center min-w-[80px] lg:min-w-[100px]">
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
            <td
              pFrozenColumn
              class="whitespace-nowrap"
              [ngClass]="
                item.isNewHire
                  ? 'bg-green-500/10 text-green-200 border-r border-green-500/25'
                  : lockedPositions().has(item.position.name || '')
                    ? 'bg-amber-500/10 text-amber-200 border-r border-amber-500/25'
                    : ''
              "
            >
              <span class="inline-flex items-center gap-1">
                @if (item.isNewHire) {
                  <i class="pi pi-star-fill text-green-400 text-[10px]"></i>
                  <span class="text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 rounded px-1 py-0.5">NUEVO</span>
                } @else if (lockedPositions().has(item.position.name || '')) {
                  <i class="pi pi-lock text-amber-400 text-[10px]"></i>
                }
                {{ item.position.name }}
              </span>
            </td>
            <td class="whitespace-nowrap">{{ item.first_name }} {{ item.father_name }}</td>
            @for(day of item.days; track day.date){
            <td class="text-center">
              <pt-shift-cell
                [shift]="day.shift"
                [date]="day.date"
                [employeeId]="item.id"
                [canManageSchedules]="canManageSchedules()"
                [canApprove]="canApproveSchedules()"
                [isStoreManager]="isStoreManager()"
                [isLocked]="!item.isNewHire && lockedPositions().has(item.position.name || '')"
                [scheduleWarning]="day.scheduleWarning ?? null"
                (edit)="onEditShift($event)"
                (delete)="onDeleteShift($event)"
                (approve)="onApproveShift($event)"
                (add)="onAddShift($event)"
                (viewAudit)="onViewAudit($event)"
                (lockedClick)="lockedShift.emit()"
              />
            </td>
            }
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class TimetableGridComponent {
  protected Math = Math;
  // Mobile detection
  public isMobile = signal(window.innerWidth < 768);
  public rowsPerPage = signal(10);
  public mobilePage = signal(0);
  public readonly mobilePageSize = 8;
  public paginatedEmployees = computed(() => {
    const start = this.mobilePage() * this.mobilePageSize;
    return this.employees().slice(start, start + this.mobilePageSize);
  });

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
    this.rowsPerPage.set(window.innerWidth < 768 ? 5 : 10);
  }

  // Inputs
  public employees = input.required<EmployeeWithDays[]>();
  public days =
    input.required<Array<{ date: Date; day: number; shift: any }>>();
  public canManageSchedules = input.required<boolean>();
  public canApproveSchedules = input.required<boolean>();
  public captionTemplate = input<TemplateRef<any>>();

  // Indica si el usuario es gerente de tienda (para ocultar estados de aprobación)
  public isStoreManager = input<boolean>(false);

  // Posiciones bloqueadas (calculadas por el padre según ciclo biweekly + posición del empleado)
  public lockedPositions = input<Set<string>>(new Set());

  // Deshabilitar paginación (cuando se filtra por sucursal)
  public disablePagination = input<boolean>(false);

  // Bulk selection mode
  public selectionMode = input<boolean>(false);
  public selectedKeys = input<Set<string>>(new Set());

  // Outputs
  public editShift = output<{
    employee_schedule?: any;
    employee_id?: string;
    date: Date;
  }>();
  public deleteShift = output<{ shift: any; date?: Date }>();
  public approveShift = output<string>();
  public addShift = output<{ employee_id: string; date: Date }>();
  public viewAudit = output<{ employeeId: string; date: Date }>();
  public toggleSelection = output<{ shiftId: string; date: Date }>();
  public lockedShift = output<void>();

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

  public isToday(date: Date): boolean {
    return dateFnsIsToday(date);
  }
}
