import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';
import { Button } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { AsyncPipe } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DashboardStore } from '../stores/dashboard.store';
import { AuthStore } from '../stores/auth.store';
import { EmployeesStore } from '../stores/employees.store';
import { BranchesStore } from '../stores/branches.store';
import { CompaniesStore } from '../stores/companies.store';
import { PositionsStore } from '../stores/positions.store';
import { DepartmentsStore } from '../stores/departments.store';
import { SchedulesStore } from '../stores/schedules.store';
import { BanksStore } from '../stores/banks.store';
import { PayrollsStore } from '../stores/payrolls.store';
import { toSignal } from '@angular/core/rxjs-interop';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'pt-employee-portal-layout',
  standalone: true,
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
    ConfirmDialogModule,
    MenuModule,
    AvatarModule,
    AsyncPipe,
    Button,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    @let user = auth.user$ | async;
    <div class="h-screen flex flex-col">
      <nav
        class="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b border-neutral-700/50 w-full min-w-0 shadow-lg"
        style="position: relative; z-index: 1000;"
      >
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-16 items-center justify-between">
            <div class="flex items-center">
              <a routerLink="/employee-portal" class="shrink-0 flex items-center gap-2 group">
                <img src="images/blackdog.png" class="h-9 transition-transform duration-300 group-hover:scale-105" alt="Peopletrak" />
              </a>
              <div class="hidden md:block">
                <div class="ml-10 flex items-center space-x-1">
                  <a
                    (click)="navigateToSection('dashboard')"
                    [class.selected]="isActiveSection('dashboard')"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md cursor-pointer min-h-[48px] leading-tight"
                  >
                    <i class="pi pi-home text-base"></i>
                    <span class="whitespace-nowrap">Dashboard</span>
                  </a>
                  <a
                    routerLink="/employee-portal"
                    [fragment]="'profile'"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md min-h-[48px] leading-tight"
                  >
                    <i class="pi pi-user text-base"></i>
                    <span class="whitespace-nowrap">Mi Perfil</span>
                  </a>
                  <a
                    routerLink="/employee-portal"
                    [fragment]="'timelogs'"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md min-h-[48px] leading-tight"
                  >
                    <i class="pi pi-calendar-clock text-base"></i>
                    <span class="hidden lg:inline whitespace-nowrap">Mis Marcaciones</span>
                    <span class="lg:hidden whitespace-nowrap">Marcaciones</span>
                  </a>
                  <a
                    routerLink="/employee-portal"
                    [fragment]="'lates'"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md min-h-[48px] leading-tight"
                  >
                    <i class="pi pi-clock text-base"></i>
                    <span class="hidden lg:inline whitespace-nowrap">Mis Tardanzas</span>
                    <span class="lg:hidden whitespace-nowrap">Tardanzas</span>
                  </a>
                  <a
                    routerLink="/employee-portal"
                    [fragment]="'disabilities'"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md min-h-[48px] leading-tight"
                  >
                    <i class="pi pi-file-medical text-base"></i>
                    <span class="hidden lg:inline whitespace-nowrap">Incapacidades</span>
                    <span class="lg:hidden whitespace-nowrap">Incap.</span>
                  </a>
                  <a
                    routerLink="/employee-portal"
                    [fragment]="'documents'"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md min-h-[48px] leading-tight"
                  >
                    <i class="pi pi-file-edit text-base"></i>
                    <span class="hidden lg:inline whitespace-nowrap">Solicitar Documentos</span>
                    <span class="lg:hidden whitespace-nowrap">Documentos</span>
                  </a>
                  <a
                    routerLink="/employee-portal"
                    [fragment]="'complaints'"
                    routerLinkActive="selected"
                    class="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md min-h-[48px] leading-tight"
                  >
                    <i class="pi pi-comments text-base"></i>
                    <span class="hidden lg:inline whitespace-nowrap">Buzón de Quejas</span>
                    <span class="lg:hidden whitespace-nowrap">Quejas</span>
                  </a>
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
            <a
              (click)="navigateToSection('dashboard')"
              [class.selected]="isActiveSection('dashboard')"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer"
            >
              <i class="pi pi-home text-lg"></i>
              <span>Dashboard</span>
            </a>
            <a
              (click)="navigateToSection('profile')"
              [class.selected]="isActiveSection('profile')"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer"
            >
              <i class="pi pi-user text-lg"></i>
              <span>Mi Perfil</span>
            </a>
            <a
              (click)="navigateToSection('timelogs')"
              [class.selected]="isActiveSection('timelogs')"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer"
            >
              <i class="pi pi-calendar-clock text-lg"></i>
              <span>Mis Marcaciones</span>
            </a>
            <a
              (click)="navigateToSection('lates')"
              [class.selected]="isActiveSection('lates')"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer"
            >
              <i class="pi pi-clock text-lg"></i>
              <span>Mis Tardanzas</span>
            </a>
            <a
              (click)="navigateToSection('disabilities')"
              [class.selected]="isActiveSection('disabilities')"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer"
            >
              <i class="pi pi-file-medical text-lg"></i>
              <span>Incapacidades</span>
            </a>
            <a
              (click)="navigateToSection('documents')"
              [class.selected]="isActiveSection('documents')"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer"
            >
              <i class="pi pi-file-edit text-lg"></i>
              <span>Solicitar Documentos</span>
            </a>
            <a
              (click)="navigateToSection('complaints')"
              [class.selected]="isActiveSection('complaints')"
              class="rounded-lg px-4 py-3 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white flex gap-3 items-center transition-all duration-200 cursor-pointer"
            >
              <i class="pi pi-comments text-lg"></i>
              <span>Buzón de Quejas</span>
            </a>
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
  styles: [`
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
  `],
})
export class EmployeePortalLayoutComponent implements OnInit, OnDestroy {
  public auth = inject(AuthService);
  public router = inject(Router);
  public store = inject(DashboardStore);
  
  public isCollapsed = signal(true);
  public currentFragment = signal<string | null>(null);
  private routerSubscription?: Subscription;

  public items: MenuItem[] = [
    {
      label: 'Cerrar sesion',
      icon: 'pi pi-sign-out',
      command: () => this.auth.logout(),
    },
  ];

  ngOnInit() {
    // Inicializar con el fragmento actual
    this.updateFragment();
    
    // Suscribirse a cambios de navegación
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateFragment();
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private updateFragment() {
    const url = this.router.url;
    const fragment = url.includes('#') ? url.split('#')[1] : null;
    this.currentFragment.set(fragment);
  }

  navigateToSection(section: string) {
    this.router.navigate(['/employee-portal'], { fragment: section });
    this.currentFragment.set(section);
    // Cerrar menú móvil si está abierto
    if (!this.isCollapsed()) {
      this.isCollapsed.set(true);
    }
  }

  isActiveSection(section: string): boolean {
    const fragment = this.currentFragment();
    if (section === 'dashboard') {
      return !fragment || fragment === 'dashboard';
    }
    return fragment === section;
  }

  toggleMenu() {
    this.isCollapsed.update((value) => !value);
  }
}

