import {
  ChangeDetectionStrategy,
  Component,
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
import { Textarea } from 'primeng/textarea';
import { v4 } from 'uuid';

import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { tap } from 'rxjs';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-branches-form',
  imports: [
    ReactiveFormsModule,
    Button,
    InputText,
    Textarea,
    ToggleSwitch,
    Select,
  ],
  template: ` <form [formGroup]="form" (ngSubmit)="saveChanges()">
    <div class="flex flex-col gap-4">
      <div class="input-container">
        <label for="name">Nombre</label>
        <input type="text" pInputText formControlName="name" id="name" />
      </div>
      <div class="input-container">
        <label for="short_name">Abreviatura</label>
        <input
          type="text"
          pInputText
          formControlName="short_name"
          id="short_name"
        />
      </div>
      <div class="input-container">
        <label for="company_id">Empresa</label>
        <p-select
          formControlName="company_id"
          [options]="store.companies.entities()"
          optionLabel="name"
          optionValue="id"
          placeholder="Seleccione una empresa"
          showClear
        />
      </div>
      <div class="input-container">
        <label for="ip">IP</label>
        <input type="text" pInputText formControlName="ip" id="ip" />
      </div>
      <div class="input-container">
        <label for="address">Direccion</label>
        <textarea pTextarea formControlName="address"></textarea>
      </div>
      <div class="flex items-center gap-2">
        <p-toggleswitch formControlName="is_active" inputId="active" />
        <label for="active">Activo</label>
      </div>

      <div class="dialog-actions">
        <p-button
          label="Cancelar"
          severity="secondary"
          outlined
          rounded
          (click)="dialog.close()"
          icon="pi pi-times"
        />
        <p-button
          label="Guardar cambios"
          type="submit"
          [loading]="store.branches.isLoading()"
          [disabled]="form.invalid || form.pristine"
          rounded
          icon="pi pi-save"
        />
      </div>
    </div>
  </form>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchesFormComponent implements OnInit {
  form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    short_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    address: new FormControl('', {
      nonNullable: true,
    }),
    company_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    ip: new FormControl('', { nonNullable: true }),
    is_active: new FormControl(true, { nonNullable: true }),
  });
  public dialog = inject(DynamicDialogRef);
  private dialogConfig = inject(DynamicDialogConfig);
  public store = inject(DashboardStore);

  ngOnInit() {
    const { branch } = this.dialogConfig.data;
    if (branch) {
      this.form.patchValue(branch);
    }
  }

  saveChanges() {
    if (this.dialogConfig.data.branch) {
      this.store.branches
        .editItem(this.form.getRawValue())
        .pipe(tap(() => this.dialog.close()))
        .subscribe();
    } else {
      this.store.branches
        .createItem(this.form.getRawValue())
        .pipe(tap(() => this.dialog.close()))
        .subscribe();
    }
  }
}
