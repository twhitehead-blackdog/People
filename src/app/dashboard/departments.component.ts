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

import { Department } from '../models';
import { DeviceService } from '../services/device.service';
import { DepartmentsStore } from '../stores/departments.store';
import { DepartmentsFormComponent } from './departments-form.component';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'pt-departments',
  imports: [TableModule, Button, Card, TooltipModule],
  providers: [DynamicDialogRef, DialogService],
  template: `
    <div class="departments-page w-full">
    @if (device.isDesktop()) {
    <p-card styleClass="departments-card">
      <ng-template #title>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
          <div>
            <h2 class="m-0 text-xl font-bold text-white">Áreas</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Listado de áreas/departamentos de la empresa</p>
          </div>
          <div class="flex gap-2">
            <p-button (click)="editDepartment()" label="Nuevo" icon="pi pi-plus-circle" rounded class="min-h-[44px]" />
          </div>
        </div>
      </ng-template>
      <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <p-table
          [value]="departments()"
          [paginator]="true"
          [rows]="5"
          [rowsPerPageOptions]="[5, 10, 20]"
          styleClass="min-w-full p-datatable-sm"
        >
          <ng-template #header>
            <tr>
              <th pSortableColumn="name">Nombre <p-sortIcon field="name" /></th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template #body let-item>
            <tr>
              <td class="font-medium text-white">{{ item.name }}</td>
              <td>
                <div class="flex gap-1 sm:gap-2">
                  <p-button severity="success" text rounded icon="pi pi-pen-to-square" (onClick)="editDepartment(item)" class="min-w-[44px] min-h-[44px]" pTooltip="Editar" />
                  <p-button severity="danger" text rounded icon="pi pi-trash" (onClick)="deleteDepartment(item.id)" class="min-w-[44px] min-h-[44px]" pTooltip="Eliminar" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="2" class="text-center py-8 text-gray-400">No hay áreas registradas</td></tr>
          </ng-template>
        </p-table>
      </div>
    </p-card>
    } @else {
    <div class="mobile-departments flex flex-col min-h-[60vh]">
      <div class="mobile-section-header">
        <div>
          <span class="mobile-section-header__title">Áreas</span>
          <span class="mobile-section-header__count">{{ departments().length }}</span>
        </div>
        <button class="mobile-fab" style="position:relative;bottom:auto;right:auto;width:2.75rem;height:2.75rem;" (click)="editDepartment()" aria-label="Nueva área">
          <i class="pi pi-plus"></i>
        </button>
      </div>
      <main class="flex-1 overflow-y-auto px-3 py-3">
        @if (departments().length === 0) {
          <div class="mobile-empty-state">
            <i class="pi pi-sitemap mobile-empty-state__icon"></i>
            <p class="mobile-empty-state__title">No hay áreas</p>
            <p class="mobile-empty-state__desc">Agrega una desde el botón superior</p>
          </div>
        } @else {
          <div class="mobile-card-list pb-4">
            @for (item of departments(); track item.id) {
              <div class="mobile-card-item" (click)="editDepartment(item)">
                <div class="mobile-card-item__body">
                  <div class="mobile-card-item__title">{{ item.name }}</div>
                </div>
                <div class="mobile-card-item__action" style="display:flex;gap:0.25rem;" (click)="$event.stopPropagation()">
                  <p-button icon="pi pi-pen-to-square" [label]="''" (onClick)="editDepartment(item)" rounded text severity="success" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Editar" />
                  <p-button icon="pi pi-trash" [label]="''" (onClick)="deleteDepartment(item.id)" rounded text severity="danger" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Eliminar" />
                </div>
              </div>
            }
          </div>
        }
      </main>
    </div>
    }
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; }
    :host ::ng-deep .departments-card.p-card {
      background: rgba(31, 41, 55, 0.95) !important;
      border: 1px solid rgba(75, 85, 99, 0.5) !important;
      border-radius: 0.75rem !important;
    }
    :host ::ng-deep .departments-card .p-card-body { background: transparent !important; }
    :host ::ng-deep .departments-card .p-card-title { color: #f3f4f6 !important; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentsComponent {
  readonly state = inject(DepartmentsStore);
  private ref = inject(DynamicDialogRef);
  private dialog = inject(DialogService);
  protected device = inject(DeviceService);
  public departments = computed(() => [...this.state.entities()]);

  editDepartment(department?: Department) {
    this.ref = this.dialog.open(DepartmentsFormComponent, {
      header: 'Area',
      width: '36rem',
      modal: true,
      dismissableMask: true, // Cerrar al hacer clic fuera
      closeOnEscape: true,   // Cerrar con tecla Escape
      data: { department },
    });
  }

  deleteDepartment(id: string) {
    this.state.deleteItem(id);
  }
}
