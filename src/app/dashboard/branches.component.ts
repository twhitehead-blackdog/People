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
import { DeviceService } from '../services/device.service';
import { BranchesStore } from '../stores/branches.store';
import { DashboardStore } from '../stores/dashboard.store';
import { BranchesFormComponent } from './branches-form.component';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'pt-branches',
  imports: [ButtonModule, CardModule, TableModule, DialogModule, TooltipModule],
  providers: [DynamicDialogRef, DialogService, BranchesStore],
  template: `
    <div class="branches-page w-full">
    @if (device.isDesktop()) {
    <p-card styleClass="branches-card">
      <ng-template #title>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
          <div>
            <h2 class="m-0 text-xl font-bold text-white">Sucursales</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Listado de sucursales/localidades activas</p>
          </div>
          <div class="flex gap-2">
            <p-button label="Nuevo" (click)="editBranch()" icon="pi pi-plus-circle" rounded class="min-h-[44px]" />
          </div>
        </div>
      </ng-template>
      <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <p-table
          [value]="branches()"
          [paginator]="true"
          [rows]="5"
          [rowsPerPageOptions]="[5, 10, 20]"
          styleClass="min-w-full p-datatable-sm"
        >
          <ng-template #header>
            <tr>
              <th pSortableColumn="name">Nombre <p-sortIcon field="name" /></th>
              <th pSortableColumn="short_name">Abrev. <p-sortIcon field="short_name" /></th>
              <th pSortableColumn="address">Dirección <p-sortIcon field="address" /></th>
              <th>IP</th>
              <th pFrozenColumn alignFrozen="right"></th>
            </tr>
          </ng-template>
          <ng-template #body let-item>
            <tr>
              <td class="font-medium text-white">{{ item.name }}</td>
              <td class="text-gray-300">{{ item.short_name }}</td>
              <td class="text-gray-300">{{ item.address }}</td>
              <td class="text-gray-300">{{ item.ip }}</td>
              <td pFrozenColumn alignFrozen="right">
                <div class="flex gap-1 sm:gap-2">
                  <p-button severity="success" icon="pi pi-pen-to-square" rounded text (onClick)="editBranch(item)" class="min-w-[44px] min-h-[44px]" pTooltip="Editar" />
                  <p-button severity="danger" icon="pi pi-trash" rounded text (onClick)="deleteBranch(item.id)" class="min-w-[44px] min-h-[44px]" pTooltip="Eliminar" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="5" class="text-center py-8 text-gray-400">No hay sucursales registradas</td></tr>
          </ng-template>
        </p-table>
      </div>
    </p-card>
    } @else {
    <div class="mobile-branches flex flex-col min-h-[60vh]">
      <div class="mobile-section-header">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="mobile-section-header__title">Sucursales</span>
          <span class="mobile-section-header__count">{{ branches().length }}</span>
        </div>
        <button class="mobile-fab" style="position:relative;bottom:auto;right:auto;width:2.75rem;height:2.75rem;" (click)="editBranch()" aria-label="Nueva sucursal">
          <i class="pi pi-plus"></i>
        </button>
      </div>
      <main class="flex-1 overflow-y-auto px-3 py-3">
        @if (branches().length === 0) {
          <div class="mobile-empty-state">
            <i class="pi pi-map-marker mobile-empty-state__icon"></i>
            <p class="mobile-empty-state__title">No hay sucursales</p>
            <p class="mobile-empty-state__desc">Agrega una desde el botón superior</p>
          </div>
        } @else {
          <div class="mobile-card-list pb-4">
            @for (item of branches(); track item.id) {
              <div class="mobile-card-item" (click)="editBranch(item)">
                <div class="mobile-card-item__body">
                  <div class="mobile-card-item__title">{{ item.name }}</div>
                  <div class="mobile-card-item__subtitle">{{ item.short_name }} @if (item.address) { · {{ item.address }} }</div>
                  @if (item.ip) {
                    <div class="mobile-card-item__meta">
                      <span class="mobile-card-item__tag mobile-card-item__tag--info">IP: {{ item.ip }}</span>
                    </div>
                  }
                </div>
                <div class="mobile-card-item__action" style="display:flex;gap:0.25rem;" (click)="$event.stopPropagation()">
                  <p-button icon="pi pi-pen-to-square" [label]="''" (onClick)="editBranch(item)" rounded text severity="success" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Editar" />
                  <p-button icon="pi pi-trash" [label]="''" (onClick)="deleteBranch(item.id)" rounded text severity="danger" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Eliminar" />
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
    :host ::ng-deep .branches-card.p-card {
      background: rgba(31, 41, 55, 0.95) !important;
      border: 1px solid rgba(75, 85, 99, 0.5) !important;
      border-radius: 0.75rem !important;
    }
    :host ::ng-deep .branches-card .p-card-body { background: transparent !important; }
    :host ::ng-deep .branches-card .p-card-title { color: #f3f4f6 !important; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchesComponent {
  readonly store = inject(DashboardStore);
  private ref!: DynamicDialogRef<any> | null;
  private dialogService = inject(DialogService);
  protected device = inject(DeviceService);
  public branches = computed(() => [...this.store.branches.entities()]);

  editBranch(branch?: Branch) {
    this.ref = this.dialogService.open<any>(BranchesFormComponent, {
      width: '36rem',
      data: { branch },
      header: 'Sucursal',
      modal: true,
      dismissableMask: true, // Cerrar al hacer clic fuera
      closeOnEscape: true,   // Cerrar con tecla Escape
    });
  }

  deleteBranch(id: string) {
    this.store.branches.deleteItem(id);
  }
}
