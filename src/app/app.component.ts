import { Component, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd, NavigationCancel } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { NgxSpinnerComponent } from 'ngx-spinner';
import { MessageService } from 'primeng/api';
import { AuthWrapperService } from './auth/auth-wrapper.service';
import { filter, take, debounceTime } from 'rxjs/operators';

@Component({
  imports: [RouterOutlet, NgxSpinnerComponent],
  providers: [MessageService],
  selector: 'pt-root',
  template: ` <router-outlet />
    <ngx-spinner type="ball-scale-multiple" bdColor="rgba(0, 0, 0, 0.5)">
      <p class="text-white">Cargando...</p></ngx-spinner
    >`,
  styles: ``,
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private authWrapper = inject(AuthWrapperService);
  private hasHandledPostLoginRedirect = false;
  private redirectTimeout: any = null;

  ngOnInit(): void {
    // Escuchar cambios de ruta para detectar cuando Auth0 redirige despuÃ©s del login
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd || event instanceof NavigationCancel),
      debounceTime(100) // Evitar mÃºltiples ejecuciones rÃ¡pidas
    ).subscribe((event) => {
      // Solo procesar NavigationEnd, ignorar NavigationCancel
      if (!(event instanceof NavigationEnd)) {
        return;
      }

      // Verificar si acabamos de volver del callback de Auth0
      const loginInitiated = typeof window !== 'undefined' 
        ? sessionStorage.getItem('auth0_login_initiated') === 'true'
        : false;

      if (loginInitiated && (event.url === '/' || event.url === '/adoptions')) {
        // Limpiar el flag inmediatamente para evitar mÃºltiples ejecuciones
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth0_login_initiated');
        }
        
        // Cancelar cualquier timeout anterior
        if (this.redirectTimeout) {
          clearTimeout(this.redirectTimeout);
        }
        
        // Esperar un momento para que Auth0 complete la autenticaciÃ³n
        this.redirectTimeout = setTimeout(() => {
          this.checkAndRedirectAfterLogin();
        }, 1500);
      }
    });
  }

  private checkAndRedirectAfterLogin(): void {
    if (this.hasHandledPostLoginRedirect) {
      return;
    }

    // Verificar si el usuario se acaba de autenticar
    this.authWrapper.isAuthenticated$.pipe(
      filter(isAuth => isAuth),
      take(1)
    ).subscribe(() => {
      // Esperar un poco mÃ¡s para que el usuario se sincronice en AuthWrapperService
      setTimeout(() => {
        if (this.hasHandledPostLoginRedirect) {
          return;
        }

        const currentUrl = this.router.url;
        
        // Solo redirigir si estamos en la pÃ¡gina principal
        if (currentUrl === '/' || currentUrl === '/adoptions') {
          if (this.authWrapper.isAdmin()) {
            this.hasHandledPostLoginRedirect = true;
            // Usar navigateByUrl y capturar errores para evitar "Transition was skipped"
            this.router.navigateByUrl('/adoptions/admin').catch((error) => {
              // Ignorar errores de navegaciÃ³n si ya hay una en progreso
              // Esto es normal cuando hay mÃºltiples navegaciones simultÃ¡neas
              if (error.name !== 'NavigationCancelingError' && error.name !== 'AbortError') {
                // Error silencioso
              }
            });
          }
          // Si no es admin, dejarlo en la pÃ¡gina principal (no redirigir)
        }
      }, 500);
    });
  }
}


