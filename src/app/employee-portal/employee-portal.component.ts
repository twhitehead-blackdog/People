import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  differenceInDays,
  differenceInMinutes,
  format,
  startOfDay,
} from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FileUpload } from 'primeng/fileupload';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { CalendarComponent } from '../calendar.component';
import { EmployeePortalNavigationService } from '../services/employee-portal-navigation.service';
import { NotificationsService } from '../services/notifications.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeePortalStore } from '../stores/employee-portal.store';
import { EmployeesStore } from '../stores/employees.store';
import { submitCompensatoryRequest } from './actions/employee-portal-compensatory.actions';
import { submitComplaint } from './actions/employee-portal-complaint.actions';
import { uploadDisability } from './actions/employee-portal-disability.actions';
import { submitDocumentRequest } from './actions/employee-portal-document.actions';
import { submitVacationRequest } from './actions/employee-portal-vacation.actions';
import { EmployeePortalCompensatoryTutorialDialogComponent } from './components/employee-portal-compensatory-tutorial-dialog.component';
import { EmployeePortalCompensatoryComponent } from './components/employee-portal-compensatory.component';
import { EmployeePortalComplaintsComponent } from './components/employee-portal-complaints.component';
import { EmployeePortalConversationDialogComponent } from './components/employee-portal-conversation-dialog.component';
import { EmployeePortalDashboardComponent } from './components/employee-portal-dashboard.component';
import { EmployeePortalDisabilitiesComponent } from './components/employee-portal-disabilities.component';
import { EmployeePortalDocumentsComponent } from './components/employee-portal-documents.component';
import { EmployeePortalLatesComponent } from './components/employee-portal-lates.component';
import { EmployeePortalManagementNavigationComponent } from './components/employee-portal-management-navigation.component';
import { EmployeePortalMyRequestsComponent } from './components/employee-portal-my-requests.component';
import { EmployeePortalNotificationsComponent } from './components/employee-portal-notifications.component';
import { EmployeePortalProfileComponent } from './components/employee-portal-profile.component';
import { EmployeePortalRequestDetailsDialogComponent } from './components/employee-portal-request-details-dialog.component';
import { EmployeePortalTimelogsComponent } from './components/employee-portal-timelogs.component';
import { EmployeePortalVacationsComponent } from './components/employee-portal-vacations.component';
import { EmployeePortalApiService } from './services/employee-portal-api.service';
import { EmployeePortalRequestsService } from './services/employee-portal-requests.service';
import { EmployeePortalTimelogsService } from './services/employee-portal-timelogs.service';
import {
  getCompensatoryQuantity,
  getCompensatoryReasonFromNotes,
} from './utils/employee-portal-compensatory.utils';
import {
  calculateDays,
  calculateDaysBetween,
  isDateFuture,
} from './utils/employee-portal-date.utils';
import { calculateHoursFromDates } from './utils/employee-portal-time.utils';

@Component({
  selector: 'pt-employee-portal',
  standalone: true,
  imports: [
    Card,
    TableModule,
    DatePipe,
    CurrencyPipe,
    Button,
    DatePicker,
    FormsModule,
    InputText,
    Textarea,
    FileUpload,
    DialogModule,
    ToastModule,
    TooltipModule,
    Select,
    NgClass,
    CalendarComponent,
    EmployeePortalDashboardComponent,
    EmployeePortalManagementNavigationComponent,
    EmployeePortalTimelogsComponent,
    EmployeePortalLatesComponent,
    EmployeePortalDisabilitiesComponent,
    EmployeePortalDocumentsComponent,
    EmployeePortalVacationsComponent,
    EmployeePortalComplaintsComponent,
    EmployeePortalCompensatoryComponent,
    EmployeePortalProfileComponent,
    EmployeePortalMyRequestsComponent,
    EmployeePortalNotificationsComponent,
    EmployeePortalConversationDialogComponent,
    EmployeePortalCompensatoryTutorialDialogComponent,
    EmployeePortalRequestDetailsDialogComponent,
  ],
  // NOTA: Estos servicios dependen de DashboardStore (proveído por el layout del portal),
  // por eso se proveen aquí y NO con providedIn:'root' para evitar NG0201 (SignalStore).
  providers: [
    MessageService,
    EmployeePortalTimelogsService,
    EmployeePortalRequestsService,
  ],
  template: `
    <div class="portal-content">
      <!-- Dashboard Section -->
      @if (portalStore.activeSection() === 'dashboard') {
      <div id="dashboard" class="section-content">
        @if (currentEmployee()) {
        <div class="flex flex-col gap-6">
          <pt-employee-portal-dashboard
            [employee]="currentEmployee() ?? null"
            [daysWorkedThisMonth]="daysWorkedThisMonth()"
            [myLates]="myLates()"
            [approvedCompensatoryHours]="approvedCompensatoryHours()"
            [recentTimelogs]="recentTimelogs()"
            [currentDate]="getCurrentDate()"
            [showSalary]="portalStore.showSalary()"
            (toggleSalary)="portalStore.toggleShowSalary()"
          />
        </div>
        }
      </div>
      }

      <!-- Gestiones Section -->
      @if (portalStore.activeSection() === 'management' ||
      portalStore.activeSection() === 'gestiones') {
      <div id="management" class="section-content">
        <p-card>
          <ng-template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-briefcase text-amber-400"></i>
              <span>Gestiones</span>
            </div>
          </ng-template>
          <ng-template #subtitle
            >Accede a todos los formularios y solicitudes
            disponibles</ng-template
          >
          <div class="flex flex-col gap-6">
            <pt-employee-portal-management-navigation
              [activeSection]="portalStore.activeSection()"
              (sectionChange)="setActiveSection($event)"
            />
          </div>
        </p-card>
      </div>
      }

      <!-- Mis Marcaciones Section -->
      @if (portalStore.activeSection() === 'timelogs') {
      <div id="timelogs" class="section-content">
        <pt-employee-portal-timelogs
          [isLoading]="monthTimelogsApi.isLoading()"
          [timelogViewMode]="portalStore.timelogViewMode()"
          (viewModeChange)="portalStore.setTimelogViewMode($event)"
          [monthTimelogs]="monthTimelogs()"
          [timelogMarkers]="timelogMarkers()"
          [calendarMonth]="portalStore.calendarMonth()"
          (monthChange)="onCalendarMonthChange($event)"
          [calculateWorkedHours]="calculateWorkedHours.bind(this)"
        />
      </div>
      }

      <!-- Mi Perfil Section -->
      @if (portalStore.activeSection() === 'profile') {
      <div id="profile" class="section-content">
        @if (currentEmployee()) {
        <pt-employee-portal-profile
          [employee]="currentEmployee()"
          [editMode]="editMode()"
          [editEmailValue]="editEmail()"
          [editWorkEmailValue]="editWorkEmail()"
          [editPhoneValue]="editPhone()"
          [editAddressValue]="editAddress()"
          [savingPersonalData]="savingPersonalData()"
          (toggleEdit)="toggleEditMode()"
          (cancelEdit)="cancelEdit()"
          (savePersonalData)="savePersonalData()"
          (editEmailChange)="editEmail.set($event)"
          (editWorkEmailChange)="editWorkEmail.set($event)"
          (editPhoneChange)="editPhone.set($event)"
          (editAddressChange)="editAddress.set($event)"
        />
        } @else {
        <div class="flex justify-center items-center h-64">
          <p class="text-gray-400 text-lg">
            Cargando información del empleado...
          </p>
        </div>
        }
      </div>
      }

      <!-- Mis Tardanzas Section -->
      @if (portalStore.activeSection() === 'lates') {
      <div id="lates" class="section-content">
        <pt-employee-portal-lates [lates]="myLates()" />
      </div>
      }

      <!-- Incapacidades Section -->
      @if (portalStore.activeSection() === 'disabilities') {
      <div id="disabilities" class="section-content">
        <pt-employee-portal-disabilities
          [startDate]="disabilityStartDate()"
          (startDateChange)="disabilityStartDate.set($event)"
          [endDate]="disabilityEndDate()"
          (endDateChange)="disabilityEndDate.set($event)"
          [description]="disabilityDescription()"
          (descriptionChange)="disabilityDescription.set($event)"
          [selectedFile]="selectedFile()"
          (fileChange)="selectedFile.set($event)"
          [uploading]="uploadingDisability()"
          (submit)="uploadDisability()"
          (closeManagement)="setActiveSection('management')"
          [calculateDays]="calculateDays.bind(this)"
        />
      </div>
      }

      <!-- Solicitar Documentos Section -->
      @if (portalStore.activeSection() === 'documents') {
      <div id="documents" class="section-content">
        <pt-employee-portal-documents
          [documentTypeOptions]="documentTypeOptions"
          [documentType]="portalStore.documentForm().type"
          (documentTypeChange)="setDocumentType($event)"
          [customDocumentType]="portalStore.documentForm().customType"
          (customDocumentTypeChange)="setCustomDocumentType($event)"
          [documentReason]="portalStore.documentForm().reason"
          (documentReasonChange)="setDocumentReason($event)"
          [documentRequiredDate]="portalStore.documentForm().requiredDate"
          (documentRequiredDateChange)="setDocumentRequiredDate($event)"
          [today]="today"
          [canSubmit]="portalStore.canSubmitDocument()"
          [submitting]="portalStore.documentForm().submitting"
          [documentRequests]="myDocumentRequests()"
          [requestsLoading]="documentRequestsApi.isLoading()"
          (submitDocument)="submitDocumentRequest()"
          (resetDocument)="resetDocumentForm()"
          (reloadRequests)="documentRequestsApi.reload()"
          [getDocumentTypeLabel]="getDocumentTypeLabel.bind(this)"
          [downloadDocument]="downloadDocument.bind(this)"
          (closeSection)="setActiveSection('management')"
        />
      </div>
      }

      <!-- Buzón de Sugerencias Section -->
      @if (portalStore.activeSection() === 'complaints') {
      <div id="complaints" class="section-content">
        <pt-employee-portal-complaints
          [complaintCategory]="portalStore.complaintForm().category"
          (complaintCategoryChange)="setComplaintCategory($event)"
          [complaintText]="portalStore.complaintForm().text"
          (complaintTextChange)="setComplaintText($event)"
          [allowContact]="portalStore.complaintForm().allowContact"
          (allowContactChange)="setAllowContact($event)"
          [contactMethod]="portalStore.complaintForm().contactMethod"
          (contactMethodChange)="setContactMethod($event)"
          [submitting]="portalStore.complaintForm().submitting"
          [canSubmit]="portalStore.canSubmitComplaint()"
          (submitComplaint)="submitComplaint()"
          [complaints]="myComplaints()"
          [complaintsLoading]="complaintsApi.isLoading()"
          [hasUnreadMessages]="hasUnreadMessages.bind(this)"
          [getStatusLabel]="getUnifiedStatusLabel.bind(this)"
          [getLabel]="getComplaintCategoryLabel.bind(this)"
          [getRequestTypeLabel]="getRequestTypeLabel.bind(this)"
          (openConversation)="viewResponse($event)"
          (reloadComplaints)="complaintsApi.reload()"
          (closeSection)="setActiveSection('management')"
        />
      </div>
      }

      <!-- Solicitar Vacaciones Section -->
      @if (portalStore.activeSection() === 'vacations') {
      <div id="vacations" class="section-content">
        <pt-employee-portal-vacations
          [minVacationDate]="minVacationDate"
          [maxVacationDate]="maxVacationDate()"
          [vacationStartDate]="portalStore.vacationForm().startDate"
          (vacationStartDateChange)="setVacationStartDate($event)"
          [vacationEndDate]="portalStore.vacationForm().endDate"
          (vacationEndDateChange)="setVacationEndDate($event)"
          [vacationReason]="portalStore.vacationForm().reason"
          (vacationReasonChange)="setVacationReason($event)"
          [submitting]="portalStore.vacationForm().submitting"
          [canSubmit]="canSubmitVacation()"
          (submit)="submitVacationRequest()"
          (resetForm)="resetVacationForm()"
          [vacationRequests]="myVacationRequests()"
          [requestsLoading]="vacationTimeoffsApi.isLoading()"
          (reloadList)="reloadVacationRequests()"
          (closeSection)="setActiveSection('management')"
          [calculateVacationDays]="calculateVacationDays.bind(this)"
          [calculateDaysBetween]="calculateDaysBetween.bind(this)"
          [isDateFuture]="isDateFuture.bind(this)"
        />
      </div>
      }

      <!-- Tiempo Compensatorio Section -->
      @if (portalStore.activeSection() === 'compensatory') {
      <div id="compensatory" class="section-content">
        <pt-employee-portal-compensatory
          [compensatoryType]="portalStore.compensatoryForm().type"
          (compensatoryTypeChange)="setCompensatoryType($event)"
          [compensatoryDate]="portalStore.compensatoryForm().compensatoryDate"
          (compensatoryDateChange)="setCompensatoryDate($event)"
          [compensatoryTimeStart]="
            portalStore.compensatoryForm().compensatoryTimeStart
          "
          (compensatoryTimeStartChange)="setCompensatoryTimeStart($event)"
          [compensatoryTimeEnd]="
            portalStore.compensatoryForm().compensatoryTimeEnd
          "
          (compensatoryTimeEndChange)="setCompensatoryTimeEnd($event)"
          [compensatoryStartDate]="portalStore.compensatoryForm().startDate"
          (compensatoryStartDateChange)="setCompensatoryStartDate($event)"
          [compensatoryEndDate]="portalStore.compensatoryForm().endDate"
          (compensatoryEndDateChange)="setCompensatoryEndDate($event)"
          [compensatoryReason]="portalStore.compensatoryForm().reason"
          (compensatoryReasonChange)="setCompensatoryReason($event)"
          [manualOvertimeDates]="
            portalStore.compensatoryForm().manualOvertimeDates
          "
          [newOvertimeDate]="portalStore.compensatoryForm().newOvertimeDate"
          (newOvertimeDateChange)="setNewOvertimeDate($event)"
          (addManualDate)="addManualOvertimeDate()"
          (removeManualDate)="removeManualOvertimeDate($event)"
          [compensatoryAmount]="compensatoryAmount()"
          [canSubmit]="canSubmitCompensatory()"
          [submitting]="portalStore.compensatoryForm().submitting"
          [minPastDate]="minPastDate"
          [maxFutureDate]="maxFutureDate"
          [today]="today"
          (submit)="submitCompensatoryRequest()"
          (openTutorial)="setShowTutorialDialog(true)"
          (closeSection)="setActiveSection('management')"
          (viewRequests)="setActiveSection('my-requests')"
        />
      </div>
      }

      <!-- Mis Solicitudes Section -->
      @if (portalStore.activeSection() === 'my-requests') {
      <div id="my-requests" class="section-content">
        <pt-employee-portal-my-requests
          [allRequests]="allRequestsUnified()"
          [filteredRequests]="filteredAllRequests()"
          [isLoading]="
            compensatoryTimeoffsApi.isLoading() ||
            disabilitiesApi.isLoading() ||
            documentRequestsApi.isLoading() ||
            complaintsApi.isLoading()
          "
          [statusOptions]="allRequestsStatusOptions"
          [typeOptions]="allRequestsTypeOptions"
          [sortOptions]="allRequestsSortOptions"
          [getStatusLabel]="getUnifiedStatusLabel.bind(this)"
          [getRequestTypeLabel]="getRequestTypeLabel.bind(this)"
          [getDocumentTypeLabel]="getDocumentTypeLabel.bind(this)"
          [getComplaintCategoryLabel]="getComplaintCategoryLabel.bind(this)"
          [formatHoursMinutes]="formatHoursMinutes.bind(this)"
          [formatDateWithTimeRange]="formatDateWithTimeRange.bind(this)"
          [hasTimeInfo]="hasTimeInfo.bind(this)"
          [filterSearchValue]="allRequestsFilterSearch()"
          [filterStatusValue]="allRequestsFilterStatus()"
          [filterTypeValue]="allRequestsFilterType()"
          [filterDateRangeValue]="allRequestsFilterDateRange()"
          [selectedSortValue]="selectedSortOption()"
          [setFilterSearch]="
            allRequestsFilterSearch.set.bind(allRequestsFilterSearch)
          "
          [setFilterStatus]="
            allRequestsFilterStatus.set.bind(allRequestsFilterStatus)
          "
          [setFilterType]="
            allRequestsFilterType.set.bind(allRequestsFilterType)
          "
          [setFilterDateRange]="
            allRequestsFilterDateRange.set.bind(allRequestsFilterDateRange)
          "
          [setSelectedSort]="selectedSortOption.set.bind(selectedSortOption)"
          (viewRequestDetails)="viewRequestDetails($event)"
          (viewResponse)="viewResponse($event)"
          (setActiveSection)="setActiveSection($event)"
        />
      </div>
      }

      <!-- Notificaciones Section -->
      @if (portalStore.activeSection() === 'notifications') {
      <div id="notifications" class="section-content">
        <pt-employee-portal-notifications
          [notifications]="notifications()"
          [unreadCount]="unreadNotificationsCount()"
          [getNotificationIcon]="getNotificationIcon.bind(this)"
          [getRelatedTypeLabel]="getRelatedTypeLabel.bind(this)"
          (markAsRead)="markNotificationAsRead($event)"
          (markAllAsRead)="markAllNotificationsAsRead()"
        />
      </div>
      }
    </div>

    <!-- Dialog para conversación bidireccional -->
    <pt-employee-portal-conversation-dialog
      [visible]="portalStore.conversationDialogVisible()"
      [selectedComplaint]="selectedComplaint()"
      [messages]="conversationMessages()"
      [replyMessageValue]="portalStore.replyMessage()"
      [sendingReply]="portalStore.sendingReply()"
      [isLoading]="complaintMessagesApi.isLoading()"
      [getComplaintCategoryLabel]="getComplaintCategoryLabel.bind(this)"
      (close)="closeConversation()"
      (sendReply)="sendReply()"
      (replyMessageChange)="portalStore.setReplyMessage($event)"
    />

    <!-- Dialog de Tutorial de Tiempo Compensatorio -->
    <pt-employee-portal-compensatory-tutorial-dialog
      [visible]="portalStore.compensatoryForm().showTutorial"
      (close)="setShowTutorialDialog(false)"
    />

    <!-- Dialog para Detalles de Solicitud -->
    <pt-employee-portal-request-details-dialog
      [visible]="showRequestDetailsDialog()"
      [request]="selectedRequestDetails()"
      [getStatusLabel]="getUnifiedStatusLabel.bind(this)"
      [getRequestTypeLabel]="getRequestTypeLabel.bind(this)"
      [getDocumentTypeLabel]="getDocumentTypeLabel.bind(this)"
      [getComplaintCategoryLabel]="getComplaintCategoryLabel.bind(this)"
      [formatHoursMinutes]="formatHoursMinutes.bind(this)"
      [formatDateWithTimeRange]="formatDateWithTimeRange.bind(this)"
      [hasTimeInfo]="hasTimeInfo.bind(this)"
      (close)="closeRequestDetailsDialog()"
      (viewResponse)="closeRequestDetailsDialog(); viewResponse($event)"
      (downloadDocument)="downloadDocument($event)"
    />

    <p-toast />
  `,
  styles: `
    .portal-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem;
      width: 100%;
    }

    @media (min-width: 640px) {
      .portal-content {
        padding: 1.5rem;
      }
    }

    @media (min-width: 1024px) {
      .portal-content {
        padding: 2rem;
      }
    }


    ::ng-deep .dashboard-welcome-card .p-card-body {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%);
      border: 1px solid rgba(251, 191, 36, 0.2);
    }

    ::ng-deep .dashboard-stat-card .p-card-body {
      padding: 1.25rem;
    }

    @media (max-width: 640px) {
      ::ng-deep .dashboard-stat-card .p-card-body {
        padding: 1rem;
      }
    }

    ::ng-deep .dashboard-stat-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    ::ng-deep .dashboard-stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.15);
    }

    /* Responsive tabs */
    ::ng-deep .p-tabs .p-tablist {
      overflow-x: auto;
      scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
    }

    ::ng-deep .p-tabs .p-tab {
      white-space: nowrap;
      min-width: fit-content;
    }

    /* Responsive tables */
    ::ng-deep .p-datatable .p-datatable-thead > tr > th,
    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 0.75rem 0.5rem;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    @media (max-width: 640px) {
      ::ng-deep .p-datatable .p-datatable-thead > tr > th,
      ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
        padding: 0.5rem 0.375rem;
        font-size: 0.75rem;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      ::ng-deep .p-datatable .p-datatable-scrollable-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      /* Smaller paginator on mobile */
      ::ng-deep .p-paginator {
        font-size: 0.75rem;
      }

      ::ng-deep .p-paginator .p-paginator-pages .p-paginator-page {
        min-width: 2rem;
        height: 2rem;
      }
    }

    /* Responsive cards */
    ::ng-deep .p-card {
      border-radius: 0.5rem;
    }

    @media (max-width: 640px) {
      ::ng-deep .p-card .p-card-body {
        padding: 1rem;
      }

      ::ng-deep .p-card .p-card-header {
        padding: 0.75rem;
      }

      ::ng-deep .p-card .p-card-title {
        font-size: 1rem;
      }
    }

    /* Touch-friendly buttons */
    @media (max-width: 640px) {
      ::ng-deep .p-button {
        min-height: 44px;
        min-width: 44px;
        padding: 0.75rem 1rem;
      }

      ::ng-deep .p-inputtext,
      ::ng-deep .p-inputtextarea,
      ::ng-deep .p-datepicker input {
        min-height: 44px;
        font-size: 16px; /* Prevents zoom on iOS */
      }
    }

    /* Responsive forms */
    @media (max-width: 640px) {
      .grid {
        grid-template-columns: 1fr !important;
      }
    }

    /* Dialog responsive */
    @media (max-width: 640px) {
      ::ng-deep .p-dialog {
        width: 95vw !important;
        max-width: 95vw !important;
        margin: 0.5rem;
      }

      ::ng-deep .p-dialog .p-dialog-content {
        padding: 1rem;
        max-height: calc(100vh - 120px);
      }
    }

    /* Section content */
    .section-content {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }


    /* Better spacing on mobile */
    @media (max-width: 640px) {
      .space-y-4 > * + * {
        margin-top: 1rem;
      }

      .gap-4 {
        gap: 1rem;
      }

      .gap-6 {
        gap: 1.5rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePortalComponent {
  public store = inject(DashboardStore);
  public employees = inject(EmployeesStore);
  public portalStore = inject(EmployeePortalStore);
  public messageService = inject(MessageService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private organizationService = inject(OrganizationService);
  private employeePortalApi = inject(EmployeePortalApiService);
  private navigationService = inject(EmployeePortalNavigationService);
  public notificationsService = inject(NotificationsService);
  public timelogsService = inject(EmployeePortalTimelogsService);
  public requestsService = inject(EmployeePortalRequestsService);
  private readonly companyEmailDomain = '@blackdogpanama.com';

  public currentEmployee = computed(() => this.store.currentEmployee());
  // Notificaciones
  public notifications = computed(() =>
    this.notificationsService.notifications()
  );
  public unreadNotificationsCount = computed(() =>
    this.notificationsService.unreadCount()
  );
  public showWorkEmail = computed(() => {
    const workEmail =
      this.currentEmployee()?.work_email?.trim().toLowerCase() ?? '';
    return workEmail.endsWith(this.companyEmailDomain);
  });

  // Verificar si el usuario es HR o Admin
  public isHRorAdmin = computed(() => {
    const isAdmin = this.store.isAdmin();
    const currentEmp = this.currentEmployee();
    const deptName = currentEmp?.department?.name?.toLowerCase() || '';
    const isHR =
      deptName.includes('recursos humanos') ||
      deptName.includes('rrhh') ||
      deptName.includes('hr');
    return isAdmin || isHR;
  });

  public setActiveSection(section: string): void {
    this.portalStore.setActiveSection(section);
  }

  public setVacationStartDate(value: Date | null): void {
    this.portalStore.setVacationStartDate(value);
  }

  public setVacationEndDate(value: Date | null): void {
    this.portalStore.setVacationEndDate(value);
  }

  public setVacationReason(value: string): void {
    this.portalStore.setVacationReason(value);
  }

  public setSubmittingVacation(value: boolean): void {
    this.portalStore.setSubmittingVacation(value);
  }

  public resetVacationForm(): void {
    this.portalStore.resetVacationForm();
  }

  public setCompensatoryType(value: 'hours' | 'days'): void {
    this.portalStore.setCompensatoryType(value);
  }

  public setCompensatoryStartDate(value: Date | null): void {
    this.portalStore.setCompensatoryStartDate(value);
  }

  public setCompensatoryEndDate(value: Date | null): void {
    this.portalStore.setCompensatoryEndDate(value);
  }

  public setCompensatoryReason(value: string): void {
    this.portalStore.setCompensatoryReason(value);
  }

  public setSubmittingCompensatory(value: boolean): void {
    this.portalStore.setSubmittingCompensatory(value);
  }

  public setShowTutorialDialog(value: boolean): void {
    this.portalStore.setShowTutorialDialog(value);
  }

  public setCompensatoryDate(value: Date | null): void {
    this.portalStore.setCompensatoryDate(value);
  }

  public setCompensatoryTimeStart(value: Date | null): void {
    this.portalStore.setCompensatoryTimeStart(value);
  }

  public setCompensatoryTimeEnd(value: Date | null): void {
    this.portalStore.setCompensatoryTimeEnd(value);
  }

  public toggleOvertimeDay(day: string): void {
    this.portalStore.toggleOvertimeDay(day);
  }

  public setManualOvertimeDates(value: Date[]): void {
    this.portalStore.setManualOvertimeDates(value);
  }

  public setNewOvertimeDate(value: Date | null): void {
    this.portalStore.setNewOvertimeDate(value);
  }

  public toggleSalary(): void {
    this.portalStore.toggleShowSalary();
  }

  public setDocumentType(value: string): void {
    this.portalStore.setDocumentType(value);
  }

  public setCustomDocumentType(value: string): void {
    this.portalStore.setCustomDocumentType(value);
  }

  public setDocumentReason(value: string): void {
    this.portalStore.setDocumentReason(value);
  }

  public setDocumentRequiredDate(value: Date | null): void {
    this.portalStore.setDocumentRequiredDate(value);
  }

  public setComplaintCategory(value: string): void {
    this.portalStore.setComplaintCategory(value);
  }

  public setComplaintText(value: string): void {
    this.portalStore.setComplaintText(value);
  }

  public setAllowContact(value: boolean): void {
    this.portalStore.setAllowContact(value);
  }

  public setContactMethod(value: string): void {
    this.portalStore.setContactMethod(value);
  }

  constructor() {
    // Inicializar notificaciones cuando cambia el empleado actual
    effect(() => {
      const employeeId = this.currentEmployee()?.id;
      if (employeeId) {
        this.notificationsService.setCurrentEmployeeId(employeeId);
      }
    });
    // Inicializar con el fragmento actual si existe
    const currentFragment = this.route.snapshot.fragment;
    if (currentFragment) {
      this.setActiveSection(currentFragment);
    } else {
      this.setActiveSection('dashboard');
    }

    // Suscribirse a cambios de fragmento
    this.route.fragment.subscribe((fragment) => {
      if (fragment) {
        this.setActiveSection(fragment);
        // Hacer scroll a la sección después de un pequeño delay
        setTimeout(() => {
          const element = document.getElementById(fragment);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
          }
        }, 100);
      } else {
        this.setActiveSection('dashboard');
      }
    });

    // Efecto para rastrear cambios en activeSection
    effect(() => {
      const section = this.portalStore.activeSection();
      if (section === 'timelogs') {
        // Sección timelogs activada - no se requiere logging
      }
      if (section === 'management' || section === 'gestiones') {
      }
    });

    // Inicializar notificaciones cuando cambia el empleado actual
    effect(() => {
      const employeeId = this.currentEmployee()?.id;
      if (employeeId) {
        this.notificationsService.setCurrentEmployeeId(employeeId);
      }
    });

    // Suscribirse a cambios de navegación desde el layout
    effect(() => {
      const targetSection = this.navigationService.navigateToSection();
      if (targetSection) {
        this.setActiveSection(targetSection);
        // Actualizar la URL también
        this.router.navigate(['/employee-portal'], {
          fragment: targetSection,
          replaceUrl: false,
        });
        // Hacer scroll a la sección
        setTimeout(() => {
          const element = document.getElementById(targetSection);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    });
  }

  // Get current date for template
  public getCurrentDate(): Date {
    return new Date();
  }

  // Delegar timelogs al servicio
  public timelogsApi = this.timelogsService.timelogsApi;
  public myTimelogs = this.timelogsService.myTimelogs;
  public monthTimelogsApi = this.timelogsService.monthTimelogsApi;
  public monthTimelogs = this.timelogsService.monthTimelogs;
  public timelogMarkers = this.timelogsService.timelogMarkers;
  public myLates = this.timelogsService.myLates;
  public daysWorkedThisMonth = this.timelogsService.daysWorkedThisMonth;
  public recentTimelogs = this.timelogsService.recentTimelogs;
  public recentTimelogsCount = this.timelogsService.recentTimelogsCount;
  public totalOvertimeHours = this.timelogsService.totalOvertimeHours;
  public availableOvertimeDays = this.timelogsService.availableOvertimeDays;
  public overtimeDaysDetails = this.timelogsService.overtimeDaysDetails;

  // Handler para cambio de mes en el calendario
  public onCalendarMonthChange(date: Date): void {
    this.timelogsService.onCalendarMonthChange(date);
  }

  // Disabilities
  public disabilityStartDate = signal<Date | null>(null);
  public disabilityEndDate = signal<Date | null>(null);
  public disabilityDescription = signal('');
  public selectedFile = signal<File | null>(null);
  public uploadingDisability = signal(false);

  // Delegar disabilities al servicio
  public disabilitiesApi = this.requestsService.disabilitiesApi;
  public myDisabilities = this.requestsService.allDisabilities;

  // Document Requests - usar portalStore directamente

  // Opciones para el tipo de documento
  public documentTypeOptions = [
    { label: 'Carta de Trabajo', value: 'work_letter' },
    { label: 'Certificado de Salario', value: 'salary_certificate' },
    { label: 'Certificado de Empleo', value: 'employment_certificate' },
    { label: 'Otro', value: 'other' },
  ];

  // Método para resetear el formulario de documentos
  public resetDocumentForm(): void {
    this.portalStore.resetDocumentForm();
  }

  // Delegar document requests al servicio
  public documentRequestsApi = this.requestsService.documentRequestsApi;
  public myDocumentRequests = this.requestsService.allDocumentRequests;

  // Complaints - usar portalStore directamente
  public responseDialogVisible = signal(false);
  public selectedComplaint = signal<any>(null);

  // Delegar complaints al servicio
  public complaintsApi = this.requestsService.complaintsApi;
  public myComplaints = this.requestsService.allComplaints;

  // API para mensajes de una queja específica
  public complaintMessagesApi = httpResource<any[]>(() => {
    const complaint = this.selectedComplaint();
    if (!complaint) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
      method: 'GET',
      params: {
        select: '*',
        complaint_id: `eq.${complaint.id}`,
        order: 'created_at.asc',
      },
    };
  });

  public conversationMessages = computed(
    () => this.complaintMessagesApi.value() ?? []
  );

  // API para obtener todos los mensajes sin leer de HR (por complaint_id)
  public unreadMessagesApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
      method: 'GET',
      params: {
        select: 'complaint_id',
        sender_type: 'eq.hr',
        is_read: 'eq.false',
      },
    };
  });

  // Computed: Set de quejas con mensajes sin leer del empleado
  public unreadMessagesMap = computed(() => {
    const messages = this.unreadMessagesApi.value() ?? [];
    const myComplaints = this.myComplaints();

    if (myComplaints.length === 0 || messages.length === 0)
      return new Set<string>();

    // Crear un Set de complaint_ids de las quejas del empleado
    const myComplaintIds = new Set(myComplaints.map((c: any) => c.id));

    // Filtrar mensajes sin leer que pertenecen a las quejas del empleado
    const unreadSet = new Set<string>();
    messages.forEach((msg: any) => {
      if (msg.complaint_id && myComplaintIds.has(msg.complaint_id)) {
        unreadSet.add(msg.complaint_id);
      }
    });

    return unreadSet;
  });

  public unreadComplaintsCount = computed(() => {
    return this.unreadMessagesMap().size;
  });

  // Señales para conversación - usar del store

  // Helper methods - delegados a utils y servicios
  public calculateWorkedHours = this.timelogsService.calculateWorkedHours;
  public calculateDays = calculateDays;
  public calculateHoursFromDates = calculateHoursFromDates;
  public getCompensatoryReasonFromNotes = getCompensatoryReasonFromNotes;
  public getCompensatoryQuantity = getCompensatoryQuantity;

  public getScheduleColor(color: string): string {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      red: 'bg-red-500 text-white',
      yellow: 'bg-yellow-500 text-white',
      purple: 'bg-purple-500 text-white',
      orange: 'bg-orange-500 text-white',
    };
    return colorMap[color] || 'bg-neutral-700 text-gray-300';
  }

  public onFileSelect(event: any): void {
    this.selectedFile.set(event.files[0]);
  }

  // Delegar cálculos de horas extras al servicio
  public calculateDayOvertimeHours = (log: any): number => {
    return this.timelogsService.calculateDayOvertimeHours(log);
  };

  // Computed: Total de horas extras de días seleccionados
  public totalSelectedOvertimeHours = computed(() => {
    const selectedDays = this.portalStore.selectedOvertimeDays();
    const availableDays = this.availableOvertimeDays();

    let total = 0;
    selectedDays.forEach((day) => {
      const dayData = availableDays.find((d) => d.day === day);
      if (dayData) {
        total += dayData.hours;
      }
    });

    return total;
  });

  // Método helper para obtener el total de horas extra
  public getTotalOvertimeHours(): string {
    const details = this.overtimeDaysDetails();
    const total = details.reduce((sum, day) => sum + day.overtimeHours, 0);
    return this.formatHoursMinutes(total);
  }

  // Método helper para verificar si una fecha tiene información de tiempo
  public hasTimeInfo(dateValue: string | Date | null | undefined): boolean {
    if (!dateValue) return false;
    const dateStr = String(dateValue);
    return dateStr.includes(' ') || dateStr.includes('T');
  }

  // Método helper para formatear el rango de horas desde fechas datetime
  public formatDateWithTimeRange(
    dateFrom: string | Date,
    dateTo: string | Date
  ): string {
    try {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return '';
      }

      const fromTime = format(from, 'HH:mm');
      const toTime = format(to, 'HH:mm');

      return `de ${fromTime} a ${toTime}`;
    } catch (error) {
      console.error('Error formatting date range:', error);
      return '';
    }
  }

  // Helper para formatear horas en formato horas y minutos
  public formatHoursMinutes(hours: number | string): string {
    const hoursNum = typeof hours === 'string' ? parseFloat(hours) : hours;
    if (isNaN(hoursNum) || hoursNum <= 0) return '0m';

    const totalMinutes = Math.round(hoursNum * 60);
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;

    if (hoursPart === 0) {
      return `${minutesPart}m`;
    } else if (minutesPart === 0) {
      return `${hoursPart}h`;
    } else {
      return `${hoursPart}h ${minutesPart}m`;
    }
  }

  // Timeoffs API para compensatorios
  public timeoffsApi = httpResource<any[]>(
    () => {
      if (!this.currentEmployee()?.id) return undefined;
      const companyId = this.organizationService.getCurrentCompanyId();

      if (!companyId) {
        return undefined;
      }

      // ID del tipo de timeoff "Compensatorio"
      const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';

      const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`;
      // La tabla timeoffs tiene múltiples relaciones con employees (employee_id, reviewed_by, registered_by)
      // No necesitamos incluir la relación employee porque:
      // 1. approvedCompensatoryHours solo usa date_from y date_to (campos directos de timeoffs)
      // 2. Ya filtramos por employee_id directamente, que garantiza que pertenece al empleado correcto
      // 3. El empleado ya está filtrado por company_id a través de currentEmployee()
      // Esto evita el error HTTP 300 cuando hay múltiples relaciones
      const select = `*,type:timeoff_types(id,name)`;

      let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
      url += `&employee_id=eq.${this.currentEmployee()!.id}`;
      url += `&type_id=eq.${compensatoryTypeId}`;
      url += `&is_approved=eq.true`;
      // No necesitamos filtrar por company_id porque employee_id ya garantiza que pertenece al empleado correcto
      // y el empleado ya está filtrado por company_id a través de currentEmployee()
      url += `&order=date_from.desc`;

      return {
        url,
        method: 'GET',
      };
    },
    {
      // CRÍTICO: defaultValue evita que el resource lance error si falla la primera carga
      // Si el resource entra en estado de error, cualquier recomputación del signal vuelve a lanzar el error (loop infinito)
      // Por eso protegemos los reload() para que no se ejecuten si status === 'error'
      defaultValue: [],
    }
  );

  // Dialog para detalles de solicitud
  public showRequestDetailsDialog = signal(false);
  public selectedRequestDetails = signal<any>(null);
  public minVacationDate = new Date(); // No permitir fechas pasadas
  public maxVacationDate = computed(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1); // Máximo 1 año en el futuro
    return date;
  });

  // Nuevos signals para el formulario mejorado

  // Constantes de validación para tiempo compensatorio
  private readonly MAX_FUTURE_DAYS = 90; // Máximo 90 días en el futuro
  private readonly MAX_PAST_DAYS = 30; // Máximo 30 días en el pasado
  private readonly MAX_CONSECUTIVE_DAYS = 7; // Máximo 7 días consecutivos

  // Propiedad para obtener la fecha actual (para usar en templates)
  public get today(): Date {
    return new Date();
  }

  // Propiedades computadas para límites de fechas
  public get maxFutureDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + this.MAX_FUTURE_DAYS);
    return date;
  }

  public get minPastDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - this.MAX_PAST_DAYS);
    return date;
  }

  public isDaySelected(day: string): boolean {
    return this.portalStore.selectedOvertimeDays().has(day);
  }

  public addManualOvertimeDate() {
    const date = this.portalStore.compensatoryForm().newOvertimeDate;
    if (!date) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const existingDates =
      this.portalStore.compensatoryForm().manualOvertimeDates;

    const isDuplicate = existingDates.some(
      (d) => format(d, 'yyyy-MM-dd') === dateStr
    );
    if (isDuplicate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha duplicada',
        detail: 'Esta fecha ya ha sido agregada',
      });
      return;
    }

    this.setManualOvertimeDates([...existingDates, date]);
    this.setNewOvertimeDate(null);
  }

  public removeManualOvertimeDate(index: number) {
    const dates = this.portalStore.compensatoryForm().manualOvertimeDates;
    dates.splice(index, 1);
    this.setManualOvertimeDates([...dates]);
  }

  // Delegar APIs de solicitudes al servicio
  public compensatoryTimeoffsApi = this.requestsService.compensatoryTimeoffsApi;
  public vacationTimeoffsApi = this.requestsService.vacationTimeoffsApi;

  // Delegar filtros al servicio
  public allRequestsFilterStatus = this.requestsService.allRequestsFilterStatus;
  public allRequestsFilterType = this.requestsService.allRequestsFilterType;
  public allRequestsFilterDateRange =
    this.requestsService.allRequestsFilterDateRange;
  public allRequestsFilterSearch = this.requestsService.allRequestsFilterSearch;
  public allRequestsSortBy = this.requestsService.allRequestsSortBy;
  public allRequestsSortOrder = this.requestsService.allRequestsSortOrder;
  public selectedSortOption = this.requestsService.selectedSortOption;
  public filtersExpanded = this.requestsService.filtersExpanded;

  // Mantener filtros antiguos para compatibilidad con sección de tiempo compensatorio
  public compensatoryFilterStatus =
    this.requestsService.compensatoryFilterStatus;
  public compensatoryFilterType = this.requestsService.compensatoryFilterType;
  public compensatoryFilterDateRange =
    this.requestsService.compensatoryFilterDateRange;
  public compensatoryFilterSearch =
    this.requestsService.compensatoryFilterSearch;
  public compensatorySortBy = this.requestsService.compensatorySortBy;
  public compensatorySortOrder = this.requestsService.compensatorySortOrder;

  // Delegar computed de solicitudes al servicio
  public allCompensatoryRequests = this.requestsService.allCompensatoryRequests;
  public allRequestsUnified = this.requestsService.allRequestsUnified;
  public myCompensatoryRequests = this.requestsService.myCompensatoryRequests;
  public filteredAllRequests = this.requestsService.filteredAllRequests;

  // Delegar helpers y opciones al servicio
  public getUnifiedStatusLabel = (status: string): string =>
    this.requestsService.getUnifiedStatusLabel(status);
  public getRequestTypeLabel = (type: string): string =>
    this.requestsService.getRequestTypeLabel(type);
  public getDocumentTypeLabel = (type: string): string =>
    this.requestsService.getDocumentTypeLabel(type);
  public getComplaintCategoryLabel = (category: string): string =>
    this.requestsService.getComplaintCategoryLabel(category);

  // Opciones para filtros
  public allRequestsStatusOptions =
    this.requestsService.allRequestsStatusOptions;
  public allRequestsTypeOptions = this.requestsService.allRequestsTypeOptions;
  public allRequestsSortOptions = this.requestsService.allRequestsSortOptions;
  public compensatoryStatusOptions =
    this.requestsService.compensatoryStatusOptions;
  public compensatoryTypeOptions = this.requestsService.compensatoryTypeOptions;
  public compensatorySortOptions = this.requestsService.compensatorySortOptions;

  // Métodos para limpiar filtros
  public clearAllRequestsFilters = (): void =>
    this.requestsService.clearAllRequestsFilters();
  public clearCompensatoryFilters = (): void =>
    this.requestsService.clearCompensatoryFilters();
  public onAllRequestsSortChange = (option: any): void =>
    this.requestsService.onAllRequestsSortChange(option);
  public onCompensatorySortChange = (option: any): void =>
    this.requestsService.onCompensatorySortChange(option);
  public getActiveFiltersCount = (): number =>
    this.requestsService.getActiveFiltersCount();
  public canClearAllRequestsFilters =
    this.requestsService.canClearAllRequestsFilters;

  // Computed: Calcular el total de horas/días automáticamente
  public compensatoryAmount = computed(() => {
    const type = this.portalStore.compensatoryForm().type;

    if (type === 'hours') {
      const date = this.portalStore.compensatoryForm().compensatoryDate;
      const timeStart =
        this.portalStore.compensatoryForm().compensatoryTimeStart;
      const timeEnd = this.portalStore.compensatoryForm().compensatoryTimeEnd;

      if (!date || !timeStart || !timeEnd) {
        return 0;
      }

      // Calcular diferencia en horas
      const startDateTime = new Date(date);
      startDateTime.setHours(timeStart.getHours());
      startDateTime.setMinutes(timeStart.getMinutes());
      startDateTime.setSeconds(0);
      startDateTime.setMilliseconds(0);

      const endDateTime = new Date(date);
      endDateTime.setHours(timeEnd.getHours());
      endDateTime.setMinutes(timeEnd.getMinutes());
      endDateTime.setSeconds(0);
      endDateTime.setMilliseconds(0);

      // Si la hora fin es menor que la hora inicio, asumir que es del día siguiente
      if (endDateTime < startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const diffMinutes = differenceInMinutes(endDateTime, startDateTime);
      const diffHours = diffMinutes / 60;

      return Math.max(0, diffHours);
    } else {
      // Si es días, calcular diferencia en días
      const startDate = this.portalStore.compensatoryForm().startDate;
      const endDate = this.portalStore.compensatoryForm().endDate;

      if (!startDate || !endDate) {
        return 0;
      }

      const diffDays = differenceInDays(endDate, startDate) + 1; // +1 para incluir ambos días
      return Math.max(0, diffDays);
    }
  });

  // Validar si se puede enviar la solicitud
  public canSubmitCompensatory = computed(() => {
    const type = this.portalStore.compensatoryForm().type;
    const amount = this.compensatoryAmount();

    if (amount <= 0) {
      return false;
    }

    if (type === 'hours') {
      // Si es horas, debe tener fecha y ambas horas
      const date = this.portalStore.compensatoryForm().compensatoryDate;
      const timeStart =
        this.portalStore.compensatoryForm().compensatoryTimeStart;
      const timeEnd = this.portalStore.compensatoryForm().compensatoryTimeEnd;
      if (!date || !timeStart || !timeEnd) {
        return false;
      }
    } else {
      // Si es días, debe tener fecha inicio y fin
      const startDate = this.portalStore.compensatoryForm().startDate;
      const endDate = this.portalStore.compensatoryForm().endDate;
      if (!startDate || !endDate || endDate < startDate) {
        return false;
      }
    }

    return true;
  });

  // Función para enviar solicitud de tiempo compensatorio
  public async submitCompensatoryRequest(): Promise<void> {
    await submitCompensatoryRequest({
      store: this.portalStore,
      api: this.employeePortalApi,
      messageService: this.messageService,
      currentEmployee: () => this.currentEmployee(),
      formState: {
        type: this.portalStore.compensatoryForm().type,
        startDate: this.portalStore.compensatoryForm().startDate,
        endDate: this.portalStore.compensatoryForm().endDate,
        date: this.portalStore.compensatoryForm().compensatoryDate,
        timeStart: this.portalStore.compensatoryForm().compensatoryTimeStart,
        timeEnd: this.portalStore.compensatoryForm().compensatoryTimeEnd,
        reason: this.portalStore.compensatoryForm().reason,
        manualOvertimeDates:
          this.portalStore.compensatoryForm().manualOvertimeDates,
        amount: this.compensatoryAmount(),
      },
      constants: {
        MAX_FUTURE_DAYS: this.MAX_FUTURE_DAYS,
        MAX_PAST_DAYS: this.MAX_PAST_DAYS,
        MAX_CONSECUTIVE_DAYS: this.MAX_CONSECUTIVE_DAYS,
      },
      canSubmit: () => this.canSubmitCompensatory(),
      resetForm: () => {
        this.setCompensatoryStartDate(null);
        this.setCompensatoryEndDate(null);
        this.setCompensatoryDate(null);
        this.setCompensatoryTimeStart(null);
        this.setCompensatoryTimeEnd(null);
        this.setCompensatoryType('hours');
        this.setCompensatoryReason('');
        this.setManualOvertimeDates([]);
        this.setNewOvertimeDate(null);
      },
      reloadRequests: () => {
        if (
          this.compensatoryTimeoffsApi &&
          typeof this.compensatoryTimeoffsApi.reload === 'function' &&
          this.compensatoryTimeoffsApi.status() !== 'error'
        ) {
          this.compensatoryTimeoffsApi.reload();
        }
      },
      setSubmitting: (value: boolean) => this.setSubmittingCompensatory(value),
    });
  }

  // ============================================
  // MÉTODOS PARA VACACIONES
  // ============================================

  /**
   * Valida si se puede enviar la solicitud de vacaciones
   */
  public canSubmitVacation = computed(() => {
    const startDate = this.portalStore.vacationForm().startDate;
    const endDate = this.portalStore.vacationForm().endDate;

    if (!startDate || !endDate) {
      return false;
    }

    // Validar que la fecha de inicio no sea pasada
    const today = startOfDay(new Date());
    const start = startOfDay(startDate);
    if (start < today) {
      return false;
    }

    // Validar que la fecha de fin sea mayor o igual a la de inicio
    const end = startOfDay(endDate);
    if (end < start) {
      return false;
    }

    return true;
  });

  /**
   * Calcula el número de días de vacaciones solicitados
   */
  public calculateVacationDays = computed(() => {
    const startDate = this.portalStore.vacationForm().startDate;
    const endDate = this.portalStore.vacationForm().endDate;

    if (!startDate || !endDate) {
      return 0;
    }

    return calculateDaysBetween(startDate, endDate);
  });

  /**
   * Calcula los días entre dos fechas (incluyendo ambos días)
   */
  public calculateDaysBetween = calculateDaysBetween;

  /**
   * Verifica si una fecha es futura
   */
  public isDateFuture = isDateFuture;

  // Delegar vacation requests al servicio
  public myVacationRequests = this.requestsService.allVacationRequests;

  /**
   * Recarga las solicitudes de vacaciones
   */
  public reloadVacationRequests(): void {
    if (
      this.vacationTimeoffsApi &&
      typeof this.vacationTimeoffsApi.reload === 'function' &&
      this.vacationTimeoffsApi.status() !== 'error'
    ) {
      this.vacationTimeoffsApi.reload();
    }
  }

  /**
   * Envía la solicitud de vacaciones
   */
  public async submitVacationRequest(): Promise<void> {
    await submitVacationRequest({
      store: this.portalStore,
      api: this.employeePortalApi,
      messageService: this.messageService,
      currentEmployee: () => this.currentEmployee(),
      formState: {
        startDate: this.portalStore.vacationForm().startDate,
        endDate: this.portalStore.vacationForm().endDate,
        reason: this.portalStore.vacationForm().reason,
      },
      resetForm: () => this.resetVacationForm(),
      reloadRequests: () => this.reloadVacationRequests(),
      setSubmitting: (value: boolean) => this.setSubmittingVacation(value),
    });
  }

  // Horas de compensatorio aprobadas
  public approvedCompensatoryHours = computed(() => {
    // CRÍTICO: Si el resource está en estado de error, retornar 0 en lugar de intentar acceder a value()
    // Esto evita que el computed lance el error y entre en loop infinito
    if (this.timeoffsApi.status() === 'error') {
      return 0;
    }
    const timeoffs = this.timeoffsApi.value() ?? [];

    // Calcular horas totales basándose en date_from y date_to
    // Asumimos 8 horas por día trabajado
    const totalHours = timeoffs.reduce((total, timeoff) => {
      const startDate = new Date(timeoff.date_from);
      const endDate = new Date(timeoff.date_to);
      // differenceInDays devuelve la diferencia en días, sumamos 1 para incluir ambos días
      const days = differenceInDays(endDate, startDate) + 1;
      return total + days * 8; // 8 horas por día
    }, 0);

    return totalHours;
  });

  // Edit mode for personal data
  public editMode = signal(false);
  public editEmail = signal('');
  public editWorkEmail = signal('');
  public editPhone = signal('');
  public editAddress = signal('');
  public savingPersonalData = signal(false);

  public toggleEditMode() {
    if (!this.editMode()) {
      // Entrar en modo edición - cargar valores actuales
      const emp = this.currentEmployee();
      this.editEmail.set(emp?.email || '');
      this.editWorkEmail.set(emp?.work_email || '');
      this.editPhone.set(emp?.phone_number || '');
      this.editAddress.set(emp?.address || '');
    }
    this.editMode.update((v) => !v);
  }

  public cancelEdit() {
    this.editMode.set(false);
    this.editEmail.set('');
    this.editWorkEmail.set('');
    this.editPhone.set('');
    this.editAddress.set('');
  }

  public async savePersonalData() {
    if (!this.currentEmployee()?.id) return;

    this.savingPersonalData.set(true);
    try {
      const updateData: any = {};
      if (this.editEmail()) updateData.email = this.editEmail();
      if (this.editWorkEmail()) updateData.work_email = this.editWorkEmail();
      if (this.editPhone()) updateData.phone_number = this.editPhone();
      if (this.editAddress()) updateData.address = this.editAddress();

      const companyId = this.organizationService.getCurrentCompanyId();
      await this.employeePortalApi.updateEmployeeProfile(
        this.currentEmployee()!.id,
        updateData,
        companyId || undefined
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Datos actualizados',
        detail: 'Tus datos personales han sido actualizados correctamente',
      });

      // Recargar datos del empleado
      this.store.employees.fetchItems();
      this.editMode.set(false);
    } catch (error: any) {
      console.error('Error updating personal data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron actualizar los datos',
      });
    } finally {
      this.savingPersonalData.set(false);
    }
  }

  public async uploadDisability(): Promise<void> {
    await uploadDisability({
      http: this.http,
      messageService: this.messageService,
      currentEmployee: () => this.currentEmployee(),
      formState: {
        startDate: this.disabilityStartDate(),
        endDate: this.disabilityEndDate(),
        description: this.disabilityDescription(),
        selectedFile: this.selectedFile(),
      },
      resetForm: () => {
        this.disabilityStartDate.set(null);
        this.disabilityEndDate.set(null);
        this.disabilityDescription.set('');
        this.selectedFile.set(null);
      },
      reloadRequests: () => this.disabilitiesApi.reload(),
      setUploading: (value: boolean) => this.uploadingDisability.set(value),
    });
  }

  public async submitDocumentRequest(): Promise<void> {
    submitDocumentRequest({
      http: this.http,
      messageService: this.messageService,
      store: this.portalStore,
      currentEmployee: () => this.currentEmployee(),
      formState: {
        type: this.portalStore.documentForm().type,
        customType: this.portalStore.documentForm().customType,
        reason: this.portalStore.documentForm().reason,
        requiredDate: this.portalStore.documentForm().requiredDate,
      },
      resetForm: () => this.resetDocumentForm(),
      reloadRequests: () => this.documentRequestsApi.reload(),
      setSubmitting: (value: boolean) =>
        this.portalStore.setSubmittingDocument(value),
    });
  }

  public async submitComplaint(): Promise<void> {
    submitComplaint({
      http: this.http,
      messageService: this.messageService,
      store: this.portalStore,
      currentEmployee: () => this.currentEmployee(),
      formState: {
        category: this.portalStore.complaintForm().category,
        text: this.portalStore.complaintForm().text,
        allowContact: this.portalStore.complaintForm().allowContact,
        contactMethod: this.portalStore.complaintForm().contactMethod,
      },
      canSubmit: () => this.portalStore.canSubmitComplaint(),
      resetForm: () => {
        this.portalStore.setComplaintText('');
        this.portalStore.setComplaintCategory('work_environment');
        this.portalStore.setAllowContact(false);
      },
      reloadRequests: () => this.complaintsApi.reload(),
      setSubmitting: (value: boolean) =>
        this.portalStore.setSubmittingComplaint(value),
    });
  }

  public downloadDocument(url: string | null | undefined): void {
    if (!url) {
      return;
    }
    try {
      // Si la URL es relativa (empieza con /disabilities/ o disabilities/), construir la URL completa
      let fullUrl = url;
      if (url.startsWith('/disabilities/') || url.startsWith('disabilities/')) {
        const path = url.startsWith('/') ? url.slice(1) : url;
        fullUrl = `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/public/${path}`;
      } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Si es una ruta relativa sin prefijo, asumir que es del bucket disabilities
        const path = url.startsWith('/') ? url.slice(1) : url;
        fullUrl = `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/public/disabilities/${path}`;
      }
      window.open(fullUrl, '_blank');
    } catch (error) {
      console.error('Error al descargar documento:', error);
    }
  }

  public viewRequestDetails(request: any): void {
    this.selectedRequestDetails.set(request);
    this.showRequestDetailsDialog.set(true);
  }

  public closeRequestDetailsDialog(): void {
    this.showRequestDetailsDialog.set(false);
    this.selectedRequestDetails.set(null);
  }

  public viewResponse(complaint: any): void {
    this.selectedComplaint.set(complaint);
    this.portalStore.openConversation(complaint.id);
    this.portalStore.setReplyMessage('');
    // Recargar mensajes cuando se abre la conversación
    this.complaintMessagesApi.reload();
    // Marcar mensajes de HR como leídos cuando el empleado abre la conversación
    this.markMessagesAsRead(complaint);
  }

  public async markMessagesAsRead(complaint: any): Promise<void> {
    // Esperar a que se carguen los mensajes
    if (!this.complaintMessagesApi.value()) {
      // Esperar un poco para que se carguen los mensajes
      setTimeout(() => this.markMessagesAsRead(complaint), 500);
      return;
    }

    const messages = this.complaintMessagesApi.value() || [];
    // Marcar mensajes de HR como leídos cuando el empleado los ve
    const unreadMessages = messages.filter(
      (m) => m.sender_type === 'hr' && !m.is_read
    );

    if (unreadMessages.length === 0) return;

    // Marcar todos los mensajes de HR como leídos
    for (const message of unreadMessages) {
      try {
        await firstValueFrom(
          this.http.patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages?id=eq.${message.id}`,
            { is_read: true, read_at: new Date().toISOString() },
            {
              headers: {
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
            }
          )
        );
      } catch (error: any) {
        console.error('Error marking message as read:', error);
      }
    }

    // Recargar mensajes para actualizar el estado
    this.complaintMessagesApi.reload();
    // Recargar quejas para actualizar contadores
    this.complaintsApi.reload();
  }

  public closeConversation(): void {
    this.portalStore.closeConversation();
    this.selectedComplaint.set(null);
    // Recargar quejas para actualizar contadores
    this.complaintsApi.reload();
  }

  public async sendReply(): Promise<void> {
    const complaint = this.selectedComplaint();
    if (!complaint || !this.portalStore.replyMessage().trim()) return;

    this.portalStore.setSendingReply(true);
    const currentEmployee = this.currentEmployee();
    if (!currentEmployee) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar al usuario actual',
      });
      this.portalStore.setSendingReply(false);
      return;
    }

    const messageData = {
      complaint_id: complaint.id,
      sender_id: currentEmployee.id,
      sender_type: 'employee',
      is_anonymous: false, // Si la queja ya tiene employee_id, no puede ser anónima
      message: this.portalStore.replyMessage().trim(),
      thread_id: complaint.thread_id || complaint.id,
    };

    try {
      await firstValueFrom(
        this.http.post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
          messageData,
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
        summary: 'Mensaje Enviado',
        detail: 'Tu respuesta ha sido enviada correctamente',
      });

      this.portalStore.setReplyMessage('');
      this.complaintMessagesApi.reload();
      this.complaintsApi.reload();
      this.portalStore.setSendingReply(false);
    } catch (error: any) {
      console.error('Error sending reply:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo enviar el mensaje',
      });
      this.portalStore.setSendingReply(false);
    }
  }

  public hasUnreadMessages(complaint: any): boolean {
    // Primero verificar si hay mensajes sin leer de la conversación actual
    if (complaint.id === this.selectedComplaint()?.id) {
      const messages = this.conversationMessages();
      return messages.some((m) => m.sender_type === 'hr' && !m.is_read);
    }

    // Si no está seleccionada, usar el mapa de mensajes sin leer
    return this.unreadMessagesMap().has(complaint.id);
  }

  // Métodos para manejar notificaciones
  public markNotificationAsRead(notificationId: string): void {
    this.notificationsService.markAsRead(notificationId);
  }

  public markAllNotificationsAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  public getNotificationIcon(messageType: string): string {
    const icons: Record<string, string> = {
      compensatory_request: 'pi pi-clock',
      compensatory_approved: 'pi pi-check-circle',
      compensatory_rejected: 'pi pi-times-circle',
      compensatory_registered: 'pi pi-calendar-check',
    };
    return icons[messageType] || 'pi pi-bell';
  }

  public getRelatedTypeLabel(relatedType: string): string {
    const labels: Record<string, string> = {
      timeoff: 'Tiempo Compensatorio',
      disability: 'Incapacidad',
      document: 'Documento',
    };
    return labels[relatedType] || relatedType;
  }
}
