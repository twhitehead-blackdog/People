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
      <header class="sticky top-0 z-20 bg-neutral-800/95 border-b border-neutral-700/50 px-3 py-3 shadow-sm">
        <div class="flex items-center justify-between gap-2 mb-2">
          <h2 class="m-0 text-lg font-bold text-white truncate">Áreas</h2>
          <p-button icon="pi pi-plus" [label]="''" (click)="editDepartment()" rounded size="small" pTooltip="Nueva área" tooltipPosition="bottom" />
        </div>
        <p class="text-xs text-gray-400 m-0">Listado de áreas/departamentos</p>
      </header>
      <main class="flex-1 overflow-y-auto px-3 py-3">
        @if (departments().length === 0) {
          <div class="text-center py-12 text-gray-400">
            <i class="pi pi-sitemap text-4xl block mb-2 opacity-60"></i>
            <p class="text-sm font-medium">No hay áreas</p>
            <p class="text-xs mt-1">Agrega una desde el botón superior</p>
          </div>
        } @else {
          <div class="flex flex-col gap-2 pb-4">
            @for (item of departments(); track item.id) {
              <div (click)="editDepartment(item)" class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3 active:bg-neutral-700/50 transition-colors cursor-pointer">
                <div class="flex items-center justify-between gap-2">
                  <p class="font-semibold text-white text-sm m-0">{{ item.name }}</p>
                  <div class="flex gap-1 flex-shrink-0" (click)="$event.stopPropagation()">
                    <p-button icon="pi pi-pen" [label]="''" (onClick)="editDepartment(item)" rounded text severity="success" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Editar" />
                    <p-button icon="pi pi-trash" [label]="''" (onClick)="deleteDepartment(item.id)" rounded text severity="danger" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Eliminar" />
                  </div>
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
