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
import { TooltipModule } from 'primeng/tooltip';
import { Company } from '../models';
import { DeviceService } from '../services/device.service';
import { CompaniesStore } from '../stores/companies.store';
import { CompaniesFormComponent } from './companies-form.component';

@Component({
  selector: 'pt-companies',
  imports: [Card, Button, TableModule, TooltipModule],
  providers: [DynamicDialogRef, DialogService],
  template: `
    <div class="companies-page w-full">
    @if (device.isDesktop()) {
    <p-card styleClass="companies-card">
      <ng-template #title>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
          <div>
            <h2 class="m-0 text-xl font-bold text-white">Empresas</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Listado de empresas</p>
          </div>
          <div class="flex gap-2">
            <p-button label="Nuevo" icon="pi pi-plus-circle" rounded (onClick)="editCompany()" class="min-h-[44px]" />
          </div>
        </div>
      </ng-template>
      <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <p-table
          [value]="companies()"
          [paginator]="true"
          [rows]="5"
          [rowsPerPageOptions]="[5, 10, 20]"
          styleClass="min-w-full p-datatable-sm"
        >
          <ng-template #header>
            <tr>
              <th pSortableColumn="name">Nombre <p-sortIcon field="name" /></th>
              <th pSortableColumn="phone_number">Nro. Teléfono <p-sortIcon field="phone_number" /></th>
              <th pSortableColumn="address">Dirección <p-sortIcon field="address" /></th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template #body let-item>
            <tr>
              <td class="font-medium text-white">{{ item.name }}</td>
              <td class="text-gray-300">{{ item.phone_number }}</td>
              <td class="text-gray-300">{{ item.address }}</td>
              <td>
                <div class="flex gap-1 sm:gap-2">
                  <p-button severity="success" text rounded icon="pi pi-pen-to-square" (onClick)="editCompany(item)" class="min-w-[44px] min-h-[44px]" pTooltip="Editar" />
                  <p-button severity="danger" text rounded icon="pi pi-trash" (onClick)="deleteCompany(item.id)" class="min-w-[44px] min-h-[44px]" pTooltip="Eliminar" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="4" class="text-center py-8 text-gray-400">No hay empresas registradas</td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </p-card>
    } @else {
    <div class="mobile-companies flex flex-col min-h-[60vh]">
      <header class="sticky top-0 z-20 bg-neutral-800/95 border-b border-neutral-700/50 px-3 py-3 shadow-sm">
        <div class="flex items-center justify-between gap-2 mb-2">
          <h2 class="m-0 text-lg font-bold text-white truncate">Empresas</h2>
          <p-button icon="pi pi-plus" [label]="''" (onClick)="editCompany()" rounded size="small" pTooltip="Nueva empresa" tooltipPosition="bottom" />
        </div>
        <p class="text-xs text-gray-400 m-0">Listado de empresas</p>
      </header>
      <main class="flex-1 overflow-y-auto px-3 py-3">
        @if (companies().length === 0) {
          <div class="text-center py-12 text-gray-400">
            <i class="pi pi-building text-4xl block mb-2 opacity-60"></i>
            <p class="text-sm font-medium">No hay empresas</p>
            <p class="text-xs mt-1">Agrega una desde el botón superior</p>
          </div>
        } @else {
          <div class="flex flex-col gap-2 pb-4">
            @for (item of companies(); track item.id) {
              <div (click)="editCompany(item)" class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3 active:bg-neutral-700/50 transition-colors cursor-pointer">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-white text-sm m-0">{{ item.name }}</p>
                    @if (item.phone_number) {
                      <p class="text-xs text-gray-400 m-0 mt-0.5"><i class="pi pi-phone mr-1"></i>{{ item.phone_number }}</p>
                    }
                    @if (item.address) {
                      <p class="text-xs text-gray-500 m-0 mt-0.5 truncate">{{ item.address }}</p>
                    }
                  </div>
                  <div class="flex gap-1 flex-shrink-0" (click)="$event.stopPropagation()">
                    <p-button icon="pi pi-pen" [label]="''" (onClick)="editCompany(item)" rounded text severity="success" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Editar" />
                    <p-button icon="pi pi-trash" [label]="''" (onClick)="deleteCompany(item.id)" rounded text severity="danger" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Eliminar" />
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
    :host ::ng-deep .companies-card.p-card {
      background: rgba(31, 41, 55, 0.95) !important;
      border: 1px solid rgba(75, 85, 99, 0.5) !important;
      border-radius: 0.75rem !important;
    }
    :host ::ng-deep .companies-card .p-card-body { background: transparent !important; }
    :host ::ng-deep .companies-card .p-card-title { color: #f3f4f6 !important; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesComponent {
  protected store = inject(CompaniesStore);
  private dialog = inject(DialogService);
  protected device = inject(DeviceService);
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
