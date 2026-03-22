import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Branch } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { APP_VERSION } from '../version';
import { logger } from '../utils/logger';

@Component({
  selector: 'pt-login',
  imports: [Toast, NgClass],
  template: `
    <div class="lr" [ngClass]="{ 'naz': isNaz() }">

      <!-- Animated background -->
      <div class="lr__bg">
        <div class="lr__orb lr__orb--1"></div>
        <div class="lr__orb lr__orb--2"></div>
        <div class="lr__orb lr__orb--3"></div>
        <div class="lr__grid"></div>
        <!-- Naz: static elegant dark overlay -->
        <div class="lr__naz-overlay" [class.lr__naz-overlay--on]="isNaz()"></div>
      </div>

      <p-toast />

      <!-- ═══════════════════════════════
           DESKTOP ≥768px
      ═══════════════════════════════ -->
      <div class="lr__view lr__view--desk">
        <div class="lr__split">

          <!-- LEFT: Brand -->
          <aside class="lr__brand">
            <div class="lr__brand-inner">
              <div class="lr__logo-row">
                @if (canChangeOrganization()) {
                  <button type="button" class="lr__nav" (click)="previousOrganization()" aria-label="Organización anterior">
                    <i class="pi pi-chevron-left"></i>
                  </button>
                }
                <div class="lr__logo-wrap" (click)="onLogoTap()" role="button" tabindex="0" [attr.aria-label]="'Logo Black Dog, toca ' + (6 - logoTapCount()) + ' veces'">
                  <img [src]="blackDogLogoPath()" [class]="'lr__logo ' + (isNaz() ? 'lr__logo--off' : '')" alt="Black Dog" />
                  <img [src]="nazLogoPath()" [class]="'lr__logo ' + (isNaz() ? '' : 'lr__logo--off')" alt="Naz" />
                  <div class="lr__logo-tap-ring" [class.lr__logo-tap-ring--on]="logoFlash()"></div>
                  @if (logoTapCount() > 0 && logoTapCount() < 6) {
                    <div class="lr__logo-tap-counter">{{ logoTapCount() }}/6</div>
                  }
                </div>
                @if (canChangeOrganization()) {
                  <button type="button" class="lr__nav" (click)="nextOrganization()" aria-label="Siguiente organización">
                    <i class="pi pi-chevron-right"></i>
                  </button>
                }
              </div>
              <div class="lr__brand-tag">
                <span class="lr__brand-dot"></span>
                <span class="lr__brand-tag-text">Sistema de Gestión de Personal</span>
              </div>
              <!-- Live clock -->
              <div class="lr__clock" aria-live="polite" aria-label="Hora actual">
                <div class="lr__clock-time">{{ currentTime() }}</div>
                <div class="lr__clock-date">{{ currentDate() }}</div>
              </div>
              <!-- Feature pills -->
              <div class="lr__pills" aria-hidden="true">
                <span class="lr__pill"><i class="pi pi-shield"></i>Auth0</span>
                <span class="lr__pill"><i class="pi pi-bolt"></i>Tiempo real</span>
                <span class="lr__pill"><i class="pi pi-wallet"></i>Nómina</span>
              </div>
              <div class="lr__rings" aria-hidden="true">
                <div class="lr__ring lr__ring--1"></div>
                <div class="lr__ring lr__ring--2"></div>
                <div class="lr__ring lr__ring--3"></div>
              </div>
            </div>
          </aside>

          <div class="lr__divider" aria-hidden="true"></div>

          <!-- RIGHT: Login panel -->
          <main class="lr__panel-wrap">
            <div class="lr__panel" [ngClass]="{ 'lr__panel--naz': isNaz() }">
              <div class="lr__panel-head">
                <div class="lr__eyebrow">Acceso</div>
                <h1 class="lr__title" [ngClass]="{ 'lr__title--naz': isNaz() }">Bienvenido</h1>
                <p class="lr__desc">Selecciona cómo deseas ingresar</p>
              </div>
              <div class="lr__cards">
                <button type="button" class="lr__card"
                  [ngClass]="{ 'lr__card--on': activeMode() === 'dashboard', 'lr__card--naz': isNaz(), 'lr__card--fly': isFlying() }"
                  [disabled]="isFlying()" (click)="launchButton()">
                  <span class="lr__card-shine"></span>
                  <span class="lr__card-icon" [ngClass]="{ 'lr__card-icon--on': activeMode() === 'dashboard' }">
                    <i class="pi pi-th-large"></i>
                  </span>
                  <span class="lr__card-body">
                    <span class="lr__card-label">Dashboard</span>
                    <span class="lr__card-sub">Accede al sistema completo</span>
                  </span>
                  <i class="pi pi-arrow-right lr__card-arrow"></i>
                </button>
                <button type="button" class="lr__card"
                  [ngClass]="{ 'lr__card--on': activeMode() === 'kiosk', 'lr__card--naz': isNaz() }"
                  (click)="openKioskMode()">
                  <span class="lr__card-shine"></span>
                  <span class="lr__card-icon">
                    <i class="pi pi-desktop"></i>
                  </span>
                  <span class="lr__card-body">
                    <span class="lr__card-label">Modo Kiosko</span>
                    <span class="lr__card-sub">Reloj de marcación para sucursal</span>
                  </span>
                  <i class="pi pi-arrow-right lr__card-arrow"></i>
                </button>
              </div>
            </div>
          </main>

        </div>
      </div>

      <!-- ═══════════════════════════════
           MOBILE <768px
      ═══════════════════════════════ -->
      <div class="lr__view lr__view--mob">
        <div class="mob">

          <header class="mob__head">
            <div class="mob__logo-row">
              @if (canChangeOrganization()) {
                <button type="button" class="lr__nav" (click)="previousOrganization()" aria-label="Organización anterior">
                  <i class="pi pi-chevron-left"></i>
                </button>
              }
              <div class="mob__logo-wrap" (click)="onLogoTap()" role="button" tabindex="0">
                <img [src]="blackDogLogoPath()" [class]="'mob__logo ' + (isNaz() ? 'mob__logo--off' : '')" alt="Black Dog" />
                <img [src]="nazLogoPath()" [class]="'mob__logo ' + (isNaz() ? '' : 'mob__logo--off')" alt="Naz" />
                <div class="lr__logo-tap-ring" [class.lr__logo-tap-ring--on]="logoFlash()"></div>
                @if (logoTapCount() > 0 && logoTapCount() < 6) {
                  <div class="lr__logo-tap-counter">{{ logoTapCount() }}/6</div>
                }
              </div>
              @if (canChangeOrganization()) {
                <button type="button" class="lr__nav" (click)="nextOrganization()" aria-label="Siguiente organización">
                  <i class="pi pi-chevron-right"></i>
                </button>
              }
            </div>
          </header>

          <main class="mob__main">
            <div class="mob__glass" [ngClass]="{ 'mob__glass--naz': isNaz() }">
              <div class="lr__clock mob__clock" aria-live="polite">
                <div class="lr__clock-time">{{ currentTime() }}</div>
                <div class="lr__clock-date">{{ currentDate() }}</div>
              </div>
              <div class="lr__eyebrow">Acceso</div>
              <h1 class="lr__title" [ngClass]="{ 'lr__title--naz': isNaz() }">Bienvenido</h1>
              <p class="lr__desc">Selecciona cómo deseas ingresar</p>
              <div class="lr__cards lr__cards--mob">
                <button type="button" class="lr__card"
                  [ngClass]="{ 'lr__card--on': activeMode() === 'dashboard', 'lr__card--naz': isNaz(), 'lr__card--fly': isFlying() }"
                  [disabled]="isFlying()" (click)="launchButton()">
                  <span class="lr__card-shine"></span>
                  <span class="lr__card-icon" [ngClass]="{ 'lr__card-icon--on': activeMode() === 'dashboard' }">
                    <i class="pi pi-th-large"></i>
                  </span>
                  <span class="lr__card-body">
                    <span class="lr__card-label">Dashboard</span>
                    <span class="lr__card-sub">Accede al sistema completo</span>
                  </span>
                  <i class="pi pi-arrow-right lr__card-arrow"></i>
                </button>
                <button type="button" class="lr__card"
                  [ngClass]="{ 'lr__card--on': activeMode() === 'kiosk', 'lr__card--naz': isNaz() }"
                  (click)="openKioskMode()">
                  <span class="lr__card-shine"></span>
                  <span class="lr__card-icon">
                    <i class="pi pi-desktop"></i>
                  </span>
                  <span class="lr__card-body">
                    <span class="lr__card-label">Modo Kiosko</span>
                    <span class="lr__card-sub">Reloj de marcación para sucursal</span>
                  </span>
                  <i class="pi pi-arrow-right lr__card-arrow"></i>
                </button>
              </div>
            </div>
          </main>

        </div>
      </div>

      <!-- Footer -->
      <footer class="lr__footer" [ngClass]="{ 'lr__footer--naz': isNaz() }">
        <span>© {{ currentYear }} Black Dog Panama</span>
        <span class="lr__footer-sep" aria-hidden="true">·</span>
        <span>People HRMS</span>
      </footer>

      <!-- Version badge -->
      <div class="ver-badge" [ngClass]="{ 'ver-badge--naz': isNaz(), 'ver-badge--pop': easterEggPop() }"
        (click)="onVersionClick()" title="¡Tócame!">
        v{{ appVersion }}
      </div>
      @if (easterEggBurst()) {
        <div class="easter-burst" [class.easter-burst--on]="easterEggBurst()">{{ easterEggBurst() }}</div>
      }
    </div>
  `,
  styles: `
    /* ═══════════════════════════════════════
       TOKENS
    ═══════════════════════════════════════ */
    :host {
      --gold: #fbbf24;
      --gold-dim: rgba(251,191,36,0.1);
      --gold-border: rgba(251,191,36,0.32);
      --bg: #06060a;
      --surface: rgba(11,11,15,0.9);
      --border: rgba(255,255,255,0.07);
      --border-hover: rgba(255,255,255,0.14);
      --text-1: #f5f5f7;
      --text-2: rgba(255,255,255,0.42);
      --text-3: rgba(255,255,255,0.18);
      --footer-h: 40px;
      --radius-panel: 22px;
      --radius-card: 16px;
      --radius-icon: 13px;
    }

    /* ═══════════════════════════════════════
       ROOT
    ═══════════════════════════════════════ */
    .lr {
      position: relative;
      width: 100%;
      height: 100vh;
      max-height: 100dvh;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: var(--bg);
    }
    .naz.lr { background: #000; }

    /* ═══════════════════════════════════════
       BACKGROUND
    ═══════════════════════════════════════ */
    .lr__bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .lr__orb {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      will-change: transform;
    }
    .lr__orb--1 {
      width: 640px; height: 640px;
      top: -180px; left: -160px;
      background: radial-gradient(circle at 40% 40%, rgba(251,191,36,0.1) 0%, transparent 68%);
      filter: blur(55px);
      animation: orb1 22s ease-in-out infinite;
    }
    .lr__orb--2 {
      width: 480px; height: 480px;
      bottom: -130px; right: -80px;
      background: radial-gradient(circle at 60% 60%, rgba(251,191,36,0.065) 0%, transparent 70%);
      filter: blur(75px);
      animation: orb2 28s ease-in-out infinite;
    }
    .lr__orb--3 {
      width: 320px; height: 320px;
      top: 35%; left: 50%;
      background: radial-gradient(circle, rgba(70,55,130,0.065) 0%, transparent 70%);
      filter: blur(65px);
      animation: orb3 18s ease-in-out infinite;
    }
    @keyframes orb1 {
      0%,100% { transform: translate(0,0) scale(1); }
      40% { transform: translate(7%,-6%) scale(1.07); }
      70% { transform: translate(-4%,8%) scale(0.95); }
    }
    @keyframes orb2 {
      0%,100% { transform: translate(0,0) scale(1); }
      45% { transform: translate(-9%,7%) scale(1.09); }
      75% { transform: translate(5%,-5%) scale(0.93); }
    }
    @keyframes orb3 {
      0%,100% { transform: translate(-50%,-50%) scale(1); }
      50% { transform: translate(-50%,-50%) scale(1.22) rotate(18deg); }
    }
    /* Dot-grid texture */
    .lr__grid {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px);
      background-size: 30px 30px;
    }
    /* Naz: static elegant overlay — NO animation */
    .lr__naz-overlay {
      position: absolute;
      inset: 0;
      opacity: 0;
      pointer-events: none;
      background:
        radial-gradient(ellipse 70% 55% at 30% 40%, rgba(255,255,255,0.055) 0%, transparent 60%),
        radial-gradient(ellipse 50% 60% at 75% 65%, rgba(200,195,192,0.04) 0%, transparent 55%);
      transition: opacity 0.8s ease;
    }
    .lr__naz-overlay--on { opacity: 1; }

    /* ═══════════════════════════════════════
       VIEW SWITCHING
    ═══════════════════════════════════════ */
    .lr__view {
      position: relative;
      z-index: 1;
      flex: 1;
      min-height: 0;
      width: 100%;
      /* Push content up to avoid footer overlap */
      padding-bottom: var(--footer-h);
    }
    .lr__view--desk { display: none; }
    .lr__view--mob  { display: flex; }
    @media (min-width: 768px) {
      .lr__view--desk { display: flex; align-items: stretch; }
      .lr__view--mob  { display: none !important; }
    }
    @media (max-width: 767px) {
      .lr__view--desk { display: none !important; }
      .lr__view--mob  { display: flex !important; }
    }

    /* ═══════════════════════════════════════
       DESKTOP: SPLIT
    ═══════════════════════════════════════ */
    .lr__split {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: stretch;
    }

    /* LEFT: Brand panel */
    .lr__brand {
      flex: 0 0 42%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 2.5rem;
      position: relative;
      overflow: hidden;
    }
    .lr__brand::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 65% 55% at 50% 48%, rgba(251,191,36,0.055) 0%, transparent 72%);
      pointer-events: none;
    }
    .lr__brand-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      position: relative;
      z-index: 1;
      animation: fadeUp 0.7s ease-out both;
    }
    .lr__logo-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .lr__logo-wrap {
      position: relative;
      width: 260px;
      height: 8.5rem;
    }
    @media (min-width: 1200px) {
      .lr__logo-wrap { width: 320px; height: 10.5rem; }
    }
    .lr__logo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: opacity 0.5s ease;
      animation: logoPulse 4.5s ease-in-out infinite;
    }
    .lr__logo--off { opacity: 0; pointer-events: none; }
    @keyframes logoPulse {
      0%,100% { filter: drop-shadow(0 0 0 transparent); }
      50% { filter: drop-shadow(0 0 26px rgba(251,191,36,0.16)); }
    }
    /* Shared nav button (desktop + mobile) */
    .lr__nav {
      width: 2.375rem;
      height: 2.375rem;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.03);
      color: rgba(255,255,255,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.22s ease;
      flex-shrink: 0;
    }
    .lr__nav:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.22);
      color: #fff;
      transform: scale(1.08);
    }
    .lr__nav:active { transform: scale(0.92); }
    .lr__nav i { font-size: 0.95rem; }
    /* Tagline */
    .lr__brand-tag {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      animation: fadeUp 0.7s ease-out 0.15s both;
    }
    .lr__brand-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      background: var(--gold);
      box-shadow: 0 0 8px var(--gold);
      flex-shrink: 0;
    }
    .naz .lr__brand-dot { background: rgba(255,255,255,0.5); box-shadow: none; }
    .lr__brand-tag-text {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.36);
    }
    .naz .lr__brand-tag-text { color: rgba(198,194,191,0.4); }
    /* Concentric rings deco */
    .lr__rings {
      position: absolute;
      top: 50%; left: 50%;
      pointer-events: none;
      z-index: -1;
    }
    .lr__ring {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(251,191,36,0.08);
      transform: translate(-50%,-50%);
    }
    .lr__ring--1 { width: 300px; height: 300px; animation: ringPulse 6s ease-in-out infinite; }
    .lr__ring--2 { width: 450px; height: 450px; animation: ringPulse 6s ease-in-out 2s infinite; }
    .lr__ring--3 { width: 610px; height: 610px; animation: ringPulse 6s ease-in-out 4s infinite; }
    @keyframes ringPulse {
      0%,100% { opacity: 0.4; transform: translate(-50%,-50%) scale(1); }
      50% { opacity: 0.75; transform: translate(-50%,-50%) scale(1.03); }
    }
    .naz .lr__ring { border-color: rgba(255,255,255,0.05); }

    /* Divider */
    .lr__divider {
      width: 1px;
      flex-shrink: 0;
      align-self: stretch;
      background: linear-gradient(to bottom, transparent 0%, var(--border) 18%, var(--border) 82%, transparent 100%);
    }
    .naz .lr__divider { background: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.05) 18%, rgba(255,255,255,0.05) 82%, transparent 100%); }

    /* RIGHT: Panel */
    .lr__panel-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 3rem;
    }
    @media (max-width: 1100px) { .lr__panel-wrap { padding: 2rem 2rem; } }
    @media (max-width: 900px)  { .lr__panel-wrap { padding: 1.5rem 1.5rem; } }

    .lr__panel {
      width: 100%;
      max-width: 390px;
      border-radius: var(--radius-panel);
      padding: 2.25rem 2rem;
      background: var(--surface);
      border: 1px solid var(--border);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      box-shadow: 0 28px 60px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.025);
      position: relative;
      overflow: hidden;
      animation: fadeUp 0.6s ease-out 0.08s both;
    }
    .lr__panel::before {
      content: '';
      position: absolute;
      top: 0; left: 8%; right: 8%;
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(251,191,36,0.28), transparent);
    }
    .lr__panel--naz::before {
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent);
    }
    .lr__panel--naz {
      background: rgba(6,6,6,0.94) !important;
      border-color: rgba(255,255,255,0.07) !important;
    }

    /* Shared panel header */
    .lr__panel-head {
      margin-bottom: 1.75rem;
      animation: fadeUp 0.5s ease-out 0.22s both;
      text-align: center;
    }
    .lr__eyebrow {
      font-size: 0.595rem;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 0.45rem;
      opacity: 0.75;
    }
    .naz .lr__eyebrow { color: rgba(198,194,191,0.5); }
    .lr__title {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1.15;
      color: var(--text-1);
      margin: 0 0 0.4rem;
    }
    .lr__title--naz {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 400 !important;
      letter-spacing: 0 !important;
    }
    .lr__desc {
      font-size: 0.875rem;
      color: var(--text-2);
      margin: 0;
      line-height: 1.5;
    }

    /* ═══════════════════════════════════════
       ACTION CARDS (shared desktop + mobile)
    ═══════════════════════════════════════ */
    .lr__cards {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      animation: fadeUp 0.4s ease-out 0.32s both;
    }
    .lr__card {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 0.875rem;
      width: 100%;
      padding: 1rem 1.125rem;
      border-radius: var(--radius-card);
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.025);
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      transition: border-color 0.2s ease, background 0.2s ease, transform 0.14s ease, box-shadow 0.2s ease;
    }
    .lr__card:hover {
      background: rgba(255,255,255,0.05);
      border-color: var(--border-hover);
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    }
    .lr__card:hover::after {
      content: '';
      position: absolute;
      left: 0; top: 10%; bottom: 10%;
      width: 2px;
      border-radius: 2px;
      background: linear-gradient(to bottom, transparent, rgba(251,191,36,0.6), transparent);
    }
    .lr__card--naz:hover::after {
      background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.4), transparent);
    }
    .lr__card:active { transform: translateY(0) scale(0.99); box-shadow: none; }
    .lr__card:disabled { opacity: 0.65; cursor: not-allowed; transform: none; box-shadow: none; }
    /* Shimmer */
    .lr__card-shine {
      position: absolute;
      inset: 0;
      background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.05) 50%, transparent 68%);
      transform: translateX(-110%);
      transition: transform 0.52s ease;
      pointer-events: none;
    }
    .lr__card:hover .lr__card-shine { transform: translateX(110%); }
    /* Active */
    .lr__card--on {
      background: var(--gold-dim) !important;
      border-color: var(--gold-border) !important;
    }
    .lr__card--on .lr__card-arrow { color: var(--gold); }
    .lr__card--naz.lr__card--on {
      background: rgba(255,255,255,0.065) !important;
      border-color: rgba(255,255,255,0.22) !important;
    }
    .lr__card--naz.lr__card--on .lr__card-arrow { color: rgba(255,255,255,0.8); }
    /* Loading state when entering dashboard */
    .lr__card--fly {
      pointer-events: none;
      border-color: var(--gold-border) !important;
      background: var(--gold-dim) !important;
      animation: cardLoading 0.85s ease-in-out infinite;
    }
    @keyframes cardLoading {
      0%,100% { opacity: 1; }
      50%      { opacity: 0.65; }
    }
    /* Icon */
    .lr__card-icon {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: var(--radius-icon);
      background: rgba(255,255,255,0.055);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s, transform 0.2s;
    }
    .lr__card-icon i { font-size: 1.05rem; color: rgba(255,255,255,0.5); transition: color 0.2s; }
    .lr__card-icon--on { background: rgba(251,191,36,0.14); }
    .lr__card-icon--on i { color: var(--gold); }
    .lr__card:hover .lr__card-icon { background: rgba(255,255,255,0.09); transform: scale(1.04); }
    .lr__card:hover .lr__card-icon i { color: rgba(255,255,255,0.75); }
    .lr__card--on:hover .lr__card-icon { background: rgba(251,191,36,0.2); }
    .lr__card--on:hover .lr__card-icon i { color: var(--gold); }
    /* Text */
    .lr__card-body { flex: 1; min-width: 0; }
    .lr__card-label { display: block; font-size: 0.9rem; font-weight: 600; color: var(--text-1); margin-bottom: 1px; }
    .lr__card-sub { display: block; font-size: 0.72rem; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 767px) { .lr__card-sub { white-space: normal; } }
    /* Arrow */
    .lr__card-arrow {
      font-size: 0.75rem;
      color: var(--text-3);
      flex-shrink: 0;
      transition: color 0.18s, transform 0.18s;
    }
    .lr__card:hover .lr__card-arrow { color: rgba(255,255,255,0.38); transform: translateX(3px); }

    /* ═══════════════════════════════════════
       CLOCK
    ═══════════════════════════════════════ */
    .lr__clock {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      animation: fadeUp 0.7s ease-out 0.3s both;
    }
    .lr__clock-time {
      font-size: 3rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fbbf24;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      text-align: center;
    }
    .naz .lr__clock-time { color: rgba(220,217,215,0.85); }
    .lr__clock-date {
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.03em;
      text-transform: capitalize;
      color: rgba(255,255,255,0.4);
      text-align: center;
      margin-top: 0.25rem;
    }
    .naz .lr__clock-date { color: rgba(198,194,191,0.3); }
    /* Separator between tagline and clock */
    .lr__clock::before {
      content: '';
      display: block;
      width: 2.5rem;
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent);
      margin-bottom: 0.5rem;
    }

    /* Feature pills */
    .lr__pills {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      justify-content: center;
      animation: fadeUp 0.7s ease-out 0.45s both;
    }
    .lr__pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.28rem 0.6rem;
      border-radius: 99px;
      font-size: 0.575rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.28);
      border: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,255,255,0.025);
      white-space: nowrap;
    }
    .lr__pill i { font-size: 0.6rem; opacity: 0.7; }
    .naz .lr__pill { border-color: rgba(255,255,255,0.055); color: rgba(198,194,191,0.3); }

    /* ═══════════════════════════════════════
       MOBILE
    ═══════════════════════════════════════ */
    .lr__view--mob { flex: 1; min-height: 0; }
    .mob {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      align-items: center;
    }
    .mob__head {
      flex-shrink: 0;
      padding: 1.75rem 1rem 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
    .mob__logo-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .mob__logo-wrap {
      position: relative;
      height: 4.75rem;
      width: 155px;
    }
    .mob__logo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: opacity 0.5s ease;
    }
    .mob__logo--off { opacity: 0; pointer-events: none; }
    .mob__main {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0 1.25rem 1rem;
      width: 100%;
    }
    .mob__glass {
      width: 100%;
      max-width: 380px;
      border-radius: var(--radius-panel);
      padding: 2rem 1.75rem;
      background: var(--surface);
      border: 1px solid var(--border);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02);
      position: relative;
      overflow: hidden;
      animation: fadeUp 0.55s ease-out 0.1s both;
    }
    .mob__glass::before {
      content: '';
      position: absolute;
      top: 0; left: 8%; right: 8%;
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(251,191,36,0.24), transparent);
    }
    .mob__glass--naz {
      background: rgba(6,6,6,0.94) !important;
      border-color: rgba(255,255,255,0.07) !important;
    }
    .mob__glass--naz::before {
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
    }
    .mob__clock {
      margin-bottom: 1.25rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .mob__clock::before { display: none; }
    .mob__clock .lr__clock-time { font-size: 2.25rem; white-space: nowrap; }
    .mob__glass--naz .mob__clock { border-bottom-color: rgba(255,255,255,0.05); }
    .mob__glass .lr__panel-head { margin-bottom: 1.5rem; text-align: center; }
    .mob__glass .lr__eyebrow { text-align: center; }
    .mob__glass .lr__title { font-size: 1.75rem; text-align: center; }
    .mob__glass .lr__desc { text-align: center; }
    .lr__cards--mob { animation: fadeUp 0.4s ease-out 0.28s both; }

    /* ═══════════════════════════════════════
       FOOTER
    ═══════════════════════════════════════ */
    .lr__footer {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: var(--footer-h);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.6rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.2);
      background: rgba(0,0,0,0.35);
      border-top: 1px solid rgba(255,255,255,0.045);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 10;
      pointer-events: none;
    }
    .lr__footer--naz { color: rgba(198,194,191,0.22); border-top-color: rgba(255,255,255,0.04); }
    .lr__footer-sep { opacity: 0.45; }

    /* ═══════════════════════════════════════
       LIGHT MODE
    ═══════════════════════════════════════ */
    :host-context(html.light) .lr { background: #f0f0f5; }
    :host-context(html.light) .lr__panel, :host-context(html.light) .mob__glass {
      background: rgba(255,255,255,0.97);
      border-color: rgba(0,0,0,0.07);
      box-shadow: 0 20px 50px rgba(0,0,0,0.08);
    }
    :host-context(html.light) .lr__panel::before, :host-context(html.light) .mob__glass::before {
      background: linear-gradient(to right, transparent, rgba(251,191,36,0.4), transparent);
    }
    :host-context(html.light) .lr__title { color: #111; }
    :host-context(html.light) .lr__desc { color: rgba(0,0,0,0.5); }
    :host-context(html.light) .lr__eyebrow { color: #d97706; opacity: 1; }
    :host-context(html.light) .lr__card { border-color: rgba(0,0,0,0.08); background: rgba(0,0,0,0.02); }
    :host-context(html.light) .lr__card:hover { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.13); box-shadow: 0 6px 20px rgba(0,0,0,0.06); }
    :host-context(html.light) .lr__card-icon { background: rgba(0,0,0,0.05); }
    :host-context(html.light) .lr__card-icon i { color: rgba(0,0,0,0.45); }
    :host-context(html.light) .lr__card-label { color: #111827; }
    :host-context(html.light) .lr__card-sub { color: rgba(0,0,0,0.45); }
    :host-context(html.light) .lr__card-arrow { color: rgba(0,0,0,0.2); }
    :host-context(html.light) .lr__brand-tag-text { color: rgba(0,0,0,0.38); }
    :host-context(html.light) .lr__nav { border-color: rgba(0,0,0,0.13); color: rgba(0,0,0,0.48); background: rgba(0,0,0,0.03); }
    :host-context(html.light) .lr__nav:hover { background: rgba(0,0,0,0.07); border-color: rgba(0,0,0,0.22); color: #000; }
    :host-context(html.light) .lr__grid { background-image: radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px); }
    :host-context(html.light) .lr__footer { color: rgba(0,0,0,0.22); border-top-color: rgba(0,0,0,0.06); background: rgba(255,255,255,0.6); }

    /* ═══════════════════════════════════════
       NAZ OVERRIDES
    ═══════════════════════════════════════ */
    .naz .lr__nav { border-color: rgba(255,255,255,0.18); color: rgba(255,255,255,0.65); }
    .naz .lr__nav:hover { border-color: rgba(255,255,255,0.4); color: #fff; background: rgba(255,255,255,0.07); }
    .naz .lr__eyebrow { color: rgba(198,194,191,0.45); }
    .naz .lr__title { font-family: 'Playfair Display', Georgia, serif; font-weight: 400; letter-spacing: 0; }

    /* ═══════════════════════════════════════
       ANIMATIONS
    ═══════════════════════════════════════ */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ═══════════════════════════════════════
       VERSION BADGE
    ═══════════════════════════════════════ */
    .ver-badge {
      position: fixed;
      bottom: calc(var(--footer-h) + 0.75rem);
      right: 1rem;
      padding: 0.3rem 0.65rem;
      border-radius: 9px;
      font-size: 0.7rem;
      font-weight: 600;
      z-index: 20;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      cursor: pointer;
      user-select: none;
      letter-spacing: 0.03em;
      transition: transform 0.18s ease;
      animation: verTap 3s ease-in-out infinite;
    }
    .ver-badge:hover { transform: scale(1.06) !important; animation: none; }
    .ver-badge:active { transform: scale(0.96) !important; }
    .ver-badge--pop { transform: scale(1.15) !important; }
    :host-context(html.dark) .ver-badge {
      background: rgba(28,28,36,0.9);
      border: 1px solid rgba(180,180,200,0.2);
      color: rgba(220,220,235,0.9);
      box-shadow: 0 2px 10px rgba(0,0,0,0.35);
    }
    :host-context(html.light) .ver-badge {
      background: rgba(255,255,255,0.95);
      border: 1px solid rgba(100,120,180,0.17);
      color: rgba(50,65,110,0.85);
      box-shadow: 0 2px 10px rgba(0,0,0,0.07);
    }
    .ver-badge--naz {
      background: rgba(10,10,10,0.88) !important;
      border: 1px solid rgba(255,255,255,0.09) !important;
      color: #c6c2bf !important;
    }
    @keyframes verTap {
      0%,100% { transform: scale(1); }
      50% { transform: scale(1.03); }
    }

    /* ═══════════════════════════════════════
       EASTER EGG
    ═══════════════════════════════════════ */
    .easter-burst {
      position: fixed;
      bottom: calc(var(--footer-h) + 2.5rem);
      right: 1.5rem;
      font-size: 3.25rem;
      line-height: 1;
      z-index: 1001;
      pointer-events: none;
      opacity: 0;
      transform: scale(0.3) translateY(0);
      animation: burstAnim 1.2s ease-out forwards;
    }
    .easter-burst--on { opacity: 1; }
    @keyframes burstAnim {
      0% { opacity: 0; transform: scale(0.3) translateY(0); }
      15% { opacity: 1; transform: scale(1.4) translateY(-0.5rem); }
      30% { transform: scale(1.2) translateY(-1.5rem); }
      100% { opacity: 0; transform: scale(1.5) translateY(-4rem); filter: blur(2px); }
    }

    /* ═══════════════════════════════════════
       LOGO TAP EASTER EGG
    ═══════════════════════════════════════ */
    .lr__logo-wrap, .mob__logo-wrap { cursor: pointer; }
    .lr__logo-wrap:active .lr__logo,
    .lr__logo-wrap:active .mob__logo,
    .mob__logo-wrap:active .lr__logo,
    .mob__logo-wrap:active .mob__logo { transform: scale(0.93); transition: transform 0.1s ease; }
    .lr__logo-tap-ring {
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 2px solid rgba(251,191,36,0);
      pointer-events: none;
      transition: border-color 0.05s ease, box-shadow 0.05s ease;
    }
    .lr__logo-tap-ring--on {
      border-color: rgba(251,191,36,0.55);
      box-shadow: 0 0 18px rgba(251,191,36,0.22);
      animation: tapRingPop 0.22s ease-out forwards;
    }
    @keyframes tapRingPop {
      0%   { transform: scale(0.85); opacity: 0.9; }
      60%  { transform: scale(1.08); opacity: 1; }
      100% { transform: scale(1); opacity: 0; }
    }
    .lr__logo-tap-counter {
      position: absolute;
      bottom: -1.5rem;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: rgba(251,191,36,0.65);
      white-space: nowrap;
      animation: fadeUp 0.18s ease-out both;
      pointer-events: none;
    }
    .naz .lr__logo-tap-ring--on { border-color: rgba(255,255,255,0.45); box-shadow: 0 0 18px rgba(255,255,255,0.12); }
    .naz .lr__logo-tap-counter { color: rgba(255,255,255,0.45); }

    /* ═══════════════════════════════════════
       ACCESSIBILITY
    ═══════════════════════════════════════ */
    @media (prefers-reduced-motion: reduce) {
      .lr__orb, .lr__ring, .lr__logo, .lr__brand-inner,
      .lr__panel, .lr__cards, .mob__glass, .lr__cards--mob,
      .lr__brand-tag { animation: none !important; }
    }
    * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
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

  public appVersion = APP_VERSION;
  public readonly currentYear = new Date().getFullYear();
  currentTime = signal('');
  currentDate = signal('');

  private versionSoundIndex = 0;
  private readonly VERSION_SOUNDS = ['/sounds/bark.mp3', '/sounds/meow.mp3', '/sounds/squirrel.mp3', '/sounds/cockatoo.mp3'];
  private readonly VERSION_EMOJIS = ['🐕', '🐱', '🐿️', '🦜'];
  easterEggBurst = signal<string | null>(null);
  easterEggPop = signal(false);
  logoTapCount = signal(0);
  logoFlash = signal(false);
  private logoTapTimer: ReturnType<typeof setTimeout> | null = null;

  private currentIP = signal<string | null>(null);
  private branches = signal<Branch[]>([]);
  private userEmail = signal<string | null>(null);

  public isSupportUser = computed(() => {
    const email = this.userEmail();
    return email === 'soporte2@blackdogpanama.com';
  });

  public canChangeOrganization = computed(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (window.localStorage.getItem('easter_egg_activated') === 'true') return true;
    }
    if (this.isSupportUser()) return true;
    const ip = this.currentIP();
    if (!ip || ip === '127.0.0.1') return true;
    const branchesList = this.branches();
    if (!branchesList || branchesList.length === 0) return true;
    const matchingBranch = branchesList.find(b => b.ip && b.ip.trim() === ip);
    if (matchingBranch) {
      const branchName = matchingBranch.name?.toLowerCase() || '';
      const branchShortName = matchingBranch.short_name?.toLowerCase() || '';
      const isCentral = branchName.includes('central') || branchName.includes('oficina central') ||
        branchShortName.includes('central') || branchShortName.includes('oficina central');
      if (isCentral) return true;
      return false;
    }
    return true;
  });

  public isNaz = computed(() => this.organizationService.isNaz());
  public blackDogLogoPath = (): string => 'images/blackdog.png';
  public nazLogoPath = (): string => 'images/Naz_Logo.jpg';
  public logoPath = computed(() => this.isNaz() ? this.nazLogoPath() : this.blackDogLogoPath());

  constructor() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get('returnTo');
      if (returnTo && returnTo.startsWith('https://') && returnTo.includes('blackdogpanama.com')) {
        sessionStorage.setItem('auth_returnTo', returnTo);
      }
    }
    this.auth.user$.subscribe(user => { if (user?.email) this.userEmail.set(user.email.toLowerCase()); });
    this.fetchCurrentIP();
    this.fetchBranches();
    this.updateClock();
    const clockInterval = setInterval(() => this.updateClock(), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(clockInterval));
    effect(() => {
      const ip = this.currentIP();
      const canChange = this.canChangeOrganization();
      const isSupport = this.isSupportUser();
      const easterEggActivated = typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem('easter_egg_activated') === 'true' : false;
      if (isSupport || easterEggActivated) return;
      if (!canChange && ip && ip !== '127.0.0.1') {
        if (this.organizationService.isNaz()) {
          this.organizationService.setOrganization('blackdog');
          logger.debug('🔒 Forzando Black Dog por IP de sucursal');
        }
      }
    });
  }

  private updateClock(): void {
    const now = new Date();
    const h = now.getHours();
    const h12 = (h % 12 || 12);
    const mm = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');
    const ampm = h < 12 ? 'am' : 'pm';
    this.currentTime.set(`${h12}:${mm}:${ss} ${ampm}`);
    this.currentDate.set(now.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' }));
  }

  nextOrganization() { logger.debug('🔄 Cambiando a siguiente organización desde login'); this.organizationService.nextOrganization(); }
  previousOrganization() { logger.debug('🔄 Cambiando a organización anterior desde login'); this.organizationService.previousOrganization(); }
  setMode(mode: 'dashboard' | 'kiosk') { this.activeMode.set(mode); }

  launchButton() {
    if (this.isFlying()) return;
    this.setMode('dashboard');
    this.isFlying.set(true);
    setTimeout(() => { this.signIn(); }, 350);
  }

  async signIn() {
    logger.debug('⏳ Esperando a que los company_ids estén listos...');
    await this.organizationService.waitForCompanyIds();
    const currentCompanyId = this.organizationService.getCurrentCompanyId();
    const currentOrg = this.organizationService.currentOrganization;
    if (!currentCompanyId) {
      logger.error('❌ No se pudo obtener company_id. Usando organización por defecto.');
      if (!currentOrg) this.organizationService.setOrganization('blackdog');
    }
    const savedReturnTo = typeof window !== 'undefined' ? sessionStorage.getItem('auth_returnTo') : null;
    this.auth.loginWithRedirect(savedReturnTo ? { appState: { returnTo: savedReturnTo } } : undefined);
  }

  openKioskMode() {
    const org = this.organizationService.currentOrganization;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const kioskPath = isMobile ? 'timeclock-kiosk-mobile' : 'timeclock-kiosk';
    window.open(`/${kioskPath}?org=${org}`, isMobile ? '_self' : '_blank');
  }

  private fetchCurrentIP(): void {
    this.http.get<{ ip: string }>('/api/client-ip').subscribe({
      next: r => { if (r?.ip) { this.currentIP.set(r.ip.trim()); logger.debug('📍 IP detectada en login'); } },
      error: () => {
        this.getIPViaWebRTC()
          .then(ip => { this.currentIP.set(ip); logger.debug('📍 IP detectada vía WebRTC'); })
          .catch(() => { this.currentIP.set('127.0.0.1'); });
      },
    });
  }

  private fetchBranches(): void {
    const url = this.apiUrl.build('rest/v1/branches', { select: 'ip', is_active: 'eq.true' });
    this.http.get<Branch[]>(url).subscribe({
      next: branches => { this.branches.set(branches); logger.debug(`📍 Sucursales cargadas: ${branches.length}`); },
      error: err => { logger.error('Error obteniendo sucursales', err); },
    });
  }

  private getIPViaWebRTC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const RTCPeerConnection = (window as any).RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection || (window as any).mozRTCPeerConnection;
      if (!RTCPeerConnection) { reject(new Error('WebRTC not supported')); return; }
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      const ips: string[] = [];
      pc.createDataChannel('');
      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          const match = event.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);
          if (match) {
            const ip = match[1];
            if (ips.indexOf(ip) === -1 && !ip.startsWith('127.') && ip !== '::1') ips.push(ip);
          }
        } else {
          pc.close();
          ips.length > 0 ? resolve(ips[0]) : reject(new Error('No IP found'));
        }
      };
      pc.createOffer().then((o: any) => pc.setLocalDescription(o)).catch((e: any) => { pc.close(); reject(e); });
      setTimeout(() => { pc.close(); ips.length > 0 ? resolve(ips[0]) : reject(new Error('WebRTC timeout')); }, 3000);
    });
  }

  onVersionClick(): void {
    const idx = this.versionSoundIndex % this.VERSION_SOUNDS.length;
    const src = this.VERSION_SOUNDS[idx];
    const emoji = this.VERSION_EMOJIS[idx];
    this.versionSoundIndex += 1;
    try { const a = new Audio(src); a.volume = 0.5; a.play().catch(() => {}); } catch {}
    this.easterEggPop.set(true);
    this.easterEggBurst.set(emoji);
    setTimeout(() => this.easterEggPop.set(false), 220);
    setTimeout(() => this.easterEggBurst.set(null), 1400);
  }

  onLogoTap(): void {
    if (this.logoTapTimer) clearTimeout(this.logoTapTimer);
    const count = this.logoTapCount() + 1;
    this.logoTapCount.set(count);
    this.logoFlash.set(true);
    setTimeout(() => this.logoFlash.set(false), 220);
    if (count >= 6) {
      this.logoTapCount.set(0);
      this.activateLogoEasterEgg();
      return;
    }
    this.logoTapTimer = setTimeout(() => this.logoTapCount.set(0), 3000);
  }

  private activateLogoEasterEgg(): void {
    try { const a = new Audio('/sounds/bark.mp3'); a.volume = 0.8; a.play().catch(() => {}); } catch {}
    setTimeout(() => {
      try { const a = new Audio('/sounds/bark.mp3'); a.volume = 0.55; a.play().catch(() => {}); } catch {}
    }, 380);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('easter_egg_activated', 'true');
    }
    this.messageService.add({
      severity: 'success',
      summary: '🐕 ¡Easter egg encontrado!',
      detail: 'Ahora puedes cambiar de organización.',
      life: 5000,
    });
    this.easterEggBurst.set('🐕');
    setTimeout(() => this.easterEggBurst.set(null), 2000);
  }
}
