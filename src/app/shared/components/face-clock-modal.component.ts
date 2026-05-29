import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../../services/api-url.service';
import { DashboardStore } from '../../stores/dashboard.store';
import { FaceRecognitionService } from '../../services/face-recognition.service';
import { DeviceFingerprintService } from '../services/device-fingerprint.service';

const FRAMES = 3;
// Igualamos los params de captura a los de /face-test (que SÍ identifica).
// Antes: 640px/0.85 → CompreFace devolvía similitudes <0.45 → "unknown".
// Ahora: 720px/0.90 = mismas dimensiones que /face-test → match consistente.
const FRAME_INTERVAL_MS = 700;
const JPEG_MAX_SIDE = 720;
const JPEG_QUALITY = 0.90;
const STABLE_FRAMES_TO_FIRE = 3;       // 3 detecciones consecutivas (~750ms) → auto-fire
const DETECT_INTERVAL_MS = 250;
const MIN_BBOX_PX = 160;

export interface FaceClockSuccess {
  employee_id: string;
  employee_name: string;
  timelog_id: string;
  timelog_type: 'entry' | 'lunch_start' | 'lunch_end' | 'exit';
  punched_at: string;
  similarity: number;
}

/**
 * Modal con auto-trigger: en cuanto detecta cara estable (3 frames consecutivos),
 * dispara la captura solo. Cero botones — solo cancelar.
 */
@Component({
  selector: 'pt-face-clock-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      @if (displayMode() === 'modal') {
        <div class="fcm-backdrop" (click)="close()"></div>
      }
      <div class="fcm-modal" [class.fcm-modal--inline]="displayMode() === 'inline'" (click)="$event.stopPropagation()">
        @if (displayMode() === 'modal') {
          <div class="fcm-modal__head">
            <h2>{{ typeLabel() }}</h2>
            <button class="fcm-icon-btn" (click)="close()" aria-label="cerrar">
              <i class="pi pi-times"></i>
            </button>
          </div>
        }

        <div class="fcm-camera">
          <video #video autoplay playsinline muted></video>

          <!-- HUD geek: grid + corners + scan line. Solo activo cuando cámara lista. -->
          @if (streamReady()) {
            <div class="fcm-hud">
              <div class="fcm-hud-grid"></div>
              <span class="fcm-hud-corner fcm-hud-corner--tl"></span>
              <span class="fcm-hud-corner fcm-hud-corner--tr"></span>
              <span class="fcm-hud-corner fcm-hud-corner--bl"></span>
              <span class="fcm-hud-corner fcm-hud-corner--br"></span>
              <div class="fcm-hud-scan"
                   [class.fcm-hud-scan--active]="faceDetected() || busy() || stableCountdown() > 0"></div>
              @if (faceDetected() || busy()) {
                <div class="fcm-hud-label">
                  <span class="fcm-hud-dot"></span>
                  {{ busy() ? 'ANALIZANDO' : 'ROSTRO DETECTADO' }}
                </div>
              }
            </div>
          }

          <div class="fcm-oval"
            [class.fcm-oval--detected]="faceDetected() && !busy()"
            [class.fcm-oval--firing]="busy() || stableCountdown() > 0"></div>

          <!-- Si cámara NO está activa: botón explícito (user gesture → permission prompt) -->
          @if (!streamReady() && !cameraError()) {
            <div class="fcm-overlay">
              <div class="fcm-cam-err">
                <i class="pi pi-camera"></i>
                <strong>Marcación con rostro</strong>
                <span style="color:#a1a1aa;font-size:0.82rem;">Tocá para habilitar la cámara y marcar</span>
                <button class="fcm-cta fcm-cta--xl" (click)="retryCamera()">
                  <i class="pi pi-camera"></i> Habilitar cámara
                </button>
              </div>
            </div>
          }

          <!-- Error de cámara con botón de reintento -->
          @if (cameraError(); as err) {
            <div class="fcm-overlay">
              <div class="fcm-cam-err">
                <i class="pi pi-exclamation-triangle" style="color:#ef4444"></i>
                <strong>{{ err }}</strong>
                <button class="fcm-cta fcm-cta--xl" (click)="retryCamera()">
                  <i class="pi pi-refresh"></i> Intentar de nuevo
                </button>
              </div>
            </div>
          }

          <!-- Instrucción superpuesta -->
          @if (!busy() && captureProgress() === 0 && !result() && !cameraError()) {
            <div class="fcm-hint">
              @if (!cameraReady()) {
                <i class="pi pi-spin pi-spinner"></i><span>Iniciando cámara…</span>
              } @else if (!faceDetected()) {
                <i class="pi pi-user"></i><span>Acercá la cara al óvalo</span>
              } @else if (stableCountdown() > 0) {
                <i class="pi pi-check-circle" style="color:#22c55e"></i>
                <span>Detectado · {{ stableCountdown() }}</span>
              } @else {
                <i class="pi pi-search" style="color:#fbbf24"></i>
                <span>Mantenete así</span>
              }
            </div>
          }

          @if (captureProgress() > 0) {
            <div class="fcm-overlay">
              <div class="fcm-progress">{{ captureProgress() }}/{{ totalFrames }}</div>
            </div>
          }

          @if (busy() && captureProgress() === 0) {
            <div class="fcm-overlay">
              <div class="fcm-spinner">
                <i class="pi pi-spin pi-spinner"></i>
                <span>{{ challenge() || 'Identificando…' }}</span>
              </div>
            </div>
          }

          @if (result(); as r) {
            <div class="fcm-result" [attr.data-result]="r.kind">
              <i class="pi"
                [class.pi-check-circle]="r.kind === 'success'"
                [class.pi-times-circle]="r.kind !== 'success'"></i>
              <strong>{{ r.title }}</strong>
              @if (r.subtitle) { <span>{{ r.subtitle }}</span> }
            </div>
          }
        </div>

        @if (displayMode() === 'modal') {
          <div class="fcm-actions">
            <button class="fcm-cancel-xl" (click)="close()" [disabled]="busy()">
              <i class="pi pi-times"></i> Cancelar
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .fcm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9000; backdrop-filter: blur(4px); animation: fcm-fade .15s; }
    @keyframes fcm-fade { from { opacity: 0; } to { opacity: 1; } }
    .fcm-modal { position: fixed; inset: 0; margin: auto; width: min(560px, 100%); max-height: 100dvh; background: #0a0a0a; color: #fff; z-index: 9001; display: flex; flex-direction: column; overflow: hidden; animation: fcm-slide .2s ease-out; }
    @media (min-width: 640px) {
      .fcm-modal { inset: 5vh auto auto auto; left: 50%; transform: translateX(-50%); max-height: 90vh; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); }
    }
    /* INLINE: sin overlay, contenido fluido */
    .fcm-modal--inline { position: static; inset: auto; width: 100%; max-height: none; height: 100%; min-height: 380px; left: auto; transform: none; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); animation: none; }
    .fcm-modal--inline .fcm-camera { min-height: 360px; }
    @keyframes fcm-slide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .fcm-modal__head { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .fcm-modal__head h2 { margin: 0; font-size: 1rem; font-weight: 600; }
    .fcm-icon-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #fff; width: 36px; height: 36px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; -webkit-tap-highlight-color: transparent; }

    .fcm-camera { position: relative; flex: 1; min-height: 380px; background: #000; }
    .fcm-camera video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }

    /* ── HUD geek estilo cyber ─────────────────────────────────────── */
    .fcm-hud { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
    /* Grid sutil */
    .fcm-hud-grid {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(34,211,238,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(34,211,238,0.07) 1px, transparent 1px);
      background-size: 40px 40px;
      mix-blend-mode: screen;
      opacity: 0.55;
    }
    /* 4 corners tipo viewfinder */
    .fcm-hud-corner {
      position: absolute; width: 28px; height: 28px;
      border: 2px solid rgba(34,211,238,0.85);
      box-shadow: 0 0 12px rgba(34,211,238,0.45);
    }
    .fcm-hud-corner--tl { top: 14px; left: 14px; border-right: none; border-bottom: none; border-top-left-radius: 4px; }
    .fcm-hud-corner--tr { top: 14px; right: 14px; border-left: none; border-bottom: none; border-top-right-radius: 4px; }
    .fcm-hud-corner--bl { bottom: 14px; left: 14px; border-right: none; border-top: none; border-bottom-left-radius: 4px; }
    .fcm-hud-corner--br { bottom: 14px; right: 14px; border-left: none; border-top: none; border-bottom-right-radius: 4px; }
    /* Línea de escaneo tipo radar (de arriba a abajo) */
    .fcm-hud-scan {
      position: absolute; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.6) 20%, rgba(34,211,238,0.95) 50%, rgba(34,211,238,0.6) 80%, transparent 100%);
      box-shadow: 0 0 18px rgba(34,211,238,0.7), 0 0 36px rgba(34,211,238,0.35);
      animation: fcm-scan 2.6s ease-in-out infinite;
      opacity: 0.7;
    }
    .fcm-hud-scan--active {
      background: linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.7) 20%, rgba(34,197,94,1) 50%, rgba(34,197,94,0.7) 80%, transparent 100%);
      box-shadow: 0 0 22px rgba(34,197,94,0.8), 0 0 44px rgba(34,197,94,0.4);
      animation-duration: 1.2s;
      opacity: 1;
    }
    @keyframes fcm-scan {
      0%   { top: 8%;  opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { top: 92%; opacity: 0; }
    }
    /* Label corner superior izq con dot pulsante */
    .fcm-hud-label {
      position: absolute; top: 14px; left: 56px;
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 9px; border-radius: 4px;
      background: rgba(0,0,0,0.55);
      border: 1px solid rgba(34,211,238,0.45);
      color: #67e8f9;
      font-family: 'Orbitron', ui-monospace, monospace;
      font-size: 10px; font-weight: 700; letter-spacing: 0.7px;
      text-transform: uppercase;
    }
    .fcm-hud-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px rgba(34,197,94,0.9);
      animation: fcm-hud-dot 1.1s ease-in-out infinite;
    }
    @keyframes fcm-hud-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.4; transform: scale(0.75); }
    }
    .fcm-oval { position: absolute; inset: 0; margin: auto; width: 60%; height: 70%; border-radius: 50%; border: 3px solid rgba(255,255,255,0.30); box-shadow: 0 0 0 9999px rgba(0,0,0,0.45); pointer-events: none; transition: border-color .2s, box-shadow .2s; }
    .fcm-oval--detected { border-color: #fbbf24; box-shadow: 0 0 0 9999px rgba(0,0,0,0.45), 0 0 40px rgba(251,191,36,0.5); }
    .fcm-oval--firing { border-color: #22c55e; box-shadow: 0 0 0 9999px rgba(0,0,0,0.45), 0 0 60px rgba(34,197,94,0.7); animation: fcm-pulse-green .6s ease-in-out infinite; }
    @keyframes fcm-pulse-green { 0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.45), 0 0 40px rgba(34,197,94,0.5); } 50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.45), 0 0 80px rgba(34,197,94,0.9); } }

    .fcm-hint { position: absolute; left: 0; right: 0; bottom: 1rem; text-align: center; padding: 0.5rem 1rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .fcm-hint i { font-size: 1.1rem; }
    .fcm-hint span { color: #fff; font-weight: 600; font-size: 0.95rem; text-shadow: 0 1px 8px rgba(0,0,0,0.9); background: rgba(0,0,0,0.50); padding: 0.4rem 0.85rem; border-radius: 999px; backdrop-filter: blur(8px); }

    .fcm-overlay { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,0.40); }
    .fcm-progress { width: 100px; height: 100px; border-radius: 50%; background: #fbbf24; display: grid; place-items: center; font-size: 1.4rem; font-weight: 800; color: #0a0a0a; box-shadow: 0 8px 40px rgba(251,191,36,0.5); animation: fcm-pulse .9s ease-in-out infinite; }
    @keyframes fcm-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
    .fcm-spinner { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: #fbbf24; }
    .fcm-spinner i { font-size: 1.8rem; }
    .fcm-spinner span { font-size: 0.9rem; color: #fff; }
    .fcm-cam-err { display: flex; flex-direction: column; gap: 0.85rem; padding: 1.5rem; text-align: center; align-items: center; max-width: 320px; }
    .fcm-cam-err i { font-size: 2.4rem; color: #fbbf24; }
    .fcm-cam-err strong { font-size: 0.95rem; color: #fff; }
    .fcm-cam-err button { width: 100%; }

    .fcm-result { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 0.4rem; background: rgba(0,0,0,0.92); backdrop-filter: blur(8px); text-align: center; padding: 1.5rem; animation: fcm-fade .25s; }
    .fcm-result i { font-size: 4rem; }
    .fcm-result[data-result="success"] i { color: #22c55e; }
    .fcm-result[data-result="error"] i { color: #ef4444; }
    .fcm-result strong { font-size: 1.3rem; color: #fff; }
    .fcm-result span { font-size: 0.9rem; color: #a1a1aa; }

    .fcm-actions { padding: 1rem; background: #0a0a0a; border-top: 1px solid rgba(255,255,255,0.08); }
    .fcm-cancel-xl { width: 100%; padding: 0.9rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); color: #d4d4d8; border-radius: 12px; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .fcm-cancel-xl:active { background: rgba(255,255,255,0.08); }
    .fcm-cancel-xl:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class FaceClockModalComponent implements OnDestroy {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private store = inject(DashboardStore);
  private deviceFp = inject(DeviceFingerprintService);
  public face = inject(FaceRecognitionService);

  public open = input.required<boolean>();
  public type = input<'entry' | 'lunch_start' | 'lunch_end' | 'exit'>('entry');
  public branchId = input<string | null>(null);
  public displayMode = input<'modal' | 'inline'>('modal');
  /** A7 fix: el caller_email puede venir del padre (kiosk anónimo sin Auth0).
   * Si no se pasa, intentamos usar el currentEmployee del store. */
  public callerEmailInput = input<string | null>(null);
  public success = output<FaceClockSuccess>();
  public closed = output<void>();

  public readonly totalFrames = FRAMES;

  private videoRef = viewChild<ElementRef<HTMLVideoElement>>('video');
  private stream: MediaStream | null = null;
  private detectHandle: any = null;
  // A6 fix: trackear los setTimeout post-success/error para cancelarlos en cleanup()
  private resultTimers: any[] = [];
  private prefetchedNonce: string | null = null;
  private fired = false;

  public streamReady = signal(false);
  public cameraReady = signal(false);
  public busy = signal(false);
  public challenge = signal('');
  public captureProgress = signal(0);
  public faceDetected = signal(false);
  public stableCount = signal(0);
  public result = signal<{ kind: 'success' | 'error'; title: string; subtitle?: string } | null>(null);

  public stableCountdown = computed(() => {
    const n = STABLE_FRAMES_TO_FIRE - this.stableCount();
    return Math.max(0, n);
  });

  public typeLabel = computed(() => ({
    entry: 'Marcar entrada',
    exit: 'Marcar salida',
    lunch_start: 'Inicio almuerzo',
    lunch_end: 'Fin almuerzo',
  } as const)[this.type()]);

  // Track previous open state para que el effect SOLO reaccione a transiciones
  // de open (no a cambios de type/branch/callerEmailInput que dispararían
  // prefetchNonce en bucle y saturarían el rate limiter).
  private lastOpen = false;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      // Solo dispara la lógica cuando open cambia (transición)
      if (isOpen === this.lastOpen) return;
      this.lastOpen = isOpen;
      if (isOpen) {
        this.fired = false;
        // En inline NO auto-iniciamos: el user debe tocar "Habilitar cámara"
        // (garantiza user gesture → permission prompt aparece confiablemente)
        if (this.displayMode() === 'modal') {
          this.startCameraImmediate();
        }
        this.prefetchNonce();
        this.face.loadDetectorOnly().catch(() => {});
      } else {
        this.cleanup();
      }
    });
  }

  public cameraError = signal<string | null>(null);

  private async startCameraImmediate(): Promise<void> {
    if (this.stream) return;
    this.cameraError.set(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        this.cameraError.set('Tu navegador no soporta cámara');
        return;
      }
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      this.streamReady.set(true);
      // Esperar a que el video element exista y vincular stream
      const tryAttach = async (tries = 0): Promise<void> => {
        const v = this.videoRef()?.nativeElement;
        if (v && this.stream) {
          v.srcObject = this.stream;
          try { await v.play(); } catch { /* autoplay restrictions */ }
          this.cameraReady.set(true);
          this.startDetectLoop();
        } else if (tries < 20) {
          setTimeout(() => tryAttach(tries + 1), 50);
        }
      };
      tryAttach();
    } catch (e: any) {
      const name = e?.name || '';
      let msg = 'Permitir acceso a cámara';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') msg = 'Permiso denegado — habilitalo en el navegador';
      else if (name === 'NotFoundError') msg = 'No hay cámara detectada';
      else if (name === 'NotReadableError') msg = 'Cámara en uso por otra app';
      this.cameraError.set(msg);
    }
  }

  /** Reintento manual de cámara cuando hay error o permiso denegado. */
  public retryCamera(): void {
    if (this.stream) { try { this.stream.getTracks().forEach(t => t.stop()); } catch { /* */ } this.stream = null; }
    this.startCameraImmediate();
  }

  // Lock + backoff para evitar saturar face-issue-nonce con 429s.
  private prefetchInFlight = false;
  private prefetchCooldownUntil = 0;

  private async prefetchNonce(): Promise<void> {
    // A7 fix: priorizar input del padre (kiosk anónimo), fallback al store
    const callerEmail = this.callerEmailInput() || this.store.currentEmployee()?.work_email;
    if (!callerEmail) return;
    // Si ya tenemos un nonce válido cacheado, no pedir otro
    if (this.prefetchedNonce) return;
    // Lock: una sola request a la vez
    if (this.prefetchInFlight) return;
    // Backoff: si hace poco hubo 429, esperar
    if (Date.now() < this.prefetchCooldownUntil) return;

    this.prefetchInFlight = true;
    try {
      const resp: any = await firstValueFrom(this.http.post(
        this.apiUrl.build('functions/v1/face-issue-nonce'),
        { caller_email: callerEmail, kiosk_id: null },
      ));
      this.prefetchedNonce = resp?.nonce ?? null;
    } catch (e: any) {
      // 429 → backoff 10s. Otros errores → backoff 2s para no martillar.
      const status = e?.status;
      const wait = status === 429 ? 10000 : 2000;
      this.prefetchCooldownUntil = Date.now() + wait;
    } finally {
      this.prefetchInFlight = false;
    }
  }

  /** Loop de detección con auto-fire cuando la cara está estable. */
  private startDetectLoop(): void {
    if (this.detectHandle) return;
    this.detectHandle = setInterval(async () => {
      const v = this.videoRef()?.nativeElement;
      if (!v || v.readyState < 2 || this.busy() || this.fired) return;
      const d = await this.face.detectBoxOnly(v);
      if (!d) {
        this.faceDetected.set(false);
        this.stableCount.set(0);
        return;
      }
      const bbox = Math.min(d.box.width, d.box.height);
      const frameW = v.videoWidth || 1280;
      const cx = d.box.x + d.box.width / 2;
      const centered = Math.abs(cx - frameW / 2) < frameW * 0.25;
      const valid = bbox >= MIN_BBOX_PX && centered;
      this.faceDetected.set(valid);
      if (valid) {
        const next = this.stableCount() + 1;
        this.stableCount.set(next);
        if (next >= STABLE_FRAMES_TO_FIRE && !this.fired) {
          this.fired = true;
          this.capture();
        }
      } else {
        this.stableCount.set(0);
      }
    }, DETECT_INTERVAL_MS);
  }

  private captureFrame(v: HTMLVideoElement): string | null {
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return null;
    const scale = Math.min(1, JPEG_MAX_SIDE / Math.max(w, h));
    const cw = Math.round(w * scale), ch = Math.round(h * scale);
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, cw, ch);
    return c.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  private async computeMotionScore(framesB64: string[]): Promise<number> {
    if (framesB64.length < 2) return 0;
    const size = 64;
    const greys: Uint8Array[] = [];
    for (const f of framesB64) {
      const img = new Image(); img.src = f;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('load')); });
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const g = new Uint8Array(size * size);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        g[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }
      greys.push(g);
    }
    let total = 0, pairs = 0;
    for (let p = 1; p < greys.length; p++) {
      const a = greys[p - 1], b = greys[p];
      let diff = 0;
      for (let k = 0; k < a.length; k++) diff += Math.abs(a[k] - b[k]);
      total += diff / a.length; pairs++;
    }
    return pairs > 0 ? total / pairs : 0;
  }

  private async capture(): Promise<void> {
    const v = this.videoRef()?.nativeElement;
    if (!v || !this.cameraReady()) { this.fired = false; return; }
    // A7 fix: priorizar input del padre (kiosk anónimo), fallback al store
    const callerEmail = this.callerEmailInput() || this.store.currentEmployee()?.work_email;
    if (!callerEmail) { this.result.set({ kind: 'error', title: 'Sesión inválida' }); this.fired = false; return; }

    this.busy.set(true);
    this.result.set(null);
    try {
      let nonce = this.prefetchedNonce;
      if (!nonce) {
        try {
          const resp: any = await firstValueFrom(this.http.post(
            this.apiUrl.build('functions/v1/face-issue-nonce'),
            { caller_email: callerEmail, kiosk_id: null },
          ));
          nonce = resp?.nonce ?? null;
        } catch { /* fall-through */ }
      }
      this.prefetchedNonce = null;
      if (!nonce) throw new Error('No se pudo obtener nonce');

      const frames: string[] = [];
      for (let i = 0; i < FRAMES; i++) {
        this.captureProgress.set(i + 1);
        if (i > 0) await new Promise(r => setTimeout(r, FRAME_INTERVAL_MS));
        const f = this.captureFrame(v);
        if (f) frames.push(f);
      }
      this.captureProgress.set(0);
      if (frames.length < 2) { this.result.set({ kind: 'error', title: 'No se pudo capturar' }); return; }

      this.challenge.set('Identificando…');
      const motion = await this.computeMotionScore(frames);

      const res: any = await firstValueFrom(this.http.post(
        this.apiUrl.build('functions/v1/face-clock-in'),
        {
          caller_email: callerEmail, nonce, images: frames,
          motion_score: motion, timelog_type: this.type(),
          branch_id: this.branchId(), captured_at: new Date().toISOString(),
          device_id: this.deviceFp.getDeviceId(),
          device_combined_hash: (await this.deviceFp.collect())['combined_hash'],
        },
      ));

      if (res.result === 'matched') {
        this.result.set({
          kind: 'success',
          title: `✓ ${res.employee_name}`,
          subtitle: `${this.typeLabel()} · ${(res.similarity * 100).toFixed(0)}%`,
        });
        this.resultTimers.push(setTimeout(() => { this.success.emit(res as FaceClockSuccess); this.close(); }, 1200));
      } else {
        this.result.set({
          kind: 'error',
          title: this.resultLabel(res.result),
          subtitle: res.detail || res.reason || this.resultHint(res.result),
        });
        // Reset para que pueda volver a intentar
        this.resultTimers.push(setTimeout(() => {
          this.result.set(null);
          this.stableCount.set(0);
          this.fired = false;
          this.prefetchNonce(); // nuevo nonce para próximo intento
        }, 2500));
      }
    } catch (e: any) {
      const body = e?.error;
      this.result.set({
        kind: 'error', title: 'Error',
        subtitle: body?.detail || body?.error || body?.result || String(e?.message || e).slice(0, 80),
      });
      this.resultTimers.push(setTimeout(() => {
        this.result.set(null);
        this.stableCount.set(0);
        this.fired = false;
        this.prefetchNonce();
      }, 2500));
    } finally {
      this.busy.set(false);
      this.challenge.set('');
      this.captureProgress.set(0);
    }
  }

  private resultLabel(r: string): string {
    return ({
      matched: '✓ Identificado',
      ambiguous: 'No reconocido',
      photo_suspected: 'Posible foto detectada',
      unknown: 'Sin coincidencia',
      liveness_failed: 'Liveness falló',
      rate_limited: 'Demasiados intentos',
      nonce_invalid: 'Sesión expirada',
      no_face: 'Sin rostro visible',
      no_enrolments: 'Sin rostros enrolados',
      error: 'Error',
    } as any)[r] || r;
  }

  /** Hint accionable según el tipo de error. */
  private resultHint(r: string): string {
    return ({
      ambiguous: 'Acercate y mirá de frente.',
      photo_suspected: 'Movete naturalmente — no uses fotos.',
      unknown: 'Acercate más, con buena luz.',
      liveness_failed: 'Movete suavemente y volvé a intentar.',
      rate_limited: 'Esperá unos segundos antes de reintentar.',
      nonce_invalid: 'Reiniciá el flujo desde el botón.',
      no_face: 'Coloca la cara dentro del óvalo.',
      no_enrolments: 'Pide al gerente que enrolle tu rostro.',
      error: 'Reintenta o usa PIN.',
    } as any)[r] || '';
  }

  public close(): void { this.closed.emit(); }

  private cleanup(): void {
    if (this.detectHandle) { clearInterval(this.detectHandle); this.detectHandle = null; }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    // A6 fix: cancelar todos los setTimeout pendientes post-success/error.
    // Sin esto, un timer disparaba success.emit() o prefetchNonce() después de
    // cerrado el modal, generando marcaciones fantasma o pegando nonces viejos.
    for (const t of this.resultTimers) clearTimeout(t);
    this.resultTimers = [];
    this.streamReady.set(false);
    this.cameraReady.set(false);
    this.busy.set(false);
    this.challenge.set('');
    this.captureProgress.set(0);
    this.faceDetected.set(false);
    this.stableCount.set(0);
    this.result.set(null);
    this.prefetchedNonce = null;
    this.fired = false;
    this.prefetchInFlight = false;
    this.prefetchCooldownUntil = 0;
  }

  ngOnDestroy(): void { this.cleanup(); }
}
