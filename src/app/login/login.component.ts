import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Toast } from 'primeng/toast';
import { Branch } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { APP_VERSION } from '../version';
import { logger } from '../utils/logger';

@Component({
  selector: 'pt-login',
  imports: [Card, Button, Toast, NgClass],
  template: `
    <div
      class="w-full flex flex-col items-center justify-center relative animated-gradient-container"
      [ngClass]="{ 'naz-theme': isNaz() }"
      style="overflow: visible; min-height: 100vh; min-height: 100dvh;"
    >
      <p-toast />
      <div
        class="login-container flex flex-col items-center justify-center w-full relative z-10"
      >
        <div class="logo-wrapper">
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
            <div class="card-footer-wrapper">
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
            </div>
          </ng-template>
        </p-card>
      </div>

      <!-- Versión en la esquina inferior derecha -->
      <div class="version-badge" [ngClass]="{ 'naz-version': isNaz() }">
        v{{ appVersion }}
      </div>
    </div>
  `,
  styles: `
    .animated-gradient-container {
      position: relative;
      overflow: hidden;
      transition: background 0.3s ease;
    }

    /* Modo Oscuro - Fondo por defecto */
    :host-context(html.dark) .animated-gradient-container {
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 25%, #000000 50%, #0d0d0d 75%, #2a2a2a 100%);
    }

    /* Modo Claro - Fondo claro */
    :host-context(html.light) .animated-gradient-container {
      background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 25%, #fafafa 50%, #ffffff 75%, #f0f0f0 100%);
    }
    
    /* Login Container */
    .login-container {
      padding: 1rem 0.75rem;
      min-height: auto;
      position: relative;
      justify-content: flex-start;
      padding-top: 8rem;
      overflow: visible;
    }
    
    @media (min-width: 768px) {
      .login-container {
        padding: 3rem 2rem;
        padding-top: 10rem;
        min-height: 100vh;
        justify-content: center;
      }
    }

    /* ============================================
       TEMA BLACK DOG - ESTILOS
       ============================================ */
    
    /* Fondo Black Dog - Modo Oscuro */
    :host-context(html.dark) .animated-gradient-container:not(.naz-theme) {
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 25%, #000000 50%, #0d0d0d 75%, #2a2a2a 100%);
    }

    /* Fondo Black Dog - Modo Claro */
    :host-context(html.light) .animated-gradient-container:not(.naz-theme) {
      background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 25%, #fafafa 50%, #ffffff 75%, #f0f0f0 100%);
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

    /* Animación de lava lamp plateada - DESACTIVADA */
    .naz-theme .animated-gradient-container::before {
      display: none;
    }

    .naz-theme .animated-gradient-container::after {
      display: none;
    }

    /* Animación de lava lamp plateada también en login-container - DESACTIVADA */
    .naz-theme .login-container {
      background: transparent;
      position: relative;
      overflow: visible;
    }

    .naz-theme .login-container::before {
      display: none;
    }

    .naz-theme .login-container::after {
      display: none;
    }

    /* Código anterior comentado - animaciones desactivadas
    .naz-theme .login-container::before {
      display: none;
    }

    .naz-theme .login-container::after {
      display: none;
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
      padding: 0.5rem 0;
      margin-bottom: 1rem;
      animation: logo-entrance 0.8s ease-out;
    }
    
    @media (min-width: 768px) {
      .logo-wrapper {
        padding: 2rem 0;
        margin-bottom: 0;
      }
    }
    
    .logo-image {
      height: 3.5rem;
      width: auto;
      max-width: 90vw;
      object-fit: contain;
      filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4)) 
              drop-shadow(0 4px 12px rgba(255, 255, 255, 0.1));
      transition: transform 0.3s ease;
    }
    
    @media (min-width: 480px) {
      .logo-image {
        height: 4.5rem;
      }
    }
    
    @media (min-width: 768px) {
      .logo-image {
        height: 6rem;
        max-width: none;
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
      transition: all 0.3s ease;
      overflow: visible;
    }

    /* Login Card - Modo Oscuro */
    :host-context(html.dark) .login-card {
      border: 1px solid rgba(150, 150, 150, 0.2) !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      background: rgba(20, 20, 20, 0.75) !important;
    }

    /* Login Card - Modo Claro */
    :host-context(html.light) .login-card {
      border: 1px solid rgba(0, 0, 0, 0.1) !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1),
                  0 2px 8px rgba(0, 0, 0, 0.05),
                  inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      background: rgba(255, 255, 255, 0.95) !important;
    }
    
    @media (max-width: 767px) {
      .login-card {
        max-width: 100%;
        border-radius: 12px !important;
      }
    }
    
    .login-card ::ng-deep .p-card {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    
    .login-card ::ng-deep .p-card-body {
      padding: 1.5rem 1rem !important;
      overflow: visible !important;
    }

    .login-card ::ng-deep .p-card-footer {
      padding: 0 1rem 1rem 1rem !important;
      overflow: visible !important;
    }
    
    @media (min-width: 768px) {
      .login-card ::ng-deep .p-card-body {
        padding: 2.5rem 2rem !important;
      }

      .login-card ::ng-deep .p-card-footer {
        padding: 0 2rem 2rem 2rem !important;
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
      padding: 0.25rem 0;
    }
    
    @media (min-width: 768px) {
      .card-title-wrapper {
        padding: 0.5rem 0;
      }
    }
    
    .card-subtitle {
      font-size: 0.625rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      transition: color 0.3s ease;
    }

    :host-context(html.dark) .card-subtitle {
      color: rgba(200, 200, 200, 0.7);
    }

    :host-context(html.light) .card-subtitle {
      color: rgba(100, 100, 100, 0.8);
    }
    
    @media (min-width: 480px) {
      .card-subtitle {
        font-size: 0.6875rem;
        margin-bottom: 0.625rem;
      }
    }
    
    @media (min-width: 768px) {
      .card-subtitle {
        font-size: 0.8125rem;
        margin-bottom: 1rem;
      }
    }
    
    .card-title {
      font-size: 1.375rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.2;
      transition: color 0.3s ease;
    }

    :host-context(html.dark) .card-title {
      color: #f5f5f5;
    }

    :host-context(html.light) .card-title {
      color: #1f2937;
    }
    
    @media (min-width: 480px) {
      .card-title {
        font-size: 1.5rem;
      }
    }
    
    @media (min-width: 768px) {
      .card-title {
        font-size: 2rem;
        line-height: 1.3;
      }
    }
    
    .card-description {
      font-size: 0.75rem;
      margin-top: 0.375rem;
      text-align: center;
      font-weight: 400;
      line-height: 1.4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      transition: color 0.3s ease;
    }

    :host-context(html.dark) .card-description {
      color: rgba(180, 180, 180, 0.8);
    }

    :host-context(html.light) .card-description {
      color: rgba(75, 85, 99, 0.9);
    }
    
    @media (min-width: 480px) {
      .card-description {
        font-size: 0.8125rem;
        margin-top: 0.5rem;
      }
    }
    
    @media (min-width: 768px) {
      .card-description {
        font-size: 0.9375rem;
        margin-top: 0.75rem;
        line-height: 1.5;
      }
    }
    
    /* Card Footer Wrapper */
    .card-footer-wrapper {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Card Footer */
    .card-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 1rem;
      width: 100%;
    }
    
    @media (min-width: 768px) {
      .card-footer {
        padding-top: 1.5rem;
      }
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
      border-radius: 16px;
      padding: 0.5rem 0.75rem;
      transition: all 0.3s ease;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      width: 100%;
    }

    :host-context(html.dark) .switch-container {
      background: rgba(20, 20, 20, 0.95);
      border: 1px solid rgba(100, 100, 100, 0.2);
      box-shadow: 
        inset 0 2px 4px rgba(0, 0, 0, 0.5),
        0 4px 16px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    :host-context(html.light) .switch-container {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 
        inset 0 2px 4px rgba(255, 255, 255, 0.8),
        0 4px 16px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(0, 0, 0, 0.05);
    }
    
    @media (min-width: 768px) {
      .switch-container {
        width: auto;
      }
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

    :host-context(html.dark) .switch-button:not(.switch-button-active) ::ng-deep .p-button {
      color: rgba(255, 255, 255, 0.7) !important;
    }

    :host-context(html.light) .switch-button:not(.switch-button-active) ::ng-deep .p-button {
      color: rgba(0, 0, 0, 0.6) !important;
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
      filter: none !important;
      text-shadow: none !important;
      flex-shrink: 0 !important;
    }

    /* Asegurar que ambos botones inactivos tengan iconos con el mismo color */
    :host-context(html.dark) .switch-button-dashboard:not(.switch-button-active) ::ng-deep .p-button-icon,
    :host-context(html.dark) .switch-button-kiosk:not(.switch-button-active) ::ng-deep .p-button-icon {
      color: rgba(255, 255, 255, 0.7) !important;
    }

    :host-context(html.light) .switch-button-dashboard:not(.switch-button-active) ::ng-deep .p-button-icon,
    :host-context(html.light) .switch-button-kiosk:not(.switch-button-active) ::ng-deep .p-button-icon {
      color: rgba(0, 0, 0, 0.6) !important;
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
    
    
    /* Responsive adjustments adicionales para móvil */
    @media (max-width: 767px) {
      .animated-gradient-container {
        min-height: 100vh;
        min-height: 100dvh;
        padding: 0.75rem;
      }
      
      .login-container {
        padding: 1rem 0.5rem;
        padding-top: 1.5rem;
        padding-bottom: 1.5rem;
        gap: 1rem;
      }
      
      @media (min-width: 480px) {
        .animated-gradient-container {
          padding: 1rem;
        }
        
        .login-container {
          padding: 1rem 0.75rem;
        }
      }
      
      .login-card ::ng-deep .p-card-footer {
        padding: 0 1rem 1.25rem 1rem !important;
      }
      
      /* Ajustes para textos muy pequeños */
      @media (max-width: 360px) {
        .card-title {
          font-size: 1.25rem;
        }
        
        .card-subtitle {
          font-size: 0.5625rem;
        }
        
        .card-description {
          font-size: 0.6875rem;
        }
        
        .logo-image {
          height: 3rem;
        }
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

    @media (max-width: 767px) {
      .logo-selector-container {
        gap: 0.75rem;
        max-width: 100%;
      }
      
      @media (max-width: 480px) {
        .logo-selector-container {
          gap: 0.5rem;
        }
      }

      .arrow-button {
        width: 2rem;
        height: 2rem;
      }
      
      @media (max-width: 360px) {
        .arrow-button {
          width: 1.75rem;
          height: 1.75rem;
        }
      }

      .arrow-button i {
        font-size: 1rem;
      }
      
      @media (max-width: 360px) {
        .arrow-button i {
          font-size: 0.875rem;
        }
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

    /* Badge de versión */
    .version-badge {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      padding: 0.375rem 0.75rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      z-index: 1000;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: all 0.3s ease;
    }

    :host-context(html.dark) .version-badge {
      background: rgba(20, 20, 20, 0.85);
      border: 1px solid rgba(150, 150, 150, 0.2);
      color: rgba(200, 200, 200, 0.7);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    :host-context(html.dark) .version-badge:hover {
      background: rgba(30, 30, 30, 0.95);
      color: rgba(255, 255, 255, 0.9);
      border-color: rgba(150, 150, 150, 0.3);
    }

    :host-context(html.light) .version-badge {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: rgba(75, 85, 99, 0.8);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    :host-context(html.light) .version-badge:hover {
      background: rgba(255, 255, 255, 0.95);
      color: rgba(0, 0, 0, 0.9);
      border-color: rgba(0, 0, 0, 0.2);
    }
    
    /* Versión para tema Naz */
    .naz-version {
      background: rgba(13, 13, 13, 0.85) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #C6C2BF !important;
    }
    
    .naz-version:hover {
      background: rgba(13, 13, 13, 0.95) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
      color: #FFFFFF !important;
    }
    
    @media (max-width: 767px) {
      .version-badge {
        bottom: 0.75rem;
        right: 0.75rem;
        font-size: 0.6875rem;
        padding: 0.25rem 0.5rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  public auth = inject(AuthService);
  public apiUrl = inject(ApiUrlService);
  public organizationService = inject(OrganizationService);
  public http = inject(HttpClient);
  public router = inject(Router);
  public messageService = inject(MessageService);
  public activeMode = signal<'dashboard' | 'kiosk'>('dashboard');
  public isFlying = signal<boolean>(false);

  // Versión de la aplicación (leída automáticamente desde package.json)
  public appVersion = APP_VERSION;

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
    // Verificar si el easter egg está activado
    if (typeof window !== 'undefined' && window.localStorage) {
      const easterEggActivated = window.localStorage.getItem(
        'easter_egg_activated'
      );
      if (easterEggActivated === 'true') {
        return true;
      }
    }

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
    const matchingBranch = branchesList.find(
      (branch) => branch.ip && branch.ip.trim() === ip
    );

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

    // Forzar Black Dog si estamos en una IP de sucursal (excepto para soporte2 o easter egg activado)
    effect(() => {
      const ip = this.currentIP();
      const canChange = this.canChangeOrganization();
      const isSupport = this.isSupportUser();

      // Verificar si el easter egg está activado
      const easterEggActivated =
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage.getItem('easter_egg_activated') === 'true'
          : false;

      // No forzar si es soporte2 o si el easter egg está activado
      if (isSupport || easterEggActivated) {
        return;
      }

      if (!canChange && ip && ip !== '127.0.0.1') {
        // Si no se puede cambiar y estamos en una IP de sucursal, forzar Black Dog
        if (this.organizationService.isNaz()) {
          this.organizationService.setOrganization('blackdog');
          logger.debug('🔒 Forzando Black Dog por IP de sucursal');
        }
      }
    });
  }

  nextOrganization() {
    logger.debug('🔄 Cambiando a siguiente organización desde login');
    this.organizationService.nextOrganization();
  }

  previousOrganization() {
    logger.debug('🔄 Cambiando a organización anterior desde login');
    this.organizationService.previousOrganization();
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
    logger.debug('⏳ Esperando a que los company_ids estén listos...');
    await this.organizationService.waitForCompanyIds();

    const currentCompanyId = this.organizationService.getCurrentCompanyId();
    const currentOrg = this.organizationService.currentOrganization;

    if (!currentCompanyId) {
      logger.error('❌ No se pudo obtener company_id. Usando organización por defecto.');
      // Asegurar que al menos tengamos una organización
      if (!currentOrg) {
        this.organizationService.setOrganization('blackdog');
      }
    }

    // Usar Auth0 para iniciar sesión
    this.auth.loginWithRedirect();
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
          logger.debug('📍 IP detectada en login');
        }
      },
      error: () => {
        // Si falla, intentar obtener IP vía WebRTC como fallback
        this.getIPViaWebRTC()
          .then((ip) => {
            this.currentIP.set(ip);
            logger.debug('📍 IP detectada vía WebRTC');
          })
          .catch(() => {
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
    const url = this.apiUrl.build('rest/v1/branches', {
      select: 'ip',
      is_active: 'eq.true',
    });
    this.http
      .get<Branch[]>(url)
      .subscribe({
        next: (branches) => {
          this.branches.set(branches);
          logger.debug(`📍 Sucursales cargadas: ${branches.length}`);
        },
        error: (error) => {
          logger.error('Error obteniendo sucursales', error);
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
}
