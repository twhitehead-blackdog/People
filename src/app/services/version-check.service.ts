import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { APP_VERSION } from '../version';

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
  private destroyRef = inject(DestroyRef);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /** Se pone en true cuando el servidor tiene una versión diferente */
  readonly updateAvailable = signal(false);

  /** Versión remota detectada */
  readonly remoteVersion = signal<string | null>(null);

  startPolling(): void {
    // No iniciar si ya se detectó una actualización o ya hay un interval activo
    if (this.updateAvailable() || this.intervalId) return;

    // Verificar inmediatamente y luego cada 60 segundos
    this.checkVersion();
    this.intervalId = setInterval(() => this.checkVersion(), 60_000);

    this.destroyRef.onDestroy(() => {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    });
  }

  private async checkVersion(): Promise<void> {
    try {
      // Usar fetch nativo para evitar interceptors de HttpClient (no necesita auth, no debe mostrar toast de error)
      const res = await fetch('/api/version', { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const serverVersion: string = data?.version;
      if (!serverVersion) return;

      if (serverVersion !== APP_VERSION) {
        this.remoteVersion.set(serverVersion);
        this.updateAvailable.set(true);

        // Dejar de hacer polling, ya detectamos la diferencia
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      }
    } catch {
      // Silenciar errores de red (el usuario puede estar offline momentáneamente)
    }
  }
}
