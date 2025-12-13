import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AdoptionApplication } from '../models';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';

@Component({
  selector: 'pt-admin-application-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    Card,
    InputText,
    TextareaModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="detail-container">
      @if (application()) {
      <div class="detail-header">
        <p-button
          icon="pi pi-arrow-left"
          label="Volver"
          severity="secondary"
          (onClick)="goBack()"
        />
        <h2>Detalles de Solicitud de Adopción</h2>
        <p-tag
          [value]="getStatusLabel(application()!.status)"
          [severity]="getStatusSeverity(application()!.status)"
        />
      </div>

      <div class="detail-content">
        <!-- Información del Solicitante -->
        <p-card>
          <ng-template pTemplate="header">
            <h3>Información del Solicitante</h3>
          </ng-template>
          <div class="info-grid">
            <div class="info-item">
              <label>Nombre:</label>
              <span>{{ application()!.applicant_name }}</span>
            </div>
            <div class="info-item">
              <label>Email:</label>
              <span>{{ application()!.applicant_email }}</span>
            </div>
            <div class="info-item">
              <label>Teléfono:</label>
              <span>{{ application()!.applicant_phone }}</span>
            </div>
            <div class="info-item">
              <label>Dirección:</label>
              <span>{{ application()!.applicant_address }}</span>
            </div>
            @if (application()!.applicant_document_id) {
            <div class="info-item">
              <label>Cédula:</label>
              <span>{{ application()!.applicant_document_id }}</span>
            </div>
            }
          </div>
        </p-card>

        <!-- Información de la Mascota -->
        <p-card>
          <ng-template pTemplate="header">
            <h3>Mascota Solicitada</h3>
          </ng-template>
          @if (application()!.pet) {
          <div class="info-grid">
            <div class="info-item">
              <label>Nombre:</label>
              <span class="pet-link" (click)="viewPet(application()!.pet_id)">
                {{ application()!.pet.name }}
              </span>
            </div>
            <div class="info-item">
              <label>Especie:</label>
              <span>{{ getSpeciesLabel(application()!.pet.species) }}</span>
            </div>
            <div class="info-item">
              <label>Fundación:</label>
              <span>{{ application()!.pet.foundation?.name || 'N/A' }}</span>
            </div>
          </div>
          }
        </p-card>

        <!-- Información del Hogar -->
        <p-card>
          <ng-template pTemplate="header">
            <h3>Información del Hogar</h3>
          </ng-template>
          <div class="info-grid">
            @if (application()!.reason_for_adoption) {
            <div class="info-item full-width">
              <label>Motivo de Adopción:</label>
              <span>{{ application()!.reason_for_adoption }}</span>
            </div>
            }
            @if (application()!.living_situation) {
            <div class="info-item">
              <label>Situación de Vivienda:</label>
              <span>{{ getLivingSituationLabel(application()!.living_situation) }}</span>
            </div>
            }
            <div class="info-item">
              <label>Tiene otras mascotas:</label>
              <span>{{ application()!.has_other_pets ? 'Sí' : 'No' }}</span>
            </div>
            @if (application()!.has_other_pets && application()!.other_pets_info) {
            <div class="info-item full-width">
              <label>Información sobre otras mascotas:</label>
              <span>{{ application()!.other_pets_info }}</span>
            </div>
            }
            <div class="info-item">
              <label>Tiene niños:</label>
              <span>{{ application()!.has_children ? 'Sí' : 'No' }}</span>
            </div>
            @if (application()!.has_children && application()!.children_info) {
            <div class="info-item full-width">
              <label>Información sobre los niños:</label>
              <span>{{ application()!.children_info }}</span>
            </div>
            }
            @if (application()!.personality && application()!.personality.length > 0) {
            <div class="info-item full-width">
              <label>Personalidad preferida:</label>
              <div class="personality-tags">
                @for (personality of application()!.personality; track personality) {
                <p-tag [value]="personality" />
                }
              </div>
            </div>
            }
          </div>
        </p-card>

        <!-- Notas del Administrador -->
        <p-card>
          <ng-template pTemplate="header">
            <h3>Notas del Administrador</h3>
          </ng-template>
          <div class="notes-section">
            <textarea
              pTextarea
              [(ngModel)]="notes"
              [rows]="4"
              placeholder="Agregar notas sobre esta solicitud..."
              class="notes-textarea"
            ></textarea>
            <p-button
              label="Guardar Notas"
              (onClick)="saveNotes()"
              [loading]="isSaving()"
              [disabled]="isSaving()"
            />
          </div>
        </p-card>

        <!-- Historial -->
        <p-card>
          <ng-template pTemplate="header">
            <h3>Historial</h3>
          </ng-template>
          <div class="history-section">
            <div class="history-item">
              <span class="history-date">Creada: {{ formatDate(application()!.created_at) }}</span>
            </div>
            @if (application()!.updated_at && application()!.updated_at !== application()!.created_at) {
            <div class="history-item">
              <span class="history-date">Actualizada: {{ formatDate(application()!.updated_at) }}</span>
            </div>
            }
          </div>
        </p-card>

        <!-- Acciones -->
        <div class="actions-section">
          @if (application()!.status === 'pending') {
          <p-button
            label="Aprobar Solicitud"
            icon="pi pi-check"
            severity="success"
            (onClick)="approveApplication()"
            [loading]="isLoading()"
          />
          <p-button
            label="Rechazar Solicitud"
            icon="pi pi-times"
            severity="danger"
            (onClick)="rejectApplication()"
            [loading]="isLoading()"
          />
          }
          @if (application()!.status === 'approved') {
          <p-button
            label="Marcar como Completada"
            icon="pi pi-check-circle"
            severity="info"
            (onClick)="completeApplication()"
            [loading]="isLoading()"
          />
          }
        </div>
      </div>
      } @else {
      <div class="loading-state">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem;"></i>
        <p>Cargando información de la solicitud...</p>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .detail-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        background: #ffffff;
      }

      .detail-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .detail-header h2 {
        flex: 1;
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      .detail-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .info-item.full-width {
        grid-column: 1 / -1;
      }

      .info-item label {
        font-weight: 600;
        color: #6b7280;
        font-size: 0.875rem;
      }

      .info-item span {
        color: #000000;
        font-size: 1rem;
      }

      .pet-link {
        color: #fbbf24;
        cursor: pointer;
        font-weight: 600;
        text-decoration: underline;
      }

      .pet-link:hover {
        color: #f59e0b;
      }

      .personality-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .notes-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .notes-textarea {
        width: 100%;
      }

      .history-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .history-item {
        padding: 0.5rem;
        background: #f9fafb;
        border-radius: 0.375rem;
      }

      .history-date {
        color: #6b7280;
        font-size: 0.875rem;
      }

      .actions-section {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 0.5rem;
      }

      .loading-state {
        text-align: center;
        padding: 4rem 2rem;
        color: #6b7280;
      }

      ::ng-deep .p-card .p-card-header h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #000000;
        margin: 0;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e5e7eb;
      }

      @media (max-width: 768px) {
        .detail-container {
          padding: 1rem;
        }

        .detail-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .info-grid {
          grid-template-columns: 1fr;
        }

        .actions-section {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class AdminApplicationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);
  public applicationsStore = inject(AdoptionApplicationsStore);

  public application = signal<AdoptionApplication | null>(null);
  public notes = signal('');
  public isSaving = signal(false);
  public isLoading = signal(false);

  constructor() {
    // Escuchar cambios en las entidades del store
    effect(() => {
      const entities = this.applicationsStore.entities();
      const currentApp = this.application();
      if (currentApp) {
        const updatedApp = entities.find((a) => a.id === currentApp.id);
        if (updatedApp && updatedApp !== currentApp) {
          this.application.set(updatedApp);
          this.notes.set(updatedApp.notes || '');
        }
      }
    });
  }

  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('id');
    if (applicationId) {
      this.applicationsStore.selectEntity(applicationId);
      const selected = this.applicationsStore.selectedEntity();
      if (selected) {
        this.application.set(selected);
        this.notes.set(selected.notes || '');
      } else {
        // Si no está en el store, buscar en las entidades
        const app = this.applicationsStore.entities().find((a) => a.id === applicationId);
        if (app) {
          this.application.set(app);
          this.notes.set(app.notes || '');
        }
      }
    }
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

  public getStatusSeverity(status: string): string {
    const severities: Record<string, string> = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
      completed: 'info',
    };
    return severities[status] || 'secondary';
  }

  public getSpeciesLabel(species: string): string {
    const labels: Record<string, string> = {
      dog: 'Perro',
      cat: 'Gato',
      other: 'Otro',
    };
    return labels[species] || species;
  }

  public getLivingSituationLabel(situation: string): string {
    const labels: Record<string, string> = {
      casa_propia: 'Casa propia',
      casa_alquilada: 'Casa alquilada',
      apartamento_propio: 'Apartamento propio',
      apartamento_alquilado: 'Apartamento alquilado',
      otro: 'Otro',
    };
    return labels[situation] || situation;
  }

  public formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  public viewPet(petId: string | undefined): void {
    if (petId) {
      this.router.navigate(['/adoptions/admin'], {
        queryParams: { petId, tab: 'pets' },
      });
    }
  }

  public saveNotes(): void {
    const app = this.application();
    if (!app) return;

    this.isSaving.set(true);
    const updated: AdoptionApplication = {
      ...app,
      notes: this.notes(),
    };
    this.applicationsStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Notas guardadas',
          detail: 'Las notas se han guardado correctamente',
        });
        this.application.set(updated);
        this.isSaving.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron guardar las notas',
        });
        this.isSaving.set(false);
      },
    });
  }

  public approveApplication(): void {
    const app = this.application();
    if (!app) return;

    this.isLoading.set(true);
    const updated: AdoptionApplication = {
      ...app,
      status: 'approved',
    };
    this.applicationsStore.editItem(updated).subscribe({
      next: () => {
        // Actualizar desde el store para obtener los datos más recientes
        const updatedApp = this.applicationsStore.entities().find((a) => a.id === app.id);
        if (updatedApp) {
          this.application.set(updatedApp);
        } else {
          this.application.set(updated);
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Solicitud aprobada',
          detail: 'La solicitud ha sido aprobada correctamente',
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al aprobar solicitud:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo aprobar la solicitud',
        });
        this.isLoading.set(false);
      },
    });
  }

  public rejectApplication(): void {
    const app = this.application();
    if (!app) return;

    this.isLoading.set(true);
    const updated: AdoptionApplication = {
      ...app,
      status: 'rejected',
    };
    this.applicationsStore.editItem(updated).subscribe({
      next: () => {
        // Actualizar desde el store para obtener los datos más recientes
        const updatedApp = this.applicationsStore.entities().find((a) => a.id === app.id);
        if (updatedApp) {
          this.application.set(updatedApp);
        } else {
          this.application.set(updated);
        }
        this.messageService.add({
          severity: 'info',
          summary: 'Solicitud rechazada',
          detail: 'La solicitud ha sido rechazada',
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al rechazar solicitud:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo rechazar la solicitud',
        });
        this.isLoading.set(false);
      },
    });
  }

  public completeApplication(): void {
    const app = this.application();
    if (!app) return;

    this.isLoading.set(true);
    const updated: AdoptionApplication = {
      ...app,
      status: 'completed',
    };
    // Usar updateApplicationStatus para manejar la lógica especial cuando se completa
    const store = this.applicationsStore as any;
    if (store.updateApplicationStatus) {
      store.updateApplicationStatus(updated).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Adopción completada',
            detail: 'La adopción ha sido marcada como completada y la mascota ya no está disponible',
          });
          this.application.set(updated);
          this.isLoading.set(false);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo completar la adopción',
          });
          this.isLoading.set(false);
        },
      });
    } else {
      // Fallback al método normal
      this.applicationsStore.editItem(updated).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Adopción completada',
            detail: 'La adopción ha sido marcada como completada',
          });
          this.application.set(updated);
          this.isLoading.set(false);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo completar la adopción',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public goBack(): void {
    this.router.navigate(['/adoptions/admin'], { queryParams: { tab: 'applications' } });
  }
}

