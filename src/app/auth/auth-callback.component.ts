import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'pt-auth-callback',
  standalone: true,
  imports: [CommonModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="callback-container">
      <div class="callback-card">
        <div class="spinner-container">
          <div class="spinner"></div>
          <p class="loading-text">Procesando autenticación...</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .callback-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%);
        padding: 2rem;
      }

      .callback-card {
        background: #ffffff;
        border-radius: 1rem;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        padding: 3rem;
        width: 100%;
        max-width: 400px;
        text-align: center;
      }

      .spinner-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
      }

      .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f4f6;
        border-top: 4px solid #fbbf24;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .loading-text {
        color: #6b7280;
        font-size: 1rem;
        margin: 0;
      }
    `,
  ],
})
export class AuthCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  async ngOnInit(): Promise<void> {
    try {
      const result = await this.authService.handleOAuthCallback();

      if (result.success) {
        this.messageService.add({
          severity: 'success',
          summary: '¡Bienvenido!',
          detail: 'Has iniciado sesión correctamente con Google',
        });

        setTimeout(() => {
          this.router.navigate(['/adoptions/profile']);
        }, 500);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al iniciar sesión',
          detail: result.error || 'No se pudo completar la autenticación',
        });

        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error en callback:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Ocurrió un error al procesar la autenticación',
      });

      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);
    }
  }
}

