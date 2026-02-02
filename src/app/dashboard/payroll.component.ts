import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgClass } from '@angular/common';
import { PermissionsStore } from '../core/permissions/permissions.store';
import { CreditorsStore } from '../stores/creditors.store';
import { PayrollStore } from '../stores/payroll.store';
import { OrganizationService } from '../services/organization.service';

@Component({
  selector: 'pt-payroll',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  providers: [PayrollStore, CreditorsStore],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }">
    <header class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md" [ngClass]="{ 'naz-header': isNaz() }">
      <div
        class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-10"
      >
        <div class="block w-full overflow-x-auto">
          <div class="flex gap-2 min-w-max justify-center">
            <a
              routerLink="payrolls"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-money-bill text-base"></i> <span>Planillas</span></a
            >
            @if (permissionsStore.can('finance.read')) {
            <a
              routerLink="creditors"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-users text-base"></i> <span>Acreedores</span></a
            >
            }
            @if (permissionsStore.can('finance.read')) {
            <a
              routerLink="banks"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-building-columns text-base"></i> <span>Bancos</span></a
            >
            }
          </div>
        </div>
      </div>
    </header>
    <main class="bg-neutral-900 min-h-screen" [ngClass]="{ 'naz-main': isNaz() }">
      <div class="mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <router-outlet />
      </div>
    </main>
  </div>`,
  styles: `
    /* Tema Naz */
    .naz-theme header.naz-header {
      background: #000000 !important;
      border-bottom-color: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme .naz-header a {
      color: #C6C2BF !important;
    }

    .naz-theme .naz-header a:hover {
      color: #FFFFFF !important;
      background: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme .naz-header a[routerlinkactive] {
      background: #0D0D0D !important;
      color: #FFFFFF !important;
    }

    .naz-theme main.naz-main {
      background: #000000 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollComponent {
  public organizationService = inject(OrganizationService);
  public permissionsStore = inject(PermissionsStore);
  
  // Computed para verificar si es Naz
  public isNaz = computed(() => this.organizationService.isNaz());
}
