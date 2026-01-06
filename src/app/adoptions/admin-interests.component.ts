import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { PetInterest } from '../models';
import { PetInterestsStore } from '../stores/pet-interests.store';
import { PetsStore } from '../stores/pets.store';

@Component({
  selector: 'pt-admin-interests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DialogModule,
    InputText,
    TextareaModule,
    SelectModule,
    TagModule,
    ToastModule,
    Card,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="interests-container">
      <div class="section-header">
        <h2>GestiÃ³n de Intereses en Mascotas</h2>
        <div class="header-stats">
          <span class="stat-item">
            <strong>{{ activeInterests().length }}</strong> Activos
          </span>
          <span class="stat-item">
            <strong>{{ contactedInterests().length }}</strong> Contactados
          </span>
          <span class="stat-item">
            <strong>{{ convertedInterests().length }}</strong> Convertidos
          </span>
        </div>
      </div>

      <p-card>
        <p-table
          [value]="interestsStore.entities()"
          [paginator]="true"
          [rows]="20"
          [rowsPerPageOptions]="[10, 20, 50, 100]"
          [globalFilterFields]="['user_email', 'user_name', 'pet.name', 'notes']"
          styleClass="p-datatable-striped"
          [loading]="interestsStore.isLoading()"
          [sortField]="'created_at'"
          [sortOrder]="-1"
          [filters]="globalFilters()"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <input
                type="text"
                pInputText
                placeholder="Buscar intereses..."
                (input)="onGlobalFilter($event)"
                class="search-input"
              />
              <p-select
                [(ngModel)]="selectedStatus"
                [options]="statusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Filtrar por estado"
                [showClear]="true"
                (onChange)="onStatusFilterChange()"
                [style]="{ width: '200px' }"
              />
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Mascota</th>
              <th>Usuario</th>
              <th>Email</th>
              <th>TelÃ©fono</th>
              <th>Notas</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-interest>
            <tr>
              <td>
                <div class="table-cell-content">
                  @if (interest.pet) {
                    <div class="pet-info-cell">
                      <strong>{{ interest.pet.name }}</strong>
                      <span class="pet-species">{{ getSpeciesLabel(interest.pet.species) }}</span>
                    </div>
                  } @else {
                    <span class="text-muted">Mascota eliminada</span>
                  }
                </div>
              </td>
              <td><div class="table-cell-content">{{ interest.user_name || 'N/A' }}</div></td>
              <td><div class="table-cell-content">{{ interest.user_email }}</div></td>
              <td><div class="table-cell-content">{{ interest.user_phone || 'N/A' }}</div></td>
              <td>
                <div class="table-cell-content">
                  @if (interest.notes) {
                    <span [title]="interest.notes">{{ interest.notes.length > 50 ? (interest.notes.substring(0, 50) + '...') : interest.notes }}</span>
                  } @else {
                    <span class="text-muted">Sin notas</span>
                  }
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  <p-tag
                    [value]="getStatusLabel(interest.status)"
                    [severity]="getStatusSeverity(interest.status)"
                  />
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  {{ formatDate(interest.created_at) }}
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(interest)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Editar"
                  />
                  <p-button
                    [icon]="interest.status === 'active' ? 'pi pi-check' : 'pi pi-refresh'"
                    [text]="true"
                    [severity]="interest.status === 'active' ? 'success' : 'secondary'"
                    (onClick)="markAsContacted(interest)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="interest.status === 'active' ? 'Marcar como Contactado' : 'Marcar como Activo'"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    severity="danger"
                    (onClick)="deleteInterest(interest)"
                    title="Eliminar"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="8">No se encontraron intereses</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para editar interÃ©s -->
    <p-dialog
      [visible]="showInterestDialog()"
      (visibleChange)="showInterestDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '600px' }"
      [header]="'Editar InterÃ©s'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="saveInterest()" class="interest-form">
        <div class="form-group">
          <label for="user_email">Email del Usuario *</label>
          <input
            id="user_email"
            type="email"
            pInputText
            [(ngModel)]="interestForm.user_email"
            name="user_email"
            required
            [disabled]="isLoading()"
            placeholder="usuario@ejemplo.com"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="user_name">Nombre del Usuario</label>
            <input
              id="user_name"
              type="text"
              pInputText
              [(ngModel)]="interestForm.user_name"
              name="user_name"
              [disabled]="isLoading()"
              placeholder="Nombre completo"
            />
          </div>
          <div class="form-group">
            <label for="user_phone">TelÃ©fono</label>
            <input
              id="user_phone"
              type="text"
              pInputText
              [(ngModel)]="interestForm.user_phone"
              name="user_phone"
              [disabled]="isLoading()"
              placeholder="+507 6123-4567"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="status">Estado *</label>
          <p-select
            id="status"
            [(ngModel)]="interestForm.status"
            name="status"
            [options]="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccionar estado"
            [disabled]="isLoading()"
            required
            [style]="{ width: '100%' }"
          />
        </div>

        <div class="form-group">
          <label for="notes">Notas</label>
          <textarea
            id="notes"
            pTextarea
            [(ngModel)]="interestForm.notes"
            name="notes"
            [rows]="3"
            [disabled]="isLoading()"
            placeholder="Notas adicionales sobre este interÃ©s..."
          ></textarea>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            label="Actualizar"
            [loading]="isLoading()"
            [disabled]="isLoading()"
            [style]="{
              background: '#fbbf24',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold',
              padding: '0.75rem 2rem'
            }"
          />
          <p-button
            type="button"
            label="Cancelar"
            severity="secondary"
            (onClick)="resetForm()"
            [disabled]="isLoading()"
            [style]="{
              background: '#e5e7eb',
              border: 'none',
              color: '#374151',
              padding: '0.75rem 2rem'
            }"
          />
        </div>
      </form>
    </p-dialog>
  `,
  styles: [
    `
      .interests-container {
        width: 100%;
        position: relative;
        overflow-x: hidden;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding: 1rem 0;
        border-bottom: 2px solid #e5e7eb;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .section-header h2 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        flex: 1;
        min-width: 200px;
      }

      .header-stats {
        display: flex;
        gap: 1.5rem;
        align-items: center;
      }

      .stat-item {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .stat-item strong {
        color: #fbbf24;
        font-size: 1.125rem;
        margin-right: 0.25rem;
      }

      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        gap: 1rem;
      }

      .search-input {
        flex: 1;
        max-width: 400px;
      }

      /* Asegurar que las tablas no se desborden */
      ::ng-deep .p-datatable {
        overflow-x: auto;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }

      /* Estilo para el contenido de las celdas de la tabla */
      ::ng-deep .p-datatable td .table-cell-content {
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
        padding: 0.5rem 0;
      }

      /* Asegurar que los diÃ¡logos no se sobrepongan */
      ::ng-deep .p-dialog {
        z-index: 1100 !important;
        position: fixed !important;
      }

      .pet-info-cell {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .pet-info-cell strong {
        color: #000000;
        font-weight: 600;
      }

      .pet-species {
        font-size: 0.75rem;
        color: #6b7280;
      }

      .text-muted {
        color: #9ca3af;
        font-style: italic;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .interest-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-group label {
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
      }

      @media (max-width: 768px) {
        .section-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .header-stats {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .table-header {
          flex-direction: column;
          align-items: stretch;
        }

        .form-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminInterestsComponent {
  private messageService = inject(MessageService);
  public interestsStore = inject(PetInterestsStore);
  public petsStore = inject(PetsStore);

  public showInterestDialog = signal(false);
  public editingInterest = signal<PetInterest | null>(null);
  public isLoading = signal(false);
  public globalFilter = signal('');
  public selectedStatus = signal<string | null>(null);

  public statusOptions = [
    { label: 'Activo', value: 'active' },
    { label: 'Contactado', value: 'contacted' },
    { label: 'Convertido', value: 'converted' },
    { label: 'Archivado', value: 'archived' },
  ];

  public interestForm: Partial<PetInterest> = {
    user_email: '',
    user_name: '',
    user_phone: '',
    notes: '',
    status: 'active',
  };

  public activeInterests = computed(() =>
    this.interestsStore.entities().filter((i) => i.status === 'active')
  );

  public contactedInterests = computed(() =>
    this.interestsStore.entities().filter((i) => i.status === 'contacted')
  );

  public convertedInterests = computed(() =>
    this.interestsStore.entities().filter((i) => i.status === 'converted')
  );

  public globalFilters = computed(() => {
    const filters: any = {};
    if (this.globalFilter()) {
      filters.global = { value: this.globalFilter(), matchMode: 'contains' };
    }
    if (this.selectedStatus()) {
      filters.status = { value: this.selectedStatus(), matchMode: 'equals' };
    }
    return filters;
  });

  public onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
  }

  public onStatusFilterChange(): void {
    // El filtro se aplica automÃ¡ticamente a travÃ©s de globalFilters()
  }

  public openEditDialog(interest: PetInterest): void {
    this.editingInterest.set(interest);
    this.interestForm = {
      user_email: interest.user_email,
      user_name: interest.user_name || '',
      user_phone: interest.user_phone || '',
      notes: interest.notes || '',
      status: interest.status,
    };
    this.showInterestDialog.set(true);
  }

  public resetForm(): void {
    this.interestForm = {
      user_email: '',
      user_name: '',
      user_phone: '',
      notes: '',
      status: 'active',
    };
    this.editingInterest.set(null);
    this.showInterestDialog.set(false);
  }

  public saveInterest(): void {
    if (!this.interestForm.user_email || !this.interestForm.status) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    this.isLoading.set(true);

    const interest = this.editingInterest();
    if (interest) {
      const validFields: Partial<PetInterest> = {
        id: interest.id,
        user_email: this.interestForm.user_email,
        user_name: this.interestForm.user_name || undefined,
        user_phone: this.interestForm.user_phone || undefined,
        notes: this.interestForm.notes || undefined,
        status: this.interestForm.status,
        contacted_at:
          this.interestForm.status === 'contacted' && !interest.contacted_at
            ? new Date()
            : interest.contacted_at,
      };

      this.interestsStore.editItem(validFields as PetInterest).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'InterÃ©s actualizado',
            detail: 'El interÃ©s se ha actualizado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo actualizar el interÃ©s',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public markAsContacted(interest: PetInterest): void {
    this.isLoading.set(true);
    const newStatus = interest.status === 'active' ? 'contacted' : 'active';
    const updated: PetInterest = {
      ...interest,
      status: newStatus,
      contacted_at: newStatus === 'contacted' ? new Date() : interest.contacted_at,
    };
    this.interestsStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `El interÃ©s ahora estÃ¡ ${newStatus === 'contacted' ? 'marcado como contactado' : 'activo'}`,
        });
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudo actualizar el estado',
        });
        this.isLoading.set(false);
      },
    });
  }

  public deleteInterest(interest: PetInterest): void {
    this.interestsStore.deleteItem(interest.id);
  }

  public getStatusLabel(status: string): string {
    const option = this.statusOptions.find((opt) => opt.value === status);
    return option ? option.label : status;
  }

  public getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const severityMap: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      active: 'success',
      contacted: 'info',
      converted: 'warn',
      archived: 'secondary',
    };
    return severityMap[status] || 'secondary';
  }

  public getSpeciesLabel(species: string): string {
    const labels: Record<string, string> = {
      dog: 'Perro',
      cat: 'Gato',
      other: 'Otro',
    };
    return labels[species] || species;
  }

  public formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}





