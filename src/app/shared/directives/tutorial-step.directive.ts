import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { TutorialGuideService } from '../../services/tutorial-guide.service';

/**
 * Directive to mark elements as tutorial steps.
 * When the tutorial is active and this element is highlighted,
 * clicking it will advance to the next step.
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

  ngOnInit(): void {
    if (this.ptTutorialStep) {
      this.tutorialService.registerElement(
        this.ptTutorialStep,
        this.elementRef
      );
    }
  }

  ngOnDestroy(): void {
    if (this.ptTutorialStep) {
      this.tutorialService.unregisterElement(this.ptTutorialStep);
    }
  }

  /**
   * Intercept clicks when this element is the current tutorial step
   */
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (this.tutorialService.shouldInterceptClick(this.ptTutorialStep)) {
      // Notify the service that this element was clicked
      this.tutorialService.onElementClick(this.ptTutorialStep);
      // Don't stop propagation - let the actual click happen too
    }
  }
}
