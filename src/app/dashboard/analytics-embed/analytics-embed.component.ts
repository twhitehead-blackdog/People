import { Component, signal, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { DeviceService } from '../../services/device.service';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  section?: string;
  isSvg?: 'scissors' | 'stethoscope' | 'meta' | 'csat';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',  label: 'Dashboard',   icon: 'pi-objects-column', route: '/dashboard', section: 'Principal' },
  { id: 'sales',      label: 'Ventas',      icon: 'pi-chart-line',     route: '/sales',     section: 'Reportes' },
  { id: 'inventory',  label: 'Inventario',  icon: 'pi-box',            route: '/inventory' },
  { id: 'purchases',  label: 'Compras',     icon: 'pi-shopping-cart',  route: '/purchases' },
  { id: 'grooming',   label: 'Peluquería',  icon: '',                  route: '/grooming',  section: 'Servicios', isSvg: 'scissors' },
  { id: 'vet',        label: 'Veterinaria', icon: '',                  route: '/vet',       isSvg: 'stethoscope' },
  { id: 'marketing',  label: 'Marketing',   icon: '',                  route: '/marketing', section: 'Marketing', isSvg: 'meta' },
  { id: 'csat',       label: 'Calificaciones', icon: '',              route: '/csat',                         isSvg: 'csat' },
  { id: 'hr',         label: 'RR.HH.',      icon: 'pi-users',          route: '/hr',        section: 'Personas' },
  { id: 'security',   label: 'Seguridad',   icon: 'pi-shield',         route: '/security',  section: 'Operaciones' },
  { id: 'audit',      label: 'Auditoría POS', icon: 'pi-search',       route: '/audit' },
];

@Component({
  selector: 'pt-analytics-embed',
  standalone: true,
  imports: [NgClass],
  template: `
    @if (device.isDesktop()) {
    <!-- ===== DESKTOP: sidebar + iframe ===== -->
    <div class="flex h-[calc(100dvh-56px)]">
      <!-- Sidebar -->
      <aside
        class="h-full bg-neutral-900 border-r border-neutral-800 flex flex-col transition-all duration-300 shrink-0 z-10"
        [ngClass]="collapsed() ? 'w-14' : 'w-52'"
      >
        <!-- Toggle -->
        <div class="flex items-center px-2 h-10 border-b border-neutral-800 shrink-0"
             [ngClass]="collapsed() ? 'justify-center' : 'justify-between'">
          @if (!collapsed()) {
            <span class="text-[11px] font-semibold text-amber-400 tracking-wider uppercase pl-1">Analytics</span>
          }
          <button
            (click)="collapsed.set(!collapsed())"
            class="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <i class="pi text-xs" [ngClass]="collapsed() ? 'pi-chevron-right' : 'pi-chevron-left'"></i>
          </button>
        </div>

        <!-- Nav items -->
        <nav class="flex-1 py-2 flex flex-col gap-0.5 px-1.5 overflow-y-auto">
          @for (item of navItems; track item.id; let i = $index) {
            @if (item.section && item.section !== navItems[i > 0 ? i-1 : 0]?.section && !collapsed()) {
              <span class="text-[9px] font-semibold text-neutral-600 uppercase tracking-wider px-2 pt-3 pb-1">{{ item.section }}</span>
            }
            @if (item.section && item.section !== navItems[i > 0 ? i-1 : 0]?.section && collapsed()) {
              <div class="border-t border-neutral-800 mx-1.5 my-1"></div>
            }
            <button
              (click)="navigateTo(item)"
              class="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all border border-transparent cursor-pointer w-full text-left"
              [ngClass]="{
                'bg-amber-400/10 !text-amber-400 !border-amber-400/30': activeRoute() === item.id,
                'justify-center': collapsed()
              }"
            >
              <span class="shrink-0 w-5 h-5 flex items-center justify-center">
                @if (item.isSvg === 'scissors') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                } @else if (item.isSvg === 'stethoscope') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
                } @else if (item.isSvg === 'meta') {
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/></svg>
                } @else if (item.isSvg === 'csat') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                } @else {
                  <i class="pi text-sm" [class]="item.icon"></i>
                }
              </span>
              @if (!collapsed()) {
                <span class="text-xs font-medium whitespace-nowrap">{{ item.label }}</span>
              }
            </button>
          }
        </nav>

        <!-- Footer: external link button -->
        <div class="px-2 py-2.5 border-t border-neutral-800 shrink-0">
          <a
            [href]="externalUrl()"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-neutral-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all cursor-pointer w-full"
            [ngClass]="collapsed() ? 'justify-center' : ''"
          >
            <i class="pi pi-external-link text-sm shrink-0"></i>
            @if (!collapsed()) {
              <span class="text-xs font-medium">Abrir en nueva pestaña</span>
            }
          </a>
        </div>
      </aside>

      <!-- Iframe -->
      <iframe
        #analyticsFrame
        [src]="initialUrl"
        class="flex-1 border-none"
        style="display: block;"
      ></iframe>
    </div>

    } @else {
    <!-- ===== MOBILE: scrollable tab bar + iframe ===== -->
    <div class="flex flex-col" style="height: calc(100dvh - 120px)">
      <!-- Scrollable tab bar -->
      <div class="bg-neutral-900 border-b border-neutral-800 shrink-0">
        <div class="flex items-center gap-1 px-2 py-1.5 overflow-x-auto scrollbar-hide"
             style="-webkit-overflow-scrolling: touch;">
          @for (item of navItems; track item.id) {
            <button
              (click)="navigateTo(item)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all shrink-0 cursor-pointer"
              style="-webkit-tap-highlight-color: transparent;"
              [ngClass]="activeRoute() === item.id
                ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                : 'text-neutral-400 border border-transparent active:bg-neutral-800'"
            >
              <span class="shrink-0 w-4 h-4 flex items-center justify-center">
                @if (item.isSvg === 'scissors') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                } @else if (item.isSvg === 'stethoscope') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
                } @else if (item.isSvg === 'meta') {
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/></svg>
                } @else if (item.isSvg === 'csat') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                } @else {
                  <i class="pi text-xs" [class]="item.icon"></i>
                }
              </span>
              <span class="text-[11px] font-medium">{{ item.label }}</span>
            </button>
          }
          <!-- External link pill -->
          <a
            [href]="externalUrl()"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-neutral-500 active:bg-amber-400/10 active:text-amber-400 transition-all shrink-0 border border-transparent"
            style="-webkit-tap-highlight-color: transparent;"
          >
            <i class="pi pi-external-link text-xs"></i>
            <span class="text-[11px] font-medium">Abrir</span>
          </a>
        </div>
      </div>

      <!-- Iframe -->
      <iframe
        #analyticsFrame
        [src]="initialUrl"
        class="flex-1 border-none w-full"
        style="display: block;"
      ></iframe>
    </div>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
  `]
})
export class AnalyticsEmbedComponent {
  private sanitizer = inject(DomSanitizer);
  protected device = inject(DeviceService);

  @ViewChild('analyticsFrame') frameRef!: ElementRef<HTMLIFrameElement>;

  public navItems = NAV_ITEMS;
  public collapsed = signal(false);
  public activeRoute = signal('dashboard');

  // Initial URL — only used once to load the iframe
  public initialUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl('/analytics/dashboard?embedded=true');

  public externalUrl = computed(() => `/analytics/${this.activeRoute()}`);

  navigateTo(item: NavItem): void {
    this.activeRoute.set(item.id);
    // Navigate inside the iframe without destroying it
    const frame = this.frameRef?.nativeElement;
    if (frame?.contentWindow) {
      frame.contentWindow.location.replace(`/analytics/${item.route}?embedded=true`);
    }
  }
}
