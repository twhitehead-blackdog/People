import { Injectable, inject, computed, signal } from '@angular/core';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { Observable, map } from 'rxjs';
import { User } from '../models';

/**
 * Servicio wrapper que combina Auth0 con la lógica de administración
 * Proporciona métodos convenientes para verificar roles de admin
 */
@Injectable({
  providedIn: 'root',
})
export class AuthWrapperService {
  private auth0 = inject(Auth0Service);

  // Exponer observables de Auth0
  public isAuthenticated$ = this.auth0.isAuthenticated$;
  public user$ = this.auth0.user$;

  // Lista de emails de administradores
  private readonly ADMIN_EMAILS = [
    'soporte@blackdogpanama.com',
    'soporte2@blackdogpanama.com',
  ];

  // Signal para el usuario actual con información de admin
  public currentUser = signal<User | null>(null);

  constructor() {
    // Sincronizar user$ de Auth0 con nuestro signal
    this.user$.subscribe((auth0User) => {
      if (auth0User) {
        const userEmail = (auth0User.email || '').toLowerCase();
        const isAdminEmail = this.ADMIN_EMAILS.some(
          (email) => userEmail === email.toLowerCase()
        );

        // Obtener el nombre completo de diferentes campos de Auth0
        // Auth0 puede devolver el nombre en: name, nickname, o en user_metadata
        const fullName = 
          auth0User.name || 
          auth0User.nickname || 
          (auth0User as any).user_metadata?.full_name ||
          (auth0User as any).user_metadata?.name ||
          auth0User.email?.split('@')[0] ||
          '';

        const user: User = {
          id: auth0User.sub || '',
          email: auth0User.email || '',
          full_name: fullName,
          avatar_url: auth0User.picture,
          role: isAdminEmail ? 'admin' : 'user',
        };

        this.currentUser.set(user);
      } else {
        this.currentUser.set(null);
      }
    });
  }

  /**
   * Verifica si el usuario actual es administrador
   */
  isAdmin(): boolean {
    const user = this.currentUser();
    if (!user) {
      return false;
    }

    // Verificar si el usuario tiene rol de admin
    if (user.role === 'admin') {
      return true;
    }

    // Verificar emails de administradores
    const userEmail = user.email?.toLowerCase() || '';
    return this.ADMIN_EMAILS.some(
      (email) => userEmail === email.toLowerCase()
    );
  }

  /**
   * Observable que emite true si el usuario es admin
   */
  isAdmin$(): Observable<boolean> {
    return this.user$.pipe(
      map((user) => {
        if (!user?.email) {
          return false;
        }
        const userEmail = user.email.toLowerCase();
        return this.ADMIN_EMAILS.some(
          (email) => userEmail === email.toLowerCase()
        );
      })
    );
  }

  /**
   * Métodos de Auth0 expuestos directamente
   */
  loginWithRedirect(options?: any): void {
    this.auth0.loginWithRedirect(options);
  }

  logout(options?: any): void {
    this.auth0.logout(options);
  }

  getAccessTokenSilently(): Observable<string> {
    return this.auth0.getAccessTokenSilently();
  }
}

