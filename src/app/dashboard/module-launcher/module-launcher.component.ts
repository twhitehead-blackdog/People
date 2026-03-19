import { Component, computed, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PermissionsService } from '../../services/permissions.service';

interface SubItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  moduleId?: string;
  subModuleId?: string;
  tw: string;
}

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
  cyan:    { hex: '#22d3ee', bgCls: 'bg-cyan-500/15',    iconCls: 'text-cyan-400',    hoverBorderCls: 'hover:border-cyan-500/40',    hoverShadowCls: 'hover:shadow-cyan-500/20' },
  lime:    { hex: '#a3e635', bgCls: 'bg-lime-500/15',    iconCls: 'text-lime-400',    hoverBorderCls: 'hover:border-lime-500/40',    hoverShadowCls: 'hover:shadow-lime-500/20' },
};

const ADMIN_ITEMS: SubItem[] = [
  { id: 'home',            label: 'Dashboard RRHH',    description: 'KPIs y métricas ejecutivas',      icon: 'pi-chart-bar',      route: '/admin/home',             moduleId: 'home',  tw: 'blue' },
  { id: 'employees',       label: 'Empleados',          description: 'Gestión de personal',             icon: 'pi-users',          route: '/admin/employees',        moduleId: 'admin', subModuleId: 'employees',        tw: 'violet' },
  { id: 'organigrama',     label: 'Organigrama',        description: 'Estructura organizacional',       icon: 'pi-sitemap',        route: '/admin/organigrama',      moduleId: 'admin', subModuleId: 'organigrama',      tw: 'indigo' },
  { id: 'companies',       label: 'Empresas',           description: 'Gestión de empresas',             icon: 'pi-briefcase',      route: '/admin/companies',        moduleId: 'admin', subModuleId: 'companies',        tw: 'slate' },
  { id: 'departments',     label: 'Departamentos',      description: 'Áreas y departamentos',           icon: 'pi-table',          route: '/admin/departments',      moduleId: 'admin', subModuleId: 'departments',      tw: 'teal' },
  { id: 'positions',       label: 'Puestos',            description: 'Cargos y posiciones',             icon: 'pi-tag',            route: '/admin/positions',        moduleId: 'admin', subModuleId: 'positions',        tw: 'cyan' },
  { id: 'branches',        label: 'Sucursales',         description: 'Gestión de sucursales',           icon: 'pi-map-marker',     route: '/admin/branches',         moduleId: 'admin', subModuleId: 'branches',         tw: 'emerald' },
  { id: 'settings',        label: 'Configuración',      description: 'Ajustes del sistema',             icon: 'pi-cog',            route: '/admin/settings',         moduleId: 'admin', subModuleId: 'settings',         tw: 'slate' },
  { id: 'user-management', label: 'Usuarios',           description: 'Gestión de usuarios',             icon: 'pi-user-edit',      route: '/admin/user-management',  moduleId: 'admin', subModuleId: 'user_management',  tw: 'orange' },
  { id: 'permissions',     label: 'Permisos',           description: 'Control de accesos',              icon: 'pi-shield',         route: '/admin/permissions',      moduleId: 'admin', subModuleId: 'permissions',      tw: 'rose' },
  { id: 'complaints',      label: 'Buzón de quejas',    description: 'Gestión de quejas',               icon: 'pi-inbox',          route: '/admin/complaints-inbox', moduleId: 'admin', subModuleId: 'complaints',       tw: 'amber' },
  { id: 'job-apps',        label: 'Solicitudes empleo', description: 'Feria de empleo',                 icon: 'pi-file',           route: '/admin/job-applications', moduleId: 'admin', subModuleId: 'job_applications', tw: 'lime' },
  { id: 'devices',         label: 'Inventario IT',      description: 'Dispositivos y equipos',          icon: 'pi-desktop',        route: '/admin/device-inventory', moduleId: 'admin', subModuleId: 'device_inventory', tw: 'purple' },
  { id: 'hr-time',         label: 'Tiempo RRHH',        description: 'Dashboard de tiempo',             icon: 'pi-calendar',       route: '/admin/hr/time-dashboard',moduleId: 'hr',    subModuleId: 'hr_time_dashboard',tw: 'fuchsia' },
  { id: 'hr-disabilities', label: 'Solicitudes RRHH',   description: 'Gestión de solicitudes',          icon: 'pi-heart',          route: '/admin/hr/disabilities',  moduleId: 'hr',    subModuleId: 'hr_disabilities',  tw: 'pink' },
  { id: 'surveys',         label: 'Encuestas',          description: 'Encuestas y sondeos',             icon: 'pi-comment',        route: '/admin/surveys',          moduleId: 'hr',    subModuleId: 'hr_surveys',       tw: 'teal' },
  { id: 'audit-tasks',     label: 'Auditoría',          description: 'Control de tareas',               icon: 'pi-list-check',     route: '/admin/audit-tasks',      moduleId: 'admin', subModuleId: 'audit_tasks',      tw: 'amber' },
  { id: 'performance',     label: 'Performance 360',    description: 'Evaluación de desempeño',         icon: 'pi-star',           route: '/admin/performance',      moduleId: 'performance',                          tw: 'yellow' },
];

const PAYROLL_ITEMS: SubItem[] = [
  { id: 'payrolls',     label: 'Nóminas',        description: 'Gestión de planillas',      icon: 'pi-wallet',         route: '/payroll/payrolls',    moduleId: 'payroll', subModuleId: 'payrolls',    tw: 'amber' },
  { id: 'decimo',       label: 'Décimo',         description: 'Décimo tercer mes',         icon: 'pi-calendar-plus',  route: '/payroll/decimo',      moduleId: 'payroll', subModuleId: 'payrolls',    tw: 'orange' },
  { id: 'vacations',    label: 'Vacaciones',     description: 'Pago de vacaciones',        icon: 'pi-sun',            route: '/payroll/vacations',   moduleId: 'payroll', subModuleId: 'payrolls',    tw: 'yellow' },
  { id: 'liquidation',  label: 'Liquidaciones',  description: 'Liquidaciones de personal', icon: 'pi-file-export',    route: '/payroll/liquidation', moduleId: 'payroll', subModuleId: 'payrolls',    tw: 'rose' },
  { id: 'creditors',    label: 'Acreedores',     description: 'Gestión de acreedores',     icon: 'pi-building-columns',route: '/payroll/creditors',  moduleId: 'payroll', subModuleId: 'creditors',   tw: 'violet' },
  { id: 'banks',        label: 'Bancos',         description: 'Cuentas bancarias',         icon: 'pi-credit-card',    route: '/payroll/banks',       moduleId: 'payroll', subModuleId: 'banks',       tw: 'blue' },
  { id: 'import',       label: 'Importar',       description: 'Importar datos de planilla',icon: 'pi-upload',         route: '/payroll/import',      moduleId: 'payroll',                             tw: 'slate' },
];

const TIME_ITEMS: SubItem[] = [
  { id: 'timelogs',     label: 'Registros',      description: 'Registros de tiempo',       icon: 'pi-clock',          route: '/time-management/timelogs',     moduleId: 'time_management', subModuleId: 'timelogs',       tw: 'emerald' },
  { id: 'timetables',   label: 'Horarios',       description: 'Horarios de empleados',     icon: 'pi-calendar',       route: '/time-management/timetables',   moduleId: 'time_management', subModuleId: 'timetables',     tw: 'teal' },
  { id: 'schedules',    label: 'Programación',   description: 'Programación de turnos',    icon: 'pi-calendar-clock', route: '/time-management/schedules',    moduleId: 'time_management', subModuleId: 'schedules',      tw: 'cyan' },
  { id: 'shifts',       label: 'Turnos',         description: 'Gestión de turnos',         icon: 'pi-replay',         route: '/time-management/shifts',       moduleId: 'time_management', subModuleId: 'shifts',         tw: 'blue' },
  { id: 'vet-schedule', label: 'Horario Vet',    description: 'Programación veterinaria',  icon: 'pi-heart-fill',     route: '/time-management/vet-schedule', moduleId: 'time_management', subModuleId: 'vet_schedule',   tw: 'rose' },
  { id: 'salon',        label: 'Horario Grooming',description: 'Programación de grooming', icon: 'pi-scissors',       route: '/time-management/salon-schedule',moduleId: 'time_management', subModuleId: 'salon_schedule', tw: 'pink' },
];

const MODULE_CONFIGS: Record<string, { title: string; icon: string; parentRoute: string; items: SubItem[] }> = {
  admin:           { title: 'Administración',    icon: 'pi-building', parentRoute: '/launcher', items: ADMIN_ITEMS },
  payroll:         { title: 'Planilla',          icon: 'pi-wallet',   parentRoute: '/launcher', items: PAYROLL_ITEMS },
  'time-management':{ title: 'Gestión de Tiempo',icon: 'pi-clock',    parentRoute: '/launcher', items: TIME_ITEMS },
};

@Component({
  selector: 'pt-module-launcher',
  standalone: true,
  template: `
    <div class="min-h-screen bg-[#0a0a0a] px-4 sm:px-6 md:px-10 py-8 space-y-8">

      <!-- Header con breadcrumb -->
      <div class="flex flex-col items-center text-center gap-2 pt-2">
        <button
          (click)="goBack()"
          class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-1 cursor-pointer"
        >
          <i class="pi pi-arrow-left text-[10px]"></i>
          <span>Inicio</span>
        </button>
        <div class="flex items-center gap-2">
          <i class="pi text-2xl" [class]="config().icon + ' text-amber-400'"></i>
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight
                     bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {{ config().title }}
          </h1>
        </div>
        <p class="text-gray-500 text-sm">Selecciona una sección</p>
      </div>

      <!-- Items grid -->
      @if (visibleItems().length > 0) {
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 max-w-5xl mx-auto">
        @for (item of visibleItems(); track item.id) {
          @let c = colors(item.tw);
          <button (click)="navigate(item.route)"
             class="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10
                    p-4 md:p-5 flex flex-col items-center gap-2.5 text-center
                    transition-all duration-300 hover:bg-white/10 hover:shadow-lg cursor-pointer outline-none"
             [class]="c.hoverBorderCls + ' ' + c.hoverShadowCls">
            <div class="absolute top-0 right-0 w-14 h-14 rounded-full -translate-y-1/2 translate-x-1/2
                        opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                 [class]="c.bgCls"></div>
            <div class="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 [class]="c.bgCls">
              <i class="pi text-lg" [class]="item.icon + ' ' + c.iconCls"></i>
            </div>
            <span class="text-xs font-semibold text-white leading-tight">{{ item.label }}</span>
            <span class="text-[0.65rem] text-gray-500 leading-snug hidden sm:block">{{ item.description }}</span>
          </button>
        }
      </div>
      }

    </div>
  `,
  styles: [`:host { display: block; width: 100%; }`],
})
export class ModuleLauncherComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private permissions = inject(PermissionsService);

  public config = computed(() => {
    const moduleId = this.route.snapshot.data['module'] as string;
    return MODULE_CONFIGS[moduleId] ?? MODULE_CONFIGS['admin'];
  });

  public visibleItems = computed(() =>
    this.config().items.filter(item => {
      if (!item.moduleId) return true;
      if (item.subModuleId) return this.permissions.canAccessSubModule(item.moduleId, item.subModuleId);
      return this.permissions.canAccessModule(item.moduleId);
    })
  );

  public colors(tw: string) {
    return COLOR_MAP[tw] ?? COLOR_MAP['slate'];
  }

  public navigate(route: string) {
    this.router.navigateByUrl(route);
  }

  public goBack() {
    this.router.navigate(['/launcher']);
  }
}
