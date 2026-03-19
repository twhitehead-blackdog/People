import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { filter } from 'rxjs/operators';

import { AsyncPipe, CommonModule, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@auth0/auth0-angular';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { ScreenLockComponent } from '../components/screen-lock.component';
import {
  Organization,
  OrganizationService,
} from '../services/organization.service';
import { ScreenLockService } from '../services/screen-lock.service';
import { SupabaseRealtimeService } from '../services/supabase-realtime.service';
import { TestModeService } from '../services/test-mode.service';
import { AuthStore } from '../stores/auth.store';
import { BanksStore } from '../stores/banks.store';
import { BranchesStore } from '../stores/branches.store';
import { CompaniesStore } from '../stores/companies.store';
import { DashboardStore } from '../stores/dashboard.store';
import { DepartmentsStore } from '../stores/departments.store';
import { EmployeesStore } from '../stores/employees.store';
import { PayrollsStore } from '../stores/payrolls.store';
import { PositionsStore } from '../stores/positions.store';
import { SchedulesStore } from '../stores/schedules.store';
import { EmployeePortalComponent } from './employee-portal.component';

import { DogAnimationComponent } from './components/dog.component';
import { PermissionsService } from '../services/permissions.service';
import { DeviceService } from '../services/device.service';
import { NotificationsService } from '../services/notifications.service';
import { NotificationsDropdownComponent } from '../components/notifications-dropdown.component';
import { MobileBottomNavComponent, MobileNavTab } from '../shared/components/mobile-bottom-nav.component';

@Component({
  selector: 'pt-dashboard',
  standalone: true,
  providers: [
    AuthStore,
    DashboardStore,
    MessageService,
    ConfirmationService,
    EmployeesStore,
    BranchesStore,
    CompaniesStore,
    PositionsStore,
    DepartmentsStore,
    SchedulesStore,
    BanksStore,
    PayrollsStore,
  ],
  imports: [
    RouterOutlet,
    ToastModule,
    AccordionModule,
    RippleModule,
    CardModule,
    ConfirmDialogModule,
    Button,
    Avatar,
    AsyncPipe,
    MenuModule,
    EmployeePortalComponent,
    NgClass,
    CommonModule,
    ScreenLockComponent,
    DogAnimationComponent,
    MobileBottomNavComponent,
    NotificationsDropdownComponent,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    @let user = currentUser$ | async;

    @if (device.isDesktop()) {
    <!-- ========== DESKTOP ========== -->
    <!-- Overlay para tablet cuando el menú está abierto -->
    @if (!isCollapsed()) {
    <div
      class="fixed inset-0 bg-black/50 z-[999] lg:hidden"
      (click)="toggleMenu()"
    ></div>
    }
    <div
      class="h-screen flex flex-col overflow-hidden"
      [ngClass]="{ 'naz-theme': isNaz() }"
    >
      <nav
        class="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b border-neutral-700/50 w-full shadow-lg relative z-[1000]"
        [ngClass]="{ 'naz-nav': isNaz() }"
      >
        <!-- Dog animation zone -->
        <div class="absolute bottom-0 left-2 sm:left-4 lg:left-6 w-[280px] h-0 z-[30]">
          <pt-dog-animation></pt-dog-animation>
        </div>

        <!-- Single-row header -->
        <div class="flex items-center h-14 px-3 sm:px-4 lg:px-6 gap-2 min-w-0">
          <!-- Logo -->
          <div class="header-logo relative flex-shrink-0">
            <a (click)="navigateToDefault()" class="flex items-center gap-2 group cursor-pointer">
              <img [src]="logoPath()" class="h-7 transition-transform duration-300 group-hover:scale-105" alt="People" />
            </a>
          </div>

          <!-- Nav items - single row, all dropdowns -->
          <div class="header-menu hidden lg:flex items-center gap-0.5 flex-1 min-w-0">
            <a (click)="navigateTo('launcher')" [class.nav-active]="isLauncherActive()" class="nav-item">
              <i class="pi pi-th-large"></i><span>Inicio</span>
            </a>
            @if(canAccessAdmin()) {
            <div class="relative" (mouseenter)="openDropdown('admin')" (mouseleave)="closeDropdown()">
              <a [class.nav-active]="isAdminActive()" class="nav-item">
                <i class="pi pi-building"></i><span>Administración</span><i class="pi pi-chevron-down nav-caret"></i>
              </a>
              @if(activeDropdown() === 'admin') {
              <div class="dd-menu">
                <div class="dd-menu-inner dd-cols">
                  <div class="dd-col-group">
                    <span class="dd-col-label">Personas</span>
                    <a (click)="navigateAbsolute('admin/employees'); closeDropdown()" class="dd-item"><i class="pi pi-users"></i>Empleados</a>
                    <a (click)="navigateAbsolute('admin/organigrama'); closeDropdown()" class="dd-item"><i class="pi pi-sitemap"></i>Organigrama</a>
                  </div>
                  <div class="dd-col-sep"></div>
                  <div class="dd-col-group">
                    <span class="dd-col-label">Estructura</span>
                    <a (click)="navigateAbsolute('admin/companies'); closeDropdown()" class="dd-item"><i class="pi pi-briefcase"></i>Empresas</a>
                    <a (click)="navigateAbsolute('admin/departments'); closeDropdown()" class="dd-item"><i class="pi pi-table"></i>Departamentos</a>
                    <a (click)="navigateAbsolute('admin/positions'); closeDropdown()" class="dd-item"><i class="pi pi-tag"></i>Puestos</a>
                    <a (click)="navigateAbsolute('admin/branches'); closeDropdown()" class="dd-item"><i class="pi pi-map-marker"></i>Sucursales</a>
                  </div>
                  <div class="dd-col-sep"></div>
                  <div class="dd-col-group">
                    <span class="dd-col-label">Sistema</span>
                    <a (click)="navigateAbsolute('admin/settings'); closeDropdown()" class="dd-item"><i class="pi pi-cog"></i>Ajustes</a>
                    <a (click)="navigateAbsolute('admin/user-management'); closeDropdown()" class="dd-item"><i class="pi pi-user-edit"></i>Usuarios</a>
                    <a (click)="navigateAbsolute('admin/permissions'); closeDropdown()" class="dd-item"><i class="pi pi-shield"></i>Permisos</a>
                    <a (click)="navigateAbsolute('admin/complaints-inbox'); closeDropdown()" class="dd-item"><i class="pi pi-inbox"></i>Quejas</a>
                    <a (click)="navigateAbsolute('admin/job-applications'); closeDropdown()" class="dd-item"><i class="pi pi-file"></i>Solicitudes</a>
                    <a (click)="navigateAbsolute('admin/news'); closeDropdown()" class="dd-item"><i class="pi pi-megaphone"></i>Noticias</a>
                  </div>
                  <div class="dd-col-sep"></div>
                  <div class="dd-col-group">
                    <span class="dd-col-label">RRHH</span>
                    @if(canAccessHome()) {
                    <a (click)="navigateAbsolute('admin/home'); closeDropdown()" class="dd-item"><i class="pi pi-chart-bar"></i>Dashboard RRHH</a>
                    }
                    <a (click)="navigateAbsolute('admin/hr/time-dashboard'); closeDropdown()" class="dd-item"><i class="pi pi-calendar"></i>Tiempo</a>
                    <a (click)="navigateAbsolute('admin/hr/disabilities'); closeDropdown()" class="dd-item"><i class="pi pi-file-edit"></i>Solicitudes RRHH</a>
                    <a (click)="navigateAbsolute('admin/surveys'); closeDropdown()" class="dd-item"><i class="pi pi-comment"></i>Encuestas</a>
                  </div>
                  <div class="dd-col-sep"></div>
                  <div class="dd-col-group">
                    <span class="dd-col-label">Auditoría</span>
                    <a (click)="navigateAbsolute('admin/audit-tasks'); closeDropdown()" class="dd-item"><i class="pi pi-list-check"></i>Tareas de Auditoría</a>
                    <a (click)="navigateAbsolute('admin/performance'); closeDropdown()" class="dd-item"><i class="pi pi-star"></i>Performance 360</a>
                  </div>
                  @if(canAccessCompras()) {
                  <div class="dd-col-sep"></div>
                  <div class="dd-col-group">
                    <span class="dd-col-label">Compras</span>
                    <a (click)="navigateAbsolute('admin/compras'); closeDropdown()" class="dd-item"><i class="pi pi-shopping-cart"></i>Compras</a>
                  </div>
                  }
                </div>
              </div>
              }
            </div>
            }
            @if(canAccessPayroll()) {
            <div class="relative" (mouseenter)="openDropdown('payroll')" (mouseleave)="closeDropdown()">
              <a [class.nav-active]="isPayrollActive()" class="nav-item">
                <i class="pi pi-money-bill"></i><span>Planilla</span><i class="pi pi-chevron-down nav-caret"></i>
              </a>
              @if(activeDropdown() === 'payroll') {
              <div class="dd-menu">
                <div class="dd-menu-inner dd-cols">
                  <div class="dd-col-group">
                    <span class="dd-col-label">Nóminas</span>
                    <a (click)="navigateAbsolute('payroll/payrolls'); closeDropdown()" class="dd-item"><i class="pi pi-money-bill"></i>Planillas</a>
                    <a (click)="navigateAbsolute('payroll/decimo'); closeDropdown()" class="dd-item"><i class="pi pi-calendar"></i>Décimo</a>
                    <a (click)="navigateAbsolute('payroll/vacations'); closeDropdown()" class="dd-item"><i class="pi pi-sun"></i>Vacaciones</a>
                    <a (click)="navigateAbsolute('payroll/liquidation'); closeDropdown()" class="dd-item"><i class="pi pi-file"></i>Liquidación</a>
                  </div>
                  <div class="dd-col-sep"></div>
                  <div class="dd-col-group">
                    <span class="dd-col-label">Configuración</span>
                    <a (click)="navigateAbsolute('payroll/creditors'); closeDropdown()" class="dd-item"><i class="pi pi-users"></i>Acreedores</a>
                    <a (click)="navigateAbsolute('payroll/banks'); closeDropdown()" class="dd-item"><i class="pi pi-building"></i>Bancos</a>
                    <a (click)="navigateAbsolute('payroll/import'); closeDropdown()" class="dd-item"><i class="pi pi-upload"></i>Importar</a>
                    <a (click)="navigateAbsolute('payroll/admin'); closeDropdown()" class="dd-item"><i class="pi pi-cog"></i>Administración</a>
                  </div>
                </div>
              </div>
              }
            </div>
            }
            @if(canAccessTimeManagement()) {
            <div class="relative" (mouseenter)="openDropdown('time')" (mouseleave)="closeDropdown()">
              <a [class.nav-active]="isTimeManagementActive()" class="nav-item">
                <i class="pi pi-calendar"></i><span>Gestión de tiempo</span><i class="pi pi-chevron-down nav-caret"></i>
              </a>
              @if(activeDropdown() === 'time') {
              <div class="dd-menu">
                <div class="dd-menu-inner dd-cols">
                  <div class="dd-col-group">
                    <span class="dd-col-label">Seguimiento</span>
                    <a (click)="navigateAbsolute('time-management/timelogs'); closeDropdown()" class="dd-item"><i class="pi pi-clock"></i>Registros</a>
                    <a (click)="navigateAbsolute('time-management/timetables'); closeDropdown()" class="dd-item"><i class="pi pi-calendar"></i>Horarios</a>
                  </div>
                  <div class="dd-col-sep"></div>
                  <div class="dd-col-group">
                    <span class="dd-col-label">Calendarios</span>
                    <a (click)="navigateAbsolute('time-management/schedules'); closeDropdown()" class="dd-item"><i class="pi pi-th-large"></i>General</a>
                    <a (click)="navigateAbsolute('time-management/vet-schedule'); closeDropdown()" class="dd-item"><i class="pi pi-calendar-plus"></i>Veterinaria</a>
                    <a (click)="navigateAbsolute('time-management/salon-schedule'); closeDropdown()" class="dd-item"><i class="pi pi-calendar-plus"></i>Peluquería</a>
                  </div>
                </div>
              </div>
              }
            </div>
            }
            @if(canAccessServices()) {
            <div class="relative" (mouseenter)="openDropdown('services')" (mouseleave)="closeDropdown()">
              <a [class.nav-active]="isLiveActive()" class="nav-item">
                <i class="pi pi-server"></i><span>Servicios</span><i class="pi pi-chevron-down nav-caret"></i>
              </a>
              @if(activeDropdown() === 'services') {
              <div class="dd-menu">
                <div class="dd-menu-inner">
                  <a (click)="navigateTo('live'); closeDropdown()" class="dd-item" [class.dd-active]="isLiveActive()"><i class="pi pi-objects-column"></i>Asistencia en vivo</a>
                  <a (click)="navigateTo('analytics'); closeDropdown()" class="dd-item"><i class="pi pi-chart-line"></i>Analytics</a>
                </div>
              </div>
              }
            </div>
            }
            @if(canAccessCompras()) {
            <a (click)="navigateAbsolute('admin/compras')" [class.nav-active]="isComprasActive()" class="nav-item">
              <i class="pi pi-shopping-cart"></i><span>Compras</span>
            </a>
            }
            @if(canAccessTimeclock()) {
            <a (click)="navigateTo('timeclock')" [class.nav-active]="isTimeclockActive()" class="nav-item">
              <i class="pi pi-clock"></i><span>Reloj de marcación</span>
            </a>
            }
          </div>

          <!-- Right: notifications + user -->
          <div class="header-user hidden md:flex items-center gap-2">
            @if(user) {
            <div class="relative">
              <button type="button" (click)="toggleNotificationsDropdown()"
                class="relative p-2.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/60 transition-all duration-200 text-white border border-gray-600/50 hover:border-gray-500"
                title="Notificaciones">
                <i class="pi pi-bell text-lg"></i>
                @if (unreadNotificationsCount() > 0) {
                <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-gray-800">
                  {{ unreadNotificationsCount() > 99 ? '99+' : unreadNotificationsCount() }}
                </span>
                }
              </button>
              <pt-notifications-dropdown [isVisible]="showNotificationsDropdown()" [onClose]="closeNotificationsDropdown.bind(this)" />
            </div>
            <p-menu #menu [model]="getMenuItems()" popup [autoZIndex]="true" />
            <div class="flex items-center gap-3 cursor-pointer group px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200" (click)="menu.toggle($event)">
              <div class="relative flex-shrink-0">
                <div class="avatar-container">
                  <p-avatar [image]="user?.picture" shape="circle" size="normal" />
                </div>
                <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
              </div>
              <div class="flex flex-col min-w-0 flex-1">
                <div class="text-sm font-semibold text-white group-hover:text-gray-100 transition-colors truncate">{{ currentEmployeeName() }}</div>
                <div class="text-xs text-gray-400 group-hover:text-gray-300 transition-colors truncate">{{ currentEmployeePosition() }}</div>
              </div>
              <i class="pi pi-chevron-down text-gray-400 group-hover:text-gray-300 transition-colors text-xs flex-shrink-0"></i>
            </div>
            }
          </div>
          <div class="-mr-2 flex lg:hidden">
            <p-button rounded text [icon]="isCollapsed() ? 'pi pi-bars' : 'pi pi-times'" severity="secondary" (onClick)="toggleMenu()" class="text-white hover:bg-gray-700/50 min-w-[44px] min-h-[44px]" />
          </div>
        </div>

        <!-- Tablet/mobile hamburger panel -->
        <div
          class="lg:hidden border-t border-neutral-700/50 bg-neutral-800/95 backdrop-blur-sm absolute top-full left-0 right-0 max-h-[calc(100vh-3.5rem)] overflow-y-auto z-[1001] shadow-2xl"
          [class.hidden]="isCollapsed()"
        >
          <div class="space-y-1 px-2 pt-2 pb-3 sm:px-3">
            <a (click)="navigateTo('launcher'); toggleMenu()" [class.bg-gray-700]="isLauncherActive()" [class.text-white]="isLauncherActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation">
              <i class="pi pi-th-large text-lg"></i><span>Inicio</span>
            </a>
            @if(canAccessAdmin()) {
            <a (click)="navigateTo('admin'); toggleMenu()" [class.bg-gray-700]="isAdminActive()" [class.text-white]="isAdminActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation">
              <i class="pi pi-building text-lg"></i><span>Administración</span>
            </a>
            }
            @if(canAccessTimeManagement()) {
            <a (click)="navigateTo('time-management'); toggleMenu()" [class.bg-gray-700]="isTimeManagementActive()" [class.text-white]="isTimeManagementActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation">
              <i class="pi pi-calendar text-lg"></i><span>Gestión de tiempo</span>
            </a>
            }
            @if(canAccessPayroll()) {
            <a (click)="navigateTo('payroll'); toggleMenu()" [class.bg-gray-700]="isPayrollActive()" [class.text-white]="isPayrollActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation">
              <i class="pi pi-money-bill text-lg"></i><span>Planilla</span>
            </a>
            }
            @if(canAccessServices()) {
            <a (click)="navigateTo('live'); toggleMenu()" [class.bg-gray-700]="isLiveActive()" [class.text-white]="isLiveActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation">
              <i class="pi pi-objects-column text-lg"></i><span>Asistencia en vivo</span>
            </a>
            }
            @if(canAccessCompras()) {
            <a (click)="navigateAbsolute('admin/compras'); toggleMenu()" [class.bg-gray-700]="isComprasActive()" [class.text-white]="isComprasActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation">
              <i class="pi pi-shopping-cart text-lg"></i><span>Compras</span>
            </a>
            }
            @if(canAccessTimeclock()) {
            <a (click)="navigateTo('timeclock'); toggleMenu()" [class.bg-gray-700]="isTimeclockActive()" [class.text-white]="isTimeclockActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation">
              <i class="pi pi-clock text-lg"></i><span>Reloj de marcación</span>
            </a>
            }
          </div>
          @if(user) {
          <div class="border-t border-gray-700/50 pt-4 pb-3 px-5">
            <div class="relative mb-3 flex items-center gap-3">
              <button type="button" (click)="toggleNotificationsDropdown()"
                class="relative p-2.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/60 transition-all duration-200 text-white border border-gray-600/50"
                title="Notificaciones">
                <i class="pi pi-bell text-lg"></i>
                @if (unreadNotificationsCount() > 0) {
                <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-gray-800">
                  {{ unreadNotificationsCount() > 99 ? '99+' : unreadNotificationsCount() }}
                </span>
                }
              </button>
              <span class="text-sm text-gray-300">Notificaciones</span>
              <pt-notifications-dropdown [isVisible]="showNotificationsDropdown()" [onClose]="closeNotificationsDropdown.bind(this)" />
            </div>
            <p-menu #mobileMenu [model]="getMenuItems()" popup [appendTo]="'body'" />
            <div class="flex items-center gap-3 cursor-pointer group px-2 py-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200 touch-manipulation"
              (click)="$event.stopPropagation(); mobileMenu.toggle($event)">
              <div class="relative flex-shrink-0">
                <div class="avatar-container">
                  <p-avatar [image]="user.picture" shape="circle" size="normal" />
                </div>
                <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-base font-semibold text-white truncate">{{ currentEmployeeName() }}</div>
                <div class="text-sm text-gray-400 truncate">{{ currentEmployeePosition() }}</div>
              </div>
              <i class="pi pi-chevron-down text-gray-400 group-hover:text-gray-300 transition-colors text-sm flex-shrink-0"></i>
            </div>
          </div>
          }
        </div>
      </nav>
      <!-- Banner de modo de prueba (solo visible cuando no está en modo admin) -->
      @if(isSupportUser() && isTestModeActive() && !isAdminMode()) {
      <div
        class="bg-yellow-500/20 border-b border-yellow-500/50 px-4 py-2 flex items-center justify-between"
      >
        <div class="flex items-center gap-2 text-yellow-300">
          <i class="pi pi-info-circle"></i>
          <span class="text-sm font-medium">
            Modo de Prueba: <strong>{{ getModeLabel() }}</strong>
          </span>
        </div>
        <button
          (click)="setTestMode('admin')"
          class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black text-sm font-semibold rounded transition-colors flex items-center gap-2"
        >
          <i class="pi pi-arrow-left text-xs"></i>
          Volver a Admin
        </button>
      </div>
      }
      <div class="flex-1 overflow-y-auto">
        @if(showEmployeePortalView()) {
        <pt-employee-portal />
        } @else {
        <router-outlet />
        }
      </div>
      <pt-screen-lock></pt-screen-lock>
    </div>

    } @else {
    <!-- ========== MOBILE ========== -->
    <div
      class="flex flex-col overflow-hidden mobile-shell"
      style="height: 100dvh"
      [ngClass]="{ 'naz-theme': isNaz() }"
    >
      <!-- Mobile top bar -->
      <nav class="bg-neutral-900 w-full z-[1000] flex-shrink-0">
        <div class="flex items-center justify-between h-[52px] px-3">
          <div class="flex items-center gap-1">
            @if (mobileBackTarget()) {
            <button
              (click)="router.navigateByUrl(mobileBackTarget()!)"
              class="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800 transition-colors"
              style="-webkit-tap-highlight-color: transparent;"
            >
              <i class="pi pi-arrow-left text-base"></i>
            </button>
            }
            <a (click)="navigateToDefault()" class="flex items-center cursor-pointer" style="-webkit-tap-highlight-color: transparent;">
              <img [src]="logoPath()" class="h-7" alt="People" />
            </a>
          </div>
          <div class="flex items-center gap-2">
            @if(user) {
            <p-menu
              #mobileMenuTop
              [model]="getMenuItems()"
              popup
              [appendTo]="'body'"
            />
            <button
              class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-neutral-800/60 border border-neutral-700/40"
              style="-webkit-tap-highlight-color: transparent;"
              (click)="mobileMenuTop.toggle($event)"
            >
              <div class="relative flex-shrink-0">
                <div class="w-7 h-7 rounded-full overflow-hidden border border-gray-600/40 flex items-center justify-center">
                  <img [src]="user.picture" class="w-full h-full object-cover rounded-full" alt="" referrerpolicy="no-referrer" />
                </div>
                <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-neutral-900"></div>
              </div>
              <i class="pi pi-chevron-down text-gray-400 text-[10px]"></i>
            </button>
            }
          </div>
        </div>
      </nav>

      <!-- Test mode banner -->
      @if(isSupportUser() && isTestModeActive() && !isAdminMode()) {
      <div class="bg-yellow-500/20 border-b border-yellow-500/50 px-3 py-1.5 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-1.5 text-yellow-300">
          <i class="pi pi-info-circle text-xs"></i>
          <span class="text-xs font-medium">Prueba: <strong>{{ getModeLabel() }}</strong></span>
        </div>
        <button
          (click)="setTestMode('admin')"
          class="px-2 py-0.5 bg-yellow-500 text-black text-xs font-semibold rounded"
          style="-webkit-tap-highlight-color: transparent;"
        >
          Admin
        </button>
      </div>
      }

      <!-- Content area -->
      <div class="flex-1 min-h-0 overflow-y-auto pb-[68px]">
        @if(showEmployeePortalView()) {
        <pt-employee-portal />
        } @else {
        <router-outlet />
        }
      </div>

      <!-- Bottom nav fixed at bottom -->
      <pt-mobile-bottom-nav
        [tabs]="adminMobileTabs()"
        [activeTab]="activeMobileAdminTab()"
        (tabChange)="onMobileAdminTabChange($event)"
      />
      <pt-screen-lock></pt-screen-lock>
    </div>
    }
  `,
  styles: `
      .mobile-content-padded {
        padding-bottom: 72px;
      }

      /* ── Desktop nav items ── */
      .nav-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 13px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        color: rgba(255,255,255,0.65);
        cursor: pointer;
        white-space: nowrap;
        transition: color 0.15s, background 0.15s;
        user-select: none;
        line-height: 1;
      }
      .nav-item i:first-child { font-size: 14px; flex-shrink: 0; }
      .nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.95); }
      .nav-active { background: rgba(251,191,36,0.12) !important; color: #fbbf24 !important; }
      .nav-caret { font-size: 9px !important; opacity: 0.45; margin-left: 1px; }

      /* ── Dropdown menus ── */
      /* padding-top crea un "puente" invisible para que el hover no se pierda entre el trigger y el panel */
      .dd-menu {
        position: absolute;
        top: 100%;
        left: 0;
        padding-top: 8px;
        min-width: 190px;
        z-index: 1002;
      }
      .dd-menu-inner {
        background: #171717;
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 8px;
        padding: 4px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      }
      .dd-grid .dd-menu-inner {
        display: grid;
        grid-template-columns: 1fr 1fr;
        min-width: 340px;
      }
      .dd-item {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 8px 11px;
        border-radius: 5px;
        color: rgba(255,255,255,0.68);
        font-size: 13px;
        cursor: pointer;
        transition: background 0.12s, color 0.12s;
        white-space: nowrap;
      }
      .dd-item i { font-size: 12px; opacity: 0.55; flex-shrink: 0; }
      .dd-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
      .dd-item:hover i { opacity: 0.8; }
      .dd-active { color: #fbbf24 !important; }
      /* ── Dropdown column groups ── */
      .dd-cols { display: flex; align-items: flex-start; gap: 0; }
      .dd-col-group { display: flex; flex-direction: column; min-width: 130px; padding: 4px; }
      .dd-col-label {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: rgba(255,255,255,0.22);
        padding: 5px 10px 3px;
        white-space: nowrap;
      }
      .dd-col-sep { width: 1px; background: rgba(255,255,255,0.06); margin: 6px 0; align-self: stretch; }
      
      ::ng-deep .p-menu {
        border-radius: 0.5rem !important;
        padding: 0.5rem !important;
        z-index: 1002 !important;
        transition: all 0.3s ease !important;
      }

      :host-context(html.dark) ::ng-deep .p-menu {
        background: #1f2937 !important;
        border: 1px solid rgba(251, 191, 36, 0.2) !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
      }

      :host-context(html.light) ::ng-deep .p-menu {
        background: #ffffff !important;
        border: 1px solid rgba(251, 191, 36, 0.3) !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
      }

      /* Menú popup con z-index alto en móvil/tablet */
      @media (max-width: 1023px) {
        ::ng-deep .p-menu {
          z-index: 1002 !important;
        }
      }
      
      ::ng-deep .p-menu .p-menuitem-link {
        padding: 0.75rem 1rem !important;
        border-radius: 0.375rem !important;
        transition: all 0.2s ease !important;
      }
      
      ::ng-deep .p-menu .p-menuitem-link:hover {
        background: rgba(251, 191, 36, 0.1) !important;
      }
      
      :host-context(html.dark) ::ng-deep .p-menu .p-menuitem-link .p-menuitem-text {
        color: #e5e7eb !important;
      }

      :host-context(html.dark) ::ng-deep .p-menu .p-menuitem-link:hover .p-menuitem-text {
        color: #ffffff !important;
      }

      :host-context(html.light) ::ng-deep .p-menu .p-menuitem-link .p-menuitem-text {
        color: #1f2937 !important;
      }

      :host-context(html.light) ::ng-deep .p-menu .p-menuitem-link:hover .p-menuitem-text {
        color: #000000 !important;
      }
      
      ::ng-deep .p-menu .p-menuitem-link .p-menuitem-icon {
        color: #fbbf24 !important;
      }

      /* Avatar Container Styles */
      .avatar-container {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid rgba(107, 114, 128, 0.6);
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .avatar-container:hover {
        border-color: rgba(156, 163, 175, 0.4);
      }

      ::ng-deep .avatar-container .p-avatar {
        width: 100% !important;
        height: 100% !important;
      }

      ::ng-deep .avatar-container .p-avatar img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover;
        border-radius: 50%;
      }

      ::ng-deep .avatar-container .p-avatar-circle {
        border-radius: 50% !important;
      }

      /* Header layout optimizations */
      .header-container {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 0.5rem;
      }

      @media (min-width: 1024px) {
        .header-container {
          gap: 1rem;
        }
      }

      .header-logo {
        flex-shrink: 0;
        margin-right: 0.75rem;
      }

      .header-menu {
        flex: 1;
        min-width: 0;
        overflow: visible;
        justify-content: center;
      }

      .header-user {
        flex-shrink: 0;
        margin-left: 0.5rem;
      }

      /* Touch-friendly: botones y enlaces grandes en móvil/tablet */
      @media (max-width: 1023px) {
        .header-container a,
        .header-container button {
          min-height: 44px;
          display: flex;
          align-items: center;
        }

        nav {
          position: relative;
        }

        nav + div {
          position: relative;
          z-index: 1;
        }
      }

      /* Overlay del menú desplegable */
      @media (max-width: 1023px) {
        .fixed.inset-0.bg-black\\/50 {
          animation: fadeIn 0.2s ease-in-out;
        }
      }

      /* En desktop (lg), enlaces del menú en una sola línea cuando hay espacio */
      @media (min-width: 1024px) {
        .header-menu .nav-link {
          white-space: nowrap;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      /* Tema Naz - Modo Oscuro */
      :host-context(html.dark) :host-context(.naz-theme) nav,
      :host-context(html.dark) .naz-theme nav,
      :host-context(html.dark) nav.naz-nav {
        background: #000000 !important;
        border-bottom-color: rgba(255, 255, 255, 0.10) !important;
      }

      /* Tema Naz - Modo Claro */
      :host-context(html.light) :host-context(.naz-theme) nav,
      :host-context(html.light) .naz-theme nav,
      :host-context(html.light) nav.naz-nav {
        background: #ffffff !important;
        border-bottom-color: rgba(0, 0, 0, 0.10) !important;
      }

      :host-context(.naz-theme) .header-menu a,
      .naz-theme .header-menu a {
        color: #C6C2BF !important;
      }

      :host-context(.naz-theme) .header-menu a:hover,
      .naz-theme .header-menu a:hover {
        color: #FFFFFF !important;
        background: rgba(255, 255, 255, 0.10) !important;
      }

      :host-context(.naz-theme) .nav-active,
      .naz-theme .nav-active {
        background: rgba(255,255,255,0.1) !important;
        color: #FFFFFF !important;
      }

      :host-context(.naz-theme) .header-user,
      .naz-theme .header-user {
        color: #FFFFFF !important;
      }

      :host-context(.naz-theme) .header-user .text-gray-400,
      .naz-theme .header-user .text-gray-400 {
        color: #C6C2BF !important;
      }

      :host-context(.naz-theme) .md\\:hidden a,
      .naz-theme .md\\:hidden a,
      :host-context(.naz-theme) [class*="lg:hidden"] a,
      .naz-theme [class*="lg:hidden"] a {
        color: #C6C2BF !important;
      }

      :host-context(.naz-theme) .md\\:hidden a:hover,
      .naz-theme .md\\:hidden a:hover,
      :host-context(.naz-theme) [class*="lg:hidden"] a:hover,
      .naz-theme [class*="lg:hidden"] a:hover {
        color: #FFFFFF !important;
        background: rgba(255, 255, 255, 0.10) !important;
      }

      :host-context(.naz-theme) .md\\:hidden a.bg-gray-700,
      .naz-theme .md\\:hidden a.bg-gray-700,
      :host-context(.naz-theme) [class*="lg:hidden"] a.bg-gray-700,
      .naz-theme [class*="lg:hidden"] a.bg-gray-700 {
        background: #0D0D0D !important;
        color: #FFFFFF !important;
      }

      :host-context(.naz-theme) ::ng-deep .p-menu,
      .naz-theme ::ng-deep .p-menu {
        background: #0D0D0D !important;
        border: 1px solid rgba(255, 255, 255, 0.10) !important;
      }

      :host-context(.naz-theme) ::ng-deep .p-menu .p-menuitem-link,
      .naz-theme ::ng-deep .p-menu .p-menuitem-link {
        color: #C6C2BF !important;
      }

      :host-context(.naz-theme) ::ng-deep .p-menu .p-menuitem-link:hover,
      .naz-theme ::ng-deep .p-menu .p-menuitem-link:hover {
        background: rgba(255, 255, 255, 0.10) !important;
        color: #FFFFFF !important;
      }

      :host-context(.naz-theme) ::ng-deep .p-menu .p-menuitem-link .p-menuitem-icon,
      .naz-theme ::ng-deep .p-menu .p-menuitem-link .p-menuitem-icon {
        color: #FFFFFF !important;
      }
      `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  public device = inject(DeviceService);
  public isCollapsed = signal(true);
  public store = inject(DashboardStore);
  public auth = inject(AuthService);
  public router = inject(Router);
  public route = inject(ActivatedRoute);
  public currentRoute = signal('');
  public currentUrl = signal('');
  public showEmployeePortalView = signal(false);
  public organizationService = inject(OrganizationService);
  private realtimeService = inject(SupabaseRealtimeService);
  public testModeService = inject(TestModeService);
  public http = inject(HttpClient);
  public branchesStore = inject(BranchesStore);
  public employeesStore = inject(EmployeesStore);
  public positionsStore = inject(PositionsStore);
  public departmentsStore = inject(DepartmentsStore);
  public companiesStore = inject(CompaniesStore);
  public schedulesStore = inject(SchedulesStore);
  public banksStore = inject(BanksStore);
  public payrollsStore = inject(PayrollsStore);
  public screenLockService = inject(ScreenLockService);
  private permissionsService = inject(PermissionsService);
  private injector = inject(Injector);
  public notificationsService = inject(NotificationsService);
  public showNotificationsDropdown = signal(false);
  public unreadNotificationsCount = computed(() => this.notificationsService.unreadCount());

  // Signal para la IP actual
  private currentIP = signal<string | null>(null);

  // Computed para verificar acceso a módulos de frontend
  public canAccessHome = computed(() =>
    this.permissionsService.canAccessModule('home')
  );
  public canAccessAdmin = computed(() =>
    this.permissionsService.canAccessModule('admin')
  );
  public canAccessTimeManagement = computed(() =>
    this.permissionsService.canAccessModule('time_management')
  );
  public canAccessPayroll = computed(() =>
    this.permissionsService.canAccessModule('payroll')
  );
  public canAccessTimeclock = computed(() =>
    this.permissionsService.canAccessModule('timeclock')
  );
  public canAccessBranchManager = computed(() =>
    this.permissionsService.canAccessModule('branch_manager')
  );
  public canAccessServices = computed(() =>
    this.permissionsService.canAccessModule('services')
  );
  public canAccessCompras = computed(() =>
    this.permissionsService.canAccessModule('compras')
  );
  public canAccessAnalytics = computed(() =>
    this.permissionsService.canAccessSubModule('services', 'analytics_access')
  );

  // Sub-module access computeds (used by dropdown items)
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
    device_inventory: this.permissionsService.canAccessSubModule('admin', 'device_inventory'),
    audit_tasks: this.permissionsService.canAccessSubModule('admin', 'audit_tasks'),
  }));
  public hrSubs = computed(() => ({
    time_dashboard: this.permissionsService.canAccessSubModule('hr', 'hr_time_dashboard'),
    disabilities: this.permissionsService.canAccessSubModule('hr', 'hr_disabilities'),
    surveys: this.permissionsService.canAccessSubModule('hr', 'hr_surveys'),
  }));
  public canAccessPerformance = computed(() =>
    this.permissionsService.canAccessModule('performance')
  );
  public payrollSubs = computed(() => ({
    payrolls: this.permissionsService.canAccessSubModule('payroll', 'payrolls'),
    creditors: this.permissionsService.canAccessSubModule('payroll', 'creditors'),
    banks: this.permissionsService.canAccessSubModule('payroll', 'banks'),
    payroll_admin: this.permissionsService.canAccessSubModule('payroll', 'payroll_admin'),
    payroll_import: this.permissionsService.canAccessSubModule('payroll', 'payroll_import'),
  }));
  public tmSubs = computed(() => ({
    timelogs: this.permissionsService.canAccessSubModule('time_management', 'timelogs'),
    timetables: this.permissionsService.canAccessSubModule('time_management', 'timetables'),
    schedules: this.permissionsService.canAccessSubModule('time_management', 'schedules'),
    vet_schedule: this.permissionsService.canAccessSubModule('time_management', 'vet_schedule'),
    salon_schedule: this.permissionsService.canAccessSubModule('time_management', 'salon_schedule'),
  }));

  // Mobile admin bottom nav tabs (computed based on permissions)
  public adminMobileTabs = computed<MobileNavTab[]>(() => {
    const tabs: MobileNavTab[] = [
      { id: 'launcher', label: 'Inicio', icon: 'pi pi-th-large' },
    ];
    if (this.canAccessAdmin()) {
      tabs.push({ id: 'admin', label: 'Admin', icon: 'pi pi-building' });
    }
    if (this.canAccessTimeManagement()) {
      tabs.push({ id: 'time-management', label: 'Tiempo', icon: 'pi pi-calendar' });
    }
    if (this.canAccessPayroll()) {
      tabs.push({ id: 'payroll', label: 'Nómina', icon: 'pi pi-money-bill' });
    }
    if (this.canAccessTimeclock()) {
      tabs.push({ id: 'timeclock', label: 'Reloj', icon: 'pi pi-clock' });
    }
    if (this.canAccessAnalytics()) {
      tabs.push({ id: 'analytics', label: 'Analítica', icon: 'pi pi-chart-bar' });
    }
    return tabs;
  });

  public activeMobileAdminTab = computed(() => {
    const route = this.currentRoute();
    return route || 'home';
  });

  // Computed para verificar si es Naz
  public isNaz = computed(() => this.organizationService.isNaz());

  // Logo dinámico según organización
  public logoPath = computed(() => {
    return this.isNaz() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png';
  });

  // Verificar si el usuario es soporte2@blackdogpanama.com
  // Memoized to avoid recalculation
  public isSupportUser = computed(() => {
    const employee = this.store.currentEmployee();
    if (!employee) return false;
    const email = employee.work_email?.toLowerCase() || '';
    return email === 'soporte2@blackdogpanama.com';
  });

  // Computed para el modo de prueba actual
  public currentTestMode = computed(() => this.testModeService.currentMode);
  public isTestModeActive = computed(() =>
    this.testModeService.isTestModeActive()
  );
  public isAdminMode = computed(() => this.testModeService.isAdminMode());
  public isGerenteMode = computed(() => this.testModeService.isGerenteMode());
  public isEmpleadoMode = computed(() => this.testModeService.isEmpleadoMode());

  // Método para cambiar el modo de prueba
  public setTestMode(mode: 'admin' | 'gerente' | 'empleado' | null): void {
    this.testModeService.setMode(mode);
    // Invalidar cache del guard para que se recalculen los permisos
    if (typeof window !== 'undefined') {
      const employee = this.store.currentEmployee();
      if (employee?.work_email) {
        // Forzar recarga del empleado actual para actualizar permisos
        this.store.auth.getCurrentEmployee();
        // Redirigir según el modo
        if (mode === 'empleado') {
          this.router.navigate(['/employee-portal']);
        } else if (mode === 'gerente') {
          this.router.navigate(['/time-management']);
        } else if (mode === 'admin' || mode === null) {
          this.router.navigate(['/launcher']);
        }
      }
    }
  }

  // Método para obtener la etiqueta del modo actual
  public getModeLabel(): string {
    const mode = this.currentTestMode();
    switch (mode) {
      case 'admin':
        return 'Admin';
      case 'gerente':
        return 'Gerente';
      case 'empleado':
        return 'Empleado';
      default:
        return 'Admin';
    }
  }

  // Memoized employee name to avoid multiple store calls
  public currentEmployeeName = computed(() => {
    const employee = this.store.currentEmployee();
    if (!employee) return '';
    return `${employee.first_name || ''} ${employee.father_name || ''}`.trim();
  });

  // Memoized employee position to avoid multiple store calls
  public currentEmployeePosition = computed(() => {
    const employee = this.store.currentEmployee();
    return employee?.position?.name || 'Sin cargo';
  });

  // Observable para obtener el usuario de Auth0
  public currentUser$ = this.auth.user$;

  // Determinar si se puede cambiar la organización (solo para soporte2@blackdogpanama.com o si el easter egg está activado)
  public canChangeOrganization = computed(() => {
    // Verificar si el easter egg está activado
    if (typeof window !== 'undefined' && window.localStorage) {
      const easterEggActivated = window.localStorage.getItem(
        'easter_egg_activated'
      );
      if (easterEggActivated === 'true') {
        return true;
      }
    }

    // Solo soporte2@blackdogpanama.com puede cambiar de organización
    return this.isSupportUser();
  });

  // Track de la organización anterior para detectar cambios
  private previousOrganization: Organization | null = null;

  constructor() {
    // Inicializar notificaciones cuando cambia el empleado actual
    effect(() => {
      const employeeId = this.store.currentEmployee()?.id;
      if (employeeId) {
        this.notificationsService.setCurrentEmployeeId(employeeId);
      }
    });

    // Obtener IP actual al inicializar
    this.fetchCurrentIP();

    // Inicializar organización anterior
    this.previousOrganization = this.organizationService.currentOrganization;

    // Recargar datos cuando cambia la organización
    effect(() => {
      const currentOrg = this.organizationService.currentOrganization;
      const currentCompanyId = this.organizationService.getCurrentCompanyId();

      // Solo recargar si el company_id está listo, hay un cambio real y no es la primera vez
      if (
        this.organizationService.companyIdsReady() &&
        currentCompanyId &&
        this.previousOrganization !== null &&
        this.previousOrganization !== currentOrg
      ) {
        // Recargar todos los stores
        try {
          this.employeesStore.reloadItems();
          this.branchesStore.reloadItems();
          this.positionsStore.reloadItems();
          this.departmentsStore.reloadItems();
          this.companiesStore.reloadItems();
          this.schedulesStore.reloadItems();
          this.banksStore.reloadItems();
          this.payrollsStore.reloadItems();

          // Recargar empleado actual
          this.store.auth.getCurrentEmployee();

          // Actualizar organización anterior
          this.previousOrganization = currentOrg;
        } catch (error) {
          // Error al recargar stores - silencioso
        }
      } else if (this.previousOrganization === null) {
        // Primera vez, solo guardar la organización actual
        this.previousOrganization = currentOrg;
      }
    });

    // La redirección se maneja en el guard para evitar conflictos de navegación
    // Track current route for active state
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        const segments = url.split('/').filter((s: string) => s);

        // Detectar la ruta principal: buscar si alguno de los segmentos principales está presente
        const mainRoutes = [
          'launcher',
          'home',
          'admin',
          'payroll',
          'time-management',
          'timeclock',
          'branch-manager',
          'analytics',
          'live',
          'my-portal',
        ];
        let route = 'launcher'; // default

        // Buscar la primera ruta principal que aparezca en los segmentos
        for (const segment of segments) {
          if (mainRoutes.includes(segment)) {
            route = segment;
            break;
          }
        }

        // Si no hay segmentos o no se encontró una ruta principal, usar 'home'
        if (segments.length === 0) {
          route = 'home';
        }

        this.currentRoute.set(route);
        this.currentUrl.set(url);
      });

    // Set initial route
    const url = this.router.url;
    const segments = url.split('/').filter((s: string) => s);
    const mainRoutes = [
      'home',
      'admin',
      'payroll',
      'time-management',
      'timeclock',
      'branch-manager',
    ];
    let route = 'home'; // default

    // Buscar la primera ruta principal que aparezca en los segmentos
    for (const segment of segments) {
      if (mainRoutes.includes(segment)) {
        route = segment;
        break;
      }
    }

    // Si no hay segmentos, usar 'home'
    if (segments.length === 0) {
      route = 'home';
    }

    this.currentRoute.set(route);
    this.currentUrl.set(url);

    // Sincronizar empleado con ScreenLockService para persistencia tras reload
    effect(() => {
      const employee = this.store.currentEmployee();
      if (employee && this.screenLockService.isEnabled()) {
        this.screenLockService.setCurrentEmployee(employee);
      }
    });
  }

  navigateTo(route: string) {
    // Navigate relative to the current activated route (which is the dashboard component)
    this.router.navigate([route], { relativeTo: this.route });
  }

  navigateAbsolute(path: string) {
    this.router.navigateByUrl('/' + path);
  }

  navigateToDefault() {
    this.navigateTo('launcher');
  }

  onMobileAdminTabChange(tabId: string) {
    this.navigateAbsolute(tabId);
  }

  // Computed signals para rutas activas - se actualizan solo cuando cambia la URL
  // Usan currentRoute signal que se actualiza en el evento NavigationEnd
  public isLauncherActive = computed(() => {
    const route = this.currentRoute();
    return route === 'launcher' || route === '';
  });

  public mobileBackTarget = computed((): string | null => {
    const url = this.currentUrl();
    const parts = url.split('/').filter(s => s && s !== '');
    if (parts.length <= 1) return null;
    const module = parts[0];
    const sub = parts.slice(1).join('/');
    if (sub === 'hub') return '/launcher';
    const hubModules = ['admin', 'payroll', 'time-management'];
    if (hubModules.includes(module)) return '/' + module;
    return null;
  });

  public isAdminActive = computed(() => {
    const route = this.currentRoute();
    return route === 'admin';
  });

  public isPayrollActive = computed(() => {
    const route = this.currentRoute();
    return route === 'payroll';
  });

  public isTimeManagementActive = computed(() => {
    const route = this.currentRoute();
    return route === 'time-management';
  });

  public isTimeclockActive = computed(() => {
    const route = this.currentRoute();
    return route === 'timeclock';
  });

  public isBranchManagerActive = computed(() => {
    const route = this.currentRoute();
    return route === 'branch-manager';
  });

  public isLiveActive = computed(() => {
    const route = this.currentRoute();
    return route === 'live';
  });

  public isComprasActive = computed(() => {
    const url = this.router.url;
    return url.includes('/admin/compras');
  });

  public activeDropdown = signal<string | null>(null);

  public openDropdown(name: string) {
    this.activeDropdown.set(name);
  }

  public closeDropdown() {
    this.activeDropdown.set(null);
  }

  public isUserManagementActive = computed(() => {
    const url = typeof window !== 'undefined' ? window.location.pathname : '';
    return url.includes('/admin/user-management');
  });

  // Método legacy para compatibilidad (ahora usa computed signals internamente)
  isActiveRoute(route: string): boolean {
    switch (route) {
      case 'home':
        return this.isLauncherActive();
      case 'admin':
        return this.isAdminActive();
      case 'payroll':
        return this.isPayrollActive();
      case 'time-management':
        return this.isTimeManagementActive();
      case 'timeclock':
        return this.isTimeclockActive();
      case 'branch-manager':
        return this.isBranchManagerActive();
      default:
        return false;
    }
  }

  public items = computed<MenuItem[]>(() => {
    const isSupport = this.isSupportUser();
    const hasDashboardAccess = this.store.hasDashboardAccess();
    const isAdmin = this.store.isAdmin();
    const isScheduleAdmin = this.store.isScheduleAdmin();
    const hasTimeManagementAccess = this.store.hasTimeManagementAccess();
    const currentEmployee = this.store.currentEmployee();

    const items: MenuItem[] = [
      {
        label: 'Mi Portal',
        icon: 'pi pi-user',
        command: () => this.router.navigate(['/employee-portal']),
      },
    ];

    // Agregar Gestión de Tienda para admins y usuarios con acceso a gestión de tiempo
    const canBranchManager = this.canAccessBranchManager();
    if ((isAdmin || hasTimeManagementAccess) && canBranchManager) {
      items.push({
        label: 'Gestión de Tienda',
        icon: 'pi pi-shop',
        command: () => {
          this.navigateTo('branch-manager');
        },
      });
    }

    // Agregar opción de bloqueo de pantalla para Gerente de Tienda y Admins
    // También permitir en modo gerente (modo de prueba)
    const canUseScreenLock =
      currentEmployee &&
      (this.screenLockService.canUseScreenLock(currentEmployee) ||
        this.isGerenteMode());
    if (canUseScreenLock) {
      if (this.screenLockService.isEnabled()) {
        // Si está habilitado, mostrar opción de bloquear ahora y de desactivar
        items.push({
          label: 'Bloquear ahora',
          icon: 'pi pi-lock',
          command: () => {
            this.screenLockService.lockScreen();
          },
        });
        items.push({
          label: 'Desactivar Bloqueo Automático',
          icon: 'pi pi-lock-open',
          command: () => {
            this.screenLockService.disable();
          },
        });
      } else {
        // Si está deshabilitado, mostrar solo opción de activar
        items.push({
          label: 'Activar Bloqueo de Pantalla',
          icon: 'pi pi-lock',
          command: () => {
            this.screenLockService.enableAndLock(currentEmployee, 15);
          },
        });
      }
    }

    // Agregar selector de modo de prueba solo para soporte2@blackdogpanama.com
    if (isSupport) {
      const currentMode = this.currentTestMode();
      const modeLabel = this.getModeLabel();

      // Separador antes del selector de modo
      items.push({
        separator: true,
      });

      // Título del selector
      items.push({
        label: 'Modo de Prueba',
        icon: 'pi pi-cog',
        disabled: true,
      });

      // Opciones de modo
      items.push({
        label: `Admin ${
          currentMode === 'admin' || currentMode === null ? '✓' : ''
        }`,
        icon: 'pi pi-shield',
        command: () => {
          this.setTestMode('admin');
        },
      });

      items.push({
        label: `Gerente ${currentMode === 'gerente' ? '✓' : ''}`,
        icon: 'pi pi-user-edit',
        command: () => {
          this.setTestMode('gerente');
        },
      });

      items.push({
        label: `Empleado ${currentMode === 'empleado' ? '✓' : ''}`,
        icon: 'pi pi-user',
        command: () => {
          this.setTestMode('empleado');
        },
      });

      // Botón rápido para volver a admin si no está en modo admin
      if (currentMode !== 'admin' && currentMode !== null) {
        items.push({
          separator: true,
        });
        items.push({
          label: 'Volver a Admin',
          icon: 'pi pi-arrow-left',
          styleClass: 'text-yellow-400',
          command: () => {
            this.setTestMode('admin');
          },
        });
      }

      // Separador después del selector
      items.push({
        separator: true,
      });
    }

    items.push(
      {
        separator: true,
      },
      {
        label: 'Cerrar sesion',
        icon: 'pi pi-sign-out',
        command: () => {
          // Desconectar Supabase Realtime antes de cerrar sesión
          this.realtimeService.disconnectAll();

          // Limpiar selección de organización antes de cerrar sesión
          this.organizationService.clearOrganization();

          // Cerrar sesión con Auth0
          this.auth.logout();
        },
      }
    );

    return items;
  });

  // Método para obtener items del menú (fuerza recálculo cada vez)
  public getMenuItems(): MenuItem[] {
    const items = this.items();
    return items;
  }

  async toggleMenu() {
    this.isCollapsed.update((value) => !value);
  }

  public toggleNotificationsDropdown(): void {
    this.showNotificationsDropdown.update((v) => !v);
  }

  public closeNotificationsDropdown(): void {
    this.showNotificationsDropdown.set(false);
  }

  toggleCompany(companyId: string | null) {
    this.store.toggleCompany(companyId);
  }

  /**
   * Obtiene la IP actual del cliente
   */
  private fetchCurrentIP(): void {
    // Intentar obtener IP desde el servidor
    this.http.get<{ ip: string }>('/api/client-ip').subscribe({
      next: (response) => {
        if (response?.ip) {
          this.currentIP.set(response.ip.trim());
        }
      },
      error: (err) => {
        // Silenciar errores de consola para este endpoint no crítico
        console.debug(
          '[Dashboard] Error obteniendo IP del cliente, usando fallback:',
          err?.message
        );

        // Intentar obtener IP vía WebRTC como fallback
        this.getIPViaWebRTC()
          .then((ip) => {
            this.currentIP.set(ip);
          })
          .catch(() => {
            // Si todo falla, usar localhost como fallback
            this.currentIP.set('127.0.0.1');
          });
      },
    });
  }

  /**
   * Obtiene IP vía WebRTC (fallback)
   */
  private getIPViaWebRTC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const RTCPeerConnection =
        (window as any).RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;

      if (!RTCPeerConnection) {
        reject(new Error('WebRTC not supported'));
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      const ips: string[] = [];

      pc.createDataChannel('');

      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const match = candidate.match(
            /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/
          );
          if (match) {
            const ip = match[1];
            if (
              ips.indexOf(ip) === -1 &&
              !ip.startsWith('127.') &&
              ip !== '::1'
            ) {
              ips.push(ip);
            }
          }
        } else {
          if (ips.length > 0) {
            pc.close();
            resolve(ips[0]);
          } else {
            pc.close();
            reject(new Error('No IP found'));
          }
        }
      };

      pc.createOffer()
        .then((offer: any) => pc.setLocalDescription(offer))
        .catch((err: any) => {
          pc.close();
          reject(err);
        });

      setTimeout(() => {
        if (ips.length > 0) {
          pc.close();
          resolve(ips[0]);
        } else {
          pc.close();
          reject(new Error('WebRTC timeout'));
        }
      }, 3000);
    });
  }
}
