import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { iif } from 'rxjs';
import { v4 } from 'uuid';
import { OrganizationService } from '../services/organization.service';
import { markGroupDirty } from '../services/util.service';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-positions-form',
  imports: [ReactiveFormsModule, Button, InputText, Select, ToggleSwitch],
  template: `
    <form [formGroup]="form" (ngSubmit)="saveChanges()">
      <div class="flex flex-col gap-4">
        <div class="input-container">
          <label for="name">Nombre</label>
          <input type="text" id="name" pInputText formControlName="name" />
        </div>
        <div class="input-container">
          <label for="department_id">Área</label>
          <p-select
            inputId="department_id"
            formControlName="department_id"
            [options]="store.departments.entities()"
            optionLabel="name"
            optionValue="id"
            placeholder="Seleccione un área"
            showClear
            appendTo="body"
          />
        </div>
        @if (!organizationService.isNaz()) {
        <div class="flex items-center gap-2">
          <p-toggleswitch
            formControlName="available_for_job_fair"
            inputId="available_for_job_fair"
          />
          <label for="available_for_job_fair"
            >Disponible en Feria de Empleo</label
          >
        </div>
        } @if (!organizationService.isNaz()) {
        <div class="flex items-center gap-2">
          <p-toggleswitch
            formControlName="dashboard_access"
            inputId="dashboard_access"
          />
          <label for="dashboard_access">Acceso al Dashboard</label>
        </div>
        }
        <div class="flex gap-4 items-center justify-end">
          <p-button
            label="Cancelar"
            severity="secondary"
            outlined
            rounded
            icon="pi pi-times"
            (click)="dialogRef.close()"
          />
          <p-button
            label="Guardar cambios"
            type="submit"
            rounded
            icon="pi pi-save"
            [loading]="store.positions.isLoading()"
            [disabled]="form.invalid || form.pristine"
          />
        </div>
      </div>
    </form>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionsFormComponent implements OnInit {
  form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    department_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    available_for_job_fair: new FormControl(false, { nonNullable: true }),
    admin: new FormControl(false, { nonNullable: true }),
    schedule_admin: new FormControl(false, { nonNullable: true }),
    schedule_approver: new FormControl(false, { nonNullable: true }),
    dashboard_access: new FormControl(false, { nonNullable: true }),
  });
  public dialogRef = inject(DynamicDialogRef);
  private dialog = inject(DynamicDialogConfig);
  public store = inject(DashboardStore);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  public organizationService = inject(OrganizationService);

  ngOnInit() {
    const { position } = this.dialog.data;
    if (position) {
      this.form.patchValue({
        id: position.id,
        name: position.name || '',
        department_id: position.department_id || position.department?.id || '',
        available_for_job_fair: position.available_for_job_fair || false,
        admin: position.admin || false,
        schedule_admin: position.schedule_admin || false,
        schedule_approver: position.schedule_approver || false,
        dashboard_access: position.dashboard_access || false,
      });
    }
  }

  async saveChanges() {
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor, complete los campos requeridos',
      });
      markGroupDirty(this.form);
      return;
    }
    if (this.form.pristine) {
      this.messageService.add({
        severity: 'info',
        detail: 'No se realizaron cambios',
        summary: 'Info',
      });
      this.dialogRef.close();
      return;
    }
    // Ya no se filtran campos, todo se guarda (tablas compartidas)
    const formValue = this.form.getRawValue();
    const dataToSave: any = formValue;

    iif(
      () => this.dialog.data.position,
      this.store.positions.editItem(dataToSave),
      this.store.positions.createItem(dataToSave)
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.dialogRef.close();
        },
        error: (error) => {
          // Mostrar error específico del backend
          const errorMsg = error?.error?.message || error?.message || 'Error desconocido';
          console.error('[PositionsForm] Error al guardar:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail: `No se pudo guardar el cargo: ${errorMsg}`,
            sticky: true,
          });
        }
      });
  }
}
