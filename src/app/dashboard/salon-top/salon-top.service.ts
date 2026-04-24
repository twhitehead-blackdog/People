import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

export interface SalonTopRow {
  stylistId: number;
  stylistName: string;
  mascotas: number;
  cortes: number;
  banos: number;
  banoCorte: number;
  extras: number;
  amount: number;
}

/**
 * Fetches the Top Peluquería ranking from Odoo (x.mascota.line aggregated by stylist).
 */
@Injectable({ providedIn: 'root' })
export class SalonTopService {
  private http = inject(HttpClient);

  readonly month = signal<Date>(startOfMonth(new Date()));
  readonly ranking = signal<SalonTopRow[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly totals = computed(() => {
    return this.ranking().reduce(
      (acc, r) => ({
        mascotas: acc.mascotas + r.mascotas,
        cortes: acc.cortes + r.cortes,
        banos: acc.banos + r.banos,
        banoCorte: acc.banoCorte + r.banoCorte,
        extras: acc.extras + r.extras,
        amount: acc.amount + r.amount,
      }),
      { mascotas: 0, cortes: 0, banos: 0, banoCorte: 0, extras: 0, amount: 0 }
    );
  });

  getMonthLabel(): string {
    return format(this.month(), 'MMMM yyyy', { locale: es });
  }

  prevMonth(): void {
    this.month.set(addMonths(this.month(), -1));
    void this.load();
  }

  nextMonth(): void {
    this.month.set(addMonths(this.month(), 1));
    void this.load();
  }

  currentMonth(): void {
    this.month.set(startOfMonth(new Date()));
    void this.load();
  }

  async load(): Promise<void> {
    const start = startOfMonth(this.month());
    const end = endOfMonth(this.month());
    const dateFrom = format(start, 'yyyy-MM-dd');
    const dateTo = format(end, 'yyyy-MM-dd');

    this.loading.set(true);
    this.error.set(null);
    try {
      const resp = await firstValueFrom(
        this.http.get<{ success: boolean; data: SalonTopRow[] }>(
          `/api/odoo/top-peluqueria?date_from=${dateFrom}&date_to=${dateTo}`
        )
      );
      this.ranking.set(resp?.data ?? []);
    } catch (err: any) {
      const body = err?.error;
      this.error.set(body?.message || body?.error || 'No se pudo cargar el ranking.');
      this.ranking.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
