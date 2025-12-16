import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
import { Partner } from '../models';
import { PartnersStore } from '../stores/partners.store';

@Component({
  selector: 'pt-admin-partners',
  standalone: true,
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
    <div class="partners-container">
      <div class="section-header">
        <h2>Gestión de Aliados</h2>
        <p-button
          label="Nuevo Aliado"
          icon="pi pi-plus"
          (onClick)="openNewPartnerDialog()"
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
          [value]="partnersStore.entities()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['name', 'description', 'contact_email', 'partner_type']"
          styleClass="p-datatable-striped"
          [loading]="partnersStore.isLoading()"
          [sortField]="'name'"
          [sortOrder]="1"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <input
                type="text"
                pInputText
                placeholder="Buscar aliados..."
                (input)="onGlobalFilter($event)"
                class="search-input"
              />
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Sitio Web</th>
              <th>Destacado</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-partner>
            <tr>
              <td><div class="table-cell-content">{{ partner.name }}</div></td>
              <td>
                <div class="table-cell-content">
                  <p-tag [value]="getPartnerTypeLabel(partner.partner_type)" severity="info" />
                </div>
              </td>
              <td><div class="table-cell-content">{{ partner.contact_name || 'N/A' }}</div></td>
              <td><div class="table-cell-content">{{ partner.contact_email || 'N/A' }}</div></td>
              <td>
                <div class="table-cell-content">
                  @if (partner.website) {
                    <a [href]="partner.website" target="_blank" rel="noopener noreferrer" class="website-link">
                      {{ partner.website }}
                    </a>
                  } @else {
                    <span>N/A</span>
                  }
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  <p-tag
                    [value]="partner.is_featured ? 'Sí' : 'No'"
                    [severity]="partner.is_featured ? 'success' : 'secondary'"
                  />
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  <p-tag
                    [value]="partner.is_active ? 'Activo' : 'Inactivo'"
                    [severity]="partner.is_active ? 'success' : 'danger'"
                  />
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(partner)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Editar"
                  />
                  <p-button
                    [icon]="partner.is_featured ? 'pi pi-star-fill' : 'pi pi-star'"
                    [text]="true"
                    [severity]="partner.is_featured ? 'warn' : 'secondary'"
                    (onClick)="toggleFeatured(partner)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="partner.is_featured ? 'Quitar destacado' : 'Destacar'"
                  />
                  <p-button
                    [icon]="partner.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    [text]="true"
                    [severity]="partner.is_active ? 'warn' : 'success'"
                    (onClick)="toggleActive(partner)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="partner.is_active ? 'Desactivar' : 'Activar'"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    severity="danger"
                    (onClick)="deletePartner(partner)"
                    title="Eliminar"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="8">No se encontraron aliados</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para crear/editar aliado -->
    <p-dialog
      [visible]="showPartnerDialog()"
      (visibleChange)="showPartnerDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '700px' }"
      [header]="editingPartner() ? 'Editar Aliado' : 'Nuevo Aliado'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="savePartner()" class="partner-form">
        <div class="form-group">
          <label for="name">Nombre del Aliado *</label>
          <input
            id="name"
            type="text"
            pInputText
            [(ngModel)]="partnerForm.name"
            name="name"
            required
            [disabled]="isLoading()"
            placeholder="Ej: Clínica Veterinaria Panamá"
          />
        </div>

        <div class="form-group">
          <label for="partner_type">Tipo de Aliado *</label>
          <p-select
            id="partner_type"
            [(ngModel)]="partnerForm.partner_type"
            name="partner_type"
            [options]="partnerTypeOptions"
            placeholder="Seleccionar tipo"
            [disabled]="isLoading()"
            required
            [style]="{ width: '100%' }"
          />
        </div>

        <div class="form-group">
          <label for="description">Descripción</label>
          <textarea
            id="description"
            pTextarea
            [(ngModel)]="partnerForm.description"
            name="description"
            [rows]="3"
            [disabled]="isLoading()"
            placeholder="Descripción del aliado y su relación con Black Dog..."
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="contact_name">Nombre del Contacto</label>
            <input
              id="contact_name"
              type="text"
              pInputText
              [(ngModel)]="partnerForm.contact_name"
              name="contact_name"
              [disabled]="isLoading()"
              placeholder="Ej: María González"
            />
          </div>

          <div class="form-group">
            <label for="contact_phone">Teléfono</label>
            <input
              id="contact_phone"
              type="tel"
              pInputText
              [(ngModel)]="partnerForm.contact_phone"
              name="contact_phone"
              [disabled]="isLoading()"
              placeholder="Ej: +507 6123-4567"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="contact_email">Email</label>
          <input
            id="contact_email"
            type="email"
            pInputText
            [(ngModel)]="partnerForm.contact_email"
            name="contact_email"
            [disabled]="isLoading()"
            placeholder="Ej: contacto@ejemplo.com"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="website">Sitio Web</label>
            <input
              id="website"
              type="url"
              pInputText
              [(ngModel)]="partnerForm.website"
              name="website"
              [disabled]="isLoading()"
              placeholder="https://ejemplo.com"
            />
          </div>

          <div class="form-group">
            <label for="logo_url">URL del Logo</label>
            <input
              id="logo_url"
              type="url"
              pInputText
              [(ngModel)]="partnerForm.logo_url"
              name="logo_url"
              [disabled]="isLoading()"
              placeholder="https://ejemplo.com/logo.png"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="address">Dirección</label>
          <input
            id="address"
            type="text"
            pInputText
            [(ngModel)]="partnerForm.address"
            name="address"
            [disabled]="isLoading()"
            placeholder="Ej: Ciudad de Panamá, Panamá"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [(ngModel)]="partnerForm.is_featured"
                name="is_featured"
                [disabled]="isLoading()"
              />
              <span>Aliado destacado</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [(ngModel)]="partnerForm.is_active"
                name="is_active"
                [disabled]="isLoading()"
              />
              <span>Aliado activo</span>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingPartner() ? 'Actualizar' : 'Crear'"
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
      .partners-container {
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

      .website-link {
        color: #3b82f6;
        text-decoration: none;
        word-break: break-all;
      }

      .website-link:hover {
        text-decoration: underline;
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

      .partner-form {
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
export class AdminPartnersComponent {
  private messageService = inject(MessageService);
  public partnersStore = inject(PartnersStore);

  public showPartnerDialog = signal(false);
  public editingPartner = signal<Partner | null>(null);
  public isLoading = signal(false);
  public globalFilter = signal('');

  public partnerForm: Partial<Partner> = {
    name: '',
    description: '',
    partner_type: 'other',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    logo_url: '',
    address: '',
    is_featured: false,
    is_active: true,
  };

  public partnerTypeOptions = [
    { label: 'Patrocinador', value: 'sponsor' },
    { label: 'Veterinaria', value: 'veterinary' },
    { label: 'Proveedor', value: 'supplier' },
    { label: 'Medios', value: 'media' },
    { label: 'Otro', value: 'other' },
  ];

  public onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
  }

  public openNewPartnerDialog(): void {
    this.editingPartner.set(null);
    this.resetForm();
    this.showPartnerDialog.set(true);
  }

  public openEditDialog(partner: Partner): void {
    this.editingPartner.set(partner);
    this.partnerForm = {
      name: partner.name,
      description: partner.description || '',
      partner_type: partner.partner_type,
      contact_name: partner.contact_name || '',
      contact_email: partner.contact_email || '',
      contact_phone: partner.contact_phone || '',
      website: partner.website || '',
      logo_url: partner.logo_url || '',
      address: partner.address || '',
      is_featured: partner.is_featured,
      is_active: partner.is_active,
    };
    this.showPartnerDialog.set(true);
  }

  public resetForm(): void {
    this.partnerForm = {
      name: '',
      description: '',
      partner_type: 'other',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      website: '',
      logo_url: '',
      address: '',
      is_featured: false,
      is_active: true,
    };
    this.editingPartner.set(null);
    this.showPartnerDialog.set(false);
  }

  public savePartner(): void {
    if (!this.partnerForm.name || !this.partnerForm.partner_type) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios (Nombre, Tipo)',
      });
      return;
    }

    this.isLoading.set(true);

    const partner = this.editingPartner();
    if (partner) {
      const validFields: Partial<Partner> = {
        id: partner.id,
        name: this.partnerForm.name,
        description: this.partnerForm.description || undefined,
        partner_type: this.partnerForm.partner_type,
        contact_name: this.partnerForm.contact_name || undefined,
        contact_email: this.partnerForm.contact_email || undefined,
        contact_phone: this.partnerForm.contact_phone || undefined,
        website: this.partnerForm.website || undefined,
        logo_url: this.partnerForm.logo_url || undefined,
        address: this.partnerForm.address || undefined,
        is_featured: this.partnerForm.is_featured || false,
        is_active: this.partnerForm.is_active,
      };

      this.partnersStore.editItem(validFields as Partner).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Aliado actualizado',
            detail: 'El aliado se ha actualizado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo actualizar el aliado',
          });
          this.isLoading.set(false);
        },
      });
    } else {
      const validFields: Partial<Partner> = {
        name: this.partnerForm.name,
        description: this.partnerForm.description || undefined,
        partner_type: this.partnerForm.partner_type,
        contact_name: this.partnerForm.contact_name || undefined,
        contact_email: this.partnerForm.contact_email || undefined,
        contact_phone: this.partnerForm.contact_phone || undefined,
        website: this.partnerForm.website || undefined,
        logo_url: this.partnerForm.logo_url || undefined,
        address: this.partnerForm.address || undefined,
        is_featured: this.partnerForm.is_featured || false,
        is_active: this.partnerForm.is_active,
      };

      this.partnersStore.createItem(validFields as Partner).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Aliado creado',
            detail: 'El aliado se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo crear el aliado',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public toggleFeatured(partner: Partner): void {
    this.isLoading.set(true);
    const updated: Partner = {
      ...partner,
      is_featured: !partner.is_featured,
    };
    this.partnersStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `El aliado ahora está ${updated.is_featured ? 'destacado' : 'sin destacar'}`,
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

  public toggleActive(partner: Partner): void {
    this.isLoading.set(true);
    const updated: Partner = {
      ...partner,
      is_active: !partner.is_active,
    };
    this.partnersStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `El aliado ahora está ${updated.is_active ? 'activo' : 'inactivo'}`,
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

  public deletePartner(partner: Partner): void {
    this.partnersStore.deleteItem(partner.id);
  }

  public getPartnerTypeLabel(type: string): string {
    const option = this.partnerTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  }
}

