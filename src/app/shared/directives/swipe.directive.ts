import { Directive, output, ElementRef, inject, OnInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[ptSwipe]',
  standalone: true,
})
export class SwipeDirective implements OnInit, OnDestroy {
  swipeLeft = output<void>();
  swipeRight = output<void>();

  private readonly el = inject(ElementRef);
  private startX = 0;
  private startY = 0;
  private startTime = 0;

  private readonly MIN_DISTANCE = 50;
  private readonly MAX_VERTICAL = 80;
  private readonly MAX_TIME = 500;

  private touchStartHandler = (e: TouchEvent) => this.onTouchStart(e);
  private touchEndHandler = (e: TouchEvent) => this.onTouchEnd(e);

  ngOnInit() {
    const el = this.el.nativeElement as HTMLElement;
    el.addEventListener('touchstart', this.touchStartHandler, { passive: true });
    el.addEventListener('touchend', this.touchEndHandler, { passive: true });
  }

  ngOnDestroy() {
    const el = this.el.nativeElement as HTMLElement;
    el.removeEventListener('touchstart', this.touchStartHandler);
    el.removeEventListener('touchend', this.touchEndHandler);
  }

  private onTouchStart(e: TouchEvent) {
    this.startX = e.changedTouches[0].clientX;
    this.startY = e.changedTouches[0].clientY;
    this.startTime = Date.now();
  }

  private onTouchEnd(e: TouchEvent) {
    const deltaX = e.changedTouches[0].clientX - this.startX;
    const deltaY = Math.abs(e.changedTouches[0].clientY - this.startY);
    const elapsed = Date.now() - this.startTime;

    if (elapsed > this.MAX_TIME || deltaY > this.MAX_VERTICAL) return;
    if (Math.abs(deltaX) < this.MIN_DISTANCE) return;

    if (deltaX < 0) {
      this.swipeLeft.emit();
    } else {
      this.swipeRight.emit();
    }
  }
}
