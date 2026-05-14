import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { AuthService } from '@auth0/auth0-angular';
import { AccessScheduleService } from './services/access-schedule.service';

@Component({
  selector: 'pt-out-of-hours',
  standalone: true,
  imports: [Button],
  template: `
    <div class="flex items-center justify-center min-h-screen bg-neutral-950 p-4">
      <div class="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center shadow-xl">
        <div class="mb-4">
          <i class="pi pi-clock text-amber-400" style="font-size: 3.5rem;"></i>
        </div>
        <h1 class="text-2xl font-semibold text-gray-100 mb-2">Fuera de horario de acceso</h1>
        <p class="text-sm text-gray-400 mb-4">
          Tu cuenta tiene un horario de acceso restringido y la hora actual está fuera de ese rango.
        </p>
        @if (summary()) {
          <div class="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 mb-6">
            <p class="text-xs text-gray-500 mb-1">Horario permitido</p>
            <p class="text-sm text-gray-200">{{ summary() }}</p>
          </div>
        }
        <div class="flex flex-col gap-2">
          <p-button label="Reintentar" icon="pi pi-refresh" severity="primary" (onClick)="retry()" />
          <p-button label="Cerrar sesión" icon="pi pi-sign-out" severity="secondary" [text]="true" (onClick)="logout()" />
        </div>
        <p class="text-xs text-gray-600 mt-6">
          Si crees que esto es un error, contacta a tu administrador.
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OutOfHoursComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private schedule = inject(AccessScheduleService);

  summary = this.schedule.scheduleSummary;

  retry(): void {
    if (this.schedule.isWithinSchedule()) {
      this.router.navigate(['/']);
    }
  }

  logout(): void {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
