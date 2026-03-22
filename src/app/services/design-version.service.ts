import { Injectable, signal, computed } from '@angular/core';

export type DesignVersion = 'current' | 'classic';

@Injectable({
  providedIn: 'root',
})
export class DesignVersionService {
  private readonly STORAGE_KEY = 'app_design_version';
  private readonly DEFAULT: DesignVersion = 'current';

  private _version = signal<DesignVersion>(this.loadFromStorage());

  public readonly version = this._version.asReadonly();
  public readonly isClassic = computed(() => this._version() === 'classic');
  public readonly isCurrent = computed(() => this._version() === 'current');

  public toggle(): void {
    const next: DesignVersion = this._version() === 'current' ? 'classic' : 'current';
    this._version.set(next);
    this.saveToStorage(next);
  }

  public setVersion(v: DesignVersion): void {
    this._version.set(v);
    this.saveToStorage(v);
  }

  private loadFromStorage(): DesignVersion {
    if (typeof window === 'undefined' || !window.localStorage) {
      return this.DEFAULT;
    }
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'current' || stored === 'classic') return stored;
    } catch (error) {
      console.warn('Error loading design version from storage:', error);
    }
    return this.DEFAULT;
  }

  private saveToStorage(v: DesignVersion): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.STORAGE_KEY, v);
    } catch (error) {
      console.warn('Error saving design version to storage:', error);
    }
  }
}
