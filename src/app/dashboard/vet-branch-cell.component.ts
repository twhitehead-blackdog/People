import { Component, input, output } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { VetBranchAssignment } from '../models';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { Tooltip } from 'primeng/tooltip';

@Component({
  selector: 'pt-vet-branch-cell',
  standalone: true,
  imports: [NgClass, DatePipe, Button, Popover, Tooltip],
  template: `
    @if (assignment(); as assignmentValue) {
      <div
        class="inline-flex gap-1 py-0.5 px-1.5 rounded-sm font-medium items-center justify-center text-[11px] cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border border-black/20 shadow-sm bg-green-600 text-green-100 opacity-80 hover:opacity-100"
        [pTooltip]="tooltipContent"
        tooltipPosition="top"
        (click)="options.toggle($event)"
      >
        <span class="truncate max-w-[65px] font-semibold leading-tight">
          {{ assignmentValue?.branch?.short_name }}
        </span>
      </div>
      <ng-template #tooltipContent>
        <div class="flex flex-col gap-1">
          <div>
            Sucursal:
            <span class="font-bold">{{ assignmentValue?.branch?.name }}</span>
          </div>
          <div>
            Fecha:
            <span class="font-bold">{{ date() | date : 'dd/MM/yyyy' }}</span>
          </div>
          <div>
            Médico:
            <span class="font-bold">{{ assignmentValue?.employee?.first_name }} {{ assignmentValue?.employee?.father_name }}</span>
          </div>
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
            @if (canManage()) {
              <li
                class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
                (click)="onEdit()"
              >
                <i class="pi pi-pencil text-primary-600"></i>
                Cambiar sucursal
              </li>
              <li
                class="flex items-center gap-2 p-2 hover:bg-emphasis cursor-pointer rounded-md"
                (click)="onDelete()"
              >
                <i class="pi pi-trash text-red-700"></i>
                Remover asignación
              </li>
            }
          </ul>
        </div>
      </p-popover>
    } @else {
      @if (canManage()) {
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
export class VetBranchCellComponent {
  // Inputs
  public assignment = input<VetBranchAssignment | null | undefined>();
  public date = input.required<Date>();
  public employeeId = input.required<string>();
  public canManage = input.required<boolean>();

  // Outputs
  public edit = output<{ assignment: VetBranchAssignment; date: Date }>();
  public delete = output<{ assignment: VetBranchAssignment; date: Date }>();
  public add = output<{ employeeId: string; date: Date }>();
  public viewAudit = output<{ employeeId: string; date: Date }>();

  public onEdit(): void {
    const assignmentValue = this.assignment();
    if (assignmentValue) {
      this.edit.emit({ assignment: assignmentValue, date: this.date() });
    }
  }

  public onDelete(): void {
    const assignmentValue = this.assignment();
    if (assignmentValue) {
      this.delete.emit({ assignment: assignmentValue, date: this.date() });
    }
  }

  public onAdd(): void {
    this.add.emit({ employeeId: this.employeeId(), date: this.date() });
  }

  public onViewAudit(): void {
    this.viewAudit.emit({ employeeId: this.employeeId(), date: this.date() });
  }
}