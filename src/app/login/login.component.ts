import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'pt-login',
  imports: [Card, Button, Toast, NgClass],
  template: `
    <div
      class="w-full h-screen flex flex-col items-center justify-center p-4 relative animated-gradient-container"
      style="overflow: hidden;"
    >
      <p-toast />
      <div
        class="login-container flex flex-col items-center justify-center w-full h-full relative z-10"
      >
        <div class="logo-wrapper mb-6 md:mb-8 lg:mb-10">
          <img
            src="images/blackdog.png"
            class="logo-image"
            alt="Black Dog Logo"
          />
        </div>

        <p-card class="login-card">
          <ng-template #title>
            <div class="card-title-wrapper">
              <div class="card-subtitle">Sistema de Gestión de Personal</div>
              <div class="card-title">Iniciar sesión</div>
            </div>
          </ng-template>
          <ng-template #subtitle>
            <div class="card-description">
              Ingresa con tu cuenta para continuar
            </div>
          </ng-template>

          <ng-template #footer>
            <div class="card-footer">
              <div class="switch-container">
                <p-button
                  label="Entrar al dashboard"
                  (click)="launchButton()"
                  icon="pi pi-sign-in"
                  size="large"
                  [ngClass]="{
                    'switch-button-active': activeMode() === 'dashboard',
                    fly: isFlying()
                  }"
                  styleClass="switch-button switch-button-dashboard"
                  [disabled]="isFlying()"
                />
                <p-button
                  label="Modo Kiosko"
                  (click)="openKioskMode()"
                  icon="pi pi-desktop"
                  size="large"
                  [ngClass]="{
                    'switch-button-active': activeMode() === 'kiosk'
                  }"
                  styleClass="switch-button switch-button-kiosk"
                />
              </div>
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
        padding: 2rem 1.5rem;
      }
    }
    
    @media (min-width: 1024px) {
      .login-container {
        padding: 2.5rem 2rem;
      }
    }
    
    @media (min-width: 1366px) {
      .login-container {
        padding: 3rem 2rem;
      }
    }
    
    /* Logo */
    .logo-wrapper {
      padding: 1.5rem 0;
      margin-bottom: 0;
      animation: logo-entrance 0.8s ease-out;
    }
    
    @media (min-width: 768px) {
      .logo-wrapper {
        padding: 1.5rem 0;
        margin-bottom: 0.5rem;
      }
    }
    
    @media (min-width: 1024px) {
      .logo-wrapper {
        padding: 2rem 0;
        margin-bottom: 1rem;
      }
    }
    
    .logo-image {
      height: 4rem;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4)) 
              drop-shadow(0 4px 12px rgba(255, 255, 255, 0.1));
      transition: transform 0.3s ease;
    }
    
    @media (min-width: 768px) {
      .logo-image {
        height: 5rem;
      }
    }
    
    @media (min-width: 1024px) {
      .logo-image {
        height: 5.5rem;
      }
    }
    
    @media (min-width: 1366px) {
      .logo-image {
        height: 6rem;
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
      padding: 1.75rem 1.5rem !important;
    }
    
    @media (min-width: 768px) {
      .login-card {
        max-width: 400px;
      }
      .login-card ::ng-deep .p-card-body {
        padding: 2rem 1.75rem !important;
      }
    }
    
    @media (min-width: 1024px) {
      .login-card {
        max-width: 420px;
      }
      .login-card ::ng-deep .p-card-body {
        padding: 2.25rem 2rem !important;
      }
    }
    
    @media (min-width: 1366px) {
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
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    @media (min-width: 768px) {
      .card-title {
        font-size: 1.75rem;
      }
    }
    
    @media (min-width: 1024px) {
      .card-title {
        font-size: 1.875rem;
      }
    }
    
    @media (min-width: 1366px) {
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
      padding-top: 1.25rem;
      width: 100%;
    }
    
    @media (min-width: 640px) {
      .card-footer {
        flex-direction: row;
        justify-content: center;
        padding-top: 1.5rem;
      }
    }
    
    @media (min-width: 768px) {
      .card-footer {
        padding-top: 1.5rem;
      }
    }

    /* Switch Container - Diseño Simple */
    .switch-container {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(20, 20, 20, 0.95);
      border-radius: 16px;
      padding: 0.5rem;
      border: 1px solid rgba(100, 100, 100, 0.2);
      box-shadow: 
        inset 0 2px 4px rgba(0, 0, 0, 0.5),
        0 4px 16px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      width: 100%;
      max-width: 320px;
    }
    
    @media (min-width: 768px) {
      .switch-container {
        gap: 0.625rem;
        padding: 0.5rem 0.625rem;
        max-width: 360px;
      }
    }
    
    @media (min-width: 1024px) {
      .switch-container {
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        max-width: 380px;
      }
    }
    
    @media (min-width: 1366px) {
      .switch-container {
        max-width: 400px;
      }
    }

    /* Switch Buttons - Estilos base iguales para ambos */
    .switch-button {
      position: relative;
      min-width: 150px;
      width: 150px;
      margin: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      flex: 1 1 0;
    }

    /* Asegurar que ambos botones tengan el mismo tamaño */
    .switch-button-dashboard,
    .switch-button-kiosk {
      min-width: 150px;
      width: 150px;
      flex: 1 1 0;
    }
    
    @media (min-width: 768px) {
      .switch-button,
      .switch-button-dashboard,
      .switch-button-kiosk {
        min-width: 165px;
        width: 165px;
      }
    }
    
    @media (min-width: 1024px) {
      .switch-button,
      .switch-button-dashboard,
      .switch-button-kiosk {
        min-width: 175px;
        width: 175px;
      }
    }
    
    @media (min-width: 1366px) {
      .switch-button,
      .switch-button-dashboard,
      .switch-button-kiosk {
        min-width: 180px;
        width: 180px;
      }
    }

    /* Hover effect on active button */
    .switch-button-active ::ng-deep .p-button:hover {
      transform: translateY(-1px);
    }

    /* Botones inactivos - mismo tamaño y estilo para ambos */
    .switch-button:not(.switch-button-active) ::ng-deep .p-button {
      padding: 0.75rem 1.5rem !important;
      font-size: 0.9375rem !important;
      font-weight: 500 !important;
      letter-spacing: 0.02em !important;
      border-radius: 12px !important;
      min-width: 150px !important;
      width: 100% !important;
      height: auto !important;
      min-height: 2.75rem !important;
      background: transparent !important;
      border: 1px solid transparent !important;
      color: rgba(255, 255, 255, 0.7) !important;
      text-shadow: none !important;
      box-shadow: none !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    @media (min-width: 768px) {
      .switch-button:not(.switch-button-active) ::ng-deep .p-button {
        min-width: 165px !important;
        padding: 0.8125rem 1.75rem !important;
        font-size: 0.96875rem !important;
      }
    }
    
    @media (min-width: 1024px) {
      .switch-button:not(.switch-button-active) ::ng-deep .p-button {
        min-width: 175px !important;
        padding: 0.875rem 2rem !important;
        font-size: 1rem !important;
        min-height: 3rem !important;
      }
    }
    
    @media (min-width: 1366px) {
      .switch-button:not(.switch-button-active) ::ng-deep .p-button {
        min-width: 180px !important;
      }
    }

    /* Iconos de botones inactivos - mismo color para ambos */
    .switch-button:not(.switch-button-active) ::ng-deep .p-button-icon {
      color: rgba(0, 0, 0, 0.7) !important;
    }

    /* Centrar contenido del botón (icono + texto) */
    .switch-button ::ng-deep .p-button {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .switch-button ::ng-deep .p-button .p-button-content {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      gap: 0.5rem !important;
      flex: 1 !important;
    }

    .switch-button ::ng-deep .p-button .p-button-label {
      display: inline-block !important;
      text-align: center !important;
      white-space: normal !important;
      line-height: 1.2 !important;
      flex: 0 0 auto !important;
    }

    .switch-button ::ng-deep .p-button-icon {
      flex: 0 0 auto !important;
    }

    /* Iconos de botones inactivos - mismo estilo para ambos */
    .switch-button:not(.switch-button-active) ::ng-deep .p-button-icon {
      font-size: 1.125rem !important;
      margin-right: 1rem !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      color: rgba(255, 255, 255, 0.7) !important;
      filter: none !important;
      text-shadow: none !important;
      flex-shrink: 0 !important;
    }

    /* Asegurar que ambos botones inactivos tengan iconos con el mismo color */
    .switch-button-dashboard:not(.switch-button-active) ::ng-deep .p-button-icon,
    .switch-button-kiosk:not(.switch-button-active) ::ng-deep .p-button-icon {
      color: rgba(255, 255, 255, 0.7) !important;
    }

    /* Hover en botones inactivos - cambiar a amarillo */
    .switch-button:not(.switch-button-active) ::ng-deep .p-button:hover {
      color: rgba(251, 191, 36, 0.95) !important;
      background: transparent !important;
      text-shadow: none !important;
      box-shadow: none !important;
      transform: translateY(-1px);
    }

    .switch-button:not(.switch-button-active) ::ng-deep .p-button:hover .p-button-icon {
      color: rgba(251, 191, 36, 0.9) !important;
      transform: scale(1.05);
      filter: none !important;
    }

    /* Botón activo - Estilos base iguales para ambos */
    .switch-button-active ::ng-deep .p-button {
      padding: 0.75rem 1.5rem !important;
      font-size: 0.9375rem !important;
      font-weight: 600 !important;
      letter-spacing: 0.02em !important;
      border-radius: 12px !important;
      min-width: 150px !important;
      width: 100% !important;
      height: auto !important;
      min-height: 2.75rem !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      position: relative !important;
      overflow: hidden;
      cursor: pointer;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 2 !important;
    }
    
    @media (min-width: 768px) {
      .switch-button-active ::ng-deep .p-button {
        min-width: 165px !important;
        padding: 0.8125rem 1.75rem !important;
        font-size: 0.96875rem !important;
      }
    }
    
    @media (min-width: 1024px) {
      .switch-button-active ::ng-deep .p-button {
        min-width: 175px !important;
        padding: 0.875rem 2rem !important;
        font-size: 1rem !important;
        min-height: 3rem !important;
      }
    }
    
    @media (min-width: 1366px) {
      .switch-button-active ::ng-deep .p-button {
        min-width: 180px !important;
      }
    }
    
    /* Botón activo de Dashboard - fondo amarillo sólido */
    .switch-button-active.switch-button-dashboard ::ng-deep .p-button {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
      border: none !important;
      box-shadow: 
        0 4px 16px rgba(251, 191, 36, 0.5),
        0 2px 8px rgba(251, 191, 36, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.25),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
      color: #ffffff !important;
      text-shadow: 
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 0 8px rgba(0, 0, 0, 0.2) !important;
    }
    
    /* Botón activo de Kiosko - mismo estilo pero sin fondo amarillo */
    .switch-button-active.switch-button-kiosk ::ng-deep .p-button {
      background: transparent !important;
      border: 1px solid transparent !important;
      box-shadow: none !important;
      color: #ffffff !important;
      text-shadow: 
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 0 8px rgba(251, 191, 36, 0.3) !important;
    }

    /* Iconos de botones activos - mismo estilo para ambos */
    .switch-button-active ::ng-deep .p-button-icon {
      font-size: 1.125rem !important;
      margin-right: 1rem !important;
      color: #ffffff !important;
      transform: scale(1.1);
      filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      flex-shrink: 0 !important;
    }

    /* Asegurar que el icono de Kiosko activo tenga el mismo estilo */
    .switch-button-active.switch-button-kiosk ::ng-deep .p-button-icon {
      color: #ffffff !important;
      transform: scale(1.1);
      filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
    }

    /* Hover en botones activos - mismo efecto para ambos */
    .switch-button-active ::ng-deep .p-button:hover {
      color: #ffffff !important;
      text-shadow: 
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 0 10px rgba(251, 191, 36, 0.4) !important;
      transform: translateY(-1px);
    }

    .switch-button-active ::ng-deep .p-button:hover .p-button-icon {
      color: #ffffff !important;
      transform: scale(1.15);
      filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.7));
    }

    /* Asegurar que el hover de Kiosko activo tenga el mismo efecto */
    .switch-button-active.switch-button-kiosk ::ng-deep .p-button:hover {
      color: #ffffff !important;
      text-shadow: 
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 0 10px rgba(251, 191, 36, 0.4) !important;
      transform: translateY(-1px);
    }

    .switch-button-active.switch-button-kiosk ::ng-deep .p-button:hover .p-button-icon {
      color: #ffffff !important;
      transform: scale(1.15);
      filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.7));
    }

    .switch-button ::ng-deep .p-button:active {
      transform: scale(0.98);
    }

    /* Responsive */
    @media (max-width: 640px) {
      .switch-container {
        flex-direction: column;
        width: 100%;
        gap: 0.5rem;
        padding: 0.5rem;
      }

      .switch-slider {
        display: none;
      }

      .switch-button {
        width: 100%;
        min-width: auto;
        flex: 1 1 0;
      }

      .switch-button-dashboard,
      .switch-button-kiosk {
        width: 100%;
        min-width: auto;
        flex: 1 1 0;
      }

      /* Botones activos en móvil - mismo tamaño base */
      .switch-button-active ::ng-deep .p-button {
        min-width: 100% !important;
        width: 100% !important;
        min-height: 3rem !important;
        padding: 0.875rem 2rem !important;
      }

      /* Dashboard activo en móvil - fondo amarillo */
      .switch-button-active.switch-button-dashboard ::ng-deep .p-button {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
        border: none !important;
        box-shadow: 
          0 4px 12px rgba(251, 191, 36, 0.3),
          0 2px 6px rgba(251, 191, 36, 0.2) !important;
        color: #ffffff !important;
      }

      /* Kiosko activo en móvil - mismo tamaño pero sin fondo amarillo */
      .switch-button-active.switch-button-kiosk ::ng-deep .p-button {
        background: transparent !important;
        border: 1px solid transparent !important;
        box-shadow: none !important;
        color: #ffffff !important;
      }

      /* Iconos en móvil - mismo color para ambos botones activos */
      .switch-button-active ::ng-deep .p-button-icon {
        color: #ffffff !important;
      }

      /* Botones inactivos en móvil - mismo tamaño */
      .switch-button:not(.switch-button-active) ::ng-deep .p-button {
        min-width: 100% !important;
        width: 100% !important;
        min-height: 3rem !important;
      }

      .switch-button:not(.switch-button-active) ::ng-deep .p-button {
        background: rgba(30, 30, 30, 0.6) !important;
        border: 1px solid rgba(100, 100, 100, 0.2) !important;
      }
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

    /* Animación de vuelo del botón - Flying Button Animation */
    .switch-button-dashboard {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .switch-button-dashboard.fly {
      animation: flyAway 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      pointer-events: none;
    }

    @keyframes flyAway {
      0% {
        transform: translate(0, 0) rotate(0deg) scale(1);
        opacity: 1;
      }
      20% {
        transform: translate(20px, -30px) rotate(-8deg) scale(0.95);
        opacity: 0.95;
      }
      40% {
        transform: translate(50px, -80px) rotate(-15deg) scale(0.85);
        opacity: 0.85;
      }
      60% {
        transform: translate(100px, -150px) rotate(-20deg) scale(0.75);
        opacity: 0.7;
      }
      80% {
        transform: translate(180px, -250px) rotate(-23deg) scale(0.65);
        opacity: 0.4;
      }
      100% {
        transform: translate(300px, -400px) rotate(-25deg) scale(0.6);
        opacity: 0;
        visibility: hidden;
      }
    }

    /* Mejorar el efecto visual del botón durante el vuelo */
    .switch-button-dashboard.fly ::ng-deep .p-button {
      transform-origin: center center;
      will-change: transform, opacity;
    }

    /* Asegurar que el botón mantenga su estilo antes de volar */
    .switch-button-dashboard:not(.fly) ::ng-deep .p-button {
      transform: translate(0, 0) rotate(0deg) scale(1);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  public auth = inject(AuthService);
  public activeMode = signal<'dashboard' | 'kiosk'>('dashboard');
  public isFlying = signal<boolean>(false);

  setMode(mode: 'dashboard' | 'kiosk') {
    this.activeMode.set(mode);
  }

  launchButton() {
    // Prevenir múltiples clics
    if (this.isFlying()) return;

    // Activar modo dashboard
    this.setMode('dashboard');

    // Activar animación de vuelo
    this.isFlying.set(true);

    // Esperar 900ms para la animación y luego ejecutar la acción
    setTimeout(() => {
      this.signIn();
    }, 900);
  }

  signIn() {
    this.auth.loginWithRedirect({});
  }

  openKioskMode() {
    // Solo abrir el modo kiosko, sin cambiar el modo activo para evitar problemas visuales
    window.open('/timeclock-kiosk', '_blank');
  }
}
