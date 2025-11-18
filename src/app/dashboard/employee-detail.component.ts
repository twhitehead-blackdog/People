import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MenuModule } from 'primeng/menu';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { HttpClient, httpResource } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Skeleton } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { Employee } from '../models';
import { AgePipe } from '../pipes/age.pipe';
import { SeniorityPipe } from '../pipes/seniority.pipe';
import { WassengerService } from '../services/wassenger.service';
import { BanksStore } from '../stores/banks.store';
import { EmployeesStore } from '../stores/employees.store';
import { EmployeeFormComponent } from './employee-form.component';
import { EmployeeSchedulesComponent } from './employee-schedules.component';
import { TerminationFormComponent } from './termination-form.component';
import { TimeOffsComponent } from './time-offs.component';

@Component({
  selector: 'pt-employee-detail',
  imports: [
    Card,
    DatePipe,
    CurrencyPipe,
    NgClass,
    MenuModule,
    Button,
    AgePipe,
    SeniorityPipe,
    TabsModule,
    EmployeeSchedulesComponent,
    Skeleton,
    Tag,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [
    DynamicDialogRef,
    DialogService,
    MessageService,
    ConfirmationService,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    <!-- Employee Detail Component -->
    <div class="mx-4 md:mx-6 flex flex-col gap-2">
      <p-tabs value="0" scrollable>
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-user mr-2"></i>
            Información Personal
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-clock mr-2"></i>
            Horarios
          </p-tab>
          <p-tab value="2">
            <i class="pi pi-qrcode mr-2"></i>
            Marcación
          </p-tab>
          <p-tab value="3">
            <i class="pi pi-calendar mr-2"></i>
            Tiempos fuera
          </p-tab>
          <p-tab value="4">
            <i class="pi pi-user-plus mr-2"></i>
            Portal de Empleado
          </p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0">
            @if(employee.isLoading()) {
            <div class="flex flex-col gap-4">
              <p-skeleton shape="rectangle" height="3rem" />
              <p-skeleton shape="rectangle" height="10rem" />
              <p-skeleton shape="rectangle" height="10rem" />
              <p-skeleton shape="rectangle" height="10rem" />
            </div>
            } @else if(currentEmployee()) {
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
                    <p-menu
                      #menu
                      [model]="items"
                      [popup]="true"
                      appendTo="body"
                    />
                    <p-button
                      label="Acciones"
                      icon="pi pi-ellipsis-v"
                      rounded
                      severity="secondary"
                      outlined
                      (onClick)="menu.toggle($event)"
                    />
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
                      Nombre Completo
                    </dt>
                    <dd class="text-sm text-gray-200 font-medium">
                      {{ currentEmployee()?.first_name }}
                      {{ currentEmployee()?.middle_name }}
                      {{ currentEmployee()?.father_name }}
                      {{ currentEmployee()?.mother_name }}
                    </dd>
                  </div>
                  <div
                    class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <dt
                      class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                    >
                      Cédula de Identidad
                    </dt>
                    <dd class="text-sm text-gray-200 font-medium">
                      {{ currentEmployee()?.document_id || '-' }}
                    </dd>
                  </div>
                  <div
                    class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <dt
                      class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                    >
                      Fecha de Nacimiento
                    </dt>
                    <dd class="text-sm text-gray-200 font-medium">
                      {{ currentEmployee()?.birth_date | date : 'mediumDate' }}
                      <span class="text-gray-500 ml-1"
                        >({{ currentEmployee()?.birth_date | age }})</span
                      >
                    </dd>
                  </div>
                  <div
                    class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <dt
                      class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                    >
                      Sexo
                    </dt>
                    <dd class="text-sm text-gray-200 font-medium">
                      {{
                        currentEmployee()?.gender === 'M'
                          ? 'Masculino'
                          : 'Femenino'
                      }}
                    </dd>
                  </div>
                  <div
                    class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <dt
                      class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                    >
                      Talla de Uniforme
                    </dt>
                    <dd class="text-sm text-gray-200 font-medium">
                      {{ currentEmployee()?.uniform_size || '-' }}
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
                      {{ currentEmployee()?.email || '-' }}
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
                      {{ currentEmployee()?.work_email || '-' }}
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
                      {{ currentEmployee()?.phone_number || '-' }}
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
                      {{ currentEmployee()?.address || '-' }}
                    </dd>
                  </div>
                </div>
              </p-card>

              <!-- Información Bancaria Card -->
              <p-card class="shadow-lg border border-neutral-700/50">
                <ng-template #title>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-university text-lg text-amber-400"></i>
                    <h4 class="text-base font-bold text-white m-0">
                      Información Bancaria
                    </h4>
                  </div>
                </ng-template>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <dt
                      class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                    >
                      Banco
                    </dt>
                    <dd class="text-sm text-gray-200 font-medium">
                      {{ getBankName() }}
                    </dd>
                  </div>
                  <div
                    class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <dt
                      class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                    >
                      Tipo de Cuenta
                    </dt>
                    <dd class="text-sm text-gray-200 font-medium">
                      {{ currentEmployee()?.bank_account_type || '-' }}
                    </dd>
                  </div>
                  <div
                    class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <dt
                      class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                    >
                      Número de Cuenta
                    </dt>
                    <dd class="text-sm text-gray-200 font-medium">
                      {{ currentEmployee()?.account_number || '-' }}
                    </dd>
                  </div>
                </div>
              </p-card>

              <!-- Datos Laborales Card -->
              <p-card class="shadow-lg border border-neutral-700/50">
                <ng-template #title>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-briefcase text-lg text-amber-400"></i>
                    <h4 class="text-base font-bold text-white m-0">
                      Datos Laborales
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
                      Empresa
                    </dt>
                    <dd class="text-sm text-gray-200 font-medium">
                      {{ getCompanyName() }}
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
                      Cargo
                    </dt>
                    <dd class="text-sm text-gray-200 font-medium">
                      {{ currentEmployee()?.position?.name || '-' }}
                    </dd>
                  </div>
                  <div
                    class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <dt
                      class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                    >
                      Salario Mensual
                    </dt>
                    <dd
                      class="text-sm text-gray-200 font-semibold text-green-400"
                    >
                      {{ currentEmployee()?.monthly_salary | currency : '$' }}
                    </dd>
                  </div>
                  <div
                    class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <dt
                      class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                    >
                      Salario por Hora
                    </dt>
                    <dd
                      class="text-sm text-gray-200 font-semibold text-green-400"
                    >
                      {{ currentEmployee()?.hourly_salary | currency : '$' }}
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
                      <span class="text-gray-500 ml-1"
                        >({{
                          currentEmployee()?.start_date! | seniority
                        }})</span
                      >
                    </dd>
                  </div>
                  <div
                    class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <dt
                      class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
                    >
                      Estado
                    </dt>
                    <dd class="text-sm">
                      <span
                        [class]="
                          currentEmployee()?.is_active
                            ? 'text-green-400 font-semibold'
                            : 'text-red-400 font-semibold'
                        "
                      >
                        <i
                          [class]="
                            currentEmployee()?.is_active
                              ? 'pi pi-check-circle'
                              : 'pi pi-times-circle'
                          "
                          class="mr-1"
                        ></i>
                        {{
                          currentEmployee()?.is_active ? 'Activo' : 'Inactivo'
                        }}
                      </span>
                    </dd>
                  </div>
                </div>
              </p-card>
            </div>
            } @else {
            <div class="flex flex-col items-center justify-center py-16 px-4">
              <div class="text-center">
                <i
                  class="pi pi-exclamation-triangle text-6xl text-amber-400 mb-4"
                ></i>
                <h3 class="text-2xl font-bold text-white mb-2">
                  Empleado no encontrado
                </h3>
                <p class="text-gray-400 text-lg">
                  No se pudo cargar la información del empleado.
                </p>
              </div>
            </div>
            }
          </p-tabpanel>
          <p-tabpanel value="1">
            @if(employee_id()) {
            <pt-employee-schedules [employeeId]="employee_id()!" />
            }
          </p-tabpanel>
          <p-tabpanel value="2">
            <img src="{{ currentEmployee()?.qr_code }}" alt="QR Code" />
          </p-tabpanel>
          <p-tabpanel value="3">
            @for(timeoff of currentEmployee()?.timeoffs; track $index) {
            <p-card [header]="timeoff.type?.name">
              {{ timeoff.date_from }}
              {{ timeoff.date_to }}
            </p-card>

            }</p-tabpanel
          >
          <p-tabpanel value="4">
            @if(currentEmployee()) {
            <div class="space-y-4">
              <!-- Estado del Portal -->
              <p-card class="shadow-lg border border-neutral-700/50">
                <ng-template #title>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-user-plus text-lg text-amber-400"></i>
                    <h4 class="text-base font-bold text-white m-0">
                      Estado del Portal de Empleado
                    </h4>
                  </div>
                </ng-template>
                <div class="flex flex-col gap-4">
                  <div
                    class="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="w-12 h-12 rounded-full flex items-center justify-center"
                        [ngClass]="
                          currentEmployee()?.has_portal_access
                            ? 'bg-green-500/20'
                            : 'bg-gray-500/20'
                        "
                      >
                        <i
                          class="pi text-2xl"
                          [ngClass]="
                            currentEmployee()?.has_portal_access
                              ? 'pi-check-circle text-green-400'
                              : 'pi-times-circle text-gray-400'
                          "
                        ></i>
                      </div>
                      <div>
                        <h5 class="text-white font-semibold m-0">
                          @if(currentEmployee()?.has_portal_access) { Acceso al
                          Portal Activo } @else { Sin Acceso al Portal }
                        </h5>
                        <p class="text-sm text-gray-400 m-0 mt-1">
                          @if(currentEmployee()?.has_portal_access) { El
                          empleado puede acceder al portal de empleados } @else
                          { El empleado aún no tiene acceso al portal }
                        </p>
                      </div>
                    </div>
                    <p-tag
                      [value]="
                        currentEmployee()?.has_portal_access
                          ? 'Portal Activo'
                          : 'Sin Acceso'
                      "
                      [severity]="
                        currentEmployee()?.has_portal_access
                          ? 'success'
                          : 'secondary'
                      "
                      [icon]="
                        currentEmployee()?.has_portal_access
                          ? 'pi pi-check-circle'
                          : 'pi pi-times-circle'
                      "
                    />
                  </div>

                  <!-- Información de Acceso -->
                  @if(currentEmployee()?.has_portal_access) {
                  <div
                    class="p-4 rounded-lg bg-green-500/10 border border-green-500/30"
                  >
                    <div class="flex items-start gap-3">
                      <i class="pi pi-info-circle text-green-400 mt-1"></i>
                      <div class="flex-1">
                        <h6 class="text-green-300 font-semibold mb-2">
                          Información de Acceso
                        </h6>
                        <div class="space-y-2 text-sm text-gray-300">
                          <div>
                            <span class="font-semibold text-gray-400"
                              >Email de acceso:</span
                            >
                            <span class="ml-2">{{
                              currentEmployee()?.work_email || 'No configurado'
                            }}</span>
                          </div>
                          <div>
                            <span class="font-semibold text-gray-400"
                              >URL del portal:</span
                            >
                            <span class="ml-2 text-blue-400">{{
                              portalUrl
                            }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  } @else {
                  <!-- Requisitos para Invitar -->
                  <div
                    class="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
                  >
                    <div class="flex items-start gap-3">
                      <i
                        class="pi pi-exclamation-triangle text-amber-400 mt-1"
                      ></i>
                      <div class="flex-1">
                        <h6 class="text-amber-300 font-semibold mb-2">
                          Requisitos para Invitar
                        </h6>
                        <ul
                          class="space-y-1 text-sm text-gray-300 list-disc list-inside"
                        >
                          <li>
                            El empleado debe tener un email laboral configurado
                          </li>
                          <li>
                            El empleado debe tener un número de teléfono
                            registrado
                          </li>
                          <li>
                            Wassenger debe estar configurado en Configuración
                          </li>
                        </ul>
                        @if(!canInvite()) {
                        <div
                          class="mt-3 p-2 rounded bg-red-500/10 border border-red-500/30"
                        >
                          <p class="text-xs text-red-300 m-0">
                            <i class="pi pi-times-circle mr-1"></i>
                            @if(!currentEmployee()?.work_email) { Falta email
                            laboral } @else if(!currentEmployee()?.phone_number)
                            { Falta número de teléfono }
                          </p>
                        </div>
                        }
                      </div>
                    </div>
                  </div>
                  }
                </div>
              </p-card>

              <!-- Acciones -->
              <p-card class="shadow-lg border border-neutral-700/50">
                <ng-template #title>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-cog text-lg text-amber-400"></i>
                    <h4 class="text-base font-bold text-white m-0">Acciones</h4>
                  </div>
                </ng-template>
                <div class="flex flex-col gap-3">
                  @if(!currentEmployee()?.has_portal_access) {
                  <p-button
                    label="Invitar al Portal de Empleados"
                    icon="pi pi-user-plus"
                    severity="info"
                    [disabled]="!canInvite() || inviting()"
                    [loading]="inviting()"
                    (onClick)="inviteToPortal()"
                    class="w-full md:w-auto"
                  />
                  <p class="text-xs text-gray-400 m-0">
                    Se enviará un mensaje por Wassenger con las instrucciones de
                    acceso al portal
                  </p>
                  } @else {
                  <div
                    class="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30"
                  >
                    <div class="flex items-center gap-3">
                      <i class="pi pi-check-circle text-blue-400 text-xl"></i>
                      <div class="flex-1">
                        <p class="text-sm text-gray-300 m-0">
                          El empleado ya tiene acceso al portal. Puede acceder
                          usando su email laboral:
                          <span class="font-semibold text-white">{{
                            currentEmployee()?.work_email
                          }}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  }
                </div>
              </p-card>
            </div>
            }
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>
  `,
  styles: `
    p {
      margin-bottom: 0 !important;
    }

    ::ng-deep .p-tabs .p-tablist {
      background: #18181b !important;
      border-bottom: 1px solid rgba(251, 191, 36, 0.2) !important;
    }
    
    ::ng-deep .p-tabs .p-tab {
      color: #9ca3af !important;
      padding: 0.75rem 1rem !important;
    }
    
    ::ng-deep .p-tabs .p-tab:hover {
      color: #fbbf24 !important;
    }
    
    ::ng-deep .p-tabs .p-tab.p-highlight {
      color: #fbbf24 !important;
      border-bottom: 2px solid #fbbf24 !important;
    }
    
    ::ng-deep .p-tabpanel {
      padding: 1.5rem 0 !important;
    }
    
    ::ng-deep .p-card {
      background: #18181b !important;
      border: 1px solid rgba(251, 191, 36, 0.2) !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
      border-radius: 0.5rem !important;
      overflow: hidden !important;
    }
    
    ::ng-deep .p-card .p-card-header {
      background: #18181b !important;
      border-bottom: 1px solid rgba(251, 191, 36, 0.2) !important;
      padding: 0.75rem 1rem !important;
      border-radius: 0.5rem 0.5rem 0 0 !important;
    }
    
    ::ng-deep .p-card .p-card-body {
      padding: 1rem !important;
      background: #18181b !important;
    }
    
    ::ng-deep .p-card .p-card-title {
      margin: 0 !important;
      padding: 0 !important;
    }
    
    ::ng-deep .p-menu {
      background: #262626 !important;
      border: 1px solid rgba(251, 191, 36, 0.3) !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
      border-radius: 0.5rem !important;
    }
    
    ::ng-deep .p-menu .p-menuitem-link {
      color: #e5e7eb !important;
      padding: 0.75rem 1rem !important;
    }
    
    ::ng-deep .p-menu .p-menuitem-link:hover {
      background: rgba(251, 191, 36, 0.1) !important;
      color: #fbbf24 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDetailComponent implements OnInit {
  protected readonly state = inject(EmployeesStore);
  protected readonly banksStore = inject(BanksStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private wassengerService = inject(WassengerService);

  public employee_id = signal<string | null>(null);
  public inviting = signal(false);
  public portalUrl = `${
    process.env['ENV_APP_URL'] || window.location.origin
  }/my-portal`;
  public employee = httpResource<Employee[]>(() => {
    const id = this.employee_id();
    if (!id) {
      return undefined;
    }
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
      method: 'GET',
      params: {
        select:
          'id, department:departments(id, name), branch:branches(id, name), position:positions(id, name), company:companies(id, name), first_name,father_name, middle_name, mother_name,document_id, email, phone_number, address, birth_date, start_date, branch_id, department_id, position_id, company_id, gender, uniform_size, is_active, work_email, monthly_salary, hourly_salary, qr_code, code_uri, bank, account_number, bank_account_type, has_portal_access',
        limit: '1',
        order: 'father_name',
        id: `eq.${id}`,
      },
    };
  });
  public currentEmployee = computed(() => this.employee.value()?.[0]);

  protected readonly items: MenuItem[] = [
    {
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: () => {
        this.router.navigate(['edit'], { relativeTo: this.route });
      },
    },
    {
      label: 'Tiempo fuera',
      icon: 'pi pi-calendar',
      command: () => {
        this.timeOff();
      },
    },
    {
      label: 'Salida',
      icon: 'pi pi-undo',
      command: () => {
        this.terminateEmployee();
      },
    },
    {
      label: 'Eliminar',
      icon: 'pi pi-trash',
      command: () => {
        this.deleteEmployee();
      },
    },
  ];
  private dialog = inject(DialogService);
  private ref = inject(DynamicDialogRef);

  ngOnInit(): void {
    const employeeId = this.route.snapshot.paramMap.get('employee_id');
    if (employeeId) {
      this.employee_id.set(employeeId);
      this.state.selectEntity(employeeId);
    }
  }

  editEmployee() {
    this.ref = this.dialog.open(EmployeeFormComponent, {
      header: 'Datos de empleado',
      width: '90vw',
      data: { employee: this.currentEmployee() },
    });
  }

  terminateEmployee() {
    this.ref = this.dialog.open(TerminationFormComponent, {
      data: { employee: this.currentEmployee() },
      width: '90vw',
      header: 'Terminacion de empleado',
    });
  }

  timeOff() {
    this.ref = this.dialog.open(TimeOffsComponent, {
      data: {
        employee: this.currentEmployee(),
      },
      width: '60vw',
      header: 'Tiempo fuera de empleado',
    });
  }

  deleteEmployee() {
    const id = this.employee_id();
    if (id) {
      this.state.deleteItem(id);
    }
  }

  getCompanyName(): string {
    const employee = this.currentEmployee() as any;
    return employee?.company?.name ?? '-';
  }

  getBankName(): string {
    const bankId = this.currentEmployee()?.bank;
    if (!bankId) {
      return '-';
    }
    const bank = this.banksStore.entities().find((b) => b.id === bankId);
    return bank?.name ?? bankId;
  }

  public canInvite(): boolean {
    const employee = this.currentEmployee();
    return !!(employee?.work_email && employee?.phone_number);
  }

  public async inviteToPortal(): Promise<void> {
    const employee = this.currentEmployee();
    if (!employee) return;

    if (!this.canInvite()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail:
          'El empleado debe tener email laboral y teléfono para ser invitado al portal',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Deseas invitar a ${employee.first_name} ${employee.father_name} al portal de empleados? Se enviará un mensaje por Wassenger con las instrucciones de acceso.`,
      header: 'Invitar al Portal',
      icon: 'pi pi-user-plus',
      acceptLabel: 'Sí, invitar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.inviting.set(true);
        try {
          // Actualizar el empleado para darle acceso al portal
          await this.http
            .patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees?id=eq.${employee.id}`,
              { has_portal_access: true },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Prefer: 'return=representation',
                },
              }
            )
            .toPromise();

          // Enviar invitación por Wassenger
          const employeeName = `${employee.first_name} ${employee.father_name}`;
          const success = await this.wassengerService.sendPortalInvitation(
            employeeName,
            employee.phone_number!,
            employee.work_email!,
            this.portalUrl
          );

          if (success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Invitación enviada',
              detail: `${employeeName} ahora tiene acceso al portal y se le ha enviado un mensaje por Wassenger`,
            });
            // Recargar datos del empleado
            this.employee.reload();
            this.state.fetchItems();
          } else {
            // Aunque falló el envío, el acceso al portal ya fue otorgado
            this.messageService.add({
              severity: 'warn',
              summary: 'Acceso otorgado',
              detail: `${employeeName} ahora tiene acceso al portal, pero no se pudo enviar el mensaje por Wassenger`,
            });
            this.employee.reload();
            this.state.fetchItems();
          }
        } catch (error: any) {
          console.error('Error inviting to portal:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo invitar al empleado al portal',
          });
        } finally {
          this.inviting.set(false);
        }
      },
    });
  }
}
