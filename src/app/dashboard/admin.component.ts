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

@Component({
  selector: 'pt-admin',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<header
      class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md"
    >
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex items-center justify-center gap-6">
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
                isActiveRoute('hr/disabilities') ||
                isActiveRoute('job-applications')
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
              <!-- Incapacidades -->
              <a
                routerLink="hr/disabilities"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('hr/disabilities')"
                [class.text-amber-300]="isActiveRoute('hr/disabilities')"
              >
                <i class="pi pi-heart text-sm"></i>
                <span>Incapacidades</span>
              </a>

              <!-- Aplicaciones de Trabajo -->
              <a
                routerLink="job-applications"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('job-applications')"
                [class.text-amber-300]="isActiveRoute('job-applications')"
              >
                <i class="pi pi-briefcase text-sm"></i>
                <span>Aplicaciones de Trabajo</span>
              </a>
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
              <a
                routerLink="employees"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('employees')"
                [class.text-amber-300]="isActiveRoute('employees')"
              >
                <i class="pi pi-users text-sm"></i>
                <span>Empleados</span>
              </a>

              <!-- Organigrama -->
              <a
                routerLink="organigrama"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('organigrama')"
                [class.text-amber-300]="isActiveRoute('organigrama')"
              >
                <i class="pi pi-sitemap text-sm"></i>
                <span>Organigrama</span>
              </a>

              <!-- Empresas -->
              <a
                routerLink="companies"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('companies')"
                [class.text-amber-300]="isActiveRoute('companies')"
              >
                <i class="pi pi-building text-sm"></i>
                <span>Empresas</span>
              </a>

              <!-- Cargos -->
              <a
                routerLink="positions"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('positions')"
                [class.text-amber-300]="isActiveRoute('positions')"
              >
                <i class="pi pi-user-plus text-sm"></i>
                <span>Cargos</span>
              </a>

              <!-- Sucursales -->
              <a
                routerLink="branches"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('branches')"
                [class.text-amber-300]="isActiveRoute('branches')"
              >
                <i class="pi pi-shop text-sm"></i>
                <span>Sucursales</span>
              </a>

              <!-- Areas -->
              <a
                routerLink="departments"
                class="block px-4 py-2 text-sm text-gray-200 hover:bg-neutral-700 hover:text-white transition-colors duration-150 flex items-center gap-2"
                [class.bg-neutral-700]="isActiveRoute('departments')"
                [class.text-amber-300]="isActiveRoute('departments')"
              >
                <i class="pi pi-sitemap text-sm"></i>
                <span>Areas</span>
              </a>
            </div>
          </div>

          <!-- Enlaces directos a la derecha -->
          <div class="flex items-center gap-6">
            <!-- Configuración -->
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

            <!-- Buzón de Quejas -->
            <a
              routerLink="complaints-inbox"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 relative"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
            >
              <i class="pi pi-inbox text-base"></i>
              <span>Buzón de Quejas</span>
              @if (unreadCount() > 0) {
              <span
                class="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg"
              >
                {{ unreadCount() > 99 ? '99+' : unreadCount() }}
              </span>
              }
            </a>
          </div>
        </div>
      </div>
    </header>
    <main class="bg-neutral-900 min-h-screen">
      <div class="mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <router-outlet />
      </div>
    </main>`,
  styles: `
    .selected {
      @apply bg-gradient-to-r from-gray-700/80 to-gray-600/80 text-white shadow-md transition-all duration-300 ease-in-out;
      border-left: 3px solid #FBBF24;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private refreshInterval?: number;
  private dropdownTimeout?: number;

  // Estado de los dropdowns
  public openDropdownId = signal<string | null>(null);

  // API para obtener mensajes sin leer para HR
  public unreadMessagesApi = httpResource<any[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
    method: 'GET',
    params: {
      select: 'complaint_id',
      sender_type: 'eq.employee',
      is_read: 'eq.false',
    },
  }));

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
      path.includes('departments')
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
