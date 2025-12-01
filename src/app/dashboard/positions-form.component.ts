import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { v4 } from 'uuid';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { tap } from 'rxjs';
import { markGroupDirty } from '../services/util.service';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-positions-form',
  imports: [ReactiveFormsModule, Button, InputText, Select, ToggleSwitch],
  template: ` <form [formGroup]="form" (ngSubmit)="saveChanges()">
    <div class="flex flex-col gap-4">
      <div class="input-container">
        <label for="name">Nombre</label>
        <input type="text" pInputText id="name" formControlName="name" />
      </div>
      <div class="input-container">
        <label for="company"> Empresa</label>
        <p-select
          id="company"
          appendTo="body"
          [options]="store.companies.entities()"
          optionValue="id"
          optionLabel="name"
          formControlName="company_id"
          placeholder="Seleccione una empresa"
        />
      </div>
      <div class="input-container">
        <label for="department"> Area</label>
        <p-select
          id="department"
          appendTo="body"
          [options]="store.departments.entities()"
          optionValue="id"
          optionLabel="name"
          formControlName="department_id"
          placeholder="Seleccione un area"
        />
      </div>
      <div class="flex items-center gap-2">
        <p-toggleswitch formControlName="admin" inputId="admin" />
        <label for="schedule_admin">Administrador</label>
      </div>
      <div class="flex items-center gap-2">
        <p-toggleswitch
          formControlName="schedule_admin"
          inputId="schedule_admin"
        />
        <label for="schedule_admin">Administra horarios</label>
      </div>
      <div class="flex items-center gap-2">
        <p-toggleswitch
          formControlName="schedule_approver"
          inputId="schedule_approver"
        />
        <label for="schedule_approver">Aprueba horarios</label>
      </div>
      <div class="flex items-center gap-2">
        <p-toggleswitch
          formControlName="dashboard_access"
          inputId="dashboard_access"
        />
        <label for="dashboard_access">Acceso al dashboard</label>
      </div>
      <div class="flex items-center gap-2">
        <p-toggleswitch
          formControlName="available_for_job_fair"
          inputId="available_for_job_fair"
        />
        <label for="available_for_job_fair">Disponible en Feria de Empleo</label>
      </div>
      <div class="input-container">
        <label for="default_view">Vista predeterminada</label>
        <p-select
          id="default_view"
          appendTo="body"
          [options]="defaultViewOptions"
          optionValue="value"
          optionLabel="label"
          formControlName="default_view"
          placeholder="Seleccione una vista"
        />
      </div>
      <div class="dialog-actions">
        <p-button
          label="Cancelar"
          severity="secondary"
          outlined
          rounded
          icon="pi pi-times"
          (click)="dialog.close()"
        />
        <p-button
          label="Guardar cambios"
          type="submit"
          rounded
          icon="pi pi-save"
          [loading]="store.positions.isLoading()"
        />
      </div>
    </div>
  </form>`,
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
    company_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    admin: new FormControl(false, { nonNullable: true }),
    schedule_admin: new FormControl(false, { nonNullable: true }),
    schedule_approver: new FormControl(false, { nonNullable: true }),
    dashboard_access: new FormControl(false, { nonNullable: true }),
    available_for_job_fair: new FormControl(true, { nonNullable: true }),
    default_view: new FormControl('', { nonNullable: false }),
  });
  
  public defaultViewOptions = [
    { label: 'Inicio', value: 'home' },
    { label: 'Administración', value: 'admin' },
    { label: 'Nómina', value: 'payroll' },
    { label: 'Gestión de tiempo', value: 'time-management' },
    { label: 'Reloj de marcación', value: 'timeclock' },
    { label: 'Portal de empleado', value: 'employee-portal' },
  ];
  
  public store = inject(DashboardStore);
  public dialog = inject(DynamicDialogRef);
  private dialogConfig = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    const { position } = this.dialogConfig.data;
    if (position) {
      // Cargar todos los campos de la posición, estableciendo valores por defecto si faltan
      this.form.patchValue({
        id: position.id || v4(),
        name: position.name || '',
        department_id: position.department_id || '',
        company_id: position.company_id || '',
        admin: position.admin ?? false,
        schedule_admin: position.schedule_admin ?? false,
        schedule_approver: position.schedule_approver ?? false,
        dashboard_access: position.dashboard_access ?? false,
        available_for_job_fair: position.available_for_job_fair ?? true,
        default_view: position.default_view || '',
      });
    }
  }

  saveChanges() {
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor, rellene todos los campos',
      });
      markGroupDirty(this.form);
      return;
    }

    if (this.form.pristine) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se han realizado cambios',
      });
      return;
    }

    const formValue = this.form.getRawValue();
    // Convertir null o cadena vacía a undefined para default_view
    const positionData = {
      ...formValue,
      default_view: formValue.default_view && formValue.default_view.trim() !== '' 
        ? formValue.default_view 
        : undefined,
    };

    if (this.dialogConfig.data.position) {
      this.store.positions
        .editItem(positionData)
        .pipe(
          tap(() => this.dialog.close()),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe();
      return;
    }

    this.store.positions
      .createItem(positionData)
      .pipe(
        tap(() => this.dialog.close()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    return;
  }
}
