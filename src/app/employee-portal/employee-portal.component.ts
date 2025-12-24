import {
  CurrencyPipe,
  DatePipe,
  NgClass,
} from '@angular/common';
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
import { CalendarComponent, CalendarMarkerData } from '../calendar.component';
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
    Select,
    NgClass,
    CalendarComponent,
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

            <!-- Horas de Compensatorio Aprobadas -->
            <p-card class="dashboard-stat-card">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0 mb-1">Horas de Compensatorio Aprobadas</p>
                  <p class="text-2xl font-bold text-white m-0">
                    {{ approvedCompensatoryHours() }}
                  </p>
                  <p class="text-xs text-gray-500 m-0 mt-1">Total aprobadas</p>
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
        @if (currentEmployee()) {
        <div class="flex flex-col gap-6">
          <!-- Header Card con Avatar -->
          <p-card class="profile-header-card">
            <div class="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div class="flex items-center gap-4">
                <div
                  class="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg border-4 border-neutral-800"
                >
                  <i class="pi pi-user text-white text-3xl"></i>
                </div>
                <div>
                  <h2 class="text-2xl font-bold text-white m-0">
                    {{ currentEmployee()?.first_name }}
                    {{ currentEmployee()?.father_name }}
                  </h2>
                  <p class="text-gray-400 m-0 mt-1 flex items-center gap-2">
                    <i class="pi pi-briefcase text-amber-400"></i>
                    {{ currentEmployee()?.position?.name || 'Sin cargo' }}
                  </p>
                  <p class="text-gray-500 text-sm m-0 mt-1 flex items-center gap-2">
                    <i class="pi pi-building text-gray-500"></i>
                    {{ currentEmployee()?.branch?.name || 'Sin sucursal' }}
                  </p>
                </div>
              </div>
              <div class="ml-auto">
                <p-button
                  [label]="editMode() ? 'Cancelar' : 'Editar Datos'"
                  [icon]="editMode() ? 'pi pi-times' : 'pi pi-pencil'"
                  [severity]="editMode() ? 'secondary' : 'primary'"
                  [outlined]="!editMode()"
                  (click)="toggleEditMode()"
                />
              </div>
            </div>
          </p-card>

          <!-- Información General -->
          <p-card>
            <ng-template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-info-circle text-amber-400"></i>
                <span>Información General</span>
              </div>
            </ng-template>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Nombre Completo -->
              <div class="p-4 rounded-lg bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 hover:border-amber-500/30 transition-all">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <i class="pi pi-user text-blue-400"></i>
                  </div>
                  <label class="text-sm text-gray-400 font-medium">Nombre Completo</label>
                </div>
                <p class="text-white font-semibold text-base m-0">
                  {{ currentEmployee()?.first_name }}
                  {{ currentEmployee()?.middle_name }}
                  {{ currentEmployee()?.father_name }}
                  {{ currentEmployee()?.mother_name }}
                </p>
              </div>

              <!-- Cargo -->
              <div class="p-4 rounded-lg bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 hover:border-amber-500/30 transition-all">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <i class="pi pi-briefcase text-purple-400"></i>
                  </div>
                  <label class="text-sm text-gray-400 font-medium">Cargo</label>
                </div>
                <p class="text-white font-semibold text-base m-0">
                  {{ currentEmployee()?.position?.name || 'Sin cargo' }}
                </p>
              </div>

              <!-- Sucursal -->
              <div class="p-4 rounded-lg bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 hover:border-amber-500/30 transition-all">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <i class="pi pi-building text-green-400"></i>
                  </div>
                  <label class="text-sm text-gray-400 font-medium">Sucursal</label>
                </div>
                <p class="text-white font-semibold text-base m-0">
                  {{ currentEmployee()?.branch?.name || 'Sin sucursal' }}
                </p>
              </div>

              <!-- Departamento -->
              <div class="p-4 rounded-lg bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 hover:border-amber-500/30 transition-all">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <i class="pi pi-sitemap text-cyan-400"></i>
                  </div>
                  <label class="text-sm text-gray-400 font-medium">Departamento</label>
                </div>
                <p class="text-white font-semibold text-base m-0">
                  {{ currentEmployee()?.department?.name || 'Sin departamento' }}
                </p>
              </div>

              <!-- Fecha de Ingreso -->
              <div class="p-4 rounded-lg bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 hover:border-amber-500/30 transition-all">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <i class="pi pi-calendar text-orange-400"></i>
                  </div>
                  <label class="text-sm text-gray-400 font-medium">Fecha de Ingreso</label>
                </div>
                <p class="text-white font-semibold text-base m-0">
                  {{ currentEmployee()?.start_date | date : 'fullDate' }}
                </p>
              </div>

              <!-- Salario Mensual -->
              <div class="p-4 rounded-lg bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 hover:border-amber-500/30 transition-all">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <i class="pi pi-dollar text-amber-400"></i>
                  </div>
                  <label class="text-sm text-gray-400 font-medium">Salario Mensual</label>
                </div>
                <p 
                  class="text-white font-semibold text-base m-0 cursor-pointer hover:text-amber-300 transition-colors inline-flex items-center gap-2"
                  (click)="showSalary.set(!showSalary())"
                  [title]="showSalary() ? 'Ocultar salario' : 'Click para ver salario'"
                >
                  @if (showSalary()) {
                    {{ currentEmployee()?.monthly_salary | currency : '$' }}
                  } @else {
                    <span class="text-gray-500">••••••</span>
                  }
                  <i 
                    [class]="showSalary() ? 'pi pi-eye-slash text-gray-400' : 'pi pi-eye text-gray-400'"
                    class="hover:text-amber-400 transition-colors"
                  ></i>
                </p>
              </div>
            </div>
          </p-card>

          <!-- Datos de Contacto -->
          <p-card>
            <ng-template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-phone text-amber-400"></i>
                <span>Datos de Contacto</span>
              </div>
            </ng-template>
            @if (!editMode()) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Email Personal -->
              <div class="p-4 rounded-lg bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 hover:border-blue-500/30 transition-all">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <i class="pi pi-envelope text-blue-400"></i>
                  </div>
                  <label class="text-sm text-gray-400 font-medium">Email Personal</label>
                </div>
                <p class="text-white font-semibold text-base m-0 break-all">
                  {{ currentEmployee()?.email || 'Sin email' }}
                </p>
              </div>

              <!-- Email Laboral -->
              @if (showWorkEmail()) {
              <div class="p-4 rounded-lg bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 hover:border-green-500/30 transition-all">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <i class="pi pi-envelope text-green-400"></i>
                  </div>
                  <label class="text-sm text-gray-400 font-medium">Email Laboral</label>
                </div>
                <p class="text-white font-semibold text-base m-0 break-all">
                  {{ currentEmployee()?.work_email || 'Sin email' }}
                </p>
              </div>
              }

              <!-- Teléfono -->
              <div class="p-4 rounded-lg bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 hover:border-purple-500/30 transition-all">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <i class="pi pi-phone text-purple-400"></i>
                  </div>
                  <label class="text-sm text-gray-400 font-medium">Teléfono</label>
                </div>
                <p class="text-white font-semibold text-base m-0">
                  {{ currentEmployee()?.phone_number || 'Sin teléfono' }}
                </p>
              </div>

              <!-- Dirección -->
              <div class="p-4 rounded-lg bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 hover:border-cyan-500/30 transition-all md:col-span-2">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <i class="pi pi-map-marker text-cyan-400"></i>
                  </div>
                  <label class="text-sm text-gray-400 font-medium">Dirección</label>
                </div>
                <p class="text-white font-semibold text-base m-0">
                  {{ currentEmployee()?.address || 'Sin dirección' }}
                </p>
              </div>
            </div>
            } @else {
            <!-- Modo Edición -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-gray-400 mb-2 block font-medium"
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
                <label class="text-sm text-gray-400 mb-2 block font-medium"
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
                <label class="text-sm text-gray-400 mb-2 block font-medium"
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
                <label class="text-sm text-gray-400 mb-2 block font-medium"
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
              <div class="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-700">
                <p-button
                  label="Cancelar"
                  severity="secondary"
                  outlined
                  icon="pi pi-times"
                  (click)="cancelEdit()"
                />
                <p-button
                  label="Guardar Cambios"
                  icon="pi pi-save"
                  (click)="savePersonalData()"
                  [loading]="savingPersonalData()"
                />
              </div>
            </div>
            }
          </p-card>
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
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <!-- Incapacidades -->
              <p-card 
                class="cursor-pointer hover:shadow-lg transition-all" 
                (click)="activeSection.set('disabilities')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <i class="pi pi-file-plus text-blue-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">Incapacidades</h3>
                  <p class="text-sm text-gray-400 m-0">
                    Sube documentos de incapacidad médica
                  </p>
                </div>
              </p-card>

              <!-- Solicitar Documentos -->
              <p-card 
                class="cursor-pointer hover:shadow-lg transition-all" 
                (click)="activeSection.set('documents')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <i class="pi pi-file-edit text-green-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">Solicitar Documentos</h3>
                  <p class="text-sm text-gray-400 m-0">
                    Solicita cartas de trabajo u otros documentos
                  </p>
                </div>
              </p-card>

              <!-- Buzón de Quejas -->
              <p-card 
                class="cursor-pointer hover:shadow-lg transition-all" 
                (click)="activeSection.set('complaints')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <i class="pi pi-comments text-yellow-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">Buzón de Quejas</h3>
                  <p class="text-sm text-gray-400 m-0">
                    Expresa tus inquietudes de forma anónima
                  </p>
                </div>
              </p-card>

              <!-- Solicitar Vacaciones -->
              <p-card 
                class="cursor-pointer hover:shadow-lg transition-all" 
                (click)="activeSection.set('vacations')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <i class="pi pi-calendar-plus text-purple-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">Solicitar Vacaciones</h3>
                  <p class="text-sm text-gray-400 m-0">
                    Solicita tus días de vacaciones
                  </p>
                </div>
              </p-card>

              <!-- Tiempo Compensatorio -->
              <p-card 
                class="cursor-pointer hover:shadow-lg transition-all" 
                (click)="activeSection.set('compensatory')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <i class="pi pi-clock text-cyan-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">Tiempo Compensatorio</h3>
                  <p class="text-sm text-gray-400 m-0">
                    Solicita tiempo compensatorio por horas extras
                  </p>
                </div>
              </p-card>

              <!-- Mis Solicitudes -->
              <p-card 
                class="cursor-pointer hover:shadow-lg transition-all" 
                (click)="activeSection.set('my-requests')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <i class="pi pi-list text-indigo-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">Mis Solicitudes</h3>
                  <p class="text-sm text-gray-400 m-0">
                    Visualiza todas tus solicitudes
                  </p>
                </div>
              </p-card>
            </div>
          </div>
        </p-card>
      </div>
      }

      <!-- Mis Marcaciones Section -->
      @if (activeSection() === 'timelogs') {
      <div id="timelogs" class="section-content">
        <p-card>
          <ng-template #title>
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <i class="pi pi-calendar-clock text-amber-400"></i>
                <span>Calendario de Marcaciones</span>
              </div>
              <div class="flex items-center gap-2">
                <p-button
                  [icon]="timelogViewMode() === 'calendar' ? 'pi pi-table' : 'pi pi-calendar'"
                  [label]="timelogViewMode() === 'calendar' ? 'Vista Tabla' : 'Vista Calendario'"
                  [outlined]="true"
                  severity="secondary"
                  size="small"
                  (onClick)="timelogViewMode.set(timelogViewMode() === 'calendar' ? 'table' : 'calendar')"
                  [pTooltip]="timelogViewMode() === 'calendar' ? 'Cambiar a vista de tabla' : 'Cambiar a vista de calendario'"
                  tooltipPosition="left"
                />
              </div>
            </div>
          </ng-template>
          <ng-template #subtitle
            >{{ timelogViewMode() === 'calendar' ? 'Visualiza tus marcaciones en formato calendario' : 'Visualiza tus marcaciones en formato tabla' }}</ng-template
          >
          
          <div class="mt-2"></div>
          
          @if (monthTimelogsApi.isLoading()) {
            <div class="flex items-center justify-center py-12">
              <i class="pi pi-spin pi-spinner text-4xl text-amber-400"></i>
            </div>
          } @else {
            @if (timelogViewMode() === 'calendar') {
              <!-- Calendario bonito usando pt-calendar -->
              <pt-calendar
                [markers]="timelogMarkers()"
                [markerTpl]="timelogMarkerTemplate"
                [currentDateInput]="calendarMonth()"
                (monthChange)="onCalendarMonthChange($event)"
              />
            } @else {
              <!-- Vista de tabla -->
              <div class="overflow-x-auto">
                <p-table
                  [value]="monthTimelogs()"
                  [rows]="25"
                  [rowsPerPageOptions]="[10, 25, 50, 100]"
                  paginator
                  paginatorDropdownAppendTo="body"
                  showGridlines
                  stripedRows
                  styleClass="p-datatable-sm"
                  [scrollable]="true"
                  scrollHeight="calc(100vh - 400px)"
                >
                  <ng-template #header>
                    <tr>
                      <th>Fecha</th>
                      <th>Entrada</th>
                      <th>Inicio Almuerzo</th>
                      <th>Fin Almuerzo</th>
                      <th>Salida</th>
                      <th>Horas Trabajadas</th>
                      <th>Estado</th>
                    </tr>
                  </ng-template>
                  <ng-template #body let-log>
                    <tr>
                      <td class="font-semibold">{{ log.day | date : 'fullDate' }}</td>
                      <td>
                        @if (log.entry) {
                          <div class="flex items-center gap-2">
                            <i class="pi pi-sign-in text-green-400"></i>
                            <span>{{ log.entry.date | date : 'HH:mm' }}</span>
                            @if (log.entry.branch) {
                              <span class="text-xs text-gray-400">({{ log.entry.branch.short_name || log.entry.branch.name }})</span>
                            }
                          </div>
                        } @else {
                          <span class="text-gray-500">-</span>
                        }
                      </td>
                      <td>
                        @if (log.lunch_start) {
                          <div class="flex items-center gap-2">
                            <i class="pi pi-clock text-amber-400"></i>
                            <span>{{ log.lunch_start.date | date : 'HH:mm' }}</span>
                            @if (log.lunch_start.branch) {
                              <span class="text-xs text-gray-400">({{ log.lunch_start.branch.short_name || log.lunch_start.branch.name }})</span>
                            }
                          </div>
                        } @else {
                          <span class="text-gray-500">-</span>
                        }
                      </td>
                      <td>
                        @if (log.lunch_end) {
                          <div class="flex items-center gap-2">
                            <i class="pi pi-clock text-amber-400"></i>
                            <span>{{ log.lunch_end.date | date : 'HH:mm' }}</span>
                            @if (log.lunch_end.branch) {
                              <span class="text-xs text-gray-400">({{ log.lunch_end.branch.short_name || log.lunch_end.branch.name }})</span>
                            }
                          </div>
                        } @else {
                          <span class="text-gray-500">-</span>
                        }
                      </td>
                      <td>
                        @if (log.exit) {
                          <div class="flex items-center gap-2">
                            <i class="pi pi-sign-out text-blue-400"></i>
                            <span>{{ log.exit.date | date : 'HH:mm' }}</span>
                            @if (log.exit.branch) {
                              <span class="text-xs text-gray-400">({{ log.exit.branch.short_name || log.exit.branch.name }})</span>
                            }
                          </div>
                        } @else {
                          <span class="text-gray-500">-</span>
                        }
                      </td>
                      <td>
                        @if (log.entry && log.exit) {
                          @let workedHours = calculateWorkedHours(
                            log.entry.date, 
                            log.exit.date, 
                            log.lunch_start?.date, 
                            log.lunch_end?.date
                          );
                          <span class="font-semibold text-amber-300">{{ workedHours }}</span>
                        } @else {
                          <span class="text-gray-500">-</span>
                        }
                      </td>
                      <td>
                        @let hasEntry = log?.entry;
                        @let hasExit = log?.exit;
                        @let hasDelay = log?.delay && typeof log?.delay === 'number';
                        @let isComplete = hasEntry && hasExit;
                        @let isIncomplete = hasEntry && !hasExit;
                        
                        <div class="flex items-center gap-2">
                          @if (isComplete && !hasDelay) {
                            <span class="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-300">
                              <i class="pi pi-check-circle mr-1"></i>Completo
                            </span>
                          } @else if (isIncomplete) {
                            <span class="px-2 py-1 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-300">
                              <i class="pi pi-exclamation-triangle mr-1"></i>Incompleto
                            </span>
                          } @else if (hasDelay) {
                            <span class="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-300">
                              <i class="pi pi-clock mr-1"></i>Retraso {{ log.delay }}m
                            </span>
                          } @else {
                            <span class="px-2 py-1 rounded text-xs font-semibold bg-gray-500/20 text-gray-400">
                              Sin datos
                            </span>
                          }
                        </div>
                      </td>
                    </tr>
                  </ng-template>
                  <ng-template #emptymessage>
                    <tr>
                      <td colspan="7">
                        <div class="flex flex-col items-center justify-center gap-4 py-8">
                          <i class="pi pi-calendar-times text-4xl text-gray-500"></i>
                          <p class="text-gray-400">No hay marcaciones para este mes</p>
                        </div>
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              </div>
            }
            
            <!-- Template para mostrar los markers en el calendario tipo mapa -->
            <ng-template #timelogMarkerTemplate let-markers>
              <div class="flex flex-col gap-1.5 w-full h-full">
                @for (marker of markers; track marker.data.day) {
                  @let log = marker.data;
                  @let hasEntry = log?.entry;
                  @let hasExit = log?.exit;
                  @let hasLunchStart = log?.lunch_start;
                  @let hasLunchEnd = log?.lunch_end;
                  @let hasDelay = log?.delay && typeof log?.delay === 'number';
                  @let workedHours = log?.entry && log?.exit ? calculateWorkedHours(
                    log.entry.date, 
                    log.exit.date, 
                    log.lunch_start?.date, 
                    log.lunch_end?.date
                  ) : null;
                  @let isComplete = hasEntry && hasExit;
                  @let isIncomplete = hasEntry && !hasExit;
                  
                  <div
                    class="flex flex-col gap-1 p-1.5 rounded-md shadow-sm border transition-all duration-200 w-full"
                    [class.bg-gradient-to-br]="true"
                    [class.from-green-600/30]="isComplete && !hasDelay"
                    [class.to-green-500/20]="isComplete && !hasDelay"
                    [class.from-yellow-600/30]="isIncomplete"
                    [class.to-yellow-500/20]="isIncomplete"
                    [class.from-red-600/30]="hasDelay"
                    [class.to-red-500/20]="hasDelay"
                    [class.border-green-400]="isComplete && !hasDelay"
                    [class.border-yellow-400]="isIncomplete"
                    [class.border-red-400]="hasDelay"
                  >
                    <!-- Header compacto con badges de estado -->
                    <div class="flex items-center justify-end mb-0.5">
                      <div class="flex items-center gap-0.5">
                        @if (isComplete) {
                          <span class="text-[8px] bg-green-500/50 text-white px-1 py-0.5 rounded font-semibold">
                            ✓
                          </span>
                        } @else if (isIncomplete) {
                          <span class="text-[8px] bg-yellow-500/50 text-white px-1 py-0.5 rounded font-semibold">
                            ⚠
                          </span>
                        }
                        @if (hasDelay) {
                          <span class="text-[8px] bg-red-500/70 text-white px-1 py-0.5 rounded font-semibold">
                            {{ log.delay }}m
                          </span>
                        }
                      </div>
                    </div>

                    <!-- Timeline compacto -->
                    <div class="flex flex-col gap-1">
                      <!-- Entrada -->
                      @if (hasEntry) {
                        <div class="flex items-center gap-1">
                          <i class="pi pi-sign-in text-[9px] text-green-300"></i>
                          <span class="text-[10px] text-white font-semibold">{{ log.entry.date | date : 'HH:mm' }}</span>
                        </div>
                      }

                      <!-- Almuerzo -->
                      @if (hasLunchStart || hasLunchEnd) {
                        <div class="flex items-center gap-1">
                          <i class="pi pi-clock text-[9px] text-amber-300"></i>
                          <span class="text-[10px] text-white">
                            @if (hasLunchStart && hasLunchEnd) {
                              {{ log.lunch_start.date | date : 'HH:mm' }}-{{ log.lunch_end.date | date : 'HH:mm' }}
                            } @else if (hasLunchStart) {
                              {{ log.lunch_start.date | date : 'HH:mm' }}
                            } @else {
                              {{ log.lunch_end.date | date : 'HH:mm' }}
                            }
                          </span>
                        </div>
                      }

                      <!-- Salida -->
                      @if (hasExit) {
                        <div class="flex items-center gap-1">
                          <i class="pi pi-sign-out text-[9px] text-blue-300"></i>
                          <span class="text-[10px] text-white font-semibold">{{ log.exit.date | date : 'HH:mm' }}</span>
                        </div>
                      }

                      <!-- Horas trabajadas -->
                      @if (workedHours) {
                        <div class="flex items-center gap-1 mt-0.5 pt-0.5 border-t border-white/10">
                          <i class="pi pi-hourglass text-[9px] text-amber-400"></i>
                          <span class="text-[9px] font-bold text-amber-300">{{ workedHours }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </ng-template>
          }
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

      <!-- Tiempo Compensatorio Section -->
      @if (activeSection() === 'compensatory') {
      <div id="compensatory" class="section-content">
        <p-card>
          <ng-template #title>
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <i class="pi pi-clock text-cyan-400"></i>
                <span>Solicitar Tiempo Compensatorio</span>
              </div>
              <p-button
                icon="pi pi-question-circle"
                [rounded]="true"
                [text]="true"
                severity="secondary"
                [outlined]="true"
                (click)="showTutorialDialog.set(true)"
                pTooltip="¿Cómo funciona el tiempo compensatorio?"
                [style]="{ width: '2.5rem', height: '2.5rem' }"
              />
            </div>
          </ng-template>
          <ng-template #subtitle
            >Solicita tiempo compensatorio basado en tus horas extras trabajadas</ng-template
          >

          <!-- Paso 1: Selección de Tipo -->
          <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <i class="pi pi-list text-cyan-400"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">Paso 1: Selecciona el Tipo</h3>
            </div>
            <div class="flex gap-6">
              <div 
                class="flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg"
                [class.border-cyan-400]="compensatoryType() === 'hours'"
                [class.bg-cyan-500/10]="compensatoryType() === 'hours'"
                [class.border-neutral-600]="compensatoryType() !== 'hours'"
                [class.bg-neutral-700/30]="compensatoryType() !== 'hours'"
                (click)="compensatoryType.set('hours')"
              >
                <div class="flex items-center gap-3">
                  <input
                    type="radio"
                    id="compensatory-hours"
                    name="compensatory-type"
                    [value]="'hours'"
                    [(ngModel)]="compensatoryType"
                    class="w-5 h-5 text-cyan-400"
                  />
                  <label for="compensatory-hours" class="text-base font-medium text-gray-300 cursor-pointer flex-1">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-clock text-cyan-400"></i>
                      <span>Horas</span>
                    </div>
                  </label>
                </div>
                <p class="text-xs text-gray-400 mt-2 ml-8">Solicita compensatorio por horas específicas</p>
              </div>
              <div 
                class="flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg"
                [class.border-cyan-400]="compensatoryType() === 'days'"
                [class.bg-cyan-500/10]="compensatoryType() === 'days'"
                [class.border-neutral-600]="compensatoryType() !== 'days'"
                [class.bg-neutral-700/30]="compensatoryType() !== 'days'"
                (click)="compensatoryType.set('days')"
              >
                <div class="flex items-center gap-3">
                  <input
                    type="radio"
                    id="compensatory-days"
                    name="compensatory-type"
                    [value]="'days'"
                    [(ngModel)]="compensatoryType"
                    class="w-5 h-5 text-cyan-400"
                  />
                  <label for="compensatory-days" class="text-base font-medium text-gray-300 cursor-pointer flex-1">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-calendar text-cyan-400"></i>
                      <span>Días</span>
                    </div>
                  </label>
                </div>
                <p class="text-xs text-gray-400 mt-2 ml-8">Solicita compensatorio por días completos</p>
              </div>
            </div>
          </div>

          <!-- Paso 2: Fechas Condicionales -->
          <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <i class="pi pi-calendar text-cyan-400"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">Paso 2: Fecha del Compensatorio</h3>
            </div>
            
            @if (compensatoryType() === 'hours') {
              <!-- Si es Horas: Fecha + Rango de Horas -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm text-gray-400 mb-2 font-medium">
                    <i class="pi pi-calendar mr-2"></i>Fecha
                  </label>
                  <p-datepicker
                    [(ngModel)]="compensatoryDate"
                    appendTo="body"
                    class="w-full"
                    [minDate]="today"
                    placeholder="Selecciona la fecha"
                  />
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2 font-medium">
                    <i class="pi pi-clock mr-2"></i>Hora Inicio
                  </label>
                  <p-datepicker
                    [(ngModel)]="compensatoryTimeStart"
                    appendTo="body"
                    class="w-full"
                    timeOnly
                    hourFormat="12"
                    placeholder="Hora inicio"
                  />
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2 font-medium">
                    <i class="pi pi-clock mr-2"></i>Hora Fin
                  </label>
                  <p-datepicker
                    [(ngModel)]="compensatoryTimeEnd"
                    appendTo="body"
                    class="w-full"
                    timeOnly
                    hourFormat="12"
                    placeholder="Hora fin"
                  />
                </div>
              </div>
            } @else {
              <!-- Si es Días: Fecha Inicio + Fecha Fin -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm text-gray-400 mb-2 font-medium">
                    <i class="pi pi-calendar-plus mr-2"></i>Fecha de Inicio
                  </label>
                  <p-datepicker
                    [(ngModel)]="compensatoryStartDate"
                    appendTo="body"
                    class="w-full"
                    [minDate]="today"
                    placeholder="Selecciona fecha inicio"
                  />
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2 font-medium">
                    <i class="pi pi-calendar-minus mr-2"></i>Fecha de Fin
                  </label>
                  <p-datepicker
                    [(ngModel)]="compensatoryEndDate"
                    appendTo="body"
                    class="w-full"
                    [minDate]="compensatoryStartDate() || today"
                    placeholder="Selecciona fecha fin"
                  />
                </div>
              </div>
            }
          </div>

          <!-- Paso 3: Motivo (opcional) -->
          <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <i class="pi pi-comment text-cyan-400"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">Paso 3: Motivo (Opcional)</h3>
            </div>
            <textarea
              pInputTextarea
              [(ngModel)]="compensatoryReason"
              rows="3"
              placeholder="Describe el motivo de la solicitud..."
              class="w-full"
            ></textarea>
          </div>

          <!-- Paso 4: Fechas donde trabajó horas extra -->
          <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <i class="pi pi-clock text-cyan-400"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">Paso 4: Fechas donde trabajé horas extra</h3>
            </div>
            <p class="text-sm text-gray-400 mb-4">
              Ingresa manualmente las fechas donde trabajaste horas extra. RRHH revisará esta información 
              junto con tus marcaciones para verificar que el tiempo solicitado es correcto.
            </p>
            
            <!-- Campo para agregar fechas -->
            <div class="flex flex-col sm:flex-row gap-3 mb-4">
              <div class="flex-1">
                <label class="block text-sm text-gray-400 mb-2">Agregar fecha</label>
                <p-datepicker
                  [(ngModel)]="newOvertimeDate"
                  appendTo="body"
                  dateFormat="dd/mm/yy"
                  placeholder="Selecciona una fecha"
                  [maxDate]="today"
                  class="w-full"
                />
              </div>
              <div class="flex items-end">
                <p-button
                  label="Agregar Fecha"
                  icon="pi pi-plus"
                  severity="success"
                  [disabled]="!newOvertimeDate()"
                  (onClick)="addManualOvertimeDate()"
                  class="w-full sm:w-auto"
                />
              </div>
            </div>

            <!-- Lista de fechas agregadas -->
            @if (manualOvertimeDates().length === 0) {
              <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <i class="pi pi-info-circle text-yellow-400 text-xl"></i>
                  <div>
                    <p class="text-yellow-300 font-semibold mb-1">No hay fechas agregadas</p>
                    <p class="text-sm text-gray-300">
                      Agrega las fechas donde trabajaste horas extra usando el campo de arriba.
                    </p>
                  </div>
                </div>
              </div>
            } @else {
              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-gray-300 mb-3">
                  Fechas agregadas ({{ manualOvertimeDates().length }}):
                </h4>
                <div class="flex flex-col gap-2">
                  @for (date of manualOvertimeDates(); track $index) {
                    <div class="flex items-center justify-between p-3 rounded-lg bg-neutral-700/50 border border-neutral-600/50">
                      <div class="flex items-center gap-3">
                        <i class="pi pi-calendar text-cyan-400"></i>
                        <span class="text-white font-medium">
                          {{ date | date : 'fullDate' }}
                        </span>
                      </div>
                      <p-button
                        icon="pi pi-times"
                        severity="danger"
                        text
                        rounded
                        size="small"
                        (onClick)="removeManualOvertimeDate($index)"
                        pTooltip="Eliminar fecha"
                      />
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Información para RRHH -->
            <div class="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <div class="flex items-start gap-2">
                <i class="pi pi-info-circle text-cyan-400 mt-0.5"></i>
                <div>
                  <p class="text-sm text-gray-300">
                    <strong>Nota para RRHH:</strong> Esta información será revisada junto con las marcaciones 
                    del empleado para verificar las horas extra trabajadas y aprobar la solicitud.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Resumen y Botón de Envío -->
          <div class="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-400/30 shadow-lg">
            @if (compensatoryAmount() > 0) {
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <i class="pi pi-check-circle text-cyan-400 text-xl"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-400 m-0">Total a Solicitar</p>
                  <p class="text-xl font-bold text-cyan-300 m-0">
                    @if (compensatoryType() === 'hours') {
                      {{ compensatoryAmount().toFixed(1) }} hora(s)
                    } @else {
                      {{ compensatoryAmount() }} día(s)
                    }
                  </p>
                </div>
              </div>
            }
            <p-button
              label="Solicitar Tiempo Compensatorio"
              icon="pi pi-send"
              [loading]="submittingCompensatory()"
              [disabled]="!canSubmitCompensatory() || submittingCompensatory()"
              (click)="submitCompensatoryRequest()"
              class="ml-auto"
            />
          </div>
          
          <div class="mt-6 flex justify-end">
            <p-button
              label="Ver Mis Solicitudes"
              icon="pi pi-list"
              severity="secondary"
              [outlined]="true"
              (click)="activeSection.set('my-requests')"
            />
          </div>
        </p-card>
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
                (click)="activeSection.set('management')"
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
              (click)="activeSection.set('management')"
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
      [(visible)]="showTutorialDialog"
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
            (onClick)="showTutorialDialog.set(false)"
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
                  <span class="text-sm text-gray-400 font-medium">Detalles de la Queja</span>
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

    /* Profile Header Card Styles */
    ::ng-deep .profile-header-card .p-card-body {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%);
      border: 1px solid rgba(251, 191, 36, 0.2);
    }

    /* Profile Info Cards Hover Effect */
    .p-4.rounded-lg:hover {
      transform: translateY(-2px);
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

  constructor() {
    console.log('[EmployeePortal] Constructor - Inicializando componente');
    // Inicializar con el fragmento actual si existe
    const currentFragment = this.route.snapshot.fragment;
    console.log(
      '[EmployeePortal] Constructor - Fragmento actual:',
      currentFragment
    );
    if (currentFragment) {
      this.activeSection.set(currentFragment);
      console.log(
        '[EmployeePortal] Constructor - Sección activa establecida a:',
        currentFragment
      );
    } else {
      this.activeSection.set('dashboard');
      console.log(
        '[EmployeePortal] Constructor - Sección activa establecida a: dashboard (por defecto)'
      );
    }

    // Suscribirse a cambios de fragmento
    this.route.fragment.subscribe((fragment) => {
      console.log(
        '[EmployeePortal] Fragment changed - Nuevo fragmento:',
        fragment
      );
      if (fragment) {
        console.log(
          '[EmployeePortal] Fragment changed - Estableciendo sección activa a:',
          fragment
        );
        this.activeSection.set(fragment);
        // Hacer scroll a la sección después de un pequeño delay
        setTimeout(() => {
          const element = document.getElementById(fragment);
          if (element) {
            console.log(
              '[EmployeePortal] Fragment changed - Elemento encontrado, haciendo scroll'
            );
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            console.log(
              '[EmployeePortal] Fragment changed - Elemento NO encontrado para:',
              fragment
            );
          }
        }, 100);
      } else {
        console.log(
          '[EmployeePortal] Fragment changed - No hay fragmento, estableciendo dashboard'
        );
        this.activeSection.set('dashboard');
      }
    });

    // Efecto para rastrear cambios en activeSection
    effect(() => {
      const section = this.activeSection();
      if (section === 'timelogs') {
        // Sección timelogs activada - no se requiere logging
      }
      if (section === 'management' || section === 'gestiones') {
        console.log(
          '[Gestiones] Effect - Sección gestiones/management activada'
        );
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
    url += `&employee.company_id=eq.${companyId}`;
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
      if (
        !isNaN(lunchStartDate.getTime()) &&
        !isNaN(lunchEndDate.getTime())
      ) {
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
  public formatDateWithTimeRange(dateFrom: string | Date, dateTo: string | Date): string {
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

  // Signals para formulario de tiempo compensatorio
  public compensatoryStartDate = signal<Date | null>(null);
  public compensatoryEndDate = signal<Date | null>(null);
  public compensatoryType = signal<'hours' | 'days'>('hours');
  public compensatoryReason = signal('');
  public submittingCompensatory = signal(false);
  public showTutorialDialog = signal(false);

  // Dialog para detalles de solicitud
  public showRequestDetailsDialog = signal(false);
  public selectedRequestDetails = signal<any>(null);

  // Nuevos signals para el formulario mejorado
  public compensatoryDate = signal<Date | null>(null); // Fecha cuando tipo es "hours"
  public compensatoryTimeStart = signal<Date | null>(null); // Hora inicio cuando tipo es "hours"
  public compensatoryTimeEnd = signal<Date | null>(null); // Hora fin cuando tipo es "hours"
  public selectedOvertimeDays = signal<Set<string>>(new Set()); // Días seleccionados con horas extras
  public manualOvertimeDates = signal<Date[]>([]); // Fechas manuales de horas extra ingresadas por el empleado
  public newOvertimeDate = signal<Date | null>(null); // Fecha temporal para agregar

  // Propiedad para obtener la fecha actual (para usar en templates)
  public get today(): Date {
    return new Date();
  }

  // Métodos helper para manejar selección de días
  public toggleOvertimeDay(day: string): void {
    const current = new Set(this.selectedOvertimeDays());
    if (current.has(day)) {
      current.delete(day);
    } else {
      current.add(day);
    }
    this.selectedOvertimeDays.set(current);
  }

  public isDaySelected(day: string): boolean {
    return this.selectedOvertimeDays().has(day);
  }

  // Método para agregar una fecha manual de horas extra
  public addManualOvertimeDate() {
    const date = this.newOvertimeDate();
    if (!date) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const existingDates = this.manualOvertimeDates();

    // Verificar que no esté duplicada
    const isDuplicate = existingDates.some((d) => format(d, 'yyyy-MM-dd') === dateStr);
    if (isDuplicate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha duplicada',
        detail: 'Esta fecha ya ha sido agregada',
      });
      return;
    }

    // Agregar la fecha
    this.manualOvertimeDates.set([...existingDates, date]);
    this.newOvertimeDate.set(null);
  }

  // Método para eliminar una fecha manual
  public removeManualOvertimeDate(index: number) {
    const dates = this.manualOvertimeDates();
    dates.splice(index, 1);
    this.manualOvertimeDates.set([...dates]);
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
        title: `Queja - ${this.getComplaintCategoryLabel(req.category)}`,
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
      complaint: 'Queja',
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
    { label: 'Queja', value: 'complaint' },
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

    this.submittingCompensatory.set(true);

    const type = this.compensatoryType();
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
      notes.push('--- Fechas donde trabajó horas extra (ingresadas manualmente) ---');
      notes.push('');
      manualDates.forEach((date) => {
        notes.push(`- ${format(date, 'dd/MM/yyyy')}`);
      });
      notes.push('');
      notes.push('RRHH revisará estas fechas junto con las marcaciones del empleado para verificar las horas extra trabajadas.');
    }

    const timeoffData: any = {
      employee_id: this.currentEmployee()!.id,
      type_id: compensatoryTypeId,
      date_from: dateFrom,
      date_to: dateTo,
      notes: notes,
      is_approved: false,
    };

    try {
      const response = await firstValueFrom(
        this.http.post<any>(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`,
          timeoffData,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
      );

      // Enviar notificación a Verley (HR que revisa)
      await this.notifyHRReviewer(response[0]?.id || response?.id);

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail:
          'Tu solicitud de tiempo compensatorio ha sido enviada para revisión',
      });

      // Reset form
      this.compensatoryStartDate.set(null);
      this.compensatoryEndDate.set(null);
      this.compensatoryDate.set(null);
      this.compensatoryTimeStart.set(null);
      this.compensatoryTimeEnd.set(null);
      this.compensatoryType.set('hours');
      this.compensatoryReason.set('');
      this.manualOvertimeDates.set([]);
      this.newOvertimeDate.set(null);
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
      this.submittingCompensatory.set(false);
    }
  }

  // Función helper para notificar a Verley (HR que revisa)
  private async notifyHRReviewer(timeoffId: string): Promise<void> {
    try {
      const companyId = this.organizationService.getCurrentCompanyId();
      if (!companyId) return;

      // Buscar posiciones HR
      const hrPositions = await firstValueFrom(
        this.http.get<any[]>(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/positions`,
          {
            params: {
              select: 'id',
              name: 'ilike.%recursos humanos%',
            },
          }
        )
      );

      if (!hrPositions || hrPositions.length === 0) {
        console.warn('No se encontraron posiciones HR');
        return;
      }

      const hrPositionIds = hrPositions.map((p) => p.id);

      // Buscar empleados con esas posiciones
      const hrEmployees = await firstValueFrom(
        this.http.get<any[]>(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
          {
            params: {
              select: 'id,first_name,father_name',
              position_id: `in.(${hrPositionIds.join(',')})`,
              company_id: `eq.${companyId}`,
              is_active: 'eq.true',
            },
          }
        )
      );

      if (!hrEmployees || hrEmployees.length === 0) {
        console.warn('No se encontraron empleados HR para notificar');
        return;
      }

      // Enviar notificación a todos los HR encontrados
      const notifications = hrEmployees.map((hr) => ({
        recipient_id: hr.id,
        type: 'other',
        title: 'Nueva Solicitud de Tiempo Compensatorio',
        message: `${this.currentEmployee()?.first_name} ${
          this.currentEmployee()?.father_name
        } ha enviado una solicitud de tiempo compensatorio que requiere tu revisión.`,
        related_entity_type: 'timeoff',
        related_entity_id: timeoffId,
        priority: 'medium',
      }));

      await firstValueFrom(
        this.http.post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/notifications`,
          notifications,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
      );
    } catch (error) {
      console.error('Error enviando notificación a HR:', error);
      // No fallar la solicitud si la notificación falla
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
