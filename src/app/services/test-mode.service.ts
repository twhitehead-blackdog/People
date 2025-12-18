import { computed, Injectable, signal } from '@angular/core';

export type TestMode = 'admin' | 'gerente' | 'empleado';

@Injectable({
  providedIn: 'root',
})
export class TestModeService {
  private readonly STORAGE_KEY = 'test_mode_soporte2';
  private readonly SUPPORT_EMAIL = 'soporte2@blackdogpanama.com';

  // Signal reactivo para el modo actual
  private _currentMode = signal<TestMode | null>(this.loadFromStorage());

  // Getter para obtener el modo actual
  public get currentMode(): TestMode | null {
    return this._currentMode();
  }

  // Computed para verificar si el modo de prueba está activo
  public isTestModeActive = computed(() => {
    return this._currentMode() !== null;
  });

  // Computed para verificar si está en modo admin
  public isAdminMode = computed(() => {
    return this._currentMode() === 'admin' || this._currentMode() === null;
  });

  // Computed para verificar si está en modo gerente
  public isGerenteMode = computed(() => {
    return this._currentMode() === 'gerente';
  });

  // Computed para verificar si está en modo empleado
  public isEmpleadoMode = computed(() => {
    return this._currentMode() === 'empleado';
  });

  /**
   * Verifica si el email corresponde a soporte2
   */
  public isSupportUser(email: string | null | undefined): boolean {
    if (!email) return false;
    return email.toLowerCase() === this.SUPPORT_EMAIL;
  }

  /**
   * Establece el modo de prueba
   */
  public setMode(mode: TestMode | null): void {
    if (mode === null) {
      this.clearMode();
      return;
    }

    this._currentMode.set(mode);
    this.saveToStorage(mode);
  }

  /**
   * Obtiene el modo actual
   */
  public getMode(): TestMode | null {
    return this._currentMode();
  }

  /**
   * Limpia el modo de prueba (vuelve a admin por defecto)
   */
  public clearMode(): void {
    this._currentMode.set(null);
    this.removeFromStorage();
  }

  /**
   * Carga el modo desde localStorage
   */
  private loadFromStorage(): TestMode | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      const stored = window.localStorage.getItem(this.STORAGE_KEY);
      if (stored && (stored === 'admin' || stored === 'gerente' || stored === 'empleado')) {
        return stored as TestMode;
      }
    } catch (error) {
      console.error('Error loading test mode from storage:', error);
    }

    return null;
  }

  /**
   * Guarda el modo en localStorage
   */
  private saveToStorage(mode: TestMode): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(this.STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving test mode to storage:', error);
    }
  }

  /**
   * Elimina el modo de localStorage
   */
  private removeFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error removing test mode from storage:', error);
    }
  }
}

