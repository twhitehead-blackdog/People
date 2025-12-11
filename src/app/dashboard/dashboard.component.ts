import { Component, computed, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';

import { AsyncPipe, NgClass } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
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
import { OrganizationService, Organization } from '../services/organization.service';
import { HttpClient } from '@angular/common/http';

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
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    @let user = auth.user$ | async;
    <!-- Overlay para móvil cuando el menú está abierto -->
    @if (!isCollapsed()) {
    <div
      class="fixed inset-0 bg-black/50 z-[999] md:hidden"
      (click)="toggleMenu()"
    ></div>
    }
    <div class="h-screen flex flex-col overflow-hidden" [ngClass]="{ 'naz-theme': isNaz() }">
      <nav
        class="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b border-neutral-700/50 w-full min-w-0 shadow-lg relative z-[1000]"
        [ngClass]="{ 'naz-nav': isNaz() }"
      >
        <div class="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6">
          <div class="header-container h-14 md:h-16">
            <div class="header-logo">
              <a (click)="navigateTo('home')" class="flex items-center gap-2 group cursor-pointer">
                <img [src]="logoPath()" class="h-7 md:h-9 transition-transform duration-300 group-hover:scale-105" alt="People" />
              </a>
            </div>
            <div class="header-menu hidden md:block">
              <div class="flex items-baseline space-x-1">
                  @if(store.hasDashboardAccess() && store.isAdmin() && !store.hasPortalAccessOnly() && !store.hasTimeManagementAccess()) {
                  <a
                    (click)="navigateTo('home')"
                    [class.selected]="isActiveRoute('home')"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                    ><i class="pi pi-home text-base"></i> <span>Inicio</span></a
                  >
                  } @if(store.hasDashboardAccess() && store.isAdmin() && !store.hasPortalAccessOnly()) {
                  <a
                    (click)="navigateTo('admin')"
                    [class.selected]="isActiveRoute('admin')"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                  >
                    <i class="pi pi-building text-base"></i> <span>Administración</span></a
                  >
                  } @if(store.hasDashboardAccess() && store.isAdmin() && !store.hasPortalAccessOnly()) {
                  <a
                    (click)="navigateTo('payroll')"
                    [class.selected]="isActiveRoute('payroll')"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                  >
                    <i class="pi pi-money-bill text-base"></i> <span>Nómina</span></a
                  >
                  } @if(store.hasDashboardAccess() && ((store.isScheduleAdmin() && !store.hasPortalAccessOnly()) || store.hasTimeManagementAccess())) {
                  <a
                    (click)="navigateTo('time-management')"
                    [class.selected]="isActiveRoute('time-management')"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                    ><i class="pi pi-calendar text-base"></i> <span>Gestión de tiempo</span></a
                  >
                  }
                  @if(store.hasDashboardAccess() && (!store.hasPortalAccessOnly() || store.hasTimeManagementAccess())) {
                  <a
                    (click)="navigateTo('timeclock')"
                    [class.selected]="isActiveRoute('timeclock')"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                    ><i class="pi pi-clock text-base"></i> <span>Reloj de marcación</span></a
                  >
                  }
                </div>
            </div>
            <div class="header-user hidden md:block">
              @if(user) {
              <p-menu #menu [model]="items()" popup />
              <div
                class="flex items-center gap-3 cursor-pointer group px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200"
                (click)="menu.toggle($event)"
              >
                <div class="relative flex-shrink-0">
                  <div class="avatar-container">
                    <p-avatar [image]="user?.picture" shape="circle" size="normal" />
                  </div>
                  <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                  <div class="text-sm font-semibold text-white group-hover:text-gray-100 transition-colors truncate">
                    {{ currentEmployeeName() }}
                  </div>
                  <div class="text-xs text-gray-400 group-hover:text-gray-300 transition-colors truncate">
                    {{ currentEmployeePosition() }}
                  </div>
                </div>
                <i class="pi pi-chevron-down text-gray-400 group-hover:text-gray-300 transition-colors text-xs flex-shrink-0"></i>
              </div>

              }
            </div>
            <div class="-mr-2 flex md:hidden">
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
          class="md:hidden border-t border-neutral-700/50 bg-neutral-800/95 backdrop-blur-sm absolute top-full left-0 right-0 max-h-[calc(100vh-3.5rem)] overflow-y-auto z-[1001] shadow-2xl"
          [class.hidden]="isCollapsed()"
        >
          <div class="space-y-1 px-2 pt-2 pb-3 sm:px-3">
            @if(store.hasDashboardAccess() && store.isAdmin() && !store.hasPortalAccessOnly() && !store.hasTimeManagementAccess()) {
            <a
              (click)="navigateTo('home'); toggleMenu()"
              [class.bg-gray-700]="isActiveRoute('home')"
              [class.text-white]="isActiveRoute('home')"
              [class.shadow-md]="isActiveRoute('home')"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-home text-lg"></i> <span>Inicio</span></a
            >
            } @if(store.hasDashboardAccess() && store.isAdmin() && !store.hasPortalAccessOnly()) {
            <a
              (click)="navigateTo('admin'); toggleMenu()"
              [class.bg-gray-700]="isActiveRoute('admin')"
              [class.text-white]="isActiveRoute('admin')"
              [class.shadow-md]="isActiveRoute('admin')"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-building text-lg"></i> <span>Administración</span></a
            >
            } @if(store.hasDashboardAccess() && ((store.isScheduleAdmin() && !store.hasPortalAccessOnly()) || store.hasTimeManagementAccess())) {
            <a
              (click)="navigateTo('time-management'); toggleMenu()"
              [class.bg-gray-700]="isActiveRoute('time-management')"
              [class.text-white]="isActiveRoute('time-management')"
              [class.shadow-md]="isActiveRoute('time-management')"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-calendar text-lg"></i> <span>Gestión de tiempo</span></a
            >
            } @if(store.hasDashboardAccess() && store.isAdmin() && !store.hasPortalAccessOnly()) {
            <a
              (click)="navigateTo('payroll'); toggleMenu()"
              [class.bg-gray-700]="isActiveRoute('payroll')"
              [class.text-white]="isActiveRoute('payroll')"
              [class.shadow-md]="isActiveRoute('payroll')"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-money-bill text-lg"></i> <span>Nómina</span></a
            >
            }
            @if(store.hasDashboardAccess() && (!store.hasPortalAccessOnly() || store.hasTimeManagementAccess())) {
            <a
              (click)="navigateTo('timeclock'); toggleMenu()"
              [class.bg-gray-700]="isActiveRoute('timeclock')"
              [class.text-white]="isActiveRoute('timeclock')"
              [class.shadow-md]="isActiveRoute('timeclock')"
              class="rounded-lg px-4 py-3 min-h-[44px] text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer touch-manipulation"
              ><i class="pi pi-clock text-lg"></i> <span>Reloj de marcación</span></a
            >
            }
          </div>
          @if(user) {
          <div class="border-t border-gray-700/50 pt-4 pb-3 px-5">
            <p-menu #mobileMenu [model]="items()" popup [appendTo]="'body'" />
            <div
              class="flex items-center gap-3 cursor-pointer group px-2 py-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200 touch-manipulation"
              (click)="$event.stopPropagation(); mobileMenu.toggle($event)"
            >
              <div class="relative flex-shrink-0">
                <div class="avatar-container">
                  <p-avatar [image]="user.picture" shape="circle" size="normal" />
                </div>
                <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-base font-semibold text-white truncate">
                  {{ currentEmployeeName() }}
                </div>
                <div class="text-sm text-gray-400 truncate">
                  {{ currentEmployeePosition() }}
                </div>
              </div>
              <i class="pi pi-chevron-down text-gray-400 group-hover:text-gray-300 transition-colors text-sm flex-shrink-0"></i>
            </div>
          </div>
          }
        </div>
      </nav>
      <div class="flex-1 overflow-y-auto">
        @if(showEmployeePortalView()) {
          <pt-employee-portal />
        } @else {
          <router-outlet />
        }
      </div>
    </div>
  `,
  styles: `
      .selected {
        @apply bg-gradient-to-r from-gray-700/80 to-gray-600/80 text-white shadow-md transition-all duration-300 ease-in-out;
        border-left: 3px solid #FBBF24;
      }
      
      ::ng-deep .p-menu {
        background: #1f2937 !important;
        border: 1px solid rgba(251, 191, 36, 0.2) !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
        padding: 0.5rem !important;
        z-index: 1002 !important;
      }

      /* Asegurar que el menú móvil tenga z-index alto */
      @media (max-width: 768px) {
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
      
      ::ng-deep .p-menu .p-menuitem-link .p-menuitem-text {
        color: #e5e7eb !important;
      }
      
      ::ng-deep .p-menu .p-menuitem-link:hover .p-menuitem-text {
        color: #ffffff !important;
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

      @media (min-width: 768px) {
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
        display: flex;
        justify-content: center;
        min-width: 0;
      }

      .header-user {
        flex-shrink: 0;
        margin-left: auto;
      }

      /* Mobile menu improvements */
      @media (max-width: 767px) {
        .header-user {
          display: none;
        }

        .header-menu {
          display: none;
        }
      }

      /* Touch-friendly improvements */
      @media (max-width: 768px) {
        .header-container a,
        .header-container button {
          min-height: 44px;
          display: flex;
          align-items: center;
        }

        /* Mejorar el menú móvil */
        nav {
          position: relative;
        }

        /* Asegurar que el contenido principal no se desplace cuando el menú está abierto */
        nav + div {
          position: relative;
          z-index: 1;
        }
      }

      /* Overlay para móvil */
      @media (max-width: 768px) {
        .fixed.inset-0.bg-black\\/50 {
          animation: fadeIn 0.2s ease-in-out;
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

      /* Tema Naz */
      :host-context(.naz-theme) nav,
      .naz-theme nav,
      nav.naz-nav {
        background: #000000 !important;
        border-bottom-color: rgba(255, 255, 255, 0.10) !important;
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
      .naz-theme .md\\:hidden a {
        color: #C6C2BF !important;
      }

      :host-context(.naz-theme) .md\\:hidden a:hover,
      .naz-theme .md\\:hidden a:hover {
        color: #FFFFFF !important;
        background: rgba(255, 255, 255, 0.10) !important;
      }

      :host-context(.naz-theme) .md\\:hidden a.bg-gray-700,
      .naz-theme .md\\:hidden a.bg-gray-700 {
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
  public isCollapsed = signal(true);
  public store = inject(DashboardStore);
  public auth = inject(AuthService);
  public router = inject(Router);
  public route = inject(ActivatedRoute);
  public currentRoute = signal('');
  public showEmployeePortalView = signal(false);
  public organizationService = inject(OrganizationService);
  public http = inject(HttpClient);
  public branchesStore = inject(BranchesStore);
  public employeesStore = inject(EmployeesStore);
  public positionsStore = inject(PositionsStore);
  public departmentsStore = inject(DepartmentsStore);
  public companiesStore = inject(CompaniesStore);
  public schedulesStore = inject(SchedulesStore);
  public banksStore = inject(BanksStore);
  public payrollsStore = inject(PayrollsStore);
  
  // Signal para la IP actual
  private currentIP = signal<string | null>(null);
  
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

  // Determinar si se puede cambiar la organización (solo para soporte2@blackdogpanama.com)
  public canChangeOrganization = computed(() => {
    // Solo soporte2@blackdogpanama.com puede cambiar de organización
    return this.isSupportUser();
  });

  // Track de la organización anterior para detectar cambios
  private previousOrganization: Organization | null = null;

  constructor() {
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
        console.log('🔄 Organización cambió de', this.previousOrganization, 'a', currentOrg, 'company_id:', currentCompanyId);
        console.log('🔄 Recargando todos los datos...');
        
        // Recargar todos los stores
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
        
        console.log('✅ Datos recargados para organización:', currentOrg);
      } else if (this.previousOrganization === null) {
        // Primera vez, solo guardar la organización actual
        this.previousOrganization = currentOrg;
      }
    });
    
    // La redirección se maneja en el guard para evitar conflictos de navegación
    // Track current route for active state
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        const segments = url.split('/').filter((s: string) => s);
        // Si estamos en una ruta hija (ej: admin/employees), usar el primer segmento después de la raíz
        // Si estamos en la raíz del dashboard, usar el segmento o 'home'
        const route = segments.length > 0 ? segments[segments.length - 1] : 'home';
        this.currentRoute.set(route);
      });
    
    // Set initial route
    const url = this.router.url;
    const segments = url.split('/').filter((s: string) => s);
    const route = segments.length > 0 ? segments[segments.length - 1] : 'home';
    this.currentRoute.set(route);

    // DEBUG: Log de valores para depuración
    setTimeout(() => {
      console.log('=== DEBUG DASHBOARD ===');
      console.log('isNaz():', this.organizationService.isNaz());
      console.log('auth.currentEmployeeId():', this.store.auth.currentEmployeeId());
      console.log('employees.entities().length:', this.store.employees.entities().length);
      console.log('employees.entities() (todos):', this.store.employees.entities());
      console.log('IDs de empleados cargados:', this.store.employees.entities().map(e => e.id));
      console.log('hasDashboardAccess:', this.store.hasDashboardAccess());
      console.log('isAdmin:', this.store.isAdmin());
      console.log('hasPortalAccessOnly:', this.store.hasPortalAccessOnly());
      console.log('hasTimeManagementAccess:', this.store.hasTimeManagementAccess());
      console.log('currentEmployee:', this.store.currentEmployee());
      console.log('currentEmployee position:', this.store.currentEmployee()?.position);
      console.log('currentEmployee position dashboard_access:', this.store.currentEmployee()?.position?.dashboard_access);
      console.log('currentEmployee position admin:', this.store.currentEmployee()?.position?.admin);
      console.log('currentEmployee has_portal_access:', this.store.currentEmployee()?.has_portal_access);
      console.log('showEmployeePortalView:', this.showEmployeePortalView());
      
      // Buscar el empleado manualmente
      const employeeId = this.store.auth.currentEmployeeId();
      if (employeeId) {
        const foundEmployee = this.store.employees.entities().find(e => e.id === employeeId);
        console.log('🔍 Buscando empleado con ID:', employeeId);
        console.log('Empleado encontrado manualmente:', foundEmployee);
        if (!foundEmployee) {
          console.log('❌ PROBLEMA: El ID del empleado no coincide con ningún empleado cargado');
          console.log('Esto significa que AuthStore y EmployeesStore están usando tablas diferentes');
        } else {
          console.log('✅ Empleado encontrado!');
          console.log('Empleado position:', foundEmployee.position);
          console.log('Empleado position dashboard_access:', foundEmployee.position?.dashboard_access);
        }
      } else {
        console.log('⚠️ auth.currentEmployeeId() es null/undefined');
      }
      console.log('========================');
    }, 2000); // Esperar 2 segundos para que los datos se carguen
  }

  navigateTo(route: string) {
    // Navigate relative to the current activated route (which is the dashboard component)
    this.router.navigate([route], { relativeTo: this.route });
  }

  // Memoized route check to avoid recalculating on every change detection
  private _routeCache = new Map<string, boolean>();
  private _lastUrl = '';

  isActiveRoute(route: string): boolean {
    const url = this.router.url;
    
    // Use cache if URL hasn't changed
    if (url === this._lastUrl && this._routeCache.has(route)) {
      return this._routeCache.get(route)!;
    }

    // Clear cache if URL changed
    if (url !== this._lastUrl) {
      this._routeCache.clear();
      this._lastUrl = url;
    }

    const segments = url.split('/').filter((s: string) => s);
    let isActive = false;
    
    // Verificar si la ruta está en los segmentos de la URL
    // Esto funciona tanto para rutas directas como subrutas
    if (route === 'admin' && segments.includes('admin')) {
      isActive = true;
    } else if (route === 'payroll' && segments.includes('payroll')) {
      isActive = true;
    } else if (route === 'time-management' && segments.includes('time-management')) {
      isActive = true;
    } else if (route === 'timeclock' && segments.includes('timeclock')) {
      isActive = true;
    } else if (route === 'home' && (segments.includes('home') || segments.length === 0)) {
      isActive = true;
    }

    // Cache result
    this._routeCache.set(route, isActive);
    return isActive;
  }

  // Memoized menu items to avoid recalculation on every change detection
  private _cachedItems: MenuItem[] | null = null;
  private _lastSupportUserState: boolean | null = null;
  private _lastPortalViewState: boolean | null = null;

  public items = computed<MenuItem[]>(() => {
    const isSupport = this.isSupportUser();
    const portalView = this.showEmployeePortalView();
    
    // Only recompute if relevant state changed
    if (
      this._cachedItems !== null &&
      this._lastSupportUserState === isSupport &&
      this._lastPortalViewState === portalView
    ) {
      return this._cachedItems;
    }

    const items: MenuItem[] = [
      {
        label: 'Mi Portal',
        icon: 'pi pi-user',
        command: () => this.router.navigate(['/employee-portal']),
      },
    ];

    // Agregar opción de vista Employee Portal solo para soporte2@blackdogpanama.com
    if (isSupport) {
      items.push({
        label: portalView ? 'Vista Completa' : 'Vista Employee Portal',
        icon: portalView ? 'pi pi-th-large' : 'pi pi-id-card',
        command: () => {
          this.showEmployeePortalView.update(v => !v);
        },
      });
    }

    // Agregar opción de cambiar organización solo si es oficina central
    if (this.canChangeOrganization()) {
      items.push({
        label: this.organizationService.isNaz() ? 'Cambiar a Black Dog' : 'Cambiar a Naz',
        icon: 'pi pi-refresh',
        command: () => {
          this.organizationService.toggleOrganization();
        },
      });
    }

    items.push(
      {
        separator: true,
      },
      {
        label: 'Cerrar sesion',
        icon: 'pi pi-sign-out',
        command: () => this.auth.logout(),
      }
    );

    this._cachedItems = items;
    this._lastSupportUserState = isSupport;
    this._lastPortalViewState = portalView;

    return items;
  });

  async toggleMenu() {
    this.isCollapsed.update((value) => !value);
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
      error: () => {
        // Si falla, intentar obtener IP vía WebRTC como fallback
        this.getIPViaWebRTC().then((ip) => {
          this.currentIP.set(ip);
        }).catch(() => {
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
