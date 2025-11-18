import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-time-management',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `<header class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div class="block w-full overflow-x-auto">
          <div class="flex gap-2 min-w-max">
            @if (store.isAdmin()) {
            <a
              routerLink="timelogs"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-clock text-base"></i> <span>Marcaciones</span></a
            >
            }

            <a
              routerLink="timetables"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-calendar-clock text-base"></i> <span>Turnos</span></a
            >
            @if(store.isAdmin()) {
            <a
              routerLink="schedules"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-calendar text-base"></i> <span>Horarios</span></a
            >
            <a
              routerLink="salon-schedule"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-calendar text-base"></i> <span>Horario de Peluquería</span></a
            >
            }
          </div>
        </div>
      </div>
    </header>
    <main class="bg-neutral-900 min-h-screen">
      <div class="mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <router-outlet />
      </div>
    </main>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeManagementComponent {
  public store = inject(DashboardStore);
}
