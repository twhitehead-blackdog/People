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
} from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';

// Types
type DogState =
  | 'idle'
  | 'walking'
  // | 'running' -- disabled for stability
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
  // running: 'walk', -- disabled for stability
  sitting: 'sitting',
  barking: 'bark',
  itching: 'itching',
  stretching: 'stretching',
  'lying-down': 'lying-down',
  sleeping: 'sleeping',
};

// List of all states for iteration
const ALL_STATES: DogState[] = [
  'idle',
  'walking',
  // 'running', -- disabled for stability
  'sitting',
  'barking',
  'itching',
  'stretching',
  'lying-down',
  'sleeping',
];

@Component({
  selector: 'pt-dog-animation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Container: z-index 30 to sit above standard header but below modals -->
    <div
      #dogContainer
      class="dog-container absolute bottom-0 left-0 w-full h-1 pointer-events-none z-[30] overflow-visible"
    >
      <!-- Movable Wrapper -->
      <div
        #dogWrapper
        class="absolute bottom-[-19px] cursor-pointer pointer-events-auto dog-wrapper overflow-visible"
        (click)="onDogClick()"
        [style.transform]="'translateX(' + currentPixelPosition() + 'px)'"
        [class.is-moving]="isWalkingOrRunning()"
        [style.--move-duration]="moveDuration() + 's'"
      >
        <!-- Pixel Art Dialog Box (appears below the dog) -->
        @if (showTip()) {
        <div
          class="pixel-dialog-container"
          [style.left.px]="dialogLeftPosition()"
        >
          <!-- Pixel Arrow pointing up -->
          <div class="pixel-arrow" [style.margin-left.px]="arrowOffset()"></div>
          <div class="pixel-dialog">
            <div class="pixel-dialog-inner">
              <span class="pixel-text">{{ currentTip() }}</span>
            </div>
          </div>
        </div>
        }

        <!-- 
          Sprites Container 
          - All sprites are present in DOM.
          - Visibility is toggled via opacity transition.
        -->
        <div
          class="sprites-container w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] relative"
          [class.flipped]="currentDirection() === 'left'"
        >
          @for (state of allStates; track state) {
          <div
            class="dog-sprite absolute inset-0"
            [style.background-image]="getSpriteUrl(state)"
            [class.sprite-visible]="currentState() === state"
            [class.animate-walk]="state === 'walking'"
            [class.animate-idle]="state === 'idle'"
            [class.animate-sit]="state === 'sitting'"
            [class.animate-bark]="state === 'barking'"
            [class.animate-itch]="state === 'itching'"
            [class.animate-stretch]="state === 'stretching'"
            [class.animate-sleep]="state === 'sleeping'"
            [class.animate-lie]="state === 'lying-down'"
          ></div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    /* ========== PIXEL ART DIALOG ========== */
    
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

    .pixel-dialog-container {
      position: fixed;
      bottom: 60px;
      z-index: 100;
      animation: pixel-pop-in 0.15s steps(3) forwards;
    }

    .pixel-arrow {
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid #e8e8e8;
      image-rendering: pixelated;
      position: relative;
    }

    .pixel-arrow::after {
      content: '';
      position: absolute;
      top: 4px;
      left: -6px;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 6px solid #1a1a2e;
    }

    .pixel-dialog {
      /* Pixel-perfect border using box-shadow layers */
      background: #1a1a2e;
      padding: 3px;
      image-rendering: pixelated;
      box-shadow:
        /* Outer white border */
        -4px 0 0 0 #e8e8e8,
        4px 0 0 0 #e8e8e8,
        0 -4px 0 0 #e8e8e8,
        0 4px 0 0 #e8e8e8,
        /* Corner pixels */
        -4px -4px 0 0 #1a1a2e,
        4px -4px 0 0 #1a1a2e,
        -4px 4px 0 0 #1a1a2e,
        4px 4px 0 0 #1a1a2e,
        /* Inner shadow for depth */
        inset 0 0 0 2px #3a3a5e;
    }

    .pixel-dialog-inner {
      background: linear-gradient(180deg, #2a2a4e 0%, #1a1a2e 100%);
      padding: 10px 14px;
      min-width: 180px;
      max-width: 280px;
    }

    .pixel-text {
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      line-height: 1.8;
      color: #f0f0f0;
      text-shadow: 1px 1px 0 #000;
      display: block;
      word-wrap: break-word;
      white-space: normal;
      animation: pixel-typing 0.5s steps(20) forwards;
    }

    /* Arrow pointing UP */
    .pixel-arrow {
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid #e8e8e8;
      margin: 0 auto;
      image-rendering: pixelated;
      position: relative;
    }

    .pixel-arrow::after {
      content: '';
      position: absolute;
      top: 4px;
      left: -6px;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 6px solid #1a1a2e;
    }

    @keyframes pixel-pop-in {
      0% {
        opacity: 0;
        transform: translateX(-50%) scale(0.8);
      }
      50% {
        opacity: 1;
        transform: translateX(-50%) scale(1.05);
      }
      100% {
        opacity: 1;
        transform: translateX(-50%) scale(1);
      }
    }

    @keyframes pixel-typing {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }

    /* ========== ORIGINAL ANIMATIONS ========== */

    /* 
      1. Wrapper movement 
         Using transform: translateX instead of left for better performance 
    */
    .dog-wrapper {
      will-change: transform;
      contain: layout style;
      transition: none; /* Instant snap by default */
    }

    .dog-wrapper.is-moving {
      transition: transform var(--move-duration, 0s) linear;
    }

    /* 
      2. Sprites Container 
         GPU layer promotion for the whole group 
    */
    .sprites-container {
      transform: translateZ(0);
      backface-visibility: hidden;
      will-change: transform;
    }
    .sprites-container.flipped {
      transform: scaleX(-1) translateZ(0);
    }

    /* 
      3. Base Sprite 
         - Opacity logic to eliminate flicker.
         - 'visibility' is transitioned with a delay so it stays visible while fading out.
    */
    .dog-sprite {
      background-repeat: no-repeat;
      background-size: cover;
      image-rendering: pixelated;
      
      opacity: 0;
      visibility: hidden;
      
      transform: translateZ(0);
      will-change: opacity;

      /* Fade out: opacity 1->0 in 150ms. Visibility becomes hidden AFTER 150ms. */
      transition: opacity 150ms linear, visibility 0s linear 150ms;
    }

    /* Visible State */
    .dog-sprite.sprite-visible {
      opacity: 1;
      visibility: visible;
      /* Fade in: opacity 0->1 in 150ms. Visibility becomes visible IMMEDIATELY (0s delay). */
      transition: opacity 150ms linear, visibility 0s linear 0s;
    }

    /* --- Keyframes --- */

    /* 4-Frame Strip (48px width -> -192px total) */
    @keyframes play-strip-4 {
      100% { background-position: -192px 0; } 
    }
    @keyframes play-strip-4-mobile {
      100% { background-position: -168px 0; } 
    }

    /* 2-Frame Strip (48px width -> -96px total) */
    @keyframes play-strip-2 {
      100% { background-position: -96px 0; } 
    }
    @keyframes play-strip-2-mobile {
      100% { background-position: -84px 0; } 
    }

    /* --- Animation Assignments --- */

    /* 4-frames: walk, idle, itch, stretch */
    .animate-walk,
    .animate-itch,
    .animate-stretch,
    .animate-idle {
      animation: play-strip-4 0.8s steps(4) infinite;
      animation-play-state: running;
    }

    /* Specific durations */
    .animate-walk { animation-duration: 0.6s; }
    .animate-idle { animation-duration: 1.2s; }
    .animate-itch { animation-duration: 0.8s; }

    /* Static States (Single Frame) */
    /* Sit, Lie, Sleep (static for stability) */
    .animate-sit,
    .animate-lie,
    .animate-header, 
    .animate-sleep {
      background-position: 0 0;
      animation: none;
    }

    /* Bark uses 4-frame animation */
    .animate-bark {
      animation: play-strip-4 0.6s steps(4) infinite;
      animation-play-state: running;
    }

    @media (max-width: 640px) {
      .animate-walk,
      .animate-itch,
      .animate-stretch,
      .animate-idle,
      .animate-bark {
        animation-name: play-strip-4-mobile;
      }
    }
  `,
})
export class DogAnimationComponent implements OnInit, OnDestroy {
  private store = inject(DashboardStore);
  private ngZone = inject(NgZone);

  @ViewChild('dogWrapper') dogWrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('dogContainer') dogContainer!: ElementRef<HTMLDivElement>;

  // Public readonly for template
  public readonly allStates = ALL_STATES;

  // Configuration
  private readonly BREEDS: DogBreed[] = [
    'Dog-1-Golden-Retriever',
    'Dog-2-Akita',
    'Dog-3-Great-Dane',
    'Dog-4-Schnauzer',
    'Dog-5-Saint-Bernard',
    'Dog-6-Siberian-Husky',
  ];
  private readonly ASSET_BASE = 'assets_dog/Pet%20Dogs%20Pack/'; // Encoded spaces
  private readonly ROTATION_KEY = 'pt_dog_rotation_v2';

  // Signals
  public currentBreed = signal<DogBreed>('Dog-1-Golden-Retriever');
  public currentState = signal<DogState>('idle');
  public currentDirection = signal<'left' | 'right'>('right');
  public currentPixelPosition = signal<number>(0); // Applies to translateX

  public showTip = signal<boolean>(false);
  public currentTip = signal<string>('');
  public moveDuration = signal<number>(0);

  // Computed
  public isWalkingOrRunning = computed(() => this.currentState() === 'walking');

  // Dialog width constant
  private readonly DIALOG_WIDTH = 220;
  private readonly DIALOG_PADDING = 20;

  // Calculate dialog left position to keep it on screen
  public dialogLeftPosition = computed(() => {
    const dogPos = this.currentPixelPosition() + 24; // Center of dog (48px / 2)
    const screenWidth =
      typeof window !== 'undefined' ? window.innerWidth : 1000;
    const halfDialog = this.DIALOG_WIDTH / 2;

    // Ideal position: centered on dog
    let dialogLeft = dogPos - halfDialog;

    // Clamp to keep dialog on screen
    const minLeft = this.DIALOG_PADDING;
    const maxLeft = screenWidth - this.DIALOG_WIDTH - this.DIALOG_PADDING;

    dialogLeft = Math.max(minLeft, Math.min(maxLeft, dialogLeft));

    return dialogLeft;
  });

  // Calculate arrow offset to point at dog
  public arrowOffset = computed(() => {
    const dogPos = this.currentPixelPosition() + 24; // Center of dog
    const dialogLeft = this.dialogLeftPosition();

    // Arrow should point to dog center relative to dialog
    const arrowPos = dogPos - dialogLeft - 8; // 8px is half arrow width

    // Clamp arrow within dialog bounds
    return Math.max(12, Math.min(this.DIALOG_WIDTH - 28, arrowPos));
  });

  public canShowTips = computed(() => {
    const employee = this.store.currentEmployee();
    const allowed = ['Gerente de Tienda', 'Desarrollador', 'Soporte IT'];
    return employee?.position?.name
      ? allowed.includes(employee.position.name)
      : false;
  });

  // Internal State
  private spriteUrlCache = new Map<DogState, string>();
  private timeoutIds: ReturnType<typeof setTimeout>[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed = false;
  private containerWidth = 0;
  private lastClickTime = 0;

  // Tips list
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
    // Ensure rotation check happens on init
    afterNextRender(() => {
      // Safe to use browser APIs
      this.initResizeObserver();
    });
  }

  ngOnInit() {
    this.updateContainerMetrics(); // Initial guess
    this.initializeBreedRotation(); // Start logic

    // Start animation loop
    this.currentPixelPosition.set(100); // Safe start
    this.scheduleNextAction();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.timeoutIds.forEach(clearTimeout);
    this.resizeObserver?.disconnect();
  }

  // --- Asset Management ---

  public getSpriteUrl(state: DogState): string {
    return this.spriteUrlCache.get(state) || '';
  }

  private buildSpriteUrlCache(breed: DogBreed) {
    const breedName = breed.split('-').slice(2).join('-');
    this.spriteUrlCache.clear();

    // Use encoded base path
    ALL_STATES.forEach((state) => {
      const action = STATE_TO_FILE[state];
      // Double check encoding for the filename part just in case
      const url = `url('${this.ASSET_BASE}${encodeURIComponent(
        breed
      )}/${encodeURIComponent(breedName)}-${action}.png')`;
      this.spriteUrlCache.set(state, url);
    });
  }

  private async preloadBreedImages(breed: DogBreed) {
    if (typeof window === 'undefined') return;

    const breedName = breed.split('-').slice(2).join('-');
    const promises: Promise<void>[] = [];

    ALL_STATES.forEach((state) => {
      const action = STATE_TO_FILE[state];
      // Construct exact path used in CSS
      const src = `${this.ASSET_BASE}${breed}/${breedName}-${action}.png`; // Browser handles spaces in src usually, but better safe

      const img = new Image();
      img.src = src;

      if ((img as any).decode) {
        promises.push(img.decode().catch(() => {})); // decode() ensures frame is ready
      } else {
        // Fallback for older browsers
        promises.push(
          new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
        );
      }
    });

    // We don't block UI but we start fetching everything
    await Promise.all(promises);
  }

  // --- Rotation Logic ---

  private initializeBreedRotation() {
    if (typeof window === 'undefined') return;

    const ONE_HOUR = 60 * 60 * 1000;

    const checkRotation = () => {
      if (this.isDestroyed) return;

      try {
        const stored = localStorage.getItem(this.ROTATION_KEY);
        let data = stored ? JSON.parse(stored) : null;
        const now = Date.now();

        if (!data || now - data.timestamp > ONE_HOUR) {
          // Time to rotate
          let newIndex = Math.floor(Math.random() * this.BREEDS.length);

          // Avoid same breed consecutively
          if (data && this.BREEDS.length > 1) {
            while (newIndex === data.index) {
              newIndex = Math.floor(Math.random() * this.BREEDS.length);
            }
          }

          data = { index: newIndex, timestamp: now };
          localStorage.setItem(this.ROTATION_KEY, JSON.stringify(data));
        }

        // Apply Breed
        const selected = this.BREEDS[data.index] || this.BREEDS[0];

        if (this.currentBreed() !== selected) {
          this.currentBreed.set(selected);
          this.buildSpriteUrlCache(selected);
          this.preloadBreedImages(selected);
        } else if (this.spriteUrlCache.size === 0) {
          // First load fallback
          this.buildSpriteUrlCache(selected);
          this.preloadBreedImages(selected);
        }

        // Schedule next check
        const timePassed = now - data.timestamp;
        const timeRemaining = Math.max(0, ONE_HOUR - timePassed);

        const nextCheck = setTimeout(() => {
          this.ngZone.run(() => checkRotation());
        }, timeRemaining + 1000); // +1s buffer
        this.timeoutIds.push(nextCheck);
      } catch (e) {
        console.warn('Dog rotation error', e);
        // Fallback
        const fallback = 'Dog-1-Golden-Retriever';
        this.currentBreed.set(fallback);
        this.buildSpriteUrlCache(fallback);
        this.preloadBreedImages(fallback);
      }
    };

    checkRotation();
  }

  // --- Responsiveness ---

  private initResizeObserver() {
    if (!this.dogContainer?.nativeElement) return;

    this.resizeObserver = new ResizeObserver((entries) => {
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
    if (this.dogContainer?.nativeElement) {
      this.containerWidth = this.dogContainer.nativeElement.clientWidth;
    } else if (typeof window !== 'undefined') {
      this.containerWidth = window.innerWidth;
    }
  }

  private clampPosition() {
    const max = this.containerWidth - 60;
    if (this.currentPixelPosition() > max) {
      this.currentPixelPosition.set(max);
    }
    if (this.currentPixelPosition() < 0) {
      this.currentPixelPosition.set(0);
    }
  }

  // --- Movement & Freeze ---

  private freezeMovement() {
    if (!this.dogWrapper?.nativeElement) return;

    // Get precise current visual position
    const rect = this.dogWrapper.nativeElement.getBoundingClientRect();
    const containerRect =
      this.dogContainer.nativeElement.getBoundingClientRect();

    // Calculate local position relative to container
    const relativeLeft = rect.left - containerRect.left;

    this.currentPixelPosition.set(relativeLeft);
    this.moveDuration.set(0); // Instant stop
  }

  // --- Interaction ---

  public onDogClick() {
    const now = Date.now();
    if (now - this.lastClickTime < 1500) return;
    this.lastClickTime = now;

    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];

    // Stop and Sit
    if (this.isWalkingOrRunning()) {
      this.freezeMovement();
    }

    const current = this.currentState();
    const isSitting = current === 'sitting';

    if (isSitting) {
      // Already sitting -> Hide tip, bark briefly then resume walking
      this.showTip.set(false);
      this.currentState.set('barking');

      const id = setTimeout(() => {
        if (this.isDestroyed) return;
        this.currentState.set('idle');
        this.scheduleNextAction(500);
      }, 1000);
      this.timeoutIds.push(id);
    } else {
      // Not sitting -> Sit down and show tip
      this.currentState.set('sitting');

      // Show a random tip (always show for now to test)
      const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
      this.currentTip.set(tip);
      this.showTip.set(true);
      // Stays sitting until clicked again
    }
  }

  // --- State Machine ---

  private scheduleNextAction(delayOverride?: number) {
    if (this.isDestroyed) return;
    const delay = delayOverride ?? Math.random() * 2000 + 1000;
    const id = setTimeout(() => this.decideNextMove(), delay);
    this.timeoutIds.push(id);
  }

  private decideNextMove() {
    if (this.isDestroyed) return;
    const roll = Math.random();

    // 10% chance to show a tip (only for allowed roles)
    if (roll < 0.1 && this.canShowTips()) {
      this.performSitAndTip();
      return;
    }

    // Simplified flow: Only walking, barking, and idle
    if (roll < 0.6) {
      // 60% chance: Walk
      this.performMove();
    } else if (roll < 0.8) {
      // 20% chance: Bark briefly then idle
      this.currentState.set('barking');
      this.scheduleNextAction(1500);
    } else {
      // 20% chance: Stay idle briefly
      this.currentState.set('idle');
      this.scheduleNextAction(2000);
    }
  }

  private performSitAndTip() {
    this.currentState.set('sitting');

    const id1 = setTimeout(() => {
      if (this.isDestroyed) return;
      const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
      this.currentTip.set(tip);
      this.showTip.set(true);

      const id2 = setTimeout(() => {
        if (this.isDestroyed) return;
        this.showTip.set(false);
        this.currentState.set('idle');
        this.scheduleNextAction(1000);
      }, 5000);
      this.timeoutIds.push(id2);
    }, 500);
    this.timeoutIds.push(id1);
  }

  private performMove() {
    if (this.containerWidth === 0) this.updateContainerMetrics();

    const margin = 30; // Safe margin to prevent edge clipping
    const maxPos = Math.max(0, this.containerWidth - margin - 50);
    const minPos = margin;

    // 25% chance to aim specifically for a corner
    const isCornerRun = Math.random() < 0.25;
    let targetPos: number;

    if (isCornerRun) {
      // Go to the furthest corner
      targetPos =
        this.currentPixelPosition() > this.containerWidth / 2 ? minPos : maxPos;
    } else {
      // Random position
      targetPos = Math.random() * (maxPos - minPos) + minPos;

      // Ensure minimum travel distance for random moves
      if (Math.abs(targetPos - this.currentPixelPosition()) < 100) {
        targetPos =
          this.currentPixelPosition() > this.containerWidth / 2
            ? minPos + 50
            : maxPos - 50;
      }
    }

    const distance = Math.abs(targetPos - this.currentPixelPosition());
    const speed = 50; // px per second (walking speed only)
    const duration = distance / speed;

    const direction =
      targetPos > this.currentPixelPosition() ? 'right' : 'left';

    this.currentDirection.set(direction);
    this.moveDuration.set(duration);
    this.currentState.set('walking'); // Only walking, no running

    // Use transform via Angular binding, no requestAnimationFrame needed for CSS transition
    this.currentPixelPosition.set(targetPos);

    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      this.currentState.set('idle');

      if (isCornerRun) {
        // Wait 1-2 minutes at the corner
        const minutesInMillis = 1000 * 60;
        const waitTime = minutesInMillis + Math.random() * minutesInMillis;
        this.scheduleNextAction(waitTime);
      } else {
        this.scheduleNextAction(100);
      }
    }, duration * 1000);
    this.timeoutIds.push(id);
  }
}
