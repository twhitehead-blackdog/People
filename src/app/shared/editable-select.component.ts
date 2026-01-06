import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

export interface EditableOption {
  label: string;
  value: string;
}

@Component({
  selector: 'pt-editable-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    InputText,
    Button,
    DialogModule,
  ],
  template: `
    <div class="editable-select-wrapper">
      <div class="select-container">
        <p-select
          [ngModel]="currentValue()"
          (ngModelChange)="onValueChange($event)"
          [options]="displayOptions()"
          [optionLabel]="optionLabel"
          [optionValue]="optionValue"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [styleClass]="styleClass"
          [name]="name"
        />
      </div>
      <div class="actions-container">
        @if (currentValue() && currentValue() !== '__ADD_NEW__') {
        <button
          type="button"
          class="action-btn edit-btn"
          (click)="openEditDialogForCurrent()"
          [attr.aria-label]="'Editar opciÃ³n seleccionada'"
          title="Editar"
        >
          <i class="pi pi-pencil"></i>
        </button>
        <button
          type="button"
          class="action-btn delete-btn"
          (click)="confirmDeleteCurrent()"
          [attr.aria-label]="'Borrar opciÃ³n seleccionada'"
          title="Borrar"
        >
          <i class="pi pi-trash"></i>
        </button>
        }
        <button
          type="button"
          class="action-btn add-btn"
          (click)="openAddDialog()"
          [attr.aria-label]="'Agregar nueva opciÃ³n'"
          title="Agregar nuevo"
        >
          <i class="pi pi-plus"></i>
        </button>
      </div>
    </div>

    <!-- Dialog para editar/agregar opciÃ³n -->
    <p-dialog
      [visible]="showEditDialog()"
      (visibleChange)="showEditDialog.set($event)"
      [modal]="true"
      [header]="editingOption() ? 'Editar OpciÃ³n' : 'Agregar Nueva OpciÃ³n'"
      [style]="{ width: '400px' }"
      (onHide)="closeEditDialog()"
    >
      <div class="edit-dialog-content">
        <div class="form-group">
          <label for="option-label">Etiqueta *</label>
          <input
            id="option-label"
            type="text"
            pInputText
            [(ngModel)]="editFormLabel"
            placeholder="Ingresa la etiqueta"
            class="w-full"
          />
        </div>
        <div class="form-group">
          <label for="option-value">Valor *</label>
          <input
            id="option-value"
            type="text"
            pInputText
            [(ngModel)]="editFormValue"
            placeholder="Ingresa el valor (opcional, se genera automÃ¡ticamente)"
            class="w-full"
          />
          <small class="form-hint">
            Si se deja vacÃ­o, se generarÃ¡ automÃ¡ticamente desde la etiqueta
          </small>
        </div>
        <div class="dialog-actions">
          <p-button
            label="Guardar"
            (onClick)="saveOption()"
            [disabled]="!editFormLabel || editFormLabel.trim() === ''"
            [style]="{
              background: '#fbbf24',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold'
            }"
          />
          <p-button
            label="Cancelar"
            severity="secondary"
            (onClick)="closeEditDialog()"
            [style]="{
              background: '#e5e7eb',
              border: 'none',
              color: '#374151'
            }"
          />
        </div>
      </div>
    </p-dialog>
  `,
  styles: [
    `
      .editable-select-wrapper {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        width: 100%;
      }

      .select-container {
        flex: 1;
      }

      .actions-container {
        display: flex;
        gap: 0.25rem;
        align-items: center;
        margin-top: 0.25rem;
      }

      .action-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        padding: 0;
      }

      .edit-btn {
        background-color: #3b82f6;
        color: white;
      }

      .edit-btn:hover {
        background-color: #2563eb;
        transform: scale(1.1);
      }

      .delete-btn {
        background-color: #ef4444;
        color: white;
      }

      .delete-btn:hover {
        background-color: #dc2626;
        transform: scale(1.1);
      }

      .add-btn {
        background-color: #10b981;
        color: white;
      }

      .add-btn:hover {
        background-color: #059669;
        transform: scale(1.1);
      }

      .action-btn i {
        font-size: 0.875rem;
      }

      .edit-dialog-content {
        display: flex;
        flex-direction: column;
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

      .dialog-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 1rem;
      }
    `,
  ],
})
export class EditableSelectComponent implements OnInit, OnChanges {
  @Input() options: EditableOption[] = [];
  @Input() selectedValue: string | null = null;
  @Input() placeholder = 'Seleccionar...';
  @Input() disabled = false;
  @Input() styleClass = 'w-full';
  @Input() name = '';
  @Input() optionLabel = 'label';
  @Input() optionValue = 'value';

  @Output() valueChange = new EventEmitter<string | null>();
  @Output() optionsChange = new EventEmitter<EditableOption[]>();

  public showEditDialog = signal(false);
  public editingOption = signal<EditableOption | null>(null);
  public editFormLabel = '';
  public editFormValue = '';

  public displayOptions = signal<EditableOption[]>([]);
  public currentValue = signal<string | null>(null);

  ngOnInit(): void {
    this.currentValue.set(this.selectedValue);
    this.updateDisplayOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.updateDisplayOptions();
    }
    if (changes['selectedValue']) {
      this.currentValue.set(this.selectedValue);
    }
  }

  private updateDisplayOptions(): void {
    // No agregamos la opciÃ³n de "Agregar nuevo" aquÃ­, la manejamos con botones externos
    this.displayOptions.set([...this.options]);
  }

  onValueChange(value: string | null): void {
    this.currentValue.set(value);
    this.valueChange.emit(value);
  }

  openEditDialogForCurrent(): void {
    const current = this.currentValue();
    if (!current || current === '__ADD_NEW__') {
      return;
    }

    const option = this.options.find((opt) => this.getOptionValue(opt) === current);
    if (option) {
      this.editingOption.set(option);
      this.editFormLabel = option.label;
      this.editFormValue = option.value;
      this.showEditDialog.set(true);
    }
  }

  openAddDialog(): void {
    this.editingOption.set(null);
    this.editFormLabel = '';
    this.editFormValue = '';
    this.showEditDialog.set(true);
  }

  confirmDeleteCurrent(): void {
    const current = this.currentValue();
    if (!current || current === '__ADD_NEW__') {
      return;
    }

    const option = this.options.find((opt) => this.getOptionValue(opt) === current);
    if (option && confirm(`Â¿EstÃ¡s seguro de que deseas eliminar "${option.label}"?`)) {
      const updatedOptions = this.options.filter(
        (opt) => this.getOptionValue(opt) !== current
      );

      // Si la opciÃ³n eliminada estaba seleccionada, limpiar la selecciÃ³n
      this.currentValue.set(null);
      this.valueChange.emit(null);

      this.optionsChange.emit(updatedOptions);
      this.updateDisplayOptions();
    }
  }

  closeEditDialog(): void {
    this.showEditDialog.set(false);
    this.editingOption.set(null);
    this.editFormLabel = '';
    this.editFormValue = '';
  }

  saveOption(): void {
    if (!this.editFormLabel || this.editFormLabel.trim() === '') {
      return;
    }

    const newValue =
      this.editFormValue.trim() ||
      this.editFormLabel.trim().toLowerCase().replace(/\s+/g, '_');

    const newOption: EditableOption = {
      label: this.editFormLabel.trim(),
      value: newValue,
    };

    let updatedOptions: EditableOption[];

    if (this.editingOption()) {
      // Editar opciÃ³n existente
      updatedOptions = this.options.map((opt) =>
        this.getOptionValue(opt) === this.getOptionValue(this.editingOption()!)
          ? newOption
          : opt
      );
    } else {
      // Agregar nueva opciÃ³n
      updatedOptions = [...this.options, newOption];
      // Seleccionar la nueva opciÃ³n automÃ¡ticamente
      this.currentValue.set(newValue);
      this.valueChange.emit(newValue);
    }

    this.optionsChange.emit(updatedOptions);
    this.updateDisplayOptions();
    this.closeEditDialog();
  }

  private getOptionValue(option: any): string {
    return option[this.optionValue] || option.value || '';
  }
}



