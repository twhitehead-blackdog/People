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
import { AdoptiveFamily, Pet } from '../models';
import { AdoptiveFamiliesStore } from '../stores/adoptive-families.store';
import { PetsStore } from '../stores/pets.store';

@Component({
  selector: 'pt-admin-families',
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
    <div class="families-container">
      <div class="section-header">
        <h2>GestiÃ³n de Familias Adoptivas</h2>
        <p-button
          label="Nueva Familia"
          icon="pi pi-plus"
          (onClick)="openNewFamilyDialog()"
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
          [value]="familiesStore.entities()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['family_name', 'contact_name', 'contact_email', 'pet_name']"
          styleClass="p-datatable-striped"
          [loading]="familiesStore.isLoading()"
          [sortField]="'created_at'"
          [sortOrder]="-1"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <input
                type="text"
                pInputText
                placeholder="Buscar familias..."
                (input)="onGlobalFilter($event)"
                class="search-input"
              />
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Familia</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Mascota</th>
              <th>Destacada</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-family>
            <tr>
              <td><div class="table-cell-content">{{ family.family_name }}</div></td>
              <td><div class="table-cell-content">{{ family.contact_name }}</div></td>
              <td><div class="table-cell-content">{{ family.contact_email }}</div></td>
              <td><div class="table-cell-content">{{ family.pet_name || family.pet?.name || 'N/A' }}</div></td>
              <td>
                <div class="table-cell-content">
                  <p-tag
                    [value]="family.is_featured ? 'SÃ­' : 'No'"
                    [severity]="family.is_featured ? 'success' : 'secondary'"
                  />
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  <p-tag
                    [value]="family.is_active ? 'Activa' : 'Inactiva'"
                    [severity]="family.is_active ? 'success' : 'danger'"
                  />
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(family)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Editar"
                  />
                  <p-button
                    [icon]="family.is_featured ? 'pi pi-star-fill' : 'pi pi-star'"
                    [text]="true"
                    [severity]="family.is_featured ? 'warn' : 'secondary'"
                    (onClick)="toggleFeatured(family)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="family.is_featured ? 'Quitar destacado' : 'Destacar'"
                  />
                  <p-button
                    [icon]="family.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    [text]="true"
                    [severity]="family.is_active ? 'warn' : 'success'"
                    (onClick)="toggleActive(family)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="family.is_active ? 'Desactivar' : 'Activar'"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    severity="danger"
                    (onClick)="deleteFamily(family)"
                    title="Eliminar"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7">No se encontraron familias</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para crear/editar familia -->
    <p-dialog
      [visible]="showFamilyDialog()"
      (visibleChange)="showFamilyDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '700px' }"
      [header]="editingFamily() ? 'Editar Familia' : 'Nueva Familia'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="saveFamily()" class="family-form">
        <div class="form-group">
          <label for="family_name">Nombre de la Familia *</label>
          <input
            id="family_name"
            type="text"
            pInputText
            [(ngModel)]="familyForm.family_name"
            name="family_name"
            required
            [disabled]="isLoading()"
            placeholder="Ej: Familia GarcÃ­a"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="contact_name">Nombre del Contacto *</label>
            <input
              id="contact_name"
              type="text"
              pInputText
              [(ngModel)]="familyForm.contact_name"
              name="contact_name"
              required
              [disabled]="isLoading()"
              placeholder="Ej: Juan GarcÃ­a"
            />
          </div>

          <div class="form-group">
            <label for="contact_phone">TelÃ©fono *</label>
            <input
              id="contact_phone"
              type="tel"
              pInputText
              [(ngModel)]="familyForm.contact_phone"
              name="contact_phone"
              required
              [disabled]="isLoading()"
              placeholder="Ej: +507 6123-4567"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="contact_email">Email *</label>
          <input
            id="contact_email"
            type="email"
            pInputText
            [(ngModel)]="familyForm.contact_email"
            name="contact_email"
            required
            [disabled]="isLoading()"
            placeholder="Ej: juan@example.com"
          />
        </div>

        <div class="form-group">
          <label for="address">DirecciÃ³n</label>
          <input
            id="address"
            type="text"
            pInputText
            [(ngModel)]="familyForm.address"
            name="address"
            [disabled]="isLoading()"
            placeholder="Ej: Ciudad de PanamÃ¡, PanamÃ¡"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="pet_id">Mascota Adoptada (Opcional)</label>
            <p-select
              id="pet_id"
              [(ngModel)]="familyForm.pet_id"
              name="pet_id"
              [options]="adoptedPets()"
              optionLabel="name"
              optionValue="id"
              placeholder="Seleccionar mascota"
              [showClear]="true"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
          </div>

          <div class="form-group">
            <label for="pet_name">Nombre de la Mascota</label>
            <input
              id="pet_name"
              type="text"
              pInputText
              [(ngModel)]="familyForm.pet_name"
              name="pet_name"
              [disabled]="isLoading()"
              placeholder="Si no hay mascota asociada"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="story">Historia de la Familia</label>
          <textarea
            id="story"
            pTextarea
            [(ngModel)]="familyForm.story"
            name="story"
            [rows]="4"
            [disabled]="isLoading()"
            placeholder="CuÃ©ntanos la historia de esta familia y su mascota adoptada..."
          ></textarea>
        </div>

        <div class="form-group">
          <label for="photo_url">URL de la Foto</label>
          <input
            id="photo_url"
            type="url"
            pInputText
            [(ngModel)]="familyForm.photo_url"
            name="photo_url"
            [disabled]="isLoading()"
            placeholder="https://ejemplo.com/foto.jpg"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [(ngModel)]="familyForm.is_featured"
                name="is_featured"
                [disabled]="isLoading()"
              />
              <span>Familia destacada</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [(ngModel)]="familyForm.is_active"
                name="is_active"
                [disabled]="isLoading()"
              />
              <span>Familia activa</span>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingFamily() ? 'Actualizar' : 'Crear'"
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
      .families-container {
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

      .table-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }

      .search-input {
        max-width: 300px;
      }

      ::ng-deep .p-datatable td .table-cell-content {
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
        padding: 0.5rem 0;
      }

      ::ng-deep .p-datatable {
        overflow-x: auto;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }

      ::ng-deep .p-dialog {
        z-index: 1100 !important;
        position: fixed !important;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .family-form {
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
export class AdminFamiliesComponent {
  private messageService = inject(MessageService);
  public familiesStore = inject(AdoptiveFamiliesStore);
  public petsStore = inject(PetsStore);

  public showFamilyDialog = signal(false);
  public editingFamily = signal<AdoptiveFamily | null>(null);
  public isLoading = signal(false);
  public globalFilter = signal('');

  public familyForm: Partial<AdoptiveFamily> = {
    family_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    story: '',
    pet_id: undefined,
    pet_name: '',
    photo_url: '',
    is_featured: false,
    is_active: true,
  };

  // Obtener solo mascotas adoptadas (no disponibles)
  public adoptedPets = computed(() => {
    return this.petsStore.entities().filter((pet) => !pet.is_available);
  });

  public onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
  }

  public openNewFamilyDialog(): void {
    this.editingFamily.set(null);
    this.resetForm();
    this.showFamilyDialog.set(true);
  }

  public openEditDialog(family: AdoptiveFamily): void {
    this.editingFamily.set(family);
    this.familyForm = {
      family_name: family.family_name,
      contact_name: family.contact_name,
      contact_email: family.contact_email,
      contact_phone: family.contact_phone,
      address: family.address || '',
      story: family.story || '',
      pet_id: family.pet_id || undefined,
      pet_name: family.pet_name || '',
      photo_url: family.photo_url || '',
      is_featured: family.is_featured,
      is_active: family.is_active,
    };
    this.showFamilyDialog.set(true);
  }

  public resetForm(): void {
    this.familyForm = {
      family_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      story: '',
      pet_id: undefined,
      pet_name: '',
      photo_url: '',
      is_featured: false,
      is_active: true,
    };
    this.editingFamily.set(null);
    this.showFamilyDialog.set(false);
  }

  public saveFamily(): void {
    if (
      !this.familyForm.family_name ||
      !this.familyForm.contact_name ||
      !this.familyForm.contact_email ||
      !this.familyForm.contact_phone
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    this.isLoading.set(true);

    const family = this.editingFamily();
    if (family) {
      const validFields: Partial<AdoptiveFamily> = {
        id: family.id,
        family_name: this.familyForm.family_name,
        contact_name: this.familyForm.contact_name,
        contact_email: this.familyForm.contact_email,
        contact_phone: this.familyForm.contact_phone,
        address: this.familyForm.address || undefined,
        story: this.familyForm.story || undefined,
        pet_id: this.familyForm.pet_id || undefined,
        pet_name: this.familyForm.pet_name || undefined,
        photo_url: this.familyForm.photo_url || undefined,
        is_featured: this.familyForm.is_featured || false,
        is_active: this.familyForm.is_active,
      };

      this.familiesStore.editItem(validFields as AdoptiveFamily).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Familia actualizada',
            detail: 'La familia se ha actualizado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo actualizar la familia',
          });
          this.isLoading.set(false);
        },
      });
    } else {
      const validFields: Partial<AdoptiveFamily> = {
        family_name: this.familyForm.family_name,
        contact_name: this.familyForm.contact_name,
        contact_email: this.familyForm.contact_email,
        contact_phone: this.familyForm.contact_phone,
        address: this.familyForm.address || undefined,
        story: this.familyForm.story || undefined,
        pet_id: this.familyForm.pet_id || undefined,
        pet_name: this.familyForm.pet_name || undefined,
        photo_url: this.familyForm.photo_url || undefined,
        is_featured: this.familyForm.is_featured || false,
        is_active: this.familyForm.is_active,
      };

      this.familiesStore.createItem(validFields as AdoptiveFamily).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Familia creada',
            detail: 'La familia se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo crear la familia',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public toggleFeatured(family: AdoptiveFamily): void {
    this.isLoading.set(true);
    const updated: AdoptiveFamily = {
      ...family,
      is_featured: !family.is_featured,
    };
    this.familiesStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `La familia ahora estÃ¡ ${updated.is_featured ? 'destacada' : 'sin destacar'}`,
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

  public toggleActive(family: AdoptiveFamily): void {
    this.isLoading.set(true);
    const updated: AdoptiveFamily = {
      ...family,
      is_active: !family.is_active,
    };
    this.familiesStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `La familia ahora estÃ¡ ${updated.is_active ? 'activa' : 'inactiva'}`,
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

  public deleteFamily(family: AdoptiveFamily): void {
    this.familiesStore.deleteItem(family.id);
  }
}





