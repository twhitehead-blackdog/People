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
import { startOfDay } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { FileUpload } from 'primeng/fileupload';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { Branch, Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { getEnv } from '../../utils/env.utils';

const PERMIT_TYPE_OPTIONS = [
  { label: 'Defunción', value: 'family_death' },
  { label: 'Personal', value: 'personal' },
  { label: 'Tema Médico', value: 'medical' },
  { label: 'Otros', value: 'other' },
];

@Component({
  selector: 'pt-work-permit-gestion-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    DatePicker,
    FileUpload,
    InputTextarea,
    Select,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Paso 1: Tipo de Permiso -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
          >
            <i class="pi pi-id-card text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 1: Tipo de Permiso
          </h3>
        </div>
        <p-select
          [options]="permitTypeOptions"
          optionLabel="label"
          optionValue="value"
          [ngModel]="permitType()"
          (ngModelChange)="permitType.set($event)"
          placeholder="Selecciona el tipo de permiso"
          styleClass="w-full"
          appendTo="body"
        />
      </div>

      <!-- Paso 2: Período -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
          >
            <i class="pi pi-calendar text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 2: Período
          </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300"
              >Fecha de Inicio</label
            >
            <p-datepicker
              [ngModel]="startDate()"
              (ngModelChange)="startDate.set($event)"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="Selecciona fecha de inicio"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300"
              >Fecha de Fin</label
            >
            <p-datepicker
              [ngModel]="endDate()"
              (ngModelChange)="endDate.set($event)"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="Selecciona fecha de fin"
              [minDate]="startDate() || today"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
        </div>

        <!-- Campos opcionales de hora (para permisos parciales) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300"
              >Hora de Inicio
              <span class="text-gray-500 text-xs">(Opcional)</span></label
            >
            <p-datepicker
              [ngModel]="startTime()"
              (ngModelChange)="startTime.set($event)"
              [showIcon]="true"
              [timeOnly]="true"
              [showTime]="true"
              [hourFormat]="'12'"
              placeholder="Hora inicio"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300"
              >Hora de Fin
              <span class="text-gray-500 text-xs">(Opcional)</span></label
            >
            <p-datepicker
              [ngModel]="endTime()"
              (ngModelChange)="endTime.set($event)"
              [showIcon]="true"
              [timeOnly]="true"
              [showTime]="true"
              [hourFormat]="'12'"
              placeholder="Hora fin"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
        </div>

        @if (equivalentDisplay()) {
        <div
          class="mt-3 p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg"
        >
          <p class="text-sm text-amber-300">
            <i class="pi pi-info-circle mr-2"></i>
            Equivalente: <strong>{{ equivalentDisplay() }}</strong>
          </p>
        </div>
        }
      </div>

      <!-- Paso 3: Observaciones -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file-edit text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 3: Observaciones
          </h3>
        </div>
        <textarea
          pInputTextarea
          [ngModel]="observations()"
          (ngModelChange)="observations.set($event)"
          placeholder="Describe el motivo del permiso, observaciones adicionales..."
          rows="4"
          class="w-full"
        ></textarea>
      </div>

      <!-- Paso 4: Documento (Opcional) -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 4: Documento
            <span class="text-gray-400 text-sm font-normal">(Opcional)</span>
          </h3>
        </div>
        <p class="text-sm text-gray-400 mb-4">
          Adjunta un documento de soporte en formato PDF o imagen (certificado
          médico, etc.).
        </p>
        <p-fileUpload
          mode="basic"
          accept=".pdf,.jpg,.jpeg,.png"
          maxFileSize="5000000"
          [auto]="false"
          chooseLabel="Seleccionar Archivo"
          (onSelect)="onFileSelect($event)"
          class="w-full"
        />
        @if (file()) {
        <div
          class="mt-3 p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            @if (uploadingDoc()) {
            <i class="pi pi-spin pi-spinner text-amber-400"></i>
            <span class="text-sm text-gray-300">Subiendo...</span>
            } @else {
            <i class="pi pi-file text-amber-400"></i>
            <span class="text-sm text-gray-300">{{ file()!.name }}</span>
            }
          </div>
          <p-button
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            size="small"
            (onClick)="clearFile()"
            pTooltip="Eliminar archivo"
            [disabled]="uploadingDoc()"
          />
        </div>
        }
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
          label="Enviar Solicitud"
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
export class WorkPermitGestionFormComponent {
  selectedEmployee = input.required<Employee>();
  currentEmployee = input<Employee | null>(null);
  currentBranch = input<Branch | null>(null);
  requestCreated = output<void>();
  close = output<void>();

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);
  private organizationService = inject(OrganizationService);

  public today = startOfDay(new Date());
  public permitTypeOptions = PERMIT_TYPE_OPTIONS;

  // Signals
  public permitType = signal<string | null>(null);
  public startDate = signal<Date | null>(null);
  public endDate = signal<Date | null>(null);
  public startTime = signal<Date | null>(null);
  public endTime = signal<Date | null>(null);
  public observations = signal<string>('');
  public file = signal<File | null>(null);
  public docUrl = signal<string | null>(null);
  public submitting = signal<boolean>(false);
  public uploadingDoc = signal<boolean>(false);

  public equivalentValue = computed(() => {
    const start = this.startDate();
    const end = this.endDate();
    const tStart = this.startTime();
    const tEnd = this.endTime();

    if (tStart && tEnd) {
      const diffMs = tEnd.getTime() - tStart.getTime();
      if (diffMs > 0) {
        return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      }
      return null;
    }

    if (start && end) {
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    return null;
  });

  public equivalentUnit = computed<'hours' | 'days' | null>(() => {
    const tStart = this.startTime();
    const tEnd = this.endTime();
    if (tStart && tEnd) return 'hours';
    if (this.startDate() && this.endDate()) return 'days';
    return null;
  });

  public equivalentDisplay = computed(() => {
    const value = this.equivalentValue();
    const unit = this.equivalentUnit();
    if (value == null || !unit) return '';
    const unitLabel = unit === 'hours' ? 'hora(s)' : 'día(s)';
    return `${value} ${unitLabel}`;
  });

  public canSubmit = computed(() => {
    return !!(this.permitType() && this.startDate() && this.endDate());
  });

  public async onFileSelect(event: any): Promise<void> {
    const files = event.currentFiles || event.files;
    if (!files || files.length === 0) return;

    const f = files[0];
    this.file.set(f);
    this.uploadingDoc.set(true);

    try {
      const employeeId = this.selectedEmployee()?.id || 'temp';
      const fileExt = f.name.split('.').pop();
      const fileName = `work-permits/${employeeId}/${Date.now()}.${fileExt}`;
      const storageKey = getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') || getEnv('ENV_SUPABASE_API_KEY') || '';
      const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${fileName}`;

      await firstValueFrom(
        this.http.post(uploadUrl, f, {
          headers: { apikey: storageKey, Authorization: `Bearer ${storageKey}`, 'x-upsert': 'true' },
        })
      );
      this.docUrl.set(this.apiUrl.build(`storage/v1/object/public/employee-documents/${fileName}`));
    } catch (error) {
      console.error('Background upload failed:', error);
      this.docUrl.set(null);
    } finally {
      this.uploadingDoc.set(false);
    }
  }

  public clearFile(): void {
    this.file.set(null);
    this.docUrl.set(null);
  }

  public async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    if (this.uploadingDoc()) {
      this.messageService.add({ severity: 'info', summary: 'Subiendo archivo...', detail: 'Por favor espera a que termine de subirse el documento adjunto.' });
      return;
    }

    this.submitting.set(true);

    try {
      const employee = this.selectedEmployee();
      const start = this.startDate()!;
      const end = this.endDate()!;
      let documentUrl = this.docUrl();
      const f = this.file();

      // Fallback upload
      if (f && !documentUrl) {
        const fileExt = f.name.split('.').pop();
        const fileName = `work-permits/${employee.id}/${Date.now()}.${fileExt}`;
        const storageKey = getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') || getEnv('ENV_SUPABASE_API_KEY') || '';
        const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${fileName}`;
        await firstValueFrom(
          this.http.post(uploadUrl, f, {
            headers: { apikey: storageKey, Authorization: `Bearer ${storageKey}`, 'x-upsert': 'true' },
          })
        );
        documentUrl = this.apiUrl.build(`storage/v1/object/public/employee-documents/${fileName}`);
      }

      const formatTime = (d: Date | null): string | null => {
        if (!d) return null;
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
      };

      const data = {
        employee_id: employee.id,
        permit_type: this.permitType(),
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        start_time: formatTime(this.startTime()),
        end_time: formatTime(this.endTime()),
        equivalent_value: this.equivalentValue(),
        equivalent_unit: this.equivalentUnit(),
        observations: this.observations() || null,
        document_url: documentUrl || null,
        status: 'pending',
        created_by: this.currentEmployee()?.id || null,
        company_id: this.organizationService.getCurrentCompanyId(),
      };

      await firstValueFrom(this.http.post(this.apiUrl.build('rest/v1/work_permits'), data));

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Solicitud de permiso para ${employee.first_name} ${employee.father_name} registrada correctamente`,
      });

      this.requestCreated.emit();
    } catch (error: any) {
      console.error('Error submitting work permit:', error);
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
