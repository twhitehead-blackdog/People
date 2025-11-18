import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';

import { AsyncPipe } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AuthStore } from '../stores/auth.store';
import { BanksStore } from '../stores/banks.store';
import { BranchesStore } from '../stores/branches.store';
import { CompaniesStore } from '../stores/companies.store';
import { DashboardStore } from '../stores/dashboard.store';
import { DepartmentsStore } from '../stores/departments.store';
import { EmployeesStore } from '../stores/employees.store';
import { PayrollsStore } from '../stores/payrolls.store';
import { PositionsStore } from '../stores/positions.store';
import { SchedulesStore } from '../stores/schedules.store';

@Component({
  selector: 'pt-dashboard',
  providers: [
    AuthStore,
    DashboardStore,
    MessageService,
    ConfirmationService,
    EmployeesStore,
    BranchesStore,
    CompaniesStore,
    PositionsStore,
    DepartmentsStore,
    SchedulesStore,
    BanksStore,
    PayrollsStore,
  ],
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ToastModule,
    AccordionModule,
    RippleModule,
    CardModule,
    ConfirmDialogModule,
    Button,
    Avatar,
    AsyncPipe,
    MenuModule,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    @let user = auth.user$ | async;
    <div class=" h-screen flex flex-col">
      <nav
        class="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b border-neutral-700/50 w-full min-w-0 shadow-lg"
        style="position: relative; z-index: 1000;"
      >
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-16 items-center justify-between">
            <div class="flex items-center">
              <a routerLink="/home" class="shrink-0 flex items-center gap-2 group">
                <img src="images/blackdog.png" class="h-9 transition-transform duration-300 group-hover:scale-105" alt="Peopletrak" />
              </a>
              <div class="hidden md:block">
                <div class="ml-10 flex items-baseline space-x-1">
                  @if(store.isAdmin() && !store.hasPortalAccessOnly()) {
                  <a
                    routerLink="/home"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md"
                    ><i class="pi pi-home text-base"></i> <span>Inicio</span></a
                  >
                  } @if(store.isAdmin() && !store.hasPortalAccessOnly()) {
                  <a
                    routerLink="/admin"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md"
                  >
                    <i class="pi pi-building text-base"></i> <span>Administración</span></a
                  >
                  } @if(store.isAdmin() && !store.hasPortalAccessOnly()) {
                  <a
                    routerLink="/payroll"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md"
                  >
                    <i class="pi pi-money-bill text-base"></i> <span>Nómina</span></a
                  >
                  } @if(store.isScheduleAdmin() && !store.hasPortalAccessOnly()) {
                  <a
                    routerLink="/time-management"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md"
                    ><i class="pi pi-calendar text-base"></i> <span>Gestión de tiempo</span></a
                  >
                  }
                  @if(!store.hasPortalAccessOnly()) {
                  <a
                    routerLink="/timeclock"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md"
                    ><i class="pi pi-clock text-base"></i> <span>Reloj de marcación</span></a
                  >
                  }
                </div>
              </div>
            </div>
            <div class="hidden md:block">
              @if(user) {
              <p-menu #menu [model]="items" popup />
              <div
                class="ml-4 flex items-center md:ml-6 gap-3 cursor-pointer group px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200"
                (click)="menu.toggle($event)"
              >
                <div class="relative flex-shrink-0">
                  <div class="avatar-container">
                    <p-avatar [image]="user?.picture" shape="circle" size="normal" />
                  </div>
                  <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                  <div class="text-sm font-semibold text-white group-hover:text-gray-100 transition-colors truncate">
                    {{ store.currentEmployee()?.first_name }}
                    {{ store.currentEmployee()?.father_name }}
                  </div>
                  <div class="text-xs text-gray-400 group-hover:text-gray-300 transition-colors truncate">
                    {{ store.currentEmployee()?.position?.name || 'Sin cargo' }}
                  </div>
                </div>
                <i class="pi pi-chevron-down text-gray-400 group-hover:text-gray-300 transition-colors text-xs flex-shrink-0"></i>
              </div>

              }
            </div>
            <div class="-mr-2 flex md:hidden">
              <p-button
                rounded
                text
                [icon]="isCollapsed() ? 'pi pi-bars' : 'pi pi-times'"
                severity="secondary"
                (onClick)="toggleMenu()"
                class="text-white hover:bg-gray-700/50"
              />
            </div>
          </div>
        </div>
        <div class="md:hidden border-t border-neutral-700/50 bg-neutral-800/90 backdrop-blur-sm" [class.hidden]="isCollapsed()">
          <div class="space-y-1 px-2 pt-2 pb-3 sm:px-3">
            @if(store.isAdmin() && !store.hasPortalAccessOnly()) {
            <a
              routerLink="/home"
              [routerLinkActive]="[
                'bg-gray-700/50',
                'text-white',
                'shadow-md'
              ]"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200"
              ><i class="pi pi-home text-lg"></i> <span>Inicio</span></a
            >
            } @if(store.isAdmin() && !store.hasPortalAccessOnly()) {
            <a
              routerLink="/admin"
              [routerLinkActive]="[
                'bg-gray-700/50',
                'text-white',
                'shadow-md'
              ]"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200"
              ><i class="pi pi-building text-lg"></i> <span>Administración</span></a
            >
            } @if(store.isScheduleAdmin() && !store.hasPortalAccessOnly()) {
            <a
              routerLink="/time-management"
              [routerLinkActive]="[
                'bg-gray-700/50',
                'text-white',
                'shadow-md'
              ]"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200"
              ><i class="pi pi-calendar text-lg"></i> <span>Gestión de tiempo</span></a
            >
            } @if(store.isAdmin() && !store.hasPortalAccessOnly()) {
            <a
              routerLink="/payroll"
              [routerLinkActive]="[
                'bg-gray-700/50',
                'text-white',
                'shadow-md'
              ]"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200"
              ><i class="pi pi-money-bill text-lg"></i> <span>Nómina</span></a
            >
            }
            @if(!store.hasPortalAccessOnly()) {
            <a
              routerLink="/timeclock"
              [routerLinkActive]="[
                'bg-gray-700/50',
                'text-white',
                'shadow-md'
              ]"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200"
              ><i class="pi pi-clock text-lg"></i> <span>Reloj de marcación</span></a
            >
            }
          </div>
          @if(user) {
          <div class="border-t border-gray-700/50 pt-4 pb-3 px-5">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="avatar-container">
                  <p-avatar [image]="user.picture" shape="circle" size="normal" />
                </div>
                <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
              </div>
              <div class="flex-1">
                <div class="text-base font-semibold text-white">
                  {{ store.currentEmployee()?.first_name }}
                  {{ store.currentEmployee()?.father_name }}
                </div>
                <div class="text-sm text-gray-400">
                  {{ store.currentEmployee()?.position?.name }}
                </div>
              </div>
            </div>
          </div>
          }
        </div>
      </nav>
      <div class="flex-1 overflow-y-auto"><router-outlet /></div>
    </div>
  `,
  styles: `
      .selected {
        @apply bg-gradient-to-r from-gray-700/80 to-gray-600/80 text-white shadow-md transition-all duration-300 ease-in-out;
        border-left: 3px solid #FBBF24;
      }
      
      ::ng-deep .p-menu {
        background: #1f2937 !important;
        border: 1px solid rgba(251, 191, 36, 0.2) !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
        padding: 0.5rem !important;
      }
      
      ::ng-deep .p-menu .p-menuitem-link {
        padding: 0.75rem 1rem !important;
        border-radius: 0.375rem !important;
        transition: all 0.2s ease !important;
      }
      
      ::ng-deep .p-menu .p-menuitem-link:hover {
        background: rgba(251, 191, 36, 0.1) !important;
      }
      
      ::ng-deep .p-menu .p-menuitem-link .p-menuitem-text {
        color: #e5e7eb !important;
      }
      
      ::ng-deep .p-menu .p-menuitem-link:hover .p-menuitem-text {
        color: #ffffff !important;
      }
      
      ::ng-deep .p-menu .p-menuitem-link .p-menuitem-icon {
        color: #fbbf24 !important;
      }

      /* Avatar Container Styles */
      .avatar-container {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid rgba(107, 114, 128, 0.6);
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .avatar-container:hover {
        border-color: rgba(156, 163, 175, 0.4);
      }

      ::ng-deep .avatar-container .p-avatar {
        width: 100% !important;
        height: 100% !important;
      }

      ::ng-deep .avatar-container .p-avatar img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover;
        border-radius: 50%;
      }

      ::ng-deep .avatar-container .p-avatar-circle {
        border-radius: 50% !important;
      }
      `,
})
export class DashboardComponent {
  public isCollapsed = signal(true);
  public store = inject(DashboardStore);
  public auth = inject(AuthService);
  public router = inject(Router);

  constructor() {
    // La redirección se maneja en el guard para evitar conflictos de navegación
  }

  public items: MenuItem[] = [
    {
      label: 'Mi Portal',
      icon: 'pi pi-user',
      command: () => this.router.navigate(['/my-portal']),
    },
    {
      separator: true,
    },
    {
      label: 'Cerrar sesion',
      icon: 'pi pi-sign-out',
      command: () => this.auth.logout(),
    },
  ];

  async toggleMenu() {
    this.isCollapsed.update((value) => !value);
  }

  toggleCompany(companyId: string | null) {
    this.store.toggleCompany(companyId);
  }
}
