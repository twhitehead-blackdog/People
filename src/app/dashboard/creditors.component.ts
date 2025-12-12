import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Creditor } from '../models';
import { PayrollStore } from '../stores/payroll.store';
import { CreditorsFormComponent } from './creditors-form.component';

@Component({
  selector: 'pt-creditors',
  imports: [TableModule, Button, Card, DatePipe],
  providers: [DynamicDialogRef, DialogService],
  template: `<p-card>
    <ng-template #title>
      <div class="flex items-center justify-between w-full">
        <div>
          <h2 class="m-0">Acreedores</h2>
          <p class="text-sm text-gray-400 m-0 mt-1">Listado de acreedores</p>
        </div>
        <div class="flex gap-2">
          <p-button
            (click)="editCreditor()"
            label="Nuevo"
            icon="pi pi-plus-circle"
            rounded
          />
        </div>
      </div>
    </ng-template>
    <p-table
      [value]="store.creditors.entities()"
      [paginator]="true"
      [rows]="5"
      [rowsPerPageOptions]="[5, 10, 20]"
      [showCurrentPageReport]="true"
      currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} acreedores"
    >
      <ng-template #header>
        <tr>
          <th pSortableColumn="name">
            Nombre
            <p-sortIcon field="name" />
          </th>
          <th pSortableColumn="created_at">
            Fecha de creación
            <p-sortIcon field="created_at" />
          </th>
          <th></th>
        </tr>
      </ng-template>
      <ng-template #body let-item>
        <tr>
          <td>{{ item.name }}</td>
          <td>{{ item.created_at | date : 'medium' }}</td>
          <td>
            <p-button
              severity="success"
              text
              rounded
              icon="pi pi-pen-to-square"
              (onClick)="editCreditor(item)"
            />
            <p-button
              severity="danger"
              text
              rounded
              icon="pi pi-trash"
              (onClick)="store.creditors.deleteItem(item.id)"
            />
          </td>
        </tr>
      </ng-template>
    </p-table>
  </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditorsComponent {
  public store = inject(PayrollStore);
  private ref = inject(DynamicDialogRef);
  private dialogService = inject(DialogService);

  constructor() {
    // Asegurar que los acreedores se carguen al inicializar el componente
    this.store.creditors.fetchItems();
  }

  editCreditor(creditor?: Creditor) {
    this.ref = this.dialogService.open(CreditorsFormComponent, {
      width: '36rem',
      data: { creditor },
      header: 'Datos del accreedor',
      modal: true,
    });
    
    // Recargar la lista cuando se cierre el diálogo
    this.ref.onClose.subscribe(() => {
      this.store.creditors.reloadItems();
    });
  }
}
