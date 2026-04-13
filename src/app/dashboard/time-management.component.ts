import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OrganizationService } from '../services/organization.service';
import { PermissionsService } from '../services/permissions.service';
import { DesignVersionService } from '../services/design-version.service';
import { DeviceService } from '../services/device.service';

@Component({
  selector: 'pt-time-management',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }">
    @if (designVersion.isClassic()) {
    <!-- Classic secondary sub-nav header -->
    <header
      class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md"
      [ngClass]="{ 'naz-header': isNaz() }"
    >
      <div class="mx-auto max-w-7xl px-3 py-2 sm:px-4 sm:py-3 lg:px-8">
        @if (device.isDesktop()) {
        <div class="flex gap-2 justify-center">
          @if (tmSubs().timelogs) {
          <a routerLink="timelogs"
            class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
            [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
            <i class="pi pi-clock text-base"></i><span>Marcaciones</span>
          </a>
          }
          @if (tmSubs().vet_schedule) {
          <a routerLink="vet-schedule"
            class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
            [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
            <i class="pi pi-heart text-base"></i><span>Horario Vet</span>
          </a>
          }
          @if (tmSubs().salon_schedule) {
          <a routerLink="salon-schedule"
            class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
            [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
            <i class="pi pi-shop text-base"></i><span>Horario Peluquería</span>
          </a>
          }
          @if (tmSubs().timetables) {
          <a routerLink="timetables"
            class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
            [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
            <i class="pi pi-calendar-clock text-base"></i><span>Turnos</span>
          </a>
          }
          @if (tmSubs().schedules) {
          <a routerLink="schedules"
            class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
            [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
            <i class="pi pi-calendar text-base"></i><span>Horarios</span>
          </a>
          }
          @if (tmSubs().personnel_movements) {
          <a routerLink="movimientos-personal"
            class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
            [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
            <i class="pi pi-map text-base"></i><span>Movimientos</span>
          </a>
          }
        </div>
        } @else {
        <!-- Mobile: horizontal scrollable tabs -->
        <div class="overflow-x-auto scrollbar-hide">
          <div class="flex gap-1.5 min-w-max py-1">
            @if (tmSubs().timelogs) {
            <a routerLink="timelogs"
              class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
              [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
              <i class="pi pi-clock text-sm"></i><span>Marcas</span>
            </a>
            }
            @if (tmSubs().vet_schedule) {
            <a routerLink="vet-schedule"
              class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
              [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
              <i class="pi pi-heart text-sm"></i><span>Vet</span>
            </a>
            }
            @if (tmSubs().salon_schedule) {
            <a routerLink="salon-schedule"
              class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
              [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
              <i class="pi pi-shop text-sm"></i><span>Pelu</span>
            </a>
            }
            @if (tmSubs().timetables) {
            <a routerLink="timetables"
              class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
              [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
              <i class="pi pi-calendar-clock text-sm"></i><span>Turnos</span>
            </a>
            }
            @if (tmSubs().schedules) {
            <a routerLink="schedules"
              class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
              [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
              <i class="pi pi-calendar text-sm"></i><span>Horarios</span>
            </a>
            }
            @if (tmSubs().personnel_movements) {
            <a routerLink="movimientos-personal"
              class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
              [routerLinkActive]="['bg-gradient-to-r','from-amber-500/20','to-amber-600/20','text-amber-300','shadow-md']">
              <i class="pi pi-map text-sm"></i><span>Movim.</span>
            </a>
            }
          </div>
        </div>
        }
      </div>
    </header>
    }
    <main class="bg-neutral-900 min-h-full" [ngClass]="{ 'naz-main': isNaz() }">
      <router-outlet />
    </main>
  </div>`,
  styles: `
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    :host-context(html.dark) .naz-theme header.naz-header {
      background: #000000 !important;
      border-bottom-color: rgba(255,255,255,0.10) !important;
    }
    :host-context(html.light) .naz-theme header.naz-header {
      background: #ffffff !important;
      border-bottom-color: rgba(0,0,0,0.10) !important;
    }
    .naz-theme main.naz-main { background: #000000 !important; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeManagementComponent {
  public organizationService = inject(OrganizationService);
  private permissionsService = inject(PermissionsService);
  private router = inject(Router);
  public designVersion = inject(DesignVersionService);
  public device = inject(DeviceService);

  public isNaz = computed(() => this.organizationService.isNaz());

  public tmSubs = computed(() => ({
    timelogs: this.permissionsService.canAccessSubModule('time_management', 'timelogs'),
    timetables: this.permissionsService.canAccessSubModule('time_management', 'timetables'),
    schedules: this.permissionsService.canAccessSubModule('time_management', 'schedules'),
    vet_schedule: this.permissionsService.canAccessSubModule('time_management', 'vet_schedule'),
    salon_schedule: this.permissionsService.canAccessSubModule('time_management', 'salon_schedule'),
    personnel_movements: this.permissionsService.canAccessSubModule('time_management', 'personnel_movements'),
  }));

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
        { key: 'personnel_movements', route: 'movimientos-personal' },
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
