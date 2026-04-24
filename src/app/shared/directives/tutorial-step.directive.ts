import {
  Directive,
  effect,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { TutorialGuideService } from '../../services/tutorial-guide.service';

const HIGHLIGHT_STYLES: Partial<CSSStyleDeclaration> = {
  outline: '3px solid #3b82f6',
  outlineOffset: '4px',
  boxShadow: '0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(59,130,246,0.2)',
  borderRadius: '8px',
  transition: 'outline 0.3s, box-shadow 0.3s',
};

/**
 * Directive to mark elements as tutorial steps.
 * When this element is the current tutorial step, it receives
 * a highlight style (outline + glow) applied directly.
 *
 * Usage: <element ptTutorialStep="step-id" />
 */
@Directive({
  selector: '[ptTutorialStep]',
  standalone: true,
})
export class TutorialStepDirective implements OnInit, OnDestroy {
  @Input({ required: true }) ptTutorialStep!: string;

  private elementRef = inject(ElementRef);
  private tutorialService = inject(TutorialGuideService);
  private isHighlighted = false;

  constructor() {
    // React to tutorial step changes — highlight/unhighlight this element
    effect(() => {
      const currentStep = this.tutorialService.currentStep();
      const isActive = this.tutorialService.isActive();
      const shouldHighlight =
        isActive && currentStep?.id === this.ptTutorialStep;

      if (shouldHighlight && !this.isHighlighted) {
        this.applyHighlight();
      } else if (!shouldHighlight && this.isHighlighted) {
        this.removeHighlight();
      }
    });
  }

  ngOnInit(): void {
    if (this.ptTutorialStep) {
      this.tutorialService.registerElement(
        this.ptTutorialStep,
        this.elementRef
      );
    }
  }

  ngOnDestroy(): void {
    if (this.isHighlighted) {
      this.removeHighlight();
    }
    if (this.ptTutorialStep) {
      this.tutorialService.unregisterElement(this.ptTutorialStep);
    }
  }

  /**
   * Intercept clicks when this element is the current tutorial step
   */
  @HostListener('click')
  onClick(): void {
    if (this.tutorialService.shouldInterceptClick(this.ptTutorialStep)) {
      this.tutorialService.onElementClick(this.ptTutorialStep);
    }
  }

  private applyHighlight(): void {
    const el = this.elementRef.nativeElement as HTMLElement;
    for (const [key, value] of Object.entries(HIGHLIGHT_STYLES)) {
      (el.style as any)[key] = value;
    }
    this.isHighlighted = true;

    // Scroll into view only once, without smooth to avoid jitter
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!inView) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    }, 30);
  }

  private removeHighlight(): void {
    const el = this.elementRef.nativeElement as HTMLElement;
    for (const key of Object.keys(HIGHLIGHT_STYLES)) {
      (el.style as any)[key] = '';
    }
    this.isHighlighted = false;
  }
}
