import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputOtp } from 'primeng/inputotp';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../../services/api-url.service';
import { QrService } from '../../services/qr.service';

interface EmployeeLite {
  id: string;
  first_name: string;
  father_name?: string;
  code_uri?: string | null;
  branch_id?: string | null;
}

interface ManagerCandidate {
  id: string;
  first_name: string;
  father_name?: string;
  code_uri?: string | null;
  position_id?: string | null;
  position?: { name: string } | null;
}

const APP_STORE_URL = 'https://apps.apple.com/es/app/google-authenticator/id388497605';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2';

@Component({
  selector: 'pt-authenticator-enrollment',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, Button, InputOtp, ToastModule],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host ::ng-deep .enroll-dialog .p-dialog-content { padding: 0; background: #0a0a0a; }
    :host ::ng-deep .enroll-dialog .p-dialog-header { background: #0a0a0a; border-bottom: 1px solid #262626; padding: 1rem 1.25rem; }
    :host ::ng-deep .enroll-dialog .p-dialog-title { font-size: 0.95rem; font-weight: 700; }

    /* Stepper */
    .stepper-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.85rem 1.25rem;
      background: linear-gradient(180deg, #0a0a0a 0%, #111 100%);
      border-bottom: 1px solid #262626;
      position: relative;
    }
    .stepper-head::after {
      content: ''; position: absolute; left: 2.25rem; right: 2.25rem; top: 50%;
      height: 2px; background: #262626; z-index: 0;
    }
    .step-pill {
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      font-size: 0.65rem; color: #737373; position: relative; z-index: 1;
      background: #0a0a0a; padding: 0 0.35rem;
      transition: color 0.2s;
    }
    .step-pill.active { color: #f59e0b; }
    .step-pill.done { color: #22c55e; }
    .step-num {
      width: 1.8rem; height: 1.8rem; border-radius: 50%;
      background: #262626; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.8rem; color: #737373;
      border: 2px solid #262626;
      transition: all 0.2s;
    }
    .step-pill.active .step-num {
      background: #f59e0b; color: #000; border-color: #f59e0b;
      box-shadow: 0 0 0 4px rgba(245,158,11,0.15);
    }
    .step-pill.done .step-num { background: #22c55e; color: #000; border-color: #22c55e; }
    .step-label { font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; }

    /* Body */
    .stepper-body {
      padding: 1.5rem 1.5rem 1.25rem;
      min-height: 360px;
      background: #0a0a0a;
    }
    .step-title {
      font-size: 1.15rem; font-weight: 700; color: white; margin: 0 0 0.35rem;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .step-title i { color: #f59e0b; font-size: 1rem; }
    .step-sub {
      font-size: 0.82rem; color: #a3a3a3; margin: 0 0 1.25rem; line-height: 1.45;
    }
    .step-sub strong { color: #f59e0b; font-weight: 700; }

    /* QR grid for download apps */
    .qr-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
      align-items: stretch;
    }
    @media (max-width: 600px) {
      .qr-grid { grid-template-columns: 1fr; gap: 0.75rem; }
    }
    .qr-card {
      background: linear-gradient(180deg, #171717 0%, #111 100%);
      border: 1px solid #262626; border-radius: 0.85rem;
      padding: 1rem 0.85rem;
      text-align: center;
      display: flex; flex-direction: column; align-items: center;
      transition: transform 0.15s, border-color 0.15s;
    }
    .qr-card:hover { border-color: #404040; transform: translateY(-2px); }
    .qr-frame {
      width: 160px; height: 160px;
      background: #ffffff;
      border-radius: 0.65rem;
      padding: 0.6rem;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    }
    .qr-frame img { width: 100%; height: 100%; display: block; }
    .qr-card-title {
      font-weight: 700; margin-top: 0.85rem; font-size: 0.85rem; color: #fff;
      display: flex; align-items: center; gap: 0.35rem;
    }
    .qr-card-sub { font-size: 0.68rem; color: #737373; margin-top: 0.15rem; letter-spacing: 0.02em; }

    /* Single QR (employee) */
    .single-qr {
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
    }
    .single-qr .qr-frame { width: 240px; height: 240px; padding: 0.85rem; }
    .single-qr-hint {
      font-size: 0.75rem; color: #a3a3a3; text-align: center; max-width: 320px;
      line-height: 1.5;
    }

    /* OTP */
    .otp-row { display: flex; justify-content: center; margin: 1.5rem 0 0.5rem; }
    :host ::ng-deep .otp-row .p-inputotp { gap: 0.4rem; }
    :host ::ng-deep .otp-row .p-inputotp-input {
      width: 2.6rem !important; height: 3.1rem !important; font-size: 1.4rem !important;
      font-weight: 700 !important;
      background: #171717 !important; border: 1.5px solid #404040 !important;
      color: #f59e0b !important;
      border-radius: 0.5rem !important;
    }
    :host ::ng-deep .otp-row .p-inputotp-input:focus {
      border-color: #f59e0b !important;
      box-shadow: 0 0 0 3px rgba(245,158,11,0.15) !important;
    }

    /* Footer */
    .stepper-foot {
      display: flex; gap: 0.5rem; justify-content: space-between; align-items: center;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid #262626;
      background: #0a0a0a;
    }

    /* Manager list */
    .manager-select {
      display: flex; flex-direction: column; gap: 0.5rem;
      max-height: 230px; overflow-y: auto;
      padding-right: 0.25rem;
    }
    .manager-select::-webkit-scrollbar { width: 6px; }
    .manager-select::-webkit-scrollbar-thumb { background: #404040; border-radius: 3px; }
    .manager-row {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.65rem 0.85rem;
      border: 1.5px solid #262626; border-radius: 0.65rem;
      cursor: pointer; background: #131313;
      transition: all 0.15s;
    }
    .manager-row:hover { background: #1a1a1a; border-color: #404040; }
    .manager-row.sel {
      border-color: #f59e0b;
      background: rgba(245,158,11,0.08);
      box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
    }
    .manager-avatar {
      width: 2.25rem; height: 2.25rem; border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b, #d97706); color: #000;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 0.8rem;
      flex-shrink: 0;
    }
    .manager-name { font-weight: 600; color: white; font-size: 0.88rem; line-height: 1.2; }
    .manager-position { font-size: 0.7rem; color: #a3a3a3; margin-top: 0.1rem; }
    .empty-msg {
      color: #a3a3a3; font-size: 0.85rem; text-align: center; padding: 2.5rem 1rem;
    }
    .empty-msg i { font-size: 1.5rem; color: #f59e0b; margin-bottom: 0.5rem; display: block; }

    /* Done step */
    .done-wrap {
      text-align: center;
      padding: 1.5rem 1rem;
    }
    .ok-icon {
      width: 4.5rem; height: 4.5rem; border-radius: 50%;
      background: linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.1));
      border: 2px solid #22c55e;
      display: flex; align-items: center; justify-content: center;
      font-size: 2.25rem; color: #22c55e;
      margin: 0 auto 1.25rem;
      box-shadow: 0 0 0 6px rgba(34,197,94,0.08), 0 4px 20px rgba(34,197,94,0.25);
    }
  `],
  template: `
    <p-toast />
    <p-dialog
      [(visible)]="dialogVisible"
      [modal]="true"
      [closable]="!loading()"
      [draggable]="false"
      [style]="{ width: '36rem' }"
      [breakpoints]="{ '768px': '95vw' }"
      styleClass="enroll-dialog"
      [header]="'Configurar Authenticator — ' + employeeFullName()"
      (onHide)="onHide()"
    >
      <div class="stepper-head">
        <div class="step-pill" [class.active]="step() === 0" [class.done]="step() > 0">
          <span class="step-num">{{ step() > 0 ? '✓' : '1' }}</span>
          <span class="step-label">Gerente</span>
        </div>
        <div class="step-pill" [class.active]="step() === 1" [class.done]="step() > 1">
          <span class="step-num">{{ step() > 1 ? '✓' : '2' }}</span>
          <span class="step-label">App</span>
        </div>
        <div class="step-pill" [class.active]="step() === 2" [class.done]="step() > 2">
          <span class="step-num">{{ step() > 2 ? '✓' : '3' }}</span>
          <span class="step-label">Escanear</span>
        </div>
        <div class="step-pill" [class.active]="step() === 3" [class.done]="step() > 3">
          <span class="step-num">{{ step() > 3 ? '✓' : '4' }}</span>
          <span class="step-label">Verificar</span>
        </div>
        <div class="step-pill" [class.active]="step() === 4" [class.done]="step() === 4">
          <span class="step-num">{{ step() === 4 ? '✓' : '5' }}</span>
          <span class="step-label">Listo</span>
        </div>
      </div>

      <div class="stepper-body">
        @switch (step()) {
          @case (0) {
            <div class="step-title"><i class="pi pi-user-edit"></i> Autorización del gerente</div>
            <div class="step-sub">Selecciona tu nombre e ingresa tu código de Authenticator para autorizar el roll-in.</div>
            @if (managersLoading()) {
              <div class="empty-msg"><i class="pi pi-spin pi-spinner"></i>Buscando gerentes…</div>
            } @else if (managers().length === 0) {
              <div class="empty-msg"><i class="pi pi-info-circle"></i>No se encontró ningún gerente con Authenticator configurado.</div>
            } @else {
              <div class="manager-select">
                @for (m of managers(); track m.id) {
                  <div class="manager-row" [class.sel]="selectedManagerId() === m.id" (click)="selectedManagerId.set(m.id)">
                    <div class="manager-avatar">{{ initials(m) }}</div>
                    <div style="flex:1">
                      <div class="manager-name">{{ m.first_name }} {{ m.father_name }}</div>
                      <div class="manager-position">{{ m.position?.name || 'Gerente' }}</div>
                    </div>
                    @if (selectedManagerId() === m.id) { <i class="pi pi-check-circle" style="color:#f59e0b"></i> }
                  </div>
                }
              </div>
              @if (selectedManagerId()) {
                <div class="otp-row">
                  <p-inputOtp [(ngModel)]="managerOtp" [length]="6" [integerOnly]="true" />
                </div>
              }
            }
          }
          @case (1) {
            <div class="step-title"><i class="pi pi-mobile"></i> Descarga Google Authenticator</div>
            <div class="step-sub">Escanea el QR correspondiente a tu dispositivo o busca "Google Authenticator" en la tienda.</div>
            <div class="qr-grid">
              <div class="qr-card">
                <div class="qr-frame">
                  @if (appStoreQr()) { <img [src]="appStoreQr()" alt="App Store" /> }
                </div>
                <div class="qr-card-title"><i class="pi pi-apple"></i> iOS · App Store</div>
                <div class="qr-card-sub">iPhone / iPad</div>
              </div>
              <div class="qr-card">
                <div class="qr-frame">
                  @if (playStoreQr()) { <img [src]="playStoreQr()" alt="Play Store" /> }
                </div>
                <div class="qr-card-title"><i class="pi pi-android"></i> Android · Play Store</div>
                <div class="qr-card-sub">Android</div>
              </div>
            </div>
          }
          @case (2) {
            <div class="step-title"><i class="pi pi-qrcode"></i> Escanea tu código personal</div>
            <div class="step-sub">Abre Google Authenticator → toca <strong>+</strong> → "Escanear un código QR" → apúntalo al QR de abajo.</div>
            <div class="single-qr">
              <div class="qr-frame">
                @if (employeeQr()) {
                  <img [src]="employeeQr()" alt="QR del empleado" />
                } @else {
                  <i class="pi pi-spin pi-spinner" style="font-size:2rem;color:#f59e0b"></i>
                }
              </div>
              <div class="single-qr-hint">
                Cuando lo agregues, verás un código de <strong>6 dígitos</strong> que cambia cada 30 segundos.
              </div>
            </div>
          }
          @case (3) {
            <div class="step-title"><i class="pi pi-shield"></i> Verifica el código</div>
            <div class="step-sub">Ingresa el código de 6 dígitos que aparece en Authenticator para <strong>{{ employeeFullName() }}</strong>.</div>
            <div class="otp-row">
              <p-inputOtp [(ngModel)]="employeeOtp" [length]="6" [integerOnly]="true" />
            </div>
          }
          @case (4) {
            <div class="done-wrap">
              <div class="ok-icon"><i class="pi pi-check"></i></div>
              <div class="step-title" style="justify-content:center">¡Listo!</div>
              <div class="step-sub" style="margin-top: 0.35rem">
                <strong>{{ employeeFullName() }}</strong> ya tiene Authenticator configurado.<br>
                Desde ahora puede marcar entrada/salida con el código de 6 dígitos.
              </div>
            </div>
          }
        }
      </div>

      <div class="stepper-foot">
        @if (step() > 0 && step() < 4) {
          <p-button label="Atrás" icon="pi pi-arrow-left" [text]="true" (onClick)="back()" [disabled]="loading()" />
        } @else { <div></div> }

        @if (step() < 4) {
          <p-button
            [label]="nextLabel()"
            [icon]="loading() ? 'pi pi-spin pi-spinner' : 'pi pi-arrow-right'"
            iconPos="right"
            [disabled]="!canAdvance() || loading()"
            (onClick)="next()"
          />
        } @else {
          <p-button label="Finalizar" icon="pi pi-check" severity="success" (onClick)="dialogVisible.set(false); finished.emit()" />
        }
      </div>
    </p-dialog>
  `,
})
export class AuthenticatorEnrollmentComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private qrService = inject(QrService);
  private message = inject(MessageService);

  public employee = input.required<EmployeeLite>();
  public visible = input<boolean>(false);
  public finished = output<void>();
  public cancelled = output<void>();

  public dialogVisible = signal(false);
  public step = signal(0);
  public loading = signal(false);

  public managers = signal<ManagerCandidate[]>([]);
  public managersLoading = signal(false);
  public selectedManagerId = signal<string | null>(null);
  public managerOtp = signal('');

  public appStoreQr = signal<string | null>(null);
  public playStoreQr = signal<string | null>(null);
  public employeeQr = signal<string | null>(null);

  public employeeOtp = signal('');

  public employeeFullName = computed(() => {
    const e = this.employee();
    return `${e.first_name ?? ''} ${e.father_name ?? ''}`.trim();
  });

  public nextLabel = computed(() =>
    this.step() === 3 ? 'Verificar' : this.step() === 0 ? 'Autorizar' : 'Continuar',
  );

  public canAdvance = computed(() => {
    switch (this.step()) {
      case 0: return !!this.selectedManagerId() && this.managerOtp().length === 6;
      case 1: return true;
      case 2: return !!this.employeeQr();
      case 3: return this.employeeOtp().length === 6;
      default: return false;
    }
  });

  constructor() {
    effect(() => {
      const v = this.visible();
      this.dialogVisible.set(v);
      if (v) {
        this.reset();
        this.loadManagers();
        this.preloadAppStoreQrs();
      }
    });
  }

  public initials(m: ManagerCandidate) {
    return `${(m.first_name || '?')[0]}${(m.father_name || '')[0] || ''}`.toUpperCase();
  }

  public onHide() {
    if (this.step() < 4) this.cancelled.emit();
  }

  public reset() {
    this.step.set(0);
    this.selectedManagerId.set(null);
    this.managerOtp.set('');
    this.employeeOtp.set('');
    this.employeeQr.set(null);
  }

  public async loadManagers() {
    this.managersLoading.set(true);
    try {
      const params: Record<string, string> = {
        select: 'id,first_name,father_name,code_uri,position_id,branch_id,is_active,position:positions!employees_position_id_fkey(id,name)',
        is_active: 'eq.true',
        code_uri: 'not.is.null',
      };
      const all = await firstValueFrom(
        this.http.get<ManagerCandidate[]>(this.apiUrl.build('rest/v1/employees', params)),
      );
      // Cualquier gerente/admin/ceo/jefe + Verley + Tristan (soporte IT)
      const allowedPattern = /(gerente|administrador|ceo|jefe|sub.?gerente)/i;
      const alwaysAllowed = new Set<string>([
        '3b8bac73-5ae3-48e8-ab9f-ee28e3ab3d8d', // Verley Adams
        '43cd8574-3c4b-40c2-9824-5f9a4fe68dc8', // Tristan Whitehead
      ]);
      const filtered = (all || []).filter((m) =>
        alwaysAllowed.has(m.id) || allowedPattern.test(m.position?.name || ''),
      );
      this.managers.set(filtered);
    } catch (e) {
      this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los gerentes' });
    } finally {
      this.managersLoading.set(false);
    }
  }

  public async preloadAppStoreQrs() {
    try {
      const [apple, play] = await Promise.all([
        QRCode.toDataURL(APP_STORE_URL, { margin: 1, width: 320, errorCorrectionLevel: 'M' }),
        QRCode.toDataURL(PLAY_STORE_URL, { margin: 1, width: 320, errorCorrectionLevel: 'M' }),
      ]);
      this.appStoreQr.set(apple);
      this.playStoreQr.set(play);
    } catch {/* ignore */}
  }

  public back() {
    if (this.step() > 0) this.step.update((s) => s - 1);
  }

  public async next() {
    const s = this.step();
    if (s === 0) await this.validateManagerOtp();
    else if (s === 1) this.advanceToScanStep();
    else if (s === 2) this.step.set(3);
    else if (s === 3) await this.finalize();
  }

  private async validateManagerOtp() {
    const m = this.managers().find((x) => x.id === this.selectedManagerId());
    if (!m?.code_uri) {
      this.message.add({ severity: 'error', summary: 'Error', detail: 'El gerente seleccionado no tiene Authenticator' });
      return;
    }
    try {
      const totp = OTPAuth.URI.parse(m.code_uri);
      const ok = totp.validate({ token: this.managerOtp(), window: 1 });
      if (ok === null) {
        this.message.add({ severity: 'error', summary: 'Código inválido', detail: 'El código del gerente no coincide' });
        this.managerOtp.set('');
        return;
      }
      this.step.set(1);
    } catch {
      this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo validar el código' });
    }
  }

  private async advanceToScanStep() {
    this.loading.set(true);
    try {
      const e = this.employee();
      let uri = e.code_uri;
      if (!uri) {
        const r = await this.qrService.generateQrCodeAsync(e as any);
        uri = r.code_uri;
        this.employeeQr.set(r.qr_code);
      } else {
        const qr = await QRCode.toDataURL(uri, { margin: 1, width: 480, errorCorrectionLevel: 'M' });
        this.employeeQr.set(qr);
      }
      this.step.set(2);
    } catch {
      this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el QR del empleado' });
    } finally {
      this.loading.set(false);
    }
  }

  private async finalize() {
    const e = this.employee();
    if (!e.code_uri) {
      this.message.add({ severity: 'error', summary: 'Error', detail: 'Falta el code_uri del empleado' });
      return;
    }
    this.loading.set(true);
    try {
      const totp = OTPAuth.URI.parse(e.code_uri);
      const ok = totp.validate({ token: this.employeeOtp(), window: 1 });
      if (ok === null) {
        this.message.add({ severity: 'error', summary: 'Código inválido', detail: 'El código no coincide. Espera 30 seg y prueba el nuevo.' });
        this.employeeOtp.set('');
        return;
      }
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/employees', { id: `eq.${e.id}` }),
          {
            authenticator_enrolled: true,
            authenticator_enrolled_at: new Date().toISOString(),
            authenticator_enrolled_by: this.selectedManagerId(),
          },
          { headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' } },
        ),
      );
      this.message.add({ severity: 'success', summary: 'Listo', detail: 'Authenticator configurado correctamente' });
      this.step.set(4);
    } catch {
      this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el estado' });
    } finally {
      this.loading.set(false);
    }
  }
}
