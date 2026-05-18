import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ApiUrlService } from '../../../../services/api-url.service';
import { OrganizationService } from '../../../../services/organization.service';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import { ItTicket, ItTicketCategory, ItTicketPriority } from '../../../../models';

// ── Opciones ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { label: string; value: ItTicketCategory; icon: string; description: string }[] = [
  { label: 'Hardware',          value: 'hardware', icon: 'pi-desktop',  description: 'PC, impresora, pantalla, teclado, mouse, equipo físico' },
  { label: 'Software / Acceso', value: 'software', icon: 'pi-key',      description: 'Programa que no abre, acceso a sistema, contraseña' },
  { label: 'Red / Internet',    value: 'network',  icon: 'pi-wifi',     description: 'Sin conexión, internet lento, problemas de red' },
  { label: 'Otro',              value: 'other',    icon: 'pi-wrench',   description: 'Cualquier otro problema técnico' },
];

const PRIORITY_OPTIONS: { label: string; value: ItTicketPriority; color: string; description: string }[] = [
  { label: 'Baja',    value: 'low',    color: 'text-gray-400',   description: 'No afecta operaciones, puede esperar' },
  { label: 'Media',   value: 'medium', color: 'text-blue-400',   description: 'Afecta parcialmente, necesita atención pronto' },
  { label: 'Alta',    value: 'high',   color: 'text-amber-400',  description: 'Impide trabajar con normalidad' },
  { label: 'Urgente', value: 'urgent', color: 'text-red-400',    description: 'Paraliza operaciones de la sucursal' },
];

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  hardware: { label: 'Hardware',          icon: 'pi-desktop', color: 'text-blue-400'  },
  software: { label: 'Software / Acceso', icon: 'pi-key',     color: 'text-purple-400'},
  network:  { label: 'Red / Internet',    icon: 'pi-wifi',    color: 'text-cyan-400'  },
  other:    { label: 'Otro',              icon: 'pi-wrench',  color: 'text-gray-400'  },
};

const STATUS_META: Record<string, { label: string; severity: 'warn' | 'info' | 'success' | 'secondary'; icon: string }> = {
  open:       { label: 'Abierto',    severity: 'warn',      icon: 'pi-circle-fill' },
  in_process: { label: 'En Proceso', severity: 'info',      icon: 'pi-spin pi-spinner' },
  resolved:   { label: 'Resuelto',   severity: 'success',   icon: 'pi-check-circle' },
  cancelled:  { label: 'Cancelado',  severity: 'secondary', icon: 'pi-times-circle' },
};

const PRIORITY_META: Record<string, { label: string; severity: 'danger' | 'warn' | 'info' | 'secondary' }> = {
  urgent: { label: 'Urgente', severity: 'danger'    },
  high:   { label: 'Alta',    severity: 'warn'      },
  medium: { label: 'Media',   severity: 'info'      },
  low:    { label: 'Baja',    severity: 'secondary' },
};

// ── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'pt-branch-manager-it-tickets-tab',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    HrStatsGridComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ═══════════ DESKTOP ═══════════ -->
    @if (!isMobile()) {
    <div class="space-y-3">

      <!-- Stats -->
      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="openCount()"
        [approvedCount]="resolvedCount()"
        [rejectedCount]="cancelledCount()"
        icon="pi-desktop"
        approvedLabel="Resueltos"
        
      />

      <!-- Banner informativo -->
      <div class="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-neutral-800/60 rounded-lg border border-blue-500/20 p-3 flex items-start gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <i class="pi pi-info-circle text-blue-400 text-sm"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-blue-300 m-0 mb-0.5">¿Cómo funciona?</p>
          <p class="text-xs text-gray-400 m-0 leading-relaxed">
            Crea un ticket para reportar cualquier problema técnico en tu sucursal.
            El equipo IT lo revisará y actualizará el estado.
            Puedes cancelar un ticket si ya no es necesario mientras esté <strong class="text-amber-300">Abierto</strong>.
          </p>
        </div>
        <p-button
          icon="pi pi-plus"
          label="Nuevo Ticket"
          severity="success"
          size="small"
          (onClick)="openCreateDialog()"
          class="flex-shrink-0"
        />
      </div>

      <!-- Filtros -->
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm">
        <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer"
             (click)="showFilters.set(!showFilters())">
          <div class="flex items-center gap-2">
            <i class="pi pi-filter text-amber-400 text-sm"></i>
            <h3 class="text-sm font-semibold text-white m-0">Filtros</h3>
            @if (hasActiveFilters()) {
              <span class="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-bold">
                {{ activeFiltersCount() }} activos
              </span>
            }
          </div>
          <i class="pi text-sm"
             [class.pi-chevron-down]="!showFilters()"
             [class.pi-chevron-up]="showFilters()"
             [class.text-gray-400]="!showFilters()"
             [class.text-amber-400]="showFilters()"></i>
        </div>
        @if (showFilters()) {
        <div class="p-3 space-y-2">
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-tag mr-1 text-amber-400 text-xs"></i>Estado
              </label>
              <p-select [options]="statusFilterOptions" [(ngModel)]="filterStatus"
                placeholder="Todos" [showClear]="true" styleClass="w-full text-sm"
                [style]="{ height: '32px' }" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-desktop mr-1 text-amber-400 text-xs"></i>Categoría
              </label>
              <p-select [options]="categoryFilterOptions" [(ngModel)]="filterCategory"
                placeholder="Todas" [showClear]="true" styleClass="w-full text-sm"
                [style]="{ height: '32px' }" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-exclamation-triangle mr-1 text-amber-400 text-xs"></i>Prioridad
              </label>
              <p-select [options]="priorityFilterOptions" [(ngModel)]="filterPriority"
                placeholder="Todas" [showClear]="true" styleClass="w-full text-sm"
                [style]="{ height: '32px' }" />
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-neutral-700/50">
            <p-button label="Limpiar" icon="pi pi-filter-slash"
              [outlined]="true" severity="secondary" size="small"
              (onClick)="clearFilters()" [disabled]="!hasActiveFilters()" />
            <span class="text-xs text-gray-400">
              {{ filteredTickets().length }} de {{ allTickets().length }} tickets
            </span>
          </div>
        </div>
        }
      </div>

      <!-- Tabla -->
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden">
        <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white m-0 flex items-center gap-1.5">
            <i class="pi pi-desktop text-amber-400 text-sm"></i>
            Tickets de Soporte IT
          </h3>
          <p-button icon="pi pi-refresh" [text]="true" severity="secondary" size="small"
            [rounded]="true" [loading]="ticketsApi.isLoading()" (onClick)="ticketsApi.reload()"
            pTooltip="Actualizar" tooltipPosition="top" />
        </div>

        @if (ticketsApi.isLoading()) {
        <div class="flex justify-center items-center py-8">
          <div class="text-center">
            <p-progressSpinner />
            <p class="text-gray-400 mt-2 text-sm">Cargando tickets...</p>
          </div>
        </div>
        } @else if (filteredTickets().length === 0 && allTickets().length === 0) {
        <!-- Empty state: primer ticket -->
        <div class="flex flex-col items-center justify-center py-10 text-center px-6">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center mb-4">
            <i class="pi pi-desktop text-3xl text-blue-400"></i>
          </div>
          <h4 class="text-base font-semibold text-gray-200 mb-1">Sin tickets registrados</h4>
          <p class="text-gray-500 text-sm mb-4 max-w-sm">
            Reporta cualquier problema técnico en tu sucursal — computadoras, impresoras,
            internet, software, cámaras — y el equipo IT lo atenderá.
          </p>
          <p-button label="Crear primer ticket" icon="pi pi-plus"
            severity="success" (onClick)="openCreateDialog()" />
        </div>
        } @else if (filteredTickets().length === 0) {
        <div class="flex flex-col items-center justify-center py-8 text-center">
          <i class="pi pi-inbox text-4xl text-gray-600 mb-2"></i>
          <h4 class="text-sm font-semibold text-gray-300 mb-1">Sin resultados para los filtros</h4>
          <p-button label="Limpiar filtros" icon="pi pi-filter-slash"
            [outlined]="true" severity="secondary" size="small" (onClick)="clearFilters()" class="mt-1" />
        </div>
        } @else {
        <div class="overflow-x-auto">
          <p-table [value]="filteredTickets()" [paginator]="true" [rows]="8"
            [rowsPerPageOptions]="[5, 8, 15, 25]" paginatorPosition="bottom"
            styleClass="p-datatable-striped p-datatable-sm"
            [tableStyle]="{ 'min-width': '48rem' }">
            <ng-template pTemplate="header">
              <tr>
                <th style="width:50px; padding:0.5rem; text-align:center;">
                  <span class="text-xs text-gray-400">#</span>
                </th>
                <th style="padding:0.5rem; text-align:left;">
                  <div class="flex items-center gap-1">
                    <i class="pi pi-file-edit text-amber-400 text-xs"></i>
                    <span class="text-xs">Título / Descripción</span>
                  </div>
                </th>
                <th style="width:150px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-desktop text-amber-400 text-xs"></i>
                    <span class="text-xs">Categoría</span>
                  </div>
                </th>
                <th style="width:100px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-exclamation-triangle text-amber-400 text-xs"></i>
                    <span class="text-xs">Prioridad</span>
                  </div>
                </th>
                <th style="width:120px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-tag text-amber-400 text-xs"></i>
                    <span class="text-xs">Estado</span>
                  </div>
                </th>
                <th style="width:110px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-calendar text-amber-400 text-xs"></i>
                    <span class="text-xs">Fecha</span>
                  </div>
                </th>
                <th style="width:80px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-cog text-amber-400 text-xs"></i>
                    <span class="text-xs">Acción</span>
                  </div>
                </th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-ticket>
              <tr class="hover:bg-neutral-700/30 transition-colors">
                <!-- # -->
                <td style="padding:0.5rem; text-align:center;">
                  <span class="text-[10px] text-gray-500 font-mono">#{{ ticket.id }}</span>
                </td>
                <!-- Título -->
                <td style="padding:0.5rem;">
                  <div class="flex flex-col gap-0.5 min-w-0">
                    <span class="text-xs font-semibold text-white">{{ ticket.title }}</span>
                    @if (ticket.description) {
                      <span class="text-[10px] text-gray-400 truncate max-w-xs"
                        [pTooltip]="ticket.description" tooltipPosition="top">
                        {{ ticket.description }}
                      </span>
                    }
                  </div>
                </td>
                <!-- Categoría -->
                <td style="padding:0.5rem; text-align:center;">
                  @if (ticket.category) {
                  <div class="flex items-center justify-center gap-1">
                    <i [class]="'pi ' + categoryMeta(ticket.category).icon + ' text-xs ' + categoryMeta(ticket.category).color"></i>
                    <span class="text-xs text-gray-300">{{ categoryMeta(ticket.category).label }}</span>
                  </div>
                  } @else {
                    <span class="text-gray-600 text-xs">—</span>
                  }
                </td>
                <!-- Prioridad -->
                <td style="padding:0.5rem; text-align:center;">
                  <p-tag [value]="priorityMeta(ticket.priority).label"
                    [severity]="priorityMeta(ticket.priority).severity"
                    [rounded]="true"
                    [style]="{ 'font-size': '0.7rem', padding: '0.125rem 0.5rem' }" />
                </td>
                <!-- Estado -->
                <td style="padding:0.5rem; text-align:center;">
                  <p-tag [value]="statusMeta(ticket.status).label"
                    [severity]="statusMeta(ticket.status).severity"
                    [rounded]="true"
                    [style]="{ 'font-size': '0.7rem', padding: '0.125rem 0.5rem' }" />
                </td>
                <!-- Fecha -->
                <td style="padding:0.5rem; text-align:center;">
                  <span class="text-[10px] text-gray-400">{{ ticket.created_at | date:'dd/MM/yyyy' }}</span>
                </td>
                <!-- Acción -->
                <td style="padding:0.5rem; text-align:center;" (click)="$event.stopPropagation()">
                  @if (ticket.status === 'open') {
                    <p-button icon="pi pi-times" [text]="true" severity="danger" size="small"
                      [rounded]="true" pTooltip="Cancelar ticket" tooltipPosition="left"
                      [loading]="cancellingId() === ticket.id"
                      (onClick)="cancelTicket(ticket)" />
                  } @else if (ticket.status === 'resolved') {
                    <i class="pi pi-check-circle text-emerald-400 text-sm"
                       pTooltip="Resuelto por IT" tooltipPosition="left"></i>
                  } @else {
                    <span class="text-gray-600 text-xs">—</span>
                  }
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
        }
      </div>
    </div>
    }

    <!-- ═══════════ MOBILE ═══════════ -->
    @if (isMobile()) {
    <div class="space-y-3">

      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="openCount()"
        [approvedCount]="resolvedCount()"
        [rejectedCount]="cancelledCount()"
        icon="pi-desktop"
        approvedLabel="Resueltos"
        
      />

      <!-- Botón nuevo + filtros -->
      <div class="flex gap-2">
        <p-button icon="pi pi-plus" label="Nuevo Ticket" severity="success"
          styleClass="flex-1" (onClick)="openCreateDialog()" />
        <button type="button" (click)="showFilters.set(!showFilters())"
          class="flex items-center gap-1 px-3 py-2 rounded-lg bg-neutral-800/80 border border-neutral-700/50 text-sm text-gray-300">
          <i class="pi pi-filter text-amber-400"></i>
          @if (hasActiveFilters()) {
            <span class="text-amber-400 text-xs">({{ activeFiltersCount() }})</span>
          }
        </button>
      </div>

      @if (showFilters()) {
      <div class="grid grid-cols-1 gap-2 p-3 bg-neutral-800/80 rounded-lg border border-neutral-700/50">
        <p-select [options]="statusFilterOptions" [(ngModel)]="filterStatus"
          placeholder="Estado" [showClear]="true" styleClass="w-full" />
        <p-select [options]="categoryFilterOptions" [(ngModel)]="filterCategory"
          placeholder="Categoría" [showClear]="true" styleClass="w-full" />
        <p-select [options]="priorityFilterOptions" [(ngModel)]="filterPriority"
          placeholder="Prioridad" [showClear]="true" styleClass="w-full" />
        <p-button label="Limpiar filtros" icon="pi pi-filter-slash"
          [outlined]="true" severity="secondary" size="small"
          (onClick)="clearFilters()" [disabled]="!hasActiveFilters()" />
      </div>
      }

      @if (ticketsApi.isLoading()) {
        <div class="flex justify-center py-8"><p-progressSpinner /></div>
      } @else if (allTickets().length === 0) {
        <div class="text-center py-10 px-4">
          <div class="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
            <i class="pi pi-desktop text-2xl text-blue-400"></i>
          </div>
          <p class="text-sm font-semibold text-gray-200 mb-1">Sin tickets registrados</p>
          <p class="text-xs text-gray-500 mb-3">Reporta problemas técnicos de tu sucursal</p>
          <p-button label="Crear primer ticket" icon="pi pi-plus"
            severity="success" size="small" (onClick)="openCreateDialog()" />
        </div>
      } @else if (filteredTickets().length === 0) {
        <div class="text-center py-6 text-gray-400">
          <i class="pi pi-inbox text-3xl block mb-2"></i>
          <p class="text-sm">Sin resultados</p>
          <p-button label="Limpiar filtros" icon="pi pi-filter-slash"
            [outlined]="true" severity="secondary" size="small"
            (onClick)="clearFilters()" class="mt-2" />
        </div>
      } @else {
        <div class="flex flex-col gap-2">
          @for (ticket of filteredTickets(); track ticket.id) {
          <div class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3 transition-colors">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 mb-0.5">
                  @if (ticket.category) {
                    <i [class]="'pi ' + categoryMeta(ticket.category).icon + ' text-xs ' + categoryMeta(ticket.category).color"></i>
                  }
                  <span class="font-semibold text-white text-sm truncate">{{ ticket.title }}</span>
                </div>
                @if (ticket.description) {
                  <p class="text-xs text-gray-400 m-0 truncate">{{ ticket.description }}</p>
                }
                <p class="text-[10px] text-gray-500 m-0 mt-1">{{ ticket.created_at | date:'dd/MM/yyyy' }}</p>
              </div>
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <p-tag [value]="statusMeta(ticket.status).label"
                  [severity]="statusMeta(ticket.status).severity"
                  [rounded]="true" [style]="{ 'font-size': '0.7rem' }" />
                <p-tag [value]="priorityMeta(ticket.priority).label"
                  [severity]="priorityMeta(ticket.priority).severity"
                  [rounded]="true" [style]="{ 'font-size': '0.65rem' }" />
              </div>
            </div>
            @if (ticket.status === 'open') {
            <div class="mt-2 pt-2 border-t border-neutral-700/40">
              <p-button icon="pi pi-times" label="Cancelar ticket" [text]="true"
                severity="danger" size="small" styleClass="p-0"
                [loading]="cancellingId() === ticket.id"
                (onClick)="cancelTicket(ticket)" />
            </div>
            }
          </div>
          }
        </div>
      }
    </div>
    }

    <!-- ═══════════ DIALOG: NUEVO TICKET ═══════════ -->
    <p-dialog
      [(visible)]="showDialog"
      header="Reportar Problema Técnico"
      [modal]="true"
      [style]="{ width: isMobile() ? '95vw' : '520px' }"
      [closable]="!saving()"
      (onHide)="resetForm()"
    >
      <div class="space-y-4 pt-1">

        <!-- Título -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold text-gray-200">
            ¿Cuál es el problema? <span class="text-red-400">*</span>
          </label>
          <p class="text-xs text-gray-500 m-0">Describe brevemente el problema en una oración</p>
          <input pInputText [(ngModel)]="form.title"
            placeholder='Ej: "Computadora de caja no enciende"'
            maxlength="200" class="w-full" />
        </div>

        <!-- Descripción -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold text-gray-200">
            Descripción detallada <span class="text-red-400">*</span>
          </label>
          <p class="text-xs text-gray-500 m-0">
            Incluye qué pasó, desde cuándo, qué intentaste hacer y si afecta a otros equipos
          </p>
          <textarea pTextarea [(ngModel)]="form.description"
            placeholder="Ej: Desde ayer en la mañana la PC de la caja no enciende. Revisar el cable de poder no funcionó. Afecta solo a esa computadora."
            [rows]="4" maxlength="1000" class="w-full resize-none"></textarea>
        </div>

        <!-- Categoría (visual cards) -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-gray-200">
            Categoría <span class="text-red-400">*</span>
          </label>
          <div class="grid grid-cols-2 gap-2">
            @for (cat of categoryOptions; track cat.value) {
            <button type="button"
              class="flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all"
              [class]="form.category === cat.value
                ? 'border-amber-400/60 bg-amber-500/10'
                : 'border-neutral-700/50 bg-neutral-800/60 hover:border-neutral-600'"
              (click)="form.category = cat.value">
              <i [class]="'pi ' + cat.icon + ' text-sm mt-0.5 ' + (form.category === cat.value ? 'text-amber-400' : 'text-gray-400')"></i>
              <div class="min-w-0">
                <p class="text-xs font-semibold m-0" [class]="form.category === cat.value ? 'text-amber-300' : 'text-gray-200'">
                  {{ cat.label }}
                </p>
                <p class="text-[10px] text-gray-500 m-0 leading-tight">{{ cat.description }}</p>
              </div>
            </button>
            }
          </div>
        </div>

        <!-- Prioridad -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-gray-200">Prioridad</label>
          <div class="grid grid-cols-4 gap-1.5">
            @for (p of priorityOptions; track p.value) {
            <button type="button"
              class="flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all"
              [class]="form.priority === p.value
                ? 'border-amber-400/60 bg-amber-500/10'
                : 'border-neutral-700/50 bg-neutral-800/60 hover:border-neutral-600'"
              [pTooltip]="p.description" tooltipPosition="top"
              (click)="form.priority = p.value">
              <span class="text-xs font-semibold" [class]="form.priority === p.value ? 'text-amber-300' : p.color">
                {{ p.label }}
              </span>
            </button>
            }
          </div>
          <p class="text-[10px] text-gray-500 m-0">
            <i class="pi pi-info-circle mr-1"></i>
            {{ selectedPriorityDescription() }}
          </p>
        </div>

      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary"
          [disabled]="saving()" (onClick)="showDialog = false" />
        <p-button label="Enviar al equipo IT" icon="pi pi-send"
          [loading]="saving()" [disabled]="!formValid()"
          (onClick)="submitTicket()" />
      </ng-template>
    </p-dialog>
  `,
})
export class BranchManagerItTicketsTabComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);
  private store = inject(DashboardStore);
  private deviceService = inject(DeviceService);
  private messageService = inject(MessageService);

  readonly categoryOptions = CATEGORY_OPTIONS;
  readonly priorityOptions = PRIORITY_OPTIONS;

  readonly statusFilterOptions = [
    { label: 'Abierto',    value: 'open'       },
    { label: 'En Proceso', value: 'in_process'  },
    { label: 'Resuelto',   value: 'resolved'    },
    { label: 'Cancelado',  value: 'cancelled'   },
  ];
  readonly categoryFilterOptions = CATEGORY_OPTIONS.map(c => ({ label: c.label, value: c.value }));
  readonly priorityFilterOptions = PRIORITY_OPTIONS.map(p => ({ label: p.label, value: p.value }));

  isMobile = computed(() => this.deviceService.isMobile());
  showDialog = false;
  showFilters = signal(false);
  saving = signal(false);
  cancellingId = signal<number | null>(null);

  filterStatus   = signal<string | null>(null);
  filterCategory = signal<string | null>(null);
  filterPriority = signal<string | null>(null);

  form = { title: '', description: '', category: null as ItTicketCategory | null, priority: 'medium' as ItTicketPriority };

  formValid = computed(() =>
    this.form.title.trim().length > 0 &&
    this.form.description.trim().length > 0 &&
    this.form.category !== null
  );

  selectedPriorityDescription = computed(() =>
    PRIORITY_OPTIONS.find(p => p.value === this.form.priority)?.description ?? ''
  );

  // ── Data ────────────────────────────────────────────────────────────────

  ticketsApi = httpResource<ItTicket[]>(() => {
    const branchId  = this.store.currentEmployee()?.branch_id;
    const companyId = this.orgService.getCurrentCompanyId();
    if (!branchId || !companyId) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/it_tickets', {
        branch_id:  `eq.${branchId}`,
        company_id: `eq.${companyId}`,
        order:      'created_at.desc',
        select:     'id,title,description,category,priority,status,created_at',
      }),
      method: 'GET',
    };
  });

  allTickets = computed(() => this.ticketsApi.value() ?? []);

  filteredTickets = computed(() => {
    let list = this.allTickets();
    const s = this.filterStatus();
    const c = this.filterCategory();
    const p = this.filterPriority();
    if (s) list = list.filter(t => t.status   === s);
    if (c) list = list.filter(t => t.category === c);
    if (p) list = list.filter(t => t.priority === p);
    return list;
  });

  // ── Stats ───────────────────────────────────────────────────────────────
  totalCount    = computed(() => this.allTickets().length);
  openCount     = computed(() => this.allTickets().filter(t => t.status === 'open').length);
  resolvedCount = computed(() => this.allTickets().filter(t => t.status === 'resolved').length);
  cancelledCount = computed(() => this.allTickets().filter(t => t.status === 'cancelled').length);

  hasActiveFilters = computed(() => !!(this.filterStatus() || this.filterCategory() || this.filterPriority()));
  activeFiltersCount = computed(() =>
    [this.filterStatus(), this.filterCategory(), this.filterPriority()].filter(Boolean).length
  );

  // ── Helpers ─────────────────────────────────────────────────────────────
  categoryMeta(cat: string)  { return CATEGORY_META[cat] ?? { label: cat, icon: 'pi-wrench', color: 'text-gray-400' }; }
  statusMeta(s: string)      { return STATUS_META[s]    ?? { label: s, severity: 'secondary' as const, icon: '' }; }
  priorityMeta(p: string)    { return PRIORITY_META[p]  ?? { label: p, severity: 'secondary' as const }; }

  clearFilters() {
    this.filterStatus.set(null);
    this.filterCategory.set(null);
    this.filterPriority.set(null);
  }

  openCreateDialog() {
    this.resetForm();
    this.showDialog = true;
  }

  resetForm() {
    this.form = { title: '', description: '', category: null, priority: 'medium' };
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async submitTicket() {
    if (!this.formValid()) return;
    const employee  = this.store.currentEmployee();
    const companyId = this.orgService.getCurrentCompanyId();
    if (!employee || !companyId) return;

    this.saving.set(true);
    try {
      const insertResponse = await firstValueFrom(
        this.http.post<Array<{ id: number }>>(
          this.apiUrl.build('rest/v1/it_tickets'),
          {
            title:        this.form.title.trim(),
            description:  this.form.description.trim(),
            category:     this.form.category,
            priority:     this.form.priority,
            status:       'open',
            branch_id:    employee.branch_id,
            company_id:   companyId,
            requester_id: employee.id,
          },
          { headers: { Prefer: 'return=representation', Accept: 'application/json' } }
        )
      );
      const newTicketId = Array.isArray(insertResponse) ? insertResponse[0]?.id : undefined;

      if (this.form.priority === 'urgent') {
        const branchName = this.store.currentBranch()?.name;
        const requesterName = `${employee.first_name ?? ''} ${employee.father_name ?? ''}`.trim();
        this.http.post('/api/notifications/it-ticket-urgent', {
          ticketId:      newTicketId,
          title:         this.form.title.trim(),
          description:   this.form.description.trim(),
          category:      this.form.category,
          branchName,
          requesterName,
        }).subscribe({ error: () => void 0 });
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Ticket enviado',
        detail: this.form.priority === 'urgent'
          ? 'El equipo IT recibió tu reporte URGENTE y será notificado por correo.'
          : 'El equipo IT recibió tu reporte y lo atenderá pronto.',
        life: 5000,
      });
      this.showDialog = false;
      this.ticketsApi.reload();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo crear el ticket. Intenta de nuevo.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async cancelTicket(ticket: ItTicket) {
    if (ticket.status !== 'open') return;
    this.cancellingId.set(ticket.id);
    try {
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/it_tickets', { id: `eq.${ticket.id}` }),
          { status: 'cancelled', updated_at: new Date().toISOString() },
          { headers: { Prefer: 'return=minimal' } }
        )
      );
      this.ticketsApi.reload();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cancelar el ticket.' });
    } finally {
      this.cancellingId.set(null);
    }
  }
}
