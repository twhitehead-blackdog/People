import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

type TimeMode = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

@Component({
  selector: 'pt-kiosk-screensaver',
  imports: [],
  template: `
    @if (active() && enabled()) {
      <div
        class="ks-overlay"
        [attr.data-mode]="mode()"
        (click)="dismiss()"
        (touchstart)="dismiss()"
        (keydown)="dismiss()"
        tabindex="0"
      >
        <!-- Fondo animado por hora -->
        <div class="ks-bg ks-bg-{{ mode() }}"></div>
        <div class="ks-stars" [class.show]="mode() === 'night' || mode() === 'evening'"></div>

        <!-- Contenido central -->
        <div class="ks-content">
          <div class="ks-greeting">{{ greeting() }}</div>
          <div class="ks-clock">{{ timeStr() }}</div>
          <div class="ks-date">{{ dateStr() }}</div>
          @if (subMessage()) {
            <div class="ks-sub">{{ subMessage() }}</div>
          }
        </div>

        <!-- Pista de salida -->
        <div class="ks-hint">
          <i class="ks-pulse-dot"></i>
          <span>Toca la pantalla para marcar</span>
        </div>

        <!-- Logo esquina -->
        <div class="ks-brand">Black Dog</div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 99000;
      pointer-events: none;
    }
    .ks-overlay {
      position: fixed;
      inset: 0;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      overflow: hidden;
      cursor: pointer;
      outline: none;
      animation: ksFadeIn 0.6s ease-out;
    }
    @keyframes ksFadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* Fondos por hora */
    .ks-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      transition: opacity 1s;
    }
    .ks-bg-dawn      { background: linear-gradient(180deg, #1e1b3a 0%, #5f4263 35%, #f78c6c 75%, #f5b27a 100%); }
    .ks-bg-morning   { background: linear-gradient(180deg, #87ceeb 0%, #fde68a 60%, #fbbf24 100%); }
    .ks-bg-afternoon { background: linear-gradient(180deg, #3b82f6 0%, #60a5fa 50%, #fbbf24 100%); }
    .ks-bg-evening   { background: linear-gradient(180deg, #4c1d95 0%, #db2777 50%, #f59e0b 100%); }
    .ks-bg-night     { background: linear-gradient(180deg, #0a0a1f 0%, #1e1b4b 50%, #312e81 100%); }

    /* Estrellas para tarde/noche */
    .ks-stars {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 1.5s;
      background-image:
        radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.9), transparent 50%),
        radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.8), transparent 50%),
        radial-gradient(2px 2px at 80% 10%, rgba(255,255,255,0.7), transparent 50%),
        radial-gradient(1px 1px at 40% 50%, rgba(255,255,255,0.85), transparent 50%),
        radial-gradient(1.5px 1.5px at 90% 60%, rgba(255,255,255,0.9), transparent 50%),
        radial-gradient(1px 1px at 15% 80%, rgba(255,255,255,0.7), transparent 50%),
        radial-gradient(2px 2px at 70% 25%, rgba(255,255,255,0.8), transparent 50%),
        radial-gradient(1px 1px at 50% 90%, rgba(255,255,255,0.6), transparent 50%);
      background-size: 100% 100%;
      animation: ksTwinkle 4s ease-in-out infinite alternate;
    }
    .ks-stars.show { opacity: 0.7; }
    @keyframes ksTwinkle { from { opacity: 0.5; } to { opacity: 0.9; } }

    .ks-content {
      position: relative;
      z-index: 2;
      text-align: center;
      color: #fff;
      text-shadow: 0 4px 30px rgba(0,0,0,0.5);
      animation: ksRise 1s ease-out;
    }
    @keyframes ksRise {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .ks-greeting {
      font-size: clamp(28px, 4vw, 56px);
      font-weight: 300;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
      opacity: 0.95;
    }
    .ks-clock {
      font-family: 'Orbitron', 'Stapel', system-ui, sans-serif;
      font-size: clamp(96px, 22vw, 280px);
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.02em;
      background: linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 4px 20px rgba(0,0,0,0.4));
      animation: ksPulse 4s ease-in-out infinite;
    }
    @keyframes ksPulse {
      0%, 100% { filter: drop-shadow(0 4px 20px rgba(0,0,0,0.4)); }
      50% { filter: drop-shadow(0 4px 30px rgba(251,191,36,0.4)); }
    }
    .ks-date {
      font-size: clamp(18px, 2.2vw, 32px);
      font-weight: 400;
      opacity: 0.85;
      margin-top: 12px;
      text-transform: capitalize;
    }
    .ks-sub {
      font-size: clamp(14px, 1.8vw, 22px);
      font-weight: 300;
      margin-top: 24px;
      opacity: 0.8;
      font-style: italic;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .ks-hint {
      position: absolute;
      bottom: 6vh;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(255,255,255,0.7);
      font-size: 15px;
      font-weight: 400;
      letter-spacing: 0.02em;
      z-index: 3;
      animation: ksFloat 3s ease-in-out infinite;
    }
    @keyframes ksFloat {
      0%, 100% { transform: translate(-50%, 0); }
      50% { transform: translate(-50%, -6px); }
    }
    .ks-pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255,255,255,0.9);
      animation: ksDot 1.6s ease-in-out infinite;
      box-shadow: 0 0 12px rgba(255,255,255,0.6);
    }
    @keyframes ksDot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.6); opacity: 0.6; }
    }

    .ks-brand {
      position: absolute;
      top: 4vh;
      right: 4vw;
      color: rgba(255,255,255,0.5);
      font-weight: 800;
      font-size: 18px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      z-index: 3;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskScreensaverComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private readonly IDLE_MS = 5 * 60_000; // 5 minutos de inactividad

  public active = signal(false);
  public now = signal(new Date());
  private lastActivity = Date.now();

  /** Habilitar solo en portal /timeclock, no en /timeclock-kiosk */
  public enabled = computed(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    return !/\/timeclock-kiosk/.test(path);
  });

  public timeStr = computed(() => {
    const d = this.now();
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')}`;
  });

  public dateStr = computed(() => {
    return this.now().toLocaleDateString('es-PA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  public mode = computed<TimeMode>(() => {
    const h = this.now().getHours();
    if (h >= 5 && h < 7) return 'dawn';
    if (h >= 7 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
  });

  public greeting = computed(() => {
    const m = this.mode();
    const greetings: Record<TimeMode, string[]> = {
      dawn: ['Buen amanecer', 'Arrancamos el día', 'Buenos días'],
      morning: ['Buenos días', '¡Hola!', 'Buen día'],
      afternoon: ['Buenas tardes', '¿Cómo va el día?', 'Hola hola'],
      evening: ['Buenas tardes', 'Cayendo el sol', 'Buen atardecer'],
      night: ['Buenas noches', 'Llegando al final', 'Última hora'],
    };
    const arr = greetings[m];
    // Pick basado en el día para que no cambie con cada tick
    const dayKey = this.now().getDate();
    return arr[dayKey % arr.length];
  });

  public subMessage = computed(() => {
    const m = this.mode();
    const subs: Record<TimeMode, string[]> = {
      dawn: ['Listos para empezar', '☕ El café te espera', 'Vamos con todo'],
      morning: ['¡Que sea un gran día!', 'Vamos con energía', 'Hagamos magia hoy'],
      afternoon: ['Vamos por la tarde', 'Mantén el ritmo', 'Aún queda mucho día'],
      evening: ['Cerrando el día con todo', 'Ya casi', 'Último impulso'],
      night: ['Buen trabajo hoy', 'Descansa bien', 'Hasta mañana'],
    };
    const arr = subs[m];
    const minuteKey = this.now().getMinutes();
    return arr[minuteKey % arr.length];
  });

  ngOnInit(): void {
    // Tick cada segundo para el reloj
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.now.set(new Date());
        // Activar si llevamos IDLE_MS sin actividad, no está activo, y no hay modal/dropdown abierto
        if (!this.active() && Date.now() - this.lastActivity >= this.IDLE_MS && !this.isModalOpen()) {
          this.active.set(true);
        }
      });
  }

  /** No activar screensaver si hay un modal/dropdown/dialog abierto */
  private isModalOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return !!document.querySelector(
      '.p-dialog, .p-overlay, .p-popover, .p-select-overlay, .p-confirmdialog, .p-toast-message, [role="dialog"]:not([aria-hidden="true"])'
    );
  }

  @HostListener('window:mousemove')
  @HostListener('window:keydown')
  @HostListener('window:touchstart')
  @HostListener('window:click')
  @HostListener('window:scroll')
  public onActivity(): void {
    this.lastActivity = Date.now();
    if (this.active()) this.active.set(false);
  }

  public dismiss(): void {
    this.lastActivity = Date.now();
    this.active.set(false);
  }
}
