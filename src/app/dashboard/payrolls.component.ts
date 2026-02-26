import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Payroll } from '../models';
import { PayrollsStore } from '../stores/payrolls.store';
import { PayrollsFormComponent } from './payrolls-form.component';

@Component({
  selector: 'pt-payrolls',
  imports: [TableModule, Button, Card, DatePipe, RouterLink, Tag],
  providers: [DynamicDialogRef, DialogService],
  template: `<p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-3">
            <i class="pi pi-calculator text-2xl text-amber-400"></i>
            <div>
              <h2 class="m-0">Planillas</h2>
              <p class="text-sm text-gray-400 m-0 mt-1">Sistema de gestión de planillas de pago</p>
            </div>
          </div>
          <div class="flex gap-2">
            <p-button
              (click)="editPayroll()"
              label="Nueva Planilla"
              icon="pi pi-plus-circle"
              rounded
            />
          </div>
        </div>
      </ng-template>
      @if ((store.entities() || []).length === 0 && !store.isLoading()) {
        <div class="flex flex-col items-center justify-center py-8 text-gray-400">
          <i class="pi pi-inbox text-5xl mb-3"></i>
          <p class="text-lg font-medium">No hay planillas configuradas</p>
          <p class="text-sm">Crea una nueva planilla para comenzar</p>
        </div>
      } @else {
        <p-table
          [value]="store.entities() || []"
          [loading]="store.isLoading()"
          paginator
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          paginatorDropdownAppendTo="body"
          [rowHover]="true"
          styleClass="p-datatable-sm"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Nombre</th>
              <th>Empresa</th>
              <th>Estado</th>
              <th>Creada</th>
              <th class="text-right">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-payroll>
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <i class="pi pi-file-edit text-amber-400"></i>
                  <span class="font-medium">{{ payroll.name }}</span>
                </div>
              </td>
              <td>{{ payroll.company?.name || '-' }}</td>
              <td><p-tag value="Activa" severity="success" [rounded]="true" /></td>
              <td>{{ payroll.created_at | date : 'dd/MM/yyyy' }}</td>
              <td>
                <div class="flex gap-2 justify-end">
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
                    icon="pi pi-pencil"
                    severity="secondary"
                    size="small"
                    rounded
                    [text]="true"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5" class="text-center py-6 text-gray-400">
                <i class="pi pi-inbox text-3xl mb-2 block"></i>
                No hay planillas
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollsComponent {
  public dialog = inject(DialogService);
  public store = inject(PayrollsStore);

  constructor() {
    this.store.fetchItems();
  }

  public editPayroll(payroll?: Payroll) {
    this.dialog.open(PayrollsFormComponent, {
      header: payroll ? 'Editar planilla' : 'Nueva planilla',
      width: '36rem',
      data: { payroll },
      modal: true,
      dismissableMask: true,
      closeOnEscape: true,
    });
  }
}
