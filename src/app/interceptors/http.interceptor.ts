import { HttpInterceptorFn } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, switchMap, tap, throwError } from 'rxjs';
import { ApiUrlService } from '../services/api-url.service';
import { DiagnosticService } from '../services/diagnostic.service';
import { getEnv } from '../utils/env.utils';

// Detectar si estamos en desarrollo (localhost)
const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

// Endpoints que requieren service_role key (bypass RLS)
// Usar Set para O(1) lookups en rutas exactas + array corto para prefijos parciales
const SERVICE_ROLE_PATHS = new Set([
  '/rest/v1/settings',
  '/rest/v1/job_applications',
  '/rest/v1/job_application_statuses',
  '/rest/v1/timeoffs',
  '/rest/v1/notifications',
  '/rest/v1/hr_messages',
  '/rest/v1/employee_disabilities',
  '/rest/v1/vet_branch_assignments',
  '/rest/v1/vet_branch_audit_log',
  '/rest/v1/groomer_branch_assignments',
  '/rest/v1/document_requests',
  '/rest/v1/employee_vacations',
  '/rest/v1/complaints',
  '/rest/v1/complaint_messages',
  '/rest/v1/companies',
  '/rest/v1/branches',
  '/rest/v1/employees',
  '/rest/v1/positions',
  '/rest/v1/departments',
  '/rest/v1/schedules',
  '/rest/v1/terminations',
  '/rest/v1/employee_terminations',
  '/rest/v1/timelogs',
  '/rest/v1/employee_schedules',
  '/rest/v1/attendance_sheets',
  '/rest/v1/payrolls',
  '/rest/v1/employee_payrolls',
  '/rest/v1/payroll_debts',
  '/rest/v1/payroll_deductions',
  '/rest/v1/payroll_payments',
  '/rest/v1/payroll_payment_employees',
  '/rest/v1/payroll_payment_employee_items',
  '/rest/v1/banks',
  '/rest/v1/creditors',
  '/rest/v1/reminders',
  '/rest/v1/timeoff_types',
  '/rest/v1/timeoff_audit_log',
  '/rest/v1/schedule_audit_log',
  '/rest/v1/overtime_consumptions',
  '/rest/v1/v_lates_daily',
  '/rest/v1/v_lates_daily_detail',
  '/rest/v1/employee_late_records',
  '/rest/v1/performance_rules',
  '/rest/v1/audit_forms',
  '/rest/v1/audit_sections',
  '/rest/v1/audit_questions',
  '/rest/v1/audit_evaluations',
  '/rest/v1/audit_answers',
  '/rest/v1/devices',
  '/rest/v1/device_assignments',
]);
// Prefijos que no se pueden resolver con Set (rutas parciales)
const SERVICE_ROLE_PREFIXES = ['/rest/v1/rpc/', '/storage/v1/object/'];

function needsServiceRole(url: string): boolean {
  for (const path of SERVICE_ROLE_PATHS) {
    if (url.includes(path)) return true;
  }
  for (const prefix of SERVICE_ROLE_PREFIXES) {
    if (url.includes(prefix)) return true;
  }
  return false;
}

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(ApiUrlService);
  const diagnosticService = inject(DiagnosticService);

  if (req.url.includes('supabase')) {
    // Logging de métricas (solo en localhost)
    const startTime = isDevelopment ? performance.now() : null;
    const method = req.method;
    const url = req.url.replace(apiUrl.baseUrl || '', '');

    const needsServiceRoleKey = needsServiceRole(req.url);

    // Para Service Role Key, intentar todas las variantes posibles
    // ENV_SUPABASE_TOKEN y ENV_SUPABASE_SERVICE_ROLE_KEY deberían ser la misma clave
    const supabaseKey = needsServiceRoleKey
      ? getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
        getEnv('ENV_SUPABASE_TOKEN') ||
        getEnv('ENV_SUPABASE_API_KEY') ||
        getEnv('ENV_SUPABASE_ANON_KEY') ||
        ''
      : getEnv('ENV_SUPABASE_API_KEY') || '';

    // Si es una petición que necesita service role key y no hay disponible, mostrar error más claro
    // Solo en desarrollo para evitar exponer información sensible
    if (needsServiceRoleKey && !supabaseKey) {
      if (
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1')
      ) {
        console.error(
          '[ERROR] No se encontró ENV_SUPABASE_SERVICE_ROLE_KEY para peticiones a ' +
            (req.url.includes('settings') ? 'settings' : 'job_applications') +
            '. ' +
            'Por favor, agrega esta variable a tu archivo .env y reinicia la aplicación.'
        );
      }
    }

    let headers = req.headers
      .set('apikey', supabaseKey)
      .set('Authorization', `Bearer ${supabaseKey}`);

    // No agregar Content-Type para Storage API (dejar que el navegador lo establezca con boundary)
    // No agregar Prefer para Storage API
    if (!req.url.includes('/storage/v1/')) {
      // Respetar Prefer si ya viene seteado (ej: upsert requiere resolution=merge-duplicates)
      const existingPrefer = req.headers.get('Prefer');
      const preferValue =
        existingPrefer && existingPrefer.trim() !== ''
          ? existingPrefer.includes('return=representation')
            ? existingPrefer
            : `${existingPrefer},return=representation`
          : 'return=representation';

      headers = headers
        .set('Prefer', preferValue)
        .set('Content-Type', 'application/json');
    }

    // Agregar header Range para peticiones con límite alto (Supabase limita a 1000 por defecto)
    // Extraer el valor del parámetro limit y generar el Range header correspondiente
    const limitMatch = req.url.match(/[?&]limit=(\d+)/);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      if (limit > 1000) {
        headers = headers.set('Range', `0-${limit - 1}`);
      }
    }

    const request = req.clone({
      headers,
    });
    return next(request).pipe(
      tap({
        next: () => {
          // Logging de duración de request exitoso (solo en desarrollo)
          // NO loguear en producción para evitar exponer URLs de la base de datos
          if (isDevelopment && startTime !== null) {
            const duration = Math.round(performance.now() - startTime);
            // Solo loguear en localhost, nunca en producción
            if (
              window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1'
            ) {
              console.log(`[${method}] ${url} - ${duration}ms`);
            }
          }
        },
      }),
      catchError((error) => {
        // Logging de errores (solo en desarrollo)
        if (isDevelopment && startTime !== null) {
          const duration = Math.round(performance.now() - startTime);
          console.error(
            `[${method}] ${url} - ERROR ${
              error.status || 'NETWORK'
            } - ${duration}ms`
          );
        }

        // Capturar errores de Supabase
        if (error.status === 401 || error.status === 403) {
          console.error('[HttpInterceptor] Auth error on Supabase request!');
          console.error('[HttpInterceptor] Status:', error.status);
          console.error('[HttpInterceptor] URL:', req.url);
          console.error('[HttpInterceptor] Error body:', error.error);
          diagnosticService.addSupabaseError(
            `Error de autenticación: ${error.status}`,
            req.url,
            error.error
          );
        } else if (error.status === 0 || !error.status) {
          diagnosticService.addNetworkError(
            req.url,
            'No se pudo conectar a Supabase',
            error
          );
        } else {
          diagnosticService.addSupabaseError(
            `Error ${error.status}: ${error.message || 'Error desconocido'}`,
            req.url,
            error.error
          );
        }
        return throwError(() => error);
      })
    );
  }

  // Endpoints públicos que NO requieren autenticación de Auth0
  if (
    req.url.includes('/api/client-ip') ||
    req.url.includes('/health') ||
    req.url.includes('/api/email/send')
  ) {
    return next(req);
  }

  // For non-Supabase requests, use Auth0 token
  return inject(AuthService)
    .getAccessTokenSilently()
    .pipe(
      switchMap((token) => {
        const request = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`),
        });
        return next(request);
      }),
      catchError((error) => {
        if (isDevelopment) {
          console.error('[HttpInterceptor] Auth0 token error:', req.url, error.status);
        }
        if (error.status === 0 || !error.status) {
          diagnosticService.addNetworkError(
            req.url,
            'No se pudo conectar al servidor',
            error
          );
        }
        return throwError(() => error);
      })
    );
};
