import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionsService } from '../../services/permissions.service';
import { DashboardStore } from '../../stores/dashboard.store';

interface Module {
  id: string;
  label: string;
  description: string;
  icon: string;
  target: string;
  moduleId?: string;
  external?: boolean;
  tw: string;
}

const PEOPLE_MODULES: Module[] = [
  {
    id: 'home',
    label: 'Dashboard RRHH',
    description: 'KPIs y métricas ejecutivas',
    icon: 'pi-chart-bar',
    target: 'admin/home',
    moduleId: 'home',
    tw: 'blue',
  },
  {
    id: 'admin',
    label: 'Administración',
    description: 'Empleados, posiciones y más',
    icon: 'pi-building',
    target: 'admin',
    moduleId: 'admin',
    tw: 'violet',
  },
  {
    id: 'time_management',
    label: 'Gestión de tiempo',
    description: 'Horarios, turnos y timelogs',
    icon: 'pi-clock',
    target: 'time-management',
    moduleId: 'time_management',
    tw: 'emerald',
  },
  {
    id: 'payroll',
    label: 'Planilla',
    description: 'Nóminas, deducciones y décimo',
    icon: 'pi-wallet',
    target: 'payroll',
    moduleId: 'payroll',
    tw: 'amber',
  },
  {
    id: 'timeclock',
    label: 'Reloj',
    description: 'Registro de entradas y salidas',
    icon: 'pi-stopwatch',
    target: 'timeclock',
    moduleId: 'timeclock',
    tw: 'rose',
  },
  {
    id: 'branch_manager',
    label: 'Gerente de Sucursal',
    description: 'Gestión de sucursal',
    icon: 'pi-sitemap',
    target: 'branch-manager',
    moduleId: 'branch_manager',
    tw: 'orange',
  },
  {
    id: 'my_portal',
    label: 'Mi Portal',
    description: 'Mi perfil y solicitudes',
    icon: 'pi-user',
    target: 'employee-portal',
    tw: 'fuchsia',
  },
];

const EXTERNAL_MODULES: Module[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'KPIs y ventas por tienda',
    icon: 'pi-chart-line',
    target: 'analytics',
    tw: 'teal',
  },
  {
    id: 'dashboards',
    label: 'Asistencias en vivo',
    description: 'Dashboard de asistencia',
    icon: 'pi-objects-column',
    target: 'live',
    tw: 'indigo',
  },
  {
    id: 'it',
    label: 'BD IT',
    description: 'Inventario y soporte técnico',
    icon: 'pi-desktop',
    target: 'https://it.blackdogpanama.com',
    external: true,
    tw: 'slate',
  },
  {
    id: 'deploy',
    label: 'Deploy',
    description: 'CI/CD y deploys automáticos',
    icon: 'pi-upload',
    target: 'https://deploy.blackdogpanama.com',
    external: true,
    tw: 'pink',
  },
  {
    id: 'agent',
    label: 'Agente IA',
    description: 'Asistente inteligente',
    icon: 'pi-android',
    target: 'https://agent.blackdogpanama.com',
    external: true,
    tw: 'purple',
  },
];

const COLOR_MAP: Record<string, { hex: string; bgCls: string; iconCls: string; hoverBorderCls: string; hoverShadowCls: string }> = {
  blue:    { hex: '#60a5fa', bgCls: 'bg-blue-500/15',    iconCls: 'text-blue-400',    hoverBorderCls: 'hover:border-blue-500/40',    hoverShadowCls: 'hover:shadow-blue-500/20' },
  violet:  { hex: '#a78bfa', bgCls: 'bg-violet-500/15',  iconCls: 'text-violet-400',  hoverBorderCls: 'hover:border-violet-500/40',  hoverShadowCls: 'hover:shadow-violet-500/20' },
  emerald: { hex: '#34d399', bgCls: 'bg-emerald-500/15', iconCls: 'text-emerald-400', hoverBorderCls: 'hover:border-emerald-500/40', hoverShadowCls: 'hover:shadow-emerald-500/20' },
  amber:   { hex: '#fbbf24', bgCls: 'bg-amber-500/15',   iconCls: 'text-amber-400',   hoverBorderCls: 'hover:border-amber-500/40',   hoverShadowCls: 'hover:shadow-amber-500/20' },
  rose:    { hex: '#fb7185', bgCls: 'bg-rose-500/15',    iconCls: 'text-rose-400',    hoverBorderCls: 'hover:border-rose-500/40',    hoverShadowCls: 'hover:shadow-rose-500/20' },
  orange:  { hex: '#fb923c', bgCls: 'bg-orange-500/15',  iconCls: 'text-orange-400',  hoverBorderCls: 'hover:border-orange-500/40',  hoverShadowCls: 'hover:shadow-orange-500/20' },
  fuchsia: { hex: '#e879f9', bgCls: 'bg-fuchsia-500/15', iconCls: 'text-fuchsia-400', hoverBorderCls: 'hover:border-fuchsia-500/40', hoverShadowCls: 'hover:shadow-fuchsia-500/20' },
  teal:    { hex: '#2dd4bf', bgCls: 'bg-teal-500/15',    iconCls: 'text-teal-400',    hoverBorderCls: 'hover:border-teal-500/40',    hoverShadowCls: 'hover:shadow-teal-500/20' },
  indigo:  { hex: '#818cf8', bgCls: 'bg-indigo-500/15',  iconCls: 'text-indigo-400',  hoverBorderCls: 'hover:border-indigo-500/40',  hoverShadowCls: 'hover:shadow-indigo-500/20' },
  pink:    { hex: '#f472b6', bgCls: 'bg-pink-500/15',    iconCls: 'text-pink-400',    hoverBorderCls: 'hover:border-pink-500/40',    hoverShadowCls: 'hover:shadow-pink-500/20' },
  purple:  { hex: '#c084fc', bgCls: 'bg-purple-500/15',  iconCls: 'text-purple-400',  hoverBorderCls: 'hover:border-purple-500/40',  hoverShadowCls: 'hover:shadow-purple-500/20' },
  slate:   { hex: '#94a3b8', bgCls: 'bg-slate-500/15',   iconCls: 'text-slate-400',   hoverBorderCls: 'hover:border-slate-500/40',   hoverShadowCls: 'hover:shadow-slate-500/20' },
};

@Component({
  selector: 'pt-app-launcher',
  standalone: true,
  template: `
    <div class="bg-[#0a0a0a] px-2 sm:px-6 md:px-10 py-6 space-y-8" style="min-height: 100dvh">

      <!-- Greeting -->
      <div class="flex flex-col items-center text-center gap-1 pt-2">
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight
                   bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          @if (firstName()) {
            Hola, <span class="text-amber-400">{{ firstName() }}</span>
          } @else {
            Bienvenido
          }
        </h1>
        <p class="text-gray-400 text-sm">¿A dónde vas hoy?</p>
      </div>

      <!-- People modules -->
      @if (visiblePeopleModules().length > 0) {
      <section>
        <div class="flex items-center gap-3 mb-4 max-w-5xl mx-auto">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-widest">People</span>
          <div class="flex-1 h-px bg-white/[0.06]"></div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 max-w-5xl mx-auto">
          @for (mod of visiblePeopleModules(); track mod.id) {
            @let c = colors(mod.tw);
            <button (click)="open(mod)" [title]="mod.description"
               class="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10
                      p-4 md:p-5 flex flex-col items-center gap-2.5 text-center
                      transition-all duration-300 hover:bg-white/10 hover:shadow-lg cursor-pointer outline-none"
               [class]="c.hoverBorderCls + ' ' + c.hoverShadowCls">
              <div class="absolute top-0 right-0 w-14 h-14 rounded-full -translate-y-1/2 translate-x-1/2
                          opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                   [class]="c.bgCls"></div>
              <div class="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   [class]="c.bgCls">
                <i class="pi text-lg" [class]="mod.icon + ' ' + c.iconCls"></i>
              </div>
              <span class="text-xs font-semibold text-white leading-tight">{{ mod.label }}</span>
              <span class="text-[0.65rem] text-gray-500 leading-snug hidden sm:block">{{ mod.description }}</span>
            </button>
          }
        </div>
      </section>
      }

      <!-- Servicios externos -->
      <section>
        <div class="flex items-center gap-3 mb-4 max-w-5xl mx-auto">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Servicios</span>
          <div class="flex-1 h-px bg-white/[0.06]"></div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
          @for (mod of EXTERNAL_MODULES; track mod.id) {
            @let c = colors(mod.tw);
            <button (click)="open(mod)" [title]="mod.description"
               class="group relative overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.07]
                      p-4 md:p-5 flex flex-col items-center gap-2.5 text-center
                      transition-all duration-300 hover:bg-white/[0.07] hover:shadow-lg cursor-pointer outline-none"
               [class]="c.hoverBorderCls + ' ' + c.hoverShadowCls">
              <div class="absolute top-0 right-0 w-14 h-14 rounded-full -translate-y-1/2 translate-x-1/2
                          opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                   [class]="c.bgCls"></div>
              <div class="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   [class]="c.bgCls">
                <i class="pi text-lg" [class]="mod.icon + ' ' + c.iconCls"></i>
              </div>
              <span class="text-xs font-semibold text-white/80 leading-tight">{{ mod.label }}</span>
              <span class="text-[0.65rem] text-gray-600 leading-snug hidden sm:block">{{ mod.description }}</span>
            </button>
          }
        </div>
      </section>

    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class AppLauncherComponent {
  private router = inject(Router);
  private permissionsService = inject(PermissionsService);
  private store = inject(DashboardStore);

  public EXTERNAL_MODULES = EXTERNAL_MODULES;

  public firstName = computed(() =>
    this.store.currentEmployee()?.first_name?.trim() || null
  );

  public visiblePeopleModules = computed(() =>
    PEOPLE_MODULES.filter((m) =>
      m.moduleId ? this.permissionsService.canAccessModule(m.moduleId) : true
    )
  );

  public colors(tw: string) {
    return COLOR_MAP[tw] ?? COLOR_MAP['slate'];
  }

  public open(mod: Module): void {
    if (mod.external) {
      window.location.href = mod.target;
    } else {
      this.router.navigate(['/' + mod.target]);
    }
  }
}
