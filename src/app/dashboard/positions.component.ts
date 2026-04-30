import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';

import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { Position } from '../models';
import { DeviceService } from '../services/device.service';
import { DashboardStore } from '../stores/dashboard.store';
import { PositionsFormComponent } from './positions-form.component';

@Component({
  selector: 'pt-positions',
  imports: [
    TableModule,
    Card,
    Button,
    IconField,
    InputIcon,
    InputText,
    FormsModule,
    TooltipModule,
  ],
  providers: [DynamicDialogRef, DialogService],
  template: `
    <div class="positions-page w-full">
    @if (device.isDesktop()) {
    <p-card styleClass="positions-card">
      <ng-template #title>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
          <div>
            <h2 class="m-0 text-xl font-bold text-white">Cargos</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Listado de cargos y posiciones de la empresa</p>
          </div>
          <div class="flex gap-2">
            <p-button label="Nuevo" (click)="editPosition()" icon="pi pi-plus-circle" rounded class="min-h-[44px]" />
          </div>
        </div>
      </ng-template>
      <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <p-table
          #dt
          [value]="filteredPositions()"
          [paginator]="true"
          [rowsPerPageOptions]="[10, 20, 50]"
          [rows]="10"
          paginatorDropdownAppendTo="body"
          styleClass="min-w-full p-datatable-sm"
        >
          <ng-template #caption>
            <div class="flex gap-2 items-center">
              <p-iconfield iconPosition="left" class="w-full md:w-auto">
                <p-inputicon><i class="pi pi-search"></i></p-inputicon>
                <input pInputText type="text" [(ngModel)]="searchTerm" placeholder="Buscar por nombre o área..." class="w-full lg:w-auto flex-1 text-sm rounded-lg border-neutral-600 bg-neutral-800/80 px-3 py-2" />
              </p-iconfield>
            </div>
          </ng-template>
          <ng-template #header>
            <tr>
              <th pSortableColumn="name">Nombre <p-sortIcon field="name" /></th>
              <th pSortableColumn="department.name">Área <p-sortIcon field="department.name" /></th>
              <th>Admin</th>
              <th>Horarios</th>
              <th>App. horarios</th>
              <th>Vista pred.</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template #body let-item>
            <tr class="hover:bg-neutral-800/50 transition-colors">
              <td class="font-medium text-white">{{ item.name }}</td>
              <td class="text-gray-300">{{ item.department?.name }}</td>
              <td>@if(item.admin) { <i class="pi pi-check-circle text-green-400 text-xl"></i> } @else { <i class="pi pi-times-circle text-red-400 text-xl"></i> }</td>
              <td>@if(item.schedule_admin) { <i class="pi pi-check-circle text-green-400 text-xl"></i> } @else { <i class="pi pi-times-circle text-red-400 text-xl"></i> }</td>
              <td>@if(item.schedule_approver) { <i class="pi pi-check-circle text-green-400 text-xl"></i> } @else { <i class="pi pi-times-circle text-red-400 text-xl"></i> }</td>
              <td class="text-gray-300 text-sm">{{ getDefaultViewLabel(item.default_view) }}</td>
              <td>
                <div class="flex gap-1 sm:gap-2">
                  <p-button severity="success" text rounded icon="pi pi-pen-to-square" (onClick)="editPosition(item)" class="min-w-[44px] min-h-[44px]" pTooltip="Editar" />
                  <p-button severity="danger" text rounded icon="pi pi-trash" (onClick)="deletePosition(item.id)" class="min-w-[44px] min-h-[44px]" pTooltip="Eliminar" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #empty>
            <tr><td colspan="7" class="text-center py-8 text-gray-400">No hay cargos o no coinciden con la búsqueda.</td></tr>
          </ng-template>
        </p-table>
      </div>
    </p-card>
    } @else {
    <div class="mobile-positions flex flex-col min-h-[60vh]">
      <div class="mobile-section-header" style="flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="mobile-section-header__title">Cargos</span>
          <span class="mobile-section-header__count">{{ filteredPositions().length }}</span>
        </div>
        <button class="mobile-fab" style="position:relative;bottom:auto;right:auto;width:2.75rem;height:2.75rem;" (click)="editPosition()" aria-label="Nuevo cargo">
          <i class="pi pi-plus"></i>
        </button>
      </div>
      <div class="mobile-search">
        <i class="pi pi-search mobile-search__icon"></i>
        <input type="text" class="mobile-search__input" [(ngModel)]="searchTerm" placeholder="Buscar por nombre o área..." />
      </div>
      <main class="flex-1 overflow-y-auto px-3 py-3">
        @if (filteredPositions().length === 0) {
          <div class="mobile-empty-state">
            <i class="pi pi-briefcase mobile-empty-state__icon"></i>
            <p class="mobile-empty-state__title">No hay cargos</p>
            <p class="mobile-empty-state__desc">Ajusta la búsqueda o agrega uno nuevo</p>
          </div>
        } @else {
          <div class="mobile-card-list pb-4">
            @for (item of filteredPositions(); track item.id) {
              <div class="mobile-card-item" (click)="editPosition(item)">
                <div class="mobile-card-item__body">
                  <div class="mobile-card-item__title">{{ item.name }}</div>
                  <div class="mobile-card-item__subtitle">{{ item.department?.name || 'Sin área' }}</div>
                  <div class="mobile-card-item__meta">
                    <span class="mobile-card-item__tag">{{ getDefaultViewLabel(item.default_view) }}</span>
                    @if (item.admin) { <span class="mobile-card-item__tag mobile-card-item__tag--success">Admin</span> }
                    @if (item.schedule_admin) { <span class="mobile-card-item__tag mobile-card-item__tag--info">Horarios</span> }
                    @if (item.schedule_approver) { <span class="mobile-card-item__tag mobile-card-item__tag--warning">Aprobador</span> }
                  </div>
                </div>
                <div class="mobile-card-item__action" style="display:flex;gap:0.25rem;" (click)="$event.stopPropagation()">
                  <p-button icon="pi pi-pen-to-square" [label]="''" (onClick)="editPosition(item)" rounded text severity="success" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Editar" />
                  <p-button icon="pi pi-trash" [label]="''" (onClick)="deletePosition(item.id)" rounded text severity="danger" size="small" class="min-w-[44px] min-h-[44px]" pTooltip="Eliminar" />
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
    :host ::ng-deep .positions-card.p-card {
      background: rgba(31, 41, 55, 0.95) !important;
      border: 1px solid rgba(75, 85, 99, 0.5) !important;
      border-radius: 0.75rem !important;
    }
    :host ::ng-deep .positions-card .p-card-body { background: transparent !important; }
    :host ::ng-deep .positions-card .p-card-title { color: #f3f4f6 !important; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionsComponent implements OnInit {
  readonly store = inject(DashboardStore);
  private dialog = inject(DialogService);
  private ref!: DynamicDialogRef<any> | null;
  protected device = inject(DeviceService);
  public positions = computed(() => [...this.store.positions.entities()]);

  public filteredPositions = computed(() => {
    const search = this.searchTerm()?.toLowerCase().trim() || '';
    const pos = this.positions();

    if (!search) {
      return pos;
    }

    return pos.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const deptName = (p.department?.name || '').toLowerCase();
      return name.includes(search) || deptName.includes(search);
    });
  });

  public getDefaultViewLabel(value?: string): string {
    if (!value) return 'No definida';
    const options: Record<string, string> = {
      home: 'Inicio',
      admin: 'Administración',
      payroll: 'Nómina',
      'time-management': 'Gestión de tiempo',
      timeclock: 'Reloj de marcación',
      'employee-portal': 'Portal de empleado',
    };
    return options[value] || value;
  }

  public searchTerm = model<string>('');

  constructor() {
    // Sanitizar el término de búsqueda cuando cambia
    effect(() => {
      const term = this.searchTerm();
      if (term) {
        // Remover caracteres de control y limitar a 200 caracteres
        const sanitized = term
          // eslint-disable-next-line no-control-regex
          .replace(/[\x00-\x1F\x7F]/g, '')
          .substring(0, 200);
        if (sanitized !== term) {
          this.searchTerm.set(sanitized);
        }
      }
    });
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
      dismissableMask: true, // Cerrar al hacer clic fuera
      closeOnEscape: true,   // Cerrar con tecla Escape
    });
  }

  deletePosition(id: string) {
    this.store.positions.deleteItem(id);
  }
}
