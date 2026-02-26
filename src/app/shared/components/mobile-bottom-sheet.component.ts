import {
  Component,
  input,
  output,
  signal,
  ElementRef,
  viewChild,
  afterNextRender,
} from '@angular/core';

@Component({
  selector: 'pt-mobile-bottom-sheet',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="sheet-overlay" (click)="close()" (touchstart)="$event.stopPropagation()">
        <div
          #sheetContent
          class="sheet-content"
          [style.maxHeight]="height()"
          (click)="$event.stopPropagation()"
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd()"
        >
          <div class="sheet-handle-area">
            <div class="sheet-handle"></div>
          </div>
          @if (title()) {
            <div class="sheet-header">
              <h3 class="sheet-title">{{ title() }}</h3>
              <button class="sheet-close" (click)="close()">
                <i class="pi pi-times"></i>
              </button>
            </div>
          }
          <div class="sheet-body">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .sheet-overlay {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: flex-end;
      animation: fadeIn 0.2s ease-out;
    }

    .sheet-content {
      width: 100%;
      background: #18181b;
      border-radius: 16px 16px 0 0;
      overflow-y: auto;
      animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      transition: transform 0.1s ease;
    }

    .sheet-handle-area {
      display: flex;
      justify-content: center;
      padding: 10px 0 6px;
      cursor: grab;
    }

    .sheet-handle {
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: #3f3f46;
    }

    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .sheet-title {
      font-size: 1rem;
      font-weight: 600;
      color: #e4e4e7;
      margin: 0;
    }

    .sheet-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #27272a;
      border: none;
      border-radius: 50%;
      color: #a1a1aa;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .sheet-body {
      padding: 16px;
      overflow-y: auto;
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class MobileBottomSheetComponent {
  visible = input.required<boolean>();
  title = input<string>('');
  height = input<string>('90vh');
  visibleChange = output<boolean>();

  private sheetContent = viewChild<ElementRef>('sheetContent');
  private touchStartY = 0;
  private currentTranslateY = signal(0);

  constructor() {
    afterNextRender(() => {
      // Lock body scroll when sheet is open
    });
  }

  close() {
    this.visibleChange.emit(false);
  }

  onTouchStart(e: TouchEvent) {
    const target = e.target as HTMLElement;
    // Only handle drag from the handle area
    if (target.closest('.sheet-handle-area')) {
      this.touchStartY = e.touches[0].clientY;
    } else {
      this.touchStartY = 0;
    }
  }

  onTouchMove(e: TouchEvent) {
    if (!this.touchStartY) return;
    const deltaY = e.touches[0].clientY - this.touchStartY;
    if (deltaY > 0) {
      this.currentTranslateY.set(deltaY);
      const el = this.sheetContent()?.nativeElement;
      if (el) {
        el.style.transform = `translateY(${deltaY}px)`;
      }
    }
  }

  onTouchEnd() {
    if (!this.touchStartY) return;
    const el = this.sheetContent()?.nativeElement;
    if (this.currentTranslateY() > 100) {
      this.close();
    }
    if (el) {
      el.style.transform = '';
    }
    this.currentTranslateY.set(0);
    this.touchStartY = 0;
  }
}
