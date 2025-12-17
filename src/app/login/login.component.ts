import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { OrganizationService } from '../services/organization.service';
import { AuthBypassService } from '../services/auth-bypass.service';
import { Branch } from '../models';

@Component({
  selector: 'pt-login',
  imports: [Card, Button, Toast, NgClass],
  template: `
    <div
      class="w-full h-screen flex flex-col items-center justify-center p-4 relative animated-gradient-container"
      [ngClass]="{ 'naz-theme': isNaz() }"
      style="overflow: hidden;"
    >
      <p-toast />
      <div
        class="login-container flex flex-col items-center justify-center w-full h-full relative z-10"
      >
        <div class="logo-wrapper mb-8 md:mb-12">
          <div class="logo-selector-container">
            @if (canChangeOrganization()) {
              <button
                type="button"
                class="arrow-button arrow-left"
                (click)="previousOrganization()"
                aria-label="Organización anterior"
              >
                <i class="pi pi-chevron-left"></i>
              </button>
            }
            <div class="logo-container">
              <img
                [src]="logoPath()"
                [class]="
                  'logo-image ' + (isNaz() ? 'logo-naz' : 'logo-blackdog')
                "
                [alt]="isNaz() ? 'Naz Logo' : 'Black Dog Logo'"
              />
            </div>
            @if (canChangeOrganization()) {
              <button
                type="button"
                class="arrow-button arrow-right"
                (click)="nextOrganization()"
                aria-label="Siguiente organización"
              >
                <i class="pi pi-chevron-right"></i>
              </button>
            }
          </div>
        </div>

        <p-card class="login-card" [ngClass]="{ 'naz-card': isNaz() }">
          <ng-template #title>
            <div class="card-title-wrapper">
              <div
                [ngClass]="{ 'card-subtitle': true, 'naz-subtitle': isNaz() }"
              >
                Sistema de Gestión de Personal
              </div>
              <div [ngClass]="{ 'card-title': true, 'naz-title': isNaz() }">
                Iniciar sesión
              </div>
            </div>
          </ng-template>
          <ng-template #subtitle>
            <div
              [ngClass]="{
                'card-description': true,
                'naz-description': isNaz()
              }"
            >
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
                    fly: isFlying(),
                    'naz-button': isNaz()
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
                    'switch-button-active': activeMode() === 'kiosk',
                    'naz-button': isNaz()
                  }"
                  styleClass="switch-button switch-button-kiosk"
                />
              </div>
            </div>
            <!-- Botón de Bypass para desarrollo - Debajo de los otros botones -->
            <div class="bypass-container">
              <p-button
                label="🔓 Bypass: soporte2@gmail.com"
                (click)="loginWithBypass()"
                icon="pi pi-unlock"
                size="small"
                severity="warn"
                styleClass="bypass-button"
                [outlined]="true"
              />
              <p class="bypass-warning text-xs text-yellow-400 mt-2 text-center">
                ⚠️ Solo para desarrollo/testing
              </p>
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
      position: relative;
    }
    
    @media (min-width: 768px) {
      .login-container {
        padding: 3rem 2rem;
      }
    }

    /* ============================================
       TEMA BLACK DOG - ESTILOS
       ============================================ */
    
    /* Fondo Black Dog - gradiente oscuro */
    .animated-gradient-container:not(.naz-theme) {
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 25%, #000000 50%, #0d0d0d 75%, #2a2a2a 100%);
    }

    /* ============================================
       TEMA NAZ - ESTILOS MINIMALISTAS PREMIUM
       ============================================ */
    
    /* Fondo Naz - negro con animación de lava lamp plateada */
    .naz-theme .animated-gradient-container {
      background: #000000;
      position: relative;
      overflow: hidden;
      min-height: 100vh;
    }

    /* Animación de lava lamp plateada - cubre toda la pantalla */
    .naz-theme .animated-gradient-container::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.5) 0%,
          rgba(255, 255, 255, 0.6) 2%,
          rgba(229, 226, 223, 0.65) 4%,
          rgba(198, 194, 191, 0.55) 6%,
          transparent 8%,
          transparent 12%,
          rgba(198, 194, 191, 0.5) 14%,
          rgba(229, 226, 223, 0.6) 16%,
          rgba(255, 255, 255, 0.55) 18%,
          transparent 20%
        ),
        linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.6) 0%,
          rgba(229, 226, 223, 0.7) 25%,
          rgba(198, 194, 191, 0.6) 50%,
          rgba(229, 226, 223, 0.65) 75%,
          rgba(255, 255, 255, 0.55) 100%
        );
      animation: silverLavaFlow 25s ease-in-out infinite;
      z-index: 0;
      filter: blur(25px);
      pointer-events: none;
    }

    .naz-theme .animated-gradient-container::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(
          -45deg,
          rgba(229, 226, 223, 0.55) 0%,
          rgba(255, 255, 255, 0.65) 2%,
          rgba(198, 194, 191, 0.6) 4%,
          rgba(229, 226, 223, 0.5) 6%,
          transparent 8%,
          transparent 12%,
          rgba(255, 255, 255, 0.55) 14%,
          rgba(198, 194, 191, 0.65) 16%,
          rgba(229, 226, 223, 0.6) 18%,
          transparent 20%
        ),
        linear-gradient(
          -135deg,
          rgba(198, 194, 191, 0.7) 0%,
          rgba(229, 226, 223, 0.75) 30%,
          rgba(255, 255, 255, 0.65) 60%,
          rgba(198, 194, 191, 0.6) 100%
        );
      animation: silverLavaFlow 30s ease-in-out infinite reverse;
      z-index: 0;
      filter: blur(30px);
      pointer-events: none;
    }

    /* Animación de lava lamp plateada también en login-container para tema Naz */
    .naz-theme .login-container {
      background: transparent;
      position: relative;
      overflow: visible;
    }

    .naz-theme .login-container::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.5) 0%,
          rgba(255, 255, 255, 0.6) 2%,
          rgba(229, 226, 223, 0.65) 4%,
          rgba(198, 194, 191, 0.55) 6%,
          transparent 8%,
          transparent 12%,
          rgba(198, 194, 191, 0.5) 14%,
          rgba(229, 226, 223, 0.6) 16%,
          rgba(255, 255, 255, 0.55) 18%,
          transparent 20%
        ),
        linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.6) 0%,
          rgba(229, 226, 223, 0.7) 25%,
          rgba(198, 194, 191, 0.6) 50%,
          rgba(229, 226, 223, 0.65) 75%,
          rgba(255, 255, 255, 0.55) 100%
        );
      animation: silverLavaFlow 25s ease-in-out infinite;
      z-index: 0;
      filter: blur(25px);
      pointer-events: none;
    }

    .naz-theme .login-container::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(
          -45deg,
          rgba(229, 226, 223, 0.55) 0%,
          rgba(255, 255, 255, 0.65) 2%,
          rgba(198, 194, 191, 0.6) 4%,
          rgba(229, 226, 223, 0.5) 6%,
          transparent 8%,
          transparent 12%,
          rgba(255, 255, 255, 0.55) 14%,
          rgba(198, 194, 191, 0.65) 16%,
          rgba(229, 226, 223, 0.6) 18%,
          transparent 20%
        ),
        linear-gradient(
          -135deg,
          rgba(198, 194, 191, 0.7) 0%,
          rgba(229, 226, 223, 0.75) 30%,
          rgba(255, 255, 255, 0.65) 60%,
          rgba(198, 194, 191, 0.6) 100%
        );
      animation: silverLavaFlow 30s ease-in-out infinite reverse;
      z-index: 0;
      filter: blur(30px);
      pointer-events: none;
    }

    /* Asegurar que el contenido esté por encima de la animación */
    .naz-theme .login-container > * {
      position: relative;
      z-index: 1;
    }

    @keyframes silverLavaFlow {
      0% {
        transform: translate(-20%, -20%) rotate(0deg) scale(1);
        opacity: 0.9;
      }
      25% {
        transform: translate(10%, 5%) rotate(5deg) scale(1.1);
        opacity: 1;
      }
      50% {
        transform: translate(5%, 15%) rotate(-3deg) scale(0.95);
        opacity: 0.85;
      }
      75% {
        transform: translate(-10%, 8%) rotate(4deg) scale(1.05);
        opacity: 0.95;
      }
      100% {
        transform: translate(-20%, -20%) rotate(0deg) scale(1);
        opacity: 0.9;
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

    /* Bypass Container - Debajo de los botones principales */
    .bypass-container {
      width: 100%;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .bypass-button ::ng-deep .p-button {
      width: 100%;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
      border: 1px solid #fbbf24 !important;
      color: #000000 !important;
      font-size: 0.875rem !important;
      font-weight: 600 !important;
    }

    .bypass-button ::ng-deep .p-button:hover {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
      border-color: #f59e0b !important;
      color: #000000 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4) !important;
    }

    .bypass-warning {
      font-size: 0.75rem;
      opacity: 0.8;
    }
    
    @media (min-width: 640px) {
      .card-footer {
        flex-direction: row;
        justify-content: center;
      }
    }

    /* Switch Container - Diseño Simple */
    .switch-container {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(20, 20, 20, 0.95);
      border-radius: 16px;
      padding: 0.5rem 0.75rem;
      border: 1px solid rgba(100, 100, 100, 0.2);
      box-shadow: 
        inset 0 2px 4px rgba(0, 0, 0, 0.5),
        0 4px 16px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    /* Switch Buttons - Estilos base iguales para ambos */
    .switch-button {
      position: relative;
      min-width: 180px;
      width: 180px;
      margin: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      flex: 1 1 0;
    }

    /* Asegurar que ambos botones tengan el mismo tamaño */
    .switch-button-dashboard,
    .switch-button-kiosk {
      min-width: 180px;
      width: 180px;
      flex: 1 1 0;
    }

    /* Hover effect on active button */
    .switch-button-active ::ng-deep .p-button:hover {
      transform: translateY(-1px);
    }

    /* Botones inactivos - mismo tamaño y estilo para ambos */
    .switch-button:not(.switch-button-active) ::ng-deep .p-button {
      padding: 0.875rem 2rem !important;
      font-size: 1rem !important;
      font-weight: 500 !important;
      letter-spacing: 0.02em !important;
      border-radius: 12px !important;
      min-width: 180px !important;
      width: 100% !important;
      height: auto !important;
      min-height: 3rem !important;
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

    /* Hover en botones inactivos - cambiar a amarillo (solo Black Dog) */
    .switch-button:not(.switch-button-active):not(.naz-button) ::ng-deep .p-button:hover {
      color: rgba(251, 191, 36, 0.95) !important;
      background: transparent !important;
      text-shadow: none !important;
      box-shadow: none !important;
      transform: translateY(-1px);
    }

    .switch-button:not(.switch-button-active):not(.naz-button) ::ng-deep .p-button:hover .p-button-icon {
      color: rgba(251, 191, 36, 0.9) !important;
      transform: scale(1.05);
      filter: none !important;
    }
    
    /* Hover en botones inactivos Naz - cambiar a gris */
    .naz-theme .switch-button:not(.switch-button-active) ::ng-deep .p-button:hover {
      color: rgba(198, 194, 191, 0.95) !important;
      background: transparent !important;
      text-shadow: none !important;
      box-shadow: none !important;
      transform: translateY(-1px);
    }

    .naz-theme .switch-button:not(.switch-button-active) ::ng-deep .p-button:hover .p-button-icon {
      color: rgba(198, 194, 191, 0.9) !important;
      transform: scale(1.05);
      filter: none !important;
    }

    /* Botón activo - Estilos base iguales para ambos */
    .switch-button-active ::ng-deep .p-button {
      padding: 0.875rem 2rem !important;
      font-size: 1rem !important;
      font-weight: 600 !important;
      letter-spacing: 0.02em !important;
      border-radius: 12px !important;
      min-width: 180px !important;
      width: 100% !important;
      height: auto !important;
      min-height: 3rem !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      position: relative !important;
      overflow: hidden;
      cursor: pointer;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 2 !important;
    }
    
    /* Botón activo de Dashboard - fondo amarillo sólido (solo Black Dog) */
    .switch-button-active.switch-button-dashboard:not(.naz-button) ::ng-deep .p-button {
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
    
    /* Botón activo de Dashboard Naz - fondo gris */
    .naz-theme .switch-button-active.switch-button-dashboard ::ng-deep .p-button {
      background: linear-gradient(135deg, #C6C2BF 0%, #E5E2DF 100%) !important;
      border: 1px solid #FFFFFF !important;
      box-shadow: 
        0 4px 16px rgba(198, 194, 191, 0.3),
        0 2px 8px rgba(198, 194, 191, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -1px 0 rgba(0, 0, 0, 0.1) !important;
      color: #000000 !important;
      text-shadow: none !important;
    }
    
    /* Botón activo de Kiosko - mismo estilo pero sin fondo amarillo (solo Black Dog) */
    .switch-button-active.switch-button-kiosk:not(.naz-button) ::ng-deep .p-button {
      background: transparent !important;
      border: 1px solid transparent !important;
      box-shadow: none !important;
      color: #ffffff !important;
      text-shadow: 
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 0 8px rgba(251, 191, 36, 0.3) !important;
    }
    
    /* Botón activo de Kiosko Naz */
    .naz-theme .switch-button-active.switch-button-kiosk ::ng-deep .p-button {
      background: transparent !important;
      border: 1px solid #FFFFFF !important;
      box-shadow: none !important;
      color: #FFFFFF !important;
      text-shadow: none !important;
    }

    /* Iconos de botones activos - mismo estilo para ambos (solo Black Dog) */
    .switch-button-active:not(.naz-button) ::ng-deep .p-button-icon {
      font-size: 1.125rem !important;
      margin-right: 1rem !important;
      color: #ffffff !important;
      transform: scale(1.1);
      filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      flex-shrink: 0 !important;
    }

    /* Asegurar que el icono de Kiosko activo tenga el mismo estilo (solo Black Dog) */
    .switch-button-active.switch-button-kiosk:not(.naz-button) ::ng-deep .p-button-icon {
      color: #ffffff !important;
      transform: scale(1.1);
      filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
    }
    
    /* Iconos de botones activos Naz - sin efectos amarillos */
    .naz-theme .switch-button-active ::ng-deep .p-button-icon {
      font-size: 1.125rem !important;
      margin-right: 1rem !important;
      color: inherit !important;
      transform: scale(1.1);
      filter: none !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      flex-shrink: 0 !important;
    }

    /* Hover en botones activos - mismo efecto para ambos (solo Black Dog) */
    .switch-button-active:not(.naz-button) ::ng-deep .p-button:hover {
      color: #ffffff !important;
      text-shadow: 
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 0 10px rgba(251, 191, 36, 0.4) !important;
      transform: translateY(-1px);
    }

    .switch-button-active:not(.naz-button) ::ng-deep .p-button:hover .p-button-icon {
      color: #ffffff !important;
      transform: scale(1.15);
      filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.7));
    }

    /* Asegurar que el hover de Kiosko activo tenga el mismo efecto (solo Black Dog) */
    .switch-button-active.switch-button-kiosk:not(.naz-button) ::ng-deep .p-button:hover {
      color: #ffffff !important;
      text-shadow: 
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 0 10px rgba(251, 191, 36, 0.4) !important;
      transform: translateY(-1px);
    }

    .switch-button-active.switch-button-kiosk:not(.naz-button) ::ng-deep .p-button:hover .p-button-icon {
      color: #ffffff !important;
      transform: scale(1.15);
      filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.7));
    }
    
    /* Hover en botones activos Naz */
    .naz-theme .switch-button-active ::ng-deep .p-button:hover {
      color: inherit !important;
      text-shadow: none !important;
      transform: translateY(-1px);
    }

    .naz-theme .switch-button-active ::ng-deep .p-button:hover .p-button-icon {
      color: inherit !important;
      transform: scale(1.15);
      filter: none !important;
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

      /* Dashboard activo en móvil - fondo amarillo (solo Black Dog) */
      .switch-button-active.switch-button-dashboard:not(.naz-button) ::ng-deep .p-button {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
        border: none !important;
        box-shadow: 
          0 4px 12px rgba(251, 191, 36, 0.3),
          0 2px 6px rgba(251, 191, 36, 0.2) !important;
        color: #ffffff !important;
      }
      
      /* Dashboard activo en móvil Naz - fondo gris */
      .naz-theme .switch-button-active.switch-button-dashboard ::ng-deep .p-button {
        background: linear-gradient(135deg, #C6C2BF 0%, #E5E2DF 100%) !important;
        border: 1px solid #FFFFFF !important;
        box-shadow: 
          0 4px 12px rgba(198, 194, 191, 0.2),
          0 2px 6px rgba(198, 194, 191, 0.15) !important;
        color: #000000 !important;
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

    /* ============================================
       SELECTOR DE ORGANIZACIÓN - FLECHAS Y LOGO
       ============================================ */
    .logo-selector-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      width: 100%;
    }

    .logo-container {
      flex-shrink: 0;
    }

    .arrow-button {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.7);
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }

    .arrow-button:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.4);
      color: rgba(255, 255, 255, 1);
      transform: scale(1.1);
    }

    .arrow-button:active {
      transform: scale(0.95);
    }

    .arrow-button i {
      font-size: 1.25rem;
    }

    @media (max-width: 640px) {
      .logo-selector-container {
        gap: 1rem;
      }

      .arrow-button {
        width: 2rem;
        height: 2rem;
      }

      .arrow-button i {
        font-size: 1rem;
      }
    }

    /* ============================================
       TEMA NAZ - ESTILOS MINIMALISTAS PREMIUM
       ============================================ */
    .naz-theme {
      background: #000000 !important;
    }

    .naz-theme .animated-gradient-container {
      background: #000000 !important;
    }

    /* Logo Naz */
    .logo-naz {
      filter: none !important;
    }

    /* Card Naz */
    .naz-card {
      background: #0D0D0D !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      box-shadow: none !important;
      border-radius: 2px !important;
    }

    .naz-card ::ng-deep .p-card {
      background: transparent !important;
    }

    /* Tipografía Naz */
    .naz-subtitle {
      color: #C6C2BF !important;
      font-family: 'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }

    .naz-title {
      color: #FFFFFF !important;
      font-family: 'Playfair Display', serif !important;
      font-weight: 400 !important;
    }

    .naz-description {
      color: #C6C2BF !important;
      font-family: 'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }

    /* Botones Naz - Minimalistas */
    .naz-theme .switch-button-active.naz-button ::ng-deep .p-button {
      background: transparent !important;
      border: 1px solid #FFFFFF !important;
      color: #FFFFFF !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    .naz-theme .switch-button-active.naz-button ::ng-deep .p-button:hover {
      background: #E5E2DF !important;
      color: #000000 !important;
      border-color: #E5E2DF !important;
    }

    .naz-theme .switch-button-active.naz-button ::ng-deep .p-button-icon {
      color: inherit !important;
      filter: none !important;
      text-shadow: none !important;
    }

    .naz-theme .switch-button-active.naz-button ::ng-deep .p-button:hover .p-button-icon {
      color: #000000 !important;
      filter: none !important;
    }

    /* Botones inactivos Naz */
    .naz-theme .switch-button:not(.switch-button-active).naz-button ::ng-deep .p-button {
      background: #E5E2DF !important;
      border: 1px solid #E5E2DF !important;
      color: #000000 !important;
    }

    .naz-theme .switch-button:not(.switch-button-active).naz-button ::ng-deep .p-button:hover {
      background: rgba(229, 226, 223, 0.8) !important;
      color: #000000 !important;
    }

    .naz-theme .switch-button:not(.switch-button-active).naz-button ::ng-deep .p-button-icon {
      color: #000000 !important;
    }

    /* Eliminar efectos amarillos en tema Naz */
    .naz-theme .switch-button ::ng-deep .p-button {
      text-shadow: none !important;
    }

    .naz-theme .switch-button-active.switch-button-dashboard ::ng-deep .p-button {
      background: transparent !important;
      border: 1px solid #FFFFFF !important;
      color: #FFFFFF !important;
      box-shadow: none !important;
    }

    .naz-theme .switch-button-active.switch-button-dashboard ::ng-deep .p-button:hover {
      background: #E5E2DF !important;
      color: #000000 !important;
      border-color: #E5E2DF !important;

    }

    .naz-theme .switch-button-active.switch-button-dashboard ::ng-deep .p-button-icon {
      filter: none !important;
      text-shadow: none !important;
      color: inherit !important;
    }

    .naz-theme .switch-button:not(.switch-button-active) ::ng-deep .p-button:hover {
      color: rgba(255, 255, 255, 0.9) !important;
    }

    .naz-theme .switch-button:not(.switch-button-active) ::ng-deep .p-button:hover .p-button-icon {
      color: rgba(255, 255, 255, 0.9) !important;
      filter: none !important;
    }

    /* Flechas en tema Naz */
    .naz-theme .arrow-button {
      border-color: rgba(255, 255, 255, 0.3);
      color: rgba(255, 255, 255, 0.8);
    }

    .naz-theme .arrow-button:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
      color: #FFFFFF;
    }

    /* Switch container Naz */
    .naz-theme .switch-container {
      background: rgba(13, 13, 13, 0.8) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      box-shadow: none !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  public auth = inject(AuthService);
  public organizationService = inject(OrganizationService);
  public http = inject(HttpClient);
  public router = inject(Router);
  public messageService = inject(MessageService);
  public bypassService = inject(AuthBypassService);
  public activeMode = signal<'dashboard' | 'kiosk'>('dashboard');
  public isFlying = signal<boolean>(false);

  // Signal para la IP actual
  private currentIP = signal<string | null>(null);
  
  // Signal para las sucursales
  private branches = signal<Branch[]>([]);

  // Signal para el email del usuario (si está autenticado)
  private userEmail = signal<string | null>(null);

  // Computed para verificar si es soporte2@blackdogpanama.com
  public isSupportUser = computed(() => {
    const email = this.userEmail();
    return email === 'soporte2@blackdogpanama.com';
  });

  // Computed para verificar si se puede cambiar de organización
  public canChangeOrganization = computed(() => {
    // Si es soporte2@blackdogpanama.com, siempre permitir cambio
    if (this.isSupportUser()) {
      return true;
    }

    const ip = this.currentIP();
    
    // Si no se puede detectar la IP o es localhost, permitir cambio
    if (!ip || ip === '127.0.0.1') {
      return true;
    }

    // Obtener sucursales
    const branchesList = this.branches();
    if (!branchesList || branchesList.length === 0) {
      return true; // Permitir cambio si no hay sucursales cargadas
    }

    // Verificar si la IP actual coincide con alguna sucursal
    const matchingBranch = branchesList.find((branch) => branch.ip && branch.ip.trim() === ip);
    
    // Si hay una sucursal que coincide con la IP
    if (matchingBranch) {
      // Verificar si es oficina central (nombre contiene "central" o "oficina central")
      const branchName = matchingBranch.name?.toLowerCase() || '';
      const branchShortName = matchingBranch.short_name?.toLowerCase() || '';
      const isCentralOffice = 
        branchName.includes('central') || 
        branchName.includes('oficina central') ||
        branchShortName.includes('central') ||
        branchShortName.includes('oficina central');
      
      // Si es oficina central, permitir cambio
      if (isCentralOffice) {
        return true;
      }
      
      // Si no es oficina central, NO permitir cambiar organización
      return false;
    }

    // Si no hay coincidencia, permitir cambio
    return true;
  });

  // Computed para verificar si es Naz
  public isNaz = computed(() => this.organizationService.isNaz());

  // Computed para obtener la ruta del logo
  public logoPath = computed(() =>
    this.isNaz() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'
  );

  constructor() {
    // Obtener email del usuario si está autenticado
    this.auth.user$.subscribe((user) => {
      if (user?.email) {
        this.userEmail.set(user.email.toLowerCase());
      }
    });

    // Obtener IP y sucursales al inicializar
    this.fetchCurrentIP();
    this.fetchBranches();
    
    // Forzar Black Dog si estamos en una IP de sucursal (excepto para soporte2)
    effect(() => {
      const ip = this.currentIP();
      const canChange = this.canChangeOrganization();
      const isSupport = this.isSupportUser();
      
      // No forzar si es soporte2
      if (isSupport) {
        return;
      }
      
      if (!canChange && ip && ip !== '127.0.0.1') {
        // Si no se puede cambiar y estamos en una IP de sucursal, forzar Black Dog
        if (this.organizationService.isNaz()) {
          this.organizationService.setOrganization('blackdog');
          console.log('🔒 Forzando Black Dog por IP de sucursal:', ip);
        }
      }
    });
  }

  nextOrganization() {
    console.log('🔄 Cambiando a siguiente organización desde login');
    this.organizationService.nextOrganization();
    const currentCompanyId = this.organizationService.getCurrentCompanyId();
    console.log('✅ Company ID actual después del cambio:', currentCompanyId);
  }

  previousOrganization() {
    console.log('🔄 Cambiando a organización anterior desde login');
    this.organizationService.previousOrganization();
    const currentCompanyId = this.organizationService.getCurrentCompanyId();
    console.log('✅ Company ID actual después del cambio:', currentCompanyId);
  }

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

  async signIn() {
    // Esperar a que los company_ids estén listos
    console.log('⏳ Esperando a que los company_ids estén listos...');
    await this.organizationService.waitForCompanyIds();
    
    const currentCompanyId = this.organizationService.getCurrentCompanyId();
    const currentOrg = this.organizationService.currentOrganization;
    
    if (!currentCompanyId) {
      console.error('❌ No se pudo obtener company_id. Usando organización por defecto.');
      // Asegurar que al menos tengamos una organización
      if (!currentOrg) {
        this.organizationService.setOrganization('blackdog');
      }
      // Intentar sincronizar de nuevo
      const retryCompanyId = this.organizationService.getCurrentCompanyId();
      if (retryCompanyId) {
        console.log('✅ Company ID obtenido después de establecer organización por defecto:', retryCompanyId);
      }
    }
    
    const finalCompanyId = this.organizationService.getCurrentCompanyId();
    const finalOrg = this.organizationService.currentOrganization;
    console.log('🚀 Iniciando sesión con organización:', finalOrg, 'company_id:', finalCompanyId);
    this.auth.loginWithRedirect({});
  }

  openKioskMode() {
    // Abrir el modo kiosko con el parámetro de organización
    const org = this.organizationService.currentOrganization;
    window.open(`/timeclock-kiosk?org=${org}`, '_blank');
  }

  /**
   * Obtiene la IP actual del cliente
   */
  private fetchCurrentIP(): void {
    // Intentar obtener IP desde el servidor
    this.http.get<{ ip: string }>('/api/client-ip').subscribe({
      next: (response) => {
        if (response?.ip) {
          const ip = response.ip.trim();
          this.currentIP.set(ip);
          console.log('📍 IP detectada en login:', ip);
        }
      },
      error: () => {
        // Si falla, intentar obtener IP vía WebRTC como fallback
        this.getIPViaWebRTC().then((ip) => {
          this.currentIP.set(ip);
          console.log('📍 IP detectada vía WebRTC:', ip);
        }).catch(() => {
          // Si todo falla, usar localhost como fallback
          this.currentIP.set('127.0.0.1');
        });
      },
    });
  }

  /**
   * Obtiene las sucursales desde la base de datos
   */
  private fetchBranches(): void {
    this.http.get<Branch[]>(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/branches`,
      {
        params: {
          select: 'ip',
          is_active: 'eq.true',
        },
      }
    ).subscribe({
      next: (branches) => {
        this.branches.set(branches);
        console.log('📍 Sucursales cargadas:', branches.length);
      },
      error: (error) => {
        console.error('Error obteniendo sucursales:', error);
      },
    });
  }

  /**
   * Obtiene IP vía WebRTC (fallback)
   */
  private getIPViaWebRTC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const RTCPeerConnection =
        (window as any).RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;

      if (!RTCPeerConnection) {
        reject(new Error('WebRTC not supported'));
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      const ips: string[] = [];

      pc.createDataChannel('');

      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const match = candidate.match(
            /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/
          );
          if (match) {
            const ip = match[1];
            if (
              ips.indexOf(ip) === -1 &&
              !ip.startsWith('127.') &&
              ip !== '::1'
            ) {
              ips.push(ip);
            }
          }
        } else {
          if (ips.length > 0) {
            pc.close();
            resolve(ips[0]);
          } else {
            pc.close();
            reject(new Error('No IP found'));
          }
        }
      };

      pc.createOffer()
        .then((offer: any) => pc.setLocalDescription(offer))
        .catch((err: any) => {
          pc.close();
          reject(err);
        });

      setTimeout(() => {
        if (ips.length > 0) {
          pc.close();
          resolve(ips[0]);
        } else {
          pc.close();
          reject(new Error('WebRTC timeout'));
        }
      }, 3000);
    });
  }

  /**
   * Inicia sesión con bypass usando soporte2@gmail.com
   * ⚠️ SOLO PARA DESARROLLO/TESTING
   */
  loginWithBypass(): void {
    const email = 'soporte2@gmail.com';
    
    // Iniciar sesión con bypass
    this.bypassService.loginWithBypass(email);
    
    // Mostrar mensaje
    this.messageService.add({
      severity: 'warn',
      summary: 'Bypass Activado',
      detail: `Sesión iniciada como ${email} (modo desarrollo)`,
      life: 3000,
    });

    // Redirigir al dashboard
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 500);
  }
}
