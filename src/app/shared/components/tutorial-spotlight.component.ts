import { NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { Button } from 'primeng/button';
import { TutorialGuideService } from '../../services/tutorial-guide.service';

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

@Component({
  selector: 'pt-tutorial-spotlight',
  standalone: true,
  imports: [NgClass, NgStyle, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tutorialService.isActive()) {
    <!-- Dark overlay with spotlight hole (no blur inside the spotlight) -->
    <div class="tutorial-overlay">
      <!-- Top section -->
      <div
        class="overlay-section"
        [ngStyle]="{
          top: '0',
          left: '0',
          right: '0',
          height: spotlightRect().top + 'px'
        }"
      ></div>
      <!-- Bottom section -->
      <div
        class="overlay-section"
        [ngStyle]="{
          top: spotlightRect().bottom + 'px',
          left: '0',
          right: '0',
          bottom: '0'
        }"
      ></div>
      <!-- Left section -->
      <div
        class="overlay-section"
        [ngStyle]="{
          top: spotlightRect().top + 'px',
          left: '0',
          width: spotlightRect().left + 'px',
          height: spotlightRect().height + 'px'
        }"
      ></div>
      <!-- Right section -->
      <div
        class="overlay-section"
        [ngStyle]="{
          top: spotlightRect().top + 'px',
          right: '0',
          left: spotlightRect().right + 'px',
          height: spotlightRect().height + 'px'
        }"
      ></div>

      <!-- Spotlight border (pulsing ring) -->
      <div class="spotlight-ring" [ngStyle]="spotlightStyle()"></div>

      <!-- Tooltip (short text, click instruction) -->
      <div
        #tooltip
        class="tutorial-tooltip"
        [ngClass]="'arrow-' + tooltipPosition().arrowPosition"
        [ngStyle]="tooltipStyle()"
      >
        <!-- Tooltip content -->
        <div class="tooltip-content">
          <span class="tooltip-text">{{ currentStep()?.tooltip }}</span>
          @if (!tutorialService.showCompletionMessage()) { @if
          (currentStep()?.isPrompt) {
          <span class="click-hint">
            <i class="pi pi-hand-point-up"></i>
            ¡Ahora escoge una!
          </span>
          } @else if (currentStep()?.requireClick === false) {
          <!-- Step with manual navigation - show Next button -->
          <button class="next-button" (click)="next($event)">
            Siguiente
            <i class="pi pi-arrow-right"></i>
          </button>
          } @else {
          <span class="click-hint">
            <i class="pi pi-hand-point-up"></i>
            Haz clic aquí
          </span>
          } }
        </div>

        <!-- Exit button -->
        <button
          class="tooltip-close"
          (click)="exit($event)"
          aria-label="Cerrar tutorial"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Completion message overlay -->
      @if (tutorialService.showCompletionMessage()) {
      <div class="completion-message">
        <i class="pi pi-check-circle"></i>
        <span>¡Ahora selecciona una gestión!</span>
      </div>
      }
    </div>
    }
  `,
  styles: `
    .tutorial-overlay {
      position: fixed;
      inset: 0;
      z-index: 9998;
      pointer-events: none;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .overlay-section {
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      pointer-events: auto;
    }

    .spotlight-ring {
      position: absolute;
      border: 3px solid var(--primary-color, #3b82f6);
      border-radius: 8px;
      box-shadow:
        0 0 20px rgba(59, 130, 246, 0.5),
        inset 0 0 20px rgba(59, 130, 246, 0.1);
      animation: pulse-ring 1.5s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes pulse-ring {
      0%,
      100% {
        opacity: 1;
        box-shadow:
          0 0 20px rgba(59, 130, 246, 0.5),
          inset 0 0 20px rgba(59, 130, 246, 0.1);
      }
      50% {
        opacity: 0.7;
        box-shadow:
          0 0 30px rgba(59, 130, 246, 0.8),
          inset 0 0 30px rgba(59, 130, 246, 0.2);
      }
    }

    .tutorial-tooltip {
      position: absolute;
      max-width: 280px;
      background: linear-gradient(
        135deg,
        rgba(30, 30, 45, 0.98) 0%,
        rgba(20, 20, 35, 0.98) 100%
      );
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow:
        0 10px 30px rgba(0, 0, 0, 0.5),
        0 0 15px rgba(59, 130, 246, 0.3);
      z-index: 9999;
      animation: tooltipIn 0.3s ease-out;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      pointer-events: auto;
    }

    @keyframes tooltipIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* Arrow styles */
    .tutorial-tooltip::before {
      content: '';
      position: absolute;
      width: 12px;
      height: 12px;
      background: rgba(30, 30, 45, 0.98);
      border: 1px solid rgba(59, 130, 246, 0.4);
      transform: rotate(45deg);
    }

    .arrow-top::before {
      top: -7px;
      left: 24px;
      border-bottom: none;
      border-right: none;
    }

    .arrow-bottom::before {
      bottom: -7px;
      left: 24px;
      border-top: none;
      border-left: none;
    }

    .arrow-left::before {
      left: -7px;
      top: 16px;
      border-top: none;
      border-right: none;
    }

    .arrow-right::before {
      right: -7px;
      top: 16px;
      border-bottom: none;
      border-left: none;
    }

    .tooltip-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .tooltip-text {
      color: #fff;
      font-size: 0.95rem;
      font-weight: 500;
      line-height: 1.4;
    }

    .click-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(59, 130, 246, 0.9);
      font-size: 0.8rem;
      animation: bounce 1s ease-in-out infinite;
    }

    @keyframes bounce {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-3px);
      }
    }

    .tooltip-close {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.5);
      transition: all 0.2s;
      flex-shrink: 0;
      font-size: 0.75rem;
    }

    .tooltip-close:hover {
      background: rgba(239, 68, 68, 0.4);
      color: #fff;
    }

    .next-button {
      display: flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      color: white;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
    }

    .next-button:hover {
      background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
      transform: translateX(2px);
    }

    .next-button i {
      font-size: 0.8rem;
    }

    .completion-message {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(
        135deg,
        rgba(34, 197, 94, 0.95) 0%,
        rgba(22, 163, 74, 0.95) 100%
      );
      border-radius: 16px;
      padding: 24px 32px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: white;
      font-size: 1.2rem;
      font-weight: 600;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
      animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: auto;
    }

    .completion-message i {
      font-size: 1.5rem;
    }

    @keyframes popIn {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
  `,
})
export class TutorialSpotlightComponent {
  @ViewChild('tooltip') tooltipRef!: ElementRef;

  public tutorialService = inject(TutorialGuideService);

  private windowSize = signal({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  private elementRect = signal<DOMRect | null>(null);

  // Update element rect when step changes
  constructor() {
    effect(() => {
      // React to step changes
      const step = this.tutorialService.currentStep();
      if (step) {
        // Small delay to allow DOM updates
        setTimeout(() => {
          this.updateElementRect();
        }, 100);
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.windowSize.set({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    this.updateElementRect();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.updateElementRect();
  }

  private updateElementRect(): void {
    const rect = this.tutorialService.getCurrentElementRect();
    this.elementRect.set(rect);

    // Scroll element into view if needed
    if (rect) {
      const padding = 100;
      const isInView =
        rect.top >= padding && rect.bottom <= window.innerHeight - padding;

      if (!isInView) {
        const el = this.tutorialService.currentElement();
        el?.nativeElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        // Update rect after scroll
        setTimeout(() => {
          this.elementRect.set(this.tutorialService.getCurrentElementRect());
        }, 500);
      }
    }
  }

  public currentStep = this.tutorialService.currentStep;

  // Computed for spotlight rectangle (used for overlay sections)
  public spotlightRect = computed(() => {
    const rect = this.elementRect();
    const padding = 8;

    if (!rect) {
      // Default centered position
      const w = this.windowSize();
      return {
        top: w.height / 2 - 50,
        left: w.width / 2 - 100,
        right: w.width / 2 + 100,
        bottom: w.height / 2 + 50,
        width: 200,
        height: 100,
      };
    }

    return {
      top: rect.top - padding,
      left: rect.left - padding,
      right: rect.right + padding,
      bottom: rect.bottom + padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
  });

  public spotlightStyle = computed(() => {
    const r = this.spotlightRect();
    return {
      top: `${r.top}px`,
      left: `${r.left}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    };
  });

  public tooltipPosition = computed((): TooltipPosition => {
    const rect = this.spotlightRect();
    const window = this.windowSize();
    const tooltipWidth = 280;
    const tooltipHeight = 80;
    const gap = 12;

    // Determine best position based on available space
    const spaceAbove = rect.top;
    const spaceBelow = window.height - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = window.width - rect.right;

    let top: number;
    let left: number;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right';

    // Prefer bottom, then top, then right, then left
    if (spaceBelow >= tooltipHeight + gap) {
      top = rect.bottom + gap;
      left = rect.left;
      arrowPosition = 'top';
    } else if (spaceAbove >= tooltipHeight + gap) {
      top = rect.top - tooltipHeight - gap;
      left = rect.left;
      arrowPosition = 'bottom';
    } else if (spaceRight >= tooltipWidth + gap) {
      top = rect.top;
      left = rect.right + gap;
      arrowPosition = 'left';
    } else {
      top = rect.top;
      left = rect.left - tooltipWidth - gap;
      arrowPosition = 'right';
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, window.width - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.height - tooltipHeight - 16));

    return { top, left, arrowPosition };
  });

  public tooltipStyle = computed(() => {
    const pos = this.tooltipPosition();
    return {
      top: `${pos.top}px`,
      left: `${pos.left}px`,
    };
  });

  public exit(event: MouseEvent): void {
    event.stopPropagation();
    this.tutorialService.exit();
  }

  public next(event: MouseEvent): void {
    event.stopPropagation();
    this.tutorialService.next();
  }
}
