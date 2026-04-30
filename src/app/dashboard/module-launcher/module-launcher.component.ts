import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PermissionsService } from '../../services/permissions.service';

interface SubItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly route: string;
  readonly moduleId?: string;
  readonly subModuleId?: string;
  readonly accent: AccentKey;
}
interface Section {
  readonly label: string;
  readonly items: readonly SubItem[];
}
type AccentKey =
  | 'blue' | 'violet' | 'emerald' | 'amber' | 'rose'
  | 'orange' | 'fuchsia' | 'teal' | 'indigo' | 'pink'
  | 'purple' | 'slate' | 'cyan' | 'lime' | 'yellow';

interface AccentTokens {
  readonly hex: string;
  readonly bg: string;
  readonly border: string;
  readonly glow: string;
  readonly text: string;
}

const ACCENTS: Record<AccentKey, AccentTokens> = {
  blue:    { hex: '#60a5fa', bg: 'rgba(96,165,250,.14)',  border: 'rgba(96,165,250,.45)',  glow: 'rgba(96,165,250,.35)',  text: '#93c5fd' },
  violet:  { hex: '#a78bfa', bg: 'rgba(167,139,250,.14)', border: 'rgba(167,139,250,.45)', glow: 'rgba(167,139,250,.35)', text: '#c4b5fd' },
  emerald: { hex: '#34d399', bg: 'rgba(52,211,153,.14)',  border: 'rgba(52,211,153,.45)',  glow: 'rgba(52,211,153,.35)',  text: '#6ee7b7' },
  amber:   { hex: '#fbbf24', bg: 'rgba(251,191,36,.14)',  border: 'rgba(251,191,36,.5)',   glow: 'rgba(251,191,36,.4)',   text: '#fcd34d' },
  rose:    { hex: '#fb7185', bg: 'rgba(251,113,133,.14)', border: 'rgba(251,113,133,.45)', glow: 'rgba(251,113,133,.35)', text: '#fda4af' },
  orange:  { hex: '#fb923c', bg: 'rgba(251,146,60,.14)',  border: 'rgba(251,146,60,.45)',  glow: 'rgba(251,146,60,.35)',  text: '#fdba74' },
  fuchsia: { hex: '#e879f9', bg: 'rgba(232,121,249,.14)', border: 'rgba(232,121,249,.45)', glow: 'rgba(232,121,249,.35)', text: '#f0abfc' },
  teal:    { hex: '#2dd4bf', bg: 'rgba(45,212,191,.14)',  border: 'rgba(45,212,191,.45)',  glow: 'rgba(45,212,191,.35)',  text: '#5eead4' },
  indigo:  { hex: '#818cf8', bg: 'rgba(129,140,248,.14)', border: 'rgba(129,140,248,.45)', glow: 'rgba(129,140,248,.35)', text: '#a5b4fc' },
  pink:    { hex: '#f472b6', bg: 'rgba(244,114,182,.14)', border: 'rgba(244,114,182,.45)', glow: 'rgba(244,114,182,.35)', text: '#f9a8d4' },
  purple:  { hex: '#c084fc', bg: 'rgba(192,132,252,.14)', border: 'rgba(192,132,252,.45)', glow: 'rgba(192,132,252,.35)', text: '#d8b4fe' },
  slate:   { hex: '#94a3b8', bg: 'rgba(148,163,184,.14)', border: 'rgba(148,163,184,.45)', glow: 'rgba(148,163,184,.35)', text: '#cbd5e1' },
  cyan:    { hex: '#22d3ee', bg: 'rgba(34,211,238,.14)',  border: 'rgba(34,211,238,.45)',  glow: 'rgba(34,211,238,.35)',  text: '#67e8f9' },
  lime:    { hex: '#a3e635', bg: 'rgba(163,230,53,.14)',  border: 'rgba(163,230,53,.45)',  glow: 'rgba(163,230,53,.35)',  text: '#bef264' },
  yellow:  { hex: '#facc15', bg: 'rgba(250,204,21,.14)',  border: 'rgba(250,204,21,.45)',  glow: 'rgba(250,204,21,.35)',  text: '#fde047' },
};

const ADMIN_SECTIONS: readonly Section[] = [
  {
    label: 'Personas',
    items: [
      { id: 'home',        label: 'Dashboard RRHH', description: 'KPIs y métricas ejecutivas', icon: 'pi-chart-bar', route: '/admin/home',        moduleId: 'home',                                                  accent: 'blue'    },
      { id: 'employees',   label: 'Empleados',      description: 'Gestión de personal',         icon: 'pi-users',     route: '/admin/employees',   moduleId: 'admin', subModuleId: 'employees',                       accent: 'violet'  },
      { id: 'organigrama', label: 'Organigrama',    description: 'Estructura organizacional',   icon: 'pi-sitemap',   route: '/admin/organigrama', moduleId: 'admin', subModuleId: 'organigrama',                     accent: 'indigo'  },
    ],
  },
  {
    label: 'Estructura',
    items: [
      { id: 'companies',   label: 'Empresas',      description: 'Gestión de empresas',     icon: 'pi-briefcase',  route: '/admin/companies',   moduleId: 'admin', subModuleId: 'companies',   accent: 'slate'   },
      { id: 'departments', label: 'Departamentos', description: 'Áreas y departamentos',   icon: 'pi-table',      route: '/admin/departments', moduleId: 'admin', subModuleId: 'departments', accent: 'teal'    },
      { id: 'positions',   label: 'Puestos',       description: 'Cargos y posiciones',     icon: 'pi-tag',        route: '/admin/positions',   moduleId: 'admin', subModuleId: 'positions',   accent: 'cyan'    },
      { id: 'branches',    label: 'Sucursales',    description: 'Gestión de sucursales',   icon: 'pi-map-marker', route: '/admin/branches',    moduleId: 'admin', subModuleId: 'branches',    accent: 'emerald' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'settings',         label: 'Configuración', description: 'Ajustes del sistema',     icon: 'pi-cog',       route: '/admin/settings',         moduleId: 'admin', subModuleId: 'settings',         accent: 'slate'  },
      { id: 'user-management',  label: 'Usuarios',      description: 'Gestión de usuarios',     icon: 'pi-user-edit', route: '/admin/user-management',  moduleId: 'admin', subModuleId: 'user_management',  accent: 'orange' },
      { id: 'permissions',      label: 'Permisos',      description: 'Control de accesos',      icon: 'pi-shield',    route: '/admin/permissions',      moduleId: 'admin', subModuleId: 'permissions',      accent: 'rose'   },
      { id: 'news',             label: 'Noticias',      description: 'Anuncios y noticias',     icon: 'pi-megaphone', route: '/admin/news',             moduleId: 'admin',                                  accent: 'purple' },
      { id: 'device-inventory', label: 'Dispositivos',  description: 'Inventario de equipos',   icon: 'pi-mobile',    route: '/admin/device-inventory', moduleId: 'admin', subModuleId: 'device_inventory', accent: 'slate'  },
    ],
  },
  {
    label: 'RRHH',
    items: [
      { id: 'hr-time',         label: 'Tiempo RRHH',            description: 'Dashboard de tiempo',                  icon: 'pi-calendar',  route: '/admin/hr/time-dashboard', moduleId: 'hr',    subModuleId: 'hr_time_dashboard', accent: 'fuchsia' },
      { id: 'hr-disabilities', label: 'Gestiones de Empleados', description: 'Vacaciones, incapacidades y permisos', icon: 'pi-heart',     route: '/admin/hr/disabilities',   moduleId: 'hr',    subModuleId: 'hr_disabilities',   accent: 'pink'    },
      { id: 'surveys',         label: 'Encuestas',              description: 'Encuestas y sondeos',                  icon: 'pi-comment',   route: '/admin/surveys',           moduleId: 'hr',    subModuleId: 'hr_surveys',        accent: 'teal'    },
      { id: 'complaints',      label: 'Quejas',                 description: 'Buzón de quejas y sugerencias',        icon: 'pi-inbox',     route: '/admin/complaints-inbox',  moduleId: 'admin', subModuleId: 'complaints',        accent: 'amber'   },
      { id: 'job-apps',        label: 'Feria de Empleo',        description: 'Solicitudes y postulaciones',          icon: 'pi-file-edit', route: '/admin/job-applications',  moduleId: 'admin', subModuleId: 'job_applications',  accent: 'lime'    },
    ],
  },
  {
    label: 'Compras',
    items: [
      { id: 'compras', label: 'Compras', description: 'Aprobación de compras', icon: 'pi-shopping-cart', route: '/admin/compras', moduleId: 'compras', subModuleId: 'compras_dashboard', accent: 'orange' },
    ],
  },
  {
    label: 'Auditoría',
    items: [
      { id: 'audit-tasks', label: 'Tareas de Auditoría', description: 'Control y seguimiento de tareas', icon: 'pi-list-check', route: '/admin/audit-tasks', moduleId: 'admin',       subModuleId: 'audit_tasks', accent: 'amber'  },
      { id: 'performance', label: 'Performance 360',     description: 'Evaluación de desempeño',         icon: 'pi-star',       route: '/admin/performance', moduleId: 'performance',                            accent: 'yellow' },
    ],
  },
];

const PAYROLL_SECTIONS: readonly Section[] = [
  {
    label: 'Nóminas',
    items: [
      { id: 'payrolls',    label: 'Planillas',     description: 'Gestión de nóminas',        icon: 'pi-wallet',        route: '/payroll/payrolls',    moduleId: 'payroll', subModuleId: 'payrolls', accent: 'amber'  },
      { id: 'decimo',      label: 'Décimo',        description: 'Décimo tercer mes',         icon: 'pi-calendar-plus', route: '/payroll/decimo',      moduleId: 'payroll', subModuleId: 'payrolls', accent: 'orange' },
      { id: 'vacations',   label: 'Vacaciones',    description: 'Pago de vacaciones',        icon: 'pi-sun',           route: '/payroll/vacations',   moduleId: 'payroll', subModuleId: 'payrolls', accent: 'yellow' },
      { id: 'liquidation', label: 'Liquidaciones', description: 'Liquidaciones de personal', icon: 'pi-file-export',   route: '/payroll/liquidation', moduleId: 'payroll', subModuleId: 'payrolls', accent: 'rose'   },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { id: 'creditors', label: 'Acreedores',     description: 'Gestión de acreedores',      icon: 'pi-building-columns', route: '/payroll/creditors', moduleId: 'payroll', subModuleId: 'creditors',      accent: 'violet' },
      { id: 'banks',     label: 'Bancos',         description: 'Cuentas bancarias',          icon: 'pi-credit-card',      route: '/payroll/banks',     moduleId: 'payroll', subModuleId: 'banks',          accent: 'blue'   },
      { id: 'import',    label: 'Importar',       description: 'Importar datos de planilla', icon: 'pi-upload',           route: '/payroll/import',    moduleId: 'payroll', subModuleId: 'payroll_import', accent: 'slate'  },
      { id: 'admin',     label: 'Administración', description: 'Configuración de nómina',    icon: 'pi-sliders-h',        route: '/payroll/admin',     moduleId: 'payroll', subModuleId: 'payroll_admin',  accent: 'rose'   },
    ],
  },
];

const TIME_SECTIONS: readonly Section[] = [
  {
    label: 'Seguimiento',
    items: [
      { id: 'timelogs',   label: 'Registros', description: 'Registros de tiempo',   icon: 'pi-clock',    route: '/time-management/timelogs',   moduleId: 'time_management', subModuleId: 'timelogs',   accent: 'emerald' },
      { id: 'timetables', label: 'Horarios',  description: 'Horarios de empleados', icon: 'pi-calendar', route: '/time-management/timetables', moduleId: 'time_management', subModuleId: 'timetables', accent: 'teal'    },
    ],
  },
  {
    label: 'Calendarios',
    items: [
      { id: 'schedules',    label: 'General',     description: 'Programación general',         icon: 'pi-calendar-clock', route: '/time-management/schedules',      moduleId: 'time_management', subModuleId: 'schedules',     accent: 'cyan'  },
      { id: 'vet-schedule', label: 'Horario Vet', description: 'Programación veterinaria',     icon: 'pi-heart-fill',     route: '/time-management/vet-schedule',   moduleId: 'time_management', subModuleId: 'vet_schedule',  accent: 'rose'  },
      { id: 'salon',        label: 'Peluquería',  description: 'Programación de peluquería',   icon: 'pi-sparkles',       route: '/time-management/salon-schedule', moduleId: 'time_management', subModuleId: 'salon_schedule', accent: 'pink' },
    ],
  },
];

const MODULE_CONFIGS: Record<string, { title: string; icon: string; sections: readonly Section[] }> = {
  admin:             { title: 'Administración',    icon: 'pi-building', sections: ADMIN_SECTIONS },
  payroll:           { title: 'Planilla',          icon: 'pi-wallet',   sections: PAYROLL_SECTIONS },
  'time-management': { title: 'Gestión de Tiempo', icon: 'pi-clock',    sections: TIME_SECTIONS },
};

@Component({
  selector: 'pt-module-launcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="launcher" role="main">
      <header class="hero">
        <button type="button" class="back-btn" (click)="goBack()" aria-label="Volver al inicio">
          <i class="pi pi-arrow-left"></i><span>Inicio</span>
        </button>
        <div class="hero-row">
          <i class="pi hero-icon" [class]="config().icon"></i>
          <h1 class="hero-title">{{ config().title }}</h1>
        </div>
      </header>

      @for (section of visibleSections(); track section.label) {
        @if (section.items.length > 0) {
          <section class="section" role="region" [attr.aria-label]="section.label">
            <div class="section-header">
              <span class="section-label">{{ section.label }}</span>
              <span class="section-line" aria-hidden="true"></span>
              <span class="section-count">{{ section.items.length }}</span>
            </div>
            <div class="grid">
              @for (item of section.items; track item.id; let i = $index) {
                <button
                  type="button"
                  class="card"
                  [style.--accent]="acc(item).hex"
                  [style.--accent-bg]="acc(item).bg"
                  [style.--accent-border]="acc(item).border"
                  [style.--accent-glow]="acc(item).glow"
                  [style.--accent-text]="acc(item).text"
                  [style.--enter-delay.ms]="i * 35"
                  [attr.aria-label]="item.label + ': ' + item.description"
                  (click)="navigate(item.route)">
                  <span class="card-glow" aria-hidden="true"></span>
                  <span class="card-icon"><i class="pi" [class]="item.icon"></i></span>
                  <span class="card-label">{{ item.label }}</span>
                  <span class="card-desc">{{ item.description }}</span>
                  <span class="card-arrow" aria-hidden="true"><i class="pi pi-arrow-up-right"></i></span>
                </button>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    /* :host es block normal y el scroll lo maneja el contenedor exterior
       (.flex-1 min-h-0 overflow-y-auto del shell). Si ponemos flex+overflow
       hidden aquí, el padre <main> no es flex container y el host colapsa
       en altura clipeando las cards. */
    :host {
      display: block;
      width: 100%;
      min-height: 100%;
      background:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(251,191,36,0.08), transparent 60%),
        radial-gradient(ellipse 60% 40% at 100% 100%, rgba(167,139,250,0.06), transparent 60%),
        #0a0a0a;
      font-family: var(--font-stapel, "Stapel", system-ui, sans-serif);
    }
    .launcher {
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: clamp(1rem, 3vh, 2rem) clamp(0.75rem, 2.5vw, 2rem);
      display: flex;
      flex-direction: column;
      gap: clamp(1.25rem, 3vh, 2rem);
      box-sizing: border-box;
    }
    .launcher::-webkit-scrollbar { width: 5px; }
    .launcher::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

    /* Hero */
    .hero { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding-top: 0.25rem; flex-shrink: 0; animation: hero-in 0.5s cubic-bezier(0.2,0.7,0.3,1) both; }
    .back-btn {
      display: inline-flex; align-items: center; gap: 0.4rem;
      background: transparent; border: none; cursor: pointer;
      color: rgba(255,255,255,0.45);
      font-family: inherit; font-size: 0.75rem; font-weight: 600;
      letter-spacing: 0.05em;
      transition: color 180ms ease;
      padding: 4px 8px; border-radius: 8px;
    }
    .back-btn:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.04); }
    .back-btn:focus-visible { outline: 2px solid rgba(251,191,36,0.5); outline-offset: 2px; }
    .back-btn i { font-size: 0.7rem; }
    .hero-row { display: flex; align-items: center; gap: 0.7rem; }
    .hero-icon { font-size: 1.7rem; color: #fbbf24; filter: drop-shadow(0 0 12px rgba(251,191,36,0.4)); }
    .hero-title {
      margin: 0;
      font-size: clamp(1.5rem, 3.5vw, 2.4rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
      background: linear-gradient(180deg, #ffffff 30%, rgba(255, 255, 255, 0.55));
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }

    /* Section */
    .section { display: flex; flex-direction: column; gap: 0.85rem; flex-shrink: 0; }
    .section-header { display: flex; align-items: center; gap: 0.75rem; }
    .section-label {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.2em;
      color: rgba(255,255,255,0.5); text-transform: uppercase;
    }
    .section-line {
      flex: 1; height: 1px;
      background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0));
    }
    .section-count {
      font-size: 0.65rem; font-weight: 600; color: rgba(255,255,255,0.35);
      padding: 2px 8px; border-radius: 999px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      font-variant-numeric: tabular-nums;
    }

    /* Grid */
    .grid {
      display: grid; gap: clamp(0.5rem, 1vw, 0.85rem);
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }

    /* Card — idéntica al app-launcher */
    .card {
      position: relative; isolation: isolate;
      display: flex; flex-direction: column; align-items: center; gap: 0.55rem;
      padding: 1.1rem 0.85rem 0.95rem;
      border-radius: 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer; text-align: center; color: inherit;
      font-family: inherit;
      transition: transform 220ms cubic-bezier(0.2,0.7,0.3,1), border-color 220ms ease, background 220ms ease;
      animation: card-in 0.5s cubic-bezier(0.2,0.7,0.3,1) both;
      animation-delay: var(--enter-delay, 0ms);
      overflow: hidden;
    }
    .card:hover { transform: translateY(-3px); background: rgba(255,255,255,0.05); border-color: var(--accent-border); }
    .card:focus-visible { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .card:active { transform: translateY(-1px); }
    .card-glow {
      position: absolute; top: -40%; right: -30%; width: 60%; height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, var(--accent-bg), transparent 70%);
      opacity: 0; transition: opacity 320ms ease; z-index: -1; pointer-events: none;
    }
    .card:hover .card-glow { opacity: 1; }
    .card-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--accent-bg); color: var(--accent-text);
      display: flex; align-items: center; justify-content: center; font-size: 1.15rem;
      flex-shrink: 0;
      transition: transform 280ms cubic-bezier(0.2,0.7,0.3,1);
    }
    .card:hover .card-icon { transform: scale(1.08) rotate(-3deg); }
    .card-label {
      font-size: 0.85rem; font-weight: 700;
      color: rgba(255,255,255,0.92);
      letter-spacing: -0.005em; line-height: 1.2;
    }
    .card-desc {
      font-size: 0.7rem; color: rgba(255,255,255,0.4);
      line-height: 1.3; font-weight: 500;
    }
    .card-arrow {
      position: absolute; top: 8px; right: 8px;
      font-size: 0.7rem; color: rgba(255,255,255,0.2);
      opacity: 0; transform: translate(-4px, 4px);
      transition: opacity 220ms ease, transform 220ms ease, color 220ms ease;
    }
    .card:hover .card-arrow { opacity: 1; transform: translate(0,0); color: var(--accent-text); }

    @keyframes hero-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes card-in { from { opacity: 0; transform: translateY(12px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }

    @media (prefers-reduced-motion: reduce) {
      .hero, .card { animation: none !important; }
      .card:hover { transform: none; }
      .card:hover .card-icon { transform: none; }
    }

    @media (max-width: 480px) {
      .card { padding: 0.85rem 0.5rem 0.75rem; }
      .card-icon { width: 38px; height: 38px; font-size: 1rem; }
      .card-desc { display: none; }
      .grid { grid-template-columns: repeat(auto-fill, minmax(115px, 1fr)); }
    }
  `],
})
export class ModuleLauncherComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly permissions = inject(PermissionsService);

  protected readonly config = computed(() => {
    const moduleId = this.route.snapshot.data['module'] as string;
    return MODULE_CONFIGS[moduleId] ?? MODULE_CONFIGS['admin'];
  });

  protected readonly visibleSections = computed(() =>
    this.config().sections.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.moduleId) return true;
        if (item.subModuleId) return this.permissions.canAccessSubModule(item.moduleId, item.subModuleId);
        return this.permissions.canAccessModule(item.moduleId);
      }),
    })),
  );

  protected acc(item: SubItem): AccentTokens {
    return ACCENTS[item.accent] ?? ACCENTS.slate;
  }

  protected navigate(route: string): void {
    this.router.navigateByUrl(route);
  }

  protected goBack(): void {
    this.router.navigate(['/launcher']);
  }
}
