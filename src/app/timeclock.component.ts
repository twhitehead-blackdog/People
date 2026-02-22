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
import { IpDetectionService } from './services/ip-detection.service';
import { IpMonitorService } from './services/ip-monitor.service';
import { OrganizationService } from './services/organization.service';
import { TimeclockAudioService } from './services/timeclock-audio.service';
import { TimeclockPhrasesService } from './services/timeclock-phrases.service';
import { TimeSyncService } from './services/time-sync.service';
import { getEnv } from './utils/env.utils';

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
      style="width: 100%; position: relative; height: 100%; overflow: hidden;"
    >
      @if (!isKioskMode() || isIPValid() || isNazCompany()) {
      <div
        class="flex flex-col gap-2 sm:gap-3 md:gap-4 items-center px-4 sm:px-6 md:px-8 relative z-10 timeclock-content"
        style="max-width: 100%; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 1rem 0.5rem; overflow: hidden;"
      >
        @if (isKioskMode()) {
        <img
          [src]="isNazCompany() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
          class="w-auto object-contain drop-shadow-2xl relative z-10 mb-1 sm:mb-2 flex-shrink-0"
          style="max-width: 90%; height: 5rem;"
        />
        }
        <div class="timeclock-card-wrapper">
        <div class="animated-border-box">
          <div class="animated-border-glow"></div>
        <p-card class="w-full max-w-lg mx-auto timeclock-card relative z-10">
          <ng-template #title>
            <div
              class="flex flex-col gap-1.5 sm:gap-2 md:gap-2.5 items-center px-2 py-1"
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
                  class="text-lg sm:text-xl md:text-2xl lg:text-3xl font-mono font-bold clock-time break-words text-center"
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
              <div class="flex items-center justify-center gap-1.5 mt-1.5">
                <i class="pi pi-wifi text-emerald-400 text-[10px] animate-pulse"></i>
                <span class="text-[10px] text-emerald-400/80 font-medium tracking-wide uppercase">
                  Sucursal detectada por red
                </span>
              </div>
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
                <p-inputOtp
                  #otpInput
                  formControlName="otp"
                  [length]="6"
                  [integerOnly]="true"
                  (keydown.enter)="onEnterKey($event)"
                  (input)="onOtpInput($event)"
                  styleClass="p-inputotp-input"
                />
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
      </div>
      } @else {
      <!-- Mensaje de acceso restringido en modo kiosko -->
      <div
        class="flex flex-col gap-3 sm:gap-4 items-center px-4 sm:px-6 md:px-8 relative z-10"
        style="max-width: 100%; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 1rem 0.5rem; overflow: hidden;"
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
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <i class="pi pi-shield text-3xl text-red-400"></i>
            </div>
            <div class="space-y-2">
              <p class="text-base md:text-lg text-white font-semibold">
                Red no autorizada
              </p>
              <p class="text-sm text-gray-400 leading-relaxed max-w-xs">
                Esta red no tiene permiso para acceder al modo kiosko.
              </p>
            </div>
            @if (currentIP()) {
            <div
              class="w-full p-3 bg-red-500/5 rounded-xl border border-red-500/20 backdrop-blur-sm"
            >
              <div class="flex items-center justify-center gap-2">
                <i class="pi pi-globe text-red-400/60 text-xs"></i>
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">IP detectada</span>
              </div>
              <p class="text-sm text-red-400 font-mono font-bold mt-1.5 select-all">
                {{ currentIP() }}
              </p>
            </div>
            }
            <p class="text-xs text-gray-500 flex items-center gap-1.5">
              <i class="pi pi-info-circle text-[10px]"></i>
              Contacta a RRHH si necesitas acceso
            </p>
          </div>
        </p-card>
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
          @if (overlay.phrase) {
          <div class="success-phrase">
            {{ overlay.phrase }}
          </div>
          }
          <!-- Countdown progress bar -->
          <div class="success-countdown-bar">
            <div class="success-countdown-fill" [class.success-countdown-late]="overlay.isLate"></div>
          </div>
        </div>
      </div>
      }
    </div>`,
  styleUrl: './timeclock.component.scss',
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
  private ipDetection = inject(IpDetectionService);
  private audio = inject(TimeclockAudioService);
  private phrases = inject(TimeclockPhrasesService);
  private readonly DISPLAY_TIMEZONE = 'America/Panama';
  public currentIP = this.ipDetection.currentIP;
  public isProcessing = signal<boolean>(false);
  public showKeypad = signal<boolean>(false);
  public currentTime = signal<Date>(new Date());
  public availableTypes = signal<Array<{ value: string; label: string }>>([]);
  public isKioskMode = signal<boolean>(false);
  public isMobileKiosk = signal<boolean>(false);
  public isIPValid = signal<boolean>(true);
  public suggestedType = signal<string>('');
  public otpLength = signal<number>(0);
  public successOverlay = signal<{
    name: string;
    type: string;
    time: string;
    isLate: boolean;
    lateMsg: string;
    phrase: string;
  } | null>(null);
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
  public isNazCompany = computed(() => this.organizationService.isNaz());
  public isBlackDogCompany = computed(() =>
    this.organizationService.isBlackDog()
  );
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
    this.ipDetection.detect();

    // Si está en modo kiosko y NO es Naz, monitorear la IP continuamente
    if (isKioskRoute && !this.isNazCompany()) {
      this.setupKioskModeMonitoring();
    } else if (isKioskRoute && this.isNazCompany()) {
      // Para Naz, siempre considerar la IP como válida
      this.isIPValid.set(true);
    }

    // Ensure numeric keyboard on mobile for OTP inputs
    setTimeout(() => {
      this.applyNumericInputMode();
      const observer = new MutationObserver(() => this.applyNumericInputMode());
      const container = document.querySelector('.animated-gradient-container');
      if (container) {
        observer.observe(container, { childList: true, subtree: true });
      }
      this.destroyRef.onDestroy(() => observer.disconnect());
    }, 200);

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
    // Audio warmup no longer needed - handled by TimeclockAudioService

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

  onOtpInput(event: any) {
    // Auto-advance to next input when a digit is entered
    const target = event.target;
    if (target && target.value && target.nextElementSibling) {
      target.nextElementSibling.focus();
    }
    // Track OTP length
    const otpVal = this.form.get('otp')?.value || '';
    this.otpLength.set(otpVal.length);
  }

  private applyNumericInputMode() {
    const otpInputs = document.querySelectorAll(
      '.p-inputotp-input'
    ) as NodeListOf<HTMLInputElement>;
    otpInputs.forEach((input) => {
      if (!input.getAttribute('inputmode')) {
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('pattern', '[0-9]*');
        input.setAttribute('type', 'tel');
        // Fix backspace on mobile keyboards
        input.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Backspace') {
            e.preventDefault();
            const currentOtp = this.form.get('otp')?.value || '';
            if (currentOtp.length > 0) {
              const newVal = currentOtp.slice(0, -1);
              this.form.get('otp')?.setValue(newVal);
              this.otpLength.set(newVal.length);
              // Focus the previous input
              const prev = input.previousElementSibling as HTMLInputElement;
              if (prev && prev.tagName === 'INPUT') {
                prev.focus();
              }
            }
          }
        });
      }
    });
  }

  focusOtpInput() {
    // Focus first OTP input and ensure numeric keyboard on mobile
    setTimeout(() => {
      const otpInputs = document.querySelectorAll(
        '.p-inputotp-input'
      ) as NodeListOf<HTMLInputElement>;
      otpInputs.forEach((input) => {
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('pattern', '[0-9]*');
      });
      if (otpInputs.length > 0) {
        otpInputs[0].focus();
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
        this.audio.playFailureSound();
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
          this.audio.playFailureSound();
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
            this.audio.playFailureSound();
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
      this.audio.playLateSound();
    } else {
      this.audio.playSuccessSound(employeeId);
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

    this.successOverlay.set({
      name: employeeName,
      type: typeLabel,
      time: timeStr,
      isLate,
      lateMsg,
      phrase: this.phrases.getPhrase(isLate),
    });

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
