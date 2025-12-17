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
    // Capturar peticiones fetch directamente
    this.captureFetchErrors();
    // Monitorear recursos httpResource
    this.monitorHttpResources();
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
      
      // Capturar TODOS los warnings (más agresivo)
      this.addConsoleError(`WARNING: ${message}`, args.length > 1 ? args.slice(1) : undefined);
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

  /**
   * Capturar errores de fetch directamente
   */
  private captureFetchErrors(): void {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async function(...args: Parameters<typeof fetch>): Promise<Response> {
      const [url, options] = args;
      const urlString = typeof url === 'string' ? url : url.toString();

      try {
        const response = await originalFetch.apply(this, args);
        
        // Si la respuesta no es exitosa, registrar el error
        if (!response.ok) {
          self.addHttpError(
            urlString,
            response.status,
            `Fetch failed: ${response.statusText}`,
            {
              method: options?.method || 'GET',
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
            }
          );
        }

        return response;
      } catch (error: any) {
        // Error de red (no se pudo conectar)
        self.addNetworkError(
          urlString,
          error.message || 'Network request failed',
          {
            method: options?.method || 'GET',
            error: error.toString(),
          }
        );
        throw error;
      }
    };
  }

  /**
   * Monitorear recursos httpResource de Angular
   * Esto se ejecuta periódicamente para detectar errores
   */
  private monitorHttpResources(): void {
    if (typeof window === 'undefined') return;

    // Monitorear cada 2 segundos los recursos que pueden tener errores
    setInterval(() => {
      // Verificar si hay errores en la consola que no se capturaron
      // Esto es un fallback para errores silenciados
      this.checkForSilentErrors();
    }, 2000);
  }

  /**
   * Verificar errores silenciados
   */
  private checkForSilentErrors(): void {
    // Solo verificar una vez cada 10 segundos para evitar spam
    const lastCheck = (this as any).lastSilentCheck || 0;
    const now = Date.now();
    if (now - lastCheck < 10000) return;
    (this as any).lastSilentCheck = now;

    // Verificar variables de entorno críticas
    const supabaseUrl = process.env['ENV_SUPABASE_URL'];
    const supabaseKey = process.env['ENV_SUPABASE_ANON_KEY'];
    const apiUrl = process.env['ENV_API_URL'];
    const appUrl = process.env['ENV_APP_URL'];

    // Solo agregar error si no existe ya uno similar
    const existingErrors = this.errorsSubject.value;
    const hasSupabaseUrlError = existingErrors.some(e => 
      e.type === 'supabase' && e.message.includes('ENV_SUPABASE_URL')
    );
    const hasSupabaseKeyError = existingErrors.some(e => 
      e.type === 'supabase' && e.message.includes('ENV_SUPABASE_ANON_KEY')
    );
    const hasApiUrlError = existingErrors.some(e => 
      e.type === 'network' && e.message.includes('ENV_API_URL')
    );
    const hasAppUrlError = existingErrors.some(e => 
      e.type === 'auth' && e.message.includes('ENV_APP_URL')
    );

    if (!supabaseUrl && !hasSupabaseUrlError) {
      this.addError({
        type: 'supabase',
        message: 'ENV_SUPABASE_URL no está configurado',
      });
    }

    if (!supabaseKey && !hasSupabaseKeyError) {
      this.addError({
        type: 'supabase',
        message: 'ENV_SUPABASE_ANON_KEY no está configurado',
      });
    }

    if (!apiUrl && !hasApiUrlError) {
      this.addError({
        type: 'network',
        message: 'ENV_API_URL no está configurado',
      });
    }

    if (!appUrl && !hasAppUrlError) {
      this.addError({
        type: 'auth',
        message: 'ENV_APP_URL no está configurado',
      });
    }
  }

  /**
   * Agregar error de httpResource
   */
  addHttpResourceError(url: string, error: any, resourceName?: string): void {
    let errorType: DiagnosticError['type'] = 'http';
    let message = 'Error en httpResource';

    if (error.status === 0 || !error.status) {
      errorType = 'network';
      message = 'No se pudo conectar';
    } else if (error.status === 401 || error.status === 403) {
      errorType = 'supabase';
      message = `Error de autenticación: ${error.status}`;
    } else {
      message = `HTTP ${error.status}: ${error.statusText || 'Error desconocido'}`;
    }

    this.addError({
      type: errorType,
      message: resourceName ? `${resourceName}: ${message}` : message,
      url,
      status: error.status,
      details: {
        error: error.error || error.message,
        resourceName,
      },
    });
  }
}

