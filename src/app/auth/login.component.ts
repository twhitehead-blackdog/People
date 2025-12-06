import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from './auth.service';

@Component({
  selector: 'pt-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    Button,
    InputText,
    Password,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <img src="assets/1.svg" alt="Black Dog Logo" class="login-logo" />
          <h1 class="login-title">Iniciar Sesión</h1>
          <p class="login-subtitle">Bienvenido de vuelta</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              pInputText
              [(ngModel)]="email"
              name="email"
              placeholder="tu@email.com"
              required
              [disabled]="isLoading()"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <p-password
              [(ngModel)]="password"
              name="password"
              [feedback]="false"
              [toggleMask]="true"
              placeholder="Ingresa tu contraseña"
              [disabled]="isLoading()"
              [inputStyle]="{ width: '100%' }"
              styleClass="form-input"
            />
          </div>

          <div class="form-options">
            <label class="remember-me">
              <input
                type="checkbox"
                [(ngModel)]="rememberMe"
                name="rememberMe"
                [disabled]="isLoading()"
              />
              <span>Recordarme</span>
            </label>
            <a href="#" class="forgot-password">¿Olvidaste tu contraseña?</a>
          </div>

          <p-button
            type="submit"
            label="Iniciar Sesión"
            [loading]="isLoading()"
            [disabled]="!email || !password || isLoading()"
            styleClass="login-button"
            [style]="{
              width: '100%',
              background: '#fbbf24',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold',
              padding: '0.75rem',
              marginTop: '1rem'
            }"
          />

          <div class="register-link">
            <p>¿No tienes una cuenta? <a routerLink="/auth/register">Regístrate aquí</a></p>
          </div>
        </form>
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
        margin-bottom: 1rem;
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

      .remember-me input[type="checkbox"] {
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

      ::ng-deep .login-button button {
        transition: all 0.3s ease !important;
      }

      ::ng-deep .login-button button:hover:not(:disabled) {
        background: #000000 !important;
        color: #fbbf24 !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
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
      }
    `,
  ],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  email = signal('');
  password = signal('');
  rememberMe = false;
  isLoading = signal(false);

  async onSubmit(): Promise<void> {
    if (!this.email() || !this.password()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos',
      });
      return;
    }

    this.isLoading.set(true);

    const result = await this.authService.login(this.email(), this.password());

    this.isLoading.set(false);

    if (result.success) {
      this.messageService.add({
        severity: 'success',
        summary: '¡Bienvenido!',
        detail: 'Has iniciado sesión correctamente',
      });
      
      // Redirigir al perfil o a la página principal
      setTimeout(() => {
        this.router.navigate(['/adoptions/profile']);
      }, 500);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al iniciar sesión',
        detail: result.error || 'Credenciales inválidas',
      });
    }
  }
}

