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
import { Tooltip } from 'primeng/tooltip';

import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Skeleton } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { Employee } from '../models';
import { AgePipe } from '../pipes/age.pipe';
import { SeniorityPipe } from '../pipes/seniority.pipe';
import { DeviceService } from '../services/device.service';
import { OrganizationService } from '../services/organization.service';
import { QrService } from '../services/qr.service';
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
    RouterLink,
    Tooltip,
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
    <div class="employee-detail-page w-full">
    @if (device.isDesktop()) {
    <!-- Vista Desktop: reestructurada para lectura rápida y uso fácil -->
    <div class="desktop-detail max-w-5xl mx-auto px-4 md:px-6">
      <!-- Barra superior: navegación + identidad + acciones -->
      <div class="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-neutral-700/50 mb-4">
        <a routerLink=".." class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition-colors no-underline shrink-0">
          <i class="pi pi-arrow-left"></i>
          Volver a empleados
        </a>
        @if (currentEmployee(); as emp) {
          <div class="flex items-center gap-4 min-w-0 flex-1 justify-center md:justify-start">
            <div class="min-w-0">
              <h1 class="text-xl md:text-2xl font-bold text-white m-0 truncate">
                {{ emp.first_name }} {{ emp.father_name }}
              </h1>
              <p class="text-sm text-gray-400 m-0 mt-0.5 truncate">
                {{ emp.position?.name }} · {{ emp.branch?.name }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <p-button label="Editar" icon="pi pi-pencil" severity="secondary" [outlined]="true" (onClick)="goToEdit()" />
            <p-menu #menu [model]="items" [popup]="true" appendTo="body" />
            <p-button icon="pi pi-ellipsis-v" rounded severity="secondary" [outlined]="true" (onClick)="menu.toggle($event)" [pTooltip]="'Más acciones'" />
          </div>
        } @else if (employee.isLoading()) {
          <div class="flex-1 flex items-center gap-3">
            <p-skeleton shape="circle" size="3rem" />
            <div class="space-y-1">
              <p-skeleton width="12rem" height="1.5rem" />
              <p-skeleton width="8rem" height="0.875rem" />
            </div>
          </div>
        }
      </div>

      <p-tabs value="0" scrollable>
        <p-tablist class="desktop-detail-tabs">
          <p-tab value="0">Información</p-tab>
          <p-tab value="1">Horarios</p-tab>
          <p-tab value="2">Marcación</p-tab>
          <p-tab value="3">Tiempos fuera</p-tab>
          <p-tab value="4">Portal</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0">
            @if(employee.isLoading()) {
              <div class="flex flex-col gap-3 py-6">
                <p-skeleton height="2.5rem" />
                <p-skeleton height="14rem" />
                <p-skeleton height="10rem" />
              </div>
            } @else if(currentEmployee()) {
              <!-- Una sola card con secciones en grid: fácil de escanear -->
              <div class="bg-neutral-800/40 rounded-xl border border-neutral-700/50 overflow-hidden">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 p-6">
                  <!-- Columna 1: Básica + Contacto -->
                  <div class="space-y-5">
                    <section>
                      <h3 class="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <i class="pi pi-id-card"></i> Datos personales
                      </h3>
                      <dl class="detail-grid">
                        <dt>Nombre completo</dt><dd>{{ currentEmployee()?.first_name }} {{ currentEmployee()?.middle_name }} {{ currentEmployee()?.father_name }} {{ currentEmployee()?.mother_name }}</dd>
                        <dt>Cédula</dt><dd>{{ currentEmployee()?.document_id || '-' }}</dd>
                        <dt>Nacimiento</dt><dd>{{ currentEmployee()?.birth_date | date:'mediumDate' }} ({{ currentEmployee()?.birth_date | age }})</dd>
                        <dt>Sexo</dt><dd>{{ currentEmployee()?.gender === 'M' ? 'Masculino' : 'Femenino' }}</dd>
                        <dt>Talla uniforme</dt><dd>{{ currentEmployee()?.uniform_size || '-' }}</dd>
                      </dl>
                    </section>
                    <section>
                      <h3 class="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <i class="pi pi-phone"></i> Contacto
                      </h3>
                      <dl class="detail-grid">
                        <dt>Email personal</dt><dd class="break-all">{{ currentEmployee()?.email || '-' }}</dd>
                        <dt>Email laboral</dt><dd class="break-all">{{ currentEmployee()?.work_email || '-' }}</dd>
                        <dt>Teléfono</dt><dd>{{ currentEmployee()?.phone_number || '-' }}</dd>
                        <dt>Dirección</dt><dd>{{ currentEmployee()?.address || '-' }}</dd>
                      </dl>
                    </section>
                  </div>
                  <!-- Columna 2: Bancaria + Laboral -->
                  <div class="space-y-5">
                    <section>
                      <h3 class="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <i class="pi pi-university"></i> Bancario
                      </h3>
                      <dl class="detail-grid">
                        <dt>Banco</dt><dd>{{ getBankName() }}</dd>
                        <dt>Tipo de cuenta</dt><dd>{{ currentEmployee()?.bank_account_type || '-' }}</dd>
                        <dt>Nº cuenta</dt><dd class="font-mono">{{ currentEmployee()?.account_number || '-' }}</dd>
                      </dl>
                    </section>
                    <section>
                      <h3 class="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <i class="pi pi-briefcase"></i> Laboral
                      </h3>
                      <dl class="detail-grid">
                        <dt>Empresa</dt><dd>{{ getCompanyName() }}</dd>
                        <dt>Área</dt><dd>{{ currentEmployee()?.department?.name || '-' }}</dd>
                        <dt>Sucursal</dt><dd>{{ currentEmployee()?.branch?.name || '-' }}</dd>
                        <dt>Cargo</dt><dd>{{ currentEmployee()?.position?.name || '-' }}</dd>
                        <dt>Salario mensual</dt><dd class="text-green-400 font-semibold">{{ currentEmployee()?.monthly_salary | currency:'$' }}</dd>
                        <dt>Salario/hora</dt><dd class="text-green-400 font-semibold">{{ currentEmployee()?.hourly_salary | currency:'$' }}</dd>
                        <dt>Fecha ingreso</dt><dd>{{ currentEmployee()?.start_date | date:'mediumDate' }} @if(currentEmployee()?.start_date) { ({{ currentEmployee()!.start_date | seniority }}) }</dd>
                        <dt>Estado</dt>
                        <dd>
                          <span [ngClass]="currentEmployee()?.is_active ? 'text-green-400' : 'text-red-400'" class="font-semibold">
                            <i [class]="currentEmployee()?.is_active ? 'pi pi-check-circle' : 'pi pi-times-circle'" class="mr-1"></i>
                            {{ currentEmployee()?.is_active ? 'Activo' : 'Inactivo' }}
                          </span>
                        </dd>
                        <dt>Exceso almuerzo</dt>
                        <dd>
                          @if(currentEmployee(); as e) {
                            @if (e.total_lunch_exceeded_minutes != null && e.total_lunch_exceeded_minutes > 0) {
                              <p-tag severity="warn" [value]="formatLunchExceeded(e.total_lunch_exceeded_minutes)" />
                            } @else {
                              <span class="text-gray-500">0</span>
                            }
                          } @else {
                            <span class="text-gray-500">-</span>
                          }
                        </dd>
                      </dl>
                    </section>
                  </div>
                </div>
              </div>
            } @else {
              <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
                <i class="pi pi-exclamation-triangle text-5xl text-amber-400 mb-3"></i>
                <h3 class="text-xl font-bold text-white mb-1">Empleado no encontrado</h3>
                <p class="text-gray-400 text-sm m-0">No se pudo cargar la información.</p>
              </div>
            }
          </p-tabpanel>
          <p-tabpanel value="1">
            @if(employee_id()) {
            <pt-employee-schedules [employeeId]="employee_id()!" />
            }
          </p-tabpanel>
          <p-tabpanel value="2">
            <div class="flex flex-col items-center gap-4 py-4">
              @if(currentEmployee()?.qr_code) {
                <img [src]="currentEmployee()?.qr_code" alt="QR Code" class="max-w-xs rounded-lg shadow-lg" />
              } @else {
                <div class="flex flex-col items-center gap-2 p-8 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                  <i class="pi pi-qrcode text-4xl text-gray-500"></i>
                  <p class="text-gray-400 m-0">No hay código QR generado</p>
                </div>
              }
              <p-button
                [label]="currentEmployee()?.qr_code ? 'Regenerar QR' : 'Generar QR'"
                [icon]="currentEmployee()?.qr_code ? 'pi pi-refresh' : 'pi pi-plus'"
                [severity]="currentEmployee()?.qr_code ? 'warn' : 'success'"
                [loading]="regeneratingQr()"
                [disabled]="regeneratingQr() || !currentEmployee()"
                (onClick)="confirmRegenerateQr()"
              />
              <p class="text-xs text-gray-500 m-0 text-center max-w-xs">
                @if(currentEmployee()?.qr_code) {
                  Al regenerar el QR, el código anterior quedará inválido.
                } @else {
                  Genera un código QR para que el empleado pueda marcar asistencia.
                }
              </p>
            </div>
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
                    Se otorgará acceso al portal de empleados
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
    } @else {
    <!-- Vista Móvil: header fijo + secciones -->
    <div class="mobile-employee-detail flex flex-col min-h-[60vh]">
      <header class="sticky top-0 z-20 bg-neutral-800/95 border-b border-neutral-700/50 px-3 py-3 shadow-sm">
        <div class="flex items-center gap-2">
          <a [routerLink]="['..']" class="flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-700/50 text-gray-300 hover:bg-neutral-600/50 active:bg-neutral-600">
            <i class="pi pi-arrow-left"></i>
          </a>
          <div class="min-w-0 flex-1">
            @if (currentEmployee(); as emp) {
              <h1 class="text-base font-bold text-white truncate m-0">{{ emp.first_name }} {{ emp.father_name }}</h1>
              <p class="text-xs text-gray-400 truncate m-0">{{ emp.position?.name }} · {{ emp.branch?.name }}</p>
            } @else if (employee.isLoading()) {
              <p-skeleton width="8rem" height="1.25rem" class="mb-1" />
              <p-skeleton width="6rem" height="0.875rem" />
            } @else {
              <span class="text-gray-400 text-sm">Perfil</span>
            }
          </div>
          @if (currentEmployee()) {
            <p-menu #menu [model]="items" [popup]="true" appendTo="body" />
            <p-button icon="pi pi-ellipsis-v" [rounded]="true" severity="secondary" [text]="true" (onClick)="menu.toggle($event)" class="min-w-[44px] min-h-[44px]" />
          }
        </div>
      </header>

      <main class="flex-1 overflow-y-auto">
        @if (employee.isLoading()) {
          <div class="p-4 space-y-3">
            <p-skeleton height="4rem" />
            <p-skeleton height="6rem" />
            <p-skeleton height="6rem" />
          </div>
        } @else if (!currentEmployee()) {
          <div class="p-6 text-center text-gray-400">
            <i class="pi pi-user-minus text-4xl block mb-2"></i>
            <p class="m-0">Empleado no encontrado</p>
          </div>
        } @else {
          <p-tabs value="0" scrollable>
            <p-tablist class="!flex !overflow-x-auto !gap-0 !border-0 !bg-neutral-800/50 !px-2">
              <p-tab value="0" styleClass="!min-w-0 !px-3 !py-2.5 !text-xs">Info</p-tab>
              <p-tab value="1" styleClass="!min-w-0 !px-3 !py-2.5 !text-xs">Horarios</p-tab>
              <p-tab value="2" styleClass="!min-w-0 !px-3 !py-2.5 !text-xs">QR</p-tab>
              <p-tab value="3" styleClass="!min-w-0 !px-3 !py-2.5 !text-xs">Tiempos</p-tab>
              <p-tab value="4" styleClass="!min-w-0 !px-3 !py-2.5 !text-xs">Portal</p-tab>
            </p-tablist>
            <p-tabpanels>
              <p-tabpanel value="0">
                <div class="px-3 py-3 space-y-4 pb-8">
                  <section class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 overflow-hidden">
                    <div class="px-3 py-2 bg-neutral-700/30 border-b border-neutral-700/50 flex items-center gap-2">
                      <i class="pi pi-id-card text-amber-400 text-sm"></i>
                      <span class="text-xs font-semibold text-white uppercase tracking-wide">Datos básicos</span>
                    </div>
                    <div class="divide-y divide-neutral-700/50">
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Nombre completo</span><span class="text-sm text-white text-right">{{ currentEmployee()?.first_name }} {{ currentEmployee()?.middle_name }} {{ currentEmployee()?.father_name }} {{ currentEmployee()?.mother_name }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Cédula</span><span class="text-sm text-white">{{ currentEmployee()?.document_id || '-' }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Nacimiento</span><span class="text-sm text-white">{{ currentEmployee()?.birth_date | date:'shortDate' }} ({{ currentEmployee()?.birth_date | age }})</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Sexo</span><span class="text-sm text-white">{{ currentEmployee()?.gender === 'M' ? 'Masculino' : 'Femenino' }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Talla</span><span class="text-sm text-white">{{ currentEmployee()?.uniform_size || '-' }}</span></div>
                    </div>
                  </section>
                  <section class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 overflow-hidden">
                    <div class="px-3 py-2 bg-neutral-700/30 border-b border-neutral-700/50 flex items-center gap-2">
                      <i class="pi pi-phone text-amber-400 text-sm"></i>
                      <span class="text-xs font-semibold text-white uppercase tracking-wide">Contacto</span>
                    </div>
                    <div class="divide-y divide-neutral-700/50">
                      <div class="px-3 py-2.5 flex justify-between items-start gap-2"><span class="text-xs text-gray-400 flex-shrink-0">Email personal</span><span class="text-sm text-white text-right break-all">{{ currentEmployee()?.email || '-' }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-start gap-2"><span class="text-xs text-gray-400 flex-shrink-0">Email laboral</span><span class="text-sm text-white text-right break-all">{{ currentEmployee()?.work_email || '-' }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Teléfono</span><span class="text-sm text-white">{{ currentEmployee()?.phone_number || '-' }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-start gap-2"><span class="text-xs text-gray-400 flex-shrink-0">Dirección</span><span class="text-sm text-white text-right">{{ currentEmployee()?.address || '-' }}</span></div>
                    </div>
                  </section>
                  <section class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 overflow-hidden">
                    <div class="px-3 py-2 bg-neutral-700/30 border-b border-neutral-700/50 flex items-center gap-2">
                      <i class="pi pi-university text-amber-400 text-sm"></i>
                      <span class="text-xs font-semibold text-white uppercase tracking-wide">Bancario</span>
                    </div>
                    <div class="divide-y divide-neutral-700/50">
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Banco</span><span class="text-sm text-white">{{ getBankName() }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Tipo cuenta</span><span class="text-sm text-white">{{ currentEmployee()?.bank_account_type || '-' }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Nº cuenta</span><span class="text-sm text-white font-mono">{{ currentEmployee()?.account_number || '-' }}</span></div>
                    </div>
                  </section>
                  <section class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 overflow-hidden">
                    <div class="px-3 py-2 bg-neutral-700/30 border-b border-neutral-700/50 flex items-center gap-2">
                      <i class="pi pi-briefcase text-amber-400 text-sm"></i>
                      <span class="text-xs font-semibold text-white uppercase tracking-wide">Laboral</span>
                    </div>
                    <div class="divide-y divide-neutral-700/50">
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Empresa</span><span class="text-sm text-white">{{ getCompanyName() }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Área</span><span class="text-sm text-white">{{ currentEmployee()?.department?.name || '-' }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Sucursal</span><span class="text-sm text-white">{{ currentEmployee()?.branch?.name || '-' }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Cargo</span><span class="text-sm text-white">{{ currentEmployee()?.position?.name || '-' }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Salario mensual</span><span class="text-sm text-green-400 font-semibold">{{ currentEmployee()?.monthly_salary | currency:'$' }}</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Ingreso</span><span class="text-sm text-white">{{ currentEmployee()?.start_date | date:'shortDate' }} @if(currentEmployee()?.start_date) { ({{ currentEmployee()!.start_date | seniority }}) }</span></div>
                      <div class="px-3 py-2.5 flex justify-between items-center"><span class="text-xs text-gray-400">Estado</span>
                        <span [ngClass]="currentEmployee()?.is_active ? 'text-green-400' : 'text-red-400'" class="text-sm font-semibold">
                          <i [class]="currentEmployee()?.is_active ? 'pi pi-check-circle' : 'pi pi-times-circle'" class="mr-1"></i>
                          {{ currentEmployee()?.is_active ? 'Activo' : 'Inactivo' }}
                        </span>
                      </div>
                    </div>
                  </section>
                </div>
              </p-tabpanel>
              <p-tabpanel value="1">
                @if (employee_id()) {
                  <div class="px-3 py-3 pb-8"><pt-employee-schedules [employeeId]="employee_id()!" /></div>
                }
              </p-tabpanel>
              <p-tabpanel value="2">
                <div class="px-3 py-4 flex flex-col items-center gap-3 pb-8">
                  @if (currentEmployee()?.qr_code) {
                    <img [src]="currentEmployee()?.qr_code" alt="QR" class="w-48 h-48 rounded-lg shadow-lg" />
                  } @else {
                    <div class="w-48 h-48 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center">
                      <i class="pi pi-qrcode text-4xl text-gray-500"></i>
                    </div>
                  }
                  <p-button [label]="currentEmployee()?.qr_code ? 'Regenerar QR' : 'Generar QR'" [icon]="currentEmployee()?.qr_code ? 'pi pi-refresh' : 'pi pi-plus'" [severity]="currentEmployee()?.qr_code ? 'warn' : 'success'" [loading]="regeneratingQr()" [disabled]="regeneratingQr() || !currentEmployee()" (onClick)="confirmRegenerateQr()" size="small" />
                </div>
              </p-tabpanel>
              <p-tabpanel value="3">
                <div class="px-3 py-3 space-y-2 pb-8">
                  @if (currentEmployee()?.timeoffs?.length) {
                    @for (timeoff of currentEmployee()?.timeoffs; track $index) {
                      <div class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 p-3">
                        <p class="font-medium text-white text-sm m-0">{{ timeoff.type?.name }}</p>
                        <p class="text-xs text-gray-400 m-0 mt-0.5">{{ timeoff.date_from }} - {{ timeoff.date_to }}</p>
                      </div>
                    }
                  } @else {
                    <p class="text-sm text-gray-400 text-center py-6 m-0">Sin tiempos fuera registrados</p>
                  }
                </div>
              </p-tabpanel>
              <p-tabpanel value="4">
                @if (currentEmployee()) {
                  <div class="px-3 py-3 space-y-4 pb-8">
                    <div class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 p-3 flex items-center justify-between gap-2">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center" [ngClass]="currentEmployee()?.has_portal_access ? 'bg-green-500/20' : 'bg-gray-500/20'">
                          <i class="pi text-xl" [ngClass]="currentEmployee()?.has_portal_access ? 'pi-check-circle text-green-400' : 'pi-times-circle text-gray-400'"></i>
                        </div>
                        <div>
                          <p class="font-semibold text-white text-sm m-0">{{ currentEmployee()?.has_portal_access ? 'Portal activo' : 'Sin acceso' }}</p>
                          <p class="text-xs text-gray-400 m-0">{{ currentEmployee()?.work_email || '-' }}</p>
                        </div>
                      </div>
                      <p-tag [value]="currentEmployee()?.has_portal_access ? 'Activo' : 'Sin acceso'" [severity]="currentEmployee()?.has_portal_access ? 'success' : 'secondary'" styleClass="text-[10px]" />
                    </div>
                    @if (!currentEmployee()?.has_portal_access) {
                      <p-button label="Invitar al portal" icon="pi pi-user-plus" severity="info" [disabled]="!canInvite() || inviting()" [loading]="inviting()" (onClick)="inviteToPortal()" class="w-full" size="small" />
                      @if (!canInvite()) {
                        <p class="text-xs text-amber-400 m-0">Email laboral y teléfono requeridos para invitar.</p>
                      }
                    }
                  </div>
                }
              </p-tabpanel>
            </p-tabpanels>
          </p-tabs>
        }
      </main>
    </div>
    }
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

    .employee-detail-page a.no-underline { text-decoration: none; }

    /* Vista desktop: grid de datos legible */
    .desktop-detail .detail-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.375rem 1.5rem;
      align-items: baseline;
      font-size: 0.875rem;
    }
    .desktop-detail .detail-grid dt {
      color: #9ca3af;
      font-weight: 500;
      min-width: 0;
    }
    .desktop-detail .detail-grid dd {
      color: #e5e7eb;
      margin: 0;
      min-width: 0;
    }
    .desktop-detail-tabs ::ng-deep .p-tablist {
      background: transparent !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.5) !important;
    }
    .desktop-detail-tabs ::ng-deep .p-tab {
      padding: 0.5rem 1rem !important;
      font-size: 0.875rem !important;
    }
    .mobile-employee-detail ::ng-deep .p-tabs .p-tablist {
      flex-wrap: nowrap !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
      padding: 0.5rem 0.75rem !important;
      gap: 0 !important;
      background: rgba(39, 39, 42, 0.5) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.5) !important;
    }
    .mobile-employee-detail ::ng-deep .p-tabs .p-tab {
      padding: 0.5rem 0.75rem !important;
      font-size: 0.75rem !important;
      white-space: nowrap !important;
      flex-shrink: 0 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDetailComponent implements OnInit {
  protected readonly state = inject(EmployeesStore);
  protected readonly banksStore = inject(BanksStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected device = inject(DeviceService);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);
  private qrService = inject(QrService);

  public employee_id = signal<string | null>(null);
  public inviting = signal(false);
  public regeneratingQr = signal(false);
  public portalUrl = `${process.env['ENV_APP_URL'] || window.location.origin
    }/my-portal`;
  public employee = httpResource<Employee[]>(() => {
    const id = this.employee_id();
    if (!id) {
      return undefined;
    }
    const companyId = this.organizationService.getCurrentCompanyId();

    // Usar tablas compartidas con relaciones
    const selectQuery = `id, department:departments(id, name), branch:branches(id, name), position:positions(id, name), company:companies(id, name), first_name,father_name, middle_name, mother_name,document_id, email, phone_number, address, birth_date, start_date, branch_id, department_id, position_id, gender, uniform_size, is_active, work_email, monthly_salary, hourly_salary, qr_code, code_uri, bank, account_number, bank_account_type, company_id, has_portal_access, total_lunch_exceeded_minutes`;

    const params: any = {
      select: selectQuery,
      limit: '1',
      order: 'father_name',
      id: `eq.${id}`,
    };

    // Agregar filtro por company_id
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
      method: 'GET',
      params,
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

  goToEdit(): void {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  editEmployee() {
    this.ref = this.dialog.open(EmployeeFormComponent, {
      header: 'Datos de empleado',
      width: '90vw',
      modal: true,
      dismissableMask: true, // Cerrar al hacer clic fuera
      closeOnEscape: true,   // Cerrar con tecla Escape
      data: { employee: this.currentEmployee() },
    });
  }

  terminateEmployee() {
    this.ref = this.dialog.open(TerminationFormComponent, {
      data: { employee: this.currentEmployee() },
      width: '90vw',
      header: 'Terminacion de empleado',
      modal: true,
      dismissableMask: true, // Cerrar al hacer clic fuera
      closeOnEscape: true,   // Cerrar con tecla Escape
    });
  }

  timeOff() {
    this.ref = this.dialog.open(TimeOffsComponent, {
      data: {
        employee: this.currentEmployee(),
      },
      width: '60vw',
      header: 'Tiempo fuera de empleado',
      modal: true,
      dismissableMask: true, // Cerrar al hacer clic fuera
      closeOnEscape: true,   // Cerrar con tecla Escape
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
      message: `¿Deseas invitar a ${employee.first_name} ${employee.father_name} al portal de empleados? Se otorgará acceso al portal de empleados.`,
      header: 'Invitar al Portal',
      icon: 'pi pi-user-plus',
      acceptLabel: 'Sí, invitar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.inviting.set(true);
        try {
          // Actualizar el empleado para darle acceso al portal
          const companyId = this.organizationService.getCurrentCompanyId();
          const params: any = { id: `eq.${employee.id}` };

          // Agregar filtro por company_id para seguridad
          if (companyId) {
            params.company_id = `eq.${companyId}`;
          }

          await firstValueFrom(
            this.http.patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
              { has_portal_access: true },
              {
                params,
                headers: {
                  'Content-Type': 'application/json',
                  Prefer: 'return=representation',
                },
              }
            )
          );

          const employeeName = `${employee.first_name} ${employee.father_name}`;
          this.messageService.add({
            severity: 'success',
            summary: 'Acceso otorgado',
            detail: `${employeeName} ahora tiene acceso al portal de empleados`,
          });
          // Recargar datos del empleado
          this.employee.reload();
          this.state.fetchItems();
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

  public formatLunchExceeded(minutes: number): string {
    if (minutes === 0) {
      return '0';
    }
    if (minutes < 60) {
      return `${minutes} minutos`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} horas ${mins} minutos` : `${hours} horas`;
  }

  confirmRegenerateQr(): void {
    const employee = this.currentEmployee();
    if (!employee) {
      return;
    }

    const hasExistingQr = !!employee.qr_code;
    const message = hasExistingQr
      ? '¿Estás seguro de regenerar el código QR? El código anterior quedará inválido y el empleado deberá usar el nuevo código para marcar asistencia.'
      : '¿Generar un nuevo código QR para este empleado?';

    this.confirmationService.confirm({
      message,
      header: hasExistingQr ? 'Regenerar QR' : 'Generar QR',
      icon: hasExistingQr ? 'pi pi-exclamation-triangle' : 'pi pi-qrcode',
      acceptLabel: hasExistingQr ? 'Regenerar' : 'Generar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.regeneratingQr.set(true);
        this.qrService.generateQrCode(employee).subscribe({
          next: () => {
            this.regeneratingQr.set(false);
            this.employee.reload();
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: hasExistingQr
                ? 'Código QR regenerado correctamente'
                : 'Código QR generado correctamente',
            });
          },
          error: (err) => {
            this.regeneratingQr.set(false);
            console.error('Error generando QR:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo generar el código QR',
            });
          },
        });
      },
    });
  }
}
