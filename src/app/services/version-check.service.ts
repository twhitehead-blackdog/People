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

  /** Multiplicador de velocidad actual */
  readonly speedMultiplier = signal(1);
  private readonly speedSteps = [5, 10, 20, 50] as const;

  startPolling(): void {
    if (this.updateAvailable() || this.pollingIntervalId) return;

    this.checkVersion();
    this.pollingIntervalId = setInterval(() => this.checkVersion(), 60_000);

    this.destroyRef.onDestroy(() => {
      this.clearAllIntervals();
    });
  }

  /** Cicla entre velocidades: 1→5→10→20→50 */
  activateFastMode(): void {
    const current = this.speedMultiplier();
    const idx = this.speedSteps.indexOf(current as any);
    const next = idx === -1 ? this.speedSteps[0] : this.speedSteps[Math.min(idx + 1, this.speedSteps.length - 1)];
    if (next === current) return;
    this.speedMultiplier.set(next);
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
        void this.reloadWithoutStaleAssets();
      } else {
        this.countdown.set(next);
      }
    }, tick);
  }

  private async reloadWithoutStaleAssets(): Promise<void> {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch {
      // Aunque la limpieza falle, la recarga con cache-buster debe continuar.
    } finally {
      const url = new URL(window.location.href);
      url.searchParams.set('v', this.remoteVersion() ?? Date.now().toString());
      window.location.replace(url.toString());
    }
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
