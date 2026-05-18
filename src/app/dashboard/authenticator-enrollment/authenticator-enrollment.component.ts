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
    :host ::ng-deep .enroll-dialog .p-dialog-content { padding: 0; }
    .stepper-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.85rem 1.25rem; border-bottom: 1px solid #262626;
      background: #0a0a0a;
    }
    .step-pill {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.75rem; color: #737373;
    }
    .step-pill.active { color: #f59e0b; }
    .step-pill.done { color: #22c55e; }
    .step-num {
      width: 1.5rem; height: 1.5rem; border-radius: 50%;
      background: #262626; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.7rem;
    }
    .step-pill.active .step-num { background: #f59e0b; color: #000; }
    .step-pill.done .step-num { background: #22c55e; color: #000; }
    .stepper-body { padding: 1.5rem 1.25rem; min-height: 320px; }
    .step-title { font-size: 1.1rem; font-weight: 700; color: white; margin-bottom: 0.25rem; }
    .step-sub { font-size: 0.8rem; color: #a3a3a3; margin-bottom: 1.25rem; }
    .qr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 600px) { .qr-grid { grid-template-columns: 1fr; } }
    .qr-card {
      background: #171717; border: 1px solid #262626; border-radius: 0.75rem;
      padding: 1rem; text-align: center;
    }
    .qr-card img { width: 100%; max-width: 180px; border-radius: 0.5rem; background: white; padding: 0.5rem; }
    .qr-card-title { font-weight: 700; margin-top: 0.6rem; font-size: 0.9rem; }
    .qr-card-sub { font-size: 0.7rem; color: #a3a3a3; margin-top: 0.15rem; }
    .single-qr { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
    .single-qr img { width: 220px; height: 220px; background: white; padding: 0.75rem; border-radius: 0.75rem; }
    .otp-row { display: flex; justify-content: center; margin: 1rem 0; }
    :host ::ng-deep .otp-row .p-inputotp-input {
      width: 2.5rem !important; height: 3rem !important; font-size: 1.5rem !important;
    }
    .stepper-foot {
      display: flex; gap: 0.5rem; justify-content: space-between;
      padding: 0.85rem 1.25rem; border-top: 1px solid #262626; background: #0a0a0a;
    }
    .manager-select { display: flex; flex-direction: column; gap: 0.6rem; max-height: 220px; overflow-y: auto; }
    .manager-row {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.85rem;
      border: 1px solid #262626; border-radius: 0.6rem; cursor: pointer; background: #171717;
    }
    .manager-row.sel { border-color: #f59e0b; background: rgba(245,158,11,0.08); }
    .manager-avatar {
      width: 2rem; height: 2rem; border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b, #d97706); color: #000;
      display: flex; align-items: center; justify-content: center; font-weight: 700;
    }
    .manager-name { font-weight: 600; color: white; font-size: 0.85rem; }
    .manager-position { font-size: 0.7rem; color: #a3a3a3; }
    .empty-msg { color: #a3a3a3; font-size: 0.85rem; text-align: center; padding: 2rem; }
    .ok-icon {
      width: 4rem; height: 4rem; border-radius: 50%;
      background: rgba(34,197,94,0.15); border: 2px solid #22c55e;
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem; color: #22c55e; margin: 0 auto 1rem;
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
          <span class="step-num">1</span><span>Gerente</span>
        </div>
        <div class="step-pill" [class.active]="step() === 1" [class.done]="step() > 1">
          <span class="step-num">2</span><span>App</span>
        </div>
        <div class="step-pill" [class.active]="step() === 2" [class.done]="step() > 2">
          <span class="step-num">3</span><span>Escanear</span>
        </div>
        <div class="step-pill" [class.active]="step() === 3" [class.done]="step() > 3">
          <span class="step-num">4</span><span>Verificar</span>
        </div>
        <div class="step-pill" [class.active]="step() === 4">
          <span class="step-num">5</span><span>Listo</span>
        </div>
      </div>

      <div class="stepper-body">
        @switch (step()) {
          @case (0) {
            <div class="step-title">Autorización del gerente</div>
            <div class="step-sub">Selecciona tu nombre e ingresa tu código de Authenticator para autorizar el roll-in.</div>
            @if (managersLoading()) {
              <div class="empty-msg"><i class="pi pi-spin pi-spinner"></i> Buscando gerentes…</div>
            } @else if (managers().length === 0) {
              <div class="empty-msg">No se encontró ningún gerente con Authenticator configurado en esta sucursal.</div>
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
            <div class="step-title">Descarga Google Authenticator</div>
            <div class="step-sub">Escanea el QR correspondiente a tu dispositivo o busca "Google Authenticator" en la tienda.</div>
            <div class="qr-grid">
              <div class="qr-card">
                @if (appStoreQr()) { <img [src]="appStoreQr()" alt="App Store" /> }
                <div class="qr-card-title"><i class="pi pi-apple"></i> iOS — App Store</div>
                <div class="qr-card-sub">Para iPhone / iPad</div>
              </div>
              <div class="qr-card">
                @if (playStoreQr()) { <img [src]="playStoreQr()" alt="Play Store" /> }
                <div class="qr-card-title"><i class="pi pi-android"></i> Android — Play Store</div>
                <div class="qr-card-sub">Para Android</div>
              </div>
            </div>
          }
          @case (2) {
            <div class="step-title">Escanea tu código personal</div>
            <div class="step-sub">Abre Google Authenticator → "+" → "Escanear un código QR" → apúntalo al QR de abajo.</div>
            <div class="single-qr">
              @if (employeeQr()) {
                <img [src]="employeeQr()" alt="QR del empleado" />
              } @else {
                <i class="pi pi-spin pi-spinner" style="font-size:2rem;color:#f59e0b"></i>
              }
              <div class="step-sub" style="margin:0">Cuando lo agregues, verás un código de 6 dígitos que cambia cada 30 segundos.</div>
            </div>
          }
          @case (3) {
            <div class="step-title">Verifica el código</div>
            <div class="step-sub">Ingresa el código de 6 dígitos que aparece en Authenticator para <strong>{{ employeeFullName() }}</strong>.</div>
            <div class="otp-row">
              <p-inputOtp [(ngModel)]="employeeOtp" [length]="6" [integerOnly]="true" />
            </div>
          }
          @case (4) {
            <div style="text-align:center; padding-top: 1.5rem">
              <div class="ok-icon"><i class="pi pi-check"></i></div>
              <div class="step-title">¡Listo!</div>
              <div class="step-sub">
                {{ employeeFullName() }} ya tiene Authenticator configurado.
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
      const branchId = this.employee().branch_id;
      const params: Record<string, string> = {
        select: 'id,first_name,father_name,code_uri,position_id,branch_id,is_active,position:positions!employees_position_id_fkey(id,name)',
        is_active: 'eq.true',
        code_uri: 'not.is.null',
      };
      const all = await firstValueFrom(
        this.http.get<ManagerCandidate[]>(this.apiUrl.build('rest/v1/employees', params)),
      );
      const allowedPattern = /(gerente|administrador|ceo|jefe)/i;
      let filtered = (all || []).filter((m) => allowedPattern.test(m.position?.name || ''));
      if (branchId) {
        const sameBranch = filtered.filter((m: any) => m.branch_id === branchId);
        filtered = sameBranch.length > 0 ? sameBranch : filtered;
      }
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
        QRCode.toDataURL(APP_STORE_URL, { margin: 1, width: 220 }),
        QRCode.toDataURL(PLAY_STORE_URL, { margin: 1, width: 220 }),
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
        const qr = await QRCode.toDataURL(uri, { margin: 1, width: 260 });
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
