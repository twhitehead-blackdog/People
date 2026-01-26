import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AuditEvaluation, AuditForm } from '../../models';
import { Performance360Service } from '../../services/performance-360.service';

interface Finding {
  section: string;
  question: string;
  answer: string;
  note: string;
}

@Component({
  selector: 'pt-performance-report',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    Button,
    TagModule,
    ProgressBarModule,
    TableModule,
    ProgressSpinnerModule,
  ],
  styles: [
    `
      /* Print Styles */
      @media print {
        @page {
          margin: 1.5cm;
          size: A4;
        }

        /* Hide UI elements */
        .no-print,
        p-button,
        p-toast,
        .p-button,
        .pi-arrow-left {
          display: none !important;
        }

        /* Reset backgrounds and colors */
        body,
        .bg-surface-900,
        .bg-surface-800 {
          background-color: white !important;
          color: black !important;
        }

        /* Ensure texts are visible */
        .text-white {
          color: #111827 !important; /* gray-900 */
        }
        .text-gray-400,
        .text-gray-300,
        .text-gray-500 {
          color: #4b5563 !important; /* gray-600 */
        }

        /* Layout adjustments */
        .max-w-5xl {
          max-width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        /* Borders */
        .border-surface-700 {
          border-color: #e5e7eb !important; /* gray-200 */
        }

        /* Force page breaks */
        .page-break {
          page-break-before: always;
        }

        /* Avoid breaking elements */
        .break-inside-avoid {
          page-break-inside: avoid;
        }
      }
    `,
  ],
  template: `
    <div class="p-4 max-w-5xl mx-auto space-y-6 pb-20 print:p-0 print:pb-0">
      <!-- Header Actions -->
      <div class="flex justify-between items-center no-print">
        <p-button
          icon="pi pi-arrow-left"
          label="Volver"
          [text]="true"
          (onClick)="goBack()"
        ></p-button>
        <div class="flex gap-2">
          <p-button
            icon="pi pi-file-pdf"
            label="Imprimir / PDF"
            severity="danger"
            [outlined]="true"
            (onClick)="downloadPDF()"
          ></p-button>
          <p-button
            icon="pi pi-share-alt"
            label="Compartir"
            severity="secondary"
            [outlined]="true"
          ></p-button>
        </div>
      </div>

      @if (isLoading()) {
      <div class="flex justify-center p-12 no-print">
        <p-progressSpinner strokeWidth="4"></p-progressSpinner>
      </div>
      } @else if (evaluation()) {
      <!-- Report Card -->
      <div
        class="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden shadow-xl print:shadow-none print:border-0 print:rounded-none"
      >
        <!-- Banner Header -->
        <div
          class="bg-gradient-to-r from-surface-800 to-surface-900 p-6 border-b border-surface-700 print:bg-none print:p-4 print:border-b-2"
        >
          <div
            class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          >
            <div>
              <div class="flex items-center gap-2 mb-2">
                <p-tag
                  [value]="getMetadata().statusLabel"
                  [severity]="getMetadata().statusColor"
                  styleClass="print:border print:border-gray-300 print:bg-white print:text-black"
                ></p-tag>
                <span class="text-sm text-gray-400"
                  >Ref: {{ evaluation()?.id?.slice(0, 8) }}</span
                >
              </div>
              <h1 class="text-3xl font-bold text-white mb-1">
                {{ evaluation()?.audit_form?.title }}
              </h1>
              <p class="text-gray-400 text-lg">
                Sucursal: {{ evaluation()?.branch?.name }}
              </p>
            </div>

            <div class="flex items-center gap-6">
              <div class="text-right">
                <div class="text-sm text-gray-400 uppercase">
                  Resultado Global
                </div>
                <div
                  class="text-4xl font-black"
                  [class.text-emerald-500]="
                    reportData().levelColor === 'success'
                  "
                  [class.text-yellow-500]="reportData().levelColor === 'warn'"
                  [class.text-red-500]="reportData().levelColor === 'danger'"
                >
                  {{ reportData().score }}%
                </div>
                <div
                  class="text-sm font-medium"
                  [class.text-emerald-400]="
                    reportData().levelColor === 'success'
                  "
                  [class.text-yellow-400]="reportData().levelColor === 'warn'"
                  [class.text-red-400]="reportData().levelColor === 'danger'"
                >
                  Nivel: {{ reportData().level }}
                </div>
              </div>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div
            class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-700/50 print:border-gray-200"
          >
            <div>
              <span class="block text-xs text-gray-500 uppercase">Fecha</span>
              <span class="text-white font-medium">{{
                evaluation()?.created_at | date : 'mediumDate'
              }}</span>
            </div>
            <div>
              <span class="block text-xs text-gray-500 uppercase">Auditor</span>
              <span class="text-white font-medium">{{ getAuditorName() }}</span>
            </div>
            <div>
              <span class="block text-xs text-gray-500 uppercase">Unidad</span>
              <span class="text-white font-medium">{{
                evaluation()?.audit_form?.business_unit
              }}</span>
            </div>
            <div>
              <span class="block text-xs text-gray-500 uppercase"
                >Versión Form</span
              >
              <span class="text-white font-medium"
                >v{{ evaluation()?.form_version }}</span
              >
            </div>
          </div>
        </div>

        <!-- Body Content -->
        <div class="p-6 space-y-8 print:p-4">
          <!-- Global Observations -->
          @if (evaluation()?.observations) {
          <div
            class="bg-surface-800/50 p-4 rounded-lg border border-surface-700 print:bg-white print:border-gray-300"
          >
            <h3 class="text-white font-bold mb-2 flex items-center gap-2">
              <i class="pi pi-comment"></i> Observaciones Generales
            </h3>
            <p class="text-gray-300 italic">
              "{{ evaluation()?.observations }}"
            </p>
          </div>
          }

          <!-- Breakdown -->
          <div class="break-inside-avoid">
            <h3 class="text-white font-bold mb-4 text-xl">
              Detalle por Sección
            </h3>
            <div class="space-y-4">
              @for (section of reportData().sectionScores; track
              section.sectionId) {
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-white font-medium"
                    >{{ section.title }} ({{ section.weight }}%)</span
                  >
                  <span class="text-white font-bold">
                    {{ section.score >= 0 ? section.score + '%' : 'N/A' }}
                  </span>
                </div>
                @if (section.score >= 0) {
                <p-progressBar
                  [value]="section.score"
                  [showValue]="false"
                  [color]="getScoreColor(section.score)"
                  [style]="{ height: '8px' }"
                  class="print:block"
                ></p-progressBar>
                }
              </div>
              }
            </div>
          </div>

          <!-- Findings Table -->
          @if (findings().length > 0) {
          <div class="break-inside-avoid">
            <h3 class="text-white font-bold mb-4 text-xl pt-4">
              Hallazgos y Comentarios
            </h3>
            <p-table
              [value]="findings()"
              styleClass="p-datatable-sm print:text-sm"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 20%">Sección</th>
                  <th style="width: 45%">Pregunta</th>
                  <th style="width: 10%">Respuesta</th>
                  <th style="width: 25%">Nota</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-item>
                <tr>
                  <td class="font-medium text-gray-300">{{ item.section }}</td>
                  <td class="text-gray-400 text-sm">{{ item.question }}</td>
                  <td>
                    <p-tag
                      [value]="item.answer === 'yes' ? 'Cumple' : 'No Cumple'"
                      [severity]="item.answer === 'yes' ? 'success' : 'danger'"
                      styleClass="print:border print:border-gray-200"
                    ></p-tag>
                  </td>
                  <td class="text-sm italic text-gray-400">{{ item.note }}</td>
                </tr>
              </ng-template>
            </p-table>
          </div>
          } @else {
          <div class="text-gray-500 text-center italic py-4">
            No se registraron hallazgos negativos ni comentarios adicionales.
          </div>
          }
        </div>
      </div>
      } @else {
      <div class="text-center py-12 text-gray-500">
        <i class="pi pi-exclamation-triangle text-4xl mb-4"></i>
        <p>No se encontró la evaluación solicitada.</p>
      </div>
      }
    </div>
  `,
})
export class PerformanceReportComponent {
  private router = inject(Router);
  private performanceService = inject(Performance360Service);

  evaluationId = input.required<string>();
  isLoading = signal(true);
  evaluation = signal<AuditEvaluation | null>(null);

  // Datos calculados del reporte
  reportData = computed(() => {
    const evalData = this.evaluation();
    const form = evalData?.audit_form as AuditForm;

    if (!evalData || !form) {
      return {
        score: 0,
        level: '-',
        levelColor: 'secondary',
        sectionScores: [],
      };
    }

    // Convertir respuestas a mapa para el motor de cálculo
    const answersMap = new Map<
      string,
      { value: 'yes' | 'no' | 'na' | null; notes: string }
    >();

    if (evalData.answers) {
      for (const answer of evalData.answers) {
        answersMap.set(answer.audit_question_id, {
          value: answer.answer_value,
          notes: answer.notes || '',
        });
      }
    }

    // Usar el mismo motor de cálculo que en el formulario
    return this.performanceService.calculateScoreWithForm(answersMap, form);
  });

  // Lista de hallazgos (respuestas NO o con notas)
  findings = computed<Finding[]>(() => {
    const evalData = this.evaluation();
    if (!evalData?.answers || !evalData?.audit_form?.sections) return [];

    const findingsList: Finding[] = [];
    const questionsMap = new Map<string, any>();
    const sectionsMap = new Map<string, string>(); // questionId -> sectionTitle

    // Mapear preguntas para búsqueda rápida
    for (const section of evalData.audit_form.sections) {
      for (const q of section.questions || []) {
        questionsMap.set(q.id, q);
        sectionsMap.set(q.id, section.title);
      }
    }

    // Filtrar respuestas relevantes
    for (const answer of evalData.answers) {
      const isCriticalFinding = answer.answer_value === 'no';
      const hasNote = answer.notes && answer.notes.trim().length > 0;

      if (isCriticalFinding || hasNote) {
        const question = questionsMap.get(answer.audit_question_id);
        const sectionTitle =
          sectionsMap.get(answer.audit_question_id) || 'General';

        findingsList.push({
          section: sectionTitle,
          question: question ? question.question_text : 'Pregunta Desconocida',
          answer: answer.answer_value,
          note: answer.notes || '',
        });
      }
    }

    return findingsList;
  });

  constructor() {
    // Escuchar cambios en evaluationId (aunque suele ser estático por ruta)
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const id = this.evaluationId();
      if (id) {
        const data = await this.performanceService
          .getEvaluationById(id)
          .toPromise();

        if (data) {
          // Ajuste: si viene en array, tomar el primero
          const result = Array.isArray(data) ? data[0] : data;
          this.evaluation.set(result as AuditEvaluation);
        }
      }
    } catch (e) {
      console.error('Error cargando reporte', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  getAuditorName(): string {
    const aud = this.evaluation()?.auditor;
    if (!aud) return 'N/A';
    return `${aud.first_name || ''} ${aud.father_name || ''}`.trim();
  }

  getScoreColor(score: number): string {
    if (score >= 81) return '#10B981';
    if (score >= 61) return '#F59E0B';
    return '#EF4444';
  }

  getMetadata(): { statusLabel: string; statusColor: 'success' | 'secondary' } {
    const status = this.evaluation()?.status;
    if (status === 'completed')
      return { statusLabel: 'Finalizado', statusColor: 'success' };
    return { statusLabel: 'Borrador', statusColor: 'secondary' };
  }

  goBack() {
    this.router.navigate(['/admin/performance']);
  }

  downloadPDF() {
    window.print();
  }
}
