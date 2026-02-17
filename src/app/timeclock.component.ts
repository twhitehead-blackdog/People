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
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import * as OTPAuth from 'otpauth';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputOtp } from 'primeng/inputotp';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { catchError, EMPTY, Observable, of } from 'rxjs';
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
import { TimeSyncService } from './services/time-sync.service';
import { getEnv } from './utils/env.utils';
import { APP_VERSION } from './version';
import { PwaService } from './services/pwa.service';

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
  ],
  providers: [ConfirmationService],
  template: `<p-confirmDialog key="confirm1">
      <ng-template #message let-message>
        <div
          class="flex flex-col items-center w-full gap-4 dark:border-surface-700"
        >
          <i [ngClass]="message.icon" class="!text-6xl text-orange-500"></i>
          <p class="text-center w-full" [innerHTML]="message.message"></p>
        </div>
      </ng-template>
    </p-confirmDialog>
    <p-confirmDialog key="confirm2">
      <ng-template #message let-message>
        <div
          class="flex flex-col items-center w-full gap-4 dark:border-surface-700"
        >
          <i [ngClass]="message.icon" class="!text-6xl text-orange-500"></i>
          <p [innerHTML]="message.message"></p>
        </div>
      </ng-template>
    </p-confirmDialog>
    <p-toast />
    <div
      class="flex flex-col items-center justify-center animated-gradient-container"
      [ngClass]="{
        'naz-theme': isNazCompany(),
        'blackdog-theme': isBlackDogCompany(),
        'timeclock-mobile-kiosk': isMobileKiosk()
      }"
      style="width: 100%;"
    >
      @if (!isKioskMode() || isIPValid() || isNazCompany()) {
      <div
        class="flex flex-col items-center justify-center relative z-10 timeclock-content"
        style="width: 100%; padding: 0 0.5rem; gap: 0.5vh;"
      >
        @if (isKioskMode()) {
        <img
          [src]="isNazCompany() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
          class="w-auto object-contain drop-shadow-2xl relative z-10 flex-shrink-0"
          style="max-width: 280px; height: auto; margin-bottom: 2vh;"
        />
        }
        <div class="timeclock-card-wrapper">
        <div class="animated-border-box">
          <div class="animated-border-glow"></div>
        <p-card class="w-full max-w-lg mx-auto timeclock-card relative z-10">
          <ng-template #title>
            <div
              class="flex flex-col gap-[0.5vh] items-center px-2 py-[0.3vh]"
            >
              <div
                class="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-100 text-center w-full break-words"
              >
                Reloj de Marcación
              </div>
              <!-- Clock Display inside card -->
              <div
                class="flex flex-col items-center gap-0.5 sm:gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2 sm:px-3 md:px-5 py-1.5 sm:py-2 md:py-2.5 border shadow-lg clock-display w-full mt-1"
                [ngClass]="
                  isBlackDogCompany()
                    ? 'border-yellow-500/40'
                    : 'border-gray-500/40'
                "
              >
                <div
                  class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-mono font-bold clock-time break-words text-center"
                  [ngClass]="
                    isBlackDogCompany() ? 'text-yellow-400' : 'text-gray-300'
                  "
                >
                  {{ formattedTime() }}
                </div>
                <div
                  class="text-[10px] sm:text-xs md:text-sm text-gray-300 text-center break-words px-1"
                >
                  {{ formattedDate() }}
                </div>
              </div>
            </div>
          </ng-template>
          <ng-template #subtitle>
            <div
              class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[#d2d2d2] text-[10px] sm:text-xs md:text-sm font-semibold text-center px-2 py-1"
            >
              <div class="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                <i
                  [ngClass]="
                    isBlackDogCompany()
                      ? 'pi pi-building text-yellow-400 text-xs sm:text-sm flex-shrink-0'
                      : 'pi pi-building text-gray-400 text-xs sm:text-sm flex-shrink-0'
                  "
                ></i>
                <i
                  [ngClass]="
                    isBlackDogCompany()
                      ? 'pi pi-user text-yellow-400 text-xs sm:text-sm flex-shrink-0'
                      : 'pi pi-user text-gray-400 text-xs sm:text-sm flex-shrink-0'
                  "
                ></i>
              </div>
              <span class="flex-shrink-0"
                >Seleccione la sucursal y empleado</span
              >
            </div>
          </ng-template>
          <form
            [formGroup]="form"
            class="flex flex-col gap-[1vh] sm:gap-[1.2vh] md:gap-[1.5vh] items-center w-full"
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

            <!-- Suggested Type Badge -->
            @if (suggestedType()) {
            <div class="suggested-type-badge"
              [style.background]="'linear-gradient(135deg, ' + suggestedTypeColor() + '22, ' + suggestedTypeColor() + '11)'"
              [style.borderColor]="suggestedTypeColor() + '66'"
            >
              <i [class]="suggestedTypeIcon()" [style.color]="suggestedTypeColor()"></i>
              <span class="suggested-type-label" [style.color]="suggestedTypeColor()">{{ suggestedTypeLabel() }}</span>
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
              [class]="'otp-container otp-filled-' + otpLength()"
            >
              <div class="flex items-center gap-2 mb-1">
                <label class="text-gray-300 font-medium text-[11px] sm:text-xs md:text-sm text-center">
                  Ingrese su PIN
                </label>
                @if (form.get('employee')?.value && !isMobileKiosk() && !showKeypad()) {
                <button type="button" class="numpad-toggle-btn" (click)="showKeypad.set(true)" title="Abrir teclado">
                  <i class="pi pi-th-large"></i>
                </button>
                }
              </div>
              <div class="w-full flex justify-center items-center">
                @if (isMobileKiosk()) {
                <input
                  type="tel"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="6"
                  placeholder="000000"
                  class="mobile-pin-input"
                  [value]="form.get('otp')?.value || ''"
                  (input)="onMobilePinInput($event)"
                  (keydown.enter)="onEnterKey($event)"
                  autocomplete="one-time-code"
                />
                } @else {
                <p-inputOtp
                  #otpInput
                  formControlName="otp"
                  [length]="6"
                  [integerOnly]="true"
                  (keydown.enter)="onEnterKey($event)"
                  (input)="onOtpInput($event)"
                  styleClass="p-inputotp-input"
                />
                }
              </div>
            </div>

            <!-- Submit Button -->
            <div class="w-full flex justify-center items-center px-2">
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
                [size]="'large'"
                rounded
                [styleClass]="'mark-button w-full sm:w-auto'"
                [style]="{
                  background:
                    form.invalid || !form.get('employee')?.value
                      ? 'linear-gradient(135deg, #5d5d5d 0%, #4a4a4a 100%)'
                      : isBlackDogCompany()
                      ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  border: 'none',
                  'box-shadow':
                    form.invalid || !form.get('employee')?.value
                      ? 'none'
                      : isBlackDogCompany()
                      ? '0 4px 15px rgba(251, 191, 36, 0.4)'
                      : '0 4px 15px rgba(107, 114, 128, 0.4)'
                }"
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

        <!-- Floating Draggable Numpad (desktop only) -->
        @if (showKeypad() && !isMobileKiosk()) {
        <div class="numpad-popup"
          [style.transform]="numpadPos() ? 'translate(' + numpadPos()!.x + 'px, ' + numpadPos()!.y + 'px)' : ''"
        >
          <div class="numpad-popup-header"
            (mousedown)="onNumpadDragStart($event)"
            (touchstart)="onNumpadDragStart($event)"
          >
            <span class="numpad-popup-title">
              <i class="pi pi-th-large"></i>
              Teclado
            </span>
            <button type="button" class="numpad-popup-close" (click)="showKeypad.set(false)">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="numpad-pin-preview">
            @for (i of [0,1,2,3,4,5]; track i) {
            <div class="numpad-dot" [class.numpad-dot-filled]="otpLength() > i" [class.numpad-dot-active]="otpLength() === i"></div>
            }
          </div>
          <div class="numpad-grid">
            @for (num of ['1','2','3','4','5','6','7','8','9']; track num) {
            <button type="button" class="numpad-btn" (click)="addNumberToOtp(num)">
              <span class="numpad-btn-num">{{ num }}</span>
              <span class="numpad-btn-ripple"></span>
            </button>
            }
            <button type="button" class="numpad-btn numpad-fn" (click)="clearOtp()">
              <span class="numpad-btn-label">CLR</span>
            </button>
            <button type="button" class="numpad-btn" (click)="addNumberToOtp('0')">
              <span class="numpad-btn-num">0</span>
              <span class="numpad-btn-ripple"></span>
            </button>
            <button type="button" class="numpad-btn numpad-fn numpad-delete" (click)="deleteFromOtp()">
              <i class="pi pi-delete-left"></i>
            </button>
          </div>
        </div>
        }
        </div>
        <div class="version-badge" [ngClass]="{ 'naz-version': isNazCompany(), 'version-badge--pop': easterEggPop() }" (click)="onVersionClick()" title="¡Tócame!">
          v{{ appVersion }}
        </div>
        @if (easterEggBurst()) {
          <div class="easter-egg-burst" [class.easter-egg-burst--visible]="easterEggBurst()">{{ easterEggBurst() }}</div>
        }
      </div>
      } @else {
      <!-- Mensaje de acceso restringido en modo kiosko -->
      <div
        class="flex flex-col gap-3 sm:gap-4 items-center justify-center relative z-10"
        style="width: 100%; padding: 0 0.5rem;"
      >
        <img
          [src]="isNazCompany() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
          class="h-6 sm:h-8 md:h-10 w-auto object-contain drop-shadow-2xl relative z-10 mb-1 sm:mb-2"
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

      <!-- IP Alert Overlay -->
      @if (ipAlertVisible()) {
      <div class="ip-alert-overlay" (click)="dismissIPAlert()">
        <div class="ip-alert-card" (click)="$event.stopPropagation()">
          <div class="ip-alert-icon-wrap">
            <div class="ip-alert-pulse"></div>
            <i class="pi pi-shield ip-alert-icon"></i>
          </div>
          <div class="ip-alert-title">IP No Autorizada</div>
          <div class="ip-alert-desc">
            La dirección IP detectada no coincide con ninguna sucursal registrada. Este incidente ha sido registrado.
          </div>
          @if (currentIP()) {
          <div class="ip-alert-ip">
            <i class="pi pi-globe"></i>
            {{ currentIP() }}
          </div>
          }
          <div class="ip-alert-hint">
            <i class="pi pi-info-circle"></i>
            Contacte a Recursos Humanos si cree que es un error
          </div>
          <button class="ip-alert-btn" (click)="dismissIPAlert()">Entendido</button>
        </div>
      </div>
      }

      <!-- Success Overlay -->
      @if (successOverlay(); as overlay) {
      <div class="success-overlay" (click)="dismissOverlay()">
        <!-- Ambient glow -->
        <div class="success-glow" [class.success-glow-late]="overlay.isLate"></div>
        <div class="success-overlay-card" [class.success-overlay-late]="overlay.isLate">
          <!-- Confetti particles -->
          @if (!overlay.isLate) {
          <div class="confetti-container">
            <div class="confetti c1"></div>
            <div class="confetti c2"></div>
            <div class="confetti c3"></div>
            <div class="confetti c4"></div>
            <div class="confetti c5"></div>
            <div class="confetti c6"></div>
            <div class="confetti c7"></div>
            <div class="confetti c8"></div>
          </div>
          }
          <!-- Animated checkmark with glow ring -->
          <div class="success-icon-container">
            <div class="success-glow-ring" [class.late-glow-ring]="overlay.isLate"></div>
            <div class="success-checkmark" [class.late-checkmark]="overlay.isLate">
              <svg viewBox="0 0 52 52" class="checkmark-svg">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                @if (overlay.isLate) {
                <path class="checkmark-icon" fill="none" d="M18 18 34 34 M34 18 18 34"/>
                } @else {
                <path class="checkmark-icon" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                }
              </svg>
            </div>
          </div>
          <div class="success-name">{{ overlay.name }}</div>
          <div class="success-divider"></div>
          <div class="success-type">{{ overlay.type }}</div>
          <div class="success-time">{{ overlay.time }}</div>
          @if (overlay.isLate && overlay.lateMsg) {
          <div class="success-late-badge">
            <i class="pi pi-clock"></i>
            Tardanza: {{ overlay.lateMsg }}
          </div>
          }
          <!-- Motivational message -->
          <div class="success-motivational">{{ overlay.motivationalMsg }}</div>
          <!-- Countdown progress bar -->
          <div class="success-countdown-bar">
            <div class="success-countdown-fill" [class.success-countdown-late]="overlay.isLate"></div>
          </div>
        </div>
      </div>
      }
    </div>`,
  styles: `
    .animated-gradient-container {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s ease;
      position: relative;
    }

    :host-context(html.dark) .animated-gradient-container {
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 25%, #000000 50%, #0d0d0d 75%, #2a2a2a 100%);
    }

    :host-context(html.light) .animated-gradient-container {
      background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 25%, #fafafa 50%, #ffffff 75%, #f0f0f0 100%);
    }
    
    /* Beautiful custom scrollbar */
    .animated-gradient-container::-webkit-scrollbar {
      width: 10px;
    }
    
    :host-context(html.dark) .animated-gradient-container::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
      margin: 10px 0;
    }

    :host-context(html.light) .animated-gradient-container::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 10px;
      margin: 10px 0;
    }
    
    :host-context(html.dark) .animated-gradient-container::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(107, 114, 128, 0.6) 0%, rgba(107, 114, 128, 0.4) 100%);
      border-radius: 10px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      box-shadow: 0 0 10px rgba(107, 114, 128, 0.3);
      transition: all 0.3s ease;
    }

    :host-context(html.light) .animated-gradient-container::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(107, 114, 128, 0.4) 0%, rgba(107, 114, 128, 0.3) 100%);
      border-radius: 10px;
      border: 2px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 0 10px rgba(107, 114, 128, 0.2);
      transition: all 0.3s ease;
    }
    
    :host-context(html.dark) .animated-gradient-container::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(107, 114, 128, 0.8) 0%, rgba(107, 114, 128, 0.6) 100%);
      box-shadow: 0 0 15px rgba(107, 114, 128, 0.5);
    }

    :host-context(html.light) .animated-gradient-container::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(107, 114, 128, 0.6) 0%, rgba(107, 114, 128, 0.5) 100%);
      box-shadow: 0 0 15px rgba(107, 114, 128, 0.3);
    }
    
    .animated-gradient-container::-webkit-scrollbar-thumb:active {
      background: linear-gradient(180deg, rgba(107, 114, 128, 1) 0%, rgba(107, 114, 128, 0.8) 100%);
    }
    
    /* Firefox scrollbar */
    .animated-gradient-container {
      scrollbar-width: thin;
      scrollbar-color: rgba(107, 114, 128, 0.6) rgba(0, 0, 0, 0.3);
    }
    
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .timeclock-content {
      flex-shrink: 1;
      min-height: 0;
      max-height: 100%;
    }

    /* Versión móvil modo kiosko: táctil pero compacto para no desbordar */
    .timeclock-mobile-kiosk .timeclock-content img {
      max-height: 5vh !important;
    }
    .timeclock-mobile-kiosk .timeclock-content {
      padding: 1vh 0.5rem !important;
      gap: 0.5vh !important;
    }
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-card-body {
      padding: 1vh 0.75rem !important;
    }
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-card-content {
      padding: 0 !important;
    }
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-select,
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-inputotp {
      min-height: 2.5rem;
    }
    .timeclock-mobile-kiosk .mark-button ::ng-deep .p-button {
      min-height: 2.75rem;
      font-size: 1rem;
    }
    
    
    /* ============================================
       ANIMATED GRADIENT BORDER
       ============================================ */
    .animated-border-box {
      position: relative;
      border-radius: 14px;
      padding: 2px;
      overflow: hidden;
      max-height: 100%;
      display: flex;
      flex-direction: column;
    }

    .animated-border-glow {
      position: absolute;
      inset: -50%;
      background: conic-gradient(
        from 0deg,
        transparent 0%,
        rgba(107, 114, 128, 0.7) 8%,
        transparent 16%,
        transparent 50%,
        rgba(107, 114, 128, 0.7) 58%,
        transparent 66%
      );
      animation: borderRotate 6s linear infinite;
      z-index: 0;
    }

    .blackdog-theme .animated-border-glow {
      background: conic-gradient(
        from 0deg,
        transparent 0%,
        rgba(251, 191, 36, 0.9) 8%,
        rgba(251, 191, 36, 0.2) 14%,
        transparent 20%,
        transparent 50%,
        rgba(251, 191, 36, 0.2) 56%,
        rgba(251, 191, 36, 0.9) 62%,
        transparent 68%
      );
    }

    .naz-theme .animated-border-glow {
      background: conic-gradient(
        from 0deg,
        transparent 0%,
        rgba(229, 226, 223, 0.8) 8%,
        rgba(198, 194, 191, 0.2) 14%,
        transparent 20%,
        transparent 50%,
        rgba(198, 194, 191, 0.2) 56%,
        rgba(229, 226, 223, 0.8) 62%,
        transparent 68%
      );
    }

    @keyframes borderRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .timeclock-card {
      border: none !important;
      border-radius: 12px !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
      backdrop-filter: blur(10px);
      background: rgba(38, 38, 38, 0.98) !important;
      animation: cardEntrance 0.25s ease-out;
      position: relative;
      z-index: 1;
      max-height: 100%;
      overflow: hidden;
    }

    .timeclock-card ::ng-deep .p-card {
      max-height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .timeclock-card ::ng-deep .p-card-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
    }

    .timeclock-card ::ng-deep .p-card-body::-webkit-scrollbar {
      display: none;
    }
    
    @media (max-width: 640px) {
      .timeclock-card ::ng-deep .p-card-body {
        padding: 0.75rem !important;
      }
      
      .timeclock-card ::ng-deep .p-card-title {
        padding: 0.5rem 0.75rem !important;
        overflow: visible !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      .timeclock-card ::ng-deep .p-card-subtitle {
        padding: 0.5rem 0.75rem !important;
        overflow: visible !important;
        min-height: auto !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      .timeclock-card ::ng-deep .p-card-title *,
      .timeclock-card ::ng-deep .p-card-subtitle * {
        position: relative !important;
        z-index: 1 !important;
      }
      
      .timeclock-card ::ng-deep .p-card-subtitle .flex {
        flex-wrap: wrap !important;
        justify-content: center !important;
        gap: 0.5rem !important;
      }
      
      .timeclock-card ::ng-deep .p-card-subtitle .flex > div {
        flex-shrink: 0 !important;
      }
      
      .timeclock-card ::ng-deep .p-card-subtitle span {
        display: inline-block !important;
        text-align: center !important;
        line-height: 1.4 !important;
      }
    }
    
    @media (min-width: 641px) and (max-width: 1024px) {
      .timeclock-card ::ng-deep .p-card-body {
        padding: 1.25rem !important;
      }
    }
    
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
      border: 1px solid rgba(107, 114, 128, 0.5) !important;
    }
    
    .clock-time {
      text-shadow: 0 0 10px rgba(107, 114, 128, 0.8);
      animation: clockPulse 2s ease-in-out infinite;
    }
    
    @keyframes clockPulse {
      0%, 100% {
        text-shadow: 0 0 10px rgba(107, 114, 128, 0.8);
      }
      50% {
        text-shadow: 0 0 20px rgba(107, 114, 128, 1), 0 0 30px rgba(107, 114, 128, 0.6);
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
      border: 2px solid rgba(107, 114, 128, 0.5) !important;
    }
    
    .timeclock-card ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(107, 114, 128, 0.8) !important;
      box-shadow: 0 0 10px rgba(107, 114, 128, 0.3) !important;
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
      min-width: 36px !important;
      max-width: 48px !important;
      height: 40px !important;
      font-size: 0.95rem !important;
      border: 2px solid rgba(107, 114, 128, 0.5) !important;
      border-radius: 8px !important;
      background: rgba(31, 41, 55, 0.8) !important;
      color: #9ca3af !important;
      font-weight: bold !important;
      flex: 0 0 auto !important;
    }
    
    .timeclock-card ::ng-deep .p-inputotp-input:focus {
      border-color: rgba(107, 114, 128, 0.9) !important;
      box-shadow: 0 0 15px rgba(107, 114, 128, 0.4) !important;
      outline: none !important;
    }
    
    .timeclock-card ::ng-deep .p-inputotp-input:not(:placeholder-shown) {
      border-color: rgba(107, 114, 128, 0.7) !important;
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
    
    .timeclock-card ::ng-deep .mark-button {
      margin: 0 auto !important;
      display: block !important;
    }
    
    .timeclock-card ::ng-deep .mark-button.w-full {
      width: 100% !important;
    }
    
    .timeclock-card ::ng-deep .mark-button.w-full button {
      width: 100% !important;
    }
    
    .timeclock-card ::ng-deep .mark-button button {
      margin: 0 auto !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      flex-direction: row !important;
      padding: 0.625rem 1.5rem !important;
      font-size: 0.875rem !important;
    }
    
    @media (max-width: 640px) {
      .timeclock-card ::ng-deep .mark-button button {
        padding: 0.5rem 1.25rem !important;
        font-size: 0.8125rem !important;
        min-height: 42px !important;
      }
    }
    
    @media (min-width: 641px) and (max-width: 1024px) {
      .timeclock-card ::ng-deep .mark-button button {
        padding: 0.75rem 1.75rem !important;
        font-size: 0.9rem !important;
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
      box-shadow: 0 6px 25px rgba(107, 114, 128, 0.6) !important;
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

    /* ============================================
       TEMA NAZ - ESTILOS MINIMALISTAS PREMIUM
       ============================================ */
    
    /* Fondo Naz - negro con animación de lava lamp plateada */
    .naz-theme .animated-gradient-container {
      /* Background handled by theme service */
      position: relative;
      overflow: hidden;
    }

    /* Animación de lava lamp plateada para timeclock Naz */
    .naz-theme .animated-gradient-container::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.5) 0%,
          rgba(255, 255, 255, 0.6) 2%,
          rgba(229, 226, 223, 0.65) 4%,
          rgba(198, 194, 191, 0.55) 6%,
          transparent 8%,
          transparent 12%,
          rgba(198, 194, 191, 0.5) 14%,
          rgba(229, 226, 223, 0.6) 16%,
          rgba(255, 255, 255, 0.55) 18%,
          transparent 20%
        ),
        linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.6) 0%,
          rgba(229, 226, 223, 0.7) 25%,
          rgba(198, 194, 191, 0.6) 50%,
          rgba(229, 226, 223, 0.65) 75%,
          rgba(255, 255, 255, 0.55) 100%
        );
      animation: silverLavaFlow 25s ease-in-out infinite;
      z-index: 0;
      filter: blur(25px);
      pointer-events: none;
    }

    .naz-theme .animated-gradient-container::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(
          -45deg,
          rgba(229, 226, 223, 0.55) 0%,
          rgba(255, 255, 255, 0.65) 2%,
          rgba(198, 194, 191, 0.6) 4%,
          rgba(229, 226, 223, 0.5) 6%,
          transparent 8%,
          transparent 12%,
          rgba(255, 255, 255, 0.55) 14%,
          rgba(198, 194, 191, 0.65) 16%,
          rgba(229, 226, 223, 0.6) 18%,
          transparent 20%
        ),
        linear-gradient(
          -135deg,
          rgba(198, 194, 191, 0.7) 0%,
          rgba(229, 226, 223, 0.75) 30%,
          rgba(255, 255, 255, 0.65) 60%,
          rgba(198, 194, 191, 0.6) 100%
        );
      animation: silverLavaFlow 30s ease-in-out infinite reverse;
      z-index: 0;
      filter: blur(30px);
      pointer-events: none;
    }

    @keyframes silverLavaFlow {
      0% {
        transform: translate(-20%, -20%) rotate(0deg) scale(1);
        opacity: 0.9;
      }
      25% {
        transform: translate(10%, 5%) rotate(5deg) scale(1.1);
        opacity: 1;
      }
      50% {
        transform: translate(5%, 15%) rotate(-3deg) scale(0.95);
        opacity: 0.85;
      }
      75% {
        transform: translate(-10%, 8%) rotate(4deg) scale(1.05);
        opacity: 0.95;
      }
      100% {
        transform: translate(-20%, -20%) rotate(0deg) scale(1);
        opacity: 0.9;
      }
    }

    /* ============================================
       TEMA BLACK DOG - ESTILOS AMARILLOS
       ============================================ */
    
    /* Aplicar colores amarillos cuando es Black Dog */
    .blackdog-theme .timeclock-card {
      border: none !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-card-body {
      background: rgba(38, 38, 38, 0.95) !important;
      border-radius: 12px !important;
    }
    
    .blackdog-theme .clock-display {
      border: 1px solid rgba(251, 191, 36, 0.5) !important;
    }
    
    .blackdog-theme .clock-time {
      color: #fbbf24 !important;
      text-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
      animation: clockPulseYellow 2s ease-in-out infinite;
    }
    
    @keyframes clockPulseYellow {
      0%, 100% {
        text-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
      }
      50% {
        text-shadow: 0 0 20px rgba(251, 191, 36, 1), 0 0 30px rgba(251, 191, 36, 0.6);
      }
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-select .p-select-trigger {
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(251, 191, 36, 0.8) !important;
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-inputotp-input {
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
      color: #fbbf24 !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-inputotp-input:focus {
      border-color: rgba(251, 191, 36, 0.9) !important;
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.4) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-inputotp-input:not(:placeholder-shown) {
      border-color: rgba(251, 191, 36, 0.7) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-button:not(:disabled):hover {
      box-shadow: 0 6px 25px rgba(251, 191, 36, 0.6) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .mark-button button {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
      box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .mark-button button:disabled {
      background: linear-gradient(135deg, #5d5d5d 0%, #4a4a4a 100%) !important;
      box-shadow: none !important;
    }
    
    /* Scrollbar amarillo para Black Dog */
    .blackdog-theme .animated-gradient-container::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.6) 0%, rgba(251, 191, 36, 0.4) 100%);
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
    }
    
    .blackdog-theme .animated-gradient-container::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0.6) 100%);
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
    }
    
    .blackdog-theme .animated-gradient-container::-webkit-scrollbar-thumb:active {
      background: linear-gradient(180deg, rgba(251, 191, 36, 1) 0%, rgba(251, 191, 36, 0.8) 100%);
    }
    
    .blackdog-theme .animated-gradient-container {
      scrollbar-color: rgba(251, 191, 36, 0.6) rgba(0, 0, 0, 0.3);
    }
    
    /* Iconos amarillos para Black Dog */
    .blackdog-theme .pi-building,
    .blackdog-theme .pi-user {
      color: #fbbf24 !important;
    }

    /* ============================================
       NUMPAD TOGGLE BUTTON
       ============================================ */
    .numpad-toggle-btn {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(107, 114, 128, 0.4);
      border-radius: 8px;
      background: rgba(39, 39, 42, 0.6);
      color: #71717a;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.7rem;
      -webkit-tap-highlight-color: transparent;
    }

    .numpad-toggle-btn:hover {
      background: rgba(63, 63, 70, 0.9);
      color: #a1a1aa;
      border-color: rgba(107, 114, 128, 0.6);
    }

    .blackdog-theme .numpad-toggle-btn {
      border-color: rgba(251, 191, 36, 0.3);
    }

    .blackdog-theme .numpad-toggle-btn:hover {
      border-color: rgba(251, 191, 36, 0.6);
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.08);
    }

    /* ============================================
       DESKTOP FIT-TO-SCREEN (no scroll)
       ============================================ */
    @media (min-width: 641px) {
      .timeclock-card ::ng-deep .p-card-body {
        padding: 1vh 1rem !important;
      }
      .timeclock-card ::ng-deep .p-card-content {
        padding: 0 !important;
      }
      .timeclock-card ::ng-deep .p-card-title {
        padding: 0.5vh 0.75rem !important;
      }
      .timeclock-card ::ng-deep .p-card-subtitle {
        padding: 0.3vh 0.75rem !important;
      }
    }

    /* Scale down on short desktop viewports */
    @media (max-height: 800px) and (min-width: 641px) {
      .timeclock-content {
        padding: 0.5vh 0.5rem !important;
      }
      .timeclock-content img {
        max-width: 220px !important;
      }
      .clock-display {
        padding: 0.5rem 0.75rem !important;
      }
      .timeclock-card ::ng-deep .p-card-body {
        padding: 0.8vh 0.75rem !important;
      }
    }

    @media (max-height: 650px) and (min-width: 641px) {
      .timeclock-content img {
        max-width: 160px !important;
      }
      .input-container ::ng-deep .p-select .p-select-trigger {
        min-height: 36px !important;
        padding: 0.25rem 0.6rem !important;
      }
      .timeclock-card ::ng-deep .p-inputotp-input {
        height: 34px !important;
        min-width: 30px !important;
      }
      .timeclock-card ::ng-deep .mark-button button {
        padding: 0.4rem 1rem !important;
        min-height: 36px !important;
      }
    }

    /* ============================================
       SUGGESTED TYPE BADGE
       ============================================ */
    .suggested-type-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 12px;
      border: 1px solid;
      width: 100%;
      animation: badgeBounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .suggested-type-badge i {
      font-size: 1.1rem;
    }

    .suggested-type-label {
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    @keyframes badgeBounceIn {
      0% { opacity: 0; transform: translateY(-10px) scale(0.9); }
      60% { opacity: 1; transform: translateY(3px) scale(1.02); }
      100% { transform: translateY(0) scale(1); }
    }

    /* ============================================
       CARD WRAPPER (for numpad positioning)
       ============================================ */
    .timeclock-card-wrapper {
      position: relative;
      width: 100%;
      max-width: 32rem;
      max-height: 96vh;
      max-height: 96dvh;
      margin: 0 auto;
      overflow: hidden;
      flex-shrink: 1;
      min-height: 0;
    }

    /* ============================================
       FLOATING NUMPAD POPUP
       ============================================ */
    .numpad-popup {
      position: fixed;
      top: 50%;
      right: 2rem;
      margin-top: -180px;
      width: 220px;
      background: rgba(24, 24, 27, 0.95);
      backdrop-filter: blur(20px) saturate(1.5);
      border: 1px solid rgba(107, 114, 128, 0.3);
      border-radius: 20px;
      padding: 1rem;
      box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.5),
        0 0 40px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      z-index: 500;
      animation: numpadPopIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      cursor: default;
      user-select: none;
    }

    .blackdog-theme .numpad-popup {
      border-color: rgba(251, 191, 36, 0.25);
      box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.5),
        0 0 30px rgba(251, 191, 36, 0.08),
        inset 0 1px 0 rgba(251, 191, 36, 0.1);
    }

    .numpad-popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      cursor: grab;
    }

    .numpad-popup-header:active {
      cursor: grabbing;
    }

    .numpad-popup-title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.7rem;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .numpad-popup-close {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      color: #71717a;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 0.7rem;
      -webkit-tap-highlight-color: transparent;
    }

    .numpad-popup-close:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #a1a1aa;
    }

    /* PIN preview dots */
    .numpad-pin-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .numpad-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid rgba(107, 114, 128, 0.4);
      background: transparent;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .numpad-dot-filled {
      background: #6b7280;
      border-color: #6b7280;
      transform: scale(1.1);
    }

    .numpad-dot-active {
      border-color: #9ca3af;
      animation: dotPulse 1s ease-in-out infinite;
    }

    .blackdog-theme .numpad-dot-filled {
      background: #fbbf24;
      border-color: #fbbf24;
    }

    .blackdog-theme .numpad-dot-active {
      border-color: #fbbf24;
    }

    @keyframes dotPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    .numpad-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .numpad-btn {
      position: relative;
      min-height: 46px;
      border: 1px solid rgba(107, 114, 128, 0.2);
      border-radius: 12px;
      background: rgba(39, 39, 42, 0.8);
      color: #e5e7eb;
      font-size: 1.15rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.12s ease;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .numpad-btn:hover {
      background: rgba(63, 63, 70, 0.9);
      border-color: rgba(107, 114, 128, 0.4);
    }

    .numpad-btn:active {
      transform: scale(0.9);
      background: rgba(107, 114, 128, 0.3);
    }

    .numpad-btn-num {
      position: relative;
      z-index: 1;
    }

    .numpad-btn-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #71717a;
      position: relative;
      z-index: 1;
    }

    .numpad-fn {
      background: rgba(39, 39, 42, 0.5);
    }

    .numpad-fn:active {
      background: rgba(239, 68, 68, 0.15);
    }

    .numpad-delete i {
      font-size: 1rem;
      color: #a1a1aa;
    }

    /* Ripple effect */
    .numpad-btn-ripple {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, transparent 70%);
      opacity: 0;
      transform: scale(0);
      transition: none;
    }

    .numpad-btn:active .numpad-btn-ripple {
      opacity: 1;
      transform: scale(2.5);
      transition: transform 0.4s ease, opacity 0.4s ease;
    }

    .blackdog-theme .numpad-btn {
      border-color: rgba(251, 191, 36, 0.15);
    }

    .blackdog-theme .numpad-btn:hover {
      border-color: rgba(251, 191, 36, 0.35);
      background: rgba(251, 191, 36, 0.06);
    }

    .blackdog-theme .numpad-btn:active {
      background: rgba(251, 191, 36, 0.15);
      border-color: rgba(251, 191, 36, 0.5);
    }

    .blackdog-theme .numpad-btn:active .numpad-btn-ripple {
      background: radial-gradient(circle at center, rgba(251, 191, 36, 0.2) 0%, transparent 70%);
    }

    @keyframes numpadPopIn {
      0% { opacity: 0; transform: translateX(20px) scale(0.9); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }

    /* ============================================
       OTP FILLED STATES
       ============================================ */
    .otp-filled-1 ::ng-deep .p-inputotp-input:nth-child(1),
    .otp-filled-2 ::ng-deep .p-inputotp-input:nth-child(-n+2),
    .otp-filled-3 ::ng-deep .p-inputotp-input:nth-child(-n+3) {
      border-color: rgba(251, 191, 36, 0.5) !important;
      background: rgba(251, 191, 36, 0.08) !important;
    }

    .otp-filled-4 ::ng-deep .p-inputotp-input:nth-child(-n+4),
    .otp-filled-5 ::ng-deep .p-inputotp-input:nth-child(-n+5) {
      border-color: rgba(251, 191, 36, 0.7) !important;
      background: rgba(251, 191, 36, 0.12) !important;
    }

    .otp-filled-6 ::ng-deep .p-inputotp-input {
      border-color: rgba(34, 197, 94, 0.8) !important;
      background: rgba(34, 197, 94, 0.12) !important;
      animation: otpComplete 0.3s ease;
    }

    @keyframes otpComplete {
      0% { transform: scale(1); }
      50% { transform: scale(1.06); }
      100% { transform: scale(1); }
    }

    /* ============================================
       SUCCESS OVERLAY
       ============================================ */
    .success-overlay {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px) saturate(0.8);
      animation: overlayFadeIn 0.3s ease;
      cursor: pointer;
    }

    .success-glow {
      position: absolute;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: glowPulse 2s ease-in-out infinite;
      pointer-events: none;
    }

    .success-glow-late {
      background: radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, transparent 70%);
    }

    @keyframes glowPulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
      50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
    }

    .success-overlay-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem 2rem 1rem;
      border-radius: 24px;
      background: linear-gradient(145deg, rgba(34, 197, 94, 0.12), rgba(16, 185, 129, 0.05));
      border: 1px solid rgba(34, 197, 94, 0.3);
      box-shadow:
        0 0 80px rgba(34, 197, 94, 0.15),
        0 25px 80px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      animation: cardScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      max-width: 380px;
      width: 90%;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(20px) saturate(1.3);
    }

    .success-overlay-late {
      background: linear-gradient(145deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.05));
      border-color: rgba(251, 191, 36, 0.3);
      box-shadow:
        0 0 80px rgba(251, 191, 36, 0.15),
        0 25px 80px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    /* Glow ring around checkmark */
    .success-icon-container {
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-glow-ring {
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 2px solid rgba(34, 197, 94, 0.3);
      animation: ringExpand 0.8s 0.2s ease-out both, ringGlow 2s 1s ease-in-out infinite;
    }

    .late-glow-ring {
      border-color: rgba(251, 191, 36, 0.3);
    }

    @keyframes ringExpand {
      0% { transform: scale(0.5); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    @keyframes ringGlow {
      0%, 100% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.15); }
      50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.3); }
    }

    .late-glow-ring {
      animation: ringExpand 0.8s 0.2s ease-out both, ringGlowLate 2s 1s ease-in-out infinite;
    }

    @keyframes ringGlowLate {
      0%, 100% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.15); }
      50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.3); }
    }

    .success-checkmark {
      width: 80px;
      height: 80px;
      position: relative;
      z-index: 1;
    }

    .checkmark-svg {
      width: 100%;
      height: 100%;
    }

    .checkmark-circle {
      stroke: #22c55e;
      stroke-width: 2;
      stroke-dasharray: 157;
      stroke-dashoffset: 157;
      animation: drawCircle 0.6s ease forwards;
    }

    .late-checkmark .checkmark-circle {
      stroke: #fbbf24;
    }

    .checkmark-icon {
      stroke: #22c55e;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 50;
      stroke-dashoffset: 50;
      animation: drawCheck 0.4s 0.4s ease forwards;
    }

    .late-checkmark .checkmark-icon {
      stroke: #fbbf24;
    }

    @keyframes drawCircle {
      to { stroke-dashoffset: 0; }
    }

    @keyframes drawCheck {
      to { stroke-dashoffset: 0; }
    }

    .success-name {
      font-size: 1.4rem;
      font-weight: 700;
      color: #f3f4f6;
      text-align: center;
      animation: nameSlideIn 0.5s 0.3s ease both;
      line-height: 1.3;
    }

    .success-divider {
      width: 40px;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.5), transparent);
      border-radius: 1px;
      animation: nameSlideIn 0.5s 0.4s ease both;
    }

    .success-overlay-late .success-divider {
      background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.5), transparent);
    }

    .success-type {
      font-size: 0.8rem;
      font-weight: 700;
      color: #22c55e;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      animation: nameSlideIn 0.5s 0.45s ease both;
    }

    .success-overlay-late .success-type {
      color: #fbbf24;
    }

    .success-time {
      font-size: 2.2rem;
      font-weight: 800;
      font-family: ui-monospace, monospace;
      color: #e5e7eb;
      text-shadow: 0 0 30px rgba(34, 197, 94, 0.3);
      letter-spacing: 0.02em;
      animation: timeAppear 0.6s 0.5s ease both;
    }

    .success-overlay-late .success-time {
      text-shadow: 0 0 30px rgba(251, 191, 36, 0.3);
    }

    @keyframes timeAppear {
      0% { opacity: 0; transform: scale(0.8); }
      60% { opacity: 1; transform: scale(1.03); }
      100% { transform: scale(1); }
    }

    .success-late-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      background: rgba(251, 191, 36, 0.12);
      border: 1px solid rgba(251, 191, 36, 0.4);
      color: #fcd34d;
      font-size: 0.85rem;
      font-weight: 600;
      animation: nameSlideIn 0.5s 0.6s ease both;
    }

    /* Countdown progress bar */
    .success-motivational {
      font-size: 0.85rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.65);
      font-style: italic;
      text-align: center;
      animation: motivationalFadeIn 0.6s 0.7s ease both;
      letter-spacing: 0.01em;
    }

    @keyframes motivationalFadeIn {
      from { opacity: 0; transform: translateY(8px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .success-countdown-bar {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 0 0 24px 24px;
      overflow: hidden;
      margin-top: 0.75rem;
      margin-left: -2rem;
      margin-right: -2rem;
      margin-bottom: -1rem;
      width: calc(100% + 4rem);
    }

    .success-countdown-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #10b981);
      animation: countdownShrink 4s linear forwards;
      border-radius: 0 0 0 24px;
    }

    .success-countdown-late {
      background: linear-gradient(90deg, #fbbf24, #f59e0b);
    }

    @keyframes countdownShrink {
      from { width: 100%; }
      to { width: 0%; }
    }

    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes cardScaleIn {
      0% { opacity: 0; transform: scale(0.7) translateY(30px); }
      70% { opacity: 1; transform: scale(1.02) translateY(-5px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes nameSlideIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Confetti particles */
    .confetti-container {
      position: absolute;
      top: 40%;
      left: 50%;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    .confetti {
      position: absolute;
      border-radius: 2px;
      animation: confettiBurst 1.2s ease-out forwards;
      opacity: 0;
    }

    .c1 { width: 8px; height: 8px; background: #22c55e; animation-delay: 0.1s; --tx: -70px; --ty: -90px; --rot: 120deg; }
    .c2 { width: 6px; height: 10px; background: #fbbf24; animation-delay: 0.15s; --tx: 80px; --ty: -70px; --rot: -60deg; }
    .c3 { width: 10px; height: 6px; background: #3b82f6; animation-delay: 0.2s; --tx: -50px; --ty: 80px; --rot: 200deg; }
    .c4 { width: 7px; height: 7px; background: #ef4444; animation-delay: 0.25s; --tx: 60px; --ty: 90px; --rot: -150deg; }
    .c5 { width: 5px; height: 9px; background: #a855f7; animation-delay: 0.3s; --tx: -90px; --ty: 25px; --rot: 80deg; }
    .c6 { width: 9px; height: 5px; background: #06b6d4; animation-delay: 0.35s; --tx: 90px; --ty: -25px; --rot: -90deg; }
    .c7 { width: 6px; height: 6px; background: #f472b6; animation-delay: 0.4s; --tx: -30px; --ty: -100px; --rot: 45deg; }
    .c8 { width: 8px; height: 5px; background: #34d399; animation-delay: 0.45s; --tx: 40px; --ty: 100px; --rot: -200deg; }

    @keyframes confettiBurst {
      0% { opacity: 1; transform: translate(0, 0) scale(0) rotate(0deg); }
      40% { opacity: 1; transform: translate(var(--tx), var(--ty)) scale(1.3) rotate(var(--rot)); }
      100% { opacity: 0; transform: translate(calc(var(--tx) * 1.8), calc(var(--ty) * 1.8 + 40px)) scale(0.3) rotate(calc(var(--rot) * 2)); }
    }

    /* ============================================
       VERSION BADGE (same as login)
       ============================================ */
    .version-badge {
      position: fixed;
      bottom: 0.75rem;
      right: 0.75rem;
      padding: 0.375rem 0.75rem;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      z-index: 1000;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: transform 0.2s ease, box-shadow 0.3s ease, background 0.45s ease, border-color 0.45s ease, color 0.45s ease;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      letter-spacing: 0.02em;
      background: linear-gradient(135deg, rgba(40, 40, 45, 0.9) 0%, rgba(25, 25, 30, 0.95) 100%);
      border: 1px solid rgba(180, 180, 200, 0.25);
      color: rgba(230, 230, 240, 0.95);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(120, 140, 200, 0.08);
      animation: versionTapMe 2.5s ease-in-out infinite, versionGlow 4s ease-in-out infinite;
    }

    .version-badge:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, rgba(50, 50, 58, 0.95) 0%, rgba(35, 35, 42, 0.98) 100%);
      color: #fff;
      border-color: rgba(180, 200, 255, 0.35);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 28px rgba(120, 160, 255, 0.12);
      animation: none;
    }

    .version-badge:active {
      transform: scale(0.98);
      animation: none;
    }

    .version-badge--pop {
      transform: scale(1.12);
      box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.25), 0 0 40px rgba(120, 180, 255, 0.3);
    }

    .naz-version {
      background: rgba(13, 13, 13, 0.85) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #C6C2BF !important;
    }

    .naz-version:hover {
      background: rgba(13, 13, 13, 0.95) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
      color: #FFFFFF !important;
    }

    .easter-egg-burst {
      position: fixed;
      bottom: 3rem;
      right: 1.5rem;
      font-size: 4rem;
      line-height: 1;
      z-index: 1001;
      pointer-events: none;
      opacity: 0;
      transform: scale(0.3) translateY(0);
      animation: easterEggBurst 1.2s ease-out forwards;
    }

    .easter-egg-burst--visible {
      opacity: 1;
    }

    @keyframes easterEggBurst {
      0% { opacity: 0; transform: scale(0.3) translateY(0); filter: blur(0); }
      15% { opacity: 1; transform: scale(1.4) translateY(-0.5rem); filter: blur(0); }
      30% { transform: scale(1.2) translateY(-1.5rem); }
      100% { opacity: 0; transform: scale(1.5) translateY(-4rem); filter: blur(2px); }
    }

    @keyframes versionGlow {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.15); }
    }

    @keyframes versionTapMe {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(120, 140, 200, 0.08);
      }
      50% {
        transform: scale(1.03);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), 0 0 32px rgba(120, 160, 255, 0.14);
      }
    }

    @media (max-width: 767px) {
      .version-badge {
        bottom: 0.5rem;
        right: 0.5rem;
        font-size: 0.6875rem;
        padding: 0.25rem 0.5rem;
      }
    }

    /* ============================================
       IP ALERT OVERLAY
       ============================================ */
    .ip-alert-overlay {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(12px);
      animation: overlayFadeIn 0.3s ease;
    }

    .ip-alert-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem 2rem 1.5rem;
      border-radius: 24px;
      background: linear-gradient(145deg, rgba(239, 68, 68, 0.1), rgba(127, 29, 29, 0.05));
      border: 1px solid rgba(239, 68, 68, 0.3);
      box-shadow: 0 0 80px rgba(239, 68, 68, 0.1), 0 25px 80px rgba(0, 0, 0, 0.5);
      max-width: 380px;
      width: 90%;
      animation: cardScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      backdrop-filter: blur(20px);
    }

    .ip-alert-icon-wrap {
      position: relative;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ip-alert-pulse {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 2px solid rgba(239, 68, 68, 0.3);
      animation: ringExpand 0.8s 0.2s ease-out both, ipPulse 2s 1s ease-in-out infinite;
    }

    @keyframes ipPulse {
      0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.15); }
      50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.35); }
    }

    .ip-alert-icon {
      font-size: 2.5rem;
      color: #ef4444;
      filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.4));
    }

    .ip-alert-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: #fca5a5;
      text-align: center;
      animation: nameSlideIn 0.5s 0.3s ease both;
    }

    .ip-alert-desc {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
      text-align: center;
      line-height: 1.5;
      animation: nameSlideIn 0.5s 0.4s ease both;
    }

    .ip-alert-ip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #f87171;
      font-family: ui-monospace, monospace;
      font-size: 0.9rem;
      font-weight: 600;
      animation: nameSlideIn 0.5s 0.5s ease both;
    }

    .ip-alert-hint {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.4);
      animation: nameSlideIn 0.5s 0.6s ease both;
    }

    .ip-alert-btn {
      margin-top: 0.25rem;
      padding: 0.6rem 2rem;
      border-radius: 12px;
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.12);
      color: #fca5a5;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      animation: nameSlideIn 0.5s 0.7s ease both;
      -webkit-tap-highlight-color: transparent;
    }

    .ip-alert-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.6);
    }

    /* ============================================
       IMPROVED CARD ENTRANCE ANIMATION
       ============================================ */
    @keyframes cardEntrance {
      0% {
        opacity: 0;
        transform: scale(0.95) translateY(15px);
      }
      60% {
        opacity: 1;
        transform: scale(1.01) translateY(-3px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* Mobile: prevent native keyboard from appearing on OTP inputs */

    /* ============================================
       MOBILE PIN INPUT (replaces p-inputOtp on mobile)
       ============================================ */
    .mobile-pin-input {
      width: 100%;
      max-width: 240px;
      text-align: center;
      font-size: 1.75rem;
      font-weight: 700;
      font-family: ui-monospace, monospace;
      letter-spacing: 0.5rem;
      padding: 0.6rem 1rem;
      border-radius: 12px;
      border: 2px solid rgba(107, 114, 128, 0.5);
      background: rgba(31, 41, 55, 0.8);
      color: #e5e7eb;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      -webkit-appearance: none;
    }

    .mobile-pin-input::placeholder {
      color: rgba(107, 114, 128, 0.3);
      letter-spacing: 0.4rem;
    }

    .mobile-pin-input:focus {
      border-color: rgba(107, 114, 128, 0.9);
      box-shadow: 0 0 15px rgba(107, 114, 128, 0.3);
    }

    .blackdog-theme .mobile-pin-input {
      border-color: rgba(251, 191, 36, 0.5);
      color: #fbbf24;
    }

    .blackdog-theme .mobile-pin-input:focus {
      border-color: rgba(251, 191, 36, 0.9);
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
    }

    /* ============================================
       PIN INPUT PULSE ON ACTIVE
       ============================================ */
    .timeclock-card ::ng-deep .p-inputotp-input:focus {
      animation: pinPulse 1.5s ease-in-out infinite;
    }

    @keyframes pinPulse {
      0%, 100% { box-shadow: 0 0 10px rgba(107, 114, 128, 0.3); }
      50% { box-shadow: 0 0 20px rgba(107, 114, 128, 0.6), 0 0 30px rgba(107, 114, 128, 0.2); }
    }

    .blackdog-theme .timeclock-card ::ng-deep .p-inputotp-input:focus {
      animation: pinPulseYellow 1.5s ease-in-out infinite;
    }

    @keyframes pinPulseYellow {
      0%, 100% { box-shadow: 0 0 10px rgba(251, 191, 36, 0.3); }
      50% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 30px rgba(251, 191, 36, 0.2); }
    }

    /* ============================================
       FLOATING PARTICLES (background ambient)
       ============================================ */
    .blackdog-theme .timeclock-content::before,
    .blackdog-theme .timeclock-content::after {
      content: '';
      position: fixed;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: rgba(251, 191, 36, 0.3);
      pointer-events: none;
      z-index: 0;
    }

    .blackdog-theme .timeclock-content::before {
      top: 20%;
      left: 15%;
      animation: floatParticle 8s ease-in-out infinite;
    }

    .blackdog-theme .timeclock-content::after {
      bottom: 25%;
      right: 20%;
      animation: floatParticle 10s ease-in-out infinite reverse;
    }

    @keyframes floatParticle {
      0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
      25% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
      50% { transform: translateY(-10px) translateX(-15px); opacity: 0.4; }
      75% { transform: translateY(-25px) translateX(5px); opacity: 0.5; }
    }

    /* ============================================
       COMPACT MOBILE CLOCK
       ============================================ */
    @media (max-width: 480px) {
      .clock-display {
        padding: 0.5rem 0.75rem !important;
      }

      .clock-display .clock-time {
        font-size: 1.25rem !important;
      }

      .clock-display .text-\\[10px\\] {
        font-size: 0.6rem !important;
      }
    }

    .timeclock-mobile-kiosk .clock-display {
      flex-direction: column !important;
      gap: 0.25rem !important;
      padding: 0.5rem 1rem !important;
    }

    .timeclock-mobile-kiosk .clock-display .clock-time {
      font-size: 1.5rem !important;
    }

    /* ============================================
       BUTTON HOVER LIFT ANIMATION
       ============================================ */
    .timeclock-card ::ng-deep .p-button:not(:disabled) {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .timeclock-card ::ng-deep .p-button:not(:disabled):hover {
      transform: translateY(-3px);
    }

    .timeclock-card ::ng-deep .p-button:not(:disabled):active {
      transform: translateY(-1px) scale(0.98);
    }

    /* ============================================
       SELECT DROPDOWN ANIMATION
       ============================================ */
    .timeclock-card ::ng-deep .p-select-overlay {
      animation: dropdownFadeIn 0.2s ease !important;
    }

    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ============================================
       SUGGESTED TYPE BADGE GLOW
       ============================================ */
    .suggested-type-badge {
      position: relative;
      overflow: hidden;
    }

    .suggested-type-badge::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 120%;
      height: 120%;
      transform: translate(-50%, -50%);
      background: radial-gradient(ellipse at center, currentColor, transparent 70%);
      opacity: 0.04;
      pointer-events: none;
    }

    /* ============================================
       PREFERS REDUCED MOTION
       ============================================ */
    @media (prefers-reduced-motion: reduce) {
      .suggested-type-badge,
      .numpad-popup,
      .success-overlay,
      .success-overlay-card,
      .success-checkmark,
      .success-name,
      .confetti,
      .numpad-btn,
      .timeclock-card ::ng-deep .p-inputotp-input {
        animation: none !important;
      }
      .checkmark-circle,
      .checkmark-icon {
        stroke-dashoffset: 0 !important;
        animation: none !important;
      }
    }

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
  private pwaService = inject(PwaService);
  private readonly DISPLAY_TIMEZONE = 'America/Panama';
  /** Empleado con sonido personalizado al marcar exitosamente */
  private readonly EMPLOYEE_PERSONALIZED_SOUND_ID = '202c46ab-04f9-41e8-a572-d9f50f7f31b6';
  /** Sonidos personalizados para empleado específico (squirrel/cockatoo al azar) */
  private readonly PERSONALIZED_SUCCESS_SOUNDS = ['/sounds/squirrel.mp3', '/sounds/cockatoo.mp3'];
  /** Sonidos para empleados en general (meow/bark al azar) */
  private readonly GENERAL_SUCCESS_SOUNDS = ['/sounds/meow.mp3', '/sounds/bark.mp3'];
  // Get IP address - try multiple methods to get real IP even from localhost
  public currentIP = signal<string>('127.0.0.1');
  public isProcessing = signal<boolean>(false);
  public showKeypad = signal<boolean>(false);
  public currentTime = signal<Date>(new Date());
  public availableTypes = signal<Array<{ value: string; label: string }>>([]);
  public isKioskMode = signal<boolean>(false);
  public isMobileKiosk = signal<boolean>(false);
  public isIPValid = signal<boolean>(true);
  public readonly appVersion = APP_VERSION;
  easterEggBurst = signal<string | null>(null);
  easterEggPop = signal(false);
  private versionSoundIndex = 0;
  private readonly VERSION_SOUNDS = ['/sounds/bark.mp3', '/sounds/meow.mp3', '/sounds/squirrel.mp3', '/sounds/cockatoo.mp3'];
  private readonly VERSION_EMOJIS = ['🐕', '🐱', '🐿️', '🦜'];

  public suggestedType = signal<string>('');
  public otpLength = signal<number>(0);
  public successOverlay = signal<{
    name: string;
    type: string;
    time: string;
    isLate: boolean;
    lateMsg: string;
    motivationalMsg: string;
  } | null>(null);

  private readonly motivationalMessages = [
    // Motivacionales
    '¡Gran día por delante!',
    '¡Tú puedes con todo!',
    '¡A dar lo mejor hoy!',
    '¡Éxito en tu jornada!',
    '¡Hoy será un gran día!',
    '¡Arriba ese ánimo!',
    '¡Tu esfuerzo vale oro!',
    '¡Vamos con todo!',
    '¡Cada día cuenta!',
    '¡Eres parte esencial!',
    '¡A brillar hoy!',
    '¡Tu actitud inspira!',
    '¡Haz que hoy valga!',
    '¡Energía al máximo!',
    '¡Tú marcas la diferencia!',
    '¡Excelente trabajo!',
    '¡Sigue así, campeón!',
    '¡Hoy rompes récords!',
    '¡La constancia es clave!',
    '¡Ánimo, crack!',
    '¡Siempre adelante!',
    '¡Tu dedicación brilla!',
    '¡A conquistar el día!',
    '¡Imparable!',
    '¡Lo estás logrando!',
    '¡Eres increíble!',
    '¡Hoy será épico!',
    '¡Dale con ganas!',
    '¡Nada te detiene!',
    '¡Orgullosos de ti!',
    '¡Paso a paso, se llega!',
    '¡Tu equipo te necesita!',
    '¡A romperla hoy!',
    '¡Eres un ejemplo!',
    '¡Hoy es tu día!',
    '¡Fuerza y ánimo!',
    '¡Juntos somos más!',
    '¡Gracias por estar!',
    '¡Tu presencia cuenta!',
    '¡A crear historia!',
    '¡Sonríe y avanza!',
    '¡Haz lo que amas!',
    '¡La meta está cerca!',
    '¡Confía en ti!',
    '¡Actitud positiva!',
    '¡Tu talento importa!',
    '¡Hoy es oportunidad!',
    '¡Sé la diferencia!',
    '¡Siempre mejorando!',
    '¡Vamos, equipo!',
    '¡Hoy brillas más!',
    '¡Tu trabajo inspira!',
    '¡A ganar el día!',
    '¡Eres fundamental!',
    '¡No hay límites!',
    '¡Pura buena vibra!',
    '¡Haz magia hoy!',
    '¡El éxito te espera!',
    '¡A por todas!',
    '¡Buen trabajo, crack!',
    '¡Eres de los buenos!',
    '¡Tu energía contagia!',
    '¡Hoy se logra todo!',
    '¡Guerrero/a del día!',
    '¡El equipo gana contigo!',
    '¡Nadie para tu flow!',
    '¡A dejar huella!',
    '¡Sangre de campeón!',
    '¡Tu familia está orgullosa!',
    '¡Naciste para brillar!',
    // Mascotas y peluditos
    '¡Tu mascota te espera en casa!',
    '¡Trabaja duro, tu perro confía en ti!',
    '¡Hoy ganas croquetas extra!',
    '¡Tu gato aprueba tu puntualidad!',
    '¡Los peluditos dicen: buen humano!',
    '¡Marca y vuelve con tu lomito!',
    '¡Tu mascota manda saludos!',
    '¡Eres el héroe de tu mascota!',
    '¡Guau! ¡Llegaste a tiempo!',
    '¡Miau! Buen trabajo, humano.',
    '¡Black Dog aprueba tu marcación!',
    '¡Los perritos te aplauden!',
    '¡Tu mascota estaría orgullosa!',
    '¡Patas arriba por tu esfuerzo!',
    '¡El mejor amigo del hombre... y del trabajo!',
    '¡A chambear como retriever!',
    '¡Firme como pastor alemán!',
    '¡Ágil como un border collie!',
    '¡Leal como un golden!',
    // Panamá y frases panameñas
    '¡Vamo\' arriba, Panamá!',
    '¡Con la garra canalera!',
    '¡Panameño/a de corazón!',
    '¡Échale salsita al día!',
    '¡Pa\' lante como el Canal!',
    '¡Qué xopa! A trabajar se dijo.',
    '¡Tranque mental: cero. Productividad: mil!',
    '¡Más pila que el Casco Viejo!',
    '¡Con sabor a Panamá!',
    '¡Dale que tú eres de Panamá!',
    '¡Pura cepa istmeña!',
    '¡Arroz con pollo y actitud!',
    '¡Panamá la bella te respalda!',
    '¡Con flow canalero!',
    '¡Ñapa de energía para ti!',
    '¡Más cool que la brisa del Causeway!',
    '¡Firme como la Cinta Costera!',
    '¡Rendimiento nivel Mariano Rivera!',
    '¡Puntualidad nivel Roberto Durán!',
    '¡Con la fuerza de Manos de Piedra!',
    '¡Precisión nivel Rod Carew!',
    '¡Corre como Irving Saladino!',
    '¡Constancia nivel Rommel Fernández!',
    '¡Talento panameño de exportación!',
    '¡Campeón/a como Durán: 5 rounds más!',
    // Jocosos
    '¡El café ya está listo!',
    '¡Hoy no, procrastinación!',
    '¡Modo bestia: activado!',
    '¡Hoy es solo un día más!',
    '¡Ya falta menos para el fin de semana!',
    '¡El WiFi del éxito te conectó!',
    '¡Plot twist: hoy es tu mejor día!',
    '¡Error 404: excusas no encontradas!',
    '¡Cargando productividad... 100%!',
    '¡Ctrl+S de tu esfuerzo!',
    '¡Update completado: tú eres la versión mejorada!',
    '¡Tu jefe secreto eres tú mismo!',
    '¡Spoiler: hoy te va increíble!',
    '¡La suerte es para los madrugadores!',
    '¡Más puntual que reloj suizo!',
    // Quincena y dinero
    '¡Ya huele a quincena!',
    '¡Falta menos para el payday!',
    '¡Cada marcación te acerca al sueldo!',
    '¡La quincena no se gana sola!',
    '¡Hoy se trabaja, mañana se goza!',
    '¡Tu cuenta bancaria te lo agradecerá!',
    '¡Dólar a dólar, se arma el rancho!',
    '¡Pin marcado = plata asegurada!',
    '¡El sobre viene en camino!',
    '¡Trabajando por esos Balboa!',
    '¡La nómina te sonríe!',
    '¡Tu billetera dice: gracias!',
    '¡Otro día, otro dólar... bueno, varios!',
    '¡Sudor = depósito directo!',
    '¡Más cerca del weekend con cash!',
    // Comida panameña y antojos
    '¡Hoy te mereces un patacón doble!',
    '¡A ganarse el ceviche del almuerzo!',
    '¡Trabajando por la carimañola!',
    '¡Huele a empanada de queso!',
    '¡Hoy la sopa de pollo la pagas tú!',
    '¡Arroz con pollo pa\' celebrar!',
    '¡Un raspao\' después del turno!',
    '¡Productividad nivel: tres leches!',
    '¡A ganarse el almuerzo ejecutivo!',
    '¡Te mereces un chicheme bien frío!',
    // Más humor de oficina
    '¡El aire acondicionado te extrañaba!',
    '¡La silla de la oficina: "¡por fin!"!',
    '¡Tu escritorio dijo: bienvenido/a!',
    '¡Otro día sin quedarse dormido!',
    '¡Achievement unlocked: llegué temprano!',
    '¡Nivel de responsabilidad: legendario!',
    '¡La alarma funcionó esta vez!',
    '¡Ni el tranque te detuvo!',
    '¡El MetroBus sí cumplió hoy!',
    '¡Ganándole la carrera al tráfico!',
    '¡Llegaste antes que el café se enfriara!',
    '¡Tu almohada: "traidor/a..."!',
    '¡Las ojeras son de campeón!',
    '¡Más temprano que el sol!',
    '¡Ni la lluvia panameña te para!',
    // Más Panamá
    '¡Más fuerte que el Puente de las Américas!',
    '¡Con energía de Carnavales!',
    '¡Bailando tamborito con la vida!',
    '¡Panamá no para y tú tampoco!',
    '¡Del Darién a Bocas, nadie te frena!',
    '¡Más caliente que Chitré en verano!',
    '¡Flow de Calle Uruguay!',
    '¡Resistencia nivel: subir Ancón a pie!',
    '¡Elegancia nivel: Casco Antiguo!',
    '¡Velocidad nivel: línea 2 del Metro!',
    // Más mascotas
    '¡Tu perro ya armó el desastre en casa!',
    '¡Tu gato ni se enteró que saliste!',
    '¡Los peluditos en casa: "¿trae croquetas?"!',
    '¡Mientras tú trabajas, tu perro duerme rico!',
    '¡Tu mascota cuenta las horas para verte!',
    '¡Trabajas para que tu mascota viva como rey!',
    '¡Tu perro: el verdadero jefe de la casa!',
    '¡El gato ya se adueñó de tu silla!',
    // Motivación extra
    '¡Tus hijos/familia están orgullosos!',
    '¡Hoy se construye el futuro!',
    '¡Cada día eres mejor versión!',
    '¡Los sueños se trabajan, no se sueñan!',
    '¡Disciplina mata talento!',
    '¡El éxito es un hábito, no un accidente!',
    '¡Pequeños pasos, grandes logros!',
    '¡La excelencia no es un acto, es un hábito!',
    '¡Haz hoy lo que otros no harán!',
    '¡Mañana agradecerás el esfuerzo de hoy!',
  ];

  /** Mensajes específicos por día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado) */
  private readonly dayMessages: Record<number, string[]> = {
    0: [ // Domingo
      '¡Domingo y aquí firme, qué héroe!',
      '¡Trabajar en domingo = guerrero/a de verdad!',
      '¡Domingo: día de descanso... pero no para ti, crack!',
      '¡Hoy hasta Dios descansó, pero tú no!',
      '¡Domingo productivo = semana ganada!',
    ],
    1: [ // Lunes
      '¡Lunes: el jefe final del videojuego!',
      '¡Lunes y con toda la actitud!',
      '¡Nuevo lunes, nuevas oportunidades!',
      '¡Lunes: modo guerrero activado!',
      '¡Si sobrevives al lunes, lo demás es fácil!',
      '¡Tu almohada lloró, pero el lunes no te gana!',
      '¡Lunes: el enemigo es fuerte pero tú más!',
    ],
    2: [ // Martes
      '¡Martes: ya pasó lo peor!',
      '¡Martes con energía recargada!',
      '¡Martes: el lunes ya quedó atrás!',
      '¡Martes y la semana agarra impulso!',
      '¡Martes: hoy se mantiene el ritmo!',
    ],
    3: [ // Miércoles
      '¡Miércoles: mitad de camino, crack!',
      '¡Miércoles: la cuesta ya va de bajada!',
      '¡Mitad de semana y con todo!',
      '¡Miércoles: ya se ve la luz del viernes!',
      '¡Miércoles = ecuador de la semana!',
    ],
    4: [ // Jueves
      '¡Jueves: ya huele a viernes!',
      '¡Jueves: un día más y llegamos!',
      '¡Jueves: el pre-viernes!',
      '¡Jueves: mañana es viernes, aguanta!',
      '¡Jueves con sabor a casi fin de semana!',
    ],
    5: [ // Viernes
      '¡Viernes: modo fiesta en 3, 2, 1...!',
      '¡VIERNES: hoy se celebra!',
      '¡Viernes: último round y a disfrutar!',
      '¡Viernes: ya casi saboreas el weekend!',
      '¡Viernes: hoy hasta el trabajo sabe mejor!',
      '¡Viernes: la semana es tuya!',
      '¡Viernes de victoria!',
    ],
    6: [ // Sábado
      '¡Sábado trabajando = doble respeto!',
      '¡Sábado y aquí dando la cara!',
      '¡Sábado: los guerreros no descansan!',
      '¡Sábado: Flow de Calle Uruguay después!',
      '¡Sábado: hoy se trabaja, mañana se descansa!',
    ],
  };

  /** Obtiene un mensaje motivacional aleatorio, incluyendo mensajes del día actual */
  private getRandomMotivationalMessage(): string {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
    const todayMessages = this.dayMessages[dayOfWeek] || [];

    // 30% de probabilidad de mostrar un mensaje del día
    if (todayMessages.length > 0 && Math.random() < 0.3) {
      return todayMessages[Math.floor(Math.random() * todayMessages.length)];
    }

    // 70% mensaje general
    return this.motivationalMessages[
      Math.floor(Math.random() * this.motivationalMessages.length)
    ];
  }

  public numpadPos = signal<{ x: number; y: number } | null>(null);
  private numpadDragging = false;
  private numpadDragStart = { x: 0, y: 0, posX: 0, posY: 0 };
  private inactivityTimer: any;
  private readonly INACTIVITY_TIMEOUT = 60_000;
  private inactivityHandler = () => this.resetInactivityTimer();

  public suggestedTypeLabel = computed(() => {
    const map: Record<string, string> = {
      entry: 'Entrada',
      lunch_start: 'Inicio Almuerzo',
      lunch_end: 'Fin Almuerzo',
      exit: 'Salida',
    };
    return map[this.suggestedType()] || '';
  });

  public suggestedTypeIcon = computed(() => {
    const map: Record<string, string> = {
      entry: 'pi pi-sign-in',
      lunch_start: 'pi pi-clock',
      lunch_end: 'pi pi-clock',
      exit: 'pi pi-sign-out',
    };
    return map[this.suggestedType()] || '';
  });

  public suggestedTypeColor = computed(() => {
    const map: Record<string, string> = {
      entry: '#22c55e',
      lunch_start: '#f97316',
      lunch_end: '#3b82f6',
      exit: '#ef4444',
    };
    return map[this.suggestedType()] || '#6b7280';
  });
  // Usar el servicio de organización como fuente principal
  public isNazCompany = computed(() => {
    const ready = this.organizationService.companyIdsReady();
    if (ready) return this.organizationService.isNaz();
    return this.organizationService.currentOrganization === 'naz';
  });
  public isBlackDogCompany = computed(() => {
    const ready = this.organizationService.companyIdsReady();
    if (ready) return this.organizationService.isBlackDog();
    return this.organizationService.currentOrganization === 'blackdog';
  });
  // Ya no hay tablas naz_*, todo es por company_id
  private employeesTable = computed(() => 'employees');

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
    const isMobileDevice = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 0 && window.innerWidth < 900);
    this.isMobileKiosk.set(
      this.router.url.includes('/timeclock-kiosk-mobile') || isMobileDevice
    );

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

    // Setup inactivity timer for kiosk mode
    if (isKioskRoute) {
      document.addEventListener('touchstart', this.inactivityHandler, { passive: true });
      document.addEventListener('click', this.inactivityHandler);
      document.addEventListener('keydown', this.inactivityHandler);
      this.resetInactivityTimer();
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

    // (mobile keyboard handled natively by PrimeNG InputOtp)

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
    // Detener monitoreo de IP si está activo
    if (this.isKioskMode()) {
      this.ipMonitor.stopMonitoring();
    }
    // Clean up inactivity timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    document.removeEventListener('touchstart', this.inactivityHandler);
    document.removeEventListener('click', this.inactivityHandler);
    document.removeEventListener('keydown', this.inactivityHandler);
  }

  // Detect IP address using multiple methods
  private detectIP() {
    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem('timeclock_ip');
      if (cached && cached !== '127.0.0.1' && cached !== '::1') {
        this.currentIP.set(cached);
        return;
      }
    } catch { /* sessionStorage may not be available */ }

    // Method 1: Try WebRTC (works even from localhost)
    const setIP = (ip: string) => {
      this.currentIP.set(ip);
      try { sessionStorage.setItem('timeclock_ip', ip); } catch { /* noop */ }
    };

    this.getIPViaWebRTC()
      .then((ip) => {
        if (ip && ip !== '127.0.0.1' && ip !== '::1') {
          setIP(ip);
          return;
        }

        // Method 2: Try ipify.org (may have CORS issues in dev)
        this.getIPViaHttp()
          .then((ip) => {
            if (ip && ip !== '127.0.0.1') {
              setIP(ip);
            }
          })
          .catch(() => {
            // Method 3: Try alternative service
            this.getIPViaAlternative()
              .then((ip) => {
                if (ip && ip !== '127.0.0.1') {
                  setIP(ip);
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
              setIP(ip);
            }
          })
          .catch(() => {
            this.getIPViaAlternative()
              .then((ip) => {
                if (ip && ip !== '127.0.0.1') {
                  setIP(ip);
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
      const newVal = currentOtp + num;
      this.form.get('otp')?.setValue(newVal);
      this.otpLength.set(newVal.length);
    }
  }

  // Delete last number from OTP
  deleteFromOtp() {
    const currentOtp = this.form.get('otp')?.value || '';
    if (currentOtp.length > 0) {
      const newVal = currentOtp.slice(0, -1);
      this.form.get('otp')?.setValue(newVal);
      this.otpLength.set(newVal.length);
    }
  }

  // Clear OTP
  clearOtp() {
    this.form.get('otp')?.setValue('');
    this.otpLength.set(0);
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
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const date = toZonedTime(this.currentTime(), this.DISPLAY_TIMEZONE);
    return `${days[date.getDay()]}, ${date.getDate()} de ${
      months[date.getMonth()]
    } de ${date.getFullYear()}`;
  });

  // Get IP - always returns a valid IP (localhost in dev)
  public getIP = computed(() => {
    return this.currentIP() || '127.0.0.1';
  });

  public validIP = computed(() => {
    // Naz no tiene validación de IP
    if (this.isNazCompany()) return true;

    const ip = this.getIP();
    // If IP is localhost (dev fallback), always allow
    if (ip === '127.0.0.1') return true;
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
      select: 'id,first_name,father_name,code_uri',
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

  // Calculate if entry is late
  private calculateDelay(
    entryTime: Date,
    schedule: Schedule | NazSchedule | undefined
  ): number | null {
    if (!schedule || !schedule.entry_time || schedule.day_off) {
      return null;
    }

    const entryTimeStr = format(entryTime, 'HH:mm:ss');
    const scheduleTimeStr =
      typeof schedule.entry_time === 'string'
        ? schedule.entry_time
        : format(new Date(schedule.entry_time), 'HH:mm:ss');

    const entryParts = entryTimeStr.split(':');
    const scheduleParts = scheduleTimeStr.split(':');

    const entryDate = new Date();
    entryDate.setHours(+entryParts[0], +entryParts[1], +entryParts[2] || 0, 0);

    const scheduleDate = new Date();
    scheduleDate.setHours(
      +scheduleParts[0],
      +scheduleParts[1],
      +scheduleParts[2] || 0,
      0
    );

    const delay = differenceInMinutes(entryDate, scheduleDate);

    if (delay > (schedule.minutes_tolerance || 0)) {
      return delay;
    }

    return null;
  }

  // Format minutes to hours and minutes
  private formatTimeDifference(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return `${hours} ${hours === 1 ? 'hora' : 'horas'} y ${remainingMinutes} ${
      remainingMinutes === 1 ? 'minuto' : 'minutos'
    }`;
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

  // Calculate if lunch end exceeds 60 minutes based on actual lunch duration only
  // No longer compares with scheduled time - only validates duration
  private calculateLunchEndDifference(
    lunchEndTime: Date,
    lunchStartTime: Date | null,
    schedule: Schedule | NazSchedule | undefined | null
  ): { exceededMinutes: number; shouldShowWarning: boolean } | null {
    // Si no hay lunch_start, no podemos calcular
    if (!lunchStartTime) {
      return null;
    }

    // Calcular duración real del almuerzo
    const actualDuration = differenceInMinutes(lunchEndTime, lunchStartTime);
    const expectedDuration = 60; // 1 hora

    // Si el almuerzo duró menos de 60 minutos, no hay exceso
    if (actualDuration < expectedDuration) {
      return null;
    }

    // Calcular minutos excedidos
    const exceededMinutes = actualDuration - expectedDuration;

    // Solo mostrar advertencia si excede más de 5 minutos
    // Si es 5 minutos o menos, solo acumular (shouldShowWarning = false)
    const shouldShowWarning = exceededMinutes > 5;

    return {
      exceededMinutes,
      shouldShowWarning,
    };
  }

  // Calculate if exit is early or late
  private calculateExitDifference(
    exitTime: Date,
    schedule: Schedule | NazSchedule | undefined
  ): { minutes: number; isEarly: boolean } | null {
    if (!schedule || !schedule.exit_time || schedule.day_off) {
      return null;
    }

    const exitTimeStr = format(exitTime, 'HH:mm:ss');
    const scheduleTimeStr =
      typeof schedule.exit_time === 'string'
        ? schedule.exit_time
        : format(new Date(schedule.exit_time), 'HH:mm:ss');

    const exitParts = exitTimeStr.split(':');
    const scheduleParts = scheduleTimeStr.split(':');

    const exitDate = new Date();
    exitDate.setHours(+exitParts[0], +exitParts[1], +exitParts[2] || 0, 0);

    const scheduleDate = new Date();
    scheduleDate.setHours(
      +scheduleParts[0],
      +scheduleParts[1],
      +scheduleParts[2] || 0,
      0
    );

    const difference = differenceInMinutes(exitDate, scheduleDate);

    // If difference is negative, exited early; if positive, exited late
    if (Math.abs(difference) > (schedule.minutes_tolerance || 0)) {
      return {
        minutes: Math.abs(difference),
        isEarly: difference < 0,
      };
    }

    return null;
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
    if (this.form.valid) {
      this.validateOtp();
    }
  }

  onEmployeeSelected(employee: Employee | undefined) {
    // Inicializar audio con interacción del usuario
    this.getAudioContext();

    if (employee?.id) {
      this.getLastTimelog(employee.id).subscribe({
        next: (lastTimelog) => {
          const nextType = this.getNextTimelogType(lastTimelog?.type || null);
          this.updateAvailableTypes(lastTimelog?.type || null);
          this.form.get('type')?.setValue(nextType);
          this.suggestedType.set(nextType);
          this.showKeypad.set(true);
          // Focus OTP input when employee is selected
          this.focusOtpInput();
        },
        error: () => {
          // Default to entry if error
          this.updateAvailableTypes(null);
          this.form.get('type')?.setValue('entry');
          this.suggestedType.set('entry');
          this.showKeypad.set(true);
          // Focus OTP input when employee is selected
          this.focusOtpInput();
        },
      });
    } else {
      this.updateAvailableTypes(null);
      this.suggestedType.set('');
      this.showKeypad.set(false);
    }
  }

  onMobilePinInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = val;
    this.form.get('otp')?.setValue(val);
    this.otpLength.set(val.length);
  }

  onOtpInput(event: any) {
    // Track OTP length (PrimeNG handles auto-advance internally)
    setTimeout(() => {
      const otpVal = this.form.get('otp')?.value || '';
      this.otpLength.set(otpVal.length);
    });
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
        this.playFailureSound();
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Código incorrecto',
        });
        this.form.get('otp')?.reset();
        this.otpLength.set(0);
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
        employeeName
      );
    } else {
      this.isProcessing.set(false);
    }
  }

  private processTimelog(
    employeeId: string,
    branchId: string,
    companyId: string,
    type: string,
    employeeName: string
  ) {
    // Validar IP normalmente
    const invalidValue = !this.validIP();

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
          this.playFailureSound();
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
            this.playFailureSound();
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
            const currentHour = nowInPanama.getHours();
            const currentMinute = nowInPanama.getMinutes();
            const currentSecond = nowInPanama.getSeconds();
            
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

          message += `</div>`;

          // Nota: El tiempo excedido ya se acumuló en la RPC, no necesitamos llamar a increment_lunch_exceeded_minutes

          // Mostrar diálogo con sonido apropiado
          this.showConfirmationDialogWithSound(message, isLate, employeeId);
        },
        error: () => {
          this.isProcessing.set(false);
        },
      });
  }

  // Mostrar diálogo de confirmación
  private showConfirmationDialog(message: string): void {
    this.showConfirmationDialogWithSound(message, false);
  }

  // Mostrar overlay de confirmación con sonido según tardanza
  private showConfirmationDialogWithSound(message: string, isLate: boolean, employeeId?: string): void {
    this.isProcessing.set(false);
    // Reproducir sonido según si llegó tarde o no
    if (isLate) {
      this.playLateSound();
    } else {
      this.playSuccessSound(employeeId);
    }

    // Get employee name and type for overlay
    const employee = this.form.get('employee')?.value;
    const typeName = this.form.get('type')?.value || '';
    const typeLabel = this.types.find((t) => t.value === typeName)?.label || typeName;
    const employeeName = employee
      ? `${employee.first_name || ''} ${employee.father_name || ''}`.trim()
      : '';
    const timeStr = this.formattedTime();

    // Extract late message from the HTML message
    let lateMsg = '';
    if (isLate) {
      const match = message.match(/Tardanza:\s*([^<]+)/);
      lateMsg = match ? match[1].trim() : '';
    }

    const motivationalMsg = this.getRandomMotivationalMessage();

    this.successOverlay.set({
      name: employeeName,
      type: typeLabel,
      time: timeStr,
      isLate,
      lateMsg,
      motivationalMsg,
    });

    // Send push notification if enabled
    this.pwaService.sendNotification(
      `${typeLabel} - ${employeeName}`,
      `${timeStr}${isLate ? ' (Tardanza)' : ''} — ${motivationalMsg}`,
    );

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      this.dismissOverlay();
    }, 4000);
  }

  /** Dismiss the success overlay and reset form */
  dismissOverlay(): void {
    this.successOverlay.set(null);
    this.form.get('otp')?.reset();
    this.form.get('employee')?.reset();
    this.showKeypad.set(false);
    this.suggestedType.set('');
    this.otpLength.set(0);
    // Solo validar IP si NO es Naz
    if (!this.isNazCompany() && !this.validIP()) {
      this.alertInvalidIP();
    }
  }

  // AudioContext compartido para evitar límites del navegador
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      // Resumir si está suspendido (política de autoplay)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      return this.audioContext;
    } catch (error) {
      console.warn('Audio no soportado:', error);
      return null;
    }
  }

  // Reproducir sonido de éxito: empleado personalizado (squirrel/cockatoo al azar), resto (meow/bark al azar)
  private playSuccessSound(employeeId?: string): void {
    try {
      let src: string;
      if (employeeId === this.EMPLOYEE_PERSONALIZED_SOUND_ID && this.PERSONALIZED_SUCCESS_SOUNDS.length > 0) {
        const idx = Math.floor(Math.random() * this.PERSONALIZED_SUCCESS_SOUNDS.length);
        src = this.PERSONALIZED_SUCCESS_SOUNDS[idx];
      } else {
        const idx = Math.floor(Math.random() * this.GENERAL_SUCCESS_SOUNDS.length);
        src = this.GENERAL_SUCCESS_SOUNDS[idx];
      }
      const audio = new Audio(src);
      audio.volume = 0.7;
      audio.play().then(() => {
        console.log('🔊 Sonido de éxito reproducido');
      }).catch((error) => {
        console.warn('Error reproduciendo sonido de éxito:', error);
      });
    } catch (error) {
      console.warn('Error reproduciendo sonido de éxito:', error);
    }
  }

  // Reproducir sonido de fracaso
  private playFailureSound(): void {
    const audioContext = this.getAudioContext();
    if (!audioContext) return;

    try {
      const now = audioContext.currentTime;

      // Tono de error: dos beeps cortos descendentes
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.frequency.value = 400;
      osc1.type = 'square';
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Segundo beep más bajo
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.frequency.value = 300;
      osc2.type = 'square';
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.2, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.4);

      console.log('🔊 Sonido de error reproducido');
    } catch (error) {
      console.warn('Error reproduciendo sonido de error:', error);
    }
  }

  // Reproducir sonido de advertencia (tardanza)
  private playLateSound(): void {
    const audioContext = this.getAudioContext();
    if (!audioContext) return;

    try {
      const now = audioContext.currentTime;

      // Tono de advertencia: tres beeps de alerta
      for (let i = 0; i < 3; i++) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.frequency.value = 880; // A5 - tono alto de alerta
        osc.type = 'triangle';
        const startTime = now + i * 0.25;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.setValueAtTime(0.25, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.15);
      }

      console.log('🔊 Sonido de tardanza reproducido');
    } catch (error) {
      console.warn('Error reproduciendo sonido de tardanza:', error);
    }
  }

  // Calcular racha de días consecutivos marcando a tiempo
  private async calculateAndShowStreak(employeeId: string): Promise<number> {
    try {
      const { year, month, day } = this.getPanamaNowParts();

      // Obtener timelogs de entrada del empleado (últimos 100 días)
      const timelogsUrl = this.apiUrl.build('rest/v1/timelogs', {
        employee_id: `eq.${employeeId}`,
        type: 'eq.entry',
        order: 'created_at.desc',
        limit: '100',
      });
      const anonKey = getEnv('ENV_SUPABASE_API_KEY');
      const timelogs = await this.http
        .get<TimeLog[]>(timelogsUrl, {
          headers: {
            apikey: anonKey!,
            Authorization: `Bearer ${anonKey}`,
          },
        })
        .pipe(
          catchError(() => of([])),
          map((logs) => logs || [])
        )
        .toPromise();

      if (!timelogs || timelogs.length === 0) {
        return 0;
      }

      // Obtener schedules del empleado
      const schedulesUrl = this.apiUrl.build('rest/v1/employee_schedules', {
        employee_id: `eq.${employeeId}`,
        select: '*,schedule:schedules(*)',
        order: 'start_date.desc',
        limit: '100',
      });
      const schedules = await this.http
        .get<EmployeeSchedule[]>(schedulesUrl, {
          headers: {
            apikey: anonKey!,
            Authorization: `Bearer ${anonKey}`,
          },
        })
        .pipe(
          catchError(() => of([])),
          map((scheds) => scheds || [])
        )
        .toPromise();

      if (!schedules || schedules.length === 0) {
        return 0;
      }

      // Calcular racha: días consecutivos marcando a tiempo (hacia atrás desde hoy)
      let streak = 0;
      const checkedDates = new Set<string>();

      // Ordenar timelogs por fecha (más reciente primero)
      const sortedLogs = [...timelogs].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      });

      for (const log of sortedLogs) {
        const logDate = new Date(log.created_at);
        const logDateStr = format(logDate, 'yyyy-MM-dd');

        // Evitar contar el mismo día dos veces
        if (checkedDates.has(logDateStr)) {
          continue;
        }
        checkedDates.add(logDateStr);

        // Verificar si este día fue a tiempo
        const schedule = schedules.find((s) => {
          const startDate =
            s.start_date instanceof Date
              ? s.start_date
              : new Date(s.start_date);
          const endDate =
            s.end_date instanceof Date ? s.end_date : new Date(s.end_date);
          const startDateStr = format(startDate, 'yyyy-MM-dd');
          const endDateStr = format(endDate, 'yyyy-MM-dd');
          return (
            startDateStr <= logDateStr &&
            endDateStr >= logDateStr &&
            !s.schedule?.day_off
          );
        });

        if (!schedule || !schedule.schedule?.entry_time) {
          // Sin horario = no cuenta para la racha, pero no la rompe
          continue;
        }

        // Verificar si fue tarde usando la misma lógica que calculateIsLate
        const entryTimeZoned = toZonedTime(logDate, 'America/Panama');
        const entryTimeStr = format(entryTimeZoned, 'HH:mm:ss');
        const scheduledTimeStr =
          typeof schedule.schedule.entry_time === 'string'
            ? schedule.schedule.entry_time
            : format(new Date(schedule.schedule.entry_time), 'HH:mm:ss');

        const entryParts = entryTimeStr.split(':');
        const scheduledParts = scheduledTimeStr.split(':');

        const entryMinutes = +entryParts[0] * 60 + +entryParts[1];
        const scheduledMinutes = +scheduledParts[0] * 60 + +scheduledParts[1];
        const tolerance = schedule.schedule.minutes_tolerance ?? 0;

        // Si marcó a tiempo (dentro de la tolerancia), incrementar racha
        if (entryMinutes <= scheduledMinutes + tolerance) {
          streak++;
        } else {
          // Marcó tarde, rompe la racha
          break;
        }
      }

      return streak;
    } catch (error) {
      // Si hay error, retornar 0
      return 0;
    }
  }

  // Helper para obtener partes de fecha en Panamá
  private getPanamaNowParts(): { year: number; month: number; day: number } {
    const now = toZonedTime(new Date(), 'America/Panama');
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }

  /** Reset inactivity timer (kiosk mode) */
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = setTimeout(() => {
      // Reset form after inactivity
      this.form.get('otp')?.reset();
      this.form.get('employee')?.reset();
      this.showKeypad.set(false);
      this.suggestedType.set('');
      this.otpLength.set(0);
      this.successOverlay.set(null);
    }, this.INACTIVITY_TIMEOUT);
  }

  /** Start dragging the numpad */
  onNumpadDragStart(e: MouseEvent | TouchEvent): void {
    this.numpadDragging = true;
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    const pos = this.numpadPos();
    this.numpadDragStart = {
      x: clientX,
      y: clientY,
      posX: pos?.x ?? 0,
      posY: pos?.y ?? 0,
    };
    e.preventDefault();

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!this.numpadDragging) return;
      const cx = ev instanceof MouseEvent ? ev.clientX : ev.touches[0].clientX;
      const cy = ev instanceof MouseEvent ? ev.clientY : ev.touches[0].clientY;
      const dx = cx - this.numpadDragStart.x;
      const dy = cy - this.numpadDragStart.y;
      this.numpadPos.set({
        x: this.numpadDragStart.posX + dx,
        y: this.numpadDragStart.posY + dy,
      });
    };

    const onEnd = () => {
      this.numpadDragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }

  private alertInvalidIP() {
    this.ipAlertVisible.set(true);
    this.logIPSecurityIncident();
  }

  public ipAlertVisible = signal(false);

  dismissIPAlert() {
    this.ipAlertVisible.set(false);
  }

  onVersionClick(): void {
    const idx = this.versionSoundIndex % this.VERSION_SOUNDS.length;
    const src = this.VERSION_SOUNDS[idx];
    const emoji = this.VERSION_EMOJIS[idx];
    this.versionSoundIndex += 1;

    try {
      const audio = new Audio(src);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}

    this.easterEggPop.set(true);
    this.easterEggBurst.set(emoji);
    setTimeout(() => this.easterEggPop.set(false), 220);
    setTimeout(() => this.easterEggBurst.set(null), 1400);
  }

  /** Log IP mismatch to security_audit_log */
  private logIPSecurityIncident() {
    const ip = this.currentIP() || 'unknown';
    const url = this.apiUrl.build('rest/v1/security_audit_log');
    this.http.post(url, {
      event_type: 'ip_mismatch_timeclock',
      table_name: 'timeclock',
      user_email: null,
      ip_address: ip,
      details: {
        detected_ip: ip,
        route: window.location.pathname,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        organization: this.isNazCompany() ? 'naz' : 'blackdog',
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
    }).pipe(catchError(() => EMPTY)).subscribe();
  }
}
