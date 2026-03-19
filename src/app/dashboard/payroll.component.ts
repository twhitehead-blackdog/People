import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgClass } from '@angular/common';
import { CreditorsStore } from '../stores/creditors.store';
import { PayrollStore } from '../stores/payroll.store';
import { OrganizationService } from '../services/organization.service';

@Component({
  selector: 'pt-payroll',
  imports: [RouterOutlet, NgClass],
  providers: [PayrollStore, CreditorsStore],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }">
    <main class="bg-neutral-900 min-h-screen" [ngClass]="{ 'naz-main': isNaz() }">
      <div class="mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <router-outlet />
      </div>
    </main>
  </div>`,
  styles: `
    .naz-theme main.naz-main {
      background: #000000 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollComponent {
  public organizationService = inject(OrganizationService);
  public isNaz = computed(() => this.organizationService.isNaz());
}
