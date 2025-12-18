import { ChangeDetectionStrategy, Component, inject, computed, signal, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { NgClass } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DashboardStore } from '../stores/dashboard.store';
import { OrganizationService } from '../services/organization.service';

@Component({
  selector: 'pt-time-management',
  imports: [RouterOutlet, NgClass, TabsModule],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }" class="mx-2 sm:mx-4 md:mx-6 flex flex-col gap-4 py-4 sm:py-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl sm:text-2xl font-bold text-white">
        <i class="pi pi-clock mr-2"></i>
        <span class="hidden sm:inline">Gestión de Tiempo</span>
        <span class="sm:hidden">Tiempo</span>
      </h1>
    </div>

    <p-tabs [value]="activeTab()" (valueChange)="onTabChange($event)" scrollable>
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
export class TimeManagementComponent implements OnDestroy {
  public store = inject(DashboardStore);
  public organizationService = inject(OrganizationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  // Computed para verificar si es Naz
  public isNaz = computed(() => this.organizationService.isNaz());

  // Tab activa basada en la ruta actual
  public activeTab = signal<string>('timetables');

  // Valores válidos de pestañas
  private readonly validTabValues = ['timelogs', 'timetables', 'schedules'];

  // Suscripción a eventos del router
  private routerSubscription?: Subscription;

  constructor() {
    // Función para actualizar la pestaña activa basada en la URL
    const updateActiveTabFromUrl = (url: string) => {
      if (url.includes('/timelogs')) {
        this.activeTab.set('timelogs');
      } else if (url.includes('/schedules')) {
        this.activeTab.set('schedules');
      } else {
        this.activeTab.set('timetables');
      }
    };

    // Determinar la pestaña activa basada en la ruta inicial
    updateActiveTabFromUrl(this.router.url);

    // Suscribirse a los cambios de ruta para mantener la sincronización
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        updateActiveTabFromUrl(this.router.url);
      });
  }

  ngOnDestroy(): void {
    // Limpiar la suscripción cuando el componente se destruya
    this.routerSubscription?.unsubscribe();
  }

  // Manejar cambio de pestaña
  public onTabChange(tabValue: string | number): void {
    const tabValueStr = String(tabValue);
    
    // Validar que el valor sea uno de los valores válidos
    if (!this.validTabValues.includes(tabValueStr)) {
      console.warn(`Valor de pestaña inválido: ${tabValueStr}. Valores válidos: ${this.validTabValues.join(', ')}`);
      return;
    }

    this.activeTab.set(tabValueStr);
    // Navegar a la ruta correspondiente sin recargar
    this.router.navigate([tabValueStr], { relativeTo: this.route, replaceUrl: true });
  }
}
