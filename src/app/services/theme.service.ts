import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'app_theme';
  private readonly DEFAULT_THEME: Theme = 'dark';

  // Signal reactivo para el tema actual
  private _currentTheme = signal<Theme>(this.loadFromStorage());

  // Getter para obtener el tema actual
  public get currentTheme(): Theme {
    return this._currentTheme();
  }

  // Signal público para que los componentes puedan suscribirse
  public readonly theme = this._currentTheme.asReadonly();

  constructor() {
    // Aplicar el tema inicial
    this.applyTheme(this._currentTheme());

    // Efecto para aplicar el tema cuando cambie
    effect(() => {
      const theme = this._currentTheme();
      this.applyTheme(theme);
    });
  }

  /**
   * Carga el tema desde localStorage
   */
  private loadFromStorage(): Theme {
    if (typeof window === 'undefined' || !window.localStorage) {
      return this.DEFAULT_THEME;
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored as Theme;
      }
    } catch (error) {
      console.warn('Error loading theme from storage:', error);
    }

    return this.DEFAULT_THEME;
  }

  /**
   * Guarda el tema en localStorage
   */
  private saveToStorage(theme: Theme): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Error saving theme to storage:', error);
    }
  }

  /**
   * Aplica el tema al documento HTML
   */
  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') {
      return;
    }

    const html = document.documentElement;
    const body = document.body;

    if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
      html.style.colorScheme = 'dark';
      body.style.backgroundColor = '#000000';
      body.style.color = '#ffffff';
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#000000';
    }
  }

  /**
   * Establece un tema específico
   */
  public setTheme(theme: Theme): void {
    this._currentTheme.set(theme);
    this.saveToStorage(theme);
  }

  /**
   * Alterna entre tema claro y oscuro
   */
  public toggleTheme(): void {
    const newTheme: Theme = this._currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * Obtiene el tema actual (método de conveniencia)
   */
  public getTheme(): Theme {
    return this._currentTheme();
  }

  /**
   * Verifica si el tema actual es oscuro
   */
  public isDark(): boolean {
    return this._currentTheme() === 'dark';
  }

  /**
   * Verifica si el tema actual es claro
   */
  public isLight(): boolean {
    return this._currentTheme() === 'light';
  }
}
