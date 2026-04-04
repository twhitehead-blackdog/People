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
import { TutorialStepDirective } from '../../shared/directives/tutorial-step.directive';
import { notifyBranchManagers } from '../../utils/manager-notification.utils';

@Component({
  selector: 'pt-timelog-correction-gestion-form',
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
    TutorialStepDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Paso 1: Fecha y Tipo de Marcación -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
          >
            <i class="pi pi-calendar text-orange-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 1: Fecha y Tipo de Marcación
          </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300"
              >Fecha de la Omisión de Marcación</label
            >
            <p-datepicker
              [ngModel]="correctionDate()"
              (ngModelChange)="correctionDate.set($event)"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="Selecciona la fecha"
              [maxDate]="today"
              styleClass="w-full"
              appendTo="body"
              ptTutorialStep="timelog-correction-date"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300"
              >Tipo de Marcación</label
            >
            <p-select
              [ngModel]="correctionType()"
              (ngModelChange)="correctionType.set($event)"
              [options]="typeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Selecciona el tipo"
              styleClass="w-full"
              appendTo="body"
              ptTutorialStep="timelog-correction-type"
            />
          </div>
        </div>
        @if (correctionDate() && correctionType()) {
        <div
          class="mt-3 p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg"
        >
          <p class="text-sm text-orange-300">
            <i class="pi pi-info-circle mr-2"></i>
            Solicitud de corrección para:
            <strong>{{ getTypeLabel() }}</strong>
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
            class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file-edit text-orange-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 2: Motivo de la Corrección
          </h3>
        </div>
        <textarea
          pInputTextarea
          [ngModel]="reason()"
          (ngModelChange)="reason.set($event)"
          placeholder="Explica por qué se necesita la corrección de esta marcación (ej: olvidé marcar entrada, el reloj no funcionaba, etc.)"
          rows="4"
          class="w-full"
          ptTutorialStep="timelog-correction-reason"
        ></textarea>
      </div>

      <!-- Paso 3: Evidencia (Opcional) -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file text-orange-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 3: Evidencia (Opcional)
          </h3>
        </div>
        <p class="text-sm text-gray-400 mb-4">
          Si tienes evidencia de la marcación correcta (captura de
          pantalla, foto del reloj, etc.), puedes adjuntarla.
        </p>
        <p-fileUpload
          mode="basic"
          accept=".pdf,.jpg,.jpeg,.png"
          maxFileSize="5000000"
          [auto]="false"
          chooseLabel="Seleccionar Archivo"
          (onSelect)="onFileSelect($event)"
          class="w-full"
          ptTutorialStep="timelog-correction-file"
        />
        <p class="text-xs text-gray-500 mt-2">
          Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
        </p>
        @if (file()) {
        <div
          class="mt-3 p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            @if (uploadingDoc()) {
            <i class="pi pi-spin pi-spinner text-orange-400"></i>
            <span class="text-sm text-gray-300">Subiendo...</span>
            } @else {
            <i class="pi pi-file text-orange-400"></i>
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
          ptTutorialStep="timelog-correction-submit"
        />
      </div>
    </div>
  `,
})
export class TimelogCorrectionGestionFormComponent {
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

  public correctionDate = signal<Date | null>(null);
  public correctionType = signal<'entry' | 'lunch_start' | 'lunch_end' | 'exit'>('entry');
  public reason = signal<string>('');
  public file = signal<File | null>(null);
  public docUrl = signal<string | null>(null);
  public uploadingDoc = signal<boolean>(false);
  public submitting = signal<boolean>(false);

  public typeOptions = [
    { label: 'Entrada', value: 'entry' },
    { label: 'Inicio Almuerzo', value: 'lunch_start' },
    { label: 'Fin Almuerzo', value: 'lunch_end' },
    { label: 'Salida', value: 'exit' },
  ];

  public canSubmit = computed(() => {
    return !!(this.correctionDate() && this.correctionType() && this.reason().trim());
  });

  public getTypeLabel(): string {
    const option = this.typeOptions.find((o) => o.value === this.correctionType());
    return option?.label || this.correctionType() || 'Marcación';
  }

  public async onFileSelect(event: any): Promise<void> {
    const files = event.currentFiles || event.files;
    if (!files || files.length === 0) return;

    const f = files[0];
    this.file.set(f);
    this.uploadingDoc.set(true);

    try {
      const employeeId = this.selectedEmployee()?.id || 'temp';
      const fileExt = f.name.split('.').pop();
      const fileName = `timelog-corrections/${employeeId}_${Date.now()}.${fileExt}`;
      const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${fileName}`;

      await firstValueFrom(this.http.post(uploadUrl, f, { headers: { 'x-upsert': 'true' } }));
      this.docUrl.set(`${this.apiUrl.baseUrl}/storage/v1/object/public/employee-documents/${fileName}`);
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
      const date = this.correctionDate()!;
      const type = this.correctionType();
      const f = this.file();
      let attachmentUrl = this.docUrl();

      // Fallback upload
      if (f && !attachmentUrl) {
        const fileExt = f.name.split('.').pop();
        const fileName = `timelog-corrections/${employee.id}_${Date.now()}.${fileExt}`;
        const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${fileName}`;
        await firstValueFrom(this.http.post(uploadUrl, f, { headers: { 'x-upsert': 'true' } }));
        attachmentUrl = `${this.apiUrl.baseUrl}/storage/v1/object/public/employee-documents/${fileName}`;
      }

      const typeLabel = this.typeOptions.find((opt) => opt.value === type)?.label || type;

      const data = {
        employee_id: employee.id,
        document_type: 'timelog_correction',
        reason: this.reason(),
        status: 'pending',
        created_by: this.currentEmployee()?.id || null,
        company_id: this.organizationService.getCurrentCompanyId(),
        metadata: {
          timelog_date: date.toISOString().split('T')[0],
          timelog_type: type,
          branch_id: employee.branch?.id || this.currentBranch()?.id || null,
          attachment_url: attachmentUrl,
        },
      };

      await firstValueFrom(this.http.post(this.apiUrl.build('rest/v1/document_requests'), data));

      // Notificar a gerentes de la sucursal
      notifyBranchManagers({
        http: this.http,
        apiUrl: this.apiUrl,
        employee,
        title: 'Nueva Corrección de Marcación',
        message: `${employee.first_name} ${employee.father_name} solicitó una corrección de marcación (${typeLabel}).`,
        relatedType: 'timelog_correction',
        messageType: 'timelog_correction_manager',
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Corrección de marcación (${typeLabel}) para ${employee.first_name} ${employee.father_name} enviada correctamente`,
      });

      this.requestCreated.emit();
    } catch (error: any) {
      console.error('Error submitting timelog correction:', error);
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
