import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CreditorsStore } from '../stores/creditors.store';
import { PayrollStore } from '../stores/payroll.store';

@Component({
  selector: 'pt-payroll',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  providers: [PayrollStore, CreditorsStore],
  template: `<header class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md">
      <div
        class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-10"
      >
        <div class="block w-full overflow-x-auto">
          <div class="flex gap-2 min-w-max">
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
          </div>
        </div>
      </div>
    </header>
    <main class="bg-neutral-900 min-h-screen">
      <div class="mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <router-outlet />
      </div>
    </main>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollComponent {}
