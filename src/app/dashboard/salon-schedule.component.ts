import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from 'primeng/card';

@Component({
  selector: 'pt-salon-schedule',
  imports: [Card],
  template: `<p-card>
    <ng-template #title> Horario de Peluquería </ng-template>
    <ng-template #subtitle
      >Gestión de horarios y turnos del salón</ng-template
    >
    
    <div class="flex flex-col items-center justify-center py-16 px-4">
      <div class="text-center">
        <div class="mb-6">
          <i class="pi pi-cog text-6xl text-amber-400 gear-animation"></i>
        </div>
        <h3 class="text-2xl font-bold text-white mb-2">En Construcción</h3>
        <p class="text-gray-400 text-lg">Esta funcionalidad estará disponible próximamente.</p>
      </div>
    </div>
  </p-card>`,
  styles: `
    
    .gear-animation {
      animation: rotate-gear 3s linear infinite;
      transform-origin: center center;
    }
    
    @keyframes rotate-gear {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalonScheduleComponent {}

