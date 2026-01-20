import { CommonModule } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { addDays, differenceInDays, format, startOfDay } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Card } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { EmployeePortalNavigationService } from '../services/employee-portal-navigation.service';
import { NotificationsService } from '../services/notifications.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeePortalStore } from '../stores/employee-portal.store';
import { EmployeesStore } from '../stores/employees.store';
import { uploadCompensatory } from './actions/employee-portal-compensatory.actions';
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
import { EmployeePortalTimelogCorrectionComponent } from './components/employee-portal-timelog-correction.component';
import { EmployeePortalTimelogsComponent } from './components/employee-portal-timelogs.component';
import { EmployeePortalUniformRequestComponent } from './components/employee-portal-uniform-request.component';
import { EmployeePortalVacationsComponent } from './components/employee-portal-vacations.component';
import { EmployeePortalApiService } from './services/employee-portal-api.service';
import { EmployeePortalConversationService } from './services/employee-portal-conversation.service';
import { EmployeePortalProfileService } from './services/employee-portal-profile.service';
import { EmployeePortalRequestsService } from './services/employee-portal-requests.service';
import { EmployeePortalTimelogsService } from './services/employee-portal-timelogs.service';
import {
  calculateCompensatoryAmount,
  canSubmitCompensatory,
  getCompensatoryQuantity,
  getCompensatoryReasonFromNotes,
} from './utils/employee-portal-compensatory.utils';
import {
  calculateDays,
  calculateDaysBetween,
  isDateFuture,
} from './utils/employee-portal-date.utils';
import {
  calculateHoursFromDates,
  formatDateWithTimeRange,
  formatHoursMinutes,
  hasTimeInfo,
} from './utils/employee-portal-time.utils';

@Component({
  selector: 'pt-employee-portal',
  standalone: true,
  imports: [
    CommonModule,
    Card,
    ToastModule,
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
    EmployeePortalTimelogCorrectionComponent,
    EmployeePortalUniformRequestComponent,
  ],
  // NOTA: Estos servicios dependen de DashboardStore (proveído por el layout del portal),
  // por eso se proveen aquí y NO con providedIn:'root' para evitar NG0201 (SignalStore).
  providers: [
    MessageService,
    EmployeePortalTimelogsService,
    EmployeePortalRequestsService,
    EmployeePortalConversationService,
    EmployeePortalProfileService,
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
          (submitRequest)="uploadDisability()"
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
          [vacationFile]="portalStore.vacationForm().selectedFile"
          (vacationFileChange)="setVacationFile($event)"
          [submitting]="portalStore.vacationForm().submitting"
          [canSubmit]="canSubmitVacation()"
          (submitRequest)="submitVacationRequest()"
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
          [today]="today"
          [compensatoryFile]="portalStore.compensatoryForm().compensatoryFile"
          (compensatoryFileChange)="setCompensatoryFile($event)"
          [isBranchManagerView]="isBranchManager()"
          [availableEmployees]="branchEmployees()"
          [selectedEmployeeId]="
            portalStore.compensatoryForm().selectedEmployeeId
          "
          (selectedEmployeeIdChange)="setSelectedEmployeeId($event)"
          (submitRequest)="submitCompensatoryRequest()"
          (openTutorial)="setShowTutorialDialog(true)"
          (closeSection)="setActiveSection('management')"
          (viewRequests)="setActiveSection('my-requests')"
        />
      </div>
      }

      <!-- Omisión de Marcación Section -->
      @if (portalStore.activeSection() === 'timelog_correction') {
      <div id="timelog_correction" class="section-content">
        <pt-employee-portal-timelog-correction
          [correctionDate]="timelogCorrectionDate()"
          (correctionDateChange)="timelogCorrectionDate.set($event)"
          [correctionType]="timelogCorrectionType()"
          (correctionTypeChange)="timelogCorrectionType.set($event)"
          [correctionReason]="timelogCorrectionReason()"
          (correctionReasonChange)="timelogCorrectionReason.set($event)"
          [correctionFile]="timelogCorrectionFile()"
          (correctionFileChange)="timelogCorrectionFile.set($event)"
          [canSubmit]="canSubmitTimelogCorrection()"
          [submitting]="submittingTimelogCorrection()"
          [today]="today"
          (submitRequest)="submitTimelogCorrectionRequest()"
          (closeSection)="setActiveSection('management')"
        />
      </div>
      }

      <!-- Solicitud de Uniforme Section -->
      @if (portalStore.activeSection() === 'uniform_request') {
      <div id="uniform_request" class="section-content">
        <pt-employee-portal-uniform-request
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
          (closeSection)="setActiveSection('management')"
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
      (closed)="closeConversation()"
      (sendReply)="sendReply()"
      (replyMessageChange)="portalStore.setReplyMessage($event)"
    />

    <!-- Dialog de Tutorial de Tiempo Compensatorio -->
    <pt-employee-portal-compensatory-tutorial-dialog
      [visible]="portalStore.compensatoryForm().showTutorial"
      (closed)="setShowTutorialDialog(false)"
    />

    <!-- Dialog para Detalles de Solicitud -->
    <pt-employee-portal-request-details-dialog
      [(visible)]="showRequestDetailsDialog"
      [request]="selectedRequestDetails()"
      [getStatusLabel]="getUnifiedStatusLabel.bind(this)"
      [getRequestTypeLabel]="getRequestTypeLabel.bind(this)"
      [getDocumentTypeLabel]="getDocumentTypeLabel.bind(this)"
      [getComplaintCategoryLabel]="getComplaintCategoryLabel.bind(this)"
      [formatHoursMinutes]="formatHoursMinutes.bind(this)"
      [formatDateWithTimeRange]="formatDateWithTimeRange.bind(this)"
      [hasTimeInfo]="hasTimeInfo.bind(this)"
      (viewResponse)="viewResponse($event)"
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
  private apiUrl = inject(ApiUrlService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private organizationService = inject(OrganizationService);
  private employeePortalApi = inject(EmployeePortalApiService);
  private navigationService = inject(EmployeePortalNavigationService);
  private cdr = inject(ChangeDetectorRef);
  public notificationsService = inject(NotificationsService);
  public timelogsService = inject(EmployeePortalTimelogsService);
  public requestsService = inject(EmployeePortalRequestsService);
  public conversationService = inject(EmployeePortalConversationService);
  public profileService = inject(EmployeePortalProfileService);
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

  // Verificar si el usuario es Branch Manager (Gerente de Tienda)
  public isBranchManager = computed(() => {
    const currentEmp = this.currentEmployee();
    const positionName = currentEmp?.position?.name || '';
    return positionName.toLowerCase().includes('gerente de tienda');
  });

  // Empleados de la sucursal del Branch Manager (para solicitudes en su nombre)
  public branchEmployees = computed(() => {
    const currentEmp = this.currentEmployee();
    if (!currentEmp || !this.isBranchManager()) {
      return [];
    }

    return this.employees
      .activeEmployees()
      .filter(
        (emp: Employee) =>
          emp.branch_id === currentEmp.branch_id &&
          emp.id !== currentEmp.id &&
          emp.is_active
      )
      .map((emp: Employee) => ({
        id: emp.id,
        short_name: `${emp.first_name} ${emp.father_name}`.trim(),
        name: `${emp.first_name} ${emp.father_name}`.trim(),
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
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

  public setVacationFile(value: File | null): void {
    this.portalStore.setVacationFile(value);
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
    console.log('[DEBUG] setCompensatoryDate:', value);
    this.portalStore.setCompensatoryDate(value);
  }

  public setCompensatoryTimeStart(value: Date | null): void {
    console.log('[DEBUG] setCompensatoryTimeStart:', value);
    this.portalStore.setCompensatoryTimeStart(value);
  }

  public setCompensatoryTimeEnd(value: Date | null): void {
    console.log('[DEBUG] setCompensatoryTimeEnd:', value);
    this.portalStore.setCompensatoryTimeEnd(value);
  }

  public setCompensatoryFile(value: File | null): void {
    this.portalStore.setCompensatoryFile(value);
  }

  public setSelectedEmployeeId(value: string | null): void {
    this.portalStore.setSelectedEmployeeId(value);
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
    // Fechas estables para template (evita que el DatePicker se “resetee” en cada change detection)
    this.today = startOfDay(new Date());
    this.minPastDate = addDays(this.today, -this.MAX_PAST_DAYS);

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
    });

    // Configurar getter de quejas en el servicio de conversación
    effect(() => {
      this.conversationService.setMyComplaintsGetter(() => this.myComplaints());
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

    // Limpiar detalles de solicitud cuando se cierra el diálogo
    effect(() => {
      if (!this.showRequestDetailsDialog()) {
        this.selectedRequestDetails.set(null);
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

  // Timelog Correction Form
  public timelogCorrectionDate = signal<Date | null>(null);
  public timelogCorrectionType = signal('');
  public timelogCorrectionReason = signal('');
  public timelogCorrectionFile = signal<File | null>(null);
  public submittingTimelogCorrection = signal(false);
  public canSubmitTimelogCorrection = computed(() => {
    return (
      this.timelogCorrectionDate() !== null &&
      this.timelogCorrectionType().trim() !== '' &&
      this.timelogCorrectionReason().trim() !== ''
    );
  });

  // Uniform Request Form
  public uniformItemType = signal('');
  public uniformSize = signal('');
  public uniformQuantity = signal(1);
  public uniformNotes = signal('');
  public submittingUniform = signal(false);
  public canSubmitUniform = computed(() => {
    return (
      this.uniformItemType().trim() !== '' &&
      this.uniformSize().trim() !== '' &&
      this.uniformQuantity() >= 1
    );
  });

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

  // Delegar complaints al servicio
  public complaintsApi = this.requestsService.complaintsApi;
  public myComplaints = this.requestsService.allComplaints;

  // Delegar lógica de conversación al servicio
  public selectedComplaint = this.conversationService.selectedComplaint;
  public complaintMessagesApi = this.conversationService.complaintMessagesApi;
  public conversationMessages = this.conversationService.conversationMessages;
  public unreadMessagesApi = this.conversationService.unreadMessagesApi;
  public unreadMessagesMap = this.conversationService.unreadMessagesMap;
  public unreadComplaintsCount = this.conversationService.unreadComplaintsCount;

  // Helper methods - delegados a utils y servicios
  public calculateWorkedHours = this.timelogsService.calculateWorkedHours;
  public calculateDays = calculateDays;
  public calculateHoursFromDates = calculateHoursFromDates;
  public getCompensatoryReasonFromNotes = getCompensatoryReasonFromNotes;
  public getCompensatoryQuantity = getCompensatoryQuantity;
  public formatHoursMinutes = formatHoursMinutes;
  public formatDateWithTimeRange = formatDateWithTimeRange;
  public hasTimeInfo = hasTimeInfo;

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

      const baseUrl = this.apiUrl.build('rest/v1/timeoffs');
      // La tabla timeoffs tiene múltiples relaciones con employees (employee_id, reviewed_by)
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

  public today!: Date;
  public minPastDate!: Date;

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
    return calculateCompensatoryAmount({
      type: this.portalStore.compensatoryForm().type,
      date: this.portalStore.compensatoryForm().compensatoryDate,
      timeStart: this.portalStore.compensatoryForm().compensatoryTimeStart,
      timeEnd: this.portalStore.compensatoryForm().compensatoryTimeEnd,
      startDate: this.portalStore.compensatoryForm().startDate,
      endDate: this.portalStore.compensatoryForm().endDate,
    });
  });

  // Validar si se puede enviar la solicitud
  public canSubmitCompensatory = computed(() => {
    return canSubmitCompensatory({
      type: this.portalStore.compensatoryForm().type,
      amount: this.compensatoryAmount(),
      date: this.portalStore.compensatoryForm().compensatoryDate,
      timeStart: this.portalStore.compensatoryForm().compensatoryTimeStart,
      timeEnd: this.portalStore.compensatoryForm().compensatoryTimeEnd,
      startDate: this.portalStore.compensatoryForm().startDate,
      endDate: this.portalStore.compensatoryForm().endDate,
    });
  });

  // Función helper para obtener destinatarios configurables de compensatorios
  private async getCompensatoryRecipients(): Promise<string[]> {
    console.log('[DEBUG] 🔍 Obteniendo destinatarios de compensatorios...');

    try {
      const url = this.apiUrl.build('rest/v1/settings', {
        select: 'value',
        key: 'eq.hr_email_recipients_compensatory',
        limit: 1,
      });

      console.log('[DEBUG] 📡 Consultando configuracion compensatorios:', url);

      const response = await this.http.get<any>(url).toPromise();
      console.log('[DEBUG] 📥 Respuesta API compensatorios:', response);

      const recipientsString =
        response?.[0]?.value ||
        'Verley@blackdogpanama.com,soporte2@blackdogpanama.com';
      console.log(
        '[DEBUG] 📋 String destinatarios compensatorios:',
        recipientsString
      );

      const recipients = recipientsString
        .split(',')
        .map((email: string) => email.trim())
        .filter((email: string) => email.length > 0);

      console.log(
        '[DEBUG] ✅ Destinatarios compensatorios procesados:',
        recipients
      );
      return recipients;
    } catch (error) {
      console.error(
        '[DEBUG] ❌ Error obteniendo destinatarios de compensatorios:',
        error
      );
      console.log('[DEBUG] 🔄 Usando valores por defecto para compensatorios');
      // Fallback a valores por defecto
      return ['Verley@blackdogpanama.com', 'soporte2@blackdogpanama.com'];
    }
  }

  // Función para enviar solicitud de tiempo compensatorio
  public async submitCompensatoryRequest(): Promise<void> {
    const form = this.portalStore.compensatoryForm();
    const manualDates = form.manualOvertimeDates;

    console.log('[DEBUG Component] ===== FORMULARIO COMPENSATORIO =====');
    console.log('[DEBUG Component] Tipo:', form.type);
    console.log(
      '[DEBUG Component] Fecha compensatorio:',
      form.compensatoryDate
    );
    console.log('[DEBUG Component] Hora inicio:', form.compensatoryTimeStart);
    console.log('[DEBUG Component] Hora fin:', form.compensatoryTimeEnd);
    console.log('[DEBUG Component] Fecha inicio período:', form.startDate);
    console.log('[DEBUG Component] Fecha fin período:', form.endDate);
    console.log('[DEBUG Component] Cantidad total:', this.compensatoryAmount());
    console.log(
      '[DEBUG Component] Puede enviar:',
      this.canSubmitCompensatory()
    );
    console.log('[DEBUG Component] Fechas manuales:', manualDates);
    console.log('[DEBUG Component] Archivo:', form.compensatoryFile);
    console.log('[DEBUG Component] ==============================');

    if (!this.canSubmitCompensatory()) {
      console.log('[DEBUG Component] ❌ NO PUEDE ENVIAR - Validación fallida');
      this.messageService.add({
        severity: 'error',
        summary: 'Campos Incompletos',
        detail:
          'Por favor completa todos los campos requeridos antes de enviar.',
      });
      return;
    }

    await uploadCompensatory({
      http: this.http,
      apiUrl: this.apiUrl,
      messageService: this.messageService,
      currentEmployee: () => this.currentEmployee(),
      formState: {
        startDate:
          this.portalStore.compensatoryForm().type === 'hours'
            ? this.portalStore.compensatoryForm().compensatoryDate
            : this.portalStore.compensatoryForm().startDate,
        endDate:
          this.portalStore.compensatoryForm().type === 'hours'
            ? this.portalStore.compensatoryForm().compensatoryDate
            : this.portalStore.compensatoryForm().endDate,
        reason: this.portalStore.compensatoryForm().reason,
        type: this.portalStore.compensatoryForm().type,
        compensatoryDate: this.portalStore.compensatoryForm().compensatoryDate,
        compensatoryTimeStart:
          this.portalStore.compensatoryForm().compensatoryTimeStart,
        compensatoryTimeEnd:
          this.portalStore.compensatoryForm().compensatoryTimeEnd,
        selectedOvertimeDays:
          this.portalStore.compensatoryForm().selectedOvertimeDays,
        manualOvertimeDates: manualDates,
        compensatoryFile: this.portalStore.compensatoryForm().compensatoryFile,
      },
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
        this.setCompensatoryFile(null);
        this.setSubmittingCompensatory(false);
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
      setSubmitting: (value: boolean) => this.setSubmittingCompensatory(false),
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
      http: this.http,
      apiUrl: this.apiUrl,
      store: this.portalStore,
      api: this.employeePortalApi,
      messageService: this.messageService,
      currentEmployee: () => this.currentEmployee(),
      formState: {
        startDate: this.portalStore.vacationForm().startDate,
        endDate: this.portalStore.vacationForm().endDate,
        reason: this.portalStore.vacationForm().reason,
        selectedFile: this.portalStore.vacationForm().selectedFile,
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

  // Delegar lógica de perfil al servicio
  public editMode = this.profileService.editMode;
  public editEmail = this.profileService.editEmail;
  public editWorkEmail = this.profileService.editWorkEmail;
  public editPhone = this.profileService.editPhone;
  public editAddress = this.profileService.editAddress;
  public savingPersonalData = this.profileService.savingPersonalData;
  public toggleEditMode = () => this.profileService.toggleEditMode();
  public cancelEdit = () => this.profileService.cancelEdit();
  public savePersonalData = () => this.profileService.savePersonalData();

  public async uploadDisability(): Promise<void> {
    await uploadDisability({
      http: this.http,
      apiUrl: this.apiUrl,
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
      disabilityRecipients: () => this.getDisabilityRecipients(),
    });
  }

  // Función helper para obtener destinatarios configurables de incapacidades
  private async getDisabilityRecipients(): Promise<string[]> {
    console.log('[DEBUG] 🔍 Obteniendo destinatarios de incapacidades...');

    try {
      const url = this.apiUrl.build('rest/v1/settings', {
        select: 'value',
        key: 'eq.hr_email_recipients_disabilities',
        limit: 1,
      });

      console.log('[DEBUG] 📡 Consultando configuracion incapacidades:', url);

      const response = await this.http.get<any>(url).toPromise();
      console.log('[DEBUG] 📥 Respuesta API incapacidades:', response);

      const recipientsString =
        response?.[0]?.value || 'Verley@blackdogpanama.com';
      console.log(
        '[DEBUG] 📋 String destinatarios incapacidades:',
        recipientsString
      );

      const recipients = recipientsString
        .split(',')
        .map((email: string) => email.trim())
        .filter((email: string) => email.length > 0);

      console.log(
        '[DEBUG] ✅ Destinatarios incapacidades procesados:',
        recipients
      );
      return recipients;
    } catch (error) {
      console.error(
        '[DEBUG] ❌ Error obteniendo destinatarios de incapacidades:',
        error
      );
      console.log('[DEBUG] 🔄 Usando valores por defecto para incapacidades');
      return ['Verley@blackdogpanama.com'];
    }
  }

  /**
   * Submit a timelog correction request
   */
  public async submitTimelogCorrectionRequest(): Promise<void> {
    if (!this.canSubmitTimelogCorrection()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos Requeridos',
        detail: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    this.submittingTimelogCorrection.set(true);

    try {
      // Create the request record
      const requestData = {
        employee_id: this.currentEmployee()!.id,
        request_type: 'timelog_correction',
        request_date: format(this.timelogCorrectionDate()!, 'yyyy-MM-dd'),
        correction_type: this.timelogCorrectionType(),
        reason: this.timelogCorrectionReason(),
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const url = this.apiUrl.build('rest/v1/employee_requests');
      await firstValueFrom(this.http.post(url, requestData));

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail:
          'Tu solicitud de corrección de marcación ha sido enviada para revisión.',
      });

      // Reset form
      this.timelogCorrectionDate.set(null);
      this.timelogCorrectionType.set('');
      this.timelogCorrectionReason.set('');
      this.timelogCorrectionFile.set(null);

      // Navigate back to management section
      this.setActiveSection('management');
    } catch (error: any) {
      console.error('Error submitting timelog correction:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          error?.error?.message ||
          'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
      });
    } finally {
      this.submittingTimelogCorrection.set(false);
    }
  }

  /**
   * Submit a uniform request
   */
  public async submitUniformRequest(): Promise<void> {
    if (!this.canSubmitUniform()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos Requeridos',
        detail: 'Por favor completa tipo de prenda, talla y cantidad',
      });
      return;
    }

    this.submittingUniform.set(true);

    try {
      // Create the request record
      const requestData = {
        employee_id: this.currentEmployee()!.id,
        request_type: 'uniform_request',
        item_type: this.uniformItemType(),
        size: this.uniformSize(),
        quantity: this.uniformQuantity(),
        notes: this.uniformNotes() || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const url = this.apiUrl.build('rest/v1/employee_requests');
      await firstValueFrom(this.http.post(url, requestData));

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: 'Tu solicitud de uniforme ha sido enviada para revisión.',
      });

      // Reset form
      this.uniformItemType.set('');
      this.uniformSize.set('');
      this.uniformQuantity.set(1);
      this.uniformNotes.set('');

      // Navigate back to management section
      this.setActiveSection('management');
    } catch (error: any) {
      console.error('Error submitting uniform request:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          error?.error?.message ||
          'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
      });
    } finally {
      this.submittingUniform.set(false);
    }
  }

  // Función helper para obtener destinatarios configurables de documentos
  private async getDocumentRecipients(): Promise<string[]> {
    console.log('[DEBUG] 🔍 Obteniendo destinatarios de documentos...');

    try {
      const url = this.apiUrl.build('rest/v1/settings', {
        select: 'value',
        key: 'eq.hr_email_recipients_documents',
        limit: 1,
      });

      console.log('[DEBUG] 📡 Consultando configuracion documentos:', url);

      const response = await this.http.get<any>(url).toPromise();
      console.log('[DEBUG] 📥 Respuesta API documentos:', response);

      const recipientsString =
        response?.[0]?.value || 'Verley@blackdogpanama.com';
      console.log(
        '[DEBUG] 📋 String destinatarios documentos:',
        recipientsString
      );

      const recipients = recipientsString
        .split(',')
        .map((email: string) => email.trim())
        .filter((email: string) => email.length > 0);

      console.log(
        '[DEBUG] ✅ Destinatarios documentos procesados:',
        recipients
      );
      return recipients;
    } catch (error) {
      console.error(
        '[DEBUG] ❌ Error obteniendo destinatarios de documentos:',
        error
      );
      console.log('[DEBUG] 🔄 Usando valores por defecto para documentos');
      return ['Verley@blackdogpanama.com'];
    }
  }

  public async submitDocumentRequest(): Promise<void> {
    await submitDocumentRequest({
      http: this.http,
      apiUrl: this.apiUrl,
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
      documentRecipients: () => this.getDocumentRecipients(),
    });
  }

  public async submitComplaint(): Promise<void> {
    submitComplaint({
      http: this.http,
      apiUrl: this.apiUrl,
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
        fullUrl = `${this.apiUrl.baseUrl}/storage/v1/object/public/${path}`;
      } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Si es una ruta relativa sin prefijo, asumir que es del bucket disabilities
        const path = url.startsWith('/') ? url.slice(1) : url;
        fullUrl = `${this.apiUrl.baseUrl}/storage/v1/object/public/disabilities/${path}`;
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
    // Forzar detección de cambios para OnPush
    this.cdr.markForCheck();
  }

  public viewResponse(complaint: any): void {
    this.conversationService.selectedComplaint.set(complaint);
    this.portalStore.openConversation(complaint.id);
    this.portalStore.setReplyMessage('');
    // Configurar getter de quejas en el servicio
    this.conversationService.setMyComplaintsGetter(() => this.myComplaints());
    // Recargar mensajes cuando se abre la conversación
    this.complaintMessagesApi.reload();
    // Marcar mensajes de HR como leídos cuando el empleado abre la conversación
    this.conversationService.markMessagesAsRead(complaint).then(() => {
      this.complaintsApi.reload();
    });
  }

  public closeConversation(): void {
    this.portalStore.closeConversation();
    this.conversationService.selectedComplaint.set(null);
    // Recargar quejas para actualizar contadores
    this.complaintsApi.reload();
  }

  public async sendReply(): Promise<void> {
    const complaint = this.selectedComplaint();
    if (!complaint || !this.portalStore.replyMessage().trim()) return;

    this.portalStore.setSendingReply(true);
    await this.conversationService.sendReply(
      this.portalStore.replyMessage(),
      complaint
    );
    this.portalStore.setReplyMessage('');
    this.complaintsApi.reload();
    this.portalStore.setSendingReply(false);
  }

  public hasUnreadMessages(complaint: any): boolean {
    return this.conversationService.hasUnreadMessages(
      complaint,
      this.selectedComplaint()?.id || null
    );
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
