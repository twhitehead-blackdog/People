import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputNumber } from 'primeng/inputnumber';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

type SelectOption = {
  label: string;
  value: string;
};

@Component({
  selector: 'pt-employee-portal-uniform-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    InputTextarea,
    InputNumber,
    Button,
    Select,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-tag text-teal-400"></i>
            <span>Solicitud de Uniforme</span>
          </div>
          <div class="flex items-center gap-2">
            <p-button
              icon="pi pi-times"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              [outlined]="true"
              (onClick)="closeSection.emit()"
              pTooltip="Volver a Gestiones"
              [style]="{ width: '2.5rem', height: '2.5rem' }"
            />
          </div>
        </div>
      </ng-template>
      <ng-template #subtitle
        >Solicita uniformes o prendas de trabajo</ng-template
      >

      <div
        class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center"
          >
            <i class="pi pi-box text-teal-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 1: Tipo de Prenda
          </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2 font-medium">
              <i class="pi pi-tag mr-2"></i>Prenda
            </label>
            <p-select
              [options]="itemTypes"
              [ngModel]="itemType"
              (ngModelChange)="itemTypeChange.emit($event)"
              placeholder="Selecciona prenda"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2 font-medium">
              <i class="pi pi-arrows-alt mr-2"></i>Talla
            </label>
            <p-select
              [options]="sizes"
              [ngModel]="size"
              (ngModelChange)="sizeChange.emit($event)"
              placeholder="Selecciona talla"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <div
        class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center"
          >
            <i class="pi pi-calculator text-teal-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">Paso 2: Cantidad</h3>
        </div>
        <div class="w-full md:w-1/3">
          <label class="block text-sm text-gray-400 mb-2 font-medium">
            <i class="pi pi-sort-numeric-up mr-2"></i>Cantidad
          </label>
          <p-inputNumber
            [ngModel]="quantity"
            (ngModelChange)="quantityChange.emit($event)"
            [min]="1"
            [max]="10"
            [showButtons]="true"
            buttonLayout="horizontal"
            incrementButtonIcon="pi pi-plus"
            decrementButtonIcon="pi pi-minus"
            class="w-full"
          />
        </div>
      </div>

      <div
        class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center"
          >
            <i class="pi pi-comment text-teal-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 3: Notas Adicionales (Opcional)
          </h3>
        </div>
        <textarea
          id="uniform-notes"
          pInputTextarea
          [ngModel]="notes"
          (ngModelChange)="notesChange.emit($event)"
          rows="3"
          placeholder="Ej: Necesito talla más grande que la actual..."
          class="w-full"
        ></textarea>
      </div>

      <div
        class="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-lg bg-gradient-to-r from-teal-500/10 to-teal-600/5 border border-teal-400/30 shadow-lg"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center"
          >
            <i class="pi pi-check-circle text-teal-400 text-xl"></i>
          </div>
          <div>
            <p class="text-sm text-gray-400 m-0">Resumen</p>
            <p class="text-lg font-bold text-teal-300 m-0">
              {{ quantity }}x {{ getItemTypeLabel(itemType) }} - Talla
              {{ size || 'N/A' }}
            </p>
          </div>
        </div>
        <p-button
          label="Enviar Solicitud"
          icon="pi pi-send"
          [loading]="submitting"
          [disabled]="!canSubmit || submitting"
          (onClick)="submitRequest.emit()"
          class="ml-auto"
        />
      </div>
    </p-card>
  `,
})
export class EmployeePortalUniformRequestComponent {
  @Input() itemType = '';
  @Output() itemTypeChange = new EventEmitter<string>();
  @Input() size = '';
  @Output() sizeChange = new EventEmitter<string>();
  @Input() quantity = 1;
  @Output() quantityChange = new EventEmitter<number>();
  @Input() notes = '';
  @Output() notesChange = new EventEmitter<string>();
  @Input() canSubmit = false;
  @Input() submitting = false;
  @Output() submitRequest = new EventEmitter<void>();
  @Output() closeSection = new EventEmitter<void>();

  public itemTypes: SelectOption[] = [
    { label: 'Camiseta Polo', value: 'polo_shirt' },
    { label: 'Camiseta Cuello Redondo', value: 'tshirt' },
    { label: 'Pantalón', value: 'pants' },
    { label: 'Delantal', value: 'apron' },
    { label: 'Gorra', value: 'cap' },
    { label: 'Calzado de Trabajo', value: 'work_shoes' },
    { label: 'Otro', value: 'other' },
  ];

  public sizes: SelectOption[] = [
    { label: 'XS', value: 'XS' },
    { label: 'S', value: 'S' },
    { label: 'M', value: 'M' },
    { label: 'L', value: 'L' },
    { label: 'XL', value: 'XL' },
    { label: 'XXL', value: 'XXL' },
    { label: 'XXXL', value: 'XXXL' },
  ];

  public getItemTypeLabel(value: string): string {
    const type = this.itemTypes.find((t) => t.value === value);
    return type?.label || 'Prenda';
  }
}
