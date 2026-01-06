import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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
import { SystemSetting } from '../models';
import { SystemSettingsStore } from '../stores/system-settings.store';

@Component({
  selector: 'pt-admin-settings',
  standalone: true,
  changeDetection: import('@angular/core').ChangeDetectionStrategy.OnPush,
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
    <div class="settings-container">
      <div class="section-header">
        <h2>ConfiguraciÃ³n del Sistema</h2>
        <p-button
          label="Nueva ConfiguraciÃ³n"
          icon="pi pi-plus"
          (onClick)="openNewSettingDialog()"
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
            [value]="getSettingsByCategory(category)"
            [paginator]="false"
            styleClass="p-datatable-striped"
            [loading]="settingsStore.isLoading()"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>Clave</th>
                <th>Valor</th>
                <th>Tipo</th>
                <th>PÃºblico</th>
                <th>Acciones</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-setting>
              <tr>
                <td>
                  <div class="table-cell-content">
                    <strong>{{ setting.key }}</strong>
                    @if (setting.description) {
                      <small class="setting-description">{{ setting.description }}</small>
                    }
                  </div>
                </td>
                <td>
                  <div class="table-cell-content">
                    @if (setting.value_type === 'boolean') {
                      <p-tag
                        [value]="setting.value === 'true' ? 'SÃ­' : 'No'"
                        [severity]="setting.value === 'true' ? 'success' : 'secondary'"
                      />
                    } @else if (setting.value_type === 'json') {
                      <code class="json-value">{{ setting.value?.substring(0, 50) }}{{ setting.value && setting.value.length > 50 ? '...' : '' }}</code>
                    } @else {
                      {{ setting.value || '(vacÃ­o)' }}
                    }
                  </div>
                </td>
                <td>
                  <div class="table-cell-content">
                    <p-tag
                      [value]="setting.value_type"
                      severity="info"
                    />
                  </div>
                </td>
                <td>
                  <div class="table-cell-content">
                    <p-tag
                      [value]="setting.is_public ? 'SÃ­' : 'No'"
                      [severity]="setting.is_public ? 'success' : 'secondary'"
                    />
                  </div>
                </td>
                <td>
                  <div class="action-buttons">
                    <p-button
                      icon="pi pi-pencil"
                      [text]="true"
                      severity="info"
                      (onClick)="openEditDialog(setting)"
                      [style]="{ marginRight: '0.5rem' }"
                      title="Editar"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [text]="true"
                      severity="danger"
                      (onClick)="deleteSetting(setting)"
                      title="Eliminar"
                    />
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="5">No hay configuraciones en esta categorÃ­a</td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      }

      @if (settingsStore.entities().length === 0) {
        <p-card>
          <div class="empty-state">
            <span class="empty-icon">âš™ï¸</span>
            <p>No hay configuraciones definidas</p>
            <p-button
              label="Crear Primera ConfiguraciÃ³n"
              icon="pi pi-plus"
              (onClick)="openNewSettingDialog()"
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

    <!-- Dialog para crear/editar configuraciÃ³n -->
    <p-dialog
      [visible]="showSettingDialog()"
      (visibleChange)="showSettingDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '700px' }"
      [header]="editingSetting() ? 'Editar ConfiguraciÃ³n' : 'Nueva ConfiguraciÃ³n'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="saveSetting()" class="setting-form">
        <div class="form-group">
          <label for="key">Clave *</label>
          <input
            id="key"
            type="text"
            pInputText
            [(ngModel)]="settingForm.key"
            name="key"
            required
            [disabled]="isLoading() || editingSetting() !== null"
            placeholder="ej: contact_email"
            pattern="[a-z0-9_]+"
            title="Solo letras minÃºsculas, nÃºmeros y guiones bajos"
          />
          <small class="form-hint">Solo letras minÃºsculas, nÃºmeros y guiones bajos (sin espacios)</small>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="category">CategorÃ­a *</label>
            <p-dropdown
              id="category"
              [(ngModel)]="settingForm.category"
              name="category"
              [options]="categoryOptions"
              placeholder="Seleccionar categorÃ­a"
              [showClear]="false"
              [disabled]="isLoading()"
              required
              [style]="{ width: '100%' }"
            />
          </div>
          <div class="form-group">
            <label for="value_type">Tipo de Valor *</label>
            <p-dropdown
              id="value_type"
              [(ngModel)]="settingForm.value_type"
              name="value_type"
              [options]="valueTypeOptions"
              placeholder="Seleccionar tipo"
              [showClear]="false"
              [disabled]="isLoading()"
              required
              (onChange)="onValueTypeChange()"
              [style]="{ width: '100%' }"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="value">Valor</label>
          @if (settingForm.value_type === 'boolean') {
            <p-dropdown
              id="value"
              [(ngModel)]="settingForm.value"
              name="value"
              [options]="booleanOptions"
              placeholder="Seleccionar valor"
              [showClear]="false"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
          } @else if (settingForm.value_type === 'number') {
            <p-inputNumber
              id="value"
              [(ngModel)]="numberValue"
              name="value"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
              (onInput)="onNumberChange($event)"
            />
          } @else if (settingForm.value_type === 'json') {
            <textarea
              id="value"
              pTextarea
              [(ngModel)]="settingForm.value"
              name="value"
              [rows]="5"
              [disabled]="isLoading()"
              placeholder='{"key": "value"}'
            ></textarea>
            <small class="form-hint">Ingresa un JSON vÃ¡lido</small>
          } @else {
            <input
              id="value"
              type="text"
              pInputText
              [(ngModel)]="settingForm.value"
              name="value"
              [disabled]="isLoading()"
              placeholder="Valor de la configuraciÃ³n"
            />
          }
        </div>

        <div class="form-group">
          <label for="description">DescripciÃ³n</label>
          <textarea
            id="description"
            pTextarea
            [(ngModel)]="settingForm.description"
            name="description"
            [rows]="2"
            [disabled]="isLoading()"
            placeholder="DescripciÃ³n de esta configuraciÃ³n..."
          ></textarea>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <p-checkbox
              [(ngModel)]="settingForm.is_public"
              name="is_public"
              [binary]="true"
              [disabled]="isLoading()"
            />
            <span>ConfiguraciÃ³n pÃºblica (accesible sin autenticaciÃ³n)</span>
          </label>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingSetting() ? 'Actualizar' : 'Crear'"
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
      .settings-container {
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

      .setting-description {
        display: block;
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
        font-style: italic;
      }

      .json-value {
        background: #f3f4f6;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-family: 'Courier New', monospace;
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

      .setting-form {
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
export class AdminSettingsComponent {
  private messageService = inject(MessageService);
  public settingsStore = inject(SystemSettingsStore);

  public showSettingDialog = signal(false);
  public editingSetting = signal<SystemSetting | null>(null);
  public isLoading = signal(false);
  public numberValue = signal<number | null>(null);

  public settingForm: Partial<SystemSetting> = {
    key: '',
    value: '',
    value_type: 'string',
    category: 'general',
    description: '',
    is_public: false,
  };

  public categoryOptions = [
    { label: 'General', value: 'general' },
    { label: 'Email', value: 'email' },
    { label: 'LÃ­mites', value: 'limits' },
    { label: 'Redes Sociales', value: 'social' },
    { label: 'URLs', value: 'urls' },
    { label: 'Texto', value: 'text' },
    { label: 'Otro', value: 'other' },
  ];

  public valueTypeOptions = [
    { label: 'Texto', value: 'string' },
    { label: 'NÃºmero', value: 'number' },
    { label: 'Booleano', value: 'boolean' },
    { label: 'JSON', value: 'json' },
  ];

  public booleanOptions = [
    { label: 'SÃ­', value: 'true' },
    { label: 'No', value: 'false' },
  ];

  public categories = computed(() => {
    const cats = new Set(this.settingsStore.entities().map((s) => s.category));
    return Array.from(cats).sort();
  });

  public getSettingsByCategory(category: string): SystemSetting[] {
    return this.settingsStore
      .entities()
      .filter((s) => s.category === category)
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  public getCategoryLabel(category: string): string {
    const option = this.categoryOptions.find((opt) => opt.value === category);
    return option ? option.label : category;
  }

  public openNewSettingDialog(): void {
    this.editingSetting.set(null);
    this.resetForm();
    this.showSettingDialog.set(true);
  }

  public openEditDialog(setting: SystemSetting): void {
    this.editingSetting.set(setting);
    this.settingForm = {
      key: setting.key,
      value: setting.value || '',
      value_type: setting.value_type,
      category: setting.category,
      description: setting.description || '',
      is_public: setting.is_public,
    };
    if (setting.value_type === 'number' && setting.value) {
      this.numberValue.set(parseFloat(setting.value));
    }
    this.showSettingDialog.set(true);
  }

  public resetForm(): void {
    this.settingForm = {
      key: '',
      value: '',
      value_type: 'string',
      category: 'general',
      description: '',
      is_public: false,
    };
    this.numberValue.set(null);
    this.editingSetting.set(null);
    this.showSettingDialog.set(false);
  }

  public onValueTypeChange(): void {
    // Resetear el valor cuando cambia el tipo
    if (this.settingForm.value_type === 'number') {
      this.numberValue.set(null);
      this.settingForm.value = '';
    } else if (this.settingForm.value_type === 'boolean') {
      this.settingForm.value = 'false';
    } else if (this.settingForm.value_type === 'json') {
      this.settingForm.value = '{}';
    }
  }

  public onNumberChange(event: any): void {
    const value = event.value;
    this.settingForm.value = value !== null ? String(value) : '';
  }

  public saveSetting(): void {
    if (!this.settingForm.key || !this.settingForm.value_type || !this.settingForm.category) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    // Validar JSON si es tipo json
    if (this.settingForm.value_type === 'json' && this.settingForm.value) {
      try {
        JSON.parse(this.settingForm.value);
      } catch (e) {
        this.messageService.add({
          severity: 'error',
          summary: 'JSON invÃ¡lido',
          detail: 'El valor JSON no es vÃ¡lido. Por favor verifica la sintaxis.',
        });
        return;
      }
    }

    this.isLoading.set(true);

    const setting = this.editingSetting();
    if (setting) {
      const validFields: Partial<SystemSetting> = {
        id: setting.id,
        key: this.settingForm.key,
        value: this.settingForm.value || undefined,
        value_type: this.settingForm.value_type,
        category: this.settingForm.category,
        description: this.settingForm.description || undefined,
        is_public: this.settingForm.is_public,
      };

      this.settingsStore.editItem(validFields as SystemSetting).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'ConfiguraciÃ³n actualizada',
            detail: 'La configuraciÃ³n se ha actualizado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo actualizar la configuraciÃ³n',
          });
          this.isLoading.set(false);
        },
      });
    } else {
      const validFields: Partial<SystemSetting> = {
        key: this.settingForm.key,
        value: this.settingForm.value || undefined,
        value_type: this.settingForm.value_type,
        category: this.settingForm.category,
        description: this.settingForm.description || undefined,
        is_public: this.settingForm.is_public,
      };

      this.settingsStore.createItem(validFields as SystemSetting).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'ConfiguraciÃ³n creada',
            detail: 'La configuraciÃ³n se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo crear la configuraciÃ³n',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public deleteSetting(setting: SystemSetting): void {
    this.settingsStore.deleteItem(setting.id);
  }
}


