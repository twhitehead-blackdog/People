import { CommonModule } from '@angular/common';
import { , ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { PersonalityTrait } from '../models';
import { PersonalityTraitsStore } from '../stores/personality-traits.store';

@Component({
  selector: 'pt-admin-personalities',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DialogModule,
    InputText,
    InputNumber,
    TextareaModule,
    DropdownModule,
    TagModule,
    ToastModule,
    Card,
    CheckboxModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="personalities-container">
      <div class="section-header">
        <h2>GestiÃ³n de Rasgos de Personalidad</h2>
        <p-button
          label="Nuevo Rasgo"
          icon="pi pi-plus"
          (onClick)="openNewTraitDialog()"
          [style]="{
            background: '#fbbf24',
            border: 'none',
            color: '#000000',
            fontWeight: 'bold'
          }"
        />
      </div>

      @for (category of categories(); track category) {
        <p-card [header]="getCategoryLabel(category)" class="category-card">
          <p-table
            [value]="getTraitsByCategory(category)"
            [paginator]="false"
            styleClass="p-datatable-striped"
            [loading]="traitsStore.isLoading()"
          >
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 50px">Orden</th>
                <th>Rasgo</th>
                <th>Valor</th>
                <th>Icono</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-trait>
              <tr>
                <td>
                  <div class="table-cell-content">
                    <strong>{{ trait.display_order }}</strong>
                  </div>
                </td>
                <td>
                  <div class="table-cell-content">
                    <strong>{{ trait.label }}</strong>
                    @if (trait.description) {
                      <small class="trait-description">{{ trait.description }}</small>
                    }
                  </div>
                </td>
                <td>
                  <div class="table-cell-content">
                    <code class="trait-value">{{ trait.value }}</code>
                  </div>
                </td>
                <td>
                  <div class="table-cell-content">
                    <span class="trait-icon">{{ trait.icon || 'â€”' }}</span>
                  </div>
                </td>
                <td>
                  <div class="table-cell-content">
                    <p-tag
                      [value]="trait.is_active ? 'Activo' : 'Inactivo'"
                      [severity]="trait.is_active ? 'success' : 'danger'"
                    />
                  </div>
                </td>
                <td>
                  <div class="action-buttons">
                    <p-button
                      icon="pi pi-pencil"
                      [text]="true"
                      severity="info"
                      (onClick)="openEditDialog(trait)"
                      [style]="{ marginRight: '0.5rem' }"
                      title="Editar"
                    />
                    <p-button
                      [icon]="trait.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                      [text]="true"
                      [severity]="trait.is_active ? 'warn' : 'success'"
                      (onClick)="toggleActive(trait)"
                      [style]="{ marginRight: '0.5rem' }"
                      [title]="trait.is_active ? 'Desactivar' : 'Activar'"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [text]="true"
                      severity="danger"
                      (onClick)="deleteTrait(trait)"
                      title="Eliminar"
                    />
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="6">No hay rasgos en esta categorÃ­a</td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      }

      @if (traitsStore.entities().length === 0) {
        <p-card>
          <div class="empty-state">
            <span class="empty-icon">ðŸŽ­</span>
            <p>No hay rasgos de personalidad definidos</p>
            <p-button
              label="Crear Primer Rasgo"
              icon="pi pi-plus"
              (onClick)="openNewTraitDialog()"
              [style]="{
                background: '#fbbf24',
                border: 'none',
                color: '#000000',
                fontWeight: 'bold',
                marginTop: '1rem'
              }"
            />
          </div>
        </p-card>
      }
    </div>

    <!-- Dialog para crear/editar rasgo -->
    <p-dialog
      [visible]="showTraitDialog()"
      (visibleChange)="showTraitDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '600px' }"
      [header]="editingTrait() ? 'Editar Rasgo' : 'Nuevo Rasgo'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="saveTrait()" class="trait-form">
        <div class="form-row">
          <div class="form-group">
            <label for="label">Etiqueta *</label>
            <input
              id="label"
              type="text"
              pInputText
              [(ngModel)]="traitForm.label"
              name="label"
              required
              [disabled]="isLoading()"
              placeholder="Ej: JuguetÃ³n"
              (input)="updateValueFromLabel()"
            />
          </div>
          <div class="form-group">
            <label for="value">Valor *</label>
            <input
              id="value"
              type="text"
              pInputText
              [(ngModel)]="traitForm.value"
              name="value"
              required
              [disabled]="isLoading()"
              placeholder="Ej: jugueton"
              pattern="[a-z0-9_]+"
              title="Solo letras minÃºsculas, nÃºmeros y guiones bajos"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="category">CategorÃ­a</label>
            <p-dropdown
              id="category"
              [(ngModel)]="traitForm.category"
              name="category"
              [options]="categoryOptions"
              placeholder="Seleccionar categorÃ­a"
              [showClear]="true"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
          </div>
          <div class="form-group">
            <label for="display_order">Orden de VisualizaciÃ³n</label>
            <p-inputNumber
              id="display_order"
              [(ngModel)]="traitForm.display_order"
              name="display_order"
              [min]="0"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="icon">Icono/Emoji</label>
          <input
            id="icon"
            type="text"
            pInputText
            [(ngModel)]="traitForm.icon"
            name="icon"
            [disabled]="isLoading()"
            placeholder="Ej: ðŸŽ¾ o ðŸ˜Š"
            maxlength="2"
          />
          <small class="form-hint">Emoji o sÃ­mbolo que represente el rasgo (mÃ¡x. 2 caracteres)</small>
        </div>

        <div class="form-group">
          <label for="description">DescripciÃ³n</label>
          <textarea
            id="description"
            pTextarea
            [(ngModel)]="traitForm.description"
            name="description"
            [rows]="3"
            [disabled]="isLoading()"
            placeholder="DescripciÃ³n del rasgo de personalidad..."
          ></textarea>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <p-checkbox
              [(ngModel)]="traitForm.is_active"
              name="is_active"
              [binary]="true"
              [disabled]="isLoading()"
            />
            <span>Rasgo activo</span>
          </label>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingTrait() ? 'Actualizar' : 'Crear'"
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
      .personalities-container {
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

      .category-card {
        margin-bottom: 2rem;
      }

      ::ng-deep .p-datatable td .table-cell-content {
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
        padding: 0.5rem 0;
      }

      .trait-description {
        display: block;
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
        font-style: italic;
      }

      .trait-value {
        background: #f3f4f6;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-family: 'Courier New', monospace;
      }

      .trait-icon {
        font-size: 1.5rem;
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

      .trait-form {
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

      .form-hint {
        font-size: 0.75rem;
        color: #6b7280;
        font-style: italic;
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

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
      }

      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: #6b7280;
      }

      .empty-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 0.5rem;
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
export class AdminPersonalitiesComponent {
  private messageService = inject(MessageService);
  public traitsStore = inject(PersonalityTraitsStore);

  public showTraitDialog = signal(false);
  public editingTrait = signal<PersonalityTrait | null>(null);
  public isLoading = signal(false);

  public traitForm: Partial<PersonalityTrait> = {
    label: '',
    value: '',
    description: '',
    icon: '',
    category: '',
    display_order: 0,
    is_active: true,
  };

  public categoryOptions = [
    { label: 'Social', value: 'social' },
    { label: 'Actividad', value: 'actividad' },
    { label: 'Temperamento', value: 'temperamento' },
    { label: 'Comportamiento', value: 'comportamiento' },
    { label: 'General', value: 'general' },
  ];

  public categories = computed(() => {
    const cats = new Set(this.traitsStore.entities().map((t) => t.category || 'general'));
    return Array.from(cats).sort();
  });

  public getTraitsByCategory(category: string): PersonalityTrait[] {
    return this.traitsStore
      .entities()
      .filter((t) => (t.category || 'general') === category)
      .sort((a, b) => a.display_order - b.display_order);
  }

  public getCategoryLabel(category: string): string {
    const option = this.categoryOptions.find((opt) => opt.value === category);
    return option ? option.label : category;
  }

  public openNewTraitDialog(): void {
    this.editingTrait.set(null);
    this.resetForm();
    this.showTraitDialog.set(true);
  }

  public openEditDialog(trait: PersonalityTrait): void {
    this.editingTrait.set(trait);
    this.traitForm = {
      label: trait.label,
      value: trait.value,
      description: trait.description || '',
      icon: trait.icon || '',
      category: trait.category || '',
      display_order: trait.display_order,
      is_active: trait.is_active,
    };
    this.showTraitDialog.set(true);
  }

  public resetForm(): void {
    this.traitForm = {
      label: '',
      value: '',
      description: '',
      icon: '',
      category: '',
      display_order: 0,
      is_active: true,
    };
    this.editingTrait.set(null);
    this.showTraitDialog.set(false);
  }

  public updateValueFromLabel(): void {
    // Auto-generar el valor desde la etiqueta si estÃ¡ vacÃ­o
    if (!this.traitForm.value && this.traitForm.label) {
      this.traitForm.value = this.traitForm.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^a-z0-9]/g, '_') // Reemplazar caracteres especiales con guiones bajos
        .replace(/_+/g, '_') // Eliminar guiones bajos duplicados
        .replace(/^_|_$/g, ''); // Eliminar guiones bajos al inicio y final
    }
  }

  public saveTrait(): void {
    if (!this.traitForm.label || !this.traitForm.value) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    this.isLoading.set(true);

    const trait = this.editingTrait();
    if (trait) {
      const validFields: Partial<PersonalityTrait> = {
        id: trait.id,
        label: this.traitForm.label,
        value: this.traitForm.value,
        description: this.traitForm.description || undefined,
        icon: this.traitForm.icon || undefined,
        category: this.traitForm.category || undefined,
        display_order: this.traitForm.display_order || 0,
        is_active: this.traitForm.is_active,
      };

      this.traitsStore.editItem(validFields as PersonalityTrait).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Rasgo actualizado',
            detail: 'El rasgo de personalidad se ha actualizado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo actualizar el rasgo',
          });
          this.isLoading.set(false);
        },
      });
    } else {
      const validFields: Partial<PersonalityTrait> = {
        label: this.traitForm.label,
        value: this.traitForm.value,
        description: this.traitForm.description || undefined,
        icon: this.traitForm.icon || undefined,
        category: this.traitForm.category || undefined,
        display_order: this.traitForm.display_order || 0,
        is_active: this.traitForm.is_active,
      };

      this.traitsStore.createItem(validFields as PersonalityTrait).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Rasgo creado',
            detail: 'El rasgo de personalidad se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo crear el rasgo',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public toggleActive(trait: PersonalityTrait): void {
    this.isLoading.set(true);
    const updated: PersonalityTrait = {
      ...trait,
      is_active: !trait.is_active,
    };

    this.traitsStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `El rasgo ahora estÃ¡ ${updated.is_active ? 'activo' : 'inactivo'}`,
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

  public deleteTrait(trait: PersonalityTrait): void {
    this.traitsStore.deleteItem(trait.id);
  }
}




