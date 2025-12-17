import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

/**
 * Servicio de bypass de autenticación para desarrollo/testing
 * Simula AuthService de Auth0 cuando Auth0 no está configurado
 * 
 * ⚠️ SOLO PARA DESARROLLO - NO USAR EN PRODUCCIÓN
 */
@Injectable({
  providedIn: 'root',
})
export class AuthBypassService {
  private readonly BYPASS_KEY = 'auth_bypass_active';
  private readonly BYPASS_USER_KEY = 'auth_bypass_user';
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<any>(null);

  public isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();
  public user$: Observable<any> = this.userSubject.asObservable();

  constructor() {
    // Verificar si hay sesión de bypass guardada
    this.checkBypassSession();
  }

  /**
   * Verifica si hay una sesión de bypass activa
   */
  private checkBypassSession(): void {
    const bypassActive = localStorage.getItem(this.BYPASS_KEY) === 'true';
    const userStr = localStorage.getItem(this.BYPASS_USER_KEY);
    
    if (bypassActive && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.isAuthenticatedSubject.next(true);
        this.userSubject.next(user);
      } catch (e) {
        console.error('Error parsing bypass user:', e);
        this.logout();
      }
    }
  }

  /**
   * Inicia sesión con bypass usando email
   */
  loginWithBypass(email: string): void {
    // Crear objeto de usuario simulado
    const user = {
      email: email.toLowerCase(),
      name: email,
      sub: `bypass|${email}`,
      email_verified: true,
      // Agregar más campos que la app podría necesitar
      picture: undefined,
      nickname: email.split('@')[0],
    };

    // Guardar en localStorage
    localStorage.setItem(this.BYPASS_KEY, 'true');
    localStorage.setItem(this.BYPASS_USER_KEY, JSON.stringify(user));

    // Actualizar observables
    this.isAuthenticatedSubject.next(true);
    this.userSubject.next(user);

    console.warn('⚠️ BYPASS MODE ACTIVO - Solo para desarrollo');
  }

  /**
   * Cierra sesión del bypass
   */
  logout(): void {
    localStorage.removeItem(this.BYPASS_KEY);
    localStorage.removeItem(this.BYPASS_USER_KEY);
    this.isAuthenticatedSubject.next(false);
    this.userSubject.next(null);
  }

  /**
   * Verifica si el bypass está activo
   */
  isBypassActive(): boolean {
    return localStorage.getItem(this.BYPASS_KEY) === 'true';
  }

  /**
   * Obtiene el usuario actual del bypass
   */
  getCurrentUser(): any {
    const userStr = localStorage.getItem(this.BYPASS_USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

