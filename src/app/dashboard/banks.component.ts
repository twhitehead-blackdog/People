import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Bank } from '../models';
import { DashboardStore } from '../stores/dashboard.store';
import { BanksFormComponent } from './banks-form.component';

@Component({
  selector: 'pt-banks',
  imports: [TableModule, Button, Card, DatePipe],
  providers: [DynamicDialogRef, DialogService],
  template: `<p-card>
    <ng-template #title>
      <div class="flex items-center justify-between w-full">
        <div>
          <h2 class="m-0">Bancos</h2>
          <p class="text-sm text-gray-400 m-0 mt-1">Lista de bancos</p>
        </div>
        <div class="flex gap-2">
          <p-button
            label="Nuevo"
            icon="pi pi-plus-circle"
            rounded
            (onClick)="editBank()"
          />
        </div>
      </div>
    </ng-template>
    <p-table
      [value]="store.banks.entities()"
      [loading]="store.banks.isLoading()"
      [paginator]="true"
      [rows]="10"
      [rowsPerPageOptions]="[10, 20, 50]"
      [showCurrentPageReport]="true"
      currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} bancos"
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
              (onClick)="editBank(item)"
            />
            <p-button
              severity="danger"
              text
              rounded
              icon="pi pi-trash"
              (onClick)="store.banks.deleteItem(item.id)"
            />
          </td>
        </tr>
      </ng-template>
    </p-table>
  </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BanksComponent {
  public store = inject(DashboardStore);
  public ref = inject(DynamicDialogRef);
  public dialogService = inject(DialogService);

  constructor() {
    // Asegurar que los bancos se carguen al inicializar el componente
    this.store.banks.fetchItems();
  }

  editBank(bank?: Bank) {
    const ref = this.dialogService.open(BanksFormComponent, {
      width: '36rem',
      data: { bank },
      header: 'Datos del banco',
      modal: true,
    });
    
    // Recargar la lista cuando se cierre el diálogo
    ref.onClose.subscribe(() => {
      this.store.banks.reloadItems();
    });
  }
}
