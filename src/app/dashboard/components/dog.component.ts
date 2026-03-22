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
  | 'idle' | 'walking' | 'sitting' | 'barking'
  | 'itching' | 'stretching' | 'lying-down' | 'sleeping';

type DogBreed =
  | 'Dog-1-Golden-Retriever' | 'Dog-2-Akita' | 'Dog-3-Great-Dane'
  | 'Dog-4-Schnauzer' | 'Dog-5-Saint-Bernard' | 'Dog-6-Siberian-Husky';

interface DogAction  { name: DogState; frames: number; width: number; duration: string; }
interface DogConfig  { folder: string; prefix: string; idleCase: 'idle' | 'Idle'; }

const STATE_TO_FILE: Record<DogState, string> = {
  idle: 'idle', walking: 'walk', sitting: 'sitting', barking: 'bark',
  itching: 'itching', stretching: 'stretching', 'lying-down': 'lying-down', sleeping: 'sleeping',
};

const ACTIONS: DogAction[] = [
  { name: 'idle',       frames: 10, width: 1000, duration: '1.2s' },
  { name: 'walking',    frames: 8,  width: 800,  duration: '0.6s' },
  { name: 'sitting',    frames: 1,  width: 100,  duration: '0s'   },
  { name: 'barking',    frames: 3,  width: 300,  duration: '0.6s' },
  { name: 'itching',    frames: 2,  width: 200,  duration: '0.8s' },
  { name: 'stretching', frames: 10, width: 1000, duration: '1.2s' },
  { name: 'lying-down', frames: 1,  width: 100,  duration: '0s'   },
  { name: 'sleeping',   frames: 1,  width: 100,  duration: '0s'   },
];

const BREEDS: Record<DogBreed, DogConfig> = {
  'Dog-1-Golden-Retriever': { folder: 'Dog-1-Golden-Retriever', prefix: 'Golden-Retriever-', idleCase: 'idle' },
  'Dog-2-Akita':            { folder: 'Dog-2-Akita',            prefix: 'Akita-',            idleCase: 'Idle' },
  'Dog-3-Great-Dane':       { folder: 'Dog-3-Great-Dane',       prefix: 'Great-Dane-',       idleCase: 'idle' },
  'Dog-4-Schnauzer':        { folder: 'Dog-4-Schnauzer',        prefix: 'Schnauzer-',        idleCase: 'Idle' },
  'Dog-5-Saint-Bernard':    { folder: 'Dog-5-Saint-Bernard',    prefix: 'Saint-Bernard-',    idleCase: 'Idle' },
  'Dog-6-Siberian-Husky':   { folder: 'Dog-6-Siberian-Husky',  prefix: 'Siberian-Husky-',   idleCase: 'Idle' },
};

const MSGS: Record<string, string[]> = {
  idle:         ['...', '👀', 'Husmeando~', '*bostezo*', '¿Hay snacks?', 'Hmm...', '🐾', '¿Dónde está mi pelota?', 'Todo tranquilo~'],
  walking:      ['Patrullando 🐕', 'Inspeccionando...', 'A ver qué hay~', '¡Al rescate!', '¡Voy voy!'],
  barking:      ['¡Woof! 🗣️', '¡AU AU!', '¡GUAU GUAU!', '¡EH TÚ!', '¡Hola amigo!', '¡Woof woof!'],
  itching:      ['Ahhhh... 😌', '*rasca rasca*', 'Qué rico~', 'Ahhh justo ahí~', 'Mmm sí~'],
  stretching:   ['*se estira* 🙆', 'Aaah~', 'Listooo~', '¡Buenos días!', '*crack* ¡Ajá!'],
  sitting:      ['👀', '¿Me llamaste?', 'Aquí sentadito~', 'A sus órdenes 🐕'],
  'lying-down': ['Creo que descansaré...', 'Uf qué día...', '*se acomoda*', 'Solo un momento~'],
  sleeping:     ['Zzz...', '💤', 'Zzz 🐾', '*ronca suavecito*', 'Zzzz~'],
  zoomies:      ['¡¡ZOOMIES!! 🚀', '¡WOO HOO!', '¡AGÁRRAME!', '¡YAAAS!', '💨💨💨', '¡GO GO GO!'],
  wake:         ['¡Wuh?! 😲', '*despierta*', '¿Ehh? ¿Me llamaste?', '¡Ya estoy! 🐕', '*parpadea*'],
  pet:          ['❤️ Gracias~', '¡Más! ¡Más!', 'Qué buena onda 🥰', '*mueve la cola*', '¡Te quiero!'],
  poop:         ['💩', 'Ejem... privacidad?', 'No mires 😳', '...fue el otro perro'],
};

@Component({
  selector: 'pt-dog-animation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #dogContainer class="absolute bottom-0 left-0 w-full h-2 pointer-events-none z-[30]">
      <div
        #dogWrapper
        class="absolute bottom-[-30px] cursor-pointer pointer-events-auto dog-wrapper"
        [class.opacity-0]="!isReady()"
        [class.opacity-100]="isReady()"
        [class.dog-zoomies]="isZoomies()"
        (click)="onDogClick()"
        [style.transform]="'translateX(' + currentPixelPosition() + 'px)'"
        [class.transition-transform]="isWalking() && !isZoomies()"
        [style.transition-duration]="moveDuration() + 's'"
        [style.transition-timing-function]="'ease-in-out'"
      >
        <!-- Speech bubble -->
        @if (showTip()) {
          <div class="dog-bubble" [class.dog-bubble--sleep]="isSleepState()" [class.dog-bubble--zoomies]="isZoomies()">
            {{ currentTip() }}
          </div>
        }

        <!-- Hearts when petted -->
        @if (showHearts()) {
          <div class="particles-wrap">
            @for (h of heartList; track h.id) {
              <span class="heart-particle" [style.--delay]="h.delay + 's'" [style.--dx]="h.dx + 'px'">{{ h.emoji }}</span>
            }
          </div>
        }

        <!-- Sleeping Zzz -->
        @if (currentState() === 'sleeping') {
          <div class="zzz-wrap">
            <span class="zzz z1">z</span>
            <span class="zzz z2">z</span>
            <span class="zzz z3">Z</span>
          </div>
        }

        <!-- Poop -->
        @if (showPoop()) {
          <div class="poop-emoji">💩</div>
        }

        <!-- Shadow -->
        <div class="dog-shadow"></div>

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
    @keyframes bubble-in {
      from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.85); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1);    }
    }
    @keyframes zzz-up {
      0%   { opacity: 0;   transform: translateY(0)     scale(0.6); }
      25%  { opacity: 1; }
      100% { opacity: 0;   transform: translateY(-32px) scale(1.1); }
    }
    @keyframes bounce-zoomies {
      0%, 100% { transform: translateX(var(--tx,0)) translateY(0); }
      50%       { transform: translateX(var(--tx,0)) translateY(-8px); }
    }
    @keyframes heart-up {
      0%   { opacity: 1; transform: translateY(0)     translateX(var(--dx)) scale(0.8); }
      100% { opacity: 0; transform: translateY(-55px) translateX(var(--dx)) scale(1.2); }
    }
    @keyframes poop-pop {
      0%   { transform: scale(0) translateY(4px); opacity: 0; }
      30%  { transform: scale(1.2) translateY(0); opacity: 1; }
      70%  { transform: scale(1) translateY(0);   opacity: 1; }
      100% { transform: scale(0.8) translateY(4px); opacity: 0; }
    }
    @keyframes shadow-pulse {
      0%, 100% { transform: translateX(-50%) scaleX(1);    opacity: .25; }
      50%       { transform: translateX(-50%) scaleX(0.85); opacity: .15; }
    }

    .dog-wrapper { position: relative; width: 100px; }

    .dog-bubble {
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: #1f2937;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 5px 11px;
      border-radius: 14px;
      white-space: nowrap;
      box-shadow: 0 3px 10px rgba(0,0,0,.18);
      border: 1px solid #e5e7eb;
      animation: bubble-in .22s ease-out;
      pointer-events: none;
      z-index: 50;
    }
    .dog-bubble::after {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      width: 8px; height: 8px;
      background: white;
      border-right: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }
    .dog-bubble--sleep  { background: #ede9fe; border-color: #c4b5fd; color: #5b21b6; }
    .dog-bubble--sleep::after  { background: #ede9fe; border-color: #c4b5fd; }
    .dog-bubble--zoomies { background: #fef9c3; border-color: #fcd34d; color: #92400e; font-size: .8rem; font-weight: 800; }
    .dog-bubble--zoomies::after { background: #fef9c3; border-color: #fcd34d; }

    .particles-wrap {
      position: absolute;
      bottom: calc(100% + 5px);
      left: 50%; transform: translateX(-50%);
      pointer-events: none;
    }
    .heart-particle {
      position: absolute;
      font-size: 1.1rem;
      animation: heart-up 1.1s ease-out forwards;
      animation-delay: var(--delay, 0s);
      opacity: 0;
    }

    .zzz-wrap {
      position: absolute;
      bottom: calc(100% + 2px);
      right: 2px;
      pointer-events: none;
    }
    .zzz {
      position: absolute;
      color: #8b5cf6;
      font-weight: 800;
      font-style: italic;
      animation: zzz-up 2.2s ease-in-out infinite;
      opacity: 0;
    }
    .z1 { font-size: .6rem;  right: 0;    bottom: 0;    animation-delay: 0s;   }
    .z2 { font-size: .8rem;  right: -8px; bottom: 0;    animation-delay: .75s; }
    .z3 { font-size: 1rem;   right: -18px;bottom: 0;    animation-delay: 1.5s; }

    .poop-emoji {
      position: absolute;
      bottom: -2px;
      left: 108px;
      font-size: 1.4rem;
      animation: poop-pop 3s ease-in-out forwards;
      pointer-events: none;
    }

    .dog-shadow {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 70px; height: 10px;
      background: rgba(0,0,0,.35);
      border-radius: 50%;
      filter: blur(4px);
      animation: shadow-pulse 1.8s ease-in-out infinite;
    }

    .dog-zoomies .dog-shadow { animation: none; transform: translateX(-50%) scaleX(0.7); opacity: .15; }

    .dog-sprite {
      background-repeat: no-repeat;
      image-rendering: pixelated;
      position: relative;
      z-index: 2;
    }
  `,
})
export class DogAnimationComponent implements OnInit, OnDestroy {
  private store  = inject(DashboardStore);
  private ngZone = inject(NgZone);

  @ViewChild('dogWrapper')   dogWrapper!:   ElementRef<HTMLDivElement>;
  @ViewChild('dogContainer') dogContainer!: ElementRef<HTMLDivElement>;

  private readonly ROTATION_KEY = 'pt_dog_rotation_v2';
  private readonly SLEEP_DELAY  = 3 * 60 * 1000;
  private readonly DOG_SIZE     = 100;

  // ── Signals ──────────────────────────────────────────────────────────
  public currentBreed         = signal<DogBreed>('Dog-1-Golden-Retriever');
  public currentState         = signal<DogState>('idle');
  public currentDirection     = signal<'left' | 'right'>('right');
  public currentPixelPosition = signal<number>(0);
  public isReady              = signal<boolean>(false);
  public showTip              = signal<boolean>(false);
  public currentTip           = signal<string>('');
  public moveDuration         = signal<number>(0);
  public isZoomies            = signal<boolean>(false);
  public showHearts           = signal<boolean>(false);
  public showPoop             = signal<boolean>(false);

  public isSleepState = computed(() =>
    this.currentState() === 'sleeping' || this.currentState() === 'lying-down'
  );
  public isWalking = computed(() => this.currentState() === 'walking');
  public dogStyle  = computed(() => {
    const breed  = BREEDS[this.currentBreed()];
    const action = ACTIONS.find(a => a.name === this.currentState());
    if (!action || !breed) return {};
    let fileName = STATE_TO_FILE[action.name];
    if (action.name === 'idle' && breed.idleCase === 'Idle') fileName = 'Idle';
    const url    = `assets_dog/Pet Dogs Pack/${breed.folder}/${breed.prefix}${fileName}.png`;
    const scale  = this.DOG_SIZE / 100;
    const endPos = -(action.width * scale);
    return {
      'background-image': `url('${url}')`,
      'background-size':  `auto ${this.DOG_SIZE}px`,
      width: `${this.DOG_SIZE}px`, height: `${this.DOG_SIZE}px`,
      '--sprite-width': `${endPos}px`,
      animation: action.frames > 1
        ? `play-sprite ${action.duration} steps(${action.frames}) infinite` : 'none',
    };
  });

  // Heart particles data
  public heartList: { id: number; delay: number; dx: number; emoji: string }[] = [];

  // ── Internals ─────────────────────────────────────────────────────────
  private timeoutIds:     ReturnType<typeof setTimeout>[] = [];
  private sleepTimer:     ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed     = false;
  private containerWidth  = 0;
  private clickCount      = 0;
  private clickResetTimer:ReturnType<typeof setTimeout> | null = null;
  private lastMouseBarkAt = 0;
  private isSleeping      = false;
  private energyWalkCount = 0;
  private rafId:          number | null = null;
  private heartCounter    = 0;

  // ── Mouse proximity (RAF-throttled, dead zone) ────────────────────────
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.dogWrapper?.nativeElement || !this.isReady() || this.isSleeping) return;

      const rect       = this.dogWrapper.nativeElement.getBoundingClientRect();
      const dogCenterX = rect.left + rect.width / 2;
      const dist       = Math.abs(event.clientX - dogCenterX);

      // Face mouse only when idle AND mouse is clearly to one side (>70px dead zone)
      if (dist > 70 && this.currentState() === 'idle') {
        const newDir = event.clientX > dogCenterX ? 'right' : 'left';
        if (this.currentDirection() !== newDir) {
          this.ngZone.run(() => this.currentDirection.set(newDir));
        }
      }

      // Bark only once per 8s when mouse is right on the dog
      if (dist < 55 && this.currentState() === 'idle') {
        const now = Date.now();
        if (now - this.lastMouseBarkAt > 8000) {
          this.lastMouseBarkAt = now;
          this.ngZone.run(() => this.reactToMouse());
        }
      }
    });
  }

  private reactToMouse() {
    if (this.isDestroyed || this.isSleeping || this.isWalking()) return;
    this.clearActions();
    this.currentState.set('barking');
    this.showStateMessage('barking');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(800); }
    }, 1200);
    this.timeoutIds.push(id);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────
  constructor() {
    this.injectKeyframes();
    afterNextRender(() => this.initResize());
  }

  async ngOnInit() {
    this.updateMetrics();
    await this.initBreedRotation();
    if (!this.isDestroyed) {
      this.currentPixelPosition.set(100);
      this.scheduleNext();
      this.resetSleepTimer();
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.timeoutIds.forEach(clearTimeout);
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    if (this.clickResetTimer) clearTimeout(this.clickResetTimer);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
  }

  // ── Click ─────────────────────────────────────────────────────────────
  public onDogClick() {
    // Wake from sleep
    if (this.isSleeping) { this.wakeUp(); return; }

    // Triple-click = zoomies
    this.clickCount++;
    if (this.clickResetTimer) clearTimeout(this.clickResetTimer);
    this.clickResetTimer = setTimeout(() => { this.clickCount = 0; }, 600);
    if (this.clickCount >= 3) { this.clickCount = 0; this.triggerZoomies(); return; }

    this.clearActions();
    this.showTip.set(false);
    this.resetSleepTimer();
    if (this.isWalking()) this.freezeMovement();

    // Bark + hearts
    this.spawnHearts();
    this.currentState.set('barking');
    this.showStateMessage('pet');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('sitting'); this.scheduleNext(2500); }
    }, 1300);
    this.timeoutIds.push(id);
  }

  private spawnHearts() {
    const emojis = ['❤️', '🧡', '💛', '💚', '💙', '🩷'];
    this.heartList = Array.from({ length: 5 }, (_, i) => ({
      id: this.heartCounter++,
      delay: i * 0.12,
      dx: (Math.random() - 0.5) * 50,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }));
    this.showHearts.set(true);
    const id = setTimeout(() => { if (!this.isDestroyed) this.showHearts.set(false); }, 1800);
    this.timeoutIds.push(id);
  }

  // ── Zoomies ───────────────────────────────────────────────────────────
  private triggerZoomies(laps = 0) {
    if (this.isDestroyed) return;
    this.clearActions();
    this.isSleeping = false;
    const goRight  = laps % 2 === 0
      ? this.currentPixelPosition() < this.containerWidth / 2
      : this.currentPixelPosition() >= this.containerWidth / 2;
    const targetPos = goRight ? Math.max(0, this.containerWidth - 110) : 30;

    this.currentDirection.set(goRight ? 'right' : 'left');
    this.moveDuration.set(0.65);
    this.currentState.set('walking');
    this.isZoomies.set(true);
    this.currentPixelPosition.set(targetPos);
    if (laps === 0) this.showMsgDirect(this.rnd(MSGS['zoomies']));

    const totalLaps = 2 + Math.floor(Math.random() * 3);
    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      if (laps + 1 < totalLaps) { this.triggerZoomies(laps + 1); }
      else {
        this.isZoomies.set(false);
        this.currentState.set('idle');
        this.energyWalkCount = 0;
        this.scheduleNext(1500);
        this.resetSleepTimer();
      }
    }, 700);
    this.timeoutIds.push(id);
  }

  // ── Sleep ─────────────────────────────────────────────────────────────
  private resetSleepTimer() {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    const h = new Date().getHours();
    const delay = (h >= 22 || h < 6) ? 60_000 : (h >= 12 && h < 14) ? 90_000 : this.SLEEP_DELAY;
    this.sleepTimer = setTimeout(() => this.ngZone.run(() => this.enterSleep()), delay);
  }

  private enterSleep() {
    if (this.isDestroyed || this.isSleeping) return;
    this.isSleeping = true;
    this.clearActions();
    this.isZoomies.set(false);
    this.currentState.set('lying-down');
    this.showStateMessage('lying-down');
    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      this.currentState.set('sleeping');
      this.showStateMessage('sleeping');
      const wId = setTimeout(() => {
        if (!this.isDestroyed) this.ngZone.run(() => this.wakeUp());
      }, 120_000 + Math.random() * 180_000);
      this.timeoutIds.push(wId);
    }, 2500);
    this.timeoutIds.push(id);
  }

  private wakeUp() {
    if (this.isDestroyed) return;
    this.isSleeping = false;
    this.clearActions();
    this.showMsgDirect(this.rnd(MSGS['wake']));
    this.currentState.set('stretching');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(900); this.resetSleepTimer(); }
    }, 2000);
    this.timeoutIds.push(id);
  }

  // ── Behavior ──────────────────────────────────────────────────────────
  private scheduleNext(delay?: number) {
    if (this.isDestroyed) return;
    const d = delay ?? (Math.random() * 2000 + 800);
    const id = setTimeout(() => this.decide(), d);
    this.timeoutIds.push(id);
  }

  private decide() {
    if (this.isDestroyed || this.isSleeping) return;
    const h        = new Date().getHours();
    const isNight  = h >= 22 || h < 6;
    const isMorn   = h >= 6  && h < 9;
    const tired    = this.energyWalkCount > 5;
    const roll     = Math.random();

    // Rare zoomies (3% normal, 6% morning)
    if (!tired && roll < (isMorn ? 0.06 : 0.03)) { this.triggerZoomies(); return; }

    // Rare poop (1%)
    if (roll < 0.01) { this.doPoop(); return; }

    // Tired → sleep
    if (tired && roll < 0.45) { this.energyWalkCount = 0; this.enterSleep(); return; }

    if (isNight) {
      if (roll < 0.4)      { this.currentState.set('idle');    this.scheduleNext(3500); }
      else if (roll < 0.65) { this.doWalk(); }
      else                   { this.enterSleep(); }
      return;
    }

    if (roll < 0.40)       { this.doWalkMaybeStretch(); }
    else if (roll < 0.55)  { this.doAction('barking',   1400); }
    else if (roll < 0.67)  { this.doAction('itching',   2200); }
    else if (roll < 0.78)  { this.doAction('stretching',2000); }
    else                    { this.currentState.set('idle'); if (Math.random() < 0.35) this.showStateMessage('idle'); this.scheduleNext(2500); }

    this.resetSleepTimer();
  }

  private doAction(state: DogState, dur: number) {
    this.currentState.set(state);
    this.showStateMessage(state);
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(400); }
    }, dur);
    this.timeoutIds.push(id);
  }

  private doWalkMaybeStretch() {
    if (Math.random() < 0.3) {
      this.currentState.set('stretching');
      this.showStateMessage('stretching');
      const id = setTimeout(() => { if (!this.isDestroyed) this.doWalk(); }, 1800);
      this.timeoutIds.push(id);
    } else { this.doWalk(); }
  }

  private doWalk() {
    if (this.containerWidth === 0) this.updateMetrics();
    const margin  = 30;
    const maxPos  = Math.max(0, this.containerWidth - margin - this.DOG_SIZE);
    const minPos  = margin;
    const corner  = Math.random() < 0.22;
    let target: number;

    if (corner) {
      target = this.currentPixelPosition() > this.containerWidth / 2 ? minPos : maxPos;
    } else {
      target = Math.random() * (maxPos - minPos) + minPos;
      if (Math.abs(target - this.currentPixelPosition()) < 100)
        target = this.currentPixelPosition() > this.containerWidth / 2 ? minPos + 50 : maxPos - 50;
    }

    const dist     = Math.abs(target - this.currentPixelPosition());
    const speed    = 50 + Math.random() * 25;
    const duration = dist / speed;

    this.currentDirection.set(target > this.currentPixelPosition() ? 'right' : 'left');
    this.moveDuration.set(duration);
    this.currentState.set('walking');
    this.currentPixelPosition.set(target);
    this.energyWalkCount++;

    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      if (corner && Math.random() < 0.55) {
        const act = Math.random() < 0.5 ? 'itching' : 'barking';
        this.doAction(act as DogState, 1800);
        this.scheduleNext(corner ? 60_000 + Math.random() * 60_000 : 100);
      } else {
        this.currentState.set('idle');
        this.scheduleNext(corner ? 60_000 + Math.random() * 60_000 : 100);
      }
    }, duration * 1000);
    this.timeoutIds.push(id);
  }

  // ── Poop easter egg ───────────────────────────────────────────────────
  private doPoop() {
    this.currentState.set('sitting');
    this.showMsgDirect(this.rnd(MSGS['poop']));
    const id1 = setTimeout(() => {
      if (this.isDestroyed) return;
      this.showPoop.set(true);
      const id2 = setTimeout(() => {
        if (!this.isDestroyed) {
          this.showPoop.set(false);
          this.currentState.set('idle');
          this.scheduleNext(1000);
        }
      }, 3200);
      this.timeoutIds.push(id2);
    }, 1200);
    this.timeoutIds.push(id1);
  }

  // ── Speech bubbles ────────────────────────────────────────────────────
  private showStateMessage(key: string) {
    const arr = MSGS[key];
    if (arr) this.showMsgDirect(this.rnd(arr));
  }

  private showMsgDirect(msg: string) {
    this.showTip.set(false);
    const id0 = setTimeout(() => {
      if (this.isDestroyed) return;
      this.currentTip.set(msg);
      this.showTip.set(true);
      const id1 = setTimeout(() => { if (!this.isDestroyed) this.showTip.set(false); }, 3200);
      this.timeoutIds.push(id1);
    }, 40);
    this.timeoutIds.push(id0);
  }

  private rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Helpers ───────────────────────────────────────────────────────────
  private clearActions() { this.timeoutIds.forEach(clearTimeout); this.timeoutIds = []; }

  private freezeMovement() {
    if (!this.dogWrapper?.nativeElement) return;
    const rect  = this.dogWrapper.nativeElement.getBoundingClientRect();
    const cRect = this.dogContainer.nativeElement.getBoundingClientRect();
    this.currentPixelPosition.set(rect.left - cRect.left);
    this.moveDuration.set(0);
  }

  // ── Breed rotation ────────────────────────────────────────────────────
  private async initBreedRotation() {
    if (typeof window === 'undefined') return;
    const ONE_HOUR  = 3_600_000;
    const breedKeys = Object.keys(BREEDS) as DogBreed[];
    try {
      const stored = localStorage.getItem(this.ROTATION_KEY);
      let data     = stored ? JSON.parse(stored) : null;
      const now    = Date.now();
      if (!data || now - data.timestamp > ONE_HOUR) {
        let idx = Math.floor(Math.random() * breedKeys.length);
        if (data && breedKeys.length > 1) while (breedKeys[idx] === data.breed) idx = Math.floor(Math.random() * breedKeys.length);
        data = { breed: breedKeys[idx], timestamp: now };
        localStorage.setItem(this.ROTATION_KEY, JSON.stringify(data));
      }
      await this.loadBreed(data.breed || breedKeys[0]);
      if (!this.isDestroyed) this.isReady.set(true);
      const id = setTimeout(() => this.ngZone.run(() => this.initBreedRotation()), Math.max(0, ONE_HOUR - (now - data.timestamp)) + 1000);
      this.timeoutIds.push(id);
    } catch {
      await this.loadBreed('Dog-1-Golden-Retriever');
      if (!this.isDestroyed) this.isReady.set(true);
    }
  }

  private async loadBreed(breed: DogBreed) {
    this.currentBreed.set(breed);
    const cfg  = BREEDS[breed];
    const urls = ACTIONS.map(a => {
      let f = STATE_TO_FILE[a.name];
      if (a.name === 'idle' && cfg.idleCase === 'Idle') f = 'Idle';
      return `assets_dog/Pet Dogs Pack/${cfg.folder}/${cfg.prefix}${f}.png`;
    });
    await Promise.all(urls.map(u => new Promise<void>(r => { const i = new Image(); i.onload = i.onerror = () => r(); i.src = u; })));
  }

  // ── Container ─────────────────────────────────────────────────────────
  private initResize() {
    if (!this.dogContainer?.nativeElement) return;
    this.resizeObserver = new ResizeObserver(entries => {
      for (const e of entries) this.ngZone.run(() => { this.containerWidth = e.contentRect.width; this.clamp(); });
    });
    this.resizeObserver.observe(this.dogContainer.nativeElement);
  }

  private updateMetrics() {
    this.containerWidth = this.dogContainer?.nativeElement?.clientWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 0);
  }

  private clamp() {
    const max = this.containerWidth - 110;
    const pos = this.currentPixelPosition();
    if (pos > max) this.currentPixelPosition.set(max);
    else if (pos < 0) this.currentPixelPosition.set(0);
  }

  // ── Keyframes ─────────────────────────────────────────────────────────
  private injectKeyframes() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('dog-sprite-kf')) {
      const s = document.createElement('style');
      s.id = 'dog-sprite-kf';
      s.innerHTML = `@keyframes play-sprite { from { background-position-x: 0px; } to { background-position-x: var(--sprite-width); } }`;
      document.head.appendChild(s);
    }
  }
}
