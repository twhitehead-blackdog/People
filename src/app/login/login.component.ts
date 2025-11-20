import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'pt-login',
  imports: [Card, Button, Toast],
  template: `
    <div
      class="w-full h-screen flex flex-col items-center justify-center p-4 relative animated-gradient-container"
      style="overflow: hidden;"
    >
      
      <p-toast />
      <div class="login-container flex flex-col items-center justify-center w-full h-full relative z-10">
        <div class="logo-wrapper mb-8 md:mb-12">
          <img src="images/blackdog.png" class="logo-image" alt="Black Dog Logo" />
        </div>
        
        <p-card class="login-card">
          <ng-template #title>
            <div class="card-title-wrapper">
              <div class="card-subtitle">Sistema de Gestión de Personal</div>
              <div class="card-title">Iniciar sesión</div>
            </div>
          </ng-template>
          <ng-template #subtitle>
            <div class="card-description">Ingresa con tu cuenta para continuar</div>
          </ng-template>

          <ng-template #footer>
            <div class="card-footer">
              <p-button 
                label="Entrar al dashboard" 
                (click)="signIn()" 
                icon="pi pi-sign-in"
                size="large"
                styleClass="login-button"
                [style]="{'background': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 'border': 'none'}"
              />
            </div>
          </ng-template>
        </p-card>
      </div>
    </div>
  `,
  styles: `
    .animated-gradient-container {
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 25%, #000000 50%, #0d0d0d 75%, #2a2a2a 100%);
      position: relative;
      overflow: hidden;
    }
    
    /* Login Container */
    .login-container {
      padding: 2rem 1rem;
      min-height: 100vh;
    }
    
    @media (min-width: 768px) {
      .login-container {
        padding: 3rem 2rem;
      }
    }
    
    /* Logo */
    .logo-wrapper {
      padding: 2rem 0;
      animation: logo-entrance 0.8s ease-out;
    }
    
    .logo-image {
      height: 5rem;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4)) 
              drop-shadow(0 4px 12px rgba(255, 255, 255, 0.1));
      transition: transform 0.3s ease;
    }
    
    @media (min-width: 768px) {
      .logo-image {
        height: 6rem;
      }
    }
    
    @media (min-width: 1024px) {
      .logo-image {
        height: 7rem;
      }
    }
    
    .logo-image:hover {
      transform: scale(1.02);
    }
    
    @keyframes logo-entrance {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    /* Login Card */
    .login-card {
      width: 100%;
      max-width: 420px;
      animation: card-entrance 0.6s ease-out 0.2s both;
      border-radius: 16px !important;
      border: 1px solid rgba(150, 150, 150, 0.2) !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      background: rgba(20, 20, 20, 0.75) !important;
      overflow: hidden;
    }
    
    .login-card ::ng-deep .p-card {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    
    .login-card ::ng-deep .p-card-body {
      padding: 2rem 1.5rem !important;
    }
    
    @media (min-width: 768px) {
      .login-card ::ng-deep .p-card-body {
        padding: 2.5rem 2rem !important;
      }
    }
    
    @keyframes card-entrance {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    /* Typography */
    .card-title-wrapper {
      text-align: center;
      padding: 0.5rem 0;
    }
    
    .card-subtitle {
      color: rgba(200, 200, 200, 0.7);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    @media (min-width: 768px) {
      .card-subtitle {
        font-size: 0.8125rem;
        margin-bottom: 1rem;
      }
    }
    
    .card-title {
      color: #f5f5f5;
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    @media (min-width: 768px) {
      .card-title {
        font-size: 2rem;
      }
    }
    
    .card-description {
      color: rgba(180, 180, 180, 0.8);
      font-size: 0.875rem;
      margin-top: 0.5rem;
      text-align: center;
      font-weight: 400;
      line-height: 1.5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    @media (min-width: 768px) {
      .card-description {
        font-size: 0.9375rem;
        margin-top: 0.75rem;
      }
    }
    
    /* Card Footer */
    .card-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 1.5rem;
    }
    
    @media (min-width: 640px) {
      .card-footer {
        flex-direction: row;
        justify-content: center;
      }
    }
    
    /* Login Button */
    .login-button {
      width: 100%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      border-radius: 10px !important;
      font-weight: 500 !important;
      letter-spacing: 0.02em !important;
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.25) !important;
    }
    
    @media (min-width: 640px) {
      .login-button {
        width: auto;
        min-width: 200px;
      }
    }
    
    .login-button ::ng-deep .p-button {
      padding: 0.875rem 2rem !important;
      font-size: 1rem !important;
    }
    
    .login-button ::ng-deep .p-button-icon {
      font-size: 1.125rem !important;
      margin-right: 0.5rem !important;
    }
    
    .login-button ::ng-deep .p-button:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 20px rgba(251, 191, 36, 0.4) !important;
      filter: brightness(1.05) !important;
    }
    
    .login-button ::ng-deep .p-button:active {
      transform: translateY(0) !important;
      box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3) !important;
    }
    
    .login-button ::ng-deep .p-button:focus {
      box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.2), 0 4px 12px rgba(251, 191, 36, 0.25) !important;
    }
    
    /* Responsive adjustments */
    @media (max-width: 640px) {
      .login-container {
        padding: 1.5rem 1rem;
      }
      
      .logo-wrapper {
        padding: 1.5rem 0;
        margin-bottom: 1.5rem;
      }
      
      .logo-image {
        height: 8rem;
      }
      
      .login-card {
        max-width: 100%;
      }
      
      .login-card ::ng-deep .p-card-body {
        padding: 1.5rem 1.25rem !important;
      }
      
      .card-title {
        font-size: 1.5rem;
      }
      
      .card-subtitle {
        font-size: 0.6875rem;
      }
      
      .card-description {
        font-size: 0.8125rem;
      }
    }
    
    /* Desactivar animaciones SOLO en dispositivos móviles táctiles pequeños (teléfonos) */
    /* Esta regla solo se aplica a pantallas pequeñas con touch y sin hover - NO afecta a PC */
    @media (max-width: 768px) and (hover: none) and (pointer: coarse) {
      .wave-layer-1,
      .wave-layer-2,
      .wave-layer-3 {
        animation: none !important;
        transform: none !important;
        will-change: auto !important;
      }
      
      .prism-effect {
        animation: none !important;
        transform: none !important;
        opacity: 0.2 !important;
      }
    }
    
    /* Desactivar animaciones solo si el usuario explícitamente prefiere movimiento reducido */
    /* NOTA: Esto respeta la preferencia del sistema, pero puedes comentar esta sección si quieres */
    @media (prefers-reduced-motion: reduce) {
      .wave-layer-1,
      .wave-layer-2,
      .wave-layer-3 {
        animation: none !important;
        transform: none !important;
      }
      
      .prism-effect {
        animation: none !important;
        transform: none !important;
      }
      
      .logo-image {
        animation: none !important;
      }
      
      .login-card {
        animation: none !important;
      }
    }
    
    /* Smooth transitions for all interactive elements */
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  public auth = inject(AuthService);

  signIn() {
    this.auth.loginWithRedirect({});
  }
}
