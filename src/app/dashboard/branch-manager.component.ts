import {
  animate,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { DatePipe, NgClass, NgStyle } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  addDays,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  format,
  getDate,
  isWithinInterval,
  nextSunday,
  startOfDay,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { Menu } from 'primeng/menu';
import { Popover } from 'primeng/popover';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import {
  colorVariants,
  Employee,
  getScheduleColorInlineStyle,
} from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DocumentViewerCardComponent } from '../shared/components/document-viewer-card.component';
import { BranchesStore } from '../stores/branches.store';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';
import { BranchManagerGestionesComponent } from './branch-manager-gestiones.component';
import { BranchRemindersTabComponent } from './branch-reminders-tab.component';
import { BranchRequestsTabComponent } from './branch-requests-tab.component';
import { EmployeeSchedulesFormComponent } from './employee-schedules-form.component';

type Notification = {
  id: string;
  type:
    | 'delay'
    | 'on_time'
    | 'missing'
    | 'early_exit'
    | 'lunch_exceeded'
    | 'timelog_entry'
    | 'timelog_exit'
    | 'timelog_lunch_start'
    | 'timelog_lunch_end'
    | 'complaint'
    | 'other';
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
    NgStyle,
    Menu,
    Popover,
    InputText,
BranchManagerGestionesComponent,
    BranchRemindersTabComponent,
    BranchRequestsTabComponent,
    DocumentViewerCardComponent,
  ],
  providers: [DynamicDialogRef, DialogService, ConfirmationService],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '0.4s ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('staggerFade', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(10px)' }),
            stagger('50ms', [
              animate(
                '0.3s ease-out',
                style({ opacity: 1, transform: 'translateY(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
  template: `
    <div
      [ngClass]="{ 'naz-theme': isNaz() }"
      class="p-6 md:p-8 lg:p-10 space-y-8"
    >
      <!-- Header Moderno -->
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6"
        @fadeIn
      >
        <div class="flex items-center gap-3 md:gap-5">
          <div
            class="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-transform hover:scale-105 duration-300 flex-shrink-0"
          >
            <i class="pi pi-shop text-white text-xl md:text-2xl"></i>
          </div>
          <div class="min-w-0">
            <h1
              class="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-tight truncate"
            >
              Gestión de Tienda
            </h1>
            <p class="text-gray-400 text-xs md:text-sm mt-1">
              @if (isAdmin()) {
              <span class="flex items-center gap-2">
                <span
                  class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                ></span>
                <span class="font-medium">Administración de sucursales</span>
              </span>
              } @else {
              <span class="flex items-center gap-2">
                <i class="pi pi-map-marker text-indigo-400"></i>
                <span class="font-medium text-gray-300">{{
                  currentBranch()?.name || 'Sucursal'
                }}</span>
              </span>
              }
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 md:gap-3 flex-wrap">
          @if (isAdmin()) {
          <div
            class="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-xl px-3 md:px-4 py-2 border border-white/10 w-full sm:w-auto"
          >
            <i class="pi pi-building text-indigo-400 flex-shrink-0"></i>
            <p-select
              [options]="availableBranches()"
              optionLabel="name"
              optionValue="id"
              [(ngModel)]="selectedBranchId"
              placeholder="Todas las sucursales"
              showClear
              appendTo="body"
              styleClass="w-full sm:w-56 border-0 bg-transparent"
              (ngModelChange)="onBranchChange()"
            />
          </div>
          } @if (unreadNotificationsCount() > 0) {
          <p-button
            icon="pi pi-bell"
            severity="warn"
            [badge]="unreadNotificationsCount().toString()"
            rounded
            (onClick)="markAllNotificationsAsRead()"
            pTooltip="Marcar todas como leídas"
            styleClass="shadow-lg shadow-amber-500/20"
          />
          }
        </div>
      </div>

      <!-- Dashboard de Métricas - Diseño Moderno -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 py-2 md:py-4" @staggerFade>
        <!-- Empleados -->
        <div
          class="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-5 transition-all duration-300 hover:bg-white/15 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/20"
          @scaleIn
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"
          ></div>
          <div class="relative">
            <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div
                class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0"
              >
                <i class="pi pi-users text-emerald-400 text-sm md:text-base"></i>
              </div>
              <span class="text-2xl md:text-3xl font-bold text-white truncate">{{
                todayStats().totalEmployees
              }}</span>
            </div>
            <p class="text-gray-400 text-xs md:text-sm font-medium truncate">Empleados hoy</p>
          </div>
        </div>

        <!-- Retrasos -->
        <div
          class="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-5 transition-all duration-300 hover:bg-white/15 hover:border-rose-500/30 hover:shadow-xl hover:shadow-rose-500/20"
          @scaleIn
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-rose-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"
          ></div>
          <div class="relative">
            <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div
                class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0"
              >
                <i class="pi pi-clock text-rose-400 text-sm md:text-base"></i>
              </div>
              <span class="text-2xl md:text-3xl font-bold text-white truncate">{{
                todayStats().delayed
              }}</span>
            </div>
            <p class="text-gray-400 text-xs md:text-sm font-medium truncate">Retrasos hoy</p>
          </div>
        </div>

        <!-- Notificaciones -->
        <div
          class="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-5 transition-all duration-300 hover:bg-white/15 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/20"
          @scaleIn
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"
          ></div>
          <div class="relative">
            <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div
                class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0"
              >
                <i class="pi pi-bell text-blue-400 text-sm md:text-base"></i>
              </div>
              <span class="text-2xl md:text-3xl font-bold text-white truncate">{{
                unreadNotificationsCount()
              }}</span>
            </div>
            <p class="text-gray-400 text-xs md:text-sm font-medium truncate">Notificaciones</p>
          </div>
        </div>

        <!-- Recordatorios -->
        <div
          class="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-5 transition-all duration-300 hover:bg-white/15 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/20"
          @scaleIn
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"
          ></div>
          <div class="relative">
            <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div
                class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0"
              >
                <i class="pi pi-bookmark text-amber-400 text-sm md:text-base"></i>
              </div>
              <span class="text-2xl md:text-3xl font-bold text-white truncate">{{
                pendingRemindersCount()
              }}</span>
            </div>
            <p class="text-gray-400 text-xs md:text-sm font-medium truncate">Recordatorios</p>
          </div>
        </div>
      </div>

      <!-- Card Principal -->
      <p-card @fadeIn>
        <p-tabs value="timelogs">
          <p-tablist class="flex-wrap">
            <p-tab value="timelogs">
              <i class="pi pi-clock mr-1 md:mr-2"></i>
              <span class="hidden sm:inline">Marcaciones</span>
              <span class="sm:hidden">Marcas</span>
            </p-tab>
            <p-tab value="gestiones">
              <i class="pi pi-file-edit mr-1 md:mr-2"></i>
              <span class="hidden sm:inline">Gestiones</span>
              <span class="sm:hidden">Gestiones</span>
            </p-tab>
            <p-tab value="employee-requests">
              <i class="pi pi-list mr-1 md:mr-2"></i>
              <span class="hidden sm:inline">Mis Solicitudes de Empleados</span>
              <span class="sm:hidden">Solicitudes</span>
            </p-tab>
            <p-tab value="reminders">
              <i class="pi pi-bookmark mr-1 md:mr-2"></i>
              <span class="hidden sm:inline">Recordatorios</span>
              <span class="sm:hidden">Record.</span>
              @if (pendingRemindersCount() > 0) {
              <span
                class="ml-1 md:ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 md:px-2 py-0.5 font-semibold"
              >
                {{ pendingRemindersCount() }}
              </span>
              }
            </p-tab>
          </p-tablist>

          <p-tabpanel value="employee-requests">
            <pt-branch-requests-tab
              [branchEmployees]="branchEmployees()"
              [currentBranch]="currentBranch()"
              [isMobile]="isMobile()"
              (pendingCountChange)="requestsPendingCount.set($event)"
            />
          </p-tabpanel>

          <p-tabpanel value="timelogs">
            <div class="space-y-4 md:space-y-5">
              <!-- Filtros y acciones - Moderno -->
              <div
                class="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl"
              >
                <div class="flex gap-2 md:gap-3 items-center flex-wrap w-full md:w-auto">
                  <div class="relative w-full sm:w-auto">
                    <i
                      class="pi pi-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
                    ></i>
                    <p-select
                      [options]="branchEmployees()"
                      optionLabel="short_name"
                      optionValue="id"
                      [(ngModel)]="selectedEmployeeId"
                      placeholder="Filtrar por empleado"
                      showClear
                      filter
                      appendTo="body"
                      styleClass="w-full sm:w-64 pl-8"
                    />
                  </div>
                  <div class="relative w-full sm:w-auto">
                    <p-datepicker
                      [(ngModel)]="selectedDate"
                      [showIcon]="true"
                      dateFormat="dd/mm/yy"
                      placeholder="Fecha"
                      appendTo="body"
                      (onSelect)="refreshTimelogs()"
                      styleClass="rounded-xl w-full sm:w-auto"
                    />
                  </div>
                </div>
                <p-button
                  icon="pi pi-refresh"
                  [label]="isMobile() ? undefined : 'Actualizar'"
                  [outlined]="true"
                  severity="secondary"
                  (onClick)="refreshTimelogs()"
                  [loading]="timelogsResource.isLoading()"
                  styleClass="rounded-xl w-full md:w-auto"
                />
              </div>

              <!-- Estadísticas del día - Diseño moderno con pills -->
              @if (todayStats().totalEmployees > 0) {
              <div class="flex flex-wrap gap-2 md:gap-3 pb-2 md:pb-4">
                <div
                  class="flex items-center gap-2 md:gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-all hover:bg-emerald-500/20"
                >
                  <div
                    class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="pi pi-check text-emerald-400 text-xs md:text-sm"></i>
                  </div>
                  <div>
                    <span class="text-base md:text-lg font-bold text-emerald-400">{{
                      todayStats().onTime
                    }}</span>
                    <span class="text-xs text-gray-400 ml-1 md:ml-1.5 hidden sm:inline">A tiempo</span>
                  </div>
                </div>
                <div
                  class="flex items-center gap-2 md:gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-all hover:bg-rose-500/20"
                >
                  <div
                    class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="pi pi-clock text-rose-400 text-xs md:text-sm"></i>
                  </div>
                  <div>
                    <span class="text-base md:text-lg font-bold text-rose-400">{{
                      todayStats().delayed
                    }}</span>
                    <span class="text-xs text-gray-400 ml-1 md:ml-1.5 hidden sm:inline">Retrasos</span>
                  </div>
                </div>
                <div
                  class="flex items-center gap-2 md:gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-all hover:bg-amber-500/20"
                >
                  <div
                    class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0"
                  >
                    <i
                      class="pi pi-exclamation-triangle text-amber-400 text-xs md:text-sm"
                    ></i>
                  </div>
                  <div>
                    <span class="text-base md:text-lg font-bold text-amber-400">{{
                      todayStats().missing
                    }}</span>
                    <span class="text-xs text-gray-400 ml-1 md:ml-1.5 hidden sm:inline">Sin marcar</span>
                  </div>
                </div>
                <div
                  class="flex items-center gap-2 md:gap-2.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-all hover:bg-orange-500/20"
                >
                  <div
                    class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="pi pi-stopwatch text-orange-400 text-xs md:text-sm"></i>
                  </div>
                  <div>
                    <span class="text-base md:text-lg font-bold text-orange-400">{{
                      todayStats().lunchExceeded
                    }}</span>
                    <span class="text-xs text-gray-400 ml-1 md:ml-1.5 hidden sm:inline">Almuerzo</span>
                  </div>
                </div>
                <div
                  class="flex items-center gap-2 md:gap-2.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 md:px-4 py-1.5 md:py-2 transition-all hover:bg-violet-500/20"
                >
                  <div
                    class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="pi pi-sign-out text-violet-400 text-xs md:text-sm"></i>
                  </div>
                  <div>
                    <span class="text-base md:text-lg font-bold text-violet-400">{{
                      todayStats().earlyExit
                    }}</span>
                    <span class="text-xs text-gray-400 ml-1 md:ml-1.5 hidden sm:inline"
                      >Salida temp.</span
                    >
                  </div>
                </div>
              </div>
              }

              <p-table
                [value]="filteredTimelogs()"
                [loading]="timelogsResource.isLoading()"
                [paginator]="true"
                [rows]="isMobile() ? 10 : 25"
                [rowsPerPageOptions]="[10, 25, 50]"
                styleClass="p-datatable-sm"
                [scrollable]="true"
                [scrollHeight]="isMobile() ? '400px' : '600px'"
                responsiveLayout="scroll"
              >
                <ng-template #header>
                  <tr class="bg-white/5">
                    <th
                      style="min-width: 200px"
                      class="font-semibold text-gray-300"
                    >
                      Empleado
                    </th>
                    <th
                      style="min-width: 140px"
                      class="font-semibold text-gray-300"
                    >
                      Horario
                    </th>
                    <th
                      style="min-width: 140px"
                      class="font-semibold text-gray-300"
                    >
                      Entrada
                    </th>
                    <th
                      style="min-width: 140px"
                      class="font-semibold text-gray-300"
                    >
                      Inicio Almuerzo
                    </th>
                    <th
                      style="min-width: 140px"
                      class="font-semibold text-gray-300"
                    >
                      Fin Almuerzo
                    </th>
                    <th
                      style="min-width: 140px"
                      class="font-semibold text-gray-300"
                    >
                      Salida
                    </th>
                    <th
                      style="min-width: 150px"
                      class="font-semibold text-gray-300"
                    >
                      Estado
                    </th>
                  </tr>
                </ng-template>
                <ng-template #body let-log>
                  <tr
                    [ngClass]="{
                      'bg-red-50/5':
                        log.is_delayed ||
                        log.is_missing ||
                        log.lunch_exceeded ||
                        log.is_early_exit,
                      'bg-green-50/5':
                        !log.is_delayed &&
                        !log.is_missing &&
                        !log.lunch_exceeded &&
                        !log.is_early_exit &&
                        log.entry_time
                    }"
                    @fadeIn
                  >
                    <td>
                      <div class="flex items-center gap-3">
                        <p-avatar
                          [label]="getEmployeeInitials(log.employee)"
                          shape="circle"
                          styleClass="bg-blue-600"
                        />
                        <span class="font-semibold">
                          {{ log.employee?.first_name }}
                          {{ log.employee?.father_name }}
                        </span>
                      </div>
                    </td>
                    <td>
                      @if (log.schedule?.name) {
                      <span
                        class="rounded text-xs px-2 py-0.5 font-semibold inline-flex items-center justify-center gap-1"
                        [ngClass]="
                          log.schedule?.color &&
                          colorVariants[log.schedule.color]
                            ? colorVariants[log.schedule.color]
                            : 'bg-neutral-700 text-gray-300'
                        "
                        [ngStyle]="
                          log.schedule?.color &&
                          !colorVariants[log.schedule.color]
                            ? getScheduleStyle(log.schedule.color)
                            : null
                        "
                      >
                        {{ log.schedule.name }}
                      </span>
                      } @else {
                      <span
                        class="rounded text-xs px-2 py-0.5 bg-neutral-600 text-gray-400"
                      >
                        Sin horario
                      </span>
                      }
                    </td>
                    <td>
                      @if (log.entry_time) {
                      <div class="flex items-center gap-2">
                        @if (log.entry_branch) {
                        <p-avatar
                          shape="circle"
                          [label]="log.entry_branch.short_name"
                          [pTooltip]="log.entry_branch.name"
                          tooltipPosition="top"
                          styleClass="text-xs"
                          size="normal"
                        />
                        }
                        <span
                          [ngClass]="{
                            'text-red-400 font-semibold': log.is_delayed,
                            'text-green-400': !log.is_delayed
                          }"
                        >
                          {{ log.entry_time | date : 'hh:mm a' }}
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
                        @if (log.lunch_start_branch) {
                        <p-avatar
                          shape="circle"
                          [label]="log.lunch_start_branch.short_name"
                          [pTooltip]="log.lunch_start_branch.name"
                          tooltipPosition="top"
                          styleClass="text-xs"
                          size="normal"
                        />
                        }
                        <span>{{
                          log.lunch_start_time | date : 'hh:mm a'
                        }}</span>
                      </div>
                      } @else {
                      <span class="text-gray-500">-</span>
                      }
                    </td>
                    <td>
                      @if (log.lunch_end_time) {
                      <div class="flex items-center gap-2">
                        @if (log.lunch_end_branch) {
                        <p-avatar
                          shape="circle"
                          [label]="log.lunch_end_branch.short_name"
                          [pTooltip]="log.lunch_end_branch.name"
                          tooltipPosition="top"
                          styleClass="text-xs"
                          size="normal"
                        />
                        }
                        <span
                          [ngClass]="{
                            'text-red-400 font-semibold': log.lunch_exceeded
                          }"
                        >
                          {{ log.lunch_end_time | date : 'hh:mm a' }}
                        </span>
                      </div>
                      } @else {
                      <span class="text-gray-500">-</span>
                      }
                    </td>
                    <td>
                      @if (log.exit_time) {
                      <div class="flex items-center gap-2">
                        @if (log.exit_branch) {
                        <p-avatar
                          shape="circle"
                          [label]="log.exit_branch.short_name"
                          [pTooltip]="log.exit_branch.name"
                          tooltipPosition="top"
                          styleClass="text-xs"
                          size="normal"
                        />
                        }
                        <span
                          [ngClass]="{
                            'text-red-400 font-semibold': log.is_early_exit,
                            'text-purple-400': !log.is_early_exit
                          }"
                        >
                          {{ log.exit_time | date : 'hh:mm a' }}
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
                        } @else if (log.is_missing && !log.is_day_off) {
                        <p-tag
                          value="Sin marcar"
                          severity="warn"
                          icon="pi pi-exclamation-triangle"
                          styleClass="text-xs"
                        />
                        } @else if (log.lunch_exceeded) {
                        <p-tag
                          value="Almuerzo excedido"
                          severity="danger"
                          icon="pi pi-clock"
                          styleClass="text-xs"
                        />
                        } @else if (log.is_early_exit) {
                        <p-tag
                          value="Salida temprana"
                          severity="danger"
                          icon="pi pi-arrow-down"
                          styleClass="text-xs"
                        />
                        } @else if (log.entry_time) {
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
                    <td [attr.colspan]="7" class="text-center py-16">
                      <div class="flex flex-col items-center gap-4">
                        <div
                          class="w-20 h-20 rounded-2xl bg-gray-500/10 flex items-center justify-center"
                        >
                          <i class="pi pi-clock text-3xl text-gray-500"></i>
                        </div>
                        <div>
                          <p class="text-gray-300 text-lg font-medium mb-1">
                            No hay marcaciones
                          </p>
                          <p class="text-gray-500 text-sm">
                            No se encontraron registros para esta fecha
                          </p>
                        </div>
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
              (requestCreated)="refreshEmployeeRequests()"
            />
          </p-tabpanel>

          <p-tabpanel value="reminders">
            <pt-branch-reminders-tab
              [branchEmployees]="branchEmployees()"
              [currentBranch]="currentBranch()"
              [isMobile]="isMobile()"
              (pendingCountChange)="remindersCount.set($event)"
            />
          </p-tabpanel>
        </p-tabs>
      </p-card>

      <!-- Request details dialog moved to BranchRequestsTabComponent -->
    </div>
  `,
  styles: `
    /* Modern Tab Styling */
    ::ng-deep .p-tablist {
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 0;
    }
    ::ng-deep .p-tab {
      border-radius: 0.75rem 0.75rem 0 0;
      transition: all 0.2s ease;
    }
    ::ng-deep .p-tab:hover {
      background: rgba(255,255,255,0.05);
    }
    ::ng-deep .p-tab-active {
      background: rgba(99, 102, 241, 0.15) !important;
      border-bottom: 2px solid rgb(99, 102, 241);
    }

    /* Modern Table Styling */
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: rgba(255,255,255,0.03);
      border-color: rgba(255,255,255,0.1);
      padding: 1rem;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      transition: all 0.2s ease;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
      background: rgba(255,255,255,0.05) !important;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      border-color: rgba(255,255,255,0.05);
      padding: 0.875rem 1rem;
    }

    /* Modern Card Styling */
    ::ng-deep .p-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.5rem;
      backdrop-filter: blur(10px);
    }
    ::ng-deep .p-card .p-card-body {
      padding: 1.5rem;
    }

    /* Modern Select Styling */
    ::ng-deep .p-select {
      border-radius: 0.75rem;
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.05);
    }
    ::ng-deep .p-select:hover {
      border-color: rgba(99, 102, 241, 0.5);
    }

    /* Modern Button Styling */
    ::ng-deep .p-button.p-button-outlined {
      border-radius: 0.75rem;
    }

    /* Modern Avatar Styling */
    ::ng-deep .p-avatar {
      font-size: 0.75rem;
      font-weight: 600;
    }

    /* Paginator Styling */
    ::ng-deep .p-paginator {
      background: transparent;
      border: none;
      padding: 1rem 0;
    }

    /* Responsive Table */
    ::ng-deep .p-datatable-responsive .p-datatable-tbody > tr > td .p-column-title {
      display: none;
    }
    
    @media screen and (max-width: 768px) {
      ::ng-deep .p-datatable.p-datatable-responsive .p-datatable-thead {
        display: none;
      }
      
      ::ng-deep .p-datatable.p-datatable-responsive .p-datatable-tbody > tr {
        display: block;
        margin-bottom: 0.5rem;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 0.5rem;
      }
      
      ::ng-deep .p-datatable.p-datatable-responsive .p-datatable-tbody > tr > td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: none;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding: 0.75rem 1rem;
      }
      
      ::ng-deep .p-datatable.p-datatable-responsive .p-datatable-tbody > tr > td:last-child {
        border-bottom: none;
      }
      
      ::ng-deep .p-datatable.p-datatable-responsive .p-datatable-tbody > tr > td .p-column-title {
        display: block;
        font-weight: 600;
        color: #9ca3af;
      }
      
      ::ng-deep .p-tablist {
        flex-wrap: wrap;
      }
      
      ::ng-deep .p-tab {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
      }
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
        return (
          this.branchesStore.entities().find((b) => b.id === branchId) || null
        );
      }
      return this.currentBranchFromStore();
    }
    return this.currentBranchFromStore();
  });

  // Lista de sucursales para el selector (solo para admins)
  public availableBranches = computed(() => {
    if (!this.isAdmin()) return [];
    return this.branchesStore.entities().filter((b) => b.is_active);
  });

  // Signals
  public notificationTypeFilter = signal<string | null>(null);
  public isMobile = signal<boolean>(window.innerWidth < 768);
  
  constructor() {
    // Inicializar sucursal seleccionada para admins
    if (this.isAdmin() && this.currentBranchFromStore()) {
      this.selectedBranchId.set(this.currentBranchFromStore()?.id || null);
    }

    // Auto-refresh notifications every 30 seconds
    setInterval(() => {
      this.refreshNotifications();
    }, 30000);
    
    // Listen for window resize to update isMobile
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.isMobile.set(window.innerWidth < 768);
      });
    }
  }
  public selectedEmployeeId = signal<string | null>(null);
  public selectedDate = signal<Date>(new Date());
  public selectedEmployeeForSchedule = signal<string | null>(null);
  // child tab viewChildren
  private remindersTab = viewChild(BranchRemindersTabComponent);
  private requestsTab = viewChild(BranchRequestsTabComponent);
  public requestsPendingCount = signal(0);

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

  public getScheduleStyle(color: string | undefined | null) {
    return getScheduleColorInlineStyle(color);
  }

  // Branch employees
  public branchEmployees = computed(() => {
    const branchId = this.currentBranch()?.id;
    let employees = this.employeesStore
      .employeesList()
      .filter((emp) => emp.is_active);
    // Si hay sucursal seleccionada (o es gerente), filtrar por sucursal
    if (branchId) {
      employees = employees.filter((emp) => emp.branch_id === branchId);
    }
    // Retornar los empleados completos con short_name agregado
    return employees.map((emp) => ({
      ...emp,
      short_name: `${emp.first_name} ${emp.father_name}`,
    }));
  });

  // Current employee (branch manager)
  public currentEmployee = computed(() => this.store.currentEmployee());


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

    return notifications.map((notification) => {
      const recipient = employees.find(
        (emp) => emp.id === notification.recipient_id
      );
      return {
        ...notification,
        recipient: recipient
          ? {
              id: recipient.id,
              first_name: recipient.first_name,
              father_name: recipient.father_name,
            }
          : undefined,
      };
    });
  });

  // Timelogs resource - obtener logs del día usando timezone Panamá
  private readonly TIMEZONE = 'America/Panama';

  public timelogsResource = httpResource<any[]>(() => {
    const branchId = this.currentBranch()?.id;
    const date = this.selectedDate();
    if (!date) return undefined;
    const companyId = this.organizationService.getCurrentCompanyId();

    // Usar timezone Panamá para asegurar que las fechas sean correctas
    const dateStr = formatInTimeZone(date, this.TIMEZONE, 'yyyy-MM-dd');
    const startOfDayISO =
      new Date(`${dateStr}T00:00:00-05:00`).toISOString().split('.')[0] + 'Z';
    const endOfDayISO =
      new Date(`${dateStr}T23:59:59-05:00`).toISOString().split('.')[0] + 'Z';

    // Construir URL usando ApiUrlService
    // Usar !timelogs_employee_id_fkey!inner para especificar la FK correcta con INNER JOIN
    const select = `*,employee:employees!timelogs_employee_id_fkey!inner(id,first_name,father_name,is_active),branch:branches(id, name, short_name)`;

    const url =
      this.apiUrl.build('rest/v1/timelogs', {
        select,
        'employee.is_active': 'eq.true',
        branch_id: branchId ? `eq.${branchId}` : undefined,
        company_id: companyId ? `eq.${companyId}` : undefined,
        order: 'created_at.asc',
      }) +
      `&and=(created_at.gte.${startOfDayISO},created_at.lte.${endOfDayISO})`;

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

    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    const select = `*,schedule:schedules(*),branch:branches(id, name, short_name),employee:employees!inner(id,company_id,is_active)`;

    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      select,
      start_date: `lte.${endDate}`,
      end_date: `gte.${startDate}`,
      'employee.is_active': 'eq.true',
      'employee.company_id': companyId ? `eq.${companyId}` : undefined,
    });

    return {
      url,
      method: 'GET',
    };
  });

  // Timelog schedules resource - para marcaciones (carga horarios para fecha específica)
  // Alineado con employees-timetable.component.ts schedulesResource
  public timelogSchedulesResource = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const selectedDate = this.selectedDate();

    if (!selectedDate) return undefined;

    // Crear rango de un solo día para la fecha seleccionada
    const startDate = format(startOfDay(selectedDate), 'yyyy-MM-dd');
    const endDate = format(endOfDay(selectedDate), 'yyyy-MM-dd');

    // Usar ApiUrlService.build() como en timetables (no process.env directamente)
    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      select:
        '*,schedule:schedules(*),branch:branches(id, name, short_name),employee:employees(id,company_id)',
      start_date: `lte.${endDate}`,
      end_date: `gte.${startDate}`,
      ...(companyId ? { 'employee.company_id': `eq.${companyId}` } : {}),
    });

    return {
      url,
      method: 'GET',
    };
  });

  // Computed para semana
  public weekStart = computed(() => {
    // Usar startOfWeek con weekStartsOn: 0 para que comience en domingo
    return startOfWeek(this.currentDateForSchedule(), { weekStartsOn: 0 });
  });

  public weekEnd = computed(() => endOfDay(nextSunday(this.weekStart())));

  public currentWeekLabel = computed(() => {
    return (
      format(this.weekStart(), 'dd/MM/yyyy') +
      ' - ' +
      format(this.weekEnd(), 'dd/MM/yyyy')
    );
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
    let employees = this.employeesStore
      .employeesList()
      .filter((employee) => employee.is_active);

    // Filtrar por sucursal
    if (branchId) {
      employees = employees.filter((emp) => emp.branch_id === branchId);
    }

    // Filtro por búsqueda
    const searchTerm =
      this.employeeSearchForSchedule()?.toLowerCase().trim() || '';
    if (searchTerm) {
      employees = employees.filter(
        (emp) =>
          `${emp.first_name} ${emp.father_name}`
            .toLowerCase()
            .includes(searchTerm) ||
          emp.first_name.toLowerCase().includes(searchTerm) ||
          emp.father_name.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por puesto
    const positionId = this.currentPositionForSchedule();
    if (positionId) {
      employees = employees.filter((emp) => emp.position_id === positionId);
    }

    return employees.map(
      ({ id, first_name, father_name, position, position_id }) => ({
        id,
        first_name,
        father_name,
        position,
        position_id,
        days: this.weekDays(),
      })
    );
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
              start: startOfDay(
                toDate(shift.start_date, { timeZone: 'America/Panama' })
              ),
              end: endOfDay(
                toDate(shift.end_date, { timeZone: 'America/Panama' })
              ),
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

  // Computed values - Estadísticas
  public unreadNotificationsCount = computed(() => {
    return this.enrichedNotifications().filter((n) => !n.is_read).length || 0;
  });

  // Estadísticas del día seleccionado
  public todayStats = computed(() => {
    const logs = this.filteredTimelogs();

    return {
      totalEmployees: logs.length,
      onTime: logs.filter(
        (log: any) =>
          !log.is_delayed &&
          !log.is_missing &&
          !log.lunch_exceeded &&
          !log.is_early_exit &&
          log.entry_time
      ).length,
      delayed: logs.filter((log: any) => log.is_delayed).length,
      missing: logs.filter((log: any) => !log.entry_time).length,
      lunchExceeded: logs.filter((log: any) => log.lunch_exceeded).length,
      earlyExit: logs.filter((log: any) => log.is_early_exit).length,
    };
  });

  // Recordatorios pendientes - recibido del hijo via output
  public remindersCount = signal(0);
  public pendingRemindersCount = computed(() => this.remindersCount());

  public filteredNotifications = computed(() => {
    const notifications = this.enrichedNotifications();
    const typeFilter = this.notificationTypeFilter();
    if (!typeFilter) return notifications;
    return notifications.filter((n) => n.type === typeFilter);
  });

  public filteredTimelogs = computed(() => {
    const logs = this.timelogsResource.value() || [];
    // CAMBIAR: usar timelogSchedulesResource en lugar de schedulesResource para marcaciones
    const schedules = this.timelogSchedulesResource.value() || [];
    const employeeId = this.selectedEmployeeId();
    const selectedDate = this.selectedDate();

    const currentBranchId = this.currentBranch()?.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    console.log('🔍 [BRANCH-MANAGER] filteredTimelogs - Debug:', {
      selectedDate: selectedDate?.toISOString(),
      branchId: currentBranchId,
      companyId: companyId,
      logsCount: logs.length,
      schedulesCount: schedules.length,
      // Verificar si los schedules tienen branch_id correcto
      schedulesBranches: schedules.map((s: any) => s.branch_id),
      schedulesSample: schedules.slice(0, 3).map((s: any) => ({
        employee_id: s.employee_id,
        schedule_name: s.schedule?.name,
        branch_id: s.branch_id,
        start_date: s.start_date,
        end_date: s.end_date,
      })),
    });
    const grouped: Record<string, any> = {};

    // IDs de schedules que son día libre/feriado
    const dayOffScheduleIds = [
      'c01dff8f-ce0d-498f-a473-46418576e589', // Dia Libre
      '3d07f626-d58f-4203-bac5-f6e35557e0ad', // Feriado
      'e7e63bb4-ca86-4091-85fa-c4da16545b49', // Vacaciones
      'f2d92995-96a0-414f-b64a-9823db776745', // Compensatorio
    ];

    // Paso 1: Poblar con empleados que PERTENECEN a esta sucursal (para ver faltas)
    const branchEmployees = this.branchEmployees();
    console.log('🔍 [BRANCH-MANAGER] Procesando empleados:', {
      totalEmpleados: branchEmployees.length,
      empleadosSample: branchEmployees
        .slice(0, 3)
        .map((e) => ({ id: e.id, name: `${e.first_name} ${e.father_name}` })),
    });

    branchEmployees.forEach((emp) => {
      // Encontrar horario programado del empleado para la fecha
      const employeeSchedule = selectedDate
        ? this.findEmployeeScheduleForDate(emp.id, selectedDate, schedules)
        : null;

      console.log(
        `🔍 [BRANCH-MANAGER] Empleado ${emp.first_name} ${emp.father_name}:`,
        {
          employeeId: emp.id,
          hasSchedule: !!employeeSchedule,
          scheduleFound: employeeSchedule
            ? {
                scheduleName: employeeSchedule.schedule?.name,
                startDate: employeeSchedule.start_date,
                endDate: employeeSchedule.end_date,
              }
            : null,
          selectedDate: selectedDate?.toISOString(),
        }
      );

      const schedule = employeeSchedule?.schedule;
      const isDayOff =
        schedule?.day_off ||
        (schedule?.id && dayOffScheduleIds.includes(schedule.id)) ||
        schedule?.name?.toLowerCase().includes('libre') ||
        schedule?.name?.toLowerCase().includes('feriado') ||
        schedule?.name?.toLowerCase().includes('vacaciones') ||
        schedule?.name?.toLowerCase().includes('compensatorio');

      grouped[emp.id] = {
        employee_id: emp.id,
        employee: emp,
        entry_time: null,
        entry_branch: null, // Sucursal donde marcó entrada
        lunch_start_time: null,
        lunch_start_branch: null,
        lunch_end_time: null,
        lunch_end_branch: null,
        exit_time: null,
        exit_branch: null, // Sucursal donde marcó salida
        is_delayed: false,
        is_missing: !isDayOff, // Por defecto falta si tiene horario y no es libre
        is_day_off: isDayOff,
        lunch_exceeded: false,
        is_early_exit: false,
        schedule: schedule,
        schedule_name: schedule?.name || 'Sin horario',
        last_entry_time: null,
      };
    });

    // Paso 2: Filtrar logs estrictamente por branch_id de la sucursal seleccionada
    // Y añadir personas de otras sucursales que marcaron AQUÍ
    const branchLogs = currentBranchId
      ? logs.filter((log: any) => log.branch_id === currentBranchId)
      : logs;

    branchLogs.forEach((log: any) => {
      if (!log.employee_id) return;

      // Si no existe (es de otra sucursal), crearlo
      if (!grouped[log.employee_id]) {
        const employeeSchedule = selectedDate
          ? this.findEmployeeScheduleForDate(
              log.employee_id,
              selectedDate,
              schedules
            )
          : null;
        const schedule = employeeSchedule?.schedule;
        const isDayOff =
          schedule?.day_off ||
          (schedule?.id && dayOffScheduleIds.includes(schedule.id)) ||
          schedule?.name?.toLowerCase().includes('libre');

        grouped[log.employee_id] = {
          employee_id: log.employee_id,
          employee: log.employee || { id: log.employee_id },
          entry_time: null,
          entry_branch: null,
          lunch_start_time: null,
          lunch_start_branch: null,
          lunch_end_time: null,
          lunch_end_branch: null,
          exit_time: null,
          exit_branch: null,
          is_delayed: false,
          is_missing: false, // Si tiene logs aquí, no está missing
          is_day_off: isDayOff,
          lunch_exceeded: false,
          is_early_exit: false,
          schedule: schedule,
          schedule_name: schedule?.name || 'Sin horario',
          last_entry_time: null,
        };
      }

      const logTime = new Date(log.created_at);
      const entry = grouped[log.employee_id];

      // Al tener al menos una marcación en esta sucursal, ya no está missing
      entry.is_missing = false;

      if (log.employee) {
        entry.employee = { ...entry.employee, ...log.employee };
      }

      // Procesar según tipo de marcación (guardar branch junto con cada tiempo)
      if (log.type === 'entry') {
        if (entry.exit_time || !entry.entry_time) {
          entry.entry_time = logTime;
          entry.entry_branch = log.branch;
          entry.lunch_start_time = null;
          entry.lunch_start_branch = null;
          entry.lunch_end_time = null;
          entry.lunch_end_branch = null;
          entry.exit_time = null;
          entry.exit_branch = null;
          entry.last_entry_time = logTime;
        } else {
          entry.entry_time = entry.entry_time || logTime;
          if (!entry.entry_branch) entry.entry_branch = log.branch;
        }
      } else if (log.type === 'lunch_start') {
        if (!entry.lunch_start_time) {
          entry.lunch_start_time = logTime;
          entry.lunch_start_branch = log.branch;
        }
      } else if (log.type === 'lunch_end') {
        if (!entry.lunch_end_time) {
          entry.lunch_end_time = logTime;
          entry.lunch_end_branch = log.branch;
        }
      } else if (log.type === 'exit') {
        if (!entry.exit_time) {
          entry.exit_time = logTime;
          entry.exit_branch = log.branch;
        }
      }
    });

    // Paso 2: Calcular violaciones para cada empleado
    Object.values(grouped).forEach((employeeLog: any) => {
      delete employeeLog.last_entry_time;

      if (!selectedDate) return;

      const schedule = employeeLog.schedule;
      if (!schedule || employeeLog.is_day_off) return;

      // Calcular retraso en entrada
      if (employeeLog.entry_time) {
        const delayMinutes = this.calculateDelayMinutes(
          employeeLog.entry_time,
          schedule
        );
        employeeLog.is_delayed = delayMinutes > 5;
        if (employeeLog.is_delayed) {
          employeeLog.delay_minutes = delayMinutes;
        }
      }

      // Calcular salida temprana
      if (employeeLog.exit_time) {
        const earlyExitMinutes = this.calculateEarlyExitMinutes(
          employeeLog.exit_time,
          schedule
        );
        employeeLog.is_early_exit = earlyExitMinutes > 0;
      }

      // Calcular almuerzo excedido
      if (employeeLog.lunch_start_time && employeeLog.lunch_end_time) {
        employeeLog.lunch_exceeded = this.calculateLunchExceeded(
          employeeLog.lunch_start_time,
          employeeLog.lunch_end_time,
          schedule
        );
      }
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
    const scheduleTimeStr =
      typeof schedule.entry_time === 'string'
        ? schedule.entry_time
        : format(new Date(schedule.entry_time), 'HH:mm:ss');

    const entryParts = entryTimeStr.split(':');
    const scheduleParts = scheduleTimeStr.split(':');

    const entryDate = new Date();
    entryDate.setHours(+entryParts[0], +entryParts[1], +entryParts[2] || 0, 0);

    const scheduleDate = new Date();
    scheduleDate.setHours(
      +scheduleParts[0],
      +scheduleParts[1],
      +scheduleParts[2] || 0,
      0
    );

    return differenceInMinutes(entryDate, scheduleDate);
  }

  private calculateEarlyExitMinutes(exitTime: Date, schedule: any): number {
    if (!schedule?.exit_time || schedule.day_off) return 0;

    const exitTimeStr = format(exitTime, 'HH:mm:ss');
    const scheduleTimeStr =
      typeof schedule.exit_time === 'string'
        ? schedule.exit_time
        : format(new Date(schedule.exit_time), 'HH:mm:ss');

    const exitParts = exitTimeStr.split(':');
    const scheduleParts = scheduleTimeStr.split(':');

    const exitDate = new Date();
    exitDate.setHours(+exitParts[0], +exitParts[1], +exitParts[2] || 0, 0);

    const scheduleDate = new Date();
    scheduleDate.setHours(
      +scheduleParts[0],
      +scheduleParts[1],
      +scheduleParts[2] || 0,
      0
    );

    return differenceInMinutes(scheduleDate, exitDate);
  }

  private calculateLunchExceeded(
    lunchStart: Date,
    lunchEnd: Date,
    schedule: any
  ): boolean {
    if (!schedule?.lunch_duration_minutes || schedule.day_off) return false;

    const lunchDuration = differenceInMinutes(lunchEnd, lunchStart);
    const allowedDuration = schedule.lunch_duration_minutes;

    return lunchDuration > allowedDuration;
  }

  private findEmployeeScheduleForDate(
    employeeId: string,
    date: Date,
    schedules: any[]
  ): any {
    // Normalizar la fecha de búsqueda al inicio del día en zona Panama
    const searchDate = startOfDay(toDate(date, { timeZone: 'America/Panama' }));

    const employeeSchedules = schedules.filter(
      (s) => s.employee_id === employeeId
    );

    console.log(
      `🔍 [BRANCH-MANAGER] Buscando schedule para empleado ${employeeId}:`,
      {
        searchDate: searchDate.toISOString(),
        schedulesCount: employeeSchedules.length,
        schedulesForEmployee: employeeSchedules.map((s) => {
          const start = startOfDay(
            toDate(s.start_date, { timeZone: 'America/Panama' })
          );
          const end = endOfDay(
            toDate(s.end_date, { timeZone: 'America/Panama' })
          );
          return {
            schedule_name: s.schedule?.name,
            start_date: s.start_date,
            end_date: s.end_date,
            startParsed: start.toISOString(),
            endParsed: end.toISOString(),
            isWithinRange: searchDate >= start && searchDate <= end,
          };
        }),
      }
    );

    return schedules.find((s) => {
      if (s.employee_id !== employeeId) return false;

      const start = startOfDay(
        toDate(s.start_date, { timeZone: 'America/Panama' })
      );
      const end = endOfDay(toDate(s.end_date, { timeZone: 'America/Panama' }));

      return searchDate >= start && searchDate <= end;
    });
  }

  // Función para obtener la fecha del compensatorio desde las notas (consistente con hr-disabilities)
  public getCompensatoryDateFromNotes(data: any): string | null {
    if (data.notes) {
      const notesArray = Array.isArray(data.notes)
        ? data.notes
        : typeof data.notes === 'string'
        ? [data.notes]
        : [];

      const dateNote = notesArray.find(
        (note: any) =>
          typeof note === 'string' && note.includes('Fecha compensatorio:')
      );

      if (dateNote) {
        const match = dateNote.match(/Fecha compensatorio:\s*(.+)/);
        if (match && match[1]) {
          const dateStr = match[1].trim();
          // Si viene en formato ISO (YYYY-MM-DD), convertir a DD/MM/YYYY
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            try {
              const date = new Date(dateStr);
              return format(date, 'dd/MM/yyyy');
            } catch (error) {
              return dateStr; // fallback al string original si hay error
            }
          }
          return dateStr;
        }
      }
    }
    return null;
  }

  // Helper methods
  public getEmployeeInitials(
    employee?: Employee | { first_name?: string; father_name?: string }
  ): string {
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

  public getNotificationSeverity(
    type: string
  ):
    | 'success'
    | 'info'
    | 'warn'
    | 'danger'
    | 'secondary'
    | 'contrast'
    | undefined {
    const severities: Record<
      string,
      'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
    > = {
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
    this.remindersTab()?.reload();
  }

  public refreshEmployeeRequests() {
    this.requestsTab()?.reload();
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

  public async onSubmitCompensatoryFromBranchManager(data: any): Promise<void> {
    try {
      // Importar la función de upload compensatorio
      const { uploadCompensatory } = await import(
        '../employee-portal/actions/employee-portal-compensatory.actions'
      );

      // Preparar las dependencias para el branch manager
      const deps = {
        http: this.http,
        apiUrl: this.apiUrl,
        messageService: this.message,
        currentEmployee: () => this.currentEmployee(), // El branch manager que está haciendo la solicitud
        formState: data, // Los datos del formulario con el empleado seleccionado
        resetForm: () => {}, // No necesitamos reset ya que es modal
        reloadRequests: () => this.refreshEmployeeRequests(),
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
      console.error(
        'Error submitting compensatory from branch manager:',
        error
      );
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
      });
    }
  }
}
