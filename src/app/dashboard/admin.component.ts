import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OrganizationService } from '../services/organization.service';

@Component({
  selector: 'pt-admin',
  standalone: true,
  imports: [RouterOutlet, NgClass],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }">
    <main
      class="min-h-screen dark:bg-neutral-900"
      [ngClass]="{ 'naz-main': isNaz() }"
    >
      <div class="mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <router-outlet />
      </div>
    </main>
  </div>`,
  styles: `
    :host-context(html.dark) .naz-theme main.naz-main {
      background: #000000 !important;
    }

    :host-context(html.light) .naz-theme main.naz-main {
      background: #ffffff !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  private organizationService = inject(OrganizationService);
  public isNaz = computed(() => this.organizationService.isNaz());
}
