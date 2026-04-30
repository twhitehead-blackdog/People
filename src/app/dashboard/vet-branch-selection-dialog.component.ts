import { Component, computed, inject, input, output, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { differenceInCalendarDays } from 'date-fns';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';

import { Employee } from '../models';
import { DashboardStore } from '../stores/dashboard.store';

export interface VetBranchSelectionResult {
  branchId: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
}

@Component({
  selector: 'pt-vet-branch-selection-dialog',
  standalone: true,
  imports: [
    DialogModule,
    SelectModule,
    Button,
    FormsModule,
    SelectButton,
    DatePicker,
  ],
  template: `
    <p-dialog
      header="Seleccionar Sucursal"
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
            Empleado: {{ employee()?.first_name }} {{ employee()?.father_name }}
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
            [minDate]="minDate"
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
                [minDate]="minDate"
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
                [minDate]="startDate || minDate"
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
          <label for="branch-select" class="block text-sm font-medium mb-2">
            Sucursal
          </label>
          <p-select
            id="branch-select"
            [options]="branches()"
            optionLabel="name"
            optionValue="id"
            [(ngModel)]="selectedBranchId"
            placeholder="Seleccione una sucursal"
            class="w-full"
            [showClear]="true"
            appendTo="body"
            [panelStyle]="{ 'max-height': '200px' }"
            [virtualScroll]="true"
            [virtualScrollItemSize]="35"
          />
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
export class VetBranchSelectionDialogComponent implements OnChanges {
  private store = inject(DashboardStore);

  // Inputs
  visible = input<boolean>(false);
  employee = input<Employee | undefined>();
  date = input<Date | undefined>();
  currentBranchId = input<string | undefined>();
  branchId = input<string | undefined>();
  availableEmployees = input<Employee[]>([]);
  nonWorkingMap = input<Record<string, string>>({});
  assignedEmployeeIdsForDate = input<string[]>([]);

  // Outputs
  visibleChange = output<boolean>();
  confirm = output<VetBranchSelectionResult>();
  cancel = output<void>();

  // State
  selectedBranchId: string | null = null;
  selectedEmployeeId: string | null = null;
  dateType: 'single' | 'range' = 'single';
  startDate: Date | null = null;
  endDate: Date | null = null;
  minDate: Date | undefined = undefined; // Allow past dates by default

  // Persistence State
  private lastEmployeeId: string | null = null;
  private lastBranchId: string | null = null;
  private wasVisible = false;

  dateTypeOptions = [
    { label: 'Fecha única', value: 'single' },
    { label: 'Rango de fechas', value: 'range' },
  ];

  // Computed
  branches = () =>
    this.store.branches.entities().filter(
      (branch) =>
        branch.is_active &&
        branch.name !== 'Bodega Dos Caminos' &&
        branch.id !== '7862b9be-890d-4432-8a2f-9329a15a2853' // Oficina Central
    );

  dayCount = computed(() => {
    if (!this.startDate || !this.endDate) return 0;
    return Math.abs(differenceInCalendarDays(this.endDate, this.startDate)) + 1;
  });

  canConfirm(): boolean {
    if (!this.selectedEmployeeId) return false;
    if (!this.selectedBranchId) return false;
    if (!this.startDate) return false;
    if (this.dateType === 'range') {
      if (!this.endDate) return false;
      if (this.startDate > this.endDate) return false;
    }
    return true;
  }

  // Effect-like logic via ngOnChanges to handle "On Open"
  ngOnChanges(): void {
    if (this.visible() && !this.wasVisible) {
      // Dialog just opened
      this.initDialogState();
    }
    this.wasVisible = this.visible();
  }

  private initDialogState(): void {
    // 1. Initialize Dates
    if (this.date()) {
      // CLONE dates to avoid reference issues
      this.startDate = new Date(this.date()!);
      this.endDate = null;
    } else {
      this.startDate = new Date();
      this.endDate = new Date();
    }

    // 2. Initialize Branch Selection
    const empId = this.employee()?.id;
    const editBranch = this.currentBranchId();

    if (editBranch) {
      // Editing existing: always use that
      this.selectedBranchId = editBranch;
    } else {
      // Adding new: check memory
      if (empId && empId === this.lastEmployeeId && this.lastBranchId) {
        this.selectedBranchId = this.lastBranchId;
      } else {
        this.selectedBranchId = null; // Reset if different employee or no memory
      }
    }

    // Default to single
    this.dateType = 'single';
  }

  confirmSelection(): void {
    if (this.selectedEmployeeId && this.startDate) {
      const result: VetBranchSelectionResult = {
        branchId: this.branchId() || this.selectedBranchId || '',
        employeeId: this.selectedEmployeeId,
        startDate: this.startDate,
        endDate:
          this.dateType === 'range' && this.endDate
            ? this.endDate
            : this.startDate,
      };

      // Save to memory
      if (this.employee()?.id) {
        this.lastEmployeeId = this.employee()!.id;
        this.lastBranchId = this.selectedBranchId;
      }

      this.confirm.emit(result);
      this.closeDialog();
    }
  }

  cancelSelection(): void {
    this.cancel.emit();
    this.closeDialog();
  }

  private closeDialog(): void {
    this.selectedBranchId = null;
    this.selectedEmployeeId = null;
    this.startDate = null;
    this.endDate = null;
    this.dateType = 'single';
    this.visibleChange.emit(false);
  }
}
