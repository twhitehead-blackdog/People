import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject, isDevMode, signal } from '@angular/core';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';
import { ApiUrlService } from './api-url.service';

/**
 * Sincroniza la hora del cliente con la hora del servidor usando el header HTTP `Date`.
 *
 * - No requiere cambios en la base de datos.
 * - Calcula un offset (ms) una sola vez y luego permite obtener "ahora" sincronizado.
 */
@Injectable({
  providedIn: 'root',
})
export class TimeSyncService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  private _offsetMs = signal<number>(0);
  private _initialized = signal<boolean>(false);
  private initializing = false;

  /**
   * Inicializa el offset usando una petición liviana a Supabase.
   * Es idempotente: si ya fue inicializado (o está inicializando), no hace nada.
   */
  init(): void {
    if (this._initialized() || this.initializing) return;

    const baseUrl = this.apiUrl.baseUrl;
    // Nota: en navegador, el header `Date` de Supabase puede no ser legible por CORS.
    // Por eso intentamos primero Supabase directo (si funciona, genial) y si no,
    // usamos un endpoint same-origin (/api/server-time) que lee `Date` server-side.

    this.initializing = true;

    const initFromBackend = () =>
      this.http.get<{ server_time: string }>('/api/server-time').pipe(
        tap((data) => {
          const serverMs = new Date(data?.server_time).getTime();
          if (Number.isNaN(serverMs)) {
            if (isDevMode()) {
              console.warn('[TimeSyncService] /api/server-time devolvió fecha inválida.', data);
            }
            this._offsetMs.set(0);
            this._initialized.set(true);
            return;
          }
          const offset = serverMs - Date.now();
          this._offsetMs.set(offset);
          this._initialized.set(true);
          if (isDevMode()) {
            console.log('[TimeSyncService] Offset calculado vía /api/server-time (ms):', offset);
          }
        })
      );

    const initFromSupabaseDirect = () => {
      if (!baseUrl) {
        return initFromBackend();
      }
      // Petición liviana: solo para intentar leer el header Date del servidor.
      return this.http
        .get<unknown>(`${baseUrl}/rest/v1/companies`, {
          observe: 'response',
          params: { select: 'id', limit: '1' },
        })
        .pipe(
          switchMap((res: HttpResponse<unknown>) => {
            const dateHeader = res.headers.get('Date');
            if (!dateHeader) {
              if (isDevMode()) {
                console.warn('[TimeSyncService] Header Date no accesible (CORS). Usando /api/server-time.');
              }
              return initFromBackend();
            }

            const serverMs = new Date(dateHeader).getTime();
            if (Number.isNaN(serverMs)) {
              if (isDevMode()) {
                console.warn('[TimeSyncService] Header Date inválido. Usando /api/server-time.', {
                  dateHeader,
                });
              }
              return initFromBackend();
            }

            const offset = serverMs - Date.now();
            this._offsetMs.set(offset);
            this._initialized.set(true);
            if (isDevMode()) {
              console.log('[TimeSyncService] Offset calculado vía header Date (ms):', offset);
            }
            return of(null);
          })
        );
    };

    initFromSupabaseDirect()
      .pipe(
        catchError((err) => {
          if (isDevMode()) {
            console.warn('[TimeSyncService] Error inicializando; usando hora local.', err);
          }
          this._offsetMs.set(0);
          this._initialized.set(true);
          return of(null);
        }),
        finalize(() => {
          this.initializing = false;
        })
      )
      .subscribe();
  }

  /**
   * Devuelve la fecha/hora "actual" basada en el offset calculado.
   * Si aún no está inicializado, retorna hora local (offset=0).
   */
  now(): Date {
    return new Date(Date.now() + this._offsetMs());
  }

  /**
   * Offset actual en milisegundos (server - local).
   */
  offsetMs(): number {
    return this._offsetMs();
  }

  /**
   * Indica si ya se intentó inicializar (con éxito o fallback).
   */
  initialized(): boolean {
    return this._initialized();
  }
}

