import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DarkModeService {
  private readonly STORAGE_KEY = 'adoptions-dark-mode';
  
  public isDarkMode = signal<boolean>(this.getInitialDarkMode());

  constructor() {
    // Aplicar modo oscuro al inicializar
    this.applyDarkMode(this.isDarkMode());

    // Efecto para aplicar cambios de modo oscuro
    effect(() => {
      this.applyDarkMode(this.isDarkMode());
      this.saveDarkMode(this.isDarkMode());
    });
  }

  private getInitialDarkMode(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved === 'true';
  }

  private applyDarkMode(isDark: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    // Usar setTimeout para asegurar que el DOM esté listo
    setTimeout(() => {
      const adoptionsContainer = document.querySelector('.adoptions-container');
      const html = document.documentElement;
      
      if (isDark) {
        if (adoptionsContainer) {
          adoptionsContainer.classList.add('dark');
        }
        html.classList.add('adoptions-dark');
      } else {
        if (adoptionsContainer) {
          adoptionsContainer.classList.remove('dark');
        }
        html.classList.remove('adoptions-dark');
      }
    }, 0);
  }

  private saveDarkMode(isDark: boolean): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, String(isDark));
    }
  }

  public toggleDarkMode(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }

  public setDarkMode(isDark: boolean): void {
    this.isDarkMode.set(isDark);
  }
}

