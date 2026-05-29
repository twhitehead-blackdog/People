import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ApiUrlService } from '../services/api-url.service';
import { FaceRecognitionService } from '../services/face-recognition.service';
import { DashboardStore } from '../stores/dashboard.store';

const FRAMES = 5;
const FRAME_INTERVAL_MS = 600;
const JPEG_MAX_SIDE = 720;
const JPEG_QUALITY = 0.9;
const MIN_BBOX_PX = 160;

/**
 * Pestaña "Rostro" dentro del detalle del empleado.
 *
 * Solo se muestra si el admin global habilitó `use_face = true` para este
 * empleado. Permite a gerentes:
 *   - Ver estado de enrollment (cuántas plantillas, fecha, modelo).
 *   - Enrollar capturando 5 frames consecutivos con detección automática.
 *   - Eliminar enrollment activo.
 *
 * Similar al flujo de "Authenticator / Generar QR" pero para el rostro.
 * Llama a las edge functions `face-enroll` y `face-deactivate`.
 */
@Component({
  selector: 'pt-face-enroll-tab',
  imports: [CommonModule, Button, ToastModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
    <div class="fet-wrap">
      @if (!useFace()) {
        <div class="fet-disabled">
          <i class="pi pi-info-circle text-3xl text-amber-400 mb-3"></i>
          <h3 class="text-lg font-semibold text-white mb-1">Reconocimiento facial deshabilitado</h3>
          <p class="text-sm text-gray-400 max-w-md">
            Este empleado no está habilitado para usar reconocimiento facial.
            Pídele al administrador global que active la opción
            <strong class="text-amber-400">"Usar rostro"</strong> en el perfil del empleado.
          </p>
        </div>
      } @else {
        <!-- Estado actual -->
        <div class="fet-status">
          <div class="fet-status__icon" [class.fet-status__icon--ok]="hasEnrollment()">
            <i class="pi" [class.pi-check-circle]="hasEnrollment()" [class.pi-camera]="!hasEnrollment()"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="fet-status__title">
              {{ hasEnrollment() ? 'Rostro enrolado' : 'Sin rostro enrolado' }}
            </div>
            @if (enrollmentInfo(); as info) {
              <div class="fet-status__sub">
                {{ info.templates }} plantilla{{ info.templates !== 1 ? 's' : '' }}
                · {{ info.model }}
                · enrolado {{ info.created_at | date:'medium' }}
              </div>
            } @else {
              <div class="fet-status__sub">
                El empleado podrá marcar entrada/salida con su rostro después de enrolarlo.
              </div>
            }
          </div>
        </div>

        <!-- Capture area -->
        <div class="fet-capture">
          <div class="fet-video-wrap" [class.fet-video-wrap--active]="streamReady()">
            <video #video autoplay playsinline muted></video>
            @if (!streamReady() && !cameraError()) {
              <div class="fet-video-overlay">
                <i class="pi pi-camera text-4xl text-gray-500"></i>
                <span>Habilita la cámara para enrolar</span>
              </div>
            }
            @if (cameraError(); as err) {
              <div class="fet-video-overlay fet-video-overlay--err">
                <i class="pi pi-exclamation-triangle text-3xl text-red-400"></i>
                <span>{{ err }}</span>
              </div>
            }
            @if (streamReady()) {
              <div class="fet-oval" [class.fet-oval--ok]="faceDetected()"></div>
            }
            @if (capturing() && captureProgress() > 0) {
              <div class="fet-progress">
                <div class="fet-progress__num">{{ captureProgress() }}/{{ FRAMES }}</div>
                <div class="fet-progress__bar">
                  <div class="fet-progress__fill" [style.width.%]="(captureProgress() / FRAMES) * 100"></div>
                </div>
              </div>
            }
          </div>

          <div class="fet-actions">
            @if (!streamReady()) {
              <p-button
                label="Habilitar cámara"
                icon="pi pi-camera"
                severity="success"
                [loading]="startingCamera()"
                (onClick)="startCamera()"
              />
            } @else if (!capturing()) {
              <p-button
                [label]="hasEnrollment() ? 'Re-enrolar rostro' : 'Capturar y enrolar'"
                icon="pi pi-camera"
                [severity]="hasEnrollment() ? 'warn' : 'success'"
                [disabled]="!faceDetected()"
                (onClick)="startCapture()"
              />
              <p-button
                label="Cancelar"
                icon="pi pi-times"
                severity="secondary"
                [text]="true"
                (onClick)="stopCamera()"
              />
            } @else {
              <p-button
                label="Capturando..."
                icon="pi pi-spin pi-spinner"
                [disabled]="true"
              />
            }

            @if (hasEnrollment() && !capturing()) {
              <p-button
                label="Eliminar rostro"
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                [loading]="deleting()"
                (onClick)="deleteEnrollment()"
              />
            }
          </div>

          <!-- Hint -->
          @if (streamReady() && !capturing()) {
            <div class="fet-hint">
              @if (!faceDetected()) {
                <i class="pi pi-info-circle"></i>
                Coloca tu rostro dentro del óvalo, bien iluminado y mirando de frente.
              } @else {
                <i class="pi pi-check-circle text-green-400"></i>
                Rostro detectado. Click en "Capturar y enrolar" para tomar {{ FRAMES }} fotos.
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .fet-wrap { padding: 1.5rem; max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
    .fet-disabled { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3rem 1.5rem; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px; }

    .fet-status { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; }
    .fet-status__icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); color: #9ca3af; flex-shrink: 0; }
    .fet-status__icon i { font-size: 22px; }
    .fet-status__icon--ok { background: rgba(34,197,94,0.14); color: #22c55e; }
    .fet-status__title { font-size: 0.95rem; font-weight: 600; color: #f3f4f6; }
    .fet-status__sub { font-size: 0.8rem; color: #9ca3af; margin-top: 2px; }

    .fet-capture { display: flex; flex-direction: column; gap: 1rem; align-items: center; }
    .fet-video-wrap { position: relative; width: 100%; max-width: 480px; aspect-ratio: 4/3; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .fet-video-wrap video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: block; }
    .fet-video-wrap--active video { background: #000; }

    .fet-video-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; color: #6b7280; font-size: 0.85rem; padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.4); }
    .fet-video-overlay--err { color: #fca5a5; }

    .fet-oval { position: absolute; inset: 0; margin: auto; width: 55%; height: 70%; border-radius: 50%; border: 3px solid rgba(255,255,255,0.30); box-shadow: 0 0 0 9999px rgba(0,0,0,0.30); pointer-events: none; transition: border-color .2s, box-shadow .2s; }
    .fet-oval--ok { border-color: rgba(34,197,94,0.85); box-shadow: 0 0 0 9999px rgba(0,0,0,0.30), 0 0 30px rgba(34,197,94,0.4); }

    .fet-progress { position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); width: 80%; background: rgba(0,0,0,0.7); padding: 0.6rem 0.85rem; border-radius: 10px; display: flex; flex-direction: column; gap: 0.4rem; }
    .fet-progress__num { font-size: 0.8rem; color: #fbbf24; font-weight: 600; text-align: center; }
    .fet-progress__bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
    .fet-progress__fill { height: 100%; background: linear-gradient(90deg, #fbbf24, #f59e0b); transition: width 0.2s ease; }

    .fet-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; }
    .fet-hint { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 999px; font-size: 0.85rem; color: #9ca3af; }
    .fet-hint i { font-size: 0.9rem; }
  `],
  providers: [MessageService],
})
export class FaceEnrollTabComponent implements OnDestroy {
  public readonly FRAMES = FRAMES;

  public employeeId = input.required<string>();
  public useFace = input.required<boolean>();

  public video = viewChild<ElementRef<HTMLVideoElement>>('video');

  public streamReady = signal(false);
  public startingCamera = signal(false);
  public capturing = signal(false);
  public deleting = signal(false);
  public cameraError = signal<string | null>(null);
  public faceDetected = signal(false);
  public captureProgress = signal(0);

  public enrollmentInfo = signal<{ templates: number; model: string; created_at: string } | null>(null);
  public hasEnrollment = computed(() => this.enrollmentInfo() !== null);

  private stream: MediaStream | null = null;
  private detectHandle: any = null;

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private face = inject(FaceRecognitionService);
  private store = inject(DashboardStore);
  private message = inject(MessageService);

  constructor() {
    // Cargar estado actual al montar
    queueMicrotask(() => this.loadEnrollmentStatus());
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  private async loadEnrollmentStatus(): Promise<void> {
    try {
      // Usa RPC pública para no exponer face_enrollments.descriptor.
      // RLS de la tabla bloquea SELECT directo desde el cliente.
      const url = this.apiUrl.build('rest/v1/rpc/face_enrollment_status');
      const rows = await firstValueFrom(
        this.http.post<any[]>(url, { p_employee_id: this.employeeId() })
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        this.enrollmentInfo.set({
          templates: row.templates_count ?? 0,
          model: row.model,
          created_at: row.created_at,
        });
      } else {
        this.enrollmentInfo.set(null);
      }
    } catch {
      this.enrollmentInfo.set(null);
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
        ? 'Permiso de cámara denegado. Habilítalo en el navegador.'
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
        this.message.add({ severity: 'warn', summary: 'Frames insuficientes', detail: 'No se capturaron suficientes frames con rostro detectable.', life: 5000 });
        return;
      }

      // Reference image = primer frame (para mostrar en avatar luego)
      const callerEmail = this.store.currentEmployee()?.work_email;
      if (!callerEmail) {
        this.message.add({ severity: 'error', summary: 'Sesión inválida', detail: 'No se pudo obtener tu email para enrolar.', life: 5000 });
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
        this.message.add({
          severity: 'success',
          summary: '✓ Rostro enrolado',
          detail: `${res.templates_uploaded} plantilla(s) guardadas. El empleado ya puede marcar con cara.`,
          life: 5000,
        });
        this.stopCamera();
        await this.loadEnrollmentStatus();
      } else {
        this.message.add({
          severity: 'error',
          summary: 'Error al enrolar',
          detail: res?.detail || res?.error || 'No se pudo guardar el rostro.',
          life: 6000,
        });
      }
    } catch (e: any) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: e?.error?.detail || e?.error?.error || e?.message || 'Falló el enrollment',
        life: 6000,
      });
    } finally {
      this.capturing.set(false);
      this.captureProgress.set(0);
    }
  }

  public async deleteEnrollment(): Promise<void> {
    if (!confirm('¿Eliminar el rostro enrolado de este empleado? Ya no podrá marcar con cara hasta que se enrole de nuevo.')) return;
    this.deleting.set(true);
    try {
      const callerEmail = this.store.currentEmployee()?.work_email;
      const res: any = await firstValueFrom(this.http.post(
        this.apiUrl.build('functions/v1/face-deactivate'),
        { caller_email: callerEmail, employee_id: this.employeeId() },
      ));
      if (res?.success) {
        this.message.add({ severity: 'success', summary: 'Rostro eliminado', detail: 'El empleado ya no podrá marcar con cara.', life: 4000 });
        await this.loadEnrollmentStatus();
      } else {
        this.message.add({ severity: 'error', summary: 'Error', detail: res?.error || 'No se pudo eliminar', life: 5000 });
      }
    } catch (e: any) {
      this.message.add({ severity: 'error', summary: 'Error', detail: e?.message || 'Falló la eliminación', life: 5000 });
    } finally {
      this.deleting.set(false);
    }
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
