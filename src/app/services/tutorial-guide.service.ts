import { computed, ElementRef, Injectable, signal } from '@angular/core';

/**
 * Configuration for a single tutorial step
 */
export interface TutorialStep {
  /** Unique ID for this step, used to match with directive */
  id: string;
  /** Short tooltip text (keep it brief!) */
  tooltip: string;
  /** If true, user must click the element to advance (default: true) */
  requireClick?: boolean;
  /** Optional: position of the tooltip relative to element */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** If true, this is a "prompt" step - user selects what to do next */
  isPrompt?: boolean;
  /** Message to show when this is the last step */
  completionMessage?: string;
}

/**
 * Configuration for a complete tutorial flow
 */
export interface TutorialConfig {
  /** Unique ID for the tutorial */
  id: string;
  /** Display name for the tutorial */
  name: string;
  /** Array of steps in order */
  steps: TutorialStep[];
  /** If true, after completion start the selected gestión's tutorial */
  chainToSelection?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TutorialGuideService {
  // State signals
  private _isActive = signal(false);
  private _currentConfig = signal<TutorialConfig | null>(null);
  private _currentStepIndex = signal(0);
  private _registeredElements = signal<Map<string, ElementRef>>(new Map());
  private _waitingForClick = signal(false);
  private _showCompletionMessage = signal(false);

  // Public computed values
  public readonly isActive = this._isActive.asReadonly();
  public readonly currentConfig = this._currentConfig.asReadonly();
  public readonly currentStepIndex = this._currentStepIndex.asReadonly();
  public readonly waitingForClick = this._waitingForClick.asReadonly();
  public readonly showCompletionMessage =
    this._showCompletionMessage.asReadonly();

  public readonly currentStep = computed(() => {
    const config = this._currentConfig();
    const index = this._currentStepIndex();
    if (!config || index < 0 || index >= config.steps.length) {
      return null;
    }
    return config.steps[index];
  });

  public readonly totalSteps = computed(() => {
    return this._currentConfig()?.steps.length ?? 0;
  });

  public readonly progress = computed(() => {
    const total = this.totalSteps();
    if (total === 0) return 0;
    return ((this._currentStepIndex() + 1) / total) * 100;
  });

  public readonly isFirstStep = computed(() => this._currentStepIndex() === 0);

  public readonly isLastStep = computed(() => {
    const total = this.totalSteps();
    return total > 0 && this._currentStepIndex() === total - 1;
  });

  public readonly currentElement = computed(() => {
    const step = this.currentStep();
    if (!step) return null;
    return this._registeredElements().get(step.id) ?? null;
  });

  /**
   * Register an element for a tutorial step.
   */
  public registerElement(stepId: string, elementRef: ElementRef): void {
    this._registeredElements.update((map) => {
      const newMap = new Map(map);
      newMap.set(stepId, elementRef);
      return newMap;
    });
  }

  /**
   * Unregister an element
   */
  public unregisterElement(stepId: string): void {
    this._registeredElements.update((map) => {
      const newMap = new Map(map);
      newMap.delete(stepId);
      return newMap;
    });
  }

  /**
   * Start a tutorial with the given configuration
   */
  public start(config: TutorialConfig): void {
    if (config.steps.length === 0) {
      console.warn('Tutorial has no steps, not starting');
      return;
    }

    this._currentConfig.set(config);
    this._currentStepIndex.set(0);
    this._isActive.set(true);
    this._showCompletionMessage.set(false);

    // Set waiting for click based on first step
    const firstStep = config.steps[0];
    this._waitingForClick.set(firstStep.requireClick !== false);
  }

  /**
   * Called when user clicks the highlighted element
   * This is the primary way to advance in interactive mode
   */
  public onElementClick(stepId: string): void {
    if (!this._isActive()) return;

    const currentStep = this.currentStep();
    if (!currentStep || currentStep.id !== stepId) return;

    // If this is a prompt step, the click will be handled by the component
    if (currentStep.isPrompt) {
      this.complete();
      return;
    }

    // Advance to next step
    this.next();
  }

  /**
   * Go to the next step
   */
  public next(): void {
    if (!this._isActive() || !this._currentConfig()) return;

    const nextIndex = this._currentStepIndex() + 1;
    if (nextIndex >= this._currentConfig()!.steps.length) {
      // Show completion message briefly, then complete
      if (this._currentConfig()?.chainToSelection) {
        this._showCompletionMessage.set(true);
        setTimeout(() => {
          this.complete();
        }, 2000);
      } else {
        this.complete();
      }
      return;
    }

    this._currentStepIndex.set(nextIndex);

    // Update waiting for click state
    const step = this._currentConfig()!.steps[nextIndex];
    this._waitingForClick.set(step.requireClick !== false);
  }

  /**
   * Complete the tutorial
   */
  public complete(): void {
    this._isActive.set(false);
    this._currentConfig.set(null);
    this._currentStepIndex.set(0);
    this._waitingForClick.set(false);
    this._showCompletionMessage.set(false);
  }

  /**
   * Exit/cancel the tutorial
   */
  public exit(): void {
    this.complete();
  }

  /**
   * Check if an element click should be intercepted for tutorial
   */
  public shouldInterceptClick(stepId: string): boolean {
    if (!this._isActive()) return false;
    const currentStep = this.currentStep();
    return currentStep?.id === stepId && this._waitingForClick();
  }

  /**
   * Get the bounding rect of the current element
   */
  public getCurrentElementRect(): DOMRect | null {
    const el = this.currentElement();
    if (!el?.nativeElement) return null;
    return el.nativeElement.getBoundingClientRect();
  }
}
