import { Injectable, signal } from '@angular/core';

export type RandomEffect =
  | 'paw_rain'
  | 'emoji_explosion'
  | 'jackpot'
  | 'shake'
  | 'unicorn'
  | 'pizza'
  | 'fireworks'
  | 'rainbow'
  | 'fire'
  | 'money_rain'
  | 'heart_burst'
  | 'disco'
  | 'lightning'
  | 'tornado'
  | 'glitch'
  | 'boom'
  | 'stars_warp'
  | 'confetti_cannon'
  | 'dragon_energy'
  | 'panama_flag'
  | 'vhs'
  | 'laser_show'
  | 'beer'
  | null;

export type EasterEgg =
  | 'matrix'
  | 'moto'
  | 'batman'
  | 'starwars'
  | 'corridos'
  | 'watchdogs'
  | 'birthday'
  | null;

interface DebugConfig {
  /** Forzar el próximo marcaje a usar este efecto random (consumido y limpiado al usarse). */
  forceNextEffect: RandomEffect;
  /** Forzar próximo marcaje a usar este easter egg de pantalla completa. */
  forceNextEgg: EasterEgg;
  /** Multiplica probabilidad de efectos random (0=desactiva, 1=normal, 10=todo el tiempo). */
  effectMultiplier: number;
  /** Forzar próxima frase a usar este pool. */
  forceNextPhrasePool: string | null;
  /** Forzar nombre del empleado para preview. */
  forceEmployeeName: string | null;
  /** Activado/desactivado. */
  enabled: boolean;
}

const KEY = 'timeclock_debug_v1';

@Injectable({ providedIn: 'root' })
export class TimeclockDebugService {
  public config = signal<DebugConfig>(this.loadFromStorage());

  public update(patch: Partial<DebugConfig>): void {
    const next = { ...this.config(), ...patch };
    this.config.set(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }

  /** Consume el efecto forzado (lo retorna y lo limpia). */
  public consumeForcedEffect(): RandomEffect {
    const c = this.config();
    if (!c.enabled || !c.forceNextEffect) return null;
    const effect = c.forceNextEffect;
    this.update({ forceNextEffect: null });
    return effect;
  }

  /** Consume el easter egg forzado. */
  public consumeForcedEgg(): EasterEgg {
    const c = this.config();
    if (!c.enabled || !c.forceNextEgg) return null;
    const egg = c.forceNextEgg;
    this.update({ forceNextEgg: null });
    return egg;
  }

  public consumePhrasePool(): string | null {
    const c = this.config();
    if (!c.enabled || !c.forceNextPhrasePool) return null;
    const pool = c.forceNextPhrasePool;
    this.update({ forceNextPhrasePool: null });
    return pool;
  }

  public getEffectMultiplier(): number {
    const c = this.config();
    return c.enabled ? Math.max(0, c.effectMultiplier) : 1;
  }

  private loadFromStorage(): DebugConfig {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          enabled: !!parsed.enabled,
          forceNextEffect: parsed.forceNextEffect ?? null,
          forceNextEgg: parsed.forceNextEgg ?? null,
          effectMultiplier: typeof parsed.effectMultiplier === 'number' ? parsed.effectMultiplier : 1,
          forceNextPhrasePool: parsed.forceNextPhrasePool ?? null,
          forceEmployeeName: parsed.forceEmployeeName ?? null,
        };
      }
    } catch {}
    return {
      enabled: false,
      forceNextEffect: null,
      forceNextEgg: null,
      effectMultiplier: 1,
      forceNextPhrasePool: null,
      forceEmployeeName: null,
    };
  }
}
