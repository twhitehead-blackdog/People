import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { JobApplication } from '../../models';
import { OrganizationService } from '../../services/organization.service';
import { RecruitmentClassificationsStore } from '../../stores/recruitment-classifications.store';

const EXTRACT_BATCH_SIZE = 20;

@Component({
  selector: 'pt-recruitment-classification-tab',
  standalone: true,
  imports: [
    DatePipe,
    TableModule,
    Tag,
    Button,
    ProgressBar,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="flex flex-col gap-4 px-2">

      <!-- Resumen por rol -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        @for (role of roleSummary(); track role.key) {
          <div class="bg-neutral-800 rounded-lg p-4 text-center border border-neutral-700">
            <div class="text-2xl font-bold" [class]="role.colorClass">{{ role.count }}</div>
            <div class="text-sm text-gray-400 mt-1">{{ role.label }}</div>
          </div>
        }
      </div>

      <!-- Panel extracción de CVs -->
      <div class="bg-neutral-800 border border-neutral-600 rounded-xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="flex items-center gap-2">
              <i class="pi pi-file-pdf text-orange-400"></i>
              <span class="font-semibold text-white text-sm">Extracción de CVs (PDF/Word)</span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">
              @if (pendingExtractionCount() > 0) {
                <span class="text-orange-300 font-medium">{{ pendingExtractionCount() }} CVs</span> pendientes de extraer
                — lotes de {{ batchSize }}, quedan ~{{ batchesRemaining() }} lotes
              } @else {
                <span class="text-green-400">✓ Todos los CVs han sido extraídos</span>
              }
            </p>
          </div>
          <div class="flex gap-2 items-center flex-wrap">
            <p-button
              icon="pi pi-file-export"
              [label]="'Extraer lote (' + batchSize + ' CVs)'"
              severity="warn"
              rounded
              [disabled]="pendingExtractionCount() === 0"
              [loading]="isExtracting()"
              (onClick)="extractNextBatch()"
              pTooltip="Descarga y extrae texto de los próximos {{ batchSize }} CVs. Mejora la precisión de la clasificación."
            />
            @if (extractedInSession() > 0) {
              <span class="text-xs text-green-400">+{{ extractedInSession() }} extraídos esta sesión</span>
            }
          </div>
        </div>
        @if (isExtracting()) {
          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-xs text-gray-400">
              <span>{{ extractionStatus() }}</span>
              <span>{{ extractionProgress() }}%</span>
            </div>
            <p-progressbar [value]="extractionProgress()" styleClass="h-2" />
          </div>
        }
        @if (lastExtractionResult()) {
          <div class="text-xs text-gray-400 border-t border-neutral-700 pt-2">
            Último lote: <span class="text-green-400">{{ lastExtractionResult()!.extracted }} extraídos</span>
            @if (lastExtractionResult()!.failed > 0) {
              , <span class="text-red-400">{{ lastExtractionResult()!.failed }} fallidos</span>
              (PDFs protegidos o escaneados como imagen)
            }
            — reclasificados automáticamente
          </div>
        }
      </div>

      <!-- Acciones de clasificación -->
      <div class="flex gap-2 flex-wrap items-center">
        <p-button
          icon="pi pi-bolt"
          label="Clasificar Pendientes"
          severity="primary"
          rounded
          [loading]="isProcessing()"
          (onClick)="runBatchClassification()"
          pTooltip="Clasifica candidatos según las reglas activas (usa datos del formulario + texto de CV si ya fue extraído)"
        />
        <p-button
          icon="pi pi-refresh"
          label="Reclasificar Todos"
          severity="secondary"
          rounded
          [loading]="isProcessing()"
          (onClick)="reclassifyAll()"
          pTooltip="Re-ejecuta la clasificación sobre todos los candidatos con las reglas actuales"
        />
        <p-button
          icon="pi pi-refresh"
          severity="secondary"
          text
          rounded
          [loading]="classificationsStore.isLoading()"
          (onClick)="classificationsStore.reloadItems()"
          pTooltip="Actualizar lista"
        />
        @if (processingStatus()) {
          <span class="text-sm text-gray-400 italic">{{ processingStatus() }}</span>
        }
      </div>

      <!-- Tabla de clasificaciones -->
      <p-table
        [value]="mergedApplications()"
        [loading]="classificationsStore.isLoading()"
        [paginator]="true"
        [rows]="15"
        [rowsPerPageOptions]="[15, 30, 50]"
        paginatorDropdownAppendTo="body"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} candidatos"
        sortField="classified_at"
        [sortOrder]="-1"
        styleClass="w-full"
      >
        <ng-template #header>
          <tr>
            <th pSortableColumn="first_name">Candidato <p-sortIcon field="first_name" /></th>
            <th>Vacante Aplicada</th>
            <th pSortableColumn="recommended_role" class="text-center">Rol Recomendado <p-sortIcon field="recommended_role" /></th>
            <th class="text-center">Score</th>
            <th class="text-center" style="width:60px">CV</th>
            <th pSortableColumn="classified_at" class="text-center" style="width:110px">Clasificado <p-sortIcon field="classified_at" /></th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr class="hover:bg-neutral-800/50 transition-colors">
            <td class="font-medium text-white">
              {{ row.first_name }} {{ row.last_name }}
              <div class="text-xs text-gray-500">{{ row.email }}</div>
            </td>
            <td class="text-gray-300 text-sm">{{ row.position_name || 'N/A' }}</td>
            <td class="text-center">
              @if (row.recommended_role) {
                <p-tag
                  [value]="getRoleLabel(row.recommended_role)"
                  [severity]="getRoleSeverity(row.recommended_role)"
                />
              } @else if (row.extraction_status === 'failed') {
                <p-tag value="Error extracción" severity="danger" />
              } @else if (row.extraction_status === 'no_resume') {
                <p-tag value="Sin CV" severity="secondary" />
              } @else {
                <p-tag value="Sin clasificar" severity="secondary" />
              }
            </td>
            <td class="text-center text-sm">
              @if (row.scores && hasScores(row.scores)) {
                <div class="flex flex-col gap-0.5">
                  @for (entry of getTopScores(row.scores); track entry.role) {
                    <span class="text-xs" [class.font-bold]="entry.role === row.recommended_role" [class.text-white]="entry.role === row.recommended_role" [class.text-gray-400]="entry.role !== row.recommended_role">
                      {{ getRoleLabel(entry.role) }}: {{ entry.score }}pts
                    </span>
                  }
                </div>
              } @else {
                <span class="text-gray-500">-</span>
              }
            </td>
            <td class="text-center">
              @if (row.extraction_status === 'extracted') {
                <i class="pi pi-check-circle text-green-400" pTooltip="CV extraído correctamente"></i>
              } @else if (row.extraction_status === 'failed') {
                <i class="pi pi-times-circle text-red-400" [pTooltip]="row.extraction_error || 'Error al extraer'"></i>
              } @else if (row.extraction_status === 'no_resume') {
                <i class="pi pi-minus-circle text-gray-500" pTooltip="No tiene CV adjunto"></i>
              } @else {
                <i class="pi pi-clock text-yellow-400" pTooltip="Pendiente de extracción"></i>
              }
            </td>
            <td class="text-gray-400 text-center text-xs">
              {{ row.classified_at | date:'short' }}
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td [attr.colspan]="6" class="text-center py-8">
              <div class="flex flex-col items-center gap-2">
                <i class="pi pi-chart-bar text-4xl text-gray-500"></i>
                <p class="text-gray-400">No hay clasificaciones aún</p>
                <p class="text-gray-500 text-sm">Usa "Extraer y Clasificar Pendientes" para comenzar</p>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruitmentClassificationTabComponent implements OnInit {
  readonly applications = input.required<JobApplication[]>();
  readonly classificationsStore = inject(RecruitmentClassificationsStore);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private organizationService = inject(OrganizationService);

  readonly batchSize = EXTRACT_BATCH_SIZE;

  // Clasificación
  public isProcessing = signal(false);
  public processingStatus = signal('');

  // Extracción de CVs
  public isExtracting = signal(false);
  public extractionStatus = signal('');
  public extractionProgress = signal(0);
  public extractedInSession = signal(0);
  public lastExtractionResult = signal<{ extracted: number; failed: number } | null>(null);

  ngOnInit(): void {
    this.classificationsStore.reloadItems();
  }

  // CVs con resume_url pero cuya extracción aún está pendiente
  public pendingExtractionCount = computed(() => {
    const classifications = this.classificationsStore.entities();
    const extractedSet = new Set(
      classifications.filter(c => c.extraction_status === 'extracted').map(c => c.job_application_id)
    );
    return this.applications().filter(app => app.resume_url && !extractedSet.has(app.id)).length;
  });

  public batchesRemaining = computed(() =>
    Math.ceil(this.pendingExtractionCount() / EXTRACT_BATCH_SIZE)
  );

  // Combina aplicaciones con sus clasificaciones
  public mergedApplications = computed(() => {
    const apps = this.applications();
    const classifications = this.classificationsStore.entities();
    const classMap = new Map(classifications.map(c => [c.job_application_id, c]));

    return apps.map(app => ({
      ...app,
      ...classMap.get(app.id),
    }));
  });

  public roleSummary = computed(() => {
    const merged = this.mergedApplications();
    const counts: Record<string, number> = {};
    let unclassified = 0;

    for (const app of merged) {
      const role = (app as any).recommended_role;
      if (role) {
        counts[role] = (counts[role] || 0) + 1;
      } else {
        unclassified++;
      }
    }

    const roleConfig: Record<string, { label: string; colorClass: string }> = {
      gerente: { label: 'Gerente', colorClass: 'text-purple-400' },
      subgerente: { label: 'Subgerente', colorClass: 'text-blue-400' },
      piso_venta: { label: 'Piso de Venta', colorClass: 'text-green-400' },
    };

    const result = Object.entries(counts).map(([key, count]) => ({
      key,
      label: roleConfig[key]?.label ?? key,
      count,
      colorClass: roleConfig[key]?.colorClass ?? 'text-white',
    }));

    result.push({ key: 'unclassified', label: 'Sin Clasificar', count: unclassified, colorClass: 'text-gray-400' });
    return result;
  });

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      gerente: 'Gerente',
      subgerente: 'Subgerente',
      piso_venta: 'Piso de Venta',
    };
    return labels[role] ?? role;
  }

  getRoleSeverity(role: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      gerente: 'warn',
      subgerente: 'info',
      piso_venta: 'success',
    };
    return map[role] ?? 'secondary';
  }

  hasScores(scores: Record<string, number>): boolean {
    return Object.keys(scores).length > 0;
  }

  getTopScores(scores: Record<string, number>): Array<{ role: string; score: number }> {
    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([role, score]) => ({ role, score }));
  }

  async runBatchClassification(): Promise<void> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return;

    const apps = this.applications();
    const pendingIds = apps
      .filter(app => !(app as any).recommended_role)
      .map(app => app.id);

    if (pendingIds.length === 0) {
      this.messageService.add({ severity: 'info', detail: 'No hay candidatos pendientes de clasificar' });
      return;
    }

    await this.runClassification(pendingIds, companyId, `Clasificando ${pendingIds.length} candidatos pendientes...`);
  }

  async reclassifyAll(): Promise<void> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return;

    const allIds = this.applications().map(app => app.id);
    if (allIds.length === 0) return;

    await this.runClassification(allIds, companyId, `Reclasificando ${allIds.length} candidatos...`);
  }

  async extractNextBatch(): Promise<void> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return;

    const classifications = this.classificationsStore.entities();
    const extractedSet = new Set(
      classifications.filter(c => c.extraction_status === 'extracted').map(c => c.job_application_id)
    );

    const batch = this.applications()
      .filter(app => app.resume_url && !extractedSet.has(app.id))
      .slice(0, EXTRACT_BATCH_SIZE)
      .map(app => app.id);

    if (batch.length === 0) {
      this.messageService.add({ severity: 'info', detail: 'No hay CVs pendientes de extraer' });
      return;
    }

    this.isExtracting.set(true);
    this.extractionProgress.set(10);
    this.extractionStatus.set(`Descargando y extrayendo texto de ${batch.length} CVs...`);

    try {
      // Paso 1: Extraer texto de los PDFs
      const extractResult = await firstValueFrom(
        this.http.post<{ extracted: number; failed: number; total: number }>(
          '/api/recruitment/extract', { applicationIds: batch }
        )
      );

      this.extractionProgress.set(60);
      this.extractionStatus.set(`Reclasificando ${batch.length} candidatos con texto extraído...`);

      // Paso 2: Reclasificar esos mismos candidatos (ahora con resume_text disponible)
      await firstValueFrom(
        this.http.post('/api/recruitment/extract-and-classify', { applicationIds: batch, companyId })
      );

      this.extractionProgress.set(100);
      this.extractedInSession.update(n => n + (extractResult.extracted ?? 0));
      this.lastExtractionResult.set({
        extracted: extractResult.extracted ?? 0,
        failed: extractResult.failed ?? 0,
      });

      this.classificationsStore.reloadItems();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Fallo al extraer el lote de CVs' });
    } finally {
      this.isExtracting.set(false);
      this.extractionProgress.set(0);
      this.extractionStatus.set('');
    }
  }

  private async runClassification(applicationIds: string[], companyId: string, statusMsg: string): Promise<void> {
    this.isProcessing.set(true);
    this.processingStatus.set(statusMsg);

    try {
      await firstValueFrom(
        this.http.post('/api/recruitment/extract-and-classify', { applicationIds, companyId })
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Completado',
        detail: `Clasificación finalizada para ${applicationIds.length} candidatos`,
      });
      this.classificationsStore.reloadItems();
    } catch (err: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo completar la clasificación',
      });
    } finally {
      this.isProcessing.set(false);
      this.processingStatus.set('');
    }
  }
}
