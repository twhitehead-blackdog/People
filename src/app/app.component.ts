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

@Component({
  imports: [RouterOutlet, DiagnosticPanelComponent, DialogModule, Button],
  providers: [MessageService],
  selector: 'pt-root',
  template: `
    @if (showSkeleton()) {
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
    <router-outlet />
    <pt-diagnostic-panel />

    <p-dialog
      header="Nueva versi\u00F3n disponible"
      [visible]="versionCheck.updateAvailable()"
      [modal]="true"
      [closable]="false"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '28rem' }"
    >
      <div class="flex flex-col items-center gap-4 py-2">
        <i class="pi pi-refresh text-4xl text-yellow-500"></i>
        <p class="text-center text-lg">
          Hay una nueva versi\u00F3n de la aplicaci\u00F3n disponible.
          Por favor, actualiza para continuar.
        </p>
      </div>
      <ng-template #footer>
        <div class="flex justify-center w-full">
          <p-button label="Actualizar ahora" icon="pi pi-refresh" (onClick)="reloadApp()" />
        </div>
      </ng-template>
    </p-dialog>
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
  `,
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private organizationService = inject(OrganizationService);
  private diagnosticService = inject(DiagnosticService);
  private themeService = inject(ThemeService);
  readonly versionCheck = inject(VersionCheckService);

  /** Skeleton overlay visible durante carga post-login */
  readonly showSkeleton = signal(false);

  reloadApp(): void {
    window.location.reload();
  }

  ngOnInit() {
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
