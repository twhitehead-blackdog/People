import { AsyncPipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { filter, Subscription } from 'rxjs';
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
    RouterLink,
    RouterLinkActive,
    ToastModule,
    ConfirmDialogModule,
    MenuModule,
    AvatarModule,
    AsyncPipe,
    Button,
    TooltipModule,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    @let user = auth.user$ | async;
    <div class="h-screen flex flex-col">
      <nav
        class="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b border-neutral-700/50 w-full min-w-0 shadow-lg"
        style="position: relative; z-index: 1000;"
      >
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-16 items-center justify-between">
            <div class="flex items-center">
              <a
                (click)="navigateToHome()"
                class="shrink-0 flex items-center gap-2 group cursor-pointer"
              >
                <img
                  src="images/blackdog.png"
                  class="h-9 transition-transform duration-300 group-hover:scale-105"
                  alt="People"
                />
              </a>
              <div class="hidden md:block">
                <div class="ml-10 flex items-center space-x-3">
                  @for (nav of navSections; track nav.id) { @if (!nav.children)
                  {
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
            </div>
            <div class="flex items-center">
              @if(user) {
              <div class="ml-4 flex items-center md:ml-6 gap-3">
                <div
                  class="relative"
                  (mouseenter)="showNotificationsDropdown.set(true)"
                  (mouseleave)="showNotificationsDropdown.set(false)"
                >
                  <button
                    type="button"
                    (click)="
                      toggleNotificationsDropdown($event);
                      $event.stopPropagation();
                      $event.preventDefault()
                    "
                    class="relative p-2.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/60 transition-all duration-200 text-white border border-gray-600/50 hover:border-gray-500"
                    title="Notificaciones"
                  >
                    <i class="pi pi-bell text-xl relative"></i>
                    @if (unreadComplaintsCount() > 0) {
                    <span
                      class="absolute -top-0.5 -right-0.5 text-yellow-400 font-bold leading-none"
                      style="font-size: 9px; min-width: 12px; text-align: center;"
                    >
                      {{
                        unreadComplaintsCount() > 99
                          ? '99+'
                          : unreadComplaintsCount()
                      }}
                    </span>
                    }
                  </button>
                  @if (showNotificationsDropdown()) {
                  <div
                    class="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50"
                    (mouseenter)="showNotificationsDropdown.set(true)"
                    (mouseleave)="showNotificationsDropdown.set(false)"
                  >
                    <div class="p-2">
                      <div
                        class="px-3 py-2 text-sm font-semibold text-white border-b border-neutral-700 mb-2"
                      >
                        Notificaciones
                      </div>
                      @if (notificationsList().length === 0) {
                      <div class="px-3 py-4 text-center text-sm text-gray-400">
                        No hay notificaciones
                      </div>
                      } @else { @for (notification of notificationsList(); track
                      notification.id) {
                      <div
                        class="px-3 py-2 rounded-lg hover:bg-neutral-700/50 cursor-pointer transition-colors mb-1"
                        (click)="handleNotificationClick(notification)"
                      >
                        <div class="flex items-start gap-2">
                          <i
                            class="pi pi-comment text-yellow-400 text-sm mt-0.5 flex-shrink-0"
                          ></i>
                          <div class="flex-1 min-w-0">
                            <div class="text-xs text-gray-400 mb-1">
                              {{
                                formatNotificationTime(notification.created_at)
                              }}
                            </div>
                            <div class="text-sm text-white line-clamp-2">
                              {{ notification.preview }}
                            </div>
                            @if (notification.complaint_id) {
                            <div
                              class="text-xs text-yellow-400 mt-1 flex items-center gap-1"
                            >
                              Ver queja
                              <i class="pi pi-arrow-right text-xs"></i>
                            </div>
                            }
                          </div>
                        </div>
                      </div>
                      } }
                    </div>
                  </div>
                  }
                </div>
                <div class="hidden md:flex items-center gap-3">
                  <p-menu #menu [model]="items" popup />
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
                        {{ store.currentEmployee()?.first_name }}
                        {{ store.currentEmployee()?.father_name }}
                      </div>
                      <div
                        class="text-xs text-gray-400 group-hover:text-gray-300 transition-colors truncate"
                      >
                        {{
                          store.currentEmployee()?.position?.name || 'Sin cargo'
                        }}
                      </div>
                    </div>
                    <i
                      class="pi pi-chevron-down text-gray-400 group-hover:text-gray-300 transition-colors text-xs flex-shrink-0"
                    ></i>
                  </div>
                </div>
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
                class="text-white hover:bg-gray-700/50"
              />
            </div>
          </div>
        </div>
        <div
          class="md:hidden border-t border-neutral-700/50 bg-neutral-800/90 backdrop-blur-sm"
          [class.hidden]="isCollapsed()"
        >
          <div class="space-y-2 px-2 pt-2 pb-3 sm:px-3">
            @if(user) {
            <button
              type="button"
              (click)="navigateToSection('notifications')"
              class="relative w-full rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer text-left"
            >
              <i class="pi pi-bell text-lg"></i>
              <span>Notificaciones</span>
              @if (unreadComplaintsCount() > 0) {
              <span
                class="ml-auto w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white"
              >
                {{
                  unreadComplaintsCount() > 99 ? '99+' : unreadComplaintsCount()
                }}
              </span>
              }
            </button>
            } @for (nav of navSections; track nav.id) { @if (!nav.children) {
            <button
              type="button"
              (click)="navigateToSection(nav.section!)"
              [class.selected]="isActiveSection(nav.section!)"
              class="w-full rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer text-left"
            >
              <i [class]="nav.icon + ' text-lg'"></i>
              <span>{{ nav.label }}</span>
            </button>
            } @else {
            <div
              class="rounded-lg bg-neutral-900/40 border border-neutral-700/60"
            >
              <button
                type="button"
                (click)="toggleMobileCategory(nav.id)"
                class="w-full px-4 py-3 text-base font-medium text-gray-300 flex items-center justify-between"
              >
                <span class="flex items-center gap-3">
                  <i [class]="nav.icon + ' text-lg'"></i>
                  {{ nav.label }}
                </span>
                <i
                  class="pi"
                  [class.pi-chevron-up]="isMobileCategoryOpen(nav.id)"
                  [class.pi-chevron-down]="!isMobileCategoryOpen(nav.id)"
                ></i>
              </button>
              @if (isMobileCategoryOpen(nav.id)) {
              <div class="pb-2">
                @for (child of nav.children; track child.id) {
                <button
                  type="button"
                  (click)="navigateToSection(child.section)"
                  [class.selected]="isActiveSection(child.section)"
                  class="w-full px-6 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex gap-2 items-center transition-colors"
                >
                  <i [class]="child.icon + ' text-sm'"></i>
                  <span>{{ child.label }}</span>
                </button>
                }
              </div>
              }
            </div>
            } }
          </div>
          @if(user) {
          <div class="border-t border-gray-700/50 pt-4 pb-3 px-5">
            <div class="flex items-center gap-3">
              <div class="relative">
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
              <div class="flex-1">
                <div class="text-base font-semibold text-white">
                  {{ store.currentEmployee()?.first_name }}
                  {{ store.currentEmployee()?.father_name }}
                </div>
                <div class="text-sm text-gray-400">
                  {{ store.currentEmployee()?.position?.name }}
                </div>
              </div>
            </div>
          </div>
          }
        </div>
      </nav>
      <div class="flex-1 overflow-y-auto"><router-outlet /></div>
    </div>
  `,
  styles: [
    `
      .selected {
        @apply bg-gradient-to-r from-gray-700/80 to-gray-600/80 text-white shadow-md transition-all duration-300 ease-in-out;
        border-left: 3px solid #fbbf24;
      }

      ::ng-deep .p-menu {
        background: #1f2937 !important;
        border: 1px solid rgba(251, 191, 36, 0.2) !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
        padding: 0.5rem !important;
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
  public http = inject(HttpClient);

  public isCollapsed = signal(true);
  public currentFragment = signal<string | null>(null);
  public openDropdown = signal<string | null>(null);
  public mobileDropdowns = signal<Record<string, boolean>>({});
  public showNotificationsDropdown = signal(false);
  private routerSubscription?: Subscription;
  private dropdownTimeout: any = null;

  // API para obtener mensajes sin leer de HR con detalles
  public unreadMessagesApi = httpResource<any[]>(() => {
    const employee = this.store.currentEmployee();
    if (!employee?.id) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
      method: 'GET',
      params: {
        select: 'id,complaint_id,message,created_at,sender_type',
        sender_type: 'eq.hr',
        is_read: 'eq.false',
        order: 'created_at.desc',
        limit: '20',
      },
    };
  });

  // API para obtener quejas del empleado (para filtrar notificaciones)
  public employeeComplaintsApi = httpResource<any[]>(() => {
    const employee = this.store.currentEmployee();
    if (!employee?.id) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints`,
      method: 'GET',
      params: {
        select: 'id',
        creator_employee_id: `eq.${employee.id}`,
      },
    };
  });

  // Lista de notificaciones formateadas
  public notificationsList = computed(() => {
    const messages = this.unreadMessagesApi.value() || [];
    const employee = this.store.currentEmployee();
    if (!employee?.id) return [];

    const myComplaints = this.employeeComplaintsApi.value() || [];
    const myComplaintIds = new Set(myComplaints.map((c: any) => c.id));
    const filteredMessages = messages.filter(
      (msg: any) => msg.complaint_id && myComplaintIds.has(msg.complaint_id)
    );

    const notifications = filteredMessages.map((msg: any) => ({
      id: msg.id,
      complaint_id: msg.complaint_id,
      message: msg.message,
      created_at: msg.created_at,
      preview: this.truncateMessage(msg.message, 100),
    }));

    // Agregar notificación de cuenta no verificada si aplica
    if (
      (employee.account_approved === false ||
        employee.account_approved === null ||
        employee.account_approved === undefined) &&
      employee.has_portal_access
    ) {
      notifications.unshift({
        id: 'account-pending-approval',
        complaint_id: null,
        message:
          'Tu cuenta está pendiente de aprobación por parte del administrador. Una vez aprobada, tendrás acceso completo al portal.',
        created_at: new Date().toISOString(),
        preview:
          'Tu cuenta está pendiente de aprobación por parte del administrador...',
      });
    }

    return notifications.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  public unreadComplaintsCount = computed(() => {
    const employee = this.store.currentEmployee();
    const baseCount = this.notificationsList().length;
    // Ya está incluido en notificationsList, así que solo retornamos el tamaño
    return baseCount;
  });

  public navSections: NavSection[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'pi pi-home',
      section: 'dashboard',
    },
    {
      id: 'personal',
      label: 'Mi Portal',
      icon: 'pi pi-user',
      children: [
        {
          id: 'profile',
          label: 'Mi Perfil',
          icon: 'pi pi-id-card',
          section: 'profile',
        },
        {
          id: 'schedule',
          label: 'Mi Horario',
          icon: 'pi pi-calendar',
          section: 'schedule',
        },
        {
          id: 'timelogs',
          label: 'Mis Marcaciones',
          icon: 'pi pi-calendar-clock',
          section: 'timelogs',
        },
        {
          id: 'lates',
          label: 'Mis Tardanzas',
          icon: 'pi pi-clock',
          section: 'lates',
        },
      ],
    },
    {
      id: 'management',
      label: 'Gestiones',
      icon: 'pi pi-briefcase',
      children: [
        {
          id: 'disabilities',
          label: 'Incapacidades',
          icon: 'pi pi-file-plus',
          section: 'disabilities',
        },
        {
          id: 'documents',
          label: 'Solicitar Documentos',
          icon: 'pi pi-file-edit',
          section: 'documents',
        },
        {
          id: 'complaints',
          label: 'Buzón de Quejas',
          icon: 'pi pi-comments',
          section: 'notifications',
        },
      ],
    },
  ];

  public items: MenuItem[] = [
    {
      label: 'Cerrar sesion',
      icon: 'pi pi-sign-out',
      command: () => this.auth.logout(),
    },
  ];

  private updateFragment() {
    const url = this.router.url;
    const fragment = url.includes('#') ? url.split('#')[1] : null;
    this.currentFragment.set(fragment);
  }

  navigateToHome() {
    // Si es admin, navegar al timeclock; si es empleado, también al timeclock
    if (this.store.isAdmin() && !this.store.hasPortalAccessOnly()) {
      this.router.navigate(['/timeclock']);
    } else {
      // Employee: navegar al reloj de marcaciones
      this.router.navigate(['/timeclock']);
    }
  }

  navigateToSection(section: string) {
    this.router.navigate(['/employee-portal'], { fragment: section });
    this.currentFragment.set(section);
    this.openDropdown.set(null);
    // Cerrar menú móvil si está abierto
    if (!this.isCollapsed()) {
      this.isCollapsed.set(true);
    }
  }

  isActiveSection(section: string): boolean {
    const fragment = this.currentFragment();
    if (section === 'dashboard') {
      return !fragment || fragment === 'dashboard';
    }
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

  toggleNotificationsDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    // Solo mostrar/ocultar el dropdown, NO navegar
    const currentValue = this.showNotificationsDropdown();
    this.showNotificationsDropdown.set(!currentValue);

    // Asegurar que no se navegue
    if (event && event.target) {
      const target = event.target as HTMLElement;
      if (target.closest('a') || target.closest('[routerLink]')) {
        event.stopPropagation();
        event.preventDefault();
      }
    }
  }

  handleNotificationClick(notification: any) {
    // Prevenir navegación si es la notificación de cuenta pendiente
    if (notification.id === 'account-pending-approval') {
      // Solo cerrar el dropdown, no navegar
      this.showNotificationsDropdown.set(false);
      return;
    }

    if (notification.complaint_id) {
      // Navegar a la queja específica
      this.router.navigate(['/employee-portal'], {
        fragment: 'notifications',
        queryParams: { complaintId: notification.complaint_id },
      });
    } else {
      // Si no hay complaint_id, simplemente navegar a la vista general de notificaciones
      this.navigateToSection('notifications');
    }
    this.showNotificationsDropdown.set(false);
  }

  formatNotificationTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  private truncateMessage(message: string, maxLength: number): string {
    if (!message || message.length <= maxLength) {
      return message || '';
    }
    return message.substring(0, maxLength) + '...';
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

    // Recargar notificaciones cada 10 segundos
    setInterval(() => {
      this.unreadMessagesApi.reload();
      this.employeeComplaintsApi.reload();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
