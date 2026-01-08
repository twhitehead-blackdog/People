import { Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { EmployeeSchedule } from '../../../../models';
import { colorVariants } from '../../../../models';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { Tooltip } from 'primeng/tooltip';

@Component({
  selector: 'pt-shift-cell',
  standalone: true,
  imports: [NgClass, Button, Popover, Tooltip],
  template: `
    @if (shift(); as shiftValue) {
      <div
        class="inline-flex gap-1 py-0.5 px-1.5 rounded-sm font-medium items-center justify-center text-[11px] cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border border-black/20 shadow-sm"
        [class]="getColorClass(shiftValue?.schedule?.color)"
        [ngClass]="{
          'opacity-60 hover:opacity-100': !shiftValue?.approved,
          'ring-1 ring-amber-400/70 shadow-md': shiftValue?.approved
        }"
        [pTooltip]="tooltipContent"
        tooltipPosition="top"
        (click)="options.toggle($event)"
      >
        <span class="truncate max-w-[65px] font-semibold leading-tight">
          {{ shiftValue?.schedule?.name }}
        </span>
        @if (shiftValue?.approved) {
          <i
            class="pi pi-check-circle text-green-400 text-[9px] ml-0.5 flex-shrink-0"
          ></i>
        } @else {
          <i
            class="pi pi-exclamation-circle text-yellow-200 text-[9px] ml-0.5 animate-pulse flex-shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
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
          @if (shiftValue?.approved) {
            <span class="font-bold">Aprobado por RRHH</span>
          } @else {
            <span class="italic">Pendiente por aprobacion</span>
          }
        </div>
      </ng-template>
      <p-popover #options>
        <div class="relative">
          <!-- Icono de auditoría en esquina superior derecha -->
          <i
            class="pi pi-history absolute top-0 right-0 text-xs text-gray-400 hover:text-cyan-400 cursor-pointer transition-colors z-10"
            pTooltip="Ver historial de auditoría de este día"
            tooltipPosition="left"
            (click)="onViewAudit(); options.hide()"
          ></i>
          <span class="font-medium block mb-2 pr-6">Opciones</span>
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
            }
            @if (canApprove()) {
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
    } @else {
      @if (canManageSchedules()) {
        <p-button
          icon="pi pi-plus"
          outlined
          size="small"
          severity="secondary"
          (onClick)="onAdd()"
          class="hover:bg-neutral-700 hover:border-amber-400 hover:text-amber-400 transition-all"
        />
      }
    }
  `,
})
export class ShiftCellComponent {
  // Inputs
  public shift = input<EmployeeSchedule | null | undefined>();
  public date = input.required<Date>();
  public employeeId = input.required<string>();
  public canManageSchedules = input.required<boolean>();
  public canApprove = input.required<boolean>();

  // Outputs
  public edit = output<{ shift: EmployeeSchedule; date: Date }>();
  public delete = output<{ shift: EmployeeSchedule; date?: Date }>();
  public approve = output<string>();
  public add = output<{ employeeId: string; date: Date }>();
  public viewAudit = output<{ employeeId: string; date: Date }>();

  // Exponer colorVariants para uso en template
  public colorVariants = colorVariants;

  public getColorClass(color: string | undefined): string {
    if (!color) return 'bg-neutral-700 text-gray-300';
    return this.colorVariants[color] || 'bg-neutral-700 text-gray-300';
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
