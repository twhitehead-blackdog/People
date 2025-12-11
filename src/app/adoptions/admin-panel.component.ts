import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { TabViewModule } from 'primeng/tabview';
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

@Component({
  selector: 'pt-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    ToastModule,
    TabViewModule,
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
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="admin-panel-container">
      <div class="admin-header">
        <h1 class="admin-title">Panel de Administración</h1>
      </div>

      <p-tabView
        [(activeIndex)]="activeTabIndex"
        (onChange)="onTabChange($event)"
      >
        <p-tabPanel header="Dashboard" leftIcon="pi pi-chart-bar">
          <ng-template pTemplate="content">
            <pt-admin-dashboard />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel header="Mascotas" leftIcon="pi pi-paw">
          <ng-template pTemplate="content">
            <pt-admin-pets />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel
          [header]="applicationsTabHeader()"
          leftIcon="pi pi-file-edit"
        >
          <ng-template pTemplate="content">
            <pt-admin-applications />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel header="Fundaciones" leftIcon="pi pi-building">
          <ng-template pTemplate="content">
            <pt-admin-foundations />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel header="Requisitos" leftIcon="pi pi-list-check">
          <ng-template pTemplate="content">
            <pt-admin-requirements />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel header="FAQ" leftIcon="pi pi-question-circle">
          <ng-template pTemplate="content">
            <pt-admin-faq />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel header="Eventos" leftIcon="pi pi-calendar">
          <ng-template pTemplate="content">
            <pt-admin-events />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel header="Familias" leftIcon="pi pi-users">
          <ng-template pTemplate="content">
            <pt-admin-families />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel header="Aliados" leftIcon="pi pi-handshake">
          <ng-template pTemplate="content">
            <pt-admin-partners />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel header="Intereses" leftIcon="pi pi-heart">
          <ng-template pTemplate="content">
            <pt-admin-interests />
          </ng-template>
        </p-tabPanel>
        @if (canViewAuditLogs()) {
          <p-tabPanel header="Auditoría" leftIcon="pi pi-history">
            <ng-template pTemplate="content">
              <pt-admin-audit-logs />
            </ng-template>
          </p-tabPanel>
        }
        <p-tabPanel header="Usuarios" leftIcon="pi pi-user">
          <ng-template pTemplate="content">
            <pt-admin-users />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel header="Configuración" leftIcon="pi pi-cog">
          <ng-template pTemplate="content">
            <pt-admin-settings />
          </ng-template>
        </p-tabPanel>
        <p-tabPanel header="Personalidades" leftIcon="pi pi-heart-fill">
          <ng-template pTemplate="content">
            <pt-admin-personalities />
          </ng-template>
        </p-tabPanel>
      </p-tabView>
    </div>
  `,
  styles: [
    `
      .admin-panel-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
        background: #ffffff;
        min-height: calc(100vh - 200px);
        position: relative;
        overflow-x: hidden;
      }

      .admin-header {
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
        position: relative;
        z-index: 1;
      }

      .admin-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      /* Asegurar que el contenido de las pestañas no se sobreponga */
      ::ng-deep .p-tabview {
        position: relative;
        z-index: 0;
      }

      ::ng-deep .p-tabview-panels {
        padding: 1.5rem 0;
        min-height: 400px;
      }

      ::ng-deep .p-tabview-nav {
        position: relative;
        z-index: 2;
      }

      /* Asegurar que los diálogos tengan z-index alto */
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

        .admin-title {
          font-size: 1.75rem;
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

  public applicationsTabHeader = computed(() => {
    const pendingCount = this.applicationsStore
      .entities()
      .filter((app) => app.status === 'pending').length;
    if (pendingCount > 0) {
      return `Solicitudes (${pendingCount})`;
    }
    return 'Solicitudes';
  });

  public canViewAuditLogs = computed(() => {
    const email = this.currentUserEmail();
    return email?.toLowerCase() === 'soporte2@blackdogpanama';
  });

  ngOnInit(): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel.component.ts:225',message:'AdminPanelComponent ngOnInit - inicio',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    // Verificar autenticación y permisos de admin
    this.authService.isAuthenticated$.subscribe((isAuth) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel.component.ts:228',message:'AdminPanelComponent - autenticación verificada',data:{isAuth,isAdmin:this.authService.isAdmin()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      if (!isAuth) {
        this.messageService.add({
          severity: 'error',
          summary: 'Acceso denegado',
          detail: 'Debes iniciar sesión para acceder a esta sección',
        });
        this.router.navigate(['/auth/login']);
        return;
      }

      if (!this.authService.isAdmin()) {
        this.messageService.add({
          severity: 'error',
          summary: 'Acceso denegado',
          detail:
            'No tienes permisos de administrador para acceder a esta sección',
        });
        this.router.navigate(['/adoptions']);
      }

      // Obtener el email del usuario actual
      const currentUser = this.authService.currentUser();
      if (currentUser?.email) {
        this.currentUserEmail.set(currentUser.email);
      }
      
      // También suscribirse a cambios del usuario
      this.authService.user$.subscribe((user) => {
        if (user?.email) {
          this.currentUserEmail.set(user.email);
        }
      });
    });

    // Manejar parámetros de ruta para seleccionar tab inicial
    this.route.queryParams.subscribe((params) => {
      if (params['tab']) {
        // Ajustar el índice según si la pestaña de auditoría está visible
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
          audit: canViewAudit ? 10 : -1, // -1 si no puede ver auditoría
          users: canViewAudit ? 11 : 10,
          settings: canViewAudit ? 12 : 11,
          personalities: canViewAudit ? 13 : 12,
        };
        const tabIndex = tabMap[params['tab']];
        if (tabIndex !== undefined && tabIndex >= 0) {
          this.activeTabIndex = tabIndex;
          this.selectedTab.set(tabIndex);
        }
      }
    });
  }

  onTabChange(event: any): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-panel.component.ts:277',message:'AdminPanelComponent - cambio de pestaña',data:{tabIndex:event.index},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    this.activeTabIndex = event.index;
    this.selectedTab.set(event.index);
    // Opcional: actualizar la URL con el tab seleccionado
    // Ajustar según si la pestaña de auditoría está visible
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
      ...(canViewAudit ? ['audit'] : []), // Solo incluir 'audit' si puede verlo
      'users',
      'settings',
      'personalities',
    ];
    if (event.index < tabNames.length) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: tabNames[event.index] },
        queryParamsHandling: 'merge',
      });
    }
  }
}
