import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';

import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Position } from '../models';
import { DashboardStore } from '../stores/dashboard.store';
import { PositionsFormComponent } from './positions-form.component';

@Component({
  selector: 'pt-positions',
  imports: [TableModule, Card, Button, IconField, InputIcon, InputText],
  providers: [DynamicDialogRef, DialogService],
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div>
            <h2 class="m-0">Cargos</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Listado de cargos y posiciones de la empresa</p>
          </div>
          <div class="flex gap-2">
            <p-button
              label="Nuevo"
              (click)="editPosition()"
              icon="pi pi-plus-circle"
              rounded
            />
          </div>
        </div>
      </ng-template>
      <p-table
        #dt
        [value]="positions()"
        [paginator]="true"
        [rowsPerPageOptions]="[10, 20, 50]"
        [rows]="10"
        [globalFilterFields]="['name', 'department.name']"
        paginatorDropdownAppendTo="body"
      >
        <ng-template #caption>
          <div class="flex gap-2 items-center">
            <p-iconfield iconPosition="left" class="w-full md:w-auto">
              <p-inputicon>
                <i class="pi pi-search"></i>
              </p-inputicon>
              <input
                pInputText
                type="text"
                (input)="onFilterInput($event, dt)"
                placeholder="Buscar"
              />
            </p-iconfield>
          </div>
        </ng-template>
        <ng-template #header>
          <tr>
            <th pSortableColumn="name">
              Nombre
              <p-sortIcon field="name" />
            </th>
            <th pSortableColumn="department.name">
              Area
              <p-sortIcon field="department.name" />
            </th>
            <th>Admin</th>
            <th>Horarios</th>
            <th>App. horarios</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template #body let-item>
          <tr class="hover:bg-neutral-800/50 transition-colors">
            <td class="font-medium text-white">{{ item.name }}</td>
            <td class="text-gray-300">{{ item.department?.name }}</td>
            <td>
              @if(item.admin) {
              <i
                class="pi pi-check-circle text-green-400"
                style="font-size: 1.25rem"
              ></i>
              } @else {
              <i
                class="pi pi-times-circle text-red-400"
                style="font-size: 1.25rem"
              ></i>
              }
            </td>
            <td>
              @if(item.schedule_admin) {
              <i
                class="pi pi-check-circle text-green-400"
                style="font-size: 1.25rem"
              ></i>
              } @else {
              <i
                class="pi pi-times-circle text-red-400"
                style="font-size: 1.25rem"
              ></i>
              }
            </td>
            <td>
              @if(item.schedule_approver) {
              <i
                class="pi pi-check-circle text-green-400"
                style="font-size: 1.25rem"
              ></i>
              } @else {
              <i
                class="pi pi-times-circle text-red-400"
                style="font-size: 1.25rem"
              ></i>
              }
            </td>
            <td class="flex gap-2">
              <p-button
                severity="success"
                text
                rounded
                icon="pi pi-pen-to-square"
                (onClick)="editPosition(item)"
                class="hover:shadow-md transition-all"
              />
              <p-button
                severity="danger"
                text
                rounded
                icon="pi pi-trash"
                (onClick)="deletePosition(item.id)"
                class="hover:shadow-md transition-all"
              />
            </td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionsComponent implements OnInit {
  readonly store = inject(DashboardStore);

  private dialog = inject(DialogService);
  private ref = inject(DynamicDialogRef);
  public positions = computed(() => [...this.store.positions.entities()]);

  // Validar y sanitizar input de filtros
  public onFilterInput(event: Event, table: any): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    
    // Sanitizar input: remover caracteres peligrosos y limitar longitud
    let value = input.value || '';
    // Remover caracteres de control y limitar a 200 caracteres
    value = value.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 200);
    
    table.filterGlobal(value, 'contains');
  }

  ngOnInit() {
    this.store.positions.fetchItems();
  }

  editPosition(position?: Position) {
    this.ref = this.dialog.open(PositionsFormComponent, {
      header: 'Cargo',
      width: '36rem',
      data: { position },
      modal: true,
    });
  }

  deletePosition(id: string) {
    this.store.positions.deleteItem(id);
  }
}
