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
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { iif } from 'rxjs';
import { v4 } from 'uuid';
import { markGroupDirty } from '../services/util.service';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-companies-form',
  imports: [ReactiveFormsModule, InputText, Textarea, Button, ToggleSwitch],
  template: `<form [formGroup]="form" (ngSubmit)="saveChanges()">
    <div class="flex flex-col gap-4">
      <div class="input-container">
        <label for="name">Nombre</label>
        <input type="text" pInputText formControlName="name" id="name" />
      </div>
      <div class="input-container">
        <label for="address">Direccion</label>
        <textarea pTextarea formControlName="address"></textarea>
      </div>
      <div class="input-container">
        <label for="address">Nro. de Telefono</label>
        <input pInputText type="tel" formControlName="phone_number" />
      </div>
      <div class="flex items-center gap-2">
        <p-toggleswitch formControlName="is_active" inputId="active" />
        <label for="active">Activo</label>
      </div>
      <div class="flex gap-4 items-center justify-end">
        <p-button
          label="Cancelar"
          severity="secondary"
          outlined
          icon="pi pi-times"
          rounded
          (click)="dialogRef.close()"
        />
        <p-button
          label="Guardar cambios"
          icon="pi pi-save"
          type="submit"
          rounded
          [loading]="store.companies.isLoading()"
        />
      </div>
    </div>
  </form>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesFormComponent implements OnInit {
  form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    address: new FormControl('', { nonNullable: true }),
    phone_number: new FormControl('', { nonNullable: true }),
    is_active: new FormControl(true, { nonNullable: true }),
  });
  public dialogRef = inject(DynamicDialogRef);
  private dialog = inject(DynamicDialogConfig);
  public store = inject(DashboardStore);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    const { company } = this.dialog.data;
    if (company) {
      this.form.patchValue(company);
    }
  }

  async saveChanges() {
    if (this.form.invalid) {
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

    iif(
      () => this.dialog.data.company,
      this.store.companies.editItem(this.form.getRawValue()),
      this.store.companies.createItem(this.form.getRawValue())
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.dialogRef.close() });
  }
}
