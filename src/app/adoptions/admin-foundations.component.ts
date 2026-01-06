import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { Foundation } from '../models';
import { FoundationsStore } from '../stores/foundations.store';
import { PetsStore } from '../stores/pets.store';

@Component({
  selector: 'pt-admin-foundations',
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
    TagModule,
    ToastModule,
    Card,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="foundations-container">
      <div class="section-header">
        <h2>GestiÃ³n de Fundaciones</h2>
        <p-button
          label="Nueva FundaciÃ³n"
          icon="pi pi-plus"
          (onClick)="openNewFoundationDialog()"
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
          [value]="foundationsStore.entities()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['name', 'email', 'address']"
          styleClass="p-datatable-striped"
          [loading]="foundationsStore.isLoading()"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <input
                type="text"
                pInputText
                placeholder="Buscar fundaciones..."
                (input)="onGlobalFilter($event)"
                class="search-input"
              />
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>TelÃ©fono</th>
              <th>DirecciÃ³n</th>
              <th>Estado</th>
              <th>Mascotas</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-foundation>
            <tr>
              <td>{{ foundation.name }}</td>
              <td>{{ foundation.email }}</td>
              <td>{{ foundation.phone_number }}</td>
              <td>{{ foundation.address }}</td>
              <td>
                <p-tag
                  [value]="foundation.is_active ? 'Activa' : 'Inactiva'"
                  [severity]="foundation.is_active ? 'success' : 'danger'"
                />
              </td>
              <td>{{ getPetsCount(foundation.id) }}</td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(foundation)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Editar"
                  />
                  <p-button
                    [icon]="foundation.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    [text]="true"
                    [severity]="foundation.is_active ? 'warn' : 'success'"
                    (onClick)="toggleActive(foundation)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="foundation.is_active ? 'Desactivar' : 'Activar'"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    severity="danger"
                    (onClick)="deleteFoundation(foundation)"
                    title="Eliminar"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7">No se encontraron fundaciones</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para crear/editar fundaciÃ³n -->
    <p-dialog
      [visible]="showFoundationDialog()"
      (visibleChange)="showFoundationDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '600px' }"
      [header]="editingFoundation() ? 'Editar FundaciÃ³n' : 'Nueva FundaciÃ³n'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="saveFoundation()" class="foundation-form">
        <div class="form-group">
          <label for="name">Nombre *</label>
          <input
            id="name"
            type="text"
            pInputText
            [(ngModel)]="foundationForm.name"
            name="name"
            required
            [disabled]="isLoading()"
          />
        </div>

        <div class="form-group">
          <label for="description">DescripciÃ³n</label>
          <textarea
            id="description"
            pTextarea
            [(ngModel)]="foundationForm.description"
            name="description"
            [rows]="3"
            [disabled]="isLoading()"
            placeholder="DescripciÃ³n de la fundaciÃ³n..."
          ></textarea>
        </div>

        <div class="form-group">
          <label for="address">DirecciÃ³n *</label>
          <input
            id="address"
            type="text"
            pInputText
            [(ngModel)]="foundationForm.address"
            name="address"
            required
            [disabled]="isLoading()"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="phone_number">TelÃ©fono *</label>
            <input
              id="phone_number"
              type="tel"
              pInputText
              [(ngModel)]="foundationForm.phone_number"
              name="phone_number"
              required
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label for="email">Email *</label>
            <input
              id="email"
              type="email"
              pInputText
              [(ngModel)]="foundationForm.email"
              name="email"
              required
              [disabled]="isLoading()"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="website">Sitio Web</label>
          <input
            id="website"
            type="url"
            pInputText
            [(ngModel)]="foundationForm.website"
            name="website"
            placeholder="https://ejemplo.com"
            [disabled]="isLoading()"
          />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              [(ngModel)]="foundationForm.is_active"
              name="is_active"
              [disabled]="isLoading()"
            />
            <span>FundaciÃ³n activa</span>
          </label>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingFoundation() ? 'Actualizar' : 'Crear'"
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
      .foundations-container {
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

      /* Asegurar que las celdas de la tabla no se mezclen */
      ::ng-deep .p-datatable tbody td {
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
        padding: 0.75rem;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .foundation-form {
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

      /* Asegurar que las tablas no se desborden */
      ::ng-deep .p-datatable {
        overflow-x: auto;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }

      /* Asegurar que los diÃ¡logos no se sobrepongan */
      ::ng-deep .p-dialog {
        z-index: 1100 !important;
        position: fixed !important;
      }

      @media (max-width: 768px) {
        .section-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .form-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminFoundationsComponent {
  private messageService = inject(MessageService);
  public foundationsStore = inject(FoundationsStore);
  public petsStore = inject(PetsStore);

  public showFoundationDialog = signal(false);
  public editingFoundation = signal<Foundation | null>(null);
  public isLoading = signal(false);
  public globalFilter = signal('');

  public foundationForm: Partial<Foundation> = {
    name: '',
    description: '',
    address: '',
    phone_number: '',
    email: '',
    website: '',
    is_active: true,
  };

  public getPetsCount(foundationId: string): number {
    return this.petsStore.entities().filter((p) => p.foundation_id === foundationId).length;
  }

  public onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
  }

  public openNewFoundationDialog(): void {
    this.editingFoundation.set(null);
    this.resetForm();
    this.showFoundationDialog.set(true);
  }

  public openEditDialog(foundation: Foundation): void {
    this.editingFoundation.set(foundation);
    this.foundationForm = {
      name: foundation.name,
      description: foundation.description || '',
      address: foundation.address,
      phone_number: foundation.phone_number,
      email: foundation.email,
      website: foundation.website || '',
      is_active: foundation.is_active,
    };
    this.showFoundationDialog.set(true);
  }

  public resetForm(): void {
    this.foundationForm = {
      name: '',
      description: '',
      address: '',
      phone_number: '',
      email: '',
      website: '',
      is_active: true,
    };
    this.editingFoundation.set(null);
    this.showFoundationDialog.set(false);
  }

  public saveFoundation(): void {
    if (
      !this.foundationForm.name ||
      !this.foundationForm.address ||
      !this.foundationForm.phone_number ||
      !this.foundationForm.email
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    this.isLoading.set(true);

    const foundation = this.editingFoundation();
    if (foundation) {
      const validFields: Partial<Foundation> = {
        id: foundation.id,
        name: this.foundationForm.name,
        description: this.foundationForm.description || undefined,
        address: this.foundationForm.address,
        phone_number: this.foundationForm.phone_number,
        email: this.foundationForm.email,
        website: this.foundationForm.website || undefined,
        is_active: this.foundationForm.is_active,
      };

      this.foundationsStore.editItem(validFields as Foundation).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'FundaciÃ³n actualizada',
            detail: 'La fundaciÃ³n se ha actualizado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo actualizar la fundaciÃ³n',
          });
          this.isLoading.set(false);
        },
      });
    } else {
      const validFields: Partial<Foundation> = {
        name: this.foundationForm.name,
        description: this.foundationForm.description || undefined,
        address: this.foundationForm.address,
        phone_number: this.foundationForm.phone_number,
        email: this.foundationForm.email,
        website: this.foundationForm.website || undefined,
        is_active: this.foundationForm.is_active,
      };

      this.foundationsStore.createItem(validFields as Foundation).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'FundaciÃ³n creada',
            detail: 'La fundaciÃ³n se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo crear la fundaciÃ³n',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public toggleActive(foundation: Foundation): void {
    this.isLoading.set(true);
    const updated: Foundation = {
      ...foundation,
      is_active: !foundation.is_active,
    };
    this.foundationsStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `La fundaciÃ³n ahora estÃ¡ ${updated.is_active ? 'activa' : 'inactiva'}`,
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

  public deleteFoundation(foundation: Foundation): void {
    const petsCount = this.getPetsCount(foundation.id);
    if (petsCount > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede eliminar',
        detail: `Esta fundaciÃ³n tiene ${petsCount} mascota(s) asociada(s). Primero debe reasignar o eliminar las mascotas.`,
      });
      return;
    }

    this.foundationsStore.deleteItem(foundation.id);
  }
}





