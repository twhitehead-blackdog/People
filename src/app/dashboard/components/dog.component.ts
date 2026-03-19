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

// Mapping from state name to filename suffix
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
  { name: 'idle', frames: 10, width: 1000, duration: '1.2s' },
  { name: 'walking', frames: 8, width: 800, duration: '0.6s' },
  { name: 'sitting', frames: 1, width: 100, duration: '0s' },
  { name: 'barking', frames: 3, width: 300, duration: '0.6s' },
  { name: 'itching', frames: 2, width: 200, duration: '0.8s' },
  { name: 'stretching', frames: 10, width: 1000, duration: '1.2s' },
  { name: 'lying-down', frames: 1, width: 100, duration: '0s' },
  { name: 'sleeping', frames: 1, width: 100, duration: '0s' },
];

const BREEDS: Record<DogBreed, DogConfig> = {
  'Dog-1-Golden-Retriever': {
    folder: 'Dog-1-Golden-Retriever',
    prefix: 'Golden-Retriever-',
    idleCase: 'idle',
  },
  'Dog-2-Akita': {
    folder: 'Dog-2-Akita',
    prefix: 'Akita-',
    idleCase: 'Idle',
  },
  'Dog-3-Great-Dane': {
    folder: 'Dog-3-Great-Dane',
    prefix: 'Great-Dane-',
    idleCase: 'idle',
  },
  'Dog-4-Schnauzer': {
    folder: 'Dog-4-Schnauzer',
    prefix: 'Schnauzer-',
    idleCase: 'Idle',
  },
  'Dog-5-Saint-Bernard': {
    folder: 'Dog-5-Saint-Bernard',
    prefix: 'Saint-Bernard-',
    idleCase: 'Idle',
  },
  'Dog-6-Siberian-Husky': {
    folder: 'Dog-6-Siberian-Husky',
    prefix: 'Siberian-Husky-',
    idleCase: 'Idle',
  },
};

@Component({
  selector: 'pt-dog-animation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #dogContainer
      class="absolute bottom-0 left-0 w-full h-1 pointer-events-none z-[30]"
    >
      <div
        #dogWrapper
        class="absolute bottom-[-19px] cursor-pointer pointer-events-auto"
        [class.opacity-0]="!isReady()"
        [class.opacity-100]="isReady()"
        (click)="onDogClick()"
        [style.transform]="'translateX(' + currentPixelPosition() + 'px)'"
        [class.transition-transform]="isWalking()"
        [style.transition-duration]="moveDuration() + 's'"
      >
        @if (showTip()) {
        <div
          class="absolute top-[50px] left-1/2 -translate-x-1/2 bg-white text-gray-800 text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-[20] border border-gray-100 animate-fade-in"
        >
          {{ currentTip() }}
          <div
            class="absolute top-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rotate-45 border-l border-t border-gray-100"
          ></div>
        </div>
        }

        <!-- EXACT same approach as screen-lock -->
        <div
          class="dog-sprite w-[50px] h-[50px]"
          [ngStyle]="dogStyle()"
          [style.transform]="currentDirection() === 'left' ? 'scaleX(-1)' : 'scaleX(1)'"
        ></div>
      </div>
    </div>
  `,
  styles: `
    @keyframes fade-in {
      from { opacity: 0; transform: translate(-50%, 10px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }

    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
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

  @ViewChild('dogWrapper') dogWrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('dogContainer') dogContainer!: ElementRef<HTMLDivElement>;

  private readonly ASSET_BASE = 'assets_dog/Pet Dogs Pack/';
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

  // EXACT same approach as screen-lock - ngStyle with dynamic animation
  public dogStyle = computed(() => {
    const breed = BREEDS[this.currentBreed()];
    const action = ACTIONS.find((a) => a.name === this.currentState());

    if (!action || !breed) {
      return {};
    }

    // Get filename from state mapping
    let fileName = STATE_TO_FILE[action.name];
    
    // Handle idle casing for specific breeds
    if (action.name === 'idle' && breed.idleCase === 'Idle') {
      fileName = 'Idle';
    }

    const url = `assets_dog/Pet Dogs Pack/${breed.folder}/${breed.prefix}${fileName}.png`;

    // EXACT same calculation as screen-lock
    // Screen-lock uses 150px size and multiplies width by 1.5
    // We use 50px size, so multiply by 0.5 (which is 50/100)
    const displaySize = 50;
    const scale = displaySize / 100; // 0.5
    const endPos = -(action.width * scale);

    return {
      'background-image': `url('${url}')`,
      'background-size': 'auto 50px',
      width: '50px',
      height: '50px',
      '--sprite-width': `${endPos}px`,
      animation:
        action.frames > 1
          ? `play-sprite ${action.duration} steps(${action.frames}) infinite`
          : 'none',
    };
  });

  public canShowTips = computed(() => {
    const employee = this.store.currentEmployee();
    const allowed = ['Gerente', 'Desarrollador', 'Soporte IT'];
    return employee?.position?.name
      ? allowed.includes(employee.position.name)
      : false;
  });

  // Internal
  private timeoutIds: ReturnType<typeof setTimeout>[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed = false;
  private containerWidth = 0;
  private lastClickTime = 0;

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
    this.injectKeyframes();
    afterNextRender(() => {
      this.initResizeObserver();
    });
  }

  async ngOnInit() {
    this.updateContainerMetrics();
    await this.initializeBreedRotation();

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

  // EXACT same as screen-lock - global keyframes
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

  private async initializeBreedRotation(): Promise<void> {
    if (typeof window === 'undefined') return;

    const ONE_HOUR = 60 * 60 * 1000;
    const breedKeys = Object.keys(BREEDS) as DogBreed[];

    try {
      const stored = localStorage.getItem(this.ROTATION_KEY);
      let data = stored ? JSON.parse(stored) : null;
      const now = Date.now();

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

      const selected = data.breed || breedKeys[0];
      await this.loadBreed(selected);

      if (!this.isDestroyed) {
        this.isReady.set(true);
      }

      const timeRemaining = Math.max(0, ONE_HOUR - (now - data.timestamp));
      const id = setTimeout(() => {
        this.ngZone.run(() => this.initializeBreedRotation());
      }, timeRemaining + 1000);
      this.timeoutIds.push(id);
    } catch (e) {
      console.warn('Dog rotation error:', e);
      await this.loadBreed('Dog-1-Golden-Retriever');
      if (!this.isDestroyed) {
        this.isReady.set(true);
      }
    }
  }

  private async loadBreed(breed: DogBreed): Promise<void> {
    this.currentBreed.set(breed);
    const config = BREEDS[breed];

    const urls = ACTIONS.map((action) => {
      let fileName = STATE_TO_FILE[action.name];
      if (action.name === 'idle' && config.idleCase === 'Idle') {
        fileName = 'Idle';
      }
      return `assets_dog/Pet Dogs Pack/${config.folder}/${config.prefix}${fileName}.png`;
    });

    await Promise.all(
      urls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = url;
          })
      )
    );
  }

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
    const pos = this.currentPixelPosition();
    if (pos > max) {
      this.currentPixelPosition.set(max);
    } else if (pos < 0) {
      this.currentPixelPosition.set(0);
    }
  }

  private freezeMovement() {
    if (!this.dogWrapper?.nativeElement) return;

    const rect = this.dogWrapper.nativeElement.getBoundingClientRect();
    const containerRect = this.dogContainer.nativeElement.getBoundingClientRect();
    const relativeLeft = rect.left - containerRect.left;

    this.currentPixelPosition.set(relativeLeft);
    this.moveDuration.set(0);
  }

  public onDogClick() {
    const now = Date.now();
    if (now - this.lastClickTime < 1500) return;
    this.lastClickTime = now;

    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];
    this.showTip.set(false);

    if (this.isWalking()) {
      this.freezeMovement();
    }

    const current = this.currentState();
    if (current === 'sitting') {
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
        const waitTime = 60000 + Math.random() * 60000;
        this.scheduleNextAction(waitTime);
      } else {
        this.scheduleNextAction(100);
      }
    }, duration * 1000);
    this.timeoutIds.push(id);
  }
}
