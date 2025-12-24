import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EmployeePortalNavigationService {
  // Signal para notificar cambios de sección desde el layout
  private _navigateToSection = signal<string | null>(null);

  // Getter público para que el componente employee-portal pueda suscribirse
  public get navigateToSection() {
    return this._navigateToSection.asReadonly();
  }

  /**
   * Navegar a una sección específica
   * @param section Nombre de la sección a la que navegar
   */
  public goToSection(section: string): void {
    this._navigateToSection.set(section);
    // Resetear después de un momento para permitir múltiples navegaciones
    setTimeout(() => {
      this._navigateToSection.set(null);
    }, 100);
  }
}
