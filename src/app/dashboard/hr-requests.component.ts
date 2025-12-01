import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { DatePipe } from '@angular/common';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FormsModule } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';

interface Disability {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    mother_name: string;
    work_email: string;
    position?: { name: string };
    branch?: { name: string };
  };
  start_date: string;
  end_date: string;
  description: string | null;
  document_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface TimeOff {
  id: string;
  employee_id: string;
  type_id: string;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    mother_name: string;
    work_email: string;
    position?: { name: string };
    branch?: { name: string };
  };
  type?: {
    id: string;
    name: string;
  };
  date_from: string;
  date_to: string;
  notes: string[] | null;
  is_approved: boolean;
  created_at: string;
  document_url?: string | null;
}

type RequestType = 'disabilities' | 'compensatory' | 'vacations';

@Component({
  selector: 'pt-hr-requests',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    CardModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
    TabsModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white m-0">Gestión de Solicitudes RRHH</h2>
          <p class="text-sm text-gray-400 m-0 mt-1">
            Gestiona incapacidades, compensatorios y vacaciones
          </p>
        </div>
        <div class="flex items-center gap-3">
          <p-button
            icon="pi pi-refresh"
            label="Actualizar"
            [outlined]="true"
            severity="secondary"
            (onClick)="reloadData()"
            [loading]="isLoading()"
          />
        </div>
      </div>

      <!-- Selector de Tipo -->
      <p-card class="bg-neutral-800 border-neutral-700">
        <div class="flex items-center gap-4">
          <label class="text-sm font-medium text-gray-300">Tipo de Solicitud:</label>
          <p-dropdown
            [options]="requestTypeOptions"
            [(ngModel)]="selectedRequestType"
            (onChange)="onRequestTypeChange()"
            optionLabel="label"
            optionValue="value"
            class="w-64"
          />
        </div>
      </p-card>

      <!-- Estadísticas -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Total</p>
              <p class="text-2xl font-bold text-white m-0 mt-1">{{ totalCount() }}</p>
            </div>
            <i class="pi pi-file text-3xl text-gray-500"></i>
          </div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Pendientes</p>
              <p class="text-2xl font-bold text-yellow-400 m-0 mt-1">{{ pendingCount() }}</p>
            </div>
            <i class="pi pi-clock text-3xl text-yellow-500"></i>
          </div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Aprobadas</p>
              <p class="text-2xl font-bold text-green-400 m-0 mt-1">{{ approvedCount() }}</p>
            </div>
            <i class="pi pi-check-circle text-3xl text-green-500"></i>
          </div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Rechazadas</p>
              <p class="text-2xl font-bold text-red-400 m-0 mt-1">{{ rejectedCount() }}</p>
            </div>
            <i class="pi pi-times-circle text-3xl text-red-500"></i>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <p-card class="bg-neutral-800 border-neutral-700">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Buscar</label>
            <input
              type="text"
              pInputText
              placeholder="Empleado, descripción..."
              [(ngModel)]="searchText"
              (input)="onFilterChange()"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Estado</label>
            <p-dropdown
              [options]="statusOptions"
              [(ngModel)]="selectedStatus"
              (onChange)="onFilterChange()"
              placeholder="Todos los estados"
              [showClear]="true"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Fecha Inicio</label>
            <p-calendar
              [(ngModel)]="dateRange"
              selectionMode="range"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="Rango de fechas"
              (onSelect)="onFilterChange()"
              [showClear]="true"
              class="w-full"
            />
          </div>
          <div class="flex items-end">
            <p-button
              label="Limpiar Filtros"
              icon="pi pi-filter-slash"
              [outlined]="true"
              severity="secondary"
              (onClick)="clearFilters()"
              class="w-full"
            />
          </div>
        </div>
      </p-card>

      <!-- Tabla -->
      <p-card class="bg-neutral-800 border-neutral-700">
        @if (isLoading()) {
          <div class="flex justify-center items-center py-12">
            <p-progressSpinner />
          </div>
        } @else {
          <!-- Tabla de Incapacidades -->
          @if (selectedRequestType() === 'disabilities') {
            <p-table
              [value]="filteredDisabilities()"
              [paginator]="true"
              [rows]="10"
              [rowsPerPageOptions]="[10, 25, 50]"
              [globalFilterFields]="['employee.first_name', 'employee.father_name', 'employee.work_email', 'description']"
              styleClass="p-datatable-striped"
              [tableStyle]="{ 'min-width': '50rem' }"
            >
              <ng-template #emptymessage>
                <tr>
                  <td colspan="8" class="text-center py-4">No se encontraron incapacidades</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 200px" class="text-center">Empleado</th>
                  <th style="width: 120px" class="text-center">Fecha Inicio</th>
                  <th style="width: 120px" class="text-center">Fecha Fin</th>
                  <th style="width: 100px" class="text-center">Días</th>
                  <th class="text-center">Descripción</th>
                  <th style="width: 120px" class="text-center">Estado</th>
                  <th style="width: 100px" class="text-center">Documento</th>
                  <th style="width: 200px" class="text-center">Acciones</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-disability>
                <tr>
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium text-white">
                        {{ disability.employee?.first_name }} {{ disability.employee?.father_name }}
                      </span>
                      <span class="text-xs text-gray-400">
                        {{ disability.employee?.work_email }}
                      </span>
                      @if (disability.employee?.position?.name) {
                        <span class="text-xs text-gray-500">
                          {{ disability.employee.position.name }}
                        </span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{ disability.start_date | date : 'dd/MM/yyyy' }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{ disability.end_date | date : 'dd/MM/yyyy' }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm font-medium text-white">
                      {{ calculateDays(disability.start_date, disability.end_date) }} días
                    </span>
                  </td>
                  <td>
                    @if (disability.description) {
                      <span
                        class="text-sm text-gray-300 cursor-help"
                        [pTooltip]="disability.description"
                        tooltipPosition="top"
                        [style.max-width.px]="200"
                        [style.display]="'inline-block'"
                        [style.overflow]="'hidden'"
                        [style.text-overflow]="'ellipsis'"
                        [style.white-space]="'nowrap'"
                      >
                        {{ disability.description }}
                      </span>
                    } @else {
                      <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td>
                    <p-tag
                      [value]="getStatusLabel(disability.status)"
                      [severity]="getStatusSeverity(disability.status)"
                    />
                  </td>
                  <td>
                    @if (disability.document_url) {
                      <p-button
                        icon="pi pi-download"
                        [text]="true"
                        severity="secondary"
                        (onClick)="downloadDocument(disability.document_url!)"
                        pTooltip="Descargar documento"
                        tooltipPosition="top"
                      />
                    } @else {
                      <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td>
                    <div class="flex gap-2">
                      @if (disability.status === 'pending') {
                        <p-button
                          icon="pi pi-check"
                          [text]="true"
                          severity="success"
                          (onClick)="approveDisability(disability)"
                          pTooltip="Aprobar"
                          tooltipPosition="top"
                        />
                        <p-button
                          icon="pi pi-times"
                          [text]="true"
                          severity="danger"
                          (onClick)="rejectDisability(disability)"
                          pTooltip="Rechazar"
                          tooltipPosition="top"
                        />
                      }
                      <p-button
                        icon="pi pi-eye"
                        [text]="true"
                        severity="info"
                        (onClick)="viewDisabilityDetails(disability)"
                        pTooltip="Ver detalles"
                        tooltipPosition="top"
                      />
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }

          <!-- Tabla de Compensatorios y Vacaciones -->
          @if (selectedRequestType() === 'compensatory' || selectedRequestType() === 'vacations') {
            <p-table
              [value]="filteredTimeOffs()"
              [paginator]="true"
              [rows]="10"
              [rowsPerPageOptions]="[10, 25, 50]"
              [globalFilterFields]="['employee.first_name', 'employee.father_name', 'employee.work_email', 'type.name']"
              styleClass="p-datatable-striped"
              [tableStyle]="{ 'min-width': '50rem' }"
            >
              <ng-template #emptymessage>
                <tr>
                  <td colspan="8" class="text-center py-4">
                    No se encontraron {{ selectedRequestType() === 'compensatory' ? 'compensatorios' : 'vacaciones' }}
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 200px" class="text-center">Empleado</th>
                  <th style="width: 150px" class="text-center">Tipo</th>
                  <th style="width: 120px" class="text-center">Fecha Inicio</th>
                  <th style="width: 120px" class="text-center">Fecha Fin</th>
                  <th style="width: 100px" class="text-center">Días</th>
                  <th style="width: 120px" class="text-center">Estado</th>
                  <th style="width: 100px" class="text-center">Documento</th>
                  <th style="width: 200px" class="text-center">Acciones</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-timeoff>
                <tr>
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium text-white">
                        {{ timeoff.employee?.first_name }} {{ timeoff.employee?.father_name }}
                      </span>
                      <span class="text-xs text-gray-400">
                        {{ timeoff.employee?.work_email }}
                      </span>
                      @if (timeoff.employee?.position?.name) {
                        <span class="text-xs text-gray-500">
                          {{ timeoff.employee.position.name }}
                        </span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{ timeoff.type?.name || '-' }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{ timeoff.date_from | date : 'dd/MM/yyyy' }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{ timeoff.date_to | date : 'dd/MM/yyyy' }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm font-medium text-white">
                      {{ calculateDays(timeoff.date_from, timeoff.date_to) }} días
                    </span>
                  </td>
                  <td>
                    <p-tag
                      [value]="timeoff.is_approved ? 'Aprobado' : 'Pendiente'"
                      [severity]="timeoff.is_approved ? 'success' : 'warn'"
                    />
                  </td>
                  <td>
                    @if (timeoff.document_url) {
                      <p-button
                        icon="pi pi-download"
                        [text]="true"
                        severity="secondary"
                        (onClick)="downloadDocument(timeoff.document_url!)"
                        pTooltip="Descargar documento"
                        tooltipPosition="top"
                      />
                    } @else {
                      <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td>
                    <div class="flex gap-2">
                      @if (!timeoff.is_approved) {
                        <p-button
                          icon="pi pi-check"
                          [text]="true"
                          severity="success"
                          (onClick)="approveTimeOff(timeoff)"
                          pTooltip="Aprobar"
                          tooltipPosition="top"
                        />
                        <p-button
                          icon="pi pi-times"
                          [text]="true"
                          severity="danger"
                          (onClick)="rejectTimeOff(timeoff)"
                          pTooltip="Rechazar"
                          tooltipPosition="top"
                        />
                      }
                      <p-button
                        icon="pi pi-eye"
                        [text]="true"
                        severity="info"
                        (onClick)="viewTimeOffDetails(timeoff)"
                        pTooltip="Ver detalles"
                        tooltipPosition="top"
                      />
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }
        }
      </p-card>
    </div>

    <!-- Dialog de Detalles de Incapacidad -->
    <p-dialog
      [(visible)]="showDisabilityDetailsDialog"
      [modal]="true"
      [style]="{ width: '600px' }"
      [header]="'Detalles de Incapacidad'"
      [draggable]="false"
      [resizable]="false"
    >
      @if (selectedDisability()) {
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Empleado</label>
            <p class="text-white">
              {{ selectedDisability()!.employee?.first_name }}
              {{ selectedDisability()!.employee?.father_name }}
              {{ selectedDisability()!.employee?.mother_name }}
            </p>
            <p class="text-sm text-gray-400">
              {{ selectedDisability()!.employee?.work_email }}
            </p>
            @if (selectedDisability()!.employee?.position?.name) {
              <p class="text-sm text-gray-500">
                {{ selectedDisability()!.employee?.position?.name }}
              </p>
            }
            @if (selectedDisability()!.employee?.branch?.name) {
              <p class="text-sm text-gray-500">
                Sucursal: {{ selectedDisability()!.employee?.branch?.name }}
              </p>
            }
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Fecha Inicio</label>
              <p class="text-white">
                {{ selectedDisability()!.start_date | date : 'dd/MM/yyyy' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Fecha Fin</label>
              <p class="text-white">
                {{ selectedDisability()!.end_date | date : 'dd/MM/yyyy' }}
              </p>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Duración</label>
            <p class="text-white">
              {{ calculateDays(selectedDisability()!.start_date, selectedDisability()!.end_date) }} días
            </p>
          </div>
          @if (selectedDisability()!.description) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
              <p class="text-white whitespace-pre-wrap">{{ selectedDisability()!.description }}</p>
            </div>
          }
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Estado</label>
            <p-tag
              [value]="getStatusLabel(selectedDisability()!.status)"
              [severity]="getStatusSeverity(selectedDisability()!.status)"
            />
          </div>
          @if (selectedDisability()!.document_url) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Documento</label>
              <p-button
                icon="pi pi-download"
                label="Descargar Documento"
                (onClick)="downloadDocument(selectedDisability()!.document_url!)"
                class="w-full"
              />
            </div>
          }
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Fecha de Creación</label>
            <p class="text-white">
              {{ selectedDisability()!.created_at | date : 'dd/MM/yyyy HH:mm' }}
            </p>
          </div>
        </div>
      }
    </p-dialog>

    <!-- Dialog de Detalles de TimeOff -->
    <p-dialog
      [(visible)]="showTimeOffDetailsDialog"
      [modal]="true"
      [style]="{ width: '600px' }"
      [header]="'Detalles de ' + (selectedRequestType() === 'compensatory' ? 'Compensatorio' : 'Vacaciones')"
      [draggable]="false"
      [resizable]="false"
    >
      @if (selectedTimeOff()) {
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Empleado</label>
            <p class="text-white">
              {{ selectedTimeOff()!.employee?.first_name }}
              {{ selectedTimeOff()!.employee?.father_name }}
              {{ selectedTimeOff()!.employee?.mother_name }}
            </p>
            <p class="text-sm text-gray-400">
              {{ selectedTimeOff()!.employee?.work_email }}
            </p>
            @if (selectedTimeOff()!.employee?.position?.name) {
              <p class="text-sm text-gray-500">
                {{ selectedTimeOff()!.employee?.position?.name }}
              </p>
            }
            @if (selectedTimeOff()!.employee?.branch?.name) {
              <p class="text-sm text-gray-500">
                Sucursal: {{ selectedTimeOff()!.employee?.branch?.name }}
              </p>
            }
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Tipo</label>
            <p class="text-white">{{ selectedTimeOff()!.type?.name || '-' }}</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Fecha Inicio</label>
              <p class="text-white">
                {{ selectedTimeOff()!.date_from | date : 'dd/MM/yyyy' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Fecha Fin</label>
              <p class="text-white">
                {{ selectedTimeOff()!.date_to | date : 'dd/MM/yyyy' }}
              </p>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Duración</label>
            <p class="text-white">
              {{ calculateDays(selectedTimeOff()!.date_from, selectedTimeOff()!.date_to) }} días
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Estado</label>
            <p-tag
              [value]="selectedTimeOff()!.is_approved ? 'Aprobado' : 'Pendiente'"
              [severity]="selectedTimeOff()!.is_approved ? 'success' : 'warn'"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Fecha de Creación</label>
            <p class="text-white">
              {{ selectedTimeOff()!.created_at | date : 'dd/MM/yyyy HH:mm' }}
            </p>
          </div>
        </div>
      }
    </p-dialog>
  `,
  styles: `
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: #1f2937 !important;
      color: #e5e7eb !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background: #111827 !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
      background: #1f2937 !important;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      border-color: #374151 !important;
      color: #e5e7eb !important;
    }

    ::ng-deep .p-card {
      background: #1f2937 !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-card .p-card-body {
      padding: 1.5rem !important;
    }

    ::ng-deep .p-dialog {
      background: #1f2937 !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-dialog .p-dialog-header {
      background: #111827 !important;
      border-bottom-color: #374151 !important;
      color: #e5e7eb !important;
    }

    ::ng-deep .p-dialog .p-dialog-content {
      background: #1f2937 !important;
      color: #e5e7eb !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HRRequestsComponent {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // IDs de tipos de timeoff
  private readonly VACATION_TYPE_ID = 'e7e63bb4-ca86-4091-85fa-c4da16545b49';
  private readonly COMPENSATORY_TYPE_ID = 'f2d92995-96a0-414f-b64a-9823db776745';

  // Tipo de solicitud seleccionado
  public selectedRequestType = signal<RequestType>('disabilities');

  // Opciones de tipo de solicitud
  public requestTypeOptions = [
    { label: 'Incapacidades', value: 'disabilities' },
    { label: 'Compensatorios', value: 'compensatory' },
    { label: 'Vacaciones', value: 'vacations' },
  ];

  // API para obtener incapacidades
  public disabilitiesApi = httpResource<Disability[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_disabilities`,
    method: 'GET',
    params: {
      select: '*,employee:employees(id,first_name,father_name,mother_name,work_email,position:positions(name),branch:branches(name))',
      order: 'created_at.desc',
    },
  }));

  // API para obtener timeoffs
  public timeoffsApi = httpResource<TimeOff[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`,
    method: 'GET',
    params: {
      select: '*,employee:employees(id,first_name,father_name,mother_name,work_email,position:positions(name),branch:branches(name)),type:timeoff_types(id,name)',
      order: 'created_at.desc',
    },
  }));

  // Filtros
  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  // Dialogs
  public showDisabilityDetailsDialog = signal(false);
  public selectedDisability = signal<Disability | null>(null);
  public showTimeOffDetailsDialog = signal(false);
  public selectedTimeOff = signal<TimeOff | null>(null);

  // Opciones de estado
  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  // Computed para isLoading
  public isLoading = computed(() => 
    this.disabilitiesApi.isLoading() || this.timeoffsApi.isLoading()
  );

  // Computed para obtener timeoffs filtrados por tipo
  public compensatoryTimeOffs = computed(() => {
    const timeoffs = this.timeoffsApi.value() || [];
    return timeoffs.filter(t => t.type_id === this.COMPENSATORY_TYPE_ID);
  });

  public vacationTimeOffs = computed(() => {
    const timeoffs = this.timeoffsApi.value() || [];
    return timeoffs.filter(t => t.type_id === this.VACATION_TYPE_ID);
  });

  // Computed para obtener datos según el tipo seleccionado
  public currentData = computed(() => {
    const type = this.selectedRequestType();
    if (type === 'disabilities') {
      return this.disabilitiesApi.value() || [];
    } else if (type === 'compensatory') {
      return this.compensatoryTimeOffs();
    } else {
      return this.vacationTimeOffs();
    }
  });

  // Estadísticas
  public totalCount = computed(() => this.currentData().length);
  
  public pendingCount = computed(() => {
    const data = this.currentData();
    if (this.selectedRequestType() === 'disabilities') {
      return (data as Disability[]).filter((d) => d.status === 'pending').length;
    } else {
      return (data as TimeOff[]).filter((t) => !t.is_approved).length;
    }
  });

  public approvedCount = computed(() => {
    const data = this.currentData();
    if (this.selectedRequestType() === 'disabilities') {
      return (data as Disability[]).filter((d) => d.status === 'approved').length;
    } else {
      return (data as TimeOff[]).filter((t) => t.is_approved).length;
    }
  });

  public rejectedCount = computed(() => {
    const data = this.currentData();
    if (this.selectedRequestType() === 'disabilities') {
      return (data as Disability[]).filter((d) => d.status === 'rejected').length;
    } else {
      return 0; // TimeOffs no tienen estado "rejected", solo approved/pending
    }
  });

  // Incapacidades filtradas
  public filteredDisabilities = computed(() => {
    let disabilities = (this.disabilitiesApi.value() || []) as Disability[];

    // Filtro por texto
    const search = this.searchText().toLowerCase();
    if (search) {
      disabilities = disabilities.filter((d) => {
        const employeeName = `${d.employee?.first_name || ''} ${d.employee?.father_name || ''}`.toLowerCase();
        const email = d.employee?.work_email?.toLowerCase() || '';
        const description = d.description?.toLowerCase() || '';
        return employeeName.includes(search) || email.includes(search) || description.includes(search);
      });
    }

    // Filtro por estado
    const status = this.selectedStatus();
    if (status) {
      disabilities = disabilities.filter((d) => d.status === status);
    }

    // Filtro por rango de fechas
    const dateRange = this.dateRange();
    if (dateRange && dateRange.length === 2) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      disabilities = disabilities.filter((d) => {
        const disabilityStart = new Date(d.start_date);
        return disabilityStart >= startDate && disabilityStart <= endDate;
      });
    }

    return disabilities;
  });

  // TimeOffs filtrados
  public filteredTimeOffs = computed(() => {
    let timeoffs: TimeOff[] = [];
    
    if (this.selectedRequestType() === 'compensatory') {
      timeoffs = this.compensatoryTimeOffs();
    } else if (this.selectedRequestType() === 'vacations') {
      timeoffs = this.vacationTimeOffs();
    }

    // Filtro por texto
    const search = this.searchText().toLowerCase();
    if (search) {
      timeoffs = timeoffs.filter((t) => {
        const employeeName = `${t.employee?.first_name || ''} ${t.employee?.father_name || ''}`.toLowerCase();
        const email = t.employee?.work_email?.toLowerCase() || '';
        const typeName = t.type?.name?.toLowerCase() || '';
        return employeeName.includes(search) || email.includes(search) || typeName.includes(search);
      });
    }

    // Filtro por estado
    const status = this.selectedStatus();
    if (status) {
      if (status === 'pending') {
        timeoffs = timeoffs.filter((t) => !t.is_approved);
      } else if (status === 'approved') {
        timeoffs = timeoffs.filter((t) => t.is_approved);
      }
    }

    // Filtro por rango de fechas
    const dateRange = this.dateRange();
    if (dateRange && dateRange.length === 2) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      timeoffs = timeoffs.filter((t) => {
        const timeoffStart = new Date(t.date_from);
        return timeoffStart >= startDate && timeoffStart <= endDate;
      });
    }

    return timeoffs;
  });

  public calculateDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    };
    return labels[status] || status;
  }

  public getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severities: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      pending: 'warn',
      approved: 'success',
      rejected: 'danger',
    };
    return severities[status] || 'info';
  }

  public onFilterChange(): void {
    // Los filtros se aplican automáticamente mediante computed
  }

  public clearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.dateRange.set(null);
  }

  public onRequestTypeChange(): void {
    // Limpiar filtros al cambiar de tipo
    this.clearFilters();
  }

  public reloadData(): void {
    this.disabilitiesApi.reload();
    this.timeoffsApi.reload();
  }

  public viewDisabilityDetails(disability: Disability): void {
    this.selectedDisability.set(disability);
    this.showDisabilityDetailsDialog.set(true);
  }

  public viewTimeOffDetails(timeoff: TimeOff): void {
    this.selectedTimeOff.set(timeoff);
    this.showTimeOffDetailsDialog.set(true);
  }

  public downloadDocument(url: string): void {
    window.open(url, '_blank');
  }

  public approveDisability(disability: Disability): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de aprobar la incapacidad de ${disability.employee?.first_name} ${disability.employee?.father_name}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.updateDisabilityStatus(disability.id, 'approved');
      },
    });
  }

  public rejectDisability(disability: Disability): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de rechazar la incapacidad de ${disability.employee?.first_name} ${disability.employee?.father_name}?`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.updateDisabilityStatus(disability.id, 'rejected');
      },
    });
  }

  private updateDisabilityStatus(id: string, status: 'approved' | 'rejected'): void {
    this.http
      .patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_disabilities?id=eq.${id}`,
        { status, reviewed_at: new Date().toISOString() }
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Incapacidad ${status === 'approved' ? 'aprobada' : 'rechazada'} correctamente`,
          });
          this.disabilitiesApi.reload();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado de la incapacidad',
          });
        },
      });
  }

  public approveTimeOff(timeoff: TimeOff): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de aprobar el ${this.selectedRequestType() === 'compensatory' ? 'compensatorio' : 'vacaciones'} de ${timeoff.employee?.first_name} ${timeoff.employee?.father_name}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.updateTimeOffStatus(timeoff.id, true);
      },
    });
  }

  public rejectTimeOff(timeoff: TimeOff): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de rechazar el ${this.selectedRequestType() === 'compensatory' ? 'compensatorio' : 'vacaciones'} de ${timeoff.employee?.first_name} ${timeoff.employee?.father_name}?`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.updateTimeOffStatus(timeoff.id, false);
      },
    });
  }

  private updateTimeOffStatus(id: string, isApproved: boolean): void {
    this.http
      .patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs?id=eq.${id}`,
        { is_approved: isApproved }
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `${this.selectedRequestType() === 'compensatory' ? 'Compensatorio' : 'Vacaciones'} ${isApproved ? 'aprobado' : 'rechazado'} correctamente`,
          });
          this.timeoffsApi.reload();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado',
          });
        },
      });
  }
}

