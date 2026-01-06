import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';

import { Branch, Employee } from '../models';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-vet-branch-selection-dialog',
  standalone: true,
  imports: [DialogModule, DropdownModule, Button, FormsModule],
  template: `
    <p-dialog
      header="Seleccionar Sucursal"
      [modal]="true"
      [closable]="true"
      [(visible)]="visible"
      [style]="{ width: '400px' }"
    >
      <div class="p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">
            Empleado: {{ employee()?.first_name }} {{ employee()?.father_name }}
          </label>
          <label class="block text-sm font-medium mb-2">
            Fecha: {{ date() | date : 'dd/MM/yyyy' }}
          </label>
        </div>

        <div class="mb-4">
          <label for="branch-select" class="block text-sm font-medium mb-2">
            Sucursal
          </label>
          <p-dropdown
            id="branch-select"
            [options]="branches()"
            optionLabel="name"
            optionValue="id"
            [(ngModel)]="selectedBranchId"
            placeholder="Seleccione una sucursal"
            class="w-full"
            [showClear]="true"
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
            [disabled]="!selectedBranchId"
          />
        </div>
      </div>
    </p-dialog>
  `,
})
export class VetBranchSelectionDialogComponent {
  private store = inject(DashboardStore);

  // Inputs
  visible = input<boolean>(false);
  employee = input<Employee | undefined>();
  date = input<Date | undefined>();

  // Outputs
  confirm = output<string>();
  cancel = output<void>();

  // State
  selectedBranchId: string | null = null;

  // Computed
  branches = () => this.store.branches.entities();

  confirmSelection(): void {
    if (this.selectedBranchId) {
      this.confirm.emit(this.selectedBranchId);
    }
  }

  cancelSelection(): void {
    this.selectedBranchId = null;
    this.cancel.emit();
  }
}