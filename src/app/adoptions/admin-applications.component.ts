import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AdoptionApplication } from '../models';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';

// Tipo extendido para incluir el mÃ©todo personalizado
type AdoptionApplicationsStoreWithCustomMethods = InstanceType<typeof AdoptionApplicationsStore> & {
  updateApplicationStatus: (request: AdoptionApplication) => import('rxjs').Observable<any>;
};

@Component({
  selector: 'pt-admin-applications',
  standalone: true,
  changeDetection: import('@angular/core').ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DialogModule,
    InputText,
    SelectModule,
    TagModule,
    ToastModule,
    Card,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="applications-container">
      <p-card>
        <ng-template pTemplate="header">
          <div class="card-header">
            <h3>GestiÃ³n de Solicitudes de AdopciÃ³n</h3>
            <div class="header-stats">
              <span class="stat-badge pending">
                Pendientes: {{ pendingCount() }}
              </span>
              <span class="stat-badge approved">
                Aprobadas: {{ approvedCount() }}
              </span>
            </div>
          </div>
        </ng-template>

        <p-table
          [value]="filteredApplications()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['applicant_name', 'applicant_email', 'pet.name']"
          styleClass="p-datatable-striped"
          [loading]="applicationsStore.isLoading()"
        >
          <ng-template pTemplate="caption">
            <div class="table-filters">
              <span class="p-input-icon-left">
                <i class="pi pi-search"></i>
                <input
                  type="text"
                  pInputText
                  placeholder="Buscar por nombre, email o mascota..."
                  (input)="onGlobalFilter($event)"
                />
              </span>
              <p-select
                [options]="statusOptions"
                [(ngModel)]="selectedStatus"
                placeholder="Filtrar por estado"
                [showClear]="true"
                styleClass="filter-select"
                (onChange)="onStatusFilterChange()"
              />
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Solicitante</th>
              <th>Email</th>
              <th>TelÃ©fono</th>
              <th>Mascota</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-application>
            <tr>
              <td>{{ application.applicant_name }}</td>
              <td>{{ application.applicant_email }}</td>
              <td>{{ application.applicant_phone }}</td>
              <td>
                <span class="pet-name-link" (click)="viewPet(application.pet_id)">
                  {{ application.pet?.name || 'N/A' }}
                </span>
              </td>
              <td>
                <p-tag
                  [value]="getStatusLabel(application.status)"
                  [severity]="getStatusSeverity(application.status)"
                />
              </td>
              <td>{{ formatDate(application.created_at) }}</td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    severity="info"
                    (onClick)="viewDetails(application)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Ver detalles"
                  />
                  @if (application.status === 'pending') {
                  <p-button
                    icon="pi pi-check"
                    [text]="true"
                    severity="success"
                    (onClick)="approveApplication(application)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Aprobar"
                  />
                  <p-button
                    icon="pi pi-times"
                    [text]="true"
                    severity="danger"
                    (onClick)="rejectApplication(application)"
                    title="Rechazar"
                  />
                  }
                  @if (application.status === 'approved') {
                  <p-button
                    icon="pi pi-check-circle"
                    [text]="true"
                    severity="info"
                    (onClick)="completeApplication(application)"
                    title="Marcar como completada"
                  />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7">No se encontraron solicitudes</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `,
  styles: [
    `
      .applications-container {
        width: 100%;
        position: relative;
        overflow-x: hidden;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 1rem 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .card-header h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #000000;
        margin: 0;
      }

      .header-stats {
        display: flex;
        gap: 1rem;
      }

      .stat-badge {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 600;
        font-size: 0.875rem;
      }

      .stat-badge.pending {
        background: #fef3c7;
        color: #92400e;
      }

      .stat-badge.approved {
        background: #d1fae5;
        color: #065f46;
      }

      .table-filters {
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        margin-bottom: 1rem;
        flex-wrap: wrap;
      }

      .table-filters .p-input-icon-left {
        flex: 1;
        min-width: 250px;
      }

      .filter-select {
        min-width: 200px;
      }

      .pet-name-link {
        color: #fbbf24;
        cursor: pointer;
        font-weight: 600;
        text-decoration: underline;
      }

      .pet-name-link:hover {
        color: #f59e0b;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      ::ng-deep .p-card .p-card-header {
        padding: 0;
      }

      /* Asegurar que las tablas no se desborden */
      ::ng-deep .p-datatable {
        overflow-x: auto;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }

      @media (max-width: 768px) {
        .card-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .table-filters {
          flex-direction: column;
        }

        .table-filters .p-input-icon-left,
        .filter-select {
          width: 100%;
        }
      }
    `,
  ],
})
export class AdminApplicationsComponent {
  public applicationsStore = inject(AdoptionApplicationsStore);
  private router = inject(Router);
  private messageService = inject(MessageService);

  public selectedStatus = signal<string | null>(null);
  public globalFilterText = signal('');

  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
    { label: 'Completada', value: 'completed' },
  ];

  public filteredApplications = computed(() => {
    let apps = this.applicationsStore.entities();
    const statusFilter = this.selectedStatus();
    const searchText = this.globalFilterText().toLowerCase();

    if (statusFilter) {
      apps = apps.filter((app) => app.status === statusFilter);
    }

    if (searchText) {
      apps = apps.filter(
        (app) =>
          app.applicant_name.toLowerCase().includes(searchText) ||
          app.applicant_email.toLowerCase().includes(searchText) ||
          app.pet?.name?.toLowerCase().includes(searchText)
      );
    }

    return apps;
  });

  public pendingCount = computed(() =>
    this.applicationsStore.entities().filter((app) => app.status === 'pending').length
  );

  public approvedCount = computed(() =>
    this.applicationsStore.entities().filter((app) => app.status === 'approved').length
  );

  public onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilterText.set(target.value);
  }

  public onStatusFilterChange(): void {
    // El filtro se aplica automÃ¡ticamente en el computed
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      completed: 'Completada',
    };
    return labels[status] || status;
  }

  public getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    const severities: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | undefined> = {
      pending: 'warn',
      approved: 'success',
      rejected: 'danger',
      completed: 'info',
    };
    return severities[status] || 'secondary';
  }

  public formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  public viewDetails(application: AdoptionApplication): void {
    // Navegar a la vista de detalles
    this.router.navigate(['/adoptions/admin/applications', application.id]);
  }

  public viewPet(petId: string | undefined): void {
    if (petId) {
      // Navegar a la vista de la mascota en el panel
      this.router.navigate(['/adoptions/admin'], {
        queryParams: { petId, tab: 'pets' },
      });
    }
  }

  public approveApplication(application: AdoptionApplication): void {
    const updated: AdoptionApplication = {
      ...application,
      status: 'approved',
    };
    this.applicationsStore.editItem(updated).subscribe({
      next: () => {
        // Refrescar los items para asegurar que se actualice la vista
        this.applicationsStore.reloadItems();
        this.messageService.add({
          severity: 'success',
          summary: 'Solicitud aprobada',
          detail: 'La solicitud ha sido aprobada correctamente',
        });
      },
      error: (error) => {
        console.error('Error al aprobar solicitud:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo aprobar la solicitud',
        });
      },
    });
  }

  public rejectApplication(application: AdoptionApplication): void {
    const updated: AdoptionApplication = {
      ...application,
      status: 'rejected',
    };
    this.applicationsStore.editItem(updated).subscribe({
      next: () => {
        // Refrescar los items para asegurar que se actualice la vista
        this.applicationsStore.reloadItems();
        this.messageService.add({
          severity: 'info',
          summary: 'Solicitud rechazada',
          detail: 'La solicitud ha sido rechazada',
        });
      },
      error: (error) => {
        console.error('Error al rechazar solicitud:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo rechazar la solicitud',
        });
      },
    });
  }

  public completeApplication(application: AdoptionApplication): void {
    const updated: AdoptionApplication = {
      ...application,
      status: 'completed',
    };
    // Usar updateApplicationStatus para manejar la lÃ³gica especial cuando se completa
    const store = this.applicationsStore as AdoptionApplicationsStoreWithCustomMethods;
    store.updateApplicationStatus(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'AdopciÃ³n completada',
          detail: 'La adopciÃ³n ha sido marcada como completada y la mascota ya no estÃ¡ disponible',
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo completar la adopciÃ³n',
        });
      },
    });
  }
}


