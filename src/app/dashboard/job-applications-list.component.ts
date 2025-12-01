import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { utils, writeFile } from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { JobApplication, Position } from '../models';
import { DashboardStore } from '../stores/dashboard.store';
import { JobApplicationsStore } from '../stores/job-applications.store';
import { PositionsStore } from '../stores/positions.store';
import { JobApplicationDetailComponent } from './job-application-detail.component';
import { JobApplicationStatusDialogComponent } from './job-application-status-dialog.component';

@Component({
  selector: 'pt-job-applications-list',
  imports: [
    DatePipe,
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
  ],
  providers: [
    DynamicDialogRef,
    DialogService,
    MessageService,
    ConfirmationService,
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
          <div class="flex gap-2">
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
            [globalFilterFields]="['first_name', 'last_name', 'email', 'position_name', 'status']"
            paginatorDropdownAppendTo="body"
            [showCurrentPageReport]="true"
            currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} aplicaciones"
          >
        <ng-template #caption>
          <div class="flex gap-4 items-center flex-wrap">
            <div class="flex gap-2 items-center">
              <label class="text-sm text-gray-300">Filtrar por estado:</label>
              <p-select
                [options]="statusOptions"
                [ngModel]="statusFilter.value"
                (ngModelChange)="statusFilter.setValue($event)"
                placeholder="Todos los estados"
                [showClear]="true"
                appendTo="body"
                styleClass="w-48"
              />
            </div>
            <div class="flex gap-2 items-center">
              <label class="text-sm text-gray-300">Buscar:</label>
              <input
                pInputText
                type="text"
                (input)="dt.filterGlobal($any($event.target).value, 'contains')"
                placeholder="Buscar por nombre, email, posición..."
                class="w-64"
              />
            </div>
          </div>
        </ng-template>
        <ng-template #header>
          <tr>
            <th pSortableColumn="created_at">
              Fecha <p-sortIcon field="created_at" />
            </th>
            <th pSortableColumn="first_name">
              Nombre <p-sortIcon field="first_name" />
            </th>
            <th pSortableColumn="email">
              Email <p-sortIcon field="email" />
            </th>
            <th pSortableColumn="phone_number">Teléfono</th>
            <th pSortableColumn="position_name">
              Vacante <p-sortIcon field="position_name" />
            </th>
            <th pSortableColumn="status">
              Estado <p-sortIcon field="status" />
            </th>
            <th>CV</th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template #body let-application>
          <tr class="hover:bg-neutral-800/50 transition-colors">
            <td class="text-gray-300">
              {{ application.created_at | date : 'short' }}
            </td>
            <td class="font-medium text-white">
              {{ application.first_name }} {{ application.last_name }}
            </td>
            <td class="text-gray-300">{{ application.email }}</td>
            <td class="text-gray-300">{{ application.phone_number }}</td>
            <td class="text-gray-300">
              {{ application.position_name || application.position?.name || 'N/A' }}
            </td>
            <td>
              <p-tag
                [value]="getStatusLabel(application.status)"
                [severity]="getStatusSeverity(application.status)"
              />
            </td>
            <td>
              @if (application.resume_url) {
              <p-button
                icon="pi pi-download"
                severity="info"
                text
                rounded
                (onClick)="downloadResume(application)"
                pTooltip="Descargar CV"
              />
              } @else {
              <span class="text-gray-500 text-sm">Sin CV</span>
              }
            </td>
            <td>
              <div class="flex gap-2">
                <p-button
                  icon="pi pi-eye"
                  severity="info"
                  text
                  rounded
                  (onClick)="viewDetails(application)"
                  pTooltip="Ver detalles"
                />
                <p-button
                  icon="pi pi-pencil"
                  severity="success"
                  text
                  rounded
                  (onClick)="changeStatus(application)"
                  pTooltip="Cambiar estado"
                />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td [attr.colspan]="8" class="text-center py-8">
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
              Habilita o deshabilita las vacantes que aparecerán en el formulario de Feria de Empleo.
              Solo las vacantes habilitadas serán visibles para los candidatos.
            </p>
            <p-button
              icon="pi pi-refresh"
              severity="secondary"
              label="Actualizar"
              (onClick)="refreshPositions()"
              rounded
              [loading]="positionsStore.isLoading()"
              class="mb-4"
            />
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
            <ng-template #caption>
              <div class="flex gap-2 items-center">
                <input
                  pInputText
                  type="text"
                  (input)="positionsTable.filterGlobal($any($event.target).value, 'contains')"
                  placeholder="Buscar vacante..."
                  class="w-64"
                />
              </div>
            </ng-template>
            <ng-template #header>
              <tr>
                <th pSortableColumn="name">
                  Vacante <p-sortIcon field="name" />
                </th>
                <th pSortableColumn="department.name">
                  Área <p-sortIcon field="department.name" />
                </th>
                <th>Disponible en Feria</th>
              </tr>
            </ng-template>
            <ng-template #body let-position>
              <tr class="hover:bg-neutral-800/50 transition-colors">
                <td class="font-medium text-white">{{ position.name }}</td>
                <td class="text-gray-300">{{ position.department?.name || 'N/A' }}</td>
                <td>
                  <p-toggleswitch
                    [ngModel]="position.available_for_job_fair !== false"
                    (ngModelChange)="togglePositionAvailability(position, $event)"
                    [disabled]="isUpdatingPosition()"
                  />
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td [attr.colspan]="3" class="text-center py-8">
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobApplicationsListComponent implements OnInit {
  readonly store = inject(DashboardStore);
  readonly jobApplicationsStore = inject(JobApplicationsStore);
  readonly positionsStore = inject(PositionsStore);
  private dialog = inject(DialogService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private http = inject(HttpClient);
  private router = inject(Router);

  public statusFilter = new FormControl<string | null>(null);
  public isUpdatingPosition = signal<boolean>(false);

  public positions = computed(() => this.positionsStore.entities());
  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Revisada', value: 'reviewed' },
    { label: 'Contactada', value: 'contacted' },
    { label: 'Rechazada', value: 'rejected' },
    { label: 'Contratada', value: 'hired' },
  ];

  public applications = computed(() => this.jobApplicationsStore.entities());

  public filteredApplications = computed(() => {
    const status = this.statusFilter.value;
    const apps = this.applications();
    
    if (!status) {
      return apps;
    }
    
    return apps.filter((app) => app.status === status);
  });

  ngOnInit() {
    // Cargar aplicaciones al inicializar
    if (this.applications().length === 0) {
      this.jobApplicationsStore.reloadItems();
    }
    // Cargar posiciones al inicializar
    if (this.positions().length === 0) {
      this.positionsStore.reloadItems();
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

  async togglePositionAvailability(position: Position, isAvailable: boolean) {
    this.isUpdatingPosition.set(true);
    try {
      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/positions?id=eq.${position.id}`,
          { available_for_job_fair: isAvailable }
        )
      );

      // Actualizar el store local
      this.positionsStore.reloadItems();

      this.messageService.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: `La vacante "${position.name}" ha sido ${isAvailable ? 'habilitada' : 'deshabilitada'} para la feria de empleo`,
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

  viewDetails(application: JobApplication) {
    this.dialog.open(JobApplicationDetailComponent, {
      header: `Aplicación de ${application.first_name} ${application.last_name}`,
      width: '90vw',
      style: { 'max-width': '1200px' },
      data: { application },
    });
  }

  changeStatus(application: JobApplication) {
    const ref = this.dialog.open(JobApplicationStatusDialogComponent, {
      header: 'Cambiar Estado de Aplicación',
      width: '500px',
      data: { application },
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
        detail: `El estado ha sido cambiado a "${this.getStatusLabel(newStatus as any)}"`,
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
      link.download = application.resume_filename || `CV_${application.first_name}_${application.last_name}.pdf`;
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
        'Fecha': app.created_at ? new Date(app.created_at).toLocaleDateString('es-PA') : '',
        'Nombre': `${app.first_name} ${app.last_name}`,
        'Email': app.email,
        'Teléfono': app.phone_number,
        'Vacante': app.position_name || app.position?.name || 'N/A',
        'Estado': this.getStatusLabel(app.status),
        'Fecha Entrevista': app.interview_date ? new Date(app.interview_date).toLocaleDateString('es-PA') : '',
        'Notas': app.notes || '',
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
        { wch: 25 }, // Vacante
        { wch: 12 }, // Estado
        { wch: 15 }, // Fecha Entrevista
        { wch: 30 }, // Notas
        { wch: 40 }, // Información Adicional
      ];
      ws['!cols'] = colWidths;

      // Generar nombre de archivo con fecha
      const fileName = `Aplicaciones_${new Date().toISOString().split('T')[0]}.xlsx`;

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
    const labels: Record<JobApplication['status'], string> = {
      pending: 'Pendiente',
      reviewed: 'Revisada',
      contacted: 'Contactada',
      rejected: 'Rechazada',
      hired: 'Contratada',
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: JobApplication['status']): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severities: Record<JobApplication['status'], 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      pending: 'warn',
      reviewed: 'info',
      contacted: 'info',
      rejected: 'danger',
      hired: 'success',
    };
    return severities[status] || 'secondary';
  }
}

