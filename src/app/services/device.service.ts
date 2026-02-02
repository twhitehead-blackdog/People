import { Injectable, signal, computed } from '@angular/core';
import { fromEvent } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private readonly MOBILE_BREAKPOINT = 768;
  private readonly TABLET_BREAKPOINT = 1024;

  private windowWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1200);

  isMobile = computed(() => this.windowWidth() < this.MOBILE_BREAKPOINT);
  isTablet = computed(() => this.windowWidth() >= this.MOBILE_BREAKPOINT && this.windowWidth() < this.TABLET_BREAKPOINT);
  isDesktop = computed(() => this.windowWidth() >= this.TABLET_BREAKPOINT);

  constructor() {
    if (typeof window !== 'undefined') {
      fromEvent(window, 'resize')
        .pipe(
          debounceTime(100),
          startWith(null)
        )
        .subscribe(() => {
          this.windowWidth.set(window.innerWidth);
        });
    }
  }
}
