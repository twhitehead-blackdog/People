import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FoundationsStore } from '../stores/foundations.store';
import { PetsStore } from '../stores/pets.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { AdoptionsHeaderComponent } from './adoptions-header.component';
import { AdoptionsFooterComponent } from './adoptions-footer.component';

@Component({
  selector: 'pt-adoptions-layout',
  standalone: true,
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
    AdoptionsHeaderComponent,
    AdoptionsFooterComponent,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="adoptions-container">
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
      }

      .adoptions-main {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    `,
  ],
})
export class AdoptionsLayoutComponent {}
