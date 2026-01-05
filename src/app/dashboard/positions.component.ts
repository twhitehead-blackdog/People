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
import { Position } from '../models';
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
  ],
  providers: [DynamicDialogRef, DialogService],
  template: `
    <p-card>
      <ng-template #title>
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3"
        >
          <div>
            <h2 class="m-0 text-lg sm:text-xl">Cargos</h2>
            <p class="text-xs sm:text-sm text-gray-400 m-0 mt-1">
              Listado de cargos y posiciones de la empresa
            </p>
          </div>
          <div class="flex gap-2">
            <p-button
              label="Nuevo"
              (click)="editPosition()"
              icon="pi pi-plus-circle"
              rounded
              class="min-h-[44px]"
            />
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
          styleClass="min-w-full"
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
                  [(ngModel)]="searchTerm"
                  placeholder="Buscar"
                  class="w-full lg:w-auto flex-1 text-sm"
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
              <th>Dashboard</th>
              <th>Vista predeterminada</th>
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
              <td>
                @if(item.dashboard_access) {
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
              <td class="text-gray-300 text-sm">
                {{ getDefaultViewLabel(item.default_view) }}
              </td>
              <td>
                <div class="flex gap-1 sm:gap-2">
                  <p-button
                    severity="success"
                    text
                    rounded
                    icon="pi pi-pen-to-square"
                    (onClick)="editPosition(item)"
                    class="hover:shadow-md transition-all min-w-[44px] min-h-[44px]"
                  />
                  <p-button
                    severity="danger"
                    text
                    rounded
                    icon="pi pi-trash"
                    (onClick)="deletePosition(item.id)"
                    class="hover:shadow-md transition-all min-w-[44px] min-h-[44px]"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </p-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionsComponent implements OnInit {
  readonly store = inject(DashboardStore);

  private dialog = inject(DialogService);
  private ref = inject(DynamicDialogRef);
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
    });
  }

  deletePosition(id: string) {
    this.store.positions.deleteItem(id);
  }
}
