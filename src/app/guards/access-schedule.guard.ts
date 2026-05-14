import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessScheduleService } from '../services/access-schedule.service';
import { DashboardStore } from '../stores/dashboard.store';

/**
 * Espera a que el empleado esté cargado (igual que permission.guard).
 */
async function waitForEmployee(dashboardStore: InstanceType<typeof DashboardStore>): Promise<boolean> {
  const maxWait = 5000;
  const checkInterval = 100;
  let waited = 0;
  while (!dashboardStore.currentEmployee() && waited < maxWait) {
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
    waited += checkInterval;
  }
  return !!dashboardStore.currentEmployee();
}

/**
 * Bloquea acceso al dashboard cuando el empleado tiene `access_schedule.mode='block'`
 * y la hora actual está fuera del rango permitido. Redirige a /out-of-hours.
 *
 * Para `mode='readonly'` no bloquea aquí — eso lo maneja el flujo de read-only global.
 */
export const accessScheduleGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const dashboardStore = inject(DashboardStore);
  const schedule = inject(AccessScheduleService);

  const loaded = await waitForEmployee(dashboardStore);
  if (!loaded) return true; // no es nuestro problema, otro guard maneja

  if (schedule.isOutOfHours() && schedule.mode() === 'block') {
    router.navigate(['/out-of-hours']);
    return false;
  }
  return true;
};
