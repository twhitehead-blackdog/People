import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { SelectButton } from 'primeng/selectbutton';

import { Employee } from '../models';
import { DashboardStore } from '../stores/dashboard.store';

export interface GroomerBranchSelectionResult {
  employeeId: string;
  startDate: Date;
  endDate: Date;
}

@Component({
  selector: 'pt-groomer-branch-selection-dialog',
  standalone: true,
  imports: [
    DialogModule,
    DropdownModule,
    Button,
    FormsModule,
    DatePipe,
    SelectButton,
    DatePicker,
  ],
  template: `
    <p-dialog
      header="Asignar Peluquero"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [style]="{ width: '450px' }"
    >
      <div class="p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">
            Sucursal: <strong>{{ branchName() }}</strong>
          </label>
        </div>

        <!-- Tipo de selección de fecha -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2"
            >Tipo de asignación</label
          >
          <p-selectbutton
            [options]="dateTypeOptions"
            [(ngModel)]="dateType"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
          />
        </div>

        <!-- Fecha única o rango -->
        <div class="mb-4">
          @if (dateType === 'single') {
          <label class="block text-sm font-medium mb-2">Fecha</label>
          <p-datepicker
            [(ngModel)]="startDate"
            dateFormat="dd/mm/yy"
            [showIcon]="true"
            styleClass="w-full"
            appendTo="body"
          />
          } @else {
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-2">Fecha inicio</label>
              <p-datepicker
                [(ngModel)]="startDate"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Fecha fin</label>
              <p-datepicker
                [(ngModel)]="endDate"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                [minDate]="startDate!"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
          </div>
          @if (dayCount() > 0) {
          <p class="text-xs text-gray-400 mt-2">
            <i class="pi pi-info-circle mr-1"></i>
            Se asignarán {{ dayCount() }} día(s)
          </p>
          } }
        </div>

        <div class="mb-4">
          <label for="employee-select" class="block text-sm font-medium mb-2">
            Peluquero
          </label>
          <p-dropdown
            id="employee-select"
            [options]="filteredEmployees()"
            optionLabel="first_name"
            optionValue="id"
            [(ngModel)]="selectedEmployeeId"
            placeholder="Seleccione un peluquero"
            class="w-full"
            [showClear]="true"
            [filter]="true"
            filterBy="first_name,father_name"
            appendTo="body"
            [panelStyle]="{ 'max-height': '200px' }"
            [virtualScroll]="true"
            [virtualScrollItemSize]="35"
          >
            <ng-template let-emp #item>
              <div class="flex flex-col">
                <span>{{ emp.first_name }} {{ emp.father_name }}</span>
                <span class="text-xs text-gray-400">{{ emp.position?.name }}</span>
              </div>
            </ng-template>
            <ng-template let-emp #selectedItem>
              <span>{{ emp.first_name }} {{ emp.father_name }}</span>
            </ng-template>
          </p-dropdown>
        </div>

        <div class="flex justify-end gap-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            (onClick)="cancelSelection()"
          />
          <p-button
            label="Asignar"
            severity="success"
            (onClick)="confirmSelection()"
            [disabled]="!canConfirm()"
          />
        </div>
      </div>
    </p-dialog>
  `,
})
export class GroomerBranchSelectionDialogComponent implements OnChanges {
  private store = inject(DashboardStore);

  // Inputs
  visible = input<boolean>(false);
  branchId = input<string | undefined>();
  date = input<Date | undefined>();
  availableEmployees = input<Employee[]>([]);
  nonWorkingMap = input<Record<string, string>>({});
  assignedEmployeeIdsForDate = input<Map<string, Set<string>>>(new Map());

  // Outputs
  visibleChange = output<boolean>();
  confirm = output<GroomerBranchSelectionResult>();
  cancel = output<void>();

  // State
  selectedEmployeeId: string | null = null;
  dateType: 'single' | 'range' = 'single';
  startDate: Date | null = null;
  endDate: Date | null = null;

  private wasVisible = false;

  dateTypeOptions = [
    { label: 'Fecha única', value: 'single' },
    { label: 'Rango de fechas', value: 'range' },
  ];

  branchName = computed(() => {
    const id = this.branchId();
    if (!id) return '';
    const branch = this.store.branches.entities().find((b) => b.id === id);
    return branch?.name || '';
  });

  // Filtrar empleados
  filteredEmployees = computed(() => {
    const allGroomers = this.availableEmployees();
    if (!this.startDate) return allGroomers;
    const dateKey = format(this.startDate, 'yyyy-MM-dd');
    const nwMap = this.nonWorkingMap();
    const assigned = this.assignedEmployeeIdsForDate().get(dateKey) || new Set();

    return allGroomers.filter((e) => {
      const key = `${e.id}|${dateKey}`;
      if (nwMap[key]) return false;
      if (assigned.has(e.id)) return false;
      return true;
    });
  });

  dayCount = computed(() => {
    if (!this.startDate || !this.endDate) return 0;
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  });

  canConfirm(): boolean {
    if (!this.selectedEmployeeId) return false;
    if (!this.startDate) return false;
    if (this.dateType === 'range') {
      if (!this.endDate) return false;
      if (this.startDate > this.endDate) return false;
    }
    return true;
  }

  ngOnChanges(): void {
    if (this.visible() && !this.wasVisible) {
      this.initDialogState();
    }
    this.wasVisible = this.visible();
  }

  private initDialogState(): void {
    if (this.date()) {
      this.startDate = new Date(this.date()!);
      this.endDate = null;
    } else {
      this.startDate = new Date();
      this.endDate = null;
    }
    this.selectedEmployeeId = null;
    this.dateType = 'single';
  }

  confirmSelection(): void {
    if (this.selectedEmployeeId && this.startDate) {
      const result: GroomerBranchSelectionResult = {
        employeeId: this.selectedEmployeeId,
        startDate: this.startDate,
        endDate:
          this.dateType === 'range' && this.endDate
            ? this.endDate
            : this.startDate,
      };
      this.confirm.emit(result);
      this.closeDialog();
    }
  }

  cancelSelection(): void {
    this.cancel.emit();
    this.closeDialog();
  }

  private closeDialog(): void {
    this.selectedEmployeeId = null;
    this.startDate = null;
    this.endDate = null;
    this.dateType = 'single';
    this.visibleChange.emit(false);
  }
}
