import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { Tooltip } from 'primeng/tooltip';
import { GroomerBranchAssignment } from '../models';

@Component({
  selector: 'pt-groomer-branch-cell',
  standalone: true,
  imports: [DatePipe, Button, Popover, Tooltip],
  template: `
    @if (isNonWorking()) {
    <div
      class="inline-flex gap-1 py-0.5 px-1.5 rounded-sm font-medium items-center justify-center text-[11px] border border-black/20 shadow-sm bg-neutral-700 text-gray-200 opacity-90"
      [pTooltip]="nonWorkingTooltip"
      tooltipPosition="top"
    >
      <span class="truncate max-w-[65px] font-semibold leading-tight">
        {{ nonWorkingLabel() || 'NO LABORA' }}
      </span>
    </div>
    <ng-template #nonWorkingTooltip>
      <div class="flex flex-col gap-1">
        <div class="font-bold">{{ nonWorkingLabel() || 'No laborable' }}</div>
        <div>
          Fecha:
          <span class="font-bold">{{ date() | date : 'dd/MM/yyyy' }}</span>
        </div>
        <div class="italic">No se puede asignar sucursal este día.</div>
      </div>
    </ng-template>
    } @else { @if (assignment(); as assignmentValue) {
    <div
      class="inline-flex gap-1 py-0.5 px-1.5 rounded-sm font-medium items-center justify-center text-[11px] cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border border-black/20 shadow-sm text-white opacity-80 hover:opacity-100"
      [style.background-color]="
        getBranchColor(assignmentValue?.branch?.short_name || '')
      "
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
          Peluquero:
          <span class="font-bold"
            >{{ assignmentValue?.employee?.first_name }}
            {{ assignmentValue?.employee?.father_name }}</span
          >
        </div>
      </div>
    </ng-template>
    <p-popover #options>
      <div class="relative">
        <span class="font-medium block mb-2">Opciones</span>
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
    } @else { @if (canManage()) {
    <p-button
      icon="pi pi-plus"
      outlined
      size="small"
      severity="secondary"
      (onClick)="onAdd()"
      class="hover:bg-neutral-700 hover:border-amber-400 hover:text-amber-400 transition-all"
    />
    } } }
  `,
})
export class GroomerBranchCellComponent {
  // Mapa de colores por sucursal
  private readonly branchColors: Record<string, string> = {
    ' AF': '#6AA84F', // Albrook
    ' BV': '#D5A6BD', // Bella Vista
    ' CV': '#F1C232', // Costa Verde
    ' PE': '#8E7CC3', // Plaza Emporio
    ' SM': '#FCE5CD', // Santa Maria
    VZ: '#CFE2F3', // Villa Zaita
    ' OM': '#F28E86', // Ocean Mall
    ' C50': '#B6D7A8', // Calle 50
    ' BM': '#CBAB7F', // Brisas Mall
    // Colores para sucursales adicionales
    BN: '#10B981', // Brisas Norte
    ' CDR': '#3B82F6', // Condado del Rey
    CM: '#8B5CF6', // Coco Del Mar
    DVD: '#EF4444', // David Chiriqui
    OF: '#F59E0B', // Oficina Central
    'BO-DC': '#EC4899', // Bodega Dos Caminos
    'VS ': '#06B6D4', // Versalles
    NZ: '#84CC16', // Naz
  };

  // Método para obtener el color de una sucursal
  getBranchColor(shortName: string): string {
    return this.branchColors[shortName] || '#6B7280'; // Color gris por defecto
  }
  // Inputs
  public assignment = input<GroomerBranchAssignment | null | undefined>();
  public date = input.required<Date>();
  public employeeId = input.required<string>();
  public canManage = input.required<boolean>();
  public isNonWorking = input<boolean>(false);
  public nonWorkingLabel = input<string | null>(null);

  // Outputs
  public edit = output<{ assignment: GroomerBranchAssignment; date: Date }>();
  public delete = output<{ assignment: GroomerBranchAssignment; date: Date }>();
  public add = output<{ employeeId: string; date: Date }>();

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
}
