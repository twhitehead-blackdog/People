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
import { PayrollStore } from '../stores/payroll.store';

@Component({
  selector: 'pt-creditors-form',
  imports: [ReactiveFormsModule, InputText, Button],
  template: `
    <form [formGroup]="form" (ngSubmit)="saveChanges()">
      <div class="input-container">
        <label for="name">Nombre</label>
        <input pInputText formControlName="name" />
      </div>
      <div class="dialog-actions pt-4">
        <p-button
          label="Cancelar"
          severity="secondary"
          text
          rounded
          icon="pi pi-times"
          (onClick)="dialog.close()"
        />
        <p-button label="Guardar" rounded icon="pi pi-check" type="submit" />
      </div>
    </form>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditorsFormComponent implements OnInit {
  public form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  public dialog = inject(DynamicDialogRef);
  public dialogConfig = inject(DynamicDialogConfig);
  public store = inject(PayrollStore);
  private destroyRef = inject(DestroyRef);
  private messageService = inject(MessageService);

  ngOnInit(): void {
    const { creditor } = this.dialogConfig.data;
    if (creditor) {
      this.form.patchValue(creditor);
    }
  }

  saveChanges() {
    const { creditor } = this.dialogConfig.data;
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
      this.dialog.close();
      return;
    }
    iif(
      () => creditor,
      this.store.creditors.editItem(this.form.getRawValue()),
      this.store.creditors.createItem(this.form.getRawValue())
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dialog.close();
      });
  }
}
