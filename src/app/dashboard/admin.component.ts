import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HttpClient, httpResource } from '@angular/common/http';

@Component({
  selector: 'pt-admin',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<header class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div class="block w-full overflow-x-auto">
          <div class="flex gap-2 min-w-max">
            <a
              routerLink="employees"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-users text-base"></i> <span>Empleados</span></a
            >
            <a
              routerLink="companies"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-building text-base"></i> <span>Empresas</span></a
            >
            <a
              routerLink="positions"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-user-plus text-base"></i> <span>Cargos</span></a
            >
            <a
              routerLink="branches"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-shop text-base"></i> <span>Sucursales</span></a
            >
            <a
              routerLink="departments"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-sitemap text-base"></i> <span>Areas</span></a
            >
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
              ><i class="pi pi-cog text-base"></i> <span>Configuración</span></a
            >
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
              ><i class="pi pi-inbox text-base"></i> <span>Buzón</span>
              @if (unreadCount() > 0) {
                <span class="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg">
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
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private refreshInterval?: number;

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
    const uniqueComplaints = new Set(messages.map(m => m.complaint_id));
    return uniqueComplaints.size;
  });

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
  }
}
