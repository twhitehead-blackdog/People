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
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { differenceInMinutes, format, getHours, getMinutes, getSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import * as OTPAuth from 'otpauth';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputOtp } from 'primeng/inputotp';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { catchError, EMPTY, firstValueFrom, forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Branch,
  Company,
  EmergencyTimelog,
  Employee,
  EmployeeSchedule,
  NazBranch,
  NazCompany,
  NazSchedule,
  Schedule,
  TimeLog,
  TimelogType,
} from './models';
import { TrimPipe } from './pipes/trim.pipe';
import { ApiUrlService } from './services/api-url.service';
import { DiagnosticService } from './services/diagnostic.service';
import { IpMonitorService } from './services/ip-monitor.service';
import { DeviceFingerprintService } from './shared/services/device-fingerprint.service';
import { OrganizationService } from './services/organization.service';
import { PunchQueueService } from './services/punch-queue.service';
import { TimeclockPhrasesService } from './services/timeclock-phrases.service';
import { TimeclockDebugService, RandomEffect } from './services/timeclock-debug.service';
import { TimeSyncService } from './services/time-sync.service';
import { WebAuthnService } from './services/webauthn.service';
import { DpFingerprintService } from './services/dp-fingerprint.service';
import { DpEnrollDialogComponent } from './components/dp-enroll-dialog.component';
import { DogAnimationComponent } from './dashboard/components/dog.component';
import { CatAnimationComponent } from './dashboard/components/cat.component';
import { NewsTickerComponent } from './shared/components/news-ticker.component';
import { DpInstallHelpModalComponent } from './shared/components/dp-install-help-modal.component';
import { AuthenticatorEnrollmentComponent } from './dashboard/authenticator-enrollment/authenticator-enrollment.component';
import { FaceEnrollKioskComponent } from './timeclock/face-enroll-kiosk.component';
import { KioskExtrasComponent } from './timeclock/kiosk-extras.component';
import { FaceClockModalComponent, FaceClockSuccess } from './shared/components/face-clock-modal.component';
import {
  initAudioContext,
  playEffectSound,
  vibrateForMarking,
  playFailureSound,
  playLateSound,
  playSuccessSound,
  playBirthdaySound,
  playVipSound,
  playMatrixConfirmSound,
  playBatmanConfirmSound,
  playStarWarsConfirmSound,
  playCorridosConfirmSound,
  playWatchDogsConfirmSound,
} from './timeclock/timeclock-audio.utils';
import {
  calculateEntryDelay,
  calculateExitDifference,
  calculateLunchExcess,
  calculateStreak,
  formatTimeDifference,
  getAvailableTypes,
  getNextTimelogType,
} from './timeclock/timeclock-calculations.utils';

interface TimeclockInfoData {
  entryTime: string | null;
  scheduledEntryTime: string | null;
  entryDelayMinutes: number | null;      // >0 = tarde, <0 = temprano, null = sin horario o sin marcación
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
  selector: 'pt-timeclock',
  host: { '[class.kiosk-fullscreen]': 'isKioskMode()' },
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
    NewsTickerComponent,
    DogAnimationComponent,
    DpEnrollDialogComponent,
    DpInstallHelpModalComponent,
    AuthenticatorEnrollmentComponent,
    FaceEnrollKioskComponent,
    FaceClockModalComponent,
    KioskExtrasComponent,
  ],
  providers: [ConfirmationService],
  template: `<p-toast />
    <pt-kiosk-extras [class.kx-non-kiosk]="!isKioskMode()" />

    <!-- Acceso directo al Portal de Soporte y "Usar PIN" (top-right).
         "Usar PIN" SOLO en kiosk + face-first; Soporte siempre visible.
         Cuando no estamos en kiosk, el botón Soporte queda como un FAB normal. -->
    <div class="tc-fab-group" [class.tc-fab-group--non-kiosk]="!isKioskMode()">
      @if (isKioskMode() && faceFirstMode()) {
        <button type="button" class="soporte-fab" (click)="toggleShowPin()" title="Marcar con PIN">
          <i class="pi pi-key"></i>
          <span>Usar PIN</span>
        </button>
      }
      <a href="/soporte" class="soporte-fab" title="Portal de Soporte">
        <i class="pi pi-headphones"></i>
        <span>Soporte</span>
      </a>
    </div>

    <!-- ── Pending punches banner ─────────────────────────────────────
         Aparece automáticamente si quedaron marcaciones de emergencia sin
         sincronizar. Es persistente (no se cierra hasta que la cola está vacía)
         para que el operador/encargado lo vea SIEMPRE y pueda forzar el sync.
         Evita el problema del 19/05/2026 donde el toast amarillo "guardada
         localmente" se perdía y nadie sabía que había punches pendientes.
    -->
    @if (punchQueue.pendingCount() > 0) {
      <div class="punch-queue-banner" role="alert" aria-live="polite">
        <div class="punch-queue-banner__inner">
          <i class="pi pi-exclamation-triangle punch-queue-banner__icon"></i>
          <div class="punch-queue-banner__text">
            <strong>{{ punchQueue.pendingCount() }}</strong>
            marcación(es) pendiente(s) de sincronizar.
            @if (punchQueue.syncing()) {
              <span class="punch-queue-banner__sub">Sincronizando…</span>
            } @else {
              <span class="punch-queue-banner__sub">El sistema reintentará solo cada 30s. Si tienes red, presiona "Sincronizar ahora".</span>
            }
          </div>
          <button
            type="button"
            class="punch-queue-banner__btn"
            (click)="manualDrainQueue()"
            [disabled]="punchQueue.syncing()">
            <i class="pi pi-refresh"></i>
            Sincronizar ahora
          </button>
        </div>
      </div>
    }

    <app-dp-enroll-dialog
      [employeeId]="selfEnrollEmployeeId()"
      [employeeName]="selfEnrollEmployeeName()"
      [selfMode]="true"
      [show]="showSelfEnrollDialog()"
      (completed)="onSelfEnrollCompleted()"
      (closed)="onSelfEnrollClosed()"
    />

    <!-- Aviso temporal: inconvenientes resueltos -->
    @if (showOutageNoticeModal()) {
      <div class="confirm-modal-overlay" (click)="dismissOutageNotice()">
        <div class="ip-warning-card" (click)="$event.stopPropagation()" style="max-width: 480px;">
          <div class="restricted-icon-wrap">
            <div class="ip-warning-icon" style="background: rgba(34,197,94,0.15); color: #22c55e;">
              <i class="pi pi-check-circle"></i>
            </div>
          </div>
          <div class="ip-warning-title">Inconvenientes resueltos</div>
          <div class="ip-warning-desc" style="text-align: left; line-height: 1.5;">
            Pedimos disculpas por la falla del reloj de marcaciones de hoy. Ya quedó corregido.
            <br><br>
            <strong>Si no pudiste marcar entrada/salida/almuerzo</strong>, por favor envía el reporte de las marcaciones faltantes a tu supervisor o a RRHH para que las ingresemos manualmente en el sistema.
            <br><br>
            Gracias por su paciencia.
          </div>
          <button class="ip-warning-btn" (click)="dismissOutageNotice()">Entendido</button>
        </div>
      </div>
    }

    <!-- IP Warning Modal -->
    @if (ipWarningVisible()) {
      <div class="confirm-modal-overlay" (click)="dismissIpWarning()">
        <div class="ip-warning-card" [class.ip-warning-exit]="ipWarningExiting()">
          <div class="restricted-icon-wrap">
            <div class="ip-warning-icon">
              <i class="pi pi-wifi"></i>
            </div>
          </div>
          <div class="ip-warning-title">IP no reconocida</div>
          <div class="ip-warning-desc">
            Tu IP actual no coincide con ninguna sucursal registrada. La marcación se guardará con IP no válida.
          </div>
          @if (currentIP()) {
            <div class="restricted-ip-badge">
              <span class="restricted-ip-label">IP detectada</span>
              <span class="restricted-ip-value" style="color: rgba(251, 191, 36, 0.9);">{{ currentIP() }}</span>
            </div>
          }
          <button class="ip-warning-btn" (click)="dismissIpWarning()">Entendido</button>
        </div>
      </div>
    }

    <!-- Success Confirmation Modal — versión profesional sin efectos.
         Diseño limpio: ícono, nombre, tipo de marcación, hora, alertas, progress bar. -->
    @if (confirmModalVisible()) {
      <div class="confirm-modal-overlay" (click)="dismissConfirmModal()">
        <div class="confirm-modal-card confirm-modal-card--pro"
          [class.confirm-modal-exit]="confirmModalExiting()"
          [class.is-late]="confirmModalData()?.isLate"
          (click)="$event.stopPropagation()">

          <!-- Icon: solo check verde o reloj naranja si tarde -->
          <div class="confirm-modal-icon-wrap">
            @if (confirmModalData()?.isLate) {
              <div class="confirm-modal-icon confirm-modal-icon--late">
                <i class="pi pi-clock"></i>
              </div>
            } @else {
              <div class="confirm-modal-icon confirm-modal-icon--success">
                <i class="pi pi-check"></i>
              </div>
            }
          </div>

          <!-- Nombre empleado -->
          @if (confirmModalData()?.employeeName) {
            <div class="confirm-modal-employee">
              {{ confirmModalData()?.employeeName }}
            </div>
          }

          <!-- Tipo de marcación -->
          <div class="confirm-modal-title">
            {{ confirmModalData()?.typeLabel }} registrada
          </div>

          <!-- Hora -->
          <div class="confirm-modal-time">
            {{ confirmModalData()?.time }}
          </div>

          <!-- Tardanza -->
          @if (confirmModalData()?.isLate) {
            <div class="confirm-modal-late-box" [class.very-late]="confirmModalData()?.isVeryLate">
              <div class="confirm-modal-late-header">
                <i class="pi pi-exclamation-triangle"></i>
                <span>Llegó tarde</span>
              </div>
              <div class="confirm-modal-late-detail">
                {{ confirmModalData()?.delayText }}
              </div>
            </div>
          }

          <!-- Almuerzo excedido -->
          @if (confirmModalData()?.isLunchOvertime) {
            <div class="confirm-modal-late-box">
              <div class="confirm-modal-late-header">
                <i class="pi pi-clock"></i>
                <span>Almuerzo excedido</span>
              </div>
              <div class="confirm-modal-late-detail">
                +{{ confirmModalData()?.lunchExceededMinutes }} min sobre lo permitido
              </div>
            </div>
          }

          <!-- Progress bar -->
          <div class="confirm-modal-progress-track">
            <div class="confirm-modal-progress-bar"
              [class.is-late]="confirmModalData()?.isLate"></div>
          </div>
        </div>
      </div>
    }

    <!-- Info Modal -->
    @if (infoModalVisible()) {
      <div class="info-modal-overlay" (click)="closeInfoModal()">
        <div class="info-modal-card" (click)="$event.stopPropagation()">
          <div class="info-modal-header">
            @if (infoModalStep() === 'pin' || infoModalStep() === 'loading') {
              <div class="info-modal-title"><i class="pi pi-lock"></i> Verificar identidad</div>
            } @else if (infoModalData(); as info) {
              <div class="info-modal-title-name">
                <div class="info-modal-avatar"><i class="pi pi-user"></i></div>
                <div>
                  <div class="info-modal-name">{{ info.employeeName }}</div>
                  <div class="info-modal-name-sub">Jornada de hoy</div>
                </div>
              </div>
            }
            <button type="button" class="info-modal-close-btn" (click)="closeInfoModal()"><i class="pi pi-times"></i></button>
          </div>
          @if (infoModalStep() === 'pin') {
            <div class="info-pin-section">
              <!-- Hidden input captures physical keyboard -->
              <input #infoPinInput type="tel" inputmode="numeric"
                     class="info-pin-hidden-input"
                     [value]="infoOtp()"
                     maxlength="6"
                     autocomplete="one-time-code"
                     (keydown)="onInfoPinKeydown($event)"
                     (click)="$event.stopPropagation()" />
              <div class="info-pin-title">
                Ingrese su PIN
                <button type="button" class="info-pin-help" (click)="togglePinHelp()">?</button>
              </div>
              @if (showPinHelp()) {
                <div class="info-pin-help-text">
                  <i class="pi pi-info-circle"></i>
                  El PIN es el código de 6 dígitos de su app de autenticación (Google Authenticator). Si no tiene uno, contacte a Recursos Humanos.
                </div>
              }
              <div class="info-pin-dots">
                @for (i of [0,1,2,3,4,5]; track i) {
                  <div class="info-pin-dot" [class.filled]="infoOtp().length > i" [class.error]="!!infoOtpError()"></div>
                }
              </div>
              @if (infoOtpError()) {
                <div class="info-pin-error">{{ infoOtpError() }}</div>
              }
              <div class="info-keypad">
                <div class="grid grid-cols-3 gap-2">
                  @for (num of ['1','2','3','4','5','6','7','8','9']; track num) {
                    <button type="button" class="info-keypad-btn" (click)="addDigitToInfoOtp(num)">{{ num }}</button>
                  }
                  <button type="button" class="info-keypad-btn info-keypad-clear" (click)="clearInfoOtp()">
                    <i class="pi pi-ban text-sm"></i>
                  </button>
                  <button type="button" class="info-keypad-btn" (click)="addDigitToInfoOtp('0')">0</button>
                  <button type="button" class="info-keypad-btn info-keypad-del" (click)="deleteFromInfoOtp()">
                    <i class="pi pi-delete-left text-sm"></i>
                  </button>
                </div>
              </div>
            </div>
          } @else if (infoModalStep() === 'loading') {
            <div class="info-modal-loading">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Cargando...</span>
            </div>
          } @else if (infoModalStep() === 'info' && infoModalData(); as info) {
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
                <div class="info-row-icon entry-icon" [ngClass]="info.entryDelayMinutes !== null && info.entryDelayMinutes > 0 ? 'entry-late' : ''">
                  <i class="pi pi-sign-in"></i>
                </div>
                <div style="flex:1">
                  <div class="info-row-label">Entrada</div>
                  <div class="info-row-val-row">
                    @if (info.entryTime) {
                      <span class="info-row-val">{{ info.entryTime }}</span>
                    } @else {
                      <span class="info-row-val muted-val">Sin marcar</span>
                    }
                    @if (info.scheduledEntryTime) {
                      <span class="info-scheduled">· prog. {{ info.scheduledEntryTime }}</span>
                    }
                  </div>
                  @if (info.entryDelayMinutes !== null) {
                    @if (info.entryDelayMinutes > 0) {
                      <div class="info-row-sub warn-text">
                        <i class="pi pi-clock" style="font-size:0.65rem"></i>
                        Tarde {{ info.entryDelayMinutes }} min
                      </div>
                    } @else if (info.entryDelayMinutes < 0) {
                      <div class="info-row-sub ok-text">
                        <i class="pi pi-check" style="font-size:0.65rem"></i>
                        A tiempo ({{ absMinutes(info.entryDelayMinutes) }} min antes)
                      </div>
                    } @else {
                      <div class="info-row-sub ok-text">A tiempo</div>
                    }
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
      [ngClass]="{
        'naz-theme': isNazCompany(),
        'blackdog-theme': isBlackDogCompany(),
        'timeclock-mobile-kiosk': isMobileKiosk(),
        'matrix-mode': matrixMode(),
        'moto-mode': motoMode(),
        'batman-mode': batmanMode(),
        'starwars-mode': starwarsMode(),
        'corridos-mode': corridosMode(),
        'watchdogs-mode': watchdogsMode()
      }"
      style="width: 100%; position: relative;"
    >
      <!-- Matrix rain canvas -->
      <canvas #matrixCanvas class="matrix-canvas" [class.matrix-canvas--active]="matrixMode()" aria-hidden="true"></canvas>

      <!-- Moto road canvas (Gustavo only) -->
      <canvas #motoCanvas class="moto-canvas" [class.moto-canvas--active]="motoMode()" aria-hidden="true"></canvas>

      <!-- Batman Gotham canvas (Eder only) -->
      <canvas #batmanCanvas class="batman-canvas" [class.batman-canvas--active]="batmanMode()" aria-hidden="true"></canvas>

      <!-- Star Wars canvas (Ricardo only) -->
      <canvas #starwarsCanvas class="starwars-canvas" [class.starwars-canvas--active]="starwarsMode()" aria-hidden="true"></canvas>

      <!-- Corridos canvas (Liliana only) -->
      <canvas #corridosCanvas class="corridos-canvas" [class.corridos-canvas--active]="corridosMode()" aria-hidden="true"></canvas>

      <!-- Watch Dogs ctOS canvas (Tristan only) -->
      <canvas #watchdogsCanvas class="watchdogs-canvas" [class.watchdogs-canvas--active]="watchdogsMode()" aria-hidden="true"></canvas>

      <!-- Animated background orbs -->
      <div class="bg-orbs" aria-hidden="true">
        <div class="bg-orb bg-orb--1"></div>
        <div class="bg-orb bg-orb--2"></div>
        <div class="bg-orb bg-orb--3"></div>
        <div class="bg-orb bg-orb--4"></div>
      </div>

      @if (!isKioskMode() || isIPValid() || isNazCompany()) {
      <div
        class="flex flex-col gap-2 sm:gap-3 md:gap-4 items-center px-4 sm:px-6 md:px-8 relative z-10 timeclock-content"
      >
        @if (isKioskMode()) {
        <img
          [src]="isNazCompany() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
          class="h-6 sm:h-8 md:h-10 w-auto object-contain drop-shadow-2xl relative z-10 mb-1 sm:mb-2 flex-shrink-0"
          style="max-width: 90%; height: auto;"
        />
        }
        <pt-news-ticker class="w-full max-w-lg" [variant]="isKioskMode() ? 'kiosk' : 'default'" />
        <div [class.tc-row-wide]="faceFirstMode()" class="w-full flex flex-col items-center" style="gap: 1rem;">
        <p-card class="w-full max-w-lg mx-auto timeclock-card relative z-10" [class.special-mode]="specialMode()" [class.matrix-card]="matrixMode()" [class.moto-card]="motoMode()" [class.batman-card]="batmanMode()" [class.starwars-card]="starwarsMode()" [class.corridos-card]="corridosMode()" [class.watchdogs-card]="watchdogsMode()">
          <ng-template #title>
            <div class="flex flex-col items-center py-1 gap-1">
              <div class="greeting-msg" [class.greeting-special]="greetingMessage().text.startsWith('¡')">
                {{ greetingMessage().text }}
              </div>
              <div class="clock-hero-time" [class.blackdog-accent]="isBlackDogCompany()" [class.special-pulse]="specialMode()" [class.matrix-time]="matrixMode()" [class.moto-time]="motoMode()" [class.batman-time]="batmanMode()" [class.starwars-time]="starwarsMode()" [class.corridos-time]="corridosMode()" [class.watchdogs-time]="watchdogsMode()">
                {{ formattedTime() }}
              </div>
              <div class="clock-hero-date">
                {{ formattedDate() }}
              </div>
            </div>
          </ng-template>

          <!-- Subtítulo: debajo del chip del lector -->
          <div class="clock-subtitle">Seleccione sucursal y empleado</div>
          @if (ipOverrideActive() && ipOverrideManager()) {
            <div class="ip-override-badge">
              <i class="pi pi-shield"></i>
              IP habilitada · {{ ipOverrideManager()!.name }} · {{ ipOverrideCountdownDisplay() }}
            </div>
          }
          <form
            [formGroup]="form"
            class="flex flex-col gap-2.5 sm:gap-3 md:gap-4 items-center w-full"
            (keydown.enter)="onEnterKey($event)"
          >
            @if (!form.get('company_id')?.value) {
            <div class="input-container w-full">
              <p-select
                formControlName="company_id"
                [options]="currentCompaniesResource()"
                placeholder="Seleccionar empresa"
                optionLabel="name"
                optionValue="id"
                filter
                filterBy="name"
                
                class="w-full"
                [styleClass]="'w-full'"
              />
            </div>
            } @if (form.get('company_id')?.value) {
            <div class="input-container w-full">
              @if (!canChangeBranch() && currentBranchName()) {
                <div class="branch-name-badge">
                  <i class="pi pi-map-marker"></i>
                  <span class="branch-name-badge__name">{{ currentBranchName() }}</span>
                </div>
              } @else {
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
              }
            </div>
            }
            <div
              class="input-container w-full"
              [ngClass]="{
                'error-border':
                  form.get('employee')?.invalid && form.get('employee')?.touched
              }"
            >
              <p-select
                formControlName="employee"
                [options]="currentEmployeesResource()"
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

            <!-- Banner: empleado sin Authenticator -->
            @if (selectedEmployee() && needsEnrollment()) {
              <div class="w-full" style="
                display:flex; align-items:center; gap:0.6rem;
                padding:0.65rem 0.85rem; margin-bottom: 0.5rem;
                background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.4);
                border-radius: 0.5rem; color: #fbbf24; font-size: 0.78rem;
              ">
                <i class="pi pi-exclamation-triangle"></i>
                <div style="flex:1">
                  <strong>Sin Authenticator</strong> — un gerente debe configurar el acceso.
                </div>
                <p-button
                  label="Configurar"
                  icon="pi pi-shield"
                  size="small"
                  severity="warn"
                  (onClick)="openEnrollment()"
                />
              </div>
            }

            <!-- Banner: empleado con use_face=true pero sin rostro enrolado -->
            @if (selectedEmployee() && needsFaceEnrollment()) {
              <div class="w-full" style="
                display:flex; align-items:center; gap:0.6rem;
                padding:0.65rem 0.85rem; margin-bottom: 0.5rem;
                background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.4);
                border-radius: 0.5rem; color: #60a5fa; font-size: 0.78rem;
              ">
                <i class="pi pi-camera"></i>
                <div style="flex:1">
                  <strong>Sin rostro enrolado</strong> — un gerente debe capturar el rostro.
                </div>
                <p-button
                  label="Enrolar rostro"
                  icon="pi pi-camera"
                  size="small"
                  severity="info"
                  (onClick)="openFaceEnrollment()"
                />
              </div>
            }

            <!-- Auth Method Toggle: solo visible si fingerprintFeatureEnabled. -->
            @if (selectedEmployee() && fingerprintFeatureEnabled()) {
              <div class="auth-method-toggle w-full">
                <button type="button" class="auth-method-btn" [class.auth-method-btn--active]="authMethod() === 'pin'" (click)="authMethod.set('pin')">
                  <i class="pi pi-shield"></i> PIN
                </button>
                @if (employeeHasDp() && !dpReaderConnected()) {
                  <button type="button" class="auth-method-btn auth-method-btn--disabled" disabled
                          title="Lector de huellas no detectado en esta PC">
                    <i class="pi pi-fingerprint"></i> Huella (lector off)
                  </button>
                } @else if (employeeHasFingerprint() || employeeHasDp()) {
                  <button type="button" class="auth-method-btn" [class.auth-method-btn--active]="authMethod() === 'fingerprint'" (click)="authMethod.set('fingerprint')">
                    <i class="pi pi-fingerprint"></i> Huella
                  </button>
                }
              </div>
            }

            <!-- PIN Input Section: visible siempre que authMethod sea 'pin'.
                 Si el empleado tiene rostro enrolado y estamos en faceFirstMode,
                 ocultamos el PIN (excepto si el user clickeó "usar PIN" => showPinFlow). -->
            @if (authMethod() === 'pin' && !(faceFirstMode())) {
            <div
              class="w-full flex flex-col gap-0.5 sm:gap-1 items-center justify-center px-2"
            >
              <label
                class="text-gray-300 font-medium text-[11px] sm:text-xs md:text-sm text-center mb-1"
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
                <button
                  type="button"
                  class="otp-side-btn"
                  (click)="toggleKeypad()"
                  [class.otp-side-btn--active]="showKeypadPanel()"
                  title="Abrir teclado numérico"
                >
                  <i class="pi pi-th-large"></i>
                </button>
              </div>

              <!-- Lector status chip (sólo si la feature de huella está activa).
                   Info button oculto a pedido del usuario. -->
              @if (fingerprintFeatureEnabled()) {
                <div class="w-full flex items-center gap-2 mt-1">
                  <button type="button"
                          class="dp-status-chip dp-status-chip--inline flex-1"
                          [class.dp-status-chip--off]="!dpReaderConnected()"
                          [class.dp-status-chip--clickable]="!dpReaderConnected()"
                          (click)="!dpReaderConnected() && openDpInstallHelp()">
                    <span class="dp-status-dot"></span>
                    <i class="pi pi-fingerprint"></i>
                    <span class="dp-status-text">{{ dpReaderConnected() ? 'Lector conectado' : 'Lector desconectado' }}</span>
                  </button>
                </div>
              }
            </div>
            }

            <!-- Fingerprint Section: solo si la huella es usable
                 (WebAuthn siempre, DP sólo cuando el lector está conectado) -->
            @if (fingerprintFeatureEnabled() && authMethod() === 'fingerprint' && (employeeHasFingerprint() || (employeeHasDp() && dpReaderConnected()))) {
              <div class="w-full flex flex-col items-center gap-3 px-2">
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
                    } @else if (selectedEmployee() && form.get('type')?.value) {
                      Coloca tu dedo en el lector
                    } @else if (!selectedEmployee()) {
                      Selecciona empleado
                    } @else {
                      Selecciona tipo de marcación
                    }
                  </p>
                } @else {
                  <div class="fingerprint-noreg-box">
                    <i class="pi pi-fingerprint" style="font-size:2rem;color:rgba(251,191,36,0.5)"></i>
                    <p class="text-xs text-gray-400 text-center">
                      No hay huella registrada. Solicita el registro a un administrador.
                    </p>
                  </div>
                }
              </div>
            }

            <!-- Submit Button -->
            <div class="w-full">
              <p-button
                [disabled]="
                  isProcessing() || isLoadingType() || !selectedEmployee() || !form.get('type')?.value ||
                  (authMethod() === 'pin' && form.get('otp')?.invalid)
                "
                [loading]="isProcessing() || isLoadingType()"
                (onClick)="authMethod() === 'fingerprint' ? validateFingerprint() : validateOtp()"
                [label]="isLoadingType() ? 'Cargando...' : (isProcessing() ? 'Procesando...' : 'Marcar Asistencia')"
                [icon]="
                  isProcessing()
                    ? 'pi pi-spin pi-spinner'
                    : 'pi pi-check-circle'
                "
                [size]="'large'"
                [styleClass]="'mark-button w-full'"
                [style]="{ border: 'none', width: '100%' }"
              />
            </div>

            <!-- Botón "Marcar con cara" (mobile / pantalla angosta).
                 C4 fix: dependemos del flag por-empleado en kiosk, no de
                 companyHasFaceEnrolments (que requiere JWT y no funciona en kiosk
                 anónimo). Si el empleado seleccionado tiene rostro enrolado activo,
                 el botón aparece y el modal puede usar su work_email como caller. -->
            @if ((selectedEmployeeHasFace() || companyHasFaceEnrolments()) && !isDesktopWide()) {
              <div class="w-full" style="margin-top: 0.5rem;">
                <p-button
                  [disabled]="isProcessing() || isLoadingType() || !form.get('type')?.value"
                  (onClick)="openFaceModal()"
                  label="Marcar con cara"
                  icon="pi pi-user"
                  [size]="'large'"
                  [styleClass]="'w-full'"
                  severity="secondary"
                  [outlined]="true"
                  [style]="{ width: '100%' }"
                />
              </div>
            }
            @if (faceFirstMode()) {
              <div class="w-full text-center" style="margin-top: 0.5rem;">
                <button type="button"
                  style="background: transparent; border: none; color: #71717a; font-size: 0.8rem; cursor: pointer; text-decoration: underline;"
                  (click)="toggleShowPin()">
                  ¿Problemas con la cara? Usar PIN
                </button>
              </div>
            }

            <!-- Validation Messages -->
            @if (form.get('employee')?.invalid && form.get('employee')?.touched)
            {
            <div
              class="text-gray-400 text-[11px] sm:text-xs text-center w-full mt-1 px-2"
            >
              Debe seleccionar un empleado para continuar.
            </div>
            }
          </form>
        </p-card>

        <!-- Panel face inline (desktop wide). Sin esperar enrolments — se valida en server. -->
        @if (faceFirstMode()) {
          <div class="tc-face-panel">
            <pt-face-clock-modal
              [open]="true"
              [displayMode]="'inline'"
              [type]="$any(form.get('type')?.value || 'entry')"
              [branchId]="form.get('branch_id')?.value || null"
              [callerEmailInput]="selectedEmployee()?.work_email || null"
              (success)="onFaceClockSuccess($event)"
              (closed)="facePanelOpen.set(false)"
            />
          </div>
        }
        </div><!-- /tc-row-wide -->
      </div>
      } @else {
      <!-- Restricted access screen -->
      <div class="restricted-screen">
        <div class="restricted-card">
          <!-- Icon -->
          <div class="restricted-icon-wrap">
            <div class="restricted-icon">
              <i class="pi pi-lock"></i>
            </div>
          </div>

          <div class="restricted-title">Acceso Restringido</div>
          <div class="restricted-desc">
            Tu dirección IP no está en la lista de IPs permitidas para el modo kiosko.
          </div>

          <!-- IP badge -->
          @if (currentIP()) {
          <div class="restricted-ip-badge">
            <span class="restricted-ip-label">IP detectada</span>
            <span class="restricted-ip-value">{{ currentIP() }}</span>
          </div>
          }

          <!-- Instructions -->
          <div class="restricted-instructions">
            <div class="restricted-instructions-title">
              <i class="pi pi-wifi"></i> Instrucciones
            </div>
            <p>Conéctate al WiFi de tu sucursal para acceder al modo kiosko. El sistema detectará automáticamente cuando tu IP sea autorizada.</p>
          </div>

          <!-- Manager override button -->
          <button type="button" class="ip-override-btn" (click)="openIpOverrideModal()">
            <i class="pi pi-shield"></i>
            Habilitar con Gerente
          </button>
        </div>
      </div>
      }

      @if (!isKioskMode()) {
        <pt-dog-animation
          [selectedName]="selectedEmployee()?.first_name || ''"
          [selectedPosition]="selectedEmployee()?.position?.name || ''"
          [selectedDept]="selectedEmployee()?.department?.name || ''"
          [selectedGender]="selectedEmployee()?.gender || ''"
        ></pt-dog-animation>
      }
    </div>

    <!-- Manager Override Modal - outside scroll container so position:fixed works correctly -->
    @if (showIpOverrideModal()) {
      <div class="confirm-modal-overlay" (click)="closeIpOverrideModal()">
        <div class="ip-override-modal" [class.ip-override-modal-exit]="ipOverrideModalExiting()" (click)="$event.stopPropagation()">

          @if (ipOverrideStep() === 'search') {
            <!-- Step 1: Select manager -->
            <div class="ip-override-modal-header">
              <div class="ip-override-modal-icon">
                <i class="pi pi-shield"></i>
              </div>
              <div class="ip-override-modal-title">Habilitar con Gerente</div>
              <div class="ip-override-modal-desc">Selecciona el gerente que autoriza las marcaciones por 1 hora</div>
            </div>

            <div class="ip-override-search-wrap">
              <input
                class="ip-override-search-input"
                type="text"
                placeholder="Buscar gerente..."
                [value]="ipOverrideEmployeeSearch()"
                (input)="ipOverrideEmployeeSearch.set($any($event.target).value)"
                autocomplete="off"
              />
              <i class="pi pi-search ip-override-search-icon"></i>
            </div>

            <div class="ip-override-list">
              @if (managersResource.isLoading()) {
                <div class="ip-override-empty">
                  <i class="pi pi-spin pi-spinner"></i> Cargando gerentes...
                </div>
              } @else {
                @for (emp of ipOverrideFilteredEmployees(); track emp.id) {
                  <button type="button" class="ip-override-list-item" (click)="selectManagerEmployee(emp)">
                    <div class="ip-override-list-avatar">
                      {{ (emp.first_name ?? '?')[0].toUpperCase() }}
                    </div>
                    <div class="ip-override-list-info">
                      <span>{{ emp.first_name }} {{ emp.father_name }}</span>
                      @if (!emp.code_uri) {
                        <span class="ip-override-no-pin">Sin PIN configurado</span>
                      }
                    </div>
                    @if (emp.code_uri) {
                      <i class="pi pi-chevron-right ip-override-list-arrow"></i>
                    } @else {
                      <i class="pi pi-lock ip-override-list-arrow" style="color:rgba(239,68,68,0.5)"></i>
                    }
                  </button>
                }
                @if (ipOverrideFilteredEmployees().length === 0) {
                  <div class="ip-override-empty">No se encontraron gerentes</div>
                }
              }
            </div>

            <button type="button" class="ip-override-cancel-btn" (click)="closeIpOverrideModal()">Cancelar</button>
          }

          @if (ipOverrideStep() === 'otp') {
            <!-- Step 2: OTP -->
            <div class="ip-override-modal-header">
              <div class="ip-override-modal-icon ip-override-modal-icon--otp">
                <i class="pi pi-key"></i>
              </div>
              <div class="ip-override-modal-title">Código Autenticador</div>
              <div class="ip-override-modal-desc">
                {{ ipOverrideSelectedEmployee()?.first_name }} {{ ipOverrideSelectedEmployee()?.father_name }}
              </div>
            </div>

            <!-- OTP dots -->
            <div class="ip-override-dots">
              @for (i of [0,1,2,3,4,5]; track i) {
                <div class="ip-override-dot"
                  [class.filled]="ipOverrideOtp().length > i"
                  [class.error]="!!ipOverrideError()">
                </div>
              }
            </div>

            @if (ipOverrideError()) {
              <div class="ip-override-error">{{ ipOverrideError() }}</div>
            }

            <!-- OTP Keypad -->
            <div class="ip-override-keypad">
              <div class="grid grid-cols-3 gap-2">
                @for (num of ['1','2','3','4','5','6','7','8','9']; track num) {
                  <button type="button" class="ip-override-key" (click)="appendOverrideDigit(num)" [disabled]="ipOverrideProcessing()">{{ num }}</button>
                }
                <button type="button" class="ip-override-key ip-override-key--back" (click)="ipOverrideStep.set('search')" [disabled]="ipOverrideProcessing()">
                  <i class="pi pi-arrow-left"></i>
                </button>
                <button type="button" class="ip-override-key" (click)="appendOverrideDigit('0')" [disabled]="ipOverrideProcessing()">0</button>
                <button type="button" class="ip-override-key ip-override-key--del" (click)="deleteOverrideDigit()" [disabled]="ipOverrideProcessing()">
                  <i class="pi pi-delete-left"></i>
                </button>
              </div>
            </div>

            @if (ipOverrideProcessing()) {
              <div class="ip-override-processing">
                <i class="pi pi-spin pi-spinner"></i> Verificando...
              </div>
            }
          }

        </div>
      </div>
    }

    <!-- Emergency Timelog Modal -->
    @if (showEmergencyModal()) {
      <div class="confirm-modal-overlay">
        <div class="emergency-modal" [class.emergency-modal-exit]="emergencyModalExiting()" (click)="$event.stopPropagation()">

          @if (emergencyState() === 'processing') {
            <div class="emergency-header">
              <div class="emergency-icon emergency-icon--processing">
                <i class="pi pi-spin pi-spinner"></i>
              </div>
              <div class="emergency-title">Guardando marcación...</div>
              <div class="emergency-desc">Intentando guardar de forma segura</div>
            </div>
          }

          @if (emergencyState() === 'saved_server') {
            <div class="emergency-header">
              <div class="emergency-icon emergency-icon--success">
                <i class="pi pi-check-circle"></i>
              </div>
              <div class="emergency-title">Marcación de emergencia guardada</div>
              <div class="emergency-desc">Se guardó correctamente en el servidor</div>
            </div>
            <div class="emergency-receipt">
              <div class="emergency-receipt-row">
                <span class="emergency-receipt-label">Empleado</span>
                <span class="emergency-receipt-value">{{ emergencyData()?.employeeName }}</span>
              </div>
              <div class="emergency-receipt-row">
                <span class="emergency-receipt-label">Tipo</span>
                <span class="emergency-receipt-value emergency-receipt-type">{{ emergencyData()?.typeLabel }}</span>
              </div>
              <div class="emergency-receipt-row">
                <span class="emergency-receipt-label">Hora</span>
                <span class="emergency-receipt-value">{{ emergencyData()?.timeDisplay }}</span>
              </div>
              <div class="emergency-receipt-source">
                <i class="pi pi-database"></i> Guardado en servidor
              </div>
            </div>
            <button type="button" class="emergency-close-btn" (click)="closeEmergencyModal()">Cerrar</button>
          }

          @if (emergencyState() === 'saved_local') {
            <div class="emergency-header">
              <div class="emergency-icon emergency-icon--local">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
              <div class="emergency-title">Marcación guardada localmente</div>
              <div class="emergency-desc">El servidor no responde. Se guardó en este dispositivo y el administrador la verá cuando haya conexión.</div>
            </div>
            <div class="emergency-receipt">
              <div class="emergency-receipt-row">
                <span class="emergency-receipt-label">Empleado</span>
                <span class="emergency-receipt-value">{{ emergencyData()?.employeeName }}</span>
              </div>
              <div class="emergency-receipt-row">
                <span class="emergency-receipt-label">Tipo</span>
                <span class="emergency-receipt-value emergency-receipt-type">{{ emergencyData()?.typeLabel }}</span>
              </div>
              <div class="emergency-receipt-row">
                <span class="emergency-receipt-label">Hora</span>
                <span class="emergency-receipt-value">{{ emergencyData()?.timeDisplay }}</span>
              </div>
              <div class="emergency-receipt-source emergency-receipt-source--local">
                <i class="pi pi-desktop"></i> Guardado local — pendiente de sincronización
              </div>
            </div>
            <button type="button" class="emergency-close-btn" (click)="closeEmergencyModal()">Entendido</button>
          }

          @if (emergencyState() === 'error') {
            <div class="emergency-header">
              <div class="emergency-icon emergency-icon--error">
                <i class="pi pi-times-circle"></i>
              </div>
              <div class="emergency-title">No se pudo guardar</div>
              <div class="emergency-desc">{{ emergencyErrorMessage() }}</div>
            </div>
            <button type="button" class="emergency-close-btn" (click)="closeEmergencyModal()">Cerrar</button>
          }

        </div>
      </div>
    }

    <!-- Teclado numérico flotante (popup arrastrable / minimizable) -->
    @if (showKeypadPanel()) {
      <div class="kp-popup"
           [class.kp-popup--minimized]="keypadMinimized()"
           [style.left.px]="keypadX()"
           [style.top.px]="keypadY()"
           [style.right]="keypadX() === null ? '24px' : null"
           [style.bottom]="keypadY() === null ? '24px' : null">
        <div class="kp-popup__header" (pointerdown)="startKeypadDrag($event)">
          <span class="kp-popup__title"><i class="pi pi-th-large"></i> Teclado numérico</span>
          <div class="kp-popup__actions">
            <button type="button" class="kp-popup__icon-btn" (click)="keypadMinimized.set(!keypadMinimized())" [title]="keypadMinimized() ? 'Restaurar' : 'Minimizar'">
              <i class="pi" [ngClass]="keypadMinimized() ? 'pi-window-maximize' : 'pi-minus'"></i>
            </button>
            <button type="button" class="kp-popup__icon-btn kp-popup__icon-btn--close" (click)="showKeypadPanel.set(false); keypadMinimized.set(false)" title="Cerrar">
              <i class="pi pi-times"></i>
            </button>
          </div>
        </div>
        @if (!keypadMinimized()) {
          <div class="kp-popup__body">
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
    }

    <!-- DP install help dialog (shared modal — rendered at template root) -->
    <app-dp-install-help-modal [(show)]="showDpHelp" />

    <!-- Authenticator enrollment wizard -->
    @if (selectedEmployee()) {
      <pt-authenticator-enrollment
        [employee]="enrollmentEmployee()"
        [visible]="enrollmentVisible()"
        (finished)="onEnrollmentFinished()"
        (cancelled)="enrollmentVisible.set(false)"
      />
    }

    <!-- Face enrollment wizard (autoriza con PIN de admin) -->
    @if (selectedEmployee()) {
      <pt-face-enroll-kiosk
        [visible]="faceEnrollmentVisible()"
        [employeeId]="$any(selectedEmployee()?.id) || ''"
        [employeeName]="(selectedEmployee()?.first_name || '') + ' ' + (selectedEmployee()?.father_name || '')"
        (finished)="onFaceEnrollmentFinished()"
        (cancelled)="faceEnrollmentVisible.set(false)"
      />
    }

    <!-- Face Clock Modal (independent: identifica + crea timelog automáticamente) -->
    <pt-face-clock-modal
      [open]="faceModalOpen()"
      [type]="$any(form.get('type')?.value || 'entry')"
      [branchId]="form.get('branch_id')?.value || null"
      [callerEmailInput]="selectedEmployee()?.work_email || null"
      (success)="onFaceClockSuccess($event)"
      (closed)="faceModalOpen.set(false)"
    />`,
  styleUrl: './timeclock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeclockComponent implements OnDestroy {
  private message = inject(MessageService);
  private auth0 = inject(Auth0Service);
  private confirmation = inject(ConfirmationService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private router = inject(Router);
  private ipMonitor = inject(IpMonitorService);
  private organizationService = inject(OrganizationService);
  private timeSync = inject(TimeSyncService);
  private deviceFp = inject(DeviceFingerprintService);
  private destroyRef = inject(DestroyRef);
  private diagnosticService = inject(DiagnosticService);
  private phrases = inject(TimeclockPhrasesService);
  private debugSvc = inject(TimeclockDebugService);
  private webAuthn = inject(WebAuthnService);
  private dp = inject(DpFingerprintService);
  public punchQueue = inject(PunchQueueService);
  public employeeHasDp = signal<boolean>(false);

  /** Employees that can mark from any IP address */
  private readonly IP_BYPASS_EMPLOYEE_IDS = new Set([
    '43cd8574-3c4b-40c2-9824-5f9a4fe68dc8', // Tristan Whitehead
  ]);

  /** Tracks last successful punch timestamp per employee to prevent duplicates within 30s */
  private readonly recentPunches = new Map<string, number>();
  private readonly DISPLAY_TIMEZONE = 'America/Panama';
  // Get IP address - try multiple methods to get real IP even from localhost
  public currentIP = signal<string>('127.0.0.1');
  public petType = signal<'dog' | 'cat'>('dog');
  public isProcessing = signal<boolean>(false);
  public isLoadingType = signal<boolean>(false);
  public showKeypad = signal<boolean>(false);
  public showKeypadPanel = signal<boolean>(false);
  public keypadMinimized = signal<boolean>(false);
  public keypadX = signal<number | null>(null);
  public keypadY = signal<number | null>(null);
  private _kpDrag: { startX: number; startY: number; origX: number; origY: number } | null = null;
  startKeypadDrag(e: PointerEvent): void {
    if (e.button !== undefined && e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    const popup = target.closest('.kp-popup') as HTMLElement | null;
    if (!popup) return;
    const rect = popup.getBoundingClientRect();
    this._kpDrag = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      if (!this._kpDrag) return;
      this.keypadX.set(this._kpDrag.origX + (ev.clientX - this._kpDrag.startX));
      this.keypadY.set(this._kpDrag.origY + (ev.clientY - this._kpDrag.startY));
    };
    const up = (ev: PointerEvent) => {
      this._kpDrag = null;
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  }
  public currentTime = signal<Date>(new Date());
  public availableTypes = signal<Array<{ value: string; label: string }>>([]);
  public currentTypeLabel = computed(() => {
    const val = this.form.get('type')?.value;
    return this.availableTypes().find(t => t.value === val)?.label ?? val ?? '';
  });
  public isKioskMode = signal<boolean>(false);
  public isMobileKiosk = signal<boolean>(false);
  public isIPValid = signal<boolean>(true);

  // Authenticator enrollment wizard
  public enrollmentVisible = signal<boolean>(false);
  public needsEnrollment = computed<boolean>(() => {
    const e: any = this.selectedEmployee();
    // El PIN sigue siendo útil como fallback aunque tenga cara enrolada.
    return !!e && e.authenticator_enrolled === false;
  });

  /** True cuando el empleado tiene use_face=true pero no tiene rostro enrolado. */
  public needsFaceEnrollment = computed<boolean>(() => {
    const e: any = this.selectedEmployee();
    if (!e?.use_face) return false;
    // Si selectedEmployeeHasFace ya fue chequeado por RPC y dio false, falta enrollment
    return !this.selectedEmployeeHasFace();
  });

  /** Modal de enrollment facial desde el kiosk */
  public faceEnrollmentVisible = signal<boolean>(false);
  public openFaceEnrollment(): void { this.faceEnrollmentVisible.set(true); }
  public onFaceEnrollmentFinished(): void {
    this.faceEnrollmentVisible.set(false);
    this.selectedEmployeeHasFace.set(true);
    const e: any = this.selectedEmployee();
    if (e) this.checkEmployeeFaceEnrollment(e.id);
  }
  public enrollmentEmployee = computed(() => {
    const e: any = this.selectedEmployee() || {};
    return {
      id: e.id,
      first_name: e.first_name || '',
      father_name: e.father_name || '',
      code_uri: e.code_uri || null,
      branch_id: e.branch_id || null,
    };
  });
  public openEnrollment() { this.enrollmentVisible.set(true); }
  public onEnrollmentFinished() {
    this.enrollmentVisible.set(false);
    const e: any = this.selectedEmployee();
    if (e) this.selectedEmployee.set({ ...e, authenticator_enrolled: true });
    this.employeesResource.reload();
  }
  public authMethod = signal<'pin' | 'fingerprint'>('pin');
  // Feature flag — fingerprint auth desactivada (2026-05-28). Cambiar a true para reactivar.
  public readonly fingerprintFeatureEnabled = signal(false);
  public employeeHasFingerprint = signal<boolean>(false);

  // Face clock state
  public faceModalOpen = signal<boolean>(false);
  public facePanelOpen = signal<boolean>(true);            // panel inline always open en desktop
  public companyHasFaceEnrolments = signal<boolean>(false); // si hay caras enroladas en la company
  public selectedEmployeeHasFace = signal<boolean>(false); // si el empleado seleccionado tiene rostro enrolado
  public showPinFlow = signal<boolean>(false);              // forzar mostrar PIN si face falla
  public isDesktopWide = signal<boolean>(typeof window !== 'undefined' && window.innerWidth >= 900);
  private resizeWatchHandle: any = null;

  /** Idle-reset del kiosk: si nadie interactúa por 30s, deselecciona empleado
   *  y limpia el form para volver al estado inicial (privacidad + UX). */
  private idleTimer: any = null;
  private readonly IDLE_RESET_MS = 30_000;
  private idleListenerHandle: any = null;
  public resetKioskState(): void {
    if (!this.isKioskMode()) return;
    this.selectedEmployee.set(undefined);
    this.selectedEmployeeHasFace.set(false);
    this.form.get('employee')?.reset();
    this.form.get('otp')?.reset();
    this.form.get('type')?.setValue('entry');
    this.showPinFlow.set(false);
    this.faceModalOpen.set(false);
    this.faceEnrollmentVisible.set(false);
    this.enrollmentVisible.set(false);
  }
  private bumpIdleTimer(): void {
    if (!this.isKioskMode()) return;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.selectedEmployee()) this.resetKioskState();
    }, this.IDLE_RESET_MS);
  }

  // Mostrar panel face inline solo si:
  //  - estamos en desktop wide,
  //  - no se forzó el flow de PIN,
  //  - el empleado seleccionado TIENE rostro enrolado.
  // Si no hay empleado o no está enrolado → no mostrar el panel.
  public faceFirstMode = computed(() =>
    !this.showPinFlow() &&
    this.isDesktopWide() &&
    !!this.selectedEmployee() &&
    this.selectedEmployeeHasFace()
  );

  /** C2 fix: Suscribir Auth0 con takeUntilDestroyed para evitar leaks.
   * Los effect() se mueven al constructor para que estén en injection context.
   * El resize listener se cancela en ngOnDestroy (ver A3 fix). */
  private subscribeAuth0AndFace(): void {
    this.auth0.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((u) => {
        const email = u?.email?.toLowerCase() || null;
        this.callerEmailForFace.set(email);
        if (email) this.checkFaceEnrolments();
      });
    if (typeof window !== 'undefined') {
      this.resizeWatchHandle = () => this.isDesktopWide.set(window.innerWidth >= 900);
      window.addEventListener('resize', this.resizeWatchHandle);
    }
  }

  /** Chequea si un empleado específico tiene rostro enrolado activo.
   * Usa RPC pública porque face_enrollments tiene RLS estricta (current_company_id())
   * y el kiosk corre sin sesión Auth0. */
  private async checkEmployeeFaceEnrollment(employeeId: string): Promise<void> {
    try {
      const url = this.apiUrl.build('rest/v1/rpc/face_has_active_enrollment');
      const res = await firstValueFrom(
        this.http.post<boolean>(url, { p_employee_id: employeeId })
      );
      this.selectedEmployeeHasFace.set(res === true);
    } catch {
      this.selectedEmployeeHasFace.set(false);
    }
  }

  public openFaceModal(): void {
    if (!this.form.get('type')?.value) {
      this.message.add({ severity: 'warn', summary: 'Tipo', detail: 'Seleccioná un tipo de marcación primero.' });
      return;
    }
    this.faceModalOpen.set(true);
  }

  public toggleShowPin(): void { this.showPinFlow.update(v => !v); }

  public callerEmailForFace = signal<string | null>(null);

  /** Chequear si la company tiene rostros enrolados — define el modo face-first */
  private async checkFaceEnrolments(): Promise<void> {
    try {
      const email = this.callerEmailForFace();
      if (!email) return;
      const stats: any = await firstValueFrom(this.http.post(
        this.apiUrl.build('functions/v1/face-stats'),
        { caller_email: email },
      ));
      this.companyHasFaceEnrolments.set((stats?.enrolled_count ?? 0) > 0 && (stats?.cf_health?.ok ?? false));
    } catch { this.companyHasFaceEnrolments.set(false); }
  }

  public onFaceClockSuccess(result: FaceClockSuccess): void {
    this.faceModalOpen.set(false);
    // Mostrar el modal grande de confirmación (mismo que el flow PIN).
    // Antes solo mostraba un toast chico → el usuario no se daba cuenta que
    // la marcación pasó.
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' });
    const typeLabel = this.typeLabel(result.timelog_type);
    this.showConfirmationDialogWithSound(
      `${result.employee_name} · ${typeLabel}`,
      false,
      result.employee_id,
      {
        typeLabel,
        time: timeStr,
        phrase: '',
        delayText: '',
        isVeryLate: false,
        isBirthday: false,
        isVip: false,
        isMatrix: false,
        isMoto: false,
        isBatman: false,
        isStarWars: false,
        isCorridos: false,
        isWatchDogs: false,
        employeeName: result.employee_name || '',
        isLunchOvertime: false,
        lunchExceededMinutes: 0,
      }
    );
    try { playSuccessSound(result.employee_id); } catch { /* no-op */ }
    try { vibrateForMarking(result.timelog_type); } catch { /* no-op */ }
  }

  private typeLabel(t: string): string {
    return ({ entry: 'Entrada', exit: 'Salida', lunch_start: 'Inicio almuerzo', lunch_end: 'Fin almuerzo' } as any)[t] || t;
  }
  // Fallback PIN: si falla la huella, habilitamos PIN aunque el empleado
  // tenga huella enrolada. Reseteamos al cambiar de empleado.
  public fingerprintFailures = signal<number>(0);
  public allowPinFallback = signal<boolean>(false);

  // ── Manager IP Override ────────────────────────────────────────────
  public ipOverrideActive   = signal<boolean>(false);
  public ipOverrideManager  = signal<{id: string; name: string} | null>(null);
  public ipOverrideExpiry   = signal<Date | null>(null);
  public ipOverrideMinutesLeft = computed(() => {
    const expiry = this.ipOverrideExpiry();
    if (!expiry) return 0;
    return Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 60000));
  });
  public ipOverrideCountdownDisplay = computed(() => {
    const expiry = this.ipOverrideExpiry();
    if (!expiry) return '';
    const ms = Math.max(0, expiry.getTime() - this.currentTime().getTime());
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  });
  public showIpOverrideModal          = signal<boolean>(false);
  public ipOverrideModalExiting       = signal<boolean>(false);
  public ipOverrideStep               = signal<'search' | 'otp'>('search');
  public ipOverrideSelectedEmployee   = signal<Partial<Employee> | null>(null);
  public ipOverrideOtp                = signal<string>('');
  public ipOverrideError              = signal<string>('');
  public ipOverrideProcessing         = signal<boolean>(false);
  public ipOverrideEmployeeSearch     = signal<string>('');
  /** Carga solo empleados con permisos de gerente (schedule_admin o admin) */
  public managersResource = httpResource<Array<Partial<Employee> & { positions: { schedule_admin: boolean; admin: boolean } | null }>>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId || !this.showIpOverrideModal()) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/employees'),
      method: 'GET',
      params: {
        select: 'id,first_name,father_name,code_uri,positions(schedule_admin,admin)',
        is_active: 'eq.true',
        company_id: `eq.${companyId}`,
        order: 'first_name',
      },
    };
  });

  public ipOverrideFilteredEmployees = computed(() => {
    const query = this.ipOverrideEmployeeSearch().toLowerCase().trim();
    const all = this.managersResource.value() ?? [];
    // Solo empleados con permisos de gerente
    const managers = all.filter(e => e.positions?.schedule_admin || e.positions?.admin);
    if (!query) return managers.slice(0, 15);
    return managers.filter(e =>
      `${e.first_name ?? ''} ${e.father_name ?? ''}`.toLowerCase().includes(query)
    ).slice(0, 15);
  });
  private ipOverrideCountdownTimer: ReturnType<typeof setInterval> | null = null;
  private readonly IP_OVERRIDE_DURATION_MS = 60 * 60 * 1000; // 1 hour
  private readonly LS_OVERRIDE_KEY = 'bd_kiosk_ip_override';
  // ──────────────────────────────────────────────────────────────────

  // ── Emergency Timelog ───────────────────────────────────────────────
  private readonly LS_EMERGENCY_KEY = 'bd_kiosk_emergency_timelogs';
  public showEmergencyModal = signal<boolean>(false);
  public emergencyModalExiting = signal<boolean>(false);
  public emergencyState = signal<'processing' | 'saved_server' | 'saved_local' | 'error'>('processing');
  public emergencyErrorMessage = signal<string>('');
  public emergencyData = signal<{
    employeeName: string;
    typeLabel: string;
    timeDisplay: string;
  } | null>(null);
  public emergencyPendingCount = signal<number>(0);
  // ───────────────────────────────────────────────────────────────────

  // Usar el servicio de organización como fuente principal
  public isNazCompany = computed(() => this.organizationService.isNaz());
  public isBlackDogCompany = computed(() =>
    this.organizationService.isBlackDog()
  );
  // Ya no hay tablas naz_*, todo es por company_id
  private employeesTable = computed(() => 'employees');

  // Custom confirmation modal signals
  public confirmModalVisible = signal(false);
  public confirmModalExiting = signal(false);
  public readonly EMOJI_EXPLOSION_LIST = ['🎉','🎊','💥','⭐','✨','🌟','💫','🎯','🏆','🥇','🚀','💎','🐶','🐕','🦴','🐾','❤️','💪','👏','🙌'];

  public confirmModalData = signal<{
    message: string;
    phrase: string;
    streak: number;
    isLate: boolean;
    delayText: string;
    isVeryLate: boolean;
    typeLabel: string;
    time: string;
    isBirthday: boolean;
    isVip: boolean;
    isMatrix: boolean;
    isMoto: boolean;
    isBatman: boolean;
    isStarWars: boolean;
    isCorridos: boolean;
    isWatchDogs: boolean;
    employeeName: string;
    isLunchOvertime: boolean;
    lunchExceededMinutes: number;
    randomEffect: RandomEffect;
    randomBadge: string | null;
  } | null>(null);
  private confirmModalTimer: ReturnType<typeof setTimeout> | undefined;

  // Info modal signals
  public infoModalVisible = signal(false);
  public infoModalStep = signal<'pin' | 'loading' | 'info'>('pin');
  public infoModalData = signal<TimeclockInfoData | null>(null);
  public infoOtp = signal<string>('');
  public infoOtpError = signal<string>('');
  public showPinHelp = signal(false);
  public isLoadingInfo = signal(false);
  public selectedEmployee = signal<Partial<Employee> | undefined>(undefined);
  public specialMode = signal(false);
  public matrixMode = signal(false);
  @ViewChild('matrixCanvas') private matrixCanvas?: ElementRef<HTMLCanvasElement>;
  private matrixRaf?: number;
  private matrixCols: number[] = [];
  private matrixAudio?: HTMLAudioElement;
  public batmanMode = signal(false);
  @ViewChild('batmanCanvas') private batmanCanvas?: ElementRef<HTMLCanvasElement>;
  private batmanRaf?: number;
  private batmanAudio?: HTMLAudioElement;
  private gustavoThemeIndex = 0;
  private readonly gustavoThemes = ['matrix', 'batman', 'starwars'] as const;
  public starwarsMode = signal(false);
  @ViewChild('starwarsCanvas') private starwarsCanvas?: ElementRef<HTMLCanvasElement>;
  private starwarsRaf?: number;
  private starwarsAudio?: HTMLAudioElement;
  public corridosMode = signal(false);
  @ViewChild('corridosCanvas') private corridosCanvas?: ElementRef<HTMLCanvasElement>;
  private corridosRaf?: number;
  private corridosAudio?: HTMLAudioElement;
  public motoMode = signal(false);
  @ViewChild('motoCanvas') private motoCanvas?: ElementRef<HTMLCanvasElement>;
  private motoRaf?: number;
  public watchdogsMode = signal(false);
  @ViewChild('watchdogsCanvas') private watchdogsCanvas?: ElementRef<HTMLCanvasElement>;
  private watchdogsRaf?: number;
  private watchdogsAudioCtx?: AudioContext;
  private watchdogsAudioGain?: GainNode;
  private watchdogsGlitchInterval?: ReturnType<typeof setInterval>;
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

  // Forced self-enrollment después de validar PIN si <3 dedos enrolados
  public showSelfEnrollDialog = signal(false);
  public selfEnrollEmployeeId = signal<string | null>(null);
  public selfEnrollEmployeeName = signal<string | null>(null);
  private pendingPunchArgs: any | null = null;

  /**
   * Verifica si el empleado debe enrolarse antes de marcar.
   * @returns true si abrió el dialog (la marcación se difiere); false si puede marcar normal.
   */
  private async maybeForceSelfEnroll(employee: any, branchId: string, companyId: string, type: string,
                                      employeeName: string, birthDate: any, firstName: string,
                                      gender: 'M' | 'F' | undefined, authMethod: 'pin' | 'webauthn'): Promise<boolean> {
    if (!this.dpReaderConnected()) return false;
    try {
      const r = await fetch(`/api/dp/has-enrollment/${employee.id}`);
      if (!r.ok) return false;
      const j = await r.json();
      const count = j?.count || 0;
      if (count >= 3) return false;
      // Falta enrolar — abrir dialog y diferir punch GUARDANDO timestamp original
      this.pendingPunchArgs = {
        employeeId: employee.id, branchId, companyId, type, employeeName,
        birthDate, firstName, gender, authMethod,
        punchedAt: new Date().toISOString(),
      };
      this.selfEnrollEmployeeId.set(employee.id);
      this.selfEnrollEmployeeName.set(employeeName);
      this.showSelfEnrollDialog.set(true);
      this.isProcessing.set(false);
      return true;
    } catch { return false; }
  }

  onSelfEnrollCompleted() {
    const a = this.pendingPunchArgs;
    if (!a) return;
    this.pendingPunchArgs = null;
    this.isProcessing.set(true);
    this.processTimelog(a.employeeId, a.branchId, a.companyId, a.type, a.employeeName,
                        a.birthDate, a.firstName, a.gender, a.authMethod, a.punchedAt);
  }

  onSelfEnrollClosed() {
    this.showSelfEnrollDialog.set(false);
    if (this.pendingPunchArgs) {
      this.message.add({ severity: 'warn', summary: 'Marcación cancelada',
        detail: 'Para marcar con PIN debes completar el enrolamiento de huellas.', life: 6000 });
      this.pendingPunchArgs = null;
    }
  }

  // Update time every second
  constructor() {
    // Bootstrap de la cola persistente de punches.
    this.punchQueue.bootstrap();

    // Captura y persiste fingerprint del dispositivo (idle, no bloquea UI).
    // Se hace una sola vez al cargar el kiosk; el UPSERT en server resuelve duplicados.
    queueMicrotask(() => {
      const companyId = this.organizationService.getCurrentCompanyId();
      this.deviceFp.persist({ company_id: companyId ?? undefined, branch_id: this.selectedBranchId() ?? null });
    });

    // Suscribir Auth0 + chequear si la company tiene rostros enrolados (face-first mode)
    this.subscribeAuth0AndFace();

    // C2 fix: effects al constructor (injection context garantizado).
    // Antes estaban en subscribeAuth0AndFace() que se llama desde aquí, pero
    // si se llamaba desde un callback async (ngOnInit, subscribe, etc.) los
    // effect() levantaban NG0203.
    effect(() => {
      const emp = this.selectedEmployee();
      if (!emp?.id) { this.selectedEmployeeHasFace.set(false); return; }
      this.checkEmployeeFaceEnrollment(emp.id);
    });

    // Monitorear estado del lector DP — solo si la feature de huellas está activa.
    // Si está desactivada, no hace falta hacer polling a 127.0.0.1:52181 (genera errores
    // ERR_CONNECTION_REFUSED en consola en PCs sin el DP Lite client).
    if (this.fingerprintFeatureEnabled()) {
      this.dp.startStatusPolling(5000);
    }
    this.dp.onConnectionChange((c) => {
      this.dpReaderConnected.set(c);
      // Si el lector cae mientras el empleado solo tiene DP enrolada,
      // soltamos al PIN para que pueda seguir marcando.
      if (!c && this.employeeHasDp() && !this.employeeHasFingerprint() && this.authMethod() === 'fingerprint') {
        this.authMethod.set('pin');
      }
      // Si vuelve y la huella es la opción real, reactivar (solo si feature flag activa)
      if (c && this.fingerprintFeatureEnabled() && this.employeeHasDp() && !this.employeeHasFingerprint() && this.authMethod() === 'pin') {
        this.authMethod.set('fingerprint');
        this.maybeAutoStartFingerprint();
      }
    });

    // Detectar organización desde URL
    const urlParams = new URLSearchParams(window.location.search);
    const orgParam = urlParams.get('org');
    if (orgParam === 'naz' || orgParam === 'blackdog') {
      this.organizationService.setOrganization(orgParam as 'naz' | 'blackdog');
    }

    // Detectar si está en modo kiosko y si es versión móvil
    const isKioskRoute = this.router.url.includes('/timeclock-kiosk');
    this.isKioskMode.set(isKioskRoute);
    this.isMobileKiosk.set(this.router.url.includes('/timeclock-kiosk-mobile'));

    // Sincronizar reloj con hora del servidor (sin tocar DB).
    // Esto evita depender del reloj/zona horaria del dispositivo.
    this.timeSync.init();

    this.timeInterval = setInterval(() => {
      this.currentTime.set(this.timeSync.now());
    }, 1000);

    // Initialize available types
    this.availableTypes.set(this.types);

    // Pet type rotation (dog/cat, 30 min)
    this.initPetRotation();

    // Try to get real IP address using multiple methods
    this.detectIP();

    // Si está en modo kiosko y NO es Naz, monitorear la IP continuamente
    if (isKioskRoute && !this.isNazCompany()) {
      this.setupKioskModeMonitoring();
      this.checkStoredIpOverride();
    } else if (isKioskRoute && this.isNazCompany()) {
      // Para Naz, siempre considerar la IP como válida
      this.isIPValid.set(true);
    }

    // Idle reset listeners — solo en kiosk para evitar PII residual
    if (isKioskRoute && typeof window !== 'undefined') {
      this.idleListenerHandle = () => this.bumpIdleTimer();
      ['click', 'keydown', 'touchstart', 'mousemove'].forEach((ev) =>
        window.addEventListener(ev, this.idleListenerHandle, { capture: true, passive: true })
      );
      this.bumpIdleTimer();
    }

    // Monitorear errores de recursos httpResource
    effect(() => {
      const companiesError = this.companiesResource.error();
      const branchesError = this.branchesResource.error();
      const employeesError = this.employeesResource.error();

      if (companiesError) {
        this.diagnosticService.addHttpResourceError(
          this.apiUrl.build('rest/v1/companies'),
          companiesError,
          'companiesResource'
        );
      }

      if (branchesError) {
        this.diagnosticService.addHttpResourceError(
          this.apiUrl.build('rest/v1/branches'),
          branchesError,
          'branchesResource'
        );
      }

      if (employeesError) {
        this.diagnosticService.addHttpResourceError(
          this.apiUrl.build('rest/v1/employees'),
          employeesError,
          'employeesResource'
        );
      }
    });

    // Auto-select company and branch when data loads
    effect(
      () => {
        const isNaz = this.isNazCompany();
        const companies = this.currentCompaniesResource();
        const branches = this.currentBranchesResource();

        // Auto-select company if not already selected
        if (
          companies &&
          companies.length > 0 &&
          !this.form.get('company_id')?.value
        ) {
          let targetCompany: Company | NazCompany | undefined;

          if (isNaz) {
            // For Naz: auto-select "Naz" company
            targetCompany = companies.find((c: Company) =>
              c.name.toLowerCase().includes('naz')
            ) as Company | undefined;
          } else {
            // For Black Dog: auto-select "Black Dog Panamá" company
            // First try exact match for "Black Dog Panamá"
            targetCompany = companies.find((c: Company) => {
              const name = c.name.toLowerCase();
              return (
                name === 'black dog panamá' ||
                name === 'blackdog panamá' ||
                name === 'black dog panama' ||
                name === 'blackdog panama'
              );
            }) as Company | undefined;

            // If not found, try partial matches with both "black dog" and "panamá"
            if (!targetCompany) {
              targetCompany = companies.find((c: Company) => {
                const name = c.name.toLowerCase();
                return (
                  (name.includes('black dog') || name.includes('blackdog')) &&
                  (name.includes('panamá') || name.includes('panama'))
                );
              }) as Company | undefined;
            }

            // Last resort: just look for "black dog" or "blackdog"
            if (!targetCompany) {
              targetCompany = companies.find((c: Company) => {
                const name = c.name.toLowerCase();
                return name.includes('black dog') || name.includes('blackdog');
              }) as Company | undefined;
            }
          }

          if (targetCompany) {
            this.form.get('company_id')?.setValue(targetCompany.id);
          }
        }

        // Auto-select branch if not already selected
        const selectedCompanyId = this.form.get('company_id')?.value;
        if (
          branches &&
          branches.length > 0 &&
          !this.form.get('branch_id')?.value
        ) {
          if (isNaz) {
            // For Naz: auto-select "Calle 50" branch
            const calle50Branch = branches.find((b: Branch) => {
              const name = b.name.toLowerCase();
              return (
                (name.includes('calle 50') || name.includes('calle50')) &&
                b.company_id === selectedCompanyId
              );
            }) as Branch | undefined;
            if (calle50Branch) {
              this.form.get('branch_id')?.setValue(calle50Branch.id);
            }
          } else {
            // For Black Dog: auto-select branch by IP if found
            const currentIP = this.getIP();
            if (currentIP && currentIP !== '127.0.0.1') {
              // Find branch matching the IP
              const matchingBranch = branches.find(
                (b: Branch) => b.ip === currentIP
              );
              if (matchingBranch) {
                this.form.get('branch_id')?.setValue(matchingBranch.id);
              }
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

    // Auto-iniciar verificación de huella al cambiar tipo de marcación
    this.form.get('type')?.valueChanges.subscribe(() => {
      this.maybeAutoStartFingerprint();
    });

    // Track selected branch for info modal / branch mismatch
    this.form.get('branch_id')?.valueChanges.subscribe((branchId) => {
      this.selectedBranchId.set(branchId || '');
    });

    // Clear employee selection when company changes
    effect(
      () => {
        const companyId = this.form.get('company_id')?.value;
        if (companyId) {
          this.form.get('employee')?.reset();
        }
      },
      { injector: this.injector }
    );
  }

  /**
   * Configura el monitoreo de IP en modo kiosko
   */
  private setupKioskModeMonitoring(): void {
    // Suscribirse al estado de validez de la IP
    this.ipMonitor.isIPValid
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isValid) => {
        this.isIPValid.set(isValid);

        if (!isValid) {
          // Mostrar alerta cuando la IP no es válida
          this.message.add({
            severity: 'error',
            summary: 'Acceso Restringido',
            detail: 'Esta computadora no está autorizada para marcar. Contacta a tu supervisor o recarga con F5 si estás en la sucursal correcta.',
            life: 0,
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
      .subscribe((ip) => {
        if (ip) {
          this.currentIP.set(ip);
        }
      });

    // Resetear formulario cuando cambia la organización
    effect(() => {
      const isNaz = this.isNazCompany();
      // Resetear empleado, branch y company cuando cambia la organización
      // Esto evita usar valores de una organización en la otra
      this.form.get('employee')?.reset();
      this.form.get('branch_id')?.reset();
      this.form.get('company_id')?.reset();
      this.form.get('otp')?.reset();
    });
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    if (this.confirmModalTimer) {
      clearTimeout(this.confirmModalTimer);
    }
    if (this.ipOverrideCountdownTimer) {
      clearInterval(this.ipOverrideCountdownTimer);
    }
    // A3 fix: quitar el listener de resize. Sin esto, cada navegación a
    // /timeclock agregaba un nuevo listener que disparaba isDesktopWide.set()
    // sobre componentes ya destruidos → memory leak + warnings.
    if (this.resizeWatchHandle && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeWatchHandle);
      this.resizeWatchHandle = null;
    }
    // Limpiar idle timer + listeners
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    if (this.idleListenerHandle && typeof window !== 'undefined') {
      ['click', 'keydown', 'touchstart', 'mousemove'].forEach((ev) =>
        window.removeEventListener(ev, this.idleListenerHandle, { capture: true } as any)
      );
      this.idleListenerHandle = null;
    }
    // Detener polling del DP reader: si no, sigue spamming /get_connection
    // a 127.0.0.1:52181 desde cualquier otra ruta de la app.
    this.dp.stopStatusPolling();
    // Detener monitoreo de IP si está activo
    if (this.isKioskMode()) {
      this.ipMonitor.stopMonitoring();
    }
  }

  // ── Manager IP Override Methods ──────────────────────────────────

  openIpOverrideModal(): void {
    this.ipOverrideStep.set('search');
    this.ipOverrideSelectedEmployee.set(null);
    this.ipOverrideOtp.set('');
    this.ipOverrideError.set('');
    this.ipOverrideEmployeeSearch.set('');
    this.ipOverrideModalExiting.set(false);
    this.ipOverrideProcessing.set(false);
    this.showIpOverrideModal.set(true);
  }

  closeIpOverrideModal(): void {
    this.ipOverrideModalExiting.set(true);
    setTimeout(() => {
      this.showIpOverrideModal.set(false);
      this.ipOverrideModalExiting.set(false);
    }, 280);
  }

  selectManagerEmployee(emp: Partial<Employee>): void {
    if (!emp.code_uri) return; // No tiene TOTP — botón deshabilitado visualmente
    this.ipOverrideSelectedEmployee.set(emp);
    this.ipOverrideOtp.set('');
    this.ipOverrideError.set('');
    this.ipOverrideProcessing.set(false);
    this.ipOverrideStep.set('otp');
  }

  appendOverrideDigit(digit: string): void {
    const current = this.ipOverrideOtp();
    if (current.length >= 6) return;
    this.ipOverrideOtp.set(current + digit);
    if (current.length + 1 === 6) {
      setTimeout(() => this.validateManagerOverrideOtp(), 120);
    }
  }

  deleteOverrideDigit(): void {
    const current = this.ipOverrideOtp();
    if (current.length > 0) this.ipOverrideOtp.set(current.slice(0, -1));
  }

  validateManagerOverrideOtp(): void {
    if (this.ipOverrideProcessing()) return;
    const emp = this.ipOverrideSelectedEmployee();
    const otp  = this.ipOverrideOtp();
    if (!emp || otp.length < 6) return;

    if (!emp.code_uri) {
      this.ipOverrideError.set('Este empleado no tiene PIN configurado');
      return;
    }

    // Validate TOTP (window:1 → tolera ±30s de drift del reloj del kiosk)
    const totp = OTPAuth.URI.parse(emp.code_uri);
    if (totp.validate({ token: otp, window: 1 }) === null) {
      this.ipOverrideError.set('Código incorrecto');
      this.ipOverrideOtp.set('');
      return;
    }

    // TOTP valid — check manager permissions
    this.ipOverrideProcessing.set(true);
    this.ipOverrideError.set('');

    this.http.get<Array<{id: string; positions: {schedule_admin: boolean; admin: boolean} | null}>>(
      this.apiUrl.build('rest/v1/employees'),
      { params: { id: `eq.${emp.id}`, select: 'id,positions(schedule_admin,admin)' } }
    ).subscribe({
      next: (result) => {
        this.ipOverrideProcessing.set(false);
        const pos = result?.[0]?.positions;
        const isManager = pos && (pos.schedule_admin || pos.admin);

        if (!isManager) {
          this.ipOverrideProcessing.set(false);
          this.ipOverrideError.set('Este empleado no tiene permisos de gerente');
          return;
        }

        const name    = `${emp.first_name ?? ''} ${emp.father_name ?? ''}`.trim();
        const expiry  = new Date(Date.now() + this.IP_OVERRIDE_DURATION_MS);

        this.ipOverrideManager.set({ id: emp.id!, name });
        this.ipOverrideExpiry.set(expiry);
        this.ipOverrideActive.set(true);
        this.isIPValid.set(true);

        localStorage.setItem(this.LS_OVERRIDE_KEY, JSON.stringify({
          managerId:   emp.id,
          managerName: name,
          expiresAt:   expiry.toISOString(),
        }));

        this.startIpOverrideCountdown();
        this.closeIpOverrideModal();

        this.message.add({
          severity: 'success',
          summary:  'IP Habilitada',
          detail:   `${name} habilitó las marcaciones por 1 hora`,
          life:     5000,
        });
      },
      error: () => {
        this.ipOverrideProcessing.set(false);
        this.ipOverrideError.set('Error verificando permisos. Intenta de nuevo.');
      }
    });
  }

  checkStoredIpOverride(): void {
    try {
      const stored = localStorage.getItem(this.LS_OVERRIDE_KEY);
      if (!stored) return;
      const data = JSON.parse(stored) as { managerId: string; managerName: string; expiresAt: string };
      const expiry = new Date(data.expiresAt);
      if (expiry <= new Date()) {
        localStorage.removeItem(this.LS_OVERRIDE_KEY);
        return;
      }
      this.ipOverrideManager.set({ id: data.managerId, name: data.managerName });
      this.ipOverrideExpiry.set(expiry);
      this.ipOverrideActive.set(true);
      this.isIPValid.set(true);
      this.startIpOverrideCountdown();
    } catch {
      localStorage.removeItem(this.LS_OVERRIDE_KEY);
    }
  }

  private startIpOverrideCountdown(): void {
    if (this.ipOverrideCountdownTimer) clearInterval(this.ipOverrideCountdownTimer);
    this.ipOverrideCountdownTimer = setInterval(() => {
      const expiry = this.ipOverrideExpiry();
      if (!expiry || expiry <= new Date()) {
        this.clearIpOverride();
        this.message.add({
          severity: 'warn',
          summary:  'Override expirado',
          detail:   'La habilitación temporal de IP ha expirado. Pide a tu supervisor que vuelva a habilitarla.',
          life:     8000,
        });
      }
    }, 30000);
  }

  clearIpOverride(): void {
    if (this.ipOverrideCountdownTimer) {
      clearInterval(this.ipOverrideCountdownTimer);
      this.ipOverrideCountdownTimer = null;
    }
    this.ipOverrideActive.set(false);
    this.ipOverrideManager.set(null);
    this.ipOverrideExpiry.set(null);
    localStorage.removeItem(this.LS_OVERRIDE_KEY);
  }

  // ────────────────────────────────────────────────────────────────
  // Detect IP address. Public IP (ipify) FIRST — branches.ip stores public IPs,
  // so WebRTC's local 192.168.x never matches and would render "IP no permitida".
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

  // Method 2: Get IP via nuestro server (sin CORS — recomendado)
  private getIPViaHttp(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http
        .get<{ ip: string }>('/api/client-ip')
        .subscribe({
          next: (data) => resolve(data.ip),
          error: () => reject(new Error('Server IP method failed')),
        });
    });
  }

  // Method 3: Fallback via ipify (puede fallar por CORS pero no afecta operación)
  private getIPViaAlternative(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http
        .get<{ ip: string }>('https://api.ipify.org?format=json', {
          headers: { Accept: 'application/json' },
        })
        .subscribe({
          next: (data) => resolve(data.ip),
          error: () => reject(new Error('ipify fallback failed')),
        });
    });
  }

  // Update available types based on last timelog
  private updateAvailableTypes(lastType: string | null) {
    this.availableTypes.set(getAvailableTypes(lastType, this.types));
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

  openAuthenticator(event: Event) {
    event.preventDefault();
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      window.open('https://apps.apple.com/app/google-authenticator/id388497605', '_blank');
    } else {
      window.open('https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2', '_blank');
    }
  }

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, '').slice(0, 6);
      if (digits) {
        this.form.get('otp')?.setValue(digits);
        if (digits.length === 6) {
          setTimeout(() => this.validateOtp(), 200);
        }
      }
    } catch {
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
    return formatInTimeZone(
      this.currentTime(),
      this.DISPLAY_TIMEZONE,
      'h:mm:ss aaa'
    );
  });

  // Format date for display
  formattedDate = computed(() => {
    const date = toZonedTime(this.currentTime(), this.DISPLAY_TIMEZONE);
    return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  });

  // Greeting message above the clock
  greetingMessage = computed(() => {
    const now = toZonedTime(this.currentTime(), this.DISPLAY_TIMEZONE);
    const hour = now.getHours();
    const day = now.getDay();       // 0=dom, 1=lun, ..., 5=vie, 6=sáb
    const date = now.getDate();
    const month = now.getMonth();   // 0-based
    // Last day of month
    const lastDay = new Date(now.getFullYear(), month + 1, 0).getDate();

    // Quincena: 15 or last day of month
    if (date === 15 || date === lastDay) {
      return { text: '¡Feliz día de quincena! 💰', sub: null };
    }
    // Time of day greeting
    if (hour >= 5 && hour < 12) {
      return { text: '☀️ ¡Buenos días!', sub: null };
    } else if (hour >= 12 && hour < 19) {
      return { text: '🌤️ ¡Buenas tardes!', sub: null };
    } else {
      return { text: '🌙 ¡Buenas noches!', sub: null };
    }
  });

  // Get IP - always returns a valid IP (localhost in dev)
  public getIP = computed(() => {
    return this.currentIP() || '127.0.0.1';
  });

  public validIP = computed(() => {
    // Naz no tiene validación de IP
    if (this.isNazCompany()) return true;

    const ip = this.getIP();
    // If IP is localhost or bypass IP, always allow
    if (ip === '127.0.0.1' || ip === '181.197.126.10') return true;
    const branches = this.currentBranchesResource();
    if (!branches) return true;
    return branches.some((branch: Branch | NazBranch) => branch.ip === ip);
  });

  public types = Object.entries(TimelogType).map(([key, value]) => ({
    value: key,
    label: value,
  }));

  public companiesResource = httpResource<Company[]>(() => ({
    url: this.apiUrl.build('rest/v1/companies'),
    method: 'GET',
    params: {
      select: 'id,name',
      order: 'name',
    },
  }));

  public branchesResource = httpResource<Branch[]>(() => ({
    url: this.apiUrl.build('rest/v1/branches'),
    method: 'GET',
    params: {
      select: 'id,name,ip,company_id',
      order: 'name',
    },
  }));

  // Computed signals to select the correct resource based on organization
  // Ya no se usan tablas naz_*, todo es por company_id
  public currentCompaniesResource = computed<Company[] | undefined>(() => {
    return this.companiesResource.value();
  });

  public currentBranchesResource = computed<Branch[] | undefined>(() => {
    const branches = this.branchesResource.value();
    if (!branches) return undefined;

    // Filtrar branches por company_id actual si está disponible
    const companyId = this.organizationService.getCurrentCompanyId();
    if (companyId) {
      return branches.filter((b) => b.company_id === companyId);
    }
    return branches;
  });

  // Determinar si la sucursal actual es oficina central
  public isCentralOffice = computed(() => {
    const currentIP = this.getIP();
    if (!currentIP || currentIP === '127.0.0.1') return true;

    const branches = this.currentBranchesResource();
    if (!branches || branches.length === 0) return true;

    const matchingBranch = branches.find(
      (b: Branch | NazBranch) => b.ip === currentIP
    );
    if (!matchingBranch) return true;

    const branchName = matchingBranch.name.toLowerCase();
    return (
      branchName.includes('oficina central') ||
      branchName.includes('central') ||
      branchName.includes('oficina')
    );
  });

  // Determinar si se puede cambiar la sucursal (solo si es oficina central)
  public canChangeBranch = computed(() => this.isCentralOffice());

  // Nombre de la sucursal actualmente seleccionada (para mostrar badge cuando está fija)
  public currentBranchName = computed(() => {
    const branchId = this.selectedBranchId() || this.form.get('branch_id')?.value || '';
    if (!branchId) return '';
    const branches = this.currentBranchesResource();
    const match = branches?.find((b) => b.id === branchId);
    return match?.name || '';
  });

  // Separate resources for regular employees and Naz employees
  public employeesResource = httpResource<Partial<Employee>[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: 'id,first_name,father_name,work_email,code_uri,birth_date,branch_id,gender,authenticator_enrolled,use_face',
      order: 'father_name',
      is_active: 'eq.true',
    };

    // Filtrar por company_id siempre (ya no hay tablas naz_*)
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: this.apiUrl.build('rest/v1/employees'),
      method: 'GET',
      params,
    };
  });

  // Computed to select employees - ya no se usan tablas naz_*
  public currentEmployeesResource = computed<Partial<Employee>[] | undefined>(
    () => {
      const employees = this.employeesResource.value();

      if (!employees) return undefined;

      // Deduplicar por id para evitar empleados duplicados
      const uniqueEmployees = new Map<string, Partial<Employee>>();
      employees.forEach((emp) => {
        if (emp.id && !uniqueEmployees.has(emp.id)) {
          uniqueEmployees.set(emp.id, emp);
        }
      });

      return Array.from(uniqueEmployees.values());
    }
  );

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

    // Filtrar por company_id
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    const url = this.apiUrl.build('rest/v1/timelogs', params);
    return this.http.get<TimeLog[]>(url).pipe(
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

  // Delegates to pure function
  private getNextTimelogType(lastType: string | null): string {
    return getNextTimelogType(lastType);
  }

  // Get employee schedule for today
  private getEmployeeSchedule(
    employeeId: string
  ): Observable<EmployeeSchedule | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: '*,schedule:schedules(*)',
      employee_id: `eq.${employeeId}`,
      start_date: `lte.${today}`,
      end_date: `gte.${today}`,
    };

    // Filtrar por company_id
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return this.http
      .get<EmployeeSchedule[]>(
        this.apiUrl.build('rest/v1/employee_schedules'),
        { params }
      )
      .pipe(
        map((schedules) => {
          if (!schedules || schedules.length === 0) return null;
          if (schedules.length === 1) return schedules[0];
          // Priorizar: individual > rango, aprobado > no aprobado, más reciente
          return [...schedules].sort((a, b) => {
            const aS = a.start_date === a.end_date ? 1 : 0;
            const bS = b.start_date === b.end_date ? 1 : 0;
            if (aS !== bS) return bS - aS;
            const aA = a.approved ? 1 : 0;
            const bA = b.approved ? 1 : 0;
            if (aA !== bA) return bA - aA;
            return ((b as any).created_at || '') > ((a as any).created_at || '') ? 1 : -1;
          })[0];
        }),
        catchError((error) => {
          console.error('Error getting employee schedule:', error);
          return of(null);
        })
      );
  }

  private calculateDelay(
    entryTime: Date,
    schedule: Schedule | NazSchedule | undefined
  ): number | null {
    return calculateEntryDelay(entryTime, schedule);
  }

  private formatTimeDifference(minutes: number): string {
    return formatTimeDifference(minutes);
  }

  // Get lunch_start timelog for today
  private getLunchStartTimelog(employeeId: string): Observable<TimeLog | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: 'id,type,created_at',
      employee_id: `eq.${employeeId}`,
      type: 'eq.lunch_start',
      and: `(created_at.gte.${todayStart},created_at.lte.${todayEnd})`,
      order: 'created_at.desc',
      limit: '1',
    };

    // Filtrar por company_id
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    const url = this.apiUrl.build('rest/v1/timelogs', params);
    return this.http.get<TimeLog[]>(url).pipe(
      map((timelogs) => {
        if (!timelogs || timelogs.length === 0) {
          return null;
        }
        const lunchStartLog = timelogs[0];
        const logDate = format(
          new Date(lunchStartLog.created_at),
          'yyyy-MM-dd'
        );
        return logDate === today ? lunchStartLog : null;
      }),
      catchError(() => of(null))
    );
  }

  private calculateLunchEndDifference(
    lunchEndTime: Date,
    lunchStartTime: Date | null,
    _schedule: Schedule | NazSchedule | undefined | null
  ): { exceededMinutes: number; shouldShowWarning: boolean } | null {
    return calculateLunchExcess(lunchEndTime, lunchStartTime);
  }

  private calculateExitDifference(
    exitTime: Date,
    schedule: Schedule | NazSchedule | undefined
  ): { minutes: number; isEarly: boolean } | null {
    return calculateExitDifference(exitTime, schedule);
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
  @ViewChild('infoPinInput') infoPinInput?: ElementRef<HTMLInputElement>;

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
    // Reset fallback PIN al cambiar de empleado.
    this.fingerprintFailures.set(0);
    this.allowPinFallback.set(false);
    initAudioContext();
    // Safety: prevent stale type from previous employee being submitted.
    this.form.get('type')?.setValue('entry');
    this.updateAvailableTypes(null);

    if (employee?.id) {
      this.isLoadingType.set(true);
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
        this.employeeHasDp.set(!!dpStatus?.enrolled);
        this.employeeHasFingerprint.set(!dpStatus?.enrolled && !!waStatus?.hasCredential);
        // Forzar huella sólo si el método está realmente disponible:
        //   - WebAuthn (employeeHasFingerprint) funciona sin lector externo.
        //   - DP (employeeHasDp) requiere que esta PC tenga el Lite Client conectado;
        //     si no, dejar PIN como fallback para no bloquear al empleado.
        const fingerprintUsable = this.fingerprintFeatureEnabled() && (
          this.employeeHasFingerprint() ||
          (this.employeeHasDp() && this.dpReaderConnected())
        );
        if (fingerprintUsable) {
          this.authMethod.set('fingerprint');
          this.maybeAutoStartFingerprint();
        } else {
          this.authMethod.set('pin');
        }
      });

      const fxId = employee.id;
      const employeeName = employee?.first_name || employee?.father_name || '';
      firstValueFrom(this.http.post<{ v: boolean; m: boolean }>('/api/fx', { id: fxId }))
        .then(r => {
          // Ignore if a different employee was selected (or deselected) while request was in flight
          if (this.form.get('employee')?.value?.id !== fxId) return;
          this.specialMode.set(r?.v === true);
          const mx = r?.m === true;
          const isGustavo = /gustavo/i.test(employeeName);
          const isEder = /eder/i.test(employeeName);
          const isRicardo = /ricardo/i.test(employeeName);
          const isLiliana = /liliana/i.test(employeeName);
          const isTristan = /tristan/i.test(employeeName);

          // Gustavo cycles through matrix/batman/starwars
          let moto = false;
          let batman = mx && isEder;
          let starwars = mx && isRicardo;
          let corridos = mx && isLiliana;
          let watchdogs = mx && isTristan;
          let matrix = false;
          if (mx && isGustavo) {
            const theme = this.gustavoThemes[this.gustavoThemeIndex % this.gustavoThemes.length];
            matrix = theme === 'matrix';
            batman = theme === 'batman';
            starwars = theme === 'starwars';
            // M2 fix: incrementar índice para que rote en el siguiente trigger
            this.gustavoThemeIndex = (this.gustavoThemeIndex + 1) % this.gustavoThemes.length;
          } else if (mx && !isEder && !isRicardo && !isLiliana && !isTristan) {
            matrix = true;
          }

          this.motoMode.set(moto);
          this.batmanMode.set(batman);
          this.starwarsMode.set(starwars);
          this.corridosMode.set(corridos);
          this.watchdogsMode.set(watchdogs);
          this.matrixMode.set(matrix);
          document.body.classList.toggle('matrix-active', matrix);
          document.body.classList.toggle('moto-active', moto);
          document.body.classList.toggle('batman-active', batman);
          document.body.classList.toggle('starwars-active', starwars);
          document.body.classList.toggle('corridos-active', corridos);
          document.body.classList.toggle('watchdogs-active', watchdogs);
          if (matrix) setTimeout(() => this.startMatrix(), 50); else this.stopMatrix();
          if (moto)   setTimeout(() => this.startMoto(),   50); else this.stopMoto();
          if (batman)  setTimeout(() => this.startBatman(), 50); else this.stopBatman();
          if (starwars) setTimeout(() => this.startStarWars(), 50); else this.stopStarWars();
          if (corridos) setTimeout(() => this.startCorridos(), 50); else this.stopCorridos();
          if (watchdogs) setTimeout(() => this.startWatchDogs(), 50); else this.stopWatchDogs();
        })
        .catch(() => { this.specialMode.set(false); this.stopMatrix(); this.stopMoto(); });

      this.getLastTimelog(employee.id).subscribe({
        next: (lastTimelog) => {
          const nextType = this.getNextTimelogType(lastTimelog?.type || null);
          this.updateAvailableTypes(lastTimelog?.type || null);
          // Si el tipo calculado no está en los disponibles (ej: lunch_start en oficina central),
          // usar el primer tipo disponible de la lista filtrada
          const available = this.availableTypes();
          const safeType = available.some(t => t.value === nextType)
            ? nextType
            : (available[0]?.value ?? 'entry');
          this.form.get('type')?.setValue(safeType);
          this.isLoadingType.set(false);
          this.focusOtpInput();
        },
        error: () => {
          this.updateAvailableTypes(null);
          this.form.get('type')?.setValue('entry');
          this.isLoadingType.set(false);
          this.focusOtpInput();
        },
      });
    } else {
      this.specialMode.set(false);
      this.matrixMode.set(false);
      this.motoMode.set(false);
      this.batmanMode.set(false);
      this.starwarsMode.set(false);
      this.corridosMode.set(false);
      this.watchdogsMode.set(false);
      document.body.classList.remove('matrix-active');
      document.body.classList.remove('moto-active');
      document.body.classList.remove('batman-active');
      document.body.classList.remove('starwars-active');
      document.body.classList.remove('corridos-active');
      document.body.classList.remove('watchdogs-active');
      this.stopMatrix();
      this.stopMoto();
      this.stopBatman();
      this.stopStarWars();
      this.stopCorridos();
      this.stopWatchDogs();
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

  async validateFingerprint() {
    const employee = this.selectedEmployee();
    if (!employee?.id || this.isProcessing()) return;
    if (this.isLoadingType()) return;
    const { branch_id, company_id, type } = this.form.getRawValue();
    if (!branch_id || !type) {
      this.message.add({ severity: 'warn', summary: 'Datos incompletos', detail: 'Selecciona la sucursal y el tipo de marcación antes de continuar.', life: 6000 });
      return;
    }
    this.isProcessing.set(true);
    try {
      // Prefer DigitalPersona U.are.U 4500 if employee has DP huella AND this PC has Lite Client
      let verified = false;
      let usedDp = false;
      if (this.employeeHasDp()) {
        try {
          verified = await this.verifyWithDp(employee.id);
          usedDp = true;
        } catch (dpErr: any) {
          // Fall through to WebAuthn fallback
          this.message.add({ severity: 'warn', summary: 'DP', detail: dpErr?.message || 'Error con lector DP, probando WebAuthn...', life: 4000 });
        }
      }
      if (!usedDp) {
        verified = await this.webAuthn.authenticateFingerprint(employee.id);
      }
      if (verified) {
        const serviceCompanyId = this.organizationService.getCurrentCompanyId();
        const finalCompanyId = company_id || serviceCompanyId || '';
        const employeeName = `${employee.first_name || ''} ${employee.father_name || ''}`.trim();
        this.processTimelog(
          employee.id, branch_id, finalCompanyId, type, employeeName,
          employee.birth_date as any, employee.first_name as string, (employee as any).gender,
          'webauthn'
        );
      } else {
        this.isProcessing.set(false);
        this.handleFingerprintFailure('Huella no reconocida. Intenta de nuevo o usa tu PIN.');
      }
    } catch (err: any) {
      this.isProcessing.set(false);
      const detail = err?.name === 'NotAllowedError'
        ? 'Verificación cancelada. Intenta de nuevo o usa tu PIN.'
        : (err?.message || 'Error al leer la huella. Intenta de nuevo o usa tu PIN.');
      this.handleFingerprintFailure(detail);
    }
  }

  /** Incrementa contador de fallos de huella y habilita fallback a PIN. */
  private handleFingerprintFailure(detail: string): void {
    const next = this.fingerprintFailures() + 1;
    this.fingerprintFailures.set(next);
    // Tras el primer fallo, abrimos el PIN como alternativa.
    this.allowPinFallback.set(true);
    this.message.add({
      severity: next >= 2 ? 'warn' : 'error',
      summary: next >= 2 ? 'Huella sigue fallando' : 'Huella no reconocida',
      detail,
      life: 6000,
    });
    // Tras 2 fallos consecutivos, cambiamos automaticamente a PIN para que
    // el empleado no pierda mas tiempo intentando la huella.
    if (next >= 2) {
      this.authMethod.set('pin');
    }
  }

  private autoFingerprintTimer: any = null;
  private maybeAutoStartFingerprint() {
    if (this.autoFingerprintTimer) {
      clearTimeout(this.autoFingerprintTimer);
      this.autoFingerprintTimer = null;
    }
    if (!this.fingerprintFeatureEnabled()) return;
    if (this.isProcessing()) return;
    if (this.isLoadingType()) return;
    if (this.authMethod() !== 'fingerprint') return;
    if (!this.selectedEmployee()?.id) return;
    const v = this.form.getRawValue();
    if (!v.type || !v.branch_id) return;
    if (!this.employeeHasFingerprint() && !this.employeeHasDp()) return;
    this.autoFingerprintTimer = setTimeout(() => this.validateFingerprint(), 350);
  }

  private async verifyWithDp(employeeId: string): Promise<boolean> {
    const state = await this.dp.init();
    if (state !== 'ready') {
      throw new Error(state === 'no-device' ? 'Lector no conectado' : 'Lite Client no disponible');
    }
    // Primera huella
    const sample1 = await this.dp.captureOne(30000);
    const r1 = await fetch('/api/dp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId, sample_b64: sample1 }),
    });
    if (!r1.ok) return false;
    const j1 = await r1.json();
    if (!j1?.matched) return false;
    if (j1.confidence === 'high') return true;

    // Borderline → pedir segundo dedo distinto
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
    // Confirmamos solo si el 2do match Y es un dedo distinto al 1ro
    if (!j2?.matched) return false;
    if (j1.matched_finger_index === j2.matched_finger_index) {
      this.message.add({ severity: 'warn', summary: 'Confirmación', detail: 'Usa un dedo distinto.', life: 5000 });
      return false;
    }
    return true;
  }

  async selfRegisterFingerprint() {
    const employee = this.selectedEmployee();
    if (!employee?.id || this.isProcessing()) return;
    this.isProcessing.set(true);
    try {
      await this.webAuthn.registerFingerprintSelf(employee.id);
      this.employeeHasFingerprint.set(true);
      this.message.add({ severity: 'success', summary: 'Listo', detail: 'Huella registrada correctamente.' });
    } catch (err: any) {
      const detail = err?.name === 'NotAllowedError'
        ? 'Registro cancelado.'
        : (err?.message || 'No se pudo registrar la huella.');
      this.message.add({ severity: 'error', summary: 'Error', detail });
    } finally {
      this.isProcessing.set(false);
    }
  }

  absMinutes(n: number): number {
    return Math.abs(n);
  }

  closeInfoModal(): void {
    this.infoModalVisible.set(false);
    this.infoModalData.set(null);
    this.infoOtp.set('');
    this.infoOtpError.set('');
    this.infoModalStep.set('pin');
    this.showPinHelp.set(false);
  }

  openInfoModal(): void {
    const employee = this.selectedEmployee();
    if (!employee?.id) return;
    this.infoOtp.set('');
    this.infoOtpError.set('');
    this.infoModalData.set(null);
    this.infoModalStep.set('pin');
    this.infoModalVisible.set(true);
    setTimeout(() => this.infoPinInput?.nativeElement?.focus(), 80);
  }

  onInfoPinKeydown(event: KeyboardEvent): void {
    if (this.infoModalStep() !== 'pin') return;
    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      this.addDigitToInfoOtp(event.key);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      this.deleteFromInfoOtp();
    } else if (event.key === 'Escape') {
      this.closeInfoModal();
    }
  }

  addDigitToInfoOtp(digit: string): void {
    if (this.infoOtp().length < 6) {
      this.infoOtp.update(v => v + digit);
      this.infoOtpError.set('');
      if (this.infoOtp().length === 6) {
        this.validateInfoOtp();
      }
    }
    this.infoPinInput?.nativeElement?.focus();
  }

  deleteFromInfoOtp(): void {
    this.infoOtp.update(v => v.slice(0, -1));
    this.infoOtpError.set('');
    this.infoPinInput?.nativeElement?.focus();
  }

  clearInfoOtp(): void {
    this.infoOtp.set('');
    this.infoOtpError.set('');
    this.infoPinInput?.nativeElement?.focus();
  }

  togglePinHelp(): void {
    this.showPinHelp.update(v => !v);
  }

  validateInfoOtp(): void {
    const employee = this.selectedEmployee();
    if (!employee?.code_uri) {
      this.infoOtpError.set('Empleado sin PIN configurado');
      return;
    }
    const otp = this.infoOtp();
    if (otp.length !== 6) return;

    const totp = OTPAuth.URI.parse(employee.code_uri);
    const validation = totp.validate({ token: otp, window: 1 });
    if (validation === null) {
      playFailureSound();
      this.infoOtpError.set('Código incorrecto');
      this.infoOtp.set('');
      return;
    }
    this.infoModalStep.set('loading');
    this.loadTimeclockInfo();
  }

  private loadTimeclockInfo(): void {
    const employee = this.selectedEmployee();
    if (!employee?.id) return;

    forkJoin({
      timelogs: this.getTodayTimelogsForInfo(employee.id),
      schedule: this.getEmployeeScheduleForInfo(employee.id),
    }).subscribe(({ timelogs, schedule }) => {

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

      // Scheduled entry comparison
      let scheduledEntryTime: string | null = null;
      let entryDelayMinutes: number | null = null;

      if (schedule?.entry_time) {
        const [eh, em] = schedule.entry_time.split(':').map(Number);
        const scheduledEntry = new Date();
        scheduledEntry.setHours(eh, em, 0, 0);
        scheduledEntryTime = format(scheduledEntry, 'h:mm aaa');
        if (entryLog) {
          entryDelayMinutes = differenceInMinutes(new Date(entryLog.created_at), scheduledEntry);
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
        scheduledEntryTime,
        entryDelayMinutes,
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
      this.infoModalStep.set('info');
    });
  }

  private getTodayTimelogsForInfo(employeeId: string): Observable<TimeLog[]> {
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

  private getEmployeeScheduleForInfo(employeeId: string): Observable<any> {
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

  async validateOtp() {
    if (this.isProcessing()) return;
    if (this.isLoadingType()) {
      this.message.add({ severity: 'warn', summary: 'Cargando', detail: 'Verificando tipo de marcación, intente de nuevo en 1 segundo.', life: 3000 });
      return;
    }

    this.isProcessing.set(true);
    const { employee, otp, branch_id, company_id, type } =
      this.form.getRawValue();

    const isNaz = this.isNazCompany();
    const serviceCompanyId = this.organizationService.getCurrentCompanyId();

    // Validar que los datos sean correctos para la organización
    if (!employee || !employee.id) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Sin empleado seleccionado',
        detail: 'Selecciona tu nombre de la lista antes de ingresar el PIN. Si no apareces, presiona F5 para recargar.',
        life: 8000,
      });
      return;
    }

    if (!branch_id) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Sin sucursal seleccionada',
        detail: 'Selecciona tu sucursal antes de marcar. Si no aparece, presiona F5 para recargar la página.',
        life: 8000,
      });
      return;
    }

    // Ya no hay tablas naz_*, todo es por company_id en tablas compartidas
    // Para Black Dog, usar el del servicio o formulario
    let finalCompanyId: string | null = null;

    if (isNaz) {
      // Para Naz, priorizar el company_id del formulario (que es de naz_companies)
      // Si no hay, buscar en la lista de naz_companies
      finalCompanyId = company_id || null;

      if (!finalCompanyId) {
        const companies = this.currentCompaniesResource();
        if (companies && companies.length > 0) {
          // Buscar la compañía "Naz" en companies
          const nazCompany = companies.find((c: Company) =>
            c.name.toLowerCase().includes('naz')
          ) as Company | undefined;

          if (nazCompany) {
            finalCompanyId = nazCompany.id;
            // Auto-seleccionar en el formulario
            this.form.get('company_id')?.setValue(nazCompany.id);
          }
        }
      }
    } else {
      // Para Black Dog, usar el del servicio o formulario
      finalCompanyId = company_id || serviceCompanyId || null;
    }

    if (!finalCompanyId) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Sin compañía seleccionada',
        detail: 'No se detectó la compañía. Recarga la página con F5 e intenta de nuevo.',
        life: 8000,
      });
      return;
    }

    // Verificar que el empleado, branch y company sean de las tablas correctas
    const employees = this.currentEmployeesResource();
    const branches = this.currentBranchesResource();
    const companies = this.currentCompaniesResource();

    // Verificar que el empleado seleccionado esté en la lista correcta
    if (employees && !employees.some((e) => e.id === employee.id)) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El empleado no pertenece a esta organización. Presiona Ctrl+Shift+R para limpiar el caché y recargar, luego vuelve a intentarlo.',
        life: 10000,
      });
      this.form.get('employee')?.reset();
      return;
    }

    // Verificar que el branch esté en la lista correcta
    if (branches && !branches.some((b) => b.id === branch_id)) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La sucursal no pertenece a esta organización. Presiona Ctrl+Shift+R para limpiar el caché y recargar, luego selecciona la sucursal de nuevo.',
        life: 10000,
      });
      this.form.get('branch_id')?.reset();
      return;
    }

    // Verificar que el company esté en la lista correcta (solo si hay lista cargada)
    if (
      companies &&
      companies.length > 0 &&
      !companies.some((c) => c.id === finalCompanyId)
    ) {
      // Solo log en desarrollo
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.warn('[Timeclock] Company ID no encontrado en lista:', {
          finalCompanyId,
          companiesList: companies.map((c) => ({ id: c.id, name: c.name })),
          isNaz,
        });
      }
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: `La compañía seleccionada (${finalCompanyId.substring(
          0,
          8
        )}...) no es válida para esta organización. Por favor, seleccione una compañía válida de la lista.`,
      });
      this.form.get('company_id')?.reset();
      return;
    }

    if (employee?.code_uri) {
      const totp = OTPAuth.URI.parse(employee.code_uri);
      const validation = totp.validate({ token: otp, window: 1 });
      if (validation === null) {
        this.isProcessing.set(false);
        // Reproducir sonido de error
        playFailureSound();
        this.message.add({
          severity: 'error',
          summary: 'PIN incorrecto',
          detail: 'El PIN ingresado no es correcto. Verifica los 6 dígitos e intenta de nuevo. ¿Lo olvidaste? Habla con Recursos Humanos.',
          life: 8000,
        });
        this.form.get('otp')?.reset();
        return;
      }

      const employeeName =
        `${employee.first_name} ${employee.father_name}`.trim();

      // Log de depuración antes de procesar
      console.log('📝 Intentando marcar timelog:', {
        isNaz: this.isNazCompany(),
        employee_id: employee.id,
        branch_id: branch_id,
        company_id: finalCompanyId,
        type,
        employeeName,
        tableName: 'timelogs',
      });

      // Antes de procesar, verificar si debe enrolar (lector conectado + <3 dedos)
      const forced = await this.maybeForceSelfEnroll(
        employee, branch_id, finalCompanyId, type, employeeName,
        employee.birth_date as any, employee.first_name as string,
        (employee as any).gender as 'M' | 'F' | undefined, 'pin'
      );
      if (forced) return;

      this.processTimelog(
        employee.id,
        branch_id,
        finalCompanyId,
        type,
        employeeName,
        employee.birth_date as any,
        employee.first_name as string,
        (employee as any).gender as 'M' | 'F' | undefined,
        'pin'
      );
    } else {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'PIN no configurado',
        detail: 'Este empleado aún no tiene PIN activo. Comunícate con Recursos Humanos para activarlo antes de poder marcar.',
        life: 10000,
      });
    }
  }

  private async processTimelog(
    employeeId: string,
    branchId: string,
    companyId: string,
    type: string,
    employeeName: string,
    birthDate?: string,
    firstName?: string,
    gender?: 'M' | 'F',
    authMethod?: 'pin' | 'webauthn',
    punchedAt?: string
  ) {
    // Prevenir duplicados: rechazar si el mismo empleado marcó hace menos de 30 segundos
    const now = Date.now();
    // A8 fix: purgar entradas viejas (>60s) para evitar leak de memoria
    // y consultar antes de validar, pero MARCAR (set) sólo después de validar
    // todo — así si falla la validación el usuario no queda bloqueado 30s
    // sin haber marcado nada.
    for (const [empId, ts] of this.recentPunches) {
      if (now - ts > 60000) this.recentPunches.delete(empId);
    }
    const lastPunch = this.recentPunches.get(employeeId);
    if (lastPunch && now - lastPunch < 30000) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'warn',
        summary: 'Marcación reciente',
        detail: 'Ya marcaste hace menos de 30 segundos. Espera un momento y vuelve a intentarlo. Si crees que es un error, presiona F5.',
        life: 6000,
      });
      return;
    }

    // Validar IP - bypass for specific employees
    const invalidValue = this.IP_BYPASS_EMPLOYEE_IDS.has(employeeId) ? false : !this.validIP();

    // Asegurar que el company_id sea correcto para la organización actual
    const serviceCompanyId = this.organizationService.getCurrentCompanyId();
    const finalCompanyId = companyId || serviceCompanyId;

    // Validar que branch_id y company_id sean válidos
    if (!branchId || !finalCompanyId) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: `Por favor seleccione una sucursal y compañía válidas. Branch: ${branchId}, Company: ${finalCompanyId}, Service Company: ${serviceCompanyId}`,
      });
      return;
    }
    // Validaciones OK → ahora sí marcamos el dedup
    this.recentPunches.set(employeeId, now);

    // ── STORE-AND-FORWARD ──────────────────────────────────────────────
    // Registramos la marca en la cola local ANTES de enviarla. Si el envío
    // confirma éxito, la quitamos (remove). Si algo falla (red caída, pestaña
    // cerrada, respuesta perdida), queda en IndexedDB y el auto-sync la manda
    // al beacon — que es idempotente, así que nunca duplica. Garantiza que
    // ninguna marca se pierda "sin rastro" como pasó con Andrés Pérez.
    const sfPunchedAt = punchedAt || new Date().toISOString();
    // C1 fix: await el enqueue ANTES de disparar el RPC.
    // Antes: void .then(...) hacía que sfQueueId fuera null cuando el RPC
    // respondía rápido → remove() nunca corría → cola crecía con duplicados
    // que el beacon reenviaba 30s después.
    const sfQueueId: string | null = await this.punchQueue.enqueueQuiet({
      employee_id: employeeId,
      employee_name: employeeName,
      branch_id: branchId,
      company_id: finalCompanyId,
      type,
      type_label: this.types.find((t) => t.value === type)?.label || type,
      punched_at: sfPunchedAt,
      ip: this.getIP(),
      invalid_ip: invalidValue,
      auth_method: authMethod ?? null,
      reason: 'Store-and-forward (respaldo local de marcación de kiosko)',
    }).catch(() => null);

    // Usar RPC para procesar todo en una sola transacción
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
          p_company_id: finalCompanyId,
          p_branch_id: branchId,
          p_type: type,
          p_ip: this.getIP(),
          p_invalid_ip: invalidValue,
          p_device_id: this.deviceFp.getDeviceId(),
          ...(this.deviceFp['cached']?.combined_hash
            ? { p_device_combined_hash: this.deviceFp['cached'].combined_hash }
            : {}),
          ...(authMethod ? { p_auth_method: authMethod } : {}),
          ...(punchedAt ? { p_punched_at: punchedAt } : {}),
          ...(this.ipOverrideActive() && this.ipOverrideManager()
            ? { p_ip_override_by: this.ipOverrideManager()!.id }
            : {}),
        },
        { observe: 'response' }
      )
      .pipe(
        catchError((error) => {
          this.isProcessing.set(false);
          // Reproducir sonido de error
          playFailureSound();
          const isNaz = this.isNazCompany();
          console.error('Error al procesar timelog:', error);

          // Errores de red o servidor (0, 500, 502, 503, 504) → ofrecer marcación de emergencia
          const isNetworkOrServerError =
            error?.status === 0 ||
            error?.status === 500 ||
            error?.status === 502 ||
            error?.status === 503 ||
            error?.status === 504 ||
            error?.status === null ||
            error?.status === undefined;

          if (isNetworkOrServerError) {
            const typeLabels: Record<string, string> = {
              entry: 'Entrada',
              lunch_start: 'Inicio Almuerzo',
              lunch_end: 'Fin Almuerzo',
              exit: 'Salida',
            };
            this.triggerEmergencyTimelog(
              employeeId,
              branchId,
              finalCompanyId,
              type,
              employeeName,
              typeLabels[type] ?? type
            );
            return EMPTY;
          }

          let errorMessage = 'Algo salió mal. Intenta de nuevo. Si el problema persiste, recarga la página con F5.';

          // Manejar errores específicos
          if (error?.status === 409) {
            errorMessage = `Los datos seleccionados ya no existen en el sistema (empleado, sucursal o compañía). Presiona Ctrl+Shift+R para recargar la página con datos actualizados y vuelve a intentar.`;
          } else if (error?.status === 422) {
            const details =
              error?.error?.details ||
              error?.error?.message ||
              'Los datos proporcionados no son válidos';
            errorMessage = `Datos inválidos: ${details}. Si el problema persiste, recarga con Ctrl+Shift+R.`;
          } else if (error?.error?.message) {
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

          // Resetear el formulario si hay un error de constraint (409)
          if (error?.status === 409) {
            this.form.get('employee')?.reset();
            this.form.get('branch_id')?.reset();
            this.form.get('company_id')?.reset();
            this.form.get('otp')?.reset();
          }

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
              detail: 'El servidor respondió de forma inesperada. Recarga la página con F5 y vuelve a intentar.',
              life: 10000,
            });
            // Respuesta 200 pero sin cuerpo: el server recibió la petición. Dejamos
            // el respaldo en la cola por si no insertó; el beacon idempotente evita duplicados.
            return;
          }

          // Verificar si la RPC retornó error
          if (!result.success) {
            this.isProcessing.set(false);
            // Reproducir sonido de error
            playFailureSound();
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: (result.error || 'Error al procesar la marcación') + ' — Si el problema continúa, recarga con F5.',
              life: 10000,
            });
            // El server respondió y rechazó (regla de negocio): quitamos el respaldo
            // local para que el beacon NO la fuerce después. El store-and-forward solo
            // protege contra fallas SIN respuesta (red/servidor), no contra rechazos.
            if (sfQueueId) { void this.punchQueue.remove(sfQueueId); }
            return;
          }

          // Éxito confirmado por el server → quitar el respaldo local store-and-forward.
          if (sfQueueId) { void this.punchQueue.remove(sfQueueId); }

          // Hora oficial: header Date del servidor. Fallback: reloj sincronizado por offset.
          const dateHeader = response.headers.get('Date');
          const serverHeaderMs = dateHeader
            ? new Date(dateHeader).getTime()
            : NaN;
          const officialTime = Number.isNaN(serverHeaderMs)
            ? this.timeSync.now()
            : new Date(serverHeaderMs);

          const typeLabel =
            this.types.find((t) => t.value === type)?.label || type;
          
          // Calcular tardanza en el cliente (desde el primer segundo)
          let delayMinutes = 0;
          let isLate = false;
          
          if (type === 'entry' && result.schedule?.entry_time && !result.isDayOff) {
            // Parsear hora de entrada del horario (formato HH:mm:ss)
            const entryTimeParts = result.schedule.entry_time.split(':');
            const scheduledHour = parseInt(entryTimeParts[0], 10);
            const scheduledMinute = parseInt(entryTimeParts[1], 10);
            const scheduledSecond = parseInt(entryTimeParts[2] || '0', 10);
            
            // Obtener hora actual en zona de Panamá
            const nowInPanama = toZonedTime(officialTime, this.DISPLAY_TIMEZONE);
            const currentHour = getHours(nowInPanama);
            const currentMinute = getMinutes(nowInPanama);
            const currentSecond = getSeconds(nowInPanama);
            
            // Calcular diferencia en segundos
            const scheduledTotalSeconds = scheduledHour * 3600 + scheduledMinute * 60 + scheduledSecond;
            const currentTotalSeconds = currentHour * 3600 + currentMinute * 60 + currentSecond;
            const diffSeconds = currentTotalSeconds - scheduledTotalSeconds;
            
            // Si llegó después de la hora programada (desde el primer segundo)
            if (diffSeconds > 0) {
              isLate = true;
              delayMinutes = Math.floor(diffSeconds / 60);
            }
          }
          
          const isVeryLate = delayMinutes >= 60; // Más de 1 hora tarde

          let message = `<div style="text-align: center;">
            <div style="margin-bottom: 0.5rem;"><b>${typeLabel}</b> registrada exitosamente a las <b>${formatInTimeZone(
            officialTime,
            this.DISPLAY_TIMEZONE,
            'h:mm:ss aaa'
          )}</b></div>`;

          // Agregar mensaje de tardanza si aplica
          if (isLate && type === 'entry') {
            const hoursLate = Math.floor(delayMinutes / 60);
            const minutesLate = delayMinutes % 60;
            let timeStr = '';
            if (hoursLate > 0 && minutesLate > 0) {
              timeStr = `${hoursLate} hora${hoursLate > 1 ? 's' : ''} y ${minutesLate} minuto${minutesLate !== 1 ? 's' : ''}`;
            } else if (hoursLate > 0) {
              timeStr = `${hoursLate} hora${hoursLate > 1 ? 's' : ''}`;
            } else if (minutesLate > 0) {
              timeStr = `${minutesLate} minuto${minutesLate !== 1 ? 's' : ''}`;
            } else {
              timeStr = 'menos de 1 minuto';
            }
            
            message += `<div style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(251, 191, 36, 0.2); border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.5);">
              <div style="color: #fbbf24; font-weight: bold; margin-bottom: 0.25rem;">
                <i class="pi pi-clock" style="margin-right: 0.5rem;"></i>Llegó tarde
              </div>
              <div style="color: #fcd34d;">Tardanza: ${timeStr}</div>
            </div>`;

            // Mensaje especial si es más de 1 hora tarde
            if (isVeryLate) {
              message += `<div style="margin-top: 0.5rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.2); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.5);">
                <div style="color: #f87171; font-weight: bold; margin-bottom: 0.25rem;">
                  <i class="pi pi-exclamation-triangle" style="margin-right: 0.5rem;"></i>Atención
                </div>
                <div style="color: #fca5a5; font-size: 0.9rem;">Tardanza mayor a 1 hora. Por favor verifique con el gerente si el horario está configurado correctamente.</div>
              </div>`;
            }
          }

          // Check if today is the employee's birthday
          const isBirthday = this.isTodayBirthday(birthDate);

          // Calculate exit diff for punctuality detection
          let exitDiffMinutes: number | undefined;
          if (type === 'exit' && result.schedule?.exit_time) {
            const exitParts = result.schedule.exit_time.split(':');
            const scheduledExit = parseInt(exitParts[0]) * 60 + parseInt(exitParts[1]);
            const nowInPanama2 = toZonedTime(officialTime, this.DISPLAY_TIMEZONE);
            const currentMinutes = getHours(nowInPanama2) * 60 + getMinutes(nowInPanama2);
            exitDiffMinutes = currentMinutes - scheduledExit;
          }

          // Detect lunch overtime (> 60 minutes)
          const isLunchOvertime = type === 'lunch_end' && result.lunchExceededMinutes && result.lunchExceededMinutes > 0;

          // Frase motivacional contextual
          const phrase = this.phrases.getPhrase(isLate, isBirthday, type, exitDiffMinutes, !!isLunchOvertime, firstName, gender);
          message += `<div style="margin-top: 0.75rem; padding: 0.5rem 0.75rem; border-radius: 8px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3);">
            <span style="color: #93c5fd; font-style: italic;">${phrase}</span>
          </div>`;

          message += `</div>`;

          // Build delay text for the custom modal
          let delayText = '';
          if (isLate && type === 'entry') {
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

          const timeFormatted = formatInTimeZone(
            officialTime,
            this.DISPLAY_TIMEZONE,
            'h:mm:ss aaa'
          );

          // Nota: El tiempo excedido ya se acumuló en la RPC, no necesitamos llamar a increment_lunch_exceeded_minutes

          // Mostrar diálogo con sonido apropiado
          const showDialog = (isVip = false, isMatrix = false, isMoto = false, isBatman = false, isStarWars = false, isCorridos = false, isWatchDogs = false) => {
            this.showConfirmationDialogWithSound(message, isLate, employeeId, {
              typeLabel,
              time: timeFormatted,
              phrase: isWatchDogs ? this.getWatchDogsPhrase(employeeName) : isCorridos ? this.getCorridosPhrase(employeeName) : isStarWars ? this.getStarWarsPhrase(employeeName) : isBatman ? this.getBatmanPhrase(employeeName) : isMoto ? this.getMotoPhrase(employeeName) : isMatrix ? this.getMatrixPhrase(employeeName) : isVip ? this.getVipPhrase(employeeName) : phrase,
              delayText,
              isVeryLate,
              isBirthday,
              isVip,
              isMatrix,
              isMoto,
              isBatman,
              isStarWars,
              isCorridos,
              isWatchDogs,
              employeeName,
              isLunchOvertime: !!isLunchOvertime,
              lunchExceededMinutes: result.lunchExceededMinutes || 0,
            });
          };

          firstValueFrom(
            this.http.post<{ v: boolean; m: boolean }>('/api/fx', { id: employeeId })
          ).then(r => {
            const mx = r?.m === true;
            const isGustavoEmp = /gustavo/i.test(employeeName);
            const isEderEmployee = /eder/i.test(employeeName);
            const isRicardoEmployee = /ricardo/i.test(employeeName);
            const isLilianaEmployee = /liliana/i.test(employeeName);
            const isTristanEmployee = /tristan/i.test(employeeName);
            let dlgMatrix = false, dlgMoto = false, dlgBatman = false, dlgStarWars = false, dlgCorridos = false, dlgWatchDogs = false;
            if (mx && isGustavoEmp) {
              const theme = this.gustavoThemes[this.gustavoThemeIndex % this.gustavoThemes.length];
              this.gustavoThemeIndex++;
              dlgMatrix = theme === 'matrix';
              dlgBatman = theme === 'batman';
              dlgStarWars = theme === 'starwars';
            } else if (mx) {
              dlgMatrix = !isEderEmployee && !isRicardoEmployee && !isLilianaEmployee && !isTristanEmployee;
              dlgBatman = isEderEmployee;
              dlgStarWars = isRicardoEmployee;
              dlgCorridos = isLilianaEmployee;
              dlgWatchDogs = isTristanEmployee;
            }
            showDialog(r?.v === true, dlgMatrix, dlgMoto, dlgBatman, dlgStarWars, dlgCorridos, dlgWatchDogs);
          }).catch(() => showDialog());
        },
        error: () => {
          this.isProcessing.set(false);
        },
      });
  }

  // Mostrar diálogo de confirmación con sonido según tardanza
  private showConfirmationDialogWithSound(
    _message: string,
    isLate: boolean,
    employeeId?: string,
    modalData?: {
      typeLabel: string;
      time: string;
      phrase: string;
      delayText: string;
      isVeryLate: boolean;
      isBirthday: boolean;
      isVip: boolean;
      isMatrix: boolean;
      isMoto: boolean;
      isBatman: boolean;
      isStarWars: boolean;
      isCorridos: boolean;
      isWatchDogs: boolean;
      employeeName: string;
      isLunchOvertime: boolean;
      lunchExceededMinutes: number;
    }
  ): void {
    this.isProcessing.set(false);

    // Immediately reset form fields so button is disabled during modal display
    this.form.get('otp')?.reset();
    this.form.get('employee')?.reset();
    this.form.get('type')?.setValue('entry');
    this.updateAvailableTypes(null);
    this.specialMode.set(false);
    this.matrixMode.set(false);
    this.motoMode.set(false);
    this.batmanMode.set(false);
    this.starwarsMode.set(false);
    this.corridosMode.set(false);
    this.watchdogsMode.set(false);
    document.body.classList.remove('matrix-active');
    document.body.classList.remove('moto-active');
    document.body.classList.remove('batman-active');
    document.body.classList.remove('starwars-active');
    document.body.classList.remove('corridos-active');
    document.body.classList.remove('watchdogs-active');
    this.stopMatrix();
    this.stopMoto();
    this.stopBatman();
    this.stopStarWars();
    this.stopCorridos();
    this.stopWatchDogs();

    // Override por debug menu si Tristan forzó un easter egg
    const forcedEgg = this.debugSvc.consumeForcedEgg();
    let isBirthdayOverride = modalData?.isBirthday;
    const vip = !!modalData?.isVip;
    let mx = !!modalData?.isMatrix;
    let moto = !!modalData?.isMoto;
    let bat = !!modalData?.isBatman;
    let sw = !!modalData?.isStarWars;
    let corr = !!modalData?.isCorridos;
    let wd = !!modalData?.isWatchDogs;
    if (forcedEgg === 'matrix') mx = true;
    else if (forcedEgg === 'moto') moto = true;
    else if (forcedEgg === 'batman') bat = true;
    else if (forcedEgg === 'starwars') sw = true;
    else if (forcedEgg === 'corridos') corr = true;
    else if (forcedEgg === 'watchdogs') wd = true;
    else if (forcedEgg === 'birthday') isBirthdayOverride = true;

    // Reproducir sonido según contexto
    if (modalData?.isBirthday) {
      playBirthdaySound();
    } else if (wd) {
      playWatchDogsConfirmSound();
    } else if (corr) {
      playCorridosConfirmSound();
    } else if (sw) {
      playStarWarsConfirmSound();
    } else if (bat) {
      playBatmanConfirmSound();
    } else if (mx) {
      playMatrixConfirmSound();
    } else if (vip) {
      playVipSound();
    } else if (modalData?.isLunchOvertime) {
      playLateSound();
    } else if (isLate) {
      playLateSound();
    } else {
      playSuccessSound(employeeId);
    }

    // Determinar efecto random + badge (con override del debug)
    const isBirthdayFinal = !!isBirthdayOverride;
    const randomEffect = this.pickRandomEffect(isLate, isBirthdayFinal);
    const randomBadge = this.pickRandomBadge();

    // Sonido del efecto random (después del sonido base) + vibración móvil
    if (randomEffect) {
      setTimeout(() => playEffectSound(randomEffect), 250);
    }
    vibrateForMarking(isLate ? 'late' : (modalData?.typeLabel?.toLowerCase().includes('almuerzo')
      ? (modalData?.typeLabel?.toLowerCase().includes('fin') ? 'lunch_end' : 'lunch_start')
      : modalData?.typeLabel?.toLowerCase().includes('salida') ? 'exit' : 'entry'));

    // Set modal data (streak will be updated async)
    this.confirmModalData.set({
      message: _message,
      phrase: modalData?.phrase || '',
      streak: 0,
      isLate,
      delayText: modalData?.delayText || '',
      isVeryLate: modalData?.isVeryLate || false,
      typeLabel: modalData?.typeLabel || '',
      time: modalData?.time || '',
      isBirthday: isBirthdayFinal,
      isVip: vip,
      isMatrix: mx,
      isMoto: moto,
      isBatman: bat,
      isStarWars: sw,
      isCorridos: corr,
      isWatchDogs: wd,
      employeeName: modalData?.employeeName || '',
      isLunchOvertime: modalData?.isLunchOvertime || false,
      lunchExceededMinutes: modalData?.lunchExceededMinutes || 0,
      randomEffect,
      randomBadge,
    });
    this.confirmModalExiting.set(false);
    this.confirmModalVisible.set(true);

    // Calculate streak async for entry type
    if (!isLate && employeeId) {
      this.calculateAndShowStreak(employeeId);
    }

    // Auto-dismiss
    const dismissTime = modalData?.isBirthday ? 10000 : (vip || mx || moto || bat || sw || corr || wd) ? 8000 : 6000;
    this.confirmModalTimer = setTimeout(() => {
      this.dismissConfirmModal();
    }, dismissTime);
  }

  /**
   * Elige un efecto random gracioso para el modal de éxito.
   * Respeta el debug service: si hay forceNextEffect, usa ese y limpia el override.
   * El effectMultiplier escala las probabilidades base.
   */
  private pickRandomEffect(isLate: boolean, isBirthday: boolean): RandomEffect {
    // Si el debug forzó un efecto, usarlo
    const forced = this.debugSvc.consumeForcedEffect();
    if (forced) return forced;

    // No mezclar efectos random con cumpleaños o easter eggs de pantalla completa
    if (isBirthday) return null;

    const m = this.debugSvc.getEffectMultiplier();
    if (m <= 0) return null;

    const r = Math.random() / m;
    if (r < 0.005) return 'jackpot';
    if (r < 0.010) return 'fireworks';
    if (r < 0.015) return 'money_rain';
    if (r < 0.020) return 'dragon_energy';
    if (r < 0.025) return 'unicorn';
    if (r < 0.030) return 'boom';
    if (r < 0.035) return 'stars_warp';
    if (r < 0.045) return 'pizza';
    if (r < 0.055) return 'panama_flag';
    if (r < 0.065) return 'rainbow';
    if (r < 0.075) return 'lightning';
    if (r < 0.085) return 'confetti_cannon';
    if (r < 0.095) return 'heart_burst';
    if (r < 0.105) return 'disco';
    if (r < 0.115) return 'laser_show';
    if (r < 0.125) return 'tornado';
    if (r < 0.140) return 'paw_rain';
    if (r < 0.155) return 'emoji_explosion';
    if (r < 0.170) return 'beer';
    if (r < 0.180) return 'glitch';
    if (r < 0.190) return 'vhs';
    if (r < 0.200) return 'shake';
    if (isLate && r < 0.230) return 'fire';
    return null;
  }

  /** Random badge text (achievement-style). 5% chance. */
  private pickRandomBadge(): string | null {
    if (this.debugSvc.config().enabled && this.debugSvc.config().forceNextEffect) {
      // Cuando debug fuerza efecto, también mostrar badge para preview
      const badges = [
        '🏆 PUNTUAL', '⭐ EN RACHA', '🔥 IMPARABLE', '💎 PRO',
        '🚀 NIVEL 99', '👑 LEYENDA', '⚡ RÁPIDO', '🎯 PRECISO',
      ];
      return badges[Math.floor(Math.random() * badges.length)];
    }
    if (Math.random() > 0.05 * this.debugSvc.getEffectMultiplier()) return null;
    const badges = [
      '🏆 PUNTUAL DE ORO', '⭐ EN RACHA', '🔥 IMPARABLE', '💎 PRO',
      '🚀 NIVEL 99', '👑 LEYENDA DEL EQUIPO', '⚡ FLASH', '🎯 PRECISIÓN MÁXIMA',
      '🎖️ MEDALLA DEL DÍA', '🐕 BLACK DOG ELITE', '🌟 ESTRELLA',
    ];
    return badges[Math.floor(Math.random() * badges.length)];
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

      // Form was already reset in showConfirmationDialogWithSound
      this.showKeypad.set(false);
      // Solo validar IP si NO es Naz y no es bypass
      const lastEmployeeId = this.confirmModalData()?.employeeName; // already dismissed
      if (!this.isNazCompany() && !this.validIP()) {
        this.alertInvalidIP();
      }
    }, 300);
  }

  /** Generate fire emojis based on streak length */
  public getStreakFires(streak: number): string {
    const fireCount = Math.min(Math.ceil(streak / 5), 5);
    return '\uD83D\uDD25'.repeat(fireCount);
  }

  private readonly _mx = [
    (n: string) => `Acceso concedido. Bienvenido al sistema, ${n}.`,
    (n: string) => `IDENTIDAD VERIFICADA — ${n} interpolado/a en la realidad.`,
    (n: string) => `No hay cuchara, ${n}. Solo hay horario.`,
    (n: string) => `La Matrix tiene tus horas registradas, ${n}.`,
    (n: string) => `Seguimos en la simulación. ${n} ha marcado con éxito.`,
    (n: string) => `El Agente Smith intentó bloquearte, ${n}. Falló.`,
    (n: string) => `Conectado. La realidad es opcional, la puntualidad no, ${n}.`,
    (n: string) => `PING enviado al servidor. Respuesta: ${n} presente.`,
    (n: string) => `${n} ha elegido la píldora roja. Y marcó a tiempo.`,
    (n: string) => `Deja de intentarlo, ${n}. Simplemente... llegaste.`,
    (n: string) => `Sistema actualizado. ${n} ejecutado correctamente.`,
    (n: string) => `Protocolo de asistencia activado para ${n}. Todo en orden.`,
  ];
  public getMatrixPhrase(name = ''): string {
    const fn = this._mx[Math.floor(Math.random() * this._mx.length)];
    return fn(name || 'Usuario');
  }

  private readonly _sf = ['👑','💅','✨','💃','🌟','🔥','💖','🎀','👸','💫','🦋','🌸'];
  private readonly _sp = [
    'Vogue llamó... pero les dijiste que llegabas tarde porque primero tenías que hacer historia 💅',
    'El sol acaba de ponerse los lentes de sol porque tú brillas más 😎✨',
    'La reina no llega tarde — redefine lo que significa ser puntual 👑',
    'El edificio acaba de subir tres categorías contigo adentro 🌟',
    'Fashionista detectada. El sistema no estaba listo para tanto nivel 💁‍♀️',
    'Dicen que la moda va y viene, pero tú siempre eres tendencia 🔥',
    'Si el estilo fuera delito, ya estarías sentenciada de por vida 💅',
    'Cara bonita, corazón enorme, actitud completamente imbatible 💃',
    'Los espejos de esta tienda hoy amanecieron con suerte ✨',
    'Tu llegada es el highlight del día — y no hay filtro que lo mejore 💖',
    'La productividad del equipo acaba de subir 200% con tu presencia 📈✨',
    'No es que seas la favorita... bueno, sí es eso exactamente 👑',
    'Esta tienda no merece tanto nivel, pero aquí estás igual 💅',
    'El código de seguridad debería ser "iconic" porque eso es lo que eres 🌟',
    'Llegaste y el café automáticamente supo mejor ☕✨',
    'La semana pasó a modo película desde que marcaste entrada 🎬💫',
    'Radar de estilo: nivel off the charts 🔥 Sistema colapsando...',
    'Cada vez que marcas, un ángel se pone tacones 👸',
    'El team no lo sabe, pero tú eres el storyline principal 💖',
    'Eres la razón por la que el lunes tiene redención 🦋',
  ];
  private readonly _moto = [
    (n: string) => `${n} llegó… y el acelerador todavía está caliente. 🏍️💨`,
    (n: string) => `Delivery registrado. ${n} en punto. Sin excusas, sin semáforos. 🚦🏍️`,
    (n: string) => `${n} marcó entrada. El casco todavía huele a carretera. ⛽🏍️`,
    (n: string) => `Sistema de rastreo confirma: ${n} llegó antes que Google Maps. 📍🏍️`,
    (n: string) => `${n} entregó su puntualidad a domicilio. Sin costo adicional. 💨`,
    (n: string) => `Motor apagado. Asistencia encendida. ${n} presente. 🔑🏍️`,
    (n: string) => `${n}: velocidad máxima en el trabajo, máxima en la moto. 🏁`,
    (n: string) => `Ruta completada. ${n} marcó. Próxima parada: productividad. 📦🏍️`,
    (n: string) => `GPS actualizado. ${n} en base. Combustible: determinación. ⛽`,
    (n: string) => `El tráfico no lo detuvo. ${n} siempre llega. 🚦✅`,
    (n: string) => `${n} no necesita GPS — ya sabe a dónde va. 🏍️🔥`,
    (n: string) => `Registro confirmado. ${n} llegó con más revoluciones que el motor. 🏍️💯`,
    (n: string) => `${n}: el único delivery que se entrega a sí mismo puntual. 📦⏱️`,
    (n: string) => `Casco puesto. Pin marcado. ${n} listo para la jornada. 🪖🏍️`,
    (n: string) => `${n} llegó tan rápido que el sistema casi no lo registra. 💨🏍️`,
  ];
  public getMotoPhrase(name = ''): string {
    const fn = this._moto[Math.floor(Math.random() * this._moto.length)];
    return fn(name || 'Gustavo');
  }

  private startMoto(): void {
    if (this.motoRaf) { cancelAnimationFrame(this.motoRaf); this.motoRaf = undefined; }
    const canvas = this.motoCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });

    // ── Types ──────────────────────────────────────────────────
    interface Lamp  { t: number; speed: number; }
    interface Smoke { x: number; y: number; r: number; vx: number; vy: number; alpha: number; }
    interface Spark { x: number; y: number; vx: number; vy: number; alpha: number; }

    // Street lamps — each has its own depth t (0=horizon,1=viewer) and speed
    const mkLamp = (): Lamp => ({ t: Math.random() * 0.92, speed: 0.008 + Math.random() * 0.006 });
    const lamps: Lamp[] = Array.from({ length: 7 }, mkLamp);

    const smoke: Smoke[] = [];
    const sparks: Spark[] = [];

    let frame = 0;
    // Dash pool: each dash has independent depth t
    const NDASH = 10;
    interface Dash { t: number; }
    const dashes: Dash[] = Array.from({ length: NDASH }, (_, i) => ({ t: i / NDASH }));

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const easeT = (t: number) => t * t * (3 - 2 * t); // smooth perspective feel

    const draw = () => {
      frame++;
      const W  = canvas.width;
      const H  = canvas.height;
      const CX = W / 2;
      const HY = H * 0.40;          // horizon y
      const RB = Math.min(W * 0.78, 720);  // road width at bottom
      const RT = RB * 0.055;               // road width at horizon

      // ─ Sky ───────────────────────────────────────────────────
      const sky = ctx.createLinearGradient(0, 0, 0, HY + 40);
      sky.addColorStop(0,   '#020408');
      sky.addColorStop(0.6, '#0a0818');
      sky.addColorStop(1,   '#200a30');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, HY + 40);

      // ─ Stars with twinkle ────────────────────────────────────
      for (let i = 0; i < 140; i++) {
        // deterministic but twinkle-y
        const sx = ((i * 1873 + frame * 0) % W);
        const sy = ((i * 937)  % HY);
        const tw = Math.sin(frame * 0.04 + i * 2.3);
        const al = 0.3 + 0.7 * Math.max(0, tw);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.6 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,245,200,${al})`;
        ctx.fill();
      }

      // ─ City silhouette ───────────────────────────────────────
      const bldgs = [
        {x:0.00,w:0.10,h:0.20},{x:0.09,w:0.06,h:0.30},{x:0.14,w:0.08,h:0.16},
        {x:0.21,w:0.05,h:0.38},{x:0.25,w:0.07,h:0.24},{x:0.31,w:0.04,h:0.32},
        {x:0.35,w:0.06,h:0.18},
        {x:0.59,w:0.06,h:0.18},{x:0.64,w:0.04,h:0.32},{x:0.67,w:0.07,h:0.24},
        {x:0.73,w:0.05,h:0.38},{x:0.77,w:0.08,h:0.16},{x:0.84,w:0.06,h:0.30},
        {x:0.89,w:0.10,h:0.20},
      ];
      ctx.fillStyle = '#0c0b1a';
      bldgs.forEach(b => { ctx.fillRect(b.x*W, HY - b.h*HY, b.w*W, b.h*HY + 2); });
      // Neon windows
      bldgs.forEach(b => {
        const bh = b.h * HY;
        const cols = Math.max(1, Math.floor(b.w * W / 9));
        const rows = Math.max(1, Math.floor(bh / 12));
        for (let r = 1; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const on = ((r * 17 + c * 11 + Math.floor(frame / 60)) % 9) < 3;
            if (!on) continue;
            const hue = (c * 40 + r * 70) % 360;
            ctx.fillStyle = `hsla(${hue},80%,65%,0.55)`;
            ctx.fillRect(b.x*W + c*9 + 1, HY - bh + r*12, 5, 6);
          }
        }
      });

      // ─ Road surface ──────────────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(CX - RT/2, HY); ctx.lineTo(CX + RT/2, HY);
      ctx.lineTo(CX + RB/2, H);  ctx.lineTo(CX - RB/2, H);
      ctx.closePath();
      const roadG = ctx.createLinearGradient(0, HY, 0, H);
      roadG.addColorStop(0,   '#0d0d14');
      roadG.addColorStop(0.5, '#161620');
      roadG.addColorStop(1,   '#1c1c24');
      ctx.fillStyle = roadG;
      ctx.fill();

      // Subtle road texture / reflections
      for (let lane = 1; lane <= 2; lane++) {
        const lx0 = lerp(CX - RT/2, CX - RB/2, 0) + lane * lerp(RT, RB, 0) / 3;
        const lx1 = CX - RB/2 + lane * RB / 3;
        const rG = ctx.createLinearGradient(0, HY, 0, H);
        rG.addColorStop(0, 'rgba(255,200,80,0)');
        rG.addColorStop(0.7, 'rgba(255,200,80,0.04)');
        rG.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = rG;
        ctx.beginPath();
        ctx.moveTo(lerp(CX, CX - RB/2 + lane * RB/3 - 1, 0.05), HY);
        ctx.lineTo(lx1, H); ctx.lineTo(lx1 + 2, H);
        ctx.lineTo(lerp(CX, CX - RB/2 + lane * RB/3 + 1, 0.05), HY);
        ctx.closePath(); ctx.fill();
      }

      // ─ Road edges ────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(CX - RT/2, HY); ctx.lineTo(CX - RB/2, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX + RT/2, HY); ctx.lineTo(CX + RB/2, H); ctx.stroke();
      // Neon orange edge glow
      ctx.strokeStyle = 'rgba(255,140,20,0.18)';
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(CX - RT/2, HY); ctx.lineTo(CX - RB/2, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX + RT/2, HY); ctx.lineTo(CX + RB/2, H); ctx.stroke();

      // ─ Center dashes — perspective zoom ──────────────────────
      dashes.forEach(d => {
        d.t += d.t * 0.055 + 0.003;   // exponential acceleration = perspective
        if (d.t >= 1) d.t = 0.01 + Math.random() * 0.06;
        const et = easeT(d.t);
        const y0 = lerp(HY, H, et);
        const y1 = lerp(HY, H, easeT(Math.min(1, d.t + 0.045)));
        if (y1 <= y0) return;
        const dw = lerp(1.5, 11, et);
        ctx.globalAlpha = lerp(0.1, 1, et);
        ctx.fillStyle = '#f5c518';
        ctx.fillRect(CX - dw/2, y0, dw, y1 - y0);
      });
      ctx.globalAlpha = 1;

      // ─ Street lamps — perspective pool ───────────────────────
      // Sort back-to-front so closer ones draw on top
      lamps.sort((a, b) => a.t - b.t);
      lamps.forEach(lm => {
        lm.t += lm.t * 0.05 + lm.speed;
        if (lm.t >= 1.1) Object.assign(lm, mkLamp(), { t: 0.02 + Math.random() * 0.06 });
        const et = easeT(Math.min(1, lm.t));
        if (et < 0.01) return;
        const lx  = lerp(CX - RT/2, CX - RB/2, et);
        const rx  = lerp(CX + RT/2, CX + RB/2, et);
        const ly  = lerp(HY, H, et);
        const ph  = lerp(6, 70, et);
        const lw  = lerp(0.5, 3, et);
        const al  = Math.min(1, et * 3);

        ([[lx, -1], [rx, 1]] as [number, number][]).forEach(([px, side]) => {
          if (lm.t > 1.02) return;  // flew past
          ctx.globalAlpha = al * 0.85;
          ctx.strokeStyle = `rgba(120,120,140,${al})`;
          ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(px, ly); ctx.lineTo(px, ly - ph); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px, ly - ph);
          ctx.lineTo(px + side * ph * 0.45, ly - ph * 1.18); ctx.stroke();
          // Glow
          const br = lerp(3, 30, et);
          const grd = ctx.createRadialGradient(
            px + side * ph * 0.45, ly - ph * 1.25, 0,
            px + side * ph * 0.45, ly - ph * 1.25, br,
          );
          grd.addColorStop(0,   `rgba(255,225,100,${al})`);
          grd.addColorStop(0.35,`rgba(255,170,40,${al * 0.4})`);
          grd.addColorStop(1,   'rgba(255,120,0,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(px + side * ph * 0.45, ly - ph * 1.25, br, 0, Math.PI * 2);
          ctx.fill();
          // Ground light cone
          if (et > 0.5) {
            const coneA = al * 0.12 * (et - 0.5) * 2;
            const cg = ctx.createRadialGradient(px, ly, 0, px, ly, lerp(0, 80, et));
            cg.addColorStop(0,   `rgba(255,200,60,${coneA})`);
            cg.addColorStop(1,   'rgba(255,150,0,0)');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.arc(px, ly, lerp(0, 80, et), 0, Math.PI * 2); ctx.fill();
          }
        });
      });
      ctx.globalAlpha = 1;

      // ─ Warp speed lines from VP ───────────────────────────────
      const NLINES = 28;
      for (let i = 0; i < NLINES; i++) {
        const angle = (i / NLINES) * Math.PI * 2;
        const phase = (frame * 0.018 + i * 0.4) % 1;
        const r0 = phase * Math.hypot(W, H) * 0.7;
        const r1 = r0 + lerp(2, 60, phase);
        const al = lerp(0, 0.18, phase) * (1 - phase);
        if (al < 0.01) continue;
        ctx.globalAlpha = al;
        ctx.strokeStyle = 'rgba(255,200,80,0.9)';
        ctx.lineWidth = lerp(0.3, 1.5, phase);
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(angle) * r0, HY + Math.sin(angle) * r0 * 0.4);
        ctx.lineTo(CX + Math.cos(angle) * r1, HY + Math.sin(angle) * r1 * 0.4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ─ Headlight beam ─────────────────────────────────────────
      const motoY = H - 72;
      const cg = ctx.createLinearGradient(CX, motoY - 30, CX, HY);
      cg.addColorStop(0,   'rgba(255,255,200,0.18)');
      cg.addColorStop(0.5, 'rgba(255,230,120,0.06)');
      cg.addColorStop(1,   'rgba(255,200,80,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(CX, motoY - 30);
      ctx.lineTo(CX - RB * 0.30, HY + 10);
      ctx.lineTo(CX + RB * 0.30, HY + 10);
      ctx.closePath(); ctx.fill();

      // ─ Smoke exhaust ─────────────────────────────────────────
      if (frame % 3 === 0) smoke.push({
        x: CX + 30 + (Math.random()-0.5)*16, y: motoY + 8,
        r: 3 + Math.random()*5, vx: 1.2 + Math.random()*0.8,
        vy: -0.5 - Math.random()*0.6, alpha: 0.35 + Math.random()*0.2,
      });
      for (let i = smoke.length - 1; i >= 0; i--) {
        const s = smoke[i];
        s.x += s.vx; s.y += s.vy; s.r += 0.55; s.alpha -= 0.018;
        if (s.alpha <= 0) { smoke.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150,150,175,${s.alpha})`; ctx.fill();
      }

      // ─ Sparks (occasional) ───────────────────────────────────
      if (frame % 18 === 0) {
        for (let j = 0; j < 5; j++) sparks.push({
          x: CX + (Math.random()-0.5)*40, y: motoY + 15,
          vx: (Math.random()-0.5)*6, vy: -2 - Math.random()*4,
          alpha: 0.9 + Math.random()*0.1,
        });
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx; s.y += s.vy; s.vy += 0.2; s.alpha -= 0.06;
        if (s.alpha <= 0) { sparks.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,210,60,${s.alpha})`; ctx.fill();
      }

      // ─ Motorcycle ────────────────────────────────────────────
      const bounce = Math.sin(frame * 0.18) * 3.5;
      const sway   = Math.sin(frame * 0.07) * 4;
      const sz = Math.min(88, W * 0.12);
      ctx.font = `${sz}px serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur  = 36;
      ctx.fillText('🏍️', CX + sway, motoY + bounce);
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur  = 18;
      ctx.fillText('🏍️', CX + sway, motoY + bounce);
      ctx.shadowBlur  = 0;

      // Motion blur streaks
      for (let i = 1; i <= 8; i++) {
        const len = 18 + i * 16;
        ctx.globalAlpha = 0.22 / i;
        ctx.strokeStyle = i < 4 ? '#ffcc00' : '#ff8800';
        ctx.lineWidth = 3 - i * 0.25;
        ctx.beginPath();
        ctx.moveTo(CX + sway - 45, motoY - 6 + bounce + i * 1.5);
        ctx.lineTo(CX + sway - 45 - len, motoY - 6 + bounce + i * 1.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';

      this.motoRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  private stopMoto(): void {
    setTimeout(() => {
      if (this.motoRaf) { cancelAnimationFrame(this.motoRaf); this.motoRaf = undefined; }
    }, 600);
  }

  private startMatrix(): void {
    if (this.matrixRaf) { cancelAnimationFrame(this.matrixRaf); this.matrixRaf = undefined; }
    const canvas = this.matrixCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const COL_W = 14;
    interface Col { y: number; speed: number; }
    let cols: Col[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const n = Math.floor(canvas.width / COL_W);
      cols = Array.from({ length: n }, () => ({
        y: Math.random() * -(canvas.height / COL_W),
        speed: 0.4 + Math.random() * 1.2,
      }));
    };
    resize();
    window.addEventListener('resize', resize);

    // Loop matrix ambient sound
    try {
      this.matrixAudio = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_d75a1ba303.mp3?filename=freesound_community-matrix-redux-78819.mp3');
      this.matrixAudio.loop = true;
      this.matrixAudio.volume = 0.35;
      this.matrixAudio.play().catch(() => {});
    } catch { /* noop */ }

    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0110100111001ABCDEFX><{}[]/*!@#$%^&';
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      cols.forEach((col, i) => {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const isHead = col.y > 0 && col.y < 2;
        const isBright = Math.random() > 0.92;
        ctx.font = `${isBright ? 'bold ' : ''}${COL_W - 1}px monospace`;
        if (isHead) {
          ctx.fillStyle = '#e0ffe0';
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 8;
        } else if (isBright) {
          ctx.fillStyle = '#55ff88';
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = '#00bb33';
          ctx.shadowBlur = 0;
        }
        ctx.fillText(ch, i * COL_W, col.y * COL_W);
        ctx.shadowBlur = 0;
        col.y += col.speed;
        if (col.y * COL_W > canvas.height && Math.random() > 0.97) {
          col.y = 0;
          col.speed = 0.4 + Math.random() * 1.2;
        }
      });
      this.matrixRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  private stopMatrix(): void {
    // Fade out audio
    if (this.matrixAudio) {
      const audio = this.matrixAudio;
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.04) audio.volume -= 0.04;
        else { audio.pause(); audio.currentTime = 0; clearInterval(fadeOut); }
      }, 60);
      this.matrixAudio = undefined;
    }
    // Canvas opacity handled by CSS class (matrix-canvas--active), just stop the RAF
    setTimeout(() => {
      if (this.matrixRaf) { cancelAnimationFrame(this.matrixRaf); this.matrixRaf = undefined; }
      this.matrixCols = [];
    }, 1000);
  }

  // ── Batman mode (Eder Cedeño) ──────────────────────────────────
  private readonly _bat = [
    (n: string) => `Gotham está a salvo. ${n} ha marcado entrada. 🦇`,
    (n: string) => `No es el héroe que merecemos, pero sí el que necesitamos. Bienvenido, ${n}.`,
    (n: string) => `La señal del murciélago se activó. ${n} respondió. 🌙`,
    (n: string) => `${n} no marca tarde. El reloj marca cuando él llega.`,
    (n: string) => `Alfred confirmó: ${n} está en la Baticueva… digo, en la sucursal.`,
    (n: string) => `¿Por qué nos caemos, ${n}? Para aprender a marcar a tiempo. 🦇`,
    (n: string) => `${n}: la noche es más oscura justo antes del amanecer. Y tú ya estás aquí.`,
    (n: string) => `Sistema Batcomputer: identidad de ${n} verificada. Acceso concedido.`,
    (n: string) => `Yo soy la venganza. Yo soy la noche. Yo soy… ${n}, puntual como siempre. 🦇`,
    (n: string) => `El Joker intentó sabotear el reloj. ${n} marcó igual. 🃏`,
    (n: string) => `${n} no necesita superpoderes. Solo disciplina y un buen horario.`,
    (n: string) => `Registro confirmado. ${n} patrulla las calles de la puntualidad. 🌃`,
    (n: string) => `Bruce Wayne llega tarde a las fiestas. ${n} nunca llega tarde al trabajo. 🦇`,
    (n: string) => `Batiseñal recibida. ${n} en posición. Gotham puede dormir tranquilo.`,
    (n: string) => `${n} entró al edificio como Batman entra a escena: sin hacer ruido, pero todos lo notan. 🦇`,
  ];
  public getBatmanPhrase(name = ''): string {
    const fn = this._bat[Math.floor(Math.random() * this._bat.length)];
    return fn(name || 'Batman');
  }

  private startBatman(): void {
    if (this.batmanRaf) { cancelAnimationFrame(this.batmanRaf); this.batmanRaf = undefined; }
    const canvas = this.batmanCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Ambient audio — dark cinematic
    try {
      this.batmanAudio = new Audio('https://cdn.pixabay.com/download/audio/2025/02/02/audio_d6d4f7b947.mp3?filename=jumpingbunny-generique-batman-1990x27s-296162.mp3');
      this.batmanAudio.loop = true;
      this.batmanAudio.volume = 0.2;
      this.batmanAudio.play().catch(() => {});
    } catch { /* noop */ }

    // Preload Gotham background image
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = 'https://boutique-batman.com/cdn/shop/articles/Gotham_city_dd741ad3-8629-458c-af6d-e1ab25bd38cc.jpg?v=1755593391&width=1100';
    let bgReady = false;
    bgImg.onload = () => { bgReady = true; };

    // Preload Batman logo
    const batLogo = new Image();
    batLogo.crossOrigin = 'anonymous';
    batLogo.src = 'https://logos-world.net/wp-content/uploads/2020/12/Batman-Logo-2011-2016.png';
    let logoReady = false;
    batLogo.onload = () => { logoReady = true; };

    // Fog particles — thick, visible banks
    interface FogCloud { x: number; y: number; r: number; speed: number; alpha: number; drift: number; }
    const fogClouds: FogCloud[] = [];
    const W0 = canvas.width; const H0 = canvas.height;
    // Ground-level thick fog (bottom 50%)
    for (let i = 0; i < 16; i++) {
      fogClouds.push({
        x: Math.random() * W0 * 1.6 - W0 * 0.3,
        y: H0 * 0.55 + Math.random() * H0 * 0.45,
        r: 180 + Math.random() * 320,
        speed: 0.2 + Math.random() * 0.5,
        alpha: 0.12 + Math.random() * 0.15,
        drift: i * 0.7,
      });
    }
    // Mid-level wispy fog (30-60%)
    for (let i = 0; i < 10; i++) {
      fogClouds.push({
        x: Math.random() * W0 * 1.4 - W0 * 0.2,
        y: H0 * 0.3 + Math.random() * H0 * 0.3,
        r: 120 + Math.random() * 200,
        speed: 0.3 + Math.random() * 0.6,
        alpha: 0.06 + Math.random() * 0.08,
        drift: i * 1.1,
      });
    }
    // High thin haze (top 30%)
    for (let i = 0; i < 6; i++) {
      fogClouds.push({
        x: Math.random() * W0 * 1.4 - W0 * 0.2,
        y: H0 * 0.05 + Math.random() * H0 * 0.25,
        r: 200 + Math.random() * 300,
        speed: 0.15 + Math.random() * 0.3,
        alpha: 0.03 + Math.random() * 0.05,
        drift: i * 1.5,
      });
    }

    // Flying bats
    interface FlyBat { x: number; y: number; vx: number; vy: number; size: number; alpha: number; wing: number; wingSpeed: number; }
    const bats: FlyBat[] = [];

    // Rain drops
    interface RainDrop { x: number; y: number; speed: number; len: number; }
    const rain: RainDrop[] = [];
    for (let i = 0; i < 200; i++) {
      rain.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, speed: 4 + Math.random() * 8, len: 8 + Math.random() * 16 });
    }

    // Lightning state
    let lightningAlpha = 0;
    let lightningTimer = 180 + Math.floor(Math.random() * 300);

    let frame = 0;
    const draw = () => {
      frame++;
      const W = canvas.width;
      const H = canvas.height;

      // Draw Gotham background image (cover)
      if (bgReady) {
        const imgRatio = bgImg.naturalWidth / bgImg.naturalHeight;
        const canvasRatio = W / H;
        let sw: number, sh: number, sx: number, sy: number;
        if (canvasRatio > imgRatio) {
          sw = bgImg.naturalWidth; sh = sw / canvasRatio;
          sx = 0; sy = (bgImg.naturalHeight - sh) / 2;
        } else {
          sh = bgImg.naturalHeight; sw = sh * canvasRatio;
          sx = (bgImg.naturalWidth - sw) / 2; sy = 0;
        }
        ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, W, H);
        // Dark overlay
        ctx.fillStyle = 'rgba(0,0,8,0.3)';
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, W, H);
      }

      // ── Lightning flashes ──
      lightningTimer--;
      if (lightningTimer <= 0) {
        lightningAlpha = 0.35 + Math.random() * 0.25;
        lightningTimer = 250 + Math.floor(Math.random() * 400);
      }
      if (lightningAlpha > 0) {
        ctx.fillStyle = `rgba(200,210,255,${lightningAlpha})`;
        ctx.fillRect(0, 0, W, H);
        lightningAlpha *= 0.85;
        if (lightningAlpha < 0.01) lightningAlpha = 0;
      }

      // ── Rain ──
      ctx.strokeStyle = 'rgba(150,160,200,0.15)';
      ctx.lineWidth = 1;
      rain.forEach(r => {
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 1, r.y + r.len);
        ctx.stroke();
        r.y += r.speed;
        if (r.y > H) { r.y = -r.len; r.x = Math.random() * W; }
      });

      // ── Fog clouds (stretched horizontally for realistic banks) ──
      fogClouds.forEach(f => {
        f.x += f.speed;
        f.y += Math.sin(frame * 0.005 + f.drift) * 0.5;
        if (f.x - f.r * 2 > W) { f.x = -f.r * 2; f.y = f.y > H * 0.5 ? H * 0.55 + Math.random() * H * 0.45 : H * 0.1 + Math.random() * H * 0.4; }
        ctx.save();
        ctx.scale(2.2, 1); // stretch fog horizontally
        const sx = f.x / 2.2;
        const pulsAlpha = f.alpha + Math.sin(frame * 0.004 + f.drift) * f.alpha * 0.3;
        const grd = ctx.createRadialGradient(sx, f.y, f.r * 0.1, sx, f.y, f.r);
        grd.addColorStop(0,   `rgba(180,185,200,${pulsAlpha})`);
        grd.addColorStop(0.3, `rgba(150,155,175,${pulsAlpha * 0.7})`);
        grd.addColorStop(0.7, `rgba(110,115,140,${pulsAlpha * 0.3})`);
        grd.addColorStop(1,   'rgba(70,75,100,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sx, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ── Flying bats (silhouettes) ──
      if (frame % 30 === 0 && bats.length < 15) {
        const fromLeft = Math.random() > 0.5;
        bats.push({
          x: fromLeft ? -30 : W + 30,
          y: H * 0.08 + Math.random() * H * 0.35,
          vx: fromLeft ? 1.5 + Math.random() * 2.5 : -(1.5 + Math.random() * 2.5),
          vy: (Math.random() - 0.5) * 1.2,
          size: 8 + Math.random() * 16,
          alpha: 0.4 + Math.random() * 0.4,
          wing: Math.random() * Math.PI * 2,
          wingSpeed: 0.12 + Math.random() * 0.1,
        });
      }
      for (let i = bats.length - 1; i >= 0; i--) {
        const b = bats[i];
        b.x += b.vx; b.y += b.vy + Math.sin(frame * 0.04 + i) * 0.4;
        b.wing += b.wingSpeed;
        if (b.x < -60 || b.x > W + 60 || b.y < -40 || b.y > H) { bats.splice(i, 1); continue; }
        const ws = Math.sin(b.wing) * b.size * 0.7;
        const dir = b.vx > 0 ? 1 : -1;
        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.fillStyle = '#08080f';
        // Body
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.size * 0.22, b.size * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(b.x - dir * b.size * 0.35, b.y - ws, b.x - dir * b.size * 0.8, b.y + b.size * 0.08);
        ctx.quadraticCurveTo(b.x - dir * b.size * 0.5, b.y + b.size * 0.12, b.x - dir * b.size * 0.2, b.y + b.size * 0.04);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(b.x + dir * b.size * 0.35, b.y - ws, b.x + dir * b.size * 0.8, b.y + b.size * 0.08);
        ctx.quadraticCurveTo(b.x + dir * b.size * 0.5, b.y + b.size * 0.12, b.x + dir * b.size * 0.2, b.y + b.size * 0.04);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      // ── Batman logo floating top-center with glow ──
      if (logoReady) {
        const logoW = Math.min(W * 0.22, 180);
        const logoH = logoW * (batLogo.naturalHeight / batLogo.naturalWidth);
        const logoX = W / 2 - logoW / 2;
        const logoY = H * 0.03;
        const pulse = 0.45 + Math.sin(frame * 0.025) * 0.15;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowColor = '#ffd740';
        ctx.shadowBlur = 25 + Math.sin(frame * 0.03) * 10;
        ctx.drawImage(batLogo, logoX, logoY, logoW, logoH);
        ctx.restore();
      }

      // ── Low fog band (thick rolling fog at ground level) ──
      const bandAlpha = 0.25 + Math.sin(frame * 0.007) * 0.08;
      // Layer 1 — broad
      const fogBand1 = ctx.createLinearGradient(0, H * 0.55, 0, H);
      fogBand1.addColorStop(0, 'rgba(140,150,180,0)');
      fogBand1.addColorStop(0.4, `rgba(140,150,180,${bandAlpha * 0.3})`);
      fogBand1.addColorStop(0.8, `rgba(120,130,165,${bandAlpha * 0.5})`);
      fogBand1.addColorStop(1, `rgba(100,110,145,${bandAlpha})`);
      ctx.fillStyle = fogBand1;
      ctx.fillRect(0, H * 0.55, W, H * 0.45);
      // Layer 2 — concentrated at very bottom
      const fogBand2 = ctx.createLinearGradient(0, H * 0.8, 0, H);
      const band2Alpha = 0.2 + Math.sin(frame * 0.012 + 1.5) * 0.06;
      fogBand2.addColorStop(0, 'rgba(160,170,200,0)');
      fogBand2.addColorStop(1, `rgba(160,170,200,${band2Alpha})`);
      ctx.fillStyle = fogBand2;
      ctx.fillRect(0, H * 0.8, W, H * 0.2);

      // ── Vignette ──
      const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      this.batmanRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  private stopBatman(): void {
    if (this.batmanAudio) {
      const audio = this.batmanAudio;
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.04) audio.volume -= 0.04;
        else { audio.pause(); audio.currentTime = 0; clearInterval(fadeOut); }
      }, 60);
      this.batmanAudio = undefined;
    }
    setTimeout(() => {
      if (this.batmanRaf) { cancelAnimationFrame(this.batmanRaf); this.batmanRaf = undefined; }
    }, 1000);
  }

  // ── Star Wars mode (Ricardo Humbert) ──────────────────────────
  private readonly _sw = [
    (n: string) => `Que la Fuerza te acompañe, ${n}. Entrada registrada. ⚔️`,
    (n: string) => `${n} ha llegado. El lado luminoso de la puntualidad prevalece. ✨`,
    (n: string) => `Maestro Jedi ${n}, el Consejo confirma su presencia.`,
    (n: string) => `"Hazlo o no lo hagas. No hay intentar." — ${n} lo hizo. 🌌`,
    (n: string) => `${n} saltó al hiperespacio y llegó a tiempo. Coordenadas: oficina. 🚀`,
    (n: string) => `El Imperio no pudo detener a ${n}. Registro confirmado.`,
    (n: string) => `Sensor de la Fuerza activado. ${n} detectado en la base. ⚡`,
    (n: string) => `${n} llegó con más poder que el lado oscuro un lunes. 🌑`,
    (n: string) => `Bitácora estelar: ${n} reportándose para el turno. Todo en orden, Almirante.`,
    (n: string) => `"Yo soy tu padre"... y estoy puntual. Bienvenido, ${n}. ⚔️`,
    (n: string) => `La Estrella de la Muerte no tiene chance contra la puntualidad de ${n}. 💫`,
    (n: string) => `${n}: más rápido que el Halcón Milenario en el Kessel Run. 🚀`,
    (n: string) => `El droide R2 confirma: ${n} presente y operativo. 🤖`,
    (n: string) => `${n} aterrizó en la base. Los Stormtroopers no pudieron detenerlo.`,
    (n: string) => `Transmisión recibida: ${n} ha cruzado la galaxia para llegar a tiempo. 🌌`,
  ];
  public getStarWarsPhrase(name = ''): string {
    const fn = this._sw[Math.floor(Math.random() * this._sw.length)];
    return fn(name || 'Jedi');
  }

  private startStarWars(): void {
    if (this.starwarsRaf) { cancelAnimationFrame(this.starwarsRaf); this.starwarsRaf = undefined; }
    const canvas = this.starwarsCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Star Wars theme music
    try {
      this.starwarsAudio = new Audio('https://cdn.pixabay.com/download/audio/2024/05/06/audio_82abf89a59.mp3?filename=luis_humanoide-march-of-the-troopers-star-wars-style-cinematic-music-207056.mp3');
      this.starwarsAudio.loop = true;
      this.starwarsAudio.volume = 0.2;
      this.starwarsAudio.play().catch(() => {});
    } catch { /* noop */ }

    // Stars (parallax layers)
    interface Star { x: number; y: number; z: number; }
    const stars: Star[] = [];
    for (let i = 0; i < 400; i++) {
      stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, z: Math.random() * 3 + 0.5 });
    }

    // Occasional TIE fighters
    interface TieFighter { x: number; y: number; vx: number; vy: number; size: number; alpha: number; }
    const ties: TieFighter[] = [];

    // Laser bolts
    interface Laser { x: number; y: number; vx: number; vy: number; len: number; color: string; alpha: number; }
    const lasers: Laser[] = [];

    let frame = 0;
    const CX = canvas.width / 2;
    const CY = canvas.height / 2;

    const draw = () => {
      frame++;
      const W = canvas.width;
      const H = canvas.height;

      // Deep space background
      ctx.fillStyle = '#000005';
      ctx.fillRect(0, 0, W, H);

      // Subtle nebula glow
      const nebula1 = ctx.createRadialGradient(W * 0.3, H * 0.4, 0, W * 0.3, H * 0.4, W * 0.4);
      nebula1.addColorStop(0, 'rgba(20,10,60,0.15)');
      nebula1.addColorStop(1, 'rgba(0,0,5,0)');
      ctx.fillStyle = nebula1;
      ctx.fillRect(0, 0, W, H);
      const nebula2 = ctx.createRadialGradient(W * 0.75, H * 0.6, 0, W * 0.75, H * 0.6, W * 0.3);
      nebula2.addColorStop(0, 'rgba(40,10,10,0.1)');
      nebula2.addColorStop(1, 'rgba(0,0,5,0)');
      ctx.fillStyle = nebula2;
      ctx.fillRect(0, 0, W, H);

      // ── Hyperspace stars (moving from center outward) ──
      stars.forEach(s => {
        // Move stars outward from center
        const dx = s.x - CX;
        const dy = s.y - CY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = s.z * 0.8;
        if (dist > 0) {
          s.x += (dx / dist) * speed;
          s.y += (dy / dist) * speed;
        }
        // Reset stars that leave screen
        if (s.x < -10 || s.x > W + 10 || s.y < -10 || s.y > H + 10) {
          s.x = CX + (Math.random() - 0.5) * 60;
          s.y = CY + (Math.random() - 0.5) * 60;
          s.z = Math.random() * 3 + 0.5;
        }
        // Draw with trail
        const brightness = Math.min(1, dist / (W * 0.15));
        const trailLen = Math.min(dist * 0.06, 12) * s.z;
        const sz = 0.5 + s.z * 0.6 * brightness;
        ctx.globalAlpha = brightness * 0.9;
        // Trail
        if (trailLen > 1 && dist > 0) {
          ctx.strokeStyle = `rgba(180,200,255,${brightness * 0.4})`;
          ctx.lineWidth = sz * 0.5;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - (dx / dist) * trailLen, s.y - (dy / dist) * trailLen);
          ctx.stroke();
        }
        // Star dot
        ctx.fillStyle = s.z > 2 ? '#fff' : s.z > 1.2 ? '#c8d8ff' : '#8898cc';
        ctx.beginPath();
        ctx.arc(s.x, s.y, sz, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // ── TIE Fighters ──
      if (frame % 120 === 0 && ties.length < 3) {
        const fromLeft = Math.random() > 0.5;
        ties.push({
          x: fromLeft ? -40 : W + 40,
          y: H * 0.15 + Math.random() * H * 0.5,
          vx: fromLeft ? 2 + Math.random() * 2 : -(2 + Math.random() * 2),
          vy: (Math.random() - 0.5) * 0.8,
          size: 18 + Math.random() * 12,
          alpha: 0.6 + Math.random() * 0.3,
        });
      }
      for (let i = ties.length - 1; i >= 0; i--) {
        const t = ties[i];
        t.x += t.vx; t.y += t.vy + Math.sin(frame * 0.03 + i * 2) * 0.3;
        if (t.x < -80 || t.x > W + 80) { ties.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = t.alpha;
        ctx.strokeStyle = '#667';
        ctx.fillStyle = '#334';
        ctx.lineWidth = 1.5;
        // Center ball
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.size * 0.25, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // Left wing
        ctx.beginPath();
        ctx.moveTo(t.x - t.size * 0.25, t.y);
        ctx.lineTo(t.x - t.size * 0.55, t.y - t.size * 0.5);
        ctx.lineTo(t.x - t.size * 0.55, t.y + t.size * 0.5);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(t.x + t.size * 0.25, t.y);
        ctx.lineTo(t.x + t.size * 0.55, t.y - t.size * 0.5);
        ctx.lineTo(t.x + t.size * 0.55, t.y + t.size * 0.5);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Struts
        ctx.beginPath();
        ctx.moveTo(t.x - t.size * 0.25, t.y);
        ctx.lineTo(t.x - t.size * 0.55, t.y);
        ctx.moveTo(t.x + t.size * 0.25, t.y);
        ctx.lineTo(t.x + t.size * 0.55, t.y);
        ctx.stroke();
        ctx.restore();

        // Occasional laser fire
        if (frame % 80 === i * 25 && Math.random() > 0.5) {
          lasers.push({
            x: t.x + t.vx * 3, y: t.y,
            vx: t.vx * 4, vy: (Math.random() - 0.5) * 2,
            len: 14 + Math.random() * 10,
            color: Math.random() > 0.5 ? '#44ff44' : '#ff4444',
            alpha: 0.9,
          });
        }
      }

      // ── Laser bolts ──
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.x += l.vx; l.y += l.vy; l.alpha -= 0.015;
        if (l.alpha <= 0 || l.x < -20 || l.x > W + 20) { lasers.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = l.alpha;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const nx = l.vx / Math.sqrt(l.vx * l.vx + l.vy * l.vy);
        const ny = l.vy / Math.sqrt(l.vx * l.vx + l.vy * l.vy);
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x - nx * l.len, l.y - ny * l.len);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ── Distant planet ──
      const planetX = W * 0.82;
      const planetY = H * 0.25;
      const planetR = Math.min(W, H) * 0.06;
      ctx.save();
      ctx.globalAlpha = 0.4;
      const pg = ctx.createRadialGradient(planetX - planetR * 0.3, planetY - planetR * 0.3, 0, planetX, planetY, planetR);
      pg.addColorStop(0, '#886644');
      pg.addColorStop(0.7, '#553322');
      pg.addColorStop(1, '#221100');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
      ctx.fill();
      // Ring
      ctx.strokeStyle = 'rgba(180,160,120,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(planetX, planetY, planetR * 1.6, planetR * 0.3, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      this.starwarsRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  private stopStarWars(): void {
    if (this.starwarsAudio) {
      const audio = this.starwarsAudio;
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.04) audio.volume -= 0.04;
        else { audio.pause(); audio.currentTime = 0; clearInterval(fadeOut); }
      }, 60);
      this.starwarsAudio = undefined;
    }
    setTimeout(() => {
      if (this.starwarsRaf) { cancelAnimationFrame(this.starwarsRaf); this.starwarsRaf = undefined; }
    }, 1000);
  }

  // ── Corridos mode (Liliana Velásquez) ──────────────────────
  private readonly _corr = [
    // ── Corridos Tumbados / Natanael Cano / Peso Pluma ──
    (n: string) => `"Ya llegué de donde andaba…" — ${n} reportándose, compa. 🤠🎶`,
    (n: string) => `"Aquí entre nos…" ${n} siempre llega a tiempo. 🎸`,
    (n: string) => `"También las mujeres pueden…" marcar puntual. ${n} lo demuestra. 💃🤠`,
    (n: string) => `"No es que sea presumida…" pero ${n} nunca llega tarde. 🎶`,
    (n: string) => `"De los pies a la cabeza…" ${n} llegó con todo el flow. 🔥🤠`,
    (n: string) => `"El de la codeína" esperaba, pero ${n} llegó primero. 🎵`,
    (n: string) => `"Ya supérame…" dijo el reloj, pero ${n} lo venció otra vez. ⏰🎸`,
    (n: string) => `"Con altura y con clase…" así llega ${n} cada día. 👑🤠`,
    (n: string) => `"Yo ya no vuelvo contigo…" le dijo ${n} a la tardanza. 🎶💅`,
    (n: string) => `"Pa' las baby's que se portan bien…" — ${n} puntual como siempre. 🎵`,
    (n: string) => `"Ella baila sola…" pero nunca llega sola a tiempo. ${n} presente. 💃`,
    (n: string) => `"A la antigüita, a la antigüita…" ${n} cumple con su horario. 🎸🤠`,
    (n: string) => `"Cada vez te quiero más…" dijo el sistema cuando ${n} marcó. 🎶❤️`,
    // ── Peso Pluma / Doble P ──
    (n: string) => `"Ella no es de nadie y a la vez es mía…" pero la puntualidad sí es de ${n}. 🔥`,
    (n: string) => `"AMG, la troca del año…" pero ${n} llegó en algo mejor: a tiempo. 🤠🚙`,
    (n: string) => `"La bebe, la bebe…" ${n} es la bebe de la puntualidad. 👑🎶`,
    (n: string) => `"Tú no me conoces pero yo sí a ti…" dijo ${n} al reloj checador. ⏰🤠`,
    (n: string) => `"Lady Gaga…" no, Lady Puntual. ${n} en la casa. 💃🎵`,
    // ── Fuerza Regida ──
    (n: string) => `"Bichota pero del rancho…" ${n} llegó mandando. 🤠👑`,
    (n: string) => `"Ch y la pizza…" pero ${n} prefirió ch y la chamba. 🍕🎸`,
    (n: string) => `"Radicamos en South Central…" no, en la oficina. ${n} presente. 🎵🤠`,
    (n: string) => `"TQM…" — Te Quiero Marcar (a tiempo). Firmado: ${n}. 💌🎶`,
    (n: string) => `"Soy el doble P en la doble C…" — ${n} doble puntual, doble crack. 🔥🤠`,
    // ── Junior H ──
    (n: string) => `"Mente positiva, vibra bonita…" así llega ${n} todos los días. ✨🎸`,
    (n: string) => `"No he dejado de pensar en ti…" dijo el sistema esperando a ${n}. Y llegó. 🎶`,
    (n: string) => `"El azul…" no, el dorado. ${n} brilla cuando marca entrada. 🌟🤠`,
    // ── Banda MS / El Fantasma / Calibre 50 ──
    (n: string) => `"Tengo talento de sobra…" y puntualidad también. ${n} lo confirma. 🎺🤠`,
    (n: string) => `"Dicen que soy hombre malo…" no, mujer puntual. ${n} en acción. 🎶💪`,
    (n: string) => `"Solo con verte…" el reloj ya sabe que ${n} no falla. 👀🎸`,
    (n: string) => `"Vas a estar bien, vas a estar bien…" porque ${n} ya marcó. Todo tranqui. 🤠✅`,
    (n: string) => `"El amor no fue pa' mí…" pero la puntualidad sí. ${n} ganando. 🎵💅`,
    // ── Grupo Frontera ──
    (n: string) => `"No se va…" la buena racha de ${n} llegando temprano. 🎶🔥`,
    (n: string) => `"Un x100to…" de las veces que ${n} llega tarde. O sea nunca. 💯🤠`,
    (n: string) => `"Que vuelvas…" dijo la sucursal esperando a ${n}. Y volvió puntual. 🎸❤️`,
    (n: string) => `"Besos mojados…" no, registros puntuales. ${n} marcó. 💋🎵`,
    // ── Natanael Cano ──
    (n: string) => `"Soy el nata, soy el nata…" no, soy ${n}. Y llegué a tiempo. 🤠🎶`,
    (n: string) => `"Amor tumbado…" no, horario respetado. ${n} cumple siempre. 🎸💯`,
    (n: string) => `"Mi nuevo vicio…" es la puntualidad. ${n} adicta a llegar bien. 🔥🎵`,
    // ── Clásicos / Chalino / Valentín ──
    (n: string) => `"Alma enamorada…" del trabajo. ${n} presente y puntual. 🎶🤠`,
    (n: string) => `"Nieves de enero…" pero el corazón de ${n} es puro fuego al marcar. ❄️🔥`,
    (n: string) => `"Pistearé hasta que me muera…" no, marcaré hasta que me jubile. ${n} firme. 🍺🤠`,
    (n: string) => `"El sinaloense…" digo, la panameña que nunca falla: ${n}. 🎸🇵🇦`,
    (n: string) => `"Cruzando cerros y arroyos…" ${n} cruza el tráfico y llega puntual. 🏔️🤠`,
    // ── Más Peso Pluma / DannyLux / Eslabon Armado ──
    (n: string) => `"Ella quiere beber…" café, porque ${n} llegó tempranísimo. ☕🎶`,
    (n: string) => `"Si te pudiera mentir…" diría que ${n} llega tarde. Pero no puedo. 🤥🤠`,
    (n: string) => `"Con tus besos…" el reloj se pone contento cuando ${n} marca. 💋⏰`,
    (n: string) => `"Jugaste y sufrí…" dijo la tardanza cuando ${n} la dejó plantada. 🎸😏`,
    (n: string) => `"Dime cómo quieres…" que te registre hoy, ${n}. ¿Con guitarras o con banda? 🎺🎸`,
    // ── Vibes / Actitud ──
    (n: string) => `Llegó la mera mera. El rancho está completo. ${n} en su puesto. 🤠🔥`,
    (n: string) => `La jefa marcó entrada. Que suene la banda. ${n} presente. 🎺👑`,
    (n: string) => `${n} no necesita GPS. Siempre sabe dónde tiene que estar. 📍🤠`,
    (n: string) => `Dicen que la puntualidad es de valientes. ${n} lo confirma diario. 🎸💪`,
    (n: string) => `El corrido de ${n}: "Llegaba temprano, no le fallaba al jefe…" 🎶🤠`,
    (n: string) => `Si la puntualidad fuera canción, ${n} sería el #1 en Spotify. 🎵📈`,
    (n: string) => `${n} marcó tan a tiempo que hasta el reloj aplaudió. 👏⏰`,
    (n: string) => `Que le pongan su corrido a ${n}: la que nunca falta ni llega tarde. 🎸🏆`,
    (n: string) => `"Yo no nací pa' perder…" — ${n}, reina de la asistencia. 👑🎶`,
    (n: string) => `${n} viene con la actitud de un corrido: sin miedo y siempre pa' delante. 🤠🔥`,
  ];
  public getCorridosPhrase(name = ''): string {
    const fn = this._corr[Math.floor(Math.random() * this._corr.length)];
    return fn(name || 'Compa');
  }

  private startCorridos(): void {
    if (this.corridosRaf) { cancelAnimationFrame(this.corridosRaf); this.corridosRaf = undefined; }
    const canvas = this.corridosCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Corrido music
    try {
      this.corridosAudio = new Audio('https://cdn.pixabay.com/download/audio/2024/10/11/audio_c159e6c68c.mp3?filename=drippeados-regional-mexican-guitar-249679.mp3');
      this.corridosAudio.loop = true;
      this.corridosAudio.volume = 0.2;
      this.corridosAudio.play().catch(() => {});
    } catch { /* noop */ }

    // Preload desert background
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1200&q=80';
    let bgReady = false;
    bgImg.onload = () => { bgReady = true; };

    // Floating music notes
    interface Note { x: number; y: number; vx: number; vy: number; size: number; alpha: number; char: string; rot: number; rotSpeed: number; }
    const notes: Note[] = [];
    const noteChars = ['♪', '♫', '♬', '🎵', '🎶', '🎸', '🤠'];

    // Stars
    interface DesertStar { x: number; y: number; twinkle: number; size: number; }
    const dStars: DesertStar[] = [];
    for (let i = 0; i < 80; i++) {
      dStars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * 0.4, twinkle: Math.random() * Math.PI * 2, size: 0.5 + Math.random() * 1.5 });
    }

    // Dust particles
    interface Dust { x: number; y: number; r: number; speed: number; alpha: number; }
    const dust: Dust[] = [];
    for (let i = 0; i < 30; i++) {
      dust.push({ x: Math.random() * canvas.width, y: canvas.height * 0.6 + Math.random() * canvas.height * 0.4, r: 2 + Math.random() * 5, speed: 0.3 + Math.random() * 0.8, alpha: 0.1 + Math.random() * 0.2 });
    }

    let frame = 0;
    const draw = () => {
      frame++;
      const W = canvas.width;
      const H = canvas.height;

      // Desert sunset gradient background (fallback + always)
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0,   '#1a0a2e');
      sky.addColorStop(0.2, '#2d1b4e');
      sky.addColorStop(0.4, '#8b2252');
      sky.addColorStop(0.55, '#d4603a');
      sky.addColorStop(0.7, '#e8a040');
      sky.addColorStop(0.85, '#3a2a1a');
      sky.addColorStop(1,   '#1a1008');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Stars
      dStars.forEach(s => {
        const tw = Math.sin(frame * 0.04 + s.twinkle);
        const al = 0.3 + 0.6 * Math.max(0, tw);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,240,200,${al})`;
        ctx.fill();
      });

      // Desert silhouette (mountains + cactus)
      const groundY = H * 0.65;
      // Mountains
      ctx.fillStyle = '#1a1008';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W * 0.08, groundY - H * 0.12);
      ctx.lineTo(W * 0.18, groundY - H * 0.22);
      ctx.lineTo(W * 0.28, groundY - H * 0.08);
      ctx.lineTo(W * 0.38, groundY - H * 0.18);
      ctx.lineTo(W * 0.5, groundY - H * 0.25);
      ctx.lineTo(W * 0.62, groundY - H * 0.15);
      ctx.lineTo(W * 0.72, groundY - H * 0.2);
      ctx.lineTo(W * 0.82, groundY - H * 0.1);
      ctx.lineTo(W * 0.92, groundY - H * 0.16);
      ctx.lineTo(W, groundY - H * 0.06);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      // Cactus silhouettes
      const drawCactus = (cx: number, cy: number, h: number) => {
        ctx.fillStyle = '#0d0804';
        // Main trunk
        ctx.fillRect(cx - h * 0.06, cy - h, h * 0.12, h);
        // Left arm
        ctx.fillRect(cx - h * 0.3, cy - h * 0.65, h * 0.24, h * 0.08);
        ctx.fillRect(cx - h * 0.3, cy - h * 0.85, h * 0.08, h * 0.28);
        // Right arm
        ctx.fillRect(cx + h * 0.06, cy - h * 0.45, h * 0.24, h * 0.08);
        ctx.fillRect(cx + h * 0.22, cy - h * 0.7, h * 0.08, h * 0.33);
      };
      drawCactus(W * 0.15, groundY, H * 0.12);
      drawCactus(W * 0.78, groundY - H * 0.02, H * 0.1);
      drawCactus(W * 0.92, groundY, H * 0.08);

      // Dust particles floating
      dust.forEach(d => {
        d.x += d.speed;
        d.y += Math.sin(frame * 0.01 + d.x * 0.01) * 0.3;
        if (d.x > W + d.r) { d.x = -d.r; d.y = H * 0.6 + Math.random() * H * 0.4; }
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,180,140,${d.alpha})`;
        ctx.fill();
      });

      // Floating music notes
      if (frame % 35 === 0 && notes.length < 12) {
        notes.push({
          x: Math.random() * W,
          y: H * 0.9 + Math.random() * H * 0.1,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -(1 + Math.random() * 2),
          size: 16 + Math.random() * 20,
          alpha: 0.7 + Math.random() * 0.3,
          char: noteChars[Math.floor(Math.random() * noteChars.length)],
          rot: 0,
          rotSpeed: (Math.random() - 0.5) * 0.04,
        });
      }
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        n.x += n.vx + Math.sin(frame * 0.02 + i) * 0.5;
        n.y += n.vy;
        n.rot += n.rotSpeed;
        n.alpha -= 0.005;
        if (n.alpha <= 0 || n.y < -30) { notes.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = n.alpha;
        ctx.translate(n.x, n.y);
        ctx.rotate(n.rot);
        ctx.font = `${n.size}px serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd740';
        ctx.shadowColor = 'rgba(255,215,64,0.6)';
        ctx.shadowBlur = 10;
        ctx.fillText(n.char, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Warm vignette
      const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(20,5,0,0.4)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      this.corridosRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  private stopCorridos(): void {
    if (this.corridosAudio) {
      const audio = this.corridosAudio;
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.04) audio.volume -= 0.04;
        else { audio.pause(); audio.currentTime = 0; clearInterval(fadeOut); }
      }, 60);
      this.corridosAudio = undefined;
    }
    setTimeout(() => {
      if (this.corridosRaf) { cancelAnimationFrame(this.corridosRaf); this.corridosRaf = undefined; }
    }, 1000);
  }

  // ── Watch Dogs / ctOS theme ──────────────────────────────────────────────
  private readonly _wd: ((n: string) => string)[] = [
    // ctOS / sistema de vigilancia
    (n: string) => `ctOS detectó al usuario ${n}. Acceso concedido. Bienvenido al sistema. 🦊`,
    (n: string) => `PERFIL VERIFICADO — ${n}. La ciudad te está mirando. 👁️`,
    (n: string) => `Sistema de vigilancia activado. ${n} ingresó en horario. 📡`,
    (n: string) => `[ctOS] Identidad confirmada: ${n}. Sin registros de tardanza. ✅`,
    (n: string) => `Hackea el tráfico si quieres, ${n}. Pero nunca llegas tarde. 🚦`,
    (n: string) => `${n} conectado al grid. Semáforos a su favor. ctOS aprobado. 🌆`,
    (n: string) => `La ciudad de Chicago registra tu entrada, ${n}. Que nadie te rastreé. 🗺️`,
    (n: string) => `[ACCESO CONCEDIDO] ${n} está en línea. Todas las cámaras confirman puntualidad. 📷`,
    (n: string) => `${n} burló el tráfico, el sistema y la tardanza. Solo un hacker puede. 💻`,
    (n: string) => `Sistema ctOS: ${n} marcó entrada. Ninguna anomalía detectada. 🔍`,
    // hacker vibes
    (n: string) => `"El mundo es tuyo si sabes hackear el reloj." — ${n} ya lo domina. ⌚`,
    (n: string) => `${n} no necesita esquivar cámaras. La puntualidad es su mejor camuflaje. 🕶️`,
    (n: string) => `Firewall personal de ${n}: invulnerable a la tardanza. 🛡️`,
    (n: string) => `Datos encriptados. Hora verificada. ${n} presente. Misión cumplida. 🎯`,
    (n: string) => `${n} hackeó el sistema de horarios… y llegó antes. Eso no estaba en el código. 😏`,
  ];
  public getWatchDogsPhrase(name = ''): string {
    const fn = this._wd[Math.floor(Math.random() * this._wd.length)];
    return fn(name || 'Agente');
  }

  private startWatchDogs(): void {
    if (this.watchdogsRaf) { cancelAnimationFrame(this.watchdogsRaf); this.watchdogsRaf = undefined; }
    const canvas = this.watchdogsCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // ── SYNTHESIZED ctOS AUDIO ──────────────────────────────────
    try {
      const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.watchdogsAudioCtx = actx;
      const master = actx.createGain();
      master.gain.setValueAtTime(0, actx.currentTime);
      master.gain.linearRampToValueAtTime(0.29, actx.currentTime + 2);
      master.connect(actx.destination);
      this.watchdogsAudioGain = master;

      // Layer 1: Sub bass drone
      const bass = actx.createOscillator();
      const bassGain = actx.createGain();
      bass.type = 'sawtooth'; bass.frequency.value = 55;
      bassGain.gain.value = 0.28;
      const bassLp = actx.createBiquadFilter();
      bassLp.type = 'lowpass'; bassLp.frequency.value = 140; bassLp.Q.value = 2;
      bass.connect(bassLp); bassLp.connect(bassGain); bassGain.connect(master);
      bass.start();

      // Layer 2: Sine sub pulse
      const sub = actx.createOscillator();
      const subG = actx.createGain();
      sub.type = 'sine'; sub.frequency.value = 38;
      subG.gain.value = 0.35;
      sub.connect(subG); subG.connect(master); sub.start();

      // Layer 3: Digital hiss (noise through bandpass)
      const bufSz = actx.sampleRate * 3;
      const noiseBuf = actx.createBuffer(1, bufSz, actx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSz; i++) nd[i] = Math.random() * 2 - 1;

      const noise = actx.createBufferSource();
      noise.buffer = noiseBuf; noise.loop = true;
      const noiseBp = actx.createBiquadFilter();
      noiseBp.type = 'bandpass'; noiseBp.frequency.value = 1100; noiseBp.Q.value = 0.4;
      const noiseG = actx.createGain(); noiseG.gain.value = 0.07;
      noise.connect(noiseBp); noiseBp.connect(noiseG); noiseG.connect(master); noise.start();

      // Layer 4: High frequency hiss
      const hiss = actx.createBufferSource();
      hiss.buffer = noiseBuf; hiss.loop = true;
      const hissHp = actx.createBiquadFilter();
      hissHp.type = 'highpass'; hissHp.frequency.value = 5000;
      const hissG = actx.createGain(); hissG.gain.value = 0.035;
      hiss.connect(hissHp); hissHp.connect(hissG); hissG.connect(master); hiss.start();

      // Layer 5: Mid rumble LFO on bass volume
      const lfo = actx.createOscillator();
      const lfoG = actx.createGain();
      lfo.type = 'sine'; lfo.frequency.value = 0.18;
      lfoG.gain.value = 0.12;
      lfo.connect(lfoG); lfoG.connect(bassGain.gain); lfo.start();

      // Glitch pulses (random digital blips)
      const glitch = () => {
        if (!this.watchdogsAudioCtx || !this.watchdogsAudioGain) return;
        const t = actx.currentTime;
        const freqs = [330, 440, 660, 880, 1100, 220];
        const f = freqs[Math.floor(Math.random() * freqs.length)];
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * (Math.random() > 0.5 ? 1.5 : 0.67), t + 0.04);
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        const bp = actx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6;
        o.connect(bp); bp.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.07);
        // Occasional second blip
        if (Math.random() > 0.6) {
          const t2 = t + 0.09;
          const o2 = actx.createOscillator();
          const g2 = actx.createGain();
          o2.type = 'square'; o2.frequency.value = f * 2;
          g2.gain.setValueAtTime(0.1, t2);
          g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.04);
          o2.connect(g2); g2.connect(master); o2.start(t2); o2.stop(t2 + 0.05);
        }
      };
      this.watchdogsGlitchInterval = setInterval(glitch, 600 + Math.random() * 2000);
    } catch { /* noop */ }

    // ── CANVAS SETUP ─────────────────────────────────────────────
    interface HNode {
      x: number; y: number; vx: number; vy: number;
      size: number; pulse: number; pulseRing: number; ringAlpha: number;
      type: 'hub' | 'cam' | 'node';
      label: string;
    }
    interface HexStream { x: number; y: number; speed: number; chars: string[]; alpha: number; isHot: boolean; }
    interface Packet { fi: number; ti: number; t: number; speed: number; trail: {x:number;y:number}[]; }

    const hexChars = '0123456789ABCDEF'.split('');
    const randHex = () => hexChars[Math.floor(Math.random() * hexChars.length)];
    const hubLabels = ['CAM_01','NET_HUB','ROUTER','GUARD_SRV','DB_CORE','PROXY','FIREWALL','CTOS_SRV'];
    const camLabels = ['CAM_A','CAM_B','CAM_C'];

    const nodes: HNode[] = [];
    let W = canvas.width; let H = canvas.height;

    // Hubs
    for (let i = 0; i < 8; i++) {
      nodes.push({ x: Math.random()*W, y: Math.random()*H, vx:(Math.random()-0.5)*0.25, vy:(Math.random()-0.5)*0.25, size:5, pulse:Math.random()*Math.PI*2, pulseRing:0, ringAlpha:0, type:'hub', label:hubLabels[i] });
    }
    // Camera nodes
    for (let i = 0; i < 3; i++) {
      nodes.push({ x: Math.random()*W, y: Math.random()*H, vx:(Math.random()-0.5)*0.35, vy:(Math.random()-0.5)*0.35, size:3.5, pulse:Math.random()*Math.PI*2, pulseRing:0, ringAlpha:0, type:'cam', label:camLabels[i] });
    }
    // Data nodes
    for (let i = 0; i < 45; i++) {
      nodes.push({ x: Math.random()*W, y: Math.random()*H, vx:(Math.random()-0.5)*0.55, vy:(Math.random()-0.5)*0.55, size:1.5+Math.random()*1.5, pulse:Math.random()*Math.PI*2, pulseRing:0, ringAlpha:0, type:'node', label:'' });
    }

    // Hex streams
    const streams: HexStream[] = [];
    const mkStreams = () => {
      streams.length = 0;
      const cols = Math.floor(canvas.width / 26);
      for (let i = 0; i < cols; i++) {
        if (Math.random() > 0.55) continue;
        streams.push({ x:i*26+13, y:Math.random()*-canvas.height, speed:0.5+Math.random()*0.9, chars:Array.from({length:8},randHex), alpha:0.07+Math.random()*0.1, isHot:Math.random()<0.15 });
      }
    };
    mkStreams();

    // Data packets (with trail)
    const hubs = () => nodes.filter(n => n.type === 'hub');
    const packets: Packet[] = [];
    for (let i = 0; i < 8; i++) {
      const hs = hubs();
      packets.push({ fi:Math.floor(Math.random()*hs.length), ti:Math.floor(Math.random()*hs.length), t:Math.random(), speed:0.003+Math.random()*0.006, trail:[] });
    }

    let frame = 0;
    let scanY = 0;
    let dashOffset = 0;
    let glitchFrames = 0; // frames remaining for glitch effect
    let nextGlitch = 200 + Math.floor(Math.random() * 300);

    // ctOS fake data
    const fakeIPs   = ['10.0.45.231','192.168.1.7','172.16.0.45','10.10.20.3'];
    const fakeCoords = ['41.8781°N 87.6298°W','41.9032°N 87.6120°W','41.8502°N 87.6501°W'];
    let coordIdx = 0;

    // Intro overlay
    let introFrame = 0;
    const INTRO_DUR = 90;

    const drawHex = (x: number, y: number, r: number) => {
      ctx.beginPath();
      for (let a = 0; a < 6; a++) {
        const angle = (Math.PI/3)*a - Math.PI/6;
        a === 0 ? ctx.moveTo(x+r*Math.cos(angle), y+r*Math.sin(angle))
                : ctx.lineTo(x+r*Math.cos(angle), y+r*Math.sin(angle));
      }
      ctx.closePath();
    };

    const drawDiamond = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y-r); ctx.lineTo(x+r*0.7, y); ctx.lineTo(x, y+r); ctx.lineTo(x-r*0.7, y);
      ctx.closePath();
    };

    const draw = () => {
      frame++;
      W = canvas.width; H = canvas.height;
      dashOffset = (dashOffset + 0.4) % 20;

      // Glitch trigger
      if (frame >= nextGlitch) { glitchFrames = 4 + Math.floor(Math.random()*3); nextGlitch = frame + 250 + Math.floor(Math.random()*400); }
      if (glitchFrames > 0) glitchFrames--;
      const isGlitch = glitchFrames > 0;

      // Background
      ctx.fillStyle = 'rgba(1, 5, 16, 0.9)';
      ctx.fillRect(0, 0, W, H);

      // City grid (perspective-like: lines converge toward center-bottom)
      ctx.strokeStyle = 'rgba(0,212,255,0.05)';
      ctx.lineWidth = 1; ctx.setLineDash([]);
      const gridSz = 55;
      for (let gx = 0; gx < W; gx += gridSz) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += gridSz) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }

      // Hex streams
      ctx.font = '10px monospace';
      for (const s of streams) {
        s.y += s.speed;
        if (s.y > H + 120) { s.y = -100; s.chars = Array.from({length:8},randHex); s.isHot = Math.random()<0.15; }
        if (frame % 6 === 0) s.chars[Math.floor(Math.random()*s.chars.length)] = randHex();
        s.chars.forEach((ch, i) => {
          const a = s.alpha * Math.max(0, 1 - i / s.chars.length);
          ctx.fillStyle = s.isHot ? `rgba(255,100,0,${a})` : `rgba(0,212,255,${a})`;
          ctx.fillText(ch, s.x-5, s.y - i*13);
        });
        // Bright lead char
        ctx.fillStyle = s.isHot ? `rgba(255,160,0,${Math.min(s.alpha*4,1)})` : `rgba(180,240,255,${Math.min(s.alpha*4,1)})`;
        ctx.fillText(s.chars[0], s.x-5, s.y);
      }

      // Update nodes
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x<0||n.x>W) n.vx*=-1; if (n.y<0||n.y>H) n.vy*=-1;
        n.pulse += 0.035;
        if (n.ringAlpha > 0) { n.pulseRing += 1.2; n.ringAlpha -= 0.012; }
      }

      const hubNodes = nodes.filter(n => n.type === 'hub');
      const camNodes = nodes.filter(n => n.type === 'cam');

      // Edges between hubs (animated dashed)
      for (let i = 0; i < hubNodes.length; i++) {
        for (let j = i+1; j < hubNodes.length; j++) {
          const dist = Math.hypot(hubNodes[i].x-hubNodes[j].x, hubNodes[i].y-hubNodes[j].y);
          if (dist < 320) {
            const a = (1-dist/320)*0.22;
            ctx.strokeStyle = `rgba(0,212,255,${a})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([6,10]);
            ctx.lineDashOffset = -dashOffset;
            ctx.beginPath(); ctx.moveTo(hubNodes[i].x,hubNodes[i].y); ctx.lineTo(hubNodes[j].x,hubNodes[j].y); ctx.stroke();
          }
        }
      }
      // Cam → nearest hub solid dim line
      for (const cam of camNodes) {
        let nearH = hubNodes[0]; let nearD = Infinity;
        for (const h of hubNodes) { const d=Math.hypot(cam.x-h.x,cam.y-h.y); if(d<nearD){nearD=d;nearH=h;} }
        ctx.strokeStyle = `rgba(255,100,0,${Math.max(0,(1-nearD/280)*0.18)})`;
        ctx.lineWidth = 0.8; ctx.setLineDash([3,8]); ctx.lineDashOffset = dashOffset;
        ctx.beginPath(); ctx.moveTo(cam.x,cam.y); ctx.lineTo(nearH.x,nearH.y); ctx.stroke();
      }
      // Data nodes → nearest hub faint
      for (const nd of nodes.filter(n=>n.type==='node')) {
        let nearH=hubNodes[0]; let nearD=Infinity;
        for (const h of hubNodes){const d=Math.hypot(nd.x-h.x,nd.y-h.y);if(d<nearD){nearD=d;nearH=h;}}
        if (nearD<180){
          ctx.strokeStyle=`rgba(0,212,255,${(1-nearD/180)*0.09})`;
          ctx.lineWidth=0.5; ctx.setLineDash([]); ctx.lineDashOffset=0;
          ctx.beginPath(); ctx.moveTo(nd.x,nd.y); ctx.lineTo(nearH.x,nearH.y); ctx.stroke();
        }
      }
      ctx.setLineDash([]);

      // Packets with trail
      for (const pkt of packets) {
        pkt.t += pkt.speed;
        if (pkt.t > 1) {
          pkt.t=0; pkt.fi=pkt.ti; pkt.ti=Math.floor(Math.random()*hubNodes.length);
          pkt.trail=[];
          // Trigger ring on arrival hub
          const ah = hubNodes[pkt.fi]; if(ah){ah.pulseRing=0; ah.ringAlpha=0.8;}
        }
        const from=hubNodes[pkt.fi]||hubNodes[0]; const to=hubNodes[pkt.ti]||hubNodes[1];
        const px=from.x+(to.x-from.x)*pkt.t; const py=from.y+(to.y-from.y)*pkt.t;
        pkt.trail.push({x:px,y:py});
        if (pkt.trail.length > 14) pkt.trail.shift();
        // Draw trail
        pkt.trail.forEach(({x,y},i)=>{
          const a = (i/pkt.trail.length)*0.5;
          ctx.beginPath(); ctx.arc(x,y,2*(i/pkt.trail.length),0,Math.PI*2);
          ctx.fillStyle=`rgba(255,120,0,${a})`; ctx.fill();
        });
        // Packet head
        ctx.beginPath(); ctx.arc(px,py,3.5,0,Math.PI*2);
        ctx.fillStyle='#ff6600';
        ctx.shadowColor='#ff6600'; ctx.shadowBlur=14; ctx.fill(); ctx.shadowBlur=0;
      }

      // Pulse rings from hubs
      for (const n of nodes) {
        if (n.ringAlpha > 0.05) {
          ctx.beginPath(); ctx.arc(n.x,n.y,n.pulseRing,0,Math.PI*2);
          ctx.strokeStyle=`rgba(0,212,255,${n.ringAlpha*0.6})`;
          ctx.lineWidth=1.5; ctx.stroke();
        }
      }

      // Draw hub nodes (hexagons)
      for (const n of hubNodes) {
        const pf = 0.5+0.5*Math.sin(n.pulse);
        const r = n.size + pf*2;
        // Outer glow ring
        ctx.beginPath(); ctx.arc(n.x,n.y,r+8,0,Math.PI*2);
        ctx.fillStyle=`rgba(0,212,255,${0.03+pf*0.06})`; ctx.fill();
        // Hexagon
        drawHex(n.x,n.y,r);
        ctx.fillStyle=`rgba(0,212,255,${0.15+pf*0.12})`;
        ctx.shadowColor='#00d4ff'; ctx.shadowBlur=16; ctx.fill();
        drawHex(n.x,n.y,r);
        ctx.strokeStyle=`rgba(0,212,255,${0.7+pf*0.3})`;
        ctx.lineWidth=1.5; ctx.stroke(); ctx.shadowBlur=0;
        // Label
        ctx.font='8px monospace';
        ctx.fillStyle=`rgba(0,212,255,${0.4+pf*0.3})`;
        ctx.fillText(n.label, n.x-18, n.y+r+12);
      }
      // Camera nodes (diamonds, orange)
      for (const n of camNodes) {
        const pf = 0.5+0.5*Math.sin(n.pulse);
        drawDiamond(n.x,n.y,n.size+pf);
        ctx.fillStyle=`rgba(255,100,0,${0.2+pf*0.15})`;
        ctx.shadowColor='#ff6600'; ctx.shadowBlur=10; ctx.fill();
        drawDiamond(n.x,n.y,n.size+pf);
        ctx.strokeStyle=`rgba(255,120,0,${0.7+pf*0.3})`; ctx.lineWidth=1.2; ctx.stroke(); ctx.shadowBlur=0;
        ctx.font='7px monospace'; ctx.fillStyle=`rgba(255,120,0,0.5)`;
        ctx.fillText(n.label, n.x-12, n.y+n.size+11);
      }
      // Data nodes (small squares)
      for (const n of nodes.filter(nd=>nd.type==='node')) {
        const pf=0.5+0.5*Math.sin(n.pulse);
        ctx.beginPath(); ctx.rect(n.x-n.size,n.y-n.size,n.size*2,n.size*2);
        ctx.fillStyle=`rgba(0,212,255,${0.08+pf*0.07})`;
        ctx.strokeStyle=`rgba(0,212,255,${0.2+pf*0.2})`; ctx.lineWidth=0.8;
        ctx.fill(); ctx.stroke();
      }

      // Scan line (bright cyan sweep)
      scanY = (scanY + 1.1) % H;
      const scanGrad = ctx.createLinearGradient(0, scanY-80, 0, scanY+2);
      scanGrad.addColorStop(0,'rgba(0,212,255,0)');
      scanGrad.addColorStop(0.7,'rgba(0,212,255,0.03)');
      scanGrad.addColorStop(1,'rgba(0,212,255,0.1)');
      ctx.fillStyle=scanGrad; ctx.fillRect(0,scanY-80,W,82);
      ctx.fillStyle='rgba(0,212,255,0.25)'; ctx.fillRect(0,scanY,W,1);
      ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(0,scanY+1,W,2);

      // ctOS HUD overlays
      ctx.font='9px monospace'; ctx.fillStyle='rgba(0,212,255,0.35)';
      // Top-left
      const ip = fakeIPs[frame%fakeIPs.length];
      ctx.fillText(`ctOS v2.1 | ${ip}`, 14, 20);
      ctx.fillText(`GRID_STATUS: ONLINE`, 14, 32);
      ctx.fillStyle='rgba(255,100,0,0.35)';
      ctx.fillText(`AMENAZA: BAJA`, 14, 44);
      // Top-right
      ctx.textAlign='right';
      ctx.fillStyle='rgba(0,212,255,0.35)';
      if (frame%120 < 60) coordIdx = (coordIdx+1)%fakeCoords.length;
      ctx.fillText(fakeCoords[coordIdx], W-14, 20);
      ctx.fillText(`NODOS: ${hubNodes.length + camNodes.length}`, W-14, 32);
      ctx.fillStyle='rgba(0,212,255,0.25)';
      ctx.fillText(`PKT/${(frame%60+1).toString().padStart(3,'0')}`, W-14, 44);
      // Bottom-left
      ctx.textAlign='left';
      ctx.fillStyle='rgba(0,212,255,0.2)';
      ctx.fillText(`FLUJO: ${(Math.sin(frame*0.05)*20+80).toFixed(1)}%`, 14, H-14);
      // Bottom-right
      ctx.textAlign='right';
      ctx.fillText(`CONEXIONES: ${packets.length}`, W-14, H-14);
      ctx.textAlign='left';

      // Corner HUD brackets (extended)
      const bSz=28; const bW=2;
      ctx.strokeStyle='rgba(0,212,255,0.6)'; ctx.lineWidth=bW;
      [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]].forEach(([cx2,cy2,sx,sy])=>{
        ctx.beginPath(); ctx.moveTo(cx2,cy2+sy*bSz); ctx.lineTo(cx2,cy2); ctx.lineTo(cx2+sx*bSz,cy2); ctx.stroke();
        // Inner tick
        ctx.beginPath(); ctx.moveTo(cx2+sx*8,cy2); ctx.lineTo(cx2+sx*8,cy2+sy*4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx2,cy2+sy*8); ctx.lineTo(cx2+sx*4,cy2+sy*8); ctx.stroke();
      });

      // Vignette
      const vig = ctx.createRadialGradient(W/2,H/2,H*0.3,W/2,H/2,H*0.8);
      vig.addColorStop(0,'rgba(0,0,0,0)');
      vig.addColorStop(1,'rgba(0,0,12,0.65)');
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

      // Glitch effect
      if (isGlitch) {
        const sliceH = 4+Math.floor(Math.random()*8);
        const sliceY = Math.floor(Math.random()*(H-sliceH));
        const shift = (Math.random()-0.5)*18;
        const imgData = ctx.getImageData(0, sliceY, W, sliceH);
        ctx.putImageData(imgData, shift, sliceY+1);
        // Color fringe
        ctx.fillStyle=`rgba(255,60,0,0.06)`; ctx.fillRect(0,sliceY,W,sliceH);
      }

      // Intro overlay
      if (introFrame < INTRO_DUR) {
        introFrame++;
        const progress = introFrame / INTRO_DUR;
        const alpha = progress < 0.4 ? progress/0.4 : progress > 0.7 ? (1-progress)/0.3 : 1;
        ctx.fillStyle=`rgba(1,5,16,${Math.max(0,0.85*(1-progress*1.5))})`;
        ctx.fillRect(0,0,W,H);
        ctx.font=`bold 22px monospace`;
        ctx.textAlign='center';
        ctx.fillStyle=`rgba(0,212,255,${alpha})`;
        ctx.shadowColor='#00d4ff'; ctx.shadowBlur=20;
        ctx.fillText('[ ctOS — SISTEMA DE VIGILANCIA ]', W/2, H/2-16);
        ctx.font='13px monospace'; ctx.fillStyle=`rgba(0,212,255,${alpha*0.7})`;
        ctx.shadowBlur=8;
        ctx.fillText('IDENTIFICANDO USUARIO...', W/2, H/2+12);
        ctx.font='10px monospace'; ctx.fillStyle=`rgba(255,100,0,${alpha*0.6})`;
        ctx.fillText(`CARGANDO PERFIL ▪ ACCESO PENDIENTE`, W/2, H/2+34);
        ctx.textAlign='left'; ctx.shadowBlur=0;
      }

      this.watchdogsRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  private stopWatchDogs(): void {
    // Fade out audio
    if (this.watchdogsAudioGain && this.watchdogsAudioCtx) {
      const g = this.watchdogsAudioGain;
      const a = this.watchdogsAudioCtx;
      g.gain.linearRampToValueAtTime(0, a.currentTime + 1.2);
      setTimeout(() => { try { a.close(); } catch { /* noop */ } }, 1400);
      this.watchdogsAudioGain = undefined;
      this.watchdogsAudioCtx = undefined;
    }
    if (this.watchdogsGlitchInterval) {
      clearInterval(this.watchdogsGlitchInterval);
      this.watchdogsGlitchInterval = undefined;
    }
    setTimeout(() => {
      if (this.watchdogsRaf) { cancelAnimationFrame(this.watchdogsRaf); this.watchdogsRaf = undefined; }
    }, 1000);
  }

  public getVipFace(): string {
    return this._sf[Math.floor(Math.random() * this._sf.length)];
  }
  public getVipPhrase(name = ''): string {
    const p = this._sp[Math.floor(Math.random() * this._sp.length)];
    return name ? p.replace(/^(.*?)(💅|👑|🔥|✨|💖|💃|🌟|💁‍♀️|🦋|🌸)/, `$1${name} $2`) : p;
  }

  /** Calculate and show attendance streak for the employee */
  private async calculateAndShowStreak(employeeId: string): Promise<void> {
    try {
      const companyId = this.organizationService.getCurrentCompanyId();
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch recent entry timelogs (last 60 days)
      const timelogsParams: Record<string, string> = {
        select: 'id,type,created_at',
        employee_id: `eq.${employeeId}`,
        type: 'eq.entry',
        order: 'created_at.desc',
        limit: '60',
      };
      if (companyId) {
        timelogsParams['company_id'] = `eq.${companyId}`;
      }

      const timelogs = await firstValueFrom(
        this.http.get<TimeLog[]>(
          this.apiUrl.build('rest/v1/timelogs', timelogsParams)
        )
      );

      if (!timelogs || timelogs.length === 0) return;

      // Fetch schedules that overlap with these timelogs
      const schedulesParams: Record<string, string> = {
        select: '*,schedule:schedules(*)',
        employee_id: `eq.${employeeId}`,
        end_date: `gte.${format(new Date(timelogs[timelogs.length - 1].created_at), 'yyyy-MM-dd')}`,
        start_date: `lte.${today}`,
      };
      if (companyId) {
        schedulesParams['company_id'] = `eq.${companyId}`;
      }

      const schedules = await firstValueFrom(
        this.http.get<EmployeeSchedule[]>(
          this.apiUrl.build('rest/v1/employee_schedules', schedulesParams)
        )
      );

      if (!schedules || schedules.length === 0) return;

      const streak = calculateStreak(timelogs, schedules);

      if (streak >= 2) {
        // Update the modal data with the streak
        const current = this.confirmModalData();
        if (current) {
          this.confirmModalData.set({ ...current, streak });
        }
      }
    } catch {
      // Silently ignore streak calculation errors - it's non-critical
    }
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

  // IP warning modal signals
  public ipWarningVisible = signal(false);

  // Aviso temporal post-incidente del 2026-05-21 (kiosk dropdowns NG0200).
  // Aparece SIEMPRE durante el dia del incidente. Si el usuario lo cierra,
  // vuelve a aparecer despues de 50 minutos.
  private readonly OUTAGE_NOTICE_DATE = '2026-05-21';
  private outageReshowTimer: ReturnType<typeof setTimeout> | null = null;
  public showOutageNoticeModal = signal(this.isOutageNoticeDay());
  private isOutageNoticeDay(): boolean {
    const todayPanama = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' });
    return todayPanama === this.OUTAGE_NOTICE_DATE;
  }
  dismissOutageNotice(): void {
    this.showOutageNoticeModal.set(false);
    if (this.outageReshowTimer) clearTimeout(this.outageReshowTimer);
    this.outageReshowTimer = setTimeout(() => {
      if (this.isOutageNoticeDay()) {
        this.showOutageNoticeModal.set(true);
      }
    }, 50 * 60 * 1000);
  }
  public ipWarningExiting = signal(false);

  private alertInvalidIP() {
    this.ipWarningVisible.set(true);
    this.ipWarningExiting.set(false);
  }

  public dismissIpWarning() {
    if (!this.ipWarningVisible()) return;
    this.ipWarningExiting.set(true);
    setTimeout(() => {
      this.ipWarningVisible.set(false);
      this.ipWarningExiting.set(false);
    }, 300);
  }

  // ── Emergency Timelog Methods ───────────────────────────────────────

  /** Carga el conteo de timelogs de emergencia pendientes desde localStorage */
  public loadEmergencyPendingCount(): void {
    try {
      const raw = localStorage.getItem(this.LS_EMERGENCY_KEY);
      if (!raw) { this.emergencyPendingCount.set(0); return; }
      const list: EmergencyTimelog[] = JSON.parse(raw);
      const pending = list.filter(t => !t.synced).length;
      this.emergencyPendingCount.set(pending);
    } catch {
      this.emergencyPendingCount.set(0);
    }
  }

  /** Guarda un timelog de emergencia en localStorage */
  private saveEmergencyToLocalStorage(entry: EmergencyTimelog): void {
    try {
      const raw = localStorage.getItem(this.LS_EMERGENCY_KEY);
      const list: EmergencyTimelog[] = raw ? JSON.parse(raw) : [];
      list.push(entry);
      localStorage.setItem(this.LS_EMERGENCY_KEY, JSON.stringify(list));
      this.loadEmergencyPendingCount();
    } catch {
      console.error('[Emergency] No se pudo guardar en localStorage');
    }
  }

  /** Lee todos los timelogs de emergencia pendientes */
  public getEmergencyPendingTimelogs(): EmergencyTimelog[] {
    try {
      const raw = localStorage.getItem(this.LS_EMERGENCY_KEY);
      if (!raw) return [];
      const list: EmergencyTimelog[] = JSON.parse(raw);
      return list.filter(t => !t.synced);
    } catch {
      return [];
    }
  }

  /** Marca un timelog de emergencia como sincronizado */
  public markEmergencySynced(id: string): void {
    try {
      const raw = localStorage.getItem(this.LS_EMERGENCY_KEY);
      if (!raw) return;
      const list: EmergencyTimelog[] = JSON.parse(raw);
      const updated = list.map(t => t.id === id ? { ...t, synced: true } : t);
      localStorage.setItem(this.LS_EMERGENCY_KEY, JSON.stringify(updated));
      this.loadEmergencyPendingCount();
    } catch {
      console.error('[Emergency] No se pudo marcar como sincronizado');
    }
  }

  /** Cierra el modal de emergencia con animación */
  public closeEmergencyModal(): void {
    this.emergencyModalExiting.set(true);
    setTimeout(() => {
      this.showEmergencyModal.set(false);
      this.emergencyModalExiting.set(false);
      this.emergencyData.set(null);
      // Resetear formulario
      this.form.get('otp')?.reset();
    }, 250);
  }

  /**
   * Intenta guardar una marcación de emergencia cuando el RPC principal falla.
   * 1. Intenta INSERT directo a timelogs con source='EMERGENCY'
   * 2. Si falla, guarda en localStorage para sincronización posterior
   */
  public triggerEmergencyTimelog(
    employeeId: string,
    branchId: string,
    companyId: string,
    type: string,
    employeeName: string,
    typeLabel: string
  ): void {
    const now = new Date();
    const timeDisplay = formatInTimeZone(now, 'America/Panama', 'hh:mm a');
    const timestamp = now.toISOString();

    this.emergencyData.set({ employeeName, typeLabel, timeDisplay });
    this.emergencyState.set('processing');
    this.showEmergencyModal.set(true);
    this.emergencyModalExiting.set(false);

    const payload = {
      employee_id: employeeId,
      company_id: companyId,
      branch_id: branchId,
      type,
      source: 'EMERGENCY',
      punched_at: timestamp,
      ip: this.getIP(),
      invalid_ip: !this.validIP(),
    };

    // Intento 1: usar RPC manual con motivo (bypassea process_timelog complejo pero queda auditado)
    this.http.post(
      this.apiUrl.build('rest/v1/rpc/insert_manual_timelog'),
      {
        p_employee_id: employeeId,
        p_company_id: companyId,
        p_branch_id: branchId,
        p_type: type,
        p_punched_at: timestamp,
        p_reason: 'Emergency fallback (process_timelog falló)',
      },
      { observe: 'response' }
    ).subscribe({
      next: () => {
        this.emergencyState.set('saved_server');
      },
      error: (err) => {
        // Diagnóstico real del INSERT que cae a localStorage. Sin esto era imposible
        // saber por qué fallaba el envío al servidor en sucursales.
        const status = err?.status;
        const code = err?.error?.code;
        const serverMsg = err?.error?.message || err?.message || 'Sin detalle';
        console.error('[Emergency] INSERT directo a timelogs falló', {
          status,
          code,
          message: serverMsg,
          body: err?.error,
          payload,
        });

        const reason =
          status === 0
            ? 'sin conexión'
            : status >= 500
              ? `error servidor (${status})`
              : status >= 400
                ? `rechazo servidor (${status}${code ? ' ' + code : ''})`
                : `falla ${status ?? 'desconocida'}`;
        this.message.add({
          severity: 'warn',
          summary: 'Marcación guardada localmente',
          detail: `No se pudo enviar al servidor (${reason}). La marcación quedó en este dispositivo y debe sincronizarse desde Settings → Marcaciones de Emergencia.`,
          life: 8000,
        });

        // Intento 2: encolar en PunchQueueService (IndexedDB + auto-sync).
        // Esto reemplaza el viejo localStorage manual y garantiza que la marcación
        // se reintente automáticamente al volver la red, al recargar la app o
        // cada 30s — sin que ningún operador tenga que tocar nada.
        void this.punchQueue.enqueue({
          employee_id: employeeId,
          employee_name: employeeName,
          branch_id: branchId,
          company_id: companyId,
          type,
          type_label: typeLabel,
          punched_at: timestamp,
          ip: this.getIP(),
          invalid_ip: !this.validIP(),
          auth_method: 'pin',
          reason: `Emergency fallback (status ${status ?? 'unknown'}${code ? ' ' + code : ''})`,
        });

        // Intento 3 (paralelo, fire-and-forget): sendBeacon directo al server.
        // Es el camino más resiliente — el navegador lo entrega incluso si la
        // pestaña se cierra justo después. El server escribe a disco antes de BD.
        this.punchQueue.sendBeaconFireAndForget({
          employee_id: employeeId,
          employee_name: employeeName,
          branch_id: branchId,
          company_id: companyId,
          type,
          type_label: typeLabel,
          punched_at: timestamp,
          ip: this.getIP(),
          invalid_ip: !this.validIP(),
          auth_method: 'pin',
          reason: 'sendBeacon emergency fallback',
        });

        // Intento 4 (legacy, retrocompat): formato viejo localStorage por si
        // algún script todavía lo lee. PunchQueueService migra de aquí al boot.
        const localEntry: EmergencyTimelog = {
          id: crypto.randomUUID(),
          employee_id: employeeId,
          employee_name: employeeName,
          company_id: companyId,
          branch_id: branchId,
          type,
          type_label: typeLabel,
          timestamp,
          synced: false,
        };
        this.saveEmergencyToLocalStorage(localEntry);
        this.emergencyState.set('saved_local');
      },
    });
  }

  /** Llamado desde el banner persistente cuando el operador presiona "Sincronizar ahora". */
  public async manualDrainQueue(): Promise<void> {
    const result = await this.punchQueue.drainNow();
    if (result.drained > 0) {
      this.message.add({
        severity: 'success',
        summary: 'Sincronización completa',
        detail: `${result.drained} marcación(es) enviada(s) al servidor.${result.remaining > 0 ? ` Quedan ${result.remaining} pendientes (sin red).` : ''}`,
        life: 6000,
      });
    } else if (result.failed > 0) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin red',
        detail: `No se pudo conectar al servidor. ${result.remaining} marcación(es) sigue(n) pendiente(s). Se reintentará automáticamente.`,
        life: 6000,
      });
    } else {
      this.message.add({
        severity: 'info',
        summary: 'Cola vacía',
        detail: 'No hay marcaciones pendientes.',
        life: 3000,
      });
    }
  }

  // ── Pet type rotation (dog/cat) ──────────────────────────────────────
  private readonly PET_TYPE_KEY = 'pt_pet_type_v1';

  private initPetRotation(): void {
    const INTERVAL = 1_800_000; // 30 min
    try {
      const stored = localStorage.getItem(this.PET_TYPE_KEY);
      let data = stored ? JSON.parse(stored) : null;
      const now = Date.now();
      if (!data || now - data.timestamp > INTERVAL) {
        const type = Math.random() < 0.5 ? 'dog' : 'cat';
        data = { type, timestamp: now };
        localStorage.setItem(this.PET_TYPE_KEY, JSON.stringify(data));
      }
      this.petType.set(data.type ?? 'dog');
    } catch {
      this.petType.set('dog');
    }
  }
}
