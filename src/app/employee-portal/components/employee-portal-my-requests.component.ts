import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { getCompensatoryQuantity } from '../utils/employee-portal-compensatory.utils';

type UnifiedRequest = {
  id: string;
  request_type: 'compensatory' | 'disability' | 'document' | 'complaint' | 'vacation';
  created_at: string | Date;
  status: string;
  title: string;
  description?: string;
  originalData: any;
};

@Component({
  selector: 'pt-employee-portal-my-requests',
  standalone: true,
  imports: [
    Card,
    Button,
    DatePicker,
    InputText,
    Select,
    FormsModule,
    DatePipe,
    NgClass,
  ],
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-list text-cyan-400"></i>
            <span>Mis Solicitudes</span>
          </div>
          <p-button
            label="Nueva Solicitud"
            icon="pi pi-plus"
            (click)="onSetActiveSection('management')"
          />
        </div>
      </ng-template>
      <ng-template #subtitle>Visualiza todas tus solicitudes</ng-template>

      <!-- Filtros y Ordenamiento (Desplegable) -->
      <div class="mb-6 bg-neutral-800/50 rounded-lg border border-neutral-700/50 overflow-hidden">
        <!-- Header del panel de filtros -->
        <button
          type="button"
          (click)="localFiltersExpanded.set(!localFiltersExpanded())"
          class="w-full flex items-center justify-between p-4 hover:bg-neutral-700/30 transition-colors"
        >
          <div class="flex items-center gap-3">
            <i class="pi pi-filter text-cyan-400"></i>
            <span class="text-lg font-semibold text-white">Filtros y Ordenamiento</span>
            @if (canClearFilters()) {
            <span class="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-semibold rounded-full">
              {{ getActiveFiltersCount() }} activo(s)
            </span>
            }
          </div>
          <i
            class="pi transition-transform duration-300"
            [class.pi-chevron-down]="!localFiltersExpanded()"
            [class.pi-chevron-up]="localFiltersExpanded()"
            [class.text-gray-400]="true"
          ></i>
        </button>

        <!-- Contenido desplegable -->
        @if (localFiltersExpanded()) {
        <div class="px-4 pb-4 border-t border-neutral-700/50 pt-4">
          <div class="flex flex-col gap-4">
            <!-- Primera fila: Filtros principales -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Búsqueda por texto -->
              <div class="lg:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  <i class="pi pi-search mr-2"></i>Buscar
                </label>
                <input
                  pInputText
                  type="text"
                  [ngModel]="filterSearchValue()"
                  (ngModelChange)="setFilterSearch()($event)"
                  placeholder="Buscar en títulos o descripciones..."
                  class="w-full"
                />
              </div>

              <!-- Filtro por Estado -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  <i class="pi pi-filter mr-2"></i>Estado
                </label>
                <p-select
                  [options]="statusOptions()"
                  [ngModel]="filterStatusValue()"
                  (ngModelChange)="setFilterStatus()($event)"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Todos los estados"
                  appendTo="body"
                  class="w-full"
                />
              </div>

              <!-- Filtro por Tipo -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  <i class="pi pi-tag mr-2"></i>Tipo de Solicitud
                </label>
                <p-select
                  [options]="typeOptions()"
                  [ngModel]="filterTypeValue()"
                  (ngModelChange)="setFilterType()($event)"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Todos los tipos"
                  appendTo="body"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Segunda fila: Rango de fechas y ordenamiento -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Rango de fechas -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  <i class="pi pi-calendar mr-2"></i>Rango de fechas
                </label>
                <p-datepicker
                  [ngModel]="filterDateRangeValue()"
                  (ngModelChange)="setFilterDateRange()($event)"
                  selectionMode="range"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Seleccionar rango"
                  appendTo="body"
                  [showClear]="true"
                  class="w-full"
                />
              </div>

              <!-- Ordenamiento -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  <i class="pi pi-sort mr-2"></i>Ordenar por
                </label>
                <p-select
                  [options]="sortOptions()"
                  [ngModel]="selectedSortValue()"
                  (ngModelChange)="onSortChange($event)"
                  optionLabel="label"
                  placeholder="Seleccionar orden"
                  appendTo="body"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Tercera fila: Botones de acción y contador -->
            <div
              class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-neutral-700/50"
            >
              <div class="flex items-center gap-2 text-sm text-gray-400">
                <i class="pi pi-info-circle"></i>
                <span>
                  Mostrando
                  <strong class="text-white">{{ filteredRequests().length }}</strong>
                  de
                  <strong class="text-white">{{ allRequests().length }}</strong>
                  solicitudes
                </span>
              </div>
              <p-button
                label="Limpiar Filtros"
                icon="pi pi-filter-slash"
                severity="secondary"
                [outlined]="true"
                [rounded]="true"
                (onClick)="clearFilters()"
                [disabled]="!canClearFilters()"
              />
            </div>
          </div>
        </div>
        }
      </div>

      <!-- Contador de resultados cuando los filtros están colapsados -->
      @if (!filtersExpanded() && canClearFilters()) {
      <div
        class="mb-4 p-3 bg-cyan-500/10 border border-cyan-400/30 rounded-lg flex items-center justify-between"
      >
        <div class="flex items-center gap-2 text-sm text-cyan-300">
          <i class="pi pi-info-circle"></i>
          <span>
            Mostrando
            <strong class="text-white">{{ filteredRequests().length }}</strong>
            de
            <strong class="text-white">{{ allRequests().length }}</strong>
            solicitudes
          </span>
        </div>
        <p-button
          label="Limpiar Filtros"
          icon="pi pi-filter-slash"
          severity="secondary"
          [text]="true"
          [rounded]="true"
          (onClick)="clearFilters()"
          size="small"
        />
      </div>
      }

      @if (isLoading()) {
      <div class="flex justify-center items-center py-12">
        <div class="flex flex-col items-center gap-3">
          <i class="pi pi-spin pi-spinner text-4xl text-cyan-400"></i>
          <p class="text-gray-400">Cargando tus solicitudes...</p>
        </div>
      </div>
      } @else if (allRequests().length === 0) {
      <div class="flex flex-col items-center justify-center py-16 px-4">
        <div
          class="w-24 h-24 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4"
        >
          <i class="pi pi-inbox text-5xl text-cyan-400/50"></i>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">No tienes solicitudes aún</h3>
        <p class="text-gray-400 text-center max-w-md mb-6">
          Aún no has enviado ninguna solicitud. Ve a "Gestiones" para crear una nueva solicitud.
        </p>
        <p-button
          label="Ir a Gestiones"
          icon="pi pi-briefcase"
          (click)="onSetActiveSection('management')"
          severity="success"
          [rounded]="true"
        />
      </div>
      } @else if (filteredRequests().length === 0) {
      <div class="flex flex-col items-center justify-center py-16 px-4">
        <div
          class="w-24 h-24 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4"
        >
          <i class="pi pi-filter-slash text-5xl text-yellow-400/50"></i>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">No se encontraron resultados</h3>
        <p class="text-gray-400 text-center max-w-md mb-6">
          No hay solicitudes que coincidan con los filtros seleccionados. Intenta ajustar los
          filtros o limpiarlos para ver todas tus solicitudes.
        </p>
        <p-button
          label="Limpiar Filtros"
          icon="pi pi-filter-slash"
          (click)="clearFilters()"
          severity="secondary"
          [rounded]="true"
        />
      </div>
      } @else {
      <div class="space-y-4">
        @for (request of filteredRequests(); track request.id) {
          @let data = request.originalData;
        <div
          class="bg-gradient-to-r from-neutral-800 to-neutral-800/80 border rounded-xl p-5 hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-cyan-400/50"
          [ngClass]="{
            'border-yellow-500/30': request.status === 'pending',
            'border-green-500/30': request.status === 'approved',
            'border-red-500/30': request.status === 'rejected',
            'border-cyan-500/30': request.status === 'in_registry'
          }"
          (click)="onViewRequestDetails(request)"
        >
          <div class="flex flex-col md:flex-row md:items-start gap-4">
            <!-- Icono y Estado -->
            <div class="flex-shrink-0">
              <div
                class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
                [ngClass]="{
                  'bg-yellow-500/20': request.status === 'pending',
                  'bg-green-500/20': request.status === 'approved',
                  'bg-red-500/20': request.status === 'rejected',
                  'bg-cyan-500/20': request.status === 'in_registry'
                }"
              >
                @if (request.request_type === 'compensatory') {
                  <i class="pi pi-clock text-cyan-400"></i>
                } @else if (request.request_type === 'disability') {
                  <i class="pi pi-file-plus text-blue-400"></i>
                } @else if (request.request_type === 'document') {
                  <i class="pi pi-file-edit text-green-400"></i>
                } @else if (request.request_type === 'complaint') {
                  <i class="pi pi-comments text-yellow-400"></i>
                } @else {
                  <i class="pi pi-calendar-plus text-purple-400"></i>
                }
              </div>
            </div>

            <!-- Contenido Principal -->
            <div class="flex-1 min-w-0">
              <!-- Header con Estado -->
              <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4"
              >
                <div class="flex items-center gap-3">
                  <div>
                    <h3 class="text-lg font-semibold text-white mb-1">
                      {{ request.title }}
                    </h3>
                    <p class="text-sm text-gray-400">
                      Solicitado el {{ request.created_at | date : 'dd/MM/yyyy' }} a las
                      {{ request.created_at | date : 'HH:mm' }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                    [class.text-yellow-300]="request.status === 'pending'"
                    [class.text-green-300]="request.status === 'approved'"
                    [class.text-red-300]="request.status === 'rejected'"
                    [class.text-cyan-300]="request.status === 'in_registry'"
                    [ngClass]="{
                      'bg-yellow-500/20': request.status === 'pending',
                      'bg-green-500/20': request.status === 'approved',
                      'bg-red-500/20': request.status === 'rejected',
                      'bg-cyan-500/20': request.status === 'in_registry'
                    }"
                  >
                    @if (request.status === 'approved') {
                      <i class="pi pi-check-circle"></i>
                    } @else if (request.status === 'rejected') {
                      <i class="pi pi-times-circle"></i>
                    } @else if (request.status === 'in_registry') {
                      <i class="pi pi-clock"></i>
                    } @else {
                      <i class="pi pi-hourglass"></i>
                    }
                    {{ getStatusLabel()(request.status) }}
                  </span>
                </div>
              </div>

              <!-- Información específica según tipo -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <!-- Tiempo Compensatorio -->
                @if (request.request_type === 'compensatory') {
                  <!-- Fechas -->
                  @let quantityForPeriodList = getCompensatoryQuantity(data);
                  <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-calendar text-cyan-400"></i>
                      <span class="text-xs text-gray-400 font-medium">
                        @if (quantityForPeriodList.isDays) {
                          Período
                        } @else {
                          Fecha y Horas
                        }
                      </span>
                    </div>
                    @if (quantityForPeriodList.isDays) {
                      <p class="text-white font-semibold">
                        {{ data.date_from | date : 'dd/MM/yyyy' }}
                      </p>
                      @if (data.date_from !== data.date_to) {
                        <p class="text-gray-400 text-sm mt-1">
                          hasta {{ data.date_to | date : 'dd/MM/yyyy' }}
                        </p>
                      }
                    } @else {
                      @if (data.date_from) {
                        <p class="text-white font-semibold">
                          {{ data.date_from | date : 'dd/MM/yyyy' }}
                        </p>
                        @if (data.date_from && hasTimeInfo()(data.date_from)) {
                          <p class="text-gray-400 text-sm mt-1">
                            {{ formatDateWithTimeRange()(data.date_from, data.date_to) }}
                          </p>
                        } @else {
                          <p class="text-gray-400 text-sm mt-1">
                            {{ formatHoursMinutes()(quantityForPeriodList.value) }}
                          </p>
                        }
                      } @else {
                        <p class="text-gray-400 text-sm">Sin fecha específica</p>
                      }
                    }
                  </div>

                  <!-- Cantidad -->
                  <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                    <div class="flex items-center gap-2 mb-2">
                      @if (data.compensatory_type === 'days') {
                        <i class="pi pi-calendar text-cyan-400"></i>
                      } @else {
                        <i class="pi pi-clock text-cyan-400"></i>
                      }
                      <span class="text-xs text-gray-400 font-medium">Cantidad</span>
                    </div>
                    <p class="text-white font-semibold text-lg">
                      @let quantity = getCompensatoryQuantity(data);
                      @if (quantity.isDays) {
                        {{ quantity.value }} día(s)
                        <span class="text-gray-400 text-sm font-normal block mt-1">
                          ({{ quantity.value * 8 }} horas)
                        </span>
                      } @else {
                        {{ formatHoursMinutes()(quantity.value) }}
                      }
                    </p>
                  </div>

                  <!-- Tipo -->
                  <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-tag text-cyan-400"></i>
                      <span class="text-xs text-gray-400 font-medium">Tipo</span>
                    </div>
                    <p class="text-white font-semibold">
                      @if (data.compensatory_type === 'days') {
                        Días
                      } @else {
                        Horas
                      }
                    </p>
                  </div>

                  <!-- Documento PDF -->
                  <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-file text-cyan-400"></i>
                      <span class="text-xs text-gray-400 font-medium">Documento</span>
                    </div>
                    @if (data.document_url) {
                      <div class="flex flex-col items-center gap-2">
                        <iframe
                          [src]="data.document_url + '#toolbar=1&navpanes=1&scrollbar=1'"
                          type="application/pdf"
                          width="100%"
                          height="150px"
                          style="border: none; border-radius: 4px;"
                        ></iframe>
                        <p class="text-xs text-cyan-400 text-center">
                          Solicitud física adjunta
                        </p>
                      </div>
                    } @else {
                      <p class="text-gray-400 text-sm text-center">
                        Sin documento adjunto
                      </p>
                    }
                  </div>
                }

                <!-- Incapacidad -->
                @if (request.request_type === 'disability') {
                  <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-calendar text-blue-400"></i>
                      <span class="text-xs text-gray-400 font-medium">Período</span>
                    </div>
                    <p class="text-white font-semibold">
                      {{ data.start_date | date : 'dd/MM/yyyy' }}
                      @if (data.end_date) {
                        <span class="text-gray-400 text-sm block mt-1">
                          hasta {{ data.end_date | date : 'dd/MM/yyyy' }}
                        </span>
                      }
                    </p>
                  </div>
                }

                <!-- Documento -->
                @if (request.request_type === 'document') {
                  <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-file text-green-400"></i>
                      <span class="text-xs text-gray-400 font-medium">Tipo de Documento</span>
                    </div>
                    <p class="text-white font-semibold">
                      {{ getDocumentTypeLabel()(data.document_type) }}
                    </p>
                  </div>
                  @if (data.required_date) {
                  <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-calendar text-green-400"></i>
                      <span class="text-xs text-gray-400 font-medium">Fecha Requerida</span>
                    </div>
                    <p class="text-white font-semibold">
                      {{ data.required_date | date : 'dd/MM/yyyy' }}
                    </p>
                  </div>
                  }
                }

                <!-- Queja -->
                @if (request.request_type === 'complaint') {
                  <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-tag text-yellow-400"></i>
                      <span class="text-xs text-gray-400 font-medium">Categoría</span>
                    </div>
                    <p class="text-white font-semibold">
                      {{ getComplaintCategoryLabel()(data.category) }}
                    </p>
                  </div>
                  @if (data.priority) {
                  <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-exclamation-circle text-yellow-400"></i>
                      <span class="text-xs text-gray-400 font-medium">Prioridad</span>
                    </div>
                    <p class="text-white font-semibold capitalize">
                      {{ data.priority }}
                    </p>
                  </div>
                  }
                }

                <!-- Tipo de Solicitud (común) -->
                <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-list text-gray-400"></i>
                    <span class="text-xs text-gray-400 font-medium">Tipo</span>
                  </div>
                  <p class="text-white font-semibold">
                    {{ getRequestTypeLabel()(request.request_type) }}
                  </p>
                </div>
              </div>

              <!-- Descripción/Motivo -->
              @if (request.description) {
              <div class="bg-neutral-900/30 rounded-lg p-3 border border-neutral-700/30 mb-4">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-comment text-cyan-400"></i>
                  <span class="text-sm text-gray-400 font-medium">
                    @if (request.request_type === 'complaint') {
                      Detalles
                    } @else {
                      Motivo
                    }
                  </span>
                </div>
                <p class="text-gray-300 text-sm">{{ request.description }}</p>
              </div>
              }

              <!-- Comentario de Rechazo -->
              @if (data.rejection_comment || (data.notes && request.status === 'rejected')) {
              <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <i class="pi pi-exclamation-triangle text-red-400 text-xl mt-0.5"></i>
                  <div class="flex-1">
                    <h4 class="text-red-300 font-semibold mb-1">Motivo del Rechazo</h4>
                    <p class="text-red-200 text-sm">
                      {{ data.rejection_comment || data.notes }}
                    </p>
                  </div>
                </div>
              </div>
              }

              <!-- Botón de acción para quejas -->
              @if (request.request_type === 'complaint') {
              <div class="mt-4">
                <p-button
                  label="Ver Conversación"
                  icon="pi pi-comments"
                  severity="secondary"
                  [outlined]="true"
                  [rounded]="true"
                  (onClick)="onViewResponse(data)"
                />
              </div>
              }
            </div>
          </div>
        </div>
        }
      </div>
      }
    </p-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePortalMyRequestsComponent {
  // Inputs
  public allRequests = input.required<UnifiedRequest[]>();
  public filteredRequests = input.required<UnifiedRequest[]>();
  public isLoading = input.required<boolean>();
  public statusOptions = input.required<Array<{ label: string; value: string | null }>>();
  public typeOptions = input.required<Array<{ label: string; value: string | null }>>();
  public sortOptions = input.required<Array<{ label: string; by: string; order: string }>>();
  public getStatusLabel = input.required<(status: string) => string>();
  public getRequestTypeLabel = input.required<(type: string) => string>();
  public getDocumentTypeLabel = input.required<(type: string) => string>();
  public getComplaintCategoryLabel = input.required<(category: string) => string>();
  public formatHoursMinutes = input.required<(hours: number | string) => string>();
  public formatDateWithTimeRange = input.required<(from: string | Date, to: string | Date) => string>();
  public hasTimeInfo = input.required<(date: string | Date | null | undefined) => boolean>();

  // Outputs
  public viewRequestDetails = output<UnifiedRequest>();
  public viewResponse = output<any>();
  public setActiveSection = output<string>();

  // Inputs for filter values
  public filtersExpanded = input(false);
  public filterSearchValue = input('');
  public filterStatusValue = input<string | null>(null);
  public filterTypeValue = input<string | null>(null);
  public filterDateRangeValue = input<Date[] | null>(null);
  public selectedSortValue = input<any>(null);

  // Functions to update filters
  public setFilterSearch = input.required<(value: string) => void>();
  public setFilterStatus = input.required<(value: string | null) => void>();
  public setFilterType = input.required<(value: string | null) => void>();
  public setFilterDateRange = input.required<(value: Date[] | null) => void>();
  public setSelectedSort = input.required<(value: any) => void>();

  // Local signal for expanded state (UI only)
  public localFiltersExpanded = signal(false);

  // Computed
  public canClearFilters = computed(() => {
    return (
      !!this.filterStatusValue() ||
      !!this.filterTypeValue() ||
      !!this.filterDateRangeValue() ||
      !!this.filterSearchValue()
    );
  });

  public getActiveFiltersCount(): number {
    let count = 0;
    if (this.filterStatusValue()) count++;
    if (this.filterTypeValue()) count++;
    if (this.filterDateRangeValue()) count++;
    if (this.filterSearchValue()) count++;
    return count;
  }

  public clearFilters(): void {
    this.setFilterStatus()(null);
    this.setFilterType()(null);
    this.setFilterDateRange()(null);
    this.setFilterSearch()('');
    this.setSelectedSort()(this.sortOptions()[0]);
  }

  public onSortChange(option: any): void {
    if (option) {
      this.setSelectedSort()(option);
    }
  }

  public onViewRequestDetails(request: UnifiedRequest): void {
    this.viewRequestDetails.emit(request);
  }

  public onViewResponse(complaint: any): void {
    this.viewResponse.emit(complaint);
  }

  public onSetActiveSection(section: string): void {
    this.setActiveSection.emit(section);
  }

  // Helper methods to use imported functions in template
  public getCompensatoryQuantity = getCompensatoryQuantity;
}
