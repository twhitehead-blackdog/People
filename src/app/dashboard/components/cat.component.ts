import { NgStyle } from '@angular/common';
import {
  afterNextRender, ChangeDetectionStrategy, Component,
  computed, effect, ElementRef, HostListener,
  inject, input, NgZone, OnDestroy, OnInit,
  signal, untracked, ViewChild,
} from '@angular/core';

// Cat spritesheet: assets_cat/cat.png (and cat_orange.png, cat_black.png)
// Sheet: 352×1696 px, each frame 16×16 px.
// Display scale: 5x → 80px per frame.
// key animation rows (y offset in original px, *5 for display):
const SCALE = 5;
const FRAME = 16 * SCALE; // 80px

interface CatAnim { y: number; frames: number; duration: string; }

const ANIMS: Record<string, CatAnim> = {
  idle:     { y: 0,   frames: 6, duration: '1.0s'  }, // row 0: sitting idle
  walking:  { y: 96,  frames: 8, duration: '0.55s' }, // row 6: side walk right
  sleeping: { y: 192, frames: 2, duration: '2.5s'  }, // row 12: curled sleeping
  meowing:  { y: 16,  frames: 8, duration: '0.7s'  }, // row 1: waving paw / meow
  eating:   { y: 32,  frames: 6, duration: '0.9s'  }, // row 2: crouching / sniffing
};

const SKINS = [
  'assets_cat/cat.png',
  'assets_cat/cat_orange.png',
  'assets_cat/cat_black.png',
];

const MSGS: Record<string, string[]> = {
  idle:    ['...🐱', '*parpadea lento*', 'Mrrr~', '¿Qué quieres? 😾', '*bosteza*', '*te ignora elegantemente*',
            '¿Me observas? 😏', 'Tengo cosas que hacer.', '*cola en alto*', '*limpieza seria*'],
  walking: ['Inspeccionando~', '*ronda de control*', 'Todo mío. 😼', '*patrulla felina*',
            'Territorio asegurado.', '*camina con dignidad*'],
  meowing: ['¡Miau! 🐱', '¡MIAU!', 'Mrrow~', '¡MIAUUU!', '*opinión importante*',
            '¡Escúchame! 😾', 'Miau miau miau.', '¡Néeee!'],
  sleeping: ['Zzz... 💤', '*ronronea* 😴', 'No molestar. 🚫', 'Zzz~ purrr~',
             '*sueña con sardinas*', '💤💤'],
  eating:  ['*come elegantemente* 🐟', '¡Qué rico! 🐟', '*no comparte*', 'Mmmm~',
            '*come y te ignora*', '¡COMIDA! 😻'],
  pet:     ['Purrr... 😻', '*ronronea fuerte*', 'Mmm... aceptable.', '*cierra los ojos*',
            'Más. 🐾', '*amasa*', 'Purrr purrr~'],
  grumpy:  ['¡SISSS! 😾', '¡NO ME TOQUES!', '*arañazo inminente*', 'GRR 😾',
            '¡Fuera de mi zona!', '*orejas atrás*'],
  drag:    ['¡OYE! 😾', '¡Suéltame!', '*rasguño garantizado*', '¡Esto es un CRIMEN!'],
  drop:    ['*sacude el pelaje* 😾', '...me las pagas.', '*dignidad recuperada*', 'Nunca más.'],
  greet:   [
    '¡Llegaste! *baja del estante* 🐱', 'Oh, eres tú. *ronronea*',
    '*se frota en tus piernas* 🐾', '¡Miau! ¡Te esperaba! 😻',
    'Llegaste. Ya puedes servirme. 😼', '*te mira desde arriba*',
    '¡Miau! Tengo cosas que decirte 🐱', 'Mmm. Llegas. *amasa el aire*',
  ],
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
    .cat-wrapper   { position:relative; width:80px; user-select:none; -webkit-user-select:none; }
    .cat-sprite    { width:80px; height:80px; background-repeat:no-repeat; image-rendering:pixelated;
                     background-size:1760px 8480px; }
    .cat-shadow    { position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
                     width:55px; height:8px; background:rgba(0,0,0,.3); border-radius:50%;
                     filter:blur(3px); animation:cat-shadow-pulse 1.8s ease-in-out infinite; }
    .cat-bubble    { position:absolute; bottom:88px; left:50%; transform:translateX(-50%);
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
  `,
})
export class CatAnimationComponent implements OnInit, OnDestroy {
  private ngZone = inject(NgZone);

  @ViewChild('catWrapper')   catWrapper!:   ElementRef<HTMLDivElement>;
  @ViewChild('catContainer') catContainer!: ElementRef<HTMLDivElement>;

  public muted        = input<boolean>(false);
  public selectedName = input<string>('');

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

  public heartList: { id: number; delay: number; dx: number; e: string }[] = [];

  private anim         = signal<string>('idle');
  private direction    = signal<'left'|'right'>('right');
  private skin         = SKINS[0];
  private containerW   = 0;
  private isDestroyed  = false;
  private isSleeping   = false;
  private tids:        ReturnType<typeof setTimeout>[] = [];
  private sleepTimer:  ReturnType<typeof setTimeout> | null = null;
  private heartCounter = 0;
  private rafId:       number | null = null;
  private resizeObs:   ResizeObserver | null = null;
  private dragMoveH:   ((e: MouseEvent) => void) | null = null;
  private dragUpH:     (() => void) | null = null;
  private dragStartX   = 0;
  private didDrag      = false;
  private clickCount   = 0;
  private lastClickT   = 0;
  private clickResetT: ReturnType<typeof setTimeout> | null = null;

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
  }

  async ngOnInit() {
    this.skin = SKINS[Math.floor(Math.random() * SKINS.length)];
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

  // ── Resize ─────────────────────────────────────────────────────────────
  private initResize() {
    if (!this.catContainer?.nativeElement) return;
    const update = (w: number) => { this.ngZone.run(() => { this.containerW = w; }); };
    update(this.catContainer.nativeElement.offsetWidth || window.innerWidth);
    this.resizeObs = new ResizeObserver(e => update(e[0].contentRect.width));
    this.resizeObs.observe(this.catContainer.nativeElement);
  }

  private async preloadSkin() {
    await Promise.all(Object.values(ANIMS).map(a => new Promise<void>(r => {
      const img = new Image(); img.onload = img.onerror = () => r(); img.src = this.skin;
    })));
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
        this.playGrowl();
      });
    }
    const c = this.catContainer?.nativeElement;
    if (!c) return;
    const newX = Math.max(0, Math.min(e.clientX - c.getBoundingClientRect().left - 40, this.containerW - 90));
    this.ngZone.run(() => { this.moveDur.set(0); this.pos.set(newX); });
  }

  private onDragUp() {
    this.removeDragListeners();
    if (!this.didDrag) return;
    this.ngZone.run(() => {
      this.isDragging.set(false);
      this.setAnim('meowing');
      this.showMsg(rnd(MSGS['drop']));
      this.playGrowl();
      const calm = setTimeout(() => {
        if (!this.isDestroyed) { this.grumpy.set(false); this.showMsg('...fine. 😾'); }
      }, 10_000);
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
    if (this.grumpy()) {
      this.clearActions();
      this.setAnim('meowing');
      this.playGrowl();
      this.showMsg(rnd(MSGS['grumpy']));
      const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(800); } }, 1000);
      this.tids.push(id);
      return;
    }
    const now = Date.now();
    this.clickCount++;
    if (this.clickResetT) clearTimeout(this.clickResetT);
    this.clickResetT = setTimeout(() => { this.clickCount = 0; }, 600);
    this.lastClickT  = now;

    this.clearActions();
    this.resetSleepTimer();
    this.setAnim('meowing');
    this.playSqueak();
    this.spawnHearts(this.clickCount >= 4 ? 8 : 4);
    this.showMsg(rnd(MSGS['pet']));
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(2000); }
    }, 1200);
    this.tids.push(id);
  }

  // ── Greeting ───────────────────────────────────────────────────────────
  private greetByName(name: string) {
    if (this.isDestroyed || this.isSleeping) return;
    const first = name.split(' ')[0];
    const greets = [
      ...MSGS['greet'],
      `¡Miau, ${first}! 🐱`, `*se frota en ${first}* 🐾`,
      `${first}... aceptable. 😼`, `¡${first}! *ronronea fuerte*`,
      `¡${first} llegó! ¡Miau! 😻`, `*mira a ${first} desde arriba* 🐱`,
      `${first}: aprobado/a por el gato ✅🐾`, `¡Miau ${first}~! 💕`,
      `¡${first}! El gato te da permiso de entrada 🐱`,
    ];
    this.clearActions();
    this.setAnim('meowing');
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
    const isLunch = h >= 12 && h < 14;

    if (roll < 0.28)       { this.doWalk(); }
    else if (roll < 0.40)  { this.doMeow(); }
    else if (roll < 0.50)  { this.doEat(); }
    else if (roll < 0.55)  { this.setAnim('idle'); this.showMsg(rnd(MSGS['idle'])); this.scheduleNext(2200); }
    else if (roll < 0.62)  { if (isLunch) this.doEat(); else this.doMeow(); }
    else if (roll < 0.68)  { this.enterSleep(); }
    else                    { this.setAnim('idle'); this.scheduleNext(1500); }
    this.resetSleepTimer();
  }

  private doWalk() {
    const minPos = 10, maxPos = Math.max(20, this.containerW - 90);
    let target   = Math.random() * (maxPos - minPos) + minPos;
    if (Math.abs(target - this.pos()) < 80)
      target = this.pos() > this.containerW / 2 ? minPos + 30 : maxPos - 30;

    this.direction.set(target > this.pos() ? 'right' : 'left');
    const dist = Math.abs(target - this.pos());
    const dur  = Math.min(dist / 60, 5);
    this.moveDur.set(dur);
    this.isWalking.set(true);
    this.setAnim('walking');
    this.pos.set(target);

    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.isWalking.set(false); this.setAnim('idle'); this.scheduleNext(600); }
    }, dur * 1000 + 50);
    this.tids.push(id);
  }

  private doMeow() {
    this.setAnim('meowing');
    this.showMsg(rnd(MSGS['meowing']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(600); } }, 2000);
    this.tids.push(id);
  }

  private doEat() {
    this.setAnim('eating');
    this.showMsg(rnd(MSGS['eating']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.setAnim('idle'); this.scheduleNext(800); } }, 2500);
    this.tids.push(id);
  }

  private enterSleep() {
    this.isSleeping = true;
    this.setAnim('sleeping');
    this.showMsg(rnd(MSGS['sleeping']));
  }

  private wakeUp() {
    this.isSleeping = false;
    this.setAnim('meowing');
    this.showMsg('¡Eh! ¿Qué? 😾');
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
    const emojis = kisses ? ['💕','😻','🐾','❤️','✨'] : ['❤️','🧡','💛','💕','🩷'];
    this.heartList = Array.from({ length: count }, (_, i) => ({
      id: this.heartCounter++, delay: i * 0.1,
      dx: (Math.random() - 0.5) * 50,
      e: emojis[Math.floor(Math.random() * emojis.length)],
    }));
    this.showHearts.set(true);
    const id = setTimeout(() => { if (!this.isDestroyed) this.showHearts.set(false); }, 1600);
    this.tids.push(id);
  }

  private resetSleepTimer() {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    this.sleepTimer = setTimeout(() => {
      if (!this.isDestroyed && !this.isSleeping) this.enterSleep();
    }, 3 * 60 * 1000);
  }

  private playSqueak() {
    if (this.muted() || typeof window === 'undefined') return;
    try {
      const a = new Audio('sounds/squirrel.mp3'); a.volume = 0.5;
      a.play().catch(() => {});
    } catch {}
  }

  private playGrowl() {
    if (this.muted() || typeof window === 'undefined') return;
    try {
      const a = new Audio('sounds/growl.mp3'); a.volume = 0.45;
      a.play().catch(() => {});
    } catch {}
  }
}
