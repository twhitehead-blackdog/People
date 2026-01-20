import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { firstValueFrom } from 'rxjs';

import { EmployeePortalComplaintsComponent } from '../../../employee-portal/components/employee-portal-complaints.component';
import { EmployeePortalDisabilitiesComponent } from '../../../employee-portal/components/employee-portal-disabilities.component';
import { EmployeePortalDocumentsComponent } from '../../../employee-portal/components/employee-portal-documents.component';
import { EmployeePortalLicenseComponent } from '../../../employee-portal/components/employee-portal-license.component';
import { EmployeePortalMaternityComponent } from '../../../employee-portal/components/employee-portal-maternity.component';
import { EmployeePortalPersonalComponent } from '../../../employee-portal/components/employee-portal-personal.component';
import { EmployeePortalTimelogCorrectionComponent } from '../../../employee-portal/components/employee-portal-timelog-correction.component';
import { EmployeePortalUniformRequestComponent } from '../../../employee-portal/components/employee-portal-uniform-request.component';
import { EmployeePortalVacationsComponent } from '../../../employee-portal/components/employee-portal-vacations.component';
import { ApiUrlService } from '../../../services/api-url.service';
import { OrganizationService } from '../../../services/organization.service';
import { EmployeePortalDataService } from '../services/employee-portal-data.service';

@Component({
  selector: 'pt-employee-portal-gestiones-tab',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    DialogModule,
    EmployeePortalDisabilitiesComponent,
    EmployeePortalDocumentsComponent,
    EmployeePortalComplaintsComponent,
    EmployeePortalVacationsComponent,
    EmployeePortalLicenseComponent,
    EmployeePortalPersonalComponent,
    EmployeePortalMaternityComponent,
    EmployeePortalTimelogCorrectionComponent,
    EmployeePortalUniformRequestComponent,
  ],
  providers: [MessageService],
  styles: [
    `
      :host {
        display: block;
      }
      ::ng-deep .gestion-card {
        cursor: pointer;
        transition: all 0.2s ease;
        background: #1f2937 !important;
        border: 1px solid #374151 !important;
      }
      ::ng-deep .gestion-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        border-color: #3b82f6 !important;
      }
      .gestion-card-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 1.5rem;
      }
    `,
  ],
  template: `
    <div class="tab-content">
      <div
        class="flex flex-col gap-6"
        style="min-height: 400px; padding: 1rem 0;"
      >
        <div>
          <h2 class="text-2xl font-bold text-white mb-2">Gestiones</h2>
          <p class="text-gray-400">
            Accede a todos los formularios y solicitudes disponibles
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Incapacidades -->
          <p-card
            class="gestion-card"
            (click)="openGestionForm('disabilities')"
          >
            <div class="flex flex-col items-center text-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center"
              >
                <i class="pi pi-file-plus text-blue-400 text-xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">
                Incapacidades
              </h3>
              <p class="text-sm text-gray-400 m-0">
                Sube documentos de incapacidad médica
              </p>
            </div>
          </p-card>

          <!-- Solicitar Documentos -->
          <p-card class="gestion-card" (click)="openGestionForm('documents')">
            <div class="flex flex-col items-center text-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center"
              >
                <i class="pi pi-file-edit text-green-400 text-xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">
                Solicitar Documentos
              </h3>
              <p class="text-sm text-gray-400 m-0">
                Solicita cartas de trabajo u otros documentos
              </p>
            </div>
          </p-card>

          <!-- Buzón de Sugerencias -->
          <p-card class="gestion-card" (click)="openGestionForm('complaints')">
            <div class="flex flex-col items-center text-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center"
              >
                <i class="pi pi-comments text-yellow-400 text-xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">
                Buzón de Sugerencias
              </h3>
              <p class="text-sm text-gray-400 m-0">
                Expresa tus inquietudes de forma anónima
              </p>
            </div>
          </p-card>

          <!-- Solicitar Vacaciones -->
          <p-card class="gestion-card" (click)="openGestionForm('vacations')">
            <div class="flex flex-col items-center text-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center"
              >
                <i class="pi pi-calendar-plus text-purple-400 text-xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">
                Solicitar Vacaciones
              </h3>
              <p class="text-sm text-gray-400 m-0">
                Solicita tus días de vacaciones
              </p>
            </div>
          </p-card>

          <!-- Omisión de Marcación -->
          <p-card
            class="gestion-card"
            (click)="openGestionForm('timelog_correction')"
          >
            <div class="flex flex-col items-center text-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center"
              >
                <i
                  class="pi pi-exclamation-triangle text-orange-400 text-xl"
                ></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">
                Omisión de Marcación
              </h3>
              <p class="text-sm text-gray-400 m-0">
                Corrige errores en tus marcaciones
              </p>
            </div>
          </p-card>

          <!-- Solicitud de Uniforme -->
          <p-card class="gestion-card" (click)="openGestionForm('uniform')">
            <div class="flex flex-col items-center text-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center"
              >
                <i class="pi pi-tag text-teal-400 text-xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">
                Solicitud de Uniforme
              </h3>
              <p class="text-sm text-gray-400 m-0">
                Solicita uniformes y equipo
              </p>
            </div>
          </p-card>

          <!-- Solicitar Licencia -->
          <p-card class="gestion-card" (click)="openGestionForm('license')">
            <div class="flex flex-col items-center text-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center"
              >
                <i class="pi pi-calendar text-indigo-400 text-xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">
                Solicitar Licencia
              </h3>
              <p class="text-sm text-gray-400 m-0">
                Solicita una licencia sin goce de sueldo
              </p>
            </div>
          </p-card>

          <!-- Solicitar Permiso Personal -->
          <p-card class="gestion-card" (click)="openGestionForm('personal')">
            <div class="flex flex-col items-center text-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center"
              >
                <i class="pi pi-user text-cyan-400 text-xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">
                Permiso Personal
              </h3>
              <p class="text-sm text-gray-400 m-0">
                Solicita un permiso por asuntos personales
              </p>
            </div>
          </p-card>

          <!-- Solicitar Licencia de Maternidad -->
          <p-card class="gestion-card" (click)="openGestionForm('maternity')">
            <div class="flex flex-col items-center text-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center"
              >
                <i class="pi pi-heart text-pink-400 text-xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">
                Licencia de Maternidad
              </h3>
              <p class="text-sm text-gray-400 m-0">
                Solicita tu licencia de maternidad pagada
              </p>
            </div>
          </p-card>
        </div>
      </div>

      <!-- Formularios modales -->
      <p-dialog
        *ngIf="activeGestionForm()"
        [visible]="showGestionDialog()"
        [modal]="true"
        [dismissableMask]="true"
        [style]="{ width: '90vw', maxWidth: '800px' }"
        [header]="getGestionFormTitle()"
        [draggable]="false"
        [resizable]="false"
        (onHide)="closeGestionForm()"
      >
        <ng-container [ngSwitch]="activeGestionForm()">
          <pt-employee-portal-disabilities
            *ngSwitchCase="'disabilities'"
            (closeManagement)="closeGestionForm()"
            (reloadList)="dataService.disabilitiesApi.reload()"
          />

          <pt-employee-portal-documents
            *ngSwitchCase="'documents'"
            [documentTypeOptions]="documentTypeOptions"
            [documentType]="documentType()"
            (documentTypeChange)="documentType.set($event)"
            [customDocumentType]="customDocumentType()"
            (customDocumentTypeChange)="customDocumentType.set($event)"
            [documentReason]="documentReason()"
            (documentReasonChange)="documentReason.set($event)"
            [documentRequiredDate]="documentRequiredDate()"
            (documentRequiredDateChange)="documentRequiredDate.set($event)"
            [today]="today"
            [canSubmit]="canSubmitDocument()"
            [submitting]="submittingDocument()"
            [documentRequests]="myDocumentRequests()"
            [requestsLoading]="loadingDocumentRequests()"
            [getDocumentTypeLabel]="getDocumentTypeLabel.bind(this)"
            [downloadDocument]="downloadDocument.bind(this)"
            (submitDocument)="submitDocumentRequest()"
            (resetDocument)="resetDocumentForm()"
            (reloadRequests)="loadDocumentRequests()"
            (closeSection)="closeGestionForm()"
          />

          <pt-employee-portal-complaints
            *ngSwitchCase="'complaints'"
            [complaintCategory]="complaintCategory()"
            (complaintCategoryChange)="complaintCategory.set($event)"
            [complaintText]="complaintText()"
            (complaintTextChange)="complaintText.set($event)"
            [allowContact]="allowContact()"
            (allowContactChange)="allowContact.set($event)"
            [contactMethod]="contactMethod()"
            (contactMethodChange)="contactMethod.set($event)"
            [submitting]="submittingComplaint()"
            [canSubmit]="canSubmitComplaint()"
            (submitComplaint)="submitComplaint()"
            (closeSection)="closeGestionForm()"
          />

          <pt-employee-portal-vacations
            *ngSwitchCase="'vacations'"
            [minVacationDate]="minVacationDate"
            [maxVacationDate]="maxVacationDate"
            [vacationStartDate]="timeoffStartDate()"
            (vacationStartDateChange)="timeoffStartDate.set($event)"
            [vacationEndDate]="timeoffEndDate()"
            (vacationEndDateChange)="timeoffEndDate.set($event)"
            [vacationReason]="timeoffNotes()"
            (vacationReasonChange)="timeoffNotes.set($event)"
            [submitting]="submittingTimeoff()"
            [canSubmit]="canSubmitTimeoff()"
            [vacationRequests]="timeoffRequests()"
            [requestsLoading]="loadingTimeoffRequests()"
            [calculateVacationDays]="calculateTimeoffDays.bind(this)"
            [calculateDaysBetween]="calculateDaysBetween.bind(this)"
            [isDateFuture]="isDateFuture.bind(this)"
            (submitRequest)="submitTimeoffRequest()"
            (resetForm)="resetTimeoffForm()"
            (reloadList)="loadTimeoffRequests()"
            (closeSection)="closeGestionForm()"
          />

          <pt-employee-portal-timelog-correction
            *ngSwitchCase="'timelog_correction'"
            [correctionDate]="correctionDate()"
            (correctionDateChange)="correctionDate.set($event)"
            [correctionType]="correctionType()"
            (correctionTypeChange)="correctionType.set($event)"
            [correctionReason]="correctionReason()"
            (correctionReasonChange)="correctionReason.set($event)"
            [correctionFile]="correctionFile()"
            (correctionFileChange)="correctionFile.set($event)"
            [canSubmit]="canSubmitCorrection()"
            [submitting]="submittingCorrection()"
            [today]="today"
            (submitRequest)="submitTimelogCorrection()"
            (closeSection)="closeGestionForm()"
          />

          <pt-employee-portal-uniform-request
            *ngSwitchCase="'uniform'"
            [itemType]="uniformItemType()"
            (itemTypeChange)="uniformItemType.set($event)"
            [size]="uniformSize()"
            (sizeChange)="uniformSize.set($event)"
            [quantity]="uniformQuantity()"
            (quantityChange)="uniformQuantity.set($event)"
            [notes]="uniformNotes()"
            (notesChange)="uniformNotes.set($event)"
            [canSubmit]="canSubmitUniform()"
            [submitting]="submittingUniform()"
            (submitRequest)="submitUniformRequest()"
            (closeSection)="closeGestionForm()"
          />

          <pt-employee-portal-license
            *ngSwitchCase="'license'"
            [minLicenseDate]="minVacationDate"
            [maxLicenseDate]="maxVacationDate"
            [licenseStartDate]="timeoffStartDate()"
            (licenseStartDateChange)="timeoffStartDate.set($event)"
            [licenseEndDate]="timeoffEndDate()"
            (licenseEndDateChange)="timeoffEndDate.set($event)"
            [licenseReason]="timeoffNotes()"
            (licenseReasonChange)="timeoffNotes.set($event)"
            [submitting]="submittingTimeoff()"
            [canSubmit]="canSubmitTimeoff()"
            [licenseRequests]="timeoffRequests()"
            [requestsLoading]="loadingTimeoffRequests()"
            [calculateLicenseDays]="calculateTimeoffDays.bind(this)"
            [calculateDaysBetween]="calculateDaysBetween.bind(this)"
            [isDateFuture]="isDateFuture.bind(this)"
            (submitRequest)="submitTimeoffRequest()"
            (resetForm)="resetTimeoffForm()"
            (reloadList)="loadTimeoffRequests()"
            (closeSection)="closeGestionForm()"
          />

          <pt-employee-portal-personal
            *ngSwitchCase="'personal'"
            [minPersonalDate]="minVacationDate"
            [maxPersonalDate]="maxVacationDate"
            [personalStartDate]="timeoffStartDate()"
            (personalStartDateChange)="timeoffStartDate.set($event)"
            [personalEndDate]="timeoffEndDate()"
            (personalEndDateChange)="timeoffEndDate.set($event)"
            [personalReason]="timeoffNotes()"
            (personalReasonChange)="timeoffNotes.set($event)"
            [submitting]="submittingTimeoff()"
            [canSubmit]="canSubmitTimeoff()"
            [personalRequests]="timeoffRequests()"
            [requestsLoading]="loadingTimeoffRequests()"
            [calculatePersonalDays]="calculateTimeoffDays.bind(this)"
            [calculateDaysBetween]="calculateDaysBetween.bind(this)"
            [isDateFuture]="isDateFuture.bind(this)"
            (submitRequest)="submitTimeoffRequest()"
            (resetForm)="resetTimeoffForm()"
            (reloadList)="loadTimeoffRequests()"
            (closeSection)="closeGestionForm()"
          />

          <pt-employee-portal-maternity
            *ngSwitchCase="'maternity'"
            [minMaternityDate]="minVacationDate"
            [expectedDeliveryDate]="timeoffStartDate()"
            (expectedDeliveryDateChange)="timeoffStartDate.set($event)"
            [maternityNotes]="timeoffNotes()"
            (maternityNotesChange)="timeoffNotes.set($event)"
            [submitting]="submittingTimeoff()"
            [canSubmit]="canSubmitTimeoff()"
            [maternityRequests]="timeoffRequests()"
            [requestsLoading]="loadingTimeoffRequests()"
            [calculateMaternityStartDate]="
              calculateMaternityStartDate.bind(this)
            "
            [calculateMaternityEndDate]="calculateMaternityEndDate.bind(this)"
            [calculateDaysBetween]="calculateDaysBetween.bind(this)"
            [isDateFuture]="isDateFuture.bind(this)"
            [downloadDocument]="downloadDocument.bind(this)"
            (submitRequest)="submitTimeoffRequest()"
            (resetForm)="resetTimeoffForm()"
            (reloadList)="loadTimeoffRequests()"
            (closeSection)="closeGestionForm()"
          />
        </ng-container>
      </p-dialog>
    </div>
  `,
})
export class EmployeePortalGestionesTabComponent {
  public dataService = inject(EmployeePortalDataService);
  private messageService = inject(MessageService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);
  private destroyRef = inject(DestroyRef);

  public currentEmployee = this.dataService.currentEmployee;

  // Gestiones State
  public activeGestionForm = signal<string | null>(null);
  public showGestionDialog = signal(false);

  // -- Documents --
  public documentType = signal('work_letter');
  public customDocumentType = signal('');
  public documentReason = signal('');
  public documentRequiredDate = signal<Date | null>(null);
  public submittingDocument = signal(false);
  public loadingDocumentRequests = signal(false);
  // Re-use data service resource for requests list
  public myDocumentRequests = this.dataService.myDocumentRequests;

  public documentTypeOptions = [
    { label: 'Carta de Trabajo', value: 'work_letter' },
    { label: 'Certificado de Salario', value: 'salary_certificate' },
    { label: 'Certificado de Empleo', value: 'employment_certificate' },
    { label: 'Otro', value: 'other' },
  ];
  public today = new Date();

  // -- Complaints --
  public complaintCategory = signal('work_environment');
  public complaintText = signal('');
  public allowContact = signal(false);
  public contactMethod = signal('email');
  public submittingComplaint = signal(false);

  // -- Timeoffs (Shared) --
  public selectedTimeoffType = signal<string | null>(null);
  public timeoffStartDate = signal<Date | null>(null);
  public timeoffEndDate = signal<Date | null>(null);
  public timeoffNotes = signal<string>('');
  public submittingTimeoff = signal(false);
  public timeoffRequests = signal<any[]>([]);
  public loadingTimeoffRequests = signal(false);

  // -- Timelog Correction --
  public correctionDate = signal<Date | null>(null);
  public correctionType = signal('');
  public correctionReason = signal('');
  public correctionFile = signal<File | null>(null);
  public submittingCorrection = signal(false);

  // -- Uniform Request --
  public uniformItemType = signal('');
  public uniformSize = signal('');
  public uniformQuantity = signal(1);
  public uniformNotes = signal('');
  public submittingUniform = signal(false);

  public minVacationDate = new Date();
  public maxVacationDate = new Date(new Date().getFullYear() + 1, 11, 31);

  public timeoffTypes = this.dataService.timeoffTypes;

  // Methods
  public openGestionForm(formType: string): void {
    this.activeGestionForm.set(formType);
    this.showGestionDialog.set(true);

    // Auto-select corresponding timeoff type
    if (['vacations', 'license', 'personal', 'maternity'].includes(formType)) {
      const types = this.timeoffTypes();
      let typeName = '';
      if (formType === 'vacations') typeName = 'Vacaciones';
      else if (formType === 'license') typeName = 'Licencia';
      else if (formType === 'personal') typeName = 'Permiso Personal';
      else if (formType === 'maternity') typeName = 'Maternidad'; // Assuming name match

      const foundType = types.find((t) =>
        t.name.toLowerCase().includes(typeName.toLowerCase())
      );
      if (foundType) {
        this.selectedTimeoffType.set(foundType.id);
      }
      this.loadTimeoffRequests(); // Load requests for this type
    }
  }

  public closeGestionForm(): void {
    this.showGestionDialog.set(false);
    this.activeGestionForm.set(null);
    this.resetDocumentForm();
    this.resetTimeoffForm();
    this.resetCorrectionForm();
    this.resetUniformForm();
  }

  public getGestionFormTitle(): string {
    const form = this.activeGestionForm();
    const titles: Record<string, string> = {
      disabilities: 'Subir Incapacidad',
      documents: 'Solicitar Documentos',
      complaints: 'Buzón de Sugerencias',
      vacations: 'Solicitar Vacaciones',
      license: 'Solicitar Licencia',
      personal: 'Solicitar Permiso Personal',
      maternity: 'Solicitar Licencia de Maternidad',
      timelog_correction: 'Omisión de Marcación',
      uniform: 'Solicitud de Uniforme',
    };
    return titles[form || ''] || 'Formulario';
  }

  public canSubmitDocument(): boolean {
    return !!(
      this.documentReason() &&
      this.documentType() &&
      (this.documentType() !== 'other' || this.customDocumentType())
    );
  }

  public canSubmitComplaint(): boolean {
    const text = this.complaintText();
    if (!text) return false;
    const trimmedText = text.trim();
    return trimmedText.length >= 20 && trimmedText.length <= 5000;
  }

  public canSubmitTimeoff(): boolean {
    const start = this.timeoffStartDate();
    const formType = this.activeGestionForm();

    // Logic dependent on type
    if (formType === 'maternity') {
      return !!(this.selectedTimeoffType() && start);
    }

    const end = this.timeoffEndDate();
    return !!(this.selectedTimeoffType() && start && end && start <= end);
  }

  public canSubmitCorrection(): boolean {
    return !!(
      this.correctionDate() &&
      this.correctionType() &&
      this.correctionReason()
    );
  }

  public canSubmitUniform(): boolean {
    return !!(
      this.uniformItemType() &&
      this.uniformSize() &&
      this.uniformQuantity() > 0
    );
  }

  public getDocumentTypeLabel(type: string): string {
    return (
      this.documentTypeOptions.find((o) => o.value === type)?.label || type
    );
  }

  public downloadDocument(url?: string | null) {
    if (url) window.open(url, '_blank');
  }

  public calculateTimeoffDays(): number {
    const start = this.timeoffStartDate();
    const end = this.timeoffEndDate();
    if (!start || !end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include end date
  }

  public calculateDaysBetween(start: Date | string, end: Date | string): number {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public calculateMaternityStartDate(): Date {
    return this.timeoffStartDate() ?? new Date();
  }
  public calculateMaternityEndDate(): Date {
    const start = this.timeoffStartDate();
    if (!start) return new Date();
    const result = new Date(start);
    result.setDate(result.getDate() + 98);
    return result;
  }

  public isDateFuture(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d > new Date();
  }

  public async submitDocumentRequest() {
    if (!this.canSubmitDocument()) return;

    const employee = this.currentEmployee() as any;
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!employee || !companyId) return;

    this.submittingDocument.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/document_requests'),
          {
            employee_id: employee.id,
            company_id: companyId,
            document_type: this.documentType(),
            custom_document_type:
              this.documentType() === 'other'
                ? this.customDocumentType()
                : null,
            reason: this.documentReason(),
            status: 'pending',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: 'Tu solicitud de documento ha sido enviada correctamente.',
      });
      this.closeGestionForm();
      this.loadDocumentRequests();
    } catch (error) {
      console.error(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo enviar la solicitud.',
      });
    } finally {
      this.submittingDocument.set(false);
    }
  }

  public async submitComplaint() {
    if (!this.canSubmitComplaint()) return;

    const employee = this.currentEmployee() as any;
    if (!employee) return;

    this.submittingComplaint.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/complaints'),
          {
            creator_employee_id: employee.id,
            category: this.complaintCategory(),
            complaint: this.complaintText(),
            allow_contact: this.allowContact(),
            contact_method: this.allowContact() ? this.contactMethod() : null,
            status: 'pending',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Sugerencia Enviada',
        detail: 'Tu sugerencia ha sido enviada correctamente.',
      });
      this.closeGestionForm();
      this.dataService.complaintsApi.reload();
    } catch (error) {
      console.error(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo enviar la sugerencia.',
      });
    } finally {
      this.submittingComplaint.set(false);
    }
  }

  public async submitTimeoffRequest() {
    if (!this.canSubmitTimeoff()) return;

    const employee = this.currentEmployee() as any;
    const typeId = this.selectedTimeoffType();
    if (!employee || !typeId || !this.timeoffStartDate()) return;

    this.submittingTimeoff.set(true);
    try {
      const payload: any = {
        employee_id: employee.id,
        created_by: employee.id, // El empleado crea su propia solicitud
        timeoff_type_id: typeId,
        date_from: format(this.timeoffStartDate()!, 'yyyy-MM-dd'),
        reason: this.timeoffNotes(),
        status: 'pending',
      };

      if (this.activeGestionForm() === 'maternity') {
        const end = this.calculateMaternityEndDate();
        if (end) payload.date_to = format(end, 'yyyy-MM-dd');
      } else if (this.timeoffEndDate()) {
        payload.date_to = format(this.timeoffEndDate()!, 'yyyy-MM-dd');
      }

      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/timeoffs'), payload, {
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        })
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: 'Tu solicitud ha sido enviada correctamente.',
      });
      this.closeGestionForm();
      this.loadTimeoffRequests();
    } catch (error) {
      console.error(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo enviar la solicitud.',
      });
    } finally {
      this.submittingTimeoff.set(false);
    }
  }

  public async submitTimelogCorrection() {
    if (!this.canSubmitCorrection()) return;
    const employee = this.currentEmployee() as any;
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!employee || !companyId) return;

    this.submittingCorrection.set(true);
    try {
      const payload = {
        employee_id: employee.id,
        company_id: companyId,
        document_type: 'timelog_correction',
        reason: this.correctionReason(),
        status: 'pending',
        metadata: {
          timelog_date: format(this.correctionDate()!, 'yyyy-MM-dd'),
          timelog_type: this.correctionType(),
        },
      };

      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/document_requests'),
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: 'Tu corrección de marcación ha sido enviada.',
      });
      this.closeGestionForm();
      this.loadDocumentRequests();
    } catch (error) {
      console.error(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo enviar la corrección.',
      });
    } finally {
      this.submittingCorrection.set(false);
    }
  }

  public async submitUniformRequest() {
    if (!this.canSubmitUniform()) return;
    const employee = this.currentEmployee() as any;
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!employee || !companyId) return;

    this.submittingUniform.set(true);
    try {
      const payload = {
        employee_id: employee.id,
        company_id: companyId,
        document_type: 'uniform_request',
        reason: this.uniformNotes(),
        status: 'pending',
        metadata: {
          item_type: this.uniformItemType(),
          size: this.uniformSize(),
          quantity: this.uniformQuantity(),
        },
      };

      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/document_requests'),
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: 'Tu solicitud de uniforme ha sido enviada.',
      });
      this.closeGestionForm();
      this.loadDocumentRequests();
    } catch (error) {
      console.error(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo enviar la solicitud.',
      });
    } finally {
      this.submittingUniform.set(false);
    }
  }

  public loadDocumentRequests() {
    this.dataService.documentRequestsApi.reload();
  }

  public async loadTimeoffRequests() {
    const employeeId = this.currentEmployee()?.id;
    const typeId = this.selectedTimeoffType();
    if (!employeeId || !typeId) {
      this.timeoffRequests.set([]);
      return;
    }

    this.loadingTimeoffRequests.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<any[]>(
          this.apiUrl.build('rest/v1/timeoffs', {
            employee_id: `eq.${employeeId}`,
            timeoff_type_id: `eq.${typeId}`,
            order: 'created_at.desc',
          })
        )
      );
      this.timeoffRequests.set(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      this.loadingTimeoffRequests.set(false);
    }
  }

  public resetDocumentForm() {
    this.documentType.set('work_letter');
    this.customDocumentType.set('');
    this.documentReason.set('');
    this.documentRequiredDate.set(null);
  }

  public resetTimeoffForm() {
    this.timeoffStartDate.set(null);
    this.timeoffEndDate.set(null);
    this.timeoffNotes.set('');
    this.selectedTimeoffType.set(null);
  }

  public resetCorrectionForm() {
    this.correctionDate.set(null);
    this.correctionType.set('');
    this.correctionReason.set('');
    this.correctionFile.set(null);
  }

  public resetUniformForm() {
    this.uniformItemType.set('');
    this.uniformSize.set('');
    this.uniformQuantity.set(1);
    this.uniformNotes.set('');
  }
}
