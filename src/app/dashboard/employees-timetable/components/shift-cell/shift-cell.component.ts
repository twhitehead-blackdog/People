import { NgClass } from '@angular/common';
import { Component, input, output, ViewChild } from '@angular/core';
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
    <div
      class="inline-flex gap-1 py-0.5 px-1.5 rounded-sm font-medium items-center justify-center text-[11px] transition-all duration-200 border shadow-sm"
      [class]="getColorClass(shiftValue?.schedule?.color)"
      [ngClass]="{
        'opacity-60 hover:opacity-100': !shiftValue?.approved && !isStoreManager(),
        'ring-1 ring-amber-400/70 shadow-md': shiftValue?.approved && !selectionMode() && !isStoreManager(),
        'cursor-pointer hover:scale-105 hover:shadow-md': !selectionMode() && !(isStoreManager() && shiftValue?.approved),
        'cursor-default': isStoreManager() && shiftValue?.approved && !selectionMode(),
        'ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/30 scale-105': isSelected(),
        'cursor-pointer hover:ring-2 hover:ring-cyan-400/50': selectionMode() && !shiftValue?.approved,
        'cursor-not-allowed opacity-50': selectionMode() && shiftValue?.approved
      }"
      [class.border-black/20]="!isSelected()"
      [class.border-cyan-400]="isSelected()"
      [pTooltip]="tooltipContent"
      tooltipPosition="top"
      (click)="handleClick($event)"
    >
      @if (scheduleWarning(); as warn) {
        <i class="pi pi-exclamation-triangle text-amber-400 text-[10px] flex-shrink-0" [pTooltip]="warn" tooltipPosition="top"></i>
      }
      @if (selectionMode() && !shiftValue?.approved) {
      <i
        class="pi text-[10px] flex-shrink-0"
        [ngClass]="{
            'pi-check-square text-cyan-400': isSelected(),
            'pi-square text-gray-400': !isSelected()
          }"
      ></i>
      }
      <span class="line-clamp-2 max-w-[72px] font-semibold leading-tight break-words">
        {{ shiftValue?.schedule?.name }}
      </span>
      @if (!selectionMode()) {
        @if (shiftValue?.approved) {
        <i
          class="pi pi-check-circle text-green-400 text-[9px] ml-0.5 flex-shrink-0"
        ></i>
        } @else if (!isStoreManager()) {
        <i
          class="pi pi-exclamation-circle text-yellow-200 text-[9px] ml-0.5 animate-pulse flex-shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
        ></i>
        }
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
        @if (selectionMode()) { @if (shiftValue?.approved) {
        <span class="text-gray-400 italic">Ya aprobado - no seleccionable</span>
        } @else { @if (isSelected()) {
        <span class="text-cyan-400 font-bold"
          >✓ Seleccionado - click para deseleccionar</span
        >
        } @else {
        <span class="italic">Click para seleccionar</span>
        } } } @else {
          @if (shiftValue?.approved) {
          <span class="font-bold">Aprobado por RRHH</span>
          } @else if (!isStoreManager()) {
          <span class="italic">Pendiente por aprobacion</span>
          }
        }
      </div>
    </ng-template>
    <p-popover #options>
      <div class="relative">
        <!-- Icono de auditoría en esquina superior derecha (oculto para gerentes de tienda) -->
        @if (!isStoreManager()) {
        <i
          class="pi pi-history absolute top-0 right-0 text-xs text-gray-400 hover:text-cyan-400 cursor-pointer transition-colors z-10"
          pTooltip="Ver historial de auditoría de este día"
          tooltipPosition="left"
          (click)="onViewAudit(); options.hide()"
        ></i>
        }
        <span class="font-medium block mb-2 pr-6">Opciones</span>
        <ul class="list-non flex flex-col">
          @if (canManageSchedules()) {
          @if (!isStoreManager() || !shift()?.approved) {
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
          }
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
    } @else { @if (canManageSchedules()) {
    <p-button
      icon="pi pi-plus"
      outlined
      size="small"
      severity="secondary"
      (onClick)="onAdd()"
      class="hover:bg-neutral-700 hover:border-amber-400 hover:text-amber-400 transition-all"
    />
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
  public selectionMode = input<boolean>(false);
  public isSelected = input<boolean>(false);
  public isStoreManager = input<boolean>(false);
  /** Advertencia visual: turno no recomendado o Gerente y Subgerente en el mismo turno. */
  public scheduleWarning = input<string | null>(null);

  // Outputs
  public edit = output<{ shift: EmployeeSchedule; date: Date }>();
  public delete = output<{ shift: EmployeeSchedule; date?: Date }>();
  public approve = output<string>();
  public add = output<{ employeeId: string; date: Date }>();
  public viewAudit = output<{ employeeId: string; date: Date }>();
  public toggleSelection = output<{ shiftId: string; date: Date }>();

  // Exponer colorVariants para uso en template
  public colorVariants = colorVariants;

  @ViewChild('options') optionsPopover!: Popover;

  public getColorClass(color: string | undefined): string {
    if (!color) return 'bg-neutral-700 text-gray-300';
    return this.colorVariants[color] || 'bg-neutral-700 text-gray-300';
  }

  public handleClick(event: Event): void {
    const shiftValue = this.shift();

    // If in selection mode
    if (this.selectionMode()) {
      // Only allow selecting pending (not approved) shifts
      if (shiftValue && !shiftValue.approved && shiftValue.id) {
        this.toggleSelection.emit({
          shiftId: shiftValue.id,
          date: this.date(),
        });
      }
      // Don't open popover in selection mode
      return;
    }

    // Gerentes de tienda no pueden abrir el menú en horarios aprobados
    if (this.isStoreManager() && shiftValue?.approved) {
      return;
    }

    // Normal mode: toggle popover
    if (this.optionsPopover && shiftValue) {
      event.stopPropagation();
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
    this.add.emit({ employeeId: this.employeeId(), date: this.date() });
  }

  public onViewAudit(): void {
    this.viewAudit.emit({ employeeId: this.employeeId(), date: this.date() });
  }
}
