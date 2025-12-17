import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DiagnosticError {
  id: string;
  timestamp: Date;
  type: 'http' | 'console' | 'network' | 'auth' | 'supabase' | 'other';
  message: string;
  details?: any;
  url?: string;
  status?: number;
  stack?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DiagnosticService {
  private errorsSubject = new BehaviorSubject<DiagnosticError[]>([]);
  public errors$: Observable<DiagnosticError[]> = this.errorsSubject.asObservable();

  private isVisibleSubject = new BehaviorSubject<boolean>(false);
  public isVisible$: Observable<boolean> = this.isVisibleSubject.asObservable();

  private maxErrors = 100; // Mantener solo los últimos 100 errores

  constructor() {
    // Capturar errores de consola
    this.captureConsoleErrors();
  }

  /**
   * Agregar un error al diagnóstico
   */
  addError(error: Omit<DiagnosticError, 'id' | 'timestamp'>): void {
    const diagnosticError: DiagnosticError = {
      ...error,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    const currentErrors = this.errorsSubject.value;
    const newErrors = [diagnosticError, ...currentErrors].slice(0, this.maxErrors);
    this.errorsSubject.next(newErrors);

    // También loguear en consola para debugging
    console.error('🔴 [Diagnóstico]', error.type.toUpperCase(), ':', error.message, error.details || '');
  }

  /**
   * Agregar error HTTP
   */
  addHttpError(url: string, status: number, message: string, details?: any): void {
    this.addError({
      type: 'http',
      message: `HTTP ${status}: ${message}`,
      url,
      status,
      details,
    });
  }

  /**
   * Agregar error de consola
   */
  addConsoleError(message: string, details?: any, stack?: string): void {
    this.addError({
      type: 'console',
      message,
      details,
      stack,
    });
  }

  /**
   * Agregar error de red
   */
  addNetworkError(url: string, message: string, details?: any): void {
    this.addError({
      type: 'network',
      message: `Network Error: ${message}`,
      url,
      details,
    });
  }

  /**
   * Agregar error de Auth0
   */
  addAuthError(message: string, details?: any): void {
    this.addError({
      type: 'auth',
      message: `Auth0 Error: ${message}`,
      details,
    });
  }

  /**
   * Agregar error de Supabase
   */
  addSupabaseError(message: string, url?: string, details?: any): void {
    this.addError({
      type: 'supabase',
      message: `Supabase Error: ${message}`,
      url,
      details,
    });
  }

  /**
   * Capturar errores de consola
   */
  private captureConsoleErrors(): void {
    if (typeof window === 'undefined') return;

    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      this.addConsoleError(message, args.length > 1 ? args.slice(1) : undefined);
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Solo capturar warnings importantes
      if (message.includes('Error') || message.includes('Failed') || message.includes('CORS')) {
        this.addConsoleError(`WARNING: ${message}`, args.length > 1 ? args.slice(1) : undefined);
      }
      originalWarn.apply(console, args);
    };

    // Capturar errores no manejados
    window.addEventListener('error', (event) => {
      this.addConsoleError(
        event.message,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        event.error?.stack
      );
    });

    // Capturar promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
      this.addConsoleError(
        `Unhandled Promise Rejection: ${event.reason}`,
        event.reason,
        event.reason?.stack
      );
    });
  }

  /**
   * Limpiar todos los errores
   */
  clearErrors(): void {
    this.errorsSubject.next([]);
  }

  /**
   * Obtener errores actuales
   */
  getErrors(): DiagnosticError[] {
    return this.errorsSubject.value;
  }

  /**
   * Obtener errores por tipo
   */
  getErrorsByType(type: DiagnosticError['type']): DiagnosticError[] {
    return this.errorsSubject.value.filter(error => error.type === type);
  }

  /**
   * Toggle visibilidad del panel de diagnóstico
   */
  toggleVisibility(): void {
    this.isVisibleSubject.next(!this.isVisibleSubject.value);
  }

  /**
   * Mostrar panel de diagnóstico
   */
  show(): void {
    this.isVisibleSubject.next(true);
  }

  /**
   * Ocultar panel de diagnóstico
   */
  hide(): void {
    this.isVisibleSubject.next(false);
  }

  /**
   * Verificar estado de servicios
   */
  async checkServices(): Promise<{
    supabase: boolean;
    backend: boolean;
    auth0: boolean;
  }> {
    const results = {
      supabase: false,
      backend: false,
      auth0: false,
    };

    // Verificar Supabase
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      if (supabaseUrl) {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': process.env['ENV_SUPABASE_ANON_KEY'] || '',
          },
        });
        results.supabase = response.ok;
      }
    } catch (error) {
      this.addSupabaseError('No se pudo conectar a Supabase', undefined, error);
    }

    // Verificar Backend
    try {
      const apiUrl = process.env['ENV_API_URL'];
      if (apiUrl) {
        const response = await fetch(`${apiUrl}/api/health`, {
          method: 'GET',
        });
        results.backend = response.ok;
      }
    } catch (error) {
      this.addNetworkError('/api/health', 'No se pudo conectar al backend', error);
    }

    // Verificar Auth0 (solo verificar configuración)
    const auth0Domain = process.env['ENV_AUTH0_DOMAIN'];
    const auth0ClientId = process.env['ENV_AUTH0_CLIENT_ID'];
    results.auth0 = !!(auth0Domain && auth0ClientId);

    if (!results.auth0) {
      this.addAuthError('Auth0 no está configurado correctamente', {
        domain: auth0Domain ? '✅' : '❌',
        clientId: auth0ClientId ? '✅' : '❌',
      });
    }

    return results;
  }
}

