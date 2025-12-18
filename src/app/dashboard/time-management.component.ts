import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-time-management',
  imports: [RouterOutlet, NgClass, TabsModule],
  template: `<div
    [ngClass]="{ 'naz-theme': isNaz() }"
    class="mx-2 sm:mx-4 md:mx-6 flex flex-col gap-4 py-4 sm:py-6"
  >
    <p-tabs
      [value]="activeTab()"
      (valueChange)="onTabChange($event)"
      scrollable
    >
      <p-tablist>
        @if (store.isAdmin()) {
        <p-tab value="timelogs">
          <i class="pi pi-clock mr-2"></i>
          <span class="hidden sm:inline">Marcaciones</span>
          <span class="sm:hidden">Marcaciones</span>
        </p-tab>
        }
        <p-tab value="timetables">
          <i class="pi pi-calendar-clock mr-2"></i>
          <span class="hidden sm:inline">Turnos</span>
          <span class="sm:hidden">Turnos</span>
        </p-tab>
        @if(store.isAdmin()) {
        <p-tab value="schedules">
          <i class="pi pi-calendar mr-2"></i>
          <span class="hidden sm:inline">Horarios</span>
          <span class="sm:hidden">Horarios</span>
        </p-tab>
        }
      </p-tablist>
    </p-tabs>

    <div class="mt-4">
      <router-outlet />
    </div>
  </div>`,
  styles: `
    /* Tema Naz */
    .naz-theme header.naz-header {
      background: #000000 !important;
      border-bottom-color: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme .naz-header a {
      color: #C6C2BF !important;
    }

    .naz-theme .naz-header a:hover {
      color: #FFFFFF !important;
      background: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme .naz-header a[routerlinkactive] {
      background: #0D0D0D !important;
      color: #FFFFFF !important;
    }

    .naz-theme main.naz-main {
      background: #000000 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeManagementComponent {
  public store = inject(DashboardStore);
  public organizationService = inject(OrganizationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Computed para verificar si es Naz
  public isNaz = computed(() => this.organizationService.isNaz());

  // Tab activa basada en la ruta actual
  public activeTab = signal<string>('timetables');

  constructor() {
    // Determinar la pestaña activa basada en la ruta
    const url = this.router.url;
    if (url.includes('/timelogs')) {
      this.activeTab.set('timelogs');
    } else if (url.includes('/schedules')) {
      this.activeTab.set('schedules');
    } else {
      this.activeTab.set('timetables');
    }
  }

  // Manejar cambio de pestaña
  public onTabChange(tabValue: string | number): void {
    const tabValueStr = String(tabValue);
    this.activeTab.set(tabValueStr);
    // Navegar a la ruta correspondiente sin recargar
    this.router.navigate([tabValueStr], {
      relativeTo: this.route,
      replaceUrl: true,
    });
  }
}
