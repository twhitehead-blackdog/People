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
import { invalidateEmployeeCache } from '../guards/employee-portal.guard';

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

        <div class="border-t border-gray-200 pt-3 mt-1">
          <h4 class="text-sm font-semibold text-gray-600 mb-3">Permisos del sistema</h4>

          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <p-toggleswitch
                formControlName="dashboard_access"
                inputId="dashboard_access"
              />
              <label for="dashboard_access">Acceso al Dashboard</label>
            </div>

            <div class="flex items-center gap-2">
              <p-toggleswitch
                formControlName="admin"
                inputId="admin"
              />
              <label for="admin">Administrador</label>
            </div>

            <div class="flex items-center gap-2">
              <p-toggleswitch
                formControlName="schedule_admin"
                inputId="schedule_admin"
              />
              <label for="schedule_admin">Admin de horarios</label>
            </div>

            <div class="flex items-center gap-2">
              <p-toggleswitch
                formControlName="schedule_approver"
                inputId="schedule_approver"
              />
              <label for="schedule_approver">Aprobador de horarios</label>
            </div>

            <div class="input-container">
              <label for="default_view">Vista predeterminada</label>
              <p-select
                inputId="default_view"
                formControlName="default_view"
                [options]="defaultViewOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccione una vista"
                showClear
                appendTo="body"
              />
            </div>
          </div>
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
    default_view: new FormControl('', { nonNullable: true }),
  });

  // Permisos por defecto: solo reloj de marcación y portal de empleado (perfil)
  private readonly defaultFrontendPermissions = {
    modules: {
      employee_portal: {
        enabled: true,
        subModules: {
          portal_access: true
        }
      },
      timeclock: {
        enabled: true,
        subModules: {
          timeclock_access: true
        }
      }
    },
    version: 1
  };

  defaultViewOptions = [
    { label: 'Inicio', value: 'home' },
    { label: 'Administración', value: 'admin' },
    { label: 'Nómina', value: 'payroll' },
    { label: 'Gestión de tiempo', value: 'time-management' },
    { label: 'Reloj de marcación', value: 'timeclock' },
    { label: 'Portal de empleado', value: 'employee-portal' },
  ];

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
        default_view: position.default_view || '',
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

    const formValue = this.form.getRawValue();

    // Si es creación o no tiene permisos definidos, asignar permisos por defecto
    const isNew = !this.dialog.data.position;
    const existingPermissions = this.dialog.data.position?.frontend_permissions;
    const frontendPermissions = isNew || !existingPermissions
      ? this.defaultFrontendPermissions
      : existingPermissions;

    const dataToSave: any = {
      ...formValue,
      frontend_permissions: frontendPermissions,
    };

    iif(
      () => this.dialog.data.position,
      this.store.positions.editItem(dataToSave),
      this.store.positions.createItem(dataToSave)
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          invalidateEmployeeCache();
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
