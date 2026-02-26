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
import { iif } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { markGroupDirty } from '../services/util.service';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-departments-form',
  imports: [ReactiveFormsModule, Button, InputText, Select],
  template: ` <form [formGroup]="form" (ngSubmit)="saveChanges()">
    <div class="flex flex-col gap-4">
      <div class="input-container">
        <label for="name">Nombre</label>
        <input type="text" id="name" pInputText formControlName="name" />
      </div>
      @if (!organizationService.isNaz()) {
      <div class="input-container">
        <label for="company_id">Empresa</label>
        <p-select
          inputId="company_id"
          formControlName="company_id"
          [options]="store.companies.entities()"
          optionLabel="name"
          optionValue="id"
          placeholder="Seleccione una empresa"
          showClear
          appendTo="body"
        />
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
          [loading]="store.departments.isLoading()"
          [disabled]="form.invalid || form.pristine"
        />
      </div>
    </div>
  </form>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentsFormComponent implements OnInit {
  public dialogRef = inject(DynamicDialogRef);
  private dialog = inject(DynamicDialogConfig);
  public store = inject(DashboardStore);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  public organizationService = inject(OrganizationService);

  form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    company_id: new FormControl('', {
      nonNullable: true,
      // company_id es requerido siempre
      validators: [],
    }),
  });

  ngOnInit() {
    // Cargar empresas si no están cargadas
    if (!this.organizationService.isNaz()) {
      this.store.companies.fetchItems();
    }
    
    const { department } = this.dialog.data;
    if (department) {
      this.form.patchValue({
        id: department.id,
        name: department.name || '',
        company_id: department.company_id || department.company?.id || '',
      });
    } else {
      // Si es un nuevo departamento, establecer automáticamente el company_id actual
      const currentCompanyId = this.organizationService.getCurrentCompanyId();
      if (currentCompanyId) {
        this.form.patchValue({
          company_id: currentCompanyId,
        });
      }
    }
  }

  async saveChanges() {
    // Validar que el nombre esté presente (requerido para ambas tablas)
    if (
      !this.form.get('name')?.value ||
      this.form.get('name')?.value.trim() === ''
    ) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor, ingrese el nombre del departamento',
      });
      markGroupDirty(this.form);
      return;
    }

    // Validar company_id siempre
    if (!this.form.get('company_id')?.value) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor, seleccione una empresa',
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
      () => this.dialog.data.department,
      this.store.departments.editItem(dataToSave),
      this.store.departments.createItem(dataToSave)
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.dialogRef.close();
        },
        error: (error) => {
          console.error('Error al guardar departamento:', error);
          let errorMessage = 'Error al guardar el departamento';

          // Manejar error de constraint único
          if (
            error?.error?.code === '23505' ||
            error?.error?.message?.includes('duplicate key')
          ) {
            errorMessage = `Ya existe un departamento con el nombre "${
              this.form.get('name')?.value
            }". Por favor, use un nombre diferente.`;
          } else if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
          });
        },
      });
  }
}
