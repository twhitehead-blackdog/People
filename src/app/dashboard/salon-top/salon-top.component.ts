import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SalonTopService } from './salon-top.service';

@Component({
  selector: 'pt-salon-top',
  imports: [DecimalPipe, Button, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-2">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-1">
          <p-button icon="pi pi-chevron-left" severity="secondary" rounded text size="small"
            (onClick)="svc.prevMonth()" pTooltip="Mes anterior" />
          <p-button [label]="svc.getMonthLabel()" severity="secondary" rounded text size="small"
            (onClick)="svc.currentMonth()" pTooltip="Mes actual" />
          <p-button icon="pi pi-chevron-right" severity="secondary" rounded text size="small"
            (onClick)="svc.nextMonth()" pTooltip="Mes siguiente" />
        </div>
        <div class="text-[11px] text-neutral-400">
          {{ svc.ranking().length }} estilistas · {{ svc.totals().mascotas | number }} mascotas ·
          $ {{ svc.totals().amount | number:'1.2-2' }}
        </div>
      </div>

      @if (svc.loading()) {
        <div class="flex items-center gap-2 text-neutral-400 text-sm py-8 justify-center">
          <i class="pi pi-spin pi-spinner"></i> Cargando datos de Odoo...
        </div>
      } @else if (svc.error()) {
        <div class="text-red-400 text-sm py-6 text-center">
          <i class="pi pi-exclamation-triangle mr-1"></i> {{ svc.error() }}
        </div>
      } @else if (svc.ranking().length === 0) {
        <div class="text-neutral-500 text-sm py-8 text-center">
          Sin servicios de peluquería con estilista asignado en este período.
        </div>
      } @else {
        <div class="overflow-auto" style="max-height: calc(100vh - 260px)">
          <table class="w-full border-collapse text-xs">
            <thead class="sticky top-0 z-10 bg-neutral-800">
              <tr class="border-b-2 border-neutral-600">
                <th class="text-left px-2 py-2 font-semibold text-gray-300 w-10">#</th>
                <th class="text-left px-2 py-2 font-semibold text-gray-300">Estilista</th>
                <th class="text-right px-2 py-2 font-semibold text-gray-300">Mascotas</th>
                <th class="text-right px-2 py-2 font-semibold text-gray-300">Cortes</th>
                <th class="text-right px-2 py-2 font-semibold text-gray-300">Baños</th>
                <th class="text-right px-2 py-2 font-semibold text-gray-300">Baño+Corte</th>
                <th class="text-right px-2 py-2 font-semibold text-gray-300"
                    pTooltip="Servicios extras: acicalado, mantenimiento, rapado, deslanado, profilaxis, tinte, corte de uñas, limpieza de oídos"
                    tooltipPosition="top">Extras <i class="pi pi-info-circle text-[10px] opacity-60"></i></th>
                <th class="text-right px-2 py-2 font-semibold text-gray-300">Monto $</th>
              </tr>
            </thead>
            <tbody>
              @for (row of svc.ranking(); track row.stylistId; let i = $index) {
                <tr class="border-b border-neutral-800 hover:bg-neutral-800/50"
                    [class.bg-amber-500\/5]="i < 3">
                  <td class="px-2 py-2 text-neutral-400 font-mono">{{ getMedal(i) || (i + 1) }}</td>
                  <td class="px-2 py-2 font-semibold text-white">{{ row.stylistName }}</td>
                  <td class="px-2 py-2 text-right text-emerald-400 font-semibold">{{ row.mascotas }}</td>
                  <td class="px-2 py-2 text-right text-neutral-200">{{ row.cortes }}</td>
                  <td class="px-2 py-2 text-right text-neutral-200">{{ row.banos }}</td>
                  <td class="px-2 py-2 text-right text-neutral-200">{{ row.banoCorte }}</td>
                  <td class="px-2 py-2 text-right text-neutral-200">{{ row.extras }}</td>
                  <td class="px-2 py-2 text-right text-emerald-400 font-semibold">$ {{ row.amount | number:'1.2-2' }}</td>
                </tr>
              }
            </tbody>
            <tfoot class="sticky bottom-0 bg-neutral-800 border-t-2 border-neutral-600">
              <tr class="font-semibold text-white">
                <td class="px-2 py-2" colspan="2">Total</td>
                <td class="px-2 py-2 text-right text-emerald-400">{{ svc.totals().mascotas }}</td>
                <td class="px-2 py-2 text-right">{{ svc.totals().cortes }}</td>
                <td class="px-2 py-2 text-right">{{ svc.totals().banos }}</td>
                <td class="px-2 py-2 text-right">{{ svc.totals().banoCorte }}</td>
                <td class="px-2 py-2 text-right">{{ svc.totals().extras }}</td>
                <td class="px-2 py-2 text-right text-emerald-400">$ {{ svc.totals().amount | number:'1.2-2' }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </div>
  `,
})
export class SalonTopComponent implements OnInit {
  protected svc = inject(SalonTopService);

  ngOnInit(): void {
    if (this.svc.ranking().length === 0 && !this.svc.loading()) {
      void this.svc.load();
    }
  }

  protected getMedal(i: number): string {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return '';
  }
}
