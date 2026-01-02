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
  addDays,
  differenceInDays,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfToday,
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
import { v4 } from 'uuid';
import { CalendarComponent, CalendarMarkerData } from '../calendar.component';
import { TimeLogEnum, TimeOff } from '../models';
import { EmployeePortalNavigationService } from '../services/employee-portal-navigation.service';
import { NotificationsService } from '../services/notifications.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeePortalStore } from '../stores/employee-portal.store';
import { EmployeesStore } from '../stores/employees.store';
import { EmployeePortalCompensatoryComponent } from './components/employee-portal-compensatory.component';
import { EmployeePortalComplaintsComponent } from './components/employee-portal-complaints.component';
import { EmployeePortalDashboardComponent } from './components/employee-portal-dashboard.component';
import { EmployeePortalDisabilitiesComponent } from './components/employee-portal-disabilities.component';
import { EmployeePortalDocumentsComponent } from './components/employee-portal-documents.component';
import { EmployeePortalLatesComponent } from './components/employee-portal-lates.component';
import { EmployeePortalManagementNavigationComponent } from './components/employee-portal-management-navigation.component';
import { EmployeePortalTimelogsComponent } from './components/employee-portal-timelogs.component';
import { EmployeePortalVacationsComponent } from './components/employee-portal-vacations.component';
import { EmployeePortalApiService } from './services/employee-portal-api.service';

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
  ],
  providers: [MessageService, EmployeePortalStore],
  template: `
    <div class="portal-content">
      <!-- Dashboard Section -->
      @if (activeSection() === 'dashboard') {
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
            [showSalary]="showSalary()"
            (toggleSalary)="toggleSalary()"
          />
        </div>
        }
      </div>
      }

      <!-- Gestiones Section -->
      @if (activeSection() === 'management' || activeSection() === 'gestiones') {
      <div id="management" class="section-content">
        <p-card>
          <ng-template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-briefcase text-amber-400"></i>
              <span>Gestiones</span>
            </div>
          </ng-template>
          <ng-template #subtitle
            >Accede a todos los formularios y solicitudes disponibles</ng-template
          >
          <div class="flex flex-col gap-6">
            <pt-employee-portal-management-navigation
              [activeSection]="activeSection()"
              (sectionChange)="setActiveSection($event)"
            />
          </div>

        </p-card>
      </div>
      }

      <!-- Mis Marcaciones Section -->
      @if (activeSection() === 'timelogs') {
      <div id="timelogs" class="section-content">
        <pt-employee-portal-timelogs
          [isLoading]="monthTimelogsApi.isLoading()"
          [timelogViewMode]="timelogViewMode()"
          (viewModeChange)="timelogViewMode.set($event)"
          [monthTimelogs]="monthTimelogs()"
          [timelogMarkers]="timelogMarkers()"
          [calendarMonth]="calendarMonth()"
          (monthChange)="onCalendarMonthChange($event)"
          [calculateWorkedHours]="calculateWorkedHours.bind(this)"
        />
      </div>
      }

      <!-- Mi Perfil Section -->
      @if (activeSection() === 'profile') {
      <div id="profile" class="section-content">
        @if (currentEmployee()) {
        <div class="space-y-4">
          <!-- Header Card -->
          <p-card class="shadow-lg border border-neutral-700/50">
            <ng-template #title>
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center"
                  >
                    <i class="pi pi-user text-white text-xl"></i>
                  </div>
                  <div>
                    <h3 class="text-xl font-bold text-white m-0">
                      {{ currentEmployee()?.first_name }}
                      {{ currentEmployee()?.father_name }}
                    </h3>
                    <p class="text-sm text-gray-400 m-0 mt-1">
                      {{ currentEmployee()?.position?.name }}
                    </p>
                  </div>
                </div>
                @if (!editMode()) {
                <p-button
                  label="Editar"
                  icon="pi pi-pencil"
                  (onClick)="toggleEditMode()"
                  rounded
                  severity="secondary"
                  outlined
                />
                } @else {
                <div class="flex gap-2">
                  <p-button
                    label="Cancelar"
                    severity="secondary"
                    outlined
                    rounded
                    (onClick)="cancelEdit()"
                  />
                  <p-button
                    label="Guardar cambios"
                    icon="pi pi-save"
                    rounded
                    [loading]="savingPersonalData()"
                    (onClick)="savePersonalData()"
                  />
                </div>
                }
              </div>
            </ng-template>
          </p-card>

          <!-- Información Básica Card -->
          <p-card class="shadow-lg border border-neutral-700/50">
            <ng-template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-id-card text-lg text-amber-400"></i>
                <h4 class="text-base font-bold text-white m-0">
                  Información Básica
                </h4>
              </div>
            </ng-template>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <dt
                  class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                >
                  Código de Empleado
                </dt>
                <dd class="text-sm text-gray-200 font-medium">
                  {{ currentEmployee()?.employee_number || '-' }}
                </dd>
              </div>
              <div
                class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <dt
                  class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                >
                  Fecha de Ingreso
                </dt>
                <dd class="text-sm text-gray-200 font-medium">
                  {{ currentEmployee()?.start_date | date : 'mediumDate' }}
                </dd>
              </div>
              <div
                class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <dt
                  class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                >
                  Sucursal
                </dt>
                <dd class="text-sm text-gray-200 font-medium">
                  {{ currentEmployee()?.branch?.name || '-' }}
                </dd>
              </div>
              <div
                class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <dt
                  class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                >
                  Departamento
                </dt>
                <dd class="text-sm text-gray-200 font-medium">
                  {{ currentEmployee()?.department?.name || '-' }}
                </dd>
              </div>
            </div>
          </p-card>

          <!-- Información de Contacto Card -->
          <p-card class="shadow-lg border border-neutral-700/50">
            <ng-template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-phone text-lg text-amber-400"></i>
                <h4 class="text-base font-bold text-white m-0">
                  Información de Contacto
                </h4>
              </div>
            </ng-template>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <dt
                  class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                >
                  Email Personal
                </dt>
                <dd class="text-sm text-gray-200 font-medium">
                  @if (!editMode()) {
                    {{ currentEmployee()?.email || '-' }}
                  } @else {
                    <input
                      pInputText
                      type="email"
                      [ngModel]="editEmail()"
                      (ngModelChange)="editEmail.set($event)"
                      placeholder="Correo personal"
                      class="w-full"
                    />
                  }
                </dd>
              </div>
              <div
                class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <dt
                  class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                >
                  Email Laboral
                </dt>
                <dd class="text-sm text-gray-200 font-medium">
                  @if (!editMode()) {
                    {{ currentEmployee()?.work_email || '-' }}
                  } @else {
                    <input
                      pInputText
                      type="email"
                      [ngModel]="editWorkEmail()"
                      (ngModelChange)="editWorkEmail.set($event)"
                      placeholder="Correo corporativo"
                      class="w-full"
                    />
                  }
                </dd>
              </div>
              <div
                class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <dt
                  class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                >
                  Teléfono
                </dt>
                <dd class="text-sm text-gray-200 font-medium">
                  @if (!editMode()) {
                    {{ currentEmployee()?.phone_number || '-' }}
                  } @else {
                    <input
                      pInputText
                      type="text"
                      [ngModel]="editPhone()"
                      (ngModelChange)="editPhone.set($event)"
                      placeholder="Número de teléfono"
                      class="w-full"
                    />
                  }
                </dd>
              </div>
              <div
                class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50 md:col-span-2"
              >
                <dt
                  class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                >
                  Dirección
                </dt>
                <dd class="text-sm text-gray-200 font-medium">
                  @if (!editMode()) {
                    {{ currentEmployee()?.address || '-' }}
                  } @else {
                    <textarea
                      pInputTextarea
                      [ngModel]="editAddress()"
                      (ngModelChange)="editAddress.set($event)"
                      rows="3"
                      placeholder="Dirección"
                      class="w-full"
                    ></textarea>
                  }
                </dd>
              </div>
            </div>
          </p-card>
        } @else {
        <div class="flex justify-center items-center h-64">
          <p class="text-gray-400 text-lg">Cargando información del empleado...</p>
        </div>
        }
      </div>
      }

      <!-- Mis Tardanzas Section -->
      @if (activeSection() === 'lates') {
      <div id="lates" class="section-content">
        <pt-employee-portal-lates [lates]="myLates()" />
      </div>
      }

      <!-- Incapacidades Section -->
      @if (activeSection() === 'disabilities') {
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
      @if (activeSection() === 'documents') {
      <div id="documents" class="section-content">
        <pt-employee-portal-documents
          [documentTypeOptions]="documentTypeOptions"
          [documentType]="documentType()"
          (documentTypeChange)="setDocumentType($event)"
          [customDocumentType]="customDocumentType()"
          (customDocumentTypeChange)="setCustomDocumentType($event)"
          [documentReason]="documentReason()"
          (documentReasonChange)="setDocumentReason($event)"
          [documentRequiredDate]="documentRequiredDate()"
          (documentRequiredDateChange)="setDocumentRequiredDate($event)"
          [today]="today"
          [canSubmit]="canSubmitDocument()"
          [submitting]="submittingDocument()"
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
      @if (activeSection() === 'complaints') {
      <div id="complaints" class="section-content">
        <pt-employee-portal-complaints
          [complaintCategory]="complaintCategory()"
          (complaintCategoryChange)="setComplaintCategory($event)"
          [complaintText]="complaintText()"
          (complaintTextChange)="setComplaintText($event)"
          [allowContact]="allowContact()"
          (allowContactChange)="setAllowContact($event)"
          [contactMethod]="contactMethod()"
          (contactMethodChange)="setContactMethod($event)"
          [submitting]="submittingComplaint()"
          [canSubmit]="canSubmitComplaint()"
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
      @if (activeSection() === 'vacations') {
      <div id="vacations" class="section-content">
        <pt-employee-portal-vacations
          [minVacationDate]="minVacationDate"
          [maxVacationDate]="maxVacationDate()"
          [vacationStartDate]="vacationStartDate()"
          (vacationStartDateChange)="setVacationStartDate($event)"
          [vacationEndDate]="vacationEndDate()"
          (vacationEndDateChange)="setVacationEndDate($event)"
          [vacationReason]="vacationReason()"
          (vacationReasonChange)="setVacationReason($event)"
          [submitting]="submittingVacation()"
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
      @if (activeSection() === 'compensatory') {
      <div id="compensatory" class="section-content">
        <pt-employee-portal-compensatory
          [compensatoryType]="compensatoryType()"
          (compensatoryTypeChange)="setCompensatoryType($event)"
          [compensatoryDate]="compensatoryDate()"
          (compensatoryDateChange)="setCompensatoryDate($event)"
          [compensatoryTimeStart]="compensatoryTimeStart()"
          (compensatoryTimeStartChange)="setCompensatoryTimeStart($event)"
          [compensatoryTimeEnd]="compensatoryTimeEnd()"
          (compensatoryTimeEndChange)="setCompensatoryTimeEnd($event)"
          [compensatoryStartDate]="compensatoryStartDate()"
          (compensatoryStartDateChange)="setCompensatoryStartDate($event)"
          [compensatoryEndDate]="compensatoryEndDate()"
          (compensatoryEndDateChange)="setCompensatoryEndDate($event)"
          [compensatoryReason]="compensatoryReason()"
          (compensatoryReasonChange)="setCompensatoryReason($event)"
          [manualOvertimeDates]="manualOvertimeDates()"
          [newOvertimeDate]="newOvertimeDate()"
          (newOvertimeDateChange)="setNewOvertimeDate($event)"
          (addManualDate)="addManualOvertimeDate()"
          (removeManualDate)="removeManualOvertimeDate($event)"
          [compensatoryAmount]="compensatoryAmount()"
          [canSubmit]="canSubmitCompensatory()"
          [submitting]="submittingCompensatory()"
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
      @if (activeSection() === 'my-requests') {
      <div id="my-requests" class="section-content">
        <p-card>
          <ng-template #title>
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <i class="pi pi-list text-cyan-400"></i>
                <span>Mis Solicitudes</span>
              </div>
              <p-button
                label="Nueva Solicitud"
                icon="pi pi-plus"
                (click)="setActiveSection('management')"
              />
            </div>
          </ng-template>
          <ng-template #subtitle
            >Visualiza todas tus solicitudes</ng-template
          >
          
          <!-- Filtros y Ordenamiento (Desplegable) -->
          <div class="mb-6 bg-neutral-800/50 rounded-lg border border-neutral-700/50 overflow-hidden">
            <!-- Header del panel de filtros -->
            <button
              type="button"
              (click)="filtersExpanded.set(!filtersExpanded())"
              class="w-full flex items-center justify-between p-4 hover:bg-neutral-700/30 transition-colors"
            >
              <div class="flex items-center gap-3">
                <i class="pi pi-filter text-cyan-400"></i>
                <span class="text-lg font-semibold text-white">Filtros y Ordenamiento</span>
                @if (canClearAllRequestsFilters()) {
                <span class="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-semibold rounded-full">
                  {{ getActiveFiltersCount() }} activo(s)
                </span>
                }
              </div>
              <i 
                class="pi transition-transform duration-300"
                [class.pi-chevron-down]="!filtersExpanded()"
                [class.pi-chevron-up]="filtersExpanded()"
                [class.text-gray-400]="true"
              ></i>
            </button>
            
            <!-- Contenido desplegable -->
            @if (filtersExpanded()) {
            <div class="px-4 pb-4 border-t border-neutral-700/50 pt-4">
              <div class="flex flex-col gap-4">
                <!-- Primera fila: Filtros principales -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Búsqueda por texto -->
                <div class="lg:col-span-2">
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    <i class="pi pi-search mr-2"></i>Buscar
                  </label>
                  <input
                    pInputText
                    type="text"
                    [(ngModel)]="allRequestsFilterSearch"
                    placeholder="Buscar en títulos o descripciones..."
                    class="w-full"
                  />
                </div>

                <!-- Filtro por Estado -->
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    <i class="pi pi-filter mr-2"></i>Estado
                  </label>
                  <p-select
                    [options]="allRequestsStatusOptions"
                    [(ngModel)]="allRequestsFilterStatus"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Todos los estados"
                    appendTo="body"
                    class="w-full"
                  />
                </div>

                <!-- Filtro por Tipo -->
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    <i class="pi pi-tag mr-2"></i>Tipo de Solicitud
                  </label>
                  <p-select
                    [options]="allRequestsTypeOptions"
                    [(ngModel)]="allRequestsFilterType"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Todos los tipos"
                    appendTo="body"
                    class="w-full"
                  />
                </div>
              </div>

              <!-- Segunda fila: Rango de fechas y ordenamiento -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Rango de fechas -->
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    <i class="pi pi-calendar mr-2"></i>Rango de fechas
                  </label>
                  <p-datepicker
                    [(ngModel)]="allRequestsFilterDateRange"
                    selectionMode="range"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Seleccionar rango"
                    appendTo="body"
                    [showClear]="true"
                    class="w-full"
                  />
                </div>

                <!-- Ordenamiento -->
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    <i class="pi pi-sort mr-2"></i>Ordenar por
                  </label>
                  <p-select
                    [options]="allRequestsSortOptions"
                    [(ngModel)]="selectedSortOption"
                    (ngModelChange)="onAllRequestsSortChange($event)"
                    optionLabel="label"
                    placeholder="Seleccionar orden"
                    appendTo="body"
                    class="w-full"
                  />
                </div>
              </div>

                <!-- Tercera fila: Botones de acción y contador -->
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-neutral-700/50">
                  <div class="flex items-center gap-2 text-sm text-gray-400">
                    <i class="pi pi-info-circle"></i>
                    <span>
                      Mostrando 
                      <strong class="text-white">{{ filteredAllRequests().length }}</strong>
                      de 
                      <strong class="text-white">{{ allRequestsUnified().length }}</strong>
                      solicitudes
                    </span>
                  </div>
                  <p-button
                    label="Limpiar Filtros"
                    icon="pi pi-filter-slash"
                    severity="secondary"
                    [outlined]="true"
                    [rounded]="true"
                    (onClick)="clearAllRequestsFilters()"
                    [disabled]="!canClearAllRequestsFilters()"
                  />
                </div>
              </div>
            </div>
            }
          </div>
          
          <!-- Contador de resultados cuando los filtros están colapsados -->
          @if (!filtersExpanded() && canClearAllRequestsFilters()) {
          <div class="mb-4 p-3 bg-cyan-500/10 border border-cyan-400/30 rounded-lg flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-cyan-300">
              <i class="pi pi-info-circle"></i>
              <span>
                Mostrando 
                <strong class="text-white">{{ filteredAllRequests().length }}</strong>
                de 
                <strong class="text-white">{{ allRequestsUnified().length }}</strong>
                solicitudes
              </span>
            </div>
            <p-button
              label="Limpiar Filtros"
              icon="pi pi-filter-slash"
              severity="secondary"
              [text]="true"
              [rounded]="true"
              (onClick)="clearAllRequestsFilters()"
              size="small"
            />
          </div>
          }
          
          @if (compensatoryTimeoffsApi.isLoading() || disabilitiesApi.isLoading() || documentRequestsApi.isLoading() || complaintsApi.isLoading()) {
          <div class="flex justify-center items-center py-12">
            <div class="flex flex-col items-center gap-3">
              <i class="pi pi-spin pi-spinner text-4xl text-cyan-400"></i>
              <p class="text-gray-400">Cargando tus solicitudes...</p>
            </div>
          </div>
          } @else if (allRequestsUnified().length === 0) {
          <div class="flex flex-col items-center justify-center py-16 px-4">
            <div class="w-24 h-24 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
              <i class="pi pi-inbox text-5xl text-cyan-400/50"></i>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">No tienes solicitudes aún</h3>
            <p class="text-gray-400 text-center max-w-md mb-6">
              Aún no has enviado ninguna solicitud. 
              Ve a "Gestiones" para crear una nueva solicitud.
            </p>
            <p-button
              label="Ir a Gestiones"
              icon="pi pi-briefcase"
              (click)="setActiveSection('management')"
              severity="success"
              [rounded]="true"
            />
          </div>
          } @else if (filteredAllRequests().length === 0) {
          <div class="flex flex-col items-center justify-center py-16 px-4">
            <div class="w-24 h-24 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
              <i class="pi pi-filter-slash text-5xl text-yellow-400/50"></i>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">No se encontraron resultados</h3>
            <p class="text-gray-400 text-center max-w-md mb-6">
              No hay solicitudes que coincidan con los filtros seleccionados. 
              Intenta ajustar los filtros o limpiarlos para ver todas tus solicitudes.
            </p>
            <p-button
              label="Limpiar Filtros"
              icon="pi pi-filter-slash"
              (click)="clearAllRequestsFilters()"
              severity="secondary"
              [rounded]="true"
            />
          </div>
          } @else {
          <div class="space-y-4">
            @for (request of filteredAllRequests(); track request.id) {
              @let data = request.originalData;
            <div
              class="bg-gradient-to-r from-neutral-800 to-neutral-800/80 border rounded-xl p-5 hover:shadow-lg transition-all duration-300 cursor-pointer"
              [class.border-yellow-500/30]="request.status === 'pending'"
              [class.border-green-500/30]="request.status === 'approved'"
              [class.border-red-500/30]="request.status === 'rejected'"
              [class.border-cyan-500/30]="request.status === 'in_registry'"
              [class.hover:border-cyan-400/50]="true"
              (click)="viewRequestDetails(request)"
            >
              <div class="flex flex-col md:flex-row md:items-start gap-4">
                <!-- Icono y Estado -->
                <div class="flex-shrink-0">
                  <div
                    class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
                    [class.bg-yellow-500/20]="request.status === 'pending'"
                    [class.bg-green-500/20]="request.status === 'approved'"
                    [class.bg-red-500/20]="request.status === 'rejected'"
                    [class.bg-cyan-500/20]="request.status === 'in_registry'"
                  >
                    @if (request.request_type === 'compensatory') {
                      <i class="pi pi-clock text-cyan-400"></i>
                    } @else if (request.request_type === 'disability') {
                      <i class="pi pi-file-plus text-blue-400"></i>
                    } @else if (request.request_type === 'document') {
                      <i class="pi pi-file-edit text-green-400"></i>
                    } @else if (request.request_type === 'complaint') {
                      <i class="pi pi-comments text-yellow-400"></i>
                    } @else {
                      <i class="pi pi-calendar-plus text-purple-400"></i>
                    }
                  </div>
                </div>

                <!-- Contenido Principal -->
                <div class="flex-1 min-w-0">
                  <!-- Header con Estado -->
                  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div class="flex items-center gap-3">
                      <div>
                        <h3 class="text-lg font-semibold text-white mb-1">
                          {{ request.title }}
                        </h3>
                        <p class="text-sm text-gray-400">
                          Solicitado el {{ request.created_at | date : 'dd/MM/yyyy' }} a las {{ request.created_at | date : 'HH:mm' }}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span
                        class="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                        [class.bg-yellow-500/20]="request.status === 'pending'"
                        [class.text-yellow-300]="request.status === 'pending'"
                        [class.bg-green-500/20]="request.status === 'approved'"
                        [class.text-green-300]="request.status === 'approved'"
                        [class.bg-red-500/20]="request.status === 'rejected'"
                        [class.text-red-300]="request.status === 'rejected'"
                        [class.bg-cyan-500/20]="request.status === 'in_registry'"
                        [class.text-cyan-300]="request.status === 'in_registry'"
                      >
                        @if (request.status === 'approved') {
                          <i class="pi pi-check-circle"></i>
                        } @else if (request.status === 'rejected') {
                          <i class="pi pi-times-circle"></i>
                        } @else if (request.status === 'in_registry') {
                          <i class="pi pi-clock"></i>
                        } @else {
                          <i class="pi pi-hourglass"></i>
                        }
                        {{ getUnifiedStatusLabel(request.status) }}
                      </span>
                    </div>
                  </div>

                  <!-- Información específica según tipo -->
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <!-- Tiempo Compensatorio -->
                    @if (request.request_type === 'compensatory') {
                      <!-- Fechas -->
                      @let quantityForPeriodList = getCompensatoryQuantity(data);
                      <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                        <div class="flex items-center gap-2 mb-2">
                          <i class="pi pi-calendar text-cyan-400"></i>
                          <span class="text-xs text-gray-400 font-medium">
                            @if (quantityForPeriodList.isDays) {
                              Período
                            } @else {
                              Fecha y Horas
                            }
                          </span>
                        </div>
                        @if (quantityForPeriodList.isDays) {
                          <p class="text-white font-semibold">
                            {{ data.date_from | date : 'dd/MM/yyyy' }}
                          </p>
                          @if (data.date_from !== data.date_to) {
                            <p class="text-gray-400 text-sm mt-1">
                              hasta {{ data.date_to | date : 'dd/MM/yyyy' }}
                            </p>
                          }
                        } @else {
                          @if (data.date_from) {
                            <p class="text-white font-semibold">
                              {{ data.date_from | date : 'dd/MM/yyyy' }}
                            </p>
                            @if (data.date_from && hasTimeInfo(data.date_from)) {
                              <p class="text-gray-400 text-sm mt-1">
                                {{ formatDateWithTimeRange(data.date_from, data.date_to) }}
                              </p>
                            } @else {
                              <p class="text-gray-400 text-sm mt-1">
                                {{ formatHoursMinutes(quantityForPeriodList.value) }}
                              </p>
                            }
                          } @else {
                            <p class="text-gray-400 text-sm">Sin fecha específica</p>
                          }
                        }
                      </div>

                      <!-- Cantidad -->
                      <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                        <div class="flex items-center gap-2 mb-2">
                          @if (data.compensatory_type === 'days') {
                            <i class="pi pi-calendar text-cyan-400"></i>
                          } @else {
                            <i class="pi pi-clock text-cyan-400"></i>
                          }
                          <span class="text-xs text-gray-400 font-medium">Cantidad</span>
                        </div>
                        <p class="text-white font-semibold text-lg">
                          @let quantity = getCompensatoryQuantity(data);
                          @if (quantity.isDays) {
                            {{ quantity.value }} día(s)
                            <span class="text-gray-400 text-sm font-normal block mt-1">
                              ({{ quantity.value * 8 }} horas)
                            </span>
                          } @else {
                            {{ formatHoursMinutes(quantity.value) }}
                          }
                        </p>
                      </div>

                      <!-- Tipo -->
                      <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                        <div class="flex items-center gap-2 mb-2">
                          <i class="pi pi-tag text-cyan-400"></i>
                          <span class="text-xs text-gray-400 font-medium">Tipo</span>
                        </div>
                        <p class="text-white font-semibold">
                          @if (data.compensatory_type === 'days') {
                            Días
                          } @else {
                            Horas
                          }
                        </p>
                      </div>
                    }

                    <!-- Incapacidad -->
                    @if (request.request_type === 'disability') {
                      <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                        <div class="flex items-center gap-2 mb-2">
                          <i class="pi pi-calendar text-blue-400"></i>
                          <span class="text-xs text-gray-400 font-medium">Período</span>
                        </div>
                        <p class="text-white font-semibold">
                          {{ data.start_date | date : 'dd/MM/yyyy' }}
                          @if (data.end_date) {
                            <span class="text-gray-400 text-sm block mt-1">
                              hasta {{ data.end_date | date : 'dd/MM/yyyy' }}
                            </span>
                          }
                        </p>
                      </div>
                    }

                    <!-- Documento -->
                    @if (request.request_type === 'document') {
                      <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                        <div class="flex items-center gap-2 mb-2">
                          <i class="pi pi-file text-green-400"></i>
                          <span class="text-xs text-gray-400 font-medium">Tipo de Documento</span>
                        </div>
                        <p class="text-white font-semibold">
                          {{ getDocumentTypeLabel(data.document_type) }}
                        </p>
                      </div>
                      @if (data.required_date) {
                      <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                        <div class="flex items-center gap-2 mb-2">
                          <i class="pi pi-calendar text-green-400"></i>
                          <span class="text-xs text-gray-400 font-medium">Fecha Requerida</span>
                        </div>
                        <p class="text-white font-semibold">
                          {{ data.required_date | date : 'dd/MM/yyyy' }}
                        </p>
                      </div>
                      }
                    }

                    <!-- Queja -->
                    @if (request.request_type === 'complaint') {
                      <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                        <div class="flex items-center gap-2 mb-2">
                          <i class="pi pi-tag text-yellow-400"></i>
                          <span class="text-xs text-gray-400 font-medium">Categoría</span>
                        </div>
                        <p class="text-white font-semibold">
                          {{ getComplaintCategoryLabel(data.category) }}
                        </p>
                      </div>
                      @if (data.priority) {
                      <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                        <div class="flex items-center gap-2 mb-2">
                          <i class="pi pi-exclamation-circle text-yellow-400"></i>
                          <span class="text-xs text-gray-400 font-medium">Prioridad</span>
                        </div>
                        <p class="text-white font-semibold capitalize">
                          {{ data.priority }}
                        </p>
                      </div>
                      }
                    }

                    <!-- Tipo de Solicitud (común) -->
                    <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                      <div class="flex items-center gap-2 mb-2">
                        <i class="pi pi-list text-gray-400"></i>
                        <span class="text-xs text-gray-400 font-medium">Tipo</span>
                      </div>
                      <p class="text-white font-semibold">
                        {{ getRequestTypeLabel(request.request_type) }}
                      </p>
                    </div>
                  </div>

                  <!-- Descripción/Motivo -->
                  @if (request.description) {
                  <div class="bg-neutral-900/30 rounded-lg p-3 border border-neutral-700/30 mb-4">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-comment text-cyan-400"></i>
                      <span class="text-sm text-gray-400 font-medium">
                        @if (request.request_type === 'complaint') {
                          Detalles
                        } @else {
                          Motivo
                        }
                      </span>
                    </div>
                    <p class="text-gray-300 text-sm">{{ request.description }}</p>
                  </div>
                  }

                  <!-- Comentario de Rechazo -->
                  @if (data.rejection_comment || data.notes && request.status === 'rejected') {
                  <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div class="flex items-start gap-3">
                      <i class="pi pi-exclamation-triangle text-red-400 text-xl mt-0.5"></i>
                      <div class="flex-1">
                        <h4 class="text-red-300 font-semibold mb-1">Motivo del Rechazo</h4>
                        <p class="text-red-200 text-sm">{{ data.rejection_comment || data.notes }}</p>
                      </div>
                    </div>
                  </div>
                  }

                  <!-- Botón de acción para quejas -->
                  @if (request.request_type === 'complaint') {
                  <div class="mt-4">
                    <p-button
                      label="Ver Conversación"
                      icon="pi pi-comments"
                      severity="secondary"
                      [outlined]="true"
                      [rounded]="true"
                      (onClick)="viewResponse(data)"
                    />
                  </div>
                  }
                </div>
              </div>
            </div>
            }
          </div>
          }
        </p-card>
      </div>
      }

      <!-- Notificaciones Section -->
      @if (activeSection() === 'notifications') {
      <div id="notifications" class="section-content">
        <p-card>
          <ng-template #title>
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <i class="pi pi-bell text-amber-400"></i>
                <span>Buzón de Notificaciones</span>
              </div>
              <p-button
                label="Marcar todas como leídas"
                icon="pi pi-check"
                [outlined]="true"
                severity="secondary"
                size="small"
                (onClick)="markAllNotificationsAsRead()"
                [disabled]="unreadNotificationsCount() === 0"
              />
            </div>
          </ng-template>
          <ng-template #subtitle
            >Gestiona todas tus notificaciones</ng-template
          >
          
          @if (notifications().length === 0) {
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center mb-4">
              <i class="pi pi-inbox text-amber-400 text-4xl"></i>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">No hay notificaciones</h3>
            <p class="text-gray-400 text-sm">Todas tus notificaciones aparecerán aquí</p>
          </div>
          } @else {
          <div class="space-y-3">
            @for (notification of notifications(); track notification.id) {
            <div
              class="rounded-lg bg-neutral-800/50 border border-neutral-700/50 p-4 hover:bg-neutral-800/70 transition-all cursor-pointer"
              [class.bg-neutral-800/70]="!notification.is_read"
              [class.border-amber-400/50]="!notification.is_read"
              (click)="markNotificationAsRead(notification.id)"
            >
              <div class="flex items-start gap-4">
                <!-- Icono -->
                <div
                  class="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center"
                >
                  <i
                    [class]="getNotificationIcon(notification.message_type) + ' text-amber-400 text-lg'"
                  ></i>
                </div>
                <!-- Contenido -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <h3
                      class="text-base font-semibold text-white"
                      [class.font-bold]="!notification.is_read"
                    >
                      {{ notification.title }}
                    </h3>
                    @if (!notification.is_read) {
                    <span
                      class="flex-shrink-0 w-2.5 h-2.5 bg-amber-400 rounded-full"
                    ></span>
                    }
                  </div>
                  <p class="text-sm text-gray-300 mb-3 whitespace-pre-wrap">
                    {{ notification.message }}
                  </p>
                  <div class="flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-gray-500">
                        <i class="pi pi-calendar text-gray-500 mr-1"></i>
                        {{ notification.created_at | date: 'dd/MM/yyyy HH:mm' }}
                      </span>
                      @if (notification.related_type) {
                      <span
                        class="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-400/30"
                      >
                        {{ getRelatedTypeLabel(notification.related_type) }}
                      </span>
                      }
                    </div>
                    @if (notification.is_read && notification.read_at) {
                    <span class="text-xs text-gray-500">
                      Leída: {{ notification.read_at | date: 'dd/MM/yyyy HH:mm' }}
                    </span>
                    }
                  </div>
                </div>
              </div>
            </div>
            }
          </div>
          }
        </p-card>
      </div>
      }
    </div>

    <!-- Dialog para conversación bidireccional -->
    @if(conversationDialogVisible()) {
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      (click)="closeConversation()"
    >
      <div
        class="bg-neutral-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="p-6 border-b border-neutral-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-white flex items-center gap-2">
              <i class="pi pi-comments text-amber-400"></i>
              Conversación
            </h3>
            <p-button
              icon="pi pi-times"
              severity="secondary"
              text
              rounded
              (onClick)="closeConversation()"
            />
          </div>
          @if(selectedComplaint()) {
          <div class="flex flex-wrap gap-4 text-sm">
            <div>
              <span class="text-gray-400">Categoría: </span>
              <span class="text-white">{{
                getComplaintCategoryLabel(selectedComplaint()!.category)
              }}</span>
            </div>
            <div>
              <span class="text-gray-400">Estado: </span>
              <span class="text-white">{{
                selectedComplaint()!.status === 'pending'
                  ? 'Pendiente'
                  : selectedComplaint()!.status === 'in_review'
                  ? 'En Revisión'
                  : 'Resuelto'
              }}</span>
            </div>
          </div>
          }
        </div>

        <!-- Mensajes -->
        <div
          class="flex-1 overflow-y-auto p-6 space-y-4"
          style="max-height: 400px;"
        >
          @if(complaintMessagesApi.isLoading()) {
          <div class="text-center py-8 text-gray-400">Cargando mensajes...</div>
          } @else if(conversationMessages().length === 0) {
          <div class="text-center py-8">
            <p class="text-gray-400">No hay mensajes todavía.</p>
            <p class="text-sm text-gray-500 mt-2">
              {{ selectedComplaint()?.complaint }}
            </p>
          </div>
          } @else { @for(message of conversationMessages(); track message.id) {
          <div
            class="flex"
            [ngClass]="{
              'justify-end': message.sender_type === 'employee',
              'justify-start': message.sender_type === 'hr'
            }"
          >
            <div
              class="max-w-[70%] rounded-lg p-4"
              [ngClass]="{
                'bg-amber-500/20': message.sender_type === 'employee',
                border: message.sender_type === 'employee',
                'border-amber-500/30': message.sender_type === 'employee',
                'bg-neutral-700': message.sender_type === 'hr',
                'border-neutral-600': message.sender_type === 'hr'
              }"
            >
              <div class="flex items-center gap-2 mb-2">
                @if(message.sender_type === 'employee') {
                <i class="pi pi-user text-amber-400"></i>
                <span class="text-amber-300 font-semibold text-sm">Tú</span>
                } @else {
                <i class="pi pi-building text-gray-400"></i>
                <span class="text-gray-300 font-semibold text-sm">RRHH</span>
                }
                <span class="text-xs text-gray-500">
                  {{ message.created_at | date : 'short' }}
                </span>
              </div>
              <p class="text-white text-sm whitespace-pre-wrap">
                {{ message.message }}
              </p>
            </div>
          </div>
          } }
        </div>

        <!-- Input de respuesta -->
        @if(selectedComplaint()) {
        <div class="p-6 border-t border-neutral-700">
          <div class="flex flex-col gap-3">
            <textarea
              pInputTextarea
              [ngModel]="replyMessage()"
              (ngModelChange)="replyMessage.set($event)"
              rows="3"
              placeholder="Escribe tu respuesta..."
              class="w-full"
            ></textarea>
            <div class="flex justify-end gap-2">
              <p-button
                label="Enviar"
                icon="pi pi-send"
                [loading]="sendingReply()"
                [disabled]="!replyMessage().trim()"
                (onClick)="sendReply()"
              />
            </div>
          </div>
        </div>
        }
      </div>
    </div>
    }

    <!-- Dialog de Tutorial de Tiempo Compensatorio -->
    <p-dialog
      [visible]="showTutorialDialog()"
      (onHide)="setShowTutorialDialog(false)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [draggable]="false"
      [resizable]="false"
      [closable]="true"
      [header]="'¿Cómo solicitar tiempo compensatorio?'"
    >
      <div class="tutorial-content">
        <!-- Introducción -->
        <div class="mb-6 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-cyan-400 text-2xl mt-1"></i>
            <div>
              <h3 class="text-lg font-semibold text-white mb-2">
                ¿Qué es el tiempo compensatorio?
              </h3>
              <p class="text-gray-300 text-sm leading-relaxed">
                El tiempo compensatorio te permite tomar descanso equivalente a las horas extras que has trabajado. 
                Por ejemplo, si trabajaste 2 horas extras, puedes solicitar 2 horas de descanso compensatorio.
              </p>
            </div>
          </div>
        </div>

        <!-- Paso 1 -->
        <div class="mb-6 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
          <div class="flex items-start gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <span class="text-cyan-400 font-bold">1</span>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-white mb-2">
                Selecciona el Tipo de Solicitud
              </h3>
              <div class="space-y-3 text-gray-300 text-sm">
                <div class="flex items-start gap-2">
                  <i class="pi pi-clock text-cyan-400 mt-1"></i>
                  <div>
                    <strong class="text-white">Por Horas:</strong> Usa esta opción cuando necesites tomar 
                    tiempo compensatorio por horas específicas (ej: 2 horas, 4 horas). Debes seleccionar:
                    <ul class="list-disc list-inside mt-2 ml-2 space-y-1 text-gray-400">
                      <li>La fecha en que deseas tomar el compensatorio</li>
                      <li>La hora de inicio</li>
                      <li>La hora de fin</li>
                    </ul>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <i class="pi pi-calendar text-cyan-400 mt-1"></i>
                  <div>
                    <strong class="text-white">Por Días:</strong> Usa esta opción cuando necesites tomar 
                    uno o más días completos de descanso compensatorio. Debes seleccionar:
                    <ul class="list-disc list-inside mt-2 ml-2 space-y-1 text-gray-400">
                      <li>Fecha de inicio del período de descanso</li>
                      <li>Fecha de fin del período de descanso</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Paso 2 -->
        <div class="mb-6 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
          <div class="flex items-start gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <span class="text-cyan-400 font-bold">2</span>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-white mb-2">
                Selecciona las Fechas y Horas
              </h3>
              <div class="space-y-2 text-gray-300 text-sm">
                <p>
                  <strong class="text-white">Para solicitudes por horas:</strong> Selecciona la fecha y 
                  el rango de horas exactas que deseas tomar. El sistema calculará automáticamente cuántas 
                  horas estás solicitando.
                </p>
                <p>
                  <strong class="text-white">Para solicitudes por días:</strong> Selecciona el rango de 
                  fechas completo. Puedes seleccionar desde un día hasta varios días consecutivos.
                </p>
                <div class="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                  <p class="text-yellow-300 text-xs m-0">
                    <i class="pi pi-exclamation-triangle mr-2"></i>
                    <strong>Importante:</strong> Solo puedes solicitar fechas futuras. No puedes solicitar 
                    compensatorio para días pasados.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Paso 3 -->
        <div class="mb-6 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
          <div class="flex items-start gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <span class="text-cyan-400 font-bold">3</span>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-white mb-2">
                Agrega un Motivo (Opcional)
              </h3>
              <p class="text-gray-300 text-sm">
                Aunque es opcional, agregar un motivo puede ayudar a RRHH a entender mejor tu solicitud. 
                Por ejemplo: "Necesito tiempo para asuntos personales", "Tengo una cita médica", etc.
              </p>
            </div>
          </div>
        </div>

        <!-- Proceso de Revisión -->
        <div class="mb-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
          <div class="flex items-start gap-3">
            <i class="pi pi-check-circle text-blue-400 text-2xl mt-1"></i>
            <div>
              <h3 class="text-lg font-semibold text-white mb-2">
                ¿Qué pasa después de enviar mi solicitud?
              </h3>
              <ol class="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                <li>
                  <strong class="text-white">Revisión de RRHH:</strong> El departamento de Recursos Humanos 
                  revisará tu solicitud y verificará que tengas horas extras disponibles acumuladas.
                </li>
                <li>
                  <strong class="text-white">Aprobación o Rechazo:</strong> RRHH te notificará si tu 
                  solicitud fue aprobada o rechazada. Si es rechazada, te explicarán el motivo.
                </li>
                <li>
                  <strong class="text-white">Registro:</strong> Una vez aprobada, tu solicitud será registrada 
                  en el sistema y podrás disfrutar de tu tiempo compensatorio.
                </li>
              </ol>
            </div>
          </div>
        </div>

        <!-- Consejos adicionales -->
        <div class="p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
          <div class="flex items-start gap-3">
            <i class="pi pi-lightbulb text-green-400 text-xl mt-1"></i>
            <div>
              <h3 class="text-base font-semibold text-white mb-2">
                Consejos útiles
              </h3>
              <ul class="list-disc list-inside space-y-1 text-gray-300 text-sm">
                <li>Solicita con anticipación para facilitar la planificación</li>
                <li>Verifica que tengas horas extras antes de solicitar</li>
                <li>Revisa el estado de tus solicitudes en la sección "Mis Solicitudes"</li>
                <li>Contacta a RRHH si tienes dudas sobre tus horas extras disponibles</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <ng-template #footer>
        <div class="flex justify-end">
          <p-button
            label="Entendido"
            icon="pi pi-check"
            (onClick)="setShowTutorialDialog(false)"
            severity="success"
            [rounded]="true"
          />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Dialog para Detalles de Solicitud -->
    <p-dialog
      [(visible)]="showRequestDetailsDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '900px' }"
      [draggable]="false"
      [resizable]="false"
      [closable]="true"
      [header]="selectedRequestDetails()?.title || 'Detalles de la Solicitud'"
      (onHide)="closeRequestDetailsDialog()"
    >
      @if (selectedRequestDetails()) {
        @let request = selectedRequestDetails()!;
        @let data = request.originalData;
        <div class="flex flex-col gap-6">
          <!-- Estado y Fecha -->
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
            <div>
              <p class="text-sm text-gray-400 mb-1">Estado</p>
              <span
                class="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 w-fit"
                [class.bg-yellow-500/20]="request.status === 'pending'"
                [class.text-yellow-300]="request.status === 'pending'"
                [class.bg-green-500/20]="request.status === 'approved'"
                [class.text-green-300]="request.status === 'approved'"
                [class.bg-red-500/20]="request.status === 'rejected'"
                [class.text-red-300]="request.status === 'rejected'"
                [class.bg-cyan-500/20]="request.status === 'in_registry'"
                [class.text-cyan-300]="request.status === 'in_registry'"
              >
                @if (request.status === 'approved') {
                  <i class="pi pi-check-circle"></i>
                } @else if (request.status === 'rejected') {
                  <i class="pi pi-times-circle"></i>
                } @else if (request.status === 'in_registry') {
                  <i class="pi pi-clock"></i>
                } @else {
                  <i class="pi pi-hourglass"></i>
                }
                {{ getUnifiedStatusLabel(request.status) }}
              </span>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-400 mb-1">Fecha de Solicitud</p>
              <p class="text-white font-semibold">
                {{ request.created_at | date : 'fullDate' }} a las {{ request.created_at | date : 'HH:mm' }}
              </p>
            </div>
          </div>

          <!-- Información según tipo de solicitud -->
          @if (request.request_type === 'compensatory') {
            <!-- Tiempo Compensatorio -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @let quantityForPeriod = getCompensatoryQuantity(data);
              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-calendar text-cyan-400"></i>
                  <span class="text-sm text-gray-400 font-medium">
                    @if (quantityForPeriod.isDays) {
                      Período
                    } @else {
                      Fecha y Horas
                    }
                  </span>
                </div>
                @if (quantityForPeriod.isDays) {
                  <p class="text-white font-semibold text-lg">
                    {{ data.date_from | date : 'dd/MM/yyyy' }}
                  </p>
                  @if (data.date_from !== data.date_to) {
                    <p class="text-gray-400 text-sm mt-1">
                      hasta {{ data.date_to | date : 'dd/MM/yyyy' }}
                    </p>
                  }
                } @else {
                  @if (data.date_from) {
                    <p class="text-white font-semibold text-lg">
                      {{ data.date_from | date : 'dd/MM/yyyy' }}
                    </p>
                    @if (data.date_from && hasTimeInfo(data.date_from)) {
                      <p class="text-gray-400 text-sm mt-1">
                        {{ formatDateWithTimeRange(data.date_from, data.date_to) }}
                      </p>
                    } @else {
                      <p class="text-gray-400 text-sm mt-1">
                        {{ formatHoursMinutes(quantityForPeriod.value) }}
                      </p>
                    }
                  } @else {
                    <p class="text-gray-400 text-sm">Sin fecha específica</p>
                  }
                }
              </div>

              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  @if (data.compensatory_type === 'days') {
                    <i class="pi pi-calendar text-cyan-400"></i>
                  } @else {
                    <i class="pi pi-clock text-cyan-400"></i>
                  }
                  <span class="text-sm text-gray-400 font-medium">Cantidad</span>
                </div>
                <p class="text-white font-semibold text-xl">
                  @let quantity = getCompensatoryQuantity(data);
                  @if (quantity.isDays) {
                    {{ quantity.value }} día(s)
                    <span class="text-gray-400 text-sm font-normal block mt-1">
                      ({{ quantity.value * 8 }} horas)
                    </span>
                  } @else {
                    {{ formatHoursMinutes(quantity.value) }}
                  }
                </p>
              </div>

              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-tag text-cyan-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Tipo</span>
                </div>
                <p class="text-white font-semibold">
                  @if (data.compensatory_type === 'days') {
                    Días
                  } @else {
                    Horas
                  }
                </p>
              </div>

              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-list text-cyan-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Tipo de Solicitud</span>
                </div>
                <p class="text-white font-semibold">
                  {{ getRequestTypeLabel(request.request_type) }}
                </p>
              </div>
            </div>

            <!-- Motivo -->
            @if (data.reason || request.description || getCompensatoryReasonFromNotes(data)) {
              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-3">
                  <i class="pi pi-comment text-cyan-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Motivo</span>
                </div>
                <p class="text-white text-sm whitespace-pre-wrap">
                  {{ data.reason || request.description || getCompensatoryReasonFromNotes(data) || 'Sin motivo especificado' }}
                </p>
              </div>
            }

            <!-- Comentario de Rechazo -->
            @if ((data.rejection_comment || data.notes) && request.status === 'rejected') {
              <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <i class="pi pi-exclamation-triangle text-red-400 text-xl mt-0.5"></i>
                  <div class="flex-1">
                    <h4 class="text-red-300 font-semibold mb-2">Motivo del Rechazo</h4>
                    <p class="text-red-200 text-sm whitespace-pre-wrap">
                      {{ data.rejection_comment || data.notes }}
                    </p>
                  </div>
                </div>
              </div>
            }
          }

          @if (request.request_type === 'disability') {
            <!-- Incapacidad -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-calendar text-blue-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Período de Incapacidad</span>
                </div>
                <p class="text-white font-semibold text-lg">
                  {{ data.start_date | date : 'dd/MM/yyyy' }}
                </p>
                @if (data.end_date) {
                  <p class="text-gray-400 text-sm mt-1">
                    hasta {{ data.end_date | date : 'dd/MM/yyyy' }}
                  </p>
                }
              </div>

              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-calendar-check text-blue-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Días</span>
                </div>
                <p class="text-white font-semibold text-xl">
                  {{ calculateDays(data.start_date, data.end_date) }} día(s)
                </p>
              </div>

              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-file text-blue-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Documento</span>
                </div>
                @if (data.document_url) {
                  <p-button
                    icon="pi pi-download"
                    label="Descargar Documento"
                    severity="secondary"
                    [outlined]="true"
                    size="small"
                    (onClick)="downloadDocument(data.document_url)"
                  />
                } @else {
                  <p class="text-gray-400 text-sm">No hay documento disponible</p>
                }
              </div>

              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-list text-blue-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Tipo de Solicitud</span>
                </div>
                <p class="text-white font-semibold">
                  {{ getRequestTypeLabel(request.request_type) }}
                </p>
              </div>
            </div>

            <!-- Descripción -->
            @if (data.description || request.description) {
              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-3">
                  <i class="pi pi-comment text-blue-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Descripción</span>
                </div>
                <p class="text-white text-sm whitespace-pre-wrap">
                  {{ data.description || request.description || 'Sin descripción' }}
                </p>
              </div>
            }

            <!-- Comentario de Rechazo -->
            @if ((data.rejection_comment || data.review_notes) && request.status === 'rejected') {
              <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <i class="pi pi-exclamation-triangle text-red-400 text-xl mt-0.5"></i>
                  <div class="flex-1">
                    <h4 class="text-red-300 font-semibold mb-2">Motivo del Rechazo</h4>
                    <p class="text-red-200 text-sm whitespace-pre-wrap">
                      {{ data.rejection_comment || data.review_notes }}
                    </p>
                  </div>
                </div>
              </div>
            }
          }

          @if (request.request_type === 'document') {
            <!-- Solicitud de Documento -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-file text-green-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Tipo de Documento</span>
                </div>
                <p class="text-white font-semibold text-lg">
                  {{ getDocumentTypeLabel(data.document_type) }}
                </p>
              </div>

              @if (data.required_date) {
                <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-calendar text-green-400"></i>
                    <span class="text-sm text-gray-400 font-medium">Fecha Requerida</span>
                  </div>
                  <p class="text-white font-semibold text-lg">
                    {{ data.required_date | date : 'fullDate' }}
                  </p>
                </div>
              }

              @if (data.status === 'approved' && data.document_url) {
                <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700 md:col-span-2">
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-download text-green-400"></i>
                    <span class="text-sm text-gray-400 font-medium">Documento Disponible</span>
                  </div>
                  <p-button
                    icon="pi pi-download"
                    label="Descargar Documento"
                    severity="success"
                    (onClick)="downloadDocument(data.document_url)"
                  />
                </div>
              }

              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-list text-green-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Tipo de Solicitud</span>
                </div>
                <p class="text-white font-semibold">
                  {{ getRequestTypeLabel(request.request_type) }}
                </p>
              </div>
            </div>

            <!-- Motivo/Uso -->
            @if (data.reason || request.description) {
              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-3">
                  <i class="pi pi-comment text-green-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Motivo o Uso del Documento</span>
                </div>
                <p class="text-white text-sm whitespace-pre-wrap">
                  {{ data.reason || request.description || 'Sin motivo especificado' }}
                </p>
              </div>
            }

            <!-- Comentario de Rechazo -->
            @if (data.rejection_comment && request.status === 'rejected') {
              <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <i class="pi pi-exclamation-triangle text-red-400 text-xl mt-0.5"></i>
                  <div class="flex-1">
                    <h4 class="text-red-300 font-semibold mb-2">Motivo del Rechazo</h4>
                    <p class="text-red-200 text-sm whitespace-pre-wrap">
                      {{ data.rejection_comment }}
                    </p>
                  </div>
                </div>
              </div>
            }
          }

          @if (request.request_type === 'complaint') {
            <!-- Queja -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-tag text-yellow-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Categoría</span>
                </div>
                <p class="text-white font-semibold text-lg">
                  {{ getComplaintCategoryLabel(data.category) }}
                </p>
              </div>

              @if (data.priority) {
                <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-exclamation-circle text-yellow-400"></i>
                    <span class="text-sm text-gray-400 font-medium">Prioridad</span>
                  </div>
                  <p class="text-white font-semibold text-lg capitalize">
                    {{ data.priority }}
                  </p>
                </div>
              }

              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-list text-yellow-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Tipo de Solicitud</span>
                </div>
                <p class="text-white font-semibold">
                  {{ getRequestTypeLabel(request.request_type) }}
                </p>
              </div>
            </div>

            <!-- Detalles/Queja -->
            @if (data.complaint || request.description) {
              <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <div class="flex items-center gap-2 mb-3">
                  <i class="pi pi-comment text-yellow-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Detalles de la Sugerencia</span>
                </div>
                <p class="text-white text-sm whitespace-pre-wrap">
                  {{ data.complaint || request.description }}
                </p>
              </div>
            }

            <!-- Botón para ver conversación -->
            <div class="flex justify-end">
              <p-button
                label="Ver Conversación"
                icon="pi pi-comments"
                severity="secondary"
                [outlined]="true"
                [rounded]="true"
                (onClick)="closeRequestDetailsDialog(); viewResponse(data)"
              />
            </div>
          }
        </div>
      }
    </p-dialog>

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
  private readonly companyEmailDomain = '@blackdogpanama.com';

  public currentEmployee = computed(() => this.store.currentEmployee());
  public activeSection = this.portalStore.activeSection;

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

  public showSalary = this.portalStore.showSalary;
  public vacationStartDate = this.portalStore.vacationStartDate;
  public vacationEndDate = this.portalStore.vacationEndDate;
  public vacationReason = this.portalStore.vacationReason;
  public submittingVacation = this.portalStore.submittingVacation;
  public compensatoryStartDate = this.portalStore.compensatoryStartDate;
  public compensatoryEndDate = this.portalStore.compensatoryEndDate;
  public compensatoryType = this.portalStore.compensatoryType;
  public compensatoryReason = this.portalStore.compensatoryReason;
  public submittingCompensatory = this.portalStore.submittingCompensatory;
  public compensatoryDate = this.portalStore.compensatoryDate;
  public compensatoryTimeStart = this.portalStore.compensatoryTimeStart;
  public compensatoryTimeEnd = this.portalStore.compensatoryTimeEnd;
  public selectedOvertimeDays = this.portalStore.selectedOvertimeDays;
  public manualOvertimeDates = this.portalStore.manualOvertimeDates;
  public newOvertimeDate = this.portalStore.newOvertimeDate;
  public showTutorialDialog = this.portalStore.showTutorialDialog;

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
      const section = this.activeSection();
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

  // Date range for timelogs
  public dateRange = signal<Date[]>([
    addDays(new Date(), -7), // Últimos 7 días para incluir marcaciones recientes
    endOfMonth(new Date()),
  ]);

  // Calendar month for timelogs calendar view
  public calendarMonth = signal<Date>(startOfToday());

  // Vista de marcaciones: 'calendar' o 'table'
  public timelogViewMode = signal<'calendar' | 'table'>('table');

  // Timelogs API
  public timelogsApi = httpResource<any[]>(() => {
    if (
      !this.dateRange()[0] ||
      !this.dateRange()[1] ||
      !this.currentEmployee()?.id
    ) {
      return undefined;
    }
    const employeeId = this.currentEmployee()!.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    // Asegurar que siempre tengamos un company_id válido
    if (!companyId) {
      console.warn(
        '[EmployeePortal] No se encontró company_id, no se pueden cargar timelogs'
      );
      return undefined;
    }

    // Construir URL manualmente para aplicar correctamente filtros gte y lte
    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`;
    const startDate = format(this.dateRange()[0], "yyyy-MM-dd'T'06:00:00");
    const endDate = format(
      addDays(this.dateRange()[1], 1),
      "yyyy-MM-dd'T'06:00:00"
    );
    const select = `*,employee:employees(id,first_name,father_name,company_id, branch:branches(id, name)),branch:branches(id, name, short_name)`;

    let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
    url += `&employee_id=eq.${employeeId}`;
    // Filtrar directamente por company_id de timelogs (la tabla tiene este campo)
    if (companyId) {
      url += `&company_id=eq.${companyId}`;
    }
    url += `&created_at=gte.${startDate}`;
    url += `&created_at=lte.${endDate}`;
    url += `&order=created_at.asc`;

    return {
      url,
      method: 'GET',
    };
  });

  public myTimelogs = computed(() => {
    const logs = this.timelogsApi.value() ?? [];
    // Process logs similar to timelogs component
    const processedLogs = logs
      .map((x) => ({ ...x, day: format(x.created_at, 'yyyy-MM-dd') }))
      .reduce<any[]>((acc, x) => {
        const existing = acc.find((item) => item.day === x.day);
        if (!existing) {
          acc.push({
            day: x.day,
            entry:
              x.type === TimeLogEnum.entry
                ? { date: new Date(x.created_at), branch: x.branch }
                : undefined,
            lunch_start:
              x.type === TimeLogEnum.lunch_start
                ? { date: new Date(x.created_at), branch: x.branch }
                : undefined,
            lunch_end:
              x.type === TimeLogEnum.lunch_end
                ? { date: new Date(x.created_at), branch: x.branch }
                : undefined,
            exit:
              x.type === TimeLogEnum.exit
                ? { date: new Date(x.created_at), branch: x.branch }
                : undefined,
            schedule: null, // Would need to fetch schedules separately
            delay: undefined,
          });
        } else {
          if (x.type === TimeLogEnum.entry)
            existing.entry = { date: new Date(x.created_at), branch: x.branch };
          if (x.type === TimeLogEnum.lunch_start)
            existing.lunch_start = {
              date: new Date(x.created_at),
              branch: x.branch,
            };
          if (x.type === TimeLogEnum.lunch_end)
            existing.lunch_end = {
              date: new Date(x.created_at),
              branch: x.branch,
            };
          if (x.type === TimeLogEnum.exit)
            existing.exit = { date: new Date(x.created_at), branch: x.branch };
        }
        return acc;
      }, []);

    return processedLogs.sort(
      (a, b) => new Date(b.day).getTime() - new Date(a.day).getTime()
    );
  });

  // Timelogs API para el mes actual (independiente del dateRange del usuario)
  public monthTimelogsApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) {
      return undefined;
    }
    const employeeId = this.currentEmployee()!.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    const month = this.calendarMonth();
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`;
    const startDate = format(monthStart, "yyyy-MM-dd'T'06:00:00");
    const endDate = format(addDays(monthEnd, 1), "yyyy-MM-dd'T'06:00:00");
    const select = `*,employee:employees(id,first_name,father_name, branch:branches(id, name)),branch:branches(id, name, short_name)`;

    let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
    url += `&employee_id=eq.${employeeId}`;
    // Filtrar directamente por company_id de timelogs (la tabla tiene este campo)
    url += `&company_id=eq.${companyId}`;
    url += `&created_at=gte.${startDate}`;
    url += `&created_at=lte.${endDate}`;
    url += `&order=created_at.asc`;

    return {
      url,
      method: 'GET',
    };
  });

  // Procesar timelogs del mes actual
  public monthTimelogs = computed(() => {
    const logs = this.monthTimelogsApi.value() ?? [];

    const processedLogs = logs
      .filter((x) => x.created_at)
      .map((x) => {
        try {
          const date = new Date(x.created_at);
          if (isNaN(date.getTime())) {
            return null;
          }
          return x;
        } catch (error) {
          return null;
        }
      })
      .filter((x) => x !== null)
      .reduce<any[]>((acc, x) => {
        if (!x) return acc;

        const logDate = new Date(x.created_at);
        const logBranch = x.branch || null;

        // Normalizar la fecha a medianoche para determinar el día
        // Esto es consistente con cómo se procesa en el componente de timelogs del dashboard
        const logDateNormalized = new Date(logDate);
        logDateNormalized.setHours(0, 0, 0, 0);
        const actualDay = format(logDateNormalized, 'yyyy-MM-dd');

        // Buscar registro existente por el día de esta marcación
        let existing = acc.find((item) => item.day === actualDay);

        // Si no existe, crear uno nuevo
        if (!existing) {
          existing = {
            day: actualDay,
            entry: undefined,
            lunch_start: undefined,
            lunch_end: undefined,
            exit: undefined,
            schedule: null,
            delay: undefined,
          };
          acc.push(existing);
        }

        // Agregar la marcación al registro
        // Si ya existe una marcación del mismo tipo, mantener la más temprana (para entrada) o la más tardía (para salida)
        if (x.type === TimeLogEnum.entry) {
          if (!existing.entry || logDate < existing.entry.date) {
            existing.entry = { date: logDate, branch: logBranch };
          }
        } else if (x.type === TimeLogEnum.exit) {
          if (!existing.exit || logDate > existing.exit.date) {
            existing.exit = { date: logDate, branch: logBranch };
          }
        } else if (x.type === TimeLogEnum.lunch_start) {
          if (!existing.lunch_start || logDate < existing.lunch_start.date) {
            existing.lunch_start = { date: logDate, branch: logBranch };
          }
        } else if (x.type === TimeLogEnum.lunch_end) {
          if (!existing.lunch_end || logDate > existing.lunch_end.date) {
            existing.lunch_end = { date: logDate, branch: logBranch };
          }
        }

        return acc;
      }, []);

    const sorted = processedLogs.sort(
      (a, b) => new Date(b.day).getTime() - new Date(a.day).getTime()
    );
    return sorted;
  });

  // Convertir timelogs a markers para el calendario bonito
  public timelogMarkers = computed<CalendarMarkerData[]>(() => {
    const logs = this.monthTimelogs();

    // Filtrar solo días con marcaciones válidas (entrada y/o salida)
    const filtered = logs.filter((log) => {
      // Debe tener al menos entrada o salida
      if (!log.entry && !log.exit) {
        return false;
      }

      // Verificar que la fecha sea válida
      const logDate = new Date(log.day);
      if (isNaN(logDate.getTime())) {
        return false;
      }

      // El día ya está calculado correctamente basándose en la entrada o salida
      // No necesitamos validar días diferentes porque el día se recalcula correctamente
      // en el procesamiento anterior
      return true;
    });

    const markers = filtered.map((log) => ({
      date: new Date(log.day),
      data: log,
    }));
    return markers;
  });

  // Handler para cambio de mes en el calendario
  public onCalendarMonthChange(date: Date): void {
    // Normalizar la fecha al inicio del mes para evitar problemas de zona horaria
    const normalizedDate = startOfMonth(date);
    this.calendarMonth.set(normalizedDate);
    // Forzar recarga del API cuando cambia el mes
    this.monthTimelogsApi.reload();
  }

  // Lates computed from timelogs
  public myLates = computed(() => {
    const logs = this.myTimelogs();
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return logs
      .filter((log) => {
        const logDate = new Date(log.day);
        return (
          logDate >= monthStart &&
          logDate <= monthEnd &&
          log.delay &&
          typeof log.delay === 'number'
        );
      })
      .map((log) => ({
        date: new Date(log.day),
        scheduled_time: log.schedule?.schedule?.start_time || '-',
        actual_time: log.entry?.date ? format(log.entry.date, 'HH:mm') : '-',
        minutes: log.delay as number,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  // Disabilities
  public disabilityStartDate = signal<Date | null>(null);
  public disabilityEndDate = signal<Date | null>(null);
  public disabilityDescription = signal('');
  public selectedFile = signal<File | null>(null);
  public uploadingDisability = signal(false);

  public disabilitiesApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_disabilities`,
      method: 'GET',
      params: {
        select: '*',
        employee_id: `eq.${this.currentEmployee()!.id}`,
        order: 'created_at.desc',
      },
    };
  });

  public myDisabilities = computed(() => this.disabilitiesApi.value() ?? []);

  // Document Requests
  public documentType = this.portalStore.documentType;
  public customDocumentType = this.portalStore.customDocumentType;
  public documentReason = this.portalStore.documentReason;
  public documentRequiredDate = this.portalStore.documentRequiredDate;
  public submittingDocument = this.portalStore.submittingDocument;
  public canSubmitDocument = this.portalStore.canSubmitDocument;

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

  public documentRequestsApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/document_requests`,
      method: 'GET',
      params: {
        select: '*',
        employee_id: `eq.${this.currentEmployee()!.id}`,
        order: 'created_at.desc',
      },
    };
  });

  public myDocumentRequests = computed(
    () => this.documentRequestsApi.value() ?? []
  );

  // Complaints
  public complaintCategory = this.portalStore.complaintCategory;
  public complaintText = this.portalStore.complaintText;
  public allowContact = this.portalStore.allowContact;
  public contactMethod = this.portalStore.contactMethod;
  public submittingComplaint = this.portalStore.submittingComplaint;
  public canSubmitComplaint = this.portalStore.canSubmitComplaint;
  public responseDialogVisible = signal(false);
  public selectedComplaint = signal<any>(null);

  public complaintsApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    // Obtener todas las quejas del empleado (identificadas y anónimas)
    // usando creator_employee_id que siempre está seteado
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints`,
      method: 'GET',
      params: {
        select: '*',
        creator_employee_id: `eq.${this.currentEmployee()!.id}`, // Todas las quejas del empleado (identificadas y anónimas)
        order: 'updated_at.desc',
      },
    };
  });

  // Computed: Todas las quejas del empleado
  public myComplaints = computed(() => {
    return this.complaintsApi.value() ?? [];
  });

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

  // Señales para conversación
  public conversationDialogVisible = signal(false);
  public replyMessage = signal('');
  public sendingReply = signal(false);

  // Helper methods
  public calculateWorkedHours(
    entry: Date,
    exit: Date,
    lunchStart?: Date,
    lunchEnd?: Date
  ): string {
    if (!entry || !exit) {
      return '-';
    }

    const entryDate = new Date(entry);
    const exitDate = new Date(exit);

    if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) {
      return '-';
    }

    // Calcular diferencia total en minutos
    const totalMinutes = differenceInMinutes(exitDate, entryDate);

    if (totalMinutes < 0) {
      return '0h 0m';
    }

    // Restar tiempo de almuerzo si existe
    let lunchTime = 0;
    if (lunchStart && lunchEnd) {
      const lunchStartDate = new Date(lunchStart);
      const lunchEndDate = new Date(lunchEnd);
      if (!isNaN(lunchStartDate.getTime()) && !isNaN(lunchEndDate.getTime())) {
        const lunchDiff = differenceInMinutes(lunchEndDate, lunchStartDate);
        // Solo usar si la diferencia es positiva y razonable (máximo 3 horas)
        if (lunchDiff > 0 && lunchDiff <= 180) {
          lunchTime = lunchDiff;
        }
      }
    }

    // Calcular horas trabajadas restando el almuerzo
    const workMinutes = totalMinutes - lunchTime;

    if (workMinutes < 0) {
      return '0h 0m';
    }

    const hours = Math.floor(workMinutes / 60);
    const mins = workMinutes % 60;
    return `${hours}h ${mins}m`;
  }

  public calculateDays(start: Date | string, end: Date | string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end days
  }

  // Helper para calcular horas desde date_from y date_to cuando es por horas
  public calculateHoursFromDates(
    dateFrom: Date | string,
    dateTo: Date | string
  ): number {
    if (!dateFrom || !dateTo) {
      return 0;
    }

    // Normalizar las fechas a strings para mejor parsing
    const dateFromStr = String(dateFrom);
    const dateToStr = String(dateTo);

    // Intentar parsear las fechas
    let startDate: Date;
    let endDate: Date;

    try {
      // Si ya es un objeto Date, usarlo directamente
      if (dateFrom instanceof Date) {
        startDate = dateFrom;
      } else {
        // Intentar parsear como string
        startDate = new Date(dateFromStr);
      }

      if (dateTo instanceof Date) {
        endDate = dateTo;
      } else {
        endDate = new Date(dateToStr);
      }

      // Validar que las fechas sean válidas
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn(
          '[getCompensatoryQuantity] Fechas inválidas:',
          dateFromStr,
          dateToStr
        );
        return 0;
      }

      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffHours = diffTime / (1000 * 60 * 60);

      // Redondear a 2 decimales para evitar errores de precisión
      return Math.round(diffHours * 100) / 100;
    } catch (error) {
      console.error(
        '[getCompensatoryQuantity] Error calculando horas:',
        error,
        dateFromStr,
        dateToStr
      );
      return 0;
    }
  }

  // Helper para extraer el motivo desde las notas de una solicitud compensatoria
  public getCompensatoryReasonFromNotes(data: any): string | null {
    if (!data.notes) return null;
    const notesArray = Array.isArray(data.notes)
      ? data.notes
      : typeof data.notes === 'string'
      ? [data.notes]
      : [];
    const motivoNote = notesArray.find(
      (note: any) => typeof note === 'string' && note.startsWith('Motivo:')
    );
    if (motivoNote) {
      return motivoNote.replace('Motivo: ', '').trim();
    }
    return null;
  }

  // Helper para obtener la cantidad correcta de horas o días para una solicitud compensatoria
  public getCompensatoryQuantity(data: any): {
    value: number;
    isDays: boolean;
  } {
    // Primero intentar determinar si es días u horas desde las notas o el campo compensatory_type
    let isDays = false;

    // 1. Intentar desde compensatory_type si existe
    if (data.compensatory_type) {
      isDays = data.compensatory_type === 'days';
    }
    // 2. Intentar desde las notas
    else if (data.notes) {
      const notesArray = Array.isArray(data.notes)
        ? data.notes
        : typeof data.notes === 'string'
        ? [data.notes]
        : [];

      // Buscar nota que contenga "Tipo:"
      const tipoNote = notesArray.find(
        (note: any) => typeof note === 'string' && note.includes('Tipo:')
      );

      if (tipoNote) {
        isDays = tipoNote.includes('Días');
      }
      // 3. Si no hay nota de tipo, determinar por el formato de las fechas y la diferencia
      else if (data.date_from && data.date_to) {
        const dateFromStr = String(data.date_from);
        const dateToStr = String(data.date_to);

        // Si las fechas incluyen hora (formato datetime con espacio o ISO con T), probablemente es por horas
        const hasTimeInFrom =
          (dateFromStr.includes(' ') && dateFromStr.includes(':')) ||
          (dateFromStr.includes('T') && dateFromStr.includes(':'));
        const hasTimeInTo =
          (dateToStr.includes(' ') && dateToStr.includes(':')) ||
          (dateToStr.includes('T') && dateToStr.includes(':'));

        if (hasTimeInFrom && hasTimeInTo) {
          // Tiene hora, es por horas
          isDays = false;
        } else {
          // No tiene hora, calcular diferencia
          const hours = this.calculateHoursFromDates(
            data.date_from,
            data.date_to
          );
          const days = hours / 24;
          // Si la diferencia es un número entero de días (tolerancia pequeña)
          isDays = days >= 1 && Math.abs(days - Math.round(days)) < 0.1;
        }
      }
    }
    // 4. Si no hay notas, intentar determinar por formato de fechas
    else if (data.date_from && data.date_to) {
      const dateFromStr = String(data.date_from);
      const dateToStr = String(data.date_to);

      const hasTimeInFrom =
        (dateFromStr.includes(' ') && dateFromStr.includes(':')) ||
        (dateFromStr.includes('T') && dateFromStr.includes(':'));
      const hasTimeInTo =
        (dateToStr.includes(' ') && dateToStr.includes(':')) ||
        (dateToStr.includes('T') && dateToStr.includes(':'));

      if (hasTimeInFrom && hasTimeInTo) {
        isDays = false;
      } else {
        const hours = this.calculateHoursFromDates(
          data.date_from,
          data.date_to
        );
        const days = hours / 24;
        isDays = days >= 1 && Math.abs(days - Math.round(days)) < 0.1;
      }
    }

    if (isDays) {
      // Calcular días desde fechas
      let days = 0;
      if (data.date_from && data.date_to) {
        days = this.calculateDays(data.date_from, data.date_to);
      } else if (data.compensatory_amount) {
        days = data.compensatory_amount;
      }
      return { value: days > 0 ? days : 1, isDays: true };
    } else {
      // Para horas, calcular siempre desde fechas si están disponibles
      let hours = 0;
      if (data.date_from && data.date_to) {
        hours = this.calculateHoursFromDates(data.date_from, data.date_to);

        // Si el resultado es 0 o negativo, intentar desde otros campos
        if (hours <= 0) {
          // Intentar desde las notas si hay cantidad guardada
          if (data.notes) {
            const notesArray = Array.isArray(data.notes)
              ? data.notes
              : typeof data.notes === 'string'
              ? [data.notes]
              : [];
            const cantidadNote = notesArray.find(
              (note: any) =>
                typeof note === 'string' && note.includes('Cantidad:')
            );
            if (cantidadNote) {
              const cantidadMatch = cantidadNote.match(/Cantidad:\s*([\d.]+)/);
              if (cantidadMatch && cantidadMatch[1]) {
                hours = parseFloat(cantidadMatch[1]);
              }
            }
          }

          // Si aún es 0, intentar desde otros campos
          if (hours <= 0 && data.hours) {
            hours = data.hours;
          } else if (hours <= 0 && data.compensatory_amount) {
            hours = data.compensatory_amount;
          }
        }

        // Si el resultado es muy grande (más de 24 horas), probablemente es un error
        // y debería ser días en lugar de horas
        if (hours >= 24 && hours % 24 < 0.1) {
          // Es un número entero de días, convertir a días
          const days = Math.round(hours / 24);
          return { value: days, isDays: true };
        }
      } else if (data.hours) {
        hours = data.hours;
      } else if (data.compensatory_amount) {
        hours = data.compensatory_amount;
      }
      return { value: hours, isDays: false };
    }
  }

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

  // Dashboard computed properties
  public daysWorkedThisMonth = computed(() => {
    // Usar monthTimelogs que ya está filtrado por el mes actual del calendario
    const logs = this.monthTimelogs();
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Contar días que tienen al menos una marcación (entry, lunch_start, lunch_end, o exit)
    // monthTimelogs ya está filtrado por el mes, pero verificamos por si acaso
    return logs.filter((log) => {
      const logDate = new Date(log.day);
      const isInMonth = logDate >= monthStart && logDate <= monthEnd;
      const hasAnyMark =
        log.entry || log.lunch_start || log.lunch_end || log.exit;
      return isInMonth && hasAnyMark;
    }).length;
  });

  // Método para calcular horas extras de un día específico
  public calculateDayOvertimeHours(log: any): number {
    if (!log.entry || !log.exit) return 0;

    const entryDate = new Date(log.entry.date);
    const exitDate = new Date(log.exit.date);

    if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) return 0;

    // Calcular tiempo total desde entrada hasta salida
    const totalMinutes = differenceInMinutes(exitDate, entryDate);

    // Calcular tiempo de almuerzo si existe
    const lunchTime =
      log.lunch_start && log.lunch_end
        ? differenceInMinutes(
            new Date(log.lunch_end.date),
            new Date(log.lunch_start.date)
          )
        : 0;

    // Calcular horas extras: más de 9 horas totales (8 horas de trabajo + 1 hora de almuerzo)
    // 9 horas = 540 minutos
    const requiredTotalMinutes = 540;
    const overtimeByTotalTime =
      totalMinutes > requiredTotalMinutes
        ? totalMinutes - requiredTotalMinutes
        : 0;

    // Calcular minutos excedidos del almuerzo (más de 60 minutos)
    // Si el almuerzo excede 60 minutos, ese tiempo extra NO es trabajo y debe restarse de las horas extras
    const lunchExceededMinutes = lunchTime > 60 ? lunchTime - 60 : 0;

    // RESTAR el exceso de almuerzo de las horas extras (porque ese tiempo no es trabajo)
    const dayOvertimeMinutes = Math.max(
      0,
      overtimeByTotalTime - lunchExceededMinutes
    );

    // Convertir minutos a horas
    return dayOvertimeMinutes / 60;
  }

  // Calcular horas extras totales usando la misma lógica que timelogs.component.ts
  public totalOvertimeHours = computed(() => {
    const logs = this.monthTimelogs();
    let totalOvertimeMinutes = 0;

    logs.forEach((log) => {
      if (!log.entry || !log.exit) return;

      const entryDate = new Date(log.entry.date);
      const exitDate = new Date(log.exit.date);

      if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) return;

      // Calcular tiempo total desde entrada hasta salida
      const totalMinutes = differenceInMinutes(exitDate, entryDate);

      // Calcular tiempo de almuerzo si existe
      const lunchTime =
        log.lunch_start && log.lunch_end
          ? differenceInMinutes(
              new Date(log.lunch_end.date),
              new Date(log.lunch_start.date)
            )
          : 0;

      // Calcular horas extras: más de 9 horas totales (8 horas de trabajo + 1 hora de almuerzo)
      // 9 horas = 540 minutos
      const requiredTotalMinutes = 540;
      const overtimeByTotalTime =
        totalMinutes > requiredTotalMinutes
          ? totalMinutes - requiredTotalMinutes
          : 0;

      // Calcular minutos excedidos del almuerzo (más de 60 minutos)
      // Si el almuerzo excede 60 minutos, ese tiempo extra NO es trabajo y debe restarse de las horas extras
      const lunchExceededMinutes = lunchTime > 60 ? lunchTime - 60 : 0;

      // RESTAR el exceso de almuerzo de las horas extras (porque ese tiempo no es trabajo)
      const dayOvertimeMinutes = Math.max(
        0,
        overtimeByTotalTime - lunchExceededMinutes
      );
      totalOvertimeMinutes += dayOvertimeMinutes;
    });

    // Convertir minutos a horas
    return totalOvertimeMinutes / 60;
  });

  // Computed: Días disponibles con horas extras
  public availableOvertimeDays = computed(() => {
    const logs = this.monthTimelogs();
    const daysWithOvertime: Array<{ date: Date; day: string; hours: number }> =
      [];

    logs.forEach((log) => {
      if (!log.entry || !log.exit) return;

      // Calcular horas extras del día
      const overtimeHours = this.calculateDayOvertimeHours(log);

      if (overtimeHours > 0) {
        daysWithOvertime.push({
          date: new Date(log.day),
          day: log.day,
          hours: overtimeHours,
        });
      }
    });

    return daysWithOvertime.sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  // Computed: Total de horas extras de días seleccionados
  public totalSelectedOvertimeHours = computed(() => {
    const selectedDays = this.selectedOvertimeDays();
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

  // Computed: Detalles completos de días con horas extra (para Paso 4)
  public overtimeDaysDetails = computed(() => {
    const logs = this.monthTimelogs();
    const details: Array<{
      date: Date;
      day: string;
      entryTime: string | null;
      exitTime: string | null;
      totalHours: number;
      overtimeHours: number;
      lunchDuration: number;
      delayHours: number;
    }> = [];

    logs.forEach((log) => {
      if (!log.entry || !log.exit) return;

      const overtimeHours = this.calculateDayOvertimeHours(log);
      if (overtimeHours > 0) {
        const entryDate = new Date(log.entry.date);
        const exitDate = new Date(log.exit.date);

        // Calcular tiempo de almuerzo en horas
        const lunchTimeMinutes =
          log.lunch_start && log.lunch_end
            ? differenceInMinutes(
                new Date(log.lunch_end.date),
                new Date(log.lunch_start.date)
              )
            : 0;
        const lunchTime = lunchTimeMinutes / 60;

        // Calcular retraso (delay) en horas
        // El delay viene en minutos desde los logs procesados
        const delayMinutes =
          log.delay && typeof log.delay === 'number' ? log.delay : 0;
        const delayHours = delayMinutes / 60;

        // Calcular tiempo total trabajado REAL = (salida - entrada) - almuerzo - retraso
        const totalMinutes = differenceInMinutes(exitDate, entryDate);
        const totalHoursReal =
          (totalMinutes - lunchTimeMinutes - delayMinutes) / 60;

        details.push({
          date: new Date(log.day),
          day: log.day,
          entryTime: format(entryDate, 'HH:mm'),
          exitTime: format(exitDate, 'HH:mm'),
          totalHours: totalHoursReal, // Horas reales trabajadas después de restar almuerzo y retrasos
          overtimeHours: overtimeHours,
          lunchDuration: lunchTime,
          delayHours: delayHours,
        });
      }
    });

    return details.sort((a, b) => b.date.getTime() - a.date.getTime());
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

  public recentTimelogs = computed(() => {
    // Obtener los timelogs crudos (sin agrupar por día)
    const rawLogs = this.timelogsApi.value() ?? [];
    const sevenDaysAgo = addDays(new Date(), -7);

    // Filtrar por los últimos 7 días y convertir cada marcación en un evento individual
    const recentEvents = rawLogs
      .filter((log) => {
        const logDate = new Date(log.created_at);
        return logDate >= sevenDaysAgo;
      })
      .map((log) => {
        const logDate = new Date(log.created_at);
        let typeLabel = '';
        let icon = 'pi-clock';

        switch (log.type) {
          case 'entry':
            typeLabel = 'Entrada';
            icon = 'pi-sign-in';
            break;
          case 'lunch_start':
            typeLabel = 'Inicio de Almuerzo';
            icon = 'pi-arrow-right';
            break;
          case 'lunch_end':
            typeLabel = 'Fin de Almuerzo';
            icon = 'pi-arrow-left';
            break;
          case 'exit':
            typeLabel = 'Salida';
            icon = 'pi-sign-out';
            break;
          default:
            typeLabel = 'Marcación';
        }

        return {
          id: log.id,
          type: log.type,
          typeLabel,
          icon,
          date: logDate,
          day: format(logDate, 'yyyy-MM-dd'),
          time: format(logDate, 'HH:mm'),
          branch: log.branch,
          created_at: log.created_at,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime()) // Más recientes primero
      .slice(0, 4); // Últimas 4 marcaciones

    return recentEvents;
  });

  public recentTimelogsCount = computed(() => {
    return this.recentTimelogs().length;
  });

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
    return this.selectedOvertimeDays().has(day);
  }

  public addManualOvertimeDate() {
    const date = this.newOvertimeDate();
    if (!date) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const existingDates = this.manualOvertimeDates();

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
    const dates = this.manualOvertimeDates();
    dates.splice(index, 1);
    this.setManualOvertimeDates([...dates]);
  }

  // API para obtener todas las solicitudes de tiempo compensatorio (no solo aprobadas)
  public compensatoryTimeoffsApi = httpResource<any[]>(
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
      // 1. myCompensatoryRequests solo usa campos directos de timeoffs
      // 2. Ya filtramos por employee_id directamente, que garantiza que pertenece al empleado correcto
      // 3. El empleado ya está filtrado por company_id a través de currentEmployee()
      // Esto evita el error HTTP 300 cuando hay múltiples relaciones
      const select = `*,type:timeoff_types(id,name)`;

      let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
      url += `&employee_id=eq.${this.currentEmployee()!.id}`;
      url += `&type_id=eq.${compensatoryTypeId}`;
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
      defaultValue: [],
    }
  );

  // API para obtener todas las solicitudes de vacaciones
  public vacationTimeoffsApi = httpResource<any[]>(
    () => {
      if (!this.currentEmployee()?.id) return undefined;
      const companyId = this.organizationService.getCurrentCompanyId();

      if (!companyId) {
        return undefined;
      }

      // ID del tipo de timeoff "Vacaciones"
      const vacationTypeId = '00000000-0000-0000-0000-000000000001';

      const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`;
      const select = `*,type:timeoff_types(id,name)`;

      let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
      url += `&employee_id=eq.${this.currentEmployee()!.id}`;
      url += `&type_id=eq.${vacationTypeId}`;
      url += `&order=date_from.desc`;

      return {
        url,
        method: 'GET',
      };
    },
    {
      defaultValue: [],
    }
  );

  // Signals para filtros de solicitudes (ahora para todas las solicitudes)
  public allRequestsFilterStatus = signal<string | null>(null);
  public allRequestsFilterType = signal<string | null>(null);
  public allRequestsFilterDateRange = signal<Date[] | null>(null);
  public allRequestsFilterSearch = signal<string>('');
  public allRequestsSortBy = signal<'date' | 'status' | 'type'>('date');
  public allRequestsSortOrder = signal<'asc' | 'desc'>('desc');
  public selectedSortOption = signal<any>({
    label: 'Fecha (Más reciente)',
    by: 'date',
    order: 'desc',
  });
  public filtersExpanded = signal<boolean>(false);

  // Mantener filtros antiguos para compatibilidad con sección de tiempo compensatorio
  public compensatoryFilterStatus = signal<string | null>(null);
  public compensatoryFilterType = signal<string | null>(null);
  public compensatoryFilterDateRange = signal<Date[] | null>(null);
  public compensatoryFilterSearch = signal<string>('');
  public compensatorySortBy = signal<'date' | 'status' | 'amount'>('date');
  public compensatorySortOrder = signal<'asc' | 'desc'>('desc');

  // Computed: Todas las solicitudes de tiempo compensatorio (sin filtrar)
  public allCompensatoryRequests = computed(() => {
    // CRÍTICO: Si el resource está en estado de error, retornar array vacío en lugar de intentar acceder a value()
    // Esto evita que el computed lance el error y entre en loop infinito
    if (this.compensatoryTimeoffsApi.status() === 'error') {
      return [];
    }
    return this.compensatoryTimeoffsApi.value() ?? [];
  });

  // Computed: Unificar todas las solicitudes en un solo array
  public allRequestsUnified = computed(() => {
    const requests: Array<{
      id: string;
      request_type:
        | 'compensatory'
        | 'disability'
        | 'document'
        | 'complaint'
        | 'vacation';
      created_at: string | Date;
      status: string;
      title: string;
      description?: string;
      originalData: any;
    }> = [];

    // Tiempo compensatorio
    const compensatory = this.allCompensatoryRequests();
    compensatory.forEach((req: any) => {
      requests.push({
        id: req.id,
        request_type: 'compensatory',
        created_at: req.created_at,
        status: this.getUnifiedRequestStatus(req, 'compensatory'),
        title: `Tiempo Compensatorio ${
          req.compensatory_type === 'days' ? 'Días' : 'Horas'
        }`,
        description: req.reason || '',
        originalData: req,
      });
    });

    // Incapacidades
    const disabilities = this.myDisabilities();
    disabilities.forEach((req: any) => {
      requests.push({
        id: req.id,
        request_type: 'disability',
        created_at: req.created_at,
        status: this.getUnifiedRequestStatus(req, 'disability'),
        title: 'Incapacidad Médica',
        description: req.diagnosis || req.notes || '',
        originalData: req,
      });
    });

    // Solicitudes de documentos
    const documents = this.myDocumentRequests();
    documents.forEach((req: any) => {
      requests.push({
        id: req.id,
        request_type: 'document',
        created_at: req.created_at,
        status: this.getUnifiedRequestStatus(req, 'document'),
        title: `Solicitud de ${this.getDocumentTypeLabel(req.document_type)}`,
        description: req.reason || req.custom_document_type || '',
        originalData: req,
      });
    });

    // Quejas
    const complaints = this.myComplaints();
    complaints.forEach((req: any) => {
      requests.push({
        id: req.id,
        request_type: 'complaint',
        created_at: req.created_at,
        status: this.getUnifiedRequestStatus(req, 'complaint'),
        title: `Sugerencia - ${this.getComplaintCategoryLabel(req.category)}`,
        description: req.complaint || '',
        originalData: req,
      });
    });

    return requests;
  });

  // Helper: Obtener estado unificado para cualquier tipo de solicitud
  private getUnifiedRequestStatus(request: any, type: string): string {
    if (type === 'compensatory') {
      if (request.is_approved === true) return 'approved';
      if (request.review_status === 'approved') return 'in_registry';
      if (request.rejection_comment || request.review_status === 'rejected')
        return 'rejected';
      return 'pending';
    } else if (type === 'disability') {
      return request.status || 'pending';
    } else if (type === 'document') {
      return request.status || 'pending';
    } else if (type === 'complaint') {
      return request.status || 'pending';
    }
    return 'pending';
  }

  // Computed: Solicitudes filtradas y ordenadas
  public myCompensatoryRequests = computed(() => {
    let requests = [...this.allCompensatoryRequests()];

    // Filtro por estado
    const statusFilter = this.compensatoryFilterStatus();
    if (statusFilter) {
      requests = requests.filter((r) => {
        if (statusFilter === 'pending') {
          return (
            r.review_status === 'pending' ||
            (!r.review_status && !r.is_approved)
          );
        } else if (statusFilter === 'approved') {
          return r.is_approved === true;
        } else if (statusFilter === 'rejected') {
          return r.rejection_comment || r.review_status === 'rejected';
        } else if (statusFilter === 'in_registry') {
          return r.review_status === 'approved' && !r.is_approved;
        }
        return true;
      });
    }

    // Filtro por tipo
    const typeFilter = this.compensatoryFilterType();
    if (typeFilter) {
      requests = requests.filter((r) => r.compensatory_type === typeFilter);
    }

    // Filtro por rango de fechas
    const dateRange = this.compensatoryFilterDateRange();
    if (dateRange && dateRange.length === 2) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      requests = requests.filter((r) => {
        const requestDate = new Date(r.date_from);
        return requestDate >= startDate && requestDate <= endDate;
      });
    }

    // Filtro por búsqueda de texto (motivo)
    const searchText = this.compensatoryFilterSearch().toLowerCase();
    if (searchText) {
      requests = requests.filter((r) => {
        const reason = r.reason?.toLowerCase() || '';
        return reason.includes(searchText);
      });
    }

    // Ordenamiento
    const sortBy = this.compensatorySortBy();
    const sortOrder = this.compensatorySortOrder();

    requests.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === 'status') {
        const statusA = this.getRequestStatusOrder(a);
        const statusB = this.getRequestStatusOrder(b);
        comparison = statusA - statusB;
      } else if (sortBy === 'amount') {
        const amountA = a.compensatory_amount || a.hours || 0;
        const amountB = b.compensatory_amount || b.hours || 0;
        comparison = amountA - amountB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return requests;
  });

  // Helper para ordenar por estado
  private getRequestStatusOrder(request: any): number {
    if (request.is_approved === true) return 1; // Aprobado primero
    if (request.review_status === 'approved') return 2; // En registro
    if (
      request.review_status === 'pending' ||
      (!request.review_status && !request.is_approved)
    )
      return 3; // Pendiente
    if (request.rejection_comment || request.review_status === 'rejected')
      return 4; // Rechazado
    return 5;
  }

  // Computed: Solicitudes unificadas filtradas y ordenadas (para Mis Solicitudes)
  public filteredAllRequests = computed(() => {
    let requests = [...this.allRequestsUnified()];

    // Filtro por estado
    const statusFilter = this.allRequestsFilterStatus();
    if (statusFilter) {
      requests = requests.filter((r) => {
        if (statusFilter === 'pending') {
          return r.status === 'pending';
        } else if (statusFilter === 'approved') {
          return r.status === 'approved';
        } else if (statusFilter === 'rejected') {
          return r.status === 'rejected';
        } else if (statusFilter === 'in_registry') {
          return r.status === 'in_registry';
        } else if (statusFilter === 'completed') {
          return r.status === 'completed';
        }
        return true;
      });
    }

    // Filtro por tipo de solicitud
    const typeFilter = this.allRequestsFilterType();
    if (typeFilter) {
      requests = requests.filter((r) => r.request_type === typeFilter);
    }

    // Filtro por rango de fechas
    const dateRange = this.allRequestsFilterDateRange();
    if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      const startDate = startOfDay(dateRange[0]);
      const endDate = endOfDay(dateRange[1]);
      requests = requests.filter((r) => {
        const requestDate = new Date(r.created_at);
        return requestDate >= startDate && requestDate <= endDate;
      });
    }

    // Filtro por búsqueda de texto
    const searchText = this.allRequestsFilterSearch().toLowerCase();
    if (searchText) {
      requests = requests.filter((r) => {
        const title = r.title?.toLowerCase() || '';
        const description = r.description?.toLowerCase() || '';
        return title.includes(searchText) || description.includes(searchText);
      });
    }

    // Ordenamiento
    const sortBy = this.allRequestsSortBy();
    const sortOrder = this.allRequestsSortOrder();

    requests.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === 'status') {
        const statusOrder: Record<string, number> = {
          pending: 1,
          approved: 2,
          in_registry: 3,
          completed: 4,
          rejected: 5,
        };
        comparison =
          (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      } else if (sortBy === 'type') {
        comparison = a.request_type.localeCompare(b.request_type);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return requests;
  });

  // Helper: Obtener label del estado unificado
  public getUnifiedStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      in_registry: 'En Registro',
      completed: 'Completado',
      in_review: 'En Revisión',
      closed: 'Cerrado',
      resolved: 'Resuelto',
    };
    return labels[status] || status;
  }

  // Helper: Obtener label del tipo de solicitud
  public getRequestTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      compensatory: 'Tiempo Compensatorio',
      disability: 'Incapacidad',
      document: 'Documento',
      complaint: 'Sugerencia',
      vacation: 'Vacaciones',
    };
    return labels[type] || type;
  }

  // Opciones para filtros de todas las solicitudes
  public allRequestsStatusOptions = [
    { label: 'Todos los estados', value: null },
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobado', value: 'approved' },
    { label: 'En Registro', value: 'in_registry' },
    { label: 'Completado', value: 'completed' },
    { label: 'Rechazado', value: 'rejected' },
  ];

  public allRequestsTypeOptions = [
    { label: 'Todos los tipos', value: null },
    { label: 'Tiempo Compensatorio', value: 'compensatory' },
    { label: 'Incapacidad', value: 'disability' },
    { label: 'Documento', value: 'document' },
    { label: 'Sugerencia', value: 'complaint' },
    { label: 'Vacaciones', value: 'vacation' },
  ];

  public allRequestsSortOptions = [
    {
      label: 'Fecha (Más reciente)',
      by: 'date' as const,
      order: 'desc' as const,
    },
    {
      label: 'Fecha (Más antiguo)',
      by: 'date' as const,
      order: 'asc' as const,
    },
    { label: 'Estado', by: 'status' as const, order: 'asc' as const },
    { label: 'Tipo', by: 'type' as const, order: 'asc' as const },
  ];

  // Método para limpiar filtros de todas las solicitudes
  public clearAllRequestsFilters(): void {
    this.allRequestsFilterStatus.set(null);
    this.allRequestsFilterType.set(null);
    this.allRequestsFilterDateRange.set(null);
    this.allRequestsFilterSearch.set('');
    this.allRequestsSortBy.set('date');
    this.allRequestsSortOrder.set('desc');
    this.selectedSortOption.set(this.allRequestsSortOptions[0]);
  }

  // Método para cambiar ordenamiento de todas las solicitudes
  public onAllRequestsSortChange(option: any): void {
    if (option && option.by) {
      this.allRequestsSortBy.set(option.by);
      this.allRequestsSortOrder.set(option.order);
      this.selectedSortOption.set(option);
    }
  }

  // Helper para contar filtros activos
  public getActiveFiltersCount(): number {
    let count = 0;
    if (this.allRequestsFilterStatus()) count++;
    if (this.allRequestsFilterType()) count++;
    if (this.allRequestsFilterDateRange()) count++;
    if (this.allRequestsFilterSearch()) count++;
    return count;
  }

  // Computed: Verificar si hay filtros activos
  public canClearAllRequestsFilters = computed(() => {
    return !!(
      this.allRequestsFilterStatus() ||
      this.allRequestsFilterType() ||
      this.allRequestsFilterDateRange() ||
      this.allRequestsFilterSearch()
    );
  });

  // Opciones para filtros
  public compensatoryStatusOptions = [
    { label: 'Todos los estados', value: null },
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobado', value: 'approved' },
    { label: 'En Registro', value: 'in_registry' },
    { label: 'Rechazado', value: 'rejected' },
  ];

  public compensatoryTypeOptions = [
    { label: 'Todos los tipos', value: null },
    { label: 'Por Horas', value: 'hours' },
    { label: 'Por Días', value: 'days' },
  ];

  public compensatorySortOptions = [
    {
      label: 'Fecha (Más reciente)',
      by: 'date' as const,
      order: 'desc' as const,
    },
    {
      label: 'Fecha (Más antiguo)',
      by: 'date' as const,
      order: 'asc' as const,
    },
    { label: 'Estado', by: 'status' as const, order: 'asc' as const },
    {
      label: 'Cantidad (Mayor)',
      by: 'amount' as const,
      order: 'desc' as const,
    },
    { label: 'Cantidad (Menor)', by: 'amount' as const, order: 'asc' as const },
  ];

  // Métodos para limpiar filtros
  public clearCompensatoryFilters(): void {
    this.compensatoryFilterStatus.set(null);
    this.compensatoryFilterType.set(null);
    this.compensatoryFilterDateRange.set(null);
    this.compensatoryFilterSearch.set('');
    this.compensatorySortBy.set('date');
    this.compensatorySortOrder.set('desc');
    this.selectedSortOption.set(this.compensatorySortOptions[0]);
  }

  public onCompensatorySortChange(option: any): void {
    if (option && option.by) {
      this.compensatorySortBy.set(option.by);
      this.compensatorySortOrder.set(option.order);
      this.selectedSortOption.set(option);
    }
  }

  // Computed: Calcular el total de horas/días automáticamente
  public compensatoryAmount = computed(() => {
    const type = this.compensatoryType();

    if (type === 'hours') {
      const date = this.compensatoryDate();
      const timeStart = this.compensatoryTimeStart();
      const timeEnd = this.compensatoryTimeEnd();

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
      const startDate = this.compensatoryStartDate();
      const endDate = this.compensatoryEndDate();

      if (!startDate || !endDate) {
        return 0;
      }

      const diffDays = differenceInDays(endDate, startDate) + 1; // +1 para incluir ambos días
      return Math.max(0, diffDays);
    }
  });

  // Validar si se puede enviar la solicitud
  public canSubmitCompensatory = computed(() => {
    const type = this.compensatoryType();
    const amount = this.compensatoryAmount();

    if (amount <= 0) {
      return false;
    }

    if (type === 'hours') {
      // Si es horas, debe tener fecha y ambas horas
      const date = this.compensatoryDate();
      const timeStart = this.compensatoryTimeStart();
      const timeEnd = this.compensatoryTimeEnd();
      if (!date || !timeStart || !timeEnd) {
        return false;
      }
    } else {
      // Si es días, debe tener fecha inicio y fin
      const startDate = this.compensatoryStartDate();
      const endDate = this.compensatoryEndDate();
      if (!startDate || !endDate || endDate < startDate) {
        return false;
      }
    }

    return true;
  });

  // Función para enviar solicitud de tiempo compensatorio
  public async submitCompensatoryRequest(): Promise<void> {
    if (!this.canSubmitCompensatory()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos Requeridos',
        detail: 'Por favor completa todos los campos correctamente',
      });
      return;
    }

    const type = this.compensatoryType();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validaciones de fechas
    if (type === 'hours') {
      const selectedDate = this.compensatoryDate();
      if (selectedDate) {
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);

        const daysDiff = Math.ceil(
          (selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff > this.MAX_FUTURE_DAYS) {
          this.messageService.add({
            severity: 'error',
            summary: 'Fecha inválida',
            detail: `No puedes solicitar tiempo compensatorio para más de ${this.MAX_FUTURE_DAYS} días en el futuro`,
          });
          return;
        }

        if (daysDiff < -this.MAX_PAST_DAYS) {
          this.messageService.add({
            severity: 'error',
            summary: 'Fecha inválida',
            detail: `No puedes solicitar tiempo compensatorio para más de ${this.MAX_PAST_DAYS} días en el pasado`,
          });
          return;
        }
      }
    } else {
      // Validación para días
      const startDate = this.compensatoryStartDate();
      const endDate = this.compensatoryEndDate();

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        // Validar que start <= end
        if (start > end) {
          this.messageService.add({
            severity: 'error',
            summary: 'Fechas inválidas',
            detail:
              'La fecha de inicio debe ser anterior o igual a la fecha de fin',
          });
          return;
        }

        // Validar límite de días futuros
        const daysDiff = Math.ceil(
          (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff > this.MAX_FUTURE_DAYS) {
          this.messageService.add({
            severity: 'error',
            summary: 'Fecha inválida',
            detail: `La fecha final no puede ser más de ${this.MAX_FUTURE_DAYS} días en el futuro`,
          });
          return;
        }

        // Validar rango máximo de días consecutivos
        const rangeDays =
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1;

        if (rangeDays > this.MAX_CONSECUTIVE_DAYS) {
          this.messageService.add({
            severity: 'error',
            summary: 'Rango inválido',
            detail: `No puedes solicitar más de ${this.MAX_CONSECUTIVE_DAYS} días consecutivos de tiempo compensatorio`,
          });
          return;
        }
      }
    }

    this.setSubmittingCompensatory(true);

    const amount = this.compensatoryAmount();

    // ID del tipo de timeoff "Compensatorio"
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';

    // Determinar date_from y date_to según el tipo
    let dateFrom: string;
    let dateTo: string;

    if (type === 'hours') {
      // Si es horas, combinar fecha con hora inicio y hora fin
      const selectedDate = this.compensatoryDate()!;
      const timeStart = this.compensatoryTimeStart()!;
      const timeEnd = this.compensatoryTimeEnd()!;

      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(timeStart.getHours());
      startDateTime.setMinutes(timeStart.getMinutes());
      startDateTime.setSeconds(0);
      startDateTime.setMilliseconds(0);

      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(timeEnd.getHours());
      endDateTime.setMinutes(timeEnd.getMinutes());
      endDateTime.setSeconds(0);
      endDateTime.setMilliseconds(0);

      // Si la hora fin es menor que la hora inicio, asumir que es del día siguiente
      if (endDateTime < startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      dateFrom = format(startDateTime, 'yyyy-MM-dd HH:mm:ss');
      dateTo = format(endDateTime, 'yyyy-MM-dd HH:mm:ss');
    } else {
      // Si es días, usar las fechas de inicio y fin
      dateFrom = format(this.compensatoryStartDate()!, 'yyyy-MM-dd');
      dateTo = format(this.compensatoryEndDate()!, 'yyyy-MM-dd');
    }

    // Calcular horas si es por días (asumiendo 8 horas por día)
    const hours = type === 'days' ? amount * 8 : amount;

    // Construir el array de notas con la información del tiempo compensatorio
    const notes: string[] = [];
    const reason = this.compensatoryReason();
    if (reason) {
      notes.push(`Motivo: ${reason}`);
    }

    // Agregar información sobre tipo y cantidad
    notes.push(
      `Tipo: ${type === 'days' ? 'Días' : 'Horas'}, Cantidad: ${amount}`
    );

    if (type === 'days') {
      notes.push(`Horas equivalentes: ${hours}`);
    }

    // Si es horas, agregar información del rango de horas
    if (type === 'hours') {
      const timeStart = this.compensatoryTimeStart();
      const timeEnd = this.compensatoryTimeEnd();
      if (timeStart && timeEnd) {
        notes.push(
          `Rango de horas: ${format(timeStart, 'HH:mm')} - ${format(
            timeEnd,
            'HH:mm'
          )}`
        );
      }
      notes.push(
        `HR verificará las horas extras trabajadas para aprobar esta solicitud`
      );
    }

    // Agregar información de fechas donde trabajó horas extra (fechas manuales)
    const manualDates = this.manualOvertimeDates();
    if (manualDates.length > 0) {
      notes.push('');
      notes.push(
        '--- Fechas donde trabajó horas extra (ingresadas manualmente) ---'
      );
      notes.push('');
      manualDates.forEach((date) => {
        notes.push(`- ${format(date, 'dd/MM/yyyy')}`);
      });
      notes.push('');
      notes.push(
        'RRHH revisará estas fechas junto con las marcaciones del empleado para verificar las horas extra trabajadas.'
      );
    }

    const timeoffData: any = {
      employee_id: this.currentEmployee()!.id,
      type_id: compensatoryTypeId,
      date_from: dateFrom,
      date_to: dateTo,
      notes: notes,
      is_approved: false,
      compensatory_type: type,
      compensatory_amount: amount,
    };

    try {
      const response = await this.employeePortalApi.createTimeoffRequest(
        timeoffData
      );

      const timeoffId = response[0]?.id || response?.id;
      await this.employeePortalApi.notifyHrReviewer(
        timeoffId,
        this.currentEmployee() ?? null
      );

      const currentEmp = this.currentEmployee();
      if (currentEmp && timeoffId) {
        await this.employeePortalApi.createHrMessages([
          {
            employee_id: currentEmp.id,
            related_type: 'timeoff',
            related_id: timeoffId,
            message_type: 'compensatory_request',
            title: 'Solicitud de tiempo compensatorio enviada',
            message:
              'Tu solicitud de tiempo compensatorio ha sido enviada y está pendiente de revisión.',
            is_read: false,
          },
        ]);
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail:
          'Tu solicitud de tiempo compensatorio ha sido enviada para revisión',
      });

      // Reset form
      this.setCompensatoryStartDate(null);
      this.setCompensatoryEndDate(null);
      this.setCompensatoryDate(null);
      this.setCompensatoryTimeStart(null);
      this.setCompensatoryTimeEnd(null);
      this.setCompensatoryType('hours');
      this.setCompensatoryReason('');
      this.setManualOvertimeDates([]);
      this.setNewOvertimeDate(null);
      if (
        this.compensatoryTimeoffsApi &&
        typeof this.compensatoryTimeoffsApi.reload === 'function' &&
        this.compensatoryTimeoffsApi.status() !== 'error'
      ) {
        this.compensatoryTimeoffsApi.reload();
      }
    } catch (error: any) {
      console.error('Error submitting compensatory request:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
      });
    } finally {
      this.setSubmittingCompensatory(false);
    }
  }

  // ============================================
  // MÉTODOS PARA VACACIONES
  // ============================================

  /**
   * Valida si se puede enviar la solicitud de vacaciones
   */
  public canSubmitVacation = computed(() => {
    const startDate = this.vacationStartDate();
    const endDate = this.vacationEndDate();

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
    const startDate = this.vacationStartDate();
    const endDate = this.vacationEndDate();

    if (!startDate || !endDate) {
      return 0;
    }

    return this.calculateDaysBetween(startDate, endDate);
  });

  /**
   * Calcula los días entre dos fechas (incluyendo ambos días)
   */
  public calculateDaysBetween(
    dateFrom: Date | string,
    dateTo: Date | string
  ): number {
    try {
      const from = typeof dateFrom === 'string' ? new Date(dateFrom) : dateFrom;
      const to = typeof dateTo === 'string' ? new Date(dateTo) : dateTo;

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return 0;
      }

      return differenceInDays(to, from) + 1; // +1 para incluir ambos días
    } catch (error) {
      console.error('Error calculating days between dates:', error);
      return 0;
    }
  }

  /**
   * Verifica si una fecha es futura
   */
  public isDateFuture(date: Date | string): boolean {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return false;
      }
      return dateObj > new Date();
    } catch (error) {
      console.error('Error checking if date is future:', error);
      return false;
    }
  }

  /**
   * Obtiene todas las solicitudes de vacaciones del empleado
   */
  public myVacationRequests = computed(() => {
    if (this.vacationTimeoffsApi.status() === 'error') {
      return [];
    }
    const requests = this.vacationTimeoffsApi.value() ?? [];
    // Ordenar por fecha de inicio descendente
    return [...requests].sort((a, b) => {
      const dateA = new Date(a.date_from).getTime();
      const dateB = new Date(b.date_from).getTime();
      return dateB - dateA;
    });
  });

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
    // Validaciones
    const startDate = this.vacationStartDate();
    const endDate = this.vacationEndDate();

    if (!startDate || !endDate) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Validación',
        detail: 'Por favor selecciona ambas fechas (inicio y fin)',
      });
      return;
    }

    // Validar que la fecha de inicio no sea pasada
    const today = startOfDay(new Date());
    const start = startOfDay(startDate);
    if (start < today) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Validación',
        detail: 'La fecha de inicio no puede ser anterior a hoy',
      });
      return;
    }

    // Validar que la fecha de fin sea mayor o igual a la de inicio
    const end = startOfDay(endDate);
    if (end < start) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Validación',
        detail: 'La fecha de fin debe ser mayor o igual a la fecha de inicio',
      });
      return;
    }

    const employee = this.currentEmployee();
    if (!employee) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'No se pudo identificar al empleado. Por favor recarga la página.',
      });
      return;
    }

    this.setSubmittingVacation(true);

    try {
      const vacationTypeId = '00000000-0000-0000-0000-000000000001';
      const dateFrom = format(start, 'yyyy-MM-dd');
      const dateTo = format(end, 'yyyy-MM-dd');
      const notes: string[] = [];
      if (this.vacationReason().trim()) {
        notes.push(this.vacationReason().trim());
      }

      const timeoffData: TimeOff = {
        id: v4(),
        employee_id: employee.id,
        type_id: vacationTypeId,
        date_from: startDate,
        date_to: endDate,
        notes,
        is_approved: false,
      };

      const response = await this.employeePortalApi.createTimeoffRequest({
        ...timeoffData,
        date_from: dateFrom,
        date_to: dateTo,
      });

      const timeoffId = Array.isArray(response)
        ? response[0]?.id
        : response?.id;
      if (!timeoffId) {
        throw new Error('No se recibió el ID de la solicitud creada');
      }

      await this.employeePortalApi.notifyHrReviewer(
        timeoffId,
        employee ?? null
      );

      const currentEmp = this.currentEmployee();
      if (currentEmp && timeoffId) {
        await this.employeePortalApi.createHrMessages([
          {
            employee_id: currentEmp.id,
            related_type: 'timeoff',
            related_id: timeoffId,
            message_type: 'vacation_request',
            title: 'Solicitud de vacaciones enviada',
            message: `Tu solicitud de vacaciones del ${format(
              startDate,
              'dd/MM/yyyy'
            )} al ${format(
              endDate,
              'dd/MM/yyyy'
            )} ha sido enviada y está pendiente de revisión.`,
            is_read: false,
          },
        ]);
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Tu solicitud de vacaciones ha sido enviada para revisión. Período: ${format(
          startDate,
          'dd/MM/yyyy'
        )} - ${format(endDate, 'dd/MM/yyyy')}`,
        life: 5000,
      });

      this.resetVacationForm();
      this.reloadVacationRequests();
    } catch (error: any) {
      console.error('Error submitting vacation request:', error);

      let errorMessage =
        'No se pudo enviar la solicitud. Por favor intenta de nuevo.';
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 5000,
      });
    } finally {
      this.setSubmittingVacation(false);
    }
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
    if (
      !this.disabilityStartDate() ||
      !this.disabilityEndDate() ||
      !this.selectedFile()
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos Requeridos',
        detail: 'Por favor completa todos los campos y selecciona un archivo',
      });
      return;
    }

    this.uploadingDisability.set(true);
    try {
      let documentUrl = '';

      // Upload file to Supabase Storage if file is selected
      if (this.selectedFile()) {
        const file = this.selectedFile()!;
        const fileExt = file.name.split('.').pop();
        const fileName = `${
          this.currentEmployee()!.id
        }/${Date.now()}.${fileExt}`;

        // Upload to Supabase Storage using REST API
        try {
          // Usar Service Role Key si está disponible, sino usar API Key pública
          const storageKey =
            process.env['ENV_SUPABASE_SERVICE_ROLE_KEY'] ||
            process.env['ENV_SUPABASE_API_KEY'] ||
            '';

          await firstValueFrom(
            this.http.post(
              `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/disabilities/${fileName}`,
              file, // Enviar el archivo directamente como binario
              {
                headers: {
                  apikey: storageKey,
                  Authorization: `Bearer ${storageKey}`,
                  'Content-Type': file.type || 'application/octet-stream',
                  'x-upsert': 'true', // Permite sobrescribir si el archivo ya existe
                },
              }
            )
          );

          // Get public URL for the uploaded file
          documentUrl = `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/public/disabilities/${fileName}`;
        } catch (uploadError: any) {
          console.error('Error uploading file to storage:', uploadError);
          const errorDetail =
            uploadError?.error?.message ||
            uploadError?.error?.error ||
            uploadError?.message ||
            'No se pudo subir el archivo. Verifica que el bucket existe y tiene las políticas correctas.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error al Subir Archivo',
            detail: errorDetail,
          });
          this.uploadingDisability.set(false);
          return;
        }
      }

      // Create disability record
      const disabilityData = {
        employee_id: this.currentEmployee()!.id,
        start_date: format(this.disabilityStartDate()!, 'yyyy-MM-dd'),
        end_date: format(this.disabilityEndDate()!, 'yyyy-MM-dd'),
        description: this.disabilityDescription() || null,
        document_url: documentUrl || null,
        status: 'pending',
      };

      this.http
        .post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_disabilities`,
          disabilityData
        )
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail:
                'Incapacidad subida correctamente. Está pendiente de revisión.',
            });

            // Reset form
            this.disabilityStartDate.set(null);
            this.disabilityEndDate.set(null);
            this.disabilityDescription.set('');
            this.selectedFile.set(null);
            this.disabilitiesApi.reload();
            this.uploadingDisability.set(false);
          },
          error: (error) => {
            console.error('Error uploading disability:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail:
                error.error?.message ||
                'No se pudo subir la incapacidad. Por favor intenta de nuevo.',
            });
            this.uploadingDisability.set(false);
          },
        });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo subir la incapacidad. Por favor intenta de nuevo.',
      });
      this.uploadingDisability.set(false);
    }
  }

  public async submitDocumentRequest(): Promise<void> {
    const reason = this.documentReason();
    if (!reason.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo Requerido',
        detail: 'Por favor describe el motivo de la solicitud',
      });
      return;
    }

    this.portalStore.setSubmittingDocument(true);

    const documentType =
      this.documentType() === 'other'
        ? this.customDocumentType()
        : this.documentType();

    const requestData = {
      employee_id: this.currentEmployee()!.id,
      document_type: documentType,
      custom_document_type:
        this.documentType() === 'other' ? this.customDocumentType() : null,
      reason: this.documentReason(),
      required_date: this.documentRequiredDate()
        ? format(this.documentRequiredDate()!, 'yyyy-MM-dd')
        : null,
      status: 'pending',
    };

    this.http
      .post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/document_requests`,
        requestData
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail:
              'Solicitud enviada correctamente. Recibirás una notificación cuando esté lista.',
          });

          // Reset form
          this.resetDocumentForm();
          this.documentRequestsApi.reload();
          this.portalStore.setSubmittingDocument(false);
        },
        error: (error) => {
          console.error('Error submitting document request:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error.error?.message ||
              'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
          });
          this.portalStore.setSubmittingDocument(false);
        },
      });
  }

  public async submitComplaint(): Promise<void> {
    if (!this.canSubmitComplaint()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sugerencia Muy Corta',
        detail: 'Por favor describe tu sugerencia con al menos 10 caracteres',
      });
      return;
    }

    this.portalStore.setSubmittingComplaint(true);

    const allowContact = this.allowContact();
    const complaintData = {
      employee_id: allowContact ? this.currentEmployee()!.id : null,
      creator_employee_id: this.currentEmployee()!.id,
      category: this.complaintCategory(),
      complaint: this.complaintText(),
      allow_contact: allowContact,
      contact_method: allowContact ? this.contactMethod() : null,
      status: 'pending',
    };

    this.http
      .post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints`,
        complaintData,
        {
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        }
      )
      .subscribe({
        next: async (response: any) => {
          const complaint = Array.isArray(response) ? response[0] : response;

          if (complaint && complaint.id) {
            const messageData = {
              complaint_id: complaint.id,
              sender_id: allowContact ? this.currentEmployee()!.id : null,
              sender_type: 'employee',
              is_anonymous: !allowContact,
              message: this.complaintText().trim(),
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
                summary: 'Sugerencia Enviada',
                detail: allowContact
                  ? 'Tu sugerencia ha sido enviada. Recibirás respuesta de RRHH pronto.'
                  : 'Tu sugerencia ha sido enviada de forma anónima. Recibirás respuesta de RRHH pronto.',
              });

              this.portalStore.setComplaintText('');
              this.portalStore.setComplaintCategory('work_environment');
              this.portalStore.setAllowContact(false);
              this.complaintsApi.reload();
              this.portalStore.setSubmittingComplaint(false);
            } catch (messageError: any) {
              console.error('Error creating message:', messageError);
              this.messageService.add({
                severity: 'warn',
                summary: 'Sugerencia Enviada',
                detail:
                  'La sugerencia fue creada pero hubo un problema al crear el mensaje. Contacta a RRHH si no recibes respuesta.',
              });
              this.complaintsApi.reload();
              this.portalStore.setSubmittingComplaint(false);
            }
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo obtener el ID de la sugerencia creada',
            });
            this.portalStore.setSubmittingComplaint(false);
          }
        },
        error: (error: any) => {
          console.error('Error submitting complaint:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error?.error?.message ||
              error?.message ||
              'No se pudo enviar la sugerencia. Por favor intenta de nuevo.',
          });
          this.portalStore.setSubmittingComplaint(false);
        },
      });
  }

  public getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      work_letter: 'Carta de Trabajo',
      salary_certificate: 'Certificado de Salario',
      employment_certificate: 'Certificado de Empleo',
      other: 'Otro',
    };
    return labels[type] || type;
  }

  public getComplaintCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      work_environment: 'Ambiente Laboral',
      harassment: 'Acoso o Discriminación',
      safety: 'Seguridad',
      management: 'Supervisión/Gerencia',
      benefits: 'Beneficios',
      other: 'Otro',
    };
    return labels[category] || category;
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
    this.conversationDialogVisible.set(true);
    this.replyMessage.set('');
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
    this.conversationDialogVisible.set(false);
    this.selectedComplaint.set(null);
    this.replyMessage.set('');
    // Recargar quejas para actualizar contadores
    this.complaintsApi.reload();
  }

  public async sendReply(): Promise<void> {
    const complaint = this.selectedComplaint();
    if (!complaint || !this.replyMessage().trim()) return;

    this.sendingReply.set(true);
    const currentEmployee = this.currentEmployee();
    if (!currentEmployee) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar al usuario actual',
      });
      this.sendingReply.set(false);
      return;
    }

    const messageData = {
      complaint_id: complaint.id,
      sender_id: currentEmployee.id,
      sender_type: 'employee',
      is_anonymous: false, // Si la queja ya tiene employee_id, no puede ser anónima
      message: this.replyMessage().trim(),
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

      this.replyMessage.set('');
      this.complaintMessagesApi.reload();
      this.complaintsApi.reload();
      this.sendingReply.set(false);
    } catch (error: any) {
      console.error('Error sending reply:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo enviar el mensaje',
      });
      this.sendingReply.set(false);
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
