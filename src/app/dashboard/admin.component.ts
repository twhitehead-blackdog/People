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
    <main [ngClass]="{ 'naz-main': isNaz() }" style="min-height: calc(100dvh - 52px - 68px)">
      <router-outlet />
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
