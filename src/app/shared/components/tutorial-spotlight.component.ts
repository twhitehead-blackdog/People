import { NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { TutorialGuideService } from '../../services/tutorial-guide.service';

@Component({
  selector: 'pt-tutorial-spotlight',
  standalone: true,
  imports: [NgClass, NgStyle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tutorialService.isActive()) {
    <!-- Light backdrop — purely visual, no pointer blocking -->
    <div class="tutorial-backdrop"></div>

    @if (!isWaitingForElement()) {
    <!-- Tooltip positioned near the highlighted element -->
    <div
      class="tutorial-tooltip"
      [ngClass]="'arrow-' + tooltipPos().arrow"
      [ngStyle]="{ top: tooltipPos().top + 'px', left: tooltipPos().left + 'px' }"
    >
      <div class="tooltip-body">
        <!-- Progress -->
        <div class="tooltip-progress">
          <span class="progress-text">
            {{ tutorialService.currentStepIndex() + 1 }} /
            {{ tutorialService.totalSteps() }}
          </span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              [ngStyle]="{ width: tutorialService.progress() + '%' }"
            ></div>
          </div>
        </div>

        <!-- Content -->
        <p class="tooltip-text">{{ tutorialService.currentStep()?.tooltip }}</p>

        <!-- Actions -->
        <div class="tooltip-actions">
          @if (tutorialService.currentStep()?.requireClick !== false) {
          <span class="click-hint">
            <i class="pi pi-hand-point-up"></i> Haz clic aquí
          </span>
          } @else {
          <button class="btn-next" (click)="next($event)">
            @if (tutorialService.isLastStep()) { Finalizar } @else {
            Siguiente <i class="pi pi-arrow-right"></i>
            }
          </button>
          }
          <button class="btn-close" (click)="exit($event)">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </div>
    </div>
    } @else {
    <!-- Waiting for next element — floating message, NOT blocking -->
    <div class="waiting-pill">
      <i class="pi pi-spin pi-spinner"></i>
      <span>Completa la acción para continuar...</span>
      <button class="btn-close" (click)="exit($event)">
        <i class="pi pi-times"></i>
      </button>
    </div>
    }

    <!-- Completion message -->
    @if (tutorialService.showCompletionMessage()) {
    <div class="completion-toast">
      <i class="pi pi-check-circle"></i>
      <span>¡Ahora selecciona una gestión!</span>
    </div>
    }
    }
  `,
  styles: `
    /* Light backdrop — dims background without blocking clicks */
    .tutorial-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      z-index: 9990;
      pointer-events: none;
      animation: fadeIn 0.25s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ─── Tooltip ─── */
    .tutorial-tooltip {
      position: fixed;
      width: 300px;
      z-index: 9999;
      pointer-events: auto;
      animation: tooltipIn 0.25s ease-out;
    }

    @keyframes tooltipIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .tooltip-body {
      background: linear-gradient(135deg, #1e1e2d 0%, #14142a 100%);
      border: 1px solid rgba(59, 130, 246, 0.45);
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55), 0 0 12px rgba(59, 130, 246, 0.25);
    }

    /* Progress bar */
    .tooltip-progress {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .progress-text {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.7rem;
      white-space: nowrap;
    }
    .progress-bar {
      flex: 1;
      height: 3px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #3b82f6;
      border-radius: 2px;
      transition: width 0.3s;
    }

    /* Text */
    .tooltip-text {
      color: #fff;
      font-size: 0.92rem;
      line-height: 1.45;
      margin: 0 0 10px;
    }

    /* Actions row */
    .tooltip-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .click-hint {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #60a5fa;
      font-size: 0.78rem;
      animation: bounce 1.2s ease-in-out infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }

    .btn-next {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      border: none;
      border-radius: 8px;
      padding: 7px 14px;
      color: #fff;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-next:hover {
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
    }
    .btn-next i { font-size: 0.75rem; }

    .btn-close {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.72rem;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .btn-close:hover {
      background: rgba(239, 68, 68, 0.4);
      color: #fff;
    }

    /* ─── Arrow ─── */
    .tutorial-tooltip::before {
      content: '';
      position: absolute;
      width: 12px;
      height: 12px;
      background: #1e1e2d;
      border: 1px solid rgba(59, 130, 246, 0.45);
      transform: rotate(45deg);
    }
    /* Arrow on top edge → tooltip is BELOW element */
    .arrow-top::before {
      top: -7px;
      left: 50%;
      margin-left: -6px;
      border-bottom: none;
      border-right: none;
    }
    /* Arrow on bottom edge → tooltip is ABOVE element */
    .arrow-bottom::before {
      bottom: -7px;
      left: 50%;
      margin-left: -6px;
      border-top: none;
      border-left: none;
    }
    /* Arrow on left edge → tooltip is RIGHT of element */
    .arrow-left::before {
      left: -7px;
      top: 20px;
      border-top: none;
      border-right: none;
    }
    /* Arrow on right edge → tooltip is LEFT of element */
    .arrow-right::before {
      right: -7px;
      top: 20px;
      border-bottom: none;
      border-left: none;
    }

    /* ─── Waiting pill ─── */
    .waiting-pill {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #1e1e2d, #14142a);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 28px;
      padding: 10px 18px;
      color: #fff;
      font-size: 0.88rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      animation: tooltipIn 0.25s ease-out;
    }
    .waiting-pill i.pi-spinner {
      color: #3b82f6;
    }

    /* ─── Completion toast ─── */
    .completion-toast {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border-radius: 14px;
      padding: 20px 28px;
      color: #fff;
      font-size: 1.15rem;
      font-weight: 600;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
      animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .completion-toast i { font-size: 1.4rem; }

    @keyframes popIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
      to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
  `,
})
export class TutorialSpotlightComponent {
  public tutorialService = inject(TutorialGuideService);

  private windowSize = signal({ width: window.innerWidth, height: window.innerHeight });
  private elementRect = signal<DOMRect | null>(null);

  /** Interval that searches for a not-yet-rendered element */
  private findInterval: ReturnType<typeof setInterval> | null = null;
  /** Interval that keeps the tooltip aligned with the element */
  private trackInterval: ReturnType<typeof setInterval> | null = null;

  public isWaitingForElement = signal(false);

  constructor() {
    effect(() => {
      const step = this.tutorialService.currentStep();
      const isActive = this.tutorialService.isActive();

      // Cleanup previous intervals on every change
      this.stopAll();

      if (!isActive || !step) {
        this.elementRect.set(null);
        return;
      }

      // Give Angular a tick to render/register the directive
      setTimeout(() => this.locateElement(), 0);
    });
  }

  /**
   * Try to find the element; if found start tracking, if not start polling.
   */
  private locateElement(): void {
    this.refreshRect();
    if (this.elementRect()) {
      this.startTracking();
    } else {
      this.startFinding();
    }
  }

  // ── Finding (element not in DOM yet) ──

  private startFinding(): void {
    this.isWaitingForElement.set(true);
    this.findInterval = setInterval(() => {
      this.refreshRect();
      if (this.elementRect()) {
        this.isWaitingForElement.set(false);
        this.clearFinding();
        this.startTracking();
      }
    }, 200);
  }

  private clearFinding(): void {
    if (this.findInterval) {
      clearInterval(this.findInterval);
      this.findInterval = null;
    }
  }

  // ── Tracking (element exists — keep tooltip aligned) ──

  private startTracking(): void {
    // Continuously refresh rect so the tooltip follows the element
    this.trackInterval = setInterval(() => this.refreshRect(), 150);
  }

  private clearTracking(): void {
    if (this.trackInterval) {
      clearInterval(this.trackInterval);
      this.trackInterval = null;
    }
  }

  private stopAll(): void {
    this.clearFinding();
    this.clearTracking();
    this.isWaitingForElement.set(false);
  }

  private refreshRect(): void {
    const rect = this.tutorialService.getCurrentElementRect();
    if (!rect) {
      if (this.elementRect()) this.elementRect.set(null);
      return;
    }
    // Only update signal if position actually changed (avoids re-render jitter)
    const prev = this.elementRect();
    if (
      prev &&
      Math.abs(prev.top - rect.top) < 1 &&
      Math.abs(prev.left - rect.left) < 1 &&
      Math.abs(prev.width - rect.width) < 1 &&
      Math.abs(prev.height - rect.height) < 1
    ) {
      return; // No meaningful change — skip update
    }
    this.elementRect.set(rect);
  }

  // ── Resize ──

  @HostListener('window:resize')
  onResize(): void {
    this.windowSize.set({ width: window.innerWidth, height: window.innerHeight });
  }

  // ── Tooltip positioning (uses step.tooltipPosition preference) ──

  public tooltipPos = computed(() => {
    const rect = this.elementRect();
    const win = this.windowSize();
    const step = this.tutorialService.currentStep();
    const TW = 300;
    const TH = 130;
    const GAP = 14;

    if (!rect) {
      return { top: win.height / 2 - TH / 2, left: win.width / 2 - TW / 2, arrow: 'top' as const };
    }

    // Centre helpers
    const elCenterX = rect.left + rect.width / 2;
    const elCenterY = rect.top + rect.height / 2;

    const preferred = step?.tooltipPosition ?? 'auto';

    let top: number;
    let left: number;
    let arrow: 'top' | 'bottom' | 'left' | 'right';

    const placeBottom = () => {
      top = rect.bottom + GAP;
      left = elCenterX - TW / 2;
      arrow = 'top';
    };
    const placeTop = () => {
      top = rect.top - TH - GAP;
      left = elCenterX - TW / 2;
      arrow = 'bottom';
    };
    const placeRight = () => {
      top = elCenterY - TH / 2;
      left = rect.right + GAP;
      arrow = 'left';
    };
    const placeLeft = () => {
      top = elCenterY - TH / 2;
      left = rect.left - TW - GAP;
      arrow = 'right';
    };

    // Use preferred position if there is enough space, else auto-fallback
    const fits = {
      bottom: win.height - rect.bottom >= TH + GAP,
      top: rect.top >= TH + GAP,
      right: win.width - rect.right >= TW + GAP,
      left: rect.left >= TW + GAP,
    };

    if (preferred !== 'auto' && fits[preferred]) {
      ({ bottom: placeBottom, top: placeTop, right: placeRight, left: placeLeft })[preferred]();
    } else if (fits.top) {
      placeTop();
    } else if (fits.bottom) {
      placeBottom();
    } else if (fits.right) {
      placeRight();
    } else if (fits.left) {
      placeLeft();
    } else {
      placeTop(); // last resort
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(left!, win.width - TW - 12));
    top = Math.max(12, Math.min(top!, win.height - TH - 12));

    return { top, left, arrow: arrow! };
  });

  // ── Actions ──

  public exit(event: MouseEvent): void {
    event.stopPropagation();
    this.tutorialService.exit();
  }

  public next(event: MouseEvent): void {
    event.stopPropagation();
    this.tutorialService.next();
  }
}
