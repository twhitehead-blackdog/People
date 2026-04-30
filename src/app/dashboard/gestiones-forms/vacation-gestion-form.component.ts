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
import { Textarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { Branch, Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { getEnv } from '../../utils/env.utils';
import { TutorialStepDirective } from '../../shared/directives/tutorial-step.directive';
import { EmployeeNotificationService } from '../../services/employee-notification.service';

@Component({
  selector: 'pt-vacation-gestion-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    DatePicker,
    FileUpload,
    Textarea,
    TooltipModule,
    TutorialStepDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Paso 1: Período de Vacaciones -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"
          >
            <i class="pi pi-calendar text-purple-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 1: Período de Vacaciones
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
              ptTutorialStep="vacations-start-date"
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
              ptTutorialStep="vacations-end-date"
            />
          </div>
        </div>
        @if (daysCount() > 0) {
        <div
          class="mt-3 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg"
        >
          <p class="text-sm text-purple-300">
            <i class="pi pi-info-circle mr-2"></i>
            Total:
            <strong>{{ daysCount() }} día(s) de vacaciones</strong>
          </p>
        </div>
        }
      </div>

      <!-- Paso 2: Motivo -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file-edit text-purple-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 2: Motivo (Opcional)
          </h3>
        </div>
        <textarea
          pInputTextarea
          [ngModel]="reason()"
          (ngModelChange)="reason.set($event)"
          placeholder="Motivo o comentarios adicionales sobre las vacaciones"
          rows="3"
          class="w-full"
          ptTutorialStep="vacations-reason"
        ></textarea>
      </div>

      <!-- Paso 3: Documento de Respaldo -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file text-purple-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 3: Documento de Respaldo (Opcional)
          </h3>
        </div>
        <p class="text-sm text-gray-400 mb-4">
          Si tienes una solicitud física firmada, puedes adjuntarla como
          PDF para respaldar la solicitud.
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
        <p class="text-xs text-gray-500 mt-2">
          Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
        </p>
        @if (file()) {
        <div
          class="mt-3 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            @if (uploadingDoc()) {
            <i class="pi pi-spin pi-spinner text-purple-400"></i>
            <span class="text-sm text-gray-300">Subiendo...</span>
            } @else {
            <i class="pi pi-file text-purple-400"></i>
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
          label="Solicitar Vacaciones"
          icon="pi pi-check"
          [disabled]="!canSubmit()"
          [loading]="submitting()"
          (onClick)="submit()"
          severity="success"
          ptTutorialStep="vacations-submit"
        />
      </div>
    </div>
  `,
})
export class VacationGestionFormComponent {
  selectedEmployee = input.required<Employee>();
  currentEmployee = input<Employee | null>(null);
  currentBranch = input<Branch | null>(null);
  requestCreated = output<void>();
  close = output<void>();

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);
  private organizationService = inject(OrganizationService);
  private notificationService = inject(EmployeeNotificationService);

  public today = startOfDay(new Date());

  public startDate = signal<Date | null>(null);
  public endDate = signal<Date | null>(null);
  public reason = signal<string>('');
  public file = signal<File | null>(null);
  public docUrl = signal<string | null>(null);
  public submitting = signal<boolean>(false);
  public uploadingDoc = signal<boolean>(false);

  public daysCount = computed(() => {
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end) return 0;
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  });

  public canSubmit = computed(() => !!(this.startDate() && this.endDate()));

  public async onFileSelect(event: any): Promise<void> {
    const files = event.currentFiles || event.files;
    if (!files || files.length === 0) return;

    const f = files[0];
    this.file.set(f);
    this.uploadingDoc.set(true);

    try {
      const employeeId = this.selectedEmployee()?.id || 'temp';
      const fileExt = f.name.split('.').pop();
      const fileName = `${employeeId}_${Date.now()}.${fileExt}`;
      const filePath = `vacations/${fileName}`;
      const storageKey = getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') || getEnv('ENV_SUPABASE_API_KEY') || '';
      const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${filePath}`;

      await firstValueFrom(
        this.http.post(uploadUrl, f, {
          headers: { apikey: storageKey, Authorization: `Bearer ${storageKey}`, 'x-upsert': 'true' },
        })
      );
      this.docUrl.set(this.apiUrl.build(`storage/v1/object/public/employee-documents/${filePath}`));
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
      const f = this.file();
      let documentUrl = this.docUrl() || '';

      // Fallback upload
      if (f && !documentUrl) {
        const fileExt = f.name.split('.').pop();
        const fileName = `${employee.id}_${Date.now()}.${fileExt}`;
        const filePath = `vacations/${fileName}`;
        const apiKey = getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') || getEnv('ENV_SUPABASE_API_KEY') || '';
        if (!apiKey) throw new Error('No se pudo obtener la clave de API de Supabase');
        const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${filePath}`;
        await firstValueFrom(
          this.http.post(uploadUrl, f, {
            headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'x-upsert': 'true' },
          })
        );
        documentUrl = this.apiUrl.build(`storage/v1/object/public/employee-documents/${filePath}`);
      }

      const data = {
        employee_id: employee.id,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        reason: this.reason() || null,
        document_url: documentUrl || null,
        status: 'pending',
        created_by: this.currentEmployee()?.id || null,
        company_id: this.organizationService.getCurrentCompanyId(),
      };

      await firstValueFrom(this.http.post(this.apiUrl.build('rest/v1/employee_vacations'), data));

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Vacaciones para ${employee.first_name} ${employee.father_name} solicitadas correctamente`,
      });

      this.notificationService.notifyNewRequest('vacation', `${employee.first_name} ${employee.father_name}`, {
        'Fecha inicio': data.start_date,
        'Fecha fin': data.end_date,
        ...(data.reason ? { Motivo: data.reason } : {}),
      });

      this.requestCreated.emit();
    } catch (error: any) {
      console.error('Error submitting vacation:', error);
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
