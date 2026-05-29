import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import * as OTPAuth from 'otpauth';
import { ApiUrlService } from '../services/api-url.service';
import { FaceRecognitionService } from '../services/face-recognition.service';

const FRAMES = 5;
const FRAME_INTERVAL_MS = 600;
const JPEG_MAX_SIDE = 720;
const JPEG_QUALITY = 0.9;
const MIN_BBOX_PX = 160;

/**
 * Modal de enrollment facial desde el kiosk anónimo.
 *
 * Flujo: el gerente debe autorizar con su PIN de Authenticator (TOTP).
 * Validamos el PIN del lado del cliente con `otpauth` y, si pasa, llamamos
 * face-enroll con el caller_email del gerente.
 *
 * Requiere que el gerente tenga `position.admin = true` y `code_uri` válido.
 */
@Component({
  selector: 'pt-face-enroll-kiosk',
  imports: [CommonModule, FormsModule, Dialog, Button, InputOtpModule, ToastModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
    <p-dialog
      [visible]="visible()"
      modal
      [closable]="true"
      [draggable]="false"
      [dismissableMask]="false"
      [style]="{ width: 'min(560px, 95vw)' }"
      header="Enrolar rostro"
      (visibleChange)="onVisibleChange($event)"
    >
      <div class="fek-wrap">
        <!-- Step 1: PIN del gerente -->
        @if (step() === 'pin') {
          <div class="fek-step">
            <div class="fek-step-icon">
              <i class="pi pi-shield"></i>
            </div>
            <h3 class="fek-step-title">Autorización requerida</h3>
            <p class="fek-step-desc">
              Para enrolar el rostro de <strong>{{ employeeName() }}</strong>,
              un gerente con Authenticator debe ingresar su código de 6 dígitos.
            </p>
            <p-inputOtp
              [(ngModel)]="pinValue"
              [length]="6"
              [integerOnly]="true"
              styleClass="fek-otp"
              (input)="onPinInput($event)"
            />
            @if (pinError()) {
              <p class="fek-error">{{ pinError() }}</p>
            }
            <div class="fek-actions">
              <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="cancel()" />
              <p-button
                label="Validar"
                icon="pi pi-check"
                [disabled]="pinValue.length < 6 || validatingPin()"
                [loading]="validatingPin()"
                (onClick)="validatePin()"
              />
            </div>
          </div>
        }

        <!-- Step 2: Captura de cámara -->
        @if (step() === 'capture') {
          <div class="fek-step">
            <h3 class="fek-step-title">Capturando rostro de {{ employeeName() }}</h3>
            <p class="fek-step-desc">
              Mira de frente a la cámara, bien iluminado. Se capturarán {{ FRAMES }} fotos.
            </p>
            <div class="fek-video-wrap">
              <video #video autoplay playsinline muted></video>
              @if (!streamReady() && !cameraError()) {
                <div class="fek-overlay">
                  <i class="pi pi-camera text-3xl text-gray-500"></i>
                  <span>Habilitando cámara...</span>
                </div>
              }
              @if (cameraError(); as err) {
                <div class="fek-overlay fek-overlay-err">
                  <i class="pi pi-exclamation-triangle text-3xl text-red-400"></i>
                  <span>{{ err }}</span>
                </div>
              }
              @if (streamReady()) {
                <div class="fek-oval" [class.fek-oval--ok]="faceDetected()"></div>
              }
              @if (capturing() && captureProgress() > 0) {
                <div class="fek-progress">
                  <div class="fek-progress-num">{{ captureProgress() }}/{{ FRAMES }}</div>
                  <div class="fek-progress-bar">
                    <div class="fek-progress-fill" [style.width.%]="(captureProgress() / FRAMES) * 100"></div>
                  </div>
                </div>
              }
            </div>

            <div class="fek-actions">
              <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="cancel()" [disabled]="capturing()" />
              <p-button
                [label]="capturing() ? 'Capturando...' : (streamReady() ? 'Capturar' : 'Habilitar cámara')"
                icon="pi pi-camera"
                severity="success"
                [loading]="capturing() || startingCamera()"
                [disabled]="capturing() || (streamReady() && !faceDetected())"
                (onClick)="streamReady() ? startCapture() : startCamera()"
              />
            </div>

            @if (streamReady() && !capturing()) {
              <div class="fek-hint">
                @if (!faceDetected()) {
                  <i class="pi pi-info-circle"></i> Coloca el rostro dentro del óvalo.
                } @else {
                  <i class="pi pi-check-circle text-green-400"></i> Rostro detectado. Click en "Capturar".
                }
              </div>
            }
          </div>
        }

        <!-- Step 3: Éxito -->
        @if (step() === 'done') {
          <div class="fek-step fek-done">
            <div class="fek-step-icon fek-step-icon-success">
              <i class="pi pi-check"></i>
            </div>
            <h3 class="fek-step-title">¡Rostro enrolado!</h3>
            <p class="fek-step-desc">
              {{ employeeName() }} ya puede marcar entrada/salida con su rostro.
            </p>
          </div>
        }
      </div>
    </p-dialog>
  `,
  styles: [`
    .fek-wrap { padding: 0.5rem; }
    .fek-step { display: flex; flex-direction: column; align-items: center; gap: 0.85rem; padding: 1rem 0.5rem; text-align: center; }
    .fek-step-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.35); display: flex; align-items: center; justify-content: center; color: #60a5fa; }
    .fek-step-icon i { font-size: 28px; }
    .fek-step-icon-success { background: rgba(34,197,94,0.16); border-color: rgba(34,197,94,0.4); color: #22c55e; }
    .fek-step-title { font-size: 1.05rem; font-weight: 600; color: #f3f4f6; margin: 0; }
    .fek-step-desc { font-size: 0.85rem; color: #9ca3af; margin: 0; max-width: 420px; line-height: 1.4; }
    .fek-error { color: #fca5a5; font-size: 0.85rem; margin: 0.25rem 0 0; }
    .fek-actions { display: flex; gap: 0.75rem; justify-content: center; margin-top: 0.85rem; flex-wrap: wrap; }

    .fek-video-wrap { position: relative; width: 100%; max-width: 420px; aspect-ratio: 4/3; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; }
    .fek-video-wrap video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: block; }
    .fek-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; color: #6b7280; font-size: 0.85rem; background: rgba(0,0,0,0.45); }
    .fek-overlay-err { color: #fca5a5; }
    .fek-oval { position: absolute; inset: 0; margin: auto; width: 55%; height: 70%; border-radius: 50%; border: 3px solid rgba(255,255,255,0.30); box-shadow: 0 0 0 9999px rgba(0,0,0,0.30); pointer-events: none; transition: border-color .2s, box-shadow .2s; }
    .fek-oval--ok { border-color: rgba(34,197,94,0.85); box-shadow: 0 0 0 9999px rgba(0,0,0,0.30), 0 0 20px rgba(34,197,94,0.35); }
    .fek-progress { position: absolute; bottom: 0.85rem; left: 50%; transform: translateX(-50%); width: 78%; background: rgba(0,0,0,0.7); padding: 0.55rem 0.75rem; border-radius: 9px; display: flex; flex-direction: column; gap: 0.35rem; }
    .fek-progress-num { font-size: 0.78rem; color: #fbbf24; font-weight: 600; text-align: center; }
    .fek-progress-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
    .fek-progress-fill { height: 100%; background: linear-gradient(90deg, #fbbf24, #f59e0b); transition: width 0.2s; }

    .fek-hint { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.85rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 999px; font-size: 0.8rem; color: #9ca3af; margin-top: 0.5rem; }

    ::ng-deep .fek-otp .p-inputotp-input { width: 40px; height: 50px; font-size: 1.5rem; }
  `],
  providers: [MessageService],
})
export class FaceEnrollKioskComponent implements OnDestroy {
  public readonly FRAMES = FRAMES;

  public visible = input.required<boolean>();
  public employeeId = input.required<string>();
  public employeeName = input.required<string>();

  public finished = output<void>();
  public cancelled = output<void>();

  public video = viewChild<ElementRef<HTMLVideoElement>>('video');

  public step = signal<'pin' | 'capture' | 'done'>('pin');
  public pinValue = '';
  public pinError = signal<string | null>(null);
  public validatingPin = signal(false);
  public adminCallerEmail = signal<string | null>(null);

  public streamReady = signal(false);
  public startingCamera = signal(false);
  public capturing = signal(false);
  public cameraError = signal<string | null>(null);
  public faceDetected = signal(false);
  public captureProgress = signal(0);

  private stream: MediaStream | null = null;
  private detectHandle: any = null;

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private face = inject(FaceRecognitionService);
  private message = inject(MessageService);

  ngOnDestroy(): void { this.stopCamera(); }

  public onVisibleChange(v: boolean): void {
    if (!v) this.cancel();
  }

  public onPinInput(_e: any): void {
    this.pinError.set(null);
  }

  public async validatePin(): Promise<void> {
    if (this.pinValue.length < 6) return;
    this.validatingPin.set(true);
    this.pinError.set(null);
    try {
      // Buscar admins con code_uri y validar el TOTP contra cada uno.
      const url = this.apiUrl.build('rest/v1/employees', {
        select: 'id,work_email,code_uri,position:positions(admin)',
        is_active: 'eq.true',
      });
      const employees = await firstValueFrom(this.http.get<any[]>(url));
      const admins = (employees ?? []).filter((e) =>
        e.position?.admin === true && typeof e.code_uri === 'string' && e.code_uri
      );

      let matchedEmail: string | null = null;
      for (const adm of admins) {
        try {
          const totp = OTPAuth.URI.parse(adm.code_uri);
          const ok = totp.validate({ token: this.pinValue, window: 1 });
          if (ok !== null) { matchedEmail = adm.work_email; break; }
        } catch { /* ignore */ }
      }

      if (!matchedEmail) {
        this.pinError.set('PIN inválido. Verifica el código de 6 dígitos.');
        return;
      }
      this.adminCallerEmail.set(matchedEmail);
      this.step.set('capture');
      // Auto-iniciar cámara
      setTimeout(() => this.startCamera(), 100);
    } catch {
      this.pinError.set('Error al validar el PIN');
    } finally {
      this.validatingPin.set(false);
    }
  }

  public async startCamera(): Promise<void> {
    this.cameraError.set(null);
    this.startingCamera.set(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        this.cameraError.set('Tu navegador no soporta cámara');
        return;
      }
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const v = this.video()?.nativeElement;
      if (v) {
        v.srcObject = this.stream;
        await v.play().catch(() => { /* ignore */ });
      }
      this.streamReady.set(true);
      this.face.loadDetectorOnly().catch(() => { /* ignore */ });
      this.startDetectLoop();
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado.'
        : (e?.message || 'No se pudo iniciar la cámara');
      this.cameraError.set(msg);
    } finally {
      this.startingCamera.set(false);
    }
  }

  public stopCamera(): void {
    if (this.detectHandle) { clearInterval(this.detectHandle); this.detectHandle = null; }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.streamReady.set(false);
    this.faceDetected.set(false);
    this.captureProgress.set(0);
    this.capturing.set(false);
  }

  private startDetectLoop(): void {
    if (this.detectHandle) return;
    this.detectHandle = setInterval(async () => {
      const v = this.video()?.nativeElement;
      if (!v || v.readyState < 2 || this.capturing()) return;
      const d = await this.face.detectBoxOnly(v);
      if (!d) { this.faceDetected.set(false); return; }
      const bbox = Math.min(d.box.width, d.box.height);
      const frameW = v.videoWidth || 1280;
      const cx = d.box.x + d.box.width / 2;
      const centered = Math.abs(cx - frameW / 2) < frameW * 0.3;
      this.faceDetected.set(bbox >= MIN_BBOX_PX && centered);
    }, 300);
  }

  public async startCapture(): Promise<void> {
    if (this.capturing()) return;
    const v = this.video()?.nativeElement;
    if (!v) return;
    this.capturing.set(true);
    try {
      const frames: string[] = [];
      for (let i = 0; i < FRAMES; i++) {
        this.captureProgress.set(i + 1);
        if (i > 0) await new Promise((r) => setTimeout(r, FRAME_INTERVAL_MS));
        const f = this.captureFrame(v);
        if (f) frames.push(f);
      }
      if (frames.length < 3) {
        this.message.add({ severity: 'warn', summary: 'Frames insuficientes', detail: 'Intenta de nuevo con mejor iluminación.', life: 5000 });
        return;
      }
      const callerEmail = this.adminCallerEmail();
      if (!callerEmail) {
        this.message.add({ severity: 'error', summary: 'Sesión inválida', detail: 'Falta autorización del admin.', life: 5000 });
        return;
      }
      const body = {
        caller_email: callerEmail,
        employee_id: this.employeeId(),
        images: frames,
        reference_image: frames[0],
        consent_accepted: true,
      };
      const res: any = await firstValueFrom(this.http.post(
        this.apiUrl.build('functions/v1/face-enroll'),
        body,
      ));
      if (res?.success) {
        this.step.set('done');
        this.stopCamera();
        setTimeout(() => {
          this.finished.emit();
          this.reset();
        }, 1500);
      } else {
        this.message.add({ severity: 'error', summary: 'Error', detail: res?.detail || res?.error || 'No se pudo enrolar.', life: 6000 });
      }
    } catch (e: any) {
      this.message.add({ severity: 'error', summary: 'Error', detail: e?.error?.detail || e?.error?.error || 'Falló el enrollment', life: 6000 });
    } finally {
      this.capturing.set(false);
      this.captureProgress.set(0);
    }
  }

  public cancel(): void {
    this.stopCamera();
    this.cancelled.emit();
    this.reset();
  }

  private reset(): void {
    this.step.set('pin');
    this.pinValue = '';
    this.pinError.set(null);
    this.adminCallerEmail.set(null);
    this.captureProgress.set(0);
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
}
