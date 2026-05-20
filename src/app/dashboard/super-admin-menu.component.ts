import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Tooltip } from 'primeng/tooltip';
import { ImpersonationService } from '../services/impersonation.service';
import { DashboardStore } from '../stores/dashboard.store';

/**
 * Botón flotante para el super-admin (Tristan Whitehead).
 * Funcionalidades:
 *  - Buscador de empleados + "Recientes"
 *  - Banner sticky con real + emulado + tiempo restante
 *  - Auto-expira a 30 min
 *  - Atajo Ctrl+Shift+I
 *  - Query param ?as=<id>
 *  - Confirm dialog antes de iniciar
 */
@Component({
  selector: 'pt-super-admin-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Dialog, ConfirmDialog, InputText, Tooltip],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-confirmDialog />

    @if (impersonation.isImpersonating() && impersonatedEmp(); as imp) {
      <div class="fixed top-0 inset-x-0 z-[10000] bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg">
        <div class="max-w-screen-2xl mx-auto px-3 py-1.5 flex items-center gap-3 text-sm">
          <i class="pi pi-eye text-base"></i>
          <div class="flex-1 truncate text-xs sm:text-sm">
            <span class="font-semibold">Modo emulación —</span>
            tú (<span class="opacity-80">{{ store.realEmployee()?.first_name }}</span>)
            viendo como
            <span class="font-bold">{{ imp.first_name }} {{ imp.father_name }}</span>
            @if (imp.position?.name) {
              <span class="text-purple-200">· {{ imp.position?.name }}</span>
            }
            <span class="ml-2 text-[10px] bg-white/15 rounded px-1.5 py-0.5 font-mono">
              {{ timeRemainingLabel() }}
            </span>
          </div>
          <button class="bg-white/15 hover:bg-white/25 rounded px-2 py-0.5 text-xs font-bold" (click)="goHome()">
            <i class="pi pi-home mr-1"></i><span class="hidden sm:inline">Inicio</span>
          </button>
          <button class="bg-white/15 hover:bg-white/25 rounded px-2 py-0.5 text-xs font-bold" (click)="openDialog()">
            <i class="pi pi-refresh mr-1"></i><span class="hidden sm:inline">Cambiar</span>
          </button>
          <button class="bg-white/25 hover:bg-white/35 rounded px-2 py-0.5 text-xs font-bold" (click)="stop()">
            <i class="pi pi-times mr-1"></i>Salir
          </button>
        </div>
      </div>
    }

    @if (store.isSuperAdmin()) {
      <button
        type="button"
        class="fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110"
        [class]="impersonation.isImpersonating()
          ? 'bg-gradient-to-br from-purple-600 to-fuchsia-600 ring-2 ring-purple-300/50'
          : 'bg-gradient-to-br from-amber-500 to-orange-600 ring-2 ring-amber-300/40'"
        (click)="openDialog()"
        pTooltip="Super-admin (Ctrl+Shift+I)"
        tooltipPosition="left"
      >
        <i class="pi pi-user-edit text-white text-lg"></i>
      </button>
    }

    <p-dialog
      header="Super-admin · Emular empleado"
      [(visible)]="dialogVisible"
      modal
      [dismissableMask]="true"
      [style]="{ width: 'min(560px, 95vw)', maxHeight: '85vh' }"
    >
      <div class="flex flex-col gap-3">
        <div class="text-xs text-gray-400 italic">
          Solo cambia lo que ves. Las escrituras siguen registradas como tú. La sesión se cierra sola a los 30 min.
        </div>

        <input
          pInputText
          placeholder="Buscar por nombre, cargo, sucursal o email..."
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
          autofocus
        />

        @if (!search() && recentList().length > 0) {
          <div class="flex flex-col gap-1">
            <span class="text-[11px] uppercase font-bold text-gray-500 tracking-wider px-1">Recientes</span>
            <div class="flex flex-wrap gap-1">
              @for (e of recentList(); track e.id) {
                <button
                  type="button"
                  class="text-xs px-2 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 transition-colors"
                  (click)="confirmAndStart(e)"
                >
                  {{ e.first_name }} {{ e.father_name }}
                </button>
              }
            </div>
            <div class="border-t border-neutral-700/40 my-1"></div>
          </div>
        }

        <div class="flex flex-col gap-1 overflow-y-auto max-h-[55vh] -mx-1 px-1">
          @for (e of filtered(); track e.id) {
            <button
              type="button"
              class="text-left p-2.5 rounded-lg border transition-colors flex items-center gap-3"
              [class]="impersonation.impersonatedEmployeeId() === e.id
                ? 'bg-purple-500/15 border-purple-500/50'
                : 'border-neutral-700/40 hover:bg-neutral-700/30'"
              (click)="confirmAndStart(e)"
            >
              <div class="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-amber-200 shrink-0">
                {{ initials(e) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-white truncate">
                  {{ e.first_name }} {{ e.father_name }}
                </div>
                <div class="text-[11px] text-gray-400 truncate">
                  {{ e.position?.name || 'Sin cargo' }}
                  @if (e.branch?.name) { · {{ e.branch?.name }} }
                  @if (e.work_email) { · <span class="text-gray-500">{{ e.work_email }}</span> }
                </div>
              </div>
              @if (impersonation.impersonatedEmployeeId() === e.id) {
                <i class="pi pi-check-circle text-purple-300"></i>
              }
            </button>
          } @empty {
            <div class="text-center text-sm text-gray-500 py-6">Sin resultados.</div>
          }
        </div>

        @if (impersonation.isImpersonating()) {
          <div class="flex justify-end pt-2 border-t border-neutral-700/50">
            <p-button label="Salir de emulación" icon="pi pi-times" severity="warn" [outlined]="true" (onClick)="stop()" />
          </div>
        }
      </div>
    </p-dialog>
  `,
})
export class SuperAdminMenuComponent implements OnInit, OnDestroy {
  public store = inject(DashboardStore);
  public impersonation = inject(ImpersonationService);
  private confirmSvc = inject(ConfirmationService);
  private route = inject(ActivatedRoute);

  public dialogVisible = signal(false);
  public search = signal('');
  public now = signal(Date.now());

  private expirationTimer?: any;

  public allEmployees = computed(() =>
    (this.store.employees.entities() as any[]).filter((e) => e.is_active !== false)
  );

  public filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const list = this.allEmployees();
    const ranked = !q
      ? list
      : list.filter((e: any) => {
          const fullName = `${e.first_name ?? ''} ${e.father_name ?? ''}`.toLowerCase();
          const pos = (e.position?.name || '').toLowerCase();
          const branch = (e.branch?.name || '').toLowerCase();
          const email = (e.work_email || e.email || '').toLowerCase();
          return fullName.includes(q) || pos.includes(q) || branch.includes(q) || email.includes(q);
        });
    return ranked
      .slice()
      .sort((a: any, b: any) => {
        const an = `${a.first_name ?? ''} ${a.father_name ?? ''}`.toLowerCase();
        const bn = `${b.first_name ?? ''} ${b.father_name ?? ''}`.toLowerCase();
        return an.localeCompare(bn);
      })
      .slice(0, 100);
  });

  public recentList = computed(() => {
    const ids = this.impersonation.recentImpersonations();
    const all = this.allEmployees();
    return ids.map((id) => all.find((e: any) => e.id === id)).filter(Boolean);
  });

  public impersonatedEmp = computed(() => {
    const id = this.impersonation.impersonatedEmployeeId();
    if (!id) return null;
    return (this.store.employees.entities() as any[]).find((e) => e.id === id) ?? null;
  });

  public timeRemainingLabel = computed(() => {
    const startedAt = this.impersonation.startedAt();
    if (!startedAt) return '';
    const remaining = this.impersonation.ttlMs - (this.now() - startedAt);
    if (remaining <= 0) return 'expira';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  /** Effect que registra clase en body para el padding del banner. */
  private readonly bodyClassEffect = effect(() => {
    const on = this.impersonation.isImpersonating();
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('impersonation-active', on);
  });

  /** Effect que limpia la emulación si el usuario real perdió la sesión o cambió. */
  private lastRealId: string | null | undefined = undefined;
  private readonly autoClearOnLogoutEffect = effect(() => {
    const realId = this.store.realEmployee()?.id ?? null;
    // Saltar primera ejecución (lastRealId undefined)
    if (this.lastRealId === undefined) {
      this.lastRealId = realId;
      return;
    }
    // Real cambió (logout o cambio de sesión) → limpiar
    if (this.lastRealId !== realId && this.impersonation.isImpersonating()) {
      this.impersonation.stopImpersonation();
    }
    this.lastRealId = realId;
  });

  ngOnInit(): void {
    // Soporte para ?as=<employeeId>
    const asId = this.route.snapshot.queryParamMap.get('as');
    if (asId && this.store.isSuperAdmin() && !this.impersonation.isImpersonating()) {
      setTimeout(() => this.startById(asId), 500);
    }
    // Timer de expiración + actualización del label cada segundo
    this.expirationTimer = setInterval(() => {
      this.now.set(Date.now());
      if (this.impersonation.checkExpiration()) {
        window.location.reload();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.expirationTimer) clearInterval(this.expirationTimer);
    if (typeof document !== 'undefined') document.body.classList.remove('impersonation-active');
  }

  /** Ctrl+Shift+I abre el diálogo (solo para super-admin). */
  @HostListener('document:keydown', ['$event'])
  public onKeydown(ev: KeyboardEvent): void {
    if (ev.ctrlKey && ev.shiftKey && (ev.key === 'I' || ev.key === 'i')) {
      if (this.store.isSuperAdmin()) {
        ev.preventDefault();
        this.openDialog();
      }
    }
  }

  public openDialog(): void {
    this.search.set('');
    this.dialogVisible.set(true);
  }

  public initials(e: any): string {
    return `${(e.first_name?.[0] || '').toUpperCase()}${(e.father_name?.[0] || '').toUpperCase()}`;
  }

  public confirmAndStart(employee: any): void {
    this.confirmSvc.confirm({
      header: 'Iniciar emulación',
      message: `¿Ver la app como <strong>${employee.first_name} ${employee.father_name}</strong> (${employee.position?.name || 'sin cargo'})? Las escrituras siguen registradas a tu nombre. La sesión expira automáticamente en 30 min.`,
      icon: 'pi pi-eye',
      acceptLabel: 'Sí, emular',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => this.start(employee.id),
    });
  }

  public async start(employeeId: string): Promise<void> {
    const realId = this.store.realEmployee()?.id;
    if (!realId) return;
    await this.impersonation.startImpersonation(employeeId, realId);
    this.dialogVisible.set(false);
    setTimeout(() => window.location.assign('/my-portal'), 200);
  }

  /** Variante para activación por query param (sin confirm). */
  private async startById(employeeId: string): Promise<void> {
    const realId = this.store.realEmployee()?.id;
    if (!realId) return;
    await this.impersonation.startImpersonation(employeeId, realId);
    setTimeout(() => window.location.assign('/my-portal'), 200);
  }

  public goHome(): void {
    window.location.assign('/my-portal');
  }

  public async stop(): Promise<void> {
    await this.impersonation.stopImpersonation();
    setTimeout(() => window.location.reload(), 200);
  }
}
