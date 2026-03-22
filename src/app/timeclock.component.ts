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
import { OrganizationService } from './services/organization.service';
import { TimeclockPhrasesService } from './services/timeclock-phrases.service';
import { TimeSyncService } from './services/time-sync.service';
import { DogAnimationComponent } from './dashboard/components/dog.component';
import { NewsTickerComponent } from './shared/components/news-ticker.component';
import {
  initAudioContext,
  playFailureSound,
  playLateSound,
  playSuccessSound,
  playBirthdaySound,
  playVipSound,
  playMatrixConfirmSound,
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
  ],
  providers: [ConfirmationService],
  template: `<p-toast />

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

    <!-- Custom Success Confirmation Modal -->
    @if (confirmModalVisible()) {
      <div class="confirm-modal-overlay" (click)="dismissConfirmModal()">
        <div class="confirm-modal-card"
          [class.confirm-modal-exit]="confirmModalExiting()"
          [class.is-late]="confirmModalData()?.isLate"
          [class.is-birthday]="confirmModalData()?.isBirthday"
          [class.is-matrix]="confirmModalData()?.isMatrix">

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
            } @else if (confirmModalData()?.isMatrix) {
              <div class="confirm-modal-icon confirm-modal-icon--matrix">
                <span class="matrix-icon-char">></span>
              </div>
            } @else if (confirmModalData()?.isVip) {
              <div class="confirm-modal-icon confirm-modal-icon--vip">
                <span class="vip-icon-emoji">{{ getVipFace() }}</span>
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

          <!-- Streak -->
          @if (confirmModalData()?.streak && confirmModalData()!.streak >= 2) {
            <div class="confirm-modal-streak-box">
              {{ getStreakFires(confirmModalData()!.streak) }} Racha de {{ confirmModalData()!.streak }} {{ confirmModalData()!.streak === 1 ? 'día' : 'días' }} {{ getStreakFires(confirmModalData()!.streak) }}
            </div>
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
          <div class="confirm-modal-phrase-box"
            [class.birthday-phrase]="confirmModalData()?.isBirthday"
            [class.vip-phrase]="confirmModalData()?.isVip"
            [class.is-matrix-phrase]="confirmModalData()?.isMatrix">
            @if (confirmModalData()?.isBirthday) {
              <span class="birthday-phrase-icon">🎉</span>
            }
            @if (confirmModalData()?.isVip) {
              <span class="vip-phrase-icon">✨</span>
            }
            "{{ confirmModalData()?.phrase }}"
            @if (confirmModalData()?.isVip) {
              <span class="vip-phrase-icon">✨</span>
            }
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
        'matrix-mode': matrixMode()
      }"
      style="width: 100%; position: relative;"
    >
      <!-- Matrix rain canvas -->
      <canvas #matrixCanvas class="matrix-canvas" [class.matrix-canvas--active]="matrixMode()" aria-hidden="true"></canvas>

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
        <p-card class="w-full max-w-lg mx-auto timeclock-card relative z-10" [class.special-mode]="specialMode()" [class.matrix-card]="matrixMode()">
          <ng-template #title>
            <div class="flex flex-col items-center py-1 gap-1">
              <div class="greeting-msg" [class.greeting-special]="greetingMessage().text.startsWith('¡')">
                {{ greetingMessage().text }}
              </div>
              <div class="clock-hero-time" [class.blackdog-accent]="isBlackDogCompany()" [class.special-pulse]="specialMode()" [class.matrix-time]="matrixMode()">
                {{ formattedTime() }}
              </div>
              <div class="clock-hero-date">
                {{ formattedDate() }}
              </div>
            </div>
          </ng-template>
          <ng-template #subtitle>
            <div class="clock-subtitle">
              Seleccione sucursal y empleado
            </div>
          </ng-template>
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
                [disabled]="!canChangeBranch()"
              />
              @if (!canChangeBranch() && form.get('branch_id')?.value) {
              <p class="text-xs text-gray-400 mt-1 text-center">
                Sucursal detectada automáticamente por IP
              </p>
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

            <!-- Branch mismatch warning (standalone, no button here) -->
            @if (showInfoButton() && branchMismatch()) {
              <div class="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs">
                <i class="pi pi-exclamation-triangle"></i>
                <span>La sucursal no coincide con la del empleado</span>
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

            <!-- PIN Input Section -->
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
                  class="paste-btn flex md:hidden"
                  (click)="pasteFromClipboard()"
                  title="Pegar código"
                >
                  <i class="pi pi-clipboard"></i>
                </button>
              </div>

              <!-- Keypad toggle + Info button (all sizes) -->
              <div class="w-full flex items-center gap-2 mt-1">
                <button type="button" class="keypad-toggle-btn flex-1" (click)="toggleKeypad()">
                  <i class="pi" [ngClass]="showKeypadPanel() ? 'pi-chevron-up' : 'pi-th-large'"></i>
                  {{ showKeypadPanel() ? 'Ocultar teclado' : 'Teclado numérico' }}
                </button>
                @if (showInfoButton()) {
                  <button type="button" class="info-btn" (click)="openInfoModal()" title="Ver estado del día">
                    <i class="pi pi-info-circle"></i>
                  </button>
                }
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

            <!-- Submit Button -->
            <div class="w-full">
              <p-button
                [disabled]="
                  form.invalid || isProcessing() || !form.get('employee')?.value
                "
                [loading]="isProcessing()"
                (onClick)="validateOtp()"
                [label]="isProcessing() ? 'Procesando...' : 'Marcar Asistencia'"
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
        </div>
      </div>
      }

      <!-- Walking dog at the bottom -->
      <pt-dog-animation></pt-dog-animation>
    </div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      min-height: 100dvh;
      background: #08080c;
    }

    @media (max-width: 767px) {
      :host {
        height: 100dvh;
        height: 100vh;
        overflow: hidden;
        position: fixed;
        inset: 0;
      }
      .animated-gradient-container {
        min-height: 100vh !important;
        min-height: 100dvh !important;
        align-items: flex-start !important;
        overflow-y: auto !important;
      }
    }

    /* ============================================
       CONTAINER + BACKGROUND
       ============================================ */
    .animated-gradient-container {
      position: relative;
      min-height: 100vh;
      min-height: 100dvh;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #08080c;
    }

    /* ============================================
       ANIMATED BACKGROUND ORBS
       ============================================ */
    .bg-orbs {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .bg-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(90px);
      opacity: 1;
      will-change: transform;
    }
    .bg-orb--1 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(247, 177, 4, 0.30), transparent 70%);
      top: -10%;
      left: -8%;
      animation: orb-drift-1 18s ease-in-out infinite alternate;
    }
    .bg-orb--2 {
      width: 420px;
      height: 420px;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.22), transparent 70%);
      bottom: -5%;
      right: -6%;
      animation: orb-drift-2 22s ease-in-out infinite alternate;
    }
    .bg-orb--3 {
      width: 380px;
      height: 380px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.20), transparent 70%);
      top: 40%;
      left: 50%;
      animation: orb-drift-3 25s ease-in-out infinite alternate;
    }
    .bg-orb--4 {
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, rgba(247, 177, 4, 0.16), transparent 70%);
      top: 60%;
      right: 30%;
      animation: orb-drift-4 20s ease-in-out infinite alternate;
    }
    @keyframes orb-drift-1 {
      0%   { transform: translate(0, 0) scale(1); }
      50%  { transform: translate(12vw, 18vh) scale(1.15); }
      100% { transform: translate(-5vw, 10vh) scale(0.9); }
    }
    @keyframes orb-drift-2 {
      0%   { transform: translate(0, 0) scale(1); }
      50%  { transform: translate(-15vw, -12vh) scale(1.1); }
      100% { transform: translate(8vw, -18vh) scale(0.95); }
    }
    @keyframes orb-drift-3 {
      0%   { transform: translate(0, 0) scale(1); }
      50%  { transform: translate(-10vw, 8vh) scale(1.2); }
      100% { transform: translate(6vw, -6vh) scale(0.85); }
    }
    @keyframes orb-drift-4 {
      0%   { transform: translate(0, 0) scale(1); }
      50%  { transform: translate(10vw, -10vh) scale(1.1); }
      100% { transform: translate(-8vw, 5vh) scale(1.05); }
    }
    @media (prefers-reduced-motion: reduce) {
      .bg-orb { animation: none !important; }
    }
    @media (max-width: 640px) {
      .bg-orb--1 { width: 250px; height: 250px; }
      .bg-orb--2 { width: 200px; height: 200px; }
      .bg-orb--3 { width: 180px; height: 180px; }
      .bg-orb--4 { width: 150px; height: 150px; }
    }

    /* Thin scrollbar */
    .animated-gradient-container::-webkit-scrollbar {
      width: 6px;
    }
    .animated-gradient-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .animated-gradient-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }
    .animated-gradient-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.18);
    }
    .animated-gradient-container {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
    }

    .timeclock-content {
      flex-shrink: 0;
      width: 100%;
      max-width: 100%;
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem 0.5rem;
    }

    @media (max-width: 640px) {
      .timeclock-content {
        min-height: auto !important;
        padding: 0.5rem 0.75rem !important;
        justify-content: flex-start !important;
        padding-top: 0.75rem !important;
      }
    }

    /* Mobile kiosk mode overrides */
    .timeclock-mobile-kiosk .timeclock-content img {
      height: 4rem !important;
      max-height: 80px !important;
    }
    .timeclock-mobile-kiosk .timeclock-content {
      padding: 1.5rem 0.75rem !important;
      gap: 1rem !important;
    }
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-card-body,
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-card-content {
      padding: 1.25rem !important;
    }
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-select,
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-inputotp {
      min-height: 3rem;
    }
    .timeclock-mobile-kiosk .mark-button ::ng-deep .p-button {
      min-height: 3.5rem;
      font-size: 1.125rem;
    }

    @media (max-height: 700px) and (max-width: 640px) {
      .timeclock-content {
        padding-top: 0.35rem !important;
        gap: 0.25rem !important;
      }
    }
    @media (max-height: 600px) and (max-width: 640px) {
      .timeclock-content {
        padding-top: 0.2rem !important;
        gap: 0.15rem !important;
      }
    }

    /* ============================================
       CARD
       ============================================ */
    .timeclock-card {
      border: 1px solid rgba(255, 255, 255, 0.06) !important;
      border-radius: 28px !important;
      background: rgba(255, 255, 255, 0.03) !important;
      backdrop-filter: blur(40px) saturate(1.3);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3) !important;
      animation: cardEntrance 0.3s ease-out;
      position: relative;
    }

    /* Top highlight line */
    .timeclock-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
      border-radius: 28px 28px 0 0;
      z-index: 1;
      pointer-events: none;
    }

    @keyframes cardEntrance {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .timeclock-card {
        animation: none !important;
      }
    }

    .timeclock-card ::ng-deep .p-card {
      border-radius: 28px !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    .timeclock-card ::ng-deep .p-card-body {
      border-radius: 28px !important;
      background: transparent !important;
    }
    .timeclock-card ::ng-deep .p-card-content {
      margin-top: 0 !important;
    }

    @media (max-width: 640px) {
      .timeclock-card {
        border-radius: 24px !important;
      }
      .timeclock-card ::ng-deep .p-card,
      .timeclock-card ::ng-deep .p-card-body {
        border-radius: 24px !important;
        background: transparent !important;
      }
      .timeclock-card ::ng-deep .p-card {
        border: none !important;
        box-shadow: none !important;
      }
      .timeclock-card ::ng-deep .p-card-body {
        padding: 0.75rem !important;
      }
      .timeclock-card ::ng-deep .p-card-title {
        padding: 0.5rem 0.75rem !important;
      }
      .timeclock-card ::ng-deep .p-card-subtitle {
        padding: 0.25rem 0.75rem !important;
      }
    }

    @media (min-width: 641px) and (max-width: 1024px) {
      .timeclock-card ::ng-deep .p-card-body {
        padding: 1.25rem !important;
      }
    }

    /* ============================================
       CLOCK HERO DISPLAY
       ============================================ */
    .clock-hero-time {
      font-size: 3rem;
      font-weight: 700;
      color: #ffffff;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
      line-height: 1;
      text-align: center;
    }
    .clock-hero-time.blackdog-accent {
      color: #fbbf24;
    }
    .clock-hero-date {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.4);
      font-weight: 500;
      text-transform: capitalize;
      letter-spacing: 0.03em;
      margin-top: 0.5rem;
      text-align: center;
    }
    .clock-subtitle {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.3);
      text-align: center;
      font-weight: 400;
      letter-spacing: 0.02em;
    }

    @media (max-width: 640px) {
      .clock-hero-time {
        font-size: 2.25rem;
      }
    }

    /* ============================================
       SELECT / INPUT OVERRIDES
       ============================================ */
    .timeclock-card ::ng-deep .p-select {
      border-radius: 14px !important;
    }
    .timeclock-card ::ng-deep .p-select .p-select-trigger {
      border-radius: 14px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      background: rgba(255, 255, 255, 0.04) !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .timeclock-card ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(255, 255, 255, 0.2) !important;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.04) !important;
    }

    .error-border ::ng-deep .p-select .p-select-trigger {
      border-color: rgba(239, 68, 68, 0.4) !important;
    }
    .error-border ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(239, 68, 68, 0.6) !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.08) !important;
    }

    .input-container ::ng-deep .p-select {
      width: 100%;
    }
    .input-container ::ng-deep .p-select .p-select-trigger {
      padding: 0.5rem 0.75rem;
      min-height: 42px;
      font-size: 0.875rem;
    }

    @media (max-width: 640px) {
      .input-container ::ng-deep .p-select .p-select-trigger {
        padding: 0.45rem 0.65rem;
        min-height: 40px;
        font-size: 0.8125rem;
      }
    }
    @media (min-width: 641px) and (max-width: 1024px) {
      .input-container ::ng-deep .p-select .p-select-trigger {
        padding: 0.55rem 0.8rem;
        min-height: 44px;
        font-size: 0.9rem;
      }
    }

    /* ============================================
       OTP INPUT
       ============================================ */
    .timeclock-card ::ng-deep .p-inputotp {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 0.5rem !important;
      width: 100% !important;
      margin: 0 auto !important;
    }
    .timeclock-card ::ng-deep .p-inputotp-input {
      width: auto !important;
      min-width: 36px !important;
      max-width: 48px !important;
      height: 44px !important;
      font-size: 0.95rem !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 14px !important;
      background: rgba(255, 255, 255, 0.04) !important;
      color: rgba(255, 255, 255, 0.85) !important;
      font-weight: bold !important;
      flex: 0 0 auto !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .timeclock-card ::ng-deep .p-inputotp-input:focus {
      border-color: rgba(255, 255, 255, 0.2) !important;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.04) !important;
      outline: none !important;
    }
    .timeclock-card ::ng-deep .p-inputotp-input:not(:placeholder-shown) {
      border-color: rgba(255, 255, 255, 0.12) !important;
    }

    @media (max-width: 640px) {
      .timeclock-card ::ng-deep .p-inputotp {
        gap: 0.375rem !important;
      }
      .timeclock-card ::ng-deep .p-inputotp-input {
        min-width: 30px !important;
        max-width: 36px !important;
        height: 36px !important;
        font-size: 0.8125rem !important;
        border-radius: 12px !important;
      }
    }
    @media (min-width: 641px) and (max-width: 1024px) {
      .timeclock-card ::ng-deep .p-inputotp-input {
        min-width: 38px !important;
        max-width: 44px !important;
        height: 42px !important;
        font-size: 0.9rem !important;
      }
    }

    /* ============================================
       SUBMIT BUTTON
       ============================================ */
    .timeclock-card ::ng-deep .mark-button {
      width: 100% !important;
      display: block !important;
    }
    .timeclock-card ::ng-deep .mark-button.w-full {
      width: 100% !important;
    }
    .timeclock-card ::ng-deep .mark-button.w-full button,
    .timeclock-card ::ng-deep .mark-button button {
      width: 100% !important;
      height: 48px !important;
      border-radius: 16px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      flex-direction: row !important;
      font-size: 0.9rem !important;
      font-weight: 600 !important;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(230, 230, 230, 0.85) 100%) !important;
      color: #111 !important;
      border: none !important;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .timeclock-card ::ng-deep .mark-button button:disabled {
      background: rgba(255, 255, 255, 0.08) !important;
      color: rgba(255, 255, 255, 0.3) !important;
      box-shadow: none !important;
      cursor: not-allowed;
    }

    @media (max-width: 640px) {
      .timeclock-card ::ng-deep .mark-button button {
        height: 44px !important;
        font-size: 0.85rem !important;
      }
    }

    .timeclock-card ::ng-deep .p-button {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .timeclock-card ::ng-deep .p-button .p-button-content {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      flex-direction: row !important;
    }
    .timeclock-card ::ng-deep .p-button .p-button-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0 !important;
      line-height: 1 !important;
      font-size: 1rem !important;
      position: relative !important;
      top: 0 !important;
    }
    .timeclock-card ::ng-deep .p-button .p-button-label {
      display: inline-flex !important;
      align-items: center !important;
      line-height: 1 !important;
    }
    .timeclock-card ::ng-deep .p-button .p-button-icon-left {
      margin-right: 0.5rem !important;
    }
    .timeclock-card ::ng-deep .p-button:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15) !important;
    }
    .timeclock-card ::ng-deep .p-button:not(:disabled):active {
      transform: translateY(0);
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .timeclock-card ::ng-deep .p-button[loading] .p-button-icon,
    .timeclock-card ::ng-deep .p-button .pi-spinner {
      animation: rotate 0.6s linear infinite;
    }

    /* ============================================
       KEYPAD
       ============================================ */
    .keypad-btn {
      height: 44px;
      font-size: 1.25rem;
      font-weight: 600;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.04);
      color: #e5e7eb;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .keypad-btn:active {
      transform: scale(0.93);
      background: rgba(255, 255, 255, 0.1);
    }
    .keypad-delete { color: #fbbf24; }
    .keypad-clear { color: #f87171; }

    .blackdog-theme .keypad-btn:active {
      background: rgba(251, 191, 36, 0.15);
      border-color: rgba(251, 191, 36, 0.3);
    }
    .naz-theme .keypad-btn:active {
      background: rgba(156, 163, 175, 0.15);
      border-color: rgba(156, 163, 175, 0.3);
    }

    @media (min-width: 768px) {
      .keypad-btn { height: 52px; font-size: 1.35rem; }
    }
    @media (max-width: 640px) {
      .keypad-btn { height: 44px; border-radius: 14px; }
    }

    .keypad-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 0.25rem;
    }
    .keypad-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.6);
    }
    .keypad-toggle-btn:active {
      transform: scale(0.97);
    }

    /* ============================================
       RESTRICTED ACCESS SCREEN
       ============================================ */
    .restricted-screen {
      width: 100%;
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      position: relative;
      z-index: 10;
    }

    .restricted-card {
      max-width: 400px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      padding: 2.5rem 2rem;
      border-radius: 32px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(40px) saturate(1.3);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      animation: cardEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }

    /* Top highlight */
    .restricted-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.2), transparent);
      z-index: 1;
      pointer-events: none;
    }

    .restricted-icon-wrap {
      position: relative;
      margin-bottom: 0.25rem;
    }

    .restricted-icon-wrap::after {
      content: '';
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      border: 1px solid rgba(239, 68, 68, 0.1);
      animation: iconRippleRestricted 2.5s ease-out infinite;
    }

    @keyframes iconRippleRestricted {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    .restricted-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(185, 28, 28, 0.06) 100%);
      border: 1px solid rgba(239, 68, 68, 0.2);
      animation: confirmIconPulse 0.7s cubic-bezier(0.22, 1, 0.36, 1);
      position: relative;
      z-index: 1;
    }

    .restricted-icon i {
      font-size: 2rem;
      color: rgba(248, 113, 113, 0.9);
      filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.3));
    }

    .restricted-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      letter-spacing: -0.01em;
    }

    .restricted-desc {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.45);
      text-align: center;
      line-height: 1.5;
      max-width: 320px;
    }

    .restricted-ip-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding: 0.85rem 1.5rem;
      border-radius: 16px;
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.12);
      width: 100%;
    }

    .restricted-ip-label {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 500;
    }

    .restricted-ip-value {
      font-size: 1.1rem;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
      font-weight: 600;
      color: rgba(248, 113, 113, 0.9);
      letter-spacing: 0.02em;
    }

    .restricted-instructions {
      width: 100%;
      padding: 1rem 1.25rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .restricted-instructions-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .restricted-instructions-title i {
      font-size: 0.75rem;
    }

    .restricted-instructions p {
      font-size: 0.82rem;
      color: rgba(255, 255, 255, 0.35);
      line-height: 1.55;
      margin: 0;
    }

    @media (max-width: 640px) {
      .restricted-card {
        padding: 2rem 1.5rem;
        border-radius: 28px;
      }
      .restricted-icon {
        width: 68px;
        height: 68px;
      }
      .restricted-icon i {
        font-size: 1.75rem;
      }
      .restricted-title {
        font-size: 1.3rem;
      }
    }

    /* ============================================
       IP WARNING MODAL
       ============================================ */
    .ip-warning-card {
      max-width: 380px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2.25rem 1.75rem 1.75rem;
      border-radius: 32px;
      background: linear-gradient(165deg, rgba(28, 28, 32, 0.96) 0%, rgba(16, 16, 20, 0.98) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(40px) saturate(1.3);
      box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
      animation: confirmCardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      cursor: default;
    }

    .ip-warning-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.4) 30%, rgba(251, 191, 36, 0.7) 50%, rgba(251, 191, 36, 0.4) 70%, transparent 100%);
      background-size: 200% 100%;
      animation: modalShimmer 3s ease-in-out infinite;
      border-radius: 32px 32px 0 0;
      z-index: 1;
      pointer-events: none;
    }

    .ip-warning-card.ip-warning-exit {
      animation: confirmCardOut 0.3s ease-in forwards;
    }

    .ip-warning-icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.06) 100%);
      border: 1px solid rgba(251, 191, 36, 0.2);
      position: relative;
      z-index: 1;
      animation: confirmIconPulse 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .ip-warning-icon i {
      font-size: 1.75rem;
      color: rgba(251, 191, 36, 0.85);
      filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.3));
    }

    .ip-warning-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
    }

    .ip-warning-desc {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.4);
      text-align: center;
      line-height: 1.55;
      max-width: 300px;
    }

    .ip-warning-btn {
      width: 100%;
      height: 44px;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.06) 100%);
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-top: 0.25rem;
    }

    .ip-warning-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.9);
    }

    .ip-warning-btn:active {
      transform: scale(0.98);
    }

    @keyframes slideDown {
      from { opacity: 0; max-height: 0; transform: translateY(-10px); }
      to { opacity: 1; max-height: 300px; transform: translateY(0); }
    }

    /* Paste button */
    .paste-btn {
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .paste-btn:active {
      background: rgba(255, 255, 255, 0.1);
    }

    /* Authenticator app shortcut button */
    .auth-app-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      flex: 1;
      padding: 0.5rem 0.75rem;
      border-radius: 14px;
      border: 1px solid rgba(99, 102, 241, 0.15);
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%);
      color: rgba(165, 180, 252, 0.8);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
      -webkit-tap-highlight-color: transparent;
    }
    .auth-app-btn i {
      font-size: 0.75rem;
    }
    .auth-app-btn:active {
      transform: scale(0.97);
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.3);
    }

    /* ============================================
       NAZ THEME
       ============================================ */
    .naz-theme .animated-gradient-container {
      position: relative;
      overflow: hidden;
    }
    /* Subtle silver ambient blob instead of lava lamp */
    .naz-theme .animated-gradient-container::before {
      content: '';
      position: fixed;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(156, 163, 175, 0.06), transparent 70%);
      top: -100px;
      right: -100px;
      filter: blur(100px);
      pointer-events: none;
      z-index: 0;
    }
    .naz-theme .animated-gradient-container::after {
      content: '';
      position: fixed;
      width: 350px;
      height: 350px;
      background: radial-gradient(circle, rgba(156, 163, 175, 0.04), transparent 70%);
      bottom: -80px;
      left: -80px;
      filter: blur(100px);
      pointer-events: none;
      z-index: 0;
    }

    /* ============================================
       BLACK DOG THEME
       ============================================ */
    .blackdog-theme .timeclock-card {
      border: 1px solid rgba(251, 191, 36, 0.15) !important;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 0 12px rgba(251, 191, 36, 0.06) !important;
    }
    .blackdog-theme .timeclock-card::before {
      background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.2), transparent);
    }
    .blackdog-theme .timeclock-card ::ng-deep .p-card-body {
      border-radius: 28px !important;
    }

    /* BlackDog ambient blobs */
    .blackdog-theme .animated-gradient-container::before {
      background: radial-gradient(circle, rgba(251, 191, 36, 0.05), transparent 70%);
    }
    .blackdog-theme .animated-gradient-container::after {
      background: radial-gradient(circle, rgba(251, 191, 36, 0.03), transparent 70%);
    }

    /* BlackDog select */
    .blackdog-theme .timeclock-card ::ng-deep .p-select .p-select-trigger {
      border: 1px solid rgba(251, 191, 36, 0.12) !important;
    }
    .blackdog-theme .timeclock-card ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(251, 191, 36, 0.4) !important;
      box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.08) !important;
    }

    /* BlackDog OTP */
    .blackdog-theme .timeclock-card ::ng-deep .p-inputotp-input {
      border: 1px solid rgba(251, 191, 36, 0.12) !important;
      color: #fbbf24 !important;
    }
    .blackdog-theme .timeclock-card ::ng-deep .p-inputotp-input:focus {
      border-color: rgba(251, 191, 36, 0.4) !important;
      box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.08) !important;
    }
    .blackdog-theme .timeclock-card ::ng-deep .p-inputotp-input:not(:placeholder-shown) {
      border-color: rgba(251, 191, 36, 0.2) !important;
    }

    /* BlackDog button */
    .blackdog-theme .timeclock-card ::ng-deep .mark-button button {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
      color: #111 !important;
      box-shadow: 0 2px 12px rgba(251, 191, 36, 0.25) !important;
    }
    .blackdog-theme .timeclock-card ::ng-deep .mark-button button:disabled {
      background: rgba(255, 255, 255, 0.08) !important;
      color: rgba(255, 255, 255, 0.3) !important;
      box-shadow: none !important;
    }
    .blackdog-theme .timeclock-card ::ng-deep .p-button:not(:disabled):hover {
      box-shadow: 0 4px 20px rgba(251, 191, 36, 0.35) !important;
    }

    /* BlackDog scrollbar */
    .blackdog-theme .animated-gradient-container::-webkit-scrollbar-thumb {
      background: rgba(251, 191, 36, 0.15);
    }
    .blackdog-theme .animated-gradient-container::-webkit-scrollbar-thumb:hover {
      background: rgba(251, 191, 36, 0.25);
    }
    .blackdog-theme .animated-gradient-container {
      scrollbar-color: rgba(251, 191, 36, 0.15) transparent;
    }

    /* BlackDog keypad hover */
    .blackdog-theme .keypad-toggle-btn:hover {
      background: rgba(251, 191, 36, 0.06);
      border-color: rgba(251, 191, 36, 0.15);
      color: rgba(251, 191, 36, 0.7);
    }

    /* ============================================
       CONFIRMATION MODAL
       ============================================ */
    .confirm-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(20px) saturate(1.2);
      animation: confirmOverlayIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      padding: 1rem;
    }

    @keyframes confirmOverlayIn {
      from { opacity: 0; backdrop-filter: blur(0px); }
      to { opacity: 1; backdrop-filter: blur(20px); }
    }

    .confirm-modal-card {
      background: linear-gradient(165deg, rgba(28, 28, 32, 0.96) 0%, rgba(16, 16, 20, 0.98) 100%);
      backdrop-filter: blur(40px) saturate(1.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 32px;
      padding: 2.5rem 2rem 1.25rem;
      max-width: 420px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.85rem;
      box-shadow:
        0 32px 80px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.03) inset,
        0 1px 0 rgba(255, 255, 255, 0.06) inset;
      animation: confirmCardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }

    /* Top highlight shimmer */
    .confirm-modal-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.4) 30%, rgba(34, 197, 94, 0.6) 50%, rgba(34, 197, 94, 0.4) 70%, transparent 100%);
      background-size: 200% 100%;
      animation: modalShimmer 3s ease-in-out infinite;
      border-radius: 32px 32px 0 0;
      z-index: 1;
      pointer-events: none;
    }

    /* Subtle side glow */
    .confirm-modal-card::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 32px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      pointer-events: none;
    }

    @keyframes modalShimmer {
      0%, 100% { background-position: -100% 0; opacity: 0.6; }
      50% { background-position: 200% 0; opacity: 1; }
    }

    .confirm-modal-card.is-late {
      box-shadow:
        0 32px 80px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.03) inset,
        0 0 40px rgba(245, 158, 11, 0.06);
    }
    .confirm-modal-card.is-late::before {
      background: linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.4) 30%, rgba(245, 158, 11, 0.7) 50%, rgba(245, 158, 11, 0.4) 70%, transparent 100%);
      background-size: 200% 100%;
    }

    /* Naz theme modal */
    .naz-theme .confirm-modal-card::before {
      background: linear-gradient(90deg, transparent 0%, rgba(156, 163, 175, 0.3) 30%, rgba(156, 163, 175, 0.5) 50%, rgba(156, 163, 175, 0.3) 70%, transparent 100%);
      background-size: 200% 100%;
    }
    .naz-theme .confirm-modal-card.is-late::before {
      background: linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.4) 30%, rgba(245, 158, 11, 0.7) 50%, rgba(245, 158, 11, 0.4) 70%, transparent 100%);
      background-size: 200% 100%;
    }

    /* BlackDog theme modal */
    .blackdog-theme .confirm-modal-card::before {
      background: linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.4) 30%, rgba(251, 191, 36, 0.7) 50%, rgba(251, 191, 36, 0.4) 70%, transparent 100%);
      background-size: 200% 100%;
    }

    @keyframes confirmCardIn {
      from { opacity: 0; transform: scale(0.88) translateY(16px); filter: blur(4px); }
      to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
    }

    .confirm-modal-card.confirm-modal-exit {
      animation: confirmCardOut 0.3s ease-in forwards;
    }

    @keyframes confirmCardOut {
      from { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
      to { opacity: 0; transform: scale(0.92) translateY(8px); filter: blur(4px); }
    }

    /* Icon */
    .confirm-modal-icon-wrap {
      margin-bottom: 0.5rem;
      position: relative;
    }

    /* Ripple ring behind icon */
    .confirm-modal-icon-wrap::after {
      content: '';
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      border: 1px solid rgba(34, 197, 94, 0.15);
      animation: iconRipple 2s ease-out infinite;
    }
    .is-late .confirm-modal-icon-wrap::after {
      border-color: rgba(245, 158, 11, 0.15);
    }
    .blackdog-theme .confirm-modal-icon-wrap::after {
      border-color: rgba(251, 191, 36, 0.15);
    }
    .naz-theme .confirm-modal-icon-wrap::after {
      border-color: rgba(156, 163, 175, 0.15);
    }

    @keyframes iconRipple {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    .confirm-modal-icon {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: confirmIconPulse 0.7s cubic-bezier(0.22, 1, 0.36, 1);
      position: relative;
      z-index: 1;
    }

    .confirm-modal-icon i {
      font-size: 3rem;
    }

    .confirm-modal-icon--success {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%);
      border: 1.5px solid rgba(34, 197, 94, 0.35);
      box-shadow: 0 0 40px rgba(34, 197, 94, 0.2), 0 0 80px rgba(34, 197, 94, 0.05);
      backdrop-filter: blur(8px);
    }
    .confirm-modal-icon--success i {
      color: #22c55e;
      filter: drop-shadow(0 0 12px rgba(34, 197, 94, 0.4));
    }

    /* Blackdog: golden success */
    .blackdog-theme .confirm-modal-icon--success {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%);
      border-color: rgba(251, 191, 36, 0.4);
      box-shadow: 0 0 40px rgba(251, 191, 36, 0.2), 0 0 80px rgba(251, 191, 36, 0.05);
    }
    .blackdog-theme .confirm-modal-icon--success i {
      color: #fbbf24;
      filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.4));
    }

    /* Naz: silver success */
    .naz-theme .confirm-modal-icon--success {
      background: linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(107, 114, 128, 0.1) 100%);
      border-color: rgba(156, 163, 175, 0.4);
      box-shadow: 0 0 40px rgba(156, 163, 175, 0.2), 0 0 80px rgba(156, 163, 175, 0.05);
    }
    .naz-theme .confirm-modal-icon--success i {
      color: #9ca3af;
      filter: drop-shadow(0 0 12px rgba(156, 163, 175, 0.4));
    }

    .confirm-modal-icon--late {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%);
      border: 1.5px solid rgba(245, 158, 11, 0.35);
      box-shadow: 0 0 40px rgba(245, 158, 11, 0.2), 0 0 80px rgba(245, 158, 11, 0.05);
      backdrop-filter: blur(8px);
    }
    .confirm-modal-icon--late i {
      color: #f59e0b;
      filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.4));
    }

    @keyframes confirmIconPulse {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.12); opacity: 1; }
      70% { transform: scale(0.96); }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Title + Time */
    .confirm-modal-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: rgba(243, 244, 246, 0.85);
      text-align: center;
      line-height: 1.3;
      letter-spacing: 0.01em;
    }

    .confirm-modal-time {
      font-size: clamp(1.25rem, 5vw, 2rem);
      font-weight: 800;
      text-align: center;
      margin-top: -0.1rem;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
      white-space: nowrap;
      animation: timeReveal 0.5s ease-out 0.2s both;
    }

    @keyframes timeReveal {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .blackdog-theme .confirm-modal-time {
      color: #fbbf24;
      text-shadow: 0 0 24px rgba(251, 191, 36, 0.25);
    }
    .naz-theme .confirm-modal-time {
      color: #d1d5db;
      text-shadow: 0 0 24px rgba(156, 163, 175, 0.2);
    }
    .confirm-modal-time {
      color: #4ade80;
      text-shadow: 0 0 24px rgba(34, 197, 94, 0.2);
    }
    .is-late .confirm-modal-time {
      color: #fbbf24;
      text-shadow: 0 0 24px rgba(245, 158, 11, 0.25);
    }

    /* Late box */
    .confirm-modal-late-box {
      width: 100%;
      padding: 0.9rem 1.25rem;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.04) 100%);
      border: 1px solid rgba(245, 158, 11, 0.2);
      text-align: center;
      backdrop-filter: blur(8px);
      animation: slideUp 0.4s ease-out 0.3s both;
    }
    .confirm-modal-late-header {
      color: #fbbf24;
      font-weight: 700;
      font-size: 0.95rem;
      margin-bottom: 0.35rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }
    .confirm-modal-late-detail {
      color: rgba(252, 211, 77, 0.85);
      font-size: 0.9rem;
      font-variant-numeric: tabular-nums;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Very late */
    .confirm-modal-verylate-box {
      width: 100%;
      padding: 0.9rem 1.25rem;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.04) 100%);
      border: 1px solid rgba(239, 68, 68, 0.2);
      text-align: center;
      backdrop-filter: blur(8px);
      animation: slideUp 0.4s ease-out 0.4s both;
    }
    .confirm-modal-verylate-header {
      color: #f87171;
      font-weight: 700;
      font-size: 0.95rem;
      margin-bottom: 0.35rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }
    .confirm-modal-verylate-detail {
      color: rgba(252, 165, 165, 0.85);
      font-size: 0.85rem;
      line-height: 1.4;
    }

    /* Streak box */
    .confirm-modal-streak-box {
      width: 100%;
      padding: 0.7rem 1.1rem;
      border-radius: 16px;
      text-align: center;
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: 0.02em;
      backdrop-filter: blur(8px);
      animation: slideUp 0.4s ease-out 0.35s both;
    }

    .blackdog-theme .confirm-modal-streak-box {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.06) 100%);
      border: 1px solid rgba(251, 191, 36, 0.3);
      color: #fbbf24;
    }
    .naz-theme .confirm-modal-streak-box {
      background: linear-gradient(135deg, rgba(156, 163, 175, 0.12) 0%, rgba(107, 114, 128, 0.06) 100%);
      border: 1px solid rgba(156, 163, 175, 0.3);
      color: #d1d5db;
    }
    .confirm-modal-streak-box {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(22, 163, 74, 0.06) 100%);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
    }

    /* Phrase box */
    .confirm-modal-phrase-box {
      width: 100%;
      padding: 0.85rem 1.25rem;
      border-radius: 20px;
      text-align: center;
      font-style: italic;
      font-size: 0.95rem;
      line-height: 1.5;
      letter-spacing: 0.01em;
      backdrop-filter: blur(8px);
      animation: phraseReveal 0.5s ease-out 0.5s both;
    }

    @keyframes phraseReveal {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .blackdog-theme .confirm-modal-phrase-box {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.06) 0%, rgba(251, 191, 36, 0.02) 100%);
      border: 1px solid rgba(251, 191, 36, 0.15);
      color: rgba(252, 211, 77, 0.9);
    }
    .naz-theme .confirm-modal-phrase-box {
      background: linear-gradient(135deg, rgba(156, 163, 175, 0.06) 0%, rgba(156, 163, 175, 0.02) 100%);
      border: 1px solid rgba(156, 163, 175, 0.15);
      color: rgba(209, 213, 219, 0.9);
    }
    .confirm-modal-phrase-box {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(59, 130, 246, 0.02) 100%);
      border: 1px solid rgba(59, 130, 246, 0.15);
      color: rgba(147, 197, 253, 0.9);
    }

    /* Progress bar */
    .confirm-modal-progress-track {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 0 0 31px 31px;
      overflow: hidden;
      margin-top: 0.5rem;
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
    }

    .confirm-modal-progress-bar {
      height: 100%;
      border-radius: 0 0 31px 31px;
      animation: confirmProgressShrink 6s linear forwards, progressShimmer 2s ease-in-out infinite;
      background-size: 200% 100%;
    }

    @keyframes progressShimmer {
      0%, 100% { background-position: 0% 0%; }
      50% { background-position: 100% 0%; }
    }

    .blackdog-theme .confirm-modal-progress-bar {
      background: linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24);
      background-size: 200% 100%;
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
    }
    .naz-theme .confirm-modal-progress-bar {
      background: linear-gradient(90deg, #9ca3af, #6b7280, #9ca3af);
      background-size: 200% 100%;
      box-shadow: 0 0 10px rgba(156, 163, 175, 0.2);
    }
    .confirm-modal-progress-bar {
      background: linear-gradient(90deg, #22c55e, #16a34a, #22c55e);
      background-size: 200% 100%;
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
    }
    .confirm-modal-progress-bar.is-late {
      background: linear-gradient(90deg, #f59e0b, #d97706, #f59e0b) !important;
      background-size: 200% 100% !important;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
    }

    @keyframes confirmProgressShrink {
      from { width: 100%; }
      to { width: 0%; }
    }

    /* ====== BIRTHDAY STYLES ====== */
    .confirm-modal-card.is-birthday {
      border-color: rgba(236, 72, 153, 0.3);
      box-shadow:
        0 32px 80px rgba(0, 0, 0, 0.6),
        0 0 60px rgba(236, 72, 153, 0.15),
        0 0 120px rgba(168, 85, 247, 0.06);
      background: linear-gradient(165deg, rgba(28, 22, 30, 0.97) 0%, rgba(40, 16, 40, 0.98) 100%);
    }

    .confirm-modal-card.is-birthday::before {
      background: linear-gradient(90deg, transparent 0%, rgba(236, 72, 153, 0.5) 20%, rgba(168, 85, 247, 0.6) 40%, rgba(251, 191, 36, 0.5) 60%, rgba(236, 72, 153, 0.5) 80%, transparent 100%);
      background-size: 300% 100%;
      animation: birthdayShimmer 2s ease-in-out infinite;
    }

    @keyframes birthdayShimmer {
      0%, 100% { background-position: -100% 0; }
      50% { background-position: 200% 0; }
    }

    .is-birthday .confirm-modal-icon-wrap::after {
      border-color: rgba(236, 72, 153, 0.2);
    }

    .is-birthday .confirm-modal-time {
      color: #f472b6;
      text-shadow: 0 0 24px rgba(236, 72, 153, 0.25);
    }

    .confirm-modal-icon--birthday {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%);
      border: 1.5px solid rgba(236, 72, 153, 0.4);
      box-shadow: 0 0 40px rgba(236, 72, 153, 0.3), 0 0 80px rgba(168, 85, 247, 0.1);
      backdrop-filter: blur(8px);
      animation: confirmIconPulse 0.7s cubic-bezier(0.22, 1, 0.36, 1), birthdayGlow 2s ease-in-out infinite;
    }

    .birthday-icon-emoji {
      font-size: 2.75rem;
      line-height: 1;
      filter: drop-shadow(0 0 10px rgba(236, 72, 153, 0.5));
    }

    @keyframes birthdayGlow {
      0%, 100% { box-shadow: 0 0 40px rgba(236, 72, 153, 0.3), 0 0 80px rgba(168, 85, 247, 0.1); }
      50% { box-shadow: 0 0 50px rgba(236, 72, 153, 0.5), 0 0 100px rgba(168, 85, 247, 0.2); }
    }

    .confirm-modal-birthday-greeting {
      font-size: 1.4rem;
      font-weight: 800;
      text-align: center;
      background: linear-gradient(135deg, #f472b6, #a78bfa, #fbbf24);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: birthdayTextShimmer 3s ease-in-out infinite;
      line-height: 1.3;
    }

    @keyframes birthdayTextShimmer {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    .confirm-modal-phrase-box.birthday-phrase {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(168, 85, 247, 0.06) 100%);
      border-color: rgba(236, 72, 153, 0.25);
      color: rgba(249, 168, 212, 0.9);
    }

    .birthday-phrase-icon {
      font-style: normal;
    }

    .confirm-modal-progress-bar.is-birthday {
      background: linear-gradient(90deg, #ec4899, #a855f7, #fbbf24, #ec4899) !important;
      background-size: 300% 100% !important;
      animation: confirmProgressShrink 10s linear forwards, birthdayProgressShimmer 1.5s linear infinite !important;
      box-shadow: 0 0 10px rgba(236, 72, 153, 0.3);
    }

    @keyframes birthdayProgressShimmer {
      0% { background-position: 0% 0%; }
      100% { background-position: 300% 0%; }
    }

    /* ====== SPECIAL ENTRY ====== */
    .confirm-modal-icon--vip {
      background: linear-gradient(135deg, rgba(251,191,36,0.25) 0%, rgba(234,179,8,0.15) 50%, rgba(252,211,77,0.2) 100%);
      border: 1.5px solid rgba(251,191,36,0.5);
      box-shadow: 0 0 40px rgba(251,191,36,0.4), 0 0 80px rgba(250,204,21,0.15);
      backdrop-filter: blur(8px);
      animation: confirmIconPulse 0.7s cubic-bezier(0.22, 1, 0.36, 1), vipGlow 2s ease-in-out infinite;
    }
    .vip-icon-emoji {
      font-size: 2.75rem;
      line-height: 1;
      filter: drop-shadow(0 0 12px rgba(251,191,36,0.7));
      animation: vipBounce 0.8s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes vipGlow {
      0%, 100% { box-shadow: 0 0 40px rgba(251,191,36,0.4), 0 0 80px rgba(250,204,21,0.15); }
      50%       { box-shadow: 0 0 60px rgba(251,191,36,0.6), 0 0 120px rgba(250,204,21,0.25); }
    }
    @keyframes vipBounce {
      0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; }
      60%  { transform: scale(1.2) rotate(5deg); opacity: 1; }
      100% { transform: scale(1) rotate(0); }
    }
    .confirm-modal-phrase-box.vip-phrase {
      background: linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(234,179,8,0.06) 100%);
      border-color: rgba(251,191,36,0.3);
      color: rgba(253,224,71,0.95);
      font-style: italic;
    }
    .vip-phrase-icon { font-style: normal; }

    /* ── Matrix confirmation modal ── */
    .confirm-modal-card.is-matrix {
      background: rgba(0, 10, 0, 0.97) !important;
      border: 1px solid #00cc44 !important;
      box-shadow: 0 0 40px rgba(0,204,68,0.35), inset 0 0 30px rgba(0,204,68,0.05) !important;
      font-family: 'Courier New', monospace !important;
    }
    .confirm-modal-card.is-matrix .confirm-modal-title,
    .confirm-modal-card.is-matrix .confirm-modal-time {
      color: #00ff55 !important;
      font-family: 'Courier New', monospace !important;
      letter-spacing: 0.05em;
    }
    .confirm-modal-icon--matrix {
      background: rgba(0,30,0,0.8);
      border: 1.5px solid #00cc44;
      box-shadow: 0 0 30px rgba(0,204,68,0.4);
      animation: confirmIconPulse 0.7s cubic-bezier(0.22,1,0.36,1), matrixIconGlow 1.5s ease-in-out infinite;
    }
    @keyframes matrixIconGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(0,204,68,0.4); }
      50%       { box-shadow: 0 0 40px rgba(0,255,85,0.7); }
    }
    .matrix-icon-char {
      font-size: 2.5rem;
      font-family: 'Courier New', monospace;
      color: #00ff55;
      font-weight: bold;
      text-shadow: 0 0 12px rgba(0,255,85,0.8);
      animation: matrixCursorBlink 0.8s step-end infinite;
    }
    @keyframes matrixCursorBlink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.2; }
    }
    .confirm-modal-phrase-box.is-matrix-phrase {
      background: rgba(0,30,0,0.6);
      border-color: rgba(0,204,68,0.3);
      color: #00cc44;
      font-family: 'Courier New', monospace;
      font-size: 0.7rem;
      letter-spacing: 0.03em;
    }
    .confirm-modal-card.is-matrix .confirm-modal-progress-bar {
      background: linear-gradient(90deg, #003300, #00cc44, #00ff55) !important;
      box-shadow: 0 0 8px rgba(0,255,85,0.5);
    }

    /* ====== SMOOTH TRANSITIONS ====== */
    .timeclock-card {
      transition: background 0.7s ease, border-color 0.7s ease, box-shadow 0.7s ease !important;
    }
    .clock-hero-time {
      transition: color 0.6s ease, text-shadow 0.6s ease, font-family 0.4s ease;
    }
    .greeting-msg, .clock-hero-date, .clock-subtitle {
      transition: color 0.6s ease, font-family 0.4s ease;
    }
    .animated-gradient-container {
      transition: background 0.9s ease;
    }

    /* ====== MATRIX MODE ====== */
    .matrix-canvas {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 1s ease;
    }
    .matrix-canvas--active {
      opacity: 0.6;
    }
    .matrix-mode .bg-orbs { display: none; }
    .matrix-mode.animated-gradient-container {
      background: #000 !important;
      transition: background 0.8s ease;
    }
    .matrix-card {
      background: rgba(0,15,0,0.82) !important;
      border-color: #00cc44 !important;
      box-shadow: 0 0 40px rgba(0,204,68,0.3), inset 0 0 30px rgba(0,204,68,0.07) !important;
    }
    .matrix-card ::ng-deep .p-card {
      background: transparent !important;
    }
    .matrix-card.special-mode::after { display: none; }
    .matrix-card.special-mode::before { display: none; }
    .matrix-time {
      color: #00ff55 !important;
      font-family: 'Courier New', monospace !important;
      letter-spacing: 0.05em !important;
      text-shadow: 0 0 10px rgba(0,255,85,0.7) !important;
      animation: matrixTimePulse 1.8s ease-in-out infinite !important;
    }
    @keyframes matrixTimePulse {
      0%, 100% { text-shadow: 0 0 10px rgba(0,255,85,0.7); }
      50%       { text-shadow: 0 0 28px rgba(0,255,85,1), 0 0 50px rgba(0,255,85,0.4); }
    }
    .matrix-mode .greeting-msg,
    .matrix-mode .clock-hero-date,
    .matrix-mode .clock-subtitle {
      color: #00cc44 !important;
      font-family: 'Courier New', monospace !important;
    }
    .matrix-mode ::ng-deep .p-select,
    .matrix-mode ::ng-deep .p-select .p-select-label,
    .matrix-mode ::ng-deep .p-inputotp-input {
      border-color: #00cc44 !important;
      color: #00ff55 !important;
      background: rgba(0,15,0,0.7) !important;
    }
    .matrix-mode pt-news-ticker ::ng-deep * {
      color: #00cc44 !important;
      font-family: 'Courier New', monospace !important;
      border-color: rgba(0,204,68,0.3) !important;
      background: rgba(0,15,0,0.8) !important;
    }
    .matrix-card ::ng-deep .p-button {
      background: rgba(0,180,60,0.15) !important;
      border: 1px solid #00cc44 !important;
      color: #00ff55 !important;
      box-shadow: 0 0 14px rgba(0,204,68,0.3) !important;
      font-family: 'Courier New', monospace !important;
    }
    .matrix-card ::ng-deep .p-button:not(:disabled):hover {
      background: rgba(0,204,68,0.28) !important;
      box-shadow: 0 0 24px rgba(0,255,85,0.55) !important;
    }

    /* ====== SPECIAL SELECTION MODE ====== */
    @property --angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }
    .timeclock-card.special-mode {
      border-color: transparent !important;
      position: relative;
      isolation: isolate;
    }
    .timeclock-card.special-mode::after {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 30px;
      background: conic-gradient(
        from var(--angle, 0deg),
        transparent 0%,
        rgba(251,191,36,0.4) 3%,
        rgba(251,191,36,1) 6%,
        rgba(251,191,36,0.4) 9%,
        transparent 12%
      );
      -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      padding: 2px;
      z-index: 1;
      animation: specialBorderSpin 5s linear infinite;
      pointer-events: none;
    }
    @keyframes specialBorderSpin {
      to { --angle: 360deg; }
    }

    .clock-hero-time.special-pulse {
      animation: specialTimePulse 2.5s ease-in-out infinite !important;
    }
    @keyframes specialTimePulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.75; }
    }

    /* ====== CONFETTI ====== */
    .confetti-container {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
      border-radius: 32px;
    }

    .confetti-piece {
      position: absolute;
      width: 8px;
      height: 8px;
      top: -10px;
      opacity: 0;
      animation: confettiFall 3s ease-in forwards;
      animation-delay: calc(var(--i) * 0.15s);
    }

    .confetti-piece:nth-child(odd) { background: #ec4899; border-radius: 50%; }
    .confetti-piece:nth-child(even) { background: #fbbf24; border-radius: 2px; transform: rotate(45deg); }
    .confetti-piece:nth-child(3n) { background: #a855f7; width: 6px; height: 10px; border-radius: 3px; }
    .confetti-piece:nth-child(4n) { background: #34d399; width: 10px; height: 6px; border-radius: 2px; }
    .confetti-piece:nth-child(5n) { background: #60a5fa; border-radius: 50%; }

    .confetti-piece:nth-child(1) { left: 5%; }
    .confetti-piece:nth-child(2) { left: 12%; }
    .confetti-piece:nth-child(3) { left: 20%; }
    .confetti-piece:nth-child(4) { left: 28%; }
    .confetti-piece:nth-child(5) { left: 35%; }
    .confetti-piece:nth-child(6) { left: 42%; }
    .confetti-piece:nth-child(7) { left: 48%; }
    .confetti-piece:nth-child(8) { left: 55%; }
    .confetti-piece:nth-child(9) { left: 62%; }
    .confetti-piece:nth-child(10) { left: 68%; }
    .confetti-piece:nth-child(11) { left: 75%; }
    .confetti-piece:nth-child(12) { left: 82%; }
    .confetti-piece:nth-child(13) { left: 88%; }
    .confetti-piece:nth-child(14) { left: 93%; }
    .confetti-piece:nth-child(15) { left: 8%; }
    .confetti-piece:nth-child(16) { left: 25%; }
    .confetti-piece:nth-child(17) { left: 40%; }
    .confetti-piece:nth-child(18) { left: 58%; }
    .confetti-piece:nth-child(19) { left: 72%; }
    .confetti-piece:nth-child(20) { left: 90%; }

    @keyframes confettiFall {
      0% { top: -10px; opacity: 1; transform: rotate(0deg) translateX(0); }
      25% { opacity: 1; }
      100% { top: 110%; opacity: 0; transform: rotate(720deg) translateX(30px); }
    }

    /* Responsive */
    @media (max-width: 640px) {
      .confirm-modal-card {
        padding: 1.75rem 1.25rem 0.75rem;
        max-width: 360px;
        border-radius: 28px;
      }
      .confirm-modal-icon {
        width: 72px;
        height: 72px;
      }
      .confirm-modal-icon i {
        font-size: 2.25rem;
      }
      .birthday-icon-emoji {
        font-size: 2.25rem;
      }
      .confirm-modal-title {
        font-size: 1rem;
      }
      .confirm-modal-time {
        font-size: 1.75rem;
      }
      .confirm-modal-birthday-greeting {
        font-size: 1.15rem;
      }
      .confirm-modal-late-box,
      .confirm-modal-verylate-box,
      .confirm-modal-phrase-box {
        border-radius: 16px;
      }
      .confetti-container {
        border-radius: 28px;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .confirm-modal-overlay,
      .confirm-modal-card,
      .confirm-modal-icon,
      .confirm-modal-card.confirm-modal-exit,
      .confirm-modal-card::before {
        animation: none !important;
      }
    }

    /* ============================================
       INFO BUTTON
       ============================================ */
    .info-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid rgba(251, 191, 36, 0.35);
      background: rgba(251, 191, 36, 0.08);
      color: rgba(251, 191, 36, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
      font-size: 1rem;
    }
    .info-btn:hover {
      background: rgba(251, 191, 36, 0.18);
      border-color: rgba(251, 191, 36, 0.6);
      color: #fbbf24;
      transform: scale(1.08);
    }
    .info-btn:active { transform: scale(0.95); }

    /* ============================================
       INFO MODAL
       ============================================ */
    .info-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(10px);
      padding: 1rem;
      animation: confirmOverlayIn 0.25s ease-out;
    }
    .info-modal-card {
      background: linear-gradient(165deg, rgba(28, 28, 35, 0.97) 0%, rgba(18, 18, 22, 0.99) 100%);
      border: 1px solid rgba(251, 191, 36, 0.25);
      border-radius: 20px;
      padding: 1.25rem 1.25rem 1.5rem;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(251, 191, 36, 0.05);
      animation: confirmCardIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .info-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .info-modal-title {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.5);
    }
    .info-modal-title-name {
      display: flex; align-items: center; gap: 0.65rem;
    }
    .info-modal-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: rgba(251,191,36,0.12);
      border: 1px solid rgba(251,191,36,0.25);
      display: flex; align-items: center; justify-content: center;
      color: #fbbf24; font-size: 0.85rem; flex-shrink: 0;
    }
    .info-modal-name {
      font-size: 0.9rem; font-weight: 700; color: #f3f4f6; line-height: 1.2;
    }
    .info-modal-name-sub {
      font-size: 0.68rem; color: rgba(255,255,255,0.38); font-weight: 400;
    }
    .info-modal-close-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 0.72rem;
    }
    .info-modal-close-btn:hover { background: rgba(255, 255, 255, 0.12); color: white; }
    .info-employee-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #e5e7eb;
      text-align: center;
      margin-bottom: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .info-branch-warning {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.65rem 0.75rem;
      background: rgba(249, 115, 22, 0.1);
      border: 1px solid rgba(249, 115, 22, 0.3);
      border-radius: 10px;
      color: #fb923c;
      font-size: 0.8rem;
      margin-bottom: 0.75rem;
    }
    .info-branch-warning i { margin-top: 1px; flex-shrink: 0; }
    .info-rows { display: flex; flex-direction: column; gap: 0.6rem; }
    .info-row {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.65rem 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }
    .info-row-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }
    .info-row-val-row { display: flex; align-items: baseline; gap: 0.4rem; flex-wrap: wrap; }
    .info-scheduled { font-size: 0.72rem; color: rgba(255,255,255,0.35); font-weight: 400; }
    .entry-icon { background: rgba(52, 211, 153, 0.12); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.2); }
    .entry-late { background: rgba(248, 113, 113, 0.12) !important; color: #f87171 !important; border-color: rgba(248, 113, 113, 0.25) !important; }
    .lunch-icon { background: rgba(251, 191, 36, 0.08); color: rgba(251, 191, 36, 0.6); border: 1px solid rgba(251, 191, 36, 0.15); }
    .lunch-active { background: rgba(251, 191, 36, 0.2) !important; color: #fbbf24 !important; border-color: rgba(251, 191, 36, 0.4) !important; animation: lunchPulse 2s ease-in-out infinite; }
    @keyframes lunchPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.3); }
      50% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.1); }
    }
    .exit-icon { background: rgba(96, 165, 250, 0.1); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.2); }
    .info-row-label { font-size: 0.68rem; color: rgba(255, 255, 255, 0.38); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; margin-bottom: 0.15rem; }
    .info-row-val { font-size: 0.88rem; font-weight: 600; color: #e5e7eb; }
    .muted-val { color: rgba(255, 255, 255, 0.28); font-weight: 400; }
    .info-row-sub { font-size: 0.73rem; margin-top: 0.15rem; }
    .ok-text { color: #34d399; }
    .warn-text { color: #f87171; }
    .muted-text { color: rgba(255, 255, 255, 0.32); }
    .info-modal-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 2rem 1rem; color: rgba(255, 255, 255, 0.45); font-size: 0.85rem; }
    .info-modal-loading i { font-size: 1.5rem; color: #fbbf24; }

    /* PIN step */
    /* Greeting */
    .greeting-msg {
      font-size: 0.8rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.45);
      letter-spacing: 0.03em;
      text-align: center;
    }
    .greeting-special {
      color: #fbbf24;
      font-weight: 600;
      font-size: 0.85rem;
      text-shadow: 0 0 12px rgba(251, 191, 36, 0.4);
    }

    .info-pin-hidden-input {
      position: absolute; opacity: 0; pointer-events: none;
      width: 1px; height: 1px; overflow: hidden;
    }
    .info-pin-section { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding-top: 0.25rem; }
    .info-pin-title {
      font-size: 0.85rem; color: rgba(255,255,255,0.5); font-weight: 500;
      display: flex; align-items: center; gap: 0.4rem;
    }
    .info-pin-help {
      width: 17px; height: 17px; border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.25);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.45);
      font-size: 0.68rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0;
      transition: all 0.15s;
    }
    .info-pin-help:hover, .info-pin-help:active {
      border-color: rgba(251,191,36,0.5);
      background: rgba(251,191,36,0.1);
      color: #fbbf24;
    }
    .info-pin-help-text {
      display: flex; gap: 0.5rem; align-items: flex-start;
      background: rgba(251,191,36,0.07);
      border: 1px solid rgba(251,191,36,0.2);
      border-radius: 10px;
      padding: 0.6rem 0.75rem;
      font-size: 0.75rem;
      color: rgba(255,255,255,0.6);
      line-height: 1.45;
      max-width: 260px;
      text-align: left;
      animation: slideDown 0.2s ease-out;
    }
    .info-pin-help-text i { color: #fbbf24; flex-shrink: 0; margin-top: 1px; }
    .info-pin-dots { display: flex; gap: 0.6rem; }
    .info-pin-dot {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.2);
      background: transparent;
      transition: all 0.15s ease;
    }
    .info-pin-dot.filled {
      background: #fbbf24;
      border-color: #fbbf24;
      box-shadow: 0 0 8px rgba(251,191,36,0.5);
    }
    .info-pin-dot.error {
      border-color: #f87171;
    }
    .info-pin-error { font-size: 0.78rem; color: #f87171; text-align: center; min-height: 1.1em; }
    .info-keypad { width: 100%; max-width: 260px; }
    .info-keypad-btn {
      width: 100%; height: 46px; border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.85);
      font-size: 1.1rem; font-weight: 500;
      cursor: pointer; transition: all 0.15s;
      display: flex; align-items: center; justify-content: center;
    }
    .info-keypad-btn:hover { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.3); color: #fbbf24; }
    .info-keypad-btn:active { transform: scale(0.93); }
    .info-keypad-clear { color: rgba(255,255,255,0.4); }
    .info-keypad-clear:hover { background: rgba(239,68,68,0.1) !important; border-color: rgba(239,68,68,0.3) !important; color: #f87171 !important; }
    .info-keypad-del { color: rgba(255,255,255,0.5); }

  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeclockComponent implements OnDestroy {
  private message = inject(MessageService);
  private confirmation = inject(ConfirmationService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private router = inject(Router);
  private ipMonitor = inject(IpMonitorService);
  private organizationService = inject(OrganizationService);
  private timeSync = inject(TimeSyncService);
  private destroyRef = inject(DestroyRef);
  private diagnosticService = inject(DiagnosticService);
  private phrases = inject(TimeclockPhrasesService);

  /** Employees that can mark from any IP address */
  private readonly IP_BYPASS_EMPLOYEE_IDS = new Set([
    '43cd8574-3c4b-40c2-9824-5f9a4fe68dc8', // Tristan Whitehead
  ]);
  private readonly DISPLAY_TIMEZONE = 'America/Panama';
  // Get IP address - try multiple methods to get real IP even from localhost
  public currentIP = signal<string>('127.0.0.1');
  public isProcessing = signal<boolean>(false);
  public showKeypad = signal<boolean>(false);
  public showKeypadPanel = signal<boolean>(false);
  public currentTime = signal<Date>(new Date());
  public availableTypes = signal<Array<{ value: string; label: string }>>([]);
  public isKioskMode = signal<boolean>(false);
  public isMobileKiosk = signal<boolean>(false);
  public isIPValid = signal<boolean>(true);
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
    employeeName: string;
    isLunchOvertime: boolean;
    lunchExceededMinutes: number;
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

  // Update time every second
  constructor() {
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

    // Try to get real IP address using multiple methods
    this.detectIP();

    // Si está en modo kiosko y NO es Naz, monitorear la IP continuamente
    if (isKioskRoute && !this.isNazCompany()) {
      this.setupKioskModeMonitoring();
    } else if (isKioskRoute && this.isNazCompany()) {
      // Para Naz, siempre considerar la IP como válida
      this.isIPValid.set(true);
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
    // Detener monitoreo de IP si está activo
    if (this.isKioskMode()) {
      this.ipMonitor.stopMonitoring();
    }
  }

  // Detect IP address using multiple methods
  private detectIP() {
    // Method 1: Try WebRTC (works even from localhost)
    this.getIPViaWebRTC()
      .then((ip) => {
        if (ip && ip !== '127.0.0.1' && ip !== '::1') {
          this.currentIP.set(ip);
          return;
        }

        // Method 2: Try ipify.org (may have CORS issues in dev)
        this.getIPViaHttp()
          .then((ip) => {
            if (ip && ip !== '127.0.0.1') {
              this.currentIP.set(ip);
            }
          })
          .catch(() => {
            // Method 3: Try alternative service
            this.getIPViaAlternative()
              .then((ip) => {
                if (ip && ip !== '127.0.0.1') {
                  this.currentIP.set(ip);
                }
              })
              .catch(() => {
                // Keep default 127.0.0.1 if all methods fail
              });
          });
      })
      .catch(() => {
        // If WebRTC fails, try HTTP methods
        this.getIPViaHttp()
          .then((ip) => {
            if (ip && ip !== '127.0.0.1') {
              this.currentIP.set(ip);
            }
          })
          .catch(() => {
            this.getIPViaAlternative()
              .then((ip) => {
                if (ip && ip !== '127.0.0.1') {
                  this.currentIP.set(ip);
                }
              })
              .catch(() => {
                // Keep default
              });
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

  // Determinar si se puede cambiar la sucursal (solo si es oficina central)
  public canChangeBranch = computed(() => {
    const currentIP = this.getIP();
    if (!currentIP || currentIP === '127.0.0.1') {
      return true; // Permitir cambio si no se puede detectar la IP
    }

    const branches = this.currentBranchesResource();
    if (!branches || branches.length === 0) {
      return true; // Permitir cambio si no hay sucursales cargadas
    }

    // Buscar la sucursal que coincide con la IP actual
    const matchingBranch = branches.find(
      (b: Branch | NazBranch) => b.ip === currentIP
    );

    if (!matchingBranch) {
      return true; // Permitir cambio si no hay sucursal que coincida con la IP
    }

    // Verificar si la sucursal es oficina central
    const branchName = matchingBranch.name.toLowerCase();
    const isCentralOffice =
      branchName.includes('oficina central') ||
      branchName.includes('central') ||
      branchName.includes('oficina');

    return isCentralOffice;
  });

  // Separate resources for regular employees and Naz employees
  public employeesResource = httpResource<Partial<Employee>[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: 'id,first_name,father_name,code_uri,birth_date,branch_id,gender',
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
        map((schedules) =>
          schedules && schedules.length > 0 ? schedules[0] : null
        ),
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
    initAudioContext();

    if (employee?.id) {
      const fxId = employee.id;
      firstValueFrom(this.http.post<{ v: boolean; m: boolean }>('/api/fx', { id: fxId }))
        .then(r => {
          // Ignore if a different employee was selected (or deselected) while request was in flight
          if (this.form.get('employee')?.value?.id !== fxId) return;
          this.specialMode.set(r?.v === true);
          const mx = r?.m === true;
          this.matrixMode.set(mx);
          document.body.classList.toggle('matrix-active', mx);
          if (mx) setTimeout(() => this.startMatrix(), 50);
          else this.stopMatrix();
        })
        .catch(() => { this.specialMode.set(false); this.stopMatrix(); });

      this.getLastTimelog(employee.id).subscribe({
        next: (lastTimelog) => {
          const nextType = this.getNextTimelogType(lastTimelog?.type || null);
          this.updateAvailableTypes(lastTimelog?.type || null);
          this.form.get('type')?.setValue(nextType);
          this.focusOtpInput();
        },
        error: () => {
          this.updateAvailableTypes(null);
          this.form.get('type')?.setValue('entry');
          this.focusOtpInput();
        },
      });
    } else {
      this.specialMode.set(false);
      this.matrixMode.set(false);
      document.body.classList.remove('matrix-active');
      this.stopMatrix();
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
    const validation = totp.validate({ token: otp });
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

    const isNaz = this.isNazCompany();
    const serviceCompanyId = this.organizationService.getCurrentCompanyId();

    // Validar que los datos sean correctos para la organización
    if (!employee || !employee.id) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor seleccione un empleado',
      });
      return;
    }

    if (!branch_id) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor seleccione una sucursal',
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
        summary: 'Error',
        detail: 'Por favor seleccione una compañía',
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
        detail:
          'El empleado seleccionado no es válido para esta organización. Por favor, seleccione un empleado válido.',
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
        detail:
          'La sucursal seleccionada no es válida para esta organización. Por favor, seleccione una sucursal válida.',
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
      const validation = totp.validate({ token: otp });
      if (validation === null) {
        this.isProcessing.set(false);
        // Reproducir sonido de error
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

      this.processTimelog(
        employee.id,
        branch_id,
        finalCompanyId,
        type,
        employeeName,
        employee.birth_date as any,
        employee.first_name as string,
        (employee as any).gender as 'M' | 'F' | undefined
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

  private processTimelog(
    employeeId: string,
    branchId: string,
    companyId: string,
    type: string,
    employeeName: string,
    birthDate?: string,
    firstName?: string,
    gender?: 'M' | 'F'
  ) {
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

          let errorMessage = 'Algo salió mal, intente nuevamente';

          // Manejar errores específicos
          if (error?.status === 409) {
            errorMessage = `Error: El empleado (${employeeId.substring(
              0,
              8
            )}...), sucursal (${branchId.substring(
              0,
              8
            )}...) o compañía (${finalCompanyId.substring(
              0,
              8
            )}...) seleccionados no existen. Verifique que los datos sean correctos para ${
              isNaz ? 'Naz' : 'Black Dog'
            }.`;
          } else if (error?.status === 422) {
            const details =
              error?.error?.details ||
              error?.error?.message ||
              'Los datos proporcionados no son válidos';
            errorMessage = `Error: ${details}. Por favor, verifique la información.`;
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
              detail: 'Respuesta inválida del servidor (sin body).',
              life: 10000,
            });
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
              detail: result.error || 'Error al procesar la marcación',
              life: 10000,
            });
            return;
          }

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
          const showDialog = (isVip = false, isMatrix = false) => {
            this.showConfirmationDialogWithSound(message, isLate, employeeId, {
              typeLabel,
              time: timeFormatted,
              phrase: isMatrix ? this.getMatrixPhrase(employeeName) : isVip ? this.getVipPhrase(employeeName) : phrase,
              delayText,
              isVeryLate,
              isBirthday,
              isVip,
              isMatrix,
              employeeName,
              isLunchOvertime: !!isLunchOvertime,
              lunchExceededMinutes: result.lunchExceededMinutes || 0,
            });
          };

          firstValueFrom(
            this.http.post<{ v: boolean; m: boolean }>('/api/fx', { id: employeeId })
          ).then(r => showDialog(r?.v === true, r?.m === true)).catch(() => showDialog());
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
      employeeName: string;
      isLunchOvertime: boolean;
      lunchExceededMinutes: number;
    }
  ): void {
    this.isProcessing.set(false);

    // Immediately reset form fields so button is disabled during modal display
    this.form.get('otp')?.reset();
    this.form.get('employee')?.reset();
    this.specialMode.set(false);
    this.matrixMode.set(false);
    document.body.classList.remove('matrix-active');
    this.stopMatrix();

    const vip = !!modalData?.isVip;
    const mx = !!modalData?.isMatrix;

    // Reproducir sonido según contexto
    if (modalData?.isBirthday) {
      playBirthdaySound();
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
      isBirthday: modalData?.isBirthday || false,
      isVip: vip,
      isMatrix: mx,
      employeeName: modalData?.employeeName || '',
      isLunchOvertime: modalData?.isLunchOvertime || false,
      lunchExceededMinutes: modalData?.lunchExceededMinutes || 0,
    });
    this.confirmModalExiting.set(false);
    this.confirmModalVisible.set(true);

    // Calculate streak async for entry type
    if (!isLate && employeeId) {
      this.calculateAndShowStreak(employeeId);
    }

    // Auto-dismiss
    const dismissTime = modalData?.isBirthday ? 10000 : (vip || mx) ? 8000 : 6000;
    this.confirmModalTimer = setTimeout(() => {
      this.dismissConfirmModal();
    }, dismissTime);
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
}
