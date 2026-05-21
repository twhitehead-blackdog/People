import { NgClass } from '@angular/common';
import { Component, computed, input, output, ViewChild } from '@angular/core';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { Tooltip } from 'primeng/tooltip';
import { colorVariants, EmployeeSchedule } from '../../../../models';

@Component({
  selector: 'pt-shift-cell',
  standalone: true,
  imports: [NgClass, Button, Popover, Tooltip],
  template: `
    @if (shift(); as shiftValue) {
    @if (managerBranchId() && shiftValue?.branch_id && shiftValue?.branch_id !== managerBranchId()) {
    <!-- Empleado invitado de otra sucursal: muestra horario pero indica que estará en otra tienda -->
    <div
      class="w-full flex flex-col gap-0 py-0.5 px-1 rounded-sm items-center justify-center text-[10px] border border-dashed border-neutral-600 bg-neutral-800/50 text-neutral-300 min-h-[24px] cursor-default leading-tight whitespace-nowrap opacity-80"
      [pTooltip]="'En otra sucursal: ' + (shiftValue?.branch?.name ?? '') + ' — ' + (shiftValue?.schedule?.name ?? '')"
      tooltipPosition="top"
    >
      <span class="flex items-center gap-1">
        <i class="pi pi-arrow-right-arrow-left text-[8px] opacity-70"></i>
        <span class="font-semibold truncate">{{ shiftValue?.branch?.name ?? shiftValue?.branch?.short_name ?? '—' }}</span>
      </span>
      <span class="text-[9px] opacity-60">{{ shiftValue?.schedule?.name }}</span>
    </div>
    } @else {
    <div
      class="w-full flex gap-0.5 py-0.5 px-1 rounded-sm font-medium items-center justify-center text-[11px] transition-all duration-200 border border-black/20 shadow-sm overflow-hidden min-h-[24px]"
      [class]="getColorClass(shiftValue?.schedule?.color)"
      [ngClass]="{
        'opacity-60 hover:opacity-100': !shiftValue?.approved && !isStoreManager(),
        'ring-1 ring-amber-400/70 shadow-md': shiftValue?.approved && !isStoreManager(),
        '!border-2 !border-yellow-400 !shadow-[0_0_0_2px_rgba(250,204,21,0.6),0_0_8px_rgba(250,204,21,0.5)] animate-pulse': !!shiftValue?.migrated_from_branch_id,
        'cursor-pointer hover:scale-105 hover:shadow-md': canManageSchedules() || isLocked(),
        'cursor-default': !canManageSchedules() && !isLocked(),
        'ring-1 ring-amber-600/70 border-amber-600/70 bg-amber-100/20': isLocked() && isStoreManager()
      }"
      [pTooltip]="isLocked() && isStoreManager() ? 'Turno bloqueado — solicita el cambio desde Gestiones' : tooltipContent"
      tooltipPosition="top"
      (click)="handleClick($event)"
    >
      @if (isLocked() && isStoreManager()) {
        <i class="pi pi-lock text-amber-400 text-[10px] flex-shrink-0"></i>
      }
      @if (scheduleWarning(); as warn) {
        <i class="pi pi-exclamation-triangle text-amber-400 text-[10px] flex-shrink-0" [pTooltip]="warn" tooltipPosition="top"></i>
      }
      <span class="truncate font-semibold leading-tight min-w-0">
        @if (showBranchTag()) {
          <span class="text-[9px] font-bold bg-black/30 rounded px-1 py-px mr-1 uppercase tracking-wider"
                [pTooltip]="'Turno en: ' + (shiftValue?.branch?.name ?? '')"
                tooltipPosition="top">{{ shiftValue?.branch?.short_name ?? shiftValue?.branch?.name ?? '?' }}</span>
        }
        {{ shiftValue?.schedule?.name }}
      </span>
      @if (shiftValue?.cover_reason) {
        <span class="text-[8px] font-bold uppercase tracking-wider rounded px-1 py-px ml-1"
              [class]="coverReasonClass(shiftValue?.cover_reason)"
              [pTooltip]="coverReasonLabel(shiftValue?.cover_reason)"
              tooltipPosition="top">
          {{ coverReasonShort(shiftValue?.cover_reason) }}
        </span>
      }
        @if (shiftValue?.migrated_from_branch_id) {
        <i
          class="pi pi-exclamation-circle text-yellow-300 text-[9px] flex-shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
          pTooltip="Empleado nuevo en tu sucursal — revisa o reasigna este horario"
          tooltipPosition="top"
        ></i>
        } @else if (shiftValue?.approved) {
        <i
          class="pi pi-check-circle text-green-400 text-[9px] flex-shrink-0"
        ></i>
        } @else if (!isStoreManager()) {
        <i
          class="pi pi-exclamation-circle text-yellow-200 text-[9px] animate-pulse flex-shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
        ></i>
        }
    </div>
    <ng-template #tooltipContent>
      <div class="flex flex-col gap-1">
        <div>
          Horario:
          <span class="font-bold">{{ shiftValue?.schedule?.name }}</span>
        </div>
        @if (!shiftValue?.schedule?.day_off) {
        <div>
          Sucursal:
          <span class="font-bold">{{ shiftValue?.branch?.name }}</span>
        </div>
        }
        @if (scheduleWarning(); as warn) {
          <span class="text-amber-300 text-xs block mt-1">{{ warn }}</span>
        }
        @if (shiftValue?.migrated_from_branch_id) {
          <span class="text-yellow-300 font-bold block mt-1">Empleado migrado de otra sucursal</span>
          <span class="italic text-xs">Pendiente de revisión del gerente — clic para editar o reasignar</span>
        } @else if (shiftValue?.approved) {
          <span class="font-bold">Aprobado por {{ shiftValue?.approved_by_employee?.first_name ? (shiftValue.approved_by_employee!.first_name + ' ' + shiftValue.approved_by_employee!.father_name) : 'RRHH' }}</span>
        } @else {
          <span class="italic">Pendiente por aprobación de RRHH</span>
        }
      </div>
    </ng-template>
    <p-popover #options>
      <div class="relative">
        <!-- Botón historial visible para todos -->
        <button
          class="absolute top-0 right-0 flex items-center gap-1 text-[10px] text-gray-400 hover:text-cyan-400 cursor-pointer transition-colors z-10 px-1.5 py-0.5 rounded hover:bg-neutral-700/60"
          pTooltip="Ver historial de cambios de este día"
          tooltipPosition="left"
          (click)="onViewAudit(); options.hide()"
        >
          <i class="pi pi-history text-[10px]"></i>
          <span>Historial</span>
        </button>
        <span class="font-medium block mb-2 pr-20">Opciones</span>
        <ul class="list-non flex flex-col">
          @if (canManageSchedules()) {
          <li
            class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
            (click)="onEdit(); options.hide()"
          >
            <i class="pi pi-pencil text-primary-600"></i>
            Editar
          </li>
          <li
            class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
            (click)="onDelete(); options.hide()"
          >
            <i class="pi pi-trash text-red-700"></i>
            Eliminar
          </li>
          } @if (canApprove()) {
          <li
            class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
            (click)="onApprove(); options.hide()"
          >
            <i class="pi pi-check-circle text-green-700"></i>
            Aprobar
          </li>
          }
        </ul>
      </div>
    </p-popover>
    }
    } @else { @if (isLocked() && isStoreManager()) {
    <div
      class="inline-flex py-0.5 px-1.5 rounded-sm items-center justify-center text-[11px] border border-dashed border-amber-800/50 text-amber-700 min-w-[40px] min-h-[24px] cursor-pointer"
      pTooltip="Turno bloqueado — solicita el cambio desde Gestiones"
      tooltipPosition="top"
      (click)="lockedClick.emit()"
    >
      <i class="pi pi-lock text-[10px]"></i>
    </div>
    } @else if (assignment() && isAssignmentForOtherBranch()) {
    <!-- Asignado a otra sucursal: solo lectura, fondo con color de la sucursal -->
    <div
      class="inline-flex flex-col py-0.5 px-1.5 rounded-sm items-center justify-center text-[10px] border border-dashed min-w-[40px] min-h-[24px] cursor-default leading-tight opacity-70"
      [style.background-color]="(assignment()!.color ?? '#374151') + '33'"
      [style.border-color]="(assignment()!.color ?? '#374151') + '99'"
      [style.color]="assignment()!.color ?? '#9ca3af'"
      [pTooltip]="'En sucursal: ' + (assignment()!.branch?.name ?? '')"
      tooltipPosition="top"
    >
      <i class="pi pi-arrow-right-arrow-left text-[9px]"></i>
      <span class="font-bold mt-0.5">{{ assignment()!.branch?.short_name ?? '—' }}</span>
    </div>
    } @else if (assignment() && canManageSchedules()) {
    <!-- Asignado a esta sucursal y aún sin horario: en espera con color de sucursal -->
    <div
      class="w-full flex py-0.5 px-1.5 rounded-sm items-center justify-center gap-1 text-[10px] font-semibold border border-dashed min-h-[24px] cursor-pointer transition-colors leading-tight whitespace-nowrap"
      [style.background-color]="(assignment()!.color ?? '#0891b2') + '22'"
      [style.border-color]="(assignment()!.color ?? '#0891b2') + 'aa'"
      [style.color]="assignment()!.color ?? '#67e8f9'"
      pTooltip="Click para asignar horario"
      tooltipPosition="top"
      (click)="onAdd()"
    >
      <i class="pi pi-clock text-[9px]"></i>
      <span>En espera {{ assignment()!.branch?.short_name ?? '' }}</span>
    </div>
    } @else if (isGuestEmployee()) {
    <!-- Invitado de otra sucursal sin asignación este día — solo lectura -->
    <div
      class="inline-flex py-0.5 px-1.5 rounded-sm items-center justify-center text-[11px] border border-dashed border-neutral-700 text-neutral-600 min-w-[40px] min-h-[24px] opacity-60"
      pTooltip="Empleado de otra sucursal — sin asignación este día"
      tooltipPosition="top"
    >
      —
    </div>
    } @else if (strictMode() && isStoreManager()) {
    <!-- Modo estricto: gerentes deben asignar primero desde salon-schedule -->
    <div
      class="inline-flex py-0.5 px-1.5 rounded-sm items-center justify-center text-[11px] border border-dashed border-neutral-700 text-neutral-500 min-w-[40px] min-h-[24px] opacity-60"
      pTooltip="Modo estricto activo: asigna primero la sucursal en Salon (Horario Peluquería)"
      tooltipPosition="top"
    >
      <i class="pi pi-lock text-[10px]"></i>
    </div>
    } @else if (canManageSchedules()) {
    <p-button
      icon="pi pi-plus"
      outlined
      size="small"
      severity="secondary"
      (onClick)="onAdd()"
      class="hover:bg-neutral-700 hover:border-amber-400 hover:text-amber-400 transition-all"
    />
    } @else {
    <div
      class="inline-flex py-0.5 px-1.5 rounded-sm items-center justify-center text-[11px] border border-dashed border-neutral-600 text-neutral-500 min-w-[40px] min-h-[24px]"
      pTooltip="Sin horario asignado"
      tooltipPosition="top"
    >
      —
    </div>
    } }
  `,
})
export class ShiftCellComponent {
  // Inputs
  public shift = input<EmployeeSchedule | null | undefined>();
  public date = input.required<Date>();
  public employeeId = input.required<string>();
  public canManageSchedules = input.required<boolean>();
  public canApprove = input.required<boolean>();
  public isStoreManager = input<boolean>(false);
  public isLocked = input<boolean>(false);
  /** Sucursal nativa del empleado — para detectar invitados (no pertenecen a la sucursal del gerente) */
  public employeeBranchId = input<string | null>(null);
  public managerBranchId = input<string | null>(null);
  /** Sucursal en foco para la vista (filtro o sucursal del gerente). Si el turno
   *  pertenece a otra sucursal distinta a esta, se muestra la sigla de la sucursal
   *  junto al horario para diferenciar. */
  public viewBranchId = input<string | null>(null);
  /** Forzar siempre mostrar la sigla de la sucursal en cada turno (útil para
   *  filas de personal en cobertura / rotativo). */
  public alwaysShowBranchTag = input<boolean>(false);
  /** Modo estricto: gerentes solo pueden agregar horarios desde salon-schedule */
  public strictMode = input<boolean>(false);

  /** Mostrar la sigla de la sucursal en el turno cuando el turno pertenece a
   *  una sucursal distinta a la sucursal en foco. */
  public showBranchTag = computed(() => {
    if (this.alwaysShowBranchTag()) return true;
    const s = this.shift();
    const view = this.viewBranchId();
    if (!view || !s?.branch_id) return false;
    return s.branch_id !== view;
  });

  public coverReasonLabel(r: string | null | undefined): string {
    switch (r) {
      case 'rotativo': return 'Rotativo (rota habitualmente)';
      case 'vacaciones': return 'Cubre vacaciones';
      case 'dia_libre': return 'Cubre día libre';
      case 'incapacidad': return 'Cubre incapacidad';
      case 'traslado': return 'Traslado / apoyo puntual';
      default: return '';
    }
  }
  public coverReasonShort(r: string | null | undefined): string {
    switch (r) {
      case 'rotativo': return 'ROT';
      case 'vacaciones': return 'VAC';
      case 'dia_libre': return 'DL';
      case 'incapacidad': return 'INC';
      case 'traslado': return 'TR';
      default: return '';
    }
  }
  public coverReasonClass(r: string | null | undefined): string {
    switch (r) {
      case 'rotativo': return 'bg-purple-500/25 text-purple-100 border border-purple-400/40';
      case 'vacaciones': return 'bg-blue-500/25 text-blue-100 border border-blue-400/40';
      case 'dia_libre': return 'bg-amber-500/25 text-amber-100 border border-amber-400/40';
      case 'incapacidad': return 'bg-rose-500/25 text-rose-100 border border-rose-400/40';
      case 'traslado': return 'bg-emerald-500/25 text-emerald-100 border border-emerald-400/40';
      default: return '';
    }
  }
  /** True si el gerente está viendo a un empleado invitado de otra sucursal */
  public isGuestEmployee = computed(() => {
    const mgr = this.managerBranchId();
    const emp = this.employeeBranchId();
    return !!mgr && !!emp && mgr !== emp;
  });
  /** Advertencia visual: turno no recomendado o Gerente y Subgerente en el mismo turno. */
  public scheduleWarning = input<string | null>(null);

  /** Asignación de salon-schedule para este día (sucursal asignada al peluquero) */
  public assignment = input<{
    branch_id: string;
    branch?: { id: string; name: string; short_name: string };
    color?: string;
  } | null>(null);

  /** Indica si la asignación es para una sucursal distinta a la del gerente */
  public isAssignmentForOtherBranch(): boolean {
    const a = this.assignment();
    const mgr = this.managerBranchId();
    if (!a || !mgr) return false;
    return a.branch_id !== mgr;
  }

  // Outputs
  public lockedClick = output<void>();
  public edit = output<{ shift: EmployeeSchedule; date: Date }>();
  public delete = output<{ shift: EmployeeSchedule; date?: Date }>();
  public approve = output<string>();
  public add = output<{ employeeId: string; date: Date; branchId?: string }>();
  public viewAudit = output<{ employeeId: string; date: Date }>();

  // Exponer colorVariants para uso en template
  public colorVariants = colorVariants;

  @ViewChild('options') optionsPopover!: Popover;

  public getColorClass(color: string | undefined): string {
    if (!color) return 'bg-neutral-700 text-gray-300';
    return this.colorVariants[color] || 'bg-neutral-700 text-gray-300';
  }

  public handleClick(event: Event): void {
    event.stopPropagation();
    if (this.isLocked() && this.isStoreManager()) {
      this.lockedClick.emit();
      return;
    }
    const shiftValue = this.shift();
    if (this.optionsPopover && shiftValue) {
      this.optionsPopover.toggle(event);
    }
  }

  public onEdit(): void {
    const shiftValue = this.shift();
    if (shiftValue) {
      this.edit.emit({ shift: shiftValue, date: this.date() });
    }
  }

  public onDelete(): void {
    const shiftValue = this.shift();
    if (shiftValue) {
      this.delete.emit({ shift: shiftValue, date: this.date() });
    }
  }

  public onApprove(): void {
    const shiftValue = this.shift();
    if (shiftValue?.id) {
      this.approve.emit(shiftValue.id);
    }
  }

  public onAdd(): void {
    this.add.emit({
      employeeId: this.employeeId(),
      date: this.date(),
      branchId: this.assignment()?.branch_id,
    });
  }

  public onViewAudit(): void {
    this.viewAudit.emit({ employeeId: this.employeeId(), date: this.date() });
  }
}
