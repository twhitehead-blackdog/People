import { AsyncPipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { filter, Subscription } from 'rxjs';
import { NotificationsService } from '../services/notifications.service';
import { OrganizationService } from '../services/organization.service';
import { EmployeePortalNavigationService } from '../services/employee-portal-navigation.service';
import { NotificationsDropdownComponent } from '../components/notifications-dropdown.component';
import { DeviceService } from '../services/device.service';
import { MobileBottomNavComponent, MobileNavTab } from '../shared/components/mobile-bottom-nav.component';
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

type NavSection = {
  id: string;
  label: string;
  icon: string;
  section?: string;
  children?: Array<{
    id: string;
    label: string;
    icon: string;
    section: string;
  }>;
};

@Component({
  selector: 'pt-employee-portal-layout',
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
    ConfirmDialogModule,
    MenuModule,
    AvatarModule,
    AsyncPipe,
    Button,
    TooltipModule,
    NotificationsDropdownComponent,
    MobileBottomNavComponent,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    @let user = auth.user$ | async;

    @if (device.isDesktop()) {
    <!-- ========== DESKTOP ========== -->
    <div class="h-screen flex flex-col">
      <nav
        class="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b border-neutral-700/50 w-full min-w-0 shadow-lg"
        style="position: relative; z-index: 1000;"
      >
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-16 items-center justify-between">
            <div class="flex items-center">
              <a
                (click)="navigateToTimeclock()"
                class="shrink-0 flex items-center gap-2 group cursor-pointer"
              >
                <img
                  [src]="isNaz() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
                  class="h-9 transition-transform duration-300 group-hover:scale-105"
                  [alt]="isNaz() ? 'Naz Logo' : 'Black Dog Logo'"
                />
              </a>
              <div class="ml-10 flex items-center space-x-3">
                @for (nav of navSections; track nav.id) { @if (!nav.children) {
                <button
                  type="button"
                  (click)="navigateToSection(nav.section!)"
                  [class.selected]="isActiveSection(nav.section!)"
                  class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md min-h-[48px] leading-tight"
                >
                  <i [class]="nav.icon + ' text-base'"></i>
                  <span class="whitespace-nowrap">{{ nav.label }}</span>
                </button>
                } @else {
                <div
                  class="relative"
                  (mouseenter)="openDropdownWithDelay(nav.id)"
                  (mouseleave)="closeDropdownWithDelay()"
                >
                  <button
                    type="button"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md min-h-[48px] leading-tight"
                  >
                    <i [class]="nav.icon + ' text-base'"></i>
                    <span class="whitespace-nowrap">{{ nav.label }}</span>
                    <i class="pi pi-chevron-down text-xs"></i>
                  </button>
                  @if (openDropdown() === nav.id) {
                  <div
                    class="absolute left-0 top-full w-56 rounded-lg bg-neutral-800 border border-neutral-700 shadow-xl z-50 py-2 mt-0"
                    style="margin-top: -1px;"
                    (mouseenter)="openDropdownWithDelay(nav.id)"
                    (mouseleave)="closeDropdownWithDelay()"
                  >
                    @for (child of nav.children; track child.id) {
                    <button
                      type="button"
                      (click)="navigateToSection(child.section)"
                      [class.selected]="isActiveSection(child.section)"
                      class="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700/60 flex items-center gap-2 transition-colors"
                    >
                      <i [class]="child.icon + ' text-sm'"></i>
                      <span class="truncate">{{ child.label }}</span>
                    </button>
                    }
                  </div>
                  }
                </div>
                } }
              </div>
            </div>
            <div class="flex items-center">
              @if(user) {
              <div class="ml-4 flex items-center md:ml-6 gap-3">
                <div class="relative">
                  <button
                    type="button"
                    (click)="toggleNotificationsDropdown()"
                    class="relative p-2.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/60 transition-all duration-200 text-white border border-gray-600/50 hover:border-gray-500"
                    pTooltip="Notificaciones"
                    title="Notificaciones"
                  >
                    <i class="pi pi-bell text-xl"></i>
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
                <div class="flex items-center gap-3">
                  <p-menu #menu [model]="items" popup />
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
                        {{ store.currentEmployee()?.first_name }} {{ store.currentEmployee()?.father_name }}
                      </div>
                      <div class="text-xs text-gray-400 group-hover:text-gray-300 transition-colors truncate">
                        {{ store.currentEmployee()?.position?.name || 'Sin cargo' }}
                      </div>
                    </div>
                    <i class="pi pi-chevron-down text-gray-400 group-hover:text-gray-300 transition-colors text-xs flex-shrink-0"></i>
                  </div>
                </div>
              </div>
              }
            </div>
          </div>
        </div>
      </nav>
      <div class="flex-1 overflow-y-auto"><router-outlet /></div>
    </div>

    } @else {
    <!-- ========== MOBILE ========== -->
    <div class="h-screen flex flex-col bg-neutral-950">
      <!-- Slim top bar -->
      <nav class="bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between" style="height: 52px; min-height: 52px; padding-top: env(safe-area-inset-top, 0px); z-index: 1000;">
        <a (click)="navigateToTimeclock()" class="flex items-center cursor-pointer">
          <img
            [src]="isNaz() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
            class="h-7"
            [alt]="isNaz() ? 'Naz Logo' : 'Black Dog Logo'"
          />
        </a>
        <div class="flex items-center gap-2">
          <!-- Avatar with menu -->
          @if (user) {
          <p-menu #mobileMenu [model]="items" popup />
          <button
            (click)="mobileMenu.toggle($event)"
            class="w-10 h-10 rounded-full overflow-hidden border-2 border-neutral-700"
            style="-webkit-tap-highlight-color: transparent;"
          >
            <p-avatar [image]="user.picture" shape="circle" size="normal" styleClass="w-full h-full" />
          </button>
          }
        </div>
      </nav>

      <!-- Content area with bottom padding for tab bar -->
      <div class="flex-1 overflow-y-auto pb-[72px]">
        <router-outlet />
      </div>

      <!-- Bottom tab bar -->
      <pt-mobile-bottom-nav
        [tabs]="mobileTabsWithBadge()"
        [activeTab]="activeMobileTab()"
        (tabChange)="onMobileTabChange($event)"
      />
    </div>
    }
  `,
  styles: [
    `
      .selected {
        @apply bg-gradient-to-r from-gray-700/80 to-gray-600/80 text-white shadow-md transition-all duration-300 ease-in-out;
        border-bottom: 2px solid #fbbf24;
        border-left: none;
      }
      
      /* Tema Naz - cambiar amarillo a gris */
      :host-context(.naz-theme) .selected,
      .naz-theme .selected {
        border-left-color: #C6C2BF !important;
      }

      ::ng-deep .p-menu {
        background: #1f2937 !important;
        border: 1px solid rgba(251, 191, 36, 0.2) !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
        padding: 0.5rem !important;
      }
      
      /* Tema Naz - cambiar amarillo a gris en menú */
      :host-context(.naz-theme) ::ng-deep .p-menu,
      .naz-theme ::ng-deep .p-menu {
        border: 1px solid rgba(198, 194, 191, 0.2) !important;
      }

      ::ng-deep .p-menu .p-menuitem-link {
        padding: 0.75rem 1rem !important;
        border-radius: 0.375rem !important;
        transition: all 0.2s ease !important;
      }

      ::ng-deep .p-menu .p-menuitem-link:hover {
        background: rgba(251, 191, 36, 0.1) !important;
      }
      
      /* Tema Naz - hover gris */
      :host-context(.naz-theme) ::ng-deep .p-menu .p-menuitem-link:hover,
      .naz-theme ::ng-deep .p-menu .p-menuitem-link:hover {
        background: rgba(198, 194, 191, 0.1) !important;
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
      
      /* Tema Naz - iconos grises */
      :host-context(.naz-theme) ::ng-deep .p-menu .p-menuitem-link .p-menuitem-icon,
      .naz-theme ::ng-deep .p-menu .p-menuitem-link .p-menuitem-icon {
        color: #C6C2BF !important;
      }
      
      /* Tema Naz - hover iconos blancos */
      :host-context(.naz-theme) ::ng-deep .p-menu .p-menuitem-link:hover .p-menuitem-icon,
      .naz-theme ::ng-deep .p-menu .p-menuitem-link:hover .p-menuitem-icon {
        color: #FFFFFF !important;
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

      /* Estilos para textarea - igual que otros inputs */
      ::ng-deep textarea.p-inputtextarea,
      ::ng-deep .p-inputtextarea,
      ::ng-deep textarea[pinputtextarea],
      ::ng-deep textarea.p-inputtextarea.p-component {
        width: 100% !important;
        padding: 1.125rem 1.25rem !important;
        background: #262626 !important;
        border: 1px solid #404040 !important;
        border-radius: 0.375rem !important;
        color: #e5e7eb !important;
        font-size: 0.875rem !important;
        transition: all 0.2s ease !important;
        font-family: inherit !important;
        margin: 0 !important;
        resize: vertical !important;
      }

      ::ng-deep textarea.p-inputtextarea:focus,
      ::ng-deep .p-inputtextarea:focus,
      ::ng-deep textarea[pinputtextarea]:focus {
        outline: none !important;
        border-color: #fbbf24 !important;
        box-shadow: 0 0 0 0.2rem rgba(251, 191, 36, 0.2) !important;
      }
      
      /* Tema Naz - focus gris */
      :host-context(.naz-theme) ::ng-deep textarea.p-inputtextarea:focus,
      :host-context(.naz-theme) ::ng-deep .p-inputtextarea:focus,
      :host-context(.naz-theme) ::ng-deep textarea[pinputtextarea]:focus,
      .naz-theme ::ng-deep textarea.p-inputtextarea:focus,
      .naz-theme ::ng-deep .p-inputtextarea:focus,
      .naz-theme ::ng-deep textarea[pinputtextarea]:focus {
        border-color: #C6C2BF !important;
        box-shadow: 0 0 0 0.2rem rgba(198, 194, 191, 0.2) !important;
      }

      ::ng-deep textarea.p-inputtextarea::placeholder,
      ::ng-deep .p-inputtextarea::placeholder,
      ::ng-deep textarea[pinputtextarea]::placeholder {
        color: rgba(156, 163, 175, 0.6) !important;
      }

      ::ng-deep textarea.p-inputtextarea:hover:not(:disabled),
      ::ng-deep .p-inputtextarea:hover:not(:disabled),
      ::ng-deep textarea[pinputtextarea]:hover:not(:disabled) {
        border-color: rgba(107, 114, 128, 0.7) !important;
      }
    `,
  ],
})
export class EmployeePortalLayoutComponent implements OnInit, OnDestroy {
  public auth = inject(AuthService);
  public router = inject(Router);
  public store = inject(DashboardStore);
  public organizationService = inject(OrganizationService);
  public notificationsService = inject(NotificationsService);
  private navigationService = inject(EmployeePortalNavigationService);
  public device = inject(DeviceService);

  public isNaz = computed(() => this.organizationService.isNaz());

  public isCollapsed = signal(true);
  public currentFragment = signal<string | null>(null);
  public openDropdown = signal<string | null>(null);
  public mobileDropdowns = signal<Record<string, boolean>>({});
  public showNotificationsDropdown = signal(false);
  private routerSubscription?: Subscription;
  private dropdownTimeout: any = null;

  // Usar el servicio compartido de notificaciones
  public unreadNotificationsCount = computed(() => this.notificationsService.unreadCount());

  constructor() {
    // Inicializar notificaciones cuando cambia el empleado actual
    // effect() debe estar en el constructor, no en ngOnInit
    effect(() => {
      const employeeId = this.store.currentEmployee()?.id;
      if (employeeId) {
        this.notificationsService.setCurrentEmployeeId(employeeId);
      }
    });
  }

  public navSections: NavSection[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'pi pi-home',
      section: 'dashboard',
    },
    {
      id: 'management',
      label: 'Gestiones',
      icon: 'pi pi-briefcase',
      section: 'management',
    },
    {
      id: 'timelogs',
      label: 'Mis Marcaciones',
      icon: 'pi pi-calendar-clock',
      section: 'timelogs',
    },
    {
      id: 'profile',
      label: 'Mi Perfil',
      icon: 'pi pi-id-card',
      section: 'profile',
    },
  ];

  public items: MenuItem[] = [
    {
      label: 'Cerrar sesion',
      icon: 'pi pi-sign-out',
      command: () => this.auth.logout(),
    },
  ];

  // Mobile bottom nav tabs (5 tabs)
  public mobileTabsWithBadge = computed(() => {
    const tabs: MobileNavTab[] = [
      { id: 'dashboard', label: 'Inicio', icon: 'pi pi-home' },
      { id: 'management', label: 'Gestiones', icon: 'pi pi-briefcase' },
      { id: 'timelogs', label: 'Marcaciones', icon: 'pi pi-clock' },
      {
        id: 'notifications',
        label: 'Alertas',
        icon: 'pi pi-bell',
        badge: this.unreadNotificationsCount(),
      },
      { id: 'profile', label: 'Mi Perfil', icon: 'pi pi-id-card' },
    ];
    return tabs;
  });

  // Keep legacy reference for compatibility
  public mobileTabs: MobileNavTab[] = [
    { id: 'dashboard', label: 'Inicio', icon: 'pi pi-home' },
    { id: 'management', label: 'Gestiones', icon: 'pi pi-briefcase' },
    { id: 'timelogs', label: 'Marcaciones', icon: 'pi pi-clock' },
    { id: 'notifications', label: 'Alertas', icon: 'pi pi-bell' },
    { id: 'profile', label: 'Mi Perfil', icon: 'pi pi-id-card' },
  ];

  public activeMobileTab = computed(() => {
    const fragment = this.currentFragment();
    if (!fragment || fragment === 'dashboard') return 'dashboard';
    if (fragment === 'management' || fragment === 'disabilities' || fragment === 'documents' ||
        fragment === 'vacations' || fragment === 'compensatory' || fragment === 'my-requests' ||
        fragment === 'timelog_correction' || fragment === 'uniform_request') return 'management';
    if (fragment === 'timelogs') return 'timelogs';
    if (fragment === 'notifications') return 'notifications';
    if (fragment === 'profile') return 'profile';
    return 'dashboard';
  });

  onMobileTabChange(tabId: string) {
    this.navigateToSection(tabId);
  }

  ngOnInit() {
    // Inicializar con el fragmento actual
    this.updateFragment();

    // Suscribirse a cambios de navegación
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateFragment();
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private updateFragment() {
    const url = this.router.url;
    const fragment = url.includes('#') ? url.split('#')[1] : null;
    this.currentFragment.set(fragment);
  }

  navigateToSection(section: string) {
    // Si estamos navegando a 'management' y estamos en una subsección de gestiones,
    // usar el servicio de navegación para cambiar directamente la sección activa
    if (section === 'management') {
      // Leer el fragmento directamente de la URL actual
      const url = this.router.url;
      const urlFragment = url.includes('#') ? url.split('#')[1] : null;
      const currentFragment = urlFragment || this.currentFragment();
      
      // Verificar si estamos en una subsección de gestiones
      const isInManagementSubsection =
        currentFragment === 'disabilities' ||
        currentFragment === 'documents' ||
        currentFragment === 'vacations' ||
        currentFragment === 'compensatory' ||
        currentFragment === 'my-requests';
      
      // Si estamos en una subsección, usar el servicio para cambiar directamente la sección
      if (isInManagementSubsection) {
        this.navigationService.goToSection('management');
        this.openDropdown.set(null);
        if (!this.isCollapsed()) {
          this.isCollapsed.set(true);
        }
        return;
      }
    }
    
    // Navegación normal para otros casos
    this.router.navigate(['/employee-portal'], { 
      fragment: section,
      replaceUrl: false
    }).then(() => {
      this.currentFragment.set(section);
      this.updateFragment();
      
      setTimeout(() => {
        const element = document.querySelector('pt-employee-portal');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    });
    this.openDropdown.set(null);
    if (!this.isCollapsed()) {
      this.isCollapsed.set(true);
    }
  }

  navigateToTimeclock(): void {
    this.router.navigate(['/timeclock']);
  }

  isActiveSection(section: string): boolean {
    const fragment = this.currentFragment();
    
    // Dashboard está activo cuando no hay fragmento o cuando el fragmento es 'dashboard'
    if (section === 'dashboard') {
      return !fragment || fragment === 'dashboard';
    }
    
    // Gestiones está activo cuando estamos en cualquier sección de gestiones
    if (section === 'management') {
      return fragment === 'management' ||
             fragment === 'disabilities' ||
             fragment === 'documents' ||
             fragment === 'vacations' ||
             fragment === 'compensatory' ||
             fragment === 'my-requests' ||
             fragment === 'timelog_correction' ||
             fragment === 'uniform_request';
    }
    
    // Para otras secciones, verificar coincidencia exacta
    return fragment === section;
  }

  toggleMenu() {
    this.isCollapsed.update((value) => !value);
  }

  toggleMobileCategory(id: string) {
    this.mobileDropdowns.update((state) => ({
      ...state,
      [id]: !state[id],
    }));
  }

  isMobileCategoryOpen(id: string): boolean {
    return !!this.mobileDropdowns()[id];
  }

  openDropdownWithDelay(id: string) {
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
      this.dropdownTimeout = null;
    }
    this.openDropdown.set(id);
  }

  closeDropdownWithDelay() {
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
    this.dropdownTimeout = setTimeout(() => {
      this.openDropdown.set(null);
      this.dropdownTimeout = null;
    }, 500); // 500ms delay before closing to allow moving to dropdown
  }

  toggleNotificationsDropdown() {
    this.showNotificationsDropdown.update((value) => !value);
  }

  closeNotificationsDropdown() {
    this.showNotificationsDropdown.set(false);
  }
}
