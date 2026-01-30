import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { format } from 'date-fns';
import * as OTPAuth from 'otpauth';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputOtpModule } from 'primeng/inputotp';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { catchError, map, Observable, of } from 'rxjs';
import { Employee, TimeLog, TimelogType } from '../models';
import { OrganizationService } from '../services/organization.service';
import { ScreenLockService } from '../services/screen-lock.service';
import { DashboardStore } from '../stores/dashboard.store';

interface DogAction {
  name: string;
  frames: number;
  width: number; // Width of the sprite sheet in pixels (assuming 100px height/frame width)
  duration: string; // CSS animation duration
}

interface DogConfig {
  id: number;
  name: string;
  folder: string;
  prefix: string;
  idleCase: 'idle' | 'Idle'; // Handle inconsistent file naming
}

@Component({
  selector: 'pt-screen-lock',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    InputOtpModule,
    ButtonModule,
    DatePipe,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (screenLockService.isLocked()) {
    <div
      class="fixed inset-0 z-[9999] overflow-hidden bg-black flex flex-col items-center justify-center font-sans"
    >
      <!-- Logo Corner -->
      <div
        class="absolute top-6 left-6 cursor-pointer z-50 hover:scale-105 transition-transform duration-300 group"
        (click)="togglePinInput()"
      >
        <img
          src="images/Naz_Logo.jpg"
          alt="Naz"
          class="h-16 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
        />
      </div>

      <!-- Clock & Branch (Above Dog) -->
      @if (!showPinInput()) {
      <div
        class="absolute bottom-48 flex flex-col items-center z-40 animate-fade-in w-full max-w-md px-4"
      >
        <!-- Clock -->
        <div
          class="text-[5rem] font-light tracking-tight text-[#E5E2DF] font-mono leading-none"
        >
          {{ currentTime() | date : 'HH:mm' }}
        </div>
        <!-- Date -->
        <div
          class="text-lg text-[#C6C2BF] mt-2 font-light uppercase tracking-widest"
        >
          {{ currentTime() | date : 'EEEE d, MMMM' }}
        </div>

        <!-- Timeclock UI -->
        <div class="mt-8 w-full flex flex-col gap-4">
          <!-- Step 1: Employee Selector -->
          @if (!selectedEmployee()) {
          <div
            class="w-full bg-[#1A1A1A] p-4 rounded-xl border border-[#333333] shadow-2xl animate-fade-in-up"
          >
            <label
              class="text-xs text-[#888888] uppercase tracking-wider mb-2 block"
              >Seleccionar Colaborador</label
            >
            <p-select
              [options]="employees()"
              optionLabel="first_name"
              filter="true"
              filterBy="first_name,father_name"
              placeholder="Buscar..."
              styleClass="w-full naz-select"
              (onChange)="onEmployeeSelected($event.value)"
              [virtualScroll]="true"
              [virtualScrollItemSize]="30"
            >
              <ng-template let-emp pTemplate="item">
                <div class="flex items-center gap-2">
                  <span class="font-medium"
                    >{{ emp.first_name }} {{ emp.father_name }}</span
                  >
                </div>
              </ng-template>
              <ng-template let-emp pTemplate="selectedItem">
                <span class="font-medium" *ngIf="emp"
                  >{{ emp.first_name }} {{ emp.father_name }}</span
                >
              </ng-template>
            </p-select>
          </div>
          }

          <!-- Step 2: Employee Selected State -->
          @else {
          <div
            class="w-full bg-[#1A1A1A] p-6 rounded-xl border border-[#333333] shadow-2xl animate-fade-in-up relative overflow-hidden"
          >
            <!-- Reset Button -->
            <button
              class="absolute top-2 right-2 text-[#666666] hover:text-[#E5E2DF]"
              (click)="resetTimeclock()"
            >
              <i class="pi pi-times"></i>
            </button>

            <div class="text-center mb-6">
              <div class="text-[#E5E2DF] text-xl font-medium">
                {{ selectedEmployee()?.first_name }}
                {{ selectedEmployee()?.father_name }}
              </div>
              <div class="text-[#888888] text-xs uppercase tracking-widest">
                Confirmar Asistencia
              </div>
            </div>

            <!-- Punch Type Selector -->
            <div class="grid grid-cols-2 gap-2 mb-6">
              @for (type of availableTypes(); track type.value) { @if(type.value
              !== 'lunch_start' && type.value !== 'lunch_end') {
              <button
                pButton
                class="p-button-outlined w-full justify-center !text-sm"
                [class.bg-[#E5E2DF]]="selectedType() === type.value"
                [class.text-black]="selectedType() === type.value"
                [class.text-[#888888]]="selectedType() !== type.value"
                [class.border-[#E5E2DF]]="selectedType() === type.value"
                [class.border-[#333333]]="selectedType() !== type.value"
                (click)="selectedType.set(type.value)"
              >
                {{ type.label }}
              </button>
              } }
            </div>

            <!-- Lunch specific handled separately or simplified? 
                         Let's keep it simple: Entry and Exit for now as per user request "full... as in timeclock" implies all options. 
                         Let's add Lunch buttons below -->
            <div class="grid grid-cols-2 gap-2 mb-6 -mt-4">
              <button
                pButton
                class="p-button-outlined w-full justify-center !text-sm"
                [class.bg-[#E5E2DF]]="selectedType() === 'lunch_start'"
                [class.text-black]="selectedType() === 'lunch_start'"
                [class.text-[#888888]]="selectedType() !== 'lunch_start'"
                [class.border-[#E5E2DF]]="selectedType() === 'lunch_start'"
                [class.border-[#333333]]="selectedType() !== 'lunch_start'"
                (click)="selectedType.set('lunch_start')"
              >
                Inicio Almuerzo
              </button>
              <button
                pButton
                class="p-button-outlined w-full justify-center !text-sm"
                [class.bg-[#E5E2DF]]="selectedType() === 'lunch_end'"
                [class.text-black]="selectedType() === 'lunch_end'"
                [class.text-[#888888]]="selectedType() !== 'lunch_end'"
                [class.border-[#E5E2DF]]="selectedType() === 'lunch_end'"
                [class.border-[#333333]]="selectedType() !== 'lunch_end'"
                (click)="selectedType.set('lunch_end')"
              >
                Fin Almuerzo
              </button>
            </div>

            <!-- PIN Input -->
            <div class="flex flex-col items-center gap-4">
              <p-inputOtp
                [(ngModel)]="pin"
                [length]="6"
                styleClass="otp-custom otp-naz p-inputotp-input-pin"
                (onCompleted)="validateTimeclockPin()"
                (keydown.enter)="validateTimeclockPin()"
                [disabled]="isProcessing()"
              >
              </p-inputOtp>

              <div class="h-4">
                @if(error() && selectedEmployee()) {
                <span class="text-red-400 text-xs animate-pulse">{{
                  error()
                }}</span>
                } @else if (isProcessing()) {
                <span class="text-[#E5E2DF] text-xs animate-pulse"
                  ><i class="pi pi-spin pi-spinner mr-2"></i>Validando...</span
                >
                }
              </div>

              <button
                pButton
                label="Marcar"
                class="w-full naz-button-primary"
                (click)="validateTimeclockPin()"
                [disabled]="isProcessing() || pin().length < 6"
              ></button>
            </div>
          </div>
          }
        </div>
      </div>
      }

      <!-- Pixel Dog Animation -->
      <div
        class="absolute inset-x-0 bottom-0 h-32 z-10 pointer-events-none overflow-hidden pb-4"
      >
        <div class="dog-container relative w-full h-full">
          <div
            class="dog-sprite"
            [ngStyle]="dogStyle()"
            [class.scale-x-[-1]]="isMovingLeft()"
          ></div>

          <!-- Speech Bubble (Optional) -->
          <div
            class="absolute left-1/2 -translate-x-1/2 -top-12 transition-opacity duration-500"
            [class.opacity-0]="!showBubble()"
            [style.transform]="'translateX(' + (dogPosition() - 50) + 'vw)'"
          >
            <div
              class="bg-black/80 px-3 py-1 rounded-full border border-[#333333] backdrop-blur-md text-xs text-[#E5E2DF] whitespace-nowrap"
            >
              {{
                currentAction().name === 'sleeping'
                  ? 'Zzz...'
                  : currentAction().name === 'bark'
                  ? 'Woof!'
                  : '...'
              }}
            </div>
          </div>
        </div>
      </div>

      <!-- Unlock Form -->
      <div
        class="relative z-50 transition-all duration-300 transform"
        [class.opacity-0]="!showPinInput()"
        [class.scale-95]="!showPinInput()"
        [class.pointer-events-none]="!showPinInput()"
        [class.opacity-100]="showPinInput()"
        [class.scale-100]="showPinInput()"
      >
        <div
          class="bg-[#0D0D0D] border border-[#333333] p-8 rounded-2xl shadow-2xl flex flex-col items-center w-80"
        >
          <div class="mb-6 text-center">
            <h2 class="text-xl font-medium text-[#E5E2DF] mb-1 font-serif">
              Naz
            </h2>
            <p class="text-sm text-[#888888]">
              Ingresa tu PIN para desbloquear
            </p>
          </div>

          <form
            [formGroup]="unlockForm"
            (ngSubmit)="onUnlock()"
            class="flex flex-col items-center w-full"
          >
            <div class="mb-6 relative w-full flex justify-center">
              <p-inputOtp
                formControlName="pin"
                [length]="6"
                styleClass="otp-custom otp-naz"
                (onCompleted)="onUnlock()"
                (keydown.enter)="onUnlock()"
              >
              </p-inputOtp>

              @if (error()) {
              <div class="absolute -bottom-6 left-0 right-0 text-center">
                <span class="text-red-400 text-xs animate-pulse">{{
                  error()
                }}</span>
              </div>
              }
            </div>

            <div class="flex flex-col gap-2 w-full mt-2">
              <button
                pButton
                type="submit"
                label="Desbloquear"
                icon="pi pi-unlock"
                class="w-full naz-button-primary"
                [disabled]="!unlockForm.valid"
              ></button>
              <button
                pButton
                type="button"
                label="Cancelar"
                class="p-button-text w-full text-[#888888] hover:text-[#E5E2DF]"
                (click)="hidePinInput()"
              ></button>
            </div>
          </form>
        </div>
      </div>

      @if (!showPinInput()) {
      <div
        class="absolute bottom-10 text-[#444444] text-[10px] uppercase tracking-widest animate-pulse"
      >
        Toca el logo para desbloquear
      </div>
      }
    </div>
    }
  `,
  styles: [
    `
      :host ::ng-deep .otp-naz .p-inputotp-input {
        @apply w-10 h-12 text-xl bg-[#1A1A1A] border border-[#333333] text-[#E5E2DF] focus:bg-[#252525] focus:border-[#C6C2BF] transition-all rounded-lg;
      }

      :host ::ng-deep .naz-button-primary {
        @apply bg-[#E5E2DF] text-black border border-[#E5E2DF] font-medium !important;
      }

      :host ::ng-deep .naz-button-primary:hover {
        @apply bg-[#C6C2BF] border-[#C6C2BF] !important;
      }

      .dog-sprite {
        width: 150px;
        height: 150px;
        background-repeat: no-repeat;
        image-rendering: pixelated; /* Crucial for pixel art */
        position: absolute;
        bottom: 0;
        /* Animation is handled via ngStyle to support dynamic frames */
      }
    `,
  ],
})
export class ScreenLockComponent implements OnInit, OnDestroy {
  public screenLockService = inject(ScreenLockService);
  private ngZone = inject(NgZone);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private http = inject(HttpClient);
  public dashboardStore = inject(DashboardStore);
  private organizationService = inject(OrganizationService);

  showPinInput = signal(false);
  error = signal<string | null>(null);

  // Timeclock State
  selectedEmployee = signal<Partial<Employee> | undefined>(undefined);
  selectedType = signal<string | undefined>(undefined);
  // Default to all types initially
  availableTypes = signal<Array<{ value: string; label: string }>>([]);

  public types = Object.entries(TimelogType).map(([key, value]) => ({
    value: key,
    label: value,
  }));

  pin = signal('');
  isProcessing = signal(false);

  constructor() {
    effect(() => {
      // Init types on load
      this.availableTypes.set(this.types);
    });

    effect(() => {
      const isLocked = this.screenLockService.isLocked();

      untracked(() => {
        if (isLocked) {
          setTimeout(() => {
            const input = document.querySelector(
              'input.p-inputotp-input'
            ) as HTMLElement;
            input?.focus();
          }, 100);
          this.startDogLifecycle();
        } else {
          this.stopDogLifecycle();
        }
      });
    });

    // Inject global keyframes if not exists
    this.injectKeyframes();
  }

  // Computed State
  employees = computed(() => {
    return this.dashboardStore.employees.employeesList();
  });

  currentBranchId = computed(() => {
    return this.dashboardStore.branches.entities()[0]?.id;
  });

  currentCompanyId = computed(() => {
    try {
      return this.organizationService.getCurrentCompanyId();
    } catch (e) {
      return this.dashboardStore.selectedCompanyId();
    }
  });

  // Dynamic Dog Logic
  currentDogIndex = signal(0);
  currentActionIndex = signal(0);

  // Movement logic
  dogPosition = signal(50); // percentage 0-100
  isMovingLeft = signal(false);
  showBubble = signal(true);

  // Clock Logic
  currentTime = signal(new Date());
  private clockInterval: any;

  private intervalId: any;
  private moveIntervalId: any;
  private actionTimeoutId: any;
  private ROTATION_MINUTES = 30;

  // Dog Configuration
  readonly DOGS: DogConfig[] = [
    {
      id: 1,
      name: 'Golden Retriever',
      folder: 'Dog-1-Golden-Retriever',
      prefix: 'Golden-Retriever-',
      idleCase: 'idle',
    },
    {
      id: 2,
      name: 'Akita',
      folder: 'Dog-2-Akita',
      prefix: 'Akita-',
      idleCase: 'idle',
    },
    {
      id: 3,
      name: 'Great Dane',
      folder: 'Dog-3-Great-Dane',
      prefix: 'Great-Dane-',
      idleCase: 'idle',
    },
    {
      id: 4,
      name: 'Schnauzer',
      folder: 'Dog-4-Schnauzer',
      prefix: 'Schnauzer-',
      idleCase: 'idle',
    },
    {
      id: 5,
      name: 'Saint Bernard',
      folder: 'Dog-5-Saint-Bernard',
      prefix: 'Saint-Bernard-',
      idleCase: 'idle',
    },
    {
      id: 6,
      name: 'Husky',
      folder: 'Dog-6-Siberian-Husky',
      prefix: 'Siberian-Husky-',
      idleCase: 'idle',
    },
  ];

  // Available actions and their frame counts (based on 100x100 standard)
  readonly ACTIONS: DogAction[] = [
    { name: 'walk', frames: 8, width: 800, duration: '1.2s' },
    { name: 'run', frames: 8, width: 800, duration: '0.9s' },
    { name: 'idle', frames: 10, width: 1000, duration: '2.0s' }, // Requires casing check
    // { name: 'sitting', frames: 4, width: 400, duration: '1.5s' },
    { name: 'bark', frames: 3, width: 300, duration: '1.0s' },
    { name: 'itching', frames: 2, width: 200, duration: '0.6s' },
    { name: 'stretching', frames: 10, width: 1000, duration: '2.0s' },
  ];

  unlockForm = new FormGroup({
    pin: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  currentDog = computed(() => this.DOGS[this.currentDogIndex()]);
  currentAction = computed(() => this.ACTIONS[this.currentActionIndex()]);

  // keyframes must be global or injected styles, but since steps() is dynamic for width
  // we can use standard keyframes `from { background-position: 0 0; } to { background-position: -WIDTHpx 0; }`

  dogStyle = computed(() => {
    const dog = this.currentDog();
    const action = this.currentAction();
    let actionName = action.name;

    // Handle 'idle' casing
    if (actionName === 'idle' && dog.idleCase === 'Idle') {
      actionName = 'Idle';
    }

    const url = `assets_dog/Pet Dogs Pack/${dog.folder}/${dog.prefix}${actionName}.png`;

    // Negative width for background position animation (scaled by 1.5 for the 150px size)
    const endPos = -(action.width * 1.5);

    return {
      'background-image': `url('${url}')`,
      'background-size': 'auto 150px',
      width: '150px',
      height: '150px',
      left: `${this.dogPosition()}%`,
      transform: `translateX(-50%) ${
        this.isMovingLeft() ? 'scaleX(-1)' : 'scaleX(1)'
      }`,
      transition: 'left 0.1s linear, transform 0.3s',
      // We use a CSS variable for the animation to key off
      '--sprite-width': `${endPos}px`,
      animation: `play-sprite ${action.duration} steps(${action.frames}) infinite`,
    };
  });

  ngOnInit() {
    this.pickRandomBreed();

    // Ensure companies are loaded for the timeclock to work
    this.dashboardStore.companies.fetchItems();

    // Start Clock
    this.clockInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy() {
    this.stopDogLifecycle();
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  togglePinInput() {
    this.showPinInput.update((v) => !v);
    if (this.showPinInput()) {
      setTimeout(() => {
        const input = document.querySelector(
          'input.p-inputotp-input'
        ) as HTMLElement;
        input?.focus();
      }, 100);
    }
  }

  hidePinInput() {
    this.showPinInput.set(false);
    this.error.set(null);
    this.unlockForm.reset();
  }

  async onUnlock() {
    if (this.unlockForm.valid) {
      const pin = this.unlockForm.get('pin')?.value;
      const success = await this.screenLockService.unlockScreen(pin || '');

      if (success) {
        this.hidePinInput();
      } else {
        this.error.set('PIN Incorrecto');
        this.unlockForm.get('pin')?.setValue('');
        setTimeout(() => this.error.set(null), 2000);
      }
    }
  }

  // --- Timeclock Logic ---

  onEmployeeSelected(employee: Partial<Employee>) {
    this.selectedEmployee.set(employee);
    this.pin.set('');

    if (employee?.id) {
      const companyId =
        this.currentCompanyId() ||
        this.dashboardStore.companies.entities()[0]?.id; // Fallback
      console.log('Fetching Timelogs for:', employee.id, companyId);

      this.getLastTimelog(employee.id, companyId).subscribe({
        next: (lastTimelog) => {
          const nextType = this.getNextTimelogType(lastTimelog?.type || null);
          this.updateAvailableTypes(lastTimelog?.type || null);
          this.selectedType.set(nextType);

          // Focus PIN input
          this.focusPinInput();
        },
        error: () => {
          // Default to entry
          this.updateAvailableTypes(null);
          this.selectedType.set('entry');
          this.focusPinInput();
        },
      });
    } else {
      this.updateAvailableTypes(null);
      this.selectedType.set(undefined);
    }
  }

  private focusPinInput() {
    setTimeout(() => {
      const input = document.querySelector(
        '.p-inputotp-input-pin'
      ) as HTMLElement;
      if (input) input.focus();
    }, 100);
  }

  private getLastTimelog(
    employeeId: string,
    companyId?: string
  ): Observable<TimeLog | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = `${today}T00:00:00`;

    let params: any = {
      select: 'id,type,created_at',
      employee_id: `eq.${employeeId}`,
      created_at: `gte.${todayStart}`,
      order: 'created_at.desc',
      limit: '1',
    };

    if (companyId) {
      params['company_id'] = `eq.${companyId}`;
    }

    return this.http
      .get<TimeLog[]>(`${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`, {
        params,
      })
      .pipe(
        map((timelogs) => {
          if (!timelogs || timelogs.length === 0) return null;
          const lastLog = timelogs[0];
          const logDate = format(new Date(lastLog.created_at), 'yyyy-MM-dd');
          return logDate === today ? lastLog : null;
        }),
        catchError(() => of(null))
      );
  }

  private getNextTimelogType(lastType: string | null): string {
    if (!lastType) return 'entry';
    switch (lastType) {
      case 'entry':
        return 'lunch_start';
      case 'lunch_start':
        return 'lunch_end';
      case 'lunch_end':
        return 'exit';
      case 'exit':
        return 'entry';
      default:
        return 'entry';
    }
  }

  private updateAvailableTypes(lastType: string | null) {
    const allTypes = this.types;
    if (!lastType) {
      this.availableTypes.set(allTypes);
      return;
    }
    let filtered: Array<{ value: string; label: string }> = [];
    switch (lastType) {
      case 'entry':
        filtered = allTypes.filter(
          (t) => t.value === 'lunch_start' || t.value === 'exit'
        );
        break;
      case 'lunch_start':
        filtered = allTypes.filter(
          (t) => t.value === 'lunch_end' || t.value === 'exit'
        );
        break;
      case 'lunch_end':
        filtered = allTypes.filter((t) => t.value === 'exit');
        break;
      case 'exit':
        filtered = allTypes.filter((t) => t.value === 'entry');
        break;
      default:
        filtered = allTypes;
    }
    this.availableTypes.set(filtered.length > 0 ? filtered : allTypes);
  }

  resetTimeclock() {
    this.selectedEmployee.set(undefined);
    this.selectedType.set('entry');
    this.updateAvailableTypes(null);
    this.pin.set('');
    this.error.set(null);
  }

  async validateTimeclockPin() {
    if (
      this.isProcessing() ||
      !this.selectedEmployee() ||
      !this.selectedType() ||
      this.pin().length < 6
    )
      return;

    const employee = this.selectedEmployee();
    const pinCode = this.pin();

    if (!employee || !employee.code_uri) {
      this.error.set('Empleado sin configuración de PIN');
      return;
    }

    this.isProcessing.set(true);

    try {
      const totp = OTPAuth.URI.parse(employee.code_uri);
      const validation = totp.validate({ token: pinCode, window: 1 });

      if (validation === null) {
        this.error.set('PIN Incorrecto');
        this.pin.set('');
        setTimeout(() => this.error.set(null), 2000);
        this.isProcessing.set(false);
        return;
      }

      // Success - Punch
      const type = this.selectedType();
      if (type) {
        await this.processTimelog(
          employee.id!,
          this.currentBranchId()!,
          this.currentCompanyId()!,
          type
        );
      }
    } catch (err) {
      console.error(err);
      this.error.set('Error al validar PIN');
      this.isProcessing.set(false);
    }
  }

  private async processTimelog(
    employeeId: string,
    branchId: string,
    companyId: string,
    type: string
  ) {
    // Direct HTTP call or Service call
    // We'll use direct HTTP to match NazTimeclockComponent logic simpler here
    const url = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`;

    const effectiveCompanyId =
      companyId || this.dashboardStore.companies.entities()[0]?.id;

    const payload = {
      employee_id: employeeId,
      branch_id: branchId,
      company_id: effectiveCompanyId, // Mandatory
      type: type,
      source: 'kiosk',
      invalid_ip: false,
    };

    console.log('Validating Timelog Payload:', payload);

    if (!effectiveCompanyId) {
      this.error.set('Error: Company ID missing');
      this.isProcessing.set(false);
      return;
    }

    this.http.post(url, payload).subscribe({
      next: () => {
        // Success Confirmation Dialog
        const now = new Date();
        const typeLabel =
          this.types.find((t) => t.value === type)?.label || type;

        const message = `<div style="text-align: center;">
             <div style="margin-bottom: 0.5rem;"><b>${typeLabel}</b> registrada exitosamente a las <b>${format(
          now,
          'h:mm:ss aaa'
        )}</b></div>
           </div>`;

        this.confirmationService.confirm({
          message,
          header: 'Éxito',
          icon: 'pi pi-check',
          acceptLabel: 'Aceptar',
          rejectVisible: false,
          accept: () => {
            this.resetTimeclock();
          },
          // Auto-close logic? Usually dialog blocks until action.
          // Screen lock context: user wants to go back to lock screen immediately?
          // Kiosk logic waits for acceptance. We'll do same.
        });

        this.isProcessing.set(false);
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo registrar la marcación',
        });
        this.isProcessing.set(false);
      },
    });
  }

  private injectKeyframes() {
    if (typeof document !== 'undefined') {
      const styleId = 'dog-sprite-keyframes';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
           @keyframes play-sprite {
             from { background-position-x: 0px; }
             to { background-position-x: var(--sprite-width); }
           }
         `;
        document.head.appendChild(style);
      }
    }
  }

  // --- Dynamic Dog Logic ---

  private startDogLifecycle() {
    this.pickRandomBreed(); // Initial breed
    this.decideNextAction(); // Initial action

    // Rotate BREED every 30 minutes
    this.intervalId = setInterval(() => {
      this.pickRandomBreed();
    }, this.ROTATION_MINUTES * 60 * 1000);

    // Movement loop
    this.startMovementLoop();
  }

  private stopDogLifecycle() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.moveIntervalId) clearInterval(this.moveIntervalId);
    if (this.actionTimeoutId) clearTimeout(this.actionTimeoutId);
  }

  private pickRandomBreed() {
    if (this.DOGS.length === 0) return;
    const randomIndex = Math.floor(Math.random() * this.DOGS.length);
    this.currentDogIndex.set(randomIndex);
    console.log(
      `[ScreenLock] Switched Breed to: ${this.DOGS[randomIndex].name}`
    );
  }

  /**
   * DECISION ENGINE
   * Decide la siguiente acción basándose en la actual para simular comportamiento real.
   */
  private decideNextAction() {
    if (this.ACTIONS.length === 0) return;

    const currentAction = this.currentAction().name;
    let nextActionName = 'idle';

    const roll = Math.random() * 100; // 0-100

    switch (currentAction) {
      case 'idle':
      case 'Idle':
        if (roll < 40) nextActionName = 'walk'; // 40%
        else if (roll < 70) nextActionName = 'sitting'; // 30%
        else if (roll < 80) nextActionName = 'bark'; // 10%
        else if (roll < 90) nextActionName = 'itching'; // 10%
        else nextActionName = 'stretching'; // 10%
        break;

      case 'walk':
        if (roll < 40) nextActionName = 'idle'; // 40%
        else if (roll < 60) nextActionName = 'run'; // 20%
        else if (roll < 90) nextActionName = 'sitting'; // 30%
        else nextActionName = 'bark'; // 10%
        break;

      case 'run':
        // Si corre, se cansa -> camina o se sienta. No pasa a dormir directo.
        if (roll < 60) nextActionName = 'walk'; // 60%
        else nextActionName = 'sitting'; // 40%
        break;

      case 'sitting':
        if (roll < 50) nextActionName = 'idle'; // 50%
        else if (roll < 80) nextActionName = 'walk'; // 30%
        else nextActionName = 'bark'; // 20%
        break;

      case 'bark':
        if (roll < 60) nextActionName = 'idle'; // 60%
        else if (roll < 80) nextActionName = 'walk'; // 20%
        else nextActionName = 'run'; // 20%
        break;

      case 'itching':
        // Rascarse alivia -> idle o caminar
        if (roll < 80) nextActionName = 'idle'; // 80%
        else nextActionName = 'walk'; // 20%
        break;

      case 'stretching':
        // Estirarse -> siempre relax después
        nextActionName = 'idle';
        break;

      default:
        nextActionName = 'idle';
    }

    // Find the index of the chosen action
    const nextIndex = this.ACTIONS.findIndex((a) => a.name === nextActionName);
    this.currentActionIndex.set(nextIndex !== -1 ? nextIndex : 0);

    // Update state based on new action
    const action = this.ACTIONS[this.currentActionIndex()];
    if (action.name === 'walk' || action.name === 'run') {
      this.showBubble.set(false);
    } else {
      this.showBubble.set(true);
    }

    console.log(
      `[ScreenLock] Action: ${currentAction} -> ${
        action.name
      } (Wait: ${this.getNextDuration(action.name)}s)`
    );

    // Schedule next decision
    // Randomize duration slightly to feel organic (3s to 8s usually)
    const waitTime = this.getNextDuration(action.name) * 1000;

    this.actionTimeoutId = setTimeout(() => {
      if (this.screenLockService.isLocked()) {
        // Check if still locked
        this.decideNextAction();
      }
    }, waitTime);
  }

  private getNextDuration(actionName: string): number {
    // Retorna segundos de duración para esta acción antes de cambiar
    switch (actionName) {
      case 'walk':
        return 4 + Math.random() * 4; // 4-8s
      case 'run':
        return 3 + Math.random() * 3; // 3-6s
      case 'bark':
        return 2 + Math.random() * 2; // 2-4s
      case 'itching':
        return 3 + Math.random() * 2; // 3-5s
      case 'stretching':
        return 3 + Math.random(); // 3-4s
      default:
        return 3 + Math.random() * 4; // Idle/Sitting: 3-7s
    }
  }

  private startMovementLoop() {
    if (this.moveIntervalId) clearInterval(this.moveIntervalId);

    // Run movement physics OUTSIDE Angular Zone to avoid triggering
    // global change detection every 30ms (which crashes browsers in production)
    this.ngZone.runOutsideAngular(() => {
      this.moveIntervalId = setInterval(() => {
        const action = this.currentAction();
        if (action.name === 'walk' || action.name === 'run') {
          const speed = action.name === 'run' ? 0.36 : 0.12;
          let newPos = this.dogPosition();

          if (this.isMovingLeft()) {
            newPos -= speed;
            if (newPos < 10) {
              this.isMovingLeft.set(false);
            }
          } else {
            newPos += speed;
            if (newPos > 90) {
              this.isMovingLeft.set(true);
            }
          }

          // Update position signal (Signals work fine outside zone in standard Angular)
          this.dogPosition.set(newPos);
        }
      }, 30);
    });
  }
}
