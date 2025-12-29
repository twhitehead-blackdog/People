import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Company } from '../models';
import { CompaniesStore } from '../stores/companies.store';
import { CompaniesFormComponent } from './companies-form.component';

@Component({
  selector: 'pt-companies',
  imports: [Card, Button, TableModule],
  providers: [DynamicDialogRef, DialogService],
  template: `<p-card>
    <ng-template #title>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
        <div>
          <h2 class="m-0 text-lg sm:text-xl">Empresas</h2>
          <p class="text-xs sm:text-sm text-gray-400 m-0 mt-1">Listado de empresas</p>
        </div>
        <div class="flex gap-2">
          <p-button
            label="Nuevo"
            icon="pi pi-plus-circle"
            rounded
            (onClick)="editCompany()"
            class="min-h-[44px]"
          />
        </div>
      </div>
    </ng-template>
    <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <p-table
        [value]="companies()"
        [paginator]="true"
        [rows]="5"
        [rowsPerPageOptions]="[5, 10, 20]"
        styleClass="min-w-full"
      >
        <ng-template #header>
          <tr>
            <th pSortableColumn="name">Nombre <p-sortIcon field="name" /></th>
            <th pSortableColumn="phone_number">
              Nro. Telefono <p-sortIcon field="phone_number" />
            </th>
            <th pSortableColumn="address">
              Direccion <p-sortIcon field="address" />
            </th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template #body let-item>
          <tr>
            <td>{{ item.name }}</td>
            <td>{{ item.phone_number }}</td>
            <td>{{ item.address }}</td>
            <td>
              <div class="flex gap-1 sm:gap-2">
                <p-button
                  severity="success"
                  text
                  round
                  icon="pi pi-pen-to-square"
                  (onClick)="editCompany(item)"
                  class="min-w-[44px] min-h-[44px]"
                />
                <p-button
                  severity="danger"
                  text
                  round
                  icon="pi pi-trash"
                  (onClick)="deleteCompany(item.id)"
                  class="min-w-[44px] min-h-[44px]"
                />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="4" class="text-center py-8">
              <p class="text-gray-400">No hay empresas registradas</p>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesComponent {
  protected store = inject(CompaniesStore);
  private dialog = inject(DialogService);
  public companies = computed(() => this.store.entities());

  constructor() {
    // Cargar empresas al inicializar el componente
    this.store.fetchItems();
  }

  editCompany(company?: Company) {
    this.dialog.open(CompaniesFormComponent, {
      header: 'Agregar empresa',
      width: '36rem',
      data: { company },
      modal: true,
    });
  }

  deleteCompany(id: string) {
    this.store.deleteItem(id);
  }
}
