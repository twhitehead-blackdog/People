import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'pt-register',
  standalone: true,
  imports: [CommonModule, RouterLink, Button, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="register-container">
      <button
        type="button"
        class="back-button"
        (click)="goHome()"
        [disabled]="isLoading()"
      >
        <span class="back-icon">←</span>
        <span>Regresar</span>
      </button>
      <div class="register-card">
        <div class="register-header">
          <img
            src="assets/1.svg"
            alt="Black Dog Logo"
            class="register-logo"
            (click)="goHome()"
          />
          <h1 class="register-title">Crear Cuenta</h1>
          <p class="register-subtitle">Únete a nuestra comunidad</p>
        </div>

        <div class="register-form">
          <p-button
            type="button"
            label="Registrarse"
            [loading]="isLoading()"
            [disabled]="isLoading()"
            (onClick)="signUp()"
            styleClass="register-button"
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
            label="Registrarse con Google"
            icon="pi pi-google"
            (onClick)="signUp()"
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

          <div class="login-link">
            <p>
              ¿Ya tienes una cuenta?
              <a routerLink="/auth/login">Inicia sesión aquí</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .register-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%);
        padding: 2rem;
        position: relative;
      }

      .register-card {
        background: #ffffff;
        border-radius: 1rem;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        padding: 3rem;
        width: 100%;
        max-width: 500px;
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

      .register-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .register-logo {
        height: 80px;
        width: auto;
        margin: 0 auto 1rem auto;
        display: block;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .register-logo:hover {
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

      .register-title {
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.5rem 0;
      }

      .register-subtitle {
        font-size: 1rem;
        color: #6b7280;
        margin: 0;
      }

      .register-form {
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

      ::ng-deep .form-group .p-password {
        width: 100%;
      }

      ::ng-deep .form-group .p-password input {
        width: 100% !important;
      }

      .terms-checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        color: #374151;
        font-size: 0.875rem;
      }

      .terms-checkbox input[type='checkbox'] {
        cursor: pointer;
      }

      .terms-checkbox a {
        color: #fbbf24;
        text-decoration: none;
        font-weight: 600;
      }

      .terms-checkbox a:hover {
        text-decoration: underline;
        color: #000000;
      }

      .login-link {
        text-align: center;
        margin-top: 1.5rem;
        color: #6b7280;
        font-size: 0.875rem;
      }

      .login-link a {
        color: #fbbf24;
        text-decoration: none;
        font-weight: 600;
      }

      .login-link a:hover {
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

      ::ng-deep .register-button button {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3) !important;
      }

      ::ng-deep .register-button button::before {
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

      ::ng-deep .register-button button:hover:not(:disabled) {
        background: #000000 !important;
        color: #fbbf24 !important;
        transform: translateY(-3px) scale(1.05) !important;
        box-shadow: 0 8px 25px rgba(251, 191, 36, 0.6),
          0 0 25px rgba(251, 191, 36, 0.4) !important;
      }

      ::ng-deep .register-button button:hover:not(:disabled)::before {
        left: 100% !important;
      }

      ::ng-deep .register-button button:active:not(:disabled) {
        transform: translateY(-1px) scale(1.02) !important;
      }

      @media (max-width: 768px) {
        .register-container {
          padding: 1rem;
        }

        .register-card {
          padding: 2rem 1.5rem;
        }

        .register-title {
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
export class RegisterComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  isLoading = signal(false);
  isAuthenticated$ = this.auth.isAuthenticated$;

  ngOnInit(): void {
    // Si ya está autenticado, redirigir
    this.auth.isAuthenticated$.subscribe((isAuth) => {
      if (isAuth) {
        this.router.navigate(['/adoptions']);
      }
    });
  }

  signUp(): void {
    this.isLoading.set(true);
    // Marcar que estamos iniciando sesión para detectar el callback
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth0_login_initiated', 'true');
    }
    this.auth.loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
      },
    });
  }

  goHome(): void {
    this.router.navigate(['/adoptions']);
  }
}
