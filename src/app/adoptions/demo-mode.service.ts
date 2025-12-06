import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DemoModeService {
  public useDemoData = signal(false);

  public toggleDemoMode(): void {
    this.useDemoData.update((value) => !value);
  }

  public setDemoMode(enabled: boolean): void {
    this.useDemoData.set(enabled);
  }
}

