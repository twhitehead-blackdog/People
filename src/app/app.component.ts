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
    // Log inicial para debugging
    if (typeof window !== 'undefined') {
      console.log('🔍 [AppComponent] Inicializando, URL actual:', window.location.href);
      console.log('🔍 [AppComponent] Query params:', window.location.search);
      console.log('🔍 [AppComponent] Hash:', window.location.hash);
      console.log('🔍 [AppComponent] auth0_login_initiated:', sessionStorage.getItem('auth0_login_initiated'));
    }
    
    // Escuchar cambios de ruta para detectar cuando Auth0 redirige después del login
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd || event instanceof NavigationCancel),
      debounceTime(100) // Evitar múltiples ejecuciones rápidas
    ).subscribe((event) => {
      // Solo procesar NavigationEnd, ignorar NavigationCancel
      if (!(event instanceof NavigationEnd)) {
        return;
      }

      console.log('🔍 [AppComponent] NavigationEnd detectado:', event.url);

      // Verificar si acabamos de volver del callback de Auth0
      const loginInitiated = typeof window !== 'undefined' 
        ? sessionStorage.getItem('auth0_login_initiated') === 'true'
        : false;

      console.log('🔍 [AppComponent] loginInitiated:', loginInitiated, 'URL:', event.url);

      if (loginInitiated && (event.url === '/' || event.url === '/adoptions')) {
        console.log('🔍 [AppComponent] Callback de Auth0 detectado, iniciando redirección...');
        // Limpiar el flag inmediatamente para evitar múltiples ejecuciones
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth0_login_initiated');
        }
        
        // Cancelar cualquier timeout anterior
        if (this.redirectTimeout) {
          clearTimeout(this.redirectTimeout);
        }
        
        // Esperar un momento para que Auth0 complete la autenticación
        this.redirectTimeout = setTimeout(() => {
          this.checkAndRedirectAfterLogin();
        }, 1500);
      }
    });
  }

  private checkAndRedirectAfterLogin(): void {
    console.log('🔍 [AppComponent] checkAndRedirectAfterLogin llamado');
    
    if (this.hasHandledPostLoginRedirect) {
      console.log('🔍 [AppComponent] Ya se manejó la redirección, ignorando...');
      return;
    }

    // Verificar si el usuario se acaba de autenticar
    console.log('🔍 [AppComponent] Esperando que el usuario esté autenticado...');
    this.authWrapper.isAuthenticated$.pipe(
      filter(isAuth => isAuth),
      take(1)
    ).subscribe(() => {
      console.log('✅ [AppComponent] Usuario autenticado detectado');
      // Esperar un poco más para que el usuario se sincronice en AuthWrapperService
      setTimeout(() => {
        if (this.hasHandledPostLoginRedirect) {
          return;
        }

        const currentUrl = this.router.url;
        console.log('🔍 [AppComponent] URL actual:', currentUrl);
        console.log('🔍 [AppComponent] ¿Es admin?:', this.authWrapper.isAdmin());
        
        // Solo redirigir si estamos en la página principal
        if (currentUrl === '/' || currentUrl === '/adoptions') {
          if (this.authWrapper.isAdmin()) {
            console.log('🔍 [AppComponent] Redirigiendo a /adoptions/admin');
            this.hasHandledPostLoginRedirect = true;
            // Usar navigateByUrl y capturar errores para evitar "Transition was skipped"
            this.router.navigateByUrl('/adoptions/admin').catch((error) => {
              // Ignorar errores de navegación si ya hay una en progreso
              // Esto es normal cuando hay múltiples navegaciones simultáneas
              if (error.name !== 'NavigationCancelingError' && error.name !== 'AbortError') {
                console.warn('Error de navegación después del login:', error);
              }
            });
          } else {
            console.log('🔍 [AppComponent] Usuario no es admin, permaneciendo en:', currentUrl);
          }
          // Si no es admin, dejarlo en la página principal (no redirigir)
        }
      }, 500);
    });
  }
}
