import { NgStyle } from '@angular/common';
import {
  afterNextRender, ChangeDetectionStrategy, Component,
  computed, effect, ElementRef, HostListener,
  inject, input, NgZone, OnDestroy, OnInit,
  signal, untracked, ViewChild,
} from '@angular/core';

// Cat spritesheet: assets_cat/cat.png (and cat_orange.png, cat_black.png)
// Sheet: 352x1696 px, each frame 16x16 px.
// Display scale: 5x -> 80px per frame.
// Section map (from reference image color analysis):
//   REST  rows 0-7    | WALK  rows 8-23   | SLEEP rows 24-39
//   EAT   rows 40-55  | MEOW  rows 56-63  | YAWN  rows 64-71
//   WASH  rows 72-76  | ITCH  rows 78-81  | HISS  rows 82-85
//   PAW   rows 88-103 | HIND  rows 104-105
const DISPLAY_SIZE = 100; // Match dog's 100px size
const SCALE = DISPLAY_SIZE / 16; // 6.25
const FRAME = DISPLAY_SIZE; // 100px

interface CatAnim { y: number; frames: number; duration: string; }

// y = row * 16 (original px). frames = usable frame count per row.
const ANIMS: Record<string, CatAnim> = {
  // ── REST (rows 0-7) ──
  idle:           { y: 0,    frames: 6,  duration: '1.0s'  },
  idle_wave:      { y: 16,   frames: 8,  duration: '0.7s'  },
  idle_lie:       { y: 32,   frames: 6,  duration: '0.9s'  },
  idle_lie2:      { y: 48,   frames: 8,  duration: '1.2s'  },
  idle_back:      { y: 64,   frames: 6,  duration: '1.5s'  },
  idle_back2:     { y: 80,   frames: 6,  duration: '1.5s'  },
  idle_walk:      { y: 96,   frames: 8,  duration: '0.55s' },
  idle_stretch:   { y: 112,  frames: 8,  duration: '1.0s'  },

  // ── WALK (rows 8-23) ──
  walk_down:      { y: 128,  frames: 4,  duration: '0.45s' },
  walk_up:        { y: 144,  frames: 4,  duration: '0.45s' },
  walk_right:     { y: 160,  frames: 8,  duration: '0.55s' },
  walk_left:      { y: 176,  frames: 8,  duration: '0.55s' },

  // ── VERIFIED ORIGINAL (row 12) ──
  sleep_orig:     { y: 192,  frames: 2,  duration: '2.5s'  },

  // ── SLEEP (rows 24-39) ──
  sleep_1:        { y: 384,  frames: 2,  duration: '2.5s'  },
  sleep_2:        { y: 400,  frames: 2,  duration: '2.5s'  },
  sleep_3:        { y: 416,  frames: 2,  duration: '2.5s'  },
  sleep_4:        { y: 432,  frames: 2,  duration: '2.5s'  },
  sleep_5:        { y: 448,  frames: 2,  duration: '2.5s'  },
  sleep_6:        { y: 464,  frames: 2,  duration: '2.5s'  },
  sleep_7:        { y: 480,  frames: 2,  duration: '2.5s'  },
  sleep_8:        { y: 496,  frames: 2,  duration: '2.5s'  },

  // ── EAT (rows 40-55) ──
  eat_1:          { y: 640,  frames: 8,  duration: '0.9s'  },
  eat_2:          { y: 656,  frames: 8,  duration: '0.9s'  },
  eat_3:          { y: 672,  frames: 8,  duration: '0.9s'  },
  eat_4:          { y: 688,  frames: 8,  duration: '0.9s'  },

  // ── MEOW (rows 56-63) ──
  meow_1:         { y: 896,  frames: 3,  duration: '0.7s'  },
  meow_2:         { y: 912,  frames: 3,  duration: '0.7s'  },
  meow_3:         { y: 944,  frames: 3,  duration: '0.7s'  },
  meow_4:         { y: 960,  frames: 3,  duration: '0.7s'  },

  // ── YAWN (rows 64-71) ──
  yawn_1:         { y: 1024, frames: 8,  duration: '1.2s'  },
  yawn_2:         { y: 1040, frames: 8,  duration: '1.2s'  },
  yawn_3:         { y: 1056, frames: 8,  duration: '1.2s'  },
  yawn_4:         { y: 1072, frames: 8,  duration: '1.2s'  },

  // ── WASH (rows 72-76) ──
  wash_1:         { y: 1152, frames: 9,  duration: '1.2s'  },
  wash_2:         { y: 1168, frames: 9,  duration: '1.2s'  },
  wash_3:         { y: 1200, frames: 7,  duration: '1.0s'  },

  // ── ITCH (rows 78-81) ──
  scratch_1:      { y: 1248, frames: 11, duration: '0.8s'  },
  scratch_2:      { y: 1264, frames: 11, duration: '0.8s'  },

  // ── HISS (rows 82-85) ──
  hiss_1:         { y: 1312, frames: 2,  duration: '0.5s'  },
  hiss_2:         { y: 1328, frames: 2,  duration: '0.5s'  },

  // ── PAW ATTACK (rows 88-103) ──
  paw_1:          { y: 1408, frames: 9,  duration: '0.5s'  },
  paw_2:          { y: 1424, frames: 9,  duration: '0.5s'  },

  // ── HIND LEGS (rows 104-105) ──
  hind_legs:      { y: 1664, frames: 4,  duration: '0.8s'  },
};

// Animation groups for random variant selection
const GROUPS: Record<string, string[]> = {
  idle:       ['idle', 'idle_wave', 'idle_lie', 'idle_lie2', 'idle_back', 'idle_back2'],
  walking:    ['idle_walk'],
  sleeping:   ['sleep_orig', 'sleep_orig', 'sleep_1', 'sleep_2', 'sleep_3', 'sleep_4', 'sleep_5', 'sleep_6'],
  eating:     ['idle_lie', 'idle_lie', 'eat_1', 'eat_2', 'eat_3', 'eat_4'],
  meowing:    ['idle_wave', 'idle_wave', 'meow_1', 'meow_2', 'meow_3', 'meow_4'],
  yawning:    ['yawn_1', 'yawn_2', 'yawn_3', 'yawn_4'],
  washing:    ['wash_1', 'wash_2', 'wash_3'],
  scratching: ['scratch_1', 'scratch_2'],
  hissing:    ['hiss_1', 'hiss_2'],
  attacking:  ['paw_1', 'paw_2'],
};

function pickGroup(group: string): string {
  const variants = GROUPS[group] ?? ['idle'];
  return variants[Math.floor(Math.random() * variants.length)];
}

const SKINS = [
  'assets_cat/cat.png',
  'assets_cat/cat_orange.png',
  'assets_cat/cat_black.png',
];

const MSGS: Record<string, string[]> = {
  idle:    ['...', '*parpadea lento*', 'Mrrr~', '...que quieres?', '*bosteza*', '*te ignora elegantemente*',
            'Me observas?', 'Tengo cosas que hacer.', '*cola en alto*', '*limpieza seria*',
            '*se lame la pata*', 'Aburrido.', '*mira por la ventana*'],
  walking: ['Inspeccionando~', '*ronda de control*', 'Todo mio.', '*patrulla felina*',
            'Territorio asegurado.', '*camina con dignidad*', '*paseo real*', 'No me sigas.'],
  meowing: ['Miau!', 'MIAU!', 'Mrrow~', 'MIAUUU!', '*opinion importante*',
            'Escuchame!', 'Miau miau miau.', 'Neeee!', '*reclamo oficial*', 'PRESTA ATENCION.'],
  sleeping: ['Zzz...', '*ronronea*', 'No molestar.', 'Zzz~ purrr~',
             '*suena con sardinas*', '*suena con pajaritos*', '*patitas se mueven*', 'Purrr...'],
  eating:  ['*come elegantemente*', 'Que rico!', '*no comparte*', 'Mmmm~',
            '*come y te ignora*', 'COMIDA!', '*crunch crunch*', 'Mas.', 'Aceptable.'],
  pet:     ['Purrr...', '*ronronea fuerte*', 'Mmm... aceptable.', '*cierra los ojos*',
            'Mas.', '*amasa*', 'Purrr purrr~', '*se derrite*', 'No pares.'],
  grumpy:  ['SISSS!', 'NO ME TOQUES!', '*aranazo inminente*', 'GRR',
            'Fuera de mi zona!', '*orejas atras*', 'Te arrepentiras.'],
  drag:    ['OYE!', 'Sueltame!', '*rasguNo garantizado*', 'Esto es un CRIMEN!', 'AUXILIO!'],
  drop:    ['*sacude el pelaje*', '...me las pagas.', '*dignidad recuperada*', 'Nunca mas.'],
  greet:   [
    'Llegaste! *baja del estante*', 'Oh, eres tu. *ronronea*',
    '*se frota en tus piernas*', 'Miau! Te esperaba!',
    'Llegaste. Ya puedes servirme.', '*te mira desde arriba*',
    'Miau! Tengo cosas que decirte', 'Mmm. Llegas. *amasa el aire*',
  ],
  yawning: ['*bostezo enorme*', 'Aaahh~', '*bosteza con estilo*', 'Sueeeno...',
            '*bostezo contagioso*', 'Me aburres.', '*mandibula al piso*'],
  washing: ['*limpieza seria*', '*se lava la cara*', 'Higiene primero.', '*bano de gato*',
            '*lamida profesional*', 'Perfeccion.', '*se acicala*', 'Impecable.'],
  scratching: ['*rascarse es arte*', '*fsssh fsssh*', 'Pulgas? NUNCA.', '*rascada intensa*',
               'Aaahh que rico~', '*se rasca con estilo*', '*posterior izquierdo...*'],
  hissing: ['FSSSSS!', 'NO!', '*bufido mortal*', 'ATRAS!', '*cola esponjada*',
            'Te lo adverti!', 'KSSSSHH!', '*modo demonioactivado*'],
  attack:  ['ZAR!', 'Toma eso!', '*garras fuera*', 'ATAQUE FELINO!',
            '*combo de patitas*', 'POW!', '*furia gatuna*'],
  hind:    ['*se para en dos patas*', 'Soy alto!', '*inspeccion de altura*',
            'Que hay alla arriba?', '*modo suricata*'],
  friday:  ['VIERNESSS!!', 'FINDE!', '*baile de viernes*', 'Fiesta gatuna!'],
  monday:  ['Lunes...', 'Por que no es viernes?', '*existencia es dolor*', 'No.'],
};

// Position-specific greetings (mirroring dog's approach)
const POS_GREETS: Record<string, string[]> = {
  peluquer: ['Las tijeras estan listas! *ronronea*', '*inspecciona el pelaje*', 'Estilista! Corta mi pelo~'],
  veterinar: ['Dr(a). en el edificio! *ronronea*', '*se esconde debajo del mueble*', 'No me pongas vacunas!'],
  gerente: ['El jefe ha llegado! *se sienta derecho*', '*finge que trabaja*', 'Miau, jefe.'],
  motorista: ['*mira la moto con curiosidad*', 'Llevame! *salta*', 'Miau! Paseo en moto!'],
  recepcion: ['*se sienta en el mostrador*', 'Yo soy la recepcionista aqui.', '*atiende llamadas*'],
  contador: ['*se sienta en los papeles*', 'Los numeros cuadran. *ronronea*', '*empuja la calculadora*'],
};

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

@Component({
  selector: 'pt-cat-animation',
  standalone: true,
  imports: [NgStyle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #catContainer style="position:fixed;bottom:0;left:0;width:100%;height:0;pointer-events:none;z-index:9999;">
      <div
        #catWrapper
        style="position:absolute;bottom:-20px;"
        class="cursor-pointer pointer-events-auto cat-wrapper"
        [class.opacity-0]="!isReady()"
        [class.opacity-100]="isReady()"
        (mousedown)="onMouseDown($event)"
        (click)="onClick()"
        [style.transform]="'translateX(' + pos() + 'px)'"
        [class.transition-transform]="isWalking() && !isDragging()"
        [style.transition-duration]="moveDur() + 's'"
        [style.transition-timing-function]="'linear'"
      >
        <!-- Bubble -->
        @if (showTip()) {
          <div class="cat-bubble" [class.cat-bubble--grumpy]="grumpy()">{{ tip() }}</div>
        }

        <!-- Sprite -->
        <div class="cat-sprite" [ngStyle]="spriteStyle()" [style.filter]="spriteFilter()"></div>

        <!-- Shadow -->
        <div class="cat-shadow"></div>

        <!-- Hearts on pet -->
        @if (showHearts()) {
          <div class="cat-hearts">
            @for (h of heartList; track h.id) {
              <span class="cat-heart" [style.--delay]="h.delay+'s'" [style.--dx]="h.dx+'px'">{{ h.e }}</span>
            }
          </div>
        }

        <!-- Paw prints -->
        @if (showPaws()) {
          <div class="cat-paws">
            @for (p of pawList; track p.id) {
              <span class="cat-paw" [style.--paw-x]="p.x+'px'" [style.--paw-delay]="p.delay+'s'">&#x1f43e;</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    @keyframes cat-sprite-play {
      from { background-position-x: 0; }
      to   { background-position-x: var(--cat-end-x); }
    }
    @keyframes cat-bubble-in {
      from { opacity:0; transform:translateX(-50%) translateY(6px) scale(.85); }
      to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
    }
    @keyframes cat-shadow-pulse {
      0%,100% { transform:translateX(-50%) scaleX(1); opacity:.2; }
      50%      { transform:translateX(-50%) scaleX(.8); opacity:.12; }
    }
    @keyframes cat-heart-up {
      0%   { opacity:1; transform:translateY(0) translateX(var(--dx)) scale(.8); }
      100% { opacity:0; transform:translateY(-50px) translateX(var(--dx)) scale(1.2); }
    }
    @keyframes cat-paw-fade {
      0%   { opacity:.5; transform:translateX(var(--paw-x)) scale(.8); }
      100% { opacity:0;  transform:translateX(var(--paw-x)) scale(.5); }
    }
    .cat-wrapper   { position:relative; width:100px; user-select:none; -webkit-user-select:none; }
    .cat-sprite    { width:100px; height:100px; background-repeat:no-repeat; image-rendering:pixelated;
                     background-size:2200px 10600px; }
    .cat-shadow    { position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
                     width:65px; height:10px; background:rgba(0,0,0,.3); border-radius:50%;
                     filter:blur(3px); animation:cat-shadow-pulse 1.8s ease-in-out infinite; }
    .cat-bubble    { position:absolute; bottom:108px; left:50%; transform:translateX(-50%);
                     background:white; color:#1f2937; font-size:.7rem; font-weight:600;
                     padding:4px 10px; border-radius:12px; white-space:normal;
                     max-width:min(200px,55vw); text-align:center; line-height:1.3;
                     box-shadow:0 3px 10px rgba(0,0,0,.18); border:1px solid #e5e7eb;
                     animation:cat-bubble-in .2s ease-out; pointer-events:none;
                     user-select:none; -webkit-user-select:none; z-index:50; }
    .cat-bubble::after { content:''; position:absolute; bottom:-5px; left:50%;
                         transform:translateX(-50%) rotate(45deg); width:8px; height:8px;
                         background:white; border-right:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb; }
    .cat-bubble--grumpy { background:#fee2e2; border-color:#fca5a5; color:#991b1b; }
    .cat-bubble--grumpy::after { background:#fee2e2; border-color:#fca5a5; }
    .cat-hearts    { position:absolute; bottom:calc(100% + 4px); left:50%; transform:translateX(-50%); pointer-events:none; }
    .cat-heart     { position:absolute; font-size:1rem; animation:cat-heart-up 1s ease-out forwards;
                     animation-delay:var(--delay,0s); opacity:0; }
    .cat-paws      { position:absolute; bottom:15px; left:50%; pointer-events:none; }
    .cat-paw       { position:absolute; font-size:.6rem; opacity:0;
                     animation:cat-paw-fade 2s ease-out forwards;
                     animation-delay:var(--paw-delay,0s); }
    @media (max-width: 768px) { :host { display: none; } }
  `,
})
export class CatAnimationComponent implements OnInit, OnDestroy {
  private ngZone = inject(NgZone);

  @ViewChild('catWrapper')   catWrapper!:   ElementRef<HTMLDivElement>;
  @ViewChild('catContainer') catContainer!: ElementRef<HTMLDivElement>;

  // ── Inputs (matching dog component API) ────────────────────────────────
  public muted            = input<boolean>(false);
  public selectedName     = input<string>('');
  public selectedPosition = input<string>('');
  public selectedDept     = input<string>('');
  public selectedGender   = input<'M'|'F'|''>('');

  // ── State ──────────────────────────────────────────────────────────────
  public isReady    = signal(false);
  public pos        = signal(100);
  public moveDur    = signal(0);
  public showTip    = signal(false);
  public tip        = signal('');
  public isWalking  = signal(false);
  public grumpy     = signal(false);
  public isDragging = signal(false);
  public showHearts = signal(false);
  public showPaws   = signal(false);

  public heartList: { id: number; delay: number; dx: number; e: string }[] = [];
  public pawList:   { id: number; x: number; delay: number }[] = [];

  private anim         = signal<string>('idle');
  private direction    = signal<'left'|'right'>('right');
  private skin         = SKINS[0];
  private containerW   = 0;
  private isDestroyed  = false;
  private isSleeping   = false;
  private tids:        ReturnType<typeof setTimeout>[] = [];
  private sleepTimer:  ReturnType<typeof setTimeout> | null = null;
  private heartCounter = 0;
  private pawCounter   = 0;
  private rafId:       number | null = null;
  private resizeObs:   ResizeObserver | null = null;
  private dragMoveH:   ((e: MouseEvent) => void) | null = null;
  private dragUpH:     (() => void) | null = null;
  private dragStartX   = 0;
  private didDrag      = false;
  private clickCount   = 0;
  private lastClickT   = 0;
  private clickResetT: ReturnType<typeof setTimeout> | null = null;

  private readonly SKIN_KEY     = 'pt_cat_skin_v1';
  private readonly SLEEP_DELAY  = 3 * 60 * 1000;

  // Gender-based skin preferences
  private readonly MALE_SKINS   = [0, 2]; // gray, black
  private readonly FEMALE_SKINS = [1, 0]; // orange, gray

  public spriteFilter = computed(() =>
    this.grumpy() ? 'hue-rotate(320deg) saturate(2) brightness(.85)' : ''
  );

  public spriteStyle = computed(() => {
    const a   = ANIMS[this.anim()] ?? ANIMS['idle'];
    const endX = -(a.frames * FRAME);
    const yOff = -(a.y * SCALE);
    const flip = this.direction() === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
    return {
      'background-image': `url('${this.skin}')`,
      'background-position-y': `${yOff}px`,
      '--cat-end-x': `${endX}px`,
      transform: flip,
      animation: a.frames > 1
        ? `cat-sprite-play ${a.duration} steps(${a.frames}) infinite` : 'none',
    };
  });

  constructor() {
    afterNextRender(() => this.initResize());

    // Greet when employee is selected
    effect(() => {
      const name = this.selectedName();
      if (!name) return;
      const ready = untracked(() => this.isReady());
      if (ready) untracked(() => this.greetByName(name));
      else {
        const id = setTimeout(() => {
          if (!this.isDestroyed && untracked(() => this.isReady())) this.greetByName(name);
        }, 1200);
        this.tids.push(id);
      }
    });

    // Apply gender-based skin when gender changes
    effect(() => {
      const gender = this.selectedGender();
      if (!gender) return;
      const pool = gender === 'M' ? this.MALE_SKINS : this.FEMALE_SKINS;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      this.skin = SKINS[pick] ?? SKINS[0];
    });
  }

  async ngOnInit() {
    this.initSkinRotation();
    await this.preloadSkin();
    if (!this.isDestroyed) {
      this.pos.set(Math.floor(this.containerW * 0.4 + 50));
      this.isReady.set(true);
      this.scheduleNext(800);
      this.resetSleepTimer();
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.tids.forEach(clearTimeout);
    if (this.sleepTimer)  clearTimeout(this.sleepTimer);
    if (this.clickResetT) clearTimeout(this.clickResetT);
    if (this.rafId)       cancelAnimationFrame(this.rafId);
    this.resizeObs?.disconnect();
    this.removeDragListeners();
  }

  // ── Skin rotation (30 min, localStorage) ───────────────────────────────
  private initSkinRotation() {
    const INTERVAL = 1_800_000;
    try {
      const stored = localStorage.getItem(this.SKIN_KEY);
      let data = stored ? JSON.parse(stored) : null;
      const now = Date.now();
      if (!data || now - data.timestamp > INTERVAL) {
        let idx = Math.floor(Math.random() * SKINS.length);
        if (data && SKINS.length > 1) while (idx === data.skinIdx) idx = Math.floor(Math.random() * SKINS.length);
        data = { skinIdx: idx, timestamp: now };
        localStorage.setItem(this.SKIN_KEY, JSON.stringify(data));
      }
      this.skin = SKINS[data.skinIdx] ?? SKINS[0];
    } catch {
      this.skin = SKINS[0];
    }
  }

  // ── Resize ─────────────────────────────────────────────────────────────
  private initResize() {
    if (!this.catContainer?.nativeElement) return;
    const update = (w: number) => { this.ngZone.run(() => { this.containerW = w; }); };
    update(this.catContainer.nativeElement.offsetWidth || window.innerWidth);
    this.resizeObs = new ResizeObserver(e => update(e[0].contentRect.width));
    this.resizeObs.observe(this.catContainer.nativeElement);
  }

  private async preloadSkin() {
    await new Promise<void>(r => {
      const img = new Image(); img.onload = img.onerror = () => r(); img.src = this.skin;
    });
  }

  // ── Mouse proximity ────────────────────────────────────────────────────
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.catWrapper?.nativeElement || !this.isReady() || this.isSleeping) return;
      const rect = this.catWrapper.nativeElement.getBoundingClientRect();
      const cx   = rect.left + rect.width / 2;
      if (Math.abs(e.clientX - cx) > 60 && this.anim() === 'idle') {
        const d = e.clientX > cx ? 'right' : 'left';
        if (this.direction() !== d) this.ngZone.run(() => this.direction.set(d));
      }
    });
  }

  // ── Click & drag ───────────────────────────────────────────────────────
  public onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    this.dragStartX = e.clientX; this.didDrag = false;
    this.dragMoveH = (ev: MouseEvent) => this.onDragMove(ev);
    this.dragUpH   = () => this.onDragUp();
    document.addEventListener('mousemove', this.dragMoveH);
    document.addEventListener('mouseup',   this.dragUpH);
  }

  private onDragMove(e: MouseEvent) {
    if (Math.abs(e.clientX - this.dragStartX) < 8) return;
    if (!this.didDrag) {
      this.didDrag = true;
      this.ngZone.run(() => {
        this.isDragging.set(true);
        this.grumpy.set(true);
        this.clearActions();
        this.setAnim('idle');
        this.showMsg(rnd(MSGS['drag']));
        this.playSound('growl');
      });
    }
    const c = this.catContainer?.nativeElement;
    if (!c) return;
    const newX = Math.max(0, Math.min(e.clientX - c.getBoundingClientRect().left - 40, this.containerW - 110));
    this.ngZone.run(() => { this.moveDur.set(0); this.pos.set(newX); });
  }

  private onDragUp() {
    this.removeDragListeners();
    if (!this.didDrag) return;
    this.ngZone.run(() => {
      this.isDragging.set(false);
      this.setAnim(pickGroup('hissing'));
      this.showMsg(rnd(MSGS['drop']));
      this.playSound('growl');
      const calm = setTimeout(() => {
        if (!this.isDestroyed) { this.grumpy.set(false); this.showMsg('...fine.'); }
      }, 12_000);
      this.tids.push(calm);
      const id = setTimeout(() => {
        if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(1500); }
      }, 1800);
      this.tids.push(id);
    });
  }

  private removeDragListeners() {
    if (this.dragMoveH) { document.removeEventListener('mousemove', this.dragMoveH); this.dragMoveH = null; }
    if (this.dragUpH)   { document.removeEventListener('mouseup',   this.dragUpH);   this.dragUpH   = null; }
  }

  public onClick() {
    if (this.didDrag) return;
    if (this.isSleeping) { this.wakeUp(); return; }

    // Grumpy click → hiss or paw attack
    if (this.grumpy()) {
      this.clearActions();
      if (this.clickCount >= 3) {
        this.setAnim(pickGroup('attacking'));
        this.showMsg(rnd(MSGS['attack']));
      } else {
        this.setAnim(pickGroup('hissing'));
        this.showMsg(rnd(MSGS['hissing']));
      }
      this.playSound('growl');
      const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(800); } }, 1200);
      this.tids.push(id);
      this.clickCount++;
      return;
    }

    const now = Date.now();
    this.clickCount++;
    if (this.clickResetT) clearTimeout(this.clickResetT);
    this.clickResetT = setTimeout(() => { this.clickCount = 0; }, 600);
    this.lastClickT  = now;

    this.clearActions();
    this.resetSleepTimer();

    // Rapid clicks → special reaction
    if (this.clickCount >= 5) {
      this.setAnim('hind_legs');
      this.showMsg(rnd(MSGS['hind']));
      this.spawnHearts(8);
    } else {
      this.setAnim(pickGroup('meowing'));
      this.spawnHearts(this.clickCount >= 3 ? 8 : 4);
      this.showMsg(rnd(MSGS['pet']));
    }
    this.playSound('squeak');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(2000); }
    }, 1200);
    this.tids.push(id);
  }

  // ── Greeting ───────────────────────────────────────────────────────────
  private greetByName(name: string) {
    if (this.isDestroyed || this.isSleeping) return;
    const first = name.split(' ')[0];
    const pos = this.selectedPosition().toLowerCase();

    // Check for position-specific greetings
    let greets: string[] = [];
    for (const [key, msgs] of Object.entries(POS_GREETS)) {
      if (pos.includes(key)) { greets = msgs; break; }
    }

    if (!greets.length) {
      greets = [
        ...MSGS['greet'],
        `Miau, ${first}!`, `*se frota en ${first}*`,
        `${first}... aceptable.`, `${first}! *ronronea fuerte*`,
        `${first} llego! Miau!`, `*mira a ${first} desde arriba*`,
        `${first}: aprobado/a por el gato`, `Miau ${first}~!`,
        `${first}! El gato te da permiso de entrada`,
      ];
    } else {
      greets = [...greets, `Miau, ${first}!`, `*ronronea para ${first}*`];
    }

    this.clearActions();
    this.setAnim(pickGroup('meowing'));
    this.spawnHearts(4, true);
    this.showMsg(rnd(greets));
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(2000); }
    }, 1500);
    this.tids.push(id);
  }

  // ── AI behavior ────────────────────────────────────────────────────────
  private scheduleNext(delay?: number) {
    if (this.isDestroyed) return;
    const d = delay ?? (Math.random() * 2500 + 1000);
    const id = setTimeout(() => this.decide(), d);
    this.tids.push(id);
  }

  private decide() {
    if (this.isDestroyed || this.isSleeping) return;
    const roll = Math.random();
    const h    = new Date().getHours();
    const day  = new Date().getDay();
    const isLunch = h >= 12 && h < 14;
    const isNight = h >= 22 || h < 6;
    const isFriday = day === 5;
    const isMonday = day === 1;

    // Day-specific messages occasionally
    if (isFriday && Math.random() < 0.08) {
      this.setAnim(pickGroup('meowing')); this.showMsg(rnd(MSGS['friday'])); this.scheduleNext(2500); return;
    }
    if (isMonday && Math.random() < 0.08) {
      this.setAnim('idle'); this.showMsg(rnd(MSGS['monday'])); this.scheduleNext(2500); return;
    }

    // Night → more likely to sleep
    if (isNight && roll < 0.40) { this.enterSleep(); return; }

    if      (roll < 0.25) { this.doWalk(); }
    else if (roll < 0.35) { this.doMeow(); }
    else if (roll < 0.43) { this.doEat(); }
    else if (roll < 0.50) { this.doYawn(); }
    else if (roll < 0.56) { this.doWash(); }
    else if (roll < 0.61) { this.doScratch(); }
    else if (roll < 0.66) { this.doIdle(); }
    else if (roll < 0.72) { if (isLunch) this.doEat(); else this.doYawn(); }
    else if (roll < 0.78) { this.enterSleep(); }
    else if (roll < 0.81) { this.doHindLegs(); }
    else                   { this.setAnim('idle'); this.scheduleNext(1500); }

    this.resetSleepTimer();
  }

  private doWalk() {
    const minPos = 10, maxPos = Math.max(20, this.containerW - 110);
    let target   = Math.random() * (maxPos - minPos) + minPos;
    if (Math.abs(target - this.pos()) < 80)
      target = this.pos() > this.containerW / 2 ? minPos + 30 : maxPos - 30;

    const goingRight = target > this.pos();
    this.direction.set(goingRight ? 'right' : 'left');
    const dist = Math.abs(target - this.pos());
    const dur  = Math.min(dist / 60, 5);
    this.moveDur.set(dur);
    this.isWalking.set(true);
    this.setAnim(pickGroup('walking'));
    this.pos.set(target);

    // Spawn paw prints while walking
    this.spawnPaws(goingRight, dist);

    if (Math.random() < 0.3) this.showMsg(rnd(MSGS['walking']));

    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.isWalking.set(false); this.setAnim('idle'); this.scheduleNext(600); }
    }, dur * 1000 + 50);
    this.tids.push(id);
  }

  private doMeow() {
    this.setAnim(pickGroup('meowing'));
    this.showMsg(rnd(MSGS['meowing']));
    this.playSound('squeak');
    const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(600); } }, 2000);
    this.tids.push(id);
  }

  private doEat() {
    this.setAnim(pickGroup('eating'));
    this.showMsg(rnd(MSGS['eating']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(800); } }, 2500);
    this.tids.push(id);
  }

  private doYawn() {
    this.setAnim(pickGroup('yawning'));
    this.showMsg(rnd(MSGS['yawning']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(1000); } }, 2500);
    this.tids.push(id);
  }

  private doWash() {
    this.setAnim(pickGroup('washing'));
    this.showMsg(rnd(MSGS['washing']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(800); } }, 3000);
    this.tids.push(id);
  }

  private doScratch() {
    this.setAnim(pickGroup('scratching'));
    this.showMsg(rnd(MSGS['scratching']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(600); } }, 2000);
    this.tids.push(id);
  }

  private doIdle() {
    const variant = pickGroup('idle');
    this.setAnim(variant);
    if (Math.random() < 0.5) this.showMsg(rnd(MSGS['idle']));
    this.scheduleNext(2200);
  }

  private doHindLegs() {
    this.setAnim('hind_legs');
    this.showMsg(rnd(MSGS['hind']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(1000); } }, 2000);
    this.tids.push(id);
  }

  private enterSleep() {
    this.isSleeping = true;
    this.setAnim(pickGroup('sleeping'));
    this.showMsg(rnd(MSGS['sleeping']));
  }

  private wakeUp() {
    this.isSleeping = false;
    this.setAnim(pickGroup('meowing'));
    this.showMsg('Eh! Que?');
    this.playSound('squeak');
    const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(1000); } }, 1200);
    this.tids.push(id);
    this.resetSleepTimer();
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private setAnim(name: string) { this.anim.set(name); }

  private showMsg(msg: string) {
    this.tip.set(msg); this.showTip.set(true);
    const id = setTimeout(() => { if (!this.isDestroyed) this.showTip.set(false); }, 2800);
    this.tids.push(id);
  }

  private clearActions() { this.tids.forEach(clearTimeout); this.tids = []; }

  private spawnHearts(count = 4, kisses = false) {
    const emojis = kisses ? ['<3', '(^._.^)', '=^..^=', '<3'] : ['<3', '<3', '<3', '<3'];
    this.heartList = Array.from({ length: count }, (_, i) => ({
      id: this.heartCounter++, delay: i * 0.1,
      dx: (Math.random() - 0.5) * 50,
      e: rnd(emojis),
    }));
    this.showHearts.set(true);
    const id = setTimeout(() => { if (!this.isDestroyed) this.showHearts.set(false); }, 1600);
    this.tids.push(id);
  }

  private spawnPaws(goingRight: boolean, dist: number) {
    const count = Math.min(Math.floor(dist / 40), 6);
    this.pawList = Array.from({ length: count }, (_, i) => ({
      id: this.pawCounter++,
      x: goingRight ? -(i * 30) : (i * 30),
      delay: i * 0.3,
    }));
    this.showPaws.set(true);
    const id = setTimeout(() => { if (!this.isDestroyed) this.showPaws.set(false); }, count * 300 + 2000);
    this.tids.push(id);
  }

  private resetSleepTimer() {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    const h = new Date().getHours();
    const isNight = h >= 22 || h < 6;
    const isLunch = h >= 12 && h < 14;
    const delay = isNight ? 60_000 : isLunch ? 90_000 : this.SLEEP_DELAY;
    this.sleepTimer = setTimeout(() => {
      if (!this.isDestroyed && !this.isSleeping) this.enterSleep();
    }, delay);
  }

  private playSound(type: 'squeak' | 'growl') {
    if (this.muted() || typeof window === 'undefined') return;
    try {
      const file = type === 'squeak' ? 'sounds/squirrel.mp3' : 'sounds/growl.mp3';
      const a = new Audio(file);
      a.volume = type === 'squeak' ? 0.5 : 0.45;
      a.play().catch(() => {});
    } catch { /* ignore audio errors */ }
  }
}
