import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from '@auth0/auth0-angular';
import { filter, firstValueFrom, take } from 'rxjs';

import { NgxSpinnerComponent, NgxSpinnerService } from 'ngx-spinner';

@Component({
  imports: [RouterOutlet, NgxSpinnerComponent],
  providers: [MessageService],
  selector: 'pt-root',
  template: ` <router-outlet />
    <ngx-spinner type="ball-scale-multiple" bdColor="rgba(0, 0, 0, 1)">
      <p class="text-white">Cargando...</p></ngx-spinner
    >`,
  styles: ``,
})
export class AppComponent implements OnInit {
  private spinner = inject(NgxSpinnerService);
  private router = inject(Router);
  private auth = inject(AuthService);

  ngOnInit() {
    // Forzar modo oscuro siempre y prevenir flash de fondo blanco
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      document.documentElement.style.backgroundColor = '#000000';
      document.body.style.backgroundColor = '#000000';
    }
    
    // Check if we're handling a callback from Auth0
    const isCallback = window.location.search.includes('code=') || 
                       window.location.search.includes('state=') ||
                       window.location.hash.includes('code=') ||
                       window.location.hash.includes('state=');
    
    if (isCallback) {
      // Show spinner during callback processing
      this.spinner.show();
      
      // Wait for Auth0 to process callback, then clean up URL after navigation
      this.auth.isAuthenticated$.pipe(
        filter(isAuth => isAuth !== undefined),
        take(1)
      ).subscribe(() => {
        // Wait a bit for Auth0 to fully process
        setTimeout(() => {
          // Clean up URL after navigation completes
          this.router.events
            .pipe(
              filter(event => event instanceof NavigationEnd),
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
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.spinner.hide();
      });
  }
}
