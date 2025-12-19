import {
  CurrencyPipe,
  DatePipe,
  NgClass,
  NgTemplateOutlet,
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
  endOfMonth,
  format,
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
    NgClass,
    CalendarComponent,
    NgTemplateOutlet,
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
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar-clock text-amber-400"></i>
              <span>Calendario de Marcaciones</span>
            </div>
          </ng-template>
          <ng-template #subtitle
            >Visualiza tus marcaciones en formato calendario</ng-template
          >
          
          <div class="mt-2"></div>
          
          @if (monthTimelogsApi.isLoading()) {
            <div class="flex items-center justify-center py-12">
              <i class="pi pi-spin pi-spinner text-4xl text-amber-400"></i>
            </div>
          } @else {
            <!-- Calendario bonito usando pt-calendar -->
            <pt-calendar
              [markers]="timelogMarkers()"
              [markerTpl]="timelogMarkerTemplate"
              (monthChange)="onCalendarMonthChange($event)"
            />
            
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
                  @let workedHours = log?.entry && log?.exit ? calculateWorkedHours(log.entry.date, log.exit.date) : null;
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
            <div class="flex items-center gap-2">
              <i class="pi pi-clock text-cyan-400"></i>
              <span>Solicitar Tiempo Compensatorio</span>
            </div>
          </ng-template>
          <ng-template #subtitle
            >Solicita tiempo compensatorio basado en tus horas extras trabajadas</ng-template
          >
          
          <!-- Información de horas extras disponibles (solo para HR/Admin) -->
          @if (isHRorAdmin()) {
          <div class="mb-6">
            <div class="bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-400/30 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 mb-1">Horas Extras Disponibles</p>
                  <p class="text-2xl font-bold text-cyan-300">
                    {{ totalOvertimeHours().toFixed(1) }}h
                  </p>
                </div>
                <div class="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <i class="pi pi-clock text-cyan-400 text-2xl"></i>
                </div>
              </div>
              @if (totalOvertimeHours() === 0) {
                <p class="text-xs text-gray-400 mt-2">
                  No tienes horas extras acumuladas. Las horas extras se generan cuando trabajas más de 9 horas en un día.
                </p>
              }
            </div>
          </div>
          }

          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Fecha de Inicio de Compensatorio</label
                >
                <p-datepicker
                  [(ngModel)]="compensatoryStartDate"
                  appendTo="body"
                  class="w-full"
                  [minDate]="today"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Fecha de Fin de Compensatorio</label
                >
                <p-datepicker
                  [(ngModel)]="compensatoryEndDate"
                  appendTo="body"
                  class="w-full"
                  [minDate]="compensatoryStartDate() || today"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >Tipo</label
              >
              <div class="flex gap-4">
                <div class="flex items-center gap-2">
                  <input
                    type="radio"
                    id="compensatory-hours"
                    name="compensatory-type"
                    [value]="'hours'"
                    [(ngModel)]="compensatoryType"
                    class="w-4 h-4"
                  />
                  <label for="compensatory-hours" class="text-sm text-gray-300 cursor-pointer">Horas</label>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="radio"
                    id="compensatory-days"
                    name="compensatory-type"
                    [value]="'days'"
                    [(ngModel)]="compensatoryType"
                    class="w-4 h-4"
                  />
                  <label for="compensatory-days" class="text-sm text-gray-300 cursor-pointer">Días</label>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >{{ compensatoryType() === 'hours' ? 'Horas' : 'Días' }} a Solicitar</label
              >
              <input
                type="number"
                pInputText
                [(ngModel)]="compensatoryAmount"
                [max]="compensatoryType() === 'hours' ? totalOvertimeHours() : null"
                [min]="compensatoryType() === 'hours' ? 0.5 : 1"
                [step]="compensatoryType() === 'hours' ? 0.5 : 1"
                [placeholder]="compensatoryType() === 'hours' ? 'Ej: 4.0' : 'Ej: 1'"
                class="w-full"
              />
              @if (compensatoryType() === 'hours' && isHRorAdmin()) {
                <p class="text-xs text-gray-500 mt-1">
                  Máximo disponible: {{ totalOvertimeHours().toFixed(1) }}h
                </p>
              }
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2"
                >Motivo (opcional)</label
              >
              <textarea
                pInputTextarea
                [(ngModel)]="compensatoryReason"
                rows="3"
                placeholder="Describe el motivo de la solicitud..."
                class="w-full"
              ></textarea>
            </div>
            <div class="flex justify-end">
              <p-button
                label="Solicitar Tiempo Compensatorio"
                icon="pi pi-send"
                [loading]="submittingCompensatory()"
                [disabled]="!canSubmitCompensatory() || submittingCompensatory()"
                (click)="submitCompensatoryRequest()"
              />
            </div>
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
                (click)="activeSection.set('compensatory')"
              />
            </div>
          </ng-template>
          <ng-template #subtitle
            >Visualiza todas tus solicitudes de tiempo compensatorio</ng-template
          >
          
          <div class="overflow-x-auto">
            <p-table
              [value]="myCompensatoryRequests()"
              [rows]="10"
              paginator
              [loading]="compensatoryTimeoffsApi.isLoading()"
              styleClass="p-datatable-sm md:p-datatable-lg"
              [scrollable]="true"
              scrollHeight="400px"
              [responsiveLayout]="'scroll'"
            >
              <ng-template #header>
                <tr>
                  <th>Fecha de Solicitud</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                </tr>
              </ng-template>
              <ng-template #body let-request>
                <tr>
                  <td>{{ request.created_at | date : 'mediumDate' }}</td>
                  <td>{{ request.date_from | date : 'mediumDate' }}</td>
                  <td>{{ request.date_to | date : 'mediumDate' }}</td>
                  <td>
                    @if (request.compensatory_type === 'days') {
                      <span class="text-sm text-gray-300">Días</span>
                    } @else {
                      <span class="text-sm text-gray-300">Horas</span>
                    }
                  </td>
                  <td>
                    @if (request.compensatory_type === 'days') {
                      {{ request.compensatory_amount || calculateDays(request.date_from, request.date_to) }} días
                    } @else {
                      {{ request.hours || request.compensatory_amount || 0 }}h
                    }
                  </td>
                  <td>
                    @if (request.reason) {
                      <span class="text-sm text-gray-400">{{ request.reason }}</span>
                    } @else {
                      <span class="text-sm text-gray-500">-</span>
                    }
                  </td>
                  <td>
                    <span
                      class="px-2 py-1 rounded text-xs font-semibold"
                      [class.bg-yellow-500]="request.review_status === 'pending' || (request.is_approved === false && !request.rejection_comment)"
                      [class.bg-green-500]="request.is_approved === true"
                      [class.bg-red-500]="request.rejection_comment || request.review_status === 'rejected'"
                    >
                      {{
                        request.is_approved === true
                          ? 'Aprobado'
                          : request.rejection_comment || request.review_status === 'rejected'
                          ? 'Rechazado'
                          : request.review_status === 'approved'
                          ? 'En Registro'
                          : 'Pendiente'
                      }}
                    </span>
                    @if (request.rejection_comment) {
                      <p class="text-xs text-red-400 mt-1">{{ request.rejection_comment }}</p>
                    }
                  </td>
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr>
                  <td colspan="7" class="text-center py-8">
                    <div class="flex flex-col items-center gap-2">
                      <i class="pi pi-inbox text-4xl text-gray-500"></i>
                      <p class="text-gray-400">No tienes solicitudes de tiempo compensatorio</p>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
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
      console.log('[EmployeePortal] Effect - activeSection cambió a:', section);
      if (section === 'timelogs') {
        console.log('[Timelogs] Effect - Sección timelogs activada');
        console.log(
          '[Timelogs] Effect - calendarMonth():',
          this.calendarMonth()
        );
        console.log(
          '[Timelogs] Effect - monthTimelogsApi.isLoading():',
          this.monthTimelogsApi.isLoading()
        );
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
    console.log(
      '[Timelogs] monthTimelogsApi - Iniciando carga de timelogs del mes'
    );
    if (!this.currentEmployee()?.id) {
      console.log(
        '[Timelogs] monthTimelogsApi - No hay employee ID, retornando undefined'
      );
      return undefined;
    }
    const employeeId = this.currentEmployee()!.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      console.log(
        '[Timelogs] monthTimelogsApi - No hay company ID, retornando undefined'
      );
      return undefined;
    }

    const month = this.calendarMonth();
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    console.log(
      '[Timelogs] monthTimelogsApi - Mes seleccionado:',
      month,
      'Desde:',
      monthStart,
      'Hasta:',
      monthEnd
    );

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

    console.log('[Timelogs] monthTimelogsApi - URL construida:', url);

    return {
      url,
      method: 'GET',
    };
  });

  // Procesar timelogs del mes actual
  public monthTimelogs = computed(() => {
    const logs = this.monthTimelogsApi.value() ?? [];
    console.log(
      '[Timelogs] monthTimelogs - Logs crudos recibidos:',
      logs.length,
      logs
    );

    const processedLogs = logs
      .filter((x) => x.created_at)
      .map((x) => {
        try {
          const date = new Date(x.created_at);
          if (isNaN(date.getTime())) {
            return null;
          }
          return { ...x, day: format(date, 'yyyy-MM-dd') };
        } catch {
          return null;
        }
      })
      .filter((x) => x !== null)
      .reduce<any[]>((acc, x) => {
        if (!x) return acc;

        const existing = acc.find((item) => item.day === x.day);
        const logDate = new Date(x.created_at);
        const logBranch = x.branch || null;

        if (!existing) {
          acc.push({
            day: x.day,
            entry:
              x.type === TimeLogEnum.entry
                ? { date: logDate, branch: logBranch }
                : undefined,
            lunch_start:
              x.type === TimeLogEnum.lunch_start
                ? { date: logDate, branch: logBranch }
                : undefined,
            lunch_end:
              x.type === TimeLogEnum.lunch_end
                ? { date: logDate, branch: logBranch }
                : undefined,
            exit:
              x.type === TimeLogEnum.exit
                ? { date: logDate, branch: logBranch }
                : undefined,
            schedule: null,
            delay: undefined,
          });
        } else {
          if (x.type === TimeLogEnum.entry)
            existing.entry = { date: logDate, branch: logBranch };
          if (x.type === TimeLogEnum.lunch_start)
            existing.lunch_start = {
              date: logDate,
              branch: logBranch,
            };
          if (x.type === TimeLogEnum.lunch_end)
            existing.lunch_end = {
              date: logDate,
              branch: logBranch,
            };
          if (x.type === TimeLogEnum.exit)
            existing.exit = { date: logDate, branch: logBranch };
        }
        return acc;
      }, []);

    const sorted = processedLogs.sort(
      (a, b) => new Date(b.day).getTime() - new Date(a.day).getTime()
    );
    console.log(
      '[Timelogs] monthTimelogs - Logs procesados:',
      sorted.length,
      sorted
    );
    return sorted;
  });

  // Convertir timelogs a markers para el calendario bonito
  public timelogMarkers = computed<CalendarMarkerData[]>(() => {
    const logs = this.monthTimelogs();
    console.log(
      '[Timelogs] timelogMarkers - Logs recibidos:',
      logs.length,
      logs
    );

    const filtered = logs.filter((log) => log.entry || log.exit);
    console.log(
      '[Timelogs] timelogMarkers - Logs con entrada o salida:',
      filtered.length,
      filtered
    );

    const markers = filtered.map((log) => ({
      date: new Date(log.day),
      data: log,
    }));
    console.log(
      '[Timelogs] timelogMarkers - Markers generados:',
      markers.length,
      markers
    );
    return markers;
  });

  // Handler para cambio de mes en el calendario
  public onCalendarMonthChange(date: Date): void {
    console.log(
      '[Timelogs] onCalendarMonthChange - Cambio de mes en calendario:',
      date
    );
    console.log(
      '[Timelogs] onCalendarMonthChange - Mes anterior:',
      this.calendarMonth()
    );
    this.calendarMonth.set(date);
    console.log(
      '[Timelogs] onCalendarMonthChange - Mes actualizado:',
      this.calendarMonth()
    );
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
  public calculateWorkedHours(entry: Date, exit: Date): string {
    console.log(
      '[Timelogs] calculateWorkedHours - Entrada:',
      entry,
      'Salida:',
      exit
    );

    if (!entry || !exit) {
      console.log(
        '[Timelogs] calculateWorkedHours - Faltan fechas, retornando "-"'
      );
      return '-';
    }

    const entryDate = new Date(entry);
    const exitDate = new Date(exit);

    if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) {
      console.log(
        '[Timelogs] calculateWorkedHours - Fechas inválidas, retornando "-"'
      );
      return '-';
    }

    const minutes = differenceInMinutes(exitDate, entryDate);
    console.log(
      '[Timelogs] calculateWorkedHours - Diferencia en minutos:',
      minutes
    );

    if (minutes < 0) {
      console.log(
        '[Timelogs] calculateWorkedHours - Diferencia negativa, retornando "0h 0m"'
      );
      return '0h 0m';
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const result = `${hours}h ${mins}m`;
    console.log('[Timelogs] calculateWorkedHours - Resultado:', result);
    return result;
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
      const lunchExceededMinutes = lunchTime > 60 ? lunchTime - 60 : 0;

      // Sumar horas extras por tiempo total + minutos excedidos de almuerzo
      const dayOvertimeMinutes = overtimeByTotalTime + lunchExceededMinutes;
      totalOvertimeMinutes += dayOvertimeMinutes;
    });

    // Convertir minutos a horas
    return totalOvertimeMinutes / 60;
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

  // Timeoffs API para compensatorios
  public timeoffsApi = httpResource<any[]>(() => {
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
  }, {
    // CRÍTICO: defaultValue evita que el resource lance error si falla la primera carga
    // Si el resource entra en estado de error, cualquier recomputación del signal vuelve a lanzar el error (loop infinito)
    // Por eso protegemos los reload() para que no se ejecuten si status === 'error'
    defaultValue: [],
  });

  // Signals para formulario de tiempo compensatorio
  public compensatoryStartDate = signal<Date | null>(null);
  public compensatoryEndDate = signal<Date | null>(null);
  public compensatoryType = signal<'hours' | 'days'>('hours');
  public compensatoryAmount = signal<number>(0);
  public compensatoryReason = signal('');
  public submittingCompensatory = signal(false);

  // Propiedad para obtener la fecha actual (para usar en templates)
  public get today(): Date {
    return new Date();
  }

  // API para obtener todas las solicitudes de tiempo compensatorio (no solo aprobadas)
  public compensatoryTimeoffsApi = httpResource<any[]>(() => {
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
  }, {
    // CRÍTICO: defaultValue evita que el resource lance error si falla la primera carga
    defaultValue: [],
  });

  // Computed: Todas las solicitudes de tiempo compensatorio
  public myCompensatoryRequests = computed(() => {
    // CRÍTICO: Si el resource está en estado de error, retornar array vacío en lugar de intentar acceder a value()
    // Esto evita que el computed lance el error y entre en loop infinito
    if (this.compensatoryTimeoffsApi.status() === 'error') {
      return [];
    }
    return this.compensatoryTimeoffsApi.value() ?? [];
  });

  // Validar si se puede enviar la solicitud
  public canSubmitCompensatory = computed(() => {
    const startDate = this.compensatoryStartDate();
    const endDate = this.compensatoryEndDate();
    const amount = this.compensatoryAmount();
    const type = this.compensatoryType();
    const availableHours = this.totalOvertimeHours();

    if (!startDate || !endDate || amount <= 0 || endDate < startDate) {
      return false;
    }

    // Si es por horas, verificar que no exceda las disponibles
    if (type === 'hours' && amount > availableHours) {
      return false;
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
    const amount = this.compensatoryAmount();
    const availableHours = this.totalOvertimeHours();

    // Si es por horas, verificar que no exceda las disponibles
    if (type === 'hours' && amount > availableHours) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Horas Insuficientes',
        detail: `Solo tienes ${availableHours.toFixed(1)}h disponibles`,
      });
      return;
    }

    this.submittingCompensatory.set(true);

    // ID del tipo de timeoff "Compensatorio"
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';

    // Calcular horas si es por días (asumiendo 8 horas por día)
    const hours = type === 'days' ? amount * 8 : amount;

    // Construir el array de notas con la información del tiempo compensatorio
    const notes: string[] = [];
    const reason = this.compensatoryReason();
    if (reason) {
      notes.push(reason);
    }
    // Agregar información sobre tipo y cantidad
    notes.push(
      `Tipo: ${type === 'days' ? 'Días' : 'Horas'}, Cantidad: ${amount}`
    );
    if (type === 'days') {
      notes.push(`Horas equivalentes: ${hours}`);
    }

    const timeoffData: any = {
      employee_id: this.currentEmployee()!.id,
      type_id: compensatoryTypeId,
      date_from: format(this.compensatoryStartDate()!, 'yyyy-MM-dd'),
      date_to: format(this.compensatoryEndDate()!, 'yyyy-MM-dd'),
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
      this.compensatoryType.set('hours');
      this.compensatoryAmount.set(0);
      this.compensatoryReason.set('');
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
