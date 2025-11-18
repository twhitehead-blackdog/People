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
import { iif } from 'rxjs';
import { v4 } from 'uuid';
import { markGroupDirty } from '../services/util.service';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-banks-form',
  imports: [ReactiveFormsModule, InputText, Button],
  template: `<form [formGroup]="form" (ngSubmit)="saveChanges()">
    <div class="input-container">
      <label for="name">Nombre</label>
      <input pInputText formControlName="name" />
    </div>
    <div class="dialog-actions pt-4">
      <p-button
        label="Cancelar"
        severity="secondary"
        (onClick)="ref.close()"
        rounded
        icon="pi pi-times"
      />
      <p-button label="Guardar" type="submit" icon="pi pi-save" rounded />
    </div>
  </form>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BanksFormComponent implements OnInit {
  public ref = inject(DynamicDialogRef);
  public store = inject(DashboardStore);
  public dialog = inject(DynamicDialogConfig);
  public destroyRef = inject(DestroyRef);
  private messageService = inject(MessageService);

  form = new FormGroup({
    id: new FormControl(v4(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
    name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    const { bank } = this.dialog.data;
    if (bank) {
      this.form.patchValue(bank);
    }
  }
  saveChanges() {
    if (this.form.invalid) {
      markGroupDirty(this.form);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor, complete los campos requeridos',
      });
      return;
    }
    if (this.form.pristine) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'No se realizaron cambios',
      });
      this.ref.close();
      return;
    }
    iif(
      () => this.dialog.data.bank,
      this.store.banks.editItem(this.form.getRawValue()),
      this.store.banks.createItem(this.form.getRawValue())
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.ref.close() });
  }
}
