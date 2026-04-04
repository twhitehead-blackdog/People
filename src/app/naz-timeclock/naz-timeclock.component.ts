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

            <!-- Auth Method Toggle (only shown when employee has fingerprint registered) -->
            @if (employeeHasFingerprint() && form.get('employee')?.value) {
              <div class="auth-method-toggle w-full">
                <button type="button" class="auth-method-btn" [class.auth-method-btn--active]="authMethod() === 'pin'" (click)="authMethod.set('pin')">
                  <i class="pi pi-shield"></i> Autenticador
                </button>
                <button type="button" class="auth-method-btn" [class.auth-method-btn--active]="authMethod() === 'fingerprint'" (click)="authMethod.set('fingerprint')">
                  <i class="pi pi-fingerprint"></i> Huella
                </button>
              </div>
            }

            <!-- PIN Input Section -->
            @if (authMethod() === 'pin') {
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
              </div>
              <!-- Keypad toggle + Teclado numérico -->
              <button type="button" class="keypad-toggle-btn w-full" (click)="toggleKeypad()">
                <i class="pi" [ngClass]="showKeypadPanel() ? 'pi-chevron-up' : 'pi-th-large'"></i>
                {{ showKeypadPanel() ? 'Ocultar teclado' : 'Teclado numérico' }}
              </button>
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

            <!-- Fingerprint Section -->
            @if (authMethod() === 'fingerprint') {
              <div class="w-full flex flex-col items-center gap-3">
                <button
                  type="button"
                  class="fingerprint-scan-btn"
                  [class.fingerprint-scan-btn--processing]="isProcessing()"
                  [disabled]="isProcessing() || !form.get('employee')?.value || !form.get('type')?.value"
                  (click)="validateFingerprint()"
                >
                  <i class="pi pi-fingerprint fingerprint-icon"></i>
                  <span class="fingerprint-label">{{ isProcessing() ? 'Verificando...' : 'Poner dedo en el lector' }}</span>
                </button>
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
    </div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    @media (max-width: 767px) {
      :host {
        height: 100dvh;
        height: 100vh;
        overflow: hidden;
        position: fixed;
        inset: 0;
      }
    }

    .animated-gradient-container {
      background: linear-gradient(135deg, #0f0f12 0%, #0a0a0d 25%, #000000 50%, #0a0a0d 75%, #141418 100%);
      position: relative;
      min-height: 100vh;
      min-height: 100dvh;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Ambient floating orbs */
    .animated-gradient-container::before,
    .animated-gradient-container::after {
      content: '';
      position: fixed;
      border-radius: 50%;
      pointer-events: none;
      filter: blur(80px);
      opacity: 0.15;
      z-index: 0;
    }

    .animated-gradient-container::before {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(251, 191, 36, 0.4), transparent 70%);
      top: -100px;
      right: -100px;
      animation: floatOrb1 15s ease-in-out infinite;
    }

    .animated-gradient-container::after {
      width: 350px;
      height: 350px;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.3), transparent 70%);
      bottom: -80px;
      left: -80px;
      animation: floatOrb2 18s ease-in-out infinite;
    }

    @keyframes floatOrb1 {
      0%, 100% { transform: translate(0, 0); }
      33% { transform: translate(-60px, 40px); }
      66% { transform: translate(30px, -30px); }
    }

    @keyframes floatOrb2 {
      0%, 100% { transform: translate(0, 0); }
      33% { transform: translate(50px, -40px); }
      66% { transform: translate(-40px, 50px); }
    }
    
    /* Beautiful custom scrollbar */
    .animated-gradient-container::-webkit-scrollbar {
      width: 10px;
    }
    
    .animated-gradient-container::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
      margin: 10px 0;
    }
    
    .animated-gradient-container::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.6) 0%, rgba(251, 191, 36, 0.4) 100%);
      border-radius: 10px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
      transition: all 0.3s ease;
    }
    
    .animated-gradient-container::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0.6) 100%);
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
    }
    
    .animated-gradient-container::-webkit-scrollbar-thumb:active {
      background: linear-gradient(180deg, rgba(251, 191, 36, 1) 0%, rgba(251, 191, 36, 0.8) 100%);
    }
    
    /* Firefox scrollbar */
    .animated-gradient-container {
      scrollbar-width: thin;
      scrollbar-color: rgba(251, 191, 36, 0.6) rgba(0, 0, 0, 0.3);
    }
    
    .timeclock-content {
      transform-origin: center;
      flex-shrink: 0;
    }
    
    /* old desktop scale rules removed */
    
    /* old mobile scale rules removed - using dvh-based layout now */
    
    
    .timeclock-card {
      border: 1px solid rgba(251, 191, 36, 0.25) !important;
      border-radius: 20px !important;
      box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.03) inset,
        0 1px 0 rgba(255, 255, 255, 0.05) inset,
        0 0 40px rgba(251, 191, 36, 0.06) !important;
      backdrop-filter: blur(20px) saturate(1.1);
      background: linear-gradient(165deg, rgba(22, 28, 45, 0.95) 0%, rgba(12, 16, 28, 0.98) 100%) !important;
      animation: cardEntrance 0.4s cubic-bezier(0.22, 1, 0.36, 1);
      position: relative;
    }
    
    /* old card padding rules removed - handled by mobile layout block */
    
    /* Desactivar animaciones solo si el usuario explícitamente prefiere movimiento reducido */
    @media (prefers-reduced-motion: reduce) {
      .clock-time {
        animation: none !important;
      }
      
      .timeclock-card {
        animation: none !important;
      }
    }
    
    @keyframes cardEntrance {
      from {
        opacity: 0;
        transform: scale(1.03);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    .clock-display {
      border: 1px solid rgba(251, 191, 36, 0.5) !important;
    }
    
    .clock-time {
      text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.15);
      animation: clockPulse 3s ease-in-out infinite;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.05em;
    }
    
    @keyframes clockPulse {
      0%, 100% {
        text-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.15);
      }
      50% {
        text-shadow: 0 0 30px rgba(251, 191, 36, 0.8), 0 0 60px rgba(251, 191, 36, 0.25), 0 0 90px rgba(251, 191, 36, 0.1);
      }
    }
    
    .timeclock-card ::ng-deep .p-card {
      border-radius: 12px !important;
      border: none !important;
    }
    
    .timeclock-card ::ng-deep .p-card-body {
      border-radius: 12px !important;
    }
    
    .timeclock-card ::ng-deep .p-select {
      border-radius: 8px !important;
    }
    
    .timeclock-card ::ng-deep .p-select .p-select-trigger {
      border-radius: 8px !important;
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
    }
    
    .timeclock-card ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(251, 191, 36, 0.8) !important;
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3) !important;
    }
    
    .error-border ::ng-deep .p-select .p-select-trigger {
      border-color: rgba(239, 68, 68, 0.5) !important;
    }
    
    .error-border ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(239, 68, 68, 0.8) !important;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.3) !important;
    }
    
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
      min-width: 32px !important;
      max-width: 45px !important;
      height: 38px !important;
      font-size: 0.95rem !important;
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
      border-radius: 8px !important;
      background: rgba(31, 41, 55, 0.8) !important;
      color: #fbbf24 !important;
      font-weight: bold !important;
      flex: 0 0 auto !important;
    }
    
    .timeclock-card ::ng-deep .p-inputotp-input:focus {
      border-color: rgba(251, 191, 36, 0.9) !important;
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.4) !important;
      outline: none !important;
    }
    
    .timeclock-card ::ng-deep .p-inputotp-input:not(:placeholder-shown) {
      border-color: rgba(251, 191, 36, 0.7) !important;
    }
    
    @media (max-width: 768px) {
      .timeclock-card ::ng-deep .p-inputotp-input {
        min-width: 28px !important;
        max-width: 38px !important;
        height: 35px !important;
        font-size: 0.85rem !important;
      }
    }
    
    .input-container ::ng-deep .p-select {
      width: 100%;
    }
    
    .input-container ::ng-deep .p-select .p-select-trigger {
      padding: 0.4rem 0.65rem;
      min-height: 38px;
      font-size: 0.875rem;
    }
    
    @media (max-width: 768px) {
      .input-container ::ng-deep .p-select .p-select-trigger {
        padding: 0.5rem 0.7rem;
        min-height: 40px;
        font-size: 0.85rem;
      }
    }
    
    .timeclock-card ::ng-deep .mark-button {
      margin: 0 auto !important;
      display: block !important;
      width: auto !important;
    }
    
    .timeclock-card ::ng-deep .mark-button button {
      margin: 0 auto !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      flex-direction: row !important;
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
      top: -2px !important;
    }
    
    .timeclock-card ::ng-deep .p-button .p-button-label {
      display: inline-flex !important;
      align-items: center !important;
      line-height: 1 !important;
    }
    
    .timeclock-card ::ng-deep .p-button .p-button-icon-left {
      margin-right: 0.5rem !important;
    }
    
    .timeclock-card ::ng-deep .p-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .timeclock-card ::ng-deep .p-button:not(:disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(251, 191, 36, 0.6) !important;
      filter: brightness(1.1);
    }
    
    .timeclock-card ::ng-deep .p-button:not(:disabled):active {
      transform: translateY(0);
    }
    
    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    
    .timeclock-card ::ng-deep .p-button[loading] .p-button-icon,
    .timeclock-card ::ng-deep .p-button .pi-spinner {
      animation: rotate 0.6s linear infinite;
    }

    .keypad-btn {
      height: 48px;
      font-size: 1.3rem;
      font-weight: 600;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.03) 100%);
      color: #e5e7eb;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      backdrop-filter: blur(4px);
    }
    .keypad-btn:hover {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%);
      border-color: rgba(251, 191, 36, 0.2);
    }
    .keypad-btn:active {
      transform: scale(0.92);
      background: rgba(251, 191, 36, 0.15);
      border-color: rgba(251, 191, 36, 0.4);
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.15);
    }
    .keypad-delete {
      color: #fbbf24;
      border-color: rgba(251, 191, 36, 0.15);
    }
    .keypad-clear {
      color: #f87171;
      border-color: rgba(239, 68, 68, 0.15);
    }
    .keypad-clear:active {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.15);
    }
    @media (min-width: 768px) {
      .keypad-btn { height: 52px; font-size: 1.4rem; }
    }

    /* Paste button */
    .paste-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: 1px solid rgba(251, 191, 36, 0.3);
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(251, 191, 36, 0.04) 100%);
      color: #fbbf24;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      transition: all 0.2s ease;
      flex-shrink: 0;
      backdrop-filter: blur(4px);
    }
    .paste-btn:active {
      transform: scale(0.9);
      background: rgba(251, 191, 36, 0.25);
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.2);
    }

    /* ===== MOBILE LAYOUT: fit viewport without scroll ===== */
    @media (max-width: 767px) {
      .animated-gradient-container {
        padding: 0 !important;
        overflow: hidden !important;
        height: 100vh !important;
        height: 100dvh !important;
        min-height: unset !important;
        max-height: 100vh;
        max-height: 100dvh;
      }

      .animated-gradient-container::before,
      .animated-gradient-container::after {
        display: none;
      }

      .timeclock-content {
        height: 100vh !important;
        height: 100dvh !important;
        min-height: unset !important;
        max-height: 100vh !important;
        max-height: 100dvh !important;
        padding: 0.5rem 0.75rem !important;
        gap: 0.25rem !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        transform: none !important;
        overflow: hidden !important;
      }

      .timeclock-card {
        border-radius: 16px !important;
        max-width: 100% !important;
      }

      .timeclock-card ::ng-deep .p-card-body {
        padding: 0.4rem 0.6rem !important;
      }

      .timeclock-card ::ng-deep .p-card-title {
        padding: 0.25rem 0.5rem 0 !important;
      }

      .timeclock-card ::ng-deep .p-card-subtitle {
        padding: 0 0.5rem !important;
        margin: 0 !important;
        font-size: 0.7rem !important;
      }

      .timeclock-card ::ng-deep .p-card-content {
        padding: 0 !important;
      }

      form.flex {
        gap: 0.3rem !important;
      }

      .keypad-grid {
        margin-top: 0.15rem !important;
      }

      .keypad-btn {
        height: 38px !important;
        font-size: 1.1rem !important;
        border-radius: 10px !important;
      }

      .input-container ::ng-deep .p-select .p-select-trigger {
        min-height: 34px !important;
        padding: 0.25rem 0.55rem !important;
        font-size: 0.8rem !important;
      }

      .timeclock-card ::ng-deep .p-inputotp-input {
        min-width: 24px !important;
        max-width: 32px !important;
        height: 32px !important;
        font-size: 0.82rem !important;
      }

      .clock-display {
        padding: 0.25rem 0.5rem !important;
      }

      .clock-time {
        font-size: 1.15rem !important;
      }

      img {
        height: 2.5rem !important;
      }
    }

    /* Extra small phones (iPhone SE, etc.) */
    @media (max-width: 380px) {
      .timeclock-content {
        padding: 0.35rem 0.5rem !important;
        gap: 0.15rem !important;
      }
      .keypad-btn {
        height: 34px !important;
        font-size: 1rem !important;
        gap: 1px !important;
      }
      .keypad-grid ::ng-deep .grid {
        gap: 0.2rem !important;
      }
      .clock-time {
        font-size: 1rem !important;
      }
      img {
        height: 2rem !important;
      }
    }

    /* Short landscape phones */
    @media (max-height: 600px) and (max-width: 767px) {
      .timeclock-content {
        padding: 0.25rem 0.5rem !important;
        gap: 0.1rem !important;
      }
      img {
        height: 1.5rem !important;
      }
      .keypad-btn {
        height: 30px !important;
        font-size: 0.9rem !important;
      }
    }

    /* Auth method toggle */
    .auth-method-toggle {
      display: flex;
      gap: 0.5rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 0.25rem;
    }
    .auth-method-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.5rem 0.75rem;
      border-radius: 9px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.5);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .auth-method-btn--active {
      background: linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.1) 100%);
      color: #fbbf24;
      border: 1px solid rgba(251,191,36,0.3);
    }
    .auth-method-btn:not(.auth-method-btn--active):hover {
      color: rgba(255,255,255,0.75);
      background: rgba(255,255,255,0.05);
    }

    /* Fingerprint scan button */
    .fingerprint-scan-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      width: 100%;
      min-height: 140px;
      border-radius: 20px;
      border: 2px dashed rgba(251,191,36,0.4);
      background: linear-gradient(135deg, rgba(251,191,36,0.07) 0%, rgba(245,158,11,0.03) 100%);
      color: #fbbf24;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .fingerprint-scan-btn:hover:not(:disabled) {
      border-color: rgba(251,191,36,0.7);
      background: linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.06) 100%);
      transform: scale(1.01);
    }
    .fingerprint-scan-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .fingerprint-scan-btn--processing {
      border-color: rgba(251,191,36,0.6);
      animation: pulse-border 1.2s ease-in-out infinite;
    }
    .fingerprint-icon {
      font-size: 3rem;
    }
    .fingerprint-scan-btn--processing .fingerprint-icon {
      animation: pulse 1.2s ease-in-out infinite;
    }
    .fingerprint-label {
      font-size: 0.9rem;
      font-weight: 500;
    }
    @keyframes pulse-border {
      0%, 100% { border-color: rgba(251,191,36,0.4); }
      50% { border-color: rgba(251,191,36,0.8); }
    }

    .keypad-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 0.25rem;
    }
    .keypad-toggle-btn:hover {
      background: rgba(251, 191, 36, 0.1);
      border-color: rgba(251, 191, 36, 0.25);
      color: rgba(251, 191, 36, 0.8);
    }
    .keypad-toggle-btn:active {
      transform: scale(0.97);
    }

    @keyframes slideDown {
      from { opacity: 0; max-height: 0; transform: translateY(-10px); }
      to { opacity: 1; max-height: 300px; transform: translateY(0); }
    }

    /* ============================================
       CUSTOM SUCCESS CONFIRMATION MODAL
       ============================================ */
    .confirm-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(12px) saturate(1.2);
      animation: confirmOverlayIn 0.35s ease-out;
      cursor: pointer;
      padding: 1rem;
    }

    @keyframes confirmOverlayIn {
      from { opacity: 0; backdrop-filter: blur(0px); }
      to { opacity: 1; backdrop-filter: blur(12px); }
    }

    .confirm-modal-card {
      background: linear-gradient(165deg, rgba(30, 30, 35, 0.95) 0%, rgba(18, 18, 22, 0.98) 100%);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 24px;
      padding: 2.25rem 2rem 1.25rem;
      max-width: 420px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.85rem;
      box-shadow:
        0 30px 80px rgba(0, 0, 0, 0.7),
        0 0 0 1px rgba(255, 255, 255, 0.04) inset,
        0 1px 0 rgba(255, 255, 255, 0.06) inset,
        0 0 60px rgba(251, 191, 36, 0.08);
      animation: confirmCardIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(20px);
    }

    /* Subtle animated glow ring */
    .confirm-modal-card::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 24px;
      padding: 1px;
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.4), transparent 40%, transparent 60%, rgba(251, 191, 36, 0.2));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
      animation: borderRotate 6s linear infinite;
    }

    @keyframes borderRotate {
      0% { background: linear-gradient(0deg, rgba(251, 191, 36, 0.4), transparent 40%, transparent 60%, rgba(251, 191, 36, 0.2)); }
      25% { background: linear-gradient(90deg, rgba(251, 191, 36, 0.4), transparent 40%, transparent 60%, rgba(251, 191, 36, 0.2)); }
      50% { background: linear-gradient(180deg, rgba(251, 191, 36, 0.4), transparent 40%, transparent 60%, rgba(251, 191, 36, 0.2)); }
      75% { background: linear-gradient(270deg, rgba(251, 191, 36, 0.4), transparent 40%, transparent 60%, rgba(251, 191, 36, 0.2)); }
      100% { background: linear-gradient(360deg, rgba(251, 191, 36, 0.4), transparent 40%, transparent 60%, rgba(251, 191, 36, 0.2)); }
    }

    .confirm-modal-card.is-late {
      border-color: rgba(245, 158, 11, 0.35);
      box-shadow:
        0 30px 80px rgba(0, 0, 0, 0.7),
        0 0 0 1px rgba(255, 255, 255, 0.04) inset,
        0 0 60px rgba(245, 158, 11, 0.08);
    }

    .confirm-modal-card.is-late::before {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.5), transparent 40%, transparent 60%, rgba(245, 158, 11, 0.2));
    }

    @keyframes confirmCardIn {
      from { opacity: 0; transform: scale(0.85) translateY(20px); filter: blur(4px); }
      to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
    }

    .confirm-modal-card.confirm-modal-exit {
      animation: confirmCardOut 0.3s ease-in forwards;
    }

    @keyframes confirmCardOut {
      from { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
      to { opacity: 0; transform: scale(0.92) translateY(10px); filter: blur(4px); }
    }

    /* Icon */
    .confirm-modal-icon-wrap {
      margin-bottom: 0.5rem;
      position: relative;
    }

    .confirm-modal-icon {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: confirmIconPulse 0.7s cubic-bezier(0.22, 1, 0.36, 1);
      position: relative;
      z-index: 1;
    }

    /* Ripple ring behind icon */
    .confirm-modal-icon-wrap::after {
      content: '';
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 1px solid rgba(251, 191, 36, 0.2);
      animation: iconRipple 2s ease-out infinite;
    }

    .is-late .confirm-modal-icon-wrap::after {
      border-color: rgba(245, 158, 11, 0.2);
    }

    @keyframes iconRipple {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    .confirm-modal-icon i {
      font-size: 2.75rem;
    }

    .confirm-modal-icon--success {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%);
      border: 1.5px solid rgba(251, 191, 36, 0.4);
      box-shadow: 0 0 40px rgba(251, 191, 36, 0.2), 0 0 80px rgba(251, 191, 36, 0.05);
      backdrop-filter: blur(8px);
    }
    .confirm-modal-icon--success i {
      color: #fbbf24;
      filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.5));
    }

    .confirm-modal-icon--late {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%);
      border: 1.5px solid rgba(245, 158, 11, 0.4);
      box-shadow: 0 0 40px rgba(245, 158, 11, 0.2), 0 0 80px rgba(245, 158, 11, 0.05);
      backdrop-filter: blur(8px);
    }
    .confirm-modal-icon--late i {
      color: #f59e0b;
      filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.5));
    }

    @keyframes confirmIconPulse {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.15); opacity: 1; }
      70% { transform: scale(0.95); }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Title + Time */
    .confirm-modal-title {
      font-size: 1.05rem;
      font-weight: 600;
      color: rgba(243, 244, 246, 0.85);
      text-align: center;
      line-height: 1.3;
      letter-spacing: 0.01em;
    }

    .confirm-modal-time {
      font-size: 2rem;
      font-weight: 800;
      color: #fbbf24;
      text-align: center;
      margin-top: -0.15rem;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      text-shadow: 0 0 30px rgba(251, 191, 36, 0.3);
      animation: timeReveal 0.6s ease-out 0.2s both;
    }

    @keyframes timeReveal {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .is-late .confirm-modal-time {
      color: #f59e0b;
      text-shadow: 0 0 30px rgba(245, 158, 11, 0.3);
    }

    /* Late box */
    .confirm-modal-late-box {
      width: 100%;
      padding: 0.85rem 1.15rem;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%);
      border: 1px solid rgba(245, 158, 11, 0.25);
      text-align: center;
      backdrop-filter: blur(4px);
      animation: slideUp 0.4s ease-out 0.3s both;
    }
    .confirm-modal-late-header {
      color: #fbbf24;
      font-weight: 700;
      font-size: 0.95rem;
      margin-bottom: 0.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }
    .confirm-modal-late-detail {
      color: rgba(252, 211, 77, 0.9);
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
      padding: 0.85rem 1.15rem;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(185, 28, 28, 0.06) 100%);
      border: 1px solid rgba(239, 68, 68, 0.25);
      text-align: center;
      backdrop-filter: blur(4px);
      animation: slideUp 0.4s ease-out 0.4s both;
    }
    .confirm-modal-verylate-header {
      color: #f87171;
      font-weight: 700;
      font-size: 0.95rem;
      margin-bottom: 0.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }
    .confirm-modal-verylate-detail {
      color: rgba(252, 165, 165, 0.9);
      font-size: 0.85rem;
      line-height: 1.4;
    }

    /* Phrase box */
    .confirm-modal-phrase-box {
      width: 100%;
      padding: 0.85rem 1.25rem;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.06) 0%, rgba(251, 191, 36, 0.02) 100%);
      border: 1px solid rgba(251, 191, 36, 0.15);
      color: rgba(252, 211, 77, 0.95);
      text-align: center;
      font-style: italic;
      font-size: 0.95rem;
      line-height: 1.5;
      letter-spacing: 0.01em;
      position: relative;
      animation: phraseReveal 0.5s ease-out 0.5s both;
    }

    @keyframes phraseReveal {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Progress bar */
    .confirm-modal-progress-track {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 0 0 23px 23px;
      overflow: hidden;
      margin-top: 0.5rem;
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
    }

    .confirm-modal-progress-bar {
      height: 100%;
      border-radius: 0 0 23px 23px;
      background: linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24);
      background-size: 200% 100%;
      animation: confirmProgressShrink 6s linear forwards, progressShimmer 2s ease-in-out infinite;
      box-shadow: 0 0 12px rgba(251, 191, 36, 0.4);
    }

    .confirm-modal-progress-bar.is-late {
      background: linear-gradient(90deg, #f59e0b, #d97706, #f59e0b) !important;
      background-size: 200% 100% !important;
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
    }

    @keyframes confirmProgressShrink {
      from { width: 100%; }
      to { width: 0%; }
    }

    @keyframes progressShimmer {
      0%, 100% { background-position: 0% 0%; }
      50% { background-position: 100% 0%; }
    }

    /* ====== BIRTHDAY STYLES ====== */
    .confirm-modal-card.is-birthday {
      border-color: rgba(236, 72, 153, 0.6);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 60px rgba(236, 72, 153, 0.25), 0 0 120px rgba(168, 85, 247, 0.1);
      background: linear-gradient(135deg, rgba(24, 24, 27, 0.97) 0%, rgba(40, 20, 40, 0.97) 100%);
    }

    .is-birthday .confirm-modal-time {
      color: #f472b6;
    }

    .confirm-modal-icon--birthday {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(168, 85, 247, 0.2) 100%);
      border: 2px solid rgba(236, 72, 153, 0.5);
      box-shadow: 0 0 30px rgba(236, 72, 153, 0.4), 0 0 60px rgba(168, 85, 247, 0.15);
      animation: confirmIconPulse 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), birthdayGlow 2s ease-in-out infinite;
    }

    .birthday-icon-emoji {
      font-size: 2.5rem;
      line-height: 1;
      filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.6));
    }

    @keyframes birthdayGlow {
      0%, 100% { box-shadow: 0 0 30px rgba(236, 72, 153, 0.4), 0 0 60px rgba(168, 85, 247, 0.15); }
      50% { box-shadow: 0 0 40px rgba(236, 72, 153, 0.6), 0 0 80px rgba(168, 85, 247, 0.25); }
    }

    .confirm-modal-birthday-greeting {
      font-size: 1.3rem;
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
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%);
      border-color: rgba(236, 72, 153, 0.35);
      color: #f9a8d4;
    }

    .birthday-phrase-icon {
      font-style: normal;
    }

    .confirm-modal-progress-bar.is-birthday {
      background: linear-gradient(90deg, #ec4899, #a855f7, #fbbf24) !important;
      background-size: 200% 100%;
      animation: confirmProgressShrink 10s linear forwards, birthdayProgressShimmer 1s linear infinite !important;
    }

    @keyframes birthdayProgressShimmer {
      0% { background-position: 0% 0%; }
      100% { background-position: 200% 0%; }
    }

    /* ====== CONFETTI ====== */
    .confetti-container {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
      border-radius: 20px;
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

    .confetti-piece:nth-child(odd) {
      background: #ec4899;
      border-radius: 50%;
    }
    .confetti-piece:nth-child(even) {
      background: #fbbf24;
      border-radius: 2px;
      transform: rotate(45deg);
    }
    .confetti-piece:nth-child(3n) {
      background: #a855f7;
      width: 6px;
      height: 10px;
      border-radius: 3px;
    }
    .confetti-piece:nth-child(4n) {
      background: #34d399;
      width: 10px;
      height: 6px;
      border-radius: 2px;
    }
    .confetti-piece:nth-child(5n) {
      background: #60a5fa;
      border-radius: 50%;
    }

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
        padding: 1.5rem 1.25rem 0.75rem;
        max-width: 340px;
      }
      .confirm-modal-icon {
        width: 64px;
        height: 64px;
      }
      .confirm-modal-icon i {
        font-size: 2rem;
      }
      .birthday-icon-emoji {
        font-size: 2rem;
      }
      .confirm-modal-title {
        font-size: 1rem;
      }
      .confirm-modal-time {
        font-size: 1.25rem;
      }
      .confirm-modal-birthday-greeting {
        font-size: 1.1rem;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .confirm-modal-overlay,
      .confirm-modal-card,
      .confirm-modal-icon,
      .confirm-modal-card.confirm-modal-exit {
        animation: none !important;
      }
    }

    /* ============================================
       INFO BUTTON
       ============================================ */
    .info-btn {
      width: 34px;
      height: 34px;
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
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #fbbf24;
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
    .info-modal-close-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: white;
    }
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
    .info-rows {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
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
    .entry-icon {
      background: rgba(52, 211, 153, 0.12);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.2);
    }
    .lunch-icon {
      background: rgba(251, 191, 36, 0.08);
      color: rgba(251, 191, 36, 0.6);
      border: 1px solid rgba(251, 191, 36, 0.15);
    }
    .lunch-active {
      background: rgba(251, 191, 36, 0.2) !important;
      color: #fbbf24 !important;
      border-color: rgba(251, 191, 36, 0.4) !important;
      animation: lunchPulse 2s ease-in-out infinite;
    }
    @keyframes lunchPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.3); }
      50% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.1); }
    }
    .exit-icon {
      background: rgba(96, 165, 250, 0.1);
      color: #60a5fa;
      border: 1px solid rgba(96, 165, 250, 0.2);
    }
    .info-row-label {
      font-size: 0.68rem;
      color: rgba(255, 255, 255, 0.38);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 500;
      margin-bottom: 0.15rem;
    }
    .info-row-val {
      font-size: 0.88rem;
      font-weight: 600;
      color: #e5e7eb;
    }
    .muted-val { color: rgba(255, 255, 255, 0.28); font-weight: 400; }
    .info-row-sub { font-size: 0.73rem; margin-top: 0.15rem; }
    .ok-text { color: #34d399; }
    .warn-text { color: #f87171; }
    .muted-text { color: rgba(255, 255, 255, 0.32); }
    .info-modal-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem 1rem;
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.85rem;
    }
    .info-modal-loading i { font-size: 1.5rem; color: #fbbf24; }

  `,
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

  /** Employees that can mark from any IP address */
  private readonly IP_BYPASS_EMPLOYEE_IDS = new Set([
    '43cd8574-3c4b-40c2-9824-5f9a4fe68dc8', // Tristan Whitehead
  ]);
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

  // Update time every second
  constructor() {
    // Configurar organización como Naz para esta ruta
    this.organizationService.setOrganization('naz');

    // Inicializar contexto de audio para sonidos de marcación
    initAudioContext();

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

    // Track selected branch for info modal / branch mismatch
    this.form.get('branch_id')?.valueChanges.subscribe((branchId) => {
      this.selectedBranchId.set(branchId || '');
    });
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
    if (employee?.id) {
      // Check fingerprint registration in background
      this.webAuthn.getCredentialStatus(employee.id)
        .then(s => this.employeeHasFingerprint.set(s.hasCredential))
        .catch(() => this.employeeHasFingerprint.set(false));

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
        employee.birth_date as any
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

  async validateFingerprint() {
    if (this.isProcessing()) return;
    const { employee, branch_id, company_id, type } = this.form.getRawValue();
    if (!employee) return;

    this.isProcessing.set(true);
    try {
      const verified = await this.webAuthn.authenticateFingerprint(employee.id);
      if (!verified) {
        playFailureSound();
        this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo verificar la huella.' });
        return;
      }
      const employeeName = `${employee.first_name} ${employee.father_name}`.trim();
      this.processTimelog(employee.id, branch_id, company_id, type, employeeName, employee.birth_date as any);
    } catch (err: any) {
      this.isProcessing.set(false);
      playFailureSound();
      const detail = err?.name === 'NotAllowedError'
        ? 'Verificación cancelada. Intente de nuevo.'
        : err?.status === 404
          ? 'No hay huella registrada para este empleado.'
          : 'Error al leer la huella. Intente con PIN.';
      this.message.add({ severity: 'error', summary: 'Huella', detail, life: 6000 });
    }
  }

  private processTimelog(
    employeeId: string,
    branchId: string,
    companyId: string,
    type: string,
    employeeName: string,
    birthDate?: string
  ) {
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
