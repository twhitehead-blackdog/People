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
  differenceInMinutes,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FileUpload } from 'primeng/fileupload';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { TimeLogEnum } from '../models';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';

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
    NgClass,
  ],
  providers: [MessageService],
  template: `
    <div class="portal-content">
      <!-- Dashboard Section -->
      @if (activeSection() === 'dashboard') {
      <div id="dashboard" class="section-content">
        @if (currentEmployee()) {
        <div class="flex flex-col gap-6">
          <!-- Welcome Card -->
          <p-card class="dashboard-welcome-card">
            <div
              class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg"
                >
                  <i class="pi pi-user text-white text-2xl"></i>
                </div>
                <div>
                  <h2 class="text-2xl font-bold text-white m-0">
                    ¡Hola, {{ currentEmployee()?.first_name }}!
                  </h2>
                  <p class="text-gray-400 m-0 mt-1">
                    {{ currentEmployee()?.position?.name || 'Sin cargo' }} -
                    {{ currentEmployee()?.branch?.name || 'Sin sucursal' }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-400 m-0">Hoy es</p>
                <p class="text-lg font-semibold text-white m-0">
                  {{ getCurrentDate() | date : 'fullDate' }}
                </p>
              </div>
            </div>
          </p-card>

          <!-- Stats Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Días Trabajados Este Mes -->
            <p-card class="dashboard-stat-card">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0 mb-1">Días Trabajados</p>
                  <p class="text-2xl font-bold text-white m-0">
                    {{ daysWorkedThisMonth() }}
                  </p>
                  <p class="text-xs text-gray-500 m-0 mt-1">Este mes</p>
                </div>
                <div
                  class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-calendar text-blue-400 text-xl"></i>
                </div>
              </div>
            </p-card>

            <!-- Tardanzas Este Mes -->
            <p-card class="dashboard-stat-card">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0 mb-1">Tardanzas</p>
                  <p class="text-2xl font-bold text-white m-0">
                    {{ myLates().length }}
                  </p>
                  <p class="text-xs text-gray-500 m-0 mt-1">Este mes</p>
                </div>
                <div
                  class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-clock text-red-400 text-xl"></i>
                </div>
              </div>
            </p-card>

            <!-- Marcaciones Recientes -->
            <p-card class="dashboard-stat-card">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0 mb-1">Marcaciones</p>
                  <p class="text-2xl font-bold text-white m-0">
                    {{ recentTimelogsCount() }}
                  </p>
                  <p class="text-xs text-gray-500 m-0 mt-1">Últimos 7 días</p>
                </div>
                <div
                  class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-check-circle text-green-400 text-xl"></i>
                </div>
              </div>
            </p-card>

            <!-- Salario Mensual -->
            <p-card class="dashboard-stat-card">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0 mb-1">Salario Mensual</p>
                  <p 
                    class="text-2xl font-bold text-green-400 m-0 cursor-pointer hover:text-green-300 transition-colors"
                    (click)="showSalary.set(!showSalary())"
                    [title]="showSalary() ? 'Ocultar salario' : 'Click para ver salario'"
                  >
                    @if (showSalary()) {
                      {{ currentEmployee()?.monthly_salary | currency : '$' }}
                    } @else {
                      <span class="text-gray-500">••••••</span>
                    }
                  </p>
                  <p class="text-xs text-gray-500 m-0 mt-1">Base</p>
                </div>
                <div
                  class="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center cursor-pointer hover:bg-amber-500/30 transition-colors"
                  (click)="showSalary.set(!showSalary())"
                  [title]="showSalary() ? 'Ocultar salario' : 'Click para ver salario'"
                >
                  <i 
                    [class]="showSalary() ? 'pi pi-eye-slash text-amber-400 text-xl' : 'pi pi-eye text-amber-400 text-xl'"
                  ></i>
                </div>
              </div>
            </p-card>
          </div>

          <!-- Recent Activity and Quick Info -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Marcaciones Recientes -->
            <p-card>
              <ng-template #title>
                <div class="flex items-center gap-2">
                  <i class="pi pi-calendar-clock text-amber-400"></i>
                  <span>Marcaciones Recientes</span>
                </div>
              </ng-template>
              <div class="flex flex-col gap-3">
                @if (recentTimelogs().length > 0) { @for (event of
                recentTimelogs(); track event.id) {
                <div
                  class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50 hover:bg-neutral-800/70 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
                    >
                      <i [class]="'pi ' + event.icon + ' text-amber-400'"></i>
                    </div>
                    <div>
                      <p class="text-white font-semibold m-0">
                        {{ event.typeLabel }}
                      </p>
                      <p class="text-sm text-gray-400 m-0">
                        {{ event.day | date : 'mediumDate' }} a las {{ event.time }}
                        @if (event.branch?.name) {
                          - {{ event.branch.name }}
                        }
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <span
                      class="text-xs text-gray-500 font-medium"
                    >
                      {{ event.date | date : 'short' }}
                    </span>
                    @if (event.type === 'entry') {
                      <span
                        class="text-xs text-green-400 font-semibold px-2 py-1 rounded bg-green-500/20"
                      >
                        Entrada
                      </span>
                    } @else if (event.type === 'exit') {
                      <span
                        class="text-xs text-blue-400 font-semibold px-2 py-1 rounded bg-blue-500/20"
                      >
                        Salida
                      </span>
                    } @else if (event.type === 'lunch_start' || event.type === 'lunch_end') {
                      <span
                        class="text-xs text-amber-400 font-semibold px-2 py-1 rounded bg-amber-500/20"
                      >
                        Almuerzo
                      </span>
                    }
                  </div>
                </div>
                } } @else {
                <p class="text-gray-400 text-center py-4">
                  No hay marcaciones recientes
                </p>
                }
              </div>
            </p-card>

            <!-- Información Rápida -->
            <p-card>
              <ng-template #title>
                <div class="flex items-center gap-2">
                  <i class="pi pi-info-circle text-amber-400"></i>
                  <span>Información Rápida</span>
                </div>
              </ng-template>
              <div class="flex flex-col gap-3">
                <div
                  class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                >
                  <div class="flex items-center gap-3">
                    <i class="pi pi-building text-amber-400"></i>
                    <span class="text-gray-400">Sucursal:</span>
                  </div>
                  <span class="text-white font-semibold">{{
                    currentEmployee()?.branch?.name || 'N/A'
                  }}</span>
                </div>
                <div
                  class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                >
                  <div class="flex items-center gap-3">
                    <i class="pi pi-sitemap text-amber-400"></i>
                    <span class="text-gray-400">Departamento:</span>
                  </div>
                  <span class="text-white font-semibold">{{
                    currentEmployee()?.department?.name || 'N/A'
                  }}</span>
                </div>
                <div
                  class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                >
                  <div class="flex items-center gap-3">
                    <i class="pi pi-calendar text-amber-400"></i>
                    <span class="text-gray-400">Fecha de Ingreso:</span>
                  </div>
                  <span class="text-white font-semibold">{{
                    currentEmployee()?.start_date | date : 'shortDate'
                  }}</span>
                </div>
                <div
                  class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                >
                  <div class="flex items-center gap-3">
                    <i class="pi pi-envelope text-amber-400"></i>
                    <span class="text-gray-400">Email:</span>
                  </div>
                  <span class="text-white font-semibold text-sm">{{
                    currentEmployee()?.work_email || 'N/A'
                  }}</span>
                </div>
              </div>
            </p-card>
          </div>
        </div>
        }
      </div>
      }

      <!-- Mi Perfil Section -->
      @if (activeSection() === 'profile') {
      <div id="profile" class="section-content">
        <p-card>
          <ng-template #title>
            <div class="flex items-center justify-between w-full">
              <span>Mi Información Personal</span>
              <p-button
                label="Editar Datos"
                icon="pi pi-pencil"
                size="small"
                outlined
                (click)="toggleEditMode()"
                [label]="editMode() ? 'Cancelar' : 'Editar Datos'"
              />
            </div>
          </ng-template>
          @if (currentEmployee()) {
          <div class="flex flex-col gap-6">
            <!-- Información no editable -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-gray-400">Nombre Completo</label>
                <p class="text-white font-semibold">
                  {{ currentEmployee()?.first_name }}
                  {{ currentEmployee()?.middle_name }}
                  {{ currentEmployee()?.father_name }}
                  {{ currentEmployee()?.mother_name }}
                </p>
              </div>
              <div>
                <label class="text-sm text-gray-400">Cargo</label>
                <p class="text-white font-semibold">
                  {{ currentEmployee()?.position?.name || 'Sin cargo' }}
                </p>
              </div>
              <div>
                <label class="text-sm text-gray-400">Sucursal</label>
                <p class="text-white font-semibold">
                  {{ currentEmployee()?.branch?.name || 'Sin sucursal' }}
                </p>
              </div>
              <div>
                <label class="text-sm text-gray-400">Departamento</label>
                <p class="text-white font-semibold">
                  {{
                    currentEmployee()?.department?.name || 'Sin departamento'
                  }}
                </p>
              </div>
              <div>
                <label class="text-sm text-gray-400">Fecha de Ingreso</label>
                <p class="text-white font-semibold">
                  {{ currentEmployee()?.start_date | date : 'fullDate' }}
                </p>
              </div>
              <div>
                <label class="text-sm text-gray-400">Salario Mensual</label>
                <p 
                  class="text-white font-semibold cursor-pointer hover:text-gray-300 transition-colors inline-flex items-center gap-2"
                  (click)="showSalary.set(!showSalary())"
                  [title]="showSalary() ? 'Ocultar salario' : 'Click para ver salario'"
                >
                  @if (showSalary()) {
                    {{ currentEmployee()?.monthly_salary | currency : '$' }}
                  } @else {
                    <span class="text-gray-500">••••••</span>
                  }
                  <i 
                    [class]="showSalary() ? 'pi pi-eye-slash text-gray-400 text-sm' : 'pi pi-eye text-gray-400 text-sm'"
                  ></i>
                </p>
              </div>
            </div>

            <!-- Información editable -->
            <div class="border-t border-neutral-700 pt-6">
              <h3 class="text-lg font-semibold text-white mb-4">
                Datos de Contacto
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @if (!editMode()) {
                <div>
                  <label class="text-sm text-gray-400">Email Personal</label>
                  <p class="text-white font-semibold">
                    {{ currentEmployee()?.email || 'Sin email' }}
                  </p>
                </div>
                @if (showWorkEmail()) {
                <div>
                  <label class="text-sm text-gray-400">Email Laboral</label>
                  <p class="text-white font-semibold">
                    {{ currentEmployee()?.work_email || 'Sin email' }}
                  </p>
                </div>
                }
                <div>
                  <label class="text-sm text-gray-400">Teléfono</label>
                  <p class="text-white font-semibold">
                    {{ currentEmployee()?.phone_number || 'Sin teléfono' }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">Dirección</label>
                  <p class="text-white font-semibold">
                    {{ currentEmployee()?.address || 'Sin dirección' }}
                  </p>
                </div>
                } @else {
                <div>
                  <label class="text-sm text-gray-400 mb-2 block"
                    >Email Personal</label
                  >
                  <input
                    pInputText
                    [ngModel]="editEmail()"
                    (ngModelChange)="editEmail.set($event)"
                    placeholder="correo@ejemplo.com"
                    class="w-full"
                  />
                </div>
                @if (showWorkEmail()) {
                <div>
                  <label class="text-sm text-gray-400 mb-2 block"
                    >Email Laboral</label
                  >
                  <input
                    pInputText
                    [ngModel]="editWorkEmail()"
                    (ngModelChange)="editWorkEmail.set($event)"
                    placeholder="correo@empresa.com"
                    class="w-full"
                  />
                </div>
                }
                <div>
                  <label class="text-sm text-gray-400 mb-2 block"
                    >Teléfono</label
                  >
                  <input
                    pInputText
                    [ngModel]="editPhone()"
                    (ngModelChange)="editPhone.set($event)"
                    placeholder="+507 1234-5678"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="text-sm text-gray-400 mb-2 block"
                    >Dirección</label
                  >
                  <input
                    pInputText
                    [ngModel]="editAddress()"
                    (ngModelChange)="editAddress.set($event)"
                    placeholder="Calle, Ciudad, Provincia"
                    class="w-full"
                  />
                </div>
                <div class="md:col-span-2 flex justify-end gap-2 mt-4">
                  <p-button
                    label="Cancelar"
                    severity="secondary"
                    outlined
                    (click)="cancelEdit()"
                  />
                  <p-button
                    label="Guardar Cambios"
                    icon="pi pi-save"
                    (click)="savePersonalData()"
                    [loading]="savingPersonalData()"
                  />
                </div>
                }
              </div>
            </div>
          </div>
          }
        </p-card>
      </div>
      }

      <!-- Mis Marcaciones Section -->
      @if (activeSection() === 'timelogs') {
      <div id="timelogs" class="section-content">
        <p-card>
          <ng-template #title>Registro de Marcaciones</ng-template>
          <ng-template #subtitle
            >Consulta tus entradas y salidas del mes</ng-template
          >
          <div class="flex flex-col gap-4 mb-4">
            <div class="flex flex-col md:flex-row gap-2">
              <p-datepicker
                placeholder="Rango de fechas"
                selectionMode="range"
                appendTo="body"
                [(ngModel)]="dateRange"
                class="w-full md:w-auto"
              />
            </div>
          </div>
          <div class="overflow-x-auto">
            <p-table
              [value]="myTimelogs()"
              [rows]="10"
              [rowsPerPageOptions]="[10, 20, 50]"
              paginator
              [loading]="timelogsApi.isLoading()"
              paginatorDropdownAppendTo="body"
              styleClass="p-datatable-sm md:p-datatable-lg"
              [scrollable]="true"
              scrollHeight="400px"
              [responsiveLayout]="'scroll'"
            >
              <ng-template #header>
                <tr>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Entrada</th>
                  <th>Inicio Almuerzo</th>
                  <th>Fin Almuerzo</th>
                  <th>Salida</th>
                  <th>Horas Trabajadas</th>
                </tr>
              </ng-template>
              <ng-template #body let-log>
                <tr>
                  <td>{{ log.day | date : 'mediumDate' }}</td>
                  <td>
                    <span
                      class="inline-flex gap-1 py-0.5 px-1.5 rounded-sm font-medium items-center justify-center text-xs border border-black/20 shadow-sm"
                      [class]="
                        log.schedule?.schedule
                          ? getScheduleColor(log.schedule.schedule.color)
                          : 'bg-neutral-700 text-gray-300'
                      "
                    >
                      {{ log?.schedule?.schedule?.name || 'Sin horario' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-2 items-center">
                      <span
                        class="text-sm"
                        [class.text-red-400]="
                          log.delay && typeof log.delay === 'number'
                        "
                        [class.font-semibold]="
                          log.delay && typeof log.delay === 'number'
                        "
                      >
                        {{
                          log.entry?.date
                            ? (log.entry.date | date : 'hh:mm a')
                            : '-'
                        }}
                      </span>
                      @if(log.delay && typeof log.delay === 'number') {
                      <span class="text-xs text-red-400"
                        >Retraso: {{ log.delay }} min</span
                      >
                      }
                    </div>
                  </td>
                  <td>
                    {{
                      log.lunch_start?.date
                        ? (log.lunch_start.date | date : 'hh:mm a')
                        : '-'
                    }}
                  </td>
                  <td>
                    {{
                      log.lunch_end?.date
                        ? (log.lunch_end.date | date : 'hh:mm a')
                        : '-'
                    }}
                  </td>
                  <td>
                    {{
                      log.exit?.date ? (log.exit.date | date : 'hh:mm a') : '-'
                    }}
                  </td>
                  <td>
                    @if(log.entry && log.exit) {
                    {{ calculateWorkedHours(log.entry.date, log.exit.date) }}
                    } @else {
                    <span class="text-gray-400">-</span>
                    }
                  </td>
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr>
                  <td colspan="7">
                    <div
                      class="flex flex-col items-center justify-center gap-4 py-8"
                    >
                      <p class="text-gray-400">No se encontraron registros</p>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </p-card>
      </div>
      }

      <!-- Mis Tardanzas Section -->
      @if (activeSection() === 'lates') {
      <div id="lates" class="section-content">
        <p-card>
          <div class="overflow-x-auto">
            <p-table
              [value]="myLates()"
              [rows]="10"
              [rowsPerPageOptions]="[10, 20, 50]"
              paginator
              paginatorDropdownAppendTo="body"
              styleClass="p-datatable-sm md:p-datatable-lg"
              [scrollable]="true"
              scrollHeight="400px"
              [responsiveLayout]="'scroll'"
            >
              <ng-template #header>
                <tr>
                  <th>Fecha</th>
                  <th>Horario Programado</th>
                  <th>Hora de Entrada</th>
                  <th>Minutos de Retraso</th>
                </tr>
              </ng-template>
              <ng-template #body let-late>
                <tr>
                  <td>{{ late.date | date : 'fullDate' }}</td>
                  <td>{{ late.scheduled_time || '-' }}</td>
                  <td>{{ late.actual_time || '-' }}</td>
                  <td>
                    <span
                      class="font-semibold"
                      [class.text-yellow-400]="late.minutes <= 10"
                      [class.text-red-400]="late.minutes > 10"
                    >
                      {{ late.minutes }} min
                    </span>
                  </td>
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr>
                  <td colspan="4">
                    <div
                      class="flex flex-col items-center justify-center gap-4 py-8"
                    >
                      <i class="pi pi-check-circle text-green-400 text-4xl"></i>
                      <p class="text-gray-400">
                        ¡Excelente! No tienes tardanzas este mes
                      </p>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </p-card>
      </div>
      }

      <!-- Incapacidades Section -->
      @if (activeSection() === 'disabilities') {
      <div id="disabilities" class="section-content">
        <p-card>
          <ng-template #title>Subir Incapacidad</ng-template>
          <ng-template #subtitle
            >Carga documentos de incapacidad médica</ng-template
          >
          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Inicio de Incapacidad</label
                >
                <p-datepicker
                  [(ngModel)]="disabilityStartDate"
                  appendTo="body"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Fin de Incapacidad</label
                >
                <p-datepicker
                  [(ngModel)]="disabilityEndDate"
                  appendTo="body"
                  class="w-full"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >Descripción (opcional)</label
              >
              <textarea
                id="disability-description"
                pInputTextarea
                [(ngModel)]="disabilityDescription"
                rows="3"
                placeholder="Describe el motivo de la incapacidad..."
                class="w-full"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >Documento de Incapacidad</label
              >
              <p-fileUpload
                mode="basic"
                accept="image/*,.pdf"
                maxFileSize="5000000"
                [auto]="false"
                chooseLabel="Seleccionar Archivo"
                (onSelect)="onFileSelect($event)"
                class="w-full"
              />
              <p class="text-xs text-gray-500 mt-2">
                Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
              </p>
            </div>
            <div class="flex justify-end">
              <p-button
                label="Subir Incapacidad"
                icon="pi pi-upload"
                [loading]="uploadingDisability()"
                (click)="uploadDisability()"
              />
            </div>
          </div>

          <!-- Lista de incapacidades subidas -->
          <div class="mt-6">
            <h3 class="text-lg font-semibold text-white mb-4">
              Mis Incapacidades
            </h3>
            <div class="overflow-x-auto">
              <p-table
                [value]="myDisabilities()"
                [rows]="10"
                paginator
                [loading]="disabilitiesApi.isLoading()"
                styleClass="p-datatable-sm md:p-datatable-lg"
                [scrollable]="true"
                scrollHeight="400px"
                [responsiveLayout]="'scroll'"
              >
                <ng-template #header>
                  <tr>
                    <th>Inicio de Incapacidad</th>
                    <th>Fin de Incapacidad</th>
                    <th>Días</th>
                    <th>Estado</th>
                    <th>Documento</th>
                  </tr>
                </ng-template>
                <ng-template #body let-disability>
                  <tr>
                    <td>{{ disability.start_date | date : 'mediumDate' }}</td>
                    <td>{{ disability.end_date | date : 'mediumDate' }}</td>
                    <td>
                      {{
                        calculateDays(
                          disability.start_date,
                          disability.end_date
                        )
                      }}
                    </td>
                    <td>
                      @if (disability.status === 'rejected' &&
                      (disability.rejection_comment || disability.review_notes)) {
                      <span
                        class="px-2 py-1 rounded text-xs font-semibold cursor-help"
                        [class.bg-yellow-500]="disability.status === 'pending'"
                        [class.bg-green-500]="disability.status === 'approved'"
                        [class.bg-red-500]="disability.status === 'rejected'"
                        [pTooltip]="'Motivo: ' + (disability.rejection_comment || disability.review_notes || 'Sin motivo especificado')"
                        tooltipPosition="top"
                      >
                        {{
                          disability.status === 'pending'
                            ? 'Pendiente'
                            : disability.status === 'approved'
                            ? 'Aprobada'
                            : 'Rechazada'
                        }}
                      </span>
                      } @else {
                      <span
                        class="px-2 py-1 rounded text-xs font-semibold"
                        [class.bg-yellow-500]="disability.status === 'pending'"
                        [class.bg-green-500]="disability.status === 'approved'"
                        [class.bg-red-500]="disability.status === 'rejected'"
                      >
                        {{
                          disability.status === 'pending'
                            ? 'Pendiente'
                            : disability.status === 'approved'
                            ? 'Aprobada'
                            : 'Rechazada'
                        }}
                      </span>
                      }
                    </td>
                    <td>
                      @if(disability.document_url) {
                      <p-button
                        icon="pi pi-download"
                        severity="secondary"
                        size="small"
                        (click)="downloadDocument(disability.document_url)"
                        pTooltip="Descargar documento"
                        tooltipPosition="top"
                      />
                      }
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          </div>
        </p-card>
      </div>
      }

      <!-- Solicitar Documentos Section -->
      @if (activeSection() === 'documents') {
      <div id="documents" class="section-content">
        <p-card>
          <ng-template #title>Solicitar Documentos</ng-template>
          <ng-template #subtitle
            >Solicita cartas de trabajo u otros documentos</ng-template
          >
          <div class="flex flex-col gap-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >Tipo de Documento</label
              >
              <select pInputText [(ngModel)]="documentType" class="w-full">
                <option value="work_letter">Carta de Trabajo</option>
                <option value="salary_certificate">
                  Certificado de Salario
                </option>
                <option value="employment_certificate">
                  Certificado de Empleo
                </option>
                <option value="other">Otro</option>
              </select>
            </div>
            @if(documentType() === 'other') {
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >Especificar Documento</label
              >
              <input
                pInputText
                [(ngModel)]="customDocumentType"
                placeholder="Describe el documento que necesitas"
                class="w-full"
              />
            </div>
            }
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >Motivo o Uso del Documento</label
              >
              <textarea
                pInputTextarea
                [(ngModel)]="documentReason"
                rows="3"
                placeholder="Ej: Para trámite bancario, visa, etc."
                class="w-full"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >Fecha Requerida (opcional)</label
              >
              <p-datepicker
                [(ngModel)]="documentRequiredDate"
                appendTo="body"
                class="w-full"
              />
            </div>
            <div class="flex justify-end">
              <p-button
                label="Solicitar Documento"
                icon="pi pi-send"
                [loading]="submittingDocument()"
                (click)="submitDocumentRequest()"
              />
            </div>
          </div>

          <!-- Lista de solicitudes -->
          <div class="mt-6">
            <h3 class="text-lg font-semibold text-white mb-4">
              Mis Solicitudes
            </h3>
            <div class="overflow-x-auto">
              <p-table
                [value]="myDocumentRequests()"
                [rows]="10"
                paginator
                [loading]="documentRequestsApi.isLoading()"
                styleClass="p-datatable-sm md:p-datatable-lg"
                [scrollable]="true"
                scrollHeight="400px"
                [responsiveLayout]="'scroll'"
              >
                <ng-template #header>
                  <tr>
                    <th>Fecha de Solicitud</th>
                    <th>Tipo de Documento</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </ng-template>
                <ng-template #body let-request>
                  <tr>
                    <td>{{ request.created_at | date : 'mediumDate' }}</td>
                    <td>{{ getDocumentTypeLabel(request.document_type) }}</td>
                    <td>{{ request.reason || '-' }}</td>
                    <td>
                      <span
                        class="px-2 py-1 rounded text-xs font-semibold"
                        [class.bg-yellow-500]="request.status === 'pending'"
                        [class.bg-green-500]="request.status === 'approved'"
                        [class.bg-red-500]="request.status === 'rejected'"
                      >
                        {{
                          request.status === 'pending'
                            ? 'Pendiente'
                            : request.status === 'approved'
                            ? 'Aprobada'
                            : 'Rechazada'
                        }}
                      </span>
                    </td>
                    <td>
                      @if(request.status === 'approved' && request.document_url)
                      {
                      <p-button
                        icon="pi pi-download"
                        severity="success"
                        size="small"
                        (click)="downloadDocument(request.document_url)"
                        pTooltip="Descargar documento"
                      />
                      }
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          </div>
        </p-card>
      </div>
      }

      <!-- Buzón de Quejas Section -->
      @if (activeSection() === 'complaints') {
      <div id="complaints" class="section-content">
        <p-card>
          <ng-template #title>Buzón de Quejas Anónimas</ng-template>
          <ng-template #subtitle
            >Expresa tus inquietudes de forma anónima y
            confidencial</ng-template
          >
          <div class="flex flex-col gap-4">
            <div
              class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
            >
              <div class="flex items-start gap-3">
                <i class="pi pi-info-circle text-yellow-400 text-xl"></i>
                <div class="flex-1">
                  <p class="text-yellow-300 font-semibold mb-2">
                    Tu privacidad está protegida
                  </p>
                  <p class="text-sm text-gray-300">
                    Todas las quejas son completamente anónimas. Tu identidad no
                    será revelada a menos que lo autorices explícitamente.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2">Categoría</label>
              <select
                pInputText
                [ngModel]="complaintCategory()"
                (ngModelChange)="complaintCategory.set($event)"
                class="w-full"
              >
                <option value="work_environment">Ambiente Laboral</option>
                <option value="harassment">Acoso o Discriminación</option>
                <option value="safety">Seguridad</option>
                <option value="management">Supervisión/Gerencia</option>
                <option value="benefits">Beneficios</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >Describe tu queja o sugerencia</label
              >
              <textarea
                pTextarea
                [ngModel]="complaintText()"
                (ngModelChange)="complaintText.set($event)"
                rows="6"
                placeholder="Describe detalladamente tu queja, sugerencia o inquietud..."
                class="w-full"
              ></textarea>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowContact"
                [ngModel]="allowContact()"
                (ngModelChange)="allowContact.set($event)"
              />
              <label for="allowContact" class="text-sm text-gray-300"
                >Permitir que RRHH me contacte para seguimiento
                (opcional)</label
              >
            </div>
            @if(allowContact()) {
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >Forma de Contacto Preferida</label
              >
              <select
                pInputText
                [ngModel]="contactMethod()"
                (ngModelChange)="contactMethod.set($event)"
                class="w-full"
              >
                <option value="email">Email</option>
                <option value="phone">Teléfono</option>
                <option value="meeting">Reunión Presencial</option>
              </select>
            </div>
            }
            <div class="flex justify-end">
              <p-button
                label="Enviar Queja"
                icon="pi pi-send"
                severity="warn"
                [loading]="submittingComplaint()"
                [disabled]="!canSubmitComplaint() || submittingComplaint()"
                (click)="submitComplaint()"
              />
            </div>
          </div>

          <!-- Lista de quejas/conversaciones enviadas -->
          <div class="mt-6">
            <h3 class="text-lg font-semibold text-white mb-4">
              Mis Quejas y Conversaciones
            </h3>
            @if(myComplaints().length === 0 && !complaintsApi.isLoading()) {
            <div class="text-center py-8">
              <i class="pi pi-inbox text-4xl text-gray-500 mb-4"></i>
              <p class="text-gray-400">No has enviado ninguna queja todavía.</p>
            </div>
            } @else {
            <div class="overflow-x-auto">
              <p-table
                [value]="myComplaints()"
                [rows]="10"
                paginator
                [loading]="complaintsApi.isLoading()"
                styleClass="p-datatable-sm md:p-datatable-lg"
                [scrollable]="true"
                scrollHeight="400px"
                [responsiveLayout]="'scroll'"
              >
                <ng-template #header>
                  <tr>
                    <th>Fecha</th>
                    <th>Categoría</th>
                    <th>Estado</th>
                    <th>Última Actividad</th>
                    <th>Acciones</th>
                  </tr>
                </ng-template>
                <ng-template #body let-complaint>
                  <tr
                    [ngClass]="{
                      'bg-amber-500/10': hasUnreadMessages(complaint)
                    }"
                  >
                    <td>{{ complaint.created_at | date : 'mediumDate' }}</td>
                    <td>{{ getComplaintCategoryLabel(complaint.category) }}</td>
                    <td>
                      <span
                        class="px-2 py-1 rounded text-xs font-semibold"
                        [class.bg-yellow-500]="complaint.status === 'pending'"
                        [class.bg-green-500]="complaint.status === 'resolved'"
                        [class.bg-blue-500]="complaint.status === 'in_review'"
                      >
                        {{
                          complaint.status === 'pending'
                            ? 'Pendiente'
                            : complaint.status === 'resolved'
                            ? 'Resuelta'
                            : 'En Revisión'
                        }}
                      </span>
                    </td>
                    <td class="text-sm text-gray-400">
                      {{
                        complaint.last_message_at || complaint.updated_at
                          | date : 'short'
                      }}
                      @if(hasUnreadMessages(complaint)) {
                      <i
                        class="pi pi-circle-fill text-amber-400 text-xs ml-2"
                      ></i>
                      }
                    </td>
                    <td>
                      <p-button
                        icon="pi pi-comments"
                        severity="info"
                        size="small"
                        [label]="
                          hasUnreadMessages(complaint)
                            ? 'Ver Conversación (Nuevo)'
                            : 'Ver Conversación'
                        "
                        (click)="viewResponse(complaint)"
                        pTooltip="Abrir conversación"
                      />
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
            }
          </div>
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
  public messageService = inject(MessageService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private organizationService = inject(OrganizationService);
  private readonly companyEmailDomain = '@blackdogpanama.com';

  public currentEmployee = computed(() => this.store.currentEmployee());
  public activeSection = signal<string>('dashboard');
  public showWorkEmail = computed(() => {
    const workEmail =
      this.currentEmployee()?.work_email?.trim().toLowerCase() ?? '';
    return workEmail.endsWith(this.companyEmailDomain);
  });

  public showSalary = signal(false);

  constructor() {
    // Inicializar con el fragmento actual si existe
    const currentFragment = this.route.snapshot.fragment;
    if (currentFragment) {
      this.activeSection.set(currentFragment);
    } else {
      this.activeSection.set('dashboard');
    }

    // Suscribirse a cambios de fragmento
    this.route.fragment.subscribe((fragment) => {
      if (fragment) {
        this.activeSection.set(fragment);
        // Hacer scroll a la sección después de un pequeño delay
        setTimeout(() => {
          const element = document.getElementById(fragment);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        this.activeSection.set('dashboard');
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
      console.warn('[EmployeePortal] No se encontró company_id, no se pueden cargar timelogs');
      return undefined;
    }
    
    // Construir URL manualmente para aplicar correctamente filtros gte y lte
    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`;
    const startDate = format(this.dateRange()[0], "yyyy-MM-dd'T'06:00:00");
    const endDate = format(addDays(this.dateRange()[1], 1), "yyyy-MM-dd'T'06:00:00");
    const select = `*,employee:employees(id,first_name,father_name,company_id, branch:branches(id, name)),branch:branches(id, name, short_name)`;
    
    let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
    url += `&employee_id=eq.${employeeId}`;
    // Filtrar a través de employee.company_id (funciona incluso si timelogs no tiene company_id)
    if (companyId) {
      url += `&employee.company_id=eq.${companyId}`;
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
  public documentType = signal('work_letter');
  public customDocumentType = signal('');
  public documentReason = signal('');
  public documentRequiredDate = signal<Date | null>(null);
  public submittingDocument = signal(false);

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
  public complaintCategory = signal('work_environment');
  public complaintText = signal('');
  public allowContact = signal(false);
  public contactMethod = signal('email');
  public submittingComplaint = signal(false);
  public responseDialogVisible = signal(false);
  public selectedComplaint = signal<any>(null);

  // Computed: Validación del formulario de quejas
  public canSubmitComplaint = computed(() => {
    const text = this.complaintText();
    return text && text.trim().length >= 10;
  });

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
  public calculateWorkedHours(entry: Date, exit: Date): string {
    const minutes = differenceInMinutes(new Date(exit), new Date(entry));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  public calculateDays(start: Date | string, end: Date | string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end days
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
    const logs = this.myTimelogs();
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return logs.filter((log) => {
      const logDate = new Date(log.day);
      return logDate >= monthStart && logDate <= monthEnd && log.entry;
    }).length;
  });

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
      const params: any = { id: `eq.${this.currentEmployee()!.id}` };
      
      // Agregar filtro por company_id para seguridad
      if (companyId) {
        params.company_id = `eq.${companyId}`;
      }
      
      await this.http
        .patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
          updateData,
          {
            params,
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
        .toPromise();

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
    if (!this.documentReason().trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo Requerido',
        detail: 'Por favor describe el motivo de la solicitud',
      });
      return;
    }

    this.submittingDocument.set(true);

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
          this.documentType.set('work_letter');
          this.customDocumentType.set('');
          this.documentReason.set('');
          this.documentRequiredDate.set(null);
          this.documentRequestsApi.reload();
          this.submittingDocument.set(false);
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
          this.submittingDocument.set(false);
        },
      });
  }

  public async submitComplaint(): Promise<void> {
    if (!this.canSubmitComplaint()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Queja Muy Corta',
        detail: 'Por favor describe tu queja con al menos 10 caracteres',
      });
      return;
    }

    this.submittingComplaint.set(true);

    const complaintData = {
      employee_id: this.allowContact() ? this.currentEmployee()!.id : null, // NULL for anonymous (visible to HR)
      creator_employee_id: this.currentEmployee()!.id, // Always set, even for anonymous (for internal use)
      category: this.complaintCategory(),
      complaint: this.complaintText(),
      allow_contact: this.allowContact(),
      contact_method: this.allowContact() ? this.contactMethod() : null,
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
          // La respuesta puede ser un array o un objeto único
          const complaint = Array.isArray(response) ? response[0] : response;

          if (complaint && complaint.id) {
            // Crear el primer mensaje con el texto de la queja
            const messageData = {
              complaint_id: complaint.id,
              sender_id: this.allowContact()
                ? this.currentEmployee()!.id
                : null,
              sender_type: 'employee',
              is_anonymous: !this.allowContact(),
              message: this.complaintText().trim(),
              thread_id: complaint.thread_id || complaint.id, // Usar thread_id o id como fallback
            };

            try {
              await this.http
                .post(
                  `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
                  messageData,
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      Prefer: 'return=representation',
                    },
                  }
                )
                .toPromise();

              this.messageService.add({
                severity: 'success',
                summary: 'Queja Enviada',
                detail: this.allowContact()
                  ? 'Tu queja ha sido enviada. Recibirás respuesta de RRHH pronto.'
                  : 'Tu queja ha sido enviada de forma anónima. Recibirás respuesta de RRHH pronto.',
              });

              // Reset form
              this.complaintText.set('');
              this.complaintCategory.set('work_environment');
              this.allowContact.set(false);
              this.complaintsApi.reload();
              this.submittingComplaint.set(false);
            } catch (messageError: any) {
              console.error('Error creating message:', messageError);
              // La queja se creó pero el mensaje no, mostrar advertencia
              this.messageService.add({
                severity: 'warn',
                summary: 'Queja Enviada',
                detail:
                  'La queja fue creada pero hubo un problema al crear el mensaje. Contacta a RRHH si no recibes respuesta.',
              });
              this.complaintsApi.reload();
              this.submittingComplaint.set(false);
            }
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo obtener el ID de la queja creada',
            });
            this.submittingComplaint.set(false);
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
              'No se pudo enviar la queja. Por favor intenta de nuevo.',
          });
          this.submittingComplaint.set(false);
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
        await this.http
          .patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages?id=eq.${message.id}`,
            { is_read: true, read_at: new Date().toISOString() },
            {
              headers: {
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
            }
          )
          .toPromise();
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
      await this.http
        .post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
          messageData,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
        .toPromise();

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
}
