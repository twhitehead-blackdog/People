import { Component, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MessageService } from 'primeng/api';
import { filter, take } from 'rxjs';

import { DialogModule } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { OrganizationService } from './services/organization.service';
import { DiagnosticPanelComponent } from './components/diagnostic-panel.component';
import { DiagnosticService } from './services/diagnostic.service';
import { ThemeService } from './services/theme.service';
import { VersionCheckService } from './services/version-check.service';
import { isPortalDomain } from './utils/domain.utils';
import { PwaService } from './services/pwa.service';
import { DesignVersionService } from './services/design-version.service';

@Component({
  imports: [RouterOutlet, DiagnosticPanelComponent, DialogModule, Button],
  providers: [MessageService],
  selector: 'pt-root',
  template: `
    @if (showSkeleton()) {
      @if (isPortal) {
        <div class="sk-overlay portal-sk">
          <div class="portal-sk-inner">
            <div class="portal-sk-logo"></div>
            <div class="portal-sk-spinner"></div>
          </div>
        </div>
      } @else {
      <div class="sk-overlay">
        <div class="sk-dash">
          <!-- Top Navbar -->
          <div class="sk-nav">
            <div class="sk-nav-logo"></div>
            <div class="sk-nav-links">
              <div class="sk-nav-link" style="width:70px"></div>
              <div class="sk-nav-link" style="width:110px"></div>
              <div class="sk-nav-link" style="width:80px"></div>
              <div class="sk-nav-link" style="width:120px"></div>
              <div class="sk-nav-link" style="width:80px"></div>
            </div>
            <div class="sk-nav-user">
              <div class="sk-nav-uname"><div></div><div></div></div>
              <div class="sk-nav-avatar"></div>
            </div>
          </div>
          <div class="sk-body">
            <!-- Sidebar -->
            <div class="sk-side">
              <div class="sk-si active"><div class="sk-si-ic"></div><div class="sk-si-lb"></div></div>
              <div class="sk-si"><div class="sk-si-ic"></div><div class="sk-si-lb"></div></div>
              <div class="sk-si"><div class="sk-si-ic"></div><div class="sk-si-lb"></div></div>
              <div class="sk-si"><div class="sk-si-ic"></div><div class="sk-si-lb"></div></div>
              <div class="sk-sep"></div>
              <div class="sk-si"><div class="sk-si-ic"></div><div class="sk-si-lb"></div></div>
              <div class="sk-si"><div class="sk-si-ic"></div><div class="sk-si-lb"></div></div>
              <div class="sk-si"><div class="sk-si-ic"></div><div class="sk-si-lb"></div></div>
            </div>
            <!-- Main Content -->
            <div class="sk-main">
              <!-- Hero Row -->
              <div class="sk-hero">
                <div class="sk-hc"><div class="sk-hc-top"><div class="sk-hc-title"></div><div class="sk-hc-badge"></div></div><div class="sk-hc-num"></div><div class="sk-hc-chart"></div></div>
                <div class="sk-hc"><div class="sk-hc-top"><div class="sk-hc-title"></div></div><div class="sk-hc-circle"></div><div class="sk-hc-title" style="width:60%;margin:0 auto"></div></div>
                <div class="sk-hc"><div class="sk-hc-top"><div class="sk-hc-title"></div></div><div class="sk-hc-num"></div><div class="sk-hc-chart"></div></div>
              </div>
              <!-- KPI Grid 3x3 -->
              <div class="sk-kpi">
                <div class="sk-kc"><div class="sk-kc-ic ic-or"></div><div class="sk-kc-b"><div class="sk-kc-l"></div><div class="sk-kc-v"></div><div class="sk-kc-s"></div></div></div>
                <div class="sk-kc"><div class="sk-kc-ic ic-rd"></div><div class="sk-kc-b"><div class="sk-kc-l"></div><div class="sk-kc-v"></div><div class="sk-kc-s"></div></div></div>
                <div class="sk-kc"><div class="sk-kc-ic ic-gn"></div><div class="sk-kc-b"><div class="sk-kc-l"></div><div class="sk-kc-v"></div><div class="sk-kc-s"></div></div></div>
                <div class="sk-kc"><div class="sk-kc-ic ic-tl"></div><div class="sk-kc-b"><div class="sk-kc-l"></div><div class="sk-kc-v"></div><div class="sk-kc-s"></div></div></div>
                <div class="sk-kc"><div class="sk-kc-ic ic-pk"></div><div class="sk-kc-b"><div class="sk-kc-l"></div><div class="sk-kc-v"></div><div class="sk-kc-s"></div></div></div>
                <div class="sk-kc"><div class="sk-kc-ic ic-em"></div><div class="sk-kc-b"><div class="sk-kc-l"></div><div class="sk-kc-v"></div><div class="sk-kc-s"></div></div></div>
                <div class="sk-kc"><div class="sk-kc-ic ic-pr"></div><div class="sk-kc-b"><div class="sk-kc-l"></div><div class="sk-kc-v"></div><div class="sk-kc-s"></div></div></div>
                <div class="sk-kc"><div class="sk-kc-ic ic-bl"></div><div class="sk-kc-b"><div class="sk-kc-l"></div><div class="sk-kc-v"></div><div class="sk-kc-s"></div></div></div>
                <div class="sk-kc"><div class="sk-kc-ic ic-cy"></div><div class="sk-kc-b"><div class="sk-kc-l"></div><div class="sk-kc-v"></div><div class="sk-kc-s"></div></div></div>
              </div>
              <!-- Bottom Row -->
              <div class="sk-bot">
                <div class="sk-bc"><div class="sk-bc-ic ic-pr"></div><div class="sk-bc-b"><div class="sk-bc-l"></div><div class="sk-bc-v"></div></div></div>
                <div class="sk-bc"><div class="sk-bc-ic ic-bl"></div><div class="sk-bc-b"><div class="sk-bc-l"></div><div class="sk-bc-v"></div></div></div>
                <div class="sk-bc"><div class="sk-bc-ic ic-gn"></div><div class="sk-bc-b"><div class="sk-bc-l"></div><div class="sk-bc-v"></div></div></div>
                <div class="sk-bc"><div class="sk-bc-ic ic-pk"></div><div class="sk-bc-b"><div class="sk-bc-l"></div><div class="sk-bc-v"></div></div></div>
                <div class="sk-bc"><div class="sk-bc-ic ic-rd"></div><div class="sk-bc-b"><div class="sk-bc-l"></div><div class="sk-bc-v"></div></div></div>
                <div class="sk-bc"><div class="sk-bc-ic ic-or"></div><div class="sk-bc-b"><div class="sk-bc-l"></div><div class="sk-bc-v"></div></div></div>
                <div class="sk-bc"><div class="sk-bc-ic ic-yw"></div><div class="sk-bc-b"><div class="sk-bc-l"></div><div class="sk-bc-v"></div></div></div>
                <div class="sk-bc"><div class="sk-bc-ic ic-rs"></div><div class="sk-bc-b"><div class="sk-bc-l"></div><div class="sk-bc-v"></div></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      }
    }
    <router-outlet />
    <pt-diagnostic-panel />

    <!-- Version update countdown banner -->
    @if (versionCheck.updateAvailable()) {
      <div class="version-update-banner">
        <div class="version-update-content">
          <i class="pi pi-refresh version-update-icon"></i>
          <span class="version-update-text">Nueva versión disponible — actualizando en</span>
          <button
            class="version-update-countdown"
            [class.fast]="versionCheck.speedMultiplier() >= 5"
            [class.urgent]="versionCheck.countdown() <= 10"
            (click)="versionCheck.activateFastMode()"
            title="Clic para acelerar"
          >
            <span class="countdown-number">{{ versionCheck.countdown() }}</span>
            <span class="countdown-unit">s</span>
            @if (versionCheck.speedMultiplier() > 1) {
              <span class="speed-badge">{{ versionCheck.speedMultiplier() }}×</span>
            }
          </button>
          <button class="version-update-now" (click)="reloadApp()">
            Actualizar ahora
          </button>
        </div>
      </div>
    }

    <!-- PWA Install Banner -->
    @if (pwa.showInstallBanner()) {
      <div class="pwa-banner" (click)="pwa.install()">
        <div class="pwa-banner-content">
          <div class="pwa-banner-icon">
            <i class="pi pi-download"></i>
          </div>
          <div class="pwa-banner-text">
            <strong>Instalar People</strong>
            <span>Accede m&aacute;s r&aacute;pido desde tu pantalla de inicio</span>
          </div>
          <button class="pwa-banner-btn" (click)="pwa.install(); $event.stopPropagation()">Instalar</button>
          <button class="pwa-banner-close" (click)="pwa.dismissInstallBanner(); $event.stopPropagation()">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </div>
    }

    <!-- Notification Permission Prompt -->
    @if (pwa.showNotificationPrompt()) {
      <div class="notif-prompt">
        <div class="notif-prompt-content">
          <div class="notif-prompt-icon">
            <i class="pi pi-bell"></i>
          </div>
          <div class="notif-prompt-text">
            <strong>Activar notificaciones</strong>
            <span>Recibe alertas de marcaciones y recordatorios</span>
          </div>
          <div class="notif-prompt-actions">
            <button class="notif-prompt-allow" (click)="pwa.requestNotificationPermission()">Permitir</button>
            <button class="notif-prompt-dismiss" (click)="pwa.dismissNotificationPrompt()">Ahora no</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .sk-overlay{position:fixed;inset:0;z-index:9999;background:#0a0a0a}
    .sk-dash{display:flex;flex-direction:column;height:100vh;font-family:Inter,system-ui,sans-serif;overflow:hidden;animation:sk-p 1.8s ease-in-out infinite}
    @keyframes sk-p{0%,100%{opacity:1}50%{opacity:.35}}
    .sk-nav{height:80px;background:linear-gradient(90deg,#171717,#1f1f1f,#171717);border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;padding:0 1.5rem;gap:1rem;flex-shrink:0}
    .sk-nav-logo{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#292524,#44403c);flex-shrink:0}
    .sk-nav-links{display:flex;gap:.75rem;margin-left:2rem;flex:1}
    .sk-nav-link{height:32px;border-radius:.5rem;background:rgba(255,255,255,.04)}
    .sk-nav-user{display:flex;align-items:center;gap:.75rem;margin-left:auto}
    .sk-nav-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#292524,#44403c)}
    .sk-nav-uname{display:flex;flex-direction:column;gap:4px}
    .sk-nav-uname div:first-child{width:90px;height:12px;border-radius:4px;background:rgba(255,255,255,.08)}
    .sk-nav-uname div:last-child{width:60px;height:10px;border-radius:4px;background:rgba(255,255,255,.04)}
    .sk-body{display:flex;flex:1;overflow:hidden}
    .sk-side{width:260px;background:linear-gradient(180deg,#18181b,#0f0f10);border-right:1px solid rgba(255,255,255,.06);padding:1.25rem .75rem;display:flex;flex-direction:column;gap:.25rem;flex-shrink:0}
    .sk-si{display:flex;align-items:center;gap:.875rem;padding:.75rem 1rem;border-radius:10px}
    .sk-si.active{background:linear-gradient(90deg,rgba(251,191,36,.15),rgba(251,191,36,.05))}
    .sk-si-ic{width:20px;height:20px;border-radius:6px;background:rgba(255,255,255,.08);flex-shrink:0}
    .sk-si.active .sk-si-ic{background:rgba(251,191,36,.3)}
    .sk-si-lb{height:12px;border-radius:4px;background:rgba(255,255,255,.06);flex:1}
    .sk-si.active .sk-si-lb{background:rgba(251,191,36,.2);max-width:70%}
    .sk-sep{height:1px;background:rgba(255,255,255,.04);margin:.75rem .5rem}
    .sk-main{flex:1;padding:1.5rem;overflow-y:auto;background:linear-gradient(180deg,#0a0a0a,#111)}
    .sk-hero{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.25rem}
    .sk-hc{border-radius:1rem;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);padding:1.25rem;min-height:180px;display:flex;flex-direction:column;justify-content:space-between}
    .sk-hc-top{display:flex;justify-content:space-between;align-items:flex-start}
    .sk-hc-title{height:12px;width:45%;border-radius:4px;background:rgba(255,255,255,.06)}
    .sk-hc-badge{height:20px;width:70px;border-radius:10px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.15)}
    .sk-hc-num{height:36px;width:30%;border-radius:8px;background:rgba(255,255,255,.05);margin:1rem 0 .5rem}
    .sk-hc-chart{height:50px;border-radius:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.03)}
    .sk-hc-circle{height:80px;width:80px;border-radius:50%;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.03);margin:.5rem auto}
    .sk-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.25rem}
    .sk-kc{border-radius:.75rem;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);padding:1rem;display:flex;align-items:flex-start;gap:.75rem;min-height:90px}
    .sk-kc-ic{width:40px;height:40px;border-radius:10px;flex-shrink:0}
    .sk-kc-b{flex:1;display:flex;flex-direction:column;gap:6px}
    .sk-kc-l{height:10px;width:60%;border-radius:3px;background:rgba(255,255,255,.05)}
    .sk-kc-v{height:22px;width:35%;border-radius:6px;background:rgba(255,255,255,.07)}
    .sk-kc-s{height:8px;width:50%;border-radius:3px;background:rgba(255,255,255,.03)}
    .sk-bot{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem}
    .sk-bc{border-radius:.75rem;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);padding:.875rem;display:flex;align-items:center;gap:.625rem;min-height:60px}
    .sk-bc-ic{width:32px;height:32px;border-radius:8px;flex-shrink:0}
    .sk-bc-b{flex:1;display:flex;flex-direction:column;gap:4px}
    .sk-bc-l{height:9px;width:65%;border-radius:3px;background:rgba(255,255,255,.05)}
    .sk-bc-v{height:16px;width:30%;border-radius:4px;background:rgba(255,255,255,.06)}
    .ic-or{background:rgba(249,115,22,.15)}.ic-rd{background:rgba(239,68,68,.15)}
    .ic-gn{background:rgba(34,197,94,.15)}.ic-tl{background:rgba(20,184,166,.15)}
    .ic-pk{background:rgba(236,72,153,.15)}.ic-em{background:rgba(16,185,129,.15)}
    .ic-pr{background:rgba(168,85,247,.15)}.ic-bl{background:rgba(59,130,246,.15)}
    .ic-cy{background:rgba(6,182,212,.15)}.ic-rs{background:rgba(244,63,94,.15)}
    .ic-yw{background:rgba(234,179,8,.15)}
    @media(max-width:1023px){.sk-side{display:none}.sk-nav{height:56px}.sk-nav-links,.sk-nav-uname{display:none}.sk-hero{grid-template-columns:1fr}.sk-kpi{grid-template-columns:repeat(2,1fr)}.sk-bot{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:640px){.sk-kpi{grid-template-columns:1fr}.sk-bot{grid-template-columns:1fr}}
    /* Portal skeleton */
    .portal-sk{display:flex;align-items:center;justify-content:center}
    .portal-sk-inner{display:flex;flex-direction:column;align-items:center;gap:2rem}
    .portal-sk-logo{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#292524,#44403c);animation:sk-p 1.8s ease-in-out infinite}
    .portal-sk-spinner{width:32px;height:32px;border:3px solid rgba(255,255,255,.1);border-top-color:rgba(251,191,36,.6);border-radius:50%;animation:portal-spin 0.8s linear infinite}
    @keyframes portal-spin{to{transform:rotate(360deg)}}

    /* PWA Install Banner */
    .pwa-banner{position:fixed;bottom:0;left:0;right:0;z-index:10000;padding:12px 16px;background:linear-gradient(135deg,#1c1917,#292524);border-top:1px solid rgba(251,191,36,.2);animation:pwa-slideUp .4s cubic-bezier(.4,0,.2,1);cursor:pointer}
    .pwa-banner-content{display:flex;align-items:center;gap:12px;max-width:600px;margin:0 auto}
    .pwa-banner-icon{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(251,191,36,.2),rgba(251,191,36,.1));display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fbbf24;font-size:1.25rem}
    .pwa-banner-text{flex:1;display:flex;flex-direction:column;gap:2px}
    .pwa-banner-text strong{color:#fafaf9;font-size:.875rem}
    .pwa-banner-text span{color:#a8a29e;font-size:.75rem}
    .pwa-banner-btn{background:#fbbf24;color:#0a0a0a;border:none;border-radius:8px;padding:8px 16px;font-weight:600;font-size:.8rem;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}
    .pwa-banner-close{background:none;border:none;color:#78716c;padding:8px;cursor:pointer;-webkit-tap-highlight-color:transparent;font-size:.875rem}
    @keyframes pwa-slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}

    /* Version update banner */
    .version-update-banner{position:fixed;top:0;left:0;right:0;z-index:10001;padding:10px 16px;background:linear-gradient(90deg,#1a1200,#2d1f00,#1a1200);border-bottom:1px solid rgba(251,191,36,.3);animation:vu-slideDown .4s cubic-bezier(.4,0,.2,1)}
    @keyframes vu-slideDown{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}
    .version-update-content{display:flex;align-items:center;gap:10px;max-width:700px;margin:0 auto;flex-wrap:wrap}
    .version-update-icon{color:#fbbf24;font-size:1.1rem;animation:vu-spin 2s linear infinite}
    @keyframes vu-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .version-update-text{color:#d4a21a;font-size:.8rem;font-weight:500;flex:1;min-width:120px}
    .version-update-countdown{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:3px;min-width:64px;height:40px;padding:0 12px;border-radius:12px;border:2px solid rgba(251,191,36,.4);background:rgba(251,191,36,.08);cursor:pointer;transition:all .2s;-webkit-tap-highlight-color:transparent;animation:vu-pulse 1s ease-in-out infinite}
    @keyframes vu-pulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.3)}50%{box-shadow:0 0 0 6px rgba(251,191,36,.0)}}
    .version-update-countdown.urgent{border-color:rgba(239,68,68,.6);background:rgba(239,68,68,.12);animation:vu-pulse-red 0.5s ease-in-out infinite}
    @keyframes vu-pulse-red{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)}50%{box-shadow:0 0 0 8px rgba(239,68,68,.0)}}
    .version-update-countdown.fast{border-color:rgba(251,191,36,.8);background:rgba(251,191,36,.15)}
    .countdown-number{color:#fbbf24;font-size:1.1rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
    .countdown-unit{color:#a16207;font-size:.65rem;font-weight:600}
    .speed-badge{position:absolute;top:-8px;right:-6px;background:#fbbf24;color:#0a0a0a;font-size:.55rem;font-weight:800;padding:1px 4px;border-radius:4px}
    .version-update-now{background:#fbbf24;color:#0a0a0a;border:none;border-radius:8px;padding:8px 14px;font-weight:700;font-size:.75rem;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent;transition:background .15s}
    .version-update-now:hover{background:#f59e0b}

    /* Notification Prompt */
    .notif-prompt{position:fixed;top:20px;right:20px;z-index:10000;animation:notif-slideIn .4s cubic-bezier(.4,0,.2,1)}
    .notif-prompt-content{background:linear-gradient(135deg,#1c1917,#292524);border:1px solid rgba(251,191,36,.15);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;max-width:320px;box-shadow:0 20px 40px rgba(0,0,0,.5)}
    .notif-prompt-icon{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,rgba(251,191,36,.2),rgba(251,191,36,.08));display:flex;align-items:center;justify-content:center;color:#fbbf24;font-size:1.5rem;margin:0 auto}
    .notif-prompt-text{text-align:center;display:flex;flex-direction:column;gap:4px}
    .notif-prompt-text strong{color:#fafaf9;font-size:.9rem}
    .notif-prompt-text span{color:#a8a29e;font-size:.8rem}
    .notif-prompt-actions{display:flex;gap:8px}
    .notif-prompt-allow{flex:1;background:#fbbf24;color:#0a0a0a;border:none;border-radius:8px;padding:10px;font-weight:600;font-size:.8rem;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .notif-prompt-dismiss{flex:1;background:rgba(255,255,255,.06);color:#a8a29e;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px;font-size:.8rem;cursor:pointer;-webkit-tap-highlight-color:transparent}
    @keyframes notif-slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}
    @media(max-width:640px){.notif-prompt{top:auto;bottom:80px;right:12px;left:12px}.notif-prompt-content{max-width:100%}}
  `,
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private organizationService = inject(OrganizationService);
  private diagnosticService = inject(DiagnosticService);
  private themeService = inject(ThemeService);
  readonly versionCheck = inject(VersionCheckService);
  readonly pwa = inject(PwaService);
  readonly designVersion = inject(DesignVersionService);

  /** Detecta si estamos en el dominio del portal */
  readonly isPortal = isPortalDomain();

  /** Skeleton overlay visible durante carga post-login */
  readonly showSkeleton = signal(false);

  reloadApp(): void {
    // Limpiar caches y service workers antes de recargar
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister());
      });
    }
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    // Forzar recarga sin cache
    window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
  }

  ngOnInit() {
    // Portal: ajustar título y manifest dinámicamente
    if (this.isPortal) {
      document.title = 'Portal | Black Dog Panama';
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.setAttribute('href', 'portal-manifest.webmanifest');
      }
    }

    // Iniciar polling de versión para detectar actualizaciones
    this.versionCheck.startPolling();

    // Inicializar company_ids temprano si estamos en login o página principal
    const currentUrl = this.router.url;
    if (currentUrl === '/login' || currentUrl === '/') {
      this.organizationService
        .waitForCompanyIds()
        .catch(() => {});
    }

    // Check if we're handling a callback from Auth0
    const isCallback =
      window.location.search.includes('code=') ||
      window.location.search.includes('state=') ||
      window.location.hash.includes('code=') ||
      window.location.hash.includes('state=');

    if (isCallback) {
      // Mostrar skeleton del dashboard mientras Auth0 procesa
      this.showSkeleton.set(true);

      // Wait for Auth0 to process callback, then clean up URL after navigation
      this.auth.isAuthenticated$
        .pipe(
          filter((isAuth) => isAuth !== undefined),
          take(1)
        )
        .subscribe(() => {
          setTimeout(() => {
            this.router.events
              .pipe(
                filter((event) => event instanceof NavigationEnd),
                take(1)
              )
              .subscribe(() => {
                const cleanPath = window.location.pathname || '/';
                if (window.location.search || window.location.hash) {
                  window.history.replaceState({}, '', cleanPath);
                }
                this.showSkeleton.set(false);
              });
          }, 500);
        });
    }

    // Ocultar skeleton cuando la navegación completa
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.showSkeleton.set(false);
      });
  }
}
