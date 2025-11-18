import { HttpClient } from '@angular/common/http';
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
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { markGroupDirty } from '../services/util.service';

@Component({
  selector: 'pt-payroll-payments-form',
  imports: [ReactiveFormsModule, DatePicker, Button, InputText],
  template: `
    <form [formGroup]="form" (ngSubmit)="saveChanges()">
      <div class="flex flex-col md:grid grid-cols-2 md:gap-4">
        <div class="input-container">
          <label for="title">Titulo</label>
          <input
            pInputText
            id="title"
            name="title"
            formControlName="title"
            placeholder="Titulo"
          />
        </div>
        <div class="input-container">
          <label for="start_date">Fecha Inicio</label>
          <p-datepicker
            inputId="start_date"
            formControlName="start_date"
            iconDisplay="input"
            [showIcon]="true"
            appendTo="body"
            placeholder="dd/mm/yyyy"
          />
        </div>
        <div class="input-container">
          <label for="end_date">Fecha Fin</label>
          <p-datepicker
            inputId="end_date"
            formControlName="end_date"
            iconDisplay="input"
            [showIcon]="true"
            appendTo="body"
            placeholder="dd/mm/yyyy"
          />
        </div>
      </div>
      <div class="dialog-actions pt-4">
        <p-button
          label="Cancelar"
          severity="secondary"
          outlined
          rounded
          icon="pi pi-times"
          (click)="modalRef.close()"
        />
        <p-button
          label="Guardar"
          type="submit"
          form="employee-form"
          icon="pi pi-check"
          rounded
        />
      </div>
    </form>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollPaymentsFormComponent implements OnInit {
  form = new FormGroup({
    title: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    start_date: new FormControl(new Date(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
    end_date: new FormControl(new Date(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
    status: new FormControl('pending'),
    payroll_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });
  public modalRef = inject(DynamicDialogRef);
  public dialogConfig = inject(DynamicDialogConfig);
  private http = inject(HttpClient);
  private message = inject(MessageService);

  public ngOnInit(): void {
    this.form.patchValue({
      payroll_id: this.dialogConfig.data.payrollId,
    });
  }

  public saveChanges(): void {
    if (this.form.invalid) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor, complete los campos requeridos',
      });
      markGroupDirty(this.form);
      return;
    }
    this.http
      .post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_payments`,
        this.form.value
      )
      .subscribe(() => {
        this.modalRef.close();
      });
  }
}
