import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { map, switchMap, take } from 'rxjs';

/**
 * Guard que protege la ruta de supervisor-preview
 * Solo permite acceso a administradores
 */
export const supervisorPreviewGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const http = inject(HttpClient);

  // Lista de correos con acceso completo (super admins)
  const superAdminEmails = ['mercadeo@blackdogpanama.com'];

  return authService.user$.pipe(
    take(1),
    switchMap((user) => {
      if (!user?.email) {
        router.navigate(['/login']);
        return [false];
      }

      const userEmail = user.email.toLowerCase();

      // Verificar si es super admin
      if (superAdminEmails.includes(userEmail)) {
        return [true];
      }

      // Verificar si es admin por posición
      if (!user.email) {
        router.navigate(['/']);
        return [false];
      }
      // Usar formato 'or' con HttpParams como en guard.ts
      const params = new HttpParams()
        .set('select', 'id,position:positions(name,admin)')
        .set('or', `(work_email.eq.${user.email})`);

      return http
        .get<
          Array<{
            id: string;
            position?: { name: string; admin: boolean };
          }>
        >(`${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`, {
          params,
        })
        .pipe(
          map((employees) => {
            const employee = employees[0];
            if (employee?.position?.admin) {
              return true;
            }
            router.navigate(['/']);
            return false;
          })
        );
    })
  );
};
