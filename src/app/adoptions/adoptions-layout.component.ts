import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { FoundationsStore } from '../stores/foundations.store';
import { PetsStore } from '../stores/pets.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { AdoptionsHeaderComponent } from './adoptions-header.component';
import { AdoptionsFooterComponent } from './adoptions-footer.component';
import { DarkModeService } from './dark-mode.service';

@Component({
  selector: 'pt-adoptions-layout',
  standalone: true,
  changeDetection: import('@angular/core').ChangeDetectionStrategy.OnPush,
  providers: [
    FoundationsStore,
    PetsStore,
    AdoptionApplicationsStore,
    MessageService,
    ConfirmationService,
  ],
  imports: [
    RouterOutlet,
    ToastModule,
    ConfirmDialogModule,
    CommonModule,
    AdoptionsHeaderComponent,
    AdoptionsFooterComponent,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="adoptions-container" [class.dark]="isDarkMode()">
      <pt-adoptions-header />
      <main class="adoptions-main">
        <router-outlet />
      </main>
      <pt-adoptions-footer />
    </div>
  `,
  styles: [
    `
      .adoptions-container {
        min-height: 100vh;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        transition: background-color 0.3s ease;
      }

      .adoptions-container.dark,
      :host-context(.adoptions-dark) .adoptions-container {
        background: #1f2937;
      }

      .adoptions-main {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    `,
  ],
})
export class AdoptionsLayoutComponent {
  private darkModeService = inject(DarkModeService);
  public isDarkMode = this.darkModeService.isDarkMode;
}

