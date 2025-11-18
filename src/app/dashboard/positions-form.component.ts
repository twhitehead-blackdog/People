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
  });
  public store = inject(DashboardStore);
  public dialog = inject(DynamicDialogRef);
  private dialogConfig = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    const { position } = this.dialogConfig.data;
    if (position) {
      this.form.patchValue(position);
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

    if (this.dialogConfig.data.position) {
      this.store.positions
        .editItem(this.form.getRawValue())
        .pipe(
          tap(() => this.dialog.close()),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe();
      return;
    }

    this.store.positions
      .createItem(this.form.getRawValue())
      .pipe(
        tap(() => this.dialog.close()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    return;
  }
}
