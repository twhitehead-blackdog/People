import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  effect,
} from '@angular/core';
import { CurrencyPipe, NgClass } from '@angular/common';
import { CreditScoreService, CreditScoreResult, CreditScoreFactor } from '../services/credit-score.service';
import { Skeleton } from 'primeng/skeleton';

@Component({
  selector: 'pt-employee-credit-score',
  standalone: true,
  imports: [CurrencyPipe, NgClass, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="space-y-4 p-4">
        <p-skeleton height="8rem" />
        <p-skeleton height="4rem" />
        <p-skeleton height="4rem" />
        <p-skeleton height="4rem" />
      </div>
    } @else if (error()) {
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <i class="pi pi-exclamation-triangle text-4xl text-amber-400 mb-3"></i>
        <p class="text-gray-400 text-sm m-0">{{ error() }}</p>
      </div>
    } @else if (result()) {
      <div class="space-y-4">
        <!-- Score Principal -->
        <div class="rounded-xl border overflow-hidden"
             [ngClass]="categoryBorderClass()">
          <div class="p-6 text-center"
               [ngClass]="categoryBgClass()">
            <!-- Gauge visual -->
            <div class="relative inline-flex items-center justify-center mb-4">
              <svg class="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none"
                        stroke="rgba(255,255,255,0.1)" stroke-width="10" />
                <circle cx="60" cy="60" r="52" fill="none"
                        [attr.stroke]="categoryColor()"
                        stroke-width="10"
                        stroke-linecap="round"
                        [attr.stroke-dasharray]="dashArray()"
                        [attr.stroke-dashoffset]="dashOffset()" />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-4xl font-black text-white">{{ result()!.score }}</span>
                <span class="text-xs text-gray-400">/{{ result()!.max_score }}</span>
              </div>
            </div>

            <div class="mb-3">
              <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider"
                    [ngClass]="categoryBadgeClass()">
                <i [class]="categoryIcon()"></i>
                {{ categoryLabel() }}
              </span>
            </div>

            <div class="mt-3">
              @if (result()!.eligible) {
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
                  <i class="pi pi-check-circle text-green-400"></i>
                  <span class="text-green-300 text-sm font-semibold">Elegible para préstamo</span>
                </div>
              } @else {
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30">
                  <i class="pi pi-times-circle text-red-400"></i>
                  <span class="text-red-300 text-sm font-semibold">No elegible para préstamo</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Factores -->
        <div class="space-y-3">
          <h3 class="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2 px-1">
            <i class="pi pi-chart-bar"></i> Desglose de factores (últimos 6 meses)
          </h3>

          <!-- Antigüedad -->
          @if (result()!.factors.tenure; as f) {
            <div class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <i class="pi pi-calendar text-blue-400"></i>
                  <span class="text-sm font-semibold text-white">Antigüedad</span>
                </div>
                <span class="text-sm font-bold" [ngClass]="factorScoreClass(f)">
                  {{ f.score }}/{{ f.max }}
                </span>
              </div>
              <div class="w-full bg-neutral-700 rounded-full h-2 mb-2">
                <div class="h-2 rounded-full transition-all duration-500"
                     [ngClass]="factorBarClass(f)"
                     [style.width.%]="(f.score / f.max) * 100"></div>
              </div>
              <p class="text-xs text-gray-400 m-0">{{ f.label }} ({{ f.months }} meses)</p>
            </div>
          }

          <!-- Puntualidad -->
          @if (result()!.factors.punctuality; as f) {
            <div class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <i class="pi pi-clock text-amber-400"></i>
                  <span class="text-sm font-semibold text-white">Puntualidad</span>
                </div>
                <span class="text-sm font-bold" [ngClass]="factorScoreClass(f)">
                  {{ f.score }}/{{ f.max }}
                </span>
              </div>
              <div class="w-full bg-neutral-700 rounded-full h-2 mb-2">
                <div class="h-2 rounded-full transition-all duration-500"
                     [ngClass]="factorBarClass(f)"
                     [style.width.%]="(f.score / f.max) * 100"></div>
              </div>
              <p class="text-xs text-gray-400 m-0">{{ f.label }}</p>
              @if (f.late_count > 0) {
                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                  <span class="px-2 py-0.5 rounded bg-neutral-700/80 text-gray-300">
                    {{ f.late_count }} tardanza(s)
                  </span>
                  <span class="px-2 py-0.5 rounded bg-neutral-700/80 text-gray-300">
                    {{ f.total_minutes_late }} min totales
                  </span>
                  <span class="px-2 py-0.5 rounded bg-neutral-700/80 text-gray-300">
                    Prom: {{ f.avg_minutes_late }} min/tardanza
                  </span>
                </div>
              }
            </div>
          }

          <!-- Asistencia -->
          @if (result()!.factors.attendance; as f) {
            <div class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <i class="pi pi-user-plus text-green-400"></i>
                  <span class="text-sm font-semibold text-white">Asistencia</span>
                </div>
                <span class="text-sm font-bold" [ngClass]="factorScoreClass(f)">
                  {{ f.score }}/{{ f.max }}
                </span>
              </div>
              <div class="w-full bg-neutral-700 rounded-full h-2 mb-2">
                <div class="h-2 rounded-full transition-all duration-500"
                     [ngClass]="factorBarClass(f)"
                     [style.width.%]="(f.score / f.max) * 100"></div>
              </div>
              <p class="text-xs text-gray-400 m-0">{{ f.label }}</p>
              @if (f.unjustified_absences > 0) {
                <div class="mt-2">
                  <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs border border-red-500/30">
                    {{ f.unjustified_absences }} ausencia(s) no justificada(s) — penalidad x2
                  </span>
                </div>
              }
            </div>
          }

          <!-- Endeudamiento -->
          @if (result()!.factors.debt_level; as f) {
            <div class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <i class="pi pi-wallet text-purple-400"></i>
                  <span class="text-sm font-semibold text-white">Endeudamiento</span>
                </div>
                <span class="text-sm font-bold" [ngClass]="factorScoreClass(f)">
                  {{ f.score }}/{{ f.max }}
                </span>
              </div>
              <div class="w-full bg-neutral-700 rounded-full h-2 mb-2">
                <div class="h-2 rounded-full transition-all duration-500"
                     [ngClass]="factorBarClass(f)"
                     [style.width.%]="(f.score / f.max) * 100"></div>
              </div>
              <p class="text-xs text-gray-400 m-0">{{ f.label }}</p>
              @if (f.active_loans > 0) {
                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                  <span class="px-2 py-0.5 rounded bg-neutral-700/80 text-gray-300">
                    {{ f.active_loans }} préstamo(s) activo(s)
                  </span>
                  <span class="px-2 py-0.5 rounded bg-neutral-700/80 text-gray-300">
                    Saldo: {{ f.total_debt_balance | currency:'$' }}
                  </span>
                  <span class="px-2 py-0.5 rounded bg-neutral-700/80 text-gray-300">
                    Cuota: {{ f.installment_per_period | currency:'$' }}/quinc.
                  </span>
                </div>
              }
            </div>
          }

          <!-- Historial -->
          @if (result()!.factors.credit_history; as f) {
            <div class="rounded-xl bg-neutral-800/80 border border-neutral-700/50 p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <i class="pi pi-history text-cyan-400"></i>
                  <span class="text-sm font-semibold text-white">Historial Crediticio</span>
                </div>
                <span class="text-sm font-bold" [ngClass]="factorScoreClass(f)">
                  {{ f.score }}/{{ f.max }}
                </span>
              </div>
              <div class="w-full bg-neutral-700 rounded-full h-2 mb-2">
                <div class="h-2 rounded-full transition-all duration-500"
                     [ngClass]="factorBarClass(f)"
                     [style.width.%]="(f.score / f.max) * 100"></div>
              </div>
              <p class="text-xs text-gray-400 m-0">{{ f.label }}</p>
            </div>
          }
        </div>

        <!-- Footer info -->
        <p class="text-[10px] text-gray-600 text-center m-0 pt-2">
          Calculado en base a datos de los últimos 6 meses. Puntaje máximo: 1000.
        </p>
      </div>
    }
  `,
})
export class EmployeeCreditScoreComponent {
  employeeId = input.required<string>();

  private creditScoreService = inject(CreditScoreService);

  loading = signal(true);
  error = signal<string | null>(null);
  result = signal<CreditScoreResult | null>(null);

  constructor() {
    effect(() => {
      const id = this.employeeId();
      if (id) this.loadScore(id);
    });
  }

  private async loadScore(employeeId: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.creditScoreService.calculate(employeeId);
      if (res.error && !res.score && res.score !== 0) {
        this.error.set(res.error);
      } else {
        this.result.set(res);
      }
    } catch (e: any) {
      this.error.set('No se pudo calcular el score. Verifique que la función existe en la base de datos.');
    } finally {
      this.loading.set(false);
    }
  }

  // SVG gauge helpers
  private readonly circumference = 2 * Math.PI * 52; // r=52

  dashArray() {
    return `${this.circumference}`;
  }

  dashOffset() {
    const r = this.result();
    if (!r) return this.circumference;
    const pct = r.score / r.max_score;
    return this.circumference * (1 - pct);
  }

  // Category styling
  categoryColor() {
    const cat = this.result()?.category;
    switch (cat) {
      case 'excelente': return '#22c55e';
      case 'bueno': return '#3b82f6';
      case 'regular': return '#eab308';
      case 'bajo': return '#f97316';
      case 'critico': return '#ef4444';
      default: return '#6b7280';
    }
  }

  categoryBorderClass() {
    const cat = this.result()?.category;
    switch (cat) {
      case 'excelente': return 'border-green-500/30';
      case 'bueno': return 'border-blue-500/30';
      case 'regular': return 'border-yellow-500/30';
      case 'bajo': return 'border-orange-500/30';
      case 'critico': return 'border-red-500/30';
      default: return 'border-neutral-700/50';
    }
  }

  categoryBgClass() {
    const cat = this.result()?.category;
    switch (cat) {
      case 'excelente': return 'bg-gradient-to-b from-green-900/30 to-neutral-900';
      case 'bueno': return 'bg-gradient-to-b from-blue-900/30 to-neutral-900';
      case 'regular': return 'bg-gradient-to-b from-yellow-900/20 to-neutral-900';
      case 'bajo': return 'bg-gradient-to-b from-orange-900/20 to-neutral-900';
      case 'critico': return 'bg-gradient-to-b from-red-900/20 to-neutral-900';
      default: return 'bg-neutral-900';
    }
  }

  categoryBadgeClass() {
    const cat = this.result()?.category;
    switch (cat) {
      case 'excelente': return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'bueno': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'regular': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'bajo': return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
      case 'critico': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default: return 'bg-neutral-700 text-gray-300';
    }
  }

  categoryIcon() {
    const cat = this.result()?.category;
    switch (cat) {
      case 'excelente': return 'pi pi-star-fill';
      case 'bueno': return 'pi pi-thumbs-up-fill';
      case 'regular': return 'pi pi-minus-circle';
      case 'bajo': return 'pi pi-exclamation-triangle';
      case 'critico': return 'pi pi-times-circle';
      default: return 'pi pi-question-circle';
    }
  }

  categoryLabel() {
    const cat = this.result()?.category;
    switch (cat) {
      case 'excelente': return 'Excelente';
      case 'bueno': return 'Bueno';
      case 'regular': return 'Regular';
      case 'bajo': return 'Bajo';
      case 'critico': return 'Crítico';
      default: return 'N/A';
    }
  }

  // Factor bar helpers
  factorScoreClass(f: CreditScoreFactor) {
    const pct = f.score / f.max;
    if (pct >= 0.8) return 'text-green-400';
    if (pct >= 0.6) return 'text-blue-400';
    if (pct >= 0.4) return 'text-yellow-400';
    if (pct >= 0.2) return 'text-orange-400';
    return 'text-red-400';
  }

  factorBarClass(f: CreditScoreFactor) {
    const pct = f.score / f.max;
    if (pct >= 0.8) return 'bg-green-500';
    if (pct >= 0.6) return 'bg-blue-500';
    if (pct >= 0.4) return 'bg-yellow-500';
    if (pct >= 0.2) return 'bg-orange-500';
    return 'bg-red-500';
  }
}
