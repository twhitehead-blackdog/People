import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { AuthWrapperService } from './auth-wrapper.service';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'pt-login',
  standalone: true,
  changeDetection: import('@angular/core').ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, Button, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="login-container">
      <button
        type="button"
        class="back-button"
        (click)="goHome()"
        [disabled]="isLoading()"
      >
        <span class="back-icon">â†</span>
        <span>Regresar</span>
      </button>
      <div class="login-card">
        <div class="login-header">
          <img
            src="assets/1.svg"
            alt="Black Dog Logo"
            class="login-logo"
            (click)="goHome()"
          />
          <h1 class="login-title">Iniciar SesiÃ³n</h1>
          <p class="login-subtitle">Bienvenido de vuelta</p>
        </div>

        <div class="login-form">
          <p-button
            type="button"
            label="Iniciar SesiÃ³n"
            [loading]="isLoading()"
            [disabled]="isLoading()"
            (onClick)="signIn()"
            styleClass="login-button"
            [style]="{
              width: '100%',
              background: '#fbbf24',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold',
              padding: '0.75rem',
              marginTop: '0.5rem'
            }"
          />

          <div class="divider">
            <span>o</span>
          </div>

          <p-button
            type="button"
            label="Continuar con Google"
            icon="pi pi-google"
            (onClick)="signIn()"
            [loading]="isLoading()"
            [disabled]="isLoading()"
            styleClass="google-button"
            [style]="{
              width: '100%',
              background: '#ffffff',
              border: '2px solid #e5e7eb',
              color: '#000000',
              fontWeight: '600',
              padding: '0.75rem',
              marginTop: '0.5rem'
            }"
          />

          <div class="register-link">
            <p>
              Â¿No tienes una cuenta?
              <a routerLink="/auth/register">RegÃ­strate aquÃ­</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .login-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%);
        padding: 2rem;
        position: relative;
      }

      .login-card {
        background: #ffffff;
        border-radius: 1rem;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        padding: 3rem;
        width: 100%;
        max-width: 450px;
        animation: slideUp 0.5s ease-out;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .login-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .login-logo {
        height: 80px;
        width: auto;
        margin: 0 auto 1rem auto;
        display: block;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .login-logo:hover {
        transform: scale(1.1);
        filter: drop-shadow(0 4px 12px rgba(251, 191, 36, 0.4));
      }

      .back-button {
        position: fixed;
        top: 2rem;
        left: 2rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #f9fafb;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 0.5rem 1rem;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.875rem;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .back-button:hover:not(:disabled) {
        background: #fbbf24;
        border-color: #fbbf24;
        color: #000000;
        transform: translateX(-4px);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
      }

      .back-button:active:not(:disabled) {
        transform: translateX(-2px);
      }

      .back-icon {
        font-size: 1.25rem;
        font-weight: 700;
        transition: transform 0.3s ease;
      }

      .back-button:hover:not(:disabled) .back-icon {
        transform: translateX(-2px);
      }

      .login-title {
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.5rem 0;
      }

      .login-subtitle {
        font-size: 1rem;
        color: #6b7280;
        margin: 0;
      }

      .login-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-group label {
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .form-input {
        width: 100%;
      }

      ::ng-deep .form-input .p-password {
        width: 100%;
      }

      ::ng-deep .form-input .p-password input {
        width: 100% !important;
      }

      .form-options {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
      }

      .remember-me {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        color: #374151;
      }

      .remember-me input[type='checkbox'] {
        cursor: pointer;
      }

      .forgot-password {
        color: #fbbf24;
        text-decoration: none;
        font-weight: 600;
        transition: color 0.2s;
      }

      .forgot-password:hover {
        color: #000000;
        text-decoration: underline;
      }

      .register-link {
        text-align: center;
        margin-top: 1.5rem;
        color: #6b7280;
        font-size: 0.875rem;
      }

      .register-link a {
        color: #fbbf24;
        text-decoration: none;
        font-weight: 600;
      }

      .register-link a:hover {
        text-decoration: underline;
        color: #000000;
      }

      .divider {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 0.75rem 0;
        color: #6b7280;
        font-size: 0.875rem;
      }

      .divider::before,
      .divider::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid #e5e7eb;
      }

      .divider span {
        padding: 0 1rem;
        background: #ffffff;
      }

      ::ng-deep .google-button button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
      }

      ::ng-deep .google-button button::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(0, 0, 0, 0.05),
          transparent
        ) !important;
        transition: left 0.5s !important;
      }

      ::ng-deep .google-button button:hover:not(:disabled) {
        background: #f9fafb !important;
        border-color: #d1d5db !important;
        transform: translateY(-3px) scale(1.05) !important;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15) !important;
      }

      ::ng-deep .google-button button:hover:not(:disabled)::before {
        left: 100% !important;
      }

      ::ng-deep .google-button button:active:not(:disabled) {
        transform: translateY(-1px) scale(1.02) !important;
      }

      ::ng-deep .login-button button {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3) !important;
      }

      ::ng-deep .login-button button::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.2),
          transparent
        ) !important;
        transition: left 0.5s !important;
      }

      ::ng-deep .login-button button:hover:not(:disabled) {
        background: #000000 !important;
        color: #fbbf24 !important;
        transform: translateY(-3px) scale(1.05) !important;
        box-shadow: 0 8px 25px rgba(251, 191, 36, 0.6),
          0 0 25px rgba(251, 191, 36, 0.4) !important;
      }

      ::ng-deep .login-button button:hover:not(:disabled)::before {
        left: 100% !important;
      }

      ::ng-deep .login-button button:active:not(:disabled) {
        transform: translateY(-1px) scale(1.02) !important;
      }

      @media (max-width: 768px) {
        .login-container {
          padding: 1rem;
        }

        .login-card {
          padding: 2rem 1.5rem;
        }

        .login-title {
          font-size: 1.5rem;
        }

        .back-button {
          top: 1rem;
          left: 1rem;
          padding: 0.4rem 0.75rem;
          font-size: 0.75rem;
        }

        .back-icon {
          font-size: 1rem;
        }
      }
    `,
  ],
})
export class LoginComponent implements OnInit {
  private auth0 = inject(AuthService);
  private authWrapper = inject(AuthWrapperService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  isLoading = signal(false);
  isAuthenticated$ = this.auth0.isAuthenticated$;

  ngOnInit(): void {
    // No redirigir automÃ¡ticamente si ya estÃ¡ autenticado
    // El usuario puede navegar libremente, solo necesita login para adoptar
    // La redirecciÃ³n despuÃ©s del login se maneja en el callback de Auth0
  }

  signIn(): void {
    this.isLoading.set(true);
    // Marcar que estamos iniciando sesiÃ³n para detectar el callback
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth0_login_initiated', 'true');
    }
    this.auth0.loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login',
      },
    });
  }

  goHome(): void {
    this.router.navigate(['/adoptions']);
  }
}

