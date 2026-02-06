import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  effect,
} from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';

// Types
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

// Mapping states to file suffixes
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

// Sprite configuration - frame counts and dimensions
const SPRITE_CONFIG: Record<DogState, { frames: number; duration: number }> = {
  idle: { frames: 10, duration: 1.2 },
  walking: { frames: 8, duration: 0.6 },
  sitting: { frames: 1, duration: 0 },
  barking: { frames: 3, duration: 0.6 },
  itching: { frames: 2, duration: 0.8 },
  stretching: { frames: 10, duration: 1.2 },
  'lying-down': { frames: 1, duration: 0 },
  sleeping: { frames: 1, duration: 0 },
};

const ALL_STATES: DogState[] = [
  'idle',
  'walking',
  'sitting',
  'barking',
  'itching',
  'stretching',
  'lying-down',
  'sleeping',
];

const FRAME_WIDTH = 100;

@Component({
  selector: 'pt-dog-animation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #dogContainer
      class="dog-container absolute bottom-0 left-0 w-full h-1 pointer-events-none z-[30]"
    >
      <div
        #dogWrapper
        class="absolute bottom-[-19px] cursor-pointer pointer-events-auto dog-wrapper"
        [class.wrapper-ready]="isReady()"
        (click)="onDogClick()"
        [style.transform]="'translateX(' + currentPixelPosition() + 'px)'"
        [class.is-moving]="isWalking()"
        [style.--move-duration]="moveDuration() + 's'"
      >
        @if (showTip()) {
        <div
          class="absolute top-[50px] left-1/2 -translate-x-1/2 bg-white text-gray-800 text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-[20] opacity-0 animate-fade-in-up border border-gray-100"
        >
          {{ currentTip() }}
          <div
            class="absolute top-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rotate-45 border-l border-t border-gray-100"
          ></div>
        </div>
        }

        <div
          class="sprites-container w-[50px] h-[50px] relative"
          [class.flipped]="currentDirection() === 'left'"
        >
          @for (state of allStates; track state) {
          <div
            class="sprite-layer absolute inset-0"
            [class.layer-active]="currentState() === state"
            [attr.data-state]="state"
          >
            <div
              class="dog-sprite w-full h-full"
              [style.background-image]="getSpriteUrl(state)"
              [class.sprite-static]="SPRITE_CONFIG[state].frames === 1"
              [class.sprite-animated]="SPRITE_CONFIG[state].frames > 1"
              [style.--sprite-frames]="SPRITE_CONFIG[state].frames"
              [style.--sprite-duration]="SPRITE_CONFIG[state].duration + 's'"
              [style.--sprite-position]="'-' + (SPRITE_CONFIG[state].frames * FRAME_WIDTH) + 'px'"
            ></div>
          </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translate(-50%, 10px); }
      100% { opacity: 1; transform: translate(-50%, 0); }
    }

    .animate-fade-in-up {
      animation: fade-in-up 0.3s ease-out forwards;
    }

    .dog-wrapper {
      will-change: transform;
      opacity: 0;
      transition: opacity 0.2s ease-out;
    }

    .dog-wrapper.wrapper-ready {
      opacity: 1;
    }

    .dog-wrapper.is-moving {
      transition: transform var(--move-duration, 0s) linear;
    }

    .sprites-container {
      transform: translateZ(0);
      backface-visibility: hidden;
      will-change: transform;
      transition: transform 0.15s ease-out;
    }

    .sprites-container.flipped {
      transform: scaleX(-1) translateZ(0);
    }

    .sprite-layer {
      opacity: 0;
      visibility: hidden;
      transition: none;
      pointer-events: none;
    }

    .sprite-layer.layer-active {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    .dog-sprite {
      background-repeat: no-repeat;
      background-size: auto 100%;
      image-rendering: pixelated;
      transform: translateZ(0);
    }

    .dog-sprite.sprite-static {
      background-position: 0 0;
    }

    .dog-sprite.sprite-animated {
      animation: sprite-play var(--sprite-duration) steps(var(--sprite-frames)) infinite;
    }

    @keyframes sprite-play {
      0% {
        background-position: 0 0;
      }
      100% {
        background-position: var(--sprite-position) 0;
      }
    }
  `,
})
export class DogAnimationComponent implements OnInit, OnDestroy {
  private store = inject(DashboardStore);
  private ngZone = inject(NgZone);

  @ViewChild('dogWrapper') dogWrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('dogContainer') dogContainer!: ElementRef<HTMLDivElement>;

  public readonly allStates = ALL_STATES;
  public readonly SPRITE_CONFIG = SPRITE_CONFIG;
  public readonly FRAME_WIDTH = FRAME_WIDTH;

  private readonly BREEDS: DogBreed[] = [
    'Dog-1-Golden-Retriever',
    'Dog-2-Akita',
    'Dog-3-Great-Dane',
    'Dog-4-Schnauzer',
    'Dog-5-Saint-Bernard',
    'Dog-6-Siberian-Husky',
  ];
  private readonly ASSET_BASE = 'assets_dog/Pet%20Dogs%20Pack/';
  private readonly ROTATION_KEY = 'pt_dog_rotation_v2';

  // Signals
  public currentBreed = signal<DogBreed>('Dog-1-Golden-Retriever');
  public currentState = signal<DogState>('idle');
  public currentDirection = signal<'left' | 'right'>('right');
  public currentPixelPosition = signal<number>(0);
  public isReady = signal<boolean>(false);

  public showTip = signal<boolean>(false);
  public currentTip = signal<string>('');
  public moveDuration = signal<number>(0);

  // Computed
  public isWalking = computed(() => this.currentState() === 'walking');

  public canShowTips = computed(() => {
    const employee = this.store.currentEmployee();
    const allowed = ['Gerente', 'Desarrollador', 'Soporte IT'];
    return employee?.position?.name
      ? allowed.includes(employee.position.name)
      : false;
  });

  // Internal State
  private spriteUrlCache = new Map<DogState, string>();
  private loadedImages = new Set<string>();
  private timeoutIds: ReturnType<typeof setTimeout>[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed = false;
  private containerWidth = 0;
  private lastClickTime = 0;
  private lastStateChange = 0;
  private stateChangeCount = 0;

  private tips = [
    'Si encuentras un bug, notifícalo a IT',
    'Recuerda marcar tu entrada',
    'Recuerda marcar tu salida',
    '¡Actualiza la pantalla de vez en cuando!',
    '¡Toma un descanso!',
    'Hidrátate bien',
    'Revisa tus horarios',
    '¡No olvides tu almuerzo!',
  ];

  constructor() {
    // DEBUG: Track all signal changes
    effect(() => {
      const state = this.currentState();
      const now = Date.now();
      const timeSinceLastChange = now - this.lastStateChange;
      this.lastStateChange = now;
      this.stateChangeCount++;
      
      console.log(`[DOG DEBUG] State changed to: "${state}" | Count: ${this.stateChangeCount} | Time since last: ${timeSinceLastChange}ms`);
      
      if (timeSinceLastChange < 100) {
        console.warn(`[DOG DEBUG] ⚠️ RAPID STATE CHANGE! Only ${timeSinceLastChange}ms since last change`);
      }
    });

    // DEBUG: Track isReady changes
    effect(() => {
      const ready = this.isReady();
      console.log(`[DOG DEBUG] isReady changed to: ${ready}`);
    });

    // DEBUG: Track position changes
    effect(() => {
      const pos = this.currentPixelPosition();
      console.log(`[DOG DEBUG] Position changed to: ${pos}px`);
    });

    afterNextRender(() => {
      this.initResizeObserver();
    });
  }

  async ngOnInit() {
    console.log('[DOG DEBUG] ngOnInit called');
    this.updateContainerMetrics();
    await this.initializeBreedRotation();

    if (!this.isDestroyed) {
      console.log('[DOG DEBUG] Setting initial position and starting animation loop');
      this.currentPixelPosition.set(100);
      this.scheduleNextAction();
    }
  }

  ngOnDestroy() {
    console.log('[DOG DEBUG] ngOnDestroy called - cleaning up');
    this.isDestroyed = true;
    this.timeoutIds.forEach(clearTimeout);
    this.resizeObserver?.disconnect();
  }

  public getSpriteUrl(state: DogState): string {
    const url = this.spriteUrlCache.get(state) || '';
    return url;
  }

  private buildSpriteUrlCache(breed: DogBreed) {
    console.log(`[DOG DEBUG] Building sprite URL cache for breed: ${breed}`);
    const breedName = breed.split('-').slice(2).join('-');
    this.spriteUrlCache.clear();

    ALL_STATES.forEach((state) => {
      const action = STATE_TO_FILE[state];
      const url = `url('${this.ASSET_BASE}${encodeURIComponent(
        breed
      )}/${encodeURIComponent(breedName)}-${action}.png')`;
      this.spriteUrlCache.set(state, url);
    });
    
    console.log(`[DOG DEBUG] Sprite URLs cached:`, Object.fromEntries(this.spriteUrlCache));
  }

  private async preloadBreedImages(breed: DogBreed): Promise<void> {
    console.log(`[DOG DEBUG] Preloading images for breed: ${breed}`);
    if (typeof window === 'undefined') return;

    const breedName = breed.split('-').slice(2).join('-');
    const imageUrls: string[] = [];

    ALL_STATES.forEach((state) => {
      const action = STATE_TO_FILE[state];
      const src = `${this.ASSET_BASE}${breed}/${breedName}-${action}.png`;
      imageUrls.push(src);
    });

    console.log(`[DOG DEBUG] URLs to preload:`, imageUrls);

    const loadPromises = imageUrls.map((src) => {
      if (this.loadedImages.has(src)) {
        console.log(`[DOG DEBUG] Image already cached: ${src}`);
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const img = new Image();
        
        img.onload = () => {
          console.log(`[DOG DEBUG] ✅ Image loaded: ${src}`);
          this.loadedImages.add(src);
          resolve();
        };

        img.onerror = () => {
          console.warn(`[DOG DEBUG] ❌ Failed to load: ${src}`);
          resolve();
        };

        img.src = src;
      });
    });

    await Promise.all(loadPromises);
    console.log(`[DOG DEBUG] All images preloaded for ${breed}`);
  }

  private async initializeBreedRotation(): Promise<void> {
    console.log('[DOG DEBUG] initializeBreedRotation started');
    if (typeof window === 'undefined') return;

    const ONE_HOUR = 60 * 60 * 1000;

    try {
      const stored = localStorage.getItem(this.ROTATION_KEY);
      let data = stored ? JSON.parse(stored) : null;
      const now = Date.now();

      if (!data || now - data.timestamp > ONE_HOUR) {
        let newIndex = Math.floor(Math.random() * this.BREEDS.length);

        if (data && this.BREEDS.length > 1) {
          while (newIndex === data.index) {
            newIndex = Math.floor(Math.random() * this.BREEDS.length);
          }
        }

        data = { index: newIndex, timestamp: now };
        localStorage.setItem(this.ROTATION_KEY, JSON.stringify(data));
      }

      const selected = this.BREEDS[data.index] || this.BREEDS[0];
      console.log(`[DOG DEBUG] Selected breed: ${selected}`);

      this.currentBreed.set(selected);
      this.buildSpriteUrlCache(selected);
      await this.preloadBreedImages(selected);

      if (!this.isDestroyed) {
        console.log('[DOG DEBUG] Setting isReady to TRUE');
        this.isReady.set(true);
      }

      const timePassed = now - data.timestamp;
      const timeRemaining = Math.max(0, ONE_HOUR - timePassed);

      const nextCheck = setTimeout(() => {
        this.ngZone.run(() => this.initializeBreedRotation());
      }, timeRemaining + 1000);
      this.timeoutIds.push(nextCheck);
    } catch (e) {
      console.error('[DOG DEBUG] Error in breed rotation:', e);
      const fallback = 'Dog-1-Golden-Retriever';
      this.currentBreed.set(fallback);
      this.buildSpriteUrlCache(fallback);
      await this.preloadBreedImages(fallback);

      if (!this.isDestroyed) {
        this.isReady.set(true);
      }
    }
  }

  private initResizeObserver() {
    console.log('[DOG DEBUG] initResizeObserver called');
    if (!this.dogContainer?.nativeElement) {
      console.warn('[DOG DEBUG] No dogContainer found!');
      return;
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.ngZone.run(() => {
          const oldWidth = this.containerWidth;
          this.containerWidth = entry.contentRect.width;
          console.log(`[DOG DEBUG] Container resized: ${oldWidth} -> ${this.containerWidth}px`);
          this.clampPosition();
        });
      }
    });

    this.resizeObserver.observe(this.dogContainer.nativeElement);
  }

  private updateContainerMetrics() {
    if (this.dogContainer?.nativeElement) {
      this.containerWidth = this.dogContainer.nativeElement.clientWidth;
    } else if (typeof window !== 'undefined') {
      this.containerWidth = window.innerWidth;
    }
    console.log(`[DOG DEBUG] Container metrics updated: ${this.containerWidth}px`);
  }

  private clampPosition() {
    const max = this.containerWidth - 60;
    const oldPos = this.currentPixelPosition();
    let newPos = oldPos;
    
    if (oldPos > max) {
      newPos = max;
    } else if (oldPos < 0) {
      newPos = 0;
    }
    
    if (newPos !== oldPos) {
      console.log(`[DOG DEBUG] Position clamped: ${oldPos} -> ${newPos}`);
      this.currentPixelPosition.set(newPos);
    }
  }

  private freezeMovement() {
    console.log('[DOG DEBUG] freezeMovement called');
    if (!this.dogWrapper?.nativeElement) return;

    const rect = this.dogWrapper.nativeElement.getBoundingClientRect();
    const containerRect =
      this.dogContainer.nativeElement.getBoundingClientRect();

    const relativeLeft = rect.left - containerRect.left;

    console.log(`[DOG DEBUG] Freezing at position: ${relativeLeft}px`);
    this.currentPixelPosition.set(relativeLeft);
    this.moveDuration.set(0);
  }

  public onDogClick() {
    const now = Date.now();
    if (now - this.lastClickTime < 1500) {
      console.log('[DOG DEBUG] Click ignored - too soon');
      return;
    }
    this.lastClickTime = now;
    console.log('[DOG DEBUG] Dog clicked!');

    console.log(`[DOG DEBUG] Clearing ${this.timeoutIds.length} timeouts`);
    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];
    this.showTip.set(false);

    if (this.isWalking()) {
      this.freezeMovement();
    }

    const current = this.currentState();
    const isSitting = current === 'sitting';

    console.log(`[DOG DEBUG] Current state: ${current}, isSitting: ${isSitting}`);

    if (isSitting) {
      console.log('[DOG DEBUG] Transition: sitting -> barking -> idle');
      this.currentState.set('barking');

      const id = setTimeout(() => {
        if (this.isDestroyed) return;
        console.log('[DOG DEBUG] Bark timeout - returning to idle');
        this.currentState.set('idle');
        this.scheduleNextAction(500);
      }, 1000);
      this.timeoutIds.push(id);
    } else {
      console.log('[DOG DEBUG] Transition to sitting');
      this.currentState.set('sitting');
    }
  }

  private scheduleNextAction(delayOverride?: number) {
    if (this.isDestroyed) return;
    const delay = delayOverride ?? Math.random() * 2000 + 1000;
    console.log(`[DOG DEBUG] Scheduling next action in ${delay}ms`);
    const id = setTimeout(() => this.decideNextMove(), delay);
    this.timeoutIds.push(id);
  }

  private decideNextMove() {
    if (this.isDestroyed) return;
    const roll = Math.random();

    console.log(`[DOG DEBUG] decideNextMove - roll: ${roll.toFixed(3)}`);

    if (roll < 0.6) {
      console.log('[DOG DEBUG] Decision: WALK');
      this.performMove();
    } else if (roll < 0.8) {
      console.log('[DOG DEBUG] Decision: BARK');
      this.currentState.set('barking');
      this.scheduleNextAction(1500);
    } else {
      console.log('[DOG DEBUG] Decision: IDLE');
      this.currentState.set('idle');
      this.scheduleNextAction(2000);
    }
  }

  private performMove() {
    console.log('[DOG DEBUG] performMove started');
    if (this.containerWidth === 0) this.updateContainerMetrics();

    const margin = 30;
    const maxPos = Math.max(0, this.containerWidth - margin - 50);
    const minPos = margin;

    const isCornerRun = Math.random() < 0.25;
    let targetPos: number;

    if (isCornerRun) {
      targetPos =
        this.currentPixelPosition() > this.containerWidth / 2 ? minPos : maxPos;
    } else {
      targetPos = Math.random() * (maxPos - minPos) + minPos;

      if (Math.abs(targetPos - this.currentPixelPosition()) < 100) {
        targetPos =
          this.currentPixelPosition() > this.containerWidth / 2
            ? minPos + 50
            : maxPos - 50;
      }
    }

    const distance = Math.abs(targetPos - this.currentPixelPosition());
    const speed = 50;
    const duration = distance / speed;

    const direction =
      targetPos > this.currentPixelPosition() ? 'right' : 'left';

    console.log(`[DOG DEBUG] Move: ${this.currentPixelPosition()}px -> ${targetPos}px (${direction}), duration: ${duration}s`);

    this.currentDirection.set(direction);
    this.moveDuration.set(duration);
    this.currentState.set('walking');
    this.currentPixelPosition.set(targetPos);

    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      console.log('[DOG DEBUG] Walk completed - returning to idle');
      this.currentState.set('idle');

      if (isCornerRun) {
        const minutesInMillis = 1000 * 60;
        const waitTime = minutesInMillis + Math.random() * minutesInMillis;
        console.log(`[DOG DEBUG] Corner run - waiting ${waitTime}ms`);
        this.scheduleNextAction(waitTime);
      } else {
        this.scheduleNextAction(100);
      }
    }, duration * 1000);
    this.timeoutIds.push(id);
  }
}
