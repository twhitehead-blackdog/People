import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { ScreenLockService } from '../services/screen-lock.service';

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
  imports: [CommonModule, ReactiveFormsModule, InputOtpModule, ButtonModule],
  template: `
    @if (screenLockService.isLocked()) {
    <div
      class="fixed inset-0 z-[9999] overflow-hidden bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center font-sans"
    >
      <!-- Logo Corner -->
      <div
        class="absolute top-6 left-6 cursor-pointer z-50 hover:scale-105 transition-transform duration-300 group"
        (click)="togglePinInput()"
      >
        <img
          src="images/blackdog.png"
          alt="BlackDog"
          class="h-12 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
        />
      </div>

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
              class="bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md text-xs text-white/80 whitespace-nowrap"
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
          class="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl flex flex-col items-center w-80"
        >
          <div class="mb-6 text-center">
            <h2 class="text-xl font-medium text-white mb-1">BlackDog People</h2>
            <p class="text-sm text-white/50">Ingresa tu PIN para desbloquear</p>
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
                styleClass="otp-custom"
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
                class="p-button-primary w-full"
                [disabled]="!unlockForm.valid"
              ></button>
              <button
                pButton
                type="button"
                label="Cancelar"
                class="p-button-text p-button-secondary w-full text-white/60 hover:text-white"
                (click)="hidePinInput()"
              ></button>
            </div>
          </form>
        </div>
      </div>

      @if (!showPinInput()) {
      <div class="absolute bottom-10 text-white/20 text-xs animate-pulse">
        Toca el logo para desbloquear
      </div>
      }
    </div>
    }
  `,
  styles: [
    `
      :host ::ng-deep .otp-custom .p-inputotp-input {
        @apply w-10 h-12 text-xl bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-primary-500 transition-all rounded-lg;
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

  showPinInput = signal(false);
  error = signal<string | null>(null);

  // Dynamic Dog Logic
  currentDogIndex = signal(0);
  currentActionIndex = signal(0);

  // Movement logic
  dogPosition = signal(50); // percentage 0-100
  isMovingLeft = signal(false);
  showBubble = signal(true);

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
      idleCase: 'Idle',
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
      idleCase: 'Idle',
    },
    {
      id: 6,
      name: 'Husky',
      folder: 'Dog-6-Siberian-Husky',
      prefix: 'Siberian-Husky-',
      idleCase: 'Idle',
    },
  ];

  // Available actions and their frame counts (based on 100x100 standard)
  readonly ACTIONS: DogAction[] = [
    { name: 'walk', frames: 8, width: 800, duration: '1.2s' },
    { name: 'run', frames: 8, width: 800, duration: '0.9s' },
    { name: 'idle', frames: 10, width: 1000, duration: '2.0s' }, // Requires casing check
    { name: 'sitting', frames: 4, width: 400, duration: '1.5s' },
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

  constructor() {
    effect(() => {
      if (this.screenLockService.isLocked()) {
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

    // Inject global keyframes if not exists
    this.injectKeyframes();
  }

  ngOnInit() {
    this.pickRandomBreed();
  }

  ngOnDestroy() {
    this.stopDogLifecycle();
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

        // Shake animation logic could be here
        setTimeout(() => this.error.set(null), 2000);
      }
    }
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

    // Movement physics loop
    this.moveIntervalId = setInterval(() => {
      const action = this.currentAction();
      if (action.name === 'walk' || action.name === 'run') {
        const speed = action.name === 'run' ? 0.36 : 0.12;
        let newPos = this.dogPosition();

        if (this.isMovingLeft()) {
          newPos -= speed;
          if (newPos < 10) {
            this.isMovingLeft.set(false); // Hit left wall, turn right
          }
        } else {
          newPos += speed;
          if (newPos > 90) {
            this.isMovingLeft.set(true); // Hit right wall, turn left
          }
        }
        this.dogPosition.set(newPos);
      }
    }, 30);
  }
}
