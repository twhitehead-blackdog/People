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
        class="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b border-neutral-700/50 w-full min-w-0 shadow-lg relative z-[1000]"
        [ngClass]="{ 'naz-nav': isNaz() }"
      >
        <!-- Constrained Area for Dog (Logo Zone) -->
        <div
          class="absolute bottom-0 left-2 sm:left-4 lg:left-6 w-[280px] h-0 z-[30]"
        >
          <pt-dog-animation></pt-dog-animation>
        </div>
        <div class="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6">
          <div class="header-container h-14 md:h-20">
            <div class="header-logo relative">
              <a
                (click)="navigateToDefault()"
                class="flex items-center gap-2 group cursor-pointer"
              >
                <img
                  [src]="logoPath()"
                  class="h-7 md:h-9 transition-transform duration-300 group-hover:scale-105"
                  alt="People"
                />
              </a>
            </div>
            <div class="header-menu hidden lg:flex">
              <div class="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
                @if(canAccessHome()) {
                <a
                  (click)="navigateTo('home')"
                  [class.selected]="isHomeActive()"
                  class="nav-link text-gray-300 hover:text-white hover:bg-gray-700/50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer whitespace-nowrap"
                  ><i class="pi pi-home text-base flex-shrink-0"></i> <span>Inicio</span></a
                >
                } @if(canAccessAdmin()) {
                <a
                  (click)="navigateTo('admin')"
                  [class.selected]="isAdminActive()"
                  class="nav-link text-gray-300 hover:text-white hover:bg-gray-700/50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer whitespace-nowrap"
                >
                  <i class="pi pi-building text-base flex-shrink-0"></i>
                  <span>Administración</span></a
                >
                } @if(canAccessPayroll()) {
                <a
                  (click)="navigateTo('payroll')"
                  [class.selected]="isPayrollActive()"
                  class="nav-link text-gray-300 hover:text-white hover:bg-gray-700/50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer whitespace-nowrap"
                >
                  <i class="pi pi-money-bill text-base flex-shrink-0"></i>
                  <span>Planilla</span></a
                >
                } @if(canAccessTimeManagement()) {
                <a
                  (click)="navigateTo('time-management')"
                  [class.selected]="isTimeManagementActive()"
                  class="nav-link text-gray-300 hover:text-white hover:bg-gray-700/50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer whitespace-nowrap"
                  ><i class="pi pi-calendar text-base flex-shrink-0"></i>
                  <span>Gestión de tiempo</span></a
                >
                } @if(canAccessTimeclock()) {
                <a
                  (click)="navigateTo('timeclock')"
                  [class.selected]="isTimeclockActive()"
                  class="nav-link text-gray-300 hover:text-white hover:bg-gray-700/50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer whitespace-nowrap"
                  ><i class="pi pi-clock text-base flex-shrink-0"></i>
                  <span>Reloj de marcación</span></a
                >
                }
                <div class="relative"
                     (mouseenter)="openDropdown('services')"
                     (mouseleave)="closeDropdown()">
                  <a class="nav-link text-gray-300 hover:text-white hover:bg-gray-700/50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer whitespace-nowrap"
                     [class.selected]="isLiveActive()">
                    <i class="pi pi-server text-base flex-shrink-0"></i>
                    <span>Servicios</span>
                    <i class="pi pi-chevron-down text-[9px] opacity-50"></i>
                  </a>
                  @if (activeDropdown() === 'services') {
                  <div class="dd-panel">
                    <a (click)="navigateTo('live'); closeDropdown()" class="dd-item" [class.dd-active]="isLiveActive()">
                      <i class="pi pi-objects-column text-xs opacity-60"></i> Asistencia en vivo
                    </a>
                    <a (click)="navigateTo('analytics'); closeDropdown()" class="dd-item">
                      <i class="pi pi-chart-line text-xs opacity-60"></i> Analytics
                    </a>
                  </div>
                  }
                </div>
              </div>
            </div>
            <div class="header-user hidden md:flex items-center gap-2">
              @if(user) {
              <!-- Campana de notificaciones -->
              <div class="relative">
                <button
                  type="button"
                  (click)="toggleNotificationsDropdown()"
                  class="relative p-2.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/60 transition-all duration-200 text-white border border-gray-600/50 hover:border-gray-500"
                  title="Notificaciones"
                >
                  <i class="pi pi-bell text-lg"></i>
                  @if (unreadNotificationsCount() > 0) {
                  <span
                    class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-gray-800"
                  >
                    {{ unreadNotificationsCount() > 99 ? '99+' : unreadNotificationsCount() }}
                  </span>
                  }
                </button>
                <pt-notifications-dropdown
                  [isVisible]="showNotificationsDropdown()"
                  [onClose]="closeNotificationsDropdown.bind(this)"
                />
              </div>
              <p-menu
                #menu
                [model]="getMenuItems()"
                popup
                [autoZIndex]="true"
              />
              <div
                class="flex items-center gap-3 cursor-pointer group px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200"
                (click)="menu.toggle($event)"
              >
                <div class="relative flex-shrink-0">
                  <div class="avatar-container">
                    <p-avatar
                      [image]="user?.picture"
                      shape="circle"
                      size="normal"
                    />
                  </div>
                  <div
                    class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"
                  ></div>
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                  <div
                    class="text-sm font-semibold text-white group-hover:text-gray-100 transition-colors truncate"
                  >
                    {{ currentEmployeeName() }}
                  </div>
                  <div
                    class="text-xs text-gray-400 group-hover:text-gray-300 transition-colors truncate"
                  >
                    {{ currentEmployeePosition() }}
                  </div>
                </div>
                <i
                  class="pi pi-chevron-down text-gray-400 group-hover:text-gray-300 transition-colors text-xs flex-shrink-0"
                ></i>
              </div>

              }
            </div>
            <div class="-mr-2 flex lg:hidden">
              <p-button
                rounded
                text
                [icon]="isCollapsed() ? 'pi pi-bars' : 'pi pi-times'"
                severity="secondary"
                (onClick)="toggleMenu()"
                class="text-white hover:bg-gray-700/50 min-w-[44px] min-h-[44px]"
              />
            </div>
          </div>
        </div>
        <div
          class="lg:hidden border-t border-neutral-700/50 bg-neutral-800/95 backdrop-blur-sm absolute top-full left-0 right-0 max-h-[calc(100vh-3.5rem)] overflow-y-auto z-[1001] shadow-2xl"
          [class.hidden]="isCollapsed()"
        >
          <div class="space-y-1 px-2 pt-2 pb-3 sm:px-3">
            @if(canAccessHome()) {
            <a
              (click)="navigateTo('home'); toggleMenu()"
              [class.bg-gray-700]="isHomeActive()"
              [class.text-white]="isHomeActive()"
              [class.shadow-md]="isHomeActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-home text-lg"></i> <span>Inicio</span></a
            >
            } @if(canAccessAdmin()) {
            <a
              (click)="navigateTo('admin'); toggleMenu()"
              [class.bg-gray-700]="isAdminActive()"
              [class.text-white]="isAdminActive()"
              [class.shadow-md]="isAdminActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-building text-lg"></i>
              <span>Administración</span></a
            >
            } @if(canAccessTimeManagement()) {
            <a
              (click)="navigateTo('time-management'); toggleMenu()"
              [class.bg-gray-700]="isTimeManagementActive()"
              [class.text-white]="isTimeManagementActive()"
              [class.shadow-md]="isTimeManagementActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-calendar text-lg"></i>
              <span>Gestión de tiempo</span></a
            >
            } @if(canAccessPayroll()) {
            <a
              (click)="navigateTo('payroll'); toggleMenu()"
              [class.bg-gray-700]="isPayrollActive()"
              [class.text-white]="isPayrollActive()"
              [class.shadow-md]="isPayrollActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-money-bill text-lg"></i> <span>Planilla</span></a
            >
            } @if(canAccessTimeclock()) {
            <a
              (click)="navigateTo('timeclock'); toggleMenu()"
              [class.bg-gray-700]="isTimeclockActive()"
              [class.text-white]="isTimeclockActive()"
              [class.shadow-md]="isTimeclockActive()"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-clock text-lg"></i>
              <span>Reloj de marcación</span></a
            >
            }
            <a (click)="navigateTo('live'); toggleMenu()"
               [class.bg-gray-700]="isLiveActive()"
               [class.text-white]="isLiveActive()"
               class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-objects-column text-lg"></i>
              <span>Asistencia en vivo</span></a>
          </div>
          @if(user) {
          <div class="border-t border-gray-700/50 pt-4 pb-3 px-5">
            <!-- Campana de notificaciones mobile -->
            <div class="relative mb-3 flex items-center gap-3">
              <button
                type="button"
                (click)="toggleNotificationsDropdown()"
                class="relative p-2.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/60 transition-all duration-200 text-white border border-gray-600/50"
                title="Notificaciones"
              >
                <i class="pi pi-bell text-lg"></i>
                @if (unreadNotificationsCount() > 0) {
                <span
                  class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-gray-800"
                >
                  {{ unreadNotificationsCount() > 99 ? '99+' : unreadNotificationsCount() }}
                </span>
                }
              </button>
              <span class="text-sm text-gray-300">Notificaciones</span>
              <pt-notifications-dropdown
                [isVisible]="showNotificationsDropdown()"
                [onClose]="closeNotificationsDropdown.bind(this)"
              />
            </div>
            <p-menu
              #mobileMenu
              [model]="getMenuItems()"
              popup
              [appendTo]="'body'"
            />
            <div
              class="flex items-center gap-3 cursor-pointer group px-2 py-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200 touch-manipulation"
              (click)="$event.stopPropagation(); mobileMenu.toggle($event)"
            >
              <div class="relative flex-shrink-0">
                <div class="avatar-container">
                  <p-avatar
                    [image]="user.picture"
                    shape="circle"
                    size="normal"
                  />
                </div>
                <div
                  class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"
                ></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-base font-semibold text-white truncate">
                  {{ currentEmployeeName() }}
                </div>
                <div class="text-sm text-gray-400 truncate">
                  {{ currentEmployeePosition() }}
                </div>
              </div>
              <i
                class="pi pi-chevron-down text-gray-400 group-hover:text-gray-300 transition-colors text-sm flex-shrink-0"
              ></i>
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
          <a (click)="navigateToDefault()" class="flex items-center cursor-pointer" style="-webkit-tap-highlight-color: transparent;">
            <img [src]="logoPath()" class="h-7" alt="People" />
          </a>
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
                <div class="w-7 h-7 rounded-full overflow-hidden border border-gray-600/40">
                  <p-avatar [image]="user.picture" shape="circle" size="normal" />
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

      .dd-panel {
        position: absolute;
        top: 100%;
        left: 0;
        min-width: 180px;
        background: #1f2937;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 0.5rem;
        padding: 0.25rem;
        z-index: 1002;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      }
      .dd-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        color: rgba(255,255,255,0.75);
        font-size: 0.875rem;
        cursor: pointer;
        transition: background 0.15s;
        white-space: nowrap;
      }
      .dd-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .dd-active { color: #fbbf24 !important; }

      .selected {
        @apply bg-gradient-to-r from-gray-700/80 to-gray-600/80 text-white shadow-md transition-all duration-300 ease-in-out;
        border-left: 3px solid #FBBF24;
      }
      
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
        margin-right: auto;
      }

      .header-menu {
        flex: 1;
        min-width: 0;
        justify-content: center;
      }

      .header-user {
        flex-shrink: 0;
        margin-left: auto;
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

      :host-context(.naz-theme) .header-menu a.selected,
      .naz-theme .header-menu a.selected {
        background: #0D0D0D !important;
        color: #FFFFFF !important;
        border-left-color: #FFFFFF !important;
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

  // Mobile admin bottom nav tabs (computed based on permissions)
  public adminMobileTabs = computed<MobileNavTab[]>(() => {
    const tabs: MobileNavTab[] = [];
    if (this.canAccessAdmin()) {
      if (this.canAccessHome()) {
        tabs.push({ id: 'home', label: 'Inicio', icon: 'pi pi-home' });
      }
      tabs.push({ id: 'admin', label: 'Admin', icon: 'pi pi-building' });
    }
    if (this.canAccessTimeManagement()) {
      tabs.push({ id: 'time-management', label: 'Tiempo', icon: 'pi pi-calendar' });
    }
    if (this.canAccessTimeclock()) {
      tabs.push({ id: 'timeclock', label: 'Reloj', icon: 'pi pi-clock' });
    }
    if (this.canAccessPayroll()) {
      tabs.push({ id: 'payroll', label: 'Nómina', icon: 'pi pi-money-bill' });
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
          this.router.navigate(['/home']);
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

        // Si no hay segmentos o no se encontró una ruta principal, usar 'home'
        if (segments.length === 0) {
          route = 'home';
        }

        this.currentRoute.set(route);
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

  navigateToDefault() {
    if (this.canAccessHome()) {
      this.navigateTo('home');
    } else {
      this.navigateTo('admin');
    }
  }

  onMobileAdminTabChange(tabId: string) {
    this.navigateTo(tabId);
  }

  // Computed signals para rutas activas - se actualizan solo cuando cambia la URL
  // Usan currentRoute signal que se actualiza en el evento NavigationEnd
  public isHomeActive = computed(() => {
    const route = this.currentRoute();
    return route === 'home' || route === '';
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
        return this.isHomeActive();
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
