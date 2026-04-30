import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionsService } from '../../services/permissions.service';
import { DashboardStore } from '../../stores/dashboard.store';

interface Module {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly target: string;
  readonly moduleId?: string;
  readonly external?: boolean;
  readonly accent: AccentKey;
}

type AccentKey =
  | 'blue' | 'violet' | 'emerald' | 'amber' | 'rose'
  | 'orange' | 'fuchsia' | 'teal' | 'indigo' | 'pink'
  | 'purple' | 'slate' | 'cyan' | 'lime';

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
};

const PEOPLE_MODULES: readonly Module[] = [
  { id: 'home',            label: 'Dashboard',           description: 'KPIs y métricas',         icon: 'pi-chart-bar',     target: 'admin/home',       moduleId: 'home',            accent: 'blue'    },
  { id: 'admin',           label: 'Administración',      description: 'Empleados y posiciones',  icon: 'pi-building',      target: 'admin',            moduleId: 'admin',           accent: 'violet'  },
  { id: 'time_management', label: 'Gestión de tiempo',   description: 'Horarios y turnos',       icon: 'pi-clock',         target: 'time-management',  moduleId: 'time_management', accent: 'emerald' },
  { id: 'payroll',         label: 'Planilla',            description: 'Nóminas y décimo',        icon: 'pi-wallet',        target: 'payroll',          moduleId: 'payroll',         accent: 'amber'   },
  { id: 'timeclock',       label: 'Reloj',               description: 'Entradas y salidas',      icon: 'pi-stopwatch',     target: 'timeclock',        moduleId: 'timeclock',       accent: 'rose'    },
  { id: 'branch_manager',  label: 'Gerente de Sucursal', description: 'Gestión de sucursal',     icon: 'pi-sitemap',       target: 'branch-manager',   moduleId: 'branch_manager',  accent: 'orange'  },
  { id: 'my_portal',       label: 'Mi Portal',           description: 'Mi perfil y solicitudes', icon: 'pi-user',          target: 'employee-portal',                               accent: 'fuchsia' },
] as const;

const EXTERNAL_MODULES: readonly Module[] = [
  { id: 'analytics',  label: 'Analytics',           description: 'KPIs y ventas',           icon: 'pi-chart-line',     target: 'analytics',                            accent: 'teal'   },
  { id: 'dashboards', label: 'Asistencias en vivo', description: 'Asistencia en tiempo real', icon: 'pi-objects-column', target: 'live',                                accent: 'indigo' },
  { id: 'it',         label: 'BD IT',               description: 'Inventario y soporte',    icon: 'pi-desktop',        target: 'https://it.blackdogpanama.com',  external: true, accent: 'slate'  },
  { id: 'deploy',     label: 'Deploy',              description: 'CI/CD',                   icon: 'pi-upload',         target: 'https://deploy.blackdogpanama.com', external: true, accent: 'pink'   },
  { id: 'agent',      label: 'Agente IA',           description: 'Asistente inteligente',   icon: 'pi-android',        target: 'https://agent.blackdogpanama.com', external: true, accent: 'purple' },
] as const;

@Component({
  selector: 'pt-app-launcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="launcher" role="main">
      <!-- Saludo con hora -->
      <header class="hero">
        <p class="hero-eyebrow">{{ greeting() }}</p>
        <h1 class="hero-title">
          @if (firstName()) {
            Hola, <span class="hero-name">{{ firstName() }}</span>
          } @else {
            Bienvenido
          }
        </h1>
        <p class="hero-sub">¿A dónde vas hoy?</p>
      </header>

      <!-- People modules -->
      @if (visiblePeopleModules().length > 0) {
        <section class="section" role="region" aria-label="Módulos People">
          <div class="section-header">
            <span class="section-label">People</span>
            <span class="section-line" aria-hidden="true"></span>
            <span class="section-count">{{ visiblePeopleModules().length }}</span>
          </div>
          <div class="grid grid--people">
            @for (mod of visiblePeopleModules(); track mod.id; let i = $index) {
              <button
                type="button"
                class="card"
                [style.--accent]="acc(mod).hex"
                [style.--accent-bg]="acc(mod).bg"
                [style.--accent-border]="acc(mod).border"
                [style.--accent-glow]="acc(mod).glow"
                [style.--accent-text]="acc(mod).text"
                [style.--enter-delay.ms]="i * 40"
                [attr.aria-label]="mod.label + ': ' + mod.description"
                (click)="open(mod)">
                <span class="card-glow" aria-hidden="true"></span>
                <span class="card-icon">
                  <i class="pi" [class]="mod.icon"></i>
                </span>
                <span class="card-label">{{ mod.label }}</span>
                <span class="card-desc">{{ mod.description }}</span>
                <span class="card-arrow" aria-hidden="true"><i class="pi pi-arrow-up-right"></i></span>
              </button>
            }
          </div>
        </section>
      }

      <!-- Servicios externos -->
      <section class="section" role="region" aria-label="Servicios">
        <div class="section-header">
          <span class="section-label">Servicios</span>
          <span class="section-line" aria-hidden="true"></span>
          <span class="section-count">{{ EXTERNAL_MODULES.length }}</span>
        </div>
        <div class="grid grid--ext">
          @for (mod of EXTERNAL_MODULES; track mod.id; let i = $index) {
            <button
              type="button"
              class="card card--ext"
              [style.--accent]="acc(mod).hex"
              [style.--accent-bg]="acc(mod).bg"
              [style.--accent-border]="acc(mod).border"
              [style.--accent-glow]="acc(mod).glow"
              [style.--accent-text]="acc(mod).text"
              [style.--enter-delay.ms]="(visiblePeopleModules().length + i) * 40"
              [attr.aria-label]="mod.label + ': ' + mod.description"
              (click)="open(mod)">
              <span class="card-glow" aria-hidden="true"></span>
              <span class="card-icon">
                <i class="pi" [class]="mod.icon"></i>
              </span>
              <span class="card-label">{{ mod.label }}</span>
              <span class="card-desc">{{ mod.description }}</span>
              @if (mod.external) {
                <span class="card-ext-badge" aria-hidden="true"><i class="pi pi-external-link"></i></span>
              }
            </button>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 0;
      min-height: 0;
      width: 100%;
      overflow: hidden;
      background:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(251,191,36,0.08), transparent 60%),
        radial-gradient(ellipse 60% 40% at 100% 100%, rgba(167,139,250,0.06), transparent 60%),
        #0a0a0a;
      font-family: var(--font-stapel, "Stapel", system-ui, sans-serif);
    }
    .launcher {
      max-width: 1200px;
      width: 100%;
      flex: 1 1 0;
      min-height: 0;
      margin: 0 auto;
      padding: clamp(1rem, 3vh, 2rem) clamp(0.75rem, 2.5vw, 2rem);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: clamp(1.25rem, 3vh, 2rem);
      overflow-y: auto;
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    .launcher::-webkit-scrollbar { width: 5px; }
    .launcher::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

    /* ─── Hero ─── */
    .hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.4rem;
      padding-top: 0.25rem;
      flex-shrink: 0;
      animation: hero-in 0.6s cubic-bezier(0.2, 0.7, 0.3, 1) both;
    }
    .hero-eyebrow {
      margin: 0;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.4);
    }
    .hero-title {
      margin: 0;
      font-size: clamp(1.75rem, 4vw, 2.75rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.05;
      background: linear-gradient(180deg, #ffffff 30%, rgba(255, 255, 255, 0.55));
      -webkit-background-clip: text;
              background-clip: text;
      color: transparent;
    }
    .hero-name {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      -webkit-background-clip: text;
              background-clip: text;
      color: transparent;
    }
    .hero-sub {
      margin: 0;
      font-size: 0.95rem;
      color: rgba(255, 255, 255, 0.45);
      font-weight: 400;
    }

    /* ─── Sections ─── */
    .section {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      flex-shrink: 0;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .section-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
    }
    .section-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0));
    }
    .section-count {
      font-size: 0.65rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.35);
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      font-variant-numeric: tabular-nums;
    }

    /* ─── Grid ─── */
    .grid {
      display: grid;
      gap: clamp(0.5rem, 1vw, 0.85rem);
    }
    .grid--people { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
    .grid--ext    { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }

    /* ─── Card ─── */
    .card {
      position: relative;
      isolation: isolate;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.55rem;
      padding: 1.1rem 0.85rem 0.95rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      text-align: center;
      color: inherit;
      font-family: inherit;
      transition: transform 220ms cubic-bezier(0.2, 0.7, 0.3, 1),
                  border-color 220ms ease,
                  background 220ms ease;
      animation: card-in 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) both;
      animation-delay: var(--enter-delay, 0ms);
      overflow: hidden;
    }
    .card:hover {
      transform: translateY(-3px);
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--accent-border);
    }
    .card:focus-visible {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .card:active { transform: translateY(-1px); }
    .card-glow {
      position: absolute;
      top: -40%;
      right: -30%;
      width: 60%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, var(--accent-bg), transparent 70%);
      opacity: 0;
      transition: opacity 320ms ease;
      z-index: -1;
      pointer-events: none;
    }
    .card:hover .card-glow { opacity: 1; }
    .card-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--accent-bg);
      color: var(--accent-text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      flex-shrink: 0;
      transition: transform 280ms cubic-bezier(0.2, 0.7, 0.3, 1);
    }
    .card:hover .card-icon { transform: scale(1.08) rotate(-3deg); }
    .card-label {
      font-size: 0.85rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.92);
      letter-spacing: -0.005em;
      line-height: 1.2;
    }
    .card-desc {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.4);
      line-height: 1.3;
      font-weight: 500;
    }
    .card-arrow {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.2);
      opacity: 0;
      transform: translate(-4px, 4px);
      transition: opacity 220ms ease, transform 220ms ease, color 220ms ease;
    }
    .card:hover .card-arrow {
      opacity: 1;
      transform: translate(0, 0);
      color: var(--accent-text);
    }
    .card--ext { background: rgba(255, 255, 255, 0.02); }
    .card-ext-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 0.65rem;
      color: rgba(255, 255, 255, 0.25);
    }
    .card--ext:hover .card-ext-badge { color: var(--accent-text); }

    /* ─── Animations ─── */
    @keyframes hero-in {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes card-in {
      from { opacity: 0; transform: translateY(12px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Reduce motion */
    @media (prefers-reduced-motion: reduce) {
      .hero, .card { animation: none !important; }
      .card:hover { transform: none; }
      .card:hover .card-icon { transform: none; }
    }

    /* Mobile compact */
    @media (max-width: 480px) {
      .card { padding: 0.85rem 0.5rem 0.75rem; }
      .card-icon { width: 38px; height: 38px; font-size: 1rem; }
      .card-desc { display: none; }
      .grid--people, .grid--ext { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
    }
  `],
})
export class AppLauncherComponent {
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionsService);
  private readonly store = inject(DashboardStore);

  protected readonly EXTERNAL_MODULES = EXTERNAL_MODULES;

  protected readonly firstName = computed(
    () => this.store.currentEmployee()?.first_name?.trim() || null,
  );

  protected readonly visiblePeopleModules = computed(() =>
    PEOPLE_MODULES.filter(
      (m) => !m.moduleId || this.permissions.canAccessModule(m.moduleId),
    ),
  );

  /** Saludo según hora local. */
  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 6)  return 'Buenas noches';
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  /** Tokens de color según el accent del módulo. */
  protected acc(mod: Module): AccentTokens {
    return ACCENTS[mod.accent] ?? ACCENTS.slate;
  }

  protected open(mod: Module): void {
    if (mod.external) {
      window.location.href = mod.target;
    } else {
      this.router.navigate(['/' + mod.target]);
    }
  }
}
