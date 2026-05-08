import { Component, inject, OnInit, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { MessageService } from 'primeng/api';
import { filter, take } from 'rxjs';

import { DialogModule } from 'primeng/dialog';
import { OrganizationService } from './services/organization.service';
import { DiagnosticPanelComponent } from './components/diagnostic-panel.component';
import { DiagnosticService } from './services/diagnostic.service';
import { ThemeService } from './services/theme.service';
import { VersionCheckService } from './services/version-check.service';
import { isPortalDomain } from './utils/domain.utils';
import { PwaService } from './services/pwa.service';
import { DesignVersionService } from './services/design-version.service';

@Component({
  imports: [RouterOutlet, DiagnosticPanelComponent, DialogModule],
  providers: [MessageService],
  selector: 'pt-root',
  template: `
    @if (showSkeleton()) {
      <div class="sk-overlay minimal-loader">
        <div class="ml-stack">
          <span class="ml-mark">BD</span>
          <div class="ml-bar"><div class="ml-bar__fill"></div></div>
        </div>
      </div>
    }
    <router-outlet />
    <pt-diagnostic-panel />

    <!-- Version update banner — estilo portal-empleados-app -->
    @if (versionCheck.updateAvailable()) {
      <div class="version-update-banner">
        <div class="version-update-content">
          <i class="pi pi-refresh version-update-icon"></i>
          <span class="version-update-text">
            Nueva versi&oacute;n disponible &mdash; actualizando en {{ versionCheck.countdown() }}s
          </span>
          <button class="version-update-now" (click)="reloadApp()">
            Ahora
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
    /* ── Base ── */
    .sk-overlay{position:fixed;inset:0;z-index:9999;background:#0a0a0a;animation:sk-p 1.8s ease-in-out infinite}
    @keyframes sk-p{0%,100%{opacity:1}50%{opacity:.4}}
    /* ── Shared nav ── */
    .sk-dash{display:flex;flex-direction:column;height:100vh;overflow:hidden}
    .sk-nav{height:64px;background:linear-gradient(90deg,#171717,#1f1f1f,#171717);border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;padding:0 1.5rem;gap:1rem;flex-shrink:0}
    .sk-nav-logo{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#292524,#44403c);flex-shrink:0}
    .sk-nav-links{display:flex;gap:.75rem;margin-left:2rem;flex:1}
    .sk-nav-link{height:30px;border-radius:.5rem;background:rgba(255,255,255,.04)}
    .sk-nav-user{display:flex;align-items:center;gap:.75rem;margin-left:auto}
    .sk-nav-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#292524,#44403c)}
    .sk-nav-uname{display:flex;flex-direction:column;gap:4px}
    .sk-nav-uname div:first-child{width:90px;height:12px;border-radius:4px;background:rgba(255,255,255,.08)}
    .sk-nav-uname div:last-child{width:60px;height:10px;border-radius:4px;background:rgba(255,255,255,.04)}
    /* ── Launcher skeleton ── */
    .sk-dash--launcher{background:#0a0a0a}
    .sk-launcher-content{flex:1;overflow-y:auto;padding:2rem 1.5rem;display:flex;flex-direction:column;align-items:center;max-width:900px;margin:0 auto;width:100%}
    .sk-launcher-greet{text-align:center;margin-bottom:2.25rem;display:flex;flex-direction:column;align-items:center;gap:.6rem}
    .sk-launcher-title{height:28px;width:200px;border-radius:8px;background:rgba(255,255,255,.08)}
    .sk-launcher-subtitle{height:14px;width:130px;border-radius:4px;background:rgba(255,255,255,.04)}
    .sk-sec-hdr{display:flex;align-items:center;gap:.75rem;width:100%;margin-bottom:.875rem}
    .sk-sec-label{height:10px;width:52px;border-radius:3px;background:rgba(255,255,255,.06);flex-shrink:0}
    .sk-sec-line{flex:1;height:1px;background:rgba(255,255,255,.06)}
    .sk-mod-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:.75rem;width:100%}
    .sk-mod-grid--ext{grid-template-columns:repeat(5,1fr)}
    .sk-mod{border-radius:.75rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);padding:1rem .75rem;display:flex;flex-direction:column;align-items:center;gap:.625rem}
    .sk-mod--ext{background:rgba(255,255,255,.02);border-color:rgba(255,255,255,.045)}
    .sk-mod-ic{width:40px;height:40px;border-radius:.75rem;flex-shrink:0}
    .sk-mod-lbl{height:10px;width:65%;border-radius:3px;background:rgba(255,255,255,.06)}
    .sk-ic-blue{background:rgba(96,165,250,.15)}.sk-ic-violet{background:rgba(167,139,250,.15)}
    .sk-ic-emerald{background:rgba(52,211,153,.15)}.sk-ic-amber{background:rgba(251,191,36,.15)}
    .sk-ic-rose{background:rgba(251,113,133,.15)}.sk-ic-orange{background:rgba(251,146,60,.15)}
    .sk-ic-fuchsia{background:rgba(232,121,249,.15)}.sk-ic-teal{background:rgba(45,212,191,.15)}
    .sk-ic-indigo{background:rgba(129,140,248,.15)}.sk-ic-slate{background:rgba(148,163,184,.1)}
    .sk-ic-pink{background:rgba(244,114,182,.15)}.sk-ic-purple{background:rgba(192,132,252,.15)}
    /* ── Table section skeleton ── */
    .sk-body{display:flex;flex:1;overflow:hidden}
    .sk-side{width:240px;background:linear-gradient(180deg,#18181b,#0f0f10);border-right:1px solid rgba(255,255,255,.06);padding:1rem .75rem;display:flex;flex-direction:column;gap:.25rem;flex-shrink:0}
    .sk-si{display:flex;align-items:center;gap:.875rem;padding:.625rem 1rem;border-radius:10px}
    .sk-si.active{background:linear-gradient(90deg,rgba(251,191,36,.12),rgba(251,191,36,.04))}
    .sk-si-ic{width:18px;height:18px;border-radius:5px;background:rgba(255,255,255,.08);flex-shrink:0}
    .sk-si.active .sk-si-ic{background:rgba(251,191,36,.3)}
    .sk-si-lb{height:11px;border-radius:3px;background:rgba(255,255,255,.06);flex:1}
    .sk-si.active .sk-si-lb{background:rgba(251,191,36,.18);max-width:70%}
    .sk-sep{height:1px;background:rgba(255,255,255,.04);margin:.5rem .5rem}
    .sk-main--tbl{flex:1;padding:1.5rem;overflow-y:auto;background:#0a0a0a;display:flex;flex-direction:column;gap:1rem}
    .sk-page-hdr{display:flex;align-items:center;justify-content:space-between}
    .sk-page-title{height:22px;width:160px;border-radius:6px;background:rgba(255,255,255,.08)}
    .sk-page-actions{display:flex;gap:.5rem}
    .sk-page-btn{height:34px;width:90px;border-radius:8px;background:rgba(255,255,255,.05)}
    .sk-filter-bar{display:flex;gap:.5rem}
    .sk-filter-chip{height:32px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
    .sk-table{border-radius:.75rem;overflow:hidden;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.01)}
    .sk-table-hdr{height:44px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06)}
    .sk-row{display:flex;align-items:center;gap:1rem;padding:.875rem 1.25rem;border-bottom:1px solid rgba(255,255,255,.04)}
    .sk-row-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.06);flex-shrink:0}
    .sk-row-body{flex:1;display:flex;flex-direction:column;gap:5px}
    .sk-row-line{height:12px;width:45%;border-radius:3px;background:rgba(255,255,255,.07)}
    .sk-row-sub{height:10px;width:30%;border-radius:3px;background:rgba(255,255,255,.04)}
    .sk-row-badge{height:20px;width:60px;border-radius:20px;background:rgba(255,255,255,.04)}
    /* ── Minimal loader ── */
    .minimal-loader{display:flex;align-items:center;justify-content:center;background:#0a0a0a !important;animation:none}
    .ml-stack{display:flex;flex-direction:column;align-items:center;gap:1.5rem}
    .ml-mark{font-family:Inter,system-ui,sans-serif;font-weight:300;font-size:1.5rem;letter-spacing:0.5em;color:rgba(255,255,255,0.55);padding-left:0.5em}
    .ml-bar{width:120px;height:1px;background:rgba(255,255,255,0.06);overflow:hidden;position:relative}
    .ml-bar__fill{position:absolute;top:0;height:100%;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);animation:ml-shimmer 1.6s ease-in-out infinite}
    @keyframes ml-shimmer{0%{left:-40%}100%{left:100%}}
    /* ── Login skeleton ── */
    .sk-overlay--login{display:flex;align-items:center;justify-content:center}
    .sk-login-inner{display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%;max-width:360px;padding:0 1rem}
    .sk-login-logo{width:160px;height:52px;border-radius:8px;background:rgba(255,255,255,.06)}
    .sk-login-title{height:24px;width:140px;border-radius:6px;background:rgba(255,255,255,.08)}
    .sk-login-sub{height:14px;width:200px;border-radius:4px;background:rgba(255,255,255,.04)}
    .sk-login-card{height:68px;width:100%;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)}
    /* ── Portal skeleton ── */
    .portal-sk{display:flex;align-items:center;justify-content:center}
    .portal-sk-inner{display:flex;flex-direction:column;align-items:center;gap:2rem}
    .portal-sk-logo{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#292524,#44403c)}
    .portal-sk-spinner{width:32px;height:32px;border:3px solid rgba(255,255,255,.1);border-top-color:rgba(251,191,36,.6);border-radius:50%;animation:portal-spin 0.8s linear infinite}
    @keyframes portal-spin{to{transform:rotate(360deg)}}
    /* ── Responsive ── */
    @media(max-width:1023px){.sk-side{display:none}.sk-nav{height:52px}.sk-nav-links,.sk-nav-uname{display:none}.sk-mod-grid{grid-template-columns:repeat(4,1fr)}.sk-mod-grid--ext{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:640px){.sk-mod-grid{grid-template-columns:repeat(3,1fr)}.sk-mod-grid--ext{grid-template-columns:repeat(2,1fr)}.sk-launcher-content{padding:1.5rem 1rem}}
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

    /* Version update banner — copia exacta de portal-empleados-app */
    .version-update-banner{
      position:fixed;top:0;left:0;right:0;z-index:9999;
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      padding:10px 16px;
      background:rgba(251,191,36,0.97);
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
      animation:vu-slideDown .4s cubic-bezier(.4,0,.2,1)
    }
    @keyframes vu-slideDown{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}
    .version-update-content{
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      width:100%;min-width:0
    }
    .version-update-icon{
      color:#000;font-size:.85rem;
      animation:vu-spin 2s linear infinite;
      flex-shrink:0
    }
    @keyframes vu-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .version-update-text{
      color:#000;font-size:.78rem;font-weight:700;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      flex:1;min-width:0;
      letter-spacing:.01em
    }
    .version-update-now{
      flex-shrink:0;
      background:rgba(0,0,0,0.18);color:#000;
      border:none;border-radius:8px;padding:5px 12px;
      font-weight:700;font-size:.75rem;
      cursor:pointer;white-space:nowrap;
      -webkit-tap-highlight-color:transparent;
      transition:background .15s
    }
    .version-update-now:hover{background:rgba(0,0,0,0.28)}

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

  /** Skeleton overlay visible durante carga */
  readonly showSkeleton = signal(false);

  /** Tipo de skeleton según la sección destino */
  readonly skeletonType = signal<'launcher' | 'table' | 'timeclock' | 'login'>('launcher');

  private skeletonTimer: ReturnType<typeof setTimeout> | null = null;

  private getSkeletonType(url: string): 'launcher' | 'table' | 'timeclock' | 'login' {
    if (url.includes('/timeclock') || url.includes('/naz-timeclock')) return 'timeclock';
    if (url === '/login' || url.startsWith('/login')) return 'login';
    if (url.includes('/launcher') || url === '/' || url === '') return 'launcher';
    // admin, payroll, time-management, branch-manager, live, etc.
    return 'table';
  }

  reloadApp(): void {
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
    window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
  }

  ngOnInit() {
    if (this.isPortal) {
      document.title = 'Portal | Black Dog Panama';
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.setAttribute('href', 'portal-manifest.webmanifest');
      }
    }

    this.versionCheck.startPolling();

    const currentUrl = this.router.url;
    if (currentUrl === '/login' || currentUrl === '/') {
      this.organizationService.waitForCompanyIds().catch(() => {});
    }

    // Auth0 callback: mostrar skeleton inmediatamente con tipo correcto
    const isCallback =
      window.location.search.includes('code=') ||
      window.location.search.includes('state=') ||
      window.location.hash.includes('code=') ||
      window.location.hash.includes('state=');

    if (isCallback) {
      this.skeletonType.set('launcher');
      this.showSkeleton.set(true);

      const callbackFallback = setTimeout(() => this.showSkeleton.set(false), 8000);

      this.auth.isAuthenticated$
        .pipe(filter((isAuth) => isAuth === true), take(1))
        .subscribe(() => {
          clearTimeout(callbackFallback);
          setTimeout(() => {
            const cleanPath = window.location.pathname || '/';
            if (window.location.search || window.location.hash) {
              window.history.replaceState({}, '', cleanPath);
            }
            this.showSkeleton.set(false);
          }, 300);
        });
    }

    // Skeleton de navegación: solo mostramos un loader corto si tarda >800ms.
    // Antes mostraba un layout completo con navbar/sidebar oscuro que se quedaba pegado.
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (event.url === '/login' || event.url.startsWith('/login')) {
          if (this.skeletonTimer) { clearTimeout(this.skeletonTimer); this.skeletonTimer = null; }
          this.showSkeleton.set(false);
          return;
        }
        const type = this.getSkeletonType(event.url);
        this.skeletonType.set(type);
        // Mostrar loader solo si tarda >800ms (no para tránsitos rápidos típicos)
        this.skeletonTimer = setTimeout(() => this.showSkeleton.set(true), 800);
      }
      // Clear on End, Cancel, AND Error — otherwise a failed lazy-chunk load
      // (typical after a rebuild: old shell tries to fetch a hashed chunk that
      // no longer exists) leaves the skeleton stuck on forever.
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (this.skeletonTimer) { clearTimeout(this.skeletonTimer); this.skeletonTimer = null; }
        this.showSkeleton.set(false);

        // If the failure looks like a missing chunk (post-deploy shell mismatch),
        // force a hard reload so the browser pulls the fresh index.html + new hashes.
        if (event instanceof NavigationError) {
          const msg = String(event.error?.message ?? event.error ?? '');
          if (/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
            window.location.reload();
          }
        }
      }
    });
  }
}
