import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';
import { getEnv } from '../utils/env.utils';

// NOTE: @digitalpersona/devices does `require('WebSdk')` at module load,
// which only exists in the browser after WebSdk.js is loaded as a script.
// We MUST NOT import it statically — it would break SSR for any page that
// imports this service. Use dynamic import inside browser-only code paths.

/** URL of the WebSdk runtime hosted locally. Place websdk.client.ui.min.js in public/assets/dp/. */
const WEBSDK_SCRIPT_URL = '/assets/dp/websdk.client.ui.min.js';

// Sample formats — numeric constants from @digitalpersona/devices.
const SAMPLE_FORMAT_PNG = 5;

let websdkLoaded: Promise<void> | null = null;
function ensureWebSdkLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).WebSdk) return Promise.resolve();
  if (websdkLoaded) return websdkLoaded;
  websdkLoaded = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = WEBSDK_SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar WebSdk.js'));
    document.head.appendChild(s);
  });
  return websdkLoaded;
}

export type DpReaderState =
  | 'idle'
  | 'no-lite-client'
  | 'no-device'
  | 'ready'
  | 'capturing'
  | 'error';

export interface DpQualityEvent {
  quality: number;
  message: string;
}

export interface DpSampleEvent {
  sampleB64: string;
}

export interface DpEnrollResult {
  success: boolean;
  template_id?: string;
  quality?: number;
  error?: string;
}

export interface DpIdentifyResult {
  matched: boolean;
  employee_id?: string;
  employee_name?: string;
  cedula?: string;
  score?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class DpFingerprintService {
  private http = inject(HttpClient);
  private reader: any = null;
  private deviceUid: string | null = null;

  state$ = new Subject<DpReaderState>();
  quality$ = new Subject<DpQualityEvent>();
  sample$ = new Subject<DpSampleEvent>();
  error$ = new Subject<string>();

  /** Live connection status, queryable as signal-like via getter. */
  private _connected = false;
  get connected(): boolean { return this._connected; }
  private connectedListeners: Array<(c: boolean) => void> = [];
  onConnectionChange(cb: (c: boolean) => void): () => void {
    this.connectedListeners.push(cb);
    cb(this._connected);
    return () => { this.connectedListeners = this.connectedListeners.filter(x => x !== cb); };
  }
  private setConnected(v: boolean) {
    if (this._connected === v) return;
    this._connected = v;
    this.connectedListeners.forEach(cb => { try { cb(v); } catch {} });
  }

  /**
   * Background status: usa UN solo reader persistente y los eventos DeviceConnected/Disconnected.
   * Heartbeat ligero al Lite Client cada 15s para detectar caída del servicio.
   * No recrea readers (eso confundía al WebSdk channel y dejaba el lector "desconectado" zombie).
   */
  private pollerStarted = false;
  private statusReader: any = null;
  async startStatusPolling(_intervalMs?: number) {
    if (this.pollerStarted || typeof window === 'undefined') return;
    this.pollerStarted = true;

    const initStatusReader = async (): Promise<boolean> => {
      try {
        if (!(await this.isLiteClientAvailable(1500))) return false;
        await ensureWebSdkLoaded();
        if (!this.statusReader) {
          const dpModule = await import('@digitalpersona/devices');
          this.statusReader = new dpModule.FingerprintReader();
          this.statusReader.on('DeviceConnected', () => this.setConnected(true));
          this.statusReader.on('DeviceDisconnected', () => this.setConnected(false));
          this.statusReader.on('CommunicationFailed', () => {
            this.setConnected(false);
            // El channel se cayó: lo reseteamos para reintentar en el próximo heartbeat
            try { this.statusReader?.off?.(); } catch {}
            this.statusReader = null;
          });
        }
        const devices: string[] = await this.statusReader.enumerateDevices();
        this.setConnected(!!devices?.length);
        return true;
      } catch {
        try { this.statusReader?.off?.(); } catch {}
        this.statusReader = null;
        this.setConnected(false);
        return false;
      }
    };

    await initStatusReader();

    // Heartbeat: si perdimos el reader (CommunicationFailed o no se inicializó), reintenta
    setInterval(async () => {
      if (!this.statusReader) {
        await initStatusReader();
        return;
      }
      // Sanity check: pasamos un sólo enumerate cada 15s para confirmar
      try {
        const devices: string[] = await this.statusReader.enumerateDevices();
        this.setConnected(!!devices?.length);
      } catch {
        this.setConnected(false);
        try { this.statusReader?.off?.(); } catch {}
        this.statusReader = null;
      }
    }, 15000);
  }

  private get base(): string {
    if (typeof window !== 'undefined') return window.location.origin;
    return (getEnv('ENV_APP_URL') || 'http://localhost:4200').replace(/\/$/, '');
  }
  private url(path: string): string { return `${this.base}/${path}`; }

  /**
   * Probe the DP Lite Client. WebSdk negotiates over HTTPS at /get_connection
   * before opening the WebSocket, so that's the right thing to probe.
   * Browsers refuse to fetch a self-signed HTTPS endpoint until the user accepts
   * the cert by visiting https://127.0.0.1:52181 once. We use no-cors mode so
   * the request still resolves — opaque response = service is up + cert accepted.
   */
  async isLiteClientAvailable(timeoutMs = 2500): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      await fetch('https://127.0.0.1:52181/get_connection', {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      return true;
    } catch {
      return false;
    }
  }

  async init(): Promise<DpReaderState> {
    if (typeof window === 'undefined') return 'idle';
    // If we have a reader AND a device UID, we're truly ready. Otherwise tear down and retry.
    if (this.reader && this.deviceUid) return 'ready';
    if (this.reader) {
      try { this.reader.off?.(); } catch {}
      this.reader = null;
    }

    if (!(await this.isLiteClientAvailable())) {
      this.state$.next('no-lite-client');
      return 'no-lite-client';
    }
    try {
      await ensureWebSdkLoaded();
    } catch (err: any) {
      this.state$.next('no-lite-client');
      this.error$.next(err?.message || 'WebSdk no disponible');
      return 'no-lite-client';
    }

    let dpModule: any;
    try {
      dpModule = await import('@digitalpersona/devices');
    } catch (err: any) {
      this.state$.next('error');
      this.error$.next(err?.message || 'No se pudo cargar @digitalpersona/devices');
      return 'error';
    }

    try {
      this.reader = new dpModule.FingerprintReader();
      this.reader.on('DeviceConnected', (e: any) => {
        this.deviceUid = e?.deviceUid ?? this.deviceUid;
        this.state$.next('ready');
      });
      this.reader.on('DeviceDisconnected', () => {
        this.deviceUid = null;
        this.state$.next('no-device');
      });
      this.reader.on('QualityReported', (e: any) => {
        this.quality$.next({ quality: e?.quality, message: this.qualityMessage(e?.quality) });
      });
      this.reader.on('SamplesAcquired', (e: any) => {
        const raw = typeof e?.samples === 'string' ? JSON.parse(e.samples) : (e?.samples || []);
        const first = raw?.[0];
        if (first) this.sample$.next({ sampleB64: first });
      });
      this.reader.on('ErrorOccurred', (e: any) => {
        this.state$.next('error');
        this.error$.next(e?.error ? String(e.error) : 'Reader error');
      });
      this.reader.on('CommunicationFailed', () => {
        this.state$.next('no-lite-client');
      });

      // The WebSdk channel opens asynchronously after `new FingerprintReader()`.
      // enumerateDevices may throw "Reader not initialized" if called too early.
      // Retry with backoff until the channel is ready or we time out (~6 s).
      const devices = await this.enumerateWithRetry(8, 750);
      if (!devices?.length) {
        this.state$.next('no-device');
        return 'no-device';
      }
      this.deviceUid = devices[0];
      this.state$.next('ready');
      return 'ready';
    } catch (err: any) {
      this.state$.next('error');
      this.error$.next(err?.message || 'Init failed');
      return 'error';
    }
  }

  private async enumerateWithRetry(maxAttempts: number, delayMs: number): Promise<string[]> {
    let lastErr: any = null;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const devices = await this.reader.enumerateDevices();
        if (devices && devices.length) return devices;
        // No devices yet — could be channel still opening. Wait and retry.
      } catch (e: any) {
        lastErr = e;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    if (lastErr) console.warn('[dp] enumerateDevices retries exhausted:', lastErr?.message || lastErr);
    return [];
  }

  async startCapture(): Promise<void> {
    if (!this.reader) await this.init();
    if (!this.reader) throw new Error('Reader not initialized');
    await this.reader.startAcquisition(SAMPLE_FORMAT_PNG, this.deviceUid || undefined);
    this.state$.next('capturing');
  }

  async stopCapture(): Promise<void> {
    if (!this.reader) return;
    try { await this.reader.stopAcquisition(this.deviceUid || undefined); } catch {}
    this.state$.next('ready');
  }

  destroy(): void {
    try { this.reader?.off?.(); } catch {}
    this.reader = null;
    this.deviceUid = null;
  }

  captureOne(timeoutMs = 30000): Promise<string> {
    return new Promise(async (resolve, reject) => {
      let timer: any;
      const sub = this.sample$.subscribe(({ sampleB64 }) => {
        clearTimeout(timer);
        sub.unsubscribe();
        this.stopCapture().finally(() => resolve(sampleB64));
      });
      timer = setTimeout(() => {
        sub.unsubscribe();
        this.stopCapture().finally(() => reject(new Error('Capture timeout')));
      }, timeoutMs);
      try { await this.startCapture(); }
      catch (e) { clearTimeout(timer); sub.unsubscribe(); reject(e); }
    });
  }

  // ---------- server-side endpoints ----------

  async enroll(employeeId: string, fingerIndex: number, samples: string[], facePhotoB64?: string, deviceName = 'U.are.U 4500'): Promise<DpEnrollResult> {
    return firstValueFrom(
      this.http.post<DpEnrollResult>(this.url('api/dp/enroll'), {
        employee_id: employeeId,
        finger_index: fingerIndex,
        samples_b64: samples,
        device_name: deviceName,
        face_photo_b64: facePhotoB64,
      })
    );
  }

  async enrollSelf(employeeId: string, fingerIndex: number, samples: string[], facePhotoB64?: string): Promise<DpEnrollResult> {
    return firstValueFrom(
      this.http.post<DpEnrollResult>(this.url('api/dp/enroll-self'), {
        employee_id: employeeId,
        finger_index: fingerIndex,
        samples_b64: samples,
        face_photo_b64: facePhotoB64,
      })
    );
  }

  async identify(sample: string): Promise<DpIdentifyResult> {
    return firstValueFrom(
      this.http.post<DpIdentifyResult>(this.url('api/dp/identify'), { sample_b64: sample })
    );
  }

  async punch(employeeId: string, punchType: 'entry' | 'lunch_start' | 'lunch_end' | 'exit'): Promise<{ success: boolean; error?: string }> {
    return firstValueFrom(
      this.http.post<{ success: boolean; error?: string }>(this.url('api/dp/punch'), {
        employee_id: employeeId,
        punch_type: punchType,
      })
    );
  }

  async getEnrollmentStatus(employeeId: string): Promise<{ enrolled: boolean; fingers: number[] }> {
    return firstValueFrom(
      this.http.get<{ enrolled: boolean; fingers: number[] }>(
        this.url(`api/dp/enrollment-status/${employeeId}`)
      )
    );
  }

  async deleteFinger(employeeId: string, fingerIndex: number): Promise<{ success: boolean }> {
    return firstValueFrom(
      this.http.delete<{ success: boolean }>(
        this.url(`api/dp/templates/${employeeId}/${fingerIndex}`)
      )
    );
  }

  // ---------- helpers ----------

  qualityMessage(q: number | undefined): string {
    // QualityCode constants from @digitalpersona/devices/sample.d.ts
    switch (q) {
      case 0: return 'Buena calidad';
      case 1: return 'Sin imagen';
      case 2: return 'Imagen muy clara';
      case 3: return 'Imagen muy oscura';
      case 4: return 'Demasiado ruido';
      case 5: return 'Bajo contraste';
      case 6: return 'Pocos detalles';
      case 7: return 'Centra el dedo';
      case 8: return 'No detecta dedo';
      case 9: return 'Dedo muy arriba';
      case 10: return 'Dedo muy abajo';
      case 11: return 'Dedo muy a la izquierda';
      case 12: return 'Dedo muy a la derecha';
      case 19: return 'Presiona menos';
      case 20: return 'Presiona más';
      case 21: return 'Dedo húmedo';
      case 22: return 'Dedo no válido';
      case 23: return 'Cubre más el sensor';
      default: return 'Coloca el dedo';
    }
  }
}
