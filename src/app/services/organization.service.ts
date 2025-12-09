import { Injectable, signal, computed } from '@angular/core';

export type Organization = 'blackdog' | 'naz';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private readonly STORAGE_KEY = 'selected_organization';
  
  // Signal reactivo para la organización actual
  private _currentOrganization = signal<Organization>(this.loadFromStorage());

  // Computed para verificar si es Naz
  public isNaz = computed(() => this._currentOrganization() === 'naz');
  
  // Computed para verificar si es Black Dog
  public isBlackDog = computed(() => this._currentOrganization() === 'blackdog');

  // Getter para obtener la organización actual
  public get currentOrganization(): Organization {
    return this._currentOrganization();
  }

  // Signal para suscripciones reactivas
  public get currentOrganization$() {
    return this._currentOrganization.asReadonly();
  }

  constructor() {
    // Cargar desde localStorage al inicializar
    const saved = this.loadFromStorage();
    if (saved) {
      this._currentOrganization.set(saved);
    }
  }

  /**
   * Cambia la organización seleccionada
   */
  setOrganization(org: Organization): void {
    this._currentOrganization.set(org);
    this.saveToStorage(org);
  }

  /**
   * Alterna entre Black Dog y Naz
   */
  toggleOrganization(): void {
    const next = this._currentOrganization() === 'blackdog' ? 'naz' : 'blackdog';
    this.setOrganization(next);
  }

  /**
   * Cambia a la siguiente organización
   */
  nextOrganization(): void {
    this.toggleOrganization();
  }

  /**
   * Cambia a la organización anterior
   */
  previousOrganization(): void {
    this.toggleOrganization();
  }

  /**
   * Carga la organización desde localStorage
   */
  private loadFromStorage(): Organization {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 'blackdog'; // Default
    }
    
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved === 'naz' || saved === 'blackdog') {
        return saved as Organization;
      }
    } catch (error) {
      console.error('Error loading organization from localStorage:', error);
    }
    
    return 'blackdog'; // Default
  }

  /**
   * Guarda la organización en localStorage
   */
  private saveToStorage(org: Organization): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    try {
      localStorage.setItem(this.STORAGE_KEY, org);
    } catch (error) {
      console.error('Error saving organization to localStorage:', error);
    }
  }
}

