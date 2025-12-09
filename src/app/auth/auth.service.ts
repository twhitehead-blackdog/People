import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { User } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  public currentUser = signal<User | null>(null);
  public isAuthenticated = signal(false);
  private readonly AUTH_TOKEN_KEY = 'adoptions_auth_token';
  private readonly USER_KEY = 'adoptions_user';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadStoredAuth();
    }
  }

  private loadStoredAuth(): void {
    const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch (e) {
        this.clearAuth();
      }
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const supabaseKey = process.env['ENV_SUPABASE_API_KEY'];

      if (!supabaseUrl || !supabaseKey) {
        return { success: false, error: 'Configuración del servidor no disponible' };
      }

      // Intentar autenticación con Supabase Auth
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error_description || 'Credenciales inválidas' };
      }

      const data = await response.json();
      
      // Obtener información del usuario
      const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${data.user.id}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${data.access_token}`,
        },
      });

      let user: User | null = null;
      const adminEmails = [
        'soporte@blackdogpanama.com',
        'soporte2@blackdogpanama.com',
      ];
      const userEmail = (data.user.email || email).toLowerCase();
      const isAdminEmail = adminEmails.some(email => userEmail === email.toLowerCase());

      if (userResponse.ok) {
        const users = await userResponse.json();
        if (users && users.length > 0) {
          user = users[0];
          // Si es email de admin pero no tiene rol, asignarlo
          if (isAdminEmail && user && user.role !== 'admin') {
            user.role = 'admin';
          }
        } else {
          // Si no existe en la tabla users, crear uno básico
          user = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name,
            avatar_url: data.user.user_metadata?.avatar_url,
            role: isAdminEmail ? 'admin' : 'user',
          };
        }
      } else {
        // Usuario básico si no se puede obtener de la tabla
        user = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name,
          avatar_url: data.user.user_metadata?.avatar_url,
          role: isAdminEmail ? 'admin' : 'user',
        };
      }

      // Guardar autenticación
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.AUTH_TOKEN_KEY, data.access_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }

      this.currentUser.set(user);
      this.isAuthenticated.set(true);

      return { success: true };
    } catch (error: any) {
      console.error('Error en login:', error);
      return { success: false, error: error.message || 'Error al iniciar sesión' };
    }
  }

  async register(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const supabaseKey = process.env['ENV_SUPABASE_API_KEY'];

      if (!supabaseUrl || !supabaseKey) {
        return { success: false, error: 'Configuración del servidor no disponible' };
      }

      // Registrar usuario en Supabase Auth
      const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          email,
          password,
          data: {
            full_name: fullName,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error_description || 'Error al registrar usuario' };
      }

      const data = await response.json();

      // Crear registro en tabla users
      const userResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${data.access_token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
        }),
      });

      // Iniciar sesión automáticamente después del registro
      if (response.ok) {
        return await this.login(email, password);
      }

      return { success: false, error: 'Error al crear perfil de usuario' };
    } catch (error: any) {
      console.error('Error en registro:', error);
      return { success: false, error: error.message || 'Error al registrar usuario' };
    }
  }

  logout(): void {
    this.clearAuth();
    this.router.navigate(['/adoptions']);
  }

  private clearAuth(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.AUTH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.AUTH_TOKEN_KEY);
    }
    return null;
  }

  async updateProfile(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.currentUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const supabaseKey = process.env['ENV_SUPABASE_API_KEY'];
      const token = this.getToken();

      if (!supabaseUrl || !supabaseKey || !token) {
        return { success: false, error: 'Configuración del servidor no disponible' };
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Error al actualizar perfil' };
      }

      const updatedUsers = await response.json();
      if (updatedUsers && updatedUsers.length > 0) {
        const updatedUser = updatedUsers[0];
        this.currentUser.set(updatedUser);
        
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      return { success: false, error: error.message || 'Error al actualizar perfil' };
    }
  }

  async loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const supabaseKey = process.env['ENV_SUPABASE_API_KEY'];

      if (!supabaseUrl || !supabaseKey) {
        return { success: false, error: 'Configuración del servidor no disponible' };
      }

      if (!isPlatformBrowser(this.platformId)) {
        return { success: false, error: 'OAuth solo disponible en el navegador' };
      }

      // Obtener la URL de redirección
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      // Iniciar flujo OAuth con Google usando Supabase
      // Supabase requiere que se use el endpoint correcto con los parámetros adecuados
      const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}&response_type=code`;
      
      // Redirigir a Google para autenticación
      window.location.href = authUrl;

      return { success: true };
    } catch (error: any) {
      console.error('Error en login con Google:', error);
      return { success: false, error: error.message || 'Error al iniciar sesión con Google' };
    }
  }

  async handleOAuthCallback(code?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const supabaseKey = process.env['ENV_SUPABASE_API_KEY'];

      if (!supabaseUrl || !supabaseKey) {
        return { success: false, error: 'Configuración del servidor no disponible' };
      }

      if (!isPlatformBrowser(this.platformId)) {
        return { success: false, error: 'OAuth solo disponible en el navegador' };
      }

      // Supabase puede devolver el token en el hash o en query params
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Intentar obtener el código o token
      const authCode = code || urlParams.get('code');
      const hashToken = hashParams.get('access_token');
      const errorParam = urlParams.get('error') || hashParams.get('error');
      
      if (errorParam) {
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description') || 'Error en autenticación';
        return { success: false, error: errorDescription };
      }

      // Si tenemos el token directamente del hash, usarlo
      if (hashToken) {
        return await this.handleAuthToken(hashToken);
      }

      // Si tenemos el código, intercambiarlo por token
      if (authCode) {
        const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=authorization_code&code=${authCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.json();
          return { success: false, error: error.error_description || 'Error al obtener token' };
        }

        const tokenData = await tokenResponse.json();
        return await this.handleAuthToken(tokenData.access_token);
      }
      
      return { success: false, error: 'No se recibió código o token de autenticación' };
    } catch (error: any) {
      console.error('Error en callback OAuth:', error);
      return { success: false, error: error.message || 'Error al procesar autenticación' };
    }
  }

  private async handleAuthToken(accessToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const supabaseKey = process.env['ENV_SUPABASE_API_KEY'];

      // Obtener información del usuario
      if (!supabaseKey) {
        return { success: false, error: 'Configuración del servidor no disponible' };
      }

      const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
        } as HeadersInit,
      });

      if (!userResponse.ok) {
        return { success: false, error: 'Error al obtener información del usuario' };
      }

      const authUser = await userResponse.json();

      // Verificar si el usuario existe en la tabla users
      const dbUserResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${authUser.id}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
        } as HeadersInit,
      });

      let user: User | null = null;
      const adminEmails = [
        'soporte@blackdogpanama.com',
        'soporte2@blackdogpanama.com',
      ];
      const userEmail = (authUser.email || '').toLowerCase();
      const isAdminEmail = adminEmails.some(email => userEmail === email.toLowerCase());

      if (dbUserResponse.ok) {
        const users = await dbUserResponse.json();
        if (users && users.length > 0) {
          user = users[0];
          if (isAdminEmail && user && user.role !== 'admin') {
            user.role = 'admin';
          }
        } else {
          // Crear usuario si no existe
          const createUserResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=representation',
            } as HeadersInit,
            body: JSON.stringify({
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
              avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
              role: isAdminEmail ? 'admin' : 'user',
            }),
          });

          if (createUserResponse.ok) {
            const newUsers = await createUserResponse.json();
            user = newUsers[0];
          } else {
            // Usuario básico si no se puede crear
            user = {
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
              avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
              role: isAdminEmail ? 'admin' : 'user',
            };
          }
        }
      } else {
        // Usuario básico si no se puede obtener de la tabla
        user = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
          avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
          role: isAdminEmail ? 'admin' : 'user',
        };
      }

      // Guardar autenticación
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.AUTH_TOKEN_KEY, accessToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }

      this.currentUser.set(user);
      this.isAuthenticated.set(true);

      return { success: true };
    } catch (error: any) {
      console.error('Error al manejar token:', error);
      return { success: false, error: error.message || 'Error al procesar autenticación' };
    }
  }

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
    const adminEmails = [
      'soporte@blackdogpanama.com',
      'soporte2@blackdogpanama.com',
    ];

    const userEmail = user.email?.toLowerCase() || '';
    return adminEmails.some(email => userEmail === email.toLowerCase());
  }
}

