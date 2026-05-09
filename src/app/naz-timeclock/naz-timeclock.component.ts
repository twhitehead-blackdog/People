import { NgClass } from '@angular/common';
import { HttpClient, httpResource, HttpResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { differenceInMinutes, format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as OTPAuth from 'otpauth';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DpInstallHelpModalComponent } from '../shared/components/dp-install-help-modal.component';
import { InputOtp } from 'primeng/inputotp';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { catchError, EMPTY, forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Branch,
  Company,
  Employee,
  TimeLog,
  TimelogType,
} from '../models';
import { TrimPipe } from '../pipes/trim.pipe';
import { IpMonitorService } from '../services/ip-monitor.service';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { TimeclockPhrasesService } from '../services/timeclock-phrases.service';
import { WebAuthnService } from '../services/webauthn.service';
import { DpFingerprintService } from '../services/dp-fingerprint.service';
import { firstValueFrom } from 'rxjs';
import {
  initAudioContext,
  playFailureSound,
  playLateSound,
  playSuccessSound,
  playBirthdaySound,
} from '../timeclock/timeclock-audio.utils';

interface TimeclockInfoData {
  entryTime: string | null;
  lunchStartTime: string | null;
  lunchEndTime: string | null;
  isInLunch: boolean;
  lunchMinutesRemaining: number | null;
  lunchMinutesUsed: number | null;
  lunchAllowedMinutes: number;
  scheduledExitTime: string | null;
  minutesToExit: number | null;
  branchMismatch: boolean;
  employeeName: string;
  branchAssigned: string;
  branchSelected: string;
}

@Component({
  selector: 'pt-naz-timeclock',
  imports: [
    InputOtp,
    Select,
    Button,
    ReactiveFormsModule,
    Toast,
    Card,
    ConfirmDialogModule,
    TrimPipe,
    NgClass,
    DpInstallHelpModalComponent,
  ],
  providers: [ConfirmationService],
  template: `<p-confirmDialog key="confirm2">
      <ng-template #message let-message>
        <div
          class="flex flex-col items-center w-full gap-4 dark:border-surface-700"
        >
          <i [ngClass]="message.icon" class="!text-6xl text-orange-500"></i>
          <div [innerHTML]="message.message"></div>
        </div>
      </ng-template>
    </p-confirmDialog>
    <p-toast />

    <!-- Custom Success Confirmation Modal -->
    @if (confirmModalVisible()) {
      <div class="confirm-modal-overlay" (click)="dismissConfirmModal()">
        <div class="confirm-modal-card"
          [class.confirm-modal-exit]="confirmModalExiting()"
          [class.is-late]="confirmModalData()?.isLate"
          [class.is-birthday]="confirmModalData()?.isBirthday">

          <!-- Birthday confetti particles -->
          @if (confirmModalData()?.isBirthday) {
            <div class="confetti-container">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]; track i) {
                <div class="confetti-piece" [style.--i]="i"></div>
              }
            </div>
          }

          <!-- Icon -->
          <div class="confirm-modal-icon-wrap">
            @if (confirmModalData()?.isBirthday) {
              <div class="confirm-modal-icon confirm-modal-icon--birthday">
                <span class="birthday-icon-emoji">🎂</span>
              </div>
            } @else if (confirmModalData()?.isLate) {
              <div class="confirm-modal-icon confirm-modal-icon--late">
                <i class="pi pi-clock"></i>
              </div>
            } @else {
              <div class="confirm-modal-icon confirm-modal-icon--success">
                <i class="pi pi-check"></i>
              </div>
            }
          </div>

          <!-- Birthday greeting -->
          @if (confirmModalData()?.isBirthday) {
            <div class="confirm-modal-birthday-greeting">
              ¡Feliz Cumpleaños, {{ confirmModalData()?.employeeName }}!
            </div>
          }

          <!-- Type + Time -->
          <div class="confirm-modal-title">
            {{ confirmModalData()?.typeLabel }} registrada exitosamente
          </div>
          <div class="confirm-modal-time">
            a las {{ confirmModalData()?.time }}
          </div>

          <!-- Tardiness info -->
          @if (confirmModalData()?.isLate) {
            <div class="confirm-modal-late-box" [class.very-late]="confirmModalData()?.isVeryLate">
              <div class="confirm-modal-late-header">
                <i class="pi pi-clock"></i> Llegó tarde
              </div>
              <div class="confirm-modal-late-detail">
                Tardanza: {{ confirmModalData()?.delayText }}
              </div>
            </div>
            @if (confirmModalData()?.isVeryLate) {
              <div class="confirm-modal-verylate-box">
                <div class="confirm-modal-verylate-header">
                  <i class="pi pi-exclamation-triangle"></i> Atención
                </div>
                <div class="confirm-modal-verylate-detail">
                  Tardanza mayor a 1 hora. Verifique con el gerente si el horario está configurado correctamente.
                </div>
              </div>
            }
          }

          <!-- Lunch overtime warning -->
          @if (confirmModalData()?.isLunchOvertime) {
            <div class="confirm-modal-late-box" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%);">
              <div class="confirm-modal-late-header">
                <i class="pi pi-clock"></i> Almuerzo excedido
              </div>
              <div class="confirm-modal-late-detail">
                Se excedió {{ confirmModalData()?.lunchExceededMinutes }} minuto{{ confirmModalData()!.lunchExceededMinutes !== 1 ? 's' : '' }} de almuerzo
              </div>
            </div>
          }

          <!-- Motivational phrase -->
          <div class="confirm-modal-phrase-box" [class.birthday-phrase]="confirmModalData()?.isBirthday">
            @if (confirmModalData()?.isBirthday) {
              <span class="birthday-phrase-icon">🎉</span>
            }
            "{{ confirmModalData()?.phrase }}"
            @if (confirmModalData()?.isBirthday) {
              <span class="birthday-phrase-icon">🎉</span>
            }
          </div>

          <!-- Progress bar -->
          <div class="confirm-modal-progress-track">
            <div class="confirm-modal-progress-bar"
              [class.is-late]="confirmModalData()?.isLate"
              [class.is-birthday]="confirmModalData()?.isBirthday"></div>
          </div>
        </div>
      </div>
    }

    <!-- Info Modal -->
    @if (infoModalVisible()) {
      <div class="info-modal-overlay" (click)="closeInfoModal()">
        <div class="info-modal-card" (click)="$event.stopPropagation()">
          <div class="info-modal-header">
            <div class="info-modal-title"><i class="pi pi-clock"></i> Estado del día</div>
            <button type="button" class="info-modal-close-btn" (click)="closeInfoModal()"><i class="pi pi-times"></i></button>
          </div>
          @if (isLoadingInfo()) {
            <div class="info-modal-loading">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Cargando...</span>
            </div>
          } @else if (infoModalData(); as info) {
            <div class="info-employee-name">{{ info.employeeName }}</div>
            @if (info.branchMismatch) {
              <div class="info-branch-warning">
                <i class="pi pi-exclamation-triangle"></i>
                <div>
                  <div class="font-semibold">Sucursal no coincide</div>
                  <div class="text-xs mt-0.5">Asignada: <strong>{{ info.branchAssigned }}</strong></div>
                  <div class="text-xs">Seleccionada: <strong>{{ info.branchSelected }}</strong></div>
                </div>
              </div>
            }
            <div class="info-rows">
              <!-- Entrada -->
              <div class="info-row">
                <div class="info-row-icon entry-icon"><i class="pi pi-sign-in"></i></div>
                <div>
                  <div class="info-row-label">Entrada</div>
                  @if (info.entryTime) {
                    <div class="info-row-val">{{ info.entryTime }}</div>
                  } @else {
                    <div class="info-row-val muted-val">Sin marcar</div>
                  }
                </div>
              </div>
              <!-- Almuerzo -->
              <div class="info-row">
                <div class="info-row-icon lunch-icon" [ngClass]="{'lunch-active': info.isInLunch}"><i class="pi pi-sun"></i></div>
                <div style="flex:1">
                  <div class="info-row-label">Almuerzo</div>
                  @if (!info.lunchStartTime) {
                    <div class="info-row-val muted-val">No iniciado</div>
                  } @else if (info.isInLunch) {
                    <div class="info-row-val">Desde {{ info.lunchStartTime }}</div>
                    @if (info.lunchMinutesRemaining !== null) {
                      <div class="info-row-sub" [ngClass]="info.lunchMinutesRemaining > 0 ? 'ok-text' : 'warn-text'">
                        @if (info.lunchMinutesRemaining > 0) {
                          {{ info.lunchMinutesRemaining }} min restantes
                        } @else {
                          Tiempo de almuerzo agotado
                        }
                      </div>
                    }
                  } @else {
                    <div class="info-row-val">{{ info.lunchStartTime }} → {{ info.lunchEndTime }}</div>
                    @if (info.lunchMinutesUsed !== null) {
                      <div class="info-row-sub" [ngClass]="info.lunchMinutesUsed > info.lunchAllowedMinutes ? 'warn-text' : 'muted-text'">
                        {{ info.lunchMinutesUsed }} / {{ info.lunchAllowedMinutes }} min
                      </div>
                    }
                  }
                </div>
              </div>
              <!-- Salida -->
              <div class="info-row">
                <div class="info-row-icon exit-icon"><i class="pi pi-sign-out"></i></div>
                <div>
                  <div class="info-row-label">Salida programada</div>
                  @if (info.scheduledExitTime) {
                    <div class="info-row-val">{{ info.scheduledExitTime }}</div>
                    @if (info.minutesToExit !== null) {
                      <div class="info-row-sub" [ngClass]="info.minutesToExit >= 0 ? 'ok-text' : 'warn-text'">
                        @if (info.minutesToExit > 0) {
                          Faltan {{ info.minutesToExit }} min
                        } @else if (info.minutesToExit === 0) {
                          Es hora de salir
                        } @else {
                          {{ absMinutes(info.minutesToExit) }} min de sobretiempo
                        }
                      </div>
                    }
                  } @else {
                    <div class="info-row-val muted-val">Sin horario asignado</div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }

    <div
      class="flex flex-col items-center justify-center animated-gradient-container"
      style="width: 100%; position: relative;"
    >
      @if (!isKioskMode() || isIPValid()) {
      <div
        class="flex flex-col gap-2 md:gap-3 lg:gap-4 items-center px-3 md:px-6 relative z-10 timeclock-content"
        style="max-width: 600px; width: 100%;"
      >
        <img
          [src]="isNazCompany() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
          class="h-12 md:h-16 lg:h-20 w-auto object-contain drop-shadow-2xl relative z-10"
        />
        <p-card class="w-full timeclock-card relative z-10">
          <ng-template #title>
            <div class="flex flex-col gap-1 md:gap-2 items-center">
              <div
                class="text-base md:text-lg lg:text-xl font-bold text-gray-100 text-center"
              >
                Reloj de Marcación
              </div>
              <!-- Clock Display inside card -->
              <div
                class="flex flex-col items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-lg px-3 md:px-5 py-1.5 md:py-2 border border-yellow-500/40 shadow-lg clock-display"
              >
                <div
                  class="text-xl md:text-2xl lg:text-3xl font-mono font-bold text-yellow-400 clock-time"
                >
                  {{ formattedTime() }}
                </div>
                <div class="text-xs md:text-sm text-gray-300">
                  {{ formattedDate() }}
                </div>
              </div>
            </div>
          </ng-template>
          <ng-template #subtitle>
            <div
              class="flex items-center justify-center gap-2 text-[#d2d2d2] text-xs md:text-sm font-semibold text-center"
            >
              <i class="pi pi-building text-yellow-400"></i>
              <i class="pi pi-user text-yellow-400"></i>
              <span>Seleccione la sucursal y empleado</span>
            </div>
          </ng-template>
          <!-- DP reader status chip -->
          <div class="dp-status-wrap">
            <button type="button" class="dp-status-chip"
                    [class.dp-status-chip--off]="!dpReaderConnected()"
                    [class.dp-status-chip--clickable]="!dpReaderConnected()"
                    (click)="!dpReaderConnected() && openDpInstallHelp()">
              <span class="dp-status-dot"></span>
              <i class="pi pi-fingerprint"></i>
              <span class="dp-status-text">{{ dpReaderConnected() ? 'Lector conectado' : 'Lector desconectado — Click para ayuda' }}</span>
            </button>
          </div>

          <form
            [formGroup]="form"
            class="flex flex-col gap-3 md:gap-4 items-center w-full"
            (keydown.enter)="onEnterKey($event)"
          >
            @if (!form.get('company_id')?.value) {
            <div class="input-container w-full">
              <p-select
                formControlName="company_id"
                [options]="companiesResource.value()"
                placeholder="Seleccionar empresa"
                optionLabel="name"
                optionValue="id"
                filter
                filterBy="name"
                class="w-full"
                [styleClass]="'w-full'"
              />
            </div>
            }
            <div class="input-container w-full">
              <p-select
                formControlName="branch_id"
                [options]="currentBranchesResource()"
                placeholder="Seleccionar sucursal"
                optionValue="id"
                optionLabel="name"
                filter
                filterBy="name"
                class="w-full"
                [styleClass]="'w-full'"
              />
            </div>
            <div
              class="input-container w-full"
              [ngClass]="{
                'error-border':
                  form.get('employee')?.invalid && form.get('employee')?.touched
              }"
            >
              <p-select
                formControlName="employee"
                [options]="employeesResource.value()"
                placeholder="Seleccionar empleado"
                filter
                filterBy="first_name,father_name"
                class="w-full"
                [styleClass]="'w-full'"
              >
                <ng-template #selectedItem let-selected>
                  {{ selected.father_name | trim }},
                  {{ selected.first_name | trim }}
                </ng-template>
                <ng-template let-item #item>
                  {{ item.father_name | trim }}, {{ item.first_name | trim }}
                </ng-template>
              </p-select>
            </div>
            <!-- Info button + branch mismatch warning -->
            @if (showInfoButton()) {
              <div class="w-full flex items-center gap-2">
                <button type="button" class="info-btn ml-auto" (click)="openInfoModal()" title="Ver estado del día">
                  <i class="pi pi-info-circle"></i>
                </button>
              </div>
            }

            <div class="input-container w-full">
              <p-select
                formControlName="type"
                placeholder="Seleccionar tipo"
                [options]="availableTypes()"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                [styleClass]="'w-full'"
              />
            </div>

            <!-- Auth Method Toggle: visible cuando no hay huella usable.
                 DP requiere lector conectado; sin lector, dejamos PIN como fallback. -->
            @if (selectedEmployee() && !employeeHasFingerprint() && (!employeeHasDp() || !dpReaderConnected())) {
              <div class="auth-method-toggle w-full">
                <button type="button" class="auth-method-btn" [class.auth-method-btn--active]="authMethod() === 'pin'" (click)="authMethod.set('pin')">
                  <i class="pi pi-shield"></i> Autenticador
                </button>
                @if (employeeHasDp()) {
                  <button type="button" class="auth-method-btn auth-method-btn--disabled" disabled
                          title="Lector de huellas no detectado en esta PC">
                    <i class="pi pi-fingerprint"></i> Huella (lector off)
                  </button>
                } @else {
                  <button type="button" class="auth-method-btn" [class.auth-method-btn--active]="authMethod() === 'fingerprint'" (click)="authMethod.set('fingerprint')">
                    <i class="pi pi-fingerprint"></i> Huella
                  </button>
                }
              </div>
            }

            <!-- PIN Input Section -->
            @if (authMethod() === 'pin' && !employeeHasFingerprint() && (!employeeHasDp() || !dpReaderConnected())) {
            <div
              class="w-full flex flex-col gap-0.5 items-center justify-center"
            >
              <label
                class="text-gray-300 font-medium text-xs md:text-sm text-center"
                style="margin-bottom: 3px;"
              >
                Ingrese su PIN
              </label>
              <div class="w-full flex justify-center items-center gap-2">
                <p-inputOtp
                  #otpInput
                  formControlName="otp"
                  [length]="6"
                  [integerOnly]="true"
                  (input)="onOtpInput($event)"
                  styleClass="p-inputotp-input"
                />
                <!-- Paste button (visible on mobile) -->
                <button
                  type="button"
                  class="paste-btn md:hidden"
                  (click)="pasteFromClipboard()"
                  title="Pegar código"
                >
                  <i class="pi pi-clipboard"></i>
                </button>
                <!-- Numeric keypad toggle (icon only) -->
                <button
                  type="button"
                  class="paste-btn"
                  (click)="toggleKeypad()"
                  [title]="showKeypadPanel() ? 'Ocultar teclado' : 'Teclado numérico'"
                >
                  <i class="pi" [ngClass]="showKeypadPanel() ? 'pi-chevron-up' : 'pi-th-large'"></i>
                </button>
              </div>
              @if (showKeypadPanel()) {
              <div class="keypad-grid w-full max-w-[280px] mx-auto" style="animation: slideDown 0.25s ease-out;">
                <div class="grid grid-cols-3 gap-1.5">
                  @for (num of ['1','2','3','4','5','6','7','8','9']; track num) {
                    <button type="button" class="keypad-btn" (click)="addNumberToOtp(num)">{{ num }}</button>
                  }
                  <button type="button" class="keypad-btn keypad-clear" (click)="clearOtp()">
                    <i class="pi pi-ban text-sm"></i>
                  </button>
                  <button type="button" class="keypad-btn" (click)="addNumberToOtp('0')">0</button>
                  <button type="button" class="keypad-btn keypad-delete" (click)="deleteFromOtp()">
                    <i class="pi pi-delete-left text-sm"></i>
                  </button>
                </div>
              </div>
              }
            </div>

            <!-- PIN Submit Button -->
            <div class="w-full flex justify-center items-center">
              <p-button
                [disabled]="
                  form.invalid || isProcessing() || !form.get('employee')?.value
                "
                [loading]="isProcessing()"
                (onClick)="validateOtp()"
                [label]="isProcessing() ? 'Procesando...' : 'Marcar'"
                [icon]="
                  isProcessing()
                    ? 'pi pi-spin pi-spinner'
                    : 'pi pi-check-circle'
                "
                size="large"
                rounded
                [styleClass]="'mark-button'"
                [style]="{
                  background:
                    form.invalid || !form.get('employee')?.value
                      ? 'linear-gradient(135deg, #5d5d5d 0%, #4a4a4a 100%)'
                      : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  border: 'none',
                  'box-shadow':
                    form.invalid || !form.get('employee')?.value
                      ? 'none'
                      : '0 4px 15px rgba(251, 191, 36, 0.4)'
                }"
              />
            </div>
            }

            <!-- Fingerprint Section: solo si la huella es usable
                 (WebAuthn siempre, DP sólo cuando el lector está conectado) -->
            @if (authMethod() === 'fingerprint' && (employeeHasFingerprint() || (employeeHasDp() && dpReaderConnected()))) {
              <div class="w-full flex flex-col items-center gap-3">
                @if (employeeHasFingerprint() || (employeeHasDp() && dpReaderConnected())) {
                  <div class="fp-scanner" [class.fp-scanner--scanning]="isProcessing()" [class.fp-scanner--ready]="!isProcessing()">
                    <div class="fp-scanner__ring"></div>
                    <div class="fp-scanner__ring fp-scanner__ring--2"></div>
                    <div class="fp-scanner__beam"></div>
                    <i class="pi pi-fingerprint fp-scanner__icon"></i>
                  </div>
                  <p class="fp-scanner__label">
                    @if (isProcessing()) {
                      Escaneando huella...
                    } @else if (form.get('employee')?.value && form.get('type')?.value) {
                      Coloca tu dedo en el lector
                    } @else if (!form.get('employee')?.value) {
                      Selecciona empleado
                    } @else {
                      Selecciona tipo de marcación
                    }
                  </p>
                } @else {
                  <div class="fingerprint-noreg-box">
                    <i class="pi pi-fingerprint" style="font-size:2rem;color:rgba(251,191,36,0.5)"></i>
                    <p style="font-size:0.85rem;color:rgba(255,255,255,0.55);text-align:center;margin:0">
                      No hay huella registrada. Solicita el registro a un administrador.
                    </p>
                  </div>
                }
              </div>
            }

            <!-- Validation Messages -->
            @if (form.get('employee')?.invalid && form.get('employee')?.touched)
            {
            <div class="text-gray-400 text-xs text-center w-full mt-1">
              Debe seleccionar un empleado para continuar.
            </div>
            }
          </form>
        </p-card>
      </div>
      } @else {
      <!-- Mensaje de acceso restringido en modo kiosko -->
      <div
        class="flex flex-col gap-4 items-center px-3 md:px-6 relative z-10"
        style="max-width: 600px; width: 100%;"
      >
        <img
          [src]="isNazCompany() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
          class="h-12 md:h-16 lg:h-20 w-auto object-contain drop-shadow-2xl relative z-10"
        />
        <p-card class="w-full timeclock-card relative z-10">
          <ng-template pTemplate="title">
            <div class="flex flex-col gap-3 items-center">
              <div class="relative">
                <div
                  class="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center shadow-lg shadow-red-500/20 border border-red-500/30 animate-pulse"
                >
                  <i
                    class="pi pi-exclamation-triangle text-red-400 text-3xl md:text-4xl drop-shadow-lg"
                  ></i>
                </div>
                <div
                  class="absolute inset-0 w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-500/10 animate-ping"
                ></div>
              </div>
              <h1
                class="text-xl md:text-2xl font-semibold text-white m-0 text-center"
              >
                Acceso Restringido
              </h1>
            </div>
          </ng-template>
          <div class="space-y-4 text-gray-300 text-center">
            <p class="text-base md:text-lg text-white font-medium">
              Dirección IP no autorizada
            </p>
            <p class="text-sm md:text-base leading-relaxed">
              Tu dirección IP actual no está autorizada para usar el modo
              kiosko.
            </p>
            @if (currentIP()) {
            <div
              class="mt-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700"
            >
              <p class="text-xs text-gray-400 mb-1">IP detectada:</p>
              <p
                class="text-sm text-red-400 font-mono font-semibold text-center"
              >
                {{ currentIP() }}
              </p>
            </div>
            }
            <p class="text-xs md:text-sm text-gray-400 italic">
              Si cambias de red o tu IP cambia, el acceso será bloqueado
              automáticamente.
            </p>
          </div>
        </p-card>
      </div>
      }

      <!-- DP install help dialog (shared modal — rendered at template root) -->
      <app-dp-install-help-modal [(show)]="showDpHelp" />
    </div>`,
  styleUrl: './naz-timeclock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NazTimeclockComponent implements OnDestroy {
  private message = inject(MessageService);
  private confirmation = inject(ConfirmationService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private ipMonitor = inject(IpMonitorService);
  private destroyRef = inject(DestroyRef);
  private organizationService = inject(OrganizationService);
  private apiUrl = inject(ApiUrlService);
  private phrases = inject(TimeclockPhrasesService);
  private webAuthn = inject(WebAuthnService);
  private dp = inject(DpFingerprintService);
  public employeeHasDp = signal<boolean>(false);

  /** Employees that can mark from any IP address */
  private readonly IP_BYPASS_EMPLOYEE_IDS = new Set([
    '43cd8574-3c4b-40c2-9824-5f9a4fe68dc8', // Tristan Whitehead
  ]);

  /** Tracks last successful punch timestamp per employee to prevent duplicates within 30s */
  private readonly recentPunches = new Map<string, number>();
  // Get IP address - try multiple methods to get real IP even from localhost
  public currentIP = signal<string>('127.0.0.1');
  public isProcessing = signal<boolean>(false);
  public showKeypad = signal<boolean>(false);
  public showKeypadPanel = signal<boolean>(false);
  public authMethod = signal<'pin' | 'fingerprint'>('pin');
  public employeeHasFingerprint = signal<boolean>(false);
  public currentTime = signal<Date>(new Date());
  public availableTypes = signal<Array<{ value: string; label: string }>>([]);
  public isKioskMode = signal<boolean>(false);
  public isIPValid = signal<boolean>(true);

  // Computed para verificar si es Naz
  public isNazCompany = computed(() => this.organizationService.isNaz());

  // Custom confirmation modal signals
  public confirmModalVisible = signal(false);
  public confirmModalExiting = signal(false);
  public confirmModalData = signal<{
    phrase: string;
    isLate: boolean;
    delayText: string;
    isVeryLate: boolean;
    typeLabel: string;
    time: string;
    isBirthday: boolean;
    employeeName: string;
    isLunchOvertime: boolean;
    lunchExceededMinutes: number;
  } | null>(null);
  private confirmModalTimer: ReturnType<typeof setTimeout> | undefined;

  // Info modal signals
  public infoModalVisible = signal(false);
  public infoModalData = signal<TimeclockInfoData | null>(null);
  public isLoadingInfo = signal(false);
  public selectedEmployee = signal<Partial<Employee> | undefined>(undefined);
  public selectedBranchId = signal<string>('');

  public branchMismatch = computed(() => {
    const employee = this.selectedEmployee();
    const branchId = this.selectedBranchId() || this.form.get('branch_id')?.value || '';
    if (!employee?.branch_id || !branchId) return false;
    return employee.branch_id !== branchId;
  });

  public showInfoButton = computed(() => !!this.selectedEmployee());

  private injector = inject(Injector);
  private timeInterval: any;

  public dpReaderConnected = signal<boolean>(false);
  public showDpHelp = signal<boolean>(false);
  openDpInstallHelp() { this.showDpHelp.set(true); }

  // Update time every second
  constructor() {
    // Configurar organización como Naz para esta ruta
    this.organizationService.setOrganization('naz');

    // Inicializar contexto de audio para sonidos de marcación
    initAudioContext();

    // Monitorear estado del lector DP (Lite Client + lector USB)
    this.dp.startStatusPolling(5000);
    this.dp.onConnectionChange((c) => {
      this.dpReaderConnected.set(c);
      // Reader caído + empleado solo con DP → fallback a PIN
      if (!c && this.employeeHasDp() && !this.employeeHasFingerprint() && this.authMethod() === 'fingerprint') {
        this.authMethod.set('pin');
      }
      if (c && this.employeeHasDp() && !this.employeeHasFingerprint() && this.authMethod() === 'pin') {
        this.authMethod.set('fingerprint');
        this.maybeAutoStartFingerprint();
      }
    });

    // Detectar si está en modo kiosko
    const isKioskRoute = this.router.url.includes('/timeclock-kiosk');
    this.isKioskMode.set(isKioskRoute);

    this.timeInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);

    // Initialize available types
    this.availableTypes.set(this.types);

    // Try to get real IP address using multiple methods
    this.detectIP();

    // Para Naz, siempre considerar la IP como válida (no hay validación estricta)
    if (this.organizationService.isNaz()) {
      this.isIPValid.set(true);
    } else if (isKioskRoute) {
      // Si está en modo kiosko y NO es Naz, monitorear la IP continuamente
      this.setupKioskModeMonitoring();
    }

    // Auto-select company and branch when data loads
    effect(
      () => {
        const companies = this.companiesResource.value();
        const branches = this.currentBranchesResource();

        // Auto-select first Naz company if found
        if (
          companies &&
          companies.length > 0 &&
          !this.form.get('company_id')?.value
        ) {
          // Try to find a company with "naz" in the name (case insensitive)
          let nazCompany = companies.find((c) => {
            const name = c.name.toLowerCase();
            return name.includes('naz');
          });

          // If not found, just select the first active company
          if (!nazCompany) {
            nazCompany = companies.find((c) => c.is_active) || companies[0];
          }

          if (nazCompany) {
            this.form.get('company_id')?.setValue(nazCompany.id);
          }
        }

        // Auto-select branch by IP if found (after company is selected)
        const selectedCompanyId = this.form.get('company_id')?.value;
        const filteredBranches = this.currentBranchesResource();
        if (
          filteredBranches &&
          filteredBranches.length > 0 &&
          !this.form.get('branch_id')?.value
        ) {
          const currentIP = this.getIP();
          if (currentIP && currentIP !== '127.0.0.1') {
            // Find branch matching the IP
            const matchingBranch = filteredBranches.find(
              (b) => b.ip === currentIP
            );
            if (matchingBranch) {
              this.form.get('branch_id')?.setValue(matchingBranch.id);
            }
          }
        }
      },
      { injector: this.injector }
    );

    // Auto-detect timelog type when employee is selected
    this.form.get('employee')?.valueChanges.subscribe((employee) => {
      this.onEmployeeSelected(employee);
    });

    // Auto-iniciar verificación de huella cuando el tipo de marcación cambia
    this.form.get('type')?.valueChanges.subscribe(() => {
      this.maybeAutoStartFingerprint();
    });

    // Track selected branch for info modal / branch mismatch
    this.form.get('branch_id')?.valueChanges.subscribe((branchId) => {
      this.selectedBranchId.set(branchId || '');
    });
  }

  private autoFingerprintTimer: any = null;
  /** Auto-arranca verificación cuando empleado + tipo + huella registrada listos. */
  private maybeAutoStartFingerprint() {
    if (this.autoFingerprintTimer) {
      clearTimeout(this.autoFingerprintTimer);
      this.autoFingerprintTimer = null;
    }
    if (this.isProcessing()) return;
    if (this.authMethod() !== 'fingerprint') return;
    const v = this.form.getRawValue();
    if (!v.employee || !v.type || !v.branch_id) return;
    if (!this.employeeHasFingerprint() && !this.employeeHasDp()) return;
    // Pequeño delay para que el usuario vea su selección antes de pedir el dedo
    this.autoFingerprintTimer = setTimeout(() => this.validateFingerprint(), 350);
  }

  /**
   * Configura el monitoreo de IP en modo kiosko
   */
  private setupKioskModeMonitoring(): void {
    // Suscribirse al estado de validez de la IP
    this.ipMonitor.isIPValid
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isValid: boolean) => {
        this.isIPValid.set(isValid);

        if (!isValid) {
          // Mostrar alerta cuando la IP no es válida
          this.message.add({
            severity: 'error',
            summary: 'Acceso Restringido',
            detail:
              'La dirección IP no está autorizada para usar el modo kiosko. El acceso ha sido bloqueado.',
            life: 0, // No desaparece automáticamente
            closable: true,
          });
        } else {
          // Limpiar mensajes de error si la IP vuelve a ser válida
          this.message.clear();
        }
      });

    // También suscribirse a cambios de IP para detectar cambios de red
    this.ipMonitor.currentIP
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ip: string | null) => {
        if (ip) {
          this.currentIP.set(ip);
        }
      });
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    if (this.confirmModalTimer) {
      clearTimeout(this.confirmModalTimer);
    }
    // Detener monitoreo de IP si está activo
    if (this.isKioskMode()) {
      this.ipMonitor.stopMonitoring();
    }
    // Detener polling del DP reader (evita spam de /get_connection en otras rutas)
    this.dp.stopStatusPolling();
  }

  // Detect IP address. Public IP (ipify) first — branches.ip is the public IP.
  private detectIP() {
    this.getIPViaHttp()
      .then((ip) => {
        if (ip && ip !== '127.0.0.1') { this.currentIP.set(ip); return; }
        throw new Error('empty ipify');
      })
      .catch(() => {
        this.getIPViaAlternative()
          .then((ip) => {
            if (ip && ip !== '127.0.0.1') { this.currentIP.set(ip); return; }
            throw new Error('empty ipify64');
          })
          .catch(() => {
            this.getIPViaWebRTC()
              .then((ip) => {
                if (ip && ip !== '127.0.0.1' && ip !== '::1') this.currentIP.set(ip);
              })
              .catch(() => { /* keep default */ });
          });
      });
  }

  // Method 1: Get IP via WebRTC (works from localhost)
  private getIPViaWebRTC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const RTCPeerConnection =
        (window as any).RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;

      if (!RTCPeerConnection) {
        reject(new Error('WebRTC not supported'));
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      const ips: string[] = [];

      pc.createDataChannel('');

      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const match = candidate.match(
            /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/
          );
          if (match) {
            const ip = match[1];
            if (
              ips.indexOf(ip) === -1 &&
              !ip.startsWith('127.') &&
              ip !== '::1'
            ) {
              ips.push(ip);
            }
          }
        } else {
          // All candidates received
          if (ips.length > 0) {
            pc.close();
            resolve(ips[0]);
          } else {
            pc.close();
            reject(new Error('No IP found'));
          }
        }
      };

      pc.createOffer()
        .then((offer: any) => pc.setLocalDescription(offer))
        .catch((err: any) => {
          pc.close();
          reject(err);
        });

      // Timeout after 3 seconds
      setTimeout(() => {
        if (ips.length > 0) {
          pc.close();
          resolve(ips[0]);
        } else {
          pc.close();
          reject(new Error('WebRTC timeout'));
        }
      }, 3000);
    });
  }

  // Method 2: Get IP via HTTP (ipify.org)
  private getIPViaHttp(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http
        .get<{ ip: string }>('https://api.ipify.org?format=json', {
          headers: { Accept: 'application/json' },
        })
        .subscribe({
          next: (data) => resolve(data.ip),
          error: () => reject(new Error('HTTP method failed')),
        });
    });
  }

  // Method 3: Get IP via alternative service
  private getIPViaAlternative(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http
        .get<{ ip: string }>('https://api64.ipify.org?format=json', {
          headers: { Accept: 'application/json' },
        })
        .subscribe({
          next: (data) => resolve(data.ip),
          error: () => reject(new Error('Alternative method failed')),
        });
    });
  }

  // Update available types based on last timelog
  private updateAvailableTypes(lastType: string | null) {
    const allTypes = this.types;
    if (!lastType) {
      // No previous log today, show all types
      this.availableTypes.set(allTypes);
      return;
    }

    // Filter types based on last log
    // Allow exit at any point after entry (for emergencies)
    let filtered: Array<{ value: string; label: string }> = [];

    switch (lastType) {
      case 'entry':
        // Can do lunch_start or exit (for emergencies)
        filtered = allTypes.filter(
          (t) => t.value === 'lunch_start' || t.value === 'exit'
        );
        break;
      case 'lunch_start':
        // Can do lunch_end or exit (for emergencies)
        filtered = allTypes.filter(
          (t) => t.value === 'lunch_end' || t.value === 'exit'
        );
        break;
      case 'lunch_end':
        // Can do exit next
        filtered = allTypes.filter((t) => t.value === 'exit');
        break;
      case 'exit':
        // Can start new day with entry
        filtered = allTypes.filter((t) => t.value === 'entry');
        break;
      default:
        filtered = allTypes;
    }

    this.availableTypes.set(filtered.length > 0 ? filtered : allTypes);
  }

  // Add number to OTP from keypad
  addNumberToOtp(num: string) {
    const currentOtp = this.form.get('otp')?.value || '';
    if (currentOtp.length < 6) {
      this.form.get('otp')?.setValue(currentOtp + num);
    }
  }

  // Delete last number from OTP
  deleteFromOtp() {
    const currentOtp = this.form.get('otp')?.value || '';
    if (currentOtp.length > 0) {
      this.form.get('otp')?.setValue(currentOtp.slice(0, -1));
    }
  }

  // Clear OTP
  clearOtp() {
    this.form.get('otp')?.setValue('');
  }

  toggleKeypad() {
    this.showKeypadPanel.update(v => !v);
  }

  // Paste OTP from clipboard
  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, '').slice(0, 6);
      if (digits) {
        this.form.get('otp')?.setValue(digits);
        if (digits.length === 6) {
          // Auto-submit after a brief delay
          setTimeout(() => this.validateOtp(), 200);
        }
      }
    } catch {
      // Clipboard API not available or permission denied
      this.message.add({
        severity: 'warn',
        summary: 'No se pudo pegar',
        detail: 'Permita el acceso al portapapeles o ingrese el PIN manualmente',
        life: 3000,
      });
    }
  }

  // Format time for display (12-hour format with AM/PM)
  formattedTime = computed(() => {
    return format(this.currentTime(), 'h:mm:ss aaa');
  });

  // Format date for display
  formattedDate = computed(() => {
    const date = this.currentTime();
    return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  });

  // Get IP - always returns a valid IP (localhost in dev)
  public getIP = computed(() => {
    return this.currentIP() || '127.0.0.1';
  });

  public validIP = computed(() => {
    // Naz no tiene validación de IP estricta
    const ip = this.getIP();
    // If IP is localhost or bypass IP, always allow
    if (ip === '127.0.0.1' || ip === '181.197.126.10') return true;
    const branches = this.currentBranchesResource();
    if (!branches) return true;
    return branches.some((branch) => branch.ip === ip);
  });

  public types = Object.entries(TimelogType).map(([key, value]) => ({
    value: key,
    label: value,
  }));

  // Ya no hay tablas naz_*, todo es por company_id en tablas compartidas
  public companiesResource = httpResource<Company[]>(() => ({
    url: `${this.apiUrl.baseUrl}/rest/v1/companies`,
    method: 'GET',
    params: {
      select: 'id,name',
      order: 'name',
    },
  }));

  public branchesResource = httpResource<Branch[]>(() => ({
    url: `${this.apiUrl.baseUrl}/rest/v1/branches`,
    method: 'GET',
    params: {
      select: 'id,name,ip,company_id',
      order: 'name',
    },
  }));

  // Computed para filtrar branches por company_id actual
  public currentBranchesResource = computed<Branch[] | undefined>(() => {
    const branches = this.branchesResource.value();
    if (!branches) return undefined;

    const companyId = this.organizationService.getCurrentCompanyId();
    if (companyId) {
      return branches.filter((b) => b.company_id === companyId);
    }
    return branches;
  });

  public employeesResource = httpResource<Partial<Employee>[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: 'id,first_name,father_name,code_uri,birth_date,branch_id',
      order: 'father_name',
      is_active: 'eq.true',
    };

    // Filtrar por company_id siempre (ya no hay tablas naz_*)
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: `${this.apiUrl.baseUrl}/rest/v1/employees`,
      method: 'GET',
      params,
    };
  });

  // Get last timelog for an employee today to determine next type
  private getLastTimelog(employeeId: string): Observable<TimeLog | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = `${today}T00:00:00`;
    const companyId = this.organizationService.getCurrentCompanyId();

    const params: any = {
      select: 'id,type,created_at',
      employee_id: `eq.${employeeId}`,
      created_at: `gte.${todayStart}`,
      order: 'created_at.desc',
      limit: '1',
    };

    // Filtrar por company_id siempre (ya no hay tablas naz_*)
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return this.http
      .get<TimeLog[]>(`${this.apiUrl.baseUrl}/rest/v1/timelogs`, {
        params,
      })
      .pipe(
        map((timelogs) => {
          if (!timelogs || timelogs.length === 0) {
            return null;
          }
          const lastLog = timelogs[0];
          // Verify it's from today
          const logDate = format(new Date(lastLog.created_at), 'yyyy-MM-dd');
          return logDate === today ? lastLog : null;
        }),
        catchError(() => of(null))
      );
  }

  // Determine next timelog type based on last entry
  private getNextTimelogType(lastType: string | null): string {
    if (!lastType) {
      return 'entry'; // First entry of the day
    }

    // Determine next type in sequence
    switch (lastType) {
      case 'entry':
        return 'lunch_start';
      case 'lunch_start':
        return 'lunch_end';
      case 'lunch_end':
        return 'exit';
      case 'exit':
        return 'entry'; // New day starts (shouldn't happen if we filter by today)
      default:
        return 'entry';
    }
  }

  public form = new FormGroup({
    company_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    branch_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    employee: new FormControl<Employee | undefined>(undefined, {
      validators: [Validators.required],
      nonNullable: true,
    }),
    type: new FormControl<string>('entry', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    otp: new FormControl('', {
      validators: [Validators.required, Validators.minLength(6)],
      nonNullable: true,
    }),
  });

  @ViewChild('otpInput') otpInput?: ElementRef;

  onEnterKey(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.form.valid) {
      this.validateOtp();
    }
  }

  onEmployeeSelected(employee: Employee | undefined) {
    this.selectedEmployee.set(employee);
    this.authMethod.set('pin');
    this.employeeHasFingerprint.set(false);
    this.employeeHasDp.set(false);
    if (employee?.id) {
      // Esperamos AMBOS chequeos antes de elegir método y auto-disparar
      Promise.all([
        this.webAuthn.getCredentialStatus(employee.id).catch(() => ({ hasCredential: false } as any)),
        this.dp.isLiteClientAvailable().then(async (liteOk) => {
          if (!liteOk) return { enrolled: false };
          try {
            const r = await fetch(`/api/dp/has-enrollment/${employee.id}`);
            if (!r.ok) return { enrolled: false };
            return await r.json();
          } catch { return { enrolled: false }; }
        }),
      ]).then(([waStatus, dpStatus]: any[]) => {
        // DP tiene prioridad si el empleado lo tiene enrolado
        this.employeeHasDp.set(!!dpStatus?.enrolled);
        // WebAuthn solo si el empleado NO tiene DP (evita 404 del fallback)
        this.employeeHasFingerprint.set(!dpStatus?.enrolled && !!waStatus?.hasCredential);
        // Forzar huella sólo si está realmente disponible:
        //   - WebAuthn no requiere lector externo.
        //   - DP requiere Lite Client conectado en esta PC; sino, fallback a PIN.
        const fingerprintUsable = this.employeeHasFingerprint() ||
          (this.employeeHasDp() && this.dpReaderConnected());
        if (fingerprintUsable) {
          this.authMethod.set('fingerprint');
          this.maybeAutoStartFingerprint();
        } else {
          this.authMethod.set('pin');
        }
      });

      this.getLastTimelog(employee.id).subscribe({
        next: (lastTimelog) => {
          const nextType = this.getNextTimelogType(lastTimelog?.type || null);
          this.updateAvailableTypes(lastTimelog?.type || null);
          this.form.get('type')?.setValue(nextType);
          // Focus OTP input when employee is selected
          this.focusOtpInput();
        },
        error: () => {
          // Default to entry if error
          this.updateAvailableTypes(null);
          this.form.get('type')?.setValue('entry');
          // Focus OTP input when employee is selected
          this.focusOtpInput();
        },
      });
    } else {
      this.updateAvailableTypes(null);
    }
  }

  onOtpInput(event: any) {
    // Auto-advance to next input when a digit is entered
    const target = event.target;
    if (target && target.value && target.nextElementSibling) {
      target.nextElementSibling.focus();
    }
  }

  focusOtpInput() {
    // Focus first OTP input when employee is selected
    setTimeout(() => {
      const firstInput = document.querySelector(
        '.p-inputotp-input'
      ) as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  absMinutes(n: number): number {
    return Math.abs(n);
  }

  closeInfoModal(): void {
    this.infoModalVisible.set(false);
    this.infoModalData.set(null);
  }

  openInfoModal(): void {
    const employee = this.selectedEmployee();
    if (!employee?.id) return;

    this.isLoadingInfo.set(true);
    this.infoModalVisible.set(true);
    this.infoModalData.set(null);

    forkJoin({
      timelogs: this.getTodayTimelogs(employee.id),
      schedule: this.getEmployeeScheduleForToday(employee.id),
    }).subscribe(({ timelogs, schedule }) => {
      this.isLoadingInfo.set(false);

      const now = new Date();
      const entryLog = timelogs.find(t => t.type === 'entry');
      const lunchStartLog = timelogs.find(t => t.type === 'lunch_start');
      const lunchEndLog = timelogs.find(t => t.type === 'lunch_end');

      const entryTime = entryLog ? format(new Date(entryLog.created_at), 'h:mm aaa') : null;
      const lunchStartTime = lunchStartLog ? format(new Date(lunchStartLog.created_at), 'h:mm aaa') : null;
      const lunchEndTime = lunchEndLog ? format(new Date(lunchEndLog.created_at), 'h:mm aaa') : null;

      const isInLunch = !!lunchStartLog && !lunchEndLog;
      const lunchAllowedMinutes = 60;
      let lunchMinutesRemaining: number | null = null;
      let lunchMinutesUsed: number | null = null;

      if (lunchStartLog) {
        const lunchStart = new Date(lunchStartLog.created_at);
        if (isInLunch) {
          const elapsed = differenceInMinutes(now, lunchStart);
          lunchMinutesRemaining = Math.max(0, lunchAllowedMinutes - elapsed);
        } else if (lunchEndLog) {
          lunchMinutesUsed = differenceInMinutes(new Date(lunchEndLog.created_at), lunchStart);
        }
      }

      let scheduledExitTime: string | null = null;
      let minutesToExit: number | null = null;

      if (schedule?.exit_time) {
        const [h, m] = schedule.exit_time.split(':').map(Number);
        const scheduledExit = new Date();
        scheduledExit.setHours(h, m, 0, 0);
        scheduledExitTime = format(scheduledExit, 'h:mm aaa');
        minutesToExit = differenceInMinutes(scheduledExit, now);
      }

      const branches = this.currentBranchesResource();
      const assignedBranch = branches?.find(b => b.id === employee.branch_id);
      const currentBranchId = this.selectedBranchId() || this.form.get('branch_id')?.value || '';
      const selectedBranch = branches?.find(b => b.id === currentBranchId);

      this.infoModalData.set({
        entryTime,
        lunchStartTime,
        lunchEndTime,
        isInLunch,
        lunchMinutesRemaining,
        lunchMinutesUsed,
        lunchAllowedMinutes,
        scheduledExitTime,
        minutesToExit,
        branchMismatch: this.branchMismatch(),
        employeeName: `${employee.first_name} ${employee.father_name}`.trim(),
        branchAssigned: assignedBranch?.name || 'No asignada',
        branchSelected: selectedBranch?.name || 'Desconocida',
      });
    });
  }

  private getTodayTimelogs(employeeId: string): Observable<TimeLog[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: 'id,type,created_at',
      employee_id: `eq.${employeeId}`,
      created_at: `gte.${today}T00:00:00`,
      order: 'created_at.asc',
    };
    if (companyId) params.company_id = `eq.${companyId}`;
    return this.http
      .get<TimeLog[]>(`${this.apiUrl.baseUrl}/rest/v1/timelogs`, { params })
      .pipe(catchError(() => of([])));
  }

  private getEmployeeScheduleForToday(employeeId: string): Observable<any> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: 'schedule:schedules(id,name,entry_time,exit_time,day_off)',
      employee_id: `eq.${employeeId}`,
      start_date: `lte.${today}`,
      end_date: `gte.${today}`,
      approved: 'eq.true',
      order: 'start_date.desc',
      limit: '1',
    };
    if (companyId) params.company_id = `eq.${companyId}`;
    return this.http
      .get<any[]>(`${this.apiUrl.baseUrl}/rest/v1/employee_schedules`, { params })
      .pipe(
        map(results => results?.[0]?.schedule || null),
        catchError(() => of(null))
      );
  }

  validateOtp() {
    if (this.isProcessing()) return;

    this.isProcessing.set(true);
    const { employee, otp, branch_id, company_id, type } =
      this.form.getRawValue();
    if (employee?.code_uri) {
      const totp = OTPAuth.URI.parse(employee.code_uri);
      const validation = totp.validate({ token: otp });
      if (validation === null) {
        this.isProcessing.set(false);
        playFailureSound();
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Código incorrecto',
        });
        this.form.get('otp')?.reset();
        return;
      }

      const employeeName =
        `${employee.first_name} ${employee.father_name}`.trim();
      this.processTimelog(
        employee.id,
        branch_id,
        company_id,
        type,
        employeeName,
        employee.birth_date as any,
        'pin'
      );
    } else {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'PIN no configurado',
        detail: 'Este empleado no tiene PIN configurado. Contacte a Recursos Humanos.',
        life: 8000,
      });
    }
  }

  async selfRegisterFingerprint() {
    const employee = this.form.getRawValue().employee;
    if (!employee) return;
    this.isProcessing.set(true);
    try {
      await this.webAuthn.registerFingerprintSelf(employee.id);
      this.employeeHasFingerprint.set(true);
      playSuccessSound();
      this.message.add({
        severity: 'success',
        summary: 'Huella registrada',
        detail: `Huella de ${employee.first_name} registrada en este dispositivo. Ya puede marcar.`,
        life: 6000,
      });
    } catch (err: any) {
      playFailureSound();
      const detail = err?.name === 'NotAllowedError'
        ? 'Registro cancelado.'
        : (err?.message || 'No se pudo registrar la huella.');
      this.message.add({ severity: 'error', summary: 'Error', detail, life: 6000 });
    } finally {
      this.isProcessing.set(false);
    }
  }

  async validateFingerprint() {
    if (this.isProcessing()) return;
    const { employee, branch_id, company_id, type } = this.form.getRawValue();
    if (!employee) return;

    this.isProcessing.set(true);
    try {
      // Prefer DigitalPersona U.are.U 4500 if employee has DP huella AND this PC has Lite Client
      if (this.employeeHasDp()) {
        const verified = await this.verifyWithDp(employee.id);
        if (!verified) {
          playFailureSound();
          this.message.add({ severity: 'error', summary: 'Error', detail: 'Huella no coincide. Intenta de nuevo.' });
          return;
        }
        const name = `${employee.first_name} ${employee.father_name}`.trim();
        this.processTimelog(employee.id, branch_id, company_id, type, name, employee.birth_date as any, 'webauthn');
        return;
      }

      // Fallback: WebAuthn (Windows Hello / VeriMark)
      const verified = await this.webAuthn.authenticateFingerprint(employee.id);
      if (!verified) {
        playFailureSound();
        this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo verificar la huella.' });
        return;
      }
      const employeeName = `${employee.first_name} ${employee.father_name}`.trim();
      this.processTimelog(employee.id, branch_id, company_id, type, employeeName, employee.birth_date as any, 'webauthn');
    } catch (err: any) {
      this.isProcessing.set(false);
      playFailureSound();
      const detail = err?.name === 'NotAllowedError'
        ? 'Verificación cancelada. Intente de nuevo.'
        : err?.status === 404
          ? 'No hay huella registrada para este empleado.'
          : (err?.message || 'Error al leer la huella. Intenta de nuevo.');
      this.message.add({ severity: 'error', summary: 'Huella', detail, life: 6000 });
    }
  }

  private async verifyWithDp(employeeId: string): Promise<boolean> {
    const state = await this.dp.init();
    if (state !== 'ready') {
      throw new Error(state === 'no-device' ? 'Lector no conectado' : 'Lite Client no disponible');
    }
    const sample1 = await this.dp.captureOne(30000);
    const r1 = await fetch('/api/dp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId, sample_b64: sample1 }),
    });
    if (!r1.ok) return false;
    const j1 = await r1.json();
    if (!j1?.matched) return false;
    if (j1.confidence === 'high') return true;

    this.message.add({
      severity: 'info', summary: 'Confirmación', life: 8000,
      detail: 'Score bajo. Coloca un segundo dedo (distinto al primero) para confirmar.',
    });
    const sample2 = await this.dp.captureOne(30000);
    const r2 = await fetch('/api/dp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId, sample_b64: sample2 }),
    });
    if (!r2.ok) return false;
    const j2 = await r2.json();
    if (!j2?.matched) return false;
    if (j1.matched_finger_index === j2.matched_finger_index) {
      this.message.add({ severity: 'warn', summary: 'Confirmación', detail: 'Usa un dedo distinto.', life: 5000 });
      return false;
    }
    return true;
  }

  private processTimelog(
    employeeId: string,
    branchId: string,
    companyId: string,
    type: string,
    employeeName: string,
    birthDate?: string,
    authMethod?: 'pin' | 'webauthn'
  ) {
    // Prevenir duplicados: rechazar si el mismo empleado marcó hace menos de 30 segundos
    const now = Date.now();
    const lastPunch = this.recentPunches.get(employeeId);
    if (lastPunch && now - lastPunch < 30000) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'warn',
        summary: 'Marcación reciente',
        detail: 'Ya se registró una marcación para este empleado. Por favor espere 30 segundos.',
        life: 5000,
      });
      return;
    }
    this.recentPunches.set(employeeId, now);

    // Usar RPC para procesar todo en una sola transacción (same as main timeclock)
    this.http
      .post<{
        success: boolean;
        timelog_id?: string;
        delay?: number | null;
        exitDiff?: { minutes: number; isEarly: boolean } | null;
        lunchEndDiff?: number | null;
        lunchExceededMinutes?: number | null;
        schedule?: {
          id: string;
          name: string;
          entry_time: string;
          exit_time: string;
          day_off: boolean;
          minutes_tolerance: number;
        } | null;
        hasSchedule?: boolean;
        isDayOff?: boolean;
        error?: string;
        error_code?: string;
      }>(
        this.apiUrl.build('rest/v1/rpc/process_timelog'),
        {
          p_employee_id: employeeId,
          p_company_id: companyId,
          p_branch_id: branchId,
          p_type: type,
          p_ip: this.getIP(),
          p_invalid_ip: this.IP_BYPASS_EMPLOYEE_IDS.has(employeeId) ? false : !this.validIP(),
          ...(authMethod ? { p_auth_method: authMethod } : {}),
        },
        { observe: 'response' }
      )
      .pipe(
        catchError((error) => {
          this.isProcessing.set(false);
          playFailureSound();
          console.error('Error al procesar timelog:', error);

          let errorMessage = 'Algo salió mal, intente nuevamente';
          if (error?.error?.message) {
            errorMessage = `Error: ${error.error.message}`;
          } else if (error?.message) {
            errorMessage = `Error: ${error.message}`;
          }

          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 10000,
          });
          return EMPTY;
        })
      )
      .subscribe({
        next: (
          response: HttpResponse<{
            success: boolean;
            timelog_id?: string;
            delay?: number | null;
            exitDiff?: { minutes: number; isEarly: boolean } | null;
            lunchEndDiff?: number | null;
            lunchExceededMinutes?: number | null;
            schedule?: {
              id: string;
              name: string;
              entry_time: string;
              exit_time: string;
              day_off: boolean;
              minutes_tolerance: number;
            } | null;
            hasSchedule?: boolean;
            isDayOff?: boolean;
            error?: string;
            error_code?: string;
          }>
        ) => {
          const result = response.body;
          if (!result) {
            this.isProcessing.set(false);
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Respuesta inválida del servidor (sin body).',
              life: 10000,
            });
            return;
          }

          // Verificar si la RPC retornó error
          if (!result.success) {
            this.isProcessing.set(false);
            playFailureSound();
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: result.error || 'Error al procesar la marcación',
              life: 10000,
            });
            return;
          }

          const typeLabel =
            this.types.find((t) => t.value === type)?.label || type;

          // Calcular tardanza desde el RPC result
          const delayMinutes = result.delay || 0;
          const isLate = delayMinutes > 0 && type === 'entry';
          const isVeryLate = delayMinutes >= 60;

          // Build delay text
          let delayText = '';
          if (isLate) {
            const hoursLate = Math.floor(delayMinutes / 60);
            const minutesLate = delayMinutes % 60;
            if (hoursLate > 0 && minutesLate > 0) {
              delayText = `${hoursLate} hora${hoursLate > 1 ? 's' : ''} y ${minutesLate} minuto${minutesLate !== 1 ? 's' : ''}`;
            } else if (hoursLate > 0) {
              delayText = `${hoursLate} hora${hoursLate > 1 ? 's' : ''}`;
            } else if (minutesLate > 0) {
              delayText = `${minutesLate} minuto${minutesLate !== 1 ? 's' : ''}`;
            } else {
              delayText = 'menos de 1 minuto';
            }
          }

          // Check if today is the employee's birthday
          const isBirthday = this.isTodayBirthday(birthDate);

          // Calculate exit diff for punctuality detection
          let exitDiffMinutes: number | undefined;
          if (type === 'exit' && result.schedule?.exit_time) {
            const exitParts = result.schedule.exit_time.split(':');
            const scheduledExit = parseInt(exitParts[0]) * 60 + parseInt(exitParts[1]);
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            exitDiffMinutes = currentMinutes - scheduledExit;
          }

          // Detect lunch overtime (> 60 minutes)
          const isLunchOvertime = type === 'lunch_end' && result.lunchExceededMinutes && result.lunchExceededMinutes > 0;

          const phrase = this.phrases.getPhrase(isLate, isBirthday, type, exitDiffMinutes);
          const timeFormatted = format(new Date(), 'h:mm:ss aaa');

          // Reproducir sonido según contexto
          if (isBirthday) {
            playBirthdaySound();
          } else if (isLunchOvertime) {
            playLateSound(); // Sad trumpet for lunch overtime
          } else if (isLate) {
            playLateSound();
          } else {
            playSuccessSound(employeeId);
          }

          this.isProcessing.set(false);

          // Immediately reset form fields so button is disabled during modal display
          this.form.get('otp')?.reset();
          this.form.get('employee')?.reset();

          // Show custom modal
          this.confirmModalData.set({
            phrase,
            isLate,
            delayText,
            isVeryLate,
            typeLabel,
            time: timeFormatted,
            isBirthday,
            employeeName,
            isLunchOvertime: !!isLunchOvertime,
            lunchExceededMinutes: result.lunchExceededMinutes || 0,
          });
          this.confirmModalExiting.set(false);
          this.confirmModalVisible.set(true);

          // Auto-dismiss: 10 seconds for birthday, 6 seconds for regular
          this.confirmModalTimer = setTimeout(() => {
            this.dismissConfirmModal();
          }, isBirthday ? 10000 : 6000);
        },
        error: () => {
          playFailureSound();
          this.isProcessing.set(false);
        },
      });
  }

  /** Dismiss the success confirmation modal */
  public dismissConfirmModal(): void {
    if (!this.confirmModalVisible()) return;

    if (this.confirmModalTimer) {
      clearTimeout(this.confirmModalTimer);
      this.confirmModalTimer = undefined;
    }

    // Trigger exit animation
    this.confirmModalExiting.set(true);

    setTimeout(() => {
      this.confirmModalVisible.set(false);
      this.confirmModalExiting.set(false);
      this.confirmModalData.set(null);

      // Form was already reset on success response
      this.showKeypad.set(false);
      if (!this.validIP()) {
        // Don't show IP warning - already handled
        this.alertInvalidIP();
      }
    }, 300);
  }

  /** Check if a date string represents today's birthday (same day+month) */
  private isTodayBirthday(birthDate?: string): boolean {
    if (!birthDate) return false;
    try {
      const today = new Date();
      const birth = new Date(birthDate);
      return birth.getDate() === today.getDate() && birth.getMonth() === today.getMonth();
    } catch {
      return false;
    }
  }

  private alertInvalidIP() {
    this.confirmation.confirm({
      message: `La IP actual no coincide con la IP de ninguna sucursal, por favor verifique con Recursos Humanos`,
      header: 'Advertencia',
      key: 'confirm2',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Aceptar',
      rejectVisible: false,
    });
  }
}
