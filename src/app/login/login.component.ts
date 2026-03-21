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
import { Toast } from 'primeng/toast';
import { Branch } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { APP_VERSION } from '../version';
import { logger } from '../utils/logger';

@Component({
  selector: 'pt-login',
  imports: [Button, Toast, NgClass],
  template: `
    <div
      class="login-root"
      [ngClass]="{ 'naz-theme': isNaz() }"
    >
      <!-- Fondo en movimiento: misma idea que Docker, transición al cambiar Black Dog ↔ Naz -->
      <div class="login-bg-wrap">
        <div class="login-bg-layer login-bg--blackdog" [class.visible]="!isNaz()"></div>
        <div class="login-bg-layer login-bg--naz" [class.visible]="isNaz()"></div>
      </div>
      <p-toast />

      <!-- ========== VERSIÓN PC (≥768px) — refactor completo (sin p-card, botones nativos) ========== -->
      <div class="login-view login-view--desktop login-pc" data-login-pc="v2">
        <div class="login-pc__inner">
          <header class="login-pc__brand">
            <div class="login-pc__logo-row">
              @if (canChangeOrganization()) {
                <button type="button" class="login-pc__nav" (click)="previousOrganization()" aria-label="Organización anterior">
                  <i class="pi pi-chevron-left"></i>
                </button>
              }
              <div class="login-pc__logo-wrap">
                <img [src]="blackDogLogoPath()" [class]="'login-pc__logo ' + (isNaz() ? 'login-pc__logo--hidden' : '')" alt="Black Dog" />
                <img [src]="nazLogoPath()" [class]="'login-pc__logo ' + (isNaz() ? '' : 'login-pc__logo--hidden')" alt="Naz" />
              </div>
              @if (canChangeOrganization()) {
                <button type="button" class="login-pc__nav" (click)="nextOrganization()" aria-label="Siguiente organización">
                  <i class="pi pi-chevron-right"></i>
                </button>
              }
            </div>
          </header>
          <main class="login-pc__main">
            <section class="login-pc__panel" [ngClass]="{ 'login-pc__panel--naz': isNaz() }">
              <div class="login-pc__heading">
                <h1 class="login-pc__title" [ngClass]="{ 'login-pc__title--naz': isNaz() }">Bienvenido</h1>
                <p class="login-pc__desc" [ngClass]="{ 'login-pc__desc--naz': isNaz() }">Selecciona cómo deseas ingresar</p>
              </div>
              <div class="login-pc__actions-v2">
                <button type="button" class="login-pc__card-btn"
                  [ngClass]="{ 'login-pc__card-btn--active': activeMode() === 'dashboard', 'login-pc__card-btn--naz': isNaz(), 'login-pc__action-btn--fly': isFlying() }"
                  [disabled]="isFlying()" (click)="launchButton()">
                  <div class="login-pc__card-icon" [ngClass]="{ 'login-pc__card-icon--active': activeMode() === 'dashboard' }">
                    <i class="pi pi-th-large"></i>
                  </div>
                  <div class="login-pc__card-text">
                    <span class="login-pc__card-label">Dashboard</span>
                    <span class="login-pc__card-sub">Accede al sistema completo</span>
                  </div>
                  <i class="pi pi-arrow-right login-pc__card-arrow"></i>
                </button>
                <button type="button" class="login-pc__card-btn"
                  [ngClass]="{ 'login-pc__card-btn--active': activeMode() === 'kiosk', 'login-pc__card-btn--naz': isNaz() }"
                  (click)="openKioskMode()">
                  <div class="login-pc__card-icon">
                    <i class="pi pi-desktop"></i>
                  </div>
                  <div class="login-pc__card-text">
                    <span class="login-pc__card-label">Modo Kiosko</span>
                    <span class="login-pc__card-sub">Reloj de marcación para sucursal</span>
                  </div>
                  <i class="pi pi-arrow-right login-pc__card-arrow"></i>
                </button>
              </div>
              <p class="login-pc__footer-text" [ngClass]="{ 'login-pc__footer-text--naz': isNaz() }">People · Sistema de Gestión de Personal</p>
            </section>
          </main>
        </div>
      </div>

      <!-- ========== VERSIÓN MÓVIL (visible hasta 767px) — estructura propia ========== -->
      <div class="login-view login-view--mobile">
        <div class="mobile-layout">
          <header class="mobile-header">
            <div class="mobile-logo-row">
              @if (canChangeOrganization()) {
              <button type="button" class="arrow-button arrow-left" (click)="previousOrganization()" aria-label="Organización anterior">
                <i class="pi pi-chevron-left"></i>
              </button>
              }
              <div class="mobile-logo-wrap">
                <img [src]="blackDogLogoPath()" [class]="'mobile-logo-img logo-blackdog ' + (isNaz() ? 'logo-fade-out' : '')" alt="Black Dog Logo" />
                <img [src]="nazLogoPath()" [class]="'mobile-logo-img logo-naz logo-abs ' + (isNaz() ? '' : 'logo-fade-out')" alt="Naz Logo" />
              </div>
              @if (canChangeOrganization()) {
              <button type="button" class="arrow-button arrow-right" (click)="nextOrganization()" aria-label="Siguiente organización">
                <i class="pi pi-chevron-right"></i>
              </button>
              }
            </div>
          </header>
          <main class="mobile-main">
            <p class="mobile-label">Sistema de Gestión de Personal</p>
            <h1 class="mobile-title">Iniciar sesión</h1>
            <p class="mobile-desc">Ingresa con tu cuenta para continuar</p>
            <div class="mobile-actions">
              <p-button label="Entrar al dashboard" (click)="launchButton()" icon="pi pi-sign-in" size="large"
                severity="secondary"
                [ngClass]="{ 'switch-button-active': activeMode() === 'dashboard', fly: isFlying(), 'naz-button': isNaz() }"
                styleClass="switch-button switch-button-dashboard mobile-btn" [disabled]="isFlying()" />
              <p-button label="Modo Kiosko" (click)="openKioskMode()" icon="pi pi-desktop" size="large"
                severity="secondary"
                [ngClass]="{ 'switch-button-active': activeMode() === 'kiosk', 'naz-button': isNaz() }"
                styleClass="switch-button switch-button-kiosk mobile-btn" />
            </div>
          </main>
        </div>
      </div>

      <!-- Versión en la esquina inferior derecha (un clic = sonido + easter egg) -->
      <div class="version-badge" [ngClass]="{ 'naz-version': isNaz(), 'version-badge--pop': easterEggPop() }" (click)="onVersionClick()" title="¡Tócame!">
        v{{ appVersion }}
      </div>
      @if (easterEggBurst()) {
        <div class="easter-egg-burst" [class.easter-egg-burst--visible]="easterEggBurst()">{{ easterEggBurst() }}</div>
      }
    </div>
  `,
  styles: `
    /* ========== ROOT — transición suave entre Black Dog y Naz ========== */
    .login-root {
      position: relative;
      width: 100%;
      height: 100vh;
      max-height: 100dvh;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      z-index: 0;
      transition: background 0.5s ease;
    }

    /* Fondo en movimiento: capas con transición (Naz ya no usa ::before) */
    .login-bg-wrap {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .login-bg-layer {
      position: absolute;
      inset: -50%;
      width: 200%;
      height: 200%;
      opacity: 0;
      transition: opacity 0.8s ease;
      pointer-events: none;
    }
    .login-bg-layer.visible {
      opacity: 1;
      z-index: 1;
    }
    /* Black Dog: gradiente oscuro en movimiento (solo en modo oscuro) */
    :host-context(html.dark) .login-bg--blackdog {
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 25%, #000000 50%, #0d0d0d 75%, #2a2a2a 100%);
      background-size: 400% 400%;
      animation: brutalGradientMove 12s ease-in-out infinite;
    }
    :host-context(html.dark) .login-bg--blackdog::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: 
        radial-gradient(ellipse 80% 50% at 20% 40%, rgba(251, 191, 36, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse 60% 80% at 80% 60%, rgba(30, 30, 30, 0.9) 0%, transparent 50%);
      animation: brutalFloat 18s ease-in-out infinite;
      pointer-events: none;
    }
    :host-context(html.dark) .login-bg--blackdog::after {
      content: '';
      position: absolute;
      inset: -20%;
      background: linear-gradient(125deg, #111 0%, transparent 40%, #1a1a1a 70%, #0d0d0d 100%);
      background-size: 300% 300%;
      animation: brutalGradientMove 20s ease-in-out infinite reverse;
      opacity: 0.7;
      pointer-events: none;
    }
    @keyframes brutalGradientMove {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes brutalFloat {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      33% { transform: translate(5%, -8%) rotate(3deg); }
      66% { transform: translate(-6%, 5%) rotate(-2deg); }
    }
    /* Naz: lava plateada en movimiento */
    .login-bg--naz {
      background: #000000;
    }
    .login-bg--naz::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.6) 2%, rgba(229,226,223,0.65) 4%, rgba(198,194,191,0.55) 6%, transparent 8%, transparent 12%, rgba(198,194,191,0.5) 14%, rgba(229,226,223,0.6) 16%, rgba(255,255,255,0.55) 18%, transparent 20%),
        linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(229,226,223,0.7) 25%, rgba(198,194,191,0.6) 50%, rgba(229,226,223,0.65) 75%, rgba(255,255,255,0.55) 100%);
      animation: silverLavaFlow 25s ease-in-out infinite;
      z-index: 0;
      filter: blur(25px);
      pointer-events: none;
    }
    .login-bg--naz::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(-45deg, rgba(229,226,223,0.55) 0%, rgba(255,255,255,0.65) 2%, rgba(198,194,191,0.6) 4%, rgba(229,226,223,0.5) 6%, transparent 8%, transparent 12%, rgba(255,255,255,0.55) 14%, rgba(198,194,191,0.65) 16%, rgba(229,226,223,0.6) 18%, transparent 20%),
        linear-gradient(-135deg, rgba(198,194,191,0.7) 0%, rgba(229,226,223,0.75) 30%, rgba(255,255,255,0.65) 60%, rgba(198,194,191,0.6) 100%);
      animation: silverLavaFlow 30s ease-in-out infinite reverse;
      z-index: 0;
      filter: blur(30px);
      pointer-events: none;
    }
    @keyframes silverLavaFlow {
      0% { transform: translate(-20%, -20%) rotate(0deg) scale(1); opacity: 0.9; }
      25% { transform: translate(10%, 5%) rotate(5deg) scale(1.1); opacity: 1; }
      50% { transform: translate(5%, 15%) rotate(-3deg) scale(0.95); opacity: 0.85; }
      75% { transform: translate(-10%, 8%) rotate(4deg) scale(1.05); opacity: 0.95; }
      100% { transform: translate(-20%, -20%) rotate(0deg) scale(1); opacity: 0.9; }
    }

    .login-view--desktop,
    .login-view--mobile,
    .version-badge {
      position: relative;
      z-index: 1;
    }

    /* ========== VISIBILIDAD POR VERSIÓN (PC vs MÓVIL) ========== */
    .login-view--desktop {
      display: none;
      flex: 1;
      min-height: 0;
      overflow: auto;
      width: 100%;
    }
    .login-view--mobile {
      display: flex;
      flex: 1;
      min-height: 0;
      width: 100%;
    }
    @media (min-width: 768px) {
      .login-view--desktop {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .login-view--mobile {
        display: none !important;
      }
    }
    @media (max-width: 767px) {
      .login-view--desktop {
        display: none !important;
      }
      .login-view--mobile {
        display: flex !important;
      }
    }

    /* Modo Oscuro - Fondo por defecto */
    :host-context(html.dark) .login-root {
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 25%, #000000 50%, #0d0d0d 75%, #2a2a2a 100%);
    }

    /* Modo Claro - Fondo claro */
    :host-context(html.light) .login-root {
      background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 25%, #fafafa 50%, #ffffff 75%, #f0f0f0 100%);
    }

    /* ========== VERSIÓN PC — refactor completo (BEM .login-pc) ========== */
    .login-pc {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      padding: 2rem;
    }
    .login-pc__inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      width: 100%;
      max-width: 420px;
    }
    .login-pc__brand {
      flex-shrink: 0;
      animation: login-fadeUp 0.6s ease-out both;
    }
    .login-pc__logo-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }
    .login-pc__logo-wrap {
      position: relative;
      width: 260px;
      height: 8rem;
    }
    @media (min-width: 1024px) {
      .login-pc__logo-wrap { width: 320px; height: 10rem; }
    }
    .login-pc__logo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: opacity 0.5s ease;
      animation: login-logoPulse 3s ease-in-out infinite;
    }
    @keyframes login-logoPulse {
      0%, 100% { filter: drop-shadow(0 0 0 transparent); }
      50% { filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.12)); }
    }
    .login-pc__logo--hidden {
      opacity: 0;
      pointer-events: none;
    }
    .login-pc__nav {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.35s ease, border-color 0.35s ease, color 0.35s ease, transform 0.2s ease;
    }
    .login-pc__nav:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.35);
      color: #fff;
      transform: scale(1.08);
    }
    .login-pc__nav:active {
      transform: scale(0.95);
    }
    .login-pc__nav i {
      font-size: 1.15rem;
    }
    .naz-theme .login-pc__nav {
      border-color: rgba(255, 255, 255, 0.25);
      color: rgba(255, 255, 255, 0.85);
    }
    .naz-theme .login-pc__nav:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
      color: #fff;
    }
    .login-pc__main {
      width: 100%;
      animation: login-fadeUp 0.6s ease-out 0.15s both;
    }
    .login-pc__panel {
      width: 100%;
      border-radius: 16px;
      padding: 2rem 1.75rem;
      transition: background 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease;
    }
    :host-context(html.dark) .login-pc__panel {
      background: rgba(18, 18, 20, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
    }
    :host-context(html.light) .login-pc__panel {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .login-pc__panel--naz {
      background: #0d0d0d !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      box-shadow: none !important;
    }
    .login-pc__heading {
      text-align: center;
      margin-bottom: 1.75rem;
      animation: login-fadeUp 0.5s ease-out 0.3s both;
    }
    .login-pc__subtitle {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin: 0 0 0.5rem 0;
      transition: color 0.5s ease;
    }
    :host-context(html.dark) .login-pc__subtitle {
      color: rgba(220, 215, 210, 0.7);
    }
    :host-context(html.light) .login-pc__subtitle {
      color: rgba(100, 100, 100, 0.8);
    }
    .login-pc__subtitle--naz {
      color: #c6c2bf !important;
    }
    .login-pc__title {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.25;
      margin: 0 0 0.5rem 0;
      transition: color 0.5s ease;
    }
    :host-context(html.dark) .login-pc__title {
      color: #fafafa;
    }
    :host-context(html.light) .login-pc__title {
      color: #1f2937;
    }
    .login-pc__title--naz {
      color: #fff !important;
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 400;
    }
    .login-pc__desc {
      font-size: 0.875rem;
      color: rgba(200, 198, 195, 0.85);
      margin: 0;
      line-height: 1.45;
      transition: color 0.5s ease;
    }
    :host-context(html.light) .login-pc__desc {
      color: rgba(75, 85, 99, 0.9);
    }
    .login-pc__desc--naz {
      color: #c6c2bf !important;
    }
    .login-pc__actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    /* V2 card-style action buttons */
    .login-pc__actions-v2 {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .login-pc__actions-v2 .login-pc__card-btn:nth-child(1) { animation: login-fadeUp 0.4s ease-out 0.4s both; }
    .login-pc__actions-v2 .login-pc__card-btn:nth-child(2) { animation: login-fadeUp 0.4s ease-out 0.5s both; }
    .login-pc__card-btn {
      display: flex;
      align-items: center;
      gap: 1rem;
      width: 100%;
      padding: 1rem 1.25rem;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      font-family: inherit;
    }
    .login-pc__card-btn:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .login-pc__card-btn--active {
      background: rgba(251, 191, 36, 0.1) !important;
      border-color: rgba(251, 191, 36, 0.3) !important;
    }
    .login-pc__card-btn--active .login-pc__card-arrow { color: #fbbf24; }
    .login-pc__card-btn:disabled { opacity: 0.7; cursor: not-allowed; }
    .login-pc__card-icon {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .login-pc__card-icon i { font-size: 1.125rem; color: rgba(255, 255, 255, 0.6); }
    .login-pc__card-icon--active { background: rgba(251, 191, 36, 0.15); }
    .login-pc__card-icon--active i { color: #fbbf24; }
    .login-pc__card-text { flex: 1; min-width: 0; }
    .login-pc__card-label { display: block; font-size: 0.9375rem; font-weight: 600; color: #fff; }
    .login-pc__card-sub { display: block; font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); margin-top: 2px; }
    .login-pc__card-arrow { font-size: 0.75rem; color: rgba(255, 255, 255, 0.15); transition: color 0.2s, transform 0.2s; flex-shrink: 0; }
    .login-pc__card-btn:hover .login-pc__card-arrow { color: rgba(255, 255, 255, 0.4); }
    .login-pc__footer-text {
      text-align: center;
      font-size: 0.65rem;
      color: rgba(255, 255, 255, 0.2);
      margin: 1.5rem 0 0;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      animation: login-fadeUp 0.4s ease-out 0.6s both;
    }
    @keyframes login-fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .login-pc__footer-text--naz { color: rgba(198, 194, 191, 0.3); }
    /* Naz card buttons */
    .login-pc__card-btn--naz { border-color: rgba(255, 255, 255, 0.12); }
    .login-pc__card-btn--naz:hover { border-color: rgba(255, 255, 255, 0.25); }
    .login-pc__card-btn--active.login-pc__card-btn--naz {
      background: rgba(255, 255, 255, 0.08) !important;
      border-color: rgba(255, 255, 255, 0.25) !important;
    }
    :host-context(html.light) .login-pc__card-btn { border-color: rgba(0, 0, 0, 0.08); background: rgba(0, 0, 0, 0.02); }
    :host-context(html.light) .login-pc__card-btn:hover { background: rgba(0, 0, 0, 0.04); border-color: rgba(0, 0, 0, 0.12); }
    :host-context(html.light) .login-pc__card-icon { background: rgba(0, 0, 0, 0.04); }
    :host-context(html.light) .login-pc__card-icon i { color: rgba(0, 0, 0, 0.5); }
    :host-context(html.light) .login-pc__card-label { color: #1f2937; }
    :host-context(html.light) .login-pc__card-sub { color: rgba(0, 0, 0, 0.4); }
    :host-context(html.light) .login-pc__card-arrow { color: rgba(0, 0, 0, 0.15); }
    :host-context(html.light) .login-pc__card-btn--active { background: rgba(251, 191, 36, 0.08) !important; border-color: rgba(251, 191, 36, 0.3) !important; }
    :host-context(html.light) .login-pc__card-icon--active { background: rgba(251, 191, 36, 0.12); }
    :host-context(html.light) .login-pc__card-icon--active i { color: #d97706; }
    :host-context(html.light) .login-pc__footer-text { color: rgba(0, 0, 0, 0.2); }
    /* Botones nativos PC — mismo estilo para ambos, sin glow */
    .login-pc__action-btn {
      min-width: 200px;
      min-height: 3.5rem;
      padding: 1rem 2rem;
      font-size: 1.0625rem;
      font-weight: 500;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: transparent;
      color: rgba(255, 255, 255, 0.85);
      box-shadow: none;
      cursor: pointer;
      transition: background 0.35s ease, border-color 0.35s ease, color 0.35s ease;
      font-family: inherit;
    }
    :host-context(html.light) .login-pc__action-btn:not(.login-pc__action-btn--active):not(.login-pc__action-btn--naz) {
      border-color: rgba(0, 0, 0, 0.12);
      color: rgba(0, 0, 0, 0.7);
    }
    .login-pc__action-btn:not(.login-pc__action-btn--active):not(.login-pc__action-btn--naz):hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.35);
      color: #fff;
    }
    :host-context(html.light) .login-pc__action-btn:not(.login-pc__action-btn--active):not(.login-pc__action-btn--naz):hover {
      border-color: rgba(245, 158, 11, 0.5);
      color: rgba(180, 83, 9, 0.95);
    }
    /* Activo Black Dog — mismo color exacto para ambos botones, sin sombra */
    .login-pc__action-btn--active:not(.login-pc__action-btn--naz) {
      background: #fbbf24;
      border-color: #fbbf24;
      color: #1a1a1a;
      box-shadow: none;
    }
    .login-pc__action-btn--active:not(.login-pc__action-btn--naz):hover {
      background: #f59e0b;
      border-color: #f59e0b;
      color: #1a1a1a;
      box-shadow: none;
    }
    .login-pc__action-btn--active.login-pc__action-btn--naz {
      background: transparent;
      border: 1px solid #fff;
      color: #fff;
      box-shadow: none;
    }
    .login-pc__action-btn--active.login-pc__action-btn--naz:hover {
      background: #e5e2df;
      border-color: #e5e2df;
      color: #000;
      box-shadow: none;
    }
    .login-pc__action-btn--naz:not(.login-pc__action-btn--active) {
      background: #e5e2df;
      border-color: #e5e2df;
      color: #000;
    }
    .login-pc__action-btn:focus,
    .login-pc__action-btn:focus-visible {
      outline: none;
      box-shadow: none;
    }
    .login-pc__action-btn:disabled {
      opacity: 0.8;
      cursor: not-allowed;
    }
    .login-pc__action-btn--fly {
      animation: login-pc-fly 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      pointer-events: none;
    }
    @keyframes login-pc-fly {
      0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translate(280px, -380px) rotate(-24deg) scale(0.55); opacity: 0; visibility: hidden; }
    }
    .mobile-logo-wrap {
      position: relative;
      display: inline-block;
      height: 5.5rem;
      width: 170px;
    }
    .mobile-logo-wrap .mobile-logo-img {
      position: absolute;
      inset: 0;
      width: 100% !important;
      height: 100% !important;
      max-width: none;
      object-fit: contain;
      transition: opacity 0.5s ease;
    }
    .mobile-logo-wrap .mobile-logo-img.logo-fade-out {
      opacity: 0;
      pointer-events: none;
    }

    /* ============================================
       TEMA BLACK DOG - ESTILOS
       ============================================ */
    
    /* Fondo Black Dog - Modo Oscuro (ya aplicado en .login-root arriba) */
    /* Fondo Black Dog - Modo Claro (ya aplicado en .login-root arriba) */

    /* ============================================
       TEMA NAZ - ESTILOS MINIMALISTAS PREMIUM
       ============================================ */
    
    /* Fondo Naz - negro con animación de lava lamp plateada */
    .naz-theme .login-root {
      background: #000000;
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
      
      .login-bg--blackdog,
      .login-bg--blackdog::before,
      .login-bg--blackdog::after,
      .login-bg--naz::before,
      .login-bg--naz::after {
        animation: none !important;
        transform: none !important;
      }
      
      .login-pc__logo {
        animation: none !important;
      }
      
      .login-pc__panel {
        animation: none !important;
      }
    }
    
    /* Smooth transitions for all interactive elements */
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
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
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.75);
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      transition: background 0.45s ease, border-color 0.45s ease, color 0.45s ease, transform 0.2s ease;
      justify-content: center;
      cursor: pointer;
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
       VERSIÓN MÓVIL — estructura propia (sin card)
       ============================================ */
    .login-view--mobile .mobile-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      width: 100%;
      overflow: hidden;
    }
    .login-view--mobile .mobile-header {
      flex-shrink: 0;
      padding: 3.25rem 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-view--mobile .mobile-logo-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .login-view--mobile .mobile-logo-img {
      height: 5.5rem;
      width: auto;
      max-width: 72vw;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
    }
    .login-view--mobile .mobile-main {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.25rem 1rem 1.5rem;
      text-align: center;
    }
    .login-view--mobile .mobile-label {
      font-size: 0.625rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin: 0 0 0.25rem 0;
    }
    :host-context(html.dark) .login-view--mobile .mobile-label {
      color: rgba(220, 215, 210, 0.75);
    }
    :host-context(html.light) .login-view--mobile .mobile-label {
      color: rgba(100, 100, 100, 0.85);
    }
    .login-view--mobile .mobile-title {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 0.375rem 0;
      line-height: 1.2;
    }
    :host-context(html.dark) .login-view--mobile .mobile-title {
      color: #fafafa;
    }
    :host-context(html.light) .login-view--mobile .mobile-title {
      color: #1f2937;
    }
    .login-view--mobile .mobile-desc {
      font-size: 0.8125rem;
      margin: 0 0 1.25rem 0;
      line-height: 1.4;
    }
    :host-context(html.dark) .login-view--mobile .mobile-desc {
      color: rgba(200, 198, 195, 0.85);
    }
    :host-context(html.light) .login-view--mobile .mobile-desc {
      color: rgba(75, 85, 99, 0.9);
    }
    /* Móvil: transición de color al cambiar tema */
    .login-view--mobile .mobile-label,
    .login-view--mobile .mobile-title,
    .login-view--mobile .mobile-desc {
      transition: color 0.5s ease;
    }
    /* Tema Naz en móvil — mismos colores que desktop */
    .naz-theme .login-view--mobile .mobile-label,
    .naz-theme .login-view--mobile .mobile-desc {
      color: #C6C2BF !important;
    }
    .naz-theme .login-view--mobile .mobile-title {
      color: #FFFFFF !important;
    }
    .login-view--mobile .mobile-actions {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      width: 100%;
      max-width: 320px;
    }
    .login-view--mobile .mobile-btn ::ng-deep .p-button {
      width: 100% !important;
      min-width: 100% !important;
      justify-content: center !important;
      padding: 1rem 1.5rem !important;
      min-height: 3.5rem !important;
      font-size: 1.0625rem !important;
      border-radius: 12px !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 0.5rem !important;
    }
    /* Móvil: botones activos idénticos (Black Dog), sin glow */
    .login-view--mobile .switch-button-dashboard.switch-button-active:not(.naz-button) ::ng-deep .p-button,
    .login-view--mobile .switch-button-kiosk.switch-button-active:not(.naz-button) ::ng-deep .p-button {
      background: #fbbf24 !important;
      box-shadow: none !important;
    }

    /* ============================================
       TEMA NAZ - ESTILOS MINIMALISTAS PREMIUM
       ============================================ */
    .naz-theme {
      background: #000000 !important;
    }
    /* .login-root fondo Naz ya se hace con ::before (crossfade) */

    /* Logo Naz */
    .logo-naz {
      filter: none !important;
    }

    /* Botones Naz (móvil) — transición suave */
    .naz-theme .switch-button ::ng-deep .p-button {
      transition: background 0.5s ease, border-color 0.5s ease, color 0.5s ease, box-shadow 0.5s ease !important;
    }
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

    /* Flechas en tema Naz — transición suave */
    .naz-theme .arrow-button {
      border-color: rgba(255, 255, 255, 0.3);
      color: rgba(255, 255, 255, 0.8);
      transition: background 0.5s ease, border-color 0.5s ease, color 0.5s ease !important;
    }

    .naz-theme .arrow-button:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
      color: #FFFFFF;
    }

    /* Badge de versión: no seleccionable + efecto llamativo */
    .version-badge {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      padding: 0.375rem 0.75rem;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      z-index: 1000;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: transform 0.2s ease, box-shadow 0.3s ease, background 0.45s ease, border-color 0.45s ease, color 0.45s ease;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      letter-spacing: 0.02em;
      animation: version-glow 3s ease-in-out infinite;
    }

    .version-badge:hover {
      transform: scale(1.05);
    }

    .version-badge:active {
      transform: scale(0.98);
      animation: none;
    }

    .version-badge--pop {
      transform: scale(1.12);
      box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.25), 0 0 40px rgba(120, 180, 255, 0.3);
    }

    /* Easter egg: emoji que explota y flota */
    .easter-egg-burst {
      position: fixed;
      bottom: 3rem;
      right: 1.5rem;
      font-size: 4rem;
      line-height: 1;
      z-index: 1001;
      pointer-events: none;
      opacity: 0;
      transform: scale(0.3) translateY(0);
      animation: easter-egg-burst 1.2s ease-out forwards;
    }

    .easter-egg-burst--visible {
      opacity: 1;
    }

    @keyframes easter-egg-burst {
      0% {
        opacity: 0;
        transform: scale(0.3) translateY(0);
        filter: blur(0);
      }
      15% {
        opacity: 1;
        transform: scale(1.4) translateY(-0.5rem);
        filter: blur(0);
      }
      30% {
        transform: scale(1.2) translateY(-1.5rem);
      }
      100% {
        opacity: 0;
        transform: scale(1.5) translateY(-4rem);
        filter: blur(2px);
      }
    }

    @keyframes version-glow {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.15); }
    }

    /* Invita sutilmente a tocarlo: pulso suave que llama la atención */
    @keyframes version-tap-me {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(120, 140, 200, 0.08);
      }
      50% {
        transform: scale(1.03);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), 0 0 32px rgba(120, 160, 255, 0.14);
      }
    }

    :host-context(html.dark) .version-badge {
      animation: version-tap-me 2.5s ease-in-out infinite, version-glow 4s ease-in-out infinite;
    }

    @keyframes version-tap-me-light {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 20px rgba(100, 130, 200, 0.06);
      }
      50% {
        transform: scale(1.03);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 0 32px rgba(100, 150, 255, 0.12);
      }
    }

    :host-context(html.light) .version-badge {
      animation: version-tap-me-light 2.5s ease-in-out infinite, version-glow 4s ease-in-out infinite;
    }

    :host-context(html.dark) .version-badge {
      background: linear-gradient(135deg, rgba(40, 40, 45, 0.9) 0%, rgba(25, 25, 30, 0.95) 100%);
      border: 1px solid rgba(180, 180, 200, 0.25);
      color: rgba(230, 230, 240, 0.95);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(120, 140, 200, 0.08);
    }

    :host-context(html.dark) .version-badge:hover {
      background: linear-gradient(135deg, rgba(50, 50, 58, 0.95) 0%, rgba(35, 35, 42, 0.98) 100%);
      color: #fff;
      border-color: rgba(180, 200, 255, 0.35);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 28px rgba(120, 160, 255, 0.12);
      animation: none;
    }

    :host-context(html.light) .version-badge {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 255, 0.98) 100%);
      border: 1px solid rgba(100, 120, 180, 0.2);
      color: rgba(50, 65, 110, 0.9);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 20px rgba(100, 130, 200, 0.06);
    }

    :host-context(html.light) .version-badge:hover {
      background: linear-gradient(135deg, #fff 0%, rgba(245, 248, 255, 0.98) 100%);
      color: rgba(30, 50, 100, 0.95);
      border-color: rgba(100, 140, 220, 0.3);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 0 28px rgba(100, 150, 255, 0.15);
      animation: none;
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

  /** Índice para ciclar sonidos al tocar la versión */
  private versionSoundIndex = 0;
  /** Sonidos disponibles (ciclo al tocar versión) */
  private readonly VERSION_SOUNDS = ['/sounds/bark.mp3', '/sounds/meow.mp3', '/sounds/squirrel.mp3', '/sounds/cockatoo.mp3'];
  /** Emojis por sonido (mismo orden que VERSION_SOUNDS) */
  private readonly VERSION_EMOJIS = ['🐕', '🐱', '🐿️', '🦜'];
  /** Emoji que explota al hacer clic (easter egg) */
  easterEggBurst = signal<string | null>(null);
  /** Clase "pop" en el badge al hacer clic */
  easterEggPop = signal(false);

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

  // Rutas de logos para crossfade al cambiar tema
  public blackDogLogoPath = (): string => 'images/blackdog.png';
  public nazLogoPath = (): string => 'images/Naz_Logo.jpg';
  public logoPath = computed(() =>
    this.isNaz() ? this.nazLogoPath() : this.blackDogLogoPath()
  );

  constructor() {
    // Si hay returnTo en la URL, guardarlo en sessionStorage para post-login
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get('returnTo');
      if (returnTo && returnTo.startsWith('https://') && returnTo.includes('blackdogpanama.com')) {
        sessionStorage.setItem('auth_returnTo', returnTo);
      }
    }

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
    const savedReturnTo = typeof window !== 'undefined' ? sessionStorage.getItem('auth_returnTo') : null;
    this.auth.loginWithRedirect(savedReturnTo ? { appState: { returnTo: savedReturnTo } } : undefined);
  }

  openKioskMode() {
    const org = this.organizationService.currentOrganization;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const kioskPath = isMobile ? 'timeclock-kiosk-mobile' : 'timeclock-kiosk';
    window.open(`/${kioskPath}?org=${org}`, isMobile ? '_self' : '_blank');
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

  /**
   * Un clic en la versión: reproduce el siguiente sonido del ciclo + easter egg épico (emoji que explota)
   */
  onVersionClick(): void {
    const idx = this.versionSoundIndex % this.VERSION_SOUNDS.length;
    const src = this.VERSION_SOUNDS[idx];
    const emoji = this.VERSION_EMOJIS[idx];
    this.versionSoundIndex += 1;

    try {
      const audio = new Audio(src);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}

    this.easterEggPop.set(true);
    this.easterEggBurst.set(emoji);
    setTimeout(() => this.easterEggPop.set(false), 220);
    setTimeout(() => this.easterEggBurst.set(null), 1400);
  }
}
