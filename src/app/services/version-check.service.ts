import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { APP_VERSION } from '../version';

const COUNTDOWN_SECONDS = 60;

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
  private destroyRef = inject(DestroyRef);
  private pollingIntervalId: ReturnType<typeof setInterval> | null = null;
  private countdownIntervalId: ReturnType<typeof setInterval> | null = null;

  /** Se pone en true cuando el servidor tiene una versión diferente */
  readonly updateAvailable = signal(false);

  /** Versión remota detectada */
  readonly remoteVersion = signal<string | null>(null);

  /** Segundos restantes para la recarga automática */
  readonly countdown = signal(COUNTDOWN_SECONDS);

  /** Multiplicador de velocidad actual (1x o 5x) */
  readonly speedMultiplier = signal(1);

  startPolling(): void {
    if (this.updateAvailable() || this.pollingIntervalId) return;

    this.checkVersion();
    this.pollingIntervalId = setInterval(() => this.checkVersion(), 60_000);

    this.destroyRef.onDestroy(() => {
      this.clearAllIntervals();
    });
  }

  /** Activa el modo 5x al hacer clic en el contador */
  activateFastMode(): void {
    if (this.speedMultiplier() === 5) return;
    this.speedMultiplier.set(5);
    // Reiniciar el interval del countdown a 200ms (1s / 5)
    this.startCountdown();
  }

  private startCountdown(): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
    }
    const tick = Math.round(1000 / this.speedMultiplier());
    this.countdownIntervalId = setInterval(() => {
      const next = this.countdown() - 1;
      if (next <= 0) {
        this.countdown.set(0);
        clearInterval(this.countdownIntervalId!);
        this.countdownIntervalId = null;
        window.location.reload();
      } else {
        this.countdown.set(next);
      }
    }, tick);
  }

  private clearAllIntervals(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  private async checkVersion(): Promise<void> {
    try {
      const res = await fetch('/api/version', { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const serverVersion: string = data?.version;
      if (!serverVersion) return;

      if (serverVersion !== APP_VERSION) {
        this.remoteVersion.set(serverVersion);
        this.updateAvailable.set(true);
        this.countdown.set(COUNTDOWN_SECONDS);
        this.speedMultiplier.set(1);

        if (this.pollingIntervalId) {
          clearInterval(this.pollingIntervalId);
          this.pollingIntervalId = null;
        }

        this.startCountdown();
      }
    } catch {
      // Silenciar errores de red
    }
  }
}
