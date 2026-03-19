import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { OrganizationService } from '../services/organization.service';
import { PermissionsService } from '../services/permissions.service';

@Component({
  selector: 'pt-time-management',
  imports: [RouterOutlet, NgClass],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }">
    <main
      class="bg-neutral-900 min-h-screen"
      [ngClass]="{ 'naz-main': isNaz() }"
    >
      <router-outlet />
    </main>
  </div>`,
  styles: `
    .naz-theme main.naz-main {
      background: #000000 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeManagementComponent {
  public organizationService = inject(OrganizationService);
  private permissionsService = inject(PermissionsService);
  private router = inject(Router);

  public isNaz = computed(() => this.organizationService.isNaz());

  public tmSubs = computed(() => ({
    timelogs: this.permissionsService.canAccessSubModule('time_management', 'timelogs'),
    timetables: this.permissionsService.canAccessSubModule('time_management', 'timetables'),
    schedules: this.permissionsService.canAccessSubModule('time_management', 'schedules'),
    vet_schedule: this.permissionsService.canAccessSubModule('time_management', 'vet_schedule'),
    salon_schedule: this.permissionsService.canAccessSubModule('time_management', 'salon_schedule'),
  }));

  // Redirigir al primer sub-módulo disponible cuando la URL es exactamente /time-management
  private redirectEffect = effect(() => {
    const subs = this.tmSubs();
    const url = this.router.url;
    if (url === '/time-management' || url === '/time-management/') {
      const subModuleRoutes: { key: keyof typeof subs; route: string }[] = [
        { key: 'timetables', route: 'timetables' },
        { key: 'schedules', route: 'schedules' },
        { key: 'timelogs', route: 'timelogs' },
        { key: 'vet_schedule', route: 'vet-schedule' },
        { key: 'salon_schedule', route: 'salon-schedule' },
      ];
      for (const sub of subModuleRoutes) {
        if (subs[sub.key]) {
          this.router.navigate(['/time-management', sub.route]);
          return;
        }
      }
      this.router.navigate(['/my-portal']);
    }
  });
}
