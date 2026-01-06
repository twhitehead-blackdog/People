import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AuditLog } from '../models';
import { AuditLogsStore } from '../stores/audit-logs.store';

@Component({
  selector: 'pt-admin-audit-logs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DropdownModule,
    DialogModule,
    InputText,
    TagModule,
    ToastModule,
    Card,
  ],
  template: `
    <p-toast />
    <div class="audit-logs-container">
      <div class="section-header">
        <h2>Registro de AuditorÃ­a</h2>
        <div class="header-info">
          <span class="info-text">Registro de todas las acciones realizadas en el sistema</span>
        </div>
      </div>

      <p-card>
        <p-table
          [value]="auditLogsStore.entities()"
          [paginator]="true"
          [rows]="25"
          [rowsPerPageOptions]="[10, 25, 50, 100]"
          [globalFilterFields]="['entity_type', 'entity_id', 'action', 'user_email', 'ip_address']"
          styleClass="p-datatable-striped"
          [loading]="auditLogsStore.isLoading()"
          [sortField]="'created_at'"
          [sortOrder]="-1"
          [filters]="globalFilters()"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <input
                type="text"
                pInputText
                placeholder="Buscar en logs..."
                (input)="onGlobalFilter($event)"
                class="search-input"
              />
              <p-dropdown
                [(ngModel)]="selectedEntityType"
                [options]="entityTypeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Filtrar por tipo"
                [showClear]="true"
                (onChange)="onEntityTypeFilterChange()"
                [style]="{ width: '180px' }"
              />
              <p-dropdown
                [(ngModel)]="selectedAction"
                [options]="actionOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Filtrar por acciÃ³n"
                [showClear]="true"
                (onChange)="onActionFilterChange()"
                [style]="{ width: '180px' }"
              />
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Fecha/Hora</th>
              <th>Entidad</th>
              <th>ID Entidad</th>
              <th>AcciÃ³n</th>
              <th>Usuario</th>
              <th>IP</th>
              <th>Detalles</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-log>
            <tr>
              <td>
                <div class="table-cell-content">
                  {{ formatDateTime(log.created_at) }}
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  <p-tag
                    [value]="getEntityTypeLabel(log.entity_type)"
                    [severity]="getEntityTypeSeverity(log.entity_type)"
                  />
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  <code class="entity-id">{{ log.entity_id.substring(0, 8) }}...</code>
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  <p-tag
                    [value]="getActionLabel(log.action)"
                    [severity]="getActionSeverity(log.action)"
                  />
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  {{ log.user_email || log.user_id || 'Sistema' }}
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  <code class="ip-address">{{ log.ip_address || 'N/A' }}</code>
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    severity="info"
                    (onClick)="viewLogDetails(log)"
                    title="Ver detalles"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7">No se encontraron registros de auditorÃ­a</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para ver detalles del log -->
    <p-dialog
      [visible]="showLogDialog()"
      (visibleChange)="showLogDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [header]="'Detalles del Registro de AuditorÃ­a'"
      [draggable]="false"
      [resizable]="false"
    >
      @if (selectedLog()) {
        <div class="log-details">
          <div class="detail-section">
            <h3>InformaciÃ³n General</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Fecha/Hora:</span>
                <span class="detail-value">{{ formatDateTime(selectedLog()!.created_at) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tipo de Entidad:</span>
                <span class="detail-value">{{ getEntityTypeLabel(selectedLog()!.entity_type) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">ID de Entidad:</span>
                <span class="detail-value"><code>{{ selectedLog()!.entity_id }}</code></span>
              </div>
              <div class="detail-item">
                <span class="detail-label">AcciÃ³n:</span>
                <span class="detail-value">{{ getActionLabel(selectedLog()!.action) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Usuario:</span>
                <span class="detail-value">{{ selectedLog()!.user_email || selectedLog()!.user_id || 'Sistema' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">IP Address:</span>
                <span class="detail-value"><code>{{ selectedLog()!.ip_address || 'N/A' }}</code></span>
              </div>
              @if (selectedLog()!.user_agent) {
                <div class="detail-item full-width">
                  <span class="detail-label">User Agent:</span>
                  <span class="detail-value"><code>{{ selectedLog()!.user_agent }}</code></span>
                </div>
              }
            </div>
          </div>

          @if (selectedLog()!.changes) {
            <div class="detail-section">
              <h3>Cambios Realizados</h3>
              <div class="changes-container">
                @for (change of getChangesArray(selectedLog()!.changes); track change.key) {
                  <div class="change-item">
                    <div class="change-header">
                      <strong>{{ change.key }}</strong>
                    </div>
                    <div class="change-content">
                      @if (change.old !== undefined) {
                        <div class="change-old">
                          <span class="change-label">Antes:</span>
                          <code>{{ formatChangeValue(change.old) }}</code>
                        </div>
                      }
                      @if (change.new !== undefined) {
                        <div class="change-new">
                          <span class="change-label">DespuÃ©s:</span>
                          <code>{{ formatChangeValue(change.new) }}</code>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @if (selectedLog()!.metadata) {
            <div class="detail-section">
              <h3>Metadatos</h3>
              <pre class="metadata-json">{{ formatJSON(selectedLog()!.metadata) }}</pre>
            </div>
          }
        </div>
      }
    </p-dialog>
  `,
  styles: [
    `
      .audit-logs-container {
        width: 100%;
        position: relative;
        overflow-x: hidden;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding: 1rem 0;
        border-bottom: 2px solid #e5e7eb;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .section-header h2 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        flex: 1;
        min-width: 200px;
      }

      .header-info {
        display: flex;
        align-items: center;
      }

      .info-text {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .search-input {
        flex: 1;
        max-width: 300px;
      }

      /* Asegurar que las tablas no se desborden */
      ::ng-deep .p-datatable {
        overflow-x: auto;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }

      /* Estilo para el contenido de las celdas de la tabla */
      ::ng-deep .p-datatable td .table-cell-content {
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
        padding: 0.5rem 0;
      }

      /* Asegurar que los diÃ¡logos no se sobrepongan */
      ::ng-deep .p-dialog {
        z-index: 1100 !important;
        position: fixed !important;
      }

      code {
        background: #f3f4f6;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-family: 'Courier New', monospace;
      }

      .entity-id,
      .ip-address {
        color: #6b7280;
      }

      .log-details {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .detail-section {
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 1.5rem;
      }

      .detail-section:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .detail-section h3 {
        font-size: 1.125rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 1rem 0;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .detail-item.full-width {
        grid-column: 1 / -1;
      }

      .detail-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .detail-value {
        font-size: 0.875rem;
        color: #000000;
      }

      .changes-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .change-item {
        background: #f9fafb;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 3px solid #fbbf24;
      }

      .change-header {
        margin-bottom: 0.5rem;
        color: #000000;
        font-weight: 600;
      }

      .change-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .change-old,
      .change-new {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
      }

      .change-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        min-width: 60px;
      }

      .change-old code {
        background: #fee2e2;
        color: #991b1b;
      }

      .change-new code {
        background: #d1fae5;
        color: #065f46;
      }

      .metadata-json {
        background: #f9fafb;
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        font-size: 0.75rem;
        font-family: 'Courier New', monospace;
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      @media (max-width: 768px) {
        .section-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .table-header {
          flex-direction: column;
          align-items: stretch;
        }

        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminAuditLogsComponent {
  public auditLogsStore = inject(AuditLogsStore);

  public showLogDialog = signal(false);
  public selectedLog = signal<AuditLog | null>(null);
  public selectedEntityType = signal<string | null>(null);
  public selectedAction = signal<string | null>(null);

  public entityTypeOptions = [
    { label: 'Mascota', value: 'pet' },
    { label: 'Solicitud', value: 'application' },
    { label: 'FundaciÃ³n', value: 'foundation' },
    { label: 'Requisito', value: 'requirement' },
    { label: 'FAQ', value: 'faq' },
    { label: 'Evento', value: 'event' },
    { label: 'Familia', value: 'family' },
    { label: 'Aliado', value: 'partner' },
    { label: 'InterÃ©s', value: 'interest' },
  ];

  public actionOptions = [
    { label: 'Crear', value: 'create' },
    { label: 'Actualizar', value: 'update' },
    { label: 'Eliminar', value: 'delete' },
    { label: 'Cambio de Estado', value: 'status_change' },
    { label: 'Otro', value: 'other' },
  ];

  public globalFilters = computed(() => {
    const filters: any = {};
    if (this.selectedEntityType()) {
      filters.entity_type = { value: this.selectedEntityType(), matchMode: 'equals' };
    }
    if (this.selectedAction()) {
      filters.action = { value: this.selectedAction(), matchMode: 'equals' };
    }
    return filters;
  });

  public onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    // El filtro global se maneja automÃ¡ticamente por PrimeNG
  }

  public onEntityTypeFilterChange(): void {
    // El filtro se aplica automÃ¡ticamente a travÃ©s de globalFilters()
  }

  public onActionFilterChange(): void {
    // El filtro se aplica automÃ¡ticamente a travÃ©s de globalFilters()
  }

  public viewLogDetails(log: AuditLog): void {
    this.selectedLog.set(log);
    this.showLogDialog.set(true);
  }

  public getEntityTypeLabel(type: string): string {
    const option = this.entityTypeOptions.find((opt) => opt.value === type);
    return option ? option.label : type;
  }

  public getEntityTypeSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const severityMap: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      pet: 'success',
      application: 'info',
      foundation: 'warn',
      requirement: 'secondary',
      faq: 'secondary',
      event: 'info',
      family: 'success',
      partner: 'warn',
      interest: 'info',
    };
    return severityMap[type] || 'secondary';
  }

  public getActionLabel(action: string): string {
    const option = this.actionOptions.find((opt) => opt.value === action);
    return option ? option.label : action;
  }

  public getActionSeverity(action: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const severityMap: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      create: 'success',
      update: 'info',
      delete: 'danger',
      status_change: 'warn',
      other: 'secondary',
    };
    return severityMap[action] || 'secondary';
  }

  public formatDateTime(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  public getChangesArray(changes: Record<string, { old?: any; new?: any }> | undefined): Array<{ key: string; old?: any; new?: any }> {
    if (!changes) return [];
    return Object.entries(changes).map(([key, value]) => ({
      key,
      old: value.old,
      new: value.new,
    }));
  }

  public formatChangeValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  public formatJSON(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}




