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
  selector: 'pt-register',
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
    <div class="register-container">
      <div class="register-card">
        <div class="register-header">
          <img src="assets/1.svg" alt="Black Dog Logo" class="register-logo" />
          <h1 class="register-title">Crear Cuenta</h1>
          <p class="register-subtitle">Únete a nuestra comunidad</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="register-form">
          <div class="form-group">
            <label for="full_name">Nombre Completo</label>
            <input
              id="full_name"
              type="text"
              pInputText
              [(ngModel)]="fullName"
              name="full_name"
              placeholder="Juan Pérez"
              required
              [disabled]="isLoading()"
            />
          </div>

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
            />
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <p-password
              [(ngModel)]="password"
              name="password"
              [feedback]="true"
              [toggleMask]="true"
              placeholder="Mínimo 6 caracteres"
              [disabled]="isLoading()"
              [inputStyle]="{ width: '100%' }"
            />
          </div>

          <div class="form-group">
            <label for="confirm_password">Confirmar Contraseña</label>
            <p-password
              [(ngModel)]="confirmPassword"
              name="confirm_password"
              [feedback]="false"
              [toggleMask]="true"
              placeholder="Repite tu contraseña"
              [disabled]="isLoading()"
              [inputStyle]="{ width: '100%' }"
            />
          </div>

          <div class="form-group">
            <label class="terms-checkbox">
              <input
                type="checkbox"
                [(ngModel)]="acceptTerms"
                name="acceptTerms"
                required
                [disabled]="isLoading()"
              />
              <span>Acepto los <a href="#" target="_blank">términos y condiciones</a></span>
            </label>
          </div>

          <p-button
            type="submit"
            label="Registrarse"
            [loading]="isLoading()"
            [disabled]="!isFormValid() || isLoading()"
            styleClass="register-button"
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

          <div class="login-link">
            <p>¿Ya tienes una cuenta? <a routerLink="/auth/login">Inicia sesión aquí</a></p>
          </div>
        </form>
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
        margin-bottom: 1rem;
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

      .terms-checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        color: #374151;
        font-size: 0.875rem;
      }

      .terms-checkbox input[type="checkbox"] {
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

      ::ng-deep .register-button button {
        transition: all 0.3s ease !important;
      }

      ::ng-deep .register-button button:hover:not(:disabled) {
        background: #000000 !important;
        color: #fbbf24 !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
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
      }
    `,
  ],
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  fullName = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  acceptTerms = false;
  isLoading = signal(false);

  isFormValid(): boolean {
    return (
      !!this.fullName() &&
      !!this.email() &&
      !!this.password() &&
      this.password().length >= 6 &&
      this.password() === this.confirmPassword() &&
      this.acceptTerms
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor completa todos los campos correctamente',
      });
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Contraseñas no coinciden',
        detail: 'Las contraseñas deben ser iguales',
      });
      return;
    }

    this.isLoading.set(true);

    const result = await this.authService.register(
      this.email(),
      this.password(),
      this.fullName()
    );

    this.isLoading.set(false);

    if (result.success) {
      this.messageService.add({
        severity: 'success',
        summary: '¡Cuenta creada!',
        detail: 'Tu cuenta ha sido creada exitosamente',
      });
      
      setTimeout(() => {
        this.router.navigate(['/adoptions/profile']);
      }, 500);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al registrar',
        detail: result.error || 'No se pudo crear la cuenta',
      });
    }
  }
}

