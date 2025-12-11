import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { OrganizationService } from '../services/organization.service';

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

@Component({
  selector: 'pt-hr-disabilities',
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
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white m-0">
            Gestión de Incapacidades
          </h2>
          <p class="text-sm text-gray-400 m-0 mt-1">
            Revisa, aprueba o rechaza las incapacidades enviadas por los
            empleados
          </p>
        </div>
        <div class="flex items-center gap-3">
          <p-button
            icon="pi pi-refresh"
            label="Actualizar"
            [outlined]="true"
            severity="secondary"
            (onClick)="disabilitiesApi.reload()"
            [loading]="disabilitiesApi.isLoading()"
          />
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Total</p>
              <p class="text-2xl font-bold text-white m-0 mt-1">
                {{ totalCount() }}
              </p>
            </div>
            <i class="pi pi-file text-3xl text-gray-500"></i>
          </div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Pendientes</p>
              <p class="text-2xl font-bold text-yellow-400 m-0 mt-1">
                {{ pendingCount() }}
              </p>
            </div>
            <i class="pi pi-clock text-3xl text-yellow-500"></i>
          </div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Aprobadas</p>
              <p class="text-2xl font-bold text-green-400 m-0 mt-1">
                {{ approvedCount() }}
              </p>
            </div>
            <i class="pi pi-check-circle text-3xl text-green-500"></i>
          </div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Rechazadas</p>
              <p class="text-2xl font-bold text-red-400 m-0 mt-1">
                {{ rejectedCount() }}
              </p>
            </div>
            <i class="pi pi-times-circle text-3xl text-red-500"></i>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <p-card class="bg-neutral-800 border-neutral-700">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2"
              >Buscar</label
            >
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
            <label class="block text-sm font-medium text-gray-300 mb-2"
              >Estado</label
            >
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
            <label class="block text-sm font-medium text-gray-300 mb-2"
              >Fecha Inicio</label
            >
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
        @if (disabilitiesApi.isLoading()) {
        <div class="flex justify-center items-center py-12">
          <p-progressSpinner />
        </div>
        } @else {
        <p-table
          [value]="filteredDisabilities()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          [globalFilterFields]="[
            'employee.first_name',
            'employee.father_name',
            'employee.work_email',
            'description'
          ]"
          styleClass="p-datatable-striped"
          [tableStyle]="{ 'min-width': '50rem' }"
        >
          <ng-template #emptymessage>
            <tr>
              <td colspan="8" class="text-center py-4">
                No se encontraron incapacidades
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 200px">Empleado</th>
              <th style="width: 120px">Fecha Inicio</th>
              <th style="width: 120px">Fecha Fin</th>
              <th style="width: 100px">Días</th>
              <th>Descripción</th>
              <th style="width: 120px">Estado</th>
              <th style="width: 100px">Documento</th>
              <th style="width: 200px">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-disability>
            <tr>
              <td>
                <div class="flex flex-col">
                  <span class="font-medium text-white">
                    {{ disability.employee?.first_name }}
                    {{ disability.employee?.father_name }}
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
                  {{
                    calculateDays(disability.start_date, disability.end_date)
                  }}
                  días
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
                    (onClick)="viewDetails(disability)"
                    pTooltip="Ver detalles"
                    tooltipPosition="top"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
        }
      </p-card>
    </div>

    <!-- Dialog de Detalles -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{ width: '600px' }"
      [header]="'Detalles de Incapacidad'"
      [draggable]="false"
      [resizable]="false"
    >
      @if (selectedDisability()) {
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Empleado</label
          >
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
          } @if (selectedDisability()!.employee?.branch?.name) {
          <p class="text-sm text-gray-500">
            Sucursal: {{ selectedDisability()!.employee?.branch?.name }}
          </p>
          }
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1"
              >Fecha Inicio</label
            >
            <p class="text-white">
              {{ selectedDisability()!.start_date | date : 'dd/MM/yyyy' }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1"
              >Fecha Fin</label
            >
            <p class="text-white">
              {{ selectedDisability()!.end_date | date : 'dd/MM/yyyy' }}
            </p>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Duración</label
          >
          <p class="text-white">
            {{
              calculateDays(
                selectedDisability()!.start_date,
                selectedDisability()!.end_date
              )
            }}
            días
          </p>
        </div>
        @if (selectedDisability()!.description) {
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Descripción</label
          >
          <p class="text-white whitespace-pre-wrap">
            {{ selectedDisability()!.description }}
          </p>
        </div>
        }
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Estado</label
          >
          <p-tag
            [value]="getStatusLabel(selectedDisability()!.status)"
            [severity]="getStatusSeverity(selectedDisability()!.status)"
          />
        </div>
        @if (selectedDisability()!.document_url) {
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Documento</label
          >
          <p-button
            icon="pi pi-download"
            label="Descargar Documento"
            (onClick)="downloadDocument(selectedDisability()!.document_url!)"
            class="w-full"
          />
        </div>
        }
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Fecha de Creación</label
          >
          <p class="text-white">
            {{ selectedDisability()!.created_at | date : 'dd/MM/yyyy HH:mm' }}
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
export class HRDisabilitiesComponent {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);

  // API para obtener incapacidades con información del empleado
  public disabilitiesApi = httpResource<Disability[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: `*,employee:employees(id,first_name,father_name,mother_name,work_email,position:positions(name),branch:branches(name))`,
      order: 'created_at.desc',
    };

    // Nota: employee_disabilities no tiene company_id directamente, pero podemos filtrar por employee.company_id
    // Por ahora, dejamos que el filtro se haga a través de la relación employee
    // Si necesitamos filtrar, podríamos agregar un filtro adicional

    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_disabilities`,
      method: 'GET',
      params,
    };
  });

  // Filtros
  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  // Dialog
  public showDetailsDialog = signal(false);
  public selectedDisability = signal<Disability | null>(null);

  // Opciones de estado
  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  // Estadísticas
  public totalCount = computed(() => this.disabilitiesApi.value()?.length || 0);
  public pendingCount = computed(
    () =>
      this.disabilitiesApi.value()?.filter((d) => d.status === 'pending')
        .length || 0
  );
  public approvedCount = computed(
    () =>
      this.disabilitiesApi.value()?.filter((d) => d.status === 'approved')
        .length || 0
  );
  public rejectedCount = computed(
    () =>
      this.disabilitiesApi.value()?.filter((d) => d.status === 'rejected')
        .length || 0
  );

  // Incapacidades filtradas
  public filteredDisabilities = computed(() => {
    let disabilities = this.disabilitiesApi.value() || [];

    // Filtro por texto
    const search = this.searchText().toLowerCase();
    if (search) {
      disabilities = disabilities.filter((d) => {
        const employeeName = `${d.employee?.first_name || ''} ${
          d.employee?.father_name || ''
        }`.toLowerCase();
        const email = d.employee?.work_email?.toLowerCase() || '';
        const description = d.description?.toLowerCase() || '';
        return (
          employeeName.includes(search) ||
          email.includes(search) ||
          description.includes(search)
        );
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

  public getStatusSeverity(
    status: string
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severities: Record<
      string,
      'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
    > = {
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

  public viewDetails(disability: Disability): void {
    this.selectedDisability.set(disability);
    this.showDetailsDialog.set(true);
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

  private updateDisabilityStatus(
    id: string,
    status: 'approved' | 'rejected'
  ): void {
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
            detail: `Incapacidad ${
              status === 'approved' ? 'aprobada' : 'rechazada'
            } correctamente`,
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
}
