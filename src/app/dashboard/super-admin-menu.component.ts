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
import { TimeclockDebugService, RandomEffect, EasterEgg } from '../services/timeclock-debug.service';
import { playEffectSound, initAudioContext } from '../timeclock/timeclock-audio.utils';
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

    <!-- ============== PREVIEW DE EFECTOS EN VIVO ============== -->
    @if (previewActive(); as pv) {
      <div class="fx-preview-overlay" (click)="stopPreview()">
        <div
          class="confirm-modal-card fx-preview-card"
          [class.is-matrix]="pv.egg === 'matrix'"
          [class.is-moto]="pv.egg === 'moto'"
          [class.is-batman]="pv.egg === 'batman'"
          [class.is-starwars]="pv.egg === 'starwars'"
          [class.is-corridos]="pv.egg === 'corridos'"
          [class.is-watchdogs]="pv.egg === 'watchdogs'"
          [class.is-birthday]="pv.egg === 'birthday'"
          [class.fx-shake]="pv.effect === 'shake'"
          [class.fx-jackpot]="pv.effect === 'jackpot'"
          [class.fx-rainbow]="pv.effect === 'rainbow'"
          [class.fx-fire]="pv.effect === 'fire'"
          [class.fx-tornado-card]="pv.effect === 'tornado'"
          [class.fx-glitch-card]="pv.effect === 'glitch'"
          [class.fx-disco-card]="pv.effect === 'disco'"
          [class.fx-vhs-card]="pv.effect === 'vhs'"
          [class.fx-boom-card]="pv.effect === 'boom'"
          (click)="$event.stopPropagation()"
        >
          @if (pv.egg === 'birthday') {
            <div class="confetti-container">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]; track i) {
                <div class="confetti-piece" [style.--i]="i"></div>
              }
            </div>
          }
          @if (pv.effect === 'paw_rain') {
            <div class="fx-overlay fx-paw-rain">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]; track i) {
                <span class="fx-paw" [style.--i]="i">🐾</span>
              }
            </div>
          }
          @if (pv.effect === 'emoji_explosion') {
            <div class="fx-overlay fx-emoji-explosion">
              @for (e of PREVIEW_EMOJI_LIST; track $index) {
                <span class="fx-emoji" [style.--i]="$index">{{ e }}</span>
              }
            </div>
          }
          @if (pv.effect === 'jackpot') {
            <div class="fx-overlay fx-jackpot-overlay">
              <div class="fx-jackpot-text">¡JACKPOT!</div>
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]; track i) {
                <span class="fx-coin" [style.--i]="i">🪙</span>
              }
            </div>
          }
          @if (pv.effect === 'unicorn') {
            <div class="fx-overlay fx-unicorn">
              <span class="fx-unicorn-glyph">🦄</span>
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12]; track i) {
                <span class="fx-sparkle" [style.--i]="i">✨</span>
              }
            </div>
          }
          @if (pv.effect === 'pizza') {
            <div class="fx-overlay fx-pizza-rain">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12]; track i) {
                <span class="fx-pizza" [style.--i]="i">🍕</span>
              }
            </div>
          }
          @if (pv.effect === 'fireworks') {
            <div class="fx-overlay fx-fireworks">
              @for (i of [1,2,3,4,5,6,7,8]; track i) {
                <span class="fx-firework" [style.--i]="i">🎆</span>
              }
            </div>
          }
          @if (pv.effect === 'fire') {
            <div class="fx-overlay fx-fire-overlay">
              @for (i of [1,2,3,4,5,6,7,8,9,10]; track i) {
                <span class="fx-flame" [style.--i]="i">🔥</span>
              }
            </div>
          }
          @if (pv.effect === 'money_rain') {
            <div class="fx-overlay fx-money-rain">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]; track i) {
                <span class="fx-bill" [style.--i]="i">💵</span>
              }
            </div>
          }
          @if (pv.effect === 'heart_burst') {
            <div class="fx-overlay fx-heart-burst">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]; track i) {
                <span class="fx-heart" [style.--i]="i">❤️</span>
              }
            </div>
          }
          @if (pv.effect === 'disco') {
            <div class="fx-overlay fx-disco">
              <span class="fx-disco-ball">🪩</span>
            </div>
          }
          @if (pv.effect === 'lightning') {
            <div class="fx-overlay fx-lightning">
              @for (i of [1,2,3,4,5]; track i) {
                <span class="fx-bolt" [style.--i]="i">⚡</span>
              }
            </div>
          }
          @if (pv.effect === 'tornado') { <div class="fx-overlay fx-tornado"></div> }
          @if (pv.effect === 'glitch') { <div class="fx-overlay fx-glitch"></div> }
          @if (pv.effect === 'boom') {
            <div class="fx-overlay fx-boom">
              <span class="fx-boom-text">¡BOOM!</span>
            </div>
          }
          @if (pv.effect === 'stars_warp') {
            <div class="fx-overlay fx-stars-warp">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]; track i) {
                <span class="fx-star" [style.--i]="i">✦</span>
              }
            </div>
          }
          @if (pv.effect === 'confetti_cannon') {
            <div class="fx-overlay fx-confetti-cannon">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]; track i) {
                <span class="fx-confetti" [style.--i]="i" [style.--side]="i % 2 === 0 ? '1' : '-1'"></span>
              }
            </div>
          }
          @if (pv.effect === 'dragon_energy') {
            <div class="fx-overlay fx-dragon-energy">
              <div class="fx-aura fx-aura-1"></div>
              <div class="fx-aura fx-aura-2"></div>
              <div class="fx-aura fx-aura-3"></div>
            </div>
          }
          @if (pv.effect === 'panama_flag') {
            <div class="fx-overlay fx-panama">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12]; track i) {
                <span class="fx-flag" [style.--i]="i">🇵🇦</span>
              }
            </div>
          }
          @if (pv.effect === 'vhs') {
            <div class="fx-overlay fx-vhs">
              <div class="fx-vhs-noise"></div>
              <div class="fx-vhs-scanline"></div>
              <div class="fx-vhs-text">► REC ●</div>
            </div>
          }
          @if (pv.effect === 'laser_show') {
            <div class="fx-overlay fx-laser-show">
              @for (i of [1,2,3,4,5,6,7,8]; track i) {
                <span class="fx-laser" [style.--i]="i"></span>
              }
            </div>
          }
          @if (pv.effect === 'beer') {
            <div class="fx-overlay fx-beer">
              @for (i of [1,2,3,4,5,6,7,8,9,10]; track i) {
                <span class="fx-beer-mug" [style.--i]="i">🍻</span>
              }
            </div>
          }
          @if (pv.badge) { <div class="fx-badge">{{ pv.badge }}</div> }

          <div class="text-center p-6">
            <i class="pi pi-eye text-3xl text-amber-400 mb-3"></i>
            <div class="text-lg font-bold text-white mb-1">Preview</div>
            <div class="text-sm text-gray-300">
              {{ pv.effect ? 'Efecto: ' + pv.effect : pv.egg ? 'Easter egg: ' + pv.egg : '' }}
            </div>
            <div class="text-[11px] text-gray-500 mt-2 italic">
              Tocá fuera o esperá 5s para cerrar
            </div>
            <button class="mt-3 text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white" (click)="stopPreview()">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }

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
      header="🎮 MOD MENU — Super Admin"
      [(visible)]="dialogVisible"
      modal
      [dismissableMask]="true"
      [style]="{ width: 'min(620px, 95vw)', maxHeight: '90vh' }"
    >
      <!-- Tabs estilo GTA -->
      <div class="flex gap-1 mb-3 p-1 bg-black/30 rounded-lg border border-neutral-700/40">
        <button type="button" class="mod-tab" [class.active]="modTab() === 'impersonate'" (click)="modTab.set('impersonate')">
          <i class="pi pi-users"></i> Emular
        </button>
        <button type="button" class="mod-tab" [class.active]="modTab() === 'effects'" (click)="modTab.set('effects')">
          <i class="pi pi-sparkles"></i> Efectos
        </button>
        <button type="button" class="mod-tab" [class.active]="modTab() === 'eggs'" (click)="modTab.set('eggs')">
          <i class="pi pi-bullseye"></i> Easter Eggs
        </button>
        <button type="button" class="mod-tab" [class.active]="modTab() === 'phrases'" (click)="modTab.set('phrases')">
          <i class="pi pi-comment"></i> Otros
        </button>
      </div>

      @switch (modTab()) {
        @case ('impersonate') {
          <div class="flex flex-col gap-3">
            <div class="text-xs text-gray-400 italic">
              Solo cambia lo que ves. Las escrituras siguen registradas como tú. Sesión 30 min.
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
                    <button type="button" class="text-xs px-2 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 transition-colors" (click)="confirmAndStart(e)">
                      {{ e.first_name }} {{ e.father_name }}
                    </button>
                  }
                </div>
                <div class="border-t border-neutral-700/40 my-1"></div>
              </div>
            }

            <div class="flex flex-col gap-1 overflow-y-auto max-h-[50vh] -mx-1 px-1">
              @for (e of filtered(); track e.id) {
                <button type="button" class="text-left p-2.5 rounded-lg border transition-colors flex items-center gap-3"
                  [class]="impersonation.impersonatedEmployeeId() === e.id ? 'bg-purple-500/15 border-purple-500/50' : 'border-neutral-700/40 hover:bg-neutral-700/30'"
                  (click)="confirmAndStart(e)">
                  <div class="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-amber-200 shrink-0">{{ initials(e) }}</div>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-semibold text-white truncate">{{ e.first_name }} {{ e.father_name }}</div>
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
        }
        @case ('effects') {
          <div class="flex flex-col gap-3">
            <div class="p-3 rounded-lg border" [class]="debugSvc.config().enabled ? 'border-green-500/40 bg-green-500/5' : 'border-neutral-700/40 bg-black/20'">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [checked]="debugSvc.config().enabled" (change)="toggleDebug($any($event.target).checked)" class="w-4 h-4 accent-amber-500" />
                <span class="text-sm font-semibold text-white">Debug mode</span>
                <span class="text-[10px] text-gray-400 ml-auto">Si está OFF, los efectos siguen siendo random naturales</span>
              </label>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs text-gray-300">Multiplicador de probabilidad <span class="text-amber-400 font-bold">×{{ debugSvc.config().effectMultiplier }}</span></label>
              <div class="flex gap-1">
                <button type="button" class="mod-chip" [class.active]="debugSvc.config().effectMultiplier === 0" (click)="setEffectMultiplier(0)">Off (×0)</button>
                <button type="button" class="mod-chip" [class.active]="debugSvc.config().effectMultiplier === 1" (click)="setEffectMultiplier(1)">Normal (×1)</button>
                <button type="button" class="mod-chip" [class.active]="debugSvc.config().effectMultiplier === 3" (click)="setEffectMultiplier(3)">Alto (×3)</button>
                <button type="button" class="mod-chip" [class.active]="debugSvc.config().effectMultiplier === 10" (click)="setEffectMultiplier(10)">Casino (×10)</button>
              </div>
            </div>

            <div class="text-xs text-gray-400 italic pt-2 border-t border-neutral-700/40">
              Tocá un efecto y se aplicará en tu próxima marcación en /timeclock. Útil para probar sin esperar al RNG.
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              @for (e of EFFECT_LIST; track e.id) {
                <div class="mod-fx-card flex flex-col items-center justify-between" [class.queued]="debugSvc.config().forceNextEffect === e.id">
                  <div class="flex flex-col items-center pt-2">
                    <span class="text-2xl">{{ e.emoji }}</span>
                    <span class="text-[11px] font-semibold mt-1 text-center">{{ e.label }}</span>
                  </div>
                  <div class="flex gap-1 w-full mt-2">
                    <button type="button" class="mod-fx-btn primary" (click)="previewEffect(e.id)" title="Ver efecto en vivo ahora">
                      <i class="pi pi-play"></i> Probar
                    </button>
                    <button type="button" class="mod-fx-btn" (click)="queueEffect(e.id)" title="Aplicar al próximo marcaje real">
                      <i class="pi pi-clock"></i>
                    </button>
                  </div>
                  @if (debugSvc.config().forceNextEffect === e.id) {
                    <span class="text-[9px] text-amber-300 mt-1">en cola</span>
                  }
                </div>
              }
            </div>
            @if (debugSvc.config().forceNextEffect) {
              <p-button label="Cancelar efecto en cola" icon="pi pi-times" severity="secondary" [outlined]="true" size="small" (onClick)="clearForced()" />
            }
          </div>
        }
        @case ('eggs') {
          <div class="flex flex-col gap-3">
            <div class="text-xs text-gray-400 italic">
              Easter eggs de pantalla completa (Matrix, Moto, Batman, etc.). Se aplican en tu próxima marcación.
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              @for (e of EGG_LIST; track e.id) {
                <div class="mod-fx-card flex flex-col items-center justify-between" [class.queued]="debugSvc.config().forceNextEgg === e.id">
                  <div class="flex flex-col items-center pt-2">
                    <span class="text-2xl">{{ e.emoji }}</span>
                    <span class="text-[11px] font-semibold mt-1 text-center">{{ e.label }}</span>
                  </div>
                  <div class="flex gap-1 w-full mt-2">
                    <button type="button" class="mod-fx-btn primary" (click)="previewEgg(e.id)" title="Ver egg en vivo ahora">
                      <i class="pi pi-play"></i> Probar
                    </button>
                    <button type="button" class="mod-fx-btn" (click)="queueEgg(e.id)" title="Aplicar al próximo marcaje real">
                      <i class="pi pi-clock"></i>
                    </button>
                  </div>
                  @if (debugSvc.config().forceNextEgg === e.id) {
                    <span class="text-[9px] text-amber-300 mt-1">en cola</span>
                  }
                </div>
              }
            </div>
            @if (debugSvc.config().forceNextEgg) {
              <p-button label="Cancelar egg en cola" icon="pi pi-times" severity="secondary" [outlined]="true" size="small" (onClick)="clearForced()" />
            }
          </div>
        }
        @case ('phrases') {
          <div class="flex flex-col gap-3">
            <div class="text-xs text-gray-400 italic">
              Otras herramientas de debug.
            </div>
            <div class="p-3 rounded-lg border border-neutral-700/40 bg-black/20">
              <div class="text-[11px] font-bold text-gray-300 mb-2">Estado actual</div>
              <div class="text-xs text-gray-400 grid grid-cols-2 gap-y-1">
                <span>Debug:</span> <span [class]="debugSvc.config().enabled ? 'text-green-400' : 'text-gray-500'">{{ debugSvc.config().enabled ? 'ON' : 'OFF' }}</span>
                <span>Multiplicador:</span> <span class="text-amber-400">×{{ debugSvc.config().effectMultiplier }}</span>
                <span>Efecto en cola:</span> <span class="text-purple-300">{{ debugSvc.config().forceNextEffect || '—' }}</span>
                <span>Egg en cola:</span> <span class="text-purple-300">{{ debugSvc.config().forceNextEgg || '—' }}</span>
                <span>Impersonando:</span> <span class="text-purple-300">{{ impersonation.isImpersonating() ? 'sí' : 'no' }}</span>
              </div>
            </div>
            <p-button label="Resetear todos los overrides" icon="pi pi-refresh" severity="warn" [outlined]="true" (onClick)="clearForced()" />
            <p-button label="Recargar página" icon="pi pi-replay" severity="secondary" [outlined]="true" (onClick)="reload()" />
          </div>
        }
      }
    </p-dialog>
  `,
})
export class SuperAdminMenuComponent implements OnInit, OnDestroy {
  public store = inject(DashboardStore);
  public impersonation = inject(ImpersonationService);
  public debugSvc = inject(TimeclockDebugService);
  private confirmSvc = inject(ConfirmationService);
  private route = inject(ActivatedRoute);

  /** Tab activa del mod menu */
  public modTab = signal<'impersonate' | 'effects' | 'eggs' | 'phrases'>('impersonate');
  public readonly EFFECT_LIST: { id: NonNullable<RandomEffect>; label: string; emoji: string }[] = [
    { id: 'paw_rain', label: 'Lluvia huellitas', emoji: '🐾' },
    { id: 'emoji_explosion', label: 'Explosión emojis', emoji: '💥' },
    { id: 'jackpot', label: 'Jackpot dorado', emoji: '🪙' },
    { id: 'shake', label: 'Sismo modal', emoji: '〰️' },
    { id: 'unicorn', label: 'Unicornio', emoji: '🦄' },
    { id: 'pizza', label: 'Lluvia pizza', emoji: '🍕' },
    { id: 'fireworks', label: 'Fuegos artificiales', emoji: '🎆' },
    { id: 'rainbow', label: 'Arcoíris', emoji: '🌈' },
    { id: 'fire', label: 'Modo fuego', emoji: '🔥' },
    { id: 'money_rain', label: 'Lluvia de billetes', emoji: '💵' },
    { id: 'heart_burst', label: 'Explosión corazones', emoji: '❤️' },
    { id: 'disco', label: 'Disco party', emoji: '🪩' },
    { id: 'lightning', label: 'Rayos', emoji: '⚡' },
    { id: 'tornado', label: 'Tornado giro', emoji: '🌪️' },
    { id: 'glitch', label: 'Glitch RGB', emoji: '📺' },
    { id: 'boom', label: '¡BOOM!', emoji: '💢' },
    { id: 'stars_warp', label: 'Warp estrellas', emoji: '🌌' },
    { id: 'confetti_cannon', label: 'Cañón confeti', emoji: '🎊' },
    { id: 'dragon_energy', label: 'Energía aura', emoji: '🐉' },
    { id: 'panama_flag', label: 'Panamá patria', emoji: '🇵🇦' },
    { id: 'vhs', label: 'VHS retro', emoji: '📼' },
    { id: 'laser_show', label: 'Láser show', emoji: '💫' },
    { id: 'beer', label: 'Brindis', emoji: '🍻' },
  ];
  public readonly EGG_LIST: { id: NonNullable<EasterEgg>; label: string; emoji: string }[] = [
    { id: 'matrix', label: 'Matrix', emoji: '🟢' },
    { id: 'moto', label: 'Moto GP', emoji: '🏍️' },
    { id: 'batman', label: 'Batman', emoji: '🦇' },
    { id: 'starwars', label: 'Star Wars', emoji: '⚔️' },
    { id: 'corridos', label: 'Corridos', emoji: '🎸' },
    { id: 'watchdogs', label: 'Watch Dogs', emoji: '🦊' },
    { id: 'birthday', label: 'Cumpleaños 🎂', emoji: '🎂' },
  ];

  public toggleDebug(enabled: boolean): void {
    this.debugSvc.update({ enabled });
  }
  public setEffectMultiplier(m: number): void {
    this.debugSvc.update({ effectMultiplier: m });
  }
  /** Encola el efecto para la próxima marcación real. */
  public queueEffect(e: NonNullable<RandomEffect>): void {
    this.debugSvc.update({ enabled: true, forceNextEffect: e });
  }
  public queueEgg(e: NonNullable<EasterEgg>): void {
    this.debugSvc.update({ enabled: true, forceNextEgg: e });
  }
  public clearForced(): void {
    this.debugSvc.update({ forceNextEffect: null, forceNextEgg: null, forceNextPhrasePool: null });
  }

  // ============== PREVIEW EN VIVO (sin necesidad de marcar) ==============
  public previewActive = signal<{
    effect: RandomEffect;
    egg: EasterEgg;
    badge: string | null;
  } | null>(null);
  private previewTimer?: any;

  public previewEffect(e: NonNullable<RandomEffect>): void {
    initAudioContext();
    this.runPreview({ effect: e, egg: null, badge: this.pickPreviewBadge() });
    setTimeout(() => playEffectSound(e), 100);
  }
  public previewEgg(e: NonNullable<EasterEgg>): void {
    this.runPreview({ effect: null, egg: e, badge: null });
  }
  private runPreview(data: { effect: RandomEffect; egg: EasterEgg; badge: string | null }): void {
    this.previewActive.set(data);
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => this.previewActive.set(null), 5000);
  }
  public stopPreview(): void {
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.previewActive.set(null);
  }
  private pickPreviewBadge(): string {
    const badges = ['🏆 PREVIEW', '🎮 MOD MENU', '🧪 TEST MODE', '⚡ DEBUG'];
    return badges[Math.floor(Math.random() * badges.length)];
  }
  public readonly PREVIEW_EMOJI_LIST = ['🎉','🎊','💥','⭐','✨','🌟','💫','🎯','🏆','🥇','🚀','💎','🐶','🐕','🦴','🐾','❤️','💪','👏','🙌'];

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

  public reload(): void {
    window.location.reload();
  }
}
