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

// List of all states for iteration
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

@Component({
  selector: 'pt-dog-animation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Container: z-index 30 to sit above standard header but below modals -->
    <div
      #dogContainer
      class="dog-container absolute bottom-0 left-0 w-full h-1 pointer-events-none z-[30]"
      [class.is-ready]="isReady()"
    >
      <!-- Movable Wrapper - Only visible when ready -->
      <div
        #dogWrapper
        class="absolute bottom-[-19px] cursor-pointer pointer-events-auto dog-wrapper"
        [class.wrapper-visible]="isReady()"
        (click)="onDogClick()"
        [style.transform]="'translateX(' + currentPixelPosition() + 'px)'"
        [class.is-moving]="isWalkingOrRunning()"
        [style.--move-duration]="moveDuration() + 's'"
      >
        <!-- Tooltip Bubble -->
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

        <!-- 
          Sprites Container 
          - All sprites are present in DOM.
          - Only the active sprite is visible (display: block vs none)
          - No opacity transitions to prevent flickering
        -->
        <div
          class="sprites-container w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] relative"
          [class.flipped]="currentDirection() === 'left'"
        >
          @for (state of allStates; track state) {
          <div
            class="dog-sprite absolute inset-0"
            [style.background-image]="getSpriteUrl(state)"
            [class.sprite-active]="currentState() === state && isReady()"
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
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translate(-50%, 10px); }
      100% { opacity: 1; transform: translate(-50%, 0); }
    }

    .animate-fade-in-up {
      animation: fade-in-up 0.3s ease-out forwards;
    }

    /* 
      Wrapper - Hidden by default, visible when ready
    */
    .dog-wrapper {
      will-change: transform;
      contain: layout style;
      transition: none;
      opacity: 0;
      visibility: hidden;
    }

    .dog-wrapper.wrapper-visible {
      opacity: 1;
      visibility: visible;
      /* Smooth fade in on first load */
      transition: opacity 300ms ease-out, visibility 0s;
    }

    .dog-wrapper.is-moving {
      transition: transform var(--move-duration, 0s) linear;
    }

    /* 
      Sprites Container 
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
      Base Sprite 
      - Uses display:none/block for instant switching (no opacity flicker)
      - GPU acceleration for animation
    */
    .dog-sprite {
      background-repeat: no-repeat;
      background-size: cover;
      image-rendering: pixelated;
      
      display: none; /* Hidden by default */
      opacity: 0;
      
      transform: translateZ(0);
      will-change: transform;
    }

    /* Active State - Display block with instant opacity */
    .dog-sprite.sprite-active {
      display: block;
      opacity: 1;
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
      animation-play-state: paused; /* Paused until active */
    }

    /* Only animate when sprite is active */
    .sprite-active.animate-walk,
    .sprite-active.animate-itch,
    .sprite-active.animate-stretch,
    .sprite-active.animate-idle {
      animation-play-state: running;
    }

    /* Specific durations */
    .sprite-active.animate-walk { animation-duration: 0.6s; }
    .sprite-active.animate-idle { animation-duration: 1.2s; }
    .sprite-active.animate-itch { animation-duration: 0.8s; }

    /* Static States (Single Frame) */
    .animate-sit,
    .animate-lie,
    .animate-sleep {
      background-position: 0 0;
      animation: none;
    }

    /* Bark uses 4-frame animation */
    .animate-bark {
      animation: play-strip-4 0.6s steps(4) infinite;
      animation-play-state: paused;
    }

    .sprite-active.animate-bark {
      animation-play-state: running;
    }

    @media (max-width: 640px) {
      .sprite-active.animate-walk,
      .sprite-active.animate-itch,
      .sprite-active.animate-stretch,
      .sprite-active.animate-idle,
      .sprite-active.animate-bark {
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
  private readonly ASSET_BASE = 'assets_dog/Pet%20Dogs%20Pack/';
  private readonly ROTATION_KEY = 'pt_dog_rotation_v2';

  // Signals
  public currentBreed = signal<DogBreed>('Dog-1-Golden-Retriever');
  public currentState = signal<DogState>('idle');
  public currentDirection = signal<'left' | 'right'>('right');
  public currentPixelPosition = signal<number>(0);
  public isReady = signal<boolean>(false); // NEW: Wait for images to load

  public showTip = signal<boolean>(false);
  public currentTip = signal<string>('');
  public moveDuration = signal<number>(0);

  // Computed
  public isWalkingOrRunning = computed(() => this.currentState() === 'walking');

  public canShowTips = computed(() => {
    const employee = this.store.currentEmployee();
    const allowed = ['Gerente', 'Desarrollador', 'Soporte IT'];
    return employee?.position?.name
      ? allowed.includes(employee.position.name)
      : false;
  });

  // Internal State
  private spriteUrlCache = new Map<DogState, string>();
  private loadedImages = new Set<string>(); // Track loaded images
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
    afterNextRender(() => {
      this.initResizeObserver();
    });
  }

  async ngOnInit() {
    this.updateContainerMetrics();
    
    // Initialize breed and wait for images to load before showing
    await this.initializeBreedRotation();
    
    // Start animation loop only after ready
    if (!this.isDestroyed) {
      this.currentPixelPosition.set(100);
      this.scheduleNextAction();
    }
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

    ALL_STATES.forEach((state) => {
      const action = STATE_TO_FILE[state];
      const url = `url('${this.ASSET_BASE}${encodeURIComponent(
        breed
      )}/${encodeURIComponent(breedName)}-${action}.png')`;
      this.spriteUrlCache.set(state, url);
    });
  }

  /**
   * Preload all images for a breed and wait for them to be ready
   * Returns a promise that resolves when all images are loaded
   */
  private async preloadBreedImages(breed: DogBreed): Promise<void> {
    if (typeof window === 'undefined') return;

    const breedName = breed.split('-').slice(2).join('-');
    const imageUrls: string[] = [];

    // Build list of URLs to preload
    ALL_STATES.forEach((state) => {
      const action = STATE_TO_FILE[state];
      const src = `${this.ASSET_BASE}${breed}/${breedName}-${action}.png`;
      imageUrls.push(src);
    });

    // Load all images
    const loadPromises = imageUrls.map((src) => {
      // Skip if already loaded
      if (this.loadedImages.has(src)) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const img = new Image();
        
        img.onload = () => {
          this.loadedImages.add(src);
          resolve();
        };
        
        img.onerror = () => {
          // Even on error, resolve to not block other images
          console.warn(`[DogAnimation] Failed to load: ${src}`);
          resolve();
        };

        img.src = src;
      });
    });

    // Wait for all images with a timeout
    await Promise.all(loadPromises);
  }

  // --- Rotation Logic ---

  private async initializeBreedRotation(): Promise<void> {
    if (typeof window === 'undefined') return;

    const ONE_HOUR = 60 * 60 * 1000;

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

      // Set breed and preload images
      this.currentBreed.set(selected);
      this.buildSpriteUrlCache(selected);
      
      // Wait for images to load before showing
      await this.preloadBreedImages(selected);
      
      // Only mark as ready after images are loaded
      if (!this.isDestroyed) {
        this.isReady.set(true);
      }

      // Schedule next check
      const timePassed = now - data.timestamp;
      const timeRemaining = Math.max(0, ONE_HOUR - timePassed);

      const nextCheck = setTimeout(() => {
        this.ngZone.run(() => this.initializeBreedRotation());
      }, timeRemaining + 1000);
      this.timeoutIds.push(nextCheck);
    } catch (e) {
      console.warn('Dog rotation error', e);
      // Fallback
      const fallback = 'Dog-1-Golden-Retriever';
      this.currentBreed.set(fallback);
      this.buildSpriteUrlCache(fallback);
      await this.preloadBreedImages(fallback);
      
      if (!this.isDestroyed) {
        this.isReady.set(true);
      }
    }
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

    const rect = this.dogWrapper.nativeElement.getBoundingClientRect();
    const containerRect =
      this.dogContainer.nativeElement.getBoundingClientRect();

    const relativeLeft = rect.left - containerRect.left;

    this.currentPixelPosition.set(relativeLeft);
    this.moveDuration.set(0);
  }

  // --- Interaction ---

  public onDogClick() {
    const now = Date.now();
    if (now - this.lastClickTime < 1500) return;
    this.lastClickTime = now;

    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];
    this.showTip.set(false);

    if (this.isWalkingOrRunning()) {
      this.freezeMovement();
    }

    const current = this.currentState();
    const isSitting = current === 'sitting';

    if (isSitting) {
      this.currentState.set('barking');

      const id = setTimeout(() => {
        if (this.isDestroyed) return;
        this.currentState.set('idle');
        this.scheduleNextAction(500);
      }, 1000);
      this.timeoutIds.push(id);
    } else {
      this.currentState.set('sitting');
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

    if (roll < 0.6) {
      this.performMove();
    } else if (roll < 0.8) {
      this.currentState.set('barking');
      this.scheduleNextAction(1500);
    } else {
      this.currentState.set('idle');
      this.scheduleNextAction(2000);
    }
  }

  private performMove() {
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

    this.currentDirection.set(direction);
    this.moveDuration.set(duration);
    this.currentState.set('walking');
    this.currentPixelPosition.set(targetPos);

    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      this.currentState.set('idle');

      if (isCornerRun) {
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
