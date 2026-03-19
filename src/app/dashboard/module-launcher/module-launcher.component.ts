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

interface Section {
  label: string;
  items: SubItem[];
}

const COLOR_MAP: Record<string, { bgCls: string; iconCls: string; hoverBorderCls: string; hoverShadowCls: string }> = {
  blue:    { bgCls: 'bg-blue-500/15',    iconCls: 'text-blue-400',    hoverBorderCls: 'hover:border-blue-500/40',    hoverShadowCls: 'hover:shadow-blue-500/20' },
  violet:  { bgCls: 'bg-violet-500/15',  iconCls: 'text-violet-400',  hoverBorderCls: 'hover:border-violet-500/40',  hoverShadowCls: 'hover:shadow-violet-500/20' },
  emerald: { bgCls: 'bg-emerald-500/15', iconCls: 'text-emerald-400', hoverBorderCls: 'hover:border-emerald-500/40', hoverShadowCls: 'hover:shadow-emerald-500/20' },
  amber:   { bgCls: 'bg-amber-500/15',   iconCls: 'text-amber-400',   hoverBorderCls: 'hover:border-amber-500/40',   hoverShadowCls: 'hover:shadow-amber-500/20' },
  rose:    { bgCls: 'bg-rose-500/15',    iconCls: 'text-rose-400',    hoverBorderCls: 'hover:border-rose-500/40',    hoverShadowCls: 'hover:shadow-rose-500/20' },
  orange:  { bgCls: 'bg-orange-500/15',  iconCls: 'text-orange-400',  hoverBorderCls: 'hover:border-orange-500/40',  hoverShadowCls: 'hover:shadow-orange-500/20' },
  fuchsia: { bgCls: 'bg-fuchsia-500/15', iconCls: 'text-fuchsia-400', hoverBorderCls: 'hover:border-fuchsia-500/40', hoverShadowCls: 'hover:shadow-fuchsia-500/20' },
  teal:    { bgCls: 'bg-teal-500/15',    iconCls: 'text-teal-400',    hoverBorderCls: 'hover:border-teal-500/40',    hoverShadowCls: 'hover:shadow-teal-500/20' },
  indigo:  { bgCls: 'bg-indigo-500/15',  iconCls: 'text-indigo-400',  hoverBorderCls: 'hover:border-indigo-500/40',  hoverShadowCls: 'hover:shadow-indigo-500/20' },
  pink:    { bgCls: 'bg-pink-500/15',    iconCls: 'text-pink-400',    hoverBorderCls: 'hover:border-pink-500/40',    hoverShadowCls: 'hover:shadow-pink-500/20' },
  purple:  { bgCls: 'bg-purple-500/15',  iconCls: 'text-purple-400',  hoverBorderCls: 'hover:border-purple-500/40',  hoverShadowCls: 'hover:shadow-purple-500/20' },
  slate:   { bgCls: 'bg-slate-500/15',   iconCls: 'text-slate-400',   hoverBorderCls: 'hover:border-slate-500/40',   hoverShadowCls: 'hover:shadow-slate-500/20' },
  cyan:    { bgCls: 'bg-cyan-500/15',    iconCls: 'text-cyan-400',    hoverBorderCls: 'hover:border-cyan-500/40',    hoverShadowCls: 'hover:shadow-cyan-500/20' },
  lime:    { bgCls: 'bg-lime-500/15',    iconCls: 'text-lime-400',    hoverBorderCls: 'hover:border-lime-500/40',    hoverShadowCls: 'hover:shadow-lime-500/20' },
  yellow:  { bgCls: 'bg-yellow-500/15',  iconCls: 'text-yellow-400',  hoverBorderCls: 'hover:border-yellow-500/40',  hoverShadowCls: 'hover:shadow-yellow-500/20' },
};

const ADMIN_SECTIONS: Section[] = [
  {
    label: 'Personas',
    items: [
      { id: 'home',        label: 'Dashboard RRHH', description: 'KPIs y métricas ejecutivas', icon: 'pi-chart-bar', route: '/admin/home',        moduleId: 'home',                                              tw: 'blue' },
      { id: 'employees',   label: 'Empleados',      description: 'Gestión de personal',        icon: 'pi-users',    route: '/admin/employees',   moduleId: 'admin', subModuleId: 'employees',   tw: 'violet' },
      { id: 'organigrama', label: 'Organigrama',    description: 'Estructura organizacional',  icon: 'pi-sitemap',  route: '/admin/organigrama', moduleId: 'admin', subModuleId: 'organigrama', tw: 'indigo' },
    ],
  },
  {
    label: 'Estructura',
    items: [
      { id: 'companies',   label: 'Empresas',      description: 'Gestión de empresas',       icon: 'pi-briefcase',   route: '/admin/companies',   moduleId: 'admin', subModuleId: 'companies',   tw: 'slate' },
      { id: 'departments', label: 'Departamentos', description: 'Áreas y departamentos',     icon: 'pi-table',       route: '/admin/departments', moduleId: 'admin', subModuleId: 'departments', tw: 'teal' },
      { id: 'positions',   label: 'Puestos',       description: 'Cargos y posiciones',       icon: 'pi-tag',         route: '/admin/positions',   moduleId: 'admin', subModuleId: 'positions',   tw: 'cyan' },
      { id: 'branches',    label: 'Sucursales',    description: 'Gestión de sucursales',     icon: 'pi-map-marker',  route: '/admin/branches',    moduleId: 'admin', subModuleId: 'branches',    tw: 'emerald' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'settings',        label: 'Configuración',      description: 'Ajustes del sistema',       icon: 'pi-cog',       route: '/admin/settings',         moduleId: 'admin', subModuleId: 'settings',         tw: 'slate' },
      { id: 'user-management', label: 'Usuarios',           description: 'Gestión de usuarios',       icon: 'pi-user-edit', route: '/admin/user-management',  moduleId: 'admin', subModuleId: 'user_management',  tw: 'orange' },
      { id: 'permissions',     label: 'Permisos',           description: 'Control de accesos',        icon: 'pi-shield',    route: '/admin/permissions',      moduleId: 'admin', subModuleId: 'permissions',      tw: 'rose' },
      { id: 'complaints',      label: 'Buzón de Quejas',    description: 'Gestión de quejas',         icon: 'pi-inbox',     route: '/admin/complaints-inbox', moduleId: 'admin', subModuleId: 'complaints',       tw: 'amber' },
      { id: 'job-apps',        label: 'Solicitudes Empleo', description: 'Feria de empleo',           icon: 'pi-file',      route: '/admin/job-applications', moduleId: 'admin', subModuleId: 'job_applications', tw: 'lime' },
      { id: 'news',            label: 'Noticias',           description: 'Anuncios y noticias',       icon: 'pi-megaphone', route: '/admin/news',             moduleId: 'admin', subModuleId: 'device_inventory', tw: 'purple' },
    ],
  },
  {
    label: 'RRHH',
    items: [
      { id: 'hr-time',         label: 'Tiempo RRHH',      description: 'Dashboard de tiempo',    icon: 'pi-calendar', route: '/admin/hr/time-dashboard', moduleId: 'hr', subModuleId: 'hr_time_dashboard', tw: 'fuchsia' },
      { id: 'hr-disabilities', label: 'Solicitudes RRHH', description: 'Gestión de solicitudes', icon: 'pi-heart',    route: '/admin/hr/disabilities',   moduleId: 'hr', subModuleId: 'hr_disabilities',   tw: 'pink' },
      { id: 'surveys',         label: 'Encuestas',        description: 'Encuestas y sondeos',    icon: 'pi-comment',  route: '/admin/surveys',           moduleId: 'hr', subModuleId: 'hr_surveys',        tw: 'teal' },
    ],
  },
  {
    label: 'Auditoría',
    items: [
      { id: 'audit-tasks', label: 'Tareas de Auditoría', description: 'Control y seguimiento de tareas', icon: 'pi-list-check', route: '/admin/audit-tasks',  moduleId: 'admin', subModuleId: 'audit_tasks',  tw: 'amber' },
      { id: 'performance', label: 'Performance 360',    description: 'Evaluación de desempeño',         icon: 'pi-star',       route: '/admin/performance',  moduleId: 'performance',                              tw: 'yellow' },
    ],
  },
];

const PAYROLL_SECTIONS: Section[] = [
  {
    label: 'Nóminas',
    items: [
      { id: 'payrolls',    label: 'Planillas',      description: 'Gestión de nóminas',        icon: 'pi-wallet',        route: '/payroll/payrolls',    moduleId: 'payroll', subModuleId: 'payrolls',  tw: 'amber' },
      { id: 'decimo',      label: 'Décimo',         description: 'Décimo tercer mes',         icon: 'pi-calendar-plus', route: '/payroll/decimo',      moduleId: 'payroll', subModuleId: 'payrolls',  tw: 'orange' },
      { id: 'vacations',   label: 'Vacaciones',     description: 'Pago de vacaciones',        icon: 'pi-sun',           route: '/payroll/vacations',   moduleId: 'payroll', subModuleId: 'payrolls',  tw: 'yellow' },
      { id: 'liquidation', label: 'Liquidaciones',  description: 'Liquidaciones de personal', icon: 'pi-file-export',   route: '/payroll/liquidation', moduleId: 'payroll', subModuleId: 'payrolls',  tw: 'rose' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { id: 'creditors', label: 'Acreedores', description: 'Gestión de acreedores',      icon: 'pi-building-columns', route: '/payroll/creditors', moduleId: 'payroll', subModuleId: 'creditors', tw: 'violet' },
      { id: 'banks',     label: 'Bancos',     description: 'Cuentas bancarias',          icon: 'pi-credit-card',      route: '/payroll/banks',     moduleId: 'payroll', subModuleId: 'banks',     tw: 'blue' },
      { id: 'import',    label: 'Importar',   description: 'Importar datos de planilla', icon: 'pi-upload',           route: '/payroll/import',    moduleId: 'payroll',                           tw: 'slate' },
    ],
  },
];

const TIME_SECTIONS: Section[] = [
  {
    label: 'Seguimiento',
    items: [
      { id: 'timelogs',   label: 'Registros', description: 'Registros de tiempo',   icon: 'pi-clock',    route: '/time-management/timelogs',   moduleId: 'time_management', subModuleId: 'timelogs',   tw: 'emerald' },
      { id: 'timetables', label: 'Horarios',  description: 'Horarios de empleados', icon: 'pi-calendar', route: '/time-management/timetables', moduleId: 'time_management', subModuleId: 'timetables', tw: 'teal' },
    ],
  },
  {
    label: 'Calendarios',
    items: [
      { id: 'schedules',    label: 'General',          description: 'Programación general',      icon: 'pi-calendar-clock', route: '/time-management/schedules',     moduleId: 'time_management', subModuleId: 'schedules',     tw: 'cyan' },

      { id: 'vet-schedule', label: 'Horario Vet',      description: 'Programación veterinaria',  icon: 'pi-heart-fill',     route: '/time-management/vet-schedule',  moduleId: 'time_management', subModuleId: 'vet_schedule',  tw: 'rose' },
      { id: 'salon',        label: 'Peluquería',       description: 'Programación de peluquería', icon: 'pi-sparkles',       route: '/time-management/salon-schedule',moduleId: 'time_management', subModuleId: 'salon_schedule',tw: 'pink' },
    ],
  },
];

const MODULE_CONFIGS: Record<string, { title: string; icon: string; sections: Section[] }> = {
  admin:             { title: 'Administración',    icon: 'pi-building', sections: ADMIN_SECTIONS },
  payroll:           { title: 'Planilla',          icon: 'pi-wallet',   sections: PAYROLL_SECTIONS },
  'time-management': { title: 'Gestión de Tiempo', icon: 'pi-clock',    sections: TIME_SECTIONS },
};

@Component({
  selector: 'pt-module-launcher',
  standalone: true,
  template: `
    <div class="bg-[#0a0a0a] px-2 sm:px-6 md:px-10 py-6 space-y-8" style="min-height: 100dvh">

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
      </div>

      <!-- Secciones -->
      @for (section of visibleSections(); track section.label) {
        @if (section.items.length > 0) {
        <section>
          <div class="flex items-center gap-3 mb-4 max-w-5xl mx-auto">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-widest">{{ section.label }}</span>
            <div class="flex-1 h-px bg-white/[0.06]"></div>
          </div>
          <div class="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
            @for (item of section.items; track item.id) {
              @let c = colors(item.tw);
              <button (click)="navigate(item.route)"
                 class="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10
                        p-5 flex flex-col items-center gap-3 text-center w-36
                        transition-all duration-300 active:scale-95 cursor-pointer outline-none"
                 style="-webkit-tap-highlight-color: transparent;"
                 [class]="c.hoverBorderCls + ' ' + c.hoverShadowCls">
                <div class="absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-1/2 translate-x-1/2
                            opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                     [class]="c.bgCls"></div>
                <div class="relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                     [class]="c.bgCls">
                  <i class="pi text-xl" [class]="item.icon + ' ' + c.iconCls"></i>
                </div>
                <span class="text-xs font-semibold text-white leading-tight">{{ item.label }}</span>
                <span class="text-[0.65rem] text-gray-500 leading-snug">{{ item.description }}</span>
              </button>
            }
          </div>
        </section>
        }
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

  public visibleSections = computed(() =>
    this.config().sections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!item.moduleId) return true;
        if (item.subModuleId) return this.permissions.canAccessSubModule(item.moduleId, item.subModuleId);
        return this.permissions.canAccessModule(item.moduleId);
      }),
    }))
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
