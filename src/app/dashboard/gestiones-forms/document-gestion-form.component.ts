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
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { Branch, Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { TutorialStepDirective } from '../../shared/directives/tutorial-step.directive';
import { EmployeeNotificationService } from '../../services/employee-notification.service';

@Component({
  selector: 'pt-document-gestion-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    DatePicker,
    Textarea,
    Select,
    TooltipModule,
    TutorialStepDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Paso 1: Tipo de Documento -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file text-green-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 1: Tipo de Documento
          </h3>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-300"
            >Selecciona el tipo de documento</label
          >
          <p-select
            [ngModel]="documentType()"
            (ngModelChange)="documentType.set($event)"
            [options]="documentTypeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Tipo de documento"
            styleClass="w-full"
            appendTo="body"
            ptTutorialStep="documents-type"
          />
        </div>
        @if (documentType() === 'other') {
        <div class="mt-3">
          <textarea
            pInputTextarea
            [ngModel]="customDocumentType()"
            (ngModelChange)="customDocumentType.set($event)"
            placeholder="Especifica el tipo de documento que necesitas"
            rows="2"
            class="w-full"
          ></textarea>
        </div>
        }
      </div>

      <!-- Paso 2: Motivo y Fecha -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file-edit text-green-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 2: Detalles de la Solicitud
          </h3>
        </div>
        <div class="space-y-3">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300"
              >Dirigido a</label
            >
            <textarea
              pInputTextarea
              [ngModel]="reason()"
              (ngModelChange)="reason.set($event)"
              placeholder="Explica para quién es dirigido este documento"
              rows="3"
              class="w-full"
              ptTutorialStep="documents-reason"
            ></textarea>
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300"
              >Fecha requerida</label
            >
            <p-datepicker
              [ngModel]="requiredDate()"
              (ngModelChange)="requiredDate.set($event)"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="¿Cuándo necesitas el documento?"
              [minDate]="today"
              styleClass="w-full"
              appendTo="body"
              ptTutorialStep="documents-date"
            />
          </div>
        </div>
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
          ptTutorialStep="documents-submit"
        />
      </div>
    </div>
  `,
})
export class DocumentGestionFormComponent {
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

  public documentType = signal<string>('work_letter');
  public customDocumentType = signal<string>('');
  public reason = signal<string>('');
  public requiredDate = signal<Date | null>(null);
  public submitting = signal<boolean>(false);

  public documentTypeOptions = [
    { label: 'Carta de Trabajo', value: 'work_letter' },
    { label: 'Constancia de Salario', value: 'salary_certificate' },
    { label: 'Certificación Laboral', value: 'employment_certificate' },
    { label: 'Otro', value: 'other' },
  ];

  public canSubmit = computed(() => {
    const type = this.documentType();
    const customType = this.customDocumentType();
    const r = this.reason();
    const date = this.requiredDate();
    if (type === 'other') return !!(customType && r && date);
    return !!(r && date);
  });

  private getDocumentTypeLabel(type: string): string {
    const option = this.documentTypeOptions.find((opt) => opt.value === type);
    return option?.label || type;
  }

  public async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    this.submitting.set(true);

    try {
      const employee = this.selectedEmployee();
      const type = this.documentType();
      const customType = this.customDocumentType();
      const documentTypeLabel = type === 'other' ? customType : this.getDocumentTypeLabel(type);

      const data = {
        employee_id: employee.id,
        document_type: documentTypeLabel,
        custom_document_type: type === 'other' ? customType : null,
        reason: this.reason(),
        required_date: this.requiredDate()!.toISOString().split('T')[0],
        status: 'pending',
        created_by: this.currentEmployee()?.id || null,
        company_id: this.organizationService.getCurrentCompanyId(),
      };

      await firstValueFrom(this.http.post(this.apiUrl.build('rest/v1/document_requests'), data));

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Solicitud de ${documentTypeLabel} para ${employee.first_name} ${employee.father_name} enviada correctamente`,
      });

      this.notificationService.notifyNewRequest('document', `${employee.first_name} ${employee.father_name}`, {
        'Tipo de documento': documentTypeLabel,
        'Fecha requerida': data.required_date,
        ...(data.reason ? { Motivo: data.reason } : {}),
      });

      this.requestCreated.emit();
    } catch (error: any) {
      console.error('Error submitting document request:', error);
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
