import {
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  Renderer2,
} from '@angular/core';

@Directive({
  selector: '[ptPullToRefresh]',
  standalone: true,
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  /** Emits when user completes a pull-to-refresh gesture */
  refresh = output<void>();

  /** Whether a refresh is currently in progress (controls spinner) */
  refreshing = input(false);

  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  private startY = 0;
  private currentY = 0;
  private pulling = false;

  private readonly THRESHOLD = 60;
  private readonly MAX_PULL = 100;

  private indicator: HTMLElement | null = null;
  private spinner: HTMLElement | null = null;

  private touchStartHandler = (e: TouchEvent) => this.onTouchStart(e);
  private touchMoveHandler = (e: TouchEvent) => this.onTouchMove(e);
  private touchEndHandler = () => this.onTouchEnd();

  ngOnInit() {
    this.createIndicator();
    const el = this.el.nativeElement as HTMLElement;
    el.addEventListener('touchstart', this.touchStartHandler, {
      passive: true,
    });
    el.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    el.addEventListener('touchend', this.touchEndHandler, { passive: true });
  }

  ngOnDestroy() {
    const el = this.el.nativeElement as HTMLElement;
    el.removeEventListener('touchstart', this.touchStartHandler);
    el.removeEventListener('touchmove', this.touchMoveHandler);
    el.removeEventListener('touchend', this.touchEndHandler);
    this.indicator?.remove();
  }

  private createIndicator() {
    this.indicator = this.renderer.createElement('div') as HTMLElement;
    Object.assign(this.indicator.style, {
      position: 'absolute',
      top: '0',
      left: '50%',
      transform: 'translate(-50%, -40px)',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: '#fbbf24',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s ease',
      zIndex: '100',
      opacity: '0',
      pointerEvents: 'none',
    });

    this.spinner = this.renderer.createElement('i') as HTMLElement;
    this.spinner.className = 'pi pi-arrow-down';
    Object.assign(this.spinner.style, {
      color: '#000',
      fontSize: '14px',
      transition: 'transform 0.2s ease',
    });

    this.indicator.appendChild(this.spinner);

    const parent = this.el.nativeElement as HTMLElement;
    if (getComputedStyle(parent).position === 'static') {
      this.renderer.setStyle(parent, 'position', 'relative');
    }
    parent.insertBefore(this.indicator, parent.firstChild);
  }

  private onTouchStart(e: TouchEvent) {
    const el = this.el.nativeElement as HTMLElement;
    if (el.scrollTop > 0 || this.refreshing()) return;
    this.startY = e.touches[0].clientY;
    this.pulling = true;
  }

  private onTouchMove(e: TouchEvent) {
    if (!this.pulling) return;

    this.currentY = e.touches[0].clientY;
    const distance = Math.min(this.currentY - this.startY, this.MAX_PULL);

    if (distance <= 0) return;

    e.preventDefault();

    const progress = Math.min(distance / this.THRESHOLD, 1);

    if (this.indicator) {
      this.indicator.style.opacity = `${progress}`;
      this.indicator.style.transform = `translate(-50%, ${distance - 40}px)`;
    }

    if (this.spinner) {
      const rotation = distance >= this.THRESHOLD ? 180 : 0;
      this.spinner.style.transform = `rotate(${rotation}deg)`;
      if (distance >= this.THRESHOLD) {
        this.spinner.className = 'pi pi-check';
      } else {
        this.spinner.className = 'pi pi-arrow-down';
      }
    }
  }

  private onTouchEnd() {
    if (!this.pulling) return;

    const distance = this.currentY - this.startY;
    this.pulling = false;

    if (distance >= this.THRESHOLD) {
      this.refresh.emit();

      if (this.spinner) {
        this.spinner.className = 'pi pi-spin pi-spinner';
      }

      // Auto-hide after 2s max
      setTimeout(() => this.resetIndicator(), 2000);
    } else {
      this.resetIndicator();
    }
  }

  private resetIndicator() {
    if (this.indicator) {
      this.indicator.style.opacity = '0';
      this.indicator.style.transform = 'translate(-50%, -40px)';
    }
    if (this.spinner) {
      this.spinner.className = 'pi pi-arrow-down';
      this.spinner.style.transform = 'rotate(0deg)';
    }
  }
}
