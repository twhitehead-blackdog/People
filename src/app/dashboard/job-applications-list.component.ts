import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { utils, writeFile } from 'xlsx';
import { JobApplication, Position } from '../models';
import { OrganizationService } from '../services/organization.service';
import { JobApplicationsStore } from '../stores/job-applications.store';
import { PositionsStore } from '../stores/positions.store';
import { JobApplicationDetailComponent } from './job-application-detail.component';
import { JobApplicationStatusDialogComponent } from './job-application-status-dialog.component';
import { JobApplicationStatusesDialogComponent } from './job-application-statuses-dialog.component';
import { PositionsFormComponent } from './positions-form.component';

@Component({
  selector: 'pt-job-applications-list',
  imports: [
    DatePipe,
    CurrencyPipe,
    ReactiveFormsModule,
    FormsModule,
    InputText,
    Select,
    TableModule,
    TabsModule,
    Card,
    Tag,
    Button,
    ToggleSwitch,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    DatePicker,
  ],
  providers: [
    DynamicDialogRef,
    DialogService,
    MessageService,
    ConfirmationService, // Necesario para que los stores puedan inyectarlo
    // JobApplicationsStore ahora está en app.config.ts
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div>
            <h2 class="m-0">Aplicaciones de Trabajo</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">
              Gestiona las aplicaciones recibidas de la Feria de Empleo
            </p>
          </div>
          <div class="flex items-center gap-4 flex-wrap">
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-300">Feria Activa:</label>
              <p-toggleswitch
                [(ngModel)]="jobFairEnabled"
                (ngModelChange)="onJobFairEnabledChange()"
                [disabled]="isUpdatingJobFairStatus()"
              />
              <span
                class="text-sm"
                [class.text-green-400]="jobFairEnabled()"
                [class.text-gray-400]="!jobFairEnabled()"
              >
                {{ jobFairEnabled() ? 'Activa' : 'Inactiva' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-300"
                >Duración de la feria:</label
              >
              <p-datepicker
                [(ngModel)]="jobFairDateRange"
                (ngModelChange)="onJobFairDateRangeChange()"
                [showIcon]="true"
                [disabled]="isUpdatingInterviewDate()"
                dateFormat="dd/mm/yy"
                selectionMode="range"
                placeholder="Seleccionar rango de fechas"
                appendTo="body"
                styleClass="w-64"
              />
            </div>
            <p-button
              icon="pi pi-external-link"
              label="Ver Formulario Público"
              severity="secondary"
              (onClick)="openJobFairForm()"
              rounded
              [outlined]="true"
            />
          </div>
        </div>
      </ng-template>
      <p-tabs value="applications">
        <p-tablist>
          <p-tab value="applications">
            <i class="pi pi-briefcase mr-2"></i>
            Aplicaciones
          </p-tab>
          <p-tab value="positions">
            <i class="pi pi-list mr-2"></i>
            Gestión de Vacantes
          </p-tab>
        </p-tablist>
        <p-tabpanel value="applications">
          <p-table
            #dt
            [value]="filteredApplications()"
            [loading]="jobApplicationsStore.isLoading()"
            [paginator]="true"
            [rows]="10"
            [rowsPerPageOptions]="[10, 20, 50]"
            [globalFilterFields]="[
              'first_name',
              'last_name',
              'email',
              'phone_number',
              'province',
              'position_name',
              'status'
            ]"
            paginatorDropdownAppendTo="body"
            [showCurrentPageReport]="true"
            currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} aplicaciones"
          >
            <ng-template #caption>
              <div class="flex gap-4 items-center flex-wrap">
                <div class="flex gap-2 items-center">
                  <p-button
                    icon="pi pi-refresh"
                    severity="secondary"
                    label="Actualizar"
                    (onClick)="refreshApplications()"
                    rounded
                    [loading]="jobApplicationsStore.isLoading()"
                  />
                  <p-button
                    icon="pi pi-file-excel"
                    severity="success"
                    label="Exportar"
                    (onClick)="exportToExcel()"
                    rounded
                  />
                </div>
                <div class="flex gap-2 items-center">
                  <label class="text-sm text-gray-300"
                    >Filtrar por estado:</label
                  >
                  <p-select
                    [options]="statusOptions()"
                    [ngModel]="statusFilter.value"
                    (ngModelChange)="statusFilter.setValue($event)"
                    optionLabel="label"
                    optionValue="code"
                    placeholder="Todos los estados"
                    [showClear]="true"
                    appendTo="body"
                    styleClass="w-48"
                  />
                  <p-button
                    icon="pi pi-cog"
                    severity="secondary"
                    text
                    rounded
                    (onClick)="manageStatuses()"
                    pTooltip="Gestionar estados"
                  />
                </div>
                <div class="flex gap-2 items-center">
                  <label class="text-sm text-gray-300">Buscar:</label>
                  <input
                    pInputText
                    type="text"
                    (input)="
                      dt.filterGlobal($any($event.target).value, 'contains')
                    "
                    placeholder="Buscar por nombre, email, posición..."
                    class="w-64"
                  />
                </div>
              </div>
            </ng-template>
            <ng-template #header>
              <tr>
                <th
                  style="width: 50px;"
                  pSortableColumn="is_favorite"
                  class="text-center"
                >
                  <p-sortIcon field="is_favorite" />
                </th>
                <th pSortableColumn="created_at" class="text-center">
                  Fecha <p-sortIcon field="created_at" />
                </th>
                <th pSortableColumn="first_name" class="text-center">
                  Nombre <p-sortIcon field="first_name" />
                </th>
                <th pSortableColumn="email" class="text-center">
                  Email <p-sortIcon field="email" />
                </th>
                <th pSortableColumn="phone_number" class="text-center">
                  Teléfono <p-sortIcon field="phone_number" />
                </th>
                <th pSortableColumn="province" class="text-center">
                  Residencia <p-sortIcon field="province" />
                </th>
                <th pSortableColumn="currently_working" class="text-center">
                  Laborando <p-sortIcon field="currently_working" />
                </th>
                <th pSortableColumn="salary_expectation" class="text-center">
                  Aspiración Salarial <p-sortIcon field="salary_expectation" />
                </th>
                <th pSortableColumn="position_name" class="text-center">
                  Vacante <p-sortIcon field="position_name" />
                </th>
                <th pSortableColumn="status" class="text-center">
                  Estado <p-sortIcon field="status" />
                </th>
                <th class="text-center">CV</th>
                <th class="text-center">Acciones</th>
              </tr>
            </ng-template>
            <ng-template #body let-application>
              <tr
                class="hover:bg-neutral-800/50 transition-colors cursor-pointer"
                (click)="viewDetails(application)"
              >
                <td class="text-center">
                  <button
                    type="button"
                    (click)="
                      toggleFavorite(application); $event.stopPropagation()
                    "
                    class="p-1 hover:bg-neutral-700 rounded transition-colors"
                    pTooltip="{{
                      application.is_favorite
                        ? 'Quitar de favoritos'
                        : 'Marcar como favorito'
                    }}"
                  >
                    <i
                      class="pi"
                      [class.pi-star-fill]="application.is_favorite"
                      [class.pi-star]="!application.is_favorite"
                      [class.text-yellow-400]="application.is_favorite"
                      [class.text-gray-400]="!application.is_favorite"
                      style="font-size: 1.25rem;"
                    ></i>
                  </button>
                </td>
                <td class="text-gray-300">
                  {{ application.created_at | date : 'short' }}
                </td>
                <td class="font-medium text-white">
                  {{ application.first_name }} {{ application.last_name }}
                </td>
                <td class="text-gray-300">{{ application.email }}</td>
                <td class="text-gray-300">{{ application.phone_number }}</td>
                <td class="text-gray-300 text-center">
                  @if (application.province || application.corregimiento) {
                  <div class="text-sm">
                    @if (application.province) {
                    <div>{{ application.province }}</div>
                    } @if (application.corregimiento) {
                    <div class="text-gray-400">
                      {{ application.corregimiento }}
                    </div>
                    }
                  </div>
                  } @else {
                  <span class="text-gray-500">-</span>
                  }
                </td>
                <td class="text-center">
                  @if (application.currently_working) {
                  <p-tag value="Sí" severity="success" />
                  } @else {
                  <p-tag value="No" severity="secondary" />
                  }
                </td>
                <td class="text-gray-300 text-center">
                  @if (application.salary_expectation) {
                  {{
                    application.salary_expectation
                      | currency : 'B/.' : 'symbol' : '1.2-2'
                  }}
                  } @else {
                  <span class="text-gray-500">-</span>
                  }
                </td>
                <td class="text-gray-300">
                  @if (application.position_ids &&
                  application.position_ids.length > 0) {
                  <div class="flex flex-col gap-1">
                    @for (positionId of application.position_ids; track
                    positionId) {
                    <span class="text-sm">
                      {{ getPositionName(positionId) }}
                    </span>
                    }
                  </div>
                  } @else {
                  {{
                    application.position_name ||
                      application.position?.name ||
                      'N/A'
                  }}
                  }
                </td>
                <td>
                  <p-tag
                    [value]="getStatusLabel(application.status)"
                    [severity]="getStatusSeverity(application.status)"
                    [style]="{
                      'min-width': maxStatusWidth(),
                      display: 'inline-block',
                      'text-align': 'center'
                    }"
                  />
                </td>
                <td>
                  @if (application.resume_url) {
                  <p-button
                    icon="pi pi-download"
                    severity="info"
                    text
                    rounded
                    (onClick)="
                      downloadResume(application); $event.stopPropagation()
                    "
                    pTooltip="Descargar CV"
                  />
                  } @else {
                  <span class="text-gray-500 text-sm">Sin CV</span>
                  }
                </td>
                <td>
                  <p-button
                    icon="pi pi-pencil"
                    severity="success"
                    text
                    rounded
                    (onClick)="
                      changeStatus(application); $event.stopPropagation()
                    "
                    pTooltip="Cambiar estado"
                  />
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td [attr.colspan]="12" class="text-center py-8">
                  <div class="flex flex-col items-center gap-2">
                    <i class="pi pi-inbox text-4xl text-gray-500"></i>
                    <p class="text-gray-400">No hay aplicaciones</p>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabpanel>
        <p-tabpanel value="positions">
          <div class="mb-4">
            <p class="text-gray-300 text-sm mb-4">
              Habilita o deshabilita las vacantes que aparecerán en el
              formulario de Feria de Empleo. Solo las vacantes habilitadas serán
              visibles para los candidatos.
            </p>
            <div class="flex gap-2 items-center flex-wrap mb-4">
              <p-button
                icon="pi pi-refresh"
                severity="secondary"
                label="Actualizar"
                (onClick)="refreshPositions()"
                rounded
                [loading]="positionsStore.isLoading()"
              />
              <p-button
                icon="pi pi-plus-circle"
                severity="success"
                label="Añadir Vacante"
                (onClick)="editPosition()"
                rounded
              />
              <input
                pInputText
                type="text"
                #searchInput
                (input)="
                  positionsTable.filterGlobal(
                    $any($event.target).value,
                    'contains'
                  )
                "
                placeholder="Buscar vacante..."
                class="w-64"
              />
            </div>
          </div>
          <p-table
            #positionsTable
            [value]="positions()"
            [loading]="positionsStore.isLoading()"
            [paginator]="true"
            [rows]="20"
            [rowsPerPageOptions]="[10, 20, 50]"
            [globalFilterFields]="['name', 'department.name']"
            paginatorDropdownAppendTo="body"
          >
            <ng-template #header>
              <tr>
                <th pSortableColumn="name">
                  Vacante <p-sortIcon field="name" />
                </th>
                <th
                  pSortableColumn="department.name"
                  class="text-center"
                  style="vertical-align: middle;"
                >
                  Área <p-sortIcon field="department.name" />
                </th>
                <th class="text-center" style="vertical-align: middle;">
                  Disponible en Feria
                </th>
                <th class="text-center" style="vertical-align: middle;">
                  Acciones
                </th>
              </tr>
            </ng-template>
            <ng-template #body let-position>
              <tr class="hover:bg-neutral-800/50 transition-colors">
                <td class="font-medium text-white">{{ position.name }}</td>
                <td
                  class="text-gray-300 text-center"
                  style="vertical-align: middle;"
                >
                  {{ position.department?.name || 'N/A' }}
                </td>
                <td class="text-center" style="vertical-align: middle;">
                  <p-toggleswitch
                    [ngModel]="position.available_for_job_fair !== false"
                    (ngModelChange)="
                      togglePositionAvailability(position, $event)
                    "
                    [disabled]="isUpdatingPosition()"
                  />
                </td>
                <td class="text-center" style="vertical-align: middle;">
                  <p-button
                    icon="pi pi-pen-to-square"
                    severity="success"
                    text
                    rounded
                    (onClick)="editPosition(position)"
                    pTooltip="Editar vacante"
                  />
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td [attr.colspan]="4" class="text-center py-8">
                  <div class="flex flex-col items-center gap-2">
                    <i class="pi pi-inbox text-4xl text-gray-500"></i>
                    <p class="text-gray-400">No hay posiciones</p>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabpanel>
      </p-tabs>
    </p-card>
  `,
  styles: `
    ::ng-deep .p-tabs {
      .p-tablist {
        margin-bottom: 1rem;
      }
      
      .p-tab {
        padding: 0.75rem 1.5rem;
      }
    }

    ::ng-deep .p-datatable {
      .p-datatable-thead > tr > th {
        text-align: center;
        vertical-align: middle;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobApplicationsListComponent implements OnInit {
  readonly jobApplicationsStore = inject(JobApplicationsStore);
  readonly positionsStore = inject(PositionsStore);
  private dialog = inject(DialogService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private organizationService = inject(OrganizationService);

  public statusFilter = new FormControl<string | null>(null);
  public isUpdatingPosition = signal<boolean>(false);
  public isUpdatingJobFairStatus = signal<boolean>(false);
  public isUpdatingInterviewDate = signal<boolean>(false);
  public jobFairEnabled = signal<boolean>(true);
  public jobFairDateRange: (Date | null)[] | null = null;

  // API para cargar el estado de la feria desde settings
  private jobFairSettingsApi = httpResource<any[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
    method: 'GET',
    params: {
      select: '*',
      key: `in.(job_fair_enabled,job_fair_start_date,job_fair_end_date)`,
    },
  }));

  public positions = computed(() => this.positionsStore.entities());

  getPositionName(positionId: string): string {
    const position = this.positions().find((p) => p.id === positionId);
    return position?.name || 'N/A';
  }

  // API para cargar estados personalizados
  private statusesApi = httpResource<any[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_application_statuses`,
    method: 'GET',
    params: {
      select: '*',
      is_active: 'eq.true',
      order: 'display_order.asc',
    },
  }));

  public statusOptions = computed(() => {
    const statuses = this.statusesApi.value();
    if (!statuses || statuses.length === 0) {
      // Estados por defecto si no hay en BD
      return [
        { code: 'pending', label: 'Pendiente', severity: 'warn' },
        { code: 'reviewed', label: 'Revisada', severity: 'info' },
        { code: 'contacted', label: 'Contactada', severity: 'info' },
        { code: 'rejected', label: 'Rechazada', severity: 'danger' },
        { code: 'hired', label: 'Contratada', severity: 'success' },
      ];
    }
    return statuses.map((s: any) => ({
      code: s.code,
      label: s.label,
      severity: s.severity,
    }));
  });

  // Calcular el ancho máximo basado en el label más largo
  public maxStatusWidth = computed(() => {
    const options = this.statusOptions();
    if (options.length === 0) return '100px';

    // Encontrar el label más largo
    const maxLength = Math.max(...options.map((s) => s.label.length));

    // Calcular ancho aproximado: cada carácter ~8px + padding ~24px
    // Usar un mínimo de 100px para labels cortos
    const calculatedWidth = Math.max(100, maxLength * 8 + 24);
    return `${calculatedWidth}px`;
  });

  public applications = computed(() => this.jobApplicationsStore.entities());

  public filteredApplications = computed(() => {
    const status = this.statusFilter.value;
    const apps = this.applications();

    if (!status) {
      return apps;
    }

    return apps.filter((app) => app.status === status);
  });

  constructor() {
    // Cargar el estado de la feria y fecha de entrevistas desde settings
    effect(() => {
      const settings = this.jobFairSettingsApi.value();
      if (settings && settings.length > 0) {
        const enabledSetting = settings.find(
          (s) => s.key === 'job_fair_enabled'
        );

        if (enabledSetting) {
          this.jobFairEnabled.set(enabledSetting.value === 'true');
        }

        // Cargar rango de fechas de la feria
        const startDateSetting = settings.find(
          (s) => s.key === 'job_fair_start_date'
        );
        const endDateSetting = settings.find(
          (s) => s.key === 'job_fair_end_date'
        );

        const startDate = startDateSetting?.value
          ? this.parseLocalDateString(startDateSetting.value)
          : null;
        const endDate = endDateSetting?.value
          ? this.parseLocalDateString(endDateSetting.value)
          : null;

        if (startDate || endDate) {
          this.jobFairDateRange = [
            startDate && !isNaN(startDate.getTime()) ? startDate : null,
            endDate && !isNaN(endDate.getTime()) ? endDate : null,
          ] as (Date | null)[];
        } else {
          this.jobFairDateRange = null;
        }
      }
    });
  }

  ngOnInit() {
    // Cargar aplicaciones al inicializar
    if (this.applications().length === 0) {
      this.jobApplicationsStore.reloadItems();
    }
    // Cargar posiciones al inicializar
    if (this.positions().length === 0) {
      this.positionsStore.reloadItems();
    }
    // Cargar estados personalizados
    this.statusesApi.reload();
  }

  async onJobFairDateRangeChange() {
    this.isUpdatingInterviewDate.set(true);
    try {
      const dateRange = this.jobFairDateRange;
      if (!dateRange || dateRange.length === 0 || (!dateRange[0] && !dateRange[1])) {
        // Si se limpió el rango, eliminar ambos settings
        await this.clearJobFairDates();
        this.messageService.add({
          severity: 'success',
          summary: 'Duración eliminada',
          detail: 'La duración de la feria ha sido eliminada',
        });
        this.jobFairSettingsApi.reload();
        this.isUpdatingInterviewDate.set(false);
        return;
      }
      
      const [startDate, endDate] = dateRange;

      // Normalizar las fechas para asegurar que estén en hora local a medianoche
      let normalizedStartDate: Date | null = null;
      let normalizedEndDate: Date | null = null;

      if (startDate) {
        normalizedStartDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        );
      }

      if (endDate) {
        normalizedEndDate = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate()
        );
      }

      // Actualizar el rango con las fechas normalizadas
      this.jobFairDateRange = [normalizedStartDate, normalizedEndDate];

      // Formatear fechas en zona horaria local
      const startDateString = normalizedStartDate
        ? this.formatDateToLocalString(normalizedStartDate)
        : '';
      const endDateString = normalizedEndDate
        ? this.formatDateToLocalString(normalizedEndDate)
        : '';

      // Guardar fecha de inicio usando UPSERT (más robusto con RLS)
      if (startDateString) {
        // Primero intentar actualizar si existe
        const existingStartSettings = await firstValueFrom(
          this.http.get<any[]>(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
            {
              params: {
                select: 'id',
                key: 'eq.job_fair_start_date',
              },
            }
          )
        );

        if (existingStartSettings && existingStartSettings.length > 0) {
          // Actualizar existente usando PATCH con params
          await firstValueFrom(
            this.http.patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
              { value: startDateString },
              {
                params: {
                  id: `eq.${existingStartSettings[0].id}`,
                },
              }
            )
          );
        } else {
          // Crear nuevo usando POST
          await firstValueFrom(
            this.http.post(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
              {
                key: 'job_fair_start_date',
                value: startDateString,
                description: 'Fecha de inicio de la Feria de Empleo',
                category: 'job_fair',
                is_encrypted: false,
              }
            )
          );
        }
      } else {
        // Si no hay fecha, limpiar el setting existente
        const existingStartSettings = await firstValueFrom(
          this.http.get<any[]>(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
            {
              params: {
                select: 'id',
                key: 'eq.job_fair_start_date',
              },
            }
          )
        );

        if (existingStartSettings && existingStartSettings.length > 0) {
          await firstValueFrom(
            this.http.patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
              { value: '' },
              {
                params: {
                  id: `eq.${existingStartSettings[0].id}`,
                },
              }
            )
          );
        }
      }

      // Guardar fecha de fin usando UPSERT (más robusto con RLS)
      if (endDateString) {
        // Primero intentar actualizar si existe
        const existingEndSettings = await firstValueFrom(
          this.http.get<any[]>(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
            {
              params: {
                select: 'id',
                key: 'eq.job_fair_end_date',
              },
            }
          )
        );

        if (existingEndSettings && existingEndSettings.length > 0) {
          // Actualizar existente usando PATCH con params
          await firstValueFrom(
            this.http.patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
              { value: endDateString },
              {
                params: {
                  id: `eq.${existingEndSettings[0].id}`,
                },
              }
            )
          );
        } else {
          // Crear nuevo usando POST
          await firstValueFrom(
            this.http.post(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
              {
                key: 'job_fair_end_date',
                value: endDateString,
                description: 'Fecha de fin de la Feria de Empleo',
                category: 'job_fair',
                is_encrypted: false,
              }
            )
          );
        }
      } else {
        // Si no hay fecha, limpiar el setting existente
        const existingEndSettings = await firstValueFrom(
          this.http.get<any[]>(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
            {
              params: {
                select: 'id',
                key: 'eq.job_fair_end_date',
              },
            }
          )
        );

        if (existingEndSettings && existingEndSettings.length > 0) {
          await firstValueFrom(
            this.http.patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
              { value: '' },
              {
                params: {
                  id: `eq.${existingEndSettings[0].id}`,
                },
              }
            )
          );
        }
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Duración actualizada',
        detail:
          startDateString && endDateString
            ? `Duración de la feria actualizada: ${normalizedStartDate!.toLocaleDateString(
                'es-PA'
              )} - ${normalizedEndDate!.toLocaleDateString('es-PA')}`
            : startDateString
            ? `Fecha de inicio actualizada: ${normalizedStartDate!.toLocaleDateString(
                'es-PA'
              )}`
            : 'Duración de la feria eliminada',
      });

      // Recargar settings
      this.jobFairSettingsApi.reload();
    } catch (error: any) {
      console.error('Error actualizando duración de la feria:', error);
      const errorMessage = error?.error?.message || error?.message || 'Error desconocido';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `No se pudo actualizar la duración de la feria: ${errorMessage}`,
      });
    } finally {
      this.isUpdatingInterviewDate.set(false);
    }
  }

  // Formatear fecha a string YYYY-MM-DD usando hora local (no UTC)
  private formatDateToLocalString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Parsear string YYYY-MM-DD a Date en zona horaria local (no UTC)
  private parseLocalDateString(dateString: string): Date | null {
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
    const day = parseInt(parts[2], 10);
    
    // Crear fecha en hora local (no UTC)
    return new Date(year, month, day);
  }

  // Limpiar las fechas de la feria
  private async clearJobFairDates(): Promise<void> {
    const existingStartSettings = await firstValueFrom(
      this.http.get<any[]>(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
        {
          params: {
            select: 'id',
            key: 'eq.job_fair_start_date',
          },
        }
      )
    );

    const existingEndSettings = await firstValueFrom(
      this.http.get<any[]>(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
        {
          params: {
            select: 'id',
            key: 'eq.job_fair_end_date',
          },
        }
      )
    );

    if (existingStartSettings && existingStartSettings.length > 0) {
      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
          { value: '' },
          {
            params: {
              id: `eq.${existingStartSettings[0].id}`,
            },
          }
        )
      );
    }

    if (existingEndSettings && existingEndSettings.length > 0) {
      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
          { value: '' },
          {
            params: {
              id: `eq.${existingEndSettings[0].id}`,
            },
          }
        )
      );
    }
  }

  async onJobFairEnabledChange() {
    this.isUpdatingJobFairStatus.set(true);
    try {
      const newValue = this.jobFairEnabled() ? 'true' : 'false';

      // Verificar si ya existe el setting
      const existingSettings = await firstValueFrom(
        this.http.get<any[]>(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
          {
            params: {
              select: 'id',
              key: 'eq.job_fair_enabled',
            },
          }
        )
      );

      if (existingSettings && existingSettings.length > 0) {
        // Actualizar setting existente usando PATCH con params
        await firstValueFrom(
          this.http.patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
            { value: newValue },
            {
              params: {
                id: `eq.${existingSettings[0].id}`,
              },
            }
          )
        );
      } else {
        // Crear nuevo setting usando POST
        await firstValueFrom(
          this.http.post(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
            {
              key: 'job_fair_enabled',
              value: newValue,
              description: 'Estado de la Feria de Empleo',
              category: 'job_fair',
              is_encrypted: false,
            }
          )
        );
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Estado actualizado',
        detail: `La feria de empleo ha sido ${
          this.jobFairEnabled() ? 'activada' : 'desactivada'
        }`,
      });

      // Recargar settings
      this.jobFairSettingsApi.reload();
    } catch (error: any) {
      console.error('Error actualizando estado de la feria:', error);
      // Revertir el cambio
      this.jobFairEnabled.set(!this.jobFairEnabled());
      const errorMessage = error?.error?.message || error?.message || 'Error desconocido';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `No se pudo actualizar el estado de la feria: ${errorMessage}`,
      });
    } finally {
      this.isUpdatingJobFairStatus.set(false);
    }
  }

  refreshPositions() {
    this.positionsStore.reloadItems();
    this.messageService.add({
      severity: 'success',
      summary: 'Actualizado',
      detail: 'Lista de vacantes actualizada',
    });
  }

  editPosition(position?: Position) {
    const ref = this.dialog.open(PositionsFormComponent, {
      header: position ? 'Editar Vacante' : 'Añadir Vacante',
      width: '36rem',
      data: { position },
      modal: true,
    });

    ref.onClose.subscribe(() => {
      // Recargar posiciones después de cerrar el diálogo
      this.positionsStore.reloadItems();
    });
  }

  async togglePositionAvailability(position: Position, isAvailable: boolean) {
    this.isUpdatingPosition.set(true);
    try {
      // Ya no hay restricciones para Naz, todo funciona igual
      // (comentado porque ahora todas las tablas son compartidas)
      const companyId = this.organizationService.getCurrentCompanyId();
      const params: any = { id: `eq.${position.id}` };
      
      // Agregar filtro por company_id para seguridad
      if (companyId) {
        params.company_id = `eq.${companyId}`;
      }
      
      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/positions`,
          { available_for_job_fair: isAvailable },
          { params }
        )
      );

      // Actualizar el store local
      this.positionsStore.reloadItems();

      this.messageService.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: `La vacante "${position.name}" ha sido ${
          isAvailable ? 'habilitada' : 'deshabilitada'
        } para la feria de empleo`,
      });
    } catch (error: any) {
      console.error('Error updating position availability:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar la disponibilidad de la vacante',
      });
    } finally {
      this.isUpdatingPosition.set(false);
    }
  }

  refreshApplications() {
    this.jobApplicationsStore.reloadItems();
    this.messageService.add({
      severity: 'success',
      summary: 'Actualizado',
      detail: 'Lista de aplicaciones actualizada',
    });
  }

  openJobFairForm() {
    const baseUrl = process.env['ENV_APP_URL'] || window.location.origin;
    window.open(`${baseUrl}/job-fair`, '_blank');
  }

  viewDetails(application: JobApplication) {
    this.dialog.open(JobApplicationDetailComponent, {
      header: `Aplicación de ${application.first_name} ${application.last_name}`,
      width: '90vw',
      style: { 'max-width': '1200px' },
      data: { application },
      modal: true,
      dismissableMask: true, // Permite cerrar haciendo click fuera
      closeOnEscape: true, // Permite cerrar con ESC
    });
  }

  changeStatus(application: JobApplication) {
    const ref = this.dialog.open(JobApplicationStatusDialogComponent, {
      header: 'Cambiar Estado de Aplicación',
      width: '500px',
      modal: true,
      dismissableMask: true, // Permite cerrar haciendo click fuera
      closeOnEscape: true, // Permite cerrar con ESC
      data: {
        application,
        statusOptions: this.statusOptions(), // Pasar los estados dinámicos
      },
    });

    ref.onClose.subscribe((newStatus: JobApplication['status'] | null) => {
      if (newStatus) {
        this.updateStatus(application, newStatus);
      }
    });
  }

  private async updateStatus(application: JobApplication, newStatus: string) {
    try {
      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_applications?id=eq.${application.id}`,
          { status: newStatus }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Estado actualizado',
        detail: `El estado ha sido cambiado a "${this.getStatusLabel(
          newStatus as any
        )}"`,
      });

      // Recargar aplicaciones
      this.jobApplicationsStore.reloadItems();
    } catch (error: any) {
      console.error('Error updating status:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el estado',
      });
    }
  }

  private generateResumeFileName(application: JobApplication): string {
    // Obtener nombre completo
    const fullName = `${application.first_name || ''} ${
      application.last_name || ''
    }`.trim();

    // Obtener nombre del cargo
    const positionName =
      application.position_name || application.position?.name || 'Sin Cargo';

    // Obtener extensión del archivo original
    const originalFileName = application.resume_filename || '';
    const fileExtension = originalFileName.includes('.')
      ? originalFileName.substring(originalFileName.lastIndexOf('.'))
      : '.pdf';

    // Sanitizar nombres: remover caracteres especiales y espacios
    const sanitize = (str: string): string => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remover caracteres especiales
        .replace(/\s+/g, '_') // Reemplazar espacios con guión bajo
        .toLowerCase();
    };

    const sanitizedName = sanitize(fullName);
    const sanitizedPosition = sanitize(positionName);

    // Formato: Nombre_Apellido-Cargo.extensión
    return `${sanitizedName}-${sanitizedPosition}${fileExtension}`;
  }

  async downloadResume(application: JobApplication) {
    if (!application.resume_url) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin archivo',
        detail: 'Esta aplicación no tiene CV adjunto',
      });
      return;
    }

    try {
      // Descargar el archivo
      const response = await firstValueFrom(
        this.http.get(application.resume_url, { responseType: 'blob' })
      );

      // Crear un enlace temporal para descargar
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.generateResumeFileName(application);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.messageService.add({
        severity: 'success',
        summary: 'Descarga iniciada',
        detail: 'El CV se está descargando',
      });
    } catch (error: any) {
      console.error('Error downloading resume:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo descargar el CV',
      });
    }
  }

  exportToExcel() {
    try {
      const applications = this.filteredApplications();

      if (applications.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Sin datos',
          detail: 'No hay aplicaciones para exportar',
        });
        return;
      }

      // Preparar datos para Excel
      const data = applications.map((app) => ({
        Fecha: app.created_at
          ? new Date(app.created_at).toLocaleDateString('es-PA')
          : '',
        Nombre: `${app.first_name} ${app.last_name}`,
        Email: app.email,
        Teléfono: app.phone_number,
        Provincia: app.province || 'N/A',
        'Laborando Actualmente': app.currently_working ? 'Sí' : 'No',
        'Aspiración Salarial': app.salary_expectation
          ? `B/. ${app.salary_expectation.toFixed(2)}`
          : 'N/A',
        Vacante: app.position_name || app.position?.name || 'N/A',
        Estado: this.getStatusLabel(app.status),
        'Fecha Entrevista': app.interview_date
          ? new Date(app.interview_date).toLocaleDateString('es-PA')
          : '',
        Notas: app.notes || '',
        'Información Adicional': app.additional_info || '',
      }));

      // Crear workbook y worksheet
      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Aplicaciones');

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 12 }, // Fecha
        { wch: 25 }, // Nombre
        { wch: 30 }, // Email
        { wch: 15 }, // Teléfono
        { wch: 15 }, // Provincia
        { wch: 20 }, // Laborando Actualmente
        { wch: 18 }, // Aspiración Salarial
        { wch: 25 }, // Vacante
        { wch: 12 }, // Estado
        { wch: 15 }, // Fecha Entrevista
        { wch: 30 }, // Notas
        { wch: 40 }, // Información Adicional
      ];
      ws['!cols'] = colWidths;

      // Generar nombre de archivo con fecha
      const fileName = `Aplicaciones_${
        new Date().toISOString().split('T')[0]
      }.xlsx`;

      // Descargar archivo
      writeFile(wb, fileName);

      this.messageService.add({
        severity: 'success',
        summary: 'Exportado',
        detail: `Se exportaron ${applications.length} aplicaciones a Excel`,
      });
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo exportar a Excel',
      });
    }
  }

  getStatusLabel(status: JobApplication['status']): string {
    const statusOption = this.statusOptions().find((s) => s.code === status);
    return statusOption?.label || status;
  }

  getStatusSeverity(
    status: JobApplication['status']
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const statusOption = this.statusOptions().find((s) => s.code === status);
    return (statusOption?.severity as any) || 'secondary';
  }

  manageStatuses() {
    // Abrir diálogo para gestionar estados
    const ref = this.dialog.open(JobApplicationStatusesDialogComponent, {
      header: 'Gestionar Estados de Aplicaciones',
      width: '800px',
      modal: true,
      dismissableMask: true, // Permite cerrar haciendo click fuera
      closeOnEscape: true, // Permite cerrar con ESC
    });

    ref.onClose.subscribe((result: any) => {
      // Recargar estados después de cerrar el diálogo
      // Siempre recargar para asegurar que los nuevos estados estén disponibles
      // Usar un delay más largo para asegurar que la petición HTTP se complete
      setTimeout(() => {
        this.statusesApi.reload();
        // Forzar una segunda recarga después de un breve delay para asegurar que se actualice
        setTimeout(() => {
          this.statusesApi.reload();
        }, 500);
      }, 100);
    });
  }

  async toggleFavorite(application: JobApplication) {
    const newFavoriteValue = !application.is_favorite;
    try {
      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_applications?id=eq.${application.id}`,
          { is_favorite: newFavoriteValue }
        )
      );

      // Actualizar el store local
      this.jobApplicationsStore.reloadItems();

      this.messageService.add({
        severity: 'success',
        summary: 'Favorito actualizado',
        detail: newFavoriteValue
          ? 'Aplicación marcada como favorita'
          : 'Aplicación removida de favoritos',
      });
    } catch (error: any) {
      console.error('Error updating favorite:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el estado de favorito',
      });
    }
  }
}
