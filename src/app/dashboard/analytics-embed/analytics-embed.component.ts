import { Component, signal, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';

interface AnalyticsPage {
  id: string;
  label: string;
  icon: string;
}

const ANALYTICS_PAGES: AnalyticsPage[] = [
  { id: 'dashboard',  label: 'General',     icon: 'pi-chart-bar' },
  { id: 'sales',      label: 'Ventas',      icon: 'pi-dollar' },
  { id: 'grooming',   label: 'Grooming',    icon: 'pi-heart' },
  { id: 'inventory',  label: 'Inventario',  icon: 'pi-box' },
  { id: 'purchases',  label: 'Compras',     icon: 'pi-shopping-cart' },
  { id: 'vet',        label: 'Veterinaria', icon: 'pi-heart-fill' },
  { id: 'marketing',  label: 'Marketing',   icon: 'pi-megaphone' },
  { id: 'hr',         label: 'RR.HH.',      icon: 'pi-users' },
  { id: 'security',   label: 'Seguridad',   icon: 'pi-shield' },
];

@Component({
  selector: 'pt-analytics-embed',
  standalone: true,
  template: `
    <div class="flex w-full" style="height: calc(100dvh - 56px)">
      <!-- Sidebar -->
      <aside class="w-44 bg-neutral-900 border-r border-neutral-800 flex flex-col py-3 gap-1 shrink-0 overflow-y-auto">
        @for (page of pages; track page.id) {
          <button
            (click)="selectPage(page.id)"
            class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg mx-2 text-left transition-colors"
            [class.bg-amber-500]="activePage() === page.id"
            [class.text-black]="activePage() === page.id"
            [class.font-semibold]="activePage() === page.id"
            [class.text-neutral-300]="activePage() !== page.id"
            [class.hover:bg-neutral-800]="activePage() !== page.id"
          >
            <i class="pi text-sm" [class]="page.icon"></i>
            {{ page.label }}
          </button>
        }
      </aside>
      <!-- Iframe fills remaining width -->
      <iframe
        [src]="iframeUrl()"
        class="flex-1 border-none block"
        style="width: 100%; height: 100%"
        frameborder="0"
      ></iframe>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
  `]
})
export class AnalyticsEmbedComponent {
  private sanitizer = inject(DomSanitizer);
  public pages = ANALYTICS_PAGES;
  public activePage = signal('dashboard');

  public iframeUrl = computed((): SafeResourceUrl =>
    this.sanitizer.bypassSecurityTrustResourceUrl(`/analytics/${this.activePage()}/`)
  );

  selectPage(id: string) {
    this.activePage.set(id);
  }
}
