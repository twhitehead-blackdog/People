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
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { firstValueFrom } from 'rxjs';
import { Branch, Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';

@Component({
  selector: 'pt-supply-gestion-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    InputTextarea,
    Select,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Banner de sucursal -->
      @if (currentEmployee()?.branch) {
      <div class="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-400/30 rounded-lg p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <i class="pi pi-shop text-amber-400"></i>
          </div>
          <div>
            <p class="text-xs text-gray-400 m-0">Solicitud para la sucursal</p>
            <h4 class="text-white font-semibold text-lg m-0">{{ currentEmployee()!.branch!.name }}</h4>
            <p class="text-amber-300 text-sm m-0">Solicitado por: {{ currentEmployee()!.first_name }} {{ currentEmployee()!.father_name }}</p>
          </div>
        </div>
      </div>
      }

      <!-- Paso 1: Área -->
      <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <i class="pi pi-map-marker text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">Paso 1: Área</h3>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-300">¿A qué área pertenece el insumo?</label>
          <p-select
            [ngModel]="area()"
            (ngModelChange)="area.set($event)"
            [options]="areaOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecciona el área"
            styleClass="w-full"
            appendTo="body"
          />
        </div>
      </div>

      <!-- Paso 2: Descripción del Insumo -->
      <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <i class="pi pi-box text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">Paso 2: Descripción del Insumo</h3>
        </div>
        <textarea
          pInputTextarea
          [ngModel]="supplyDescription()"
          (ngModelChange)="supplyDescription.set($event)"
          placeholder="Describe el insumo que necesitas (nombre, características, cantidad, etc.)"
          rows="3"
          class="w-full"
        ></textarea>
      </div>

      <!-- Paso 3: Motivo de la Solicitud -->
      <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <i class="pi pi-file-edit text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">Paso 3: Motivo de la Solicitud</h3>
        </div>
        <textarea
          pInputTextarea
          [ngModel]="supplyReason()"
          (ngModelChange)="supplyReason.set($event)"
          placeholder="Explica el motivo por el que se necesita este insumo"
          rows="3"
          class="w-full"
        ></textarea>
      </div>

      @if (canSubmit()) {
      <div class="p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg">
        <p class="text-sm text-amber-300">
          <i class="pi pi-check-circle mr-2"></i>
          <strong>{{ area() }}</strong> — {{ supplyDescription() | slice:0:60 }}{{ supplyDescription().length > 60 ? '...' : '' }}
        </p>
      </div>
      }

      <!-- Botones de Acción -->
      <div class="flex justify-between pt-4">
        <p-button
          label="Volver"
          icon="pi pi-arrow-left"
          severity="secondary"
          (onClick)="close.emit()"
        />
        <p-button
          label="Solicitar Insumo"
          icon="pi pi-check"
          [disabled]="!canSubmit()"
          [loading]="submitting()"
          (onClick)="submit()"
          severity="success"
        />
      </div>
    </div>
  `,
})
export class SupplyGestionFormComponent {
  /** The branch manager / sub-manager making the request — used as employee_id */
  currentEmployee = input.required<Employee>();
  currentBranch = input<Branch | null>(null);
  requestCreated = output<void>();
  close = output<void>();

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);
  private organizationService = inject(OrganizationService);

  public area = signal<string>('');
  public supplyDescription = signal<string>('');
  public supplyReason = signal<string>('');
  public submitting = signal<boolean>(false);

  public areaOptions = [
    { label: 'Veterinaria', value: 'Veterinaria' },
    { label: 'Tienda', value: 'Tienda' },
    { label: 'Peluquería', value: 'Peluquería' },
  ];

  public canSubmit = computed(() =>
    !!(this.area().trim() && this.supplyDescription().trim() && this.supplyReason().trim())
  );

  public async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    this.submitting.set(true);

    try {
      const requester = this.currentEmployee();
      const areaVal = this.area();
      const description = this.supplyDescription().trim();
      const reason = this.supplyReason().trim();

      const data = {
        employee_id: requester.id,
        document_type: 'supply_request',
        reason,
        status: 'pending',
        created_by: requester.id,
        company_id: this.organizationService.getCurrentCompanyId(),
        metadata: {
          area: areaVal,
          supply_description: description,
          supply_reason: reason,
          branch_id: requester.branch?.id || this.currentBranch()?.id || null,
        },
      };

      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/document_requests'), data)
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Solicitud de insumo (${areaVal}) para ${requester.branch?.name || 'la sucursal'} enviada correctamente`,
      });

      // Reset form
      this.area.set('');
      this.supplyDescription.set('');
      this.supplyReason.set('');

      this.requestCreated.emit();
    } catch (error: any) {
      console.error('Error submitting supply request:', error);
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
