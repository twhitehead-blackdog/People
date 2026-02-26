import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { EmployeePortalDataService } from './employee-portal/services/employee-portal-data.service';
import { EmployeePortalDashboardTabComponent } from './employee-portal/tabs/employee-portal-dashboard-tab.component';
import { EmployeePortalGestionesTabComponent } from './employee-portal/tabs/employee-portal-gestiones-tab.component';
import { EmployeePortalLatesTabComponent } from './employee-portal/tabs/employee-portal-lates-tab.component';
import { EmployeePortalNotificationsDialogComponent } from './employee-portal/tabs/employee-portal-notifications-dialog.component';
import { EmployeePortalProfileTabComponent } from './employee-portal/tabs/employee-portal-profile-tab.component';
import { EmployeePortalTimelogsTabComponent } from './employee-portal/tabs/employee-portal-timelogs-tab.component';

@Component({
  selector: 'pt-employee-portal',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TabsModule,
    TabViewModule,
    ToastModule,
    TooltipModule,
    EmployeePortalDashboardTabComponent,
    EmployeePortalGestionesTabComponent,
    EmployeePortalProfileTabComponent,
    EmployeePortalTimelogsTabComponent,
    EmployeePortalLatesTabComponent,
    EmployeePortalNotificationsDialogComponent,
  ],
  providers: [MessageService],
  template: `
    <div class="flex flex-col h-screen bg-black overflow-hidden relative">
      <!-- Background Effects -->
      <div
        class="absolute top-0 right-0 w-1/3 h-1/3 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"
      ></div>
      <div
        class="absolute bottom-0 left-0 w-1/4 h-1/4 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"
      ></div>

      <!-- Header Section -->
      <header
        class="flex-shrink-0 bg-neutral-900/50 backdrop-blur-md border-b border-white/5 py-4 px-6 z-10"
      >
        <div class="flex items-center justify-between max-w-7xl mx-auto">
          <!-- User Profile Brief -->
          <div class="flex items-center gap-4">
            <div class="relative">
              <div
                class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-2 ring-white/10"
              >
                {{
                  dataService.currentEmployee()?.first_name?.charAt(0) || 'U'
                }}
              </div>
              <div
                class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-neutral-900"
              ></div>
            </div>
            <div>
              <h1 class="text-xl font-bold text-white m-0 leading-tight">
                Hola,
                {{ dataService.currentEmployee()?.first_name || 'Usuario' }}
              </h1>
              <p class="text-gray-400 text-sm m-0">
                {{
                  dataService.currentEmployee()?.position?.name || 'Bienvenido'
                }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3">
            <p-button
              (click)="showNotificationsDialog.set(true)"
              styleClass="p-2 rounded-xl bg-neutral-800 border border-white/10 text-gray-300 hover:text-white hover:bg-neutral-700 transition-all relative"
            >
              <i class="pi pi-bell text-lg"></i>
              @if (dataService.unreadNotificationsCount() > 0) {
              <span
                class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"
              ></span>
              }
            </p-button>
          </div>
        </div>
      </header>

      <!-- Main Content Area with Tabs -->
      <main class="flex-1 overflow-hidden relative z-0">
        <div class="h-full flex flex-col max-w-7xl mx-auto w-full">
          <p-tabView
            [(activeIndex)]="activeTabIndex"
            (onChange)="onTabChange($event)"
            styleClass="flex flex-col h-full bg-transparent"
            [scrollable]="true"
          >
            <!-- Tab 0: Dashboard -->
            <p-tabPanel header="Dashboard" [disabled]="false">
              <ng-template pTemplate="header">
                <div class="flex items-center gap-2 px-1 py-1">
                  <i class="pi pi-home"></i>
                  <span class="font-medium">Inicio</span>
                </div>
              </ng-template>
              <div
                class="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24"
              >
                <pt-employee-portal-dashboard-tab />
              </div>
            </p-tabPanel>

            <!-- Tab 1: Gestiones -->
            <p-tabPanel header="Gestiones">
              <ng-template pTemplate="header">
                <div class="flex items-center gap-2 px-1 py-1">
                  <i class="pi pi-briefcase"></i>
                  <span class="font-medium">Gestiones</span>
                </div>
              </ng-template>
              <div
                class="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24"
              >
                <pt-employee-portal-gestiones-tab />
              </div>
            </p-tabPanel>

            <!-- Tab 2: Mi Perfil -->
            <p-tabPanel header="Perfil">
              <ng-template pTemplate="header">
                <div class="flex items-center gap-2 px-1 py-1">
                  <i class="pi pi-user"></i>
                  <span class="font-medium">Mi Perfil</span>
                </div>
              </ng-template>
              <div
                class="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24"
              >
                <pt-employee-portal-profile-tab />
              </div>
            </p-tabPanel>

            <!-- Tab 3: Marcaciones -->
            <p-tabPanel header="Marcaciones">
              <ng-template pTemplate="header">
                <div class="flex items-center gap-2 px-1 py-1">
                  <i class="pi pi-clock"></i>
                  <span class="font-medium">Marcaciones</span>
                </div>
              </ng-template>
              <div
                class="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24"
              >
                <pt-employee-portal-timelogs-tab />
              </div>
            </p-tabPanel>

            <!-- Tab 4: Tardanzas -->
            <p-tabPanel header="Tardanzas">
              <ng-template pTemplate="header">
                <div class="flex items-center gap-2 px-1 py-1">
                  <i class="pi pi-exclamation-circle"></i>
                  <span class="font-medium">Tardanzas</span>
                </div>
              </ng-template>
              <div
                class="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24"
              >
                <pt-employee-portal-lates-tab />
              </div>
            </p-tabPanel>
          </p-tabView>
        </div>
      </main>

      <!-- Toast Notifications -->
      <p-toast position="bottom-right" />

      <!-- Notifications Dialog -->
      <pt-employee-portal-notifications-dialog
        [visible]="showNotificationsDialog()"
        (onClose)="showNotificationsDialog.set(false)"
      />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }

      /* Custom Scrollbar */
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.02);
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      /* PrimeNG TabView Customization */
      :host ::ng-deep .p-tabview {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      :host ::ng-deep .p-tabview .p-tabview-nav {
        background: transparent;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: center;
        margin-bottom: 0;
      }
      :host ::ng-deep .p-tabview .p-tabview-nav li .p-tabview-nav-link {
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #9ca3af;
        transition: all 0.2s;
        padding: 1rem 1.5rem;
      }
      :host
        ::ng-deep
        .p-tabview
        .p-tabview-nav
        li.p-highlight
        .p-tabview-nav-link {
        background: transparent;
        color: #fbbf24;
        border-bottom-color: #fbbf24;
      }
      :host
        ::ng-deep
        .p-tabview
        .p-tabview-nav
        li
        .p-tabview-nav-link:not(.p-disabled):focus {
        box-shadow: none;
      }
      :host ::ng-deep .p-tabview .p-tabview-panels {
        background: transparent;
        border: none;
        padding: 0;
        flex: 1;
        height: 100%;
        overflow: hidden;
      }
      :host ::ng-deep .p-tabview-panel {
        height: 100%;
      }
    `,
  ],
})
export class EmployeePortalComponent implements OnInit {
  public dataService = inject(EmployeePortalDataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Tab State
  public activeTabIndex = signal(0);
  public showNotificationsDialog = signal(false);

  constructor() {
    // Sync tab with URL fragment
    effect(() => {
      this.route.fragment.subscribe((fragment) => {
        this.updateTabFromFragment(fragment);
      });
    });
  }

  ngOnInit() {
    // Initial data fetch is handled by DataService constructor/signals
    this.route.fragment.subscribe((fragment) => {
      this.updateTabFromFragment(fragment);
    });
  }

  public onTabChange(event: any) {
    const index = event.index;
    this.activeTabIndex.set(index);

    let fragment = 'dashboard';
    switch (index) {
      case 0:
        fragment = 'dashboard';
        break;
      case 1:
        fragment = 'gestiones';
        break;
      case 2:
        fragment = 'perfil';
        break;
      case 3:
        fragment = 'marcaciones';
        break;
      case 4:
        fragment = 'tardanzas';
        break;
    }

    this.router.navigate([], {
      fragment: fragment,
      replaceUrl: true,
      queryParamsHandling: 'preserve',
    });
  }

  private updateTabFromFragment(fragment: string | null) {
    if (!fragment) {
      this.activeTabIndex.set(0);
      return;
    }

    switch (fragment) {
      case 'dashboard':
        this.activeTabIndex.set(0);
        break;
      case 'gestiones':
        this.activeTabIndex.set(1);
        break;
      case 'perfil':
        this.activeTabIndex.set(2);
        break;
      case 'marcaciones':
        this.activeTabIndex.set(3);
        break;
      case 'tardanzas':
        this.activeTabIndex.set(4);
        break;
      default:
        this.activeTabIndex.set(0);
        break;
    }
  }
}
