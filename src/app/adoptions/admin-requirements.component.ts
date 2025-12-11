import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { AdoptionRequirement } from '../models';
import { AdoptionRequirementsStore } from '../stores/adoption-requirements.store';

@Component({
  selector: 'pt-admin-requirements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DialogModule,
    InputText,
    TextareaModule,
    InputNumberModule,
    TagModule,
    ToastModule,
    Card,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="requirements-container">
      <div class="section-header">
        <h2>Gestión de Requisitos de Adopción</h2>
        <p-button
          label="Nuevo Requisito"
          icon="pi pi-plus"
          (onClick)="openNewRequirementDialog()"
          [style]="{
            background: '#fbbf24',
            border: 'none',
            color: '#000000',
            fontWeight: 'bold'
          }"
        />
      </div>

      <p-card>
        <p-table
          [value]="requirementsStore.entities()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['title', 'description']"
          styleClass="p-datatable-striped"
          [loading]="requirementsStore.isLoading()"
          [sortField]="'order'"
          [sortOrder]="1"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <input
                type="text"
                pInputText
                placeholder="Buscar requisitos..."
                (input)="onGlobalFilter($event)"
                class="search-input"
              />
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="order">
                Orden <p-sortIcon field="order" />
              </th>
              <th>Título</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-requirement>
            <tr>
              <td>{{ requirement.order }}</td>
              <td>{{ requirement.title }}</td>
              <td>
                <span class="description-text">{{ requirement.description }}</span>
              </td>
              <td>
                <p-tag
                  [value]="requirement.is_active ? 'Activo' : 'Inactivo'"
                  [severity]="requirement.is_active ? 'success' : 'danger'"
                />
              </td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(requirement)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Editar"
                  />
                  <p-button
                    [icon]="requirement.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    [text]="true"
                    [severity]="requirement.is_active ? 'warn' : 'success'"
                    (onClick)="toggleActive(requirement)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="requirement.is_active ? 'Desactivar' : 'Activar'"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    severity="danger"
                    (onClick)="deleteRequirement(requirement)"
                    title="Eliminar"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5">No se encontraron requisitos</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para crear/editar requisito -->
    <p-dialog
      [visible]="showRequirementDialog()"
      (visibleChange)="showRequirementDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '600px' }"
      [header]="editingRequirement() ? 'Editar Requisito' : 'Nuevo Requisito'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="saveRequirement()" class="requirement-form">
        <div class="form-group">
          <label for="order">Orden *</label>
          <p-inputNumber
            id="order"
            [(ngModel)]="requirementForm.order"
            name="order"
            [min]="1"
            [max]="100"
            [showButtons]="true"
            [disabled]="isLoading()"
            required
            [style]="{ width: '100%' }"
          />
          <small class="form-hint">El orden determina la posición en la lista de requisitos</small>
        </div>

        <div class="form-group">
          <label for="title">Título *</label>
          <input
            id="title"
            type="text"
            pInputText
            [(ngModel)]="requirementForm.title"
            name="title"
            required
            [disabled]="isLoading()"
            placeholder="Ej: Ser mayor de 21 años"
          />
        </div>

        <div class="form-group">
          <label for="description">Descripción *</label>
          <textarea
            id="description"
            pTextarea
            [(ngModel)]="requirementForm.description"
            name="description"
            [rows]="4"
            [disabled]="isLoading()"
            placeholder="Descripción detallada del requisito..."
            required
          ></textarea>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              [(ngModel)]="requirementForm.is_active"
              name="is_active"
              [disabled]="isLoading()"
            />
            <span>Requisito activo</span>
          </label>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingRequirement() ? 'Actualizar' : 'Crear'"
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
      .requirements-container {
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
        width: 100%;
      }

      .section-header h2 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        flex: 1;
        min-width: 200px;
      }

      .table-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }

      .search-input {
        width: 100%;
        max-width: 300px;
      }

      .description-text {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 300px;
        word-wrap: break-word;
        white-space: normal;
        overflow-wrap: break-word;
      }

      /* Asegurar que las celdas de la tabla no se mezclen */
      ::ng-deep .p-datatable tbody td {
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
        padding: 0.75rem;
      }

      /* Asegurar que las tablas no se desborden */
      ::ng-deep .p-datatable {
        overflow-x: auto;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }

      /* Asegurar que los diálogos no se sobrepongan */
      ::ng-deep .p-dialog {
        z-index: 1100 !important;
        position: fixed !important;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .requirement-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
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

      .form-hint {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: -0.25rem;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .checkbox-label input[type='checkbox'] {
        cursor: pointer;
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

        .description-text {
          max-width: 200px;
        }
      }
    `,
  ],
})
export class AdminRequirementsComponent {
  private messageService = inject(MessageService);
  public requirementsStore = inject(AdoptionRequirementsStore);

  public showRequirementDialog = signal(false);
  public editingRequirement = signal<AdoptionRequirement | null>(null);
  public isLoading = signal(false);
  public globalFilter = signal('');

  public requirementForm: Partial<AdoptionRequirement> = {
    title: '',
    description: '',
    order: 1,
    is_active: true,
  };

  public onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
  }

  public openNewRequirementDialog(): void {
    this.editingRequirement.set(null);
    this.resetForm();
    // Calcular el siguiente orden disponible
    const maxOrder = Math.max(
      0,
      ...this.requirementsStore.entities().map((r) => r.order || 0)
    );
    this.requirementForm.order = maxOrder + 1;
    this.showRequirementDialog.set(true);
  }

  public openEditDialog(requirement: AdoptionRequirement): void {
    this.editingRequirement.set(requirement);
    this.requirementForm = {
      title: requirement.title,
      description: requirement.description,
      order: requirement.order,
      is_active: requirement.is_active,
    };
    this.showRequirementDialog.set(true);
  }

  public resetForm(): void {
    this.requirementForm = {
      title: '',
      description: '',
      order: 1,
      is_active: true,
    };
    this.editingRequirement.set(null);
    this.showRequirementDialog.set(false);
  }

  public saveRequirement(): void {
    if (
      !this.requirementForm.title ||
      !this.requirementForm.description ||
      !this.requirementForm.order
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    this.isLoading.set(true);

    const requirement = this.editingRequirement();
    if (requirement) {
      const validFields: Partial<AdoptionRequirement> = {
        id: requirement.id,
        title: this.requirementForm.title,
        description: this.requirementForm.description,
        order: this.requirementForm.order,
        is_active: this.requirementForm.is_active,
      };

      this.requirementsStore.editItem(validFields as AdoptionRequirement).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Requisito actualizado',
            detail: 'El requisito se ha actualizado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo actualizar el requisito',
          });
          this.isLoading.set(false);
        },
      });
    } else {
      const validFields: Partial<AdoptionRequirement> = {
        title: this.requirementForm.title,
        description: this.requirementForm.description,
        order: this.requirementForm.order,
        is_active: this.requirementForm.is_active,
      };

      this.requirementsStore.createItem(validFields as AdoptionRequirement).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Requisito creado',
            detail: 'El requisito se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo crear el requisito',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public toggleActive(requirement: AdoptionRequirement): void {
    this.isLoading.set(true);
    const updated: AdoptionRequirement = {
      ...requirement,
      is_active: !requirement.is_active,
    };
    this.requirementsStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `El requisito ahora está ${updated.is_active ? 'activo' : 'inactivo'}`,
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

  public deleteRequirement(requirement: AdoptionRequirement): void {
    this.requirementsStore.deleteItem(requirement.id);
  }
}

