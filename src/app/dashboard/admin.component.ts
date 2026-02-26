import { NgClass } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DeviceService } from '../services/device.service';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { PermissionsService } from '../services/permissions.service';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-admin',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }">
    @if (device.isDesktop()) {
    <header
      class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md"
      [ngClass]="{ 'naz-header': isNaz() }"
    >
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex items-center justify-center gap-6">
          <!-- Auditoría Dropdown -->
          <div
            class="relative group cursor-pointer select-none"
            (mouseenter)="openDropdown('auditoria')"
            (mouseleave)="closeDropdown()"
          >
            <!-- Título Auditoría -->
            <div
              class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
              [class.selected]="
                isActiveRoute('audit-tasks') || isActiveRoute('performance')
              "
            >
              <i class="pi pi-check-square text-base"></i>
              <span>Auditoría</span>
            </div>

            <!-- Dropdown Menu -->
            <div
              class="absolute left-0 top-full hidden group-hover:block bg-neutral-800/95 border border-neutral-600/40 shadow-xl rounded-md w-56 z-50 overflow-hidden"
              style="margin-top: -1px;"
              [class.block]="isDropdownOpen('auditoria')"
              (mouseenter)="openDropdown('auditoria')"
              (mouseleave)="closeDropdown()"
            >
              @if (canAccessPerformance()) {
              <a
                routerLink="performance"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('performance')"
                [class.text-amber-300]="isActiveRoute('performance')"
              >
                <i class="pi pi-chart-line text-sm"></i>
                <span>Rendimiento 360</span>
              </a>
              }
              @if (adminSubs().audit_tasks) {
              <a
                routerLink="audit-tasks"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('audit-tasks')"
                [class.text-amber-300]="isActiveRoute('audit-tasks')"
              >
                <i class="pi pi-check-square text-sm"></i>
                <span>Control de Tareas</span>
              </a>
              }
            </div>
          </div>

          <!-- IT Dropdown (solo para desarrolladores y Soporte IT) -->
          @if (canViewITModule()) {
          <div
            class="relative group cursor-pointer select-none"
            (mouseenter)="openDropdown('it')"
            (mouseleave)="closeDropdown()"
          >
            <!-- Título IT -->
            <div
              class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
              [class.selected]="isActiveRoute('device-inventory') || isActiveRoute('user-management')"
            >
              <i class="pi pi-desktop text-base"></i>
              <span>IT</span>
            </div>

            <!-- Dropdown Menu -->
            <div
              class="absolute left-0 top-full hidden group-hover:block bg-neutral-800/95 border border-neutral-600/40 shadow-xl rounded-md w-56 z-50 overflow-hidden"
              style="margin-top: -1px;"
              [class.block]="isDropdownOpen('it')"
              (mouseenter)="openDropdown('it')"
              (mouseleave)="closeDropdown()"
            >
              <a
                routerLink="device-inventory"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('device-inventory')"
                [class.text-amber-300]="isActiveRoute('device-inventory')"
              >
                <i class="pi pi-box text-sm"></i>
                <span>Inventario de Dispositivos</span>
              </a>
              @if (adminSubs().user_management) {
              <a
                routerLink="user-management"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('user-management')"
                [class.text-amber-300]="isActiveRoute('user-management')"
              >
                <i class="pi pi-user-edit text-sm"></i>
                <span>Gestión de Usuarios</span>
              </a>
              }
            </div>
          </div>
          }

          <!-- RRHH Dropdown -->
          <div
            class="relative group cursor-pointer select-none"
            (mouseenter)="openDropdown('rrhh')"
            (mouseleave)="closeDropdown()"
          >
            <!-- Título RRHH -->
            <div
              class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
              [class.selected]="
                isActiveRoute('hr/time-dashboard') ||
                isActiveRoute('hr/disabilities') ||
                isActiveRoute('surveys') ||
                (!isNaz() && isActiveRoute('job-applications'))
              "
            >
              <i class="pi pi-users text-base"></i>
              <span>RRHH</span>
            </div>

            <!-- Dropdown Menu -->
            <div
              class="absolute left-0 top-full hidden group-hover:block bg-neutral-800/95 border border-neutral-600/40 shadow-xl rounded-md w-56 z-50 overflow-hidden"
              style="margin-top: -1px;"
              [class.block]="isDropdownOpen('rrhh')"
              (mouseenter)="openDropdown('rrhh')"
              (mouseleave)="closeDropdown()"
            >
              <!-- Tiempo -->
              @if (hrSubs().time_dashboard) {
              <a
                routerLink="hr/time-dashboard"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('hr/time-dashboard')"
                [class.text-amber-300]="isActiveRoute('hr/time-dashboard')"
              >
                <i class="pi pi-clock text-sm"></i>
                <span>Tiempo</span>
              </a>
              }
              <!-- Gestión de Solicitudes -->
              @if (hrSubs().disabilities) {
              <a
                routerLink="hr/disabilities"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('hr/disabilities')"
                [class.text-amber-300]="isActiveRoute('hr/disabilities')"
              >
                <i class="pi pi-heart text-sm"></i>
                <span>Gestión de Solicitudes</span>
              </a>
              }

              <!-- Encuestas HR -->
              @if (hrSubs().surveys) {
              <a
                routerLink="surveys"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('surveys')"
                [class.text-amber-300]="isActiveRoute('surveys')"
              >
                <i class="pi pi-chart-bar text-sm"></i>
                <span>Encuestas</span>
              </a>
              }

              <!-- Feria de empleo (solo para Black Dog) -->
              @if (!isNaz() && adminSubs().job_applications) {
              <a
                routerLink="job-applications"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('job-applications')"
                [class.text-amber-300]="isActiveRoute('job-applications')"
              >
                <i class="pi pi-briefcase text-sm"></i>
                <span>Feria de empleo</span>
              </a>
              }
            </div>
          </div>

          <!-- Organización Dropdown -->
          <div
            class="relative group cursor-pointer select-none"
            (mouseenter)="openDropdown('organizacion')"
            (mouseleave)="closeDropdown()"
          >
            <!-- Título Organización -->
            <div
              class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
              [class.selected]="isAnyOrganizacionRouteActive()"
            >
              <i class="pi pi-sitemap text-base"></i>
              <span>Organización</span>
            </div>

            <!-- Dropdown Menu -->
            <div
              class="absolute left-0 top-full hidden group-hover:block bg-neutral-800/95 border border-neutral-600/40 shadow-xl rounded-md w-56 z-50 overflow-hidden"
              style="margin-top: -1px;"
              [class.block]="isDropdownOpen('organizacion')"
              (mouseenter)="openDropdown('organizacion')"
              (mouseleave)="closeDropdown()"
            >
              <!-- Empleados -->
              @if (adminSubs().employees) {
              <a
                routerLink="employees"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('employees')"
                [class.text-amber-300]="isActiveRoute('employees')"
              >
                <i class="pi pi-users text-sm"></i>
                <span>Empleados</span>
              </a>
              }

              <!-- Organigrama -->
              @if (adminSubs().organigrama) {
              <a
                routerLink="organigrama"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('organigrama')"
                [class.text-amber-300]="isActiveRoute('organigrama')"
              >
                <i class="pi pi-sitemap text-sm"></i>
                <span>Organigrama</span>
              </a>
              }

              <!-- Empresas -->
              @if (adminSubs().companies) {
              <a
                routerLink="companies"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('companies')"
                [class.text-amber-300]="isActiveRoute('companies')"
              >
                <i class="pi pi-building text-sm"></i>
                <span>Empresas</span>
              </a>
              }

              <!-- Cargos -->
              @if (adminSubs().positions) {
              <a
                routerLink="positions"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('positions')"
                [class.text-amber-300]="isActiveRoute('positions')"
              >
                <i class="pi pi-user-plus text-sm"></i>
                <span>Cargos</span>
              </a>
              }

              <!-- Sucursales -->
              @if (adminSubs().branches) {
              <a
                routerLink="branches"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('branches')"
                [class.text-amber-300]="isActiveRoute('branches')"
              >
                <i class="pi pi-shop text-sm"></i>
                <span>Sucursales</span>
              </a>
              }

              <!-- Areas -->
              @if (adminSubs().departments) {
              <a
                routerLink="departments"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('departments')"
                [class.text-amber-300]="isActiveRoute('departments')"
              >
                <i class="pi pi-sitemap text-sm"></i>
                <span>Areas</span>
              </a>
              }

              <!-- Permisos -->
              @if (adminSubs().permissions) {
              <a
                routerLink="permissions"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('permissions')"
                [class.text-amber-300]="isActiveRoute('permissions')"
              >
                <i class="pi pi-lock text-sm"></i>
                <span>Permisos</span>
              </a>
              }
            </div>
          </div>

          <!-- Enlaces directos a la derecha -->
          <div class="flex items-center gap-6">
            <!-- Configuración -->
            @if (adminSubs().settings) {
            <a
              routerLink="settings"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
            >
              <i class="pi pi-cog text-base"></i>
              <span>Configuración</span>
            </a>
            }
          </div>
        </div>
      </div>
    </header>
    } @else {
    <!-- Header móvil Admin: solo título de sección, sin segundo hamburguesa (el menú superior ya tiene uno) -->
    <header class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md sticky top-0 z-40" [ngClass]="{ 'naz-header': isNaz() }">
      <div class="flex items-center justify-between px-3 py-2">
        <span class="text-white font-semibold text-sm">Administración</span>
        <button type="button" class="p-2 rounded-lg text-gray-300 hover:bg-neutral-600/50 hover:text-white transition-colors" (click)="mobileMenuOpen.set(true)" aria-label="Menú de administración" title="Menú de administración">
          <i class="pi pi-th-large text-lg" aria-hidden="true"></i>
        </button>
      </div>
    </header>
    @if (mobileMenuOpen()) {
      <div class="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
        <div class="absolute inset-0 bg-black/60" (click)="mobileMenuOpen.set(false)"></div>
        <div class="relative w-[min(280px,85vw)] max-w-[280px] bg-neutral-800 border-r border-neutral-600 shadow-xl overflow-y-auto flex flex-col">
          <div class="flex items-center justify-between p-3 border-b border-neutral-600">
            <span class="font-semibold text-white">Menú</span>
            <button type="button" class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-700" (click)="mobileMenuOpen.set(false)" aria-label="Cerrar">
              <i class="pi pi-times text-xl"></i>
            </button>
          </div>
          <nav class="p-2 flex flex-col gap-1">
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1">Auditoría</div>
            @if (canAccessPerformance()) {
            <a routerLink="performance" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('performance')" [class.text-amber-300]="isActiveRoute('performance')"><i class="pi pi-chart-line text-sm"></i><span>Rendimiento 360</span></a>
            }
            @if (adminSubs().audit_tasks) {
            <a routerLink="audit-tasks" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('audit-tasks')" [class.text-amber-300]="isActiveRoute('audit-tasks')"><i class="pi pi-check-square text-sm"></i><span>Control de Tareas</span></a>
            }

            @if (canViewITModule()) {
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mt-2">IT</div>
            <a routerLink="device-inventory" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('device-inventory')" [class.text-amber-300]="isActiveRoute('device-inventory')"><i class="pi pi-box text-sm"></i><span>Inventario de Dispositivos</span></a>
            @if (adminSubs().user_management) {
            <a routerLink="user-management" (click)="mobileMenuOpen.set(false)" class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-200 hover:bg-neutral-700 hover:text-white" [class.bg-neutral-700]="isActiveRoute('user-management')" [class.text-amber-300]="isActiveRoute('user-management')"><i class="pi pi-user-edit text-sm"></i><span>Gestión de Usuarios</span></a>
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
    <main
      class="min-h-screen dark:bg-neutral-900 light:bg-gray-50"
      [ngClass]="{ 'naz-main': isNaz() }"
    >
      <div class="mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <router-outlet />
      </div>
    </main>
  </div>`,
  styles: `
    .selected {
      @apply shadow-md transition-all duration-300 ease-in-out;
      border-left: 3px solid #FBBF24;
    }

    :host-context(html.dark) .selected {
      @apply bg-gradient-to-r from-gray-700/80 to-gray-600/80 text-white;
    }

    :host-context(html.light) .selected {
      @apply bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900;
    }

    /* Tema Naz - Modo Oscuro */
    :host-context(html.dark) .naz-theme header.naz-header {
      background: #000000 !important;
      border-bottom-color: rgba(255, 255, 255, 0.10) !important;
    }

    :host-context(html.dark) .naz-theme .naz-header a,
    :host-context(html.dark) .naz-theme .naz-header div {
      color: #C6C2BF !important;
    }

    :host-context(html.dark) .naz-theme .naz-header a:hover,
    :host-context(html.dark) .naz-theme .naz-header div:hover {
      color: #FFFFFF !important;
      background: rgba(255, 255, 255, 0.10) !important;
    }

    :host-context(html.dark) .naz-theme .naz-header .selected {
      background: #0D0D0D !important;
      color: #FFFFFF !important;
      border-left-color: #FFFFFF !important;
    }

    :host-context(html.dark) .naz-theme .naz-header [class*="bg-neutral-700"] {
      background: #0D0D0D !important;
      color: #FFFFFF !important;
    }

    :host-context(html.dark) .naz-theme .naz-header [class*="text-amber-300"] {
      color: #FFFFFF !important;
    }

    :host-context(html.dark) .naz-theme main.naz-main {
      background: #000000 !important;
    }

    /* Tema Naz - Modo Claro */
    :host-context(html.light) .naz-theme header.naz-header {
      background: #ffffff !important;
      border-bottom-color: rgba(0, 0, 0, 0.10) !important;
    }

    :host-context(html.light) .naz-theme .naz-header a,
    :host-context(html.light) .naz-theme .naz-header div {
      color: #4b5563 !important;
    }

    :host-context(html.light) .naz-theme .naz-header a:hover,
    :host-context(html.light) .naz-theme .naz-header div:hover {
      color: #000000 !important;
      background: rgba(0, 0, 0, 0.05) !important;
    }

    :host-context(html.light) .naz-theme .naz-header .selected {
      background: #f5f5f5 !important;
      color: #000000 !important;
      border-left-color: #C6C2BF !important;
    }

    :host-context(html.light) .naz-theme .naz-header [class*="bg-neutral-700"] {
      background: #f5f5f5 !important;
      color: #000000 !important;
    }

    :host-context(html.light) .naz-theme .naz-header [class*="text-amber-300"] {
      color: #1f2937 !important;
    }

    :host-context(html.light) .naz-theme main.naz-main {
      background: #ffffff !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private refreshInterval?: number;
  private dropdownTimeout?: number;
  public organizationService = inject(OrganizationService);
  private dashboardStore = inject(DashboardStore);
  private permissionsService = inject(PermissionsService);
  protected device = inject(DeviceService);
  public mobileMenuOpen = signal(false);

  // Computed: acceso a submódulos de admin
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
    complaints: this.permissionsService.canAccessSubModule('admin', 'complaints'),
    job_applications: this.permissionsService.canAccessSubModule('admin', 'job_applications'),
    audit_tasks: this.permissionsService.canAccessSubModule('admin', 'audit_tasks'),
  }));

  // Computed: acceso a submódulos de HR
  public hrSubs = computed(() => ({
    time_dashboard: this.permissionsService.canAccessSubModule('hr', 'hr_time_dashboard'),
    disabilities: this.permissionsService.canAccessSubModule('hr', 'hr_disabilities'),
    surveys: this.permissionsService.canAccessSubModule('hr', 'hr_surveys'),
  }));

  // Computed: acceso al módulo de performance
  public canAccessPerformance = computed(() => this.permissionsService.canAccessModule('performance'));

  // Computed para verificar si es Naz
  public isNaz = computed(() => this.organizationService.isNaz());

  // Computed para verificar si el usuario actual es soporte2@blackdogpanama.com
  public canViewTimeDashboard = computed(() => {
    const currentEmployee = this.dashboardStore.currentEmployee();
    return (
      currentEmployee?.work_email?.toLowerCase() ===
      'soporte2@blackdogpanama.com'
    );
  });

  // Computed para verificar si el usuario puede ver el módulo de IT
  // Visible para: desarrolladores y Soporte IT
  public canViewITModule = computed(() => {
    const currentEmployee = this.dashboardStore.currentEmployee();
    const email = currentEmployee?.work_email?.toLowerCase() || '';
    const position = currentEmployee?.position?.name?.toLowerCase() || '';

    // Lista de emails con acceso a IT
    const allowedEmails = [
      'soporte2@blackdogpanama.com',
      'soporte@blackdogpanama.com',
      'desarrollo@blackdogpanama.com',
      'dev@blackdogpanama.com',
      'diego@blackdogpanama.com',
    ];

    // Verificar por email o posición
    const hasAccessByEmail = allowedEmails.some(allowed => email.includes(allowed.replace('@blackdogpanama.com', '')));
    const hasAccessByPosition = position.includes('desarrollador') ||
      position.includes('developer') ||
      position.includes('soporte') ||
      position.includes('it') ||
      position.includes('sistemas');

    return hasAccessByEmail || hasAccessByPosition;
  });

  // Estado de los dropdowns
  public openDropdownId = signal<string | null>(null);

  // API para obtener mensajes sin leer para HR
  public unreadMessagesApi = httpResource<any[]>(() => {
    const url = this.apiUrl.build('rest/v1/complaint_messages', {
      select: 'complaint_id',
      sender_type: 'eq.employee',
      is_read: 'eq.false',
    });
    return {
      url,
      method: 'GET',
    };
  });

  // Contador de mensajes sin leer (únicos por complaint_id)
  public unreadCount = computed(() => {
    const messages = this.unreadMessagesApi.value() || [];
    const uniqueComplaints = new Set(messages.map((m) => m.complaint_id));
    return uniqueComplaints.size;
  });

  public openDropdown(id: string): void {
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
      this.dropdownTimeout = undefined;
    }
    this.openDropdownId.set(id);
  }

  public closeDropdown(): void {
    this.dropdownTimeout = window.setTimeout(() => {
      this.openDropdownId.set(null);
    }, 3000);
  }

  public isDropdownOpen(id: string): boolean {
    return this.openDropdownId() === id;
  }

  public isActiveRoute(route: string): boolean {
    return (
      typeof window !== 'undefined' && window.location.pathname.includes(route)
    );
  }

  public isAnyOrganizacionRouteActive(): boolean {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    return (
      path.includes('employees') ||
      path.includes('organigrama') ||
      path.includes('companies') ||
      path.includes('positions') ||
      path.includes('branches') ||
      path.includes('departments') ||
      path.includes('permissions')
    );
  }

  ngOnInit() {
    // Recargar notificaciones cada 10 segundos
    this.refreshInterval = window.setInterval(() => {
      this.unreadMessagesApi.reload();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
  }
}
