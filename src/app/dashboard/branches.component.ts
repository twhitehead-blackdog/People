import { DialogModule } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';

import { Branch } from '../models';
import { BranchesStore } from '../stores/branches.store';
import { DashboardStore } from '../stores/dashboard.store';
import { BranchesFormComponent } from './branches-form.component';

@Component({
  selector: 'pt-branches',
  imports: [ButtonModule, CardModule, TableModule, DialogModule],
  providers: [DynamicDialogRef, DialogService, BranchesStore],
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div>
            <h2 class="m-0">Sucursales</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Listado de sucursales/localidades activas en la empresa</p>
          </div>
          <div class="flex gap-2">
            <p-button
              label="Nuevo"
              (click)="editBranch()"
              icon="pi pi-plus-circle"
              rounded
            />
          </div>
        </div>
      </ng-template>
      <div>
        <p-table
          [value]="branches()"
          [paginator]="true"
          [rows]="5"
          [rowsPerPageOptions]="[5, 10, 20]"
        >
          <ng-template #header>
            <tr>
              <th pSortableColumn="name">
                Nombre
                <p-sortIcon field="name" />
              </th>
              <th pSortableColumn="short_name">
                Abreviatura
                <p-sortIcon field="name" />
              </th>
              <th pSortableColumn="address">
                Direccion
                <p-sortIcon field="address" />
              </th>
              <th>IP</th>
              <th pFrozenColumn alignFrozen="right"></th>
            </tr>
          </ng-template>
          <ng-template #body let-item>
            <tr>
              <td>{{ item.name }}</td>
              <td>{{ item.short_name }}</td>
              <td>{{ item.address }}</td>
              <td>{{ item.ip }}</td>
              <td pFrozenColumn alignFrozen="right">
                <p-button
                  severity="success"
                  icon="pi pi-pen-to-square"
                  rounded
                  text
                  (onClick)="editBranch(item)"
                />
                <p-button
                  severity="danger"
                  icon="pi pi-trash"
                  rounded
                  text
                  (onClick)="deleteBranch(item.id)"
                />
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </p-card>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchesComponent {
  readonly store = inject(DashboardStore);
  private ref = inject(DynamicDialogRef);
  private dialogService = inject(DialogService);
  public branches = computed(() => [...this.store.branches.entities()]);

  editBranch(branch?: Branch) {
    this.ref = this.dialogService.open(BranchesFormComponent, {
      width: '36rem',
      data: { branch },
      header: 'Sucursal',
      modal: true,
    });
  }

  deleteBranch(id: string) {
    this.store.branches.deleteItem(id);
  }
}
