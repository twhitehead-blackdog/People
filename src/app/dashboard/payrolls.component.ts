import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Payroll } from '../models';
import { PayrollsStore } from '../stores/payrolls.store';
import { PayrollsFormComponent } from './payrolls-form.component';

@Component({
  selector: 'pt-payrolls',
  imports: [TableModule, Button, Card, DatePipe, RouterLink],
  providers: [DynamicDialogRef, DialogService],
  template: `<p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div>
            <h2 class="m-0">Planillas</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Gestión de planillas de pago</p>
          </div>
          <div class="flex gap-2">
            <p-button
              (click)="editPayroll()"
              label="Nuevo"
              icon="pi pi-plus-circle"
              rounded
            />
          </div>
        </div>
      </ng-template>
      <p-table 
        [value]="store.entities() || []" 
        [loading]="store.isLoading()"
        paginator
        [rows]="10"
        [rowsPerPageOptions]="[10, 20, 50]"
        paginatorDropdownAppendTo="body"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>Nombre</th>
            <th>Empresa</th>
            <th>Creada</th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-payroll>
          <tr>
            <td>{{ payroll.name }}</td>
            <td>{{ payroll.company.name }}</td>
            <td>{{ payroll.created_at | date : 'short' }}</td>
            <td>
              <div class="flex gap-2">
                <p-button
                  label="Detalles"
                  icon="pi pi-calculator"
                  size="small"
                  severity="info"
                  [routerLink]="payroll.id"
                  rounded
                />
                <p-button
                  (click)="editPayroll(payroll)"
                  label="Editar"
                  icon="pi pi-pencil"
                  severity="success"
                  size="small"
                  rounded
                />
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollsComponent {
  public dialog = inject(DialogService);
  public store = inject(PayrollsStore);

  public editPayroll(payroll?: Payroll) {
    this.dialog.open(PayrollsFormComponent, {
      header: 'Agregar planilla',
      width: '36rem',
      data: { payroll },
      modal: true,
    });
  }
}
