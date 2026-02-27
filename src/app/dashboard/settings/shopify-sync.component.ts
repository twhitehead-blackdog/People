import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { firstValueFrom } from 'rxjs';

interface InventoryRow {
  productId: number;
  inventoryItemId: string;
  productName: string;
  sku: string;
  odooQtyTotal: number;
  shopifyQty: number;
  diff: number;
  lastSync: string | null;
}

interface PriceRow {
  productName: string;
  sku: string;
  odooPrice: number;
  shopifyPrice: number;
  diff: number;
  pctDiff: number;
}

interface LocationRow {
  id: number;
  name: string;
  warehouseName: string;
  shopifyLocationId: string;
  isPrimary: boolean;
}

interface LocationDetail {
  locationName: string;
  warehouseName: string;
  warehouseCode: string;
  odooQty: number;
  exportedQty: number;
  diff: number;
}

interface QueueRow {
  id: number;
  name: string;
  state: string;
  create_date: string;
  queue_line_total_records: number;
  queue_line_done_records: number;
  queue_line_fail_records: number;
  queue_line_cancel_records: number;
}

@Component({
  selector: 'pt-shopify-sync',
  imports: [
    CommonModule,
    FormsModule,
    Button,
    Card,
    DialogModule,
    IconField,
    InputIcon,
    InputText,
    ProgressSpinner,
    TableModule,
    TabsModule,
    Tag,
    ToastModule,
    ToggleSwitch,
  ],
  providers: [MessageService],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3
          class="text-lg font-bold text-white flex items-center gap-2 border-b border-neutral-700 pb-2 flex-1"
        >
          <i class="pi pi-sync text-green-400"></i>
          Shopify ↔ Odoo Sync Dashboard
        </h3>
        <p-button
          icon="pi pi-refresh"
          label="Actualizar"
          severity="secondary"
          size="small"
          [loading]="loading()"
          (click)="loadData()"
        />
      </div>

      @if (loading() && !inventoryRows().length) {
      <div class="flex items-center justify-center py-12">
        <p-progressSpinner strokeWidth="3" styleClass="w-12 h-12" />
      </div>
      } @else if (error()) {
      <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <i class="pi pi-exclamation-circle text-red-400 text-xl"></i>
          <div class="flex-1">
            <p class="text-red-300 font-semibold mb-1">Error</p>
            <p class="text-sm text-gray-300 m-0">{{ error() }}</p>
          </div>
        </div>
      </div>
      } @else {
      <!-- Status Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
          <div class="text-xs text-gray-400 mb-1">Ultima Sync Stock</div>
          <div class="text-base font-semibold text-white">
            {{ syncStats().lastSync || 'N/A' }}
          </div>
        </div>
        <div class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
          <div class="text-xs text-gray-400 mb-1">Productos Sincronizados</div>
          <div class="text-2xl font-bold text-green-400">
            {{ syncStats().totalSynced | number }}
          </div>
        </div>
        <div class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
          <div class="text-xs text-gray-400 mb-1">Con Diferencia Stock</div>
          <div
            class="text-2xl font-bold"
            [class.text-amber-400]="syncStats().inventoryDiscrepancies > 0"
            [class.text-green-400]="syncStats().inventoryDiscrepancies === 0"
          >
            {{ syncStats().inventoryDiscrepancies | number }}
          </div>
        </div>
        <div class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
          <div class="text-xs text-gray-400 mb-1">Movimientos Pendientes</div>
          <div class="text-2xl font-bold text-blue-400">
            {{ syncStats().pendingMoves | number }}
          </div>
        </div>
      </div>

      <!-- Sub-tabs -->
      <p-tabs [value]="activeSubTab()" (valueChange)="onSubTabChange('' + $event)">
        <p-tablist>
          <p-tab value="inventory">
            <i class="pi pi-box mr-1"></i>
            Inventario
          </p-tab>
          <p-tab value="prices">
            <i class="pi pi-dollar mr-1"></i>
            Precios
          </p-tab>
          <p-tab value="locations">
            <i class="pi pi-map-marker mr-1"></i>
            Ubicaciones
          </p-tab>
          <p-tab value="history">
            <i class="pi pi-history mr-1"></i>
            Historial
          </p-tab>
        </p-tablist>

        <!-- Tab: Inventario -->
        <p-tabpanel value="inventory">
          <div class="flex flex-col gap-3 pt-3">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <p-iconfield class="flex-1 w-full">
                <p-inputicon styleClass="pi pi-search" />
                <input
                  pInputText
                  placeholder="Buscar producto o SKU..."
                  class="w-full"
                  [ngModel]="searchTerm()"
                  (ngModelChange)="searchTerm.set($event)"
                />
              </p-iconfield>
              <div class="flex items-center gap-2">
                <p-toggleSwitch [(ngModel)]="discrepanciesOnly" />
                <span class="text-sm text-gray-300 whitespace-nowrap">Solo discrepancias</span>
              </div>
              <p-button
                icon="pi pi-upload"
                label="Sincronizar Stock"
                severity="warn"
                size="small"
                [loading]="syncingStock()"
                (click)="confirmSyncStock()"
              />
            </div>

            <p-table
              [value]="filteredInventoryRows()"
              [paginator]="true"
              [rows]="25"
              [rowsPerPageOptions]="[25, 50, 100]"
              [showCurrentPageReport]="true"
              currentPageReportTemplate="{first}-{last} de {totalRecords}"
              styleClass="p-datatable-sm p-datatable-striped"
              [scrollable]="true"
              scrollHeight="500px"
              selectionMode="single"
              (onRowSelect)="openProductDetail($event.data)"
            >
              <ng-template #header>
                <tr>
                  <th pSortableColumn="productName">Producto <p-sortIcon field="productName" /></th>
                  <th pSortableColumn="sku">SKU <p-sortIcon field="sku" /></th>
                  <th pSortableColumn="odooQtyTotal" class="text-right">Qty Odoo (Tiendas) <p-sortIcon field="odooQtyTotal" /></th>
                  <th pSortableColumn="shopifyQty" class="text-right">Qty Exportada <p-sortIcon field="shopifyQty" /></th>
                  <th pSortableColumn="diff" class="text-right">Diff <p-sortIcon field="diff" /></th>
                  <th>Ultima Sync</th>
                </tr>
              </ng-template>
              <ng-template #body let-row>
                <tr [pSelectableRow]="row" class="cursor-pointer">
                  <td class="max-w-[250px] truncate" [title]="row.productName">{{ row.productName }}</td>
                  <td class="font-mono text-xs">{{ row.sku || '-' }}</td>
                  <td class="text-right">{{ row.odooQtyTotal | number:'1.0-0' }}</td>
                  <td class="text-right">{{ row.shopifyQty | number:'1.0-0' }}</td>
                  <td class="text-right">
                    @if (row.diff !== 0) {
                    <p-tag
                      [value]="(row.diff > 0 ? '+' : '') + row.diff.toFixed(0)"
                      [severity]="row.diff > 0 ? 'warn' : 'danger'"
                    />
                    } @else {
                    <span class="text-green-400">0</span>
                    }
                  </td>
                  <td class="text-xs text-gray-400">{{ row.lastSync || 'Nunca' }}</td>
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr>
                  <td colspan="6" class="text-center text-gray-400 py-8">
                    No se encontraron productos
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </p-tabpanel>

        <!-- Tab: Precios -->
        <p-tabpanel value="prices">
          <div class="flex flex-col gap-3 pt-3">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <p-iconfield class="flex-1 w-full">
                <p-inputicon styleClass="pi pi-search" />
                <input
                  pInputText
                  placeholder="Buscar producto o SKU..."
                  class="w-full"
                  [ngModel]="priceSearchTerm()"
                  (ngModelChange)="priceSearchTerm.set($event)"
                />
              </p-iconfield>
              <div class="flex items-center gap-2">
                <p-toggleSwitch [(ngModel)]="priceDiffOnly" />
                <span class="text-sm text-gray-300 whitespace-nowrap">Solo diferencias</span>
              </div>
              <p-button
                icon="pi pi-upload"
                label="Sincronizar Precios"
                severity="warn"
                size="small"
                [loading]="syncingPrices()"
                (click)="confirmSyncPrices()"
              />
            </div>

            <p-table
              [value]="filteredPriceRows()"
              [paginator]="true"
              [rows]="25"
              [rowsPerPageOptions]="[25, 50, 100]"
              [showCurrentPageReport]="true"
              currentPageReportTemplate="{first}-{last} de {totalRecords}"
              styleClass="p-datatable-sm p-datatable-striped"
              [scrollable]="true"
              scrollHeight="500px"
            >
              <ng-template #header>
                <tr>
                  <th pSortableColumn="productName">Producto <p-sortIcon field="productName" /></th>
                  <th pSortableColumn="sku">SKU <p-sortIcon field="sku" /></th>
                  <th pSortableColumn="odooPrice" class="text-right">Precio Odoo <p-sortIcon field="odooPrice" /></th>
                  <th pSortableColumn="shopifyPrice" class="text-right">Precio Shopify <p-sortIcon field="shopifyPrice" /></th>
                  <th pSortableColumn="diff" class="text-right">Diff $ <p-sortIcon field="diff" /></th>
                  <th pSortableColumn="pctDiff" class="text-right">% Diff <p-sortIcon field="pctDiff" /></th>
                </tr>
              </ng-template>
              <ng-template #body let-row>
                <tr>
                  <td class="max-w-[250px] truncate" [title]="row.productName">{{ row.productName }}</td>
                  <td class="font-mono text-xs">{{ row.sku || '-' }}</td>
                  <td class="text-right">{{ row.odooPrice | number:'1.2-2' }}</td>
                  <td class="text-right">{{ row.shopifyPrice | number:'1.2-2' }}</td>
                  <td class="text-right">
                    @if (row.diff !== 0) {
                    <p-tag
                      [value]="(row.diff > 0 ? '+' : '') + row.diff.toFixed(2)"
                      [severity]="Math.abs(row.pctDiff) > 5 ? 'danger' : 'warn'"
                    />
                    } @else {
                    <span class="text-green-400">0.00</span>
                    }
                  </td>
                  <td class="text-right">
                    @if (row.pctDiff !== 0) {
                    <span
                      [class.text-red-400]="Math.abs(row.pctDiff) > 5"
                      [class.text-amber-400]="Math.abs(row.pctDiff) > 0 && Math.abs(row.pctDiff) <= 5"
                    >
                      {{ row.pctDiff > 0 ? '+' : '' }}{{ row.pctDiff | number:'1.1-1' }}%
                    </span>
                    } @else {
                    <span class="text-green-400">0%</span>
                    }
                  </td>
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr>
                  <td colspan="6" class="text-center text-gray-400 py-8">
                    No se encontraron productos
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </p-tabpanel>

        <!-- Tab: Ubicaciones -->
        <p-tabpanel value="locations">
          <div class="flex flex-col gap-3 pt-3">
            @if (locations().length === 0) {
            <div class="text-center text-gray-400 py-8">
              No se encontraron ubicaciones configuradas
            </div>
            } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (loc of locations(); track loc.id) {
              <div class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-map-marker text-blue-400"></i>
                  <span class="font-semibold text-white">{{ loc.name }}</span>
                  @if (loc.isPrimary) {
                  <p-tag value="Primary" severity="info" />
                  }
                </div>
                <div class="text-xs text-gray-400 flex flex-col gap-1">
                  <div>
                    <span class="text-gray-500">Warehouse:</span>
                    {{ loc.warehouseName || 'N/A' }}
                  </div>
                  <div>
                    <span class="text-gray-500">Shopify ID:</span>
                    {{ loc.shopifyLocationId || 'N/A' }}
                  </div>
                </div>
              </div>
              }
            </div>
            }
          </div>
        </p-tabpanel>

        <!-- Tab: Historial -->
        <p-tabpanel value="history">
          <div class="flex flex-col gap-4 pt-3">
            <!-- History sub-tabs via buttons -->
            <div class="flex gap-2">
              <p-button
                label="Stock"
                icon="pi pi-box"
                [severity]="historyType() === 'stock' ? 'primary' : 'secondary'"
                size="small"
                (click)="loadHistory('stock')"
              />
              <p-button
                label="Productos / Precios"
                icon="pi pi-dollar"
                [severity]="historyType() === 'product' ? 'primary' : 'secondary'"
                size="small"
                (click)="loadHistory('product')"
              />
            </div>

            @if (historyLoading()) {
            <div class="flex items-center justify-center py-8">
              <p-progressSpinner strokeWidth="3" styleClass="w-10 h-10" />
            </div>
            } @else {
            <p-table
              [value]="historyRows()"
              [paginator]="true"
              [rows]="20"
              [rowsPerPageOptions]="[20, 50, 100]"
              [showCurrentPageReport]="true"
              currentPageReportTemplate="{first}-{last} de {totalRecords}"
              styleClass="p-datatable-sm p-datatable-striped"
              [scrollable]="true"
              scrollHeight="500px"
            >
              <ng-template #header>
                <tr>
                  <th pSortableColumn="name">Cola <p-sortIcon field="name" /></th>
                  <th pSortableColumn="create_date">Fecha <p-sortIcon field="create_date" /></th>
                  <th pSortableColumn="state">Estado <p-sortIcon field="state" /></th>
                  <th class="text-right">Total</th>
                  <th class="text-right">OK</th>
                  <th class="text-right">Error</th>
                  <th class="text-right">Cancel</th>
                </tr>
              </ng-template>
              <ng-template #body let-row>
                <tr>
                  <td class="font-mono text-xs">{{ row.name }}</td>
                  <td class="text-sm">{{ formatDate(row.create_date) }}</td>
                  <td>
                    <p-tag
                      [value]="row.state"
                      [severity]="getStateSeverity(row.state)"
                    />
                  </td>
                  <td class="text-right">{{ row.queue_line_total_records }}</td>
                  <td class="text-right text-green-400">{{ row.queue_line_done_records }}</td>
                  <td class="text-right text-red-400">{{ row.queue_line_fail_records }}</td>
                  <td class="text-right text-gray-400">{{ row.queue_line_cancel_records }}</td>
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr>
                  <td colspan="7" class="text-center text-gray-400 py-8">
                    No hay registros de sincronizacion
                  </td>
                </tr>
              </ng-template>
            </p-table>
            }
          </div>
        </p-tabpanel>
      </p-tabs>
      }
    </div>

    <!-- Product Detail Dialog -->
    <p-dialog
      [visible]="showDetail()"
      (visibleChange)="showDetail.set($event)"
      [modal]="true"
      [draggable]="false"
      [dismissableMask]="true"
      [style]="{ width: '750px', maxWidth: '95vw' }"
      [header]="detailProduct()?.productName || 'Detalle'"
    >
      @if (detailLoading()) {
      <div class="flex items-center justify-center py-8">
        <p-progressSpinner strokeWidth="3" styleClass="w-10 h-10" />
      </div>
      } @else {
      @if (detailProduct(); as prod) {
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 text-center">
          <div class="text-xs text-gray-400 mb-1">SKU</div>
          <div class="text-sm font-mono font-semibold text-white">{{ prod.sku || '-' }}</div>
        </div>
        <div class="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 text-center">
          <div class="text-xs text-gray-400 mb-1">Odoo (Tiendas)</div>
          <div class="text-xl font-bold text-white">{{ prod.odooQtyTotal | number:'1.0-0' }}</div>
        </div>
        <div class="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 text-center">
          <div class="text-xs text-gray-400 mb-1">Exportada a Shopify</div>
          <div class="text-xl font-bold text-green-400">{{ prod.shopifyQty | number:'1.0-0' }}</div>
        </div>
      </div>
      }

      <p-table
        [value]="detailRows()"
        styleClass="p-datatable-sm p-datatable-striped"
        [scrollable]="true"
        scrollHeight="400px"
      >
        <ng-template #header>
          <tr>
            <th>Sucursal</th>
            <th class="text-right">Qty Odoo</th>
            <th class="text-right">Qty Exportada</th>
            <th class="text-right">Diff</th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr>
            <td>
              <div class="flex flex-col">
                <span class="font-semibold text-white">{{ row.locationName }}</span>
                <span class="text-xs text-gray-500">{{ row.warehouseCode }} - {{ row.warehouseName }}</span>
              </div>
            </td>
            <td class="text-right font-mono">{{ row.odooQty | number:'1.0-0' }}</td>
            <td class="text-right font-mono">{{ row.exportedQty | number:'1.0-0' }}</td>
            <td class="text-right">
              @if (row.diff !== 0) {
              <p-tag
                [value]="(row.diff > 0 ? '+' : '') + row.diff.toFixed(0)"
                [severity]="row.diff > 0 ? 'warn' : 'danger'"
              />
              } @else {
              <span class="text-green-400">0</span>
              }
            </td>
          </tr>
        </ng-template>
        <ng-template #footer>
          <tr class="font-bold">
            <td>TOTAL</td>
            <td class="text-right font-mono">{{ detailTotals().odoo | number:'1.0-0' }}</td>
            <td class="text-right font-mono">{{ detailTotals().shopify | number:'1.0-0' }}</td>
            <td class="text-right">
              @if (detailTotals().diff !== 0) {
              <p-tag
                [value]="(detailTotals().diff > 0 ? '+' : '') + detailTotals().diff.toFixed(0)"
                [severity]="detailTotals().diff > 0 ? 'warn' : 'danger'"
              />
              } @else {
              <span class="text-green-400">0</span>
              }
            </td>
          </tr>
        </ng-template>
      </p-table>

      @if (detailTotals().diff !== 0) {
        <div class="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <div class="flex items-start gap-2">
            <i class="pi pi-info-circle text-amber-400 mt-0.5"></i>
            <p class="text-sm text-gray-300 m-0">
              Hay diferencia de <strong>{{ detailTotals().diff | number:'1.0-0' }}</strong>
              unidades entre Odoo y lo exportado a Shopify. Usa "Sincronizar Stock" para actualizar.
            </p>
          </div>
        </div>
      }
      }
    </p-dialog>

    <!-- Confirm Stock Sync Dialog -->
    <p-dialog
      [visible]="showConfirmStock()"
      (visibleChange)="showConfirmStock.set($event)"
      [modal]="true"
      [draggable]="false"
      [dismissableMask]="true"
      [style]="{ width: '450px' }"
      header="Confirmar Sincronizacion de Stock"
    >
      <div class="flex flex-col gap-4">
        <p class="text-gray-300 m-0">
          Esto exportara el inventario actual de Odoo a Shopify para todas las sucursales conectadas.
          Los cambios se encolan y se procesan automaticamente.
        </p>
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <div class="flex items-start gap-2">
            <i class="pi pi-exclamation-triangle text-amber-400 mt-0.5"></i>
            <p class="text-sm text-gray-300 m-0">
              <strong>{{ syncStats().totalSynced | number }}</strong> productos seran actualizados
              en Shopify. El proceso puede tomar varios minutos.
            </p>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <p-button label="Cancelar" severity="secondary" size="small" (click)="showConfirmStock.set(false)" />
          <p-button
            label="Sincronizar Stock"
            icon="pi pi-upload"
            severity="warn"
            size="small"
            [loading]="syncingStock()"
            (click)="syncStock()"
          />
        </div>
      </div>
    </p-dialog>

    <!-- Confirm Price Sync Dialog -->
    <p-dialog
      [visible]="showConfirmPrices()"
      (visibleChange)="showConfirmPrices.set($event)"
      [modal]="true"
      [draggable]="false"
      [dismissableMask]="true"
      [style]="{ width: '450px' }"
      header="Confirmar Sincronizacion de Precios"
    >
      <div class="flex flex-col gap-4">
        <p class="text-gray-300 m-0">
          Esto actualizara los precios de todos los productos exportados en Shopify
          usando los precios actuales de Odoo.
        </p>
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <div class="flex items-start gap-2">
            <i class="pi pi-exclamation-triangle text-amber-400 mt-0.5"></i>
            <p class="text-sm text-gray-300 m-0">
              Los precios se actualizan por lotes. El proceso puede tomar varios minutos.
            </p>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <p-button label="Cancelar" severity="secondary" size="small" (click)="showConfirmPrices.set(false)" />
          <p-button
            label="Sincronizar Precios"
            icon="pi pi-upload"
            severity="warn"
            size="small"
            [loading]="syncingPrices()"
            (click)="syncPrices()"
          />
        </div>
      </div>
    </p-dialog>

    <p-toast />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopifySyncComponent implements OnInit {
  protected Math = Math;
  private http = inject(HttpClient);
  private messageService = inject(MessageService);

  loading = signal(false);
  error = signal<string | null>(null);
  activeSubTab = signal('inventory');
  searchTerm = signal('');
  priceSearchTerm = signal('');
  discrepanciesOnly = signal(false);
  priceDiffOnly = signal(false);

  instanceInfo = signal<any[]>([]);
  inventoryRows = signal<InventoryRow[]>([]);
  priceRows = signal<PriceRow[]>([]);
  locations = signal<LocationRow[]>([]);
  pendingMoves = signal(0);

  // Product detail dialog
  showDetail = signal(false);
  detailLoading = signal(false);
  detailProduct = signal<InventoryRow | null>(null);
  detailRows = signal<LocationDetail[]>([]);
  detailTotals = computed(() => {
    const rows = this.detailRows();
    return {
      odoo: rows.reduce((s, r) => s + r.odooQty, 0),
      shopify: rows.reduce((s, r) => s + r.exportedQty, 0),
      diff: rows.reduce((s, r) => s + r.diff, 0),
    };
  });

  // Sync actions
  syncingStock = signal(false);
  syncingPrices = signal(false);
  showConfirmStock = signal(false);
  showConfirmPrices = signal(false);

  // History
  historyType = signal<'stock' | 'product'>('stock');
  historyLoading = signal(false);
  historyRows = signal<QueueRow[]>([]);

  private shopifyProductMap = new Map<number, string>();

  syncStats = computed(() => {
    const instances = this.instanceInfo();
    const lastSync = instances.length
      ? instances[0].shopify_last_date_update_stock || null
      : null;
    const invRows = this.inventoryRows();
    return {
      lastSync: lastSync ? this.formatDate(lastSync) : null,
      totalSynced: invRows.length,
      inventoryDiscrepancies: invRows.filter((r) => r.diff !== 0).length,
      pendingMoves: this.pendingMoves(),
    };
  });

  filteredInventoryRows = computed(() => {
    let rows = this.inventoryRows();
    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      rows = rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(term) ||
          (r.sku && r.sku.toLowerCase().includes(term))
      );
    }
    if (this.discrepanciesOnly()) {
      rows = rows.filter((r) => r.diff !== 0);
    }
    return rows;
  });

  filteredPriceRows = computed(() => {
    let rows = this.priceRows();
    const term = this.priceSearchTerm().toLowerCase().trim();
    if (term) {
      rows = rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(term) ||
          (r.sku && r.sku.toLowerCase().includes(term))
      );
    }
    if (this.priceDiffOnly()) {
      rows = rows.filter((r) => r.diff !== 0);
    }
    return rows;
  });

  ngOnInit(): void {
    this.loadData();
  }

  onSubTabChange(tab: string): void {
    this.activeSubTab.set(tab);
    if (tab === 'history' && !this.historyRows().length) {
      this.loadHistory(this.historyType());
    }
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const instanceRes = await this.rpc('instance_info');
      this.instanceInfo.set(instanceRes);

      const allShopifyProducts: any[] = [];
      let offset = 0;
      const pageSize = 500;
      let hasMore = true;
      while (hasMore) {
        const batch = await this.rpc('shopify_products', { offset, limit: pageSize });
        if (!Array.isArray(batch) || batch.length === 0) {
          hasMore = false;
        } else {
          allShopifyProducts.push(...batch);
          offset += batch.length;
          if (batch.length < pageSize) hasMore = false;
        }
      }

      this.shopifyProductMap.clear();
      for (const sp of allShopifyProducts) {
        const pid = Array.isArray(sp.product_id) ? sp.product_id[0] : sp.product_id;
        if (sp.inventory_item_id) {
          this.shopifyProductMap.set(pid, sp.inventory_item_id);
        }
      }

      const productIds = [
        ...new Set(
          allShopifyProducts
            .map((sp: any) => (Array.isArray(sp.product_id) ? sp.product_id[0] : sp.product_id))
            .filter((id: any) => typeof id === 'number')
        ),
      ];

      const pricelistId =
        instanceRes.length && instanceRes[0].shopify_pricelist_id
          ? instanceRes[0].shopify_pricelist_id[0]
          : 13;

      const lastSyncDate =
        instanceRes.length ? instanceRes[0].shopify_last_date_update_stock : null;

      const productBatches: number[][] = [];
      for (let i = 0; i < productIds.length; i += 200) {
        productBatches.push(productIds.slice(i, i + 200));
      }
      const productDataPromises = productBatches.map((ids) =>
        this.rpc('product_data', { ids })
      );

      const [productDataResults, pricelistItems, locationsData, warehouseStock, moveCount, lastExportedData] =
        await Promise.all([
          Promise.all(productDataPromises),
          this.rpc('pricelist_items', { pricelist_id: pricelistId }),
          this.rpc('locations'),
          this.rpc('shopify_warehouse_stock'),
          this.rpc('count_moves', { since_date: lastSyncDate }),
          this.rpc('last_exported_stock'),
        ]);

      const allProductData: any[] = productDataResults.flat();

      const productMap = new Map<number, any>();
      for (const p of allProductData) {
        productMap.set(p.id, p);
      }

      const priceMap = new Map<number, number>();
      if (Array.isArray(pricelistItems)) {
        for (const item of pricelistItems) {
          if (item.product_id && item.fixed_price) {
            const pid = Array.isArray(item.product_id) ? item.product_id[0] : item.product_id;
            priceMap.set(pid, item.fixed_price);
          }
        }
      }

      const shopifyStockMap = new Map<number, number>();
      if (Array.isArray(warehouseStock)) {
        for (const row of warehouseStock) {
          if (row.product_id) {
            const pid = Array.isArray(row.product_id) ? row.product_id[0] : row.product_id;
            shopifyStockMap.set(pid, row.quantity || 0);
          }
        }
      }

      // Map of inventory_item_id -> total exported qty (what Shopify should have)
      const lastExportedMap = new Map<string, number>();
      if (lastExportedData && typeof lastExportedData === 'object') {
        for (const [invId, qty] of Object.entries(lastExportedData)) {
          lastExportedMap.set(invId, qty as number);
        }
      }

      const lastSyncMap = new Map<number, string>();
      for (const sp of allShopifyProducts) {
        const pid = Array.isArray(sp.product_id) ? sp.product_id[0] : sp.product_id;
        if (sp.last_stock_update_date) {
          lastSyncMap.set(pid, sp.last_stock_update_date);
        }
      }

      const invRows: InventoryRow[] = [];
      const prRows: PriceRow[] = [];

      for (const sp of allShopifyProducts) {
        const pid = Array.isArray(sp.product_id) ? sp.product_id[0] : sp.product_id;
        const product = productMap.get(pid);
        if (!product) continue;

        const inventoryItemId = sp.inventory_item_id || '';
        const odooQtyTotal = shopifyStockMap.get(pid) || 0;
        const shopifyQty = lastExportedMap.get(inventoryItemId) ?? 0;
        const diff = +(odooQtyTotal - shopifyQty).toFixed(0);
        const lastSync = lastSyncMap.get(pid) || null;

        invRows.push({
          productId: pid,
          inventoryItemId: sp.inventory_item_id || '',
          productName: product.name || sp.name || '',
          sku: product.default_code || '',
          odooQtyTotal,
          shopifyQty,
          diff,
          lastSync,
        });

        const odooPrice = product.list_price || 0;
        const shopifyPrice = priceMap.get(pid) ?? odooPrice;
        const priceDiff = +(shopifyPrice - odooPrice).toFixed(2);
        const pctDiff = odooPrice > 0 ? +((priceDiff / odooPrice) * 100).toFixed(1) : 0;

        prRows.push({
          productName: product.name || sp.name || '',
          sku: product.default_code || '',
          odooPrice,
          shopifyPrice,
          diff: priceDiff,
          pctDiff,
        });
      }

      this.inventoryRows.set(invRows);
      this.priceRows.set(prRows);
      this.pendingMoves.set(typeof moveCount === 'number' ? moveCount : 0);

      if (Array.isArray(locationsData)) {
        this.locations.set(
          locationsData.map((loc: any) => ({
            id: loc.id,
            name: loc.name || '',
            warehouseName: Array.isArray(loc.import_stock_warehouse_id) ? loc.import_stock_warehouse_id[1] : (loc.import_stock_warehouse_id || ''),
            shopifyLocationId: loc.shopify_location_id || '',
            isPrimary: loc.is_primary_location || false,
          }))
        );
      }
    } catch (err: any) {
      console.error('Shopify sync load error:', err);
      this.error.set(err?.error?.message || err?.message || 'Error al cargar datos');
    } finally {
      this.loading.set(false);
    }
  }

  async openProductDetail(row: InventoryRow): Promise<void> {
    this.detailProduct.set(row);
    this.detailRows.set([]);
    this.showDetail.set(true);
    this.detailLoading.set(true);

    try {
      const data = await this.rpc('product_stock_detail', {
        product_id: row.productId,
        inventory_item_id: row.inventoryItemId,
      });
      if (Array.isArray(data)) {
        this.detailRows.set(data);
      }
    } catch (err: any) {
      console.error('Error loading product detail:', err);
    } finally {
      this.detailLoading.set(false);
    }
  }

  // --- Sync actions ---

  confirmSyncStock(): void {
    this.showConfirmStock.set(true);
  }

  confirmSyncPrices(): void {
    this.showConfirmPrices.set(true);
  }

  async syncStock(): Promise<void> {
    this.syncingStock.set(true);
    try {
      const res = await this.rpc('export_stock');
      this.showConfirmStock.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'Stock Encolado',
        detail: 'La exportacion de stock a Shopify fue encolada. Se procesara automaticamente.',
        life: 5000,
      });
    } catch (err: any) {
      console.error('Stock sync error:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.error?.message || err?.message || 'Error al sincronizar stock',
        life: 5000,
      });
    } finally {
      this.syncingStock.set(false);
    }
  }

  async syncPrices(): Promise<void> {
    this.syncingPrices.set(true);
    try {
      const res = await this.rpc('update_prices');
      this.showConfirmPrices.set(false);
      const detail = res?.processed
        ? `${res.processed} de ${res.total_templates} templates procesados.`
        : 'Actualizacion de precios enviada a Shopify.';
      this.messageService.add({
        severity: 'success',
        summary: 'Precios Sincronizados',
        detail,
        life: 5000,
      });
    } catch (err: any) {
      console.error('Price sync error:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.error?.message || err?.message || 'Error al sincronizar precios',
        life: 5000,
      });
    } finally {
      this.syncingPrices.set(false);
    }
  }

  // --- History ---

  async loadHistory(type: 'stock' | 'product'): Promise<void> {
    this.historyType.set(type);
    this.historyLoading.set(true);
    try {
      const data = await this.rpc('sync_history', { type, limit: 100 });
      this.historyRows.set(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('History load error:', err);
      this.historyRows.set([]);
    } finally {
      this.historyLoading.set(false);
    }
  }

  getStateSeverity(state: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (state) {
      case 'completed': return 'success';
      case 'partially_completed': return 'warn';
      case 'failed': return 'danger';
      case 'draft': return 'info';
      default: return 'secondary';
    }
  }

  // --- Helpers ---

  private async rpc(action: string, params?: Record<string, unknown>): Promise<any> {
    const res = await firstValueFrom(
      this.http.post<{ success: boolean; data: any }>('/api/odoo/shopify-sync', {
        action,
        params,
      })
    );
    return res.data;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-PA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
