import { DatePipe, NgClass, NgStyle } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format, startOfDay, endOfDay, isToday, parseISO, addDays, addWeeks, subWeeks, getDate, isMonday, isWeekend, nextMonday, previousMonday, nextSunday, isWithinInterval, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDate } from 'date-fns-tz';
import { MessageService } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { Menu } from 'primeng/menu';
import { Popover } from 'primeng/popover';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';
import { BranchesStore } from '../stores/branches.store';
import { Employee, Branch, colorVariants } from '../models';
import { CompensatoryRequest } from './hr-disabilities.component';
import { EmployeeSchedulesFormComponent } from './employee-schedules-form.component';
import { BranchManagerGestionesComponent } from './branch-manager-gestiones.component';

type Notification = {
  id: string;
  type: 'delay' | 'on_time' | 'missing' | 'early_exit' | 'lunch_exceeded' | 'timelog_entry' | 'timelog_exit' | 'timelog_lunch_start' | 'timelog_lunch_end' | 'complaint' | 'other';
  recipient_id: string;
  branch_id: string;
  title: string;
  message: string;
  created_at: Date;
  is_read: boolean;
  read_at?: Date;
  related_entity_id?: string;
  related_entity_type?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
};

type Reminder = {
  id: string;
  employee_id?: string;
  employee?: Employee;
  message: string;
  due_date: Date;
  is_completed: boolean;
  created_at: Date;
};

@Component({
  selector: 'pt-branch-manager',
  standalone: true,
  imports: [
    Card,
    TabsModule,
    TableModule,
    Button,
    Tag,
    Avatar,
    TooltipModule,
    ToastModule,
    DatePicker,
    Select,
    FormsModule,
    Textarea,
    DatePipe,
    NgClass,
    Menu,
    Popover,
    InputText,
    BranchManagerGestionesComponent,
  ],
  providers: [DynamicDialogRef, DialogService, ConfirmationService],
  template: `
    <div [ngClass]="{ 'naz-theme': isNaz() }" class="p-4 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold mb-1">Gestión de Tienda</h1>
          <p class="text-gray-400">
            @if (isAdmin()) {
              <span>Administración de sucursales</span>
            } @else {
              <span>{{ currentBranch()?.name || 'Sucursal' }}</span>
            }
          </p>
        </div>
        <div class="flex items-center gap-3">
          @if (isAdmin()) {
          <div class="flex items-center gap-2">
            <label class="text-sm text-gray-400 whitespace-nowrap">Sucursal:</label>
            <p-select
              [options]="availableBranches()"
              optionLabel="name"
              optionValue="id"
              [(ngModel)]="selectedBranchId"
              placeholder="Todas las sucursales"
              showClear
              appendTo="body"
              styleClass="w-64"
              (ngModelChange)="onBranchChange()"
            />
          </div>
          }
          @if (unreadNotificationsCount() > 0) {
          <p-button
            icon="pi pi-bell"
            severity="warn"
            [badge]="unreadNotificationsCount().toString()"
            rounded
            (onClick)="markAllNotificationsAsRead()"
            pTooltip="Marcar todas como leídas"
          />
          }
        </div>
      </div>

      <!-- Dashboard de Métricas -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 pt-0 pb-6">
        <!-- Notificaciones no leídas -->
        <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 text-white shadow-lg">
          <div class="flex items-center justify-between mb-1">
            <i class="pi pi-bell text-xl opacity-80"></i>
            <span class="text-2xl font-bold">{{ unreadNotificationsCount() }}</span>
          </div>
          <p class="text-blue-100 text-xs">Notificaciones pendientes</p>
        </div>

        <!-- Empleados del día -->
        <div class="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 text-white shadow-lg">
          <div class="flex items-center justify-between mb-1">
            <i class="pi pi-users text-xl opacity-80"></i>
            <span class="text-2xl font-bold">{{ todayStats().totalEmployees }}</span>
          </div>
          <p class="text-green-100 text-xs">Empleados hoy</p>
        </div>

        <!-- Retrasos -->
        <div class="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-4 text-white shadow-lg">
          <div class="flex items-center justify-between mb-1">
            <i class="pi pi-clock text-xl opacity-80"></i>
            <span class="text-2xl font-bold">{{ todayStats().delayed }}</span>
          </div>
          <p class="text-red-100 text-xs">Retrasos hoy</p>
        </div>

        <!-- Recordatorios pendientes -->
        <div class="bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg p-4 text-white shadow-lg">
          <div class="flex items-center justify-between mb-1">
            <i class="pi pi-bookmark text-xl opacity-80"></i>
            <span class="text-2xl font-bold">{{ pendingRemindersCount() }}</span>
          </div>
          <p class="text-amber-100 text-xs">Recordatorios pendientes</p>
        </div>
      </div>

      <!-- Card Principal -->
      <p-card>

        <p-tabs value="schedules">
          <p-tablist>
            <p-tab value="schedules">
              <i class="pi pi-calendar mr-2"></i>
              Horarios
            </p-tab>
            <p-tab value="timelogs">
              <i class="pi pi-clock mr-2"></i>
              Marcaciones
            </p-tab>
            <p-tab value="gestiones">
              <i class="pi pi-file-edit mr-2"></i>
              Gestiones
            </p-tab>
            <p-tab value="employee-requests">
              <i class="pi pi-list mr-2"></i>
              Mis Solicitudes de Empleados
            </p-tab>
            <p-tab value="reminders">
              <i class="pi pi-bookmark mr-2"></i>
              Recordatorios
              @if (pendingRemindersCount() > 0) {
              <span
                class="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold"
              >
                {{ pendingRemindersCount() }}
              </span>
              }
            </p-tab>
          </p-tablist>

          <p-tabpanel value="employee-requests">
            <div class="space-y-4">
              <!-- Filtros -->
              <div class="flex gap-2 items-center flex-wrap justify-between bg-neutral-800/50 p-4 rounded-lg">
                <div class="flex gap-2 items-center flex-wrap">
                  <p-select
                    [options]="[
                      { label: 'Todos', value: null },
                      { label: 'Compensatorio', value: 'compensatorio' },
                      { label: 'Incapacidades', value: 'incapacidad' },
                      { label: 'Vacaciones', value: 'vacaciones' },
                      { label: 'Documentos', value: 'documentos' }
                    ]"
                    optionLabel="label"
                    optionValue="value"
                    [(ngModel)]="requestTypeFilter"
                    placeholder="Filtrar por tipo"
                    showClear
                    appendTo="body"
                    styleClass="w-48"
                  />
                  <p-select
                    [options]="[
                      { label: 'Todos', value: null },
                      { label: 'Pendiente', value: 'pending' },
                      { label: 'Aprobado', value: 'approved' },
                      { label: 'Rechazado', value: 'rejected' }
                    ]"
                    optionLabel="label"
                    optionValue="value"
                    [(ngModel)]="requestStatusFilter"
                    placeholder="Filtrar por estado"
                    showClear
                    appendTo="body"
                    styleClass="w-48"
                  />
                  <p-button
                    icon="pi pi-refresh"
                    label="Actualizar"
                    severity="secondary"
                    (onClick)="refreshEmployeeRequests()"
                    [loading]="compensatoryTimeoffsApi.isLoading() || disabilitiesApi.isLoading() || vacationsApi.isLoading() || documentRequestsApi.isLoading()"
                  />
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-400">
                  <i class="pi pi-info-circle"></i>
                  <span>{{ filteredBranchEmployeeRequests().length }} solicitud(es)</span>
                </div>
              </div>

              <!-- Loading State -->
              @if (compensatoryTimeoffsApi.isLoading() || disabilitiesApi.isLoading() || vacationsApi.isLoading() || documentRequestsApi.isLoading()) {
              <div class="flex justify-center py-12">
                <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
              </div>
              }
              
              <!-- Empty State -->
              @else if (filteredBranchEmployeeRequests().length === 0) {
              <div class="text-center py-12">
                <i class="pi pi-inbox text-6xl text-gray-400 mb-4"></i>
                <p class="text-gray-400 text-lg">No hay solicitudes de empleados</p>
                <p class="text-gray-500 text-sm mt-2">Las solicitudes creadas en "Gestiones" aparecerán aquí</p>
              </div>
              }
              
              <!-- Requests List -->
              @else {
              <div class="grid grid-cols-1 gap-3">
                @for (request of filteredBranchEmployeeRequests(); track request.id) {
                <div
                  class="border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer"
                  [ngClass]="{
                    'border-cyan-500 bg-cyan-500/5': request.requestType === 'compensatorio',
                    'border-blue-500 bg-blue-500/5': request.requestType === 'incapacidad',
                    'border-purple-500 bg-purple-500/5': request.requestType === 'vacaciones',
                    'border-green-500 bg-green-500/5': request.requestType === 'documentos'
                  }"
                  (click)="viewRequestDetails(request)"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex items-start gap-3 flex-1">
                      <!-- Icono según tipo -->
                      <div class="mt-1 w-10 h-10 rounded-full flex items-center justify-center"
                        [ngClass]="{
                          'bg-cyan-500/20': request.requestType === 'compensatorio',
                          'bg-blue-500/20': request.requestType === 'incapacidad',
                          'bg-purple-500/20': request.requestType === 'vacaciones',
                          'bg-green-500/20': request.requestType === 'documentos'
                        }">
                        <i class="pi"
                          [ngClass]="{
                            'pi-clock text-cyan-400': request.requestType === 'compensatorio',
                            'pi-file-plus text-blue-400': request.requestType === 'incapacidad',
                            'pi-calendar-plus text-purple-400': request.requestType === 'vacaciones',
                            'pi-file-edit text-green-400': request.requestType === 'documentos'
                          }"></i>
                      </div>

                      <div class="flex-1">
                        <!-- Header con tipo y fecha -->
                        <div class="flex items-center gap-2 mb-2">
                          <p-tag
                            [value]="getRequestTypeLabel(request.requestType)"
                            [severity]="getRequestTypeSeverity(request.requestType)"
                            styleClass="text-xs"
                          />
                          <p-tag
                            [value]="getRequestStatusLabel(request)"
                            [severity]="getRequestStatusSeverity(request)"
                            styleClass="text-xs"
                          />
                          <span class="text-xs text-gray-400">
                            {{ request.created_at | date : 'dd/MM/yyyy HH:mm' }}
                          </span>
                        </div>

                        <!-- Información del empleado -->
                        <div class="flex items-center gap-2 mb-2">
                          <p-avatar
                            [label]="getEmployeeInitials(request.employee)"
                            shape="circle"
                            styleClass="text-xs"
                          />
                          <span class="text-sm font-semibold text-white">
                            {{ request.employee?.first_name }} {{ request.employee?.father_name }}
                          </span>
                        </div>

                        <!-- Detalles según tipo -->
                        <div class="text-sm text-gray-300">
                          @if (request.requestType === 'compensatorio') {
                            <p><span class="text-gray-400">Período:</span> {{ request.date_from | date : 'dd/MM/yyyy' }} - {{ request.date_to | date : 'dd/MM/yyyy' }}</p>
                            <p><span class="text-gray-400">Tipo:</span> {{ request.compensatory_type === 'hours' ? 'Horas' : 'Días' }}</p>
                            <p><span class="text-gray-400">Cantidad:</span> {{ request.compensatory_amount }} {{ request.compensatory_type === 'hours' ? 'hora(s)' : 'día(s)' }}</p>
                          }
                          @else if (request.requestType === 'incapacidad') {
                            <p><span class="text-gray-400">Período:</span> {{ request.start_date | date : 'dd/MM/yyyy' }} - {{ request.end_date | date : 'dd/MM/yyyy' }}</p>
                            <p><span class="text-gray-400">Descripción:</span> {{ request.description }}</p>
                          }
                          @else if (request.requestType === 'vacaciones') {
                            <p><span class="text-gray-400">Período:</span> {{ request.start_date | date : 'dd/MM/yyyy' }} - {{ request.end_date | date : 'dd/MM/yyyy' }}</p>
                            @if (request.reason) {
                              <p><span class="text-gray-400">Razón:</span> {{ request.reason }}</p>
                            }
                          }
                          @else if (request.requestType === 'documentos') {
                            <p><span class="text-gray-400">Tipo de documento:</span> {{ request.document_type }}</p>
                            <p><span class="text-gray-400">Fecha requerida:</span> {{ request.required_date | date : 'dd/MM/yyyy' }}</p>
                            @if (request.reason) {
                              <p><span class="text-gray-400">Razón:</span> {{ request.reason }}</p>
                            }
                          }
                        </div>

                        <!-- Indicador de documento adjunto -->
                        @if (request.document_url) {
                        <div class="mt-2 flex items-center gap-1 text-xs text-gray-400">
                          <i class="pi pi-paperclip"></i>
                          <span>Documento adjunto</span>
                        </div>
                        }
                      </div>
                    </div>

                    <!-- Botón para ver detalles -->
                    <p-button
                      icon="pi pi-eye"
                      severity="secondary"
                      text
                      rounded
                      pTooltip="Ver detalles"
                      (onClick)="viewRequestDetails(request); $event.stopPropagation()"
                    />
                  </div>
                </div>
                }
              </div>
              }
            </div>
          </p-tabpanel>

          <p-tabpanel value="timelogs">
            <div class="space-y-4">
              <!-- Filtros y acciones -->
              <div class="flex gap-2 items-center flex-wrap justify-between bg-neutral-800/50 p-4 rounded-lg">
                <div class="flex gap-2 items-center flex-wrap">
                  <p-select
                    [options]="branchEmployees()"
                    optionLabel="short_name"
                    optionValue="id"
                    [(ngModel)]="selectedEmployeeId"
                    placeholder="Filtrar por empleado"
                    showClear
                    filter
                    appendTo="body"
                    styleClass="w-64"
                  />
                  <p-datepicker
                    [(ngModel)]="selectedDate"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Fecha"
                    appendTo="body"
                    (onSelect)="refreshTimelogs()"
                  />
                </div>
                <p-button
                  icon="pi pi-refresh"
                  label="Actualizar"
                  severity="secondary"
                  (onClick)="refreshTimelogs()"
                  [loading]="timelogsResource.isLoading()"
                />
              </div>

              <!-- Estadísticas rápidas del día -->
              @if (todayStats().totalEmployees > 0) {
              <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div class="bg-green-600/20 border border-green-600/30 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-green-400">{{ todayStats().onTime }}</div>
                  <div class="text-xs text-gray-400 mt-1">A tiempo</div>
                </div>
                <div class="bg-red-600/20 border border-red-600/30 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-red-400">{{ todayStats().delayed }}</div>
                  <div class="text-xs text-gray-400 mt-1">Retrasos</div>
                </div>
                <div class="bg-amber-600/20 border border-amber-600/30 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-amber-400">{{ todayStats().missing }}</div>
                  <div class="text-xs text-gray-400 mt-1">Sin marcar</div>
                </div>
                <div class="bg-orange-600/20 border border-orange-600/30 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-orange-400">{{ todayStats().lunchExceeded }}</div>
                  <div class="text-xs text-gray-400 mt-1">Almuerzo excedido</div>
                </div>
                <div class="bg-purple-600/20 border border-purple-600/30 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-purple-400">{{ todayStats().earlyExit }}</div>
                  <div class="text-xs text-gray-400 mt-1">Salida temprana</div>
                </div>
              </div>
              }

              <p-table
                [value]="filteredTimelogs()"
                [loading]="timelogsResource.isLoading()"
                [paginator]="true"
                [rows]="25"
                [rowsPerPageOptions]="[10, 25, 50]"
                styleClass="p-datatable-striped"
                [scrollable]="true"
                scrollHeight="600px"
              >
                <ng-template #header>
                  <tr>
                    <th style="min-width: 200px">Empleado</th>
                    <th style="min-width: 120px">Entrada</th>
                    <th style="min-width: 120px">Inicio Almuerzo</th>
                    <th style="min-width: 120px">Fin Almuerzo</th>
                    <th style="min-width: 120px">Salida</th>
                    <th style="min-width: 200px">Estado</th>
                  </tr>
                </ng-template>
                <ng-template #body let-log>
                  <tr
                    [ngClass]="{
                      'bg-red-50/5': log.is_delayed || log.is_missing || log.lunch_exceeded || log.is_early_exit,
                      'bg-green-50/5': !log.is_delayed && !log.is_missing && !log.lunch_exceeded && !log.is_early_exit && log.entry_time
                    }"
                  >
                    <td>
                      <div class="flex items-center gap-3">
                        <p-avatar
                          [label]="getEmployeeInitials(log.employee)"
                          shape="circle"
                          styleClass="bg-blue-600"
                        />
                        <div>
                          <div class="font-semibold">
                            {{ log.employee?.first_name }} {{ log.employee?.father_name }}
                          </div>
                          @if (log.employee?.employee_number) {
                          <div class="text-xs text-gray-400">
                            #{{ log.employee.employee_number }}
                          </div>
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (log.entry_time) {
                      <div class="flex items-center gap-2">
                        <i class="pi pi-sign-in text-green-400"></i>
                        <span
                          [ngClass]="{
                            'text-red-400 font-semibold': log.is_delayed,
                            'text-green-400': !log.is_delayed
                          }"
                        >
                          {{ log.entry_time | date : 'HH:mm' }}
                        </span>
                      </div>
                      } @else {
                      <span class="text-gray-500 flex items-center gap-2">
                        <i class="pi pi-times"></i>
                        Sin entrada
                      </span>
                      }
                    </td>
                    <td>
                      @if (log.lunch_start_time) {
                      <div class="flex items-center gap-2">
                        <i class="pi pi-clock text-blue-400"></i>
                        <span>{{ log.lunch_start_time | date : 'HH:mm' }}</span>
                      </div>
                      } @else {
                      <span class="text-gray-500">-</span>
                      }
                    </td>
                    <td>
                      @if (log.lunch_end_time) {
                      <div class="flex items-center gap-2">
                        <i class="pi pi-clock text-blue-400"></i>
                        <span
                          [ngClass]="{
                            'text-red-400 font-semibold': log.lunch_exceeded
                          }"
                        >
                          {{ log.lunch_end_time | date : 'HH:mm' }}
                        </span>
                      </div>
                      } @else {
                      <span class="text-gray-500">-</span>
                      }
                    </td>
                    <td>
                      @if (log.exit_time) {
                      <div class="flex items-center gap-2">
                        <i class="pi pi-sign-out text-purple-400"></i>
                        <span
                          [ngClass]="{
                            'text-red-400 font-semibold': log.is_early_exit,
                            'text-purple-400': !log.is_early_exit
                          }"
                        >
                          {{ log.exit_time | date : 'HH:mm' }}
                        </span>
                      </div>
                      } @else {
                      <span class="text-gray-500 flex items-center gap-2">
                        <i class="pi pi-times"></i>
                        Sin salida
                      </span>
                      }
                    </td>
                    <td>
                      <div class="flex gap-1 flex-wrap">
                        @if (log.is_delayed) {
                        <p-tag
                          value="Retraso"
                          severity="danger"
                          icon="pi pi-clock"
                          styleClass="text-xs"
                        />
                        }
                        @if (log.is_missing) {
                        <p-tag
                          value="Sin marcar"
                          severity="warn"
                          icon="pi pi-exclamation-triangle"
                          styleClass="text-xs"
                        />
                        }
                        @if (log.lunch_exceeded) {
                        <p-tag
                          value="Almuerzo excedido"
                          severity="danger"
                          icon="pi pi-clock"
                          styleClass="text-xs"
                        />
                        }
                        @if (log.is_early_exit) {
                        <p-tag
                          value="Salida temprana"
                          severity="danger"
                          icon="pi pi-arrow-down"
                          styleClass="text-xs"
                        />
                        }
                        @if (!log.is_delayed && !log.is_missing && !log.lunch_exceeded && !log.is_early_exit && log.entry_time) {
                        <p-tag
                          value="A tiempo"
                          severity="success"
                          icon="pi pi-check"
                          styleClass="text-xs"
                        />
                        }
                      </div>
                    </td>
                  </tr>
                </ng-template>
                <ng-template #emptymessage>
                  <tr>
                    <td [attr.colspan]="6" class="text-center py-12">
                      <div class="flex flex-col items-center gap-3">
                        <i class="pi pi-inbox text-6xl text-gray-500"></i>
                        <p class="text-gray-400 text-lg">No hay marcaciones para esta fecha</p>
                      </div>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabpanel>

          <p-tabpanel value="gestiones">
            <pt-branch-manager-gestiones
              [branchEmployees]="branchEmployees()"
              [currentBranch]="currentBranch()"
              [currentEmployee]="currentEmployee()"
            />
          </p-tabpanel>

          <p-tabpanel value="schedules">
            <div class="space-y-4">
              <!-- Filtros y controles -->
              <div class="flex lg:flex-row flex-col gap-2 mb-4">
                <input
                  pInputText
                  type="text"
                  [(ngModel)]="employeeSearchForSchedule"
                  placeholder="Buscar empleado por nombre..."
                  class="w-full lg:w-auto flex-1 text-sm"
                />
                <p-select
                  fluid
                  [(ngModel)]="currentPositionForSchedule"
                  [options]="store.positions.entities()"
                  appendTo="body"
                  placeholder="TODOS LOS PUESTOS"
                  filter
                  showClear
                  optionLabel="name"
                  optionValue="id"
                  class="w-full lg:w-auto flex-1 text-sm"
                />
                <div class="flex w-full lg:w-auto">
                  <p-menu
                    #scheduleMenu
                    [model]="scheduleMenuItems"
                    [popup]="true"
                    appendTo="body"
                  />
                  <p-button
                    (click)="scheduleMenu.toggle($event)"
                    [label]="currentWeekLabel()"
                    icon="pi pi-calendar"
                    rounded
                    severity="secondary"
                    outlined
                    size="small"
                    class="w-full lg:w-auto whitespace-nowrap text-sm"
                  />
                </div>
              </div>

              <!-- Tabla semanal -->
              <p-table
                [value]="employeeSchedulesList()"
                paginator
                [rows]="10"
                [tableStyle]="{ 'min-width': '50rem' }"
                [rowsPerPageOptions]="[10, 20, 50]"
                paginatorDropdownAppendTo="body"
                [loading]="schedulesResource.isLoading()"
              >
                <ng-template #header>
                  <tr>
                    <th pFrozenColumn>Nombre</th>
                    <th>Cargo</th>
                    @for(day of weekDays(); track day.date){
                    <th class="text-center min-w-[100px] max-w-[100px]">
                      <div class="flex flex-col items-center gap-0 leading-[1.1]">
                        <span class="text-xs font-bold uppercase">{{
                          day.date | date : 'EEE'
                        }}</span>
                        <span class="text-[10px]">{{
                          day.date | date : 'd MMM'
                        }}</span>
                      </div>
                    </th>
                    }
                  </tr>
                </ng-template>
                <ng-template #body let-item>
                  <tr>
                    <td pFrozenColumn>{{ item.first_name }} {{ item.father_name }}</td>
                    <td>{{ item.position?.name || '-' }}</td>
                    @for(day of item.days; track day.date){
                    <td class="text-center">
                      @if(day.shift) {
                      <div
                        class="inline-flex gap-1 py-0.5 px-1.5 rounded-sm font-medium items-center justify-center text-[11px] cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border border-black/20 shadow-sm"
                        [class]="colorVariants[day.shift.schedule?.color]"
                        [ngClass]="{
                          'opacity-60 hover:opacity-100': !day.shift.approved,
                          'ring-1 ring-amber-400/70 shadow-md': day.shift.approved
                        }"
                        [pTooltip]="getScheduleTooltip(day.shift)"
                        tooltipPosition="top"
                        (click)="scheduleOptions.toggle($event)"
                      >
                        <span class="truncate max-w-[65px] font-semibold leading-tight">
                          {{ day.shift.schedule?.name }}
                        </span>
                        @if(day.shift.approved) {
                        <i
                          class="pi pi-check-circle text-green-400 text-[9px] ml-0.5 flex-shrink-0"
                        ></i>
                        } @else {
                        <i
                          class="pi pi-exclamation-circle text-yellow-200 text-[9px] ml-0.5 animate-pulse flex-shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
                        ></i>
                        }
                      </div>
                      <p-popover #scheduleOptions>
                        <div>
                          <span class="font-medium block mb-2">Opciones</span>
                          <ul class="list-none flex flex-col">
                            <li
                              class="flex items-center gap-2 p-2 hover:bg-neutral-700 cursor-pointer rounded-md"
                              (click)="editSchedule({ employee_schedule: day.shift })"
                            >
                              <i class="pi pi-pencil text-blue-600"></i>
                              Editar
                            </li>
                            <li
                              class="flex items-center gap-2 p-2 hover:bg-neutral-700 cursor-pointer rounded-md"
                              (click)="deleteSchedule(day.shift.id)"
                            >
                              <i class="pi pi-trash text-red-700"></i>
                              Eliminar
                            </li>
                            @if(store.isScheduleApprover()) {
                            <li
                              class="flex items-center gap-2 p-2 hover:bg-neutral-700 cursor-pointer rounded-md"
                              (click)="approveSchedule(day.shift.id)"
                            >
                              <i class="pi pi-check-circle text-green-700"></i>
                              Aprobar
                            </li>
                            }
                          </ul>
                        </div>
                      </p-popover>
                      } @else {
                      <p-button
                        icon="pi pi-plus"
                        outlined
                        size="small"
                        severity="secondary"
                        (onClick)="
                          editSchedule({ employee_id: item.id, date: day.date })
                        "
                        class="hover:bg-neutral-700 hover:border-amber-400 hover:text-amber-400 transition-all"
                      />
                      }
                    </td>
                    }
                  </tr>
                </ng-template>
                <ng-template #emptymessage>
                  <tr>
                    <td [attr.colspan]="9" class="text-center py-12">
                      <div class="flex flex-col items-center gap-3">
                        <i class="pi pi-inbox text-6xl text-gray-500"></i>
                        <p class="text-gray-400 text-lg">No hay horarios asignados</p>
                      </div>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabpanel>

          <p-tabpanel value="reminders">
            <div class="space-y-4">
              <div class="flex gap-2 items-center flex-wrap">
                <p-select
                  [options]="branchEmployees()"
                  optionLabel="short_name"
                  optionValue="id"
                  [(ngModel)]="selectedEmployeeForReminder"
                  placeholder="Seleccionar empleado (opcional)"
                  showClear
                  filter
                  appendTo="body"
                  styleClass="w-64"
                />
                <p-button
                  icon="pi pi-plus"
                  label="Nuevo Recordatorio"
                  severity="success"
                  (onClick)="showReminderDialog.set(true)"
                />
                <p-button
                  icon="pi pi-refresh"
                  label="Actualizar"
                  severity="secondary"
                  (onClick)="refreshReminders()"
                  [loading]="remindersResource.isLoading()"
                />
              </div>

              <p-table
                [value]="filteredReminders()"
                [loading]="remindersResource.isLoading()"
                [paginator]="true"
                [rows]="25"
                [rowsPerPageOptions]="[10, 25, 50]"
                styleClass="p-datatable-sm"
              >
                <ng-template #header>
                  <tr>
                    <th>Empleado</th>
                    <th>Mensaje</th>
                    <th>Fecha Límite</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </ng-template>
                <ng-template #body let-reminder>
                  <tr
                    [ngClass]="{
                      'opacity-60': reminder.is_completed
                    }"
                  >
                    <td>
                      @if (reminder.employee) {
                      <div class="flex items-center gap-2">
                        <p-avatar
                          [label]="getEmployeeInitials(reminder.employee)"
                          shape="circle"
                        />
                        <span>
                          {{ reminder.employee?.first_name }} {{ reminder.employee?.father_name }}
                        </span>
                      </div>
                      } @else {
                      <span class="text-gray-500">Todos</span>
                      }
                    </td>
                    <td>{{ reminder.message }}</td>
                    <td>
                      <span
                        [ngClass]="{
                          'text-red-500 font-semibold': isOverdue(reminder)
                        }"
                      >
                        {{ reminder.due_date | date : 'short' }}
                      </span>
                    </td>
                    <td>
                      @if (reminder.is_completed) {
                      <p-tag
                        value="Completado"
                        severity="success"
                        icon="pi pi-check"
                      />
                      } @else if (isOverdue(reminder)) {
                      <p-tag
                        value="Vencido"
                        severity="danger"
                        icon="pi pi-exclamation-triangle"
                      />
                      } @else {
                      <p-tag
                        value="Pendiente"
                        severity="warn"
                        icon="pi pi-clock"
                      />
                      }
                    </td>
                    <td>
                      <div class="flex gap-1">
                        @if (!reminder.is_completed) {
                        <p-button
                          icon="pi pi-check"
                          severity="success"
                          text
                          rounded
                          (onClick)="completeReminder(reminder.id)"
                          pTooltip="Marcar como completado"
                        />
                        }
                        <p-button
                          icon="pi pi-trash"
                          severity="danger"
                          text
                          rounded
                          (onClick)="deleteReminder(reminder.id)"
                          pTooltip="Eliminar"
                        />
                      </div>
                    </td>
                  </tr>
                </ng-template>
                <ng-template #emptymessage>
                  <tr>
                    <td [attr.colspan]="5" class="text-center py-8">
                      <div class="flex flex-col items-center gap-2">
                        <i class="pi pi-inbox text-4xl text-gray-500"></i>
                        <p class="text-gray-400">No hay recordatorios</p>
                      </div>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabpanel>
        </p-tabs>
      </p-card>

      <!-- Dialog para crear recordatorio -->
      @if (showReminderDialog()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="showReminderDialog.set(false)"
      >
        <div
          class="bg-neutral-800 rounded-lg p-6 max-w-md w-full"
          (click)="$event.stopPropagation()"
        >
          <h3 class="text-xl font-bold mb-4">Nuevo Recordatorio</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Empleado</label>
              <p-select
                [options]="branchEmployees()"
                optionLabel="short_name"
                optionValue="id"
                [(ngModel)]="newReminderEmployeeId"
                placeholder="Todos (opcional)"
                showClear
                filter
                appendTo="body"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Mensaje</label>
              <textarea
                pTextarea
                [(ngModel)]="newReminderMessage"
                placeholder="Escribe el recordatorio..."
                rows="4"
                class="w-full"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Fecha Límite</label>
              <p-datepicker
                [(ngModel)]="newReminderDueDate"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                [showTime]="true"
                hourFormat="12"
                appendTo="body"
              />
            </div>
            <div class="flex gap-2 justify-end">
              <p-button
                label="Cancelar"
                severity="secondary"
                (onClick)="showReminderDialog.set(false)"
              />
              <p-button
                label="Crear"
                severity="success"
                (onClick)="createReminder()"
                [disabled]="!newReminderMessage || !newReminderDueDate"
              />
            </div>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: `
    ::ng-deep .p-tablist {
      margin-bottom: 1rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchManagerComponent {
  private http = inject(HttpClient);
  private message = inject(MessageService);
  private apiUrl = inject(ApiUrlService);
  private dialog = inject(DialogService);
  public store = inject(DashboardStore);
  private employeesStore = inject(EmployeesStore);
  private branchesStore = inject(BranchesStore);
  private organizationService = inject(OrganizationService);

  public isNaz = computed(() => this.organizationService.isNaz());
  public isAdmin = computed(() => this.store.isAdmin());
  public currentBranchFromStore = computed(() => this.store.currentBranch());
  public selectedBranchId = signal<string | null>(null);
  
  // Si es admin, puede seleccionar cualquier sucursal, si no, usa su sucursal
  public currentBranch = computed(() => {
    if (this.isAdmin()) {
      const branchId = this.selectedBranchId();
      if (branchId) {
        return this.branchesStore.entities().find(b => b.id === branchId) || null;
      }
      return this.currentBranchFromStore();
    }
    return this.currentBranchFromStore();
  });
  
  // Lista de sucursales para el selector (solo para admins)
  public availableBranches = computed(() => {
    if (!this.isAdmin()) return [];
    return this.branchesStore.entities().filter(b => b.is_active);
  });

  // Signals
  public notificationTypeFilter = signal<string | null>(null);
  public selectedEmployeeId = signal<string | null>(null);
  public selectedDate = signal<Date>(new Date());
  public selectedEmployeeForSchedule = signal<string | null>(null);
  public selectedEmployeeForReminder = signal<string | null>(null);
  public showReminderDialog = signal(false);
  public newReminderEmployeeId = signal<string | null>(null);
  public newReminderMessage = signal('');
  public newReminderDueDate = signal<Date | null>(null);
  
  // Vista semanal de horarios
  public currentDateForSchedule = signal<Date>(new Date());
  public employeeSearchForSchedule = model<string>('');
  public currentPositionForSchedule = signal<string | null>(null);
  
  private confirm = inject(ConfirmationService);

  // Notification type options
  public notificationTypeOptions = [
    { label: 'Todas', value: null },
    { label: 'Retrasos', value: 'delay' },
    { label: 'A tiempo', value: 'on_time' },
    { label: 'Sin marcar', value: 'missing' },
    { label: 'Salida temprana', value: 'early_exit' },
    { label: 'Almuerzo excedido', value: 'lunch_exceeded' },
  ];

  // Color variants (imported from models)
  public colorVariants = colorVariants;

  // Branch employees
  public branchEmployees = computed(() => {
    const branchId = this.currentBranch()?.id;
    const currentEmpId = this.currentEmployee()?.id;
    let employees = this.employeesStore.employeesList().filter((emp) => emp.is_active);
    // Si hay sucursal seleccionada (o es gerente), filtrar por sucursal
    if (branchId) {
      employees = employees.filter((emp) => emp.branch_id === branchId);
    }
    // Excluir al gerente mismo de la lista
    if (currentEmpId) {
      employees = employees.filter((emp) => emp.id !== currentEmpId);
    }
    // Retornar los empleados completos con short_name agregado
    return employees.map((emp) => ({
      ...emp,
      short_name: `${emp.first_name} ${emp.father_name}`,
    }));
  });

  // Current employee (branch manager)
  public currentEmployee = computed(() => this.store.currentEmployee());

  // Compensatory timeoffs API
  public compensatoryTimeoffsApi = httpResource<CompensatoryRequest[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';

    if (!companyId) {
      return undefined; // No hacer request si no hay company_id
    }

    // La tabla timeoffs tiene múltiples relaciones con employees (employee_id, reviewed_by, registered_by)
    // No necesitamos incluir la relación employee porque:
    // 1. Ya filtramos por employee_id directamente, que garantiza que pertenece al empleado correcto
    // 2. Los datos del empleado ya están disponibles en employeesStore
    const params: any = {
      select: `id,employee_id,type_id,date_from,date_to,notes,is_approved,compensatory_type,compensatory_amount,review_status,reviewed_by,reviewed_at,registered_by,registered_at,rejection_comment,created_at,company_id,document_url,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,first_name,father_name,work_email,company_id,branch_id,position:positions(name),branch:branches(name))`,
      // Filtrar por company_id (campo agregado a la tabla)
      company_id: `eq.${companyId}`,
      type_id: `eq.${compensatoryTypeId}`,
      order: 'created_at.desc',
    };

    return {
      url: this.apiUrl.build('rest/v1/timeoffs'),
      params: params,
      method: 'GET',
    };
  });

  // Employee Disabilities API
  public disabilitiesApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    const params: any = {
      select: `*`,
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };

    return {
      url: this.apiUrl.build('rest/v1/employee_disabilities'),
      params: params,
      method: 'GET',
    };
  });

  // Employee Vacations API
  public vacationsApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    const params: any = {
      select: `*`,
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };

    return {
      url: this.apiUrl.build('rest/v1/employee_vacations'),
      params: params,
      method: 'GET',
    };
  });

  // Document Requests API
  public documentRequestsApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    // Nota: document_requests NO tiene company_id en el schema actual
    // Simplificado: sin joins por ahora, filtraremos en el cliente
    const params: any = {
      select: `*`,
      order: 'created_at.desc',
    };

    return {
      url: this.apiUrl.build('rest/v1/document_requests'),
      params: params,
      method: 'GET',
    };
  });

  // Combinar todas las solicitudes de empleados de la sucursal
  public branchEmployeeRequests = computed(() => {
    const branchId = this.currentBranch()?.id;
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!branchId || !companyId) return [];

    // Obtener empleados de la sucursal actual
    const branchEmployeeIds = new Set(
      this.branchEmployees().map(e => e.id)
    );

    // Compensatory: viene con employee join desde compensatoryTimeoffsApi
    const compensatory = (this.compensatoryTimeoffsApi.value() || [])
      .filter(r => r.employee?.branch_id === branchId)
      .map(r => ({ ...r, requestType: 'compensatorio' as const }));

    // Disabilities: enriquecer con datos del empleado
    const disabilities = (this.disabilitiesApi.value() || [])
      .filter(r => branchEmployeeIds.has(r.employee_id))
      .map(r => {
        const employee = this.employeesStore.entityMap()[r.employee_id];
        return {
          ...r,
          employee: employee ? {
            id: employee.id,
            first_name: employee.first_name,
            father_name: employee.father_name,
            branch_id: employee.branch_id,
          } : undefined,
          requestType: 'incapacidad' as const
        };
      });

    // Vacations: enriquecer con datos del empleado
    const vacations = (this.vacationsApi.value() || [])
      .filter(r => branchEmployeeIds.has(r.employee_id))
      .map(r => {
        const employee = this.employeesStore.entityMap()[r.employee_id];
        return {
          ...r,
          employee: employee ? {
            id: employee.id,
            first_name: employee.first_name,
            father_name: employee.father_name,
            branch_id: employee.branch_id,
          } : undefined,
          requestType: 'vacaciones' as const
        };
      });

    // Documents: enriquecer con datos del empleado
    const documents = (this.documentRequestsApi.value() || [])
      .filter(r => branchEmployeeIds.has(r.employee_id))
      .map(r => {
        const employee = this.employeesStore.entityMap()[r.employee_id];
        return {
          ...r,
          employee: employee ? {
            id: employee.id,
            first_name: employee.first_name,
            father_name: employee.father_name,
            branch_id: employee.branch_id,
          } : undefined,
          requestType: 'documentos' as const
        };
      });

    // Combinar y ordenar por fecha de creación
    return [...compensatory, ...disabilities, ...vacations, ...documents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  // Filters for employee requests
  public requestTypeFilter = signal<string | null>(null);
  public requestStatusFilter = signal<string | null>(null);

  // Filtered branch employee requests
  public filteredBranchEmployeeRequests = computed(() => {
    let requests = this.branchEmployeeRequests();
    
    const typeFilter = this.requestTypeFilter();
    if (typeFilter) {
      requests = requests.filter(r => r.requestType === typeFilter);
    }
    
    const statusFilter = this.requestStatusFilter();
    if (statusFilter) {
      requests = requests.filter(r => {
        const status = r.status || r.review_status;
        return status === statusFilter;
      });
    }
    
    return requests;
  });

  // Notifications resource - obtener sin join y enriquecer en el cliente
  public notificationsResource = httpResource<Notification[]>(() => {
    const branchId = this.currentBranch()?.id;
    const currentEmployeeId = this.store.auth.currentEmployeeId();
    if (!currentEmployeeId) return undefined;
    const params: any = {
      select: `*`,
      recipient_id: `eq.${currentEmployeeId}`,
      order: 'created_at.desc',
    };
    // Si es admin y no hay sucursal seleccionada, ver todas. Si hay sucursal seleccionada o es gerente, filtrar por sucursal
    if (branchId) {
      params.branch_id = `eq.${branchId}`;
    }
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/notifications`,
      params,
    };
  });

  // Notificaciones enriquecidas con datos del empleado
  public enrichedNotifications = computed(() => {
    const notifications = this.notificationsResource.value() || [];
    const employees = this.employeesStore.entities();
    
    return notifications.map(notification => {
      const recipient = employees.find(emp => emp.id === notification.recipient_id);
      return {
        ...notification,
        recipient: recipient ? {
          id: recipient.id,
          first_name: recipient.first_name,
          father_name: recipient.father_name,
        } : undefined,
      };
    });
  });

  // Timelogs resource - obtener logs del día y procesarlos
  public timelogsResource = httpResource<any[]>(() => {
    const branchId = this.currentBranch()?.id;
    const date = this.selectedDate();
    if (!date) return undefined;
    const companyId = this.organizationService.getCurrentCompanyId();
    const dateStr = format(date, 'yyyy-MM-dd');
    const startOfDayStr = `${dateStr}T00:00:00`;
    const endOfDayStr = `${dateStr}T23:59:59`;
    
    // Construir URL manualmente para aplicar correctamente filtros gte y lte
    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`;
    const select = `*,employee:employees!inner(id,first_name,father_name,is_active)`;
    
    let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
    url += `&created_at=gte.${startOfDayStr}`;
    url += `&created_at=lte.${endOfDayStr}`;
    
    // Filtrar solo empleados activos
    url += `&employee.is_active=eq.true`;
    
    if (branchId) {
      url += `&branch_id=eq.${branchId}`;
    }
    
    if (companyId) {
      url += `&company_id=eq.${companyId}`;
    }
    
    url += `&order=created_at.asc`;
    
    return {
      url,
      method: 'GET',
    };
  });

  // Schedules resource - para vista semanal
  public schedulesResource = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const start = this.weekStart();
    const end = this.weekEnd();
    
    // Construir URL manualmente para asegurar que los filtros se apliquen correctamente
    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`;
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    const select = `*,schedule:schedules(*), branch:branches(id, name, short_name)`;
    
    let url = `${baseUrl}?select=${encodeURIComponent(select)},employee:employees!inner(id,company_id,is_active)`;
    url += `&start_date=lte.${endDate}`;
    url += `&end_date=gte.${startDate}`;
    
    // Filtrar solo empleados activos
    url += `&employee.is_active=eq.true`;
    
    // Filtrar a través de employees.company_id (funciona incluso si employee_schedules no tiene company_id)
    if (companyId) {
      url += `&employee.company_id=eq.${companyId}`;
    }
    
    return {
      url,
      method: 'GET',
    };
  });
  
  // Computed para semana
  public weekStart = computed(() => {
    const date = this.currentDateForSchedule();
    if (isMonday(date)) {
      return startOfDay(date);
    }
    if (isWeekend(date)) {
      return startOfDay(nextMonday(date));
    }
    return startOfDay(previousMonday(date));
  });
  
  public weekEnd = computed(() => endOfDay(nextSunday(this.weekStart())));
  
  public currentWeekLabel = computed(() => {
    return format(this.weekStart(), 'dd/MM/yyyy') + ' - ' + format(this.weekEnd(), 'dd/MM/yyyy');
  });
  
  public weekDays = computed(() => {
    let current = this.weekStart();
    const dayList: { date: Date; day: number }[] = [];
    for (let i = 0; i < 7; i++) {
      dayList.push({
        date: current,
        day: getDate(current),
      });
      current = addDays(current, 1);
    }
    return dayList;
  });
  
  // Empleados filtrados para vista semanal
  public currentEmployeesForSchedule = computed(() => {
    const branchId = this.currentBranch()?.id;
    let employees = this.employeesStore.employeesList().filter((employee) => employee.is_active);
    
    // Filtrar por sucursal
    if (branchId) {
      employees = employees.filter((emp) => emp.branch_id === branchId);
    }
    
    // Filtro por búsqueda
    const searchTerm = this.employeeSearchForSchedule()?.toLowerCase().trim() || '';
    if (searchTerm) {
      employees = employees.filter(emp => 
        `${emp.first_name} ${emp.father_name}`.toLowerCase().includes(searchTerm) ||
        emp.first_name.toLowerCase().includes(searchTerm) ||
        emp.father_name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filtro por puesto
    const positionId = this.currentPositionForSchedule();
    if (positionId) {
      employees = employees.filter(emp => emp.position_id === positionId);
    }
    
    return employees.map(({ id, first_name, father_name, position, position_id }) => ({
      id,
      first_name,
      father_name,
      position,
      position_id,
      days: this.weekDays(),
    }));
  });
  
  // Shifts de la semana
  public shifts = computed(() => {
    const schedules = this.schedulesResource.value() || [];
    return schedules
      .filter((schedule) =>
        this.currentEmployeesForSchedule().some(
          (employee) => employee.id === schedule.employee_id
        )
      )
      .map((shift) => ({
        id: shift.id,
        employee_id: shift.employee_id,
        branch_id: shift.branch_id,
        start_date: shift.start_date,
        end_date: shift.end_date,
        schedule_id: shift.schedule_id,
        schedule: shift.schedule,
        branch: shift.branch,
        approved: shift.approved,
      }));
  });
  
  // Lista de empleados con sus horarios por día
  public employeeSchedulesList = computed(() =>
    this.currentEmployeesForSchedule().map((employee) => ({
      ...employee,
      days: employee.days.map((day) => ({
        ...day,
        shift: this.shifts()?.find(
          (shift) =>
            shift.employee_id === employee.id &&
            isWithinInterval(day.date, {
              start: startOfDay(toDate(shift.start_date, { timeZone: 'America/Panama' })),
              end: endOfDay(toDate(shift.end_date, { timeZone: 'America/Panama' })),
            })
        ),
      })),
    }))
  );
  
  // Menu items para navegación de semanas
  public scheduleMenuItems: MenuItem[] = [
    {
      label: 'Semana actual',
      icon: 'pi pi-calendar',
      command: () => this.goTodaySchedule(),
    },
    { separator: true },
    {
      label: 'Semana anterior',
      icon: 'pi pi-angle-left',
      command: () => this.previousWeekSchedule(),
    },
    {
      label: 'Semana siguiente',
      icon: 'pi pi-angle-right',
      command: () => this.nextWeekSchedule(),
    },
  ];

  // Reminders resource
  public remindersResource = httpResource<Reminder[]>(() => {
    const branchId = this.currentBranch()?.id;
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: `*,employee:employees!inner(id,first_name,father_name,is_active)`,
      order: 'due_date.asc',
      'employee.is_active': 'eq.true', // Solo empleados activos
    };
    // Si hay sucursal seleccionada (o es gerente), filtrar por sucursal
    if (branchId) {
      params.branch_id = `eq.${branchId}`;
    }
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/reminders`,
      params,
    };
  });

  // Computed values - Estadísticas
  public unreadNotificationsCount = computed(() => {
    return (
      this.enrichedNotifications()
        .filter((n) => !n.is_read).length || 0
    );
  });

  // Estadísticas del día seleccionado
  public todayStats = computed(() => {
    const logs = this.filteredTimelogs();
    
    return {
      totalEmployees: logs.length,
      onTime: logs.filter((log: any) => !log.is_delayed && !log.is_missing && !log.lunch_exceeded && !log.is_early_exit && log.entry_time).length,
      delayed: logs.filter((log: any) => log.is_delayed).length,
      missing: logs.filter((log: any) => !log.entry_time).length,
      lunchExceeded: logs.filter((log: any) => log.lunch_exceeded).length,
      earlyExit: logs.filter((log: any) => log.is_early_exit).length,
    };
  });

  // Recordatorios pendientes
  public pendingRemindersCount = computed(() => {
    return this.filteredReminders().filter((r) => !r.is_completed).length;
  });

  // Recordatorios vencidos
  public overdueRemindersCount = computed(() => {
    return this.filteredReminders().filter((r) => !r.is_completed && this.isOverdue(r)).length;
  });

  public filteredNotifications = computed(() => {
    const notifications = this.enrichedNotifications();
    const typeFilter = this.notificationTypeFilter();
    if (!typeFilter) return notifications;
    return notifications.filter((n) => n.type === typeFilter);
  });

  public filteredTimelogs = computed(() => {
    const logs = this.timelogsResource.value() || [];
    const schedules = this.schedulesResource.value() || [];
    const employeeId = this.selectedEmployeeId();
    const selectedDate = this.selectedDate();

    // Agrupar logs por empleado y detectar el último ciclo de turno activo
    const grouped = logs.reduce((acc: any, log: any) => {
      const logTime = new Date(log.created_at);
      
      if (!acc[log.employee_id]) {
        acc[log.employee_id] = {
          employee_id: log.employee_id,
          employee: log.employee,
          entry_time: null,
          lunch_start_time: null,
          lunch_end_time: null,
          exit_time: null,
          is_delayed: false,
          is_missing: false,
          lunch_exceeded: false,
          is_early_exit: false,
          last_entry_time: null, // Para rastrear cuando inicia un nuevo ciclo
        };
      }
      
      const entry = acc[log.employee_id];
      
      // Detectar inicio de un nuevo ciclo de turno
      if (log.type === 'entry') {
        // Si hay una nueva entrada, reiniciar el ciclo
        if (entry.exit_time || !entry.entry_time) {
          entry.entry_time = logTime;
          entry.lunch_start_time = null;
          entry.lunch_end_time = null;
          entry.exit_time = null;
          entry.last_entry_time = logTime;
        } else {
          // Mantener la primera entrada si no ha habido salida
          entry.entry_time = entry.entry_time || logTime;
        }
      } 
      // Solo procesar otros logs si pertenecen al ciclo actual
      else if (entry.entry_time || entry.last_entry_time) {
        const cycleStartTime = entry.last_entry_time || entry.entry_time;
        
        // Solo considerar logs posteriores a la última entrada (mismo ciclo)
        if (cycleStartTime && logTime >= cycleStartTime) {
          if (log.type === 'lunch_start' && !entry.lunch_start_time) {
            entry.lunch_start_time = logTime;
          } else if (log.type === 'lunch_end' && !entry.lunch_end_time) {
            entry.lunch_end_time = logTime;
          } else if (log.type === 'exit' && !entry.exit_time) {
            entry.exit_time = logTime;
          }
        }
      }
      
      return acc;
    }, {});

    // Calcular violaciones para cada empleado
    Object.values(grouped).forEach((employeeLog: any) => {
      // Limpiar la propiedad auxiliar
      delete employeeLog.last_entry_time;
      
      if (!selectedDate) return;

      // Encontrar horario programado del empleado para la fecha
      const employeeSchedule = this.findEmployeeScheduleForDate(
        employeeLog.employee_id,
        selectedDate,
        schedules
      );

      if (!employeeSchedule?.schedule) return;

      const schedule = employeeSchedule.schedule;

      // Calcular retraso en entrada
      if (employeeLog.entry_time) {
        const delayMinutes = this.calculateDelayMinutes(employeeLog.entry_time, schedule);
        employeeLog.is_delayed = delayMinutes > (schedule.minutes_tolerance || 0);
      }

      // Calcular salida temprana
      if (employeeLog.exit_time) {
        const earlyExitMinutes = this.calculateEarlyExitMinutes(employeeLog.exit_time, schedule);
        employeeLog.is_early_exit = earlyExitMinutes > 0; // Cualquier salida antes de lo programado
      }

      // Calcular almuerzo excedido
      if (employeeLog.lunch_start_time && employeeLog.lunch_end_time) {
        employeeLog.lunch_exceeded = this.calculateLunchExceeded(
          employeeLog.lunch_start_time,
          employeeLog.lunch_end_time,
          schedule
        );
      }

      // Determinar si faltó (no tiene entrada)
      employeeLog.is_missing = !employeeLog.entry_time;
    });

    let result = Object.values(grouped);

    // Filtrar por empleado si está seleccionado
    if (employeeId) {
      result = result.filter((log: any) => log.employee_id === employeeId);
    }

    return result;
  });

  public filteredSchedules = computed(() => {
    const schedules = this.schedulesResource.value() || [];
    const employeeId = this.selectedEmployeeForSchedule();
    if (!employeeId) return schedules;
    return schedules.filter((s) => s.employee_id === employeeId);
  });

  public filteredReminders = computed(() => {
    const reminders = this.remindersResource.value() || [];
    const employeeId = this.selectedEmployeeForReminder();
    if (!employeeId) return reminders;
    return reminders.filter((r) => r.employee_id === employeeId);
  });

  constructor() {
    // Inicializar sucursal seleccionada para admins
    if (this.isAdmin() && this.currentBranchFromStore()) {
      this.selectedBranchId.set(this.currentBranchFromStore()?.id || null);
    }
    
    // Auto-refresh notifications every 30 seconds
    setInterval(() => {
      this.refreshNotifications();
    }, 30000);
  }

  public onBranchChange() {
    // Recargar todos los recursos cuando cambia la sucursal
    this.refreshNotifications();
    this.refreshTimelogs();
    this.refreshSchedules();
    this.refreshReminders();
  }

  // Helper methods para calcular violaciones de marcaciones
  private calculateDelayMinutes(entryTime: Date, schedule: any): number {
    if (!schedule?.entry_time || schedule.day_off) return 0;

    const entryTimeStr = format(entryTime, 'HH:mm:ss');
    const scheduleTimeStr = typeof schedule.entry_time === 'string'
      ? schedule.entry_time
      : format(new Date(schedule.entry_time), 'HH:mm:ss');

    const entryParts = entryTimeStr.split(':');
    const scheduleParts = scheduleTimeStr.split(':');

    const entryDate = new Date();
    entryDate.setHours(+entryParts[0], +entryParts[1], +entryParts[2] || 0, 0);

    const scheduleDate = new Date();
    scheduleDate.setHours(+scheduleParts[0], +scheduleParts[1], +scheduleParts[2] || 0, 0);

    return differenceInMinutes(entryDate, scheduleDate);
  }

  private calculateEarlyExitMinutes(exitTime: Date, schedule: any): number {
    if (!schedule?.exit_time || schedule.day_off) return 0;

    const exitTimeStr = format(exitTime, 'HH:mm:ss');
    const scheduleTimeStr = typeof schedule.exit_time === 'string'
      ? schedule.exit_time
      : format(new Date(schedule.exit_time), 'HH:mm:ss');

    const exitParts = exitTimeStr.split(':');
    const scheduleParts = scheduleTimeStr.split(':');

    const exitDate = new Date();
    exitDate.setHours(+exitParts[0], +exitParts[1], +exitParts[2] || 0, 0);

    const scheduleDate = new Date();
    scheduleDate.setHours(+scheduleParts[0], +scheduleParts[1], +scheduleParts[2] || 0, 0);

    return differenceInMinutes(scheduleDate, exitDate);
  }

  private calculateLunchExceeded(lunchStart: Date, lunchEnd: Date, schedule: any): boolean {
    if (!schedule?.lunch_duration_minutes || schedule.day_off) return false;

    const lunchDuration = differenceInMinutes(lunchEnd, lunchStart);
    const allowedDuration = schedule.lunch_duration_minutes;

    return lunchDuration > allowedDuration;
  }

  private findEmployeeScheduleForDate(employeeId: string, date: Date, schedules: any[]): any {
    return schedules.find(s =>
      s.employee_id === employeeId &&
      date >= new Date(s.start_date) &&
      date <= new Date(s.end_date)
    );
  }

  // Helper methods
  public getEmployeeInitials(employee?: Employee | { first_name?: string; father_name?: string }): string {
    if (!employee) return '?';
    const first = employee.first_name?.charAt(0) || '';
    const last = employee.father_name?.charAt(0) || '';
    return (first + last).toUpperCase();
  }

  public getNotificationTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      delay: 'Retraso',
      on_time: 'A tiempo',
      missing: 'Sin marcar',
      early_exit: 'Salida temprana',
      lunch_exceeded: 'Almuerzo excedido',
    };
    return labels[type] || type;
  }

  public getNotificationSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    const severities: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      delay: 'danger',
      on_time: 'success',
      missing: 'warn',
      early_exit: 'danger',
      lunch_exceeded: 'danger',
    };
    return severities[type] || 'info';
  }

  public getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      delay: 'pi pi-clock',
      on_time: 'pi pi-check-circle',
      missing: 'pi pi-exclamation-triangle',
      early_exit: 'pi pi-arrow-down',
      lunch_exceeded: 'pi pi-clock',
    };
    return icons[type] || 'pi pi-info-circle';
  }

  public isOverdue(reminder: Reminder): boolean {
    return new Date(reminder.due_date) < new Date() && !reminder.is_completed;
  }

  // Actions
  public refreshNotifications() {
    this.notificationsResource.reload();
  }

  public refreshTimelogs() {
    this.timelogsResource.reload();
  }

  public refreshSchedules() {
    this.schedulesResource.reload();
  }

  public refreshReminders() {
    this.remindersResource.reload();
  }

  public refreshEmployeeRequests() {
    this.compensatoryTimeoffsApi.reload();
    this.disabilitiesApi.reload();
    this.vacationsApi.reload();
    this.documentRequestsApi.reload();
  }

  public viewRequestDetails(request: any) {
    // TODO: Implementar diálogo con detalles completos de la solicitud
    console.log('Ver detalles de solicitud:', request);
    this.message.add({
      severity: 'info',
      summary: 'Funcionalidad en desarrollo',
      detail: 'Los detalles completos de la solicitud se mostrarán próximamente',
    });
  }

  public getRequestTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      compensatorio: 'Compensatorio',
      incapacidad: 'Incapacidad',
      vacaciones: 'Vacaciones',
      documentos: 'Documentos',
    };
    return labels[type] || type;
  }

  public getRequestTypeSeverity(type: string): 'secondary' | 'info' | 'success' | 'warn' | 'danger' | 'contrast' | undefined {
    const severities: Record<string, 'secondary' | 'info' | 'success' | 'warn' | 'danger' | 'contrast'> = {
      compensatorio: 'info',
      incapacidad: 'warn',
      vacaciones: 'success',
      documentos: 'secondary',
    };
    return severities[type];
  }

  public getRequestStatusLabel(request: any): string {
    const status = request.status || request.review_status;
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
    };
    return labels[status] || status;
  }

  public getRequestStatusSeverity(request: any): 'secondary' | 'info' | 'success' | 'warn' | 'danger' | 'contrast' | undefined {
    const status = request.status || request.review_status;
    const severities: Record<string, 'secondary' | 'info' | 'success' | 'warn' | 'danger' | 'contrast'> = {
      pending: 'warn',
      approved: 'success',
      rejected: 'danger',
    };
    return severities[status];
  }

  public markNotificationAsRead(id: string) {
    this.http
      .patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/notifications`,
        { is_read: true, read_at: new Date().toISOString() },
        {
          params: { id: `eq.${id}` },
        }
      )
      .subscribe({
        next: () => {
          this.refreshNotifications();
          this.message.add({
            severity: 'success',
            summary: 'Notificación marcada como leída',
          });
        },
        error: () => {
          this.message.add({
            severity: 'error',
            summary: 'Error al marcar notificación',
          });
        },
      });
  }

  public markAllNotificationsAsRead() {
    const unreadIds = this.filteredNotifications()
      .filter((n) => !n.is_read)
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    this.http
      .patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/notifications`,
        { is_read: true, read_at: new Date().toISOString() },
        {
          params: { id: `in.(${unreadIds.join(',')})` },
        }
      )
      .subscribe({
        next: () => {
          this.refreshNotifications();
          this.message.add({
            severity: 'success',
            summary: 'Todas las notificaciones marcadas como leídas',
          });
        },
        error: () => {
          this.message.add({
            severity: 'error',
            summary: 'Error al marcar notificaciones',
          });
        },
      });
  }

  public editSchedule({
    employee_id,
    employee_schedule,
    date,
  }: {
    employee_id?: string;
    employee_schedule?: any;
    date?: Date;
  } = {}): void {
    this.dialog
      .open(EmployeeSchedulesFormComponent, {
        header: employee_schedule ? 'Editar Horario' : 'Nuevo Horario',
        data: {
          employee_id,
          employee_schedule,
          date,
          branch: this.currentBranch(),
        },
        modal: true,
      })
      .onClose.subscribe(() => {
        this.refreshSchedules();
      });
  }
  
  public deleteSchedule(id: string) {
    this.confirm.confirm({
      header: 'Eliminar horario',
      message: '¿Estás seguro de eliminar este horario?',
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Eliminar',
        severity: 'danger',
      },
      accept: () => {
        const companyId = this.organizationService.getCurrentCompanyId();
        const params: any = { id: `eq.${id}` };
        
        if (companyId) {
          params.company_id = `eq.${companyId}`;
        }
        
        this.http
          .delete(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            { params }
          )
          .subscribe({
            next: () => {
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Horario eliminado correctamente',
              });
              this.refreshSchedules();
            },
            error: () => {
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al eliminar el horario',
              });
            },
          });
      },
    });
  }
  
  public approveSchedule(id: string) {
    this.confirm.confirm({
      header: 'Aprobar horario',
      message: '¿Estás seguro de aprobar este horario?',
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Aprobar',
        severity: 'success',
      },
      accept: () => {
        const companyId = this.organizationService.getCurrentCompanyId();
        const params: any = { id: `eq.${id}` };
        
        if (companyId) {
          params.company_id = `eq.${companyId}`;
        }
        
        this.http
          .patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            { approved: true, approved_at: new Date().toISOString() },
            { params }
          )
          .subscribe({
            next: () => {
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Horario aprobado correctamente',
              });
              this.refreshSchedules();
            },
            error: () => {
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al aprobar el horario',
              });
            },
          });
      },
    });
  }
  
  // Navegación de semanas
  public nextWeekSchedule() {
    this.currentDateForSchedule.update((value) => addWeeks(value, 1));
  }
  
  public previousWeekSchedule() {
    this.currentDateForSchedule.update((value) => subWeeks(value, 1));
  }
  
  public goTodaySchedule() {
    this.currentDateForSchedule.set(new Date());
  }
  
  // Tooltip para horarios
  public getScheduleTooltip(shift: any): string {
    if (!shift) return '';
    let tooltip = `Horario: ${shift.schedule?.name || 'N/A'}\n`;
    if (!shift.schedule?.day_off) {
      tooltip += `Sucursal: ${shift.branch?.name || 'N/A'}\n`;
    }
    if (shift.approved) {
      tooltip += 'Aprobado por RRHH';
    } else {
      tooltip += 'Pendiente por aprobación';
    }
    return tooltip;
  }

  public createReminder() {
    const message = this.newReminderMessage();
    const dueDate = this.newReminderDueDate();
    const employeeId = this.newReminderEmployeeId();
    const branchId = this.currentBranch()?.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!message || !dueDate) {
      this.message.add({
        severity: 'warn',
        summary: 'Completa todos los campos requeridos',
      });
      return;
    }
    
    // Si es admin y no hay sucursal seleccionada, usar la sucursal del empleado o la primera disponible
    let finalBranchId: string | undefined = branchId;
    if (!finalBranchId && employeeId) {
      const employee = this.employeesStore.entities().find(e => e.id === employeeId);
      finalBranchId = employee?.branch_id || undefined;
    }
    if (!finalBranchId) {
      this.message.add({
        severity: 'warn',
        summary: 'Selecciona una sucursal o un empleado',
      });
      return;
    }

    this.http
      .post(`${process.env['ENV_SUPABASE_URL']}/rest/v1/reminders`, {
        employee_id: employeeId,
        branch_id: finalBranchId,
        company_id: companyId,
        message,
        due_date: dueDate.toISOString(),
        is_completed: false,
      })
      .subscribe({
        next: () => {
          this.message.add({
            severity: 'success',
            summary: 'Recordatorio creado',
          });
          this.showReminderDialog.set(false);
          this.newReminderMessage.set('');
          this.newReminderDueDate.set(null);
          this.newReminderEmployeeId.set(null);
          this.refreshReminders();
        },
        error: () => {
          this.message.add({
            severity: 'error',
            summary: 'Error al crear recordatorio',
          });
        },
      });
  }

  public completeReminder(id: string) {
    this.http
      .patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/reminders`,
        { is_completed: true },
        {
          params: { id: `eq.${id}` },
        }
      )
      .subscribe({
        next: () => {
          this.refreshReminders();
          this.message.add({
            severity: 'success',
            summary: 'Recordatorio completado',
          });
        },
        error: () => {
          this.message.add({
            severity: 'error',
            summary: 'Error al completar recordatorio',
          });
        },
      });
  }

  public deleteReminder(id: string) {
    this.http
      .delete(`${process.env['ENV_SUPABASE_URL']}/rest/v1/reminders`, {
        params: { id: `eq.${id}` },
      })
      .subscribe({
        next: () => {
          this.refreshReminders();
          this.message.add({
            severity: 'success',
            summary: 'Recordatorio eliminado',
          });
        },
        error: () => {
          this.message.add({
            severity: 'error',
            summary: 'Error al eliminar recordatorio',
          });
        },
      });
  }

  public async onSubmitCompensatoryFromBranchManager(data: any): Promise<void> {
    try {
      // Importar la función de upload compensatorio
      const { uploadCompensatory } = await import('../employee-portal/actions/employee-portal-compensatory.actions');

      // Preparar las dependencias para el branch manager
      const deps = {
        http: this.http,
        apiUrl: this.apiUrl,
        messageService: this.message,
        currentEmployee: () => this.currentEmployee(), // El branch manager que está haciendo la solicitud
        formState: data, // Los datos del formulario con el empleado seleccionado
        resetForm: () => {}, // No necesitamos reset ya que es modal
        reloadRequests: () => this.compensatoryTimeoffsApi.reload(),
        setSubmitting: (value: boolean) => {}, // No necesitamos esto ya que es modal
      };

      await uploadCompensatory(deps);

      // Mostrar mensaje de éxito específico para branch manager
      this.message.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `La solicitud de compensatorio para ${data.employee?.first_name} ${data.employee?.father_name} ha sido enviada correctamente`,
      });

    } catch (error) {
      console.error('Error submitting compensatory from branch manager:', error);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
      });
    }
  }
}

