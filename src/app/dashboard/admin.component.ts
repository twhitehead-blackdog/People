import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OrganizationService } from '../services/organization.service';
import { DesignVersionService } from '../services/design-version.service';
import { PermissionsService } from '../services/permissions.service';
import { DashboardStore } from '../stores/dashboard.store';
import { DeviceService } from '../services/device.service';

@Component({
  selector: 'pt-admin',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }">
    @if (designVersion.isClassic()) {
      @if (device.isDesktop()) {
      <!-- Classic secondary sub-nav header -->
      <header
        class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md"
        [ngClass]="{ 'naz-header': isNaz() }"
      >
        <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div class="flex items-center justify-center gap-6">

            <!-- Auditoría Dropdown -->
            <div class="relative group cursor-pointer select-none"
              (mouseenter)="openDropdown('auditoria')" (mouseleave)="closeDropdown()">
              <div class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                [class.selected]="isActiveRoute('audit-tasks') || isActiveRoute('performance')">
                <i class="pi pi-check-square text-base"></i>
                <span>Auditoría</span>
              </div>
              <div class="absolute left-0 top-full hidden group-hover:block bg-neutral-800/95 border border-neutral-600/40 shadow-xl rounded-md w-56 z-50 overflow-hidden"
                style="margin-top: -1px;"
                [class.block]="isDropdownOpen('auditoria')"
                (mouseenter)="openDropdown('auditoria')" (mouseleave)="closeDropdown()">
                @if (canAccessPerformance()) {
                <a href="https://scorecard.blackdogpanama.com" target="_blank" rel="noopener noreferrer"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2">
                  <i class="pi pi-chart-line text-sm"></i><span>Rendimiento 360</span>
                </a>
                }
                @if (adminSubs().audit_tasks) {
                <a routerLink="audit-tasks"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('audit-tasks')"
                  [class.text-amber-300]="isActiveRoute('audit-tasks')">
                  <i class="pi pi-check-square text-sm"></i><span>Control de Tareas</span>
                </a>
                }
              </div>
            </div>

            <!-- Compras (enlace directo) -->
            @if (canAccessCompras()) {
            <a routerLink="compras"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
              <i class="pi pi-shopping-cart text-base"></i><span>Compras</span>
            </a>
            }

            <!-- IT Dropdown -->
            @if (canViewITModule()) {
            <div class="relative group cursor-pointer select-none"
              (mouseenter)="openDropdown('it')" (mouseleave)="closeDropdown()">
              <div class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                [class.selected]="isActiveRoute('device-inventory') || isActiveRoute('user-management')">
                <i class="pi pi-desktop text-base"></i><span>IT</span>
              </div>
              <div class="absolute left-0 top-full hidden group-hover:block bg-neutral-800/95 border border-neutral-600/40 shadow-xl rounded-md w-56 z-50 overflow-hidden"
                style="margin-top: -1px;"
                [class.block]="isDropdownOpen('it')"
                (mouseenter)="openDropdown('it')" (mouseleave)="closeDropdown()">
                <a routerLink="device-inventory"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('device-inventory')"
                  [class.text-amber-300]="isActiveRoute('device-inventory')">
                  <i class="pi pi-box text-sm"></i><span>Inventario de Dispositivos</span>
                </a>
                <a routerLink="tickets-it"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('tickets-it')"
                  [class.text-amber-300]="isActiveRoute('tickets-it')">
                  <i class="pi pi-desktop text-sm"></i><span>Tickets IT</span>
                </a>
                <a routerLink="it-mobile-lines"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('it-mobile-lines')"
                  [class.text-amber-300]="isActiveRoute('it-mobile-lines')">
                  <i class="pi pi-phone text-sm"></i><span>Líneas Móviles</span>
                </a>
                <a routerLink="it-licenses"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('it-licenses')"
                  [class.text-amber-300]="isActiveRoute('it-licenses')">
                  <i class="pi pi-key text-sm"></i><span>Licencias</span>
                </a>
                <a routerLink="it-cameras"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('it-cameras')"
                  [class.text-amber-300]="isActiveRoute('it-cameras')">
                  <i class="pi pi-video text-sm"></i><span>Cámaras NVR</span>
                </a>
                @if (adminSubs().user_management) {
                <a routerLink="user-management"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('user-management')"
                  [class.text-amber-300]="isActiveRoute('user-management')">
                  <i class="pi pi-user-edit text-sm"></i><span>Gestión de Usuarios</span>
                </a>
                }
              </div>
            </div>
            }

            <!-- Tickets & Sugerencias Dropdown -->
            @if (canViewTicketsModule()) {
            <div class="relative group cursor-pointer select-none"
              (mouseenter)="openDropdown('tickets')" (mouseleave)="closeDropdown()">
              <div class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                [class.selected]="isActiveRoute('tickets-operations') || isActiveRoute('tickets-accounting') || isActiveRoute('tickets-hr') || isActiveRoute('suggestions')">
                <i class="pi pi-ticket text-base"></i><span>Tickets</span>
              </div>
              <div class="absolute left-0 top-full hidden group-hover:block bg-neutral-800/95 border border-neutral-600/40 shadow-xl rounded-md w-60 z-50 overflow-hidden"
                style="margin-top: -1px;"
                [class.block]="isDropdownOpen('tickets')"
                (mouseenter)="openDropdown('tickets')" (mouseleave)="closeDropdown()">
                @if (adminSubs().tickets_view_all) {
                <a routerLink="tickets-all"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('tickets-all')"
                  [class.text-amber-300]="isActiveRoute('tickets-all')">
                  <i class="pi pi-globe text-sm text-amber-400"></i><span>Vista Global (todos)</span>
                </a>
                <a routerLink="tickets-analytics"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('tickets-analytics')"
                  [class.text-amber-300]="isActiveRoute('tickets-analytics')">
                  <i class="pi pi-chart-bar text-sm text-emerald-400"></i><span>Analytics & SLA</span>
                </a>
                }
                @if (adminSubs().tickets_my_branch) {
                <a routerLink="tickets-my-store"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('tickets-my-store')"
                  [class.text-amber-300]="isActiveRoute('tickets-my-store')">
                  <i class="pi pi-building text-sm text-blue-400"></i><span>Mi sucursal</span>
                </a>
                }
                @if (adminSubs().tickets_operations) {
                <a routerLink="tickets-operations"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('tickets-operations')"
                  [class.text-amber-300]="isActiveRoute('tickets-operations')">
                  <i class="pi pi-cog text-sm text-emerald-400"></i><span>Operaciones</span>
                </a>
                }
                @if (adminSubs().tickets_accounting) {
                <a routerLink="tickets-accounting"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('tickets-accounting')"
                  [class.text-amber-300]="isActiveRoute('tickets-accounting')">
                  <i class="pi pi-dollar text-sm text-amber-400"></i><span>Contabilidad</span>
                </a>
                }
                @if (adminSubs().tickets_hr) {
                <a routerLink="tickets-hr"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('tickets-hr')"
                  [class.text-amber-300]="isActiveRoute('tickets-hr')">
                  <i class="pi pi-users text-sm text-purple-400"></i><span>RRHH</span>
                </a>
                }
                @if (adminSubs().suggestions_admin) {
                <a routerLink="suggestions"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2 border-t border-neutral-700/40"
                  [class.bg-neutral-700]="isActiveRoute('suggestions')"
                  [class.text-amber-300]="isActiveRoute('suggestions')">
                  <i class="pi pi-lightbulb text-sm text-yellow-300"></i><span>Sugerencias</span>
                </a>
                }
              </div>
            </div>
            }

            <!-- RRHH Dropdown -->
            <div class="relative group cursor-pointer select-none"
              (mouseenter)="openDropdown('rrhh')" (mouseleave)="closeDropdown()">
              <div class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                [class.selected]="isActiveRoute('hr/time-dashboard') || isActiveRoute('hr/disabilities') || isActiveRoute('surveys') || (!isNaz() && isActiveRoute('job-applications'))">
                <i class="pi pi-users text-base"></i><span>RRHH</span>
              </div>
              <div class="absolute left-0 top-full hidden group-hover:block bg-neutral-800/95 border border-neutral-600/40 shadow-xl rounded-md w-56 z-50 overflow-hidden"
                style="margin-top: -1px;"
                [class.block]="isDropdownOpen('rrhh')"
                (mouseenter)="openDropdown('rrhh')" (mouseleave)="closeDropdown()">
                @if (hrSubs().time_dashboard) {
                <a routerLink="hr/time-dashboard"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('hr/time-dashboard')"
                  [class.text-amber-300]="isActiveRoute('hr/time-dashboard')">
                  <i class="pi pi-clock text-sm"></i><span>Tiempo</span>
                </a>
                }
                @if (hrSubs().disabilities) {
                <a routerLink="hr/disabilities"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('hr/disabilities')"
                  [class.text-amber-300]="isActiveRoute('hr/disabilities')">
                  <i class="pi pi-heart text-sm"></i><span>Gestión de Solicitudes</span>
                </a>
                }
                @if (hrSubs().surveys) {
                <a routerLink="surveys"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('surveys')"
                  [class.text-amber-300]="isActiveRoute('surveys')">
                  <i class="pi pi-chart-bar text-sm"></i><span>Encuestas</span>
                </a>
                }
                @if (!isNaz() && adminSubs().job_applications) {
                <a routerLink="job-applications"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('job-applications')"
                  [class.text-amber-300]="isActiveRoute('job-applications')">
                  <i class="pi pi-briefcase text-sm"></i><span>Feria de empleo</span>
                </a>
                }
              </div>
            </div>

            <!-- Organización Dropdown -->
            <div class="relative group cursor-pointer select-none"
              (mouseenter)="openDropdown('organizacion')" (mouseleave)="closeDropdown()">
              <div class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                [class.selected]="isAnyOrganizacionRouteActive()">
                <i class="pi pi-sitemap text-base"></i><span>Organización</span>
              </div>
              <div class="absolute left-0 top-full hidden group-hover:block bg-neutral-800/95 border border-neutral-600/40 shadow-xl rounded-md w-56 z-50 overflow-hidden"
                style="margin-top: -1px;"
                [class.block]="isDropdownOpen('organizacion')"
                (mouseenter)="openDropdown('organizacion')" (mouseleave)="closeDropdown()">
                @if (adminSubs().employees) {
                <a routerLink="employees"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('employees')"
                  [class.text-amber-300]="isActiveRoute('employees')">
                  <i class="pi pi-users text-sm"></i><span>Empleados</span>
                </a>
                }
                @if (adminSubs().organigrama) {
                <a routerLink="organigrama"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('organigrama')"
                  [class.text-amber-300]="isActiveRoute('organigrama')">
                  <i class="pi pi-sitemap text-sm"></i><span>Organigrama</span>
                </a>
                }
                @if (adminSubs().companies) {
                <a routerLink="companies"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('companies')"
                  [class.text-amber-300]="isActiveRoute('companies')">
                  <i class="pi pi-building text-sm"></i><span>Empresas</span>
                </a>
                }
                @if (adminSubs().positions) {
                <a routerLink="positions"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('positions')"
                  [class.text-amber-300]="isActiveRoute('positions')">
                  <i class="pi pi-user-plus text-sm"></i><span>Cargos</span>
                </a>
                }
                @if (adminSubs().branches) {
                <a routerLink="branches"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('branches')"
                  [class.text-amber-300]="isActiveRoute('branches')">
                  <i class="pi pi-shop text-sm"></i><span>Sucursales</span>
                </a>
                }
                @if (adminSubs().departments) {
                <a routerLink="departments"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('departments')"
                  [class.text-amber-300]="isActiveRoute('departments')">
                  <i class="pi pi-sitemap text-sm"></i><span>Areas</span>
                </a>
                }
                @if (adminSubs().permissions) {
                <a routerLink="permissions"
                  class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                  [class.bg-neutral-700]="isActiveRoute('permissions')"
                  [class.text-amber-300]="isActiveRoute('permissions')">
                  <i class="pi pi-lock text-sm"></i><span>Permisos</span>
                </a>
                }
              </div>
            </div>

            <!-- Configuración (enlace directo) -->
            @if (adminSubs().settings) {
            <a routerLink="settings"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
              <i class="pi pi-cog text-base"></i><span>Configuración</span>
            </a>
            }

          </div>
        </div>
      </header>
      } @else {
      <!-- Classic mobile admin header -->
      <header class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md sticky top-0 z-40" [ngClass]="{ 'naz-header': isNaz() }">
        <div class="flex items-center justify-between px-3 py-2">
          <span class="text-white font-semibold text-sm">Administración</span>
          <button type="button" class="p-2 rounded-lg text-gray-300 hover:bg-neutral-600/50 hover:text-white transition-colors" (click)="mobileMenuOpen.set(true)">
            <i class="pi pi-th-large text-lg"></i>
          </button>
        </div>
      </header>
      @if (mobileMenuOpen()) {
      <div class="fixed inset-0 z-50 flex">
        <div class="absolute inset-0 bg-black/60" (click)="mobileMenuOpen.set(false)"></div>
        <div class="relative w-[min(280px,85vw)] max-w-[280px] bg-neutral-800 border-r border-neutral-600 shadow-xl overflow-y-auto flex flex-col">
          <div class="flex items-center justify-between p-3 border-b border-neutral-600">
            <span class="font-semibold text-white">Menú</span>
            <button type="button" class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-700" (click)="mobileMenuOpen.set(false)">
              <i class="pi pi-times text-xl"></i>
            </button>
          </div>
          <nav class="p-2 flex flex-col gap-1">
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1">Auditoría</div>
            @if (canAccessPerformance()) {
            <a href="https://scorecard.blackdogpanama.com" target="_blank" rel="noopener noreferrer" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white"><i class="pi pi-chart-line text-sm"></i><span>Rendimiento 360</span></a>
            }
            @if (adminSubs().audit_tasks) {
            <a routerLink="audit-tasks" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('audit-tasks')" [class.text-amber-300]="isActiveRoute('audit-tasks')"><i class="pi pi-check-square text-sm"></i><span>Control de Tareas</span></a>
            }
            @if (canAccessCompras()) {
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mt-2">Compras</div>
            <a routerLink="compras" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('compras')" [class.text-amber-300]="isActiveRoute('compras')"><i class="pi pi-shopping-cart text-sm"></i><span>Compras</span></a>
            }
            @if (canViewITModule()) {
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mt-2">IT</div>
            <a routerLink="device-inventory" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('device-inventory')" [class.text-amber-300]="isActiveRoute('device-inventory')"><i class="pi pi-box text-sm"></i><span>Inventario de Dispositivos</span></a>
            <a routerLink="tickets-it" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('tickets-it')" [class.text-amber-300]="isActiveRoute('tickets-it')"><i class="pi pi-desktop text-sm"></i><span>Tickets IT</span></a>
            <a routerLink="it-mobile-lines" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('it-mobile-lines')" [class.text-amber-300]="isActiveRoute('it-mobile-lines')"><i class="pi pi-phone text-sm"></i><span>Líneas Móviles</span></a>
            <a routerLink="it-licenses" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('it-licenses')" [class.text-amber-300]="isActiveRoute('it-licenses')"><i class="pi pi-key text-sm"></i><span>Licencias</span></a>
            <a routerLink="it-cameras" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('it-cameras')" [class.text-amber-300]="isActiveRoute('it-cameras')"><i class="pi pi-video text-sm"></i><span>Cámaras NVR</span></a>
            @if (adminSubs().user_management) {
            <a routerLink="user-management" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('user-management')" [class.text-amber-300]="isActiveRoute('user-management')"><i class="pi pi-user-edit text-sm"></i><span>Gestión de Usuarios</span></a>
            }
            }
            @if (canViewTicketsModule()) {
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mt-2">Tickets</div>
            @if (adminSubs().tickets_operations) {
            <a routerLink="tickets-operations" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('tickets-operations')" [class.text-amber-300]="isActiveRoute('tickets-operations')"><i class="pi pi-cog text-sm text-emerald-400"></i><span>Operaciones</span></a>
            }
            @if (adminSubs().tickets_accounting) {
            <a routerLink="tickets-accounting" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('tickets-accounting')" [class.text-amber-300]="isActiveRoute('tickets-accounting')"><i class="pi pi-dollar text-sm text-amber-400"></i><span>Contabilidad</span></a>
            }
            @if (adminSubs().tickets_hr) {
            <a routerLink="tickets-hr" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('tickets-hr')" [class.text-amber-300]="isActiveRoute('tickets-hr')"><i class="pi pi-users text-sm text-purple-400"></i><span>RRHH</span></a>
            }
            @if (adminSubs().suggestions_admin) {
            <a routerLink="suggestions" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('suggestions')" [class.text-amber-300]="isActiveRoute('suggestions')"><i class="pi pi-lightbulb text-sm text-yellow-300"></i><span>Sugerencias</span></a>
            }
            }
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mt-2">RRHH</div>
            @if (hrSubs().time_dashboard) {
            <a routerLink="hr/time-dashboard" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('hr/time-dashboard')" [class.text-amber-300]="isActiveRoute('hr/time-dashboard')"><i class="pi pi-clock text-sm"></i><span>Tiempo</span></a>
            }
            @if (hrSubs().disabilities) {
            <a routerLink="hr/disabilities" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('hr/disabilities')" [class.text-amber-300]="isActiveRoute('hr/disabilities')"><i class="pi pi-heart text-sm"></i><span>Gestión de Solicitudes</span></a>
            }
            @if (hrSubs().surveys) {
            <a routerLink="surveys" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('surveys')" [class.text-amber-300]="isActiveRoute('surveys')"><i class="pi pi-chart-bar text-sm"></i><span>Encuestas</span></a>
            }
            @if (!isNaz() && adminSubs().job_applications) {
            <a routerLink="job-applications" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('job-applications')" [class.text-amber-300]="isActiveRoute('job-applications')"><i class="pi pi-briefcase text-sm"></i><span>Feria de empleo</span></a>
            }
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mt-2">Organización</div>
            @if (adminSubs().employees) {
            <a routerLink="employees" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('employees')" [class.text-amber-300]="isActiveRoute('employees')"><i class="pi pi-users text-sm"></i><span>Empleados</span></a>
            }
            @if (adminSubs().organigrama) {
            <a routerLink="organigrama" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('organigrama')" [class.text-amber-300]="isActiveRoute('organigrama')"><i class="pi pi-sitemap text-sm"></i><span>Organigrama</span></a>
            }
            @if (adminSubs().companies) {
            <a routerLink="companies" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('companies')" [class.text-amber-300]="isActiveRoute('companies')"><i class="pi pi-building text-sm"></i><span>Empresas</span></a>
            }
            @if (adminSubs().positions) {
            <a routerLink="positions" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('positions')" [class.text-amber-300]="isActiveRoute('positions')"><i class="pi pi-user-plus text-sm"></i><span>Cargos</span></a>
            }
            @if (adminSubs().branches) {
            <a routerLink="branches" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('branches')" [class.text-amber-300]="isActiveRoute('branches')"><i class="pi pi-shop text-sm"></i><span>Sucursales</span></a>
            }
            @if (adminSubs().departments) {
            <a routerLink="departments" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('departments')" [class.text-amber-300]="isActiveRoute('departments')"><i class="pi pi-sitemap text-sm"></i><span>Areas</span></a>
            }
            @if (adminSubs().permissions) {
            <a routerLink="permissions" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('permissions')" [class.text-amber-300]="isActiveRoute('permissions')"><i class="pi pi-lock text-sm"></i><span>Permisos</span></a>
            }
            @if (adminSubs().settings) {
            <div class="border-t border-neutral-600 mt-2 pt-2">
              <a routerLink="settings" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('settings')" [class.text-amber-300]="isActiveRoute('settings')"><i class="pi pi-cog text-sm"></i><span>Configuración</span></a>
            </div>
            }
          </nav>
        </div>
      </div>
      }
      }
    }
    <main [ngClass]="{ 'naz-main': isNaz() }" style="min-height: calc(100dvh - 52px - 68px)">
      <router-outlet />
    </main>
  </div>`,
  styles: `
    .selected {
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      border-left: 3px solid #FBBF24;
      transition: all 0.3s ease-in-out;
    }
    :host-context(html.dark) .selected {
      background: linear-gradient(to right, rgba(55,65,81,0.8), rgba(75,85,99,0.8));
      color: #ffffff;
    }
    :host-context(html.light) .selected {
      background: linear-gradient(to right, #f3f4f6, #e5e7eb);
      color: #111827;
    }
    :host-context(html.dark) .naz-theme header.naz-header {
      background: #000000 !important;
      border-bottom-color: rgba(255,255,255,0.10) !important;
    }
    :host-context(html.light) .naz-theme header.naz-header {
      background: #ffffff !important;
      border-bottom-color: rgba(0,0,0,0.10) !important;
    }
    :host-context(html.dark) .naz-theme main.naz-main {
      background: #000000 !important;
    }
    :host-context(html.light) .naz-theme main.naz-main {
      background: #ffffff !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements OnInit, OnDestroy {
  private organizationService = inject(OrganizationService);
  public designVersion = inject(DesignVersionService);
  private permissionsService = inject(PermissionsService);
  private dashboardStore = inject(DashboardStore);
  protected device = inject(DeviceService);

  public isNaz = computed(() => this.organizationService.isNaz());
  public mobileMenuOpen = signal(false);
  private openDropdownId = signal<string | null>(null);
  private dropdownTimeout?: number;

  public adminSubs = computed(() => ({
    employees: this.permissionsService.canAccessSubModule('admin', 'employees'),
    organigrama: this.permissionsService.canAccessSubModule('admin', 'organigrama'),
    companies: this.permissionsService.canAccessSubModule('admin', 'companies'),
    departments: this.permissionsService.canAccessSubModule('admin', 'departments'),
    positions: this.permissionsService.canAccessSubModule('admin', 'positions'),
    branches: this.permissionsService.canAccessSubModule('admin', 'branches'),
    settings: this.permissionsService.canAccessSubModule('admin', 'settings'),
    user_management: this.permissionsService.canAccessSubModule('admin', 'user_management'),
    permissions: this.permissionsService.canAccessSubModule('admin', 'permissions'),
    job_applications: this.permissionsService.canAccessSubModule('admin', 'job_applications'),
    audit_tasks: this.permissionsService.canAccessSubModule('admin', 'audit_tasks'),
    tickets_view_all: this.permissionsService.canAccessSubModule('admin', 'tickets_view_all'),
    tickets_my_branch: this.permissionsService.canAccessSubModule('admin', 'tickets_my_branch'),
    tickets_operations: this.permissionsService.canAccessSubModule('admin', 'tickets_operations'),
    tickets_accounting: this.permissionsService.canAccessSubModule('admin', 'tickets_accounting'),
    tickets_hr: this.permissionsService.canAccessSubModule('admin', 'tickets_hr'),
    suggestions_admin: this.permissionsService.canAccessSubModule('admin', 'suggestions_admin'),
  }));

  public hrSubs = computed(() => ({
    time_dashboard: this.permissionsService.canAccessSubModule('hr', 'hr_time_dashboard'),
    disabilities: this.permissionsService.canAccessSubModule('hr', 'hr_disabilities'),
    surveys: this.permissionsService.canAccessSubModule('hr', 'hr_surveys'),
  }));

  public canAccessPerformance = computed(() =>
    this.permissionsService.canAccessModule('performance')
  );

  public canAccessCompras = computed(() =>
    this.permissionsService.canAccessModule('compras')
  );

  public canViewTicketsModule = computed(() => {
    if (this.permissionsService.canCurrentUser('admin')) return true;
    const subs = ['tickets_view_all', 'tickets_my_branch', 'tickets_operations', 'tickets_accounting', 'tickets_hr', 'suggestions_admin'];
    return subs.some(s => this.permissionsService.canAccessSubModule('admin', s));
  });

  public canViewITModule = computed(() => {
    // Cualquiera con admin legacy o algún submódulo IT habilitado ve el dropdown IT
    if (this.permissionsService.canCurrentUser('admin')) return true;
    const itSubs = ['device_inventory', 'tickets_it', 'it_mobile_lines', 'it_licenses', 'user_management'];
    if (itSubs.some(s => this.permissionsService.canAccessSubModule('admin', s))) return true;

    // Fallback histórico: emails/cargos de soporte
    const emp = this.dashboardStore.currentEmployee();
    const email = emp?.work_email?.toLowerCase() || '';
    const position = emp?.position?.name?.toLowerCase() || '';
    const allowedEmails = ['soporte2', 'soporte', 'desarrollo', 'dev', 'diego', 'tristan'];
    return (
      allowedEmails.some(e => email.includes(e)) ||
      ['desarrollador', 'developer', 'soporte', 'it', 'sistemas'].some(p => position.includes(p))
    );
  });

  public openDropdown(id: string): void {
    if (this.dropdownTimeout) { clearTimeout(this.dropdownTimeout); this.dropdownTimeout = undefined; }
    this.openDropdownId.set(id);
  }

  public closeDropdown(): void {
    this.dropdownTimeout = window.setTimeout(() => this.openDropdownId.set(null), 300);
  }

  public isDropdownOpen(id: string): boolean {
    return this.openDropdownId() === id;
  }

  public isActiveRoute(route: string): boolean {
    return typeof window !== 'undefined' && window.location.pathname.includes(route);
  }

  public isAnyOrganizacionRouteActive(): boolean {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname;
    return ['employees','organigrama','companies','positions','branches','departments','permissions'].some(r => p.includes(r));
  }

  ngOnInit() {}
  ngOnDestroy() {
    if (this.dropdownTimeout) clearTimeout(this.dropdownTimeout);
  }
}
