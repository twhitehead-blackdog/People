import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface SupabaseUser {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  phone?: string;
  created_at?: string;
  app_metadata?: any;
  user_metadata?: any;
  aud?: string;
  confirmation_sent_at?: string;
  recovery_sent_at?: string;
  last_sign_in_at?: string;
  role?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseAuthService {
  private supabase: SupabaseClient;
  private _user = signal<SupabaseUser | null>(null);
  private _session = signal<Session | null>(null);
  private _isAuthenticated = signal<boolean>(false);
  private _isLoading = signal<boolean>(true);

  // Observables para compatibilidad con código existente
  public user$ = new BehaviorSubject<SupabaseUser | null>(null);
  public isAuthenticated$ = new BehaviorSubject<boolean>(false);

  // Signals para uso reactivo
  public user = this._user.asReadonly();
  public session = this._session.asReadonly();
  public isAuthenticated = computed(() => this._isAuthenticated());
  public isLoading = this._isLoading.asReadonly();

  constructor(private router: Router) {
    const supabaseUrl = process.env['ENV_SUPABASE_URL'] || '';
    const supabaseAnonKey = process.env['ENV_SUPABASE_ANON_KEY'] || process.env['ENV_SUPABASE_API_KEY'] || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [SupabaseAuth] ENV_SUPABASE_URL o ENV_SUPABASE_ANON_KEY no están configurados');
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });

    // Inicializar sesión
    this.initializeSession();

    // Escuchar cambios de autenticación
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 [SupabaseAuth] Estado de autenticación cambió:', event, session?.user?.email);
      this._session.set(session);
      this._user.set(session?.user as SupabaseUser || null);
      this._isAuthenticated.set(!!session?.user);

      // Actualizar observables
      this.user$.next(session?.user as SupabaseUser || null);
      this.isAuthenticated$.next(!!session?.user);
    });
  }

  /**
   * Inicializa la sesión actual
   */
  private async initializeSession(): Promise<void> {
    try {
      this._isLoading.set(true);
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error) {
        console.error('❌ [SupabaseAuth] Error obteniendo sesión:', error);
        this._isLoading.set(false);
        return;
      }

      this._session.set(session);
      this._user.set(session?.user as SupabaseUser || null);
      this._isAuthenticated.set(!!session?.user);

      // Actualizar observables
      this.user$.next(session?.user as SupabaseUser || null);
      this.isAuthenticated$.next(!!session?.user);

      console.log('✅ [SupabaseAuth] Sesión inicializada:', session?.user?.email || 'No autenticado');
    } catch (error) {
      console.error('❌ [SupabaseAuth] Error inicializando sesión:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Inicia sesión con email y contraseña
   */
  async signInWithPassword(email: string, password: string): Promise<{ user: SupabaseUser | null; error: AuthError | null }> {
    try {
      console.log('🔐 [SupabaseAuth] Iniciando sesión con:', email);
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ [SupabaseAuth] Error al iniciar sesión:', error.message);
        return { user: null, error };
      }

      console.log('✅ [SupabaseAuth] Sesión iniciada exitosamente:', data.user?.email);
      return { user: data.user as SupabaseUser, error: null };
    } catch (error: any) {
      console.error('❌ [SupabaseAuth] Error inesperado al iniciar sesión:', error);
      return { user: null, error: error as AuthError };
    }
  }

  /**
   * Inicia sesión con redirección (OAuth, Magic Link, etc.)
   */
  async signInWithOAuth(provider: 'google' | 'github' | 'azure' = 'google', redirectTo?: string): Promise<void> {
    try {
      const redirectUrl = redirectTo || process.env['ENV_APP_URL'] || window.location.origin;
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${redirectUrl}/auth/callback`,
        },
      });

      if (error) {
        console.error('❌ [SupabaseAuth] Error al iniciar sesión con OAuth:', error);
        throw error;
      }

      // La redirección se maneja automáticamente
    } catch (error) {
      console.error('❌ [SupabaseAuth] Error inesperado con OAuth:', error);
      throw error;
    }
  }

  /**
   * Cierra sesión
   */
  async signOut(): Promise<void> {
    try {
      console.log('🔐 [SupabaseAuth] Cerrando sesión...');
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        console.error('❌ [SupabaseAuth] Error al cerrar sesión:', error);
      } else {
        console.log('✅ [SupabaseAuth] Sesión cerrada exitosamente');
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error('❌ [SupabaseAuth] Error inesperado al cerrar sesión:', error);
      // Forzar limpieza local
      this._session.set(null);
      this._user.set(null);
      this._isAuthenticated.set(false);
      this.user$.next(null);
      this.isAuthenticated$.next(false);
      this.router.navigate(['/login']);
    }
  }

  /**
   * Obtiene el token de acceso actual
   */
  async getAccessToken(): Promise<string | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Obtiene el token de acceso como Observable (para compatibilidad con Auth0)
   */
  getAccessTokenSilently(): Observable<string> {
    return from(this.getAccessToken()).pipe(
      map((token) => {
        if (!token) {
          throw new Error('No hay token de acceso disponible');
        }
        return token;
      }),
      catchError((error) => {
        console.error('❌ [SupabaseAuth] Error obteniendo token:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Registra un nuevo usuario
   */
  async signUp(email: string, password: string, metadata?: any): Promise<{ user: SupabaseUser | null; error: AuthError | null }> {
    try {
      console.log('🔐 [SupabaseAuth] Registrando usuario:', email);
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        console.error('❌ [SupabaseAuth] Error al registrar usuario:', error.message);
        return { user: null, error };
      }

      console.log('✅ [SupabaseAuth] Usuario registrado exitosamente:', data.user?.email);
      return { user: data.user as SupabaseUser, error: null };
    } catch (error: any) {
      console.error('❌ [SupabaseAuth] Error inesperado al registrar:', error);
      return { user: null, error: error as AuthError };
    }
  }

  /**
   * Envía un email de recuperación de contraseña
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const redirectUrl = process.env['ENV_APP_URL'] || window.location.origin;
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectUrl}/auth/reset-password`,
      });

      if (error) {
        console.error('❌ [SupabaseAuth] Error al enviar email de recuperación:', error);
        return { error };
      }

      console.log('✅ [SupabaseAuth] Email de recuperación enviado a:', email);
      return { error: null };
    } catch (error: any) {
      console.error('❌ [SupabaseAuth] Error inesperado al enviar email de recuperación:', error);
      return { error: error as AuthError };
    }
  }

  /**
   * Actualiza la contraseña del usuario
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('❌ [SupabaseAuth] Error al actualizar contraseña:', error);
        return { error };
      }

      console.log('✅ [SupabaseAuth] Contraseña actualizada exitosamente');
      return { error: null };
    } catch (error: any) {
      console.error('❌ [SupabaseAuth] Error inesperado al actualizar contraseña:', error);
      return { error: error as AuthError };
    }
  }

  /**
   * Obtiene el cliente de Supabase (para uso avanzado)
   */
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }
}

