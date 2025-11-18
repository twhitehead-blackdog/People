import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'pt-no-access',
  standalone: true,
  imports: [Button, Card, RouterLink],
  template: `
    <div class="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <p-card class="w-full max-w-lg text-center bg-neutral-900 border border-neutral-800">
        <ng-template pTemplate="title">
          <div class="flex flex-col items-center gap-3">
            <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <i class="pi pi-lock text-red-400 text-2xl"></i>
            </div>
            <h1 class="text-2xl font-semibold text-white m-0">Acceso restringido</h1>
          </div>
        </ng-template>
        <div class="space-y-4 text-gray-300">
          <p class="text-lg text-white">No tienes permiso para acceder</p>
          <p>Tu correo no aparece en nuestra base de empleados. Comunícate con tu supervisor para solicitar acceso.</p>
          <div class="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <p-button
              label="Cerrar sesión"
              severity="danger"
              icon="pi pi-sign-out"
              (onClick)="logout()"
            ></p-button>
            <a routerLink="/login" class="sm:w-auto w-full">
              <p-button
                label="Ir al inicio"
                severity="secondary"
                outlined
                styleClass="w-full"
              ></p-button>
            </a>
          </div>
        </div>
      </p-card>
    </div>
  `,
})
export class NoAccessComponent {
  private auth = inject(AuthService);

  logout() {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
