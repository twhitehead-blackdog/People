import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { Branch, Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { TutorialStepDirective } from '../../shared/directives/tutorial-step.directive';

@Component({
  selector: 'pt-uniform-gestion-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    InputText,
    InputTextarea,
    Select,
    TooltipModule,
    TutorialStepDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Paso 1: Tipo de Prenda -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center"
          >
            <i class="pi pi-tag text-teal-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 1: Tipo de Prenda
          </h3>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-300"
            >¿Qué prenda necesitas?</label
          >
          <p-select
            [ngModel]="itemType()"
            (ngModelChange)="itemType.set($event)"
            [options]="itemTypeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecciona el tipo de prenda"
            styleClass="w-full"
            appendTo="body"
            ptTutorialStep="uniform-item-type"
          />
        </div>
      </div>

      <!-- Paso 2: Talla y Cantidades -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center"
          >
            <i class="pi pi-sliders-h text-teal-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 2: Talla y Cantidades
          </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300">Talla</label>
            <p-select
              [ngModel]="size()"
              (ngModelChange)="size.set($event)"
              [options]="sizeOptions"
              placeholder="Selecciona la talla"
              styleClass="w-full"
              appendTo="body"
              ptTutorialStep="uniform-size"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300">Cantidad que posee actualmente</label>
            <input
              pInputText
              type="number"
              [ngModel]="currentQuantity()"
              (ngModelChange)="currentQuantity.set($event)"
              min="0"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300">Cantidad que necesita</label>
            <input
              pInputText
              type="number"
              [ngModel]="quantity()"
              (ngModelChange)="quantity.set($event)"
              min="1"
              max="5"
              class="w-full"
              ptTutorialStep="uniform-quantity"
            />
            <small class="text-gray-500 text-xs">Máximo 5 unidades</small>
          </div>
        </div>
        @if (itemType() && size() && quantity() >= 1) {
        <div
          class="mt-3 p-3 bg-teal-500/10 border border-teal-400/30 rounded-lg"
        >
          <p class="text-sm text-teal-300">
            <i class="pi pi-check-circle mr-2"></i>
            Solicitud:
            <strong>{{ quantity() }}x {{ getItemTypeLabel() }}</strong>
            - Talla <strong>{{ size() }}</strong>
            @if (currentQuantity() > 0) {
              <span class="ml-2 text-gray-400">(posee: {{ currentQuantity() }})</span>
            }
          </p>
        </div>
        }
      </div>

      <!-- Paso 3: Notas Adicionales (Opcional) -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file-edit text-teal-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 3: Notas Adicionales (Opcional)
          </h3>
        </div>
        <textarea
          pInputTextarea
          [ngModel]="notes()"
          (ngModelChange)="notes.set($event)"
          placeholder="Comentarios adicionales sobre la solicitud (ej: motivo del cambio, etc.)"
          rows="3"
          class="w-full"
          ptTutorialStep="uniform-notes"
        ></textarea>
      </div>

      <!-- Botones de Acción -->
      <div class="flex justify-between pt-4">
        <p-button
          label="Volver"
          icon="pi pi-arrow-left"
          severity="secondary"
          (onClick)="close.emit()"
        />
        <p-button
          label="Solicitar Uniforme"
          icon="pi pi-check"
          [disabled]="!canSubmit()"
          [loading]="submitting()"
          (onClick)="submit()"
          severity="success"
          ptTutorialStep="uniform-submit"
        />
      </div>
    </div>
  `,
})
export class UniformGestionFormComponent {
  selectedEmployee = input.required<Employee>();
  currentEmployee = input<Employee | null>(null);
  currentBranch = input<Branch | null>(null);
  requestCreated = output<void>();
  close = output<void>();

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);
  private organizationService = inject(OrganizationService);

  public itemType = signal<string>('');
  public size = signal<string>('M');
  public currentQuantity = signal<number>(0);
  public quantity = signal<number>(1);
  public notes = signal<string>('');
  public submitting = signal<boolean>(false);

  public sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

  public itemTypeOptions = [
    { label: 'Camisa', value: 'camisa' },
    { label: 'Suéter', value: 'sueter' },
  ];

  public canSubmit = computed(() => {
    return !!(this.itemType().trim() && this.size() && this.quantity() >= 1);
  });

  public getItemTypeLabel(): string {
    const option = this.itemTypeOptions.find((o) => o.value === this.itemType());
    return option?.label || this.itemType() || 'Prenda';
  }

  public async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    this.submitting.set(true);

    try {
      const employee = this.selectedEmployee();
      const it = this.itemType();
      const s = this.size();
      const q = this.quantity();
      const cq = this.currentQuantity();
      const n = this.notes();

      const data = {
        employee_id: employee.id,
        document_type: 'uniform_request',
        reason: n || `Solicitud de ${it} - Talla ${s} - Cantidad: ${q}`,
        status: 'pending',
        created_by: this.currentEmployee()?.id || null,
        company_id: this.organizationService.getCurrentCompanyId(),
        metadata: {
          item_type: it,
          size: s,
          quantity: q,
          current_quantity: cq,
          branch_id: employee.branch?.id || this.currentBranch()?.id || null,
        },
      };

      await firstValueFrom(this.http.post(this.apiUrl.build('rest/v1/document_requests'), data));

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Solicitud de uniforme (${it}, talla ${s}) para ${employee.first_name} ${employee.father_name} enviada correctamente`,
      });

      this.requestCreated.emit();
    } catch (error: any) {
      console.error('Error submitting uniform request:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || error?.message || 'No se pudo enviar la solicitud.',
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
