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
      <div class="mobile-section-header">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="mobile-section-header__title">Empresas</span>
          <span class="mobile-section-header__count">{{ companies().length }}</span>
        </div>
        <button class="mobile-fab" style="position:relative;bottom:auto;right:auto;width:2.75rem;height:2.75rem;" (click)="editCompany()" aria-label="Nueva empresa">
          <i class="pi pi-plus"></i>
        </button>
      </div>
      <main class="flex-1 overflow-y-auto px-3 py-3">
        @if (companies().length === 0) {
          <div class="mobile-empty-state">
            <i class="pi pi-building mobile-empty-state__icon"></i>
            <p class="mobile-empty-state__title">No hay empresas</p>
            <p class="mobile-empty-state__desc">Agrega una desde el botón superior</p>
          </div>
        } @else {
          <div class="mobile-card-list pb-4">
            @for (item of companies(); track item.id) {
              <div class="mobile-card-item" (click)="editCompany(item)">
                <div class="mobile-card-item__body">
                  <div class="mobile-card-item__title">{{ item.name }}</div>
                  @if (item.phone_number) {
                    <div class="mobile-card-item__subtitle"><i class="pi pi-phone" style="margin-right:0.25rem;font-size:0.625rem;"></i>{{ item.phone_number }}</div>
                  }
                  @if (item.address) {
                    <div class="mobile-card-item__meta">
                      <span class="mobile-card-item__tag">{{ item.address }}</span>
                    </div>
                  }
                </div>
                <div class="mobile-card-item__action" style="display:flex;gap:0.25rem;" (click)="$event.stopPropagation()">
                  <p-button icon="pi pi-pen-to-square" [label]="''" (onClick)="editCompany(item)" rounded text severity="success" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Editar" />
                  <p-button icon="pi pi-trash" [label]="''" (onClick)="deleteCompany(item.id)" rounded text severity="danger" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Eliminar" />
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
      dismissableMask: true, // Cerrar al hacer clic fuera
      closeOnEscape: true,   // Cerrar con tecla Escape
    });
  }

  deleteCompany(id: string) {
    this.store.deleteItem(id);
  }
}
