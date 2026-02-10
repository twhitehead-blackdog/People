import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Tag } from 'primeng/tag';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { DeviceInventoryStore, DeviceAssignmentStore } from '../stores/device-inventory.store';
import { DeviceService } from '../services/device.service';
import { DeviceInventoryFormComponent } from './device-inventory-form.component';
import { DeviceAssignmentFormComponent } from './device-assignment-form.component';
import {
  Device,
  DeviceAssignment,
  DeviceStatus,
  DeviceType,
  DEVICE_STATUS_OPTIONS,
  DEVICE_TYPE_OPTIONS,
} from '../models';
import { AccordionModule } from 'primeng/accordion';

@Component({
  selector: 'pt-device-inventory',
  imports: [
    CommonModule,
    TableModule,
    Button,
    Card,
    TooltipModule,
    Tag,
    InputText,
    Select,
    FormsModule,
    AccordionModule,
  ],
  providers: [DynamicDialogRef, DialogService],
  template: `
    <div class="device-inventory-page w-full">
      @if (device.isDesktop()) {
      <p-card styleClass="device-inventory-card">
        <ng-template #title>
          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3"
          >
            <div>
              <h2 class="m-0 text-xl font-bold text-white">
                Inventario de Dispositivos IT
              </h2>
              <p class="text-sm text-gray-400 m-0 mt-1">
                Gestión de equipos y asignaciones a empleados
              </p>
            </div>
            <div class="flex gap-2">
              <p-button
                (click)="editDevice()"
                label="Nuevo Dispositivo"
                icon="pi pi-plus-circle"
                rounded
                class="min-h-[44px]"
              />
            </div>
          </div>
        </ng-template>

        <!-- Filtros -->
        <div class="flex flex-wrap gap-3 mb-4">
          <div class="flex-1 min-w-[200px]">
            <span class="p-input-icon-left w-full">
              <i class="pi pi-search"></i>
              <input
                type="text"
                pInputText
                [(ngModel)]="searchQuery"
                placeholder="Buscar dispositivo..."
                class="w-full"
              />
            </span>
          </div>
          <p-select
            [(ngModel)]="selectedType"
            [options]="typeFilterOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filtrar por tipo"
            styleClass="min-w-[150px]"
          />
          <p-select
            [(ngModel)]="selectedStatus"
            [options]="statusFilterOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filtrar por estado"
            styleClass="min-w-[150px]"
          />
        </div>

        <!-- Tabla de Dispositivos -->
        <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <p-table
            [value]="filteredDevices()"
            [paginator]="true"
            [rows]="10"
            [rowsPerPageOptions]="[5, 10, 20, 50]"
            styleClass="min-w-full p-datatable-sm"
            [expandedRowKeys]="expandedRows()"
            dataKey="id"
          >
            <ng-template #header>
              <tr>
                <th style="width: 3rem"></th>
                <th pSortableColumn="name">
                  Dispositivo <p-sortIcon field="name" />
                </th>
                <th pSortableColumn="device_type">
                  Tipo <p-sortIcon field="device_type" />
                </th>
                <th pSortableColumn="brand">Marca <p-sortIcon field="brand" /></th>
                <th pSortableColumn="serial_number">
                  Serie <p-sortIcon field="serial_number" />
                </th>
                <th pSortableColumn="status">
                  Estado <p-sortIcon field="status" />
                </th>
                <th>Asignado a</th>
                <th style="width: 8rem"></th>
              </tr>
            </ng-template>
            <ng-template #body let-device let-expanded="expanded">
              <tr>
                <td>
                  <p-button
                    type="button"
                    [pRowToggler]="device"
                    [text]="true"
                    [rounded]="true"
                    [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                  />
                </td>
                <td>
                  <div class="font-medium text-white">{{ device.name }}</div>
                  @if (device.model) {
                  <div class="text-xs text-gray-400">{{ device.model }}</div>
                  }
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <i [class]="getDeviceTypeIcon(device.device_type)"></i>
                    <span>{{ getDeviceTypeLabel(device.device_type) }}</span>
                  </div>
                </td>
                <td>{{ device.brand || '-' }}</td>
                <td>{{ device.serial_number || '-' }}</td>
                <td>
                  <p-tag
                    [value]="getStatusLabel(device.status)"
                    [severity]="getStatusSeverity(device.status)"
                  />
                </td>
                <td>
                  @if (getCurrentAssignment(device.id); as assignment) {
                  <div class="flex items-center gap-2">
                    <i class="pi pi-user text-primary"></i>
                    <span class="text-sm">
                      {{ assignment.employee?.first_name }}
                      {{ assignment.employee?.father_name }}
                    </span>
                    @if (assignment.employee_confirmed) {
                    <i
                      class="pi pi-check-circle text-green-500"
                      pTooltip="Confirmado por el empleado"
                    ></i>
                    } @else {
                    <i
                      class="pi pi-clock text-yellow-500"
                      pTooltip="Pendiente de confirmación"
                    ></i>
                    }
                  </div>
                  } @else {
                  <span class="text-gray-400 text-sm">No asignado</span>
                  }
                </td>
                <td>
                  <div class="flex gap-1">
                    @if (device.status === 'available') {
                    <p-button
                      severity="success"
                      text
                      rounded
                      icon="pi pi-user-plus"
                      (onClick)="assignDevice(device)"
                      class="min-w-[44px] min-h-[44px]"
                      pTooltip="Asignar a empleado"
                    />
                    } @else if (getCurrentAssignment(device.id); as assignment) {
                    <p-button
                      severity="warn"
                      text
                      rounded
                      icon="pi pi-undo"
                      (onClick)="returnDevice(assignment)"
                      class="min-w-[44px] min-h-[44px]"
                      pTooltip="Devolver dispositivo"
                    />
                    }
                    <p-button
                      severity="success"
                      text
                      rounded
                      icon="pi pi-pen-to-square"
                      (onClick)="editDevice(device)"
                      class="min-w-[44px] min-h-[44px]"
                      pTooltip="Editar"
                    />
                    <p-button
                      severity="danger"
                      text
                      rounded
                      icon="pi pi-trash"
                      (onClick)="deleteDevice(device.id)"
                      class="min-w-[44px] min-h-[44px]"
                      pTooltip="Eliminar"
                    />
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template #expandedrow let-device>
              <tr>
                <td colspan="8">
                  <div class="p-4 bg-neutral-800/50 rounded-lg m-2">
                    <h4 class="text-white font-medium mb-3">
                      Historial de Asignaciones
                    </h4>
                    @if (getDeviceAssignments(device.id).length > 0) {
                    <p-table
                      [value]="getDeviceAssignments(device.id)"
                      styleClass="p-datatable-sm"
                    >
                      <ng-template #header>
                        <tr>
                          <th>Empleado</th>
                          <th>Fecha de Entrega</th>
                          <th>Fecha de Devolución</th>
                          <th>Estado</th>
                          <th>Confirmado</th>
                          <th>Accesorios</th>
                        </tr>
                      </ng-template>
                      <ng-template #body let-assignment>
                        <tr>
                          <td>
                            {{ assignment.employee?.first_name }}
                            {{ assignment.employee?.father_name }}
                          </td>
                          <td>{{ formatDate(assignment.assigned_date) }}</td>
                          <td>
                            {{ assignment.return_date ? formatDate(assignment.return_date) : '-' }}
                          </td>
                          <td>
                            <p-tag
                              [value]="getAssignmentStatusLabel(assignment.status)"
                              [severity]="getAssignmentStatusSeverity(assignment.status)"
                              styleClass="text-xs"
                            />
                          </td>
                          <td>
                            @if (assignment.employee_confirmed) {
                            <div class="flex items-center gap-2">
                              <i class="pi pi-check-circle text-green-500"></i>
                              <span class="text-xs text-gray-400">
                                {{ formatDate(assignment.employee_confirmed_at) }}
                              </span>
                            </div>
                            } @else {
                            <span class="text-gray-400">Pendiente</span>
                            }
                          </td>
                          <td>{{ assignment.accessories_included || '-' }}</td>
                        </tr>
                      </ng-template>
                    </p-table>
                    } @else {
                    <p class="text-gray-400 text-center py-4">
                      No hay historial de asignaciones para este dispositivo
                    </p>
                    }
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td colspan="8" class="text-center py-8 text-gray-400">
                  No hay dispositivos registrados
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </p-card>
      } @else {
      <!-- Vista Móvil -->
      <div class="mobile-device-inventory flex flex-col min-h-[60vh]">
        <header
          class="sticky top-0 z-20 bg-neutral-800/95 border-b border-neutral-700/50 px-3 py-3 shadow-sm"
        >
          <div class="flex items-center justify-between gap-2 mb-2">
            <h2 class="m-0 text-lg font-bold text-white truncate">
              Inventario IT
            </h2>
            <p-button
              icon="pi pi-plus"
              [label]="''"
              (click)="editDevice()"
              rounded
              size="small"
              pTooltip="Nuevo dispositivo"
              tooltipPosition="bottom"
            />
          </div>
          <p class="text-xs text-gray-400 m-0">
            Gestión de equipos y asignaciones
          </p>
        </header>

        <main class="flex-1 overflow-y-auto px-3 py-3">
          <!-- Búsqueda móvil -->
          <div class="mb-3">
            <span class="p-input-icon-left w-full">
              <i class="pi pi-search"></i>
              <input
                type="text"
                pInputText
                [(ngModel)]="searchQuery"
                placeholder="Buscar dispositivo..."
                class="w-full"
              />
            </span>
          </div>

          <!-- Lista de dispositivos móvil -->
          @if (filteredDevices().length === 0) {
          <div class="text-center py-12 text-gray-400">
            <i class="pi pi-desktop text-4xl block mb-2 opacity-60"></i>
            <p class="text-sm font-medium">No hay dispositivos</p>
            <p class="text-xs mt-1">Agrega uno desde el botón superior</p>
          </div>
          } @else {
          <div class="flex flex-col gap-2 pb-4">
            @for (device of filteredDevices(); track device.id) {
            <div
              class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3"
            >
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <i [class]="getDeviceTypeIcon(device.device_type)"></i>
                    <p class="font-semibold text-white text-sm m-0 truncate">
                      {{ device.name }}
                    </p>
                  </div>
                  @if (device.brand || device.model) {
                  <p class="text-xs text-gray-400 m-0 mt-1">
                    {{ device.brand }} {{ device.model }}
                  </p>
                  }
                </div>
                <p-tag
                  [value]="getStatusLabel(device.status)"
                  [severity]="getStatusSeverity(device.status)"
                  styleClass="text-xs"
                />
              </div>

              <!-- Info de asignación -->
              @if (getCurrentAssignment(device.id); as assignment) {
              <div
                class="flex items-center gap-2 p-2 bg-neutral-700/30 rounded mb-2"
              >
                <i class="pi pi-user text-primary text-sm"></i>
                <span class="text-sm truncate flex-1">
                  {{ assignment.employee?.first_name }}
                  {{ assignment.employee?.father_name }}
                </span>
                @if (assignment.employee_confirmed) {
                <i
                  class="pi pi-check-circle text-green-500 text-sm"
                  pTooltip="Confirmado"
                ></i>
                } @else {
                <i
                  class="pi pi-clock text-yellow-500 text-sm"
                  pTooltip="Pendiente"
                ></i>
                }
              </div>
              } @else {
              <div
                class="flex items-center gap-2 p-2 bg-neutral-700/30 rounded mb-2"
              >
                <i class="pi pi-check-circle text-green-500 text-sm"></i>
                <span class="text-sm text-gray-400">Disponible</span>
              </div>
              }

              <!-- Acciones -->
              <div class="flex gap-1 justify-end">
                @if (device.status === 'available') {
                <p-button
                  icon="pi pi-user-plus"
                  [label]="'Asignar'"
                  (onClick)="assignDevice(device)"
                  rounded
                  text
                  severity="success"
                  size="small"
                  class="min-w-[44px] min-h-[44px]"
                />
                } @else if (getCurrentAssignment(device.id); as assignment) {
                <p-button
                  icon="pi pi-undo"
                  [label]="'Devolver'"
                  (onClick)="returnDevice(assignment)"
                  rounded
                  text
                  severity="warn"
                  size="small"
                  class="min-w-[44px] min-h-[44px]"
                />
                }
                <p-button
                  icon="pi pi-pen"
                  [label]="''"
                  (onClick)="editDevice(device)"
                  rounded
                  text
                  severity="success"
                  size="small"
                  class="min-w-[44px] min-h-[44px]"
                  pTooltip="Editar"
                />
                <p-button
                  icon="pi pi-trash"
                  [label]="''"
                  (onClick)="deleteDevice(device.id)"
                  rounded
                  text
                  severity="danger"
                  size="small"
                  class="min-w-[44px] min-h-[44px]"
                  pTooltip="Eliminar"
                />
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
    :host ::ng-deep .device-inventory-card.p-card {
      background: rgba(31, 41, 55, 0.95) !important;
      border: 1px solid rgba(75, 85, 99, 0.5) !important;
      border-radius: 0.75rem !important;
    }
    :host ::ng-deep .device-inventory-card .p-card-body { background: transparent !important; }
    :host ::ng-deep .device-inventory-card .p-card-title { color: #f3f4f6 !important; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceInventoryComponent {
  readonly deviceStore = inject(DeviceInventoryStore);
  readonly assignmentStore = inject(DeviceAssignmentStore);
  protected device = inject(DeviceService);
  private ref = inject(DynamicDialogRef);
  private dialog = inject(DialogService);

  searchQuery = signal('');
  selectedType = signal<DeviceType | null>(null);
  selectedStatus = signal<DeviceStatus | null>(null);
  expandedRows = signal<Record<string, boolean>>({});

  deviceTypeOptions = DEVICE_TYPE_OPTIONS;
  deviceStatusOptions = DEVICE_STATUS_OPTIONS;

  typeFilterOptions = [
    { label: 'Todos los tipos', value: null },
    ...DEVICE_TYPE_OPTIONS,
  ];

  statusFilterOptions = [
    { label: 'Todos los estados', value: null },
    ...DEVICE_STATUS_OPTIONS,
  ];

  devices = computed(() => [...this.deviceStore.entities()]);
  assignments = computed(() => [...this.assignmentStore.entities()]);

  filteredDevices = computed(() => {
    let result = this.devices();
    const query = this.searchQuery().toLowerCase().trim();

    if (query) {
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          (d.brand?.toLowerCase() || '').includes(query) ||
          (d.model?.toLowerCase() || '').includes(query) ||
          (d.serial_number?.toLowerCase() || '').includes(query)
      );
    }

    const type = this.selectedType();
    if (type) {
      result = result.filter((d) => d.device_type === type);
    }

    const status = this.selectedStatus();
    if (status) {
      result = result.filter((d) => d.status === status);
    }

    return result;
  });

  getCurrentAssignment(deviceId: string): DeviceAssignment | undefined {
    return this.assignments().find(
      (a) => a.device_id === deviceId && a.status === 'active'
    );
  }

  getDeviceAssignments(deviceId: string): DeviceAssignment[] {
    return this.assignments()
      .filter((a) => a.device_id === deviceId)
      .sort(
        (a, b) =>
          new Date(b.assigned_date).getTime() -
          new Date(a.assigned_date).getTime()
      );
  }

  getDeviceTypeLabel(type: DeviceType): string {
    const option = DEVICE_TYPE_OPTIONS.find((o) => o.value === type);
    return option?.label || type;
  }

  getDeviceTypeIcon(type: DeviceType): string {
    const option = DEVICE_TYPE_OPTIONS.find((o) => o.value === type);
    return option?.icon || 'pi pi-desktop';
  }

  getStatusLabel(status: DeviceStatus): string {
    const option = DEVICE_STATUS_OPTIONS.find((o) => o.value === status);
    return option?.label || status;
  }

  getStatusSeverity(status: DeviceStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    const severities: Record<DeviceStatus, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      available: 'success',
      assigned: 'info',
      maintenance: 'warn',
      retired: 'secondary',
    };
    return severities[status] || 'secondary';
  }

  getAssignmentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Activo',
      returned: 'Devuelto',
      lost: 'Perdido',
      damaged: 'Dañado',
    };
    return labels[status] || status;
  }

  getAssignmentStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    const severities: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      active: 'success',
      returned: 'secondary',
      lost: 'danger',
      damaged: 'warn',
    };
    return severities[status] || 'secondary';
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  editDevice(device?: Device) {
    this.ref = this.dialog.open(DeviceInventoryFormComponent, {
      header: device ? 'Editar Dispositivo' : 'Nuevo Dispositivo',
      width: '40rem',
      modal: true,
      dismissableMask: true,
      closeOnEscape: true,
      data: { device },
    });

    this.ref.onClose.subscribe((result) => {
      if (result) {
        this.deviceStore.reloadItems();
      }
    });
  }

  deleteDevice(id: string) {
    this.deviceStore.deleteItem(id);
  }

  assignDevice(device: Device) {
    this.ref = this.dialog.open(DeviceAssignmentFormComponent, {
      header: `Asignar: ${device.name}`,
      width: '40rem',
      modal: true,
      dismissableMask: true,
      closeOnEscape: true,
      data: { deviceId: device.id },
    });

    this.ref.onClose.subscribe((result) => {
      if (result) {
        this.deviceStore.reloadItems();
        this.assignmentStore.reloadItems();
      }
    });
  }

  returnDevice(assignment: DeviceAssignment) {
    this.ref = this.dialog.open(DeviceAssignmentFormComponent, {
      header: 'Devolver Dispositivo',
      width: '40rem',
      modal: true,
      dismissableMask: true,
      closeOnEscape: true,
      data: {
        deviceId: assignment.device_id,
        assignment: {
          ...assignment,
          status: 'returned',
          return_date: new Date(),
        },
      },
    });

    this.ref.onClose.subscribe((result) => {
      if (result) {
        this.deviceStore.reloadItems();
        this.assignmentStore.reloadItems();
      }
    });
  }
}
