import { AsyncPipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { filter, Subscription } from 'rxjs';
import { NotificationsService } from '../services/notifications.service';
import { DesignVersionService } from '../services/design-version.service';
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
    <div class="h-screen flex flex-col overflow-hidden">
      <nav class="portal-nav w-full flex-shrink-0" style="z-index: 1000;">
        <div class="flex items-center h-14 px-4 lg:px-6 gap-3">
          <!-- Logo -->
          <a (click)="navigateToTimeclock()" class="shrink-0 flex items-center group cursor-pointer mr-2">
            <img
              [src]="isNaz() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
              class="h-7 transition-transform duration-300 group-hover:scale-105"
              [alt]="isNaz() ? 'Naz Logo' : 'Black Dog Logo'"
            />
          </a>

          <!-- Nav items -->
          <div class="flex items-center justify-center gap-1 flex-1">
            @for (nav of navSections; track nav.id) {
              @if (!nav.children) {
              <button
                type="button"
                (click)="navigateToSection(nav.section!)"
                class="portal-nav-item"
                [class.portal-nav-active]="isActiveSection(nav.section!)"
              >
                <i [class]="nav.icon + ' text-sm'"></i>
                <span>{{ nav.label }}</span>
              </button>
              } @else {
              <div
                class="relative"
                (mouseenter)="openDropdownWithDelay(nav.id)"
                (mouseleave)="closeDropdownWithDelay()"
              >
                <button type="button" class="portal-nav-item"
                  [class.portal-nav-active]="isActiveSection(nav.section || nav.id)">
                  <i [class]="nav.icon + ' text-sm'"></i>
                  <span>{{ nav.label }}</span>
                  <i class="pi pi-chevron-down text-[9px] opacity-40 ml-0.5"></i>
                </button>
                @if (openDropdown() === nav.id) {
                <div
                  class="absolute left-0 top-full pt-1.5 min-w-[200px] z-50"
                  (mouseenter)="openDropdownWithDelay(nav.id)"
                  (mouseleave)="closeDropdownWithDelay()"
                >
                  <div class="portal-dropdown rounded-xl p-1">
                    @for (child of nav.children; track child.id) {
                    <button
                      type="button"
                      (click)="navigateToSection(child.section)"
                      class="portal-dropdown-item"
                      [class.portal-dropdown-active]="isActiveSection(child.section)"
                    >
                      <i [class]="child.icon + ' text-xs opacity-60'"></i>
                      <span>{{ child.label }}</span>
                    </button>
                    }
                  </div>
                </div>
                }
              </div>
              }
            }
          </div>

          <!-- Right side: notifications + user -->
          <div class="flex items-center gap-2 flex-shrink-0">
            @if(user) {
            <div class="relative">
              <button
                type="button"
                (click)="toggleNotificationsDropdown()"
                class="relative w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 text-gray-400 hover:text-white flex items-center justify-center border border-white/5 hover:border-white/10"
                title="Notificaciones"
              >
                <i class="pi pi-bell text-sm"></i>
                @if (unreadNotificationsCount() > 0) {
                <span class="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-neutral-900">
                  {{ unreadNotificationsCount() > 99 ? '99+' : unreadNotificationsCount() }}
                </span>
                }
              </button>
              <pt-notifications-dropdown
                [isVisible]="showNotificationsDropdown()"
                [onClose]="closeNotificationsDropdown.bind(this)"
              />
            </div>
            <p-menu #menu [model]="items" popup [autoZIndex]="true" />
            <div
              class="flex items-center gap-2.5 cursor-pointer group px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all duration-200"
              (click)="menu.toggle($event)"
            >
              <div class="relative flex-shrink-0">
                <div class="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex items-center justify-center">
                  <p-avatar [image]="user?.picture" shape="circle" size="normal" styleClass="w-full h-full" />
                </div>
                <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-900"></div>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-semibold text-white truncate leading-tight">
                  {{ store.currentEmployee()?.first_name }} {{ store.currentEmployee()?.father_name }}
                </span>
                <span class="text-[0.65rem] text-gray-500 truncate leading-tight">
                  {{ store.currentEmployee()?.position?.name || 'Sin cargo' }}
                </span>
              </div>
              <i class="pi pi-chevron-down text-gray-500 text-[9px] flex-shrink-0"></i>
            </div>
            }
          </div>
        </div>
      </nav>
      <div class="flex-1 overflow-y-auto"><router-outlet /></div>
    </div>

    } @else {
    <!-- ========== MOBILE ========== -->
    <div class="flex flex-col bg-neutral-950" style="height: 100dvh;">
      <!-- Slim top bar - always visible -->
      <nav class="bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between flex-shrink-0" style="height: 52px; min-height: 52px; padding-top: env(safe-area-inset-top, 0px); z-index: 1000; position: sticky; top: 0;">
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

      <!-- Content area - scrolls between fixed header and footer -->
      <div #scrollContainer id="portal-scroll" class="flex-1 min-h-0 overflow-y-auto pb-[72px]">
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
      /* ── Portal nav bar ── */
      .portal-nav {
        background: linear-gradient(135deg, rgba(10, 10, 10, 0.97), rgba(23, 23, 23, 0.95));
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(12px);
      }

      .portal-nav-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        white-space: nowrap;
        transition: color 0.15s, background 0.15s;
        user-select: none;
        border: 1px solid transparent;
        line-height: 1;
      }
      .portal-nav-item:hover {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.85);
      }
      .portal-nav-active {
        background: rgba(251, 191, 36, 0.08) !important;
        color: #fbbf24 !important;
        border-color: rgba(251, 191, 36, 0.15);
      }

      /* ── Portal dropdown ── */
      .portal-dropdown {
        background: rgba(15, 15, 15, 0.98);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(16px);
      }
      .portal-dropdown-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        text-align: left;
        padding: 8px 12px;
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.6);
        font-size: 13px;
        cursor: pointer;
        transition: background 0.12s, color 0.12s;
        white-space: nowrap;
      }
      .portal-dropdown-item:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
      }
      .portal-dropdown-active {
        color: #fbbf24 !important;
        background: rgba(251, 191, 36, 0.06);
      }

      /* ── Naz theme overrides ── */
      :host-context(.naz-theme) .portal-nav-active,
      .naz-theme .portal-nav-active {
        background: rgba(255, 255, 255, 0.08) !important;
        color: #fff !important;
        border-color: rgba(255, 255, 255, 0.1);
      }
      :host-context(.naz-theme) .portal-dropdown-active,
      .naz-theme .portal-dropdown-active {
        color: #fff !important;
        background: rgba(255, 255, 255, 0.06);
      }

      /* ── PrimeNG menu popup ── */
      ::ng-deep .p-menu {
        background: #0f0f0f !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 0.75rem !important;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6) !important;
        padding: 0.375rem !important;
      }

      ::ng-deep .p-menu .p-menuitem-link {
        padding: 0.625rem 0.875rem !important;
        border-radius: 0.5rem !important;
        transition: all 0.15s ease !important;
      }

      ::ng-deep .p-menu .p-menuitem-link:hover {
        background: rgba(255, 255, 255, 0.06) !important;
      }

      ::ng-deep .p-menu .p-menuitem-link .p-menuitem-text {
        color: rgba(255, 255, 255, 0.7) !important;
        font-size: 0.8125rem !important;
      }

      ::ng-deep .p-menu .p-menuitem-link:hover .p-menuitem-text {
        color: #ffffff !important;
      }

      ::ng-deep .p-menu .p-menuitem-link .p-menuitem-icon {
        color: rgba(255, 255, 255, 0.4) !important;
        font-size: 0.875rem !important;
      }

      ::ng-deep .p-menu .p-menuitem-link:hover .p-menuitem-icon {
        color: rgba(255, 255, 255, 0.7) !important;
      }

      /* ── Avatar ── */
      ::ng-deep .w-8.h-8 .p-avatar {
        width: 100% !important;
        height: 100% !important;
      }
      ::ng-deep .w-8.h-8 .p-avatar img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover;
        border-radius: 50%;
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
  @ViewChild('scrollContainer') scrollContainerRef?: ElementRef<HTMLElement>;

  public auth = inject(AuthService);
  public router = inject(Router);
  public store = inject(DashboardStore);
  public organizationService = inject(OrganizationService);
  public notificationsService = inject(NotificationsService);
  private navigationService = inject(EmployeePortalNavigationService);
  public device = inject(DeviceService);
  public designVersion = inject(DesignVersionService);

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

    // Reconstruir menú cuando cambia la versión de diseño
    effect(() => {
      const isClassic = this.designVersion.isClassic();
      this.items = [
        {
          label: isClassic ? 'Diseño Nuevo' : 'Diseño Clásico',
          icon: 'pi pi-palette',
          command: () => this.designVersion.toggle(),
        },
        { separator: true },
        {
          label: 'Cerrar sesion',
          icon: 'pi pi-sign-out',
          command: () => this.auth.logout(),
        },
      ];
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
    const el = this.scrollContainerRef?.nativeElement;
    if (el) {
      el.style.height = el.offsetHeight + 'px';
      el.style.overflow = 'hidden';
      el.scrollTop = 0;
    }
    this.navigateToSection(tabId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = 0;
          el.style.height = '';
          el.style.overflow = '';
        }
      });
    });
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
