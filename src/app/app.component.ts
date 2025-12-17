import { Component, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MessageService } from 'primeng/api';
import { filter, take } from 'rxjs';

import { NgxSpinnerComponent, NgxSpinnerService } from 'ngx-spinner';
import { OrganizationService } from './services/organization.service';
import { DiagnosticPanelComponent } from './components/diagnostic-panel.component';

@Component({
  imports: [RouterOutlet, NgxSpinnerComponent, DiagnosticPanelComponent],
  providers: [MessageService],
  selector: 'pt-root',
  template: ` <router-outlet />
    <ngx-spinner type="ball-scale-multiple" bdColor="rgba(0, 0, 0, 1)">
      <p class="text-white">Cargando...</p></ngx-spinner
    >
    <pt-diagnostic-panel />`,
  styles: ``,
})
export class AppComponent implements OnInit {
  private spinner = inject(NgxSpinnerService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private organizationService = inject(OrganizationService);

  ngOnInit() {
    // Forzar modo oscuro siempre y prevenir flash de fondo blanco
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      document.documentElement.style.backgroundColor = '#000000';
      document.body.style.backgroundColor = '#000000';
    }

    // Inicializar company_ids temprano si estamos en login o página principal
    const currentUrl = this.router.url;
    if (currentUrl === '/login' || currentUrl === '/') {
      console.log('🔄 Inicializando company_ids temprano en:', currentUrl);
      // Los company_ids se cargarán automáticamente en el constructor del servicio
      // pero podemos esperar a que estén listos para asegurar que estén disponibles
      this.organizationService
        .waitForCompanyIds()
        .then(() => {
          console.log('✅ Company IDs listos para usar en la aplicación');
        })
        .catch((error) => {
          console.error('❌ Error esperando company_ids:', error);
        });
    }

    // Check if we're handling a callback from Auth0
    const isCallback =
      window.location.search.includes('code=') ||
      window.location.search.includes('state=') ||
      window.location.hash.includes('code=') ||
      window.location.hash.includes('state=');

    if (isCallback) {
      // Show spinner during callback processing
      this.spinner.show();

      // Wait for Auth0 to process callback, then clean up URL after navigation
      this.auth.isAuthenticated$
        .pipe(
          filter((isAuth) => isAuth !== undefined),
          take(1)
        )
        .subscribe(() => {
          // Wait a bit for Auth0 to fully process
          setTimeout(() => {
            // Clean up URL after navigation completes
            this.router.events
              .pipe(
                filter((event) => event instanceof NavigationEnd),
                take(1)
              )
              .subscribe(() => {
                const cleanPath = window.location.pathname || '/';
                if (window.location.search || window.location.hash) {
                  window.history.replaceState({}, '', cleanPath);
                }
                this.spinner.hide();
              });
          }, 500);
        });
    }

    // Track navigation events to hide spinner when navigation completes
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.spinner.hide();
      });
  }
}
