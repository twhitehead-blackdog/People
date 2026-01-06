import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ToastModule } from 'primeng/toast';
import { AuthWrapperService } from '../auth/auth-wrapper.service';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { AdminApplicationsComponent } from './admin-applications.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminEventsComponent } from './admin-events.component';
import { AdminFamiliesComponent } from './admin-families.component';
import { AdminFAQComponent } from './admin-faq.component';
import { AdminFoundationsComponent } from './admin-foundations.component';
import { AdminAuditLogsComponent } from './admin-audit-logs.component';
import { AdminInterestsComponent } from './admin-interests.component';
import { AdminPartnersComponent } from './admin-partners.component';
import { AdminPetsComponent } from './admin-pets.component';
import { AdminRequirementsComponent } from './admin-requirements.component';
import { AdminUsersComponent } from './admin-users.component';
import { AdminSettingsComponent } from './admin-settings.component';
import { AdminPersonalitiesComponent } from './admin-personalities.component';
import { AdminPetMatchesComponent } from './admin-pet-matches.component';

@Component({
  selector: 'pt-admin-panel',
  standalone: true,
  changeDetection: import('@angular/core').ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ToastModule,
    BadgeModule,
    AdminPetsComponent,
    AdminApplicationsComponent,
    AdminFoundationsComponent,
    AdminDashboardComponent,
    AdminRequirementsComponent,
    AdminFAQComponent,
    AdminEventsComponent,
    AdminFamiliesComponent,
    AdminPartnersComponent,
    AdminInterestsComponent,
    AdminAuditLogsComponent,
    AdminUsersComponent,
    AdminSettingsComponent,
    AdminPersonalitiesComponent,
    AdminPetMatchesComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="admin-panel-container">
      <!-- Dashboard Header -->
      <div class="dashboard-header">
        <div class="header-left">
          <h1 class="dashboard-title">Panel de AdministraciÃ³n</h1>
          <p class="dashboard-subtitle">Gestiona el contenido y configuraciÃ³n del sistema</p>
        </div>
      </div>

      <!-- Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Sidebar Navigation -->
        <div class="dashboard-sidebar">
          <nav class="accordion-menu">
          <div class="menu-category" [class.active]="selectedCategory() === 'servicios'">
            <button 
              class="category-header"
              (click)="toggleCategory('servicios')"
            >
              <span class="category-icon">ðŸ› ï¸</span>
              <span class="category-title">Servicios</span>
              <span class="category-arrow" [class.open]="selectedCategory() === 'servicios'">â–¼</span>
            </button>
            <div class="category-content" [class.open]="selectedCategory() === 'servicios'">
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 14"
                (click)="selectTab(14)"
              >
                <span class="item-icon">ðŸ’•</span>
                <span class="item-label">Busco Pareja</span>
              </button>
            </div>
          </div>

          <div class="menu-category" [class.active]="selectedCategory() === 'dashboard'">
            <button 
              class="category-header"
              (click)="selectTab(0)"
            >
              <span class="category-icon">ðŸ“Š</span>
              <span class="category-title">Dashboard</span>
            </button>
          </div>

          <div class="menu-category" [class.active]="selectedCategory() === 'gestion'">
            <button 
              class="category-header"
              (click)="toggleCategory('gestion')"
            >
              <span class="category-icon">ðŸ“‹</span>
              <span class="category-title">GestiÃ³n de Contenido</span>
              <span class="category-arrow" [class.open]="selectedCategory() === 'gestion'">â–¼</span>
            </button>
            <div class="category-content" [class.open]="selectedCategory() === 'gestion'">
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 1"
                (click)="selectTab(1)"
              >
                <span class="item-icon">ðŸ¾</span>
                <span class="item-label">Mascotas</span>
              </button>
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 2"
                (click)="selectTab(2)"
              >
                <span class="item-icon">ðŸ“</span>
                <span class="item-label">{{ applicationsTabHeader() }}</span>
                @if (pendingApplicationsCount() > 0) {
                  <span class="item-badge">{{ pendingApplicationsCount() }}</span>
                }
              </button>
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 3"
                (click)="selectTab(3)"
              >
                <span class="item-icon">ðŸ¢</span>
                <span class="item-label">Fundaciones</span>
              </button>
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 7"
                (click)="selectTab(7)"
              >
                <span class="item-icon">ðŸ‘¥</span>
                <span class="item-label">Familias</span>
              </button>
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 8"
                (click)="selectTab(8)"
              >
                <span class="item-icon">ðŸ¤</span>
                <span class="item-label">Aliados</span>
              </button>
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 9"
                (click)="selectTab(9)"
              >
                <span class="item-icon">â¤ï¸</span>
                <span class="item-label">Intereses</span>
              </button>
            </div>
          </div>

          <div class="menu-category" [class.active]="selectedCategory() === 'contenido'">
            <button 
              class="category-header"
              (click)="toggleCategory('contenido')"
            >
              <span class="category-icon">ðŸ“„</span>
              <span class="category-title">Contenido</span>
              <span class="category-arrow" [class.open]="selectedCategory() === 'contenido'">â–¼</span>
            </button>
            <div class="category-content" [class.open]="selectedCategory() === 'contenido'">
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 4"
                (click)="selectTab(4)"
              >
                <span class="item-icon">âœ…</span>
                <span class="item-label">Requisitos</span>
              </button>
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 5"
                (click)="selectTab(5)"
              >
                <span class="item-icon">â“</span>
                <span class="item-label">FAQ</span>
              </button>
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 6"
                (click)="selectTab(6)"
              >
                <span class="item-icon">ðŸ“…</span>
                <span class="item-label">Eventos</span>
              </button>
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 13"
                (click)="selectTab(13)"
              >
                <span class="item-icon">ðŸ’</span>
                <span class="item-label">Personalidades</span>
              </button>
            </div>
          </div>

          <div class="menu-category" [class.active]="selectedCategory() === 'admin'">
            <button 
              class="category-header"
              (click)="toggleCategory('admin')"
            >
              <span class="category-icon">âš™ï¸</span>
              <span class="category-title">AdministraciÃ³n</span>
              <span class="category-arrow" [class.open]="selectedCategory() === 'admin'">â–¼</span>
            </button>
            <div class="category-content" [class.open]="selectedCategory() === 'admin'">
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 10"
                (click)="selectTab(10)"
              >
                <span class="item-icon">ðŸ‘¤</span>
                <span class="item-label">Usuarios</span>
              </button>
              @if (canViewAuditLogs()) {
                <button 
                  class="menu-item"
                  [class.active]="activeTabIndex === 11"
                  (click)="selectTab(11)"
                >
                  <span class="item-icon">ðŸ“œ</span>
                  <span class="item-label">AuditorÃ­a</span>
                </button>
              }
              <button 
                class="menu-item"
                [class.active]="activeTabIndex === 12"
                (click)="selectTab(12)"
              >
                <span class="item-icon">ðŸ”§</span>
                <span class="item-label">ConfiguraciÃ³n</span>
              </button>
            </div>
          </div>
        </nav>
        </div>

        <!-- Main Content Area -->
        <div class="dashboard-main">
          <div class="admin-content">
          @if (activeTabIndex === -1) {
            <div class="service-redirect">
              <h2>Redirigiendo a Busco Pareja...</h2>
              <p>SerÃ¡s redirigido en breve.</p>
            </div>
          } @else if (activeTabIndex === 0) {
            <pt-admin-dashboard />
          } @else if (activeTabIndex === 1) {
            <pt-admin-pets />
          } @else if (activeTabIndex === 2) {
            <pt-admin-applications />
          } @else if (activeTabIndex === 3) {
            <pt-admin-foundations />
          } @else if (activeTabIndex === 4) {
            <pt-admin-requirements />
          } @else if (activeTabIndex === 5) {
            <pt-admin-faq />
          } @else if (activeTabIndex === 6) {
            <pt-admin-events />
          } @else if (activeTabIndex === 7) {
            <pt-admin-families />
          } @else if (activeTabIndex === 8) {
            <pt-admin-partners />
          } @else if (activeTabIndex === 9) {
            <pt-admin-interests />
          } @else if (activeTabIndex === 10) {
            @if (canViewAuditLogs()) {
              <pt-admin-audit-logs />
            } @else {
              <pt-admin-users />
            }
          } @else if (activeTabIndex === 11) {
            @if (canViewAuditLogs()) {
              <pt-admin-users />
            } @else {
              <pt-admin-settings />
            }
          } @else if (activeTabIndex === 12) {
            @if (canViewAuditLogs()) {
              <pt-admin-settings />
            } @else {
              <pt-admin-personalities />
            }
          } @else if (activeTabIndex === 13) {
            @if (canViewAuditLogs()) {
              <pt-admin-personalities />
            }
          } @else if (activeTabIndex === 14) {
            <pt-admin-pet-matches />
          }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-panel-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
        padding: 2rem;
      }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        padding: 2rem;
        background: linear-gradient(135deg, #000000 0%, #374151 100%);
        border-radius: 1rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        position: relative;
        overflow: hidden;
      }

      .dashboard-header::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%);
        border-radius: 50%;
        transform: translate(30%, -30%);
      }

      .header-left {
        position: relative;
        z-index: 1;
      }

      .dashboard-title {
        font-size: 3rem;
        font-weight: 700;
        color: #FBBF24;
        margin: 0 0 0.5rem 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      }

      .dashboard-subtitle {
        font-size: 1.125rem;
        color: #ffffff;
        margin: 0;
        opacity: 0.9;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 2rem;
        max-width: 1600px;
        margin: 0 auto;
      }

      /* Sidebar */
      .dashboard-sidebar {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .accordion-menu {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: #ffffff;
        padding: 1.5rem;
        border-radius: 1rem;
        border: 1px solid #000000;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        position: sticky;
        top: 2rem;
        height: fit-content;
      }

      .accordion-menu::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #FBBF24 0%, #374151 50%, #FBBF24 100%);
      }

      .menu-category {
        border-radius: 0.5rem;
        overflow: hidden;
        border: 1px solid #374151;
        background: #ffffff;
        transition: all 0.3s ease;
      }

      .menu-category:hover {
        border-color: #FBBF24;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
        transform: translateX(2px);
      }

      .menu-category.active {
        border-color: #FBBF24;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
        background: rgba(251, 191, 36, 0.05);
      }

      .category-header {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 0.9375rem;
        font-weight: 600;
        color: #000000;
        text-align: left;
        transition: all 0.2s ease;
      }

      .category-header:hover {
        background: rgba(251, 191, 36, 0.1);
        color: #000000;
      }

      .category-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .category-title {
        flex: 1;
      }

      .category-arrow {
        font-size: 0.75rem;
        transition: transform 0.3s ease;
        color: #6b7280;
      }

      .category-arrow.open {
        transform: rotate(180deg);
      }

      .category-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }

      .category-content.open {
        max-height: 1000px;
      }

      .menu-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem 0.75rem 2.5rem;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        text-align: left;
        transition: all 0.3s ease;
        border-top: 1px solid #f3f4f6;
        position: relative;
      }

      .menu-item:hover {
        background: rgba(251, 191, 36, 0.1);
        color: #000000;
        transform: translateX(4px);
      }

      .menu-item.active {
        background: rgba(251, 191, 36, 0.15);
        color: #000000;
        font-weight: 600;
        border-left: 3px solid #FBBF24;
      }

      .menu-item.active::before {
        display: none;
      }

      .item-icon {
        font-size: 1rem;
        flex-shrink: 0;
      }

      .item-label {
        flex: 1;
      }

      .item-badge {
        background: #ef4444;
        color: #ffffff;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 0.75rem;
        min-width: 20px;
        text-align: center;
      }

      /* Main Content */
      .dashboard-main {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .admin-content {
        background: #ffffff;
        border-radius: 1rem;
        border: 1px solid #374151;
        padding: 2rem;
        min-height: 600px;
        box-shadow: 0 4px 12px rgba(55, 65, 81, 0.1);
        position: relative;
        overflow: hidden;
      }

      .admin-content::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #FBBF24 0%, #374151 50%, #FBBF24 100%);
      }

      .service-redirect {
        text-align: center;
        padding: 4rem 2rem;
      }

      .service-redirect h2 {
        font-size: 1.5rem;
        color: #fbbf24;
        margin-bottom: 1rem;
      }

      @media (max-width: 1024px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .dashboard-sidebar {
          order: 2;
        }

        .dashboard-main {
          order: 1;
        }

        .accordion-menu {
          position: static;
        }
      }

      /* Asegurar que los diÃ¡logos tengan z-index alto */
      ::ng-deep .p-dialog {
        z-index: 1100 !important;
      }

      /* Asegurar que los toasts tengan z-index alto */
      ::ng-deep .p-toast {
        z-index: 1200 !important;
      }

      @media (max-width: 768px) {
        .admin-panel-container {
          padding: 1rem;
        }

        .dashboard-header {
          padding: 1.5rem 1rem;
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .dashboard-title {
          font-size: 2rem;
        }

        .dashboard-subtitle {
          font-size: 1rem;
        }

        ::ng-deep .p-tabview-panels {
          padding: 1rem 0;
        }
      }
    `,
  ],
})
export class AdminPanelComponent implements OnInit {
  private authService = inject(AuthWrapperService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  public applicationsStore = inject(AdoptionApplicationsStore);

  public selectedTab = signal(0);
  public activeTabIndex = 0;
  public currentUserEmail = signal<string | null>(null);
  public selectedCategory = signal<string | null>(null);

  public applicationsTabHeader = computed(() => {
    const pendingCount = this.applicationsStore
      .entities()
      .filter((app) => app.status === 'pending').length;
    if (pendingCount > 0) {
      return `Solicitudes (${pendingCount})`;
    }
    return 'Solicitudes';
  });

  public pendingApplicationsCount = computed(() => {
    return this.applicationsStore
      .entities()
      .filter((app) => app.status === 'pending').length;
  });

  public canViewAuditLogs = computed(() => {
    const email = this.currentUserEmail();
    return email?.toLowerCase() === 'soporte2@blackdogpanama';
  });

  ngOnInit(): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel.component.ts:225',message:'AdminPanelComponent ngOnInit - inicio',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    // Verificar autenticaciÃ³n y permisos de admin
    this.authService.isAuthenticated$.subscribe((isAuth) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel.component.ts:228',message:'AdminPanelComponent - autenticaciÃ³n verificada',data:{isAuth,isAdmin:this.authService.isAdmin()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      if (!isAuth) {
        this.messageService.add({
          severity: 'error',
          summary: 'Acceso denegado',
          detail: 'Debes iniciar sesiÃ³n para acceder a esta secciÃ³n',
        });
        this.router.navigate(['/auth/login']);
        return;
      }

      if (!this.authService.isAdmin()) {
        this.messageService.add({
          severity: 'error',
          summary: 'Acceso denegado',
          detail:
            'No tienes permisos de administrador para acceder a esta secciÃ³n',
        });
        this.router.navigate(['/adoptions']);
      }

      // Obtener el email del usuario actual
      const currentUser = this.authService.currentUser();
      if (currentUser?.email) {
        this.currentUserEmail.set(currentUser.email);
      }
      
      // TambiÃ©n suscribirse a cambios del usuario
      this.authService.user$.subscribe((user) => {
        if (user?.email) {
          this.currentUserEmail.set(user.email);
        }
      });
    });

    // Manejar parÃ¡metros de ruta para seleccionar tab inicial
    this.route.queryParams.subscribe((params) => {
      if (params['tab']) {
        // Ajustar el Ã­ndice segÃºn si la pestaÃ±a de auditorÃ­a estÃ¡ visible
        const canViewAudit = this.canViewAuditLogs();
        const tabMap: Record<string, number> = {
          dashboard: 0,
          pets: 1,
          applications: 2,
          foundations: 3,
          requirements: 4,
          faq: 5,
          events: 6,
          families: 7,
          partners: 8,
          interests: 9,
          audit: canViewAudit ? 10 : -1, // -1 si no puede ver auditorÃ­a
          users: canViewAudit ? 11 : 10,
          settings: canViewAudit ? 12 : 11,
          personalities: canViewAudit ? 13 : 12,
        };
        const tabIndex = tabMap[params['tab']];
        if (tabIndex !== undefined && tabIndex >= 0) {
          this.selectTab(tabIndex);
        }
      }
    });
  }

  public toggleCategory(category: string): void {
    if (this.selectedCategory() === category) {
      this.selectedCategory.set(null);
    } else {
      this.selectedCategory.set(category);
    }
  }

  public selectTab(index: number): void {
    this.activeTabIndex = index;
    this.selectedTab.set(index);
    
    // Determinar la categorÃ­a basada en el Ã­ndice
    let category: string | null = null;
    if (index === 0) category = 'dashboard';
    else if ([1, 2, 3, 7, 8, 9].includes(index)) category = 'gestion';
    else if ([4, 5, 6, 13].includes(index)) category = 'contenido';
    else if ([10, 11, 12].includes(index)) category = 'admin';
    
    if (category) {
      this.selectedCategory.set(category);
    }
    
    // Actualizar URL
    const canViewAudit = this.canViewAuditLogs();
    const tabNames = [
      'dashboard',
      'pets',
      'applications',
      'foundations',
      'requirements',
      'faq',
      'events',
      'families',
      'partners',
      'interests',
      ...(canViewAudit ? ['audit'] : []),
      'users',
      'settings',
      'personalities',
    ];
    if (index >= 0 && index < tabNames.length) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: tabNames[index] },
        queryParamsHandling: 'merge',
      });
    }
  }

  public navigateToService(service: string): void {
    if (service === 'busco-pareja') {
      this.router.navigate(['/adoptions/busco-pareja']);
    }
  }

  onTabChange(event: any): void {
    // MÃ©todo legacy, mantener por compatibilidad
    this.selectTab(event.index);
  }
}

