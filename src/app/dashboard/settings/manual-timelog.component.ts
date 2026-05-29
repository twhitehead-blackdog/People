import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { endOfDay, format, set, startOfDay } from 'date-fns';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { Employee, Schedule, TimeLog } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { DashboardStore } from '../../stores/dashboard.store';

type PunchType = 'entry' | 'lunch_start' | 'lunch_end' | 'exit';

interface AuditEntry {
  id: string;
  kind: 'create' | 'edit' | 'delete';
  kindLabel: string;
  punchTypeLabel: string;
  punchedAtLabel: string | null;
  timeShift: string | null;
  authorLabel: string;
  reason: string | null;
  createdAt: string;
}

interface DayTimelineEntry {
  id: string;
  type: PunchType;
  punchTypeLabel: string;
  punchedAtLabel: string;
  punchedAtSort: number;
  source: string;
  sourceLabel: string;
  sourceClass: string;
  isManual: boolean;
  reason: string | null;
  authorLabel: string | null;
}

interface PendingCorrection {
  id: string;
  employeeId: string;
  employeeName: string;
  branchName: string | null;
  branchId: string | null;
  timelogDate: string; // yyyy-mm-dd
  timelogDateLabel: string; // dd/MM
  timelogTime: string | null; // HH:MM (24h)
  timelogTimeLabel: string | null; // h:mm a (display)
  timelogType: PunchType;
  punchTypeLabel: string;
  reason: string;
  attachmentUrl: string | null;
  createdAt: string;
  approving?: boolean;
}

interface RecentActivityEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  branchName: string | null;
  punchTypeLabel: string;
  punchedAtLabel: string;
  punchedDate: string;
  kindLabel: string;
  kindClass: string;
  authorLabel: string;
  reason: string | null;
  createdAt: string;
}

interface ExistingPunch {
  id: string;
  time: Date;
}

interface ExistingPunches {
  entry: ExistingPunch | null;
  lunch_start: ExistingPunch | null;
  lunch_end: ExistingPunch | null;
  exit: ExistingPunch | null;
}

@Component({
  selector: 'pt-manual-timelog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    Select,
    DatePicker,
    InputText,
    Textarea,
    ToastModule,
    ConfirmDialog,
    Dialog,
    DatePipe,
  ],
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <p-card>
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-clock text-amber-400"></i>
            <span>Marcación Manual</span>
          </div>
        </ng-template>
        <ng-template #subtitle>
          Registra o edita marcaciones de empleados
        </ng-template>

        <div class="space-y-6 mt-4">
          <!-- Paso 1: Seleccionar Empleado -->
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <i class="pi pi-user text-cyan-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Paso 1: Selecciona el Empleado
              </h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <p-select
                [options]="branchOptions()"
                optionLabel="label"
                optionValue="id"
                [(ngModel)]="branchFilterId"
                placeholder="Filtrar por sucursal..."
                showClear
                appendTo="body"
                styleClass="w-full"
              />
              <p-select
                class="md:col-span-2"
                [options]="filteredEmployees()"
                optionLabel="short_name"
                optionValue="id"
                [(ngModel)]="selectedEmployeeId"
                placeholder="Buscar empleado..."
                [filter]="true"
                filterBy="short_name,employee_number,branch.name"
                showClear
                appendTo="body"
                styleClass="w-full"
                (onChange)="onEmployeeChange()"
              >
              <ng-template #selectedItem let-selected>
                @if (selected) {
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ selected.short_name }}</span>
                  <span class="text-gray-400 text-sm">({{ selected.employee_number }})</span>
                  @if (selected.branch?.name) {
                  <span class="text-gray-500 text-xs">· {{ selected.branch.name }}</span>
                  }
                </div>
                }
              </ng-template>
              <ng-template #item let-employee>
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ employee.short_name }}</span>
                  <span class="text-gray-400 text-sm">({{ employee.employee_number }})</span>
                  @if (employee.branch?.name) {
                  <span class="text-gray-500 text-xs">· {{ employee.branch.name }}</span>
                  }
                </div>
              </ng-template>
              </p-select>
            </div>
          </div>

          <!-- Panel de aterrizaje (solo cuando no hay empleado) -->
          @if (!selectedEmployeeId()) {
            <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
              <!-- Tabs -->
              <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <div class="inline-flex rounded-lg bg-neutral-900/50 border border-neutral-700/50 p-0.5">
                  <button type="button"
                    class="px-3 py-1.5 text-xs rounded-md transition flex items-center gap-1.5"
                    [class.bg-amber-500/15]="landingTab() === 'pending'"
                    [class.text-amber-200]="landingTab() === 'pending'"
                    [class.text-gray-400]="landingTab() !== 'pending'"
                    (click)="landingTab.set('pending')">
                    <i class="pi pi-flag text-[10px]"></i>
                    Gestiones pendientes
                    @if (pendingCorrections().length > 0) {
                      <span class="text-[10px] px-1 py-0 rounded bg-amber-500/30 text-amber-100">{{ pendingCorrections().length }}</span>
                    }
                  </button>
                  <button type="button"
                    class="px-3 py-1.5 text-xs rounded-md transition flex items-center gap-1.5"
                    [class.bg-indigo-500/15]="landingTab() === 'activity'"
                    [class.text-indigo-200]="landingTab() === 'activity'"
                    [class.text-gray-400]="landingTab() !== 'activity'"
                    (click)="landingTab.set('activity')">
                    <i class="pi pi-history text-[10px]"></i>
                    Actividad reciente
                  </button>
                </div>

                @if (landingTab() === 'activity') {
                  <div class="flex items-center gap-2 text-xs">
                    <span class="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                      Hoy: <strong>{{ recentStats().today }}</strong>
                    </span>
                    <span class="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-200">
                      7 días: <strong>{{ recentStats().week }}</strong>
                    </span>
                    <button type="button" class="text-gray-400 hover:text-white px-2 py-1" (click)="exportRecentActivityCSV()" title="Exportar CSV">
                      <i class="pi pi-file-export"></i>
                    </button>
                    <button type="button" class="text-gray-400 hover:text-gray-200 px-2 py-1"
                      (click)="loadRecentActivity()" [disabled]="loadingRecentActivity()">
                      <i class="pi" [class.pi-refresh]="!loadingRecentActivity()" [class.pi-spin]="loadingRecentActivity()" [class.pi-spinner]="loadingRecentActivity()"></i>
                    </button>
                  </div>
                } @else {
                  <button type="button" class="text-xs text-gray-400 hover:text-gray-200 px-2 py-1"
                    (click)="loadPendingCorrections()" [disabled]="loadingPendingCorrections()">
                    <i class="pi" [class.pi-refresh]="!loadingPendingCorrections()" [class.pi-spin]="loadingPendingCorrections()" [class.pi-spinner]="loadingPendingCorrections()"></i>
                    Refrescar
                  </button>
                }
              </div>

              @if (landingTab() === 'pending') {
                @if (loadingPendingCorrections()) {
                  <div class="text-xs text-gray-500 py-3"><i class="pi pi-spin pi-spinner mr-1"></i>Cargando gestiones…</div>
                } @else if (pendingCorrections().length === 0) {
                  <div class="text-sm text-gray-500 py-3">No hay gestiones de corrección pendientes.</div>
                } @else {
                  <p class="text-xs text-gray-500 mb-2">
                    La sucursal ya indicó la hora exacta. Solo <strong>revisa y aprueba</strong>.
                  </p>
                  <ul class="space-y-1.5">
                    @for (c of pendingCorrections(); track c.id) {
                      <li class="px-3 py-2 rounded-lg bg-neutral-900/40 border border-amber-500/20 hover:border-amber-500/40 transition">
                        <div class="flex items-center gap-2 flex-wrap text-xs">
                          <span class="text-white font-medium">{{ c.employeeName }}</span>
                          @if (c.branchName) { <span class="text-gray-500">· {{ c.branchName }}</span> }
                          <span class="text-gray-400 ml-1">{{ c.punchTypeLabel }}</span>
                          @if (c.timelogDateLabel) { <span class="text-cyan-300">{{ c.timelogDateLabel }}</span> }
                          @if (c.timelogTimeLabel) {
                            <span class="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-100">
                              <i class="pi pi-clock text-[9px] mr-1"></i>{{ c.timelogTimeLabel }}
                            </span>
                          } @else {
                            <span class="px-1.5 py-0.5 rounded text-[11px] bg-red-500/20 border border-red-500/40 text-red-200">
                              <i class="pi pi-exclamation-circle text-[9px] mr-1"></i>Sin hora
                            </span>
                          }
                          @if (c.attachmentUrl) {
                            <a [href]="c.attachmentUrl" target="_blank" rel="noopener" class="text-blue-400 hover:underline" title="Ver adjunto" (click)="$event.stopPropagation()">
                              <i class="pi pi-paperclip"></i>
                            </a>
                          }
                          <span class="text-gray-500 ml-auto">{{ c.createdAt | date:'dd/MM HH:mm' }}</span>
                        </div>
                        <div class="text-xs text-gray-400 mt-1 italic">"{{ c.reason }}"</div>
                        <div class="flex justify-end gap-2 mt-2 flex-wrap">
                          <button type="button"
                            class="px-2 py-1 text-xs rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-200 hover:bg-rose-500/20"
                            (click)="rejectCorrection(c)">
                            <i class="pi pi-times text-[10px] mr-1"></i>Rechazar
                          </button>
                          <button type="button"
                            class="px-2 py-1 text-xs rounded-md bg-neutral-700/40 border border-neutral-600/40 text-gray-300 hover:bg-neutral-700/70"
                            (click)="openCorrection(c)"
                            title="Abrir formulario para ajustar antes de crear">
                            <i class="pi pi-pencil text-[10px] mr-1"></i>Editar
                          </button>
                          @if (c.timelogTime) {
                            <button type="button"
                              class="px-3 py-1 text-xs rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                              [disabled]="c.approving"
                              (click)="approveCorrection(c)">
                              @if (c.approving) {
                                <i class="pi pi-spin pi-spinner text-[10px] mr-1"></i>
                              } @else {
                                <i class="pi pi-check text-[10px] mr-1"></i>
                              }
                              Aprobar
                            </button>
                          } @else {
                            <button type="button"
                              class="px-3 py-1 text-xs rounded-md bg-amber-500/15 border border-amber-500/35 text-amber-200 hover:bg-amber-500/25"
                              (click)="openCorrection(c)">
                              <i class="pi pi-bolt text-[10px] mr-1"></i>Indicar hora y aprobar
                            </button>
                          }
                        </div>
                      </li>
                    }
                  </ul>
                }
              } @else {
                <!-- Filtros + búsqueda -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <input pInputText type="text" [ngModel]="activitySearchEmployee()" (ngModelChange)="activitySearchEmployee.set($event)"
                    placeholder="Buscar empleado…" class="w-full text-xs" />
                  <p-select [options]="branchOptions()" optionLabel="label" optionValue="id"
                    [(ngModel)]="activityFilterBranch" placeholder="Sucursal" showClear appendTo="body" styleClass="w-full" />
                  <p-select [options]="activityKindOptions" optionLabel="label" optionValue="value"
                    [ngModel]="activityFilterKind()" (ngModelChange)="activityFilterKind.set($event)"
                    placeholder="Tipo" appendTo="body" styleClass="w-full" />
                  <input pInputText type="text" [ngModel]="activityFilterAuthor()" (ngModelChange)="activityFilterAuthor.set($event)"
                    placeholder="Autor…" class="w-full text-xs" />
                </div>

                @if (loadingRecentActivity()) {
                  <div class="text-xs text-gray-500 py-3"><i class="pi pi-spin pi-spinner mr-1"></i>Cargando actividad…</div>
                } @else if (filteredRecentActivity().length === 0) {
                  <div class="text-sm text-gray-500 py-3">Sin resultados con los filtros actuales.</div>
                } @else {
                  <p class="text-xs text-gray-500 mb-2">Mostrando {{ filteredRecentActivity().length }} de {{ recentActivity().length }} · click para abrir.</p>
                  <ul class="divide-y divide-neutral-700/40  -mx-1">
                    @for (act of filteredRecentActivity(); track act.id) {
                      <li class="px-2 py-2 hover:bg-neutral-700/30 rounded cursor-pointer transition"
                        (click)="selectEmployeeFromActivity(act.employeeId, act.punchedDate)">
                        <div class="flex items-center gap-2 flex-wrap text-xs">
                          <span class="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide" [class]="act.kindClass">
                            {{ act.kindLabel }}
                          </span>
                          <span class="text-white font-medium">{{ act.employeeName }}</span>
                          @if (act.branchName) { <span class="text-gray-500">· {{ act.branchName }}</span> }
                          <span class="text-gray-400 ml-1">{{ act.punchTypeLabel }}</span>
                          @if (act.punchedAtLabel) {
                            <span class="text-cyan-300">{{ act.punchedDate }} {{ act.punchedAtLabel }}</span>
                          }
                          <span class="text-gray-500 ml-auto">{{ act.createdAt | date:'dd/MM HH:mm' }}</span>
                        </div>
                        <div class="text-xs text-gray-400 mt-0.5">
                          Por <span class="text-gray-200">{{ act.authorLabel }}</span>
                          @if (act.reason) {
                            <span class="text-gray-500"> · </span>
                            <span class="italic">"{{ act.reason }}"</span>
                          }
                        </div>
                      </li>
                    }
                  </ul>
                }
              }
            </div>
          }

          <!-- Banner de gestión activa -->
          @if (selectedEmployeeId() && activePendingCorrection(); as gp) {
            <div class="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex-wrap">
              <i class="pi pi-flag text-amber-300"></i>
              <span class="text-amber-100 text-sm">
                Resolviendo gestión <strong>#{{ gp.id.slice(0, 8) }}</strong>
                · {{ gp.punchTypeLabel }} · {{ gp.timelogDateLabel }}
                @if (gp.timelogTimeLabel) {
                  · <strong>{{ gp.timelogTimeLabel }}</strong>
                }
              </span>
              <button type="button"
                class="ml-auto px-2 py-1 text-xs rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 hover:bg-emerald-500/25"
                (click)="markActiveAsHandled()"
                title="Cierra la gestión sin crear/editar marcación (cuando ya fue resuelta por otro medio)">
                <i class="pi pi-check text-[10px] mr-1"></i>Marcar manejada
              </button>
              <button type="button"
                class="px-2 py-1 text-xs rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-200 hover:bg-rose-500/20"
                (click)="rejectActiveCorrection()">
                <i class="pi pi-times text-[10px] mr-1"></i>Rechazar
              </button>
            </div>
          }

          <!-- Contador de sesión + volver al panel -->
          @if (selectedEmployeeId() && sessionTotalChanges() > 0) {
            <div class="flex items-center gap-3 text-xs px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <i class="pi pi-check-circle text-emerald-400"></i>
              <span class="text-emerald-200">
                Sesión:
                <strong>{{ sessionCounter().created }}</strong> creadas,
                <strong>{{ sessionCounter().edited }}</strong> editadas,
                <strong>{{ sessionCounter().deleted }}</strong> eliminadas
              </span>
              <button type="button"
                class="ml-auto text-gray-400 hover:text-gray-200"
                (click)="backToLanding()">
                <i class="pi pi-arrow-left text-[10px] mr-1"></i>Volver al panel
              </button>
            </div>
          } @else if (selectedEmployeeId()) {
            <div class="flex justify-start">
              <button type="button"
                class="text-xs text-gray-400 hover:text-gray-200 px-2 py-1"
                (click)="backToLanding()">
                <i class="pi pi-arrow-left text-[10px] mr-1"></i>Volver al panel
              </button>
            </div>
          }

          <!-- Paso 2: Seleccionar Fecha -->
          @if (selectedEmployeeId()) {
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <i class="pi pi-calendar text-purple-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Paso 2: Selecciona la Fecha
              </h3>
            </div>
            <p-datepicker
              [(ngModel)]="selectedDate"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              [maxDate]="today"
              appendTo="body"
              styleClass="w-full"
              placeholder="Seleccionar fecha..."
              (onSelect)="onDateChange()"
            />
          </div>
          }

          <!-- Panel de Estado de Marcaciones -->
          @if (selectedDate() && selectedEmployeeId()) {
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <i class="pi pi-list-check text-green-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Estado de Marcaciones - {{ selectedDate() | date:'dd/MM/yyyy' }}
              </h3>
            </div>

            <!-- Horario asignado para ese día -->
            @if (loadingSchedule()) {
              <div class="flex items-center gap-2 text-gray-400 text-xs mb-3 py-1">
                <i class="pi pi-spin pi-spinner text-xs"></i>
                <span>Cargando horario...</span>
              </div>
            } @else if (employeeSchedule()) {
              <div class="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/25">
                <i class="pi pi-calendar text-cyan-400 text-sm flex-shrink-0"></i>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0 flex-1">
                  <span class="text-cyan-200 font-semibold text-sm">{{ employeeSchedule()!.name }}</span>
                  @if (!employeeSchedule()!.day_off) {
                    <div class="flex items-center gap-2 text-xs text-gray-400">
                      @if (employeeSchedule()!.entry_time) {
                        <span><i class="pi pi-sign-in text-green-400 mr-1"></i>{{ employeeSchedule()!.entry_time | date:'h:mm a' }}</span>
                      }
                      @if (employeeSchedule()!.lunch_start_time) {
                        <span class="text-gray-600">·</span>
                        <span><i class="pi pi-sun text-yellow-400 mr-1"></i>{{ employeeSchedule()!.lunch_start_time | date:'h:mm a' }} – {{ employeeSchedule()!.lunch_end_time | date:'h:mm a' }}</span>
                      }
                      @if (employeeSchedule()!.exit_time) {
                        <span class="text-gray-600">·</span>
                        <span><i class="pi pi-sign-out text-red-400 mr-1"></i>{{ employeeSchedule()!.exit_time | date:'h:mm a' }}</span>
                      }
                    </div>
                  } @else {
                    <span class="text-xs text-amber-400"><i class="pi pi-moon mr-1"></i>Día libre</span>
                  }
                </div>
                @if (canGenerateFromSchedule()) {
                  <button type="button"
                    class="px-2 py-1 text-xs rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 hover:bg-emerald-500/25 transition flex items-center gap-1.5 flex-shrink-0"
                    [disabled]="bulkSubmitting()"
                    (click)="generateDayFromSchedule()"
                    title="Crea las marcaciones faltantes según el horario del empleado">
                    @if (bulkSubmitting()) {
                      <i class="pi pi-spin pi-spinner text-[10px]"></i>
                    } @else {
                      <i class="pi pi-bolt text-[10px]"></i>
                    }
                    <span>Generar día ({{ missingFromScheduleCount() }})</span>
                  </button>
                }
              </div>
            } @else {
              <div class="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-neutral-700/40 border border-neutral-600/40">
                <i class="pi pi-calendar-times text-gray-500 text-sm"></i>
                <span class="text-xs text-gray-500">Sin horario asignado para este día</span>
              </div>
            }

            @if (loadingPunches()) {
            <div class="flex items-center gap-2 text-gray-400 py-4">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Verificando marcaciones...</span>
            </div>
            } @else {
            <p class="text-xs text-gray-500 mb-3">Haz clic en una marcación existente para editarla.</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              @for (punch of punchStatusCards(); track punch.type) {
              <div
                class="p-3 rounded-lg border transition-all"
                [class.bg-green-500/10]="punch.exists"
                [class.border-green-500/30]="punch.exists"
                [class.bg-orange-500/10]="!punch.exists"
                [class.border-orange-500/30]="!punch.exists"
                [class.cursor-pointer]="punch.exists"
                [class.hover:ring-1]="punch.exists"
                [class.hover:ring-blue-400]="punch.exists"
                (click)="punch.exists && startEditPunch(punch.type)"
              >
                <div class="flex items-center gap-2 mb-1">
                  <i
                    class="pi text-sm"
                    [class.pi-check-circle]="punch.exists"
                    [class.text-green-400]="punch.exists"
                    [class.pi-times-circle]="!punch.exists"
                    [class.text-orange-400]="!punch.exists"
                  ></i>
                  <span class="font-medium text-white">{{ punch.label }}</span>
                  @if (punch.exists) {
                  <i class="pi pi-pencil text-xs text-blue-400 ml-auto"></i>
                  }
                </div>
                <span [class.text-green-300]="punch.exists" [class.text-orange-300]="!punch.exists">
                  {{ punch.exists ? (punch.time | date:'h:mm a') : 'NO REGISTRADA' }}
                </span>
              </div>
              }
            </div>

            <!-- Timeline completa del día -->
            @if (dayTimeline().length > 0) {
              <div class="mt-4 pt-3 border-t border-neutral-700/40">
                <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Timeline del día ({{ dayTimeline().length }})
                </p>
                <ul class="space-y-1.5">
                  @for (it of dayTimeline(); track it.id) {
                    <li class="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-neutral-900/40 border border-neutral-700/40">
                      <span class="font-mono text-cyan-300 w-16 flex-shrink-0">{{ it.punchedAtLabel }}</span>
                      <span class="text-white font-medium w-28 flex-shrink-0">{{ it.punchTypeLabel }}</span>
                      <span class="px-1.5 py-0.5 rounded text-[10px] border" [class]="it.sourceClass">{{ it.sourceLabel }}</span>
                      @if (it.authorLabel) {
                        <span class="text-gray-500 truncate">por {{ it.authorLabel }}</span>
                      }
                      @if (it.reason) {
                        <span class="text-gray-500 italic truncate" [title]="it.reason">— {{ it.reason }}</span>
                      }
                      <span class="ml-auto flex items-center gap-1 flex-shrink-0">
                        <button type="button"
                          class="text-blue-300 hover:text-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-500/10"
                          (click)="editTimelineEntry(it)"
                          title="Editar hora">
                          <i class="pi pi-pencil text-[10px]"></i>
                        </button>
                        <button type="button"
                          class="text-rose-300 hover:text-rose-200 px-1.5 py-0.5 rounded hover:bg-rose-500/10"
                          (click)="deleteTimelineEntry(it)"
                          title="Eliminar esta marcación">
                          <i class="pi pi-trash text-[10px]"></i>
                        </button>
                      </span>
                    </li>
                  }
                </ul>
              </div>
            }
            }
          </div>
          }

          <!-- Historial / Auditoría del día -->
          @if (selectedDate() && selectedEmployeeId() && !loadingPunches()) {
            <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <i class="pi pi-history text-indigo-400"></i>
                  </div>
                  <h3 class="text-base font-semibold text-white m-0">
                    Historial de cambios del día
                  </h3>
                </div>
                <button type="button"
                  class="text-xs text-gray-400 hover:text-gray-200"
                  (click)="loadAuditTrail()"
                  [disabled]="loadingAudit()">
                  <i class="pi" [class.pi-refresh]="!loadingAudit()" [class.pi-spin]="loadingAudit()" [class.pi-spinner]="loadingAudit()"></i>
                  Refrescar
                </button>
              </div>

              @if (loadingAudit()) {
                <div class="text-xs text-gray-500 py-2"><i class="pi pi-spin pi-spinner mr-1"></i>Cargando historial…</div>
              } @else if (auditEntries().length === 0) {
                <div class="text-xs text-gray-500 py-2">Sin cambios manuales registrados para este día.</div>
              } @else {
                <ul class="space-y-2">
                  @for (entry of auditEntries(); track entry.id) {
                    <li class="px-3 py-2 rounded-lg bg-neutral-900/40 border border-neutral-700/50">
                      <div class="flex items-center gap-2 flex-wrap text-xs">
                        <span class="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide"
                          [class.bg-emerald-500/15]="entry.kind === 'create'"
                          [class.text-emerald-300]="entry.kind === 'create'"
                          [class.bg-blue-500/15]="entry.kind === 'edit'"
                          [class.text-blue-300]="entry.kind === 'edit'"
                          [class.bg-rose-500/15]="entry.kind === 'delete'"
                          [class.text-rose-300]="entry.kind === 'delete'">
                          {{ entry.kindLabel }}
                        </span>
                        <span class="text-white font-medium">{{ entry.punchTypeLabel }}</span>
                        @if (entry.timeShift) {
                          <span class="text-gray-400">{{ entry.timeShift }}</span>
                        } @else if (entry.punchedAtLabel) {
                          <span class="text-gray-400">a las {{ entry.punchedAtLabel }}</span>
                        }
                        <span class="text-gray-500 ml-auto">{{ entry.createdAt | date:'dd/MM HH:mm' }}</span>
                      </div>
                      <div class="text-xs text-gray-400 mt-1">
                        Por <span class="text-gray-200">{{ entry.authorLabel }}</span>
                        @if (entry.reason) {
                          <span class="text-gray-500"> · </span>
                          <span class="italic">"{{ entry.reason }}"</span>
                        }
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>
          }

          <!-- Formulario de Marcación Manual -->
          @if (selectedDate() && selectedEmployeeId() && !loadingPunches()) {
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <i class="pi pi-plus text-amber-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Registrar Nueva Marcación
              </h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Tipo de Marcación -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-300">Tipo de Marcación</label>
                <p-select
                  [options]="availablePunchTypes()"
                  optionLabel="label"
                  optionValue="value"
                  [(ngModel)]="punchType"
                  placeholder="Seleccionar tipo..."
                  appendTo="body"
                  styleClass="w-full"
                />
              </div>

              <!-- Hora -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-300">Hora de Marcación</label>
                <input
                  pInputText
                  type="text"
                  inputmode="numeric"
                  [ngModel]="selectedTime()"
                  (ngModelChange)="onTimeChange($event)"
                  placeholder="ej: 0800 → 8:00 AM  |  1430 → 2:30 PM"
                  maxlength="4"
                  class="w-full"
                />
                @if (timePreview(); as preview) {
                  <div class="flex items-center gap-2 mt-1">
                    <i class="pi pi-clock text-cyan-400 text-xs"></i>
                    <span class="text-xl font-bold text-cyan-300">{{ preview }}</span>
                  </div>
                }
                <!-- Atajos de hora -->
                <div class="flex flex-wrap gap-1.5 mt-2">
                  @if (isToday()) {
                    <button type="button"
                      class="px-2 py-1 text-xs rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20 transition"
                      (click)="applyTimeShortcut('now')"
                      title="Hora actual">
                      <i class="pi pi-stopwatch text-[10px] mr-1"></i>Ahora
                    </button>
                  }
                  @if (scheduleShortcutFor(); as st) {
                    <button type="button"
                      class="px-2 py-1 text-xs rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 transition"
                      (click)="applyTimeShortcut('schedule')"
                      [title]="'Hora programada: ' + st.label">
                      <i class="pi pi-calendar-clock text-[10px] mr-1"></i>Horario ({{ st.label }})
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Razón -->
            <div class="space-y-2 mt-4">
              <label class="text-sm font-medium text-gray-300 flex items-center gap-2">
                <span>Razón / Justificación</span>
                @if (requiresExpandedReason()) {
                  <span class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    Día libre · mín 30 caracteres
                  </span>
                }
              </label>
              <textarea
                pInputTextarea
                [(ngModel)]="reason"
                rows="2"
                class="w-full"
                [placeholder]="requiresExpandedReason()
                  ? 'Explica por qué el empleado marcó en su día libre...'
                  : 'Ingrese la razón de la marcación manual...'"
              ></textarea>
              @if (requiresExpandedReason()) {
                <div class="text-xs"
                  [class.text-gray-500]="reasonOk()"
                  [class.text-amber-400]="!reasonOk()">
                  {{ (reason() || '').trim().length }} / 30
                </div>
              }
            </div>

            <!-- Avisos no bloqueantes -->
            @for (warn of validationWarnings(); track warn) {
              <div class="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div class="flex items-center gap-2 text-amber-300 text-sm">
                  <i class="pi pi-info-circle"></i>
                  <span>{{ warn }}</span>
                </div>
              </div>
            }

            <!-- Mensaje de validación (bloqueante) -->
            @if (validationError()) {
            <div class="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div class="flex items-center gap-2 text-red-300">
                <i class="pi pi-exclamation-triangle"></i>
                <span>{{ validationError() }}</span>
              </div>
            </div>
            }

            <!-- Botón de Guardar -->
            <div class="flex justify-end mt-4">
              <p-button
                label="Registrar Marcación"
                icon="pi pi-check"
                [loading]="submitting()"
                [disabled]="!canSubmit()"
                (onClick)="submitTimelog()"
              />
            </div>
          </div>
          }

          <!-- Información -->
          <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <i class="pi pi-info-circle text-blue-400 text-xl"></i>
              <div class="flex-1">
                <p class="text-blue-300 font-semibold mb-2">Información Importante</p>
                <ul class="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  <li>Las marcaciones manuales quedan registradas con su nombre como responsable</li>
                  <li>Haz clic en una marcación existente (en verde) para editarla o eliminarla</li>
                  <li>Las marcaciones deben seguir el orden lógico: entrada → almuerzo → salida</li>
                  <li>No se puede registrar almuerzo o salida sin entrada previa</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </p-card>
    </div>

    <!-- Diálogo: Editar Marcación -->
    <p-dialog
      header="Editar Marcación"
      [(visible)]="showEditDialog"
      [modal]="true"
      [style]="{width: '380px'}"
      [closable]="!savingEdit()"
    >
      <div class="flex flex-col gap-4 pt-2">
        <p class="text-gray-300 m-0 text-sm">
          Editando marcación original: <strong class="text-white">{{ editingPunchTypeLabel() }}</strong>
        </p>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-400">Tipo de marcación</label>
          <p-select
            [options]="punchTypes"
            optionLabel="label"
            optionValue="value"
            [ngModel]="editPunchType()"
            (ngModelChange)="editPunchType.set($event)"
            appendTo="body"
            styleClass="w-full"
          />
          @if (editPunchType() !== editingPunchType()) {
            <span class="text-[11px] text-amber-300">
              <i class="pi pi-exclamation-circle text-[10px] mr-1"></i>
              Cambiar tipo: {{ editingPunchTypeLabel() }} → {{ editPunchTypeLabel() }}
            </span>
          }
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-400">Nueva hora</label>
          <input
            pInputText
            type="text"
            inputmode="numeric"
            [ngModel]="editTime()"
            (ngModelChange)="onEditTimeChange($event)"
            placeholder="ej: 0800 → 8:00 AM  |  1430 → 2:30 PM"
            maxlength="4"
            class="w-full"
          />
          @if (editTimePreview(); as preview) {
            <div class="flex items-center gap-2 mt-1">
              <i class="pi pi-clock text-cyan-400 text-xs"></i>
              <span class="text-xl font-bold text-cyan-300">{{ preview }}</span>
            </div>
          }
        </div>
        <div class="flex justify-between gap-2 pt-2">
          <p-button
            label="Eliminar"
            icon="pi pi-trash"
            severity="danger"
            [outlined]="true"
            [disabled]="savingEdit()"
            (click)="deletePunch()"
          />
          <div class="flex gap-2">
            <p-button
              label="Cancelar"
              severity="secondary"
              [disabled]="savingEdit()"
              (click)="showEditDialog.set(false)"
            />
            <p-button
              label="Guardar"
              icon="pi pi-check"
              [loading]="savingEdit()"
              [disabled]="!editTimeValid()"
              (click)="saveEdit()"
            />
          </div>
        </div>
      </div>
    </p-dialog>

    <p-confirmDialog />
    <p-toast />
  `,
  styles: `
    :host {
      display: block;
      min-height: calc(100vh - 64px);
      padding: 1rem;
    }
  `,
})
export class ManualTimelogComponent {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly orgService = inject(OrganizationService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly dashboardStore = inject(DashboardStore);

  // Selectores
  public selectedEmployeeId = signal<string | null>(null);
  public branchFilterId = signal<string | null>(null);

  // Fecha/hora
  public selectedDate = signal<Date | null>(null);
  public selectedTime = signal<string>('');
  public today = new Date();

  // Tipo de marcación
  public punchType = signal<PunchType>('entry');

  // Estado de marcaciones existentes
  public existingPunches = signal<ExistingPunches>({
    entry: null,
    lunch_start: null,
    lunch_end: null,
    exit: null,
  });

  // Timeline completa del día (incluye fuentes no manuales)
  public dayTimeline = signal<DayTimelineEntry[]>([]);

  // Horario del empleado para la fecha seleccionada
  public employeeSchedule = signal<Schedule | null>(null);
  public loadingSchedule = signal<boolean>(false);

  // Razón y UI state
  public reason = signal<string>('');
  public loadingPunches = signal<boolean>(false);
  public submitting = signal<boolean>(false);

  // Auditoría
  public loadingAudit = signal<boolean>(false);
  public auditEntries = signal<AuditEntry[]>([]);

  // Actividad global reciente (panel de aterrizaje)
  public loadingRecentActivity = signal<boolean>(false);
  public recentActivity = signal<RecentActivityEntry[]>([]);
  public recentStats = signal<{ today: number; week: number }>({ today: 0, week: 0 });

  // Gestiones de corrección pendientes
  public loadingPendingCorrections = signal<boolean>(false);
  public pendingCorrections = signal<PendingCorrection[]>([]);

  // Tab activo del panel de aterrizaje
  public landingTab = signal<'activity' | 'pending'>('pending');

  // Filtros de actividad reciente
  public activityFilterBranch = signal<string | null>(null);
  public activityFilterKind = signal<'all' | 'create' | 'edit' | 'delete'>('all');
  public activityFilterAuthor = signal<string>('');
  public activitySearchEmployee = signal<string>('');

  // Bulk: generación de día completo desde horario
  public bulkSubmitting = signal<boolean>(false);

  // Contador de sesión (cuántos cambios manuales hizo el usuario en esta visita)
  public sessionCounter = signal<{ created: number; edited: number; deleted: number }>({
    created: 0, edited: 0, deleted: 0,
  });

  // Edición
  public showEditDialog = signal<boolean>(false);
  public editingPunchType = signal<PunchType | null>(null);
  // Tipo nuevo si se cambia (independiente del original)
  public editPunchType = signal<PunchType>('entry');
  public editingPunchId = signal<string | null>(null);
  public editTime = signal<string>('');
  public savingEdit = signal<boolean>(false);

  public punchTypeLabels: Record<PunchType, string> = {
    entry: 'Entrada',
    lunch_start: 'Inicio Almuerzo',
    lunch_end: 'Fin Almuerzo',
    exit: 'Salida',
  };

  public punchTypes = [
    { label: 'Entrada', value: 'entry' as PunchType },
    { label: 'Inicio Almuerzo', value: 'lunch_start' as PunchType },
    { label: 'Fin Almuerzo', value: 'lunch_end' as PunchType },
    { label: 'Salida', value: 'exit' as PunchType },
  ];

  // Computed: todos los empleados activos
  public allEmployees = computed(() =>
    this.dashboardStore.employees
      .employeesList()
      .filter((e) => e.is_active)
      .sort((a, b) => (a.short_name || '').localeCompare(b.short_name || ''))
  );

  // Computed: lista de sucursales (deduplicada) para el filtro
  public branchOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const e of this.allEmployees()) {
      const id = (e as any).branch_id;
      const name = e.branch?.name;
      if (id && name && !seen.has(id)) seen.set(id, name);
    }
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  public activityKindOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Creados', value: 'create' },
    { label: 'Editados', value: 'edit' },
    { label: 'Eliminados', value: 'delete' },
  ];

  // Computed: actividad reciente filtrada (por sucursal, tipo, autor, búsqueda empleado)
  public filteredRecentActivity = computed(() => {
    const list = this.recentActivity();
    const branchId = this.activityFilterBranch();
    const kind = this.activityFilterKind();
    const author = (this.activityFilterAuthor() || '').toLowerCase().trim();
    const search = (this.activitySearchEmployee() || '').toLowerCase().trim();
    const employees = this.allEmployees();
    return list.filter(act => {
      if (branchId) {
        const emp = employees.find(e => e.id === act.employeeId);
        if ((emp as any)?.branch_id !== branchId) return false;
      }
      if (kind !== 'all') {
        const k = act.kindLabel.toLowerCase();
        if (kind === 'create' && k !== 'creado') return false;
        if (kind === 'edit' && k !== 'editado') return false;
        if (kind === 'delete' && k !== 'eliminado') return false;
      }
      if (author && !act.authorLabel.toLowerCase().includes(author)) return false;
      if (search && !act.employeeName.toLowerCase().includes(search)) return false;
      return true;
    });
  });

  public sessionTotalChanges = computed(() => {
    const s = this.sessionCounter();
    return s.created + s.edited + s.deleted;
  });

  // Computed: empleados filtrados por sucursal (si hay filtro)
  public filteredEmployees = computed(() => {
    const branchId = this.branchFilterId();
    const list = this.allEmployees();
    if (!branchId) return list;
    return list.filter((e) => (e as any).branch_id === branchId);
  });

  // Computed: ¿la fecha seleccionada es hoy?
  public isToday = computed(() => {
    const d = this.selectedDate();
    if (!d) return false;
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  });

  // Computed: cuántas marcaciones del horario faltan por crear
  public missingFromScheduleCount = computed(() => {
    const sch = this.employeeSchedule();
    const ex = this.existingPunches();
    if (!sch || sch.day_off) return 0;
    let count = 0;
    if ((sch as any).entry_time && !ex.entry) count++;
    if ((sch as any).lunch_start_time && !ex.lunch_start) count++;
    if ((sch as any).lunch_end_time && !ex.lunch_end) count++;
    if ((sch as any).exit_time && !ex.exit) count++;
    return count;
  });

  // Computed: si tiene sentido mostrar el botón "Generar día"
  public canGenerateFromSchedule = computed(() => {
    const sch = this.employeeSchedule();
    if (!sch || sch.day_off) return false;
    if (this.isToday() && new Date().getHours() < 6) return false; // muy temprano
    return this.missingFromScheduleCount() > 0;
  });

  // Parsea cadenas tipo "07:00:00" o ISO y devuelve un Date válido (con la hora aplicada a hoy)
  private parseScheduleTime(raw: any): Date | null {
    if (!raw) return null;
    if (typeof raw === 'string') {
      // "HH:MM" o "HH:MM:SS"
      const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw);
      if (m) {
        const d = new Date();
        d.setHours(+m[1], +m[2], +(m[3] || 0), 0);
        return d;
      }
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  // Computed: si el horario del día tiene la hora correspondiente al punchType actual
  public scheduleShortcutFor = computed(() => {
    const sch = this.employeeSchedule();
    if (!sch || sch.day_off) return null;
    const type = this.punchType();
    const raw = (sch as any)[
      type === 'entry' ? 'entry_time'
      : type === 'lunch_start' ? 'lunch_start_time'
      : type === 'lunch_end' ? 'lunch_end_time'
      : 'exit_time'
    ];
    const d = this.parseScheduleTime(raw);
    if (!d) return null;
    return { raw: d.toISOString(), label: format(d, 'h:mm a') };
  });

  // Computed: solo tipos que aún no existen (para el select de crear)
  public availablePunchTypes = computed(() => {
    const existing = this.existingPunches();
    return this.punchTypes.filter(t => !existing[t.value]);
  });

  // Computed: cards del status panel
  public punchStatusCards = computed(() => {
    const existing = this.existingPunches();
    return [
      { type: 'entry' as PunchType, label: 'Entrada', exists: !!existing.entry, time: existing.entry?.time },
      { type: 'lunch_start' as PunchType, label: 'Ini. Almuerzo', exists: !!existing.lunch_start, time: existing.lunch_start?.time },
      { type: 'lunch_end' as PunchType, label: 'Fin Almuerzo', exists: !!existing.lunch_end, time: existing.lunch_end?.time },
      { type: 'exit' as PunchType, label: 'Salida', exists: !!existing.exit, time: existing.exit?.time },
    ];
  });

  // Computed: label del tipo que se está editando
  public editingPunchTypeLabel = computed(() => {
    const t = this.editingPunchType();
    return t ? this.punchTypeLabels[t] : '';
  });

  public editPunchTypeLabel = computed(() => this.punchTypeLabels[this.editPunchType()] ?? '');

  // Computed: preview en 12h de la hora que se está escribiendo
  public timePreview = computed(() => {
    const parsed = this.parseTimeDigits(this.selectedTime());
    if (!parsed) return null;
    return format(set(new Date(), { hours: parsed.hours, minutes: parsed.minutes, seconds: 0, milliseconds: 0 }), 'h:mm a');
  });

  public editTimePreview = computed(() => {
    const parsed = this.parseTimeDigits(this.editTime());
    if (!parsed) return null;
    return format(set(new Date(), { hours: parsed.hours, minutes: parsed.minutes, seconds: 0, milliseconds: 0 }), 'h:mm a');
  });

  public editTimeValid = computed(() => !!this.parseTimeDigits(this.editTime()));

  // Computed: timestamp completo (fecha+hora) que se está ingresando
  private candidatePunchedAt = computed<Date | null>(() => {
    const d = this.selectedDate();
    const parsed = this.parseTimeDigits(this.selectedTime());
    if (!d || !parsed) return null;
    return set(new Date(d), { hours: parsed.hours, minutes: parsed.minutes, seconds: 0, milliseconds: 0 });
  });

  // Computed: ¿la marcación quedaría en el futuro respecto a "ahora"?
  public isFuturePunch = computed(() => {
    const at = this.candidatePunchedAt();
    if (!at) return false;
    return at.getTime() > Date.now();
  });

  // Computed: razón mínima requerida en día libre (30 chars)
  public requiresExpandedReason = computed(() => {
    const sch = this.employeeSchedule();
    return !!sch?.day_off;
  });

  // Computed: ¿la razón cumple el mínimo de caracteres cuando se requiere?
  public reasonOk = computed(() => {
    if (!this.requiresExpandedReason()) return true;
    return (this.reason() || '').trim().length >= 30;
  });

  // Computed: Validación
  public canSubmit = computed(() => {
    if (!this.selectedEmployeeId() || !this.selectedDate() || !this.parseTimeDigits(this.selectedTime())) return false;
    if (this.submitting() || this.loadingPunches()) return false;

    const existing = this.existingPunches();
    const type = this.punchType();

    if (existing[type]) return false;
    if (type !== 'entry' && !existing.entry) return false;
    if (type === 'lunch_end' && !existing.lunch_start) return false;
    if (type === 'exit' && existing.lunch_start && !existing.lunch_end) return false;

    // Bloquea marcaciones futuras
    if (this.isFuturePunch()) return false;

    // Bloquea si requiere razón expandida y no cumple
    if (!this.reasonOk()) return false;

    return true;
  });

  // Computed: Mensaje de error de validación (bloquea)
  public validationError = computed(() => {
    const existing = this.existingPunches();
    const type = this.punchType();

    if (existing[type]) return `Ya existe ${this.punchTypeLabels[type].toLowerCase()} registrada para este día.`;
    if (type !== 'entry' && !existing.entry) return 'No se puede registrar esta marcación sin una entrada previa.';
    if (type === 'lunch_end' && !existing.lunch_start) return 'No se puede registrar fin de almuerzo sin inicio de almuerzo.';
    if (type === 'exit' && existing.lunch_start && !existing.lunch_end) return 'No se puede registrar salida sin fin de almuerzo.';
    if (this.isFuturePunch()) return 'La marcación no puede estar en el futuro respecto a la hora actual.';
    if (!this.reasonOk()) return 'En día libre la razón debe tener al menos 30 caracteres explicando el motivo.';

    return null;
  });

  // Computed: avisos no bloqueantes (warnings) basados en el horario
  public validationWarnings = computed<string[]>(() => {
    const warns: string[] = [];
    const at = this.candidatePunchedAt();
    const sch = this.employeeSchedule();
    const type = this.punchType();
    if (!at || !sch || sch.day_off) return warns;

    const expectedRaw = (sch as any)[
      type === 'entry' ? 'entry_time'
      : type === 'lunch_start' ? 'lunch_start_time'
      : type === 'lunch_end' ? 'lunch_end_time'
      : 'exit_time'
    ];
    if (!expectedRaw) return warns;

    const expected = new Date(expectedRaw);
    // Usar solo hora-minuto (compara la hora dentro del mismo día)
    const expectedMin = expected.getHours() * 60 + expected.getMinutes();
    const actualMin = at.getHours() * 60 + at.getMinutes();
    const diffMin = Math.abs(expectedMin - actualMin);

    if (diffMin > 180) {
      warns.push(`La hora ingresada se aleja más de 3 horas del horario programado (${format(expected, 'h:mm a')}).`);
    } else if (type === 'entry' && actualMin < expectedMin - 60) {
      warns.push(`Entrada registrada más de 1 hora antes del horario programado (${format(expected, 'h:mm a')}).`);
    }
    return warns;
  });

  constructor() {
    this.dashboardStore.employees.fetchItems();
    // Carga inicial del panel de aterrizaje
    this.loadRecentActivity();
    this.loadPendingCorrections();

    // Effect: si el punchType actual ya quedó ocupado, salta al siguiente disponible
    effect(() => {
      const existing = this.existingPunches();
      const current = this.punchType();
      if (existing[current]) {
        const available = this.punchTypes.filter(t => !existing[t.value]);
        if (available.length > 0 && available[0].value !== current) {
          // Hacer el cambio fuera del ciclo de signals (microtask) para evitar warning
          queueMicrotask(() => this.punchType.set(available[0].value));
        }
      }
    });
  }

  public async loadPendingCorrections(): Promise<void> {
    this.loadingPendingCorrections.set(true);
    const companyId = this.orgService.getCurrentCompanyId();
    const url = this.apiUrl.build('rest/v1/document_requests', {
      document_type: 'eq.timelog_correction',
      status: 'eq.pending',
      company_id: `eq.${companyId}`,
      select: 'id,employee_id,reason,metadata,created_at',
      order: 'created_at.desc',
      limit: '50',
    });

    try {
      const rows = await firstValueFrom(this.http.get<any[]>(url));

      // Resolver nombres/sucursal con un fetch IN paralelo (no rompe si algunos IDs faltan)
      const empIds = Array.from(new Set((rows || []).map((r: any) => r.employee_id).filter(Boolean)));
      const empMap = new Map<string, any>();
      if (empIds.length > 0) {
        try {
          const empUrl = this.apiUrl.build('rest/v1/employees', {
            id: `in.(${empIds.join(',')})`,
            select: 'id,first_name,father_name,mother_name,branch_id,branch:branches(id,name)',
          });
          const emps = await firstValueFrom(this.http.get<any[]>(empUrl));
          (emps || []).forEach(e => empMap.set(e.id, e));
        } catch {/* sigue con fallback al store local */}
      }

      const localEmps = this.allEmployees();
      const items: PendingCorrection[] = (rows || []).map((r) => {
        const empFetched = empMap.get(r.employee_id);
        const empLocal = localEmps.find(e => e.id === r.employee_id);
        const meta = r.metadata || {};
        const dateStr: string = meta.timelog_date || '';
        const [y, m, d] = dateStr.split('-').map(Number);
        const timeStr: string | null = meta.timelog_time || null;
        let timeLabel: string | null = null;
        if (timeStr) {
          const [hh, mm] = timeStr.split(':').map(Number);
          if (!isNaN(hh) && !isNaN(mm)) {
            timeLabel = format(set(new Date(), { hours: hh, minutes: mm, seconds: 0 }), 'h:mm a');
          }
        }

        const name = empFetched
          ? [empFetched.first_name, empFetched.father_name, empFetched.mother_name].filter(Boolean).join(' ').trim()
          : (empLocal?.short_name || '');
        const branchName = empFetched?.branch?.name || empLocal?.branch?.name || null;
        const branchId = empFetched?.branch_id || empFetched?.branch?.id || (empLocal as any)?.branch_id || meta.branch_id || null;

        return {
          id: r.id,
          employeeId: r.employee_id,
          employeeName: name || `Empleado ${r.employee_id?.slice(0, 8) || ''}`,
          branchName,
          branchId,
          timelogDate: dateStr,
          timelogDateLabel: (d && m) ? `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}` : '',
          timelogTime: timeStr,
          timelogTimeLabel: timeLabel,
          timelogType: (meta.timelog_type || 'entry') as PunchType,
          punchTypeLabel: this.punchTypeLabels[(meta.timelog_type || 'entry') as PunchType] || meta.timelog_type,
          reason: r.reason || '',
          attachmentUrl: meta.attachment_url || null,
          createdAt: r.created_at,
        };
      });
      this.pendingCorrections.set(items);
    } catch (error) {
      console.error('Error loading pending corrections:', error);
      this.pendingCorrections.set([]);
    } finally {
      this.loadingPendingCorrections.set(false);
    }
  }

  public openCorrection(c: PendingCorrection): void {
    this.selectedEmployeeId.set(c.employeeId);
    if (c.timelogDate) {
      const [y, m, d] = c.timelogDate.split('-').map(Number);
      this.selectedDate.set(new Date(y, m - 1, d));
    } else {
      this.selectedDate.set(new Date());
    }
    this.punchType.set(c.timelogType);
    this.reason.set(`Gestión #${c.id.slice(0, 8)} · ${c.reason}`);
    // Pre-llena la hora si la gestión la trae (HH:MM → HHMM)
    if (c.timelogTime) {
      const [hh, mm] = c.timelogTime.split(':');
      if (hh && mm) this.selectedTime.set(`${hh}${mm}`);
    } else {
      this.selectedTime.set('');
    }
    this.pendingCorrectionId = c.id;
    this.activePendingCorrectionId.set(c.id);
    this.existingPunches.set({ entry: null, lunch_start: null, lunch_end: null, exit: null });
    this.dayTimeline.set([]);
    this.employeeSchedule.set(null);
    this.fetchEmployeeSchedule();
    this.checkExistingPunches();
  }

  public async approveCorrection(c: PendingCorrection): Promise<void> {
    if (!c.timelogTime || !c.timelogDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Falta hora en la gestión',
        detail: 'Esta solicitud no incluye hora exacta. Ábrela manualmente para indicarla.',
      });
      return;
    }

    this.pendingCorrections.update(list =>
      list.map(x => x.id === c.id ? { ...x, approving: true } : x)
    );

    const [hh, mm] = c.timelogTime.split(':').map(Number);
    const [y, m, d] = c.timelogDate.split('-').map(Number);
    const punchedAt = set(new Date(y, m - 1, d), { hours: hh, minutes: mm, seconds: 0, milliseconds: 0 });

    // No crear marcaciones en el futuro
    if (punchedAt.getTime() > Date.now()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hora en el futuro',
        detail: 'La marcación quedaría en el futuro respecto a la hora actual.',
      });
      this.pendingCorrections.update(list =>
        list.map(x => x.id === c.id ? { ...x, approving: false } : x)
      );
      return;
    }

    const companyId = this.orgService.getCurrentCompanyId();
    const currentEmployee = this.dashboardStore.currentEmployee();
    const reasonForPunch = `Gestión #${c.id.slice(0, 8)} aprobada · ${c.reason}`;

    try {
      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/rpc/insert_manual_timelog'), {
          p_employee_id: c.employeeId,
          p_company_id: companyId,
          p_branch_id: c.branchId || null,
          p_type: c.timelogType,
          p_punched_at: punchedAt.toISOString(),
          p_reason: reasonForPunch,
          p_created_by: currentEmployee?.id || null,
        })
      );

      // Marcar la gestión como completada
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/document_requests', { id: `eq.${c.id}` }),
          {
            status: 'completed',
            processed_by: currentEmployee?.id || null,
            processed_at: new Date().toISOString(),
          }
        )
      );

      this.sessionCounter.update(s => ({ ...s, created: s.created + 1 }));
      this.messageService.add({
        severity: 'success',
        summary: 'Aprobado',
        detail: `${c.punchTypeLabel} de ${c.employeeName} a las ${c.timelogTimeLabel}`,
      });

      // Quitar de la lista localmente
      this.pendingCorrections.update(list => list.filter(x => x.id !== c.id));
      this.loadRecentActivity();
    } catch (error: any) {
      const status = error?.status;
      const serverMsg = error?.error?.message || error?.error?.details || '';
      let detail = 'No se pudo aprobar la marcación.';
      if (status === 409) detail = 'Ya existe una marcación de este tipo para este día.';
      else if (serverMsg) detail = serverMsg;
      this.messageService.add({ severity: 'error', summary: 'Error', detail });
      this.pendingCorrections.update(list =>
        list.map(x => x.id === c.id ? { ...x, approving: false } : x)
      );
    }
  }

  public async rejectCorrection(c: PendingCorrection): Promise<void> {
    const currentEmployee = this.dashboardStore.currentEmployee();
    try {
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/document_requests', { id: `eq.${c.id}` }),
          {
            status: 'rejected',
            processed_by: currentEmployee?.id || null,
            processed_at: new Date().toISOString(),
          }
        )
      );
      this.messageService.add({ severity: 'info', summary: 'Rechazada', detail: 'Gestión marcada como rechazada.' });
      this.pendingCorrections.update(list => list.filter(x => x.id !== c.id));
    } catch (e: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'No se pudo rechazar la gestión.' });
    }
  }

  public async markCorrectionResolved(c: PendingCorrection): Promise<void> {
    const currentEmployee = this.dashboardStore.currentEmployee();
    try {
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/document_requests', { id: `eq.${c.id}` }),
          {
            status: 'completed',
            processed_by: currentEmployee?.id || null,
            processed_at: new Date().toISOString(),
          }
        )
      );
      this.messageService.add({ severity: 'success', summary: 'Gestión resuelta', detail: `Marcada como completada.` });
      this.loadPendingCorrections();
    } catch (e) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la gestión.' });
    }
  }

  // Si se abrió desde una gestión pendiente, guardamos su id para poder cerrarla al guardar
  private pendingCorrectionId: string | null = null;
  public activePendingCorrectionId = signal<string | null>(null);

  public activePendingCorrection = computed(() => {
    const id = this.activePendingCorrectionId();
    if (!id) return null;
    return this.pendingCorrections().find(c => c.id === id) || null;
  });

  public async markActiveAsHandled(): Promise<void> {
    const id = this.activePendingCorrectionId();
    if (!id) return;
    const c = this.pendingCorrections().find(x => x.id === id);
    if (!c) return;
    await this.markCorrectionResolved(c);
    this.pendingCorrectionId = null; this.activePendingCorrectionId.set(null);
    this.activePendingCorrectionId.set(null);
  }

  public async rejectActiveCorrection(): Promise<void> {
    const id = this.activePendingCorrectionId();
    if (!id) return;
    const c = this.pendingCorrections().find(x => x.id === id);
    if (!c) return;
    await this.rejectCorrection(c);
    this.pendingCorrectionId = null; this.activePendingCorrectionId.set(null);
    this.activePendingCorrectionId.set(null);
  }

  public async loadRecentActivity(): Promise<void> {
    this.loadingRecentActivity.set(true);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfToday = startOfDay(new Date()).toISOString();
    const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const url =
      this.apiUrl.build('rest/v1/timelog_alerts', {
        select: 'id,alert_type,old_data,new_data,description,created_at',
        order: 'created_at.desc',
        limit: '50',
        alert_type: 'in.(manual_with_reason,update,delete)',
      }) + `&created_at=gte.${sevenDaysAgo}`;

    try {
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      const employees = this.allEmployees();
      const findEmp = (id?: string | null) => id ? employees.find(e => e.id === id) : undefined;

      const entries: RecentActivityEntry[] = [];
      let today = 0;
      let week = 0;

      for (const row of rows ?? []) {
        const newD = row.new_data;
        const oldD = row.old_data;
        let kindLabel = '';
        let kindClass = '';
        if (row.alert_type === 'delete') {
          kindLabel = 'Eliminado';
          kindClass = 'bg-rose-500/15 text-rose-300';
        } else if (row.alert_type === 'manual_with_reason' || (row.alert_type === 'direct_insert' && newD?.is_manual)) {
          kindLabel = 'Creado';
          kindClass = 'bg-emerald-500/15 text-emerald-300';
        } else if (row.alert_type === 'update') {
          kindLabel = 'Editado';
          kindClass = 'bg-blue-500/15 text-blue-300';
        } else {
          continue;
        }

        const ref = newD || oldD || {};
        const employeeId = ref.employee_id;
        const emp = findEmp(employeeId);
        if (!emp) continue;

        const type = ref.type as PunchType | undefined;
        const punchedAt = ref.punched_at ? new Date(ref.punched_at) : null;
        const authorId = newD?.manual_created_by || oldD?.manual_created_by || newD?.created_by || oldD?.created_by;
        const authorEmp = findEmp(authorId);

        week++;
        if (row.created_at >= startOfToday) today++;

        entries.push({
          id: row.id,
          employeeId,
          employeeName: emp.short_name || 'Empleado',
          branchName: emp.branch?.name ?? null,
          punchTypeLabel: type ? this.punchTypeLabels[type] : 'Marcación',
          punchedAtLabel: punchedAt ? format(punchedAt, 'h:mm a') : '',
          punchedDate: punchedAt ? format(punchedAt, 'dd/MM') : '',
          kindLabel,
          kindClass,
          authorLabel: authorEmp?.short_name || 'Sistema',
          reason: newD?.manual_reason || oldD?.manual_reason || newD?.reason || oldD?.reason || null,
          createdAt: row.created_at,
        });
      }

      this.recentActivity.set(entries.slice(0, 15));
      this.recentStats.set({ today, week });
    } catch (error) {
      console.error('Error loading recent activity:', error);
      this.recentActivity.set([]);
      this.recentStats.set({ today: 0, week: 0 });
    } finally {
      this.loadingRecentActivity.set(false);
    }
  }

  public selectEmployeeFromActivity(employeeId: string, dateStr: string): void {
    this.selectedEmployeeId.set(employeeId);
    // Parsear el dd/MM (asumiendo año actual)
    const [d, m] = dateStr.split('/').map(Number);
    if (d && m) {
      const year = new Date().getFullYear();
      this.selectedDate.set(new Date(year, m - 1, d));
    } else {
      this.selectedDate.set(new Date());
    }
    this.resetForm();
    this.fetchEmployeeSchedule();
    this.checkExistingPunches();
  }

  public onEmployeeChange(): void {
    // Pre-seleccionar la fecha de hoy para acelerar el caso más común
    this.selectedDate.set(new Date());
    this.pendingCorrectionId = null; this.activePendingCorrectionId.set(null);
    this.resetForm();
    if (this.selectedEmployeeId()) {
      this.fetchEmployeeSchedule();
      this.checkExistingPunches();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    // Enter para enviar el formulario si está válido y NO estamos en un textarea
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      const target = event.target as HTMLElement;
      const isTextarea = target?.tagName === 'TEXTAREA';
      if (!isTextarea && this.canSubmit()) {
        event.preventDefault();
        this.submitTimelog();
      }
    }
  }

  public exportRecentActivityCSV(): void {
    const rows = this.filteredRecentActivity();
    if (rows.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Sin datos', detail: 'No hay actividad para exportar.' });
      return;
    }
    const header = ['Tipo cambio', 'Empleado', 'Sucursal', 'Tipo marcacion', 'Fecha marcacion', 'Hora marcacion', 'Autor', 'Razon', 'Cambio creado'];
    const escape = (v: any) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        r.kindLabel, r.employeeName, r.branchName || '', r.punchTypeLabel,
        r.punchedDate, r.punchedAtLabel, r.authorLabel, r.reason || '',
        new Date(r.createdAt).toISOString(),
      ].map(escape).join(','));
    }
    const csv = '﻿' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marcaciones-manuales-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public backToLanding(): void {
    this.selectedEmployeeId.set(null);
    this.selectedDate.set(null);
    this.pendingCorrectionId = null; this.activePendingCorrectionId.set(null);
    this.resetForm();
    this.loadPendingCorrections();
    this.loadRecentActivity();
  }

  public generateDayFromSchedule(): void {
    const sch = this.employeeSchedule();
    const employeeId = this.selectedEmployeeId();
    const date = this.selectedDate();
    if (!sch || sch.day_off || !employeeId || !date) return;

    const missing = this.missingFromScheduleCount();
    if (missing === 0) return;

    this.confirmationService.confirm({
      message: `¿Crear las <strong>${missing} marcación(es) faltante(s)</strong> usando el horario "<strong>${sch.name}</strong>"? Se podrán editar después.`,
      header: 'Generar día desde horario',
      icon: 'pi pi-bolt',
      acceptLabel: `Generar ${missing}`,
      rejectLabel: 'Cancelar',
      accept: () => this.doGenerateDayFromSchedule(),
    });
  }

  private async doGenerateDayFromSchedule(): Promise<void> {
    const sch = this.employeeSchedule();
    const employeeId = this.selectedEmployeeId();
    const date = this.selectedDate();
    if (!sch || sch.day_off || !employeeId || !date) return;

    this.bulkSubmitting.set(true);
    const ex = this.existingPunches();
    const employee = this.allEmployees().find(e => e.id === employeeId);
    const branchId = (employee as any)?.branch_id;
    const companyId = this.orgService.getCurrentCompanyId();
    const currentEmployee = this.dashboardStore.currentEmployee();
    const now = new Date();

    const targets: { type: PunchType; raw: any }[] = [
      { type: 'entry', raw: (sch as any).entry_time },
      { type: 'lunch_start', raw: (sch as any).lunch_start_time },
      { type: 'lunch_end', raw: (sch as any).lunch_end_time },
      { type: 'exit', raw: (sch as any).exit_time },
    ];

    let okCount = 0;
    let failCount = 0;

    for (const t of targets) {
      if (!t.raw || ex[t.type]) continue;
      const src = this.parseScheduleTime(t.raw);
      if (!src) continue;
      const punchedAt = set(new Date(date), {
        hours: src.getHours(), minutes: src.getMinutes(), seconds: 0, milliseconds: 0,
      });
      // No crear marcaciones en el futuro
      if (punchedAt.getTime() > now.getTime()) continue;

      try {
        await firstValueFrom(
          this.http.post(this.apiUrl.build('rest/v1/rpc/insert_manual_timelog'), {
            p_employee_id: employeeId,
            p_company_id: companyId,
            p_branch_id: branchId || null,
            p_type: t.type,
            p_punched_at: punchedAt.toISOString(),
            p_reason: `Generado masivo desde horario "${sch.name}"`,
            p_created_by: currentEmployee?.id || null,
          })
        );
        okCount++;
      } catch (err) {
        console.error(`Error creando ${t.type}:`, err);
        failCount++;
      }
    }

    this.bulkSubmitting.set(false);

    if (okCount > 0) {
      this.sessionCounter.update(s => ({ ...s, created: s.created + okCount }));
      this.messageService.add({
        severity: failCount > 0 ? 'warn' : 'success',
        summary: 'Día generado',
        detail: `${okCount} marcación(es) creada(s)${failCount > 0 ? `, ${failCount} fallaron` : ''}.`,
      });
      await this.checkExistingPunches();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo generar el día',
        detail: failCount > 0 ? 'Todas las creaciones fallaron.' : 'No había marcaciones aplicables.',
      });
    }
  }

  // Si el punchType actual ya existe en existingPunches, salta al siguiente tipo disponible
  public advanceToNextAvailablePunchType(): void {
    const existing = this.existingPunches();
    const current = this.punchType();
    if (!existing[current]) return; // current sigue disponible
    const available = this.availablePunchTypes();
    if (available.length > 0) {
      this.punchType.set(available[0].value);
    }
  }

  public applyTimeShortcut(kind: 'now' | 'schedule'): void {
    if (kind === 'now') {
      const t = new Date();
      this.selectedTime.set(`${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}`);
      return;
    }
    const st = this.scheduleShortcutFor();
    if (!st) return;
    const d = new Date(st.raw);
    this.selectedTime.set(`${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`);
  }

  public onDateChange(): void {
    this.resetForm();
    this.fetchEmployeeSchedule();
    this.checkExistingPunches();
  }

  private resetForm(): void {
    this.existingPunches.set({ entry: null, lunch_start: null, lunch_end: null, exit: null });
    this.employeeSchedule.set(null);
    this.punchType.set('entry');
    this.selectedTime.set('');
    this.reason.set('');
  }

  private async fetchEmployeeSchedule(): Promise<void> {
    const employeeId = this.selectedEmployeeId();
    const date = this.selectedDate();
    if (!employeeId || !date) return;

    this.loadingSchedule.set(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const companyId = this.orgService.getCurrentCompanyId();

    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      employee_id: `eq.${employeeId}`,
      company_id: `eq.${companyId}`,
      start_date: `lte.${dateStr}`,
      end_date: `gte.${dateStr}`,
      select: 'id,start_date,end_date,approved,created_at,schedule:schedules(id,name,entry_time,exit_time,lunch_start_time,lunch_end_time,day_off)',
    });

    try {
      const results = await firstValueFrom(this.http.get<any[]>(url));
      // Priorizar: individual > rango, aprobado > no aprobado, más reciente
      const sorted = (results || []).sort((a: any, b: any) => {
        const aS = a.start_date === a.end_date ? 1 : 0;
        const bS = b.start_date === b.end_date ? 1 : 0;
        if (aS !== bS) return bS - aS;
        const aA = a.approved ? 1 : 0;
        const bA = b.approved ? 1 : 0;
        if (aA !== bA) return bA - aA;
        return (b.created_at || '') > (a.created_at || '') ? 1 : -1;
      });
      this.employeeSchedule.set(this.normalizeSchedule(sorted[0]?.schedule ?? null));
    } catch {
      this.employeeSchedule.set(null);
    } finally {
      this.loadingSchedule.set(false);
    }
  }

  // Convierte los campos de tiempo del schedule a Date válidos (basados en la fecha seleccionada)
  // para que el pipe `date` no falle y los cálculos sean consistentes.
  private normalizeSchedule(sch: Schedule | null): Schedule | null {
    if (!sch) return null;
    const base = this.selectedDate() ?? new Date();
    const clone: any = { ...sch };
    for (const key of ['entry_time', 'lunch_start_time', 'lunch_end_time', 'exit_time']) {
      const raw = (sch as any)[key];
      if (!raw) { clone[key] = null; continue; }
      const d = this.parseScheduleTime(raw);
      if (!d) { clone[key] = null; continue; }
      // Re-localizar a la fecha seleccionada manteniendo hora/minuto
      const aligned = new Date(base);
      aligned.setHours(d.getHours(), d.getMinutes(), 0, 0);
      clone[key] = aligned;
    }
    return clone as Schedule;
  }

  public async checkExistingPunches(): Promise<void> {
    const employeeId = this.selectedEmployeeId();
    const date = this.selectedDate();
    if (!employeeId || !date) return;

    this.loadingPunches.set(true);

    const startDate = startOfDay(date);
    const endDate = endOfDay(date);
    const companyId = this.orgService.getCurrentCompanyId();

    // Filtramos por punched_at (a qué día pertenece la marcación) — coalesce con created_at
    // para registros viejos sin punched_at. Esto es más robusto que filtrar solo por created_at,
    // porque punches insertados después de medianoche (e.g. correcciones manuales) podrían
    // tener created_at fuera del día pero punched_at dentro.
    const fullUrl =
      this.apiUrl.build('rest/v1/timelogs', {
        employee_id: `eq.${employeeId}`,
        company_id: `eq.${companyId}`,
        select: 'id,type,created_at,punched_at,source,is_manual,manual_reason,manual_created_by,created_by',
      }) + `&or=(and(punched_at.gte.${startDate.toISOString()},punched_at.lt.${endDate.toISOString()}),and(punched_at.is.null,created_at.gte.${startDate.toISOString()},created_at.lt.${endDate.toISOString()}))`;

    try {
      const logs = await firstValueFrom(this.http.get<any[]>(fullUrl));

      const findPunch = (type: string): ExistingPunch | null => {
        const log = logs.find((l) => l.type === type);
        if (!log) return null;
        const dateValue = log.punched_at || log.created_at;
        return dateValue ? { id: log.id, time: new Date(dateValue) } : null;
      };

      const existing = {
        entry: findPunch('entry'),
        lunch_start: findPunch('lunch_start'),
        lunch_end: findPunch('lunch_end'),
        exit: findPunch('exit'),
      };
      this.existingPunches.set(existing);

      // Arma timeline completa ordenada por hora
      const employees = this.allEmployees();
      const nameOf = (id?: string | null) => id ? employees.find(e => e.id === id)?.short_name || null : null;
      const timeline: DayTimelineEntry[] = (logs || [])
        .filter(l => l.punched_at || l.created_at)
        .map(l => {
          const at = new Date(l.punched_at || l.created_at);
          const src = (l.source || '').toUpperCase();
          let sourceLabel = src || 'AUTO';
          let sourceClass = 'bg-neutral-700/40 text-neutral-300 border-neutral-600/40';
          if (src === 'MANUAL') { sourceLabel = 'Manual'; sourceClass = 'bg-amber-500/15 text-amber-200 border-amber-500/30'; }
          else if (src === 'BIOMETRIC' || src === 'FACIAL') { sourceLabel = 'Biométrico'; sourceClass = 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'; }
          else if (src === 'KIOSK' || src === 'TIMECLOCK' || src === 'NAZ') { sourceLabel = 'Kiosko'; sourceClass = 'bg-blue-500/15 text-blue-200 border-blue-500/30'; }
          else if (src === 'MOBILE' || src === 'WEB') { sourceLabel = 'Móvil/Web'; sourceClass = 'bg-violet-500/15 text-violet-200 border-violet-500/30'; }
          return {
            id: l.id,
            type: l.type as PunchType,
            punchTypeLabel: this.punchTypeLabels[l.type as PunchType] || l.type,
            punchedAtLabel: format(at, 'h:mm a'),
            punchedAtSort: at.getTime(),
            source: src,
            sourceLabel,
            sourceClass,
            isManual: !!l.is_manual,
            reason: l.manual_reason || null,
            authorLabel: nameOf(l.manual_created_by || l.created_by),
          };
        })
        .sort((a, b) => a.punchedAtSort - b.punchedAtSort);
      this.dayTimeline.set(timeline);

      // Auto-seleccionar el primer tipo faltante disponible, respetando el preset
      // si todavía no existe (ej: al abrir desde una gestión pendiente).
      const available = this.availablePunchTypes();
      const current = this.punchType();
      const currentStillAvailable = available.some(a => a.value === current);
      if (!currentStillAvailable && available.length > 0) {
        this.punchType.set(available[0].value);
      }

      // Cargar auditoría en paralelo (no bloquea)
      this.loadAuditTrail();
    } catch (error) {
      console.error('Error checking existing punches:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron verificar las marcaciones existentes' });
    } finally {
      this.loadingPunches.set(false);
    }
  }

  public async loadAuditTrail(): Promise<void> {
    const employeeId = this.selectedEmployeeId();
    const date = this.selectedDate();
    if (!employeeId || !date) {
      this.auditEntries.set([]);
      return;
    }

    this.loadingAudit.set(true);
    const dayStart = startOfDay(date).toISOString();
    const dayEnd = endOfDay(date).toISOString();

    // Trae alertas cuyo old_data O new_data caen en el día del empleado.
    // PostgREST soporta filtros sobre json a través de la sintaxis "col->>key".
    const url = this.apiUrl.build('rest/v1/timelog_alerts', {
      select: 'id,alert_type,old_data,new_data,description,created_at',
      order: 'created_at.desc',
      limit: '100',
      or: `(and(new_data->>employee_id.eq.${employeeId},new_data->>punched_at.gte.${dayStart},new_data->>punched_at.lt.${dayEnd}),and(old_data->>employee_id.eq.${employeeId},old_data->>punched_at.gte.${dayStart},old_data->>punched_at.lt.${dayEnd}))`,
    });

    try {
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      const employees = this.allEmployees();
      const nameOf = (id?: string | null): string => {
        if (!id) return 'Sistema';
        return employees.find(e => e.id === id)?.short_name || 'Usuario';
      };

      const entries: AuditEntry[] = [];
      for (const row of rows ?? []) {
        const newD = row.new_data;
        const oldD = row.old_data;
        let kind: AuditEntry['kind'] = 'edit';
        let kindLabel = 'Editado';
        if (row.alert_type === 'delete') { kind = 'delete'; kindLabel = 'Eliminado'; }
        else if (row.alert_type === 'manual_with_reason' || (row.alert_type === 'direct_insert' && newD?.is_manual)) {
          kind = 'create';
          kindLabel = 'Creado';
        } else if (row.alert_type === 'update') {
          kind = 'edit';
          kindLabel = 'Editado';
        } else {
          // Ignora alertas sospechosas que no correspondan al flujo manual visible
          continue;
        }

        const ref = newD || oldD || {};
        const type = ref.type as PunchType | undefined;
        const punchedAt = ref.punched_at ? new Date(ref.punched_at) : null;
        const authorId = newD?.manual_created_by || oldD?.manual_created_by || newD?.created_by || oldD?.created_by;

        // Para ediciones, mostrar la diferencia old → new si ambas existen
        let timeShift: string | null = null;
        if (kind === 'edit' && oldD?.punched_at && newD?.punched_at) {
          const oldFmt = format(new Date(oldD.punched_at), 'h:mm a');
          const newFmt = format(new Date(newD.punched_at), 'h:mm a');
          if (oldFmt !== newFmt) timeShift = `${oldFmt} → ${newFmt}`;
        }

        entries.push({
          id: row.id,
          kind,
          kindLabel,
          punchTypeLabel: type ? this.punchTypeLabels[type] : 'Marcación',
          punchedAtLabel: punchedAt ? format(punchedAt, 'h:mm a') : null,
          timeShift,
          authorLabel: nameOf(authorId),
          reason: newD?.manual_reason || oldD?.manual_reason || newD?.reason || oldD?.reason || null,
          createdAt: row.created_at,
        });
      }
      this.auditEntries.set(entries);
    } catch (error) {
      console.error('Error loading audit trail:', error);
      this.auditEntries.set([]);
    } finally {
      this.loadingAudit.set(false);
    }
  }

  public submitTimelog(): void {
    if (!this.canSubmit()) return;

    const employeeId = this.selectedEmployeeId()!;
    const employee = this.allEmployees().find(e => e.id === employeeId);
    const typeLabel = this.punchTypeLabels[this.punchType()];
    const timeDisplay = this.timePreview() ?? this.selectedTime();

    this.confirmationService.confirm({
      message: `¿Registrar ${typeLabel} para <strong>${employee?.short_name || 'este empleado'}</strong> a las <strong>${timeDisplay}</strong>?`,
      header: 'Confirmar Marcación Manual',
      icon: 'pi pi-clock',
      acceptLabel: 'Registrar',
      rejectLabel: 'Cancelar',
      accept: () => this.doSubmitTimelog(),
    });
  }

  private async doSubmitTimelog(): Promise<void> {
    const employeeId = this.selectedEmployeeId();
    const date = this.selectedDate();
    const type = this.punchType();
    const reason = this.reason();
    const parsed = this.parseTimeDigits(this.selectedTime());

    if (!employeeId || !date || !parsed) return;

    const employee = this.allEmployees().find(e => e.id === employeeId);
    const branchId = (employee as any)?.branch_id;

    this.submitting.set(true);

    let punchedAt = new Date(date);
    punchedAt = set(punchedAt, { hours: parsed.hours, minutes: parsed.minutes, seconds: 0, milliseconds: 0 });

    const companyId = this.orgService.getCurrentCompanyId();
    const currentEmployee = this.dashboardStore.currentEmployee();

    const payload = {
      employee_id: employeeId,
      branch_id: branchId || null,
      company_id: companyId,
      type,
      source: 'MANUAL',
      created_by: currentEmployee?.id || null,
      punched_at: punchedAt.toISOString(),
      created_at: punchedAt.toISOString(),
      reason: reason || null,
    };

    try {
      // Usamos el RPC seguro: valida motivo, marca is_manual=true, registra alerta
      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/rpc/insert_manual_timelog'), {
          p_employee_id: employeeId,
          p_company_id: companyId,
          p_branch_id: branchId || null,
          p_type: type,
          p_punched_at: punchedAt.toISOString(),
          p_reason: (reason || '').trim() || `Marcación manual de ${this.punchTypeLabels[type]} a ${format(punchedAt, 'h:mm a')}`,
          p_created_by: currentEmployee?.id || null,
        })
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Marcación Registrada',
        detail: `Se registró la ${this.punchTypeLabels[type]} correctamente`,
      });

      // Contador de sesión
      this.sessionCounter.update(s => ({ ...s, created: s.created + 1 }));

      // Si esta marcación venía de una gestión pendiente, ciérrala
      if (this.pendingCorrectionId) {
        const correctionId = this.pendingCorrectionId;
        try {
          await firstValueFrom(
            this.http.patch(
              this.apiUrl.build('rest/v1/document_requests', { id: `eq.${correctionId}` }),
              {
                status: 'completed',
                processed_by: currentEmployee?.id || null,
                processed_at: new Date().toISOString(),
              }
            )
          );
          this.pendingCorrectionId = null; this.activePendingCorrectionId.set(null);
          this.loadPendingCorrections();
          this.messageService.add({
            severity: 'success',
            summary: 'Gestión cerrada',
            detail: `Gestión #${correctionId.slice(0, 8)} marcada como completada.`,
          });
        } catch (e: any) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Marcación creada, gestión no se pudo cerrar',
            detail: e?.error?.message || 'Marca manualmente como completada desde el panel.',
          });
        }
      }

      await this.checkExistingPunches();
      this.selectedTime.set('');
      this.reason.set('');
      // Forzar cambio de punchType si el tipo recién creado ya está ocupado
      this.advanceToNextAvailablePunchType();
    } catch (error: any) {
      console.error('Error creating manual timelog:', error);
      const status = error?.status;
      const serverMsg = error?.error?.message || error?.error?.details || '';
      let detail = 'No se pudo registrar la marcación.';

      if (status === 409) detail = 'Ya existe una marcación de este tipo para este día.';
      else if (status === 403) detail = 'No tienes permisos para realizar esta acción.';
      else if (serverMsg) detail = serverMsg;

      this.messageService.add({ severity: 'error', summary: 'Error', detail });
    } finally {
      this.submitting.set(false);
    }
  }

  public onTimeChange(value: string): void {
    this.selectedTime.set(value.replace(/\D/g, '').slice(0, 4));
  }

  public onEditTimeChange(value: string): void {
    this.editTime.set(value.replace(/\D/g, '').slice(0, 4));
  }

  private parseTimeDigits(digits: string): { hours: number; minutes: number } | null {
    const clean = digits.replace(/\D/g, '');
    if (clean.length < 3) return null;
    const padded = clean.padStart(4, '0');
    const h = parseInt(padded.slice(0, 2), 10);
    const m = parseInt(padded.slice(2, 4), 10);
    if (h > 23 || m > 59) return null;
    return { hours: h, minutes: m };
  }

  // ── Edición de marcaciones existentes ──

  public startEditPunch(type: PunchType): void {
    const punch = this.existingPunches()[type];
    if (!punch) return;

    this.editingPunchType.set(type);
    this.editPunchType.set(type);
    this.editingPunchId.set(punch.id);
    this.editTime.set(format(new Date(punch.time), 'HHmm'));
    this.showEditDialog.set(true);
  }

  public async saveEdit(): Promise<void> {
    const id = this.editingPunchId();
    const date = this.selectedDate();
    const parsed = this.parseTimeDigits(this.editTime());
    if (!id || !parsed || !date) return;

    this.savingEdit.set(true);

    let punchedAt = new Date(date);
    punchedAt = set(punchedAt, { hours: parsed.hours, minutes: parsed.minutes, seconds: 0, milliseconds: 0 });

    try {
      const reasonForEdit = (this.reason() || '').trim() || `Corrección manual a ${format(punchedAt, 'h:mm a')}`;
      const originalType = this.editingPunchType();
      const newType = this.editPunchType();
      const typeChanged = !!originalType && newType !== originalType;

      // Si cambia el tipo, usar RPC que también actualiza type (SECURITY DEFINER bypass del trigger).
      // Si solo cambia hora/razón, mantener la RPC original.
      if (typeChanged) {
        await firstValueFrom(
          this.http.post(this.apiUrl.build('rest/v1/rpc/update_manual_timelog_with_type'), {
            p_timelog_id: id,
            p_punched_at: punchedAt.toISOString(),
            p_type: newType,
            p_reason: reasonForEdit,
            p_edited_by: this.dashboardStore.currentEmployee()?.id ?? null,
          })
        );
      } else {
        await firstValueFrom(
          this.http.post(this.apiUrl.build('rest/v1/rpc/update_manual_timelog'), {
            p_timelog_id: id,
            p_punched_at: punchedAt.toISOString(),
            p_reason: reasonForEdit,
            p_edited_by: this.dashboardStore.currentEmployee()?.id ?? null,
          })
        );
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Marcación Actualizada',
        detail: typeChanged
          ? `${this.punchTypeLabels[originalType!]} → ${this.punchTypeLabels[newType]} a las ${format(punchedAt, 'h:mm a')}`
          : `${this.editingPunchTypeLabel()} actualizada a las ${format(punchedAt, 'h:mm a')}`,
      });

      this.sessionCounter.update(s => ({ ...s, edited: s.edited + 1 }));

      // Si esta edición venía resolviendo una gestión pendiente, ciérrala
      if (this.pendingCorrectionId) {
        const correctionId = this.pendingCorrectionId;
        const currentEmployee = this.dashboardStore.currentEmployee();
        try {
          await firstValueFrom(
            this.http.patch(
              this.apiUrl.build('rest/v1/document_requests', { id: `eq.${correctionId}` }),
              {
                status: 'completed',
                processed_by: currentEmployee?.id || null,
                processed_at: new Date().toISOString(),
              }
            )
          );
          this.pendingCorrectionId = null; this.activePendingCorrectionId.set(null);
          this.loadPendingCorrections();
          this.messageService.add({
            severity: 'success',
            summary: 'Gestión cerrada',
            detail: `Gestión #${correctionId.slice(0, 8)} marcada como completada.`,
          });
        } catch (e: any) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Edición OK, gestión no cerrada',
            detail: e?.error?.message || 'Marca manualmente como completada.',
          });
        }
      }

      this.showEditDialog.set(false);
      await this.checkExistingPunches();
    } catch (error: any) {
      console.error('Error updating timelog:', error);
      const status = error?.status;
      let detail = error?.error?.message || 'No se pudo actualizar la marcación.';
      if (status === 403) detail = 'No tienes permisos para editar esta marcación.';

      this.messageService.add({ severity: 'error', summary: 'Error', detail });
    } finally {
      this.savingEdit.set(false);
    }
  }

  // Acciones directas sobre items de la timeline (permite borrar cualquier marcación,
  // incluyendo duplicados que el status card no expone)
  public deleteTimelineEntry(it: DayTimelineEntry): void {
    this.confirmationService.confirm({
      message: `¿Eliminar <strong>${it.punchTypeLabel}</strong> de las <strong>${it.punchedAtLabel}</strong> (${it.sourceLabel})? Esta acción no se puede deshacer.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.doDeleteTimelineEntry(it),
    });
  }

  private async doDeleteTimelineEntry(it: DayTimelineEntry): Promise<void> {
    const currentEmployee = this.dashboardStore.currentEmployee();
    const reasonForDelete = `Eliminación manual de ${it.punchTypeLabel} (${it.punchedAtLabel}, fuente ${it.sourceLabel})`;
    try {
      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/rpc/delete_manual_timelog'), {
          p_timelog_id: it.id,
          p_reason: reasonForDelete,
          p_deleted_by: currentEmployee?.id ?? null,
        })
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Marcación Eliminada',
        detail: `${it.punchTypeLabel} de las ${it.punchedAtLabel} eliminada.`,
      });
      this.sessionCounter.update(s => ({ ...s, deleted: s.deleted + 1 }));
      await this.checkExistingPunches();
    } catch (error: any) {
      const detail = error?.error?.message || 'No se pudo eliminar la marcación.';
      this.messageService.add({ severity: 'error', summary: 'Error', detail });
    }
  }

  public editTimelineEntry(it: DayTimelineEntry): void {
    // Abre el diálogo de edición usando el id específico del timeline (puede ser un duplicado
    // que el status card no expondría)
    this.editingPunchType.set(it.type);
    this.editPunchType.set(it.type);
    this.editingPunchId.set(it.id);
    const [hh, mm] = it.punchedAtLabel.match(/(\d+):(\d+)/)?.slice(1, 3).map(Number) ?? [0, 0];
    // Convertir a 24h si el label tiene AM/PM
    const isPm = /pm/i.test(it.punchedAtLabel);
    const hour24 = isPm && hh < 12 ? hh + 12 : !isPm && hh === 12 ? 0 : hh;
    this.editTime.set(`${String(hour24).padStart(2,'0')}${String(mm).padStart(2,'0')}`);
    this.showEditDialog.set(true);
  }

  public deletePunch(): void {
    const id = this.editingPunchId();
    const typeLabel = this.editingPunchTypeLabel();
    if (!id) return;

    this.confirmationService.confirm({
      message: `¿Eliminar la marcación de <strong>${typeLabel}</strong>? Esta acción no se puede deshacer.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.doDeletePunch(id),
    });
  }

  private async doDeletePunch(id: string): Promise<void> {
    const typeLabel = this.editingPunchTypeLabel();
    this.savingEdit.set(true);
    try {
      const reasonForDelete = (this.reason() || '').trim() || `Eliminación manual de ${typeLabel}`;
      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/rpc/delete_manual_timelog'), {
          p_timelog_id: id,
          p_reason: reasonForDelete,
          p_deleted_by: this.dashboardStore.currentEmployee()?.id ?? null,
        })
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Marcación Eliminada',
        detail: `${typeLabel} eliminada correctamente`,
      });
      this.sessionCounter.update(s => ({ ...s, deleted: s.deleted + 1 }));
      this.showEditDialog.set(false);
      await this.checkExistingPunches();
    } catch (error: any) {
      const detail = error?.error?.message || 'No se pudo eliminar la marcación.';
      this.messageService.add({ severity: 'error', summary: 'Error', detail });
    } finally {
      this.savingEdit.set(false);
    }
  }
}
