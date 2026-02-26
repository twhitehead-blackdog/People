import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Select } from 'primeng/select';
import { JobApplication } from '../models';

@Component({
  selector: 'pt-job-application-status-dialog',
  imports: [FormsModule, ReactiveFormsModule, Select, Button],
  template: `
    <div class="space-y-4">
      <p class="text-gray-300">
        Cambiar el estado de la aplicación de
        <strong class="text-white"
          >{{ application.first_name }} {{ application.last_name }}</strong
        >
      </p>
      <div>
        <label
          for="status"
          class="block text-sm font-medium text-gray-300 mb-2"
        >
          Nuevo Estado
        </label>
        <p-select
          id="status"
          [formControl]="statusControl"
          [options]="availableStatuses()"
          optionLabel="label"
          optionValue="code"
          appendTo="body"
          class="w-full"
        />
      </div>
      <div class="flex gap-2 justify-end">
        <p-button label="Cancelar" severity="secondary" (onClick)="close()" />
        <p-button
          label="Cambiar Estado"
          (onClick)="confirm()"
          [disabled]="statusControl.invalid"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobApplicationStatusDialogComponent {
  private config = inject(DynamicDialogConfig);
  private ref = inject(DynamicDialogRef);

  public application: JobApplication = this.config.data.application;

  // Usar los estados dinámicos pasados desde el componente padre
  public statusOptions: Array<{
    code: string;
    label: string;
    severity?: string;
  }> = this.config.data.statusOptions || [
    { code: 'pending', label: 'Pendiente', severity: 'warn' },
    { code: 'reviewed', label: 'Revisada', severity: 'info' },
    { code: 'contacted', label: 'Contactada', severity: 'info' },
    { code: 'rejected', label: 'Rechazada', severity: 'danger' },
    { code: 'hired', label: 'Contratada', severity: 'success' },
  ];

  // Filtrar para excluir el estado actual
  public availableStatuses = computed(() => {
    return this.statusOptions.filter(
      (opt: { code: string; label: string; severity?: string }) =>
        opt.code !== this.application.status
    );
  });

  public statusControl = new FormControl<string | null>(null, [
    Validators.required,
  ]);

  confirm() {
    if (this.statusControl.valid && this.statusControl.value) {
      this.ref.close(this.statusControl.value);
    }
  }

  close() {
    this.ref.close(null);
  }
}
