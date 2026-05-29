/**
 * PunchQueueService
 * ─────────────────
 * Cola persistente y a prueba de fallos para marcaciones de emergencia.
 *
 * Por qué existe:
 *   El día 19/05/2026 el backend devolvió 502 durante un deploy y las marcaciones
 *   cayeron al fallback de localStorage del kiosk SIN sincronizar. Como la app sólo
 *   sincronizaba manualmente desde Settings, varias marcaciones quedaron perdidas.
 *
 * Capas:
 *   1) IndexedDB (sobrevive cache wipe). localStorage de respaldo.
 *   2) Auto-sync agresivo: boot + cada 30s + online event + visibilitychange.
 *   3) Endpoint server-side /api/punch-beacon que escribe a disco antes de la BD,
 *      así una caída de Supabase tampoco pierde nada.
 *   4) `navigator.sendBeacon` como camino garantizado incluso si la pestaña se cierra.
 *
 * Contrato público:
 *   - enqueue(payload): añade a la cola persistente.
 *   - drain(): intenta vaciar la cola contra /api/punch-beacon.
 *   - pendingCount: signal con el conteo actual.
 *   - sendBeaconFireAndForget(payload): último recurso síncrono que el navegador
 *     entrega aunque la pestaña esté cerrándose.
 */
import { Injectable, signal } from '@angular/core';

export interface QueuedPunch {
  id: string;                  // UUID local
  employee_id: string;
  employee_name?: string;
  branch_id: string;
  company_id: string;
  type: string;
  type_label?: string;
  punched_at: string;          // ISO
  ip?: string | null;
  invalid_ip?: boolean;
  auth_method?: 'pin' | 'webauthn' | string | null;
  reason?: string;
  enqueued_at: string;         // ISO
  attempts: number;
  last_error?: string;
}

const DB_NAME = 'bd_kiosk_punch_queue';
const DB_VERSION = 1;
const STORE = 'punches';
const LS_KEY_LEGACY = 'bd_kiosk_emergency_timelogs';   // formato antiguo
const LS_KEY_MIRROR = 'bd_kiosk_punch_queue_mirror';   // mirror de IDB

function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* */ }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

@Injectable({ providedIn: 'root' })
export class PunchQueueService {
  public readonly pendingCount = signal<number>(0);
  /** Indica si hay una operación de sync en vuelo (para deshabilitar UI). */
  public readonly syncing = signal<boolean>(false);
  /** Último timestamp en que un sync terminó (éxito o error). */
  public readonly lastSyncAt = signal<number | null>(null);

  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private listenersBound = false;

  constructor() {
    // Migrar localStorage viejo (bd_kiosk_emergency_timelogs) hacia IDB en background.
    void this.migrateFromLegacyLocalStorage();
    void this.refreshPendingCount();
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /** Llamar UNA vez al boot de la app kiosk. Programa auto-sync recurrente. */
  public bootstrap(): void {
    if (this.listenersBound) return;
    this.listenersBound = true;

    // Auto-sync periódico cada 30s — corto porque queremos cerrar la ventana ASAP.
    this.autoSyncTimer = setInterval(() => { void this.drain('interval'); }, 30_000);

    // Cuando volvemos online (red recuperada) → drain inmediato.
    window.addEventListener('online', () => { void this.drain('online'); });

    // Cuando la pestaña/kiosk vuelve a primer plano → drain.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.drain('visible');
      }
    });

    // Si el usuario está a punto de cerrar la pestaña y aún hay cola → sendBeacon.
    // A2 fix: NO usar await aquí — el browser puede matar la tarea async antes
    // de que IDB termine de leer. Usamos el mirror SÍNCRONO de localStorage.
    window.addEventListener('pagehide', () => { this.flushViaSendBeaconSync(); });

    // Drain inmediato al boot — aquí es donde recuperamos las marcaciones perdidas
    // durante el último deploy.
    void this.drain('boot');
  }

  /**
   * Encola un punch para reenvío persistente.
   * Devuelve el id del item encolado.
   */
  public async enqueue(input: Omit<QueuedPunch, 'id' | 'enqueued_at' | 'attempts'>): Promise<string> {
    const entry: QueuedPunch = {
      id: uuid(),
      enqueued_at: new Date().toISOString(),
      attempts: 0,
      ...input,
    };
    await this.writeToIDB(entry);
    this.writeToLocalStorageMirror(entry);
    await this.refreshPendingCount();
    // Disparar sync inmediato — la red puede estar bien justo ahora.
    void this.drain('enqueue');
    return entry.id;
  }

  /**
   * Store-and-forward: encola SIN disparar drain inmediato.
   * Se usa para registrar la marca localmente ANTES de intentar el envío normal
   * (process_timelog). Si el envío confirma éxito, se llama remove(id) y nunca
   * llega al beacon. Si algo falla (red, cierre de pestaña, respuesta perdida),
   * el auto-sync la mandará al beacon — que es idempotente, así que no duplica.
   */
  public async enqueueQuiet(input: Omit<QueuedPunch, 'id' | 'enqueued_at' | 'attempts'>): Promise<string> {
    const entry: QueuedPunch = {
      id: uuid(),
      enqueued_at: new Date().toISOString(),
      attempts: 0,
      ...input,
    };
    await this.writeToIDB(entry);
    this.writeToLocalStorageMirror(entry);
    await this.refreshPendingCount();
    return entry.id;
  }

  /** Quita una entrada de la cola por id (cuando el envío normal confirmó éxito). */
  public async remove(id: string): Promise<void> {
    await this.removeFromIDB(id);
    this.removeFromLocalStorageMirror(id);
    await this.refreshPendingCount();
  }

  /** Llamada por la UI al presionar "Sincronizar ahora". */
  public async drainNow(): Promise<{ drained: number; remaining: number; failed: number }> {
    return this.drain('manual');
  }

  /** Útil para la UI antes de mostrar acciones. */
  public async getAll(): Promise<QueuedPunch[]> {
    const items = await this.readAllFromIDB();
    if (items.length > 0) return items;
    // Fallback: leer mirror de localStorage
    return this.readMirrorFromLocalStorage();
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private async drain(_origin: string): Promise<{ drained: number; remaining: number; failed: number }> {
    if (this.syncing()) return { drained: 0, remaining: this.pendingCount(), failed: 0 };
    this.syncing.set(true);
    let drained = 0;
    let failed = 0;
    try {
      const items = await this.getAll();
      for (const item of items) {
        const ok = await this.postToBeacon(item);
        if (ok) {
          await this.removeFromIDB(item.id);
          this.removeFromLocalStorageMirror(item.id);
          drained++;
        } else {
          item.attempts += 1;
          await this.writeToIDB(item);
          failed++;
        }
      }
    } catch (err) {
      console.error('[PunchQueue] drain error', err);
    } finally {
      this.syncing.set(false);
      this.lastSyncAt.set(Date.now());
      await this.refreshPendingCount();
    }
    const remaining = this.pendingCount();
    if (drained > 0) console.info(`[PunchQueue] drained=${drained} remaining=${remaining} failed=${failed}`);
    return { drained, remaining, failed };
  }

  /** Camino feliz: POST normal con fetch. */
  private async postToBeacon(p: QueuedPunch): Promise<boolean> {
    try {
      const r = await fetch('/api/punch-beacon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: p.employee_id,
          branch_id: p.branch_id,
          company_id: p.company_id,
          type: p.type,
          punched_at: p.punched_at,
          ip: p.ip ?? null,
          invalid_ip: p.invalid_ip ?? false,
          auth_method: p.auth_method ?? null,
          reason: p.reason ?? 'Auto-sync de marcación de emergencia',
        }),
        // No mandar credenciales por defecto — el beacon es público (sólo recibe)
        credentials: 'omit',
        keepalive: true,
      });
      if (!r.ok) {
        p.last_error = `HTTP ${r.status}`;
        return false;
      }
      // Endpoint devuelve 200 si al menos el disco aceptó. Para nosotros eso
      // es suficiente — el cron del backend reintenta el insert a Supabase.
      return true;
    } catch (err: unknown) {
      p.last_error = err instanceof Error ? err.message : String(err);
      return false;
    }
  }

  /** Camino "garantizado": navegador entrega sendBeacon incluso si la pestaña muere. */
  public sendBeaconFireAndForget(p: Omit<QueuedPunch, 'id' | 'enqueued_at' | 'attempts'>): boolean {
    try {
      if (typeof navigator.sendBeacon !== 'function') return false;
      const body = new Blob([JSON.stringify({
        employee_id: p.employee_id,
        branch_id: p.branch_id,
        company_id: p.company_id,
        type: p.type,
        punched_at: p.punched_at,
        ip: p.ip ?? null,
        invalid_ip: p.invalid_ip ?? false,
        auth_method: p.auth_method ?? null,
        reason: p.reason ?? 'sendBeacon emergency punch',
      })], { type: 'application/json' });
      return navigator.sendBeacon('/api/punch-beacon', body);
    } catch {
      return false;
    }
  }

  /** Al pagehide: si hay cola, mandar todo con sendBeacon (best-effort).
   * Mantenemos la versión async para llamadas desde código no-pagehide. */
  private async flushViaSendBeacon(): Promise<void> {
    const items = await this.getAll();
    for (const it of items) {
      this.sendBeaconFireAndForget(it);
    }
  }

  /** A2 fix: variante SÍNCRONA para pagehide.
   * Lee SOLO el mirror de localStorage (síncrono) y dispara sendBeacon de una.
   * Sin esto, en pagehide el `await getAll()` puede no completar antes de que
   * el browser descarte la pestaña → las marcaciones pendientes nunca llegan
   * al servidor. */
  private flushViaSendBeaconSync(): void {
    try {
      const items = this.readMirrorFromLocalStorage();
      for (const it of items) {
        this.sendBeaconFireAndForget(it);
      }
    } catch (e) {
      // pagehide es best-effort; no rompemos nada si falla
      console.warn('[PunchQueue] flushViaSendBeaconSync error', e);
    }
  }

  // ── IndexedDB layer ───────────────────────────────────────────────────

  private openDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => { console.warn('[PunchQueue] IDB open failed', req.error); resolve(null); };
        req.onblocked = () => { resolve(null); };
      } catch (err) {
        console.warn('[PunchQueue] IDB exception', err);
        resolve(null);
      }
    });
    return this.dbPromise;
  }

  private async writeToIDB(entry: QueuedPunch): Promise<void> {
    const db = await this.openDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch { resolve(); }
    });
  }

  private async removeFromIDB(id: string): Promise<void> {
    const db = await this.openDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch { resolve(); }
    });
  }

  private async readAllFromIDB(): Promise<QueuedPunch[]> {
    const db = await this.openDB();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve((req.result || []) as QueuedPunch[]);
        req.onerror = () => resolve([]);
      } catch { resolve([]); }
    });
  }

  // ── LocalStorage mirror (fallback) ────────────────────────────────────

  private writeToLocalStorageMirror(entry: QueuedPunch): void {
    try {
      const raw = localStorage.getItem(LS_KEY_MIRROR);
      const list: QueuedPunch[] = raw ? JSON.parse(raw) : [];
      const without = list.filter(x => x.id !== entry.id);
      without.push(entry);
      localStorage.setItem(LS_KEY_MIRROR, JSON.stringify(without));
    } catch { /* localStorage llena: ignorar */ }
  }

  private removeFromLocalStorageMirror(id: string): void {
    try {
      const raw = localStorage.getItem(LS_KEY_MIRROR);
      if (!raw) return;
      const list: QueuedPunch[] = JSON.parse(raw);
      const filtered = list.filter(x => x.id !== id);
      localStorage.setItem(LS_KEY_MIRROR, JSON.stringify(filtered));
    } catch { /* */ }
  }

  private readMirrorFromLocalStorage(): QueuedPunch[] {
    try {
      const raw = localStorage.getItem(LS_KEY_MIRROR);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  }

  private async refreshPendingCount(): Promise<void> {
    const items = await this.getAll();
    this.pendingCount.set(items.length);
  }

  /**
   * Migrar el formato viejo `bd_kiosk_emergency_timelogs` a IDB.
   *
   * SANITY CHECK: rechazamos entradas con timestamp > 48h hacia atrás o > 1h hacia
   * adelante respecto a la hora actual. Estos casos vienen de kiosks con reloj
   * atascado (bug del 19/05/2026 donde algunos kiosks acumulaban marcaciones con
   * fechas hasta 40 días viejas). Las entradas rechazadas se conservan en
   * `bd_kiosk_emergency_timelogs_quarantine` para revisión manual posterior.
   */
  private async migrateFromLegacyLocalStorage(): Promise<void> {
    const MAX_BACK_MS = 48 * 60 * 60 * 1000;  // 48 horas hacia atrás
    const MAX_FWD_MS  = 60 * 60 * 1000;       // 1 hora hacia adelante
    try {
      const raw = localStorage.getItem(LS_KEY_LEGACY);
      if (!raw) return;
      const list: Array<Record<string, unknown>> = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return;

      const now = Date.now();
      const accepted: Array<Record<string, unknown>> = [];
      const quarantined: Array<Record<string, unknown>> = [];

      for (const item of list) {
        if (item['synced']) continue;
        const tsRaw = (item['timestamp'] as string) || '';
        const tsMs = tsRaw ? Date.parse(tsRaw) : NaN;
        const ageMs = isNaN(tsMs) ? Infinity : now - tsMs;
        const isStale = isNaN(tsMs) || ageMs > MAX_BACK_MS || ageMs < -MAX_FWD_MS;

        if (isStale) {
          // No importamos: timestamp sospechoso (probable reloj atascado del kiosk).
          quarantined.push({ ...item, quarantined_at: new Date().toISOString(), age_ms: ageMs });
          continue;
        }

        const entry: QueuedPunch = {
          id: (item['id'] as string) || uuid(),
          employee_id: item['employee_id'] as string,
          employee_name: item['employee_name'] as string,
          branch_id: item['branch_id'] as string,
          company_id: item['company_id'] as string,
          type: item['type'] as string,
          type_label: item['type_label'] as string,
          punched_at: tsRaw,
          enqueued_at: new Date().toISOString(),
          attempts: 0,
          reason: 'Migrado desde bd_kiosk_emergency_timelogs (sync diferido)',
        };
        await this.writeToIDB(entry);
        this.writeToLocalStorageMirror(entry);
        accepted.push(item);
      }

      // Persistir cuarentena para auditoría — admin puede revisarlas con la pantalla emergency-timelog-review.
      if (quarantined.length > 0) {
        const QKEY = 'bd_kiosk_emergency_timelogs_quarantine';
        try {
          const prev = JSON.parse(localStorage.getItem(QKEY) || '[]');
          const merged = Array.isArray(prev) ? [...prev, ...quarantined] : quarantined;
          localStorage.setItem(QKEY, JSON.stringify(merged));
        } catch {
          localStorage.setItem('bd_kiosk_emergency_timelogs_quarantine', JSON.stringify(quarantined));
        }
        console.warn(`[PunchQueue] ${quarantined.length} timelogs en cuarentena por timestamp sospechoso`);
      }

      // Marcar todos como synced en el formato viejo para no reimportar
      const marked = list.map(x => ({ ...x, synced: true }));
      localStorage.setItem(LS_KEY_LEGACY, JSON.stringify(marked));
      console.info(`[PunchQueue] migración legacy: ${accepted.length} aceptados, ${quarantined.length} en cuarentena`);
    } catch (err) {
      console.warn('[PunchQueue] migración legacy falló', err);
    }
  }
}
