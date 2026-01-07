import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { CompensatoryListComponent } from './components/compensatory-list.component';

@Component({
  selector: 'pt-compensatory-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TabsModule,
    CompensatoryListComponent,
  ],
  template: `
    <div class="h-screen flex flex-col bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 overflow-hidden">
      <!-- Header Compacto con Búsqueda Global -->
      <div class="bg-gradient-to-r from-neutral-800 via-neutral-800/95 to-neutral-800 border-b border-neutral-700/50 shadow-xl sticky top-0 z-40 backdrop-blur-sm">
        <div class="px-4 py-2">
          <div class="flex items-center justify-between mb-2 gap-4">
            <div class="flex-1 min-w-0">
              <h1 class="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent m-0">
                Dashboard de Tiempo Compensatorio
              </h1>
              <p class="text-xs text-gray-400 m-0 mt-0.5 flex items-center gap-1.5">
                <i class="pi pi-clock text-cyan-400 text-xs"></i>
                <span class="truncate">Gestión de solicitudes de tiempo compensatorio</span>
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <p-button
                icon="pi pi-refresh"
                [label]="''"
                [outlined]="true"
                severity="secondary"
                size="small"
                (onClick)="refreshAll()"
                [loading]="isRefreshing()"
                pTooltip="Actualizar todos los datos"
                tooltipPosition="bottom"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 py-2 space-y-2 flex-1 overflow-y-auto">
        <!-- Vista Principal -->
        <div class="space-y-3">
          <pt-compensatory-list />
        </div>
      </div>
    </div>
  `,
  styles: `
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompensatoryDashboardComponent {
  private router = inject(Router);

  // Estado general del dashboard
  isRefreshing = signal(false);

  refreshAll(): void {
    this.isRefreshing.set(true);
    // Aquí se implementará la lógica de refresh
    // Por ahora solo simulamos
    setTimeout(() => this.isRefreshing.set(false), 1000);
  }

  navigateBack(): void {
    this.router.navigate(['admin', 'hr-dashboard']);
  }
}