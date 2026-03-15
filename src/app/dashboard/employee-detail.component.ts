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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MenuModule } from 'primeng/menu';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';

import { HttpClient, httpResource } from '@angular/common/http';
import { format, startOfMonth } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import { getEnv } from '../utils/env.utils';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Skeleton } from 'primeng/skeleton';
import { format as fnsFormat, parseISO } from 'date-fns';
import { Employee, Termination } from '../models';
import { AgePipe } from '../pipes/age.pipe';
import { SeniorityPipe } from '../pipes/seniority.pipe';
import { ApiUrlService } from '../services/api-url.service';

import { OrganizationService } from '../services/organization.service';
import { QrService } from '../services/qr.service';
import { BanksStore } from '../stores/banks.store';
import { EmployeesStore } from '../stores/employees.store';
import { EmployeeCreditScoreComponent } from './employee-credit-score.component';
import { EmployeeFormComponent } from './employee-form.component';
import { EmployeeSchedulesComponent } from './employee-schedules.component';
import { TerminationFormComponent } from './termination-form.component';
import { TimeOffsComponent } from './time-offs.component';

@Component({
  selector: 'pt-employee-detail',
  imports: [
    DatePipe,
    CurrencyPipe,
    NgClass,
    MenuModule,
    Button,
    AgePipe,
    SeniorityPipe,
    EmployeeCreditScoreComponent,
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
    <div class="ed">
    <!-- ========== HEADER ========== -->
    <header class="ed-header">
      <div class="ed-header__row1">
        <a routerLink=".." class="ed-back"><i class="pi pi-arrow-left"></i><span class="ed-back__text">Empleados</span></a>
        @if (currentEmployee(); as emp) {
          <div class="ed-actions">
            @if (emp.phone_number) { <a [href]="'tel:' + emp.phone_number" class="ed-action ed-action--green" pTooltip="Llamar"><i class="pi pi-phone"></i></a> }
            @if (emp.work_email) { <a [href]="'mailto:' + emp.work_email" class="ed-action ed-action--blue" pTooltip="Email"><i class="pi pi-envelope"></i></a> }
            <button type="button" class="ed-action ed-action--amber" (click)="goToEdit()" pTooltip="Editar"><i class="pi pi-pencil"></i></button>
            <p-menu #actionMenu [model]="items()" [popup]="true" appendTo="body" />
            <button class="ed-action" (click)="actionMenu.toggle($event)" pTooltip="Más"><i class="pi pi-ellipsis-v"></i></button>
          </div>
        }
      </div>
      @if (currentEmployee(); as emp) {
        <div class="ed-identity">
          <div class="ed-avatar">{{ emp.first_name?.charAt(0) }}{{ emp.father_name?.charAt(0) }}</div>
          <div class="ed-identity__info">
            <h1 class="ed-name">{{ emp.first_name }} {{ emp.father_name }}</h1>
            <p class="ed-subtitle">{{ emp.position?.name || 'Sin cargo' }} · {{ emp.branch?.name || '' }}</p>
          </div>
          <span class="ed-badge" [ngClass]="emp.is_active ? 'ed-badge--active' : 'ed-badge--inactive'">{{ emp.is_active ? 'Activo' : 'Inactivo' }}</span>
        </div>
      } @else if (employee.isLoading()) {
        <div class="flex items-center gap-3 flex-1 py-2"><p-skeleton shape="circle" size="2.5rem" /><div><p-skeleton width="10rem" height="1.25rem" /><p-skeleton width="7rem" height="0.75rem" styleClass="mt-1" /></div></div>
      }
    </header>

    <!-- ========== TABS CUSTOM (sin PrimeNG) ========== -->
    <nav class="ed-tabs" role="tablist">
      @for (tab of tabs; track tab.id; let i = $index) {
        <button class="ed-tab" [class.ed-tab--active]="activeTab() === i" (click)="activeTab.set(i)" role="tab">
          <i [class]="tab.icon" class="ed-tab__icon"></i>
          <span>{{ tab.label }}</span>
        </button>
      }
    </nav>

    <!-- ========== PANELS ========== -->
    <div class="ed-panel">
      @if (employee.isLoading()) {
        <div class="space-y-3 p-6"><p-skeleton height="3rem" /><p-skeleton height="12rem" /><p-skeleton height="8rem" /></div>
      } @else if (!currentEmployee()) {
        <div class="ed-empty"><i class="pi pi-user-minus"></i><p>Empleado no encontrado</p></div>
      } @else {
        @switch (activeTab()) {
          <!-- INFO -->
          @case (0) {
            <div class="ed-info">
              <!-- Quick stats -->
              <div class="ed-stats">
                <div class="ed-stat"><span class="ed-stat__value ed-stat__value--green">{{ currentEmployee()!.monthly_salary | currency:'$':'symbol':'1.0-0' }}</span><span class="ed-stat__label">Salario</span></div>
                <div class="ed-stat"><span class="ed-stat__value ed-stat__value--amber">@if(currentEmployee()!.start_date) { {{ currentEmployee()!.start_date | seniority }} } @else { - }</span><span class="ed-stat__label">Antigüedad</span></div>
                <div class="ed-stat"><span class="ed-stat__value ed-stat__value--blue">{{ currentEmployee()!.department?.name || '-' }}</span><span class="ed-stat__label">Área</span></div>
              </div>
              <div class="ed-grid">
                <!-- Col 1 -->
                <section class="ed-section">
                  <h3 class="ed-section__title"><i class="pi pi-id-card"></i> Datos personales</h3>
                  <dl class="ed-dl">
                    <dt>Nombre completo</dt><dd>{{ currentEmployee()!.first_name }} {{ currentEmployee()!.middle_name }} {{ currentEmployee()!.father_name }} {{ currentEmployee()!.mother_name }}</dd>
                    <dt>Cédula</dt><dd>{{ currentEmployee()!.document_id || '-' }}</dd>
                    <dt>Nacimiento</dt><dd>{{ currentEmployee()!.birth_date | date:'mediumDate' }} ({{ currentEmployee()!.birth_date | age }})</dd>
                    <dt>Sexo</dt><dd>{{ currentEmployee()!.gender === 'M' ? 'Masculino' : 'Femenino' }}</dd>
                    <dt>Talla</dt><dd>{{ currentEmployee()!.uniform_size || '-' }}</dd>
                  </dl>
                </section>
                <section class="ed-section">
                  <h3 class="ed-section__title"><i class="pi pi-phone"></i> Contacto</h3>
                  <dl class="ed-dl">
                    <dt>Email laboral</dt><dd class="break-all">{{ currentEmployee()!.work_email || '-' }}</dd>
                    <dt>Email personal</dt><dd class="break-all">{{ currentEmployee()!.email || '-' }}</dd>
                    <dt>Teléfono</dt><dd>{{ currentEmployee()!.phone_number || '-' }}</dd>
                    <dt>Dirección</dt><dd>{{ currentEmployee()!.address || '-' }}</dd>
                  </dl>
                </section>
                <section class="ed-section">
                  <h3 class="ed-section__title"><i class="pi pi-briefcase"></i> Laboral</h3>
                  <dl class="ed-dl">
                    <dt>Empresa</dt><dd>{{ getCompanyName() }}</dd>
                    <dt>Cargo</dt><dd>{{ currentEmployee()!.position?.name || '-' }}</dd>
                    <dt>Sucursal</dt><dd>{{ currentEmployee()!.branch?.name || '-' }}</dd>
                    <dt>Salario mensual</dt><dd class="text-green-400 font-semibold">{{ currentEmployee()!.monthly_salary | currency:'$' }}</dd>
                    <dt>Salario/hora</dt><dd class="text-green-400 font-semibold">{{ currentEmployee()!.hourly_salary | currency:'$' }}</dd>
                    <dt>Fecha ingreso</dt><dd>{{ currentEmployee()!.start_date | date:'mediumDate' }} @if(currentEmployee()!.start_date) { ({{ currentEmployee()!.start_date | seniority }}) }</dd>
                    @if (currentEmployee(); as e) { @if (e.total_lunch_exceeded_minutes != null && e.total_lunch_exceeded_minutes > 0) { <dt>Exceso almuerzo</dt><dd class="text-amber-400">{{ formatLunchExceeded(e.total_lunch_exceeded_minutes) }}</dd> } }
                  </dl>
                </section>
                <section class="ed-section">
                  <h3 class="ed-section__title"><i class="pi pi-credit-card"></i> Bancario</h3>
                  <dl class="ed-dl">
                    <dt>Banco</dt><dd>{{ getBankName() }}</dd>
                    <dt>Tipo cuenta</dt><dd>{{ currentEmployee()!.bank_account_type || '-' }}</dd>
                    <dt>Nº cuenta</dt><dd class="font-mono">{{ currentEmployee()!.account_number || '-' }}</dd>
                  </dl>
                </section>
              </div>
            </div>
          }
          <!-- ASISTENCIA -->
          @case (1) {
            <div class="p-4 md:p-6 space-y-4">
              @if (monthlyLates.isLoading()) {
                <div class="space-y-2"><p-skeleton height="3rem" /><p-skeleton height="3rem" /><p-skeleton height="3rem" /></div>
              } @else {
                <!-- Resumen del mes -->
                <div class="ed-stats" style="grid-template-columns: repeat(4, 1fr);">
                  <div class="ed-stat">
                    <span class="ed-stat__value" [ngClass]="(monthlyLates.value()?.length || 0) > 3 ? 'text-red-400' : (monthlyLates.value()?.length || 0) > 0 ? 'text-amber-400' : 'text-green-400'">{{ monthlyLates.value()?.length || 0 }}</span>
                    <span class="ed-stat__label">Tardanzas</span>
                  </div>
                  <div class="ed-stat">
                    <span class="ed-stat__value text-orange-400">{{ totalLateMinutes() }}</span>
                    <span class="ed-stat__label">Min. tarde</span>
                  </div>
                  <div class="ed-stat">
                    <span class="ed-stat__value" [ngClass]="(currentEmployee()?.total_lunch_exceeded_minutes || 0) > 0 ? 'text-amber-400' : 'text-green-400'">{{ currentEmployee()?.total_lunch_exceeded_minutes || 0 }}</span>
                    <span class="ed-stat__label">Min. almuerzo</span>
                  </div>
                  <div class="ed-stat">
                    <span class="ed-stat__value text-blue-400">{{ avgLateMinutes() }}</span>
                    <span class="ed-stat__label">Prom. min</span>
                  </div>
                </div>

                <!-- Lista de tardanzas -->
                @if (monthlyLates.value()?.length) {
                  <h4 class="text-xs font-semibold text-amber-400 uppercase tracking-wider m-0 flex items-center gap-2">
                    <i class="pi pi-clock"></i> Tardanzas del mes en curso
                  </h4>
                  <div class="space-y-1.5">
                    @for (late of monthlyLates.value(); track late.id) {
                      <div class="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/40">
                        <div class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <i class="pi pi-clock text-amber-400 text-xs"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-[13px] text-white m-0 font-medium">{{ late.timelog_date | date:'EEEE d MMM' }}</p>
                          <p class="text-[11px] text-gray-500 m-0">Entrada: {{ late.actual_entry_time }} (prog: {{ late.scheduled_entry_time }})</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                          <span class="text-sm font-bold" [ngClass]="late.minutes_late > 15 ? 'text-red-400' : 'text-amber-400'">{{ late.minutes_late }} min</span>
                          <p class="text-[10px] m-0" [ngClass]="late.status === 'active' ? 'text-red-400' : 'text-green-400'">{{ late.status === 'active' ? 'Activa' : late.status }}</p>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="ed-empty"><i class="pi pi-check-circle" style="color: #4ade80;"></i><p>Sin tardanzas este mes</p></div>
                }
              }
            </div>
          }
          <!-- HORARIOS -->
          @case (2) { @if(employee_id()) { <div class="p-4 md:p-6"><pt-employee-schedules [employeeId]="employee_id()!" /></div> } }
          <!-- QR -->
          @case (3) {
            <div class="ed-qr">
              @if(currentEmployee()?.qr_code) { <div class="ed-qr__frame"><img [src]="currentEmployee()?.qr_code" alt="QR" /></div> }
              @else { <div class="ed-qr__empty"><i class="pi pi-qrcode"></i><span>Sin código QR</span></div> }
              <p-button [label]="currentEmployee()?.qr_code ? 'Regenerar QR' : 'Generar QR'" [icon]="currentEmployee()?.qr_code ? 'pi pi-refresh' : 'pi pi-plus'" [severity]="currentEmployee()?.qr_code ? 'warn' : 'success'" [loading]="regeneratingQr()" [disabled]="regeneratingQr() || !currentEmployee()" (onClick)="confirmRegenerateQr()" />
            </div>
          }
          <!-- PORTAL -->
          @case (4) {
            <div class="p-4 md:p-6 space-y-4">
              <div class="ed-portal-status">
                <div class="ed-portal-icon" [ngClass]="currentEmployee()!.has_portal_access ? 'ed-portal-icon--active' : ''">
                  <i class="pi" [ngClass]="currentEmployee()!.has_portal_access ? 'pi-shield' : 'pi-lock'"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-white text-sm m-0">{{ currentEmployee()!.has_portal_access ? 'Portal Activo' : 'Sin Acceso' }}</p>
                  <p class="text-xs text-gray-400 m-0 mt-0.5 truncate">{{ currentEmployee()!.work_email || 'Email no configurado' }}</p>
                </div>
                <span class="ed-badge" [ngClass]="currentEmployee()!.has_portal_access ? 'ed-badge--active' : 'ed-badge--inactive'">{{ currentEmployee()!.has_portal_access ? 'Activo' : 'Inactivo' }}</span>
              </div>
              @if (!currentEmployee()!.has_portal_access) {
                <p-button label="Invitar al Portal" icon="pi pi-user-plus" severity="info" [disabled]="!canInvite() || inviting()" [loading]="inviting()" (onClick)="inviteToPortal()" />
                @if (!canInvite()) { <p class="text-xs text-amber-400 m-0">Email laboral y teléfono requeridos.</p> }
              }
            </div>
          }
          <!-- HISTORIAL -->
          @case (5) {
            <div class="p-4 md:p-6">
              @if (terminationHistory.isLoading()) { <p-skeleton height="4rem" /> }
              @else if (terminationHistory.value()?.length) {
                <div class="overflow-x-auto rounded-xl border border-neutral-700/50">
                  <table class="w-full text-sm">
                    <thead><tr class="bg-neutral-800/60"><th class="py-2.5 px-3 text-left text-xs text-gray-400 font-medium">Fecha</th><th class="py-2.5 px-3 text-left text-xs text-gray-400 font-medium">Motivo</th><th class="py-2.5 px-3 text-left text-xs text-gray-400 font-medium">Reintegro</th><th class="py-2.5 px-3 text-left text-xs text-gray-400 font-medium">Notas</th></tr></thead>
                    <tbody>@for (t of terminationHistory.value(); track t.id) {
                      <tr class="border-t border-neutral-800"><td class="py-2 px-3 text-gray-300">{{ formatTermDate(t.date) }}</td><td class="py-2 px-3"><span class="px-2 py-0.5 rounded text-xs font-medium" [ngClass]="t.reason === 'DESPIDO' ? 'bg-red-500/15 text-red-400' : t.reason === 'RENUNCIA' ? 'bg-orange-500/15 text-orange-400' : 'bg-neutral-700 text-gray-300'">{{ t.reason === 'FIN_CONTRATO' ? 'Fin Contrato' : t.reason === 'DESPIDO' ? 'Despido' : 'Renuncia' }}</span></td><td class="py-2 px-3 text-gray-300">{{ t.reintegration_date ? formatTermDate(t.reintegration_date) : '-' }}</td><td class="py-2 px-3 text-gray-400 max-w-[200px] truncate">{{ t.notes || '-' }}</td></tr>
                    }</tbody>
                  </table>
                </div>
              } @else { <div class="ed-empty"><i class="pi pi-history"></i><p>Sin registros de salida o reintegro</p></div> }
            </div>
          }
          <!-- SCORE -->
          @case (6) { @if(employee_id()) { <div class="p-4 md:p-6"><pt-employee-credit-score [employeeId]="employee_id()!" /></div> } }
        }
      }
    </div>
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; }
    p { margin-bottom: 0 !important; }

    /* ===== MENU POPUP ===== */
    ::ng-deep .p-menu { background: #1a1a1a !important; border: 1px solid rgba(255,255,255,0.08) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.6) !important; border-radius: 0.75rem !important; overflow: hidden !important; min-width: 180px !important; }
    ::ng-deep .p-menu .p-menuitem-link { color: #e5e7eb !important; padding: 0.75rem 1rem !important; }
    ::ng-deep .p-menu .p-menuitem-link:hover { background: rgba(251,191,36,0.08) !important; color: #fbbf24 !important; }

    /* ===== LAYOUT ===== */
    .ed { max-width: 72rem; margin: 0 auto; padding: 0 1rem; }

    /* ===== HEADER ===== */
    .ed-header {
      padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .ed-header__row1 {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .ed-back {
      display: inline-flex; align-items: center; gap: 0.375rem;
      color: #71717a; font-size: 0.8125rem; text-decoration: none;
      transition: color 0.15s; padding: 0.375rem 0.5rem; border-radius: 0.5rem;
    }
    .ed-back:hover { color: #fbbf24; }
    @media (max-width: 768px) { .ed-back__text { display: none; } }

    .ed-identity { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
    .ed-avatar {
      width: 2.5rem; height: 2.5rem; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05));
      border: 1.5px solid rgba(251,191,36,0.25); display: flex; align-items: center;
      justify-content: center; font-weight: 700; font-size: 0.8125rem; color: #fbbf24;
    }
    .ed-identity__info { min-width: 0; }
    .ed-name { font-size: 1.125rem; font-weight: 700; color: #f5f5f5; margin: 0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ed-subtitle { font-size: 0.75rem; color: #71717a; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 768px) { .ed-name { font-size: 0.9375rem; } }

    .ed-badge {
      font-size: 0.625rem; font-weight: 600; padding: 0.125rem 0.5rem;
      border-radius: 9999px; white-space: nowrap; flex-shrink: 0;
    }
    .ed-badge--active { background: rgba(34,197,94,0.12); color: #4ade80; }
    .ed-badge--inactive { background: rgba(239,68,68,0.12); color: #f87171; }

    .ed-actions { display: flex; gap: 0.375rem; flex-shrink: 0; }
    .ed-action {
      width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.06);
      background: #171717; color: #a1a1aa; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s; font-size: 0.8125rem; text-decoration: none;
    }
    .ed-action:hover { border-color: rgba(255,255,255,0.12); color: #f5f5f5; }
    .ed-action--green:hover { border-color: rgba(34,197,94,0.3); color: #4ade80; background: rgba(34,197,94,0.08); }
    .ed-action--blue:hover { border-color: rgba(59,130,246,0.3); color: #60a5fa; background: rgba(59,130,246,0.08); }
    .ed-action--amber:hover { border-color: rgba(251,191,36,0.3); color: #fbbf24; background: rgba(251,191,36,0.08); }

    /* ===== TABS ===== */
    .ed-tabs {
      display: flex; gap: 0; overflow-x: auto; -webkit-overflow-scrolling: touch;
      border-bottom: 1px solid rgba(255,255,255,0.06); scrollbar-width: none;
      margin-top: 0.25rem;
    }
    .ed-tabs::-webkit-scrollbar { display: none; }
    .ed-tab {
      display: flex; align-items: center; gap: 0.375rem; padding: 0.625rem 0.875rem;
      font-size: 0.8125rem; font-weight: 500; color: #52525b; white-space: nowrap;
      border: none; border-bottom: 2px solid transparent; background: transparent;
      cursor: pointer; transition: all 0.15s; flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
    }
    .ed-tab:hover { color: #a1a1aa; }
    .ed-tab--active { color: #fbbf24 !important; border-bottom-color: #fbbf24; }
    .ed-tab__icon { font-size: 0.875rem; }
    @media (max-width: 768px) {
      .ed-tab { padding: 0.75rem 0.75rem; font-size: 0.75rem; }
      .ed-tab__icon { display: none; }
    }

    /* ===== PANELS ===== */
    .ed-panel { min-height: 40vh; padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px) + 1rem); }
    .ed-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; color: #3f3f46; text-align: center; gap: 0.5rem; }
    .ed-empty i { font-size: 2.5rem; }
    .ed-empty p { font-size: 0.875rem; color: #71717a; margin: 0; }

    /* ===== INFO TAB ===== */
    .ed-stats {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;
      padding: 1rem 1rem 0; margin-bottom: 0.5rem;
    }
    @media (min-width: 769px) { .ed-stats { padding: 1.5rem 1.5rem 0; } }
    .ed-stat {
      text-align: center; padding: 0.75rem 0.5rem; border-radius: 0.75rem;
      background: #171717; border: 1px solid rgba(255,255,255,0.04);
    }
    .ed-stat__value { display: block; font-size: 0.875rem; font-weight: 700; color: #f5f5f5; }
    .ed-stat__value--green { color: #4ade80; }
    .ed-stat__value--amber { color: #fbbf24; }
    .ed-stat__value--blue { color: #60a5fa; }
    .ed-stat__label { display: block; font-size: 0.625rem; color: #52525b; text-transform: uppercase; margin-top: 0.125rem; letter-spacing: 0.03em; }

    .ed-info { padding-bottom: 2rem; }
    .ed-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
      padding: 1rem;
    }
    @media (min-width: 769px) { .ed-grid { padding: 1.5rem; gap: 1.5rem; } }
    @media (max-width: 768px) { .ed-grid { grid-template-columns: 1fr; } }

    .ed-section {
      background: #171717; border: 1px solid rgba(255,255,255,0.04);
      border-radius: 0.75rem; padding: 1rem; overflow: hidden;
    }
    .ed-section__title {
      font-size: 0.6875rem; font-weight: 600; color: #fbbf24; text-transform: uppercase;
      letter-spacing: 0.04em; margin: 0 0 0.75rem; display: flex; align-items: center; gap: 0.375rem;
    }
    .ed-section__title i { font-size: 0.75rem; }

    .ed-dl {
      display: grid; grid-template-columns: auto 1fr; gap: 0.375rem 1rem;
      font-size: 0.8125rem; align-items: baseline;
    }
    .ed-dl dt { color: #71717a; font-weight: 400; }
    .ed-dl dd { color: #e5e7eb; margin: 0; }
    @media (max-width: 768px) { .ed-dl { font-size: 0.75rem; gap: 0.5rem 0.75rem; } }

    /* ===== QR TAB ===== */
    .ed-qr { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem; }
    .ed-qr__frame { padding: 0.75rem; background: #fff; border-radius: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .ed-qr__frame img { width: 12rem; height: 12rem; border-radius: 0.5rem; }
    .ed-qr__empty { width: 12rem; height: 12rem; border-radius: 1rem; background: #171717; border: 2px dashed #333; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; color: #3f3f46; }
    .ed-qr__empty i { font-size: 3rem; }
    .ed-qr__empty span { font-size: 0.75rem; }

    /* ===== PORTAL TAB ===== */
    .ed-portal-status {
      display: flex; align-items: center; gap: 0.75rem; padding: 1rem;
      background: #171717; border: 1px solid rgba(255,255,255,0.04); border-radius: 0.75rem;
    }
    .ed-portal-icon {
      width: 2.75rem; height: 2.75rem; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; background: rgba(255,255,255,0.04);
      color: #52525b; font-size: 1.25rem;
    }
    .ed-portal-icon--active { background: rgba(34,197,94,0.1); color: #4ade80; }
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
  private organizationService = inject(OrganizationService);
  private qrService = inject(QrService);
  private apiUrl = inject(ApiUrlService);

  public employee_id = signal<string | null>(null);
  public inviting = signal(false);
  public regeneratingQr = signal(false);
  public activeTab = signal(0);
  public readonly tabs = [
    { id: 'info', label: 'Info', icon: 'pi pi-id-card' },
    { id: 'asistencia', label: 'Asistencia', icon: 'pi pi-clock' },
    { id: 'horarios', label: 'Horarios', icon: 'pi pi-calendar' },
    { id: 'qr', label: 'QR', icon: 'pi pi-qrcode' },
    { id: 'portal', label: 'Portal', icon: 'pi pi-user' },
    { id: 'historial', label: 'Historial', icon: 'pi pi-history' },
    { id: 'score', label: 'Score', icon: 'pi pi-chart-bar' },
  ];
  public portalUrl = `${getEnv('ENV_APP_URL') || window.location.origin
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
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employees`,
      method: 'GET',
      params,
    };
  });
  public currentEmployee = computed(() => this.employee.value()?.[0]);

  // Tardanzas del mes actual
  monthlyLates = httpResource<any[]>(() => {
    const empId = this.employee_id();
    if (!empId) return;
    const firstOfMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    return {
      url: this.apiUrl.build('rest/v1/employee_late_records', {
        employee_id: `eq.${empId}`,
        timelog_date: `gte.${firstOfMonth}`,
        order: 'timelog_date.desc',
        select: 'id,timelog_date,scheduled_entry_time,actual_entry_time,minutes_late,status,branch_name',
      }),
      method: 'GET',
    };
  });

  totalLateMinutes = computed(() => {
    const lates = this.monthlyLates.value();
    if (!lates?.length) return 0;
    return lates.reduce((sum: number, l: any) => sum + (l.minutes_late || 0), 0);
  });

  avgLateMinutes = computed(() => {
    const lates = this.monthlyLates.value();
    if (!lates?.length) return 0;
    return Math.round(this.totalLateMinutes() / lates.length);
  });

  terminationHistory = httpResource<Termination[]>(() => {
    const empId = this.employee_id();
    if (!empId) return;
    return {
      url: this.apiUrl.build('rest/v1/terminations', {
        employee_id: `eq.${empId}`,
        order: 'date.desc',
        select: 'id,employee_id,date,reason,notes,reintegration_date,created_at',
      }),
      method: 'GET',
    };
  });

  formatTermDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return fnsFormat(d, 'dd/MM/yyyy');
  }

  protected readonly items = computed<MenuItem[]>(() => {
    const employee = this.currentEmployee();
    const isActive = employee?.is_active !== false;
    const baseItems: MenuItem[] = [
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          this.router.navigate(['edit'], { relativeTo: this.route });
        },
      },
    ];
    if (isActive) {
      baseItems.push(
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
        }
      );
    } else {
      baseItems.push({
        label: 'Reintegrar',
        icon: 'pi pi-refresh',
        command: () => {
          this.reintegrateEmployee();
        },
      });
    }
    baseItems.push({
      label: 'Eliminar',
      icon: 'pi pi-trash',
      command: () => {
        this.deleteEmployee();
      },
    });
    return baseItems;
  });
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

  reintegrateEmployee() {
    const id = this.employee_id();
    if (!id) return;
    this.confirmationService.confirm({
      message: '¿Está seguro que desea reintegrar a este empleado?',
      header: 'Reintegrar Empleado',
      icon: 'pi pi-refresh',
      accept: () => {
        this.state
          .reintegrateEmployee(id, format(new Date(), 'yyyy-MM-dd'))
          .subscribe(() => {
            this.employee.reload();
            this.state.reloadItems();
          });
      },
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
              `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employees`,
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
