import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { SupabaseAuthService } from './src/app/services/supabase-auth.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, of, switchMap, take } from 'rxjs';
import { AuthBypassService } from './src/app/services/auth-bypass.service';
import { DiagnosticService } from './src/app/services/diagnostic.service';

export const authGuardFn: CanActivateFn = (_route: ActivatedRouteSnapshot) => {
  const auth = inject(SupabaseAuthService);
  const router = inject(Router);
  const http = inject(HttpClient);
  const bypassService = inject(AuthBypassService);
  const diagnosticService = inject(DiagnosticService);

  // Verificar si el bypass está activo PRIMERO
  if (bypassService.isBypassActive()) {
    const user = bypassService.getCurrentUser();
    console.log('🔓 [Guard] Bypass activo, usuario:', user?.email);
    if (user?.email) {
      // Con bypass, permitir acceso sin verificar en base de datos
      // El bypass es para desarrollo/testing, así que confiamos en él
      console.log('🔓 [Guard] Permitiendo acceso con bypass');
      diagnosticService.addError({
        type: 'auth',
        message: `Bypass activo: ${user.email}`,
        details: 'Acceso permitido por bypass de autenticación.',
      });
      return of(true);
    } else {
      console.warn('🔓 [Guard] Bypass activo pero no hay usuario, limpiando bypass');
      bypassService.logout();
    }
  }

  // Verificar autenticación con Supabase
  return auth.isAuthenticated$.pipe(
    take(1),
    switchMap((isLogged) => {
      if (!isLogged) {
        console.log('🔓 [Guard] Usuario no autenticado, redirigiendo a /login');
        diagnosticService.addAuthError('Usuario no autenticado', 'Redirigiendo a /login');
        return of(router.createUrlTree(['/login']));
      }

      return auth.user$.pipe(
        take(1),
        switchMap((user) => {
          if (!user?.email) {
            console.log('🔓 [Guard] Usuario autenticado pero sin email, redirigiendo a /login');
            diagnosticService.addAuthError('Usuario autenticado sin email', 'Redirigiendo a /login');
            return of(router.createUrlTree(['/login']));
          }

          const supabaseUrl = process.env['ENV_SUPABASE_URL'];
          if (!supabaseUrl) {
            console.warn('🔓 [Guard] ENV_SUPABASE_URL no está configurado. Permitir acceso sin verificación de empleado.');
            diagnosticService.addSupabaseError('ENV_SUPABASE_URL no configurado', 'Acceso permitido sin verificación de empleado.');
            return of(true);
          }

          const email = user.email.toLowerCase();
          console.log('🔍 [Guard] Buscando empleado:', email);
          diagnosticService.addError({
            type: 'supabase',
            message: `Buscando empleado: ${email}`,
            details: `URL: ${supabaseUrl}/rest/v1/employees`,
          });

          // Buscar en la tabla employees (tabla compartida por company_id)
          const params = new HttpParams()
            .set('select', 'id')
            .set('or', `(work_email.eq.${email},email.eq.${email})`);

          return http
            .get<Array<{ id: string }>>(`${supabaseUrl}/rest/v1/employees`, {
              params,
            })
            .pipe(
              map((records) => {
                if (records.length > 0) {
                  console.log('✅ [Guard] Empleado encontrado:', email);
                  diagnosticService.addError({
                    type: 'supabase',
                    message: `Empleado encontrado: ${email}`,
                    details: `ID: ${records[0].id}`,
                  });
                  return true;
                } else {
                  console.log('❌ [Guard] Empleado no encontrado, redirigiendo a /sin-acceso');
                  diagnosticService.addAuthError(`Empleado no encontrado: ${email}`, 'Redirigiendo a /sin-acceso');
                  return router.createUrlTree(['/sin-acceso']);
                }
              }),
              catchError((error) => {
                console.error('🔴 [Guard] Error HTTP buscando empleado:', error);
                diagnosticService.addHttpError(
                  `${supabaseUrl}/rest/v1/employees`,
                  error.status,
                  `Error buscando empleado: ${error.message}`,
                  error
                );
                return of(router.createUrlTree(['/sin-acceso']));
              })
            );
        })
      );
    })
  );
};
