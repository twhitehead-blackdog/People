import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';

type DogState =
  | 'idle'
  | 'walking'
  | 'sitting'
  | 'barking'
  | 'itching'
  | 'stretching'
  | 'lying-down'
  | 'sleeping';

type DogBreed =
  | 'Dog-1-Golden-Retriever'
  | 'Dog-2-Akita'
  | 'Dog-3-Great-Dane'
  | 'Dog-4-Schnauzer'
  | 'Dog-5-Saint-Bernard'
  | 'Dog-6-Siberian-Husky';

interface DogAction {
  name: DogState;
  frames: number;
  width: number;
  duration: string;
}

interface DogConfig {
  folder: string;
  prefix: string;
  idleCase: 'idle' | 'Idle';
}

const STATE_TO_FILE: Record<DogState, string> = {
  idle: 'idle',
  walking: 'walk',
  sitting: 'sitting',
  barking: 'bark',
  itching: 'itching',
  stretching: 'stretching',
  'lying-down': 'lying-down',
  sleeping: 'sleeping',
};

const ACTIONS: DogAction[] = [
  { name: 'idle',        frames: 10, width: 1000, duration: '1.2s' },
  { name: 'walking',     frames: 8,  width: 800,  duration: '0.6s' },
  { name: 'sitting',     frames: 1,  width: 100,  duration: '0s'   },
  { name: 'barking',     frames: 3,  width: 300,  duration: '0.6s' },
  { name: 'itching',     frames: 2,  width: 200,  duration: '0.8s' },
  { name: 'stretching',  frames: 10, width: 1000, duration: '1.2s' },
  { name: 'lying-down',  frames: 1,  width: 100,  duration: '0s'   },
  { name: 'sleeping',    frames: 1,  width: 100,  duration: '0s'   },
];

const BREEDS: Record<DogBreed, DogConfig> = {
  'Dog-1-Golden-Retriever': { folder: 'Dog-1-Golden-Retriever', prefix: 'Golden-Retriever-', idleCase: 'idle' },
  'Dog-2-Akita':            { folder: 'Dog-2-Akita',            prefix: 'Akita-',            idleCase: 'Idle' },
  'Dog-3-Great-Dane':       { folder: 'Dog-3-Great-Dane',       prefix: 'Great-Dane-',       idleCase: 'idle' },
  'Dog-4-Schnauzer':        { folder: 'Dog-4-Schnauzer',        prefix: 'Schnauzer-',        idleCase: 'Idle' },
  'Dog-5-Saint-Bernard':    { folder: 'Dog-5-Saint-Bernard',    prefix: 'Saint-Bernard-',    idleCase: 'Idle' },
  'Dog-6-Siberian-Husky':   { folder: 'Dog-6-Siberian-Husky',  prefix: 'Siberian-Husky-',   idleCase: 'Idle' },
};

// Messages shown in speech bubbles per state
const STATE_MESSAGES: Partial<Record<DogState | 'zoomies' | 'wake', string[]>> = {
  idle:         ['...', '👀', 'Husmeando~', '*bostezo*', '¿Dónde está mi pelota?', 'Hmm...', '🐾', '¿Hay snacks?'],
  walking:      ['Patrullando 🐕', 'Inspeccionando...', 'A ver qué hay por allá~', '¡Al rescate!'],
  barking:      ['¡Woof!', '¡AU AU!', '¡GUAU GUAU!', '¡EH TÚ!', '¡Hola amigo!', '¡Yo también quiero!'],
  itching:      ['Ahhhh...', '*rasca rasca*', 'Qué rico 😌', 'Ahhh justo ahí~', 'Mmm sí~'],
  stretching:   ['*se estira*', 'Aaah~ 🙆', 'Listooo~', 'Buenos días!', '*crack* Ajá~'],
  sitting:      ['👀', '¿Me llamaste?', '...', 'Aquí sentadito~', 'A sus órdenes'],
  'lying-down': ['Creo que... descansaré un rato', 'Uf, qué día...', '*se acomoda*'],
  sleeping:     ['Zzz...', '💤', 'Zzz 🐾', '*ronca suavecito*', 'Zzzzz~'],
  zoomies:      ['¡¡ZOOMIES!! 🚀', '¡WOO HOO!', '¡AGÁRRAME SI PUEDES!', '¡YAAAS!', '💨💨💨', '¡GO GO GO!'],
  wake:         ['¡Wuh?!', '*despierta*', '¿Ehh? ¿Me llamaste?', '¡Ya estoy!', '*parpadea*'],
};

@Component({
  selector: 'pt-dog-animation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #dogContainer
      class="absolute bottom-0 left-0 w-full h-2 pointer-events-none z-[30]"
    >
      <div
        #dogWrapper
        class="absolute bottom-[-30px] cursor-pointer pointer-events-auto"
        [class.opacity-0]="!isReady()"
        [class.opacity-100]="isReady()"
        [class.dog-zoomies]="isZoomies()"
        (click)="onDogClick()"
        [style.transform]="'translateX(' + currentPixelPosition() + 'px)'"
        [class.transition-transform]="isWalking()"
        [style.transition-duration]="moveDuration() + 's'"
        [style.transition-timing-function]="isZoomies() ? 'linear' : 'ease-in-out'"
      >
        <!-- Speech bubble -->
        @if (showTip()) {
          <div class="dog-bubble" [class.dog-bubble--sleep]="currentState() === 'sleeping' || currentState() === 'lying-down'">
            {{ currentTip() }}
          </div>
        }

        <!-- Sleeping zzz particles -->
        @if (currentState() === 'sleeping') {
          <div class="zzz-container">
            <span class="zzz zzz-1">z</span>
            <span class="zzz zzz-2">z</span>
            <span class="zzz zzz-3">Z</span>
          </div>
        }

        <!-- Sprite -->
        <div
          class="dog-sprite w-[100px] h-[100px]"
          [ngStyle]="dogStyle()"
          [style.transform]="currentDirection() === 'left' ? 'scaleX(-1)' : 'scaleX(1)'"
        ></div>
      </div>
    </div>
  `,
  styles: `
    @keyframes fade-in-bubble {
      from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.9); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0)  scale(1);   }
    }

    @keyframes zzz-float {
      0%   { opacity: 0;   transform: translateY(0)    scale(0.7); }
      30%  { opacity: 1; }
      100% { opacity: 0;   transform: translateY(-28px) scale(1.1); }
    }

    @keyframes zoomies-bounce {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-6px); }
    }

    .dog-bubble {
      position: absolute;
      bottom: 108px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: #1f2937;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 12px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      border: 1px solid #e5e7eb;
      animation: fade-in-bubble 0.25s ease-out;
      pointer-events: none;
      z-index: 40;
    }

    .dog-bubble::after {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      width: 8px;
      height: 8px;
      background: white;
      border-right: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }

    .dog-bubble--sleep {
      background: #ede9fe;
      border-color: #c4b5fd;
      color: #5b21b6;
    }

    .dog-bubble--sleep::after {
      background: #ede9fe;
      border-color: #c4b5fd;
    }

    .zzz-container {
      position: absolute;
      bottom: 95px;
      right: 5px;
      pointer-events: none;
    }

    .zzz {
      position: absolute;
      color: #8b5cf6;
      font-weight: 800;
      font-style: italic;
      animation: zzz-float 2s ease-in-out infinite;
    }

    .zzz-1 { font-size: 0.65rem; right: 0;   animation-delay: 0s;    }
    .zzz-2 { font-size: 0.8rem;  right: -8px; animation-delay: 0.7s; }
    .zzz-3 { font-size: 1rem;    right: -16px; animation-delay: 1.4s; }

    .dog-zoomies {
      animation: zoomies-bounce 0.15s ease-in-out infinite;
    }

    .dog-sprite {
      background-repeat: no-repeat;
      image-rendering: pixelated;
      transform: translateZ(0);
    }
  `,
})
export class DogAnimationComponent implements OnInit, OnDestroy {
  private store = inject(DashboardStore);
  private ngZone = inject(NgZone);

  @ViewChild('dogWrapper')   dogWrapper!:   ElementRef<HTMLDivElement>;
  @ViewChild('dogContainer') dogContainer!: ElementRef<HTMLDivElement>;

  private readonly ASSET_BASE    = 'assets_dog/Pet Dogs Pack/';
  private readonly ROTATION_KEY  = 'pt_dog_rotation_v2';
  private readonly SLEEP_DELAY   = 3 * 60 * 1000; // 3 min inactivity → sleep
  private readonly DOG_SIZE      = 100;

  // ── Signals ──────────────────────────────────────────────────────
  public currentBreed         = signal<DogBreed>('Dog-1-Golden-Retriever');
  public currentState         = signal<DogState>('idle');
  public currentDirection     = signal<'left' | 'right'>('right');
  public currentPixelPosition = signal<number>(0);
  public isReady              = signal<boolean>(false);
  public showTip              = signal<boolean>(false);
  public currentTip           = signal<string>('');
  public moveDuration         = signal<number>(0);
  public isZoomies            = signal<boolean>(false);

  // ── Computed ──────────────────────────────────────────────────────
  public isWalking = computed(() => this.currentState() === 'walking');

  public dogStyle = computed(() => {
    const breed  = BREEDS[this.currentBreed()];
    const action = ACTIONS.find(a => a.name === this.currentState());
    if (!action || !breed) return {};

    let fileName = STATE_TO_FILE[action.name];
    if (action.name === 'idle' && breed.idleCase === 'Idle') fileName = 'Idle';

    const url     = `assets_dog/Pet Dogs Pack/${breed.folder}/${breed.prefix}${fileName}.png`;
    const scale   = this.DOG_SIZE / 100;
    const endPos  = -(action.width * scale);

    return {
      'background-image': `url('${url}')`,
      'background-size':  `auto ${this.DOG_SIZE}px`,
      width:  `${this.DOG_SIZE}px`,
      height: `${this.DOG_SIZE}px`,
      '--sprite-width': `${endPos}px`,
      animation: action.frames > 1
        ? `play-sprite ${action.duration} steps(${action.frames}) infinite`
        : 'none',
    };
  });

  // ── Internals ─────────────────────────────────────────────────────
  private timeoutIds:      ReturnType<typeof setTimeout>[] = [];
  private sleepTimer:      ReturnType<typeof setTimeout> | null = null;
  private resizeObserver:  ResizeObserver | null = null;
  private isDestroyed      = false;
  private containerWidth   = 0;
  private lastClickTime    = 0;
  private clickCount       = 0;
  private clickResetTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMouseBarkAt  = 0;
  private isSleeping       = false;
  private energyWalkCount  = 0; // gets tired after many walks

  // ── Mouse proximity ───────────────────────────────────────────────
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.dogWrapper?.nativeElement || !this.isReady() || this.isSleeping) return;
    const rect       = this.dogWrapper.nativeElement.getBoundingClientRect();
    const dogCenterX = rect.left + rect.width / 2;
    const dist       = Math.abs(event.clientX - dogCenterX);

    // Face toward mouse when idle and nearby
    if (dist < 200 && this.currentState() === 'idle') {
      this.currentDirection.set(event.clientX > dogCenterX ? 'right' : 'left');
    }

    // Bark when mouse is very close (debounced 6s)
    if (dist < 60 && this.currentState() === 'idle') {
      const now = Date.now();
      if (now - this.lastMouseBarkAt > 6000) {
        this.lastMouseBarkAt = now;
        this.ngZone.run(() => this.reactToMouseProximity());
      }
    }
  }

  private reactToMouseProximity() {
    if (this.isDestroyed || this.isSleeping) return;
    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];
    this.currentState.set('barking');
    this.showStateMessage('barking');
    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      this.currentState.set('idle');
      this.scheduleNextAction(800);
    }, 1200);
    this.timeoutIds.push(id);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────
  constructor() {
    this.injectKeyframes();
    afterNextRender(() => { this.initResizeObserver(); });
  }

  async ngOnInit() {
    this.updateContainerMetrics();
    await this.initializeBreedRotation();
    if (!this.isDestroyed) {
      this.currentPixelPosition.set(100);
      this.scheduleNextAction();
      this.resetSleepTimer();
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.timeoutIds.forEach(clearTimeout);
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    if (this.clickResetTimer) clearTimeout(this.clickResetTimer);
    this.resizeObserver?.disconnect();
  }

  // ── Click handling ────────────────────────────────────────────────
  public onDogClick() {
    const now = Date.now();

    // Wake from sleep
    if (this.isSleeping) {
      this.wakeUp();
      return;
    }

    // Multi-click detection (3 rapid clicks = ZOOMIES)
    this.clickCount++;
    if (this.clickResetTimer) clearTimeout(this.clickResetTimer);
    this.clickResetTimer = setTimeout(() => { this.clickCount = 0; }, 600);

    if (this.clickCount >= 3) {
      this.clickCount = 0;
      this.triggerZoomies();
      return;
    }

    if (now - this.lastClickTime < 400) return;
    this.lastClickTime = now;

    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];
    this.showTip.set(false);
    this.resetSleepTimer();

    if (this.isWalking()) this.freezeMovement();

    const state = this.currentState();
    if (state === 'sleeping' || state === 'lying-down') {
      this.wakeUp();
    } else if (state === 'sitting') {
      this.currentState.set('barking');
      this.showStateMessage('barking');
      const id = setTimeout(() => {
        if (this.isDestroyed) return;
        this.currentState.set('idle');
        this.scheduleNextAction(500);
      }, 1200);
      this.timeoutIds.push(id);
    } else {
      this.currentState.set('sitting');
      this.showStateMessage('sitting');
    }
  }

  // ── Zoomies ───────────────────────────────────────────────────────
  private triggerZoomies(laps = 0) {
    if (this.isDestroyed) return;
    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];
    this.isSleeping = false;

    const goRight = laps % 2 === 0
      ? this.currentPixelPosition() < this.containerWidth / 2
      : !( this.currentPixelPosition() < this.containerWidth / 2 );
    const targetPos = goRight
      ? Math.max(0, this.containerWidth - 110)
      : 30;

    this.currentDirection.set(goRight ? 'right' : 'left');
    this.moveDuration.set(0.7);
    this.currentState.set('walking');
    this.isZoomies.set(true);
    this.currentPixelPosition.set(targetPos);

    if (laps === 0) this.showMessageDirect(this.randomFrom(STATE_MESSAGES['zoomies']!));

    const totalLaps = 2 + Math.floor(Math.random() * 3); // 2-4 laps
    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      if (laps + 1 < totalLaps) {
        this.triggerZoomies(laps + 1);
      } else {
        this.isZoomies.set(false);
        this.currentState.set('idle');
        this.energyWalkCount = 0;
        this.scheduleNextAction(1500);
        this.resetSleepTimer();
      }
    }, 750);
    this.timeoutIds.push(id);
  }

  // ── Sleep system ──────────────────────────────────────────────────
  private resetSleepTimer() {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    const delay = this.getTimeAwareSleepDelay();
    this.sleepTimer = setTimeout(() => {
      this.ngZone.run(() => this.enterSleepMode());
    }, delay);
  }

  private getTimeAwareSleepDelay(): number {
    const h = new Date().getHours();
    if (h >= 22 || h < 6) return 60_000;        // 1 min at night
    if (h >= 12 && h < 14) return 90_000;       // 1.5 min at lunch
    return this.SLEEP_DELAY;                      // 3 min normally
  }

  private enterSleepMode() {
    if (this.isDestroyed || this.isSleeping) return;
    this.isSleeping = true;
    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];
    this.isZoomies.set(false);

    this.currentState.set('lying-down');
    this.showStateMessage('lying-down');

    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      this.currentState.set('sleeping');
      this.showStateMessage('sleeping');
      // Auto wake after 2-5 min
      const wakeDelay = 120_000 + Math.random() * 180_000;
      const wId = setTimeout(() => {
        if (!this.isDestroyed) this.ngZone.run(() => this.wakeUp());
      }, wakeDelay);
      this.timeoutIds.push(wId);
    }, 2500);
    this.timeoutIds.push(id);
  }

  private wakeUp() {
    if (this.isDestroyed) return;
    this.isSleeping = false;
    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];

    this.showMessageDirect(this.randomFrom(STATE_MESSAGES['wake']!));
    this.currentState.set('stretching');

    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      this.currentState.set('idle');
      this.scheduleNextAction(1000);
      this.resetSleepTimer();
    }, 2000);
    this.timeoutIds.push(id);
  }

  // ── Behavior scheduler ────────────────────────────────────────────
  private scheduleNextAction(delayOverride?: number) {
    if (this.isDestroyed) return;
    const delay = delayOverride ?? (Math.random() * 2000 + 800);
    const id = setTimeout(() => this.decideNextMove(), delay);
    this.timeoutIds.push(id);
  }

  private decideNextMove() {
    if (this.isDestroyed || this.isSleeping) return;

    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 6;
    const isMorning = hour >= 6 && hour < 9;
    const tired = this.energyWalkCount > 4;

    const roll = Math.random();

    // Rare zoomies (2% chance, more likely in morning)
    if (roll < (isMorning ? 0.05 : 0.02) && !tired) {
      this.triggerZoomies();
      return;
    }

    // Tired → lie down
    if (tired && roll < 0.4) {
      this.energyWalkCount = 0;
      this.enterSleepMode();
      return;
    }

    if (isNight) {
      // Night: mostly idle or sleep
      if (roll < 0.5)      { this.currentState.set('idle');    this.scheduleNextAction(3000); }
      else if (roll < 0.7) { this.performMove(); }
      else                  { this.enterSleepMode(); }
      return;
    }

    if (roll < 0.45) {
      // Walk (maybe stretch first)
      if (Math.random() < 0.3) {
        this.currentState.set('stretching');
        this.showStateMessage('stretching');
        const id = setTimeout(() => {
          if (!this.isDestroyed) this.performMove();
        }, 1800);
        this.timeoutIds.push(id);
      } else {
        this.performMove();
      }
    } else if (roll < 0.6) {
      this.currentState.set('barking');
      this.showStateMessage('barking');
      this.scheduleNextAction(1500);
    } else if (roll < 0.72) {
      this.currentState.set('itching');
      this.showStateMessage('itching');
      this.scheduleNextAction(2000);
    } else if (roll < 0.82) {
      this.currentState.set('stretching');
      this.showStateMessage('stretching');
      this.scheduleNextAction(2200);
    } else {
      this.currentState.set('idle');
      // Occasionally show idle message
      if (Math.random() < 0.4) this.showStateMessage('idle');
      this.scheduleNextAction(2500);
    }
    this.resetSleepTimer();
  }

  // ── Movement ──────────────────────────────────────────────────────
  private performMove() {
    if (this.containerWidth === 0) this.updateContainerMetrics();

    const margin = 30;
    const maxPos = Math.max(0, this.containerWidth - margin - this.DOG_SIZE);
    const minPos = margin;

    const isCornerRun = Math.random() < 0.25;
    let targetPos: number;

    if (isCornerRun) {
      targetPos = this.currentPixelPosition() > this.containerWidth / 2 ? minPos : maxPos;
    } else {
      targetPos = Math.random() * (maxPos - minPos) + minPos;
      if (Math.abs(targetPos - this.currentPixelPosition()) < 100) {
        targetPos = this.currentPixelPosition() > this.containerWidth / 2
          ? minPos + 50 : maxPos - 50;
      }
    }

    const distance = Math.abs(targetPos - this.currentPixelPosition());
    const speed    = 55 + Math.random() * 20; // slight speed variation
    const duration = distance / speed;

    this.currentDirection.set(targetPos > this.currentPixelPosition() ? 'right' : 'left');
    this.moveDuration.set(duration);
    this.currentState.set('walking');
    this.currentPixelPosition.set(targetPos);
    this.energyWalkCount++;

    const id = setTimeout(() => {
      if (this.isDestroyed) return;

      // Corner behavior after corner run
      if (isCornerRun && Math.random() < 0.6) {
        const cornerAction = Math.random() < 0.5 ? 'itching' : 'barking';
        this.currentState.set(cornerAction);
        this.showStateMessage(cornerAction);
        const id2 = setTimeout(() => {
          if (!this.isDestroyed) {
            this.currentState.set('idle');
            this.scheduleNextAction(isCornerRun ? 60_000 + Math.random() * 60_000 : 100);
          }
        }, 1800);
        this.timeoutIds.push(id2);
      } else {
        this.currentState.set('idle');
        this.scheduleNextAction(isCornerRun ? 60_000 + Math.random() * 60_000 : 100);
      }
    }, duration * 1000);
    this.timeoutIds.push(id);
  }

  private freezeMovement() {
    if (!this.dogWrapper?.nativeElement) return;
    const rect          = this.dogWrapper.nativeElement.getBoundingClientRect();
    const containerRect = this.dogContainer.nativeElement.getBoundingClientRect();
    this.currentPixelPosition.set(rect.left - containerRect.left);
    this.moveDuration.set(0);
  }

  // ── Speech bubbles ────────────────────────────────────────────────
  private showStateMessage(state: DogState | 'zoomies' | 'wake') {
    const msgs = STATE_MESSAGES[state];
    if (!msgs) return;
    this.showMessageDirect(this.randomFrom(msgs));
  }

  private showMessageDirect(msg: string) {
    this.showTip.set(false);
    setTimeout(() => {
      if (this.isDestroyed) return;
      this.currentTip.set(msg);
      this.showTip.set(true);
      const id = setTimeout(() => {
        if (!this.isDestroyed) this.showTip.set(false);
      }, 3000);
      this.timeoutIds.push(id);
    }, 50);
  }

  private randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── Breed rotation ────────────────────────────────────────────────
  private async initializeBreedRotation(): Promise<void> {
    if (typeof window === 'undefined') return;
    const ONE_HOUR   = 60 * 60 * 1000;
    const breedKeys  = Object.keys(BREEDS) as DogBreed[];
    try {
      const stored = localStorage.getItem(this.ROTATION_KEY);
      let data     = stored ? JSON.parse(stored) : null;
      const now    = Date.now();
      if (!data || now - data.timestamp > ONE_HOUR) {
        let newIndex = Math.floor(Math.random() * breedKeys.length);
        if (data && breedKeys.length > 1) {
          while (breedKeys[newIndex] === data.breed) {
            newIndex = Math.floor(Math.random() * breedKeys.length);
          }
        }
        data = { breed: breedKeys[newIndex], timestamp: now };
        localStorage.setItem(this.ROTATION_KEY, JSON.stringify(data));
      }
      await this.loadBreed(data.breed || breedKeys[0]);
      if (!this.isDestroyed) this.isReady.set(true);

      const timeRemaining = Math.max(0, ONE_HOUR - (now - data.timestamp));
      const id = setTimeout(() => {
        this.ngZone.run(() => this.initializeBreedRotation());
      }, timeRemaining + 1000);
      this.timeoutIds.push(id);
    } catch {
      await this.loadBreed('Dog-1-Golden-Retriever');
      if (!this.isDestroyed) this.isReady.set(true);
    }
  }

  private async loadBreed(breed: DogBreed): Promise<void> {
    this.currentBreed.set(breed);
    const config = BREEDS[breed];
    const urls   = ACTIONS.map(action => {
      let fileName = STATE_TO_FILE[action.name];
      if (action.name === 'idle' && config.idleCase === 'Idle') fileName = 'Idle';
      return `assets_dog/Pet Dogs Pack/${config.folder}/${config.prefix}${fileName}.png`;
    });
    await Promise.all(urls.map(url => new Promise<void>(resolve => {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = url;
    })));
  }

  // ── Container metrics ─────────────────────────────────────────────
  private initResizeObserver() {
    if (!this.dogContainer?.nativeElement) return;
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.ngZone.run(() => {
          this.containerWidth = entry.contentRect.width;
          this.clampPosition();
        });
      }
    });
    this.resizeObserver.observe(this.dogContainer.nativeElement);
  }

  private updateContainerMetrics() {
    this.containerWidth = this.dogContainer?.nativeElement?.clientWidth
      ?? (typeof window !== 'undefined' ? window.innerWidth : 0);
  }

  private clampPosition() {
    const max = this.containerWidth - 110;
    const pos = this.currentPixelPosition();
    if (pos > max)     this.currentPixelPosition.set(max);
    else if (pos < 0)  this.currentPixelPosition.set(0);
  }

  // ── Keyframes injection ───────────────────────────────────────────
  private injectKeyframes() {
    if (typeof document === 'undefined') return;
    const styleId = 'dog-sprite-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes play-sprite {
          from { background-position-x: 0px; }
          to   { background-position-x: var(--sprite-width); }
        }
      `;
      document.head.appendChild(style);
    }
  }
}
