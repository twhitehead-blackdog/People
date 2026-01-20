import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { getEnv } from '../../../../utils/env.utils';
import { HrFiltersPanelComponent } from '../../shared/components/hr-filters-panel.component';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';
import {
  getStatusLabel,
  getStatusSeverity,
  TagSeverity,
} from '../../shared/utils/hr-status.utils';
import { DocumentRequestsService } from '../data/document-requests.service';
import { DocumentRequest } from '../models/document-request.model';

@Component({
  selector: 'pt-document-requests',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .pdf-viewer {
        width: 100%;
        height: 500px;
        border: 1px solid #3f3f46;
        border-radius: 0.5rem;
      }
    `,
  ],
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    FileUploadModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
    HrStatsGridComponent,
    HrFiltersPanelComponent,
    SafeUrlPipe,
    TextareaModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="space-y-3">
      <!-- Estadísticas Compactas -->
      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="pendingCount()"
        [approvedCount]="completedCount()"
        [rejectedCount]="rejectedCount()"
        approvedLabel="Completadas"
        icon="pi-file-edit"
      />

      <!-- Filtros -->
      <pt-hr-filters-panel
        [statusOptions]="statusOptions"
        [totalCount]="totalCount()"
        [filteredCount]="filteredDocuments().length"
        searchPlaceholder="Empleado o tipo..."
        (searchChange)="onSearchChange($event)"
        (statusChange)="onStatusChange($event)"
        (dateRangeChange)="onDateRangeChange($event)"
        (clearFilters)="onClearFilters()"
      />

      <!-- Tabla -->
      <div
        class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden"
      >
        <!-- Header -->
        <div class="p-2 border-b border-neutral-700/50">
          <h3
            class="text-sm font-semibold text-white m-0 flex items-center gap-1.5"
          >
            <i class="pi pi-file-edit text-purple-400 text-sm"></i>
            Solicitudes de Documentos
          </h3>
        </div>
        @if (service.isLoading()) {
        <div class="flex justify-center py-8">
          <p-progressSpinner />
        </div>
        } @else if (filteredDocuments().length === 0) {
        <div class="text-center py-8">
          <i class="pi pi-file-edit text-gray-400 text-4xl mb-3"></i>
          <p class="text-gray-400">No se encontraron solicitudes</p>
        </div>
        } @else {
        <p-table
          [value]="filteredDocuments()"
          [paginator]="true"
          [rows]="8"
          [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
          paginatorPosition="bottom"
          [scrollable]="true"
          scrollHeight="600px"
          styleClass="p-datatable-sm p-datatable-striped"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 180px; padding: 0.4rem; text-align: left;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-user text-purple-400 text-xs"></i>
                  <span class="text-xs">Empleado</span>
                </div>
              </th>
              <th style="width: 150px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-file text-purple-400 text-xs"></i>
                  <span class="text-xs">Tipo Documento</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-tag text-purple-400 text-xs"></i>
                  <span class="text-xs">Estado</span>
                </div>
              </th>
              <th style="width: 140px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-user-plus text-purple-400 text-xs"></i>
                  <span class="text-xs">Creador</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-calendar text-purple-400 text-xs"></i>
                  <span class="text-xs">Solicitado</span>
                </div>
              </th>
              <th style="width: 180px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-cog text-purple-400 text-xs"></i>
                  <span class="text-xs">Acciones</span>
                </div>
              </th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-document>
            <tr
              class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
              (click)="viewDetails(document)"
            >
              <td style="padding: 0.4rem;">
                <div class="flex items-center gap-1">
                  <div
                    class="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="pi pi-user text-purple-400 text-[9px]"></i>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="font-medium text-white text-xs truncate">
                      {{ document.employee?.first_name }}
                      {{ document.employee?.father_name }}
                    </span>
                    <span class="text-[9px] text-gray-400 truncate">
                      {{ document.employee?.branch?.name || '-' }}
                    </span>
                  </div>
                </div>
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                <span class="text-sm text-gray-300">{{
                  getDocumentTypeLabel(document.document_type)
                }}</span>
                @if (document.reason) { <br /><span
                  class="text-xs text-gray-400"
                  >{{ document.reason }}</span
                >
                }
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                <p-tag
                  [value]="getDocumentStatusLabel(document.status)"
                  [severity]="getDocumentStatusSeverity(document.status)"
                  class="text-xs"
                />
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                @if (document.created_by_employee) {
                <div class="flex flex-col items-center gap-0.5">
                  <div class="flex items-center gap-1">
                    <i class="pi pi-user text-amber-400 text-[9px]"></i>
                    <span class="text-[10px] font-medium text-amber-300">
                      {{ document.created_by_employee.first_name }}
                      {{ document.created_by_employee.father_name }}
                    </span>
                  </div>
                </div>
                } @else {
                <span class="text-[10px] text-gray-500 italic">
                  Auto-solicitud
                </span>
                }
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                <span class="text-xs text-gray-400">{{
                  document.created_at | date : 'dd/MM/yyyy'
                }}</span>
              </td>
              <td
                style="padding: 0.4rem; text-align: center;"
                (click)="$event.stopPropagation()"
              >
                <div class="flex gap-0.5 justify-center">
                  @if (document.status === 'pending') {
                  <p-button
                    icon="pi pi-check-circle"
                    [text]="true"
                    severity="success"
                    size="small"
                    (onClick)="
                      openCompleteDialog(document); $event.stopPropagation()
                    "
                    [rounded]="true"
                    pTooltip="Adjuntar y Completar"
                    tooltipPosition="top"
                  />
                  } @if (document.document_url) {
                  <p-button
                    icon="pi pi-file-pdf"
                    [text]="true"
                    severity="secondary"
                    size="small"
                    (onClick)="viewDetails(document); $event.stopPropagation()"
                    [rounded]="true"
                    pTooltip="Ver Documento"
                    tooltipPosition="top"
                  />
                  } @if (document.status === 'pending') {
                  <p-button
                    icon="pi pi-times"
                    [text]="true"
                    severity="danger"
                    size="small"
                    (onClick)="
                      openRejectionDialog(document); $event.stopPropagation()
                    "
                    [rounded]="true"
                    pTooltip="Rechazar"
                    tooltipPosition="top"
                  />
                  }
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    severity="info"
                    size="small"
                    pTooltip="Ver detalles"
                    tooltipPosition="top"
                    [rounded]="true"
                    (onClick)="viewDetails(document); $event.stopPropagation()"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
        }
      </div>
    </div>

    <!-- Diálogo Completar Solicitud -->
    <p-dialog
      [(visible)]="showCompleteDialog"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: '450px' }"
      header="Completar Solicitud"
      [draggable]="false"
      [resizable]="false"
    >
      <ng-template pTemplate="content">
        @if (selectedDocument()) {
        <div class="flex flex-col gap-4">
          <div class="bg-neutral-800/50 p-3 rounded border border-neutral-700">
            <p class="text-sm text-gray-300 m-0 mb-1">
              Estás completando la solicitud de:
            </p>
            <p class="font-bold text-white m-0">
              {{ getDocumentTypeLabel(selectedDocument()!.document_type) }}
            </p>
            <p class="text-xs text-gray-400 m-0 mt-1">
              {{ selectedDocument()?.employee?.first_name }}
              {{ selectedDocument()?.employee?.father_name }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2"
              >Adjuntar Documento (PDF) *</label
            >
            <p-fileUpload
              mode="basic"
              chooseLabel="Seleccionar PDF"
              accept="application/pdf"
              [maxFileSize]="5000000"
              (onSelect)="onFileSelect($event)"
              [auto]="false"
              styleClass="w-full"
            ></p-fileUpload>
            @if (selectedFile()) {
            <p class="text-xs text-green-400 mt-2 flex items-center gap-1">
              <i class="pi pi-check"></i> Archivo seleccionado:
              {{ selectedFile()?.name }}
            </p>
            }
          </div>
        </div>
        }
      </ng-template>
      <ng-template pTemplate="footer">
        <p-button
          label="Cancelar"
          icon="pi pi-times"
          [text]="true"
          (onClick)="showCompleteDialog.set(false)"
        />
        <p-button
          label="Completar y Guardar"
          icon="pi pi-check"
          severity="success"
          [disabled]="!selectedFile() || isUploading()"
          [loading]="isUploading()"
          (onClick)="completeDocument()"
        />
      </ng-template>
    </p-dialog>

    <!-- Diálogo de Detalles de Documento -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '900px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span class="text-lg font-semibold text-white"
            >Detalles de Solicitud de Documento</span
          >
          <div class="flex items-center gap-2">
            <p-button
              [icon]="
                selectedDocument()?.document_url
                  ? 'pi pi-file'
                  : 'pi pi-paperclip'
              "
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="
                selectedDocument()?.document_url
                  ? openDocument()
                  : openCompleteDialog(selectedDocument()!)
              "
              [pTooltip]="
                selectedDocument()?.document_url
                  ? 'Ver documento adjunto'
                  : 'Adjuntar documento'
              "
              tooltipPosition="left"
              size="small"
            />
          </div>
        </div>
      </ng-template>

      @if (selectedDocument()) {
      <div class="space-y-4 pt-4">
        <!-- Información del Empleado y Resumen del Documento (lado a lado) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Información del Empleado -->
          <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-user text-purple-400"></i>
              Información del Empleado
            </h3>
            <div class="space-y-2">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Nombre</label
                >
                <p class="text-white">
                  {{ selectedDocument()!.employee?.first_name }}
                  {{ selectedDocument()!.employee?.father_name }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Email</label
                >
                <p class="text-white">
                  {{ selectedDocument()!.employee?.work_email || '-' }}
                </p>
              </div>
              @if (selectedDocument()!.employee?.position?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Cargo</label
                >
                <p class="text-white">
                  {{ selectedDocument()!.employee?.position?.name }}
                </p>
              </div>
              } @if (selectedDocument()!.employee?.branch?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Sucursal</label
                >
                <p class="text-white">
                  {{ selectedDocument()!.employee?.branch?.name }}
                </p>
              </div>
              }
            </div>
          </div>

          <!-- Resumen del Documento -->
          <div
            class="p-4 bg-gradient-to-r from-purple-500/20 to-purple-600/10 border border-purple-400/30 rounded-lg"
          >
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-file-edit text-purple-400"></i>
              Resumen de Solicitud
            </h3>
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-sm text-gray-400 mb-1">Tipo de documento</p>
                <p class="text-2xl font-bold text-purple-300">
                  {{ getDocumentTypeLabel(selectedDocument()!.document_type) }}
                </p>
              </div>
              <div
                class="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center"
              >
                <i class="pi pi-file-edit text-purple-400 text-3xl"></i>
              </div>
            </div>
            <div class="mt-3 space-y-2">
              <div
                class="bg-purple-500/10 border border-purple-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-purple-300">
                    Estado
                  </span>
                  <p-tag
                    [value]="getDocumentStatusLabel(selectedDocument()!.status)"
                    [severity]="
                      getDocumentStatusSeverity(selectedDocument()!.status)
                    "
                  />
                </div>
              </div>
              <div
                class="bg-purple-500/10 border border-purple-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-purple-300">
                    Fecha Solicitud
                  </span>
                  <span class="text-xs font-bold text-purple-400">
                    {{ selectedDocument()!.created_at | date : 'dd/MM/yyyy' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Información de la Solicitud -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-purple-400"></i>
            Información de la Solicitud
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Tipo de Documento</label
              >
              <p class="text-white">
                {{ getDocumentTypeLabel(selectedDocument()!.document_type) }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Estado</label
              >
              <p-tag
                [value]="getDocumentStatusLabel(selectedDocument()!.status)"
                [severity]="
                  getDocumentStatusSeverity(selectedDocument()!.status)
                "
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Solicitud</label
              >
              <p class="text-white">
                {{ selectedDocument()!.created_at | date : 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Creador</label
              >
              <p class="text-white">
                @if (selectedDocument()?.created_by_employee) {
                {{ selectedDocument()!.created_by_employee!.first_name }}
                {{ selectedDocument()!.created_by_employee!.father_name }}
                } @else if (selectedDocument()?.created_by &&
                selectedDocument()?.created_by !==
                selectedDocument()?.employee_id) {
                <span class="text-amber-300">Gerente</span>
                } @else {
                <span class="text-gray-400">Auto-solicitud</span>
                }
              </p>
            </div>
            @if (selectedDocument()?.processed_at) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Completado el</label
              >
              <p class="text-white">
                {{
                  selectedDocument()?.processed_at | date : 'dd/MM/yyyy HH:mm'
                }}
              </p>
            </div>
            }
          </div>
        </div>

        @if (selectedDocument()!.reason) {
        <!-- Motivo / Descripción -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-comment text-purple-400"></i>
            Motivo / Descripción
          </h3>
          <p class="text-white whitespace-pre-wrap">
            {{ selectedDocument()!.reason }}
          </p>
        </div>
        } @if (selectedDocument()!.status === 'rejected' &&
        selectedDocument()!.rejection_comment) {
        <!-- Motivo de Rechazo -->
        <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-exclamation-triangle text-red-400"></i>
            Motivo del Rechazo
          </h3>
          <p class="text-red-300 whitespace-pre-wrap">
            {{ selectedDocument()!.rejection_comment }}
          </p>
        </div>
        }

        <!-- Detalles de Omisión de Marcación -->
        @if (selectedDocument()!.document_type === 'timelog_correction' &&
        selectedDocument()!.metadata) {
        <div
          class="p-4 bg-gradient-to-r from-orange-500/10 to-orange-600/5 rounded-lg border border-orange-400/30"
        >
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-exclamation-triangle text-orange-400"></i>
            Detalles de Omisión de Marcación
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de la Marcación</label
              >
              <p class="text-white">
                {{
                  selectedDocument()!.metadata!.timelog_date
                    | date : 'dd/MM/yyyy'
                }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Tipo de Marcación</label
              >
              <p class="text-orange-300 font-semibold">
                {{
                  getTimelogTypeLabel(
                    selectedDocument()!.metadata!.timelog_type || ''
                  )
                }}
              </p>
            </div>
            @if (selectedDocument()!.metadata!.attachment_url) {
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Evidencia Adjunta</label
              >
              <!-- Mostrar preview del documento automáticamente -->
              <div
                class="mt-3 border border-orange-400/30 rounded-lg overflow-hidden"
              >
                <iframe
                  [src]="selectedDocument()!.metadata!.attachment_url | safeUrl"
                  class="w-full h-64 border-0 bg-white"
                  title="Preview de evidencia de marcación errónea"
                ></iframe>
              </div>
              <p class="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <i class="pi pi-info-circle"></i>
                Evidencia visual adjunta a la solicitud
              </p>
            </div>
            }
          </div>
        </div>
        }

        <!-- Detalles de Solicitud de Uniforme -->
        @if (selectedDocument()!.document_type === 'uniform_request' &&
        selectedDocument()!.metadata) {
        <div
          class="p-4 bg-gradient-to-r from-teal-500/10 to-teal-600/5 rounded-lg border border-teal-400/30"
        >
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-tag text-teal-400"></i>
            Detalles de Solicitud de Uniforme
          </h3>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Tipo de Prenda</label
              >
              <p class="text-teal-300 font-semibold">
                {{ selectedDocument()!.metadata!.item_type }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Talla</label
              >
              <p class="text-white">
                {{ selectedDocument()!.metadata!.size }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Cantidad</label
              >
              <p class="text-white">
                {{ selectedDocument()!.metadata!.quantity }}
              </p>
            </div>
          </div>
        </div>
        }

        <!-- Gestión de Estado -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-cog text-purple-400"></i>
            Gestión de Estado
          </h3>
          <div class="flex gap-2">
            <p-button
              label="Pendiente"
              severity="warn"
              [outlined]="selectedDocument()!.status !== 'pending'"
              (onClick)="updateDocumentStatusFromDialog('pending')"
              [disabled]="selectedDocument()!.status === 'pending'"
            />
            <p-button
              label="Completada"
              severity="success"
              [outlined]="selectedDocument()!.status !== 'completed'"
              (onClick)="openCompleteDialog(selectedDocument()!)"
              [disabled]="selectedDocument()!.status === 'completed'"
            />
            <p-button
              label="Rechazada"
              severity="danger"
              [outlined]="selectedDocument()!.status !== 'rejected'"
              (onClick)="
                showDetailsDialog.set(false);
                openRejectionDialog(selectedDocument()!)
              "
              [disabled]="selectedDocument()!.status === 'rejected'"
            />
          </div>
        </div>
      </div>
      }
    </p-dialog>

    @if (showDocumentPreview()) {
    <div
      class="fixed bg-neutral-900 border-l border-neutral-700 shadow-2xl z-[1200] transition-all duration-500 ease-out"
      [style.width]="'400px'"
      [style.max-width]="'40vw'"
      [style.top]="'50%'"
      [style.left]="showDocumentPreview() ? 'calc(50% + 400px)' : '50%'"
      [style.transform]="
        showDocumentPreview()
          ? 'translateY(-50%) translateX(0) scale(1)'
          : 'translateY(-50%) translateX(0) scale(0.8)'
      "
      [style.opacity]="showDocumentPreview() ? '1' : '0'"
      [style.max-height]="'90vh'"
      [style.height]="'664px'"
      [style.pointer-events]="showDocumentPreview() ? 'auto' : 'none'"
    >
      <div class="flex flex-col h-full">
        <!-- Header del panel lateral -->
        <div
          class="p-4 border-b border-neutral-700 bg-neutral-800 flex items-center justify-between"
        >
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <i class="pi pi-file text-cyan-400"></i>
            Documento Adjunto
          </h3>
          <div class="flex items-center gap-2">
            @if (selectedDocument()?.document_url) {
            <p-button
              label="Adjuntar nuevo archivo"
              icon="pi pi-upload"
              size="small"
              severity="secondary"
              [outlined]="true"
              (onClick)="openCompleteDialog(selectedDocument()!)"
            />
            }
            <p-button
              icon="pi pi-times"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="showDocumentPreview.set(false)"
              size="small"
            />
          </div>
        </div>

        <!-- Controlles de Zoom -->
        @if (selectedDocument()?.document_url) {
        <div
          class="p-2 border-b border-neutral-700 bg-neutral-800/50 flex items-center justify-end gap-2"
        >
          <p-button
            icon="pi pi-search-minus"
            (onClick)="zoomOut()"
            [text]="true"
            [rounded]="true"
            severity="secondary"
            size="small"
            [disabled]="documentZoomLevel() <= 0.5"
            pTooltip="Alejar"
          />
          <span class="text-sm text-gray-400 min-w-[60px] text-center">
            {{ (documentZoomLevel() * 100).toFixed(0) }}%
          </span>
          <p-button
            icon="pi pi-search-plus"
            (onClick)="zoomIn()"
            [text]="true"
            [rounded]="true"
            severity="secondary"
            size="small"
            [disabled]="documentZoomLevel() >= 2"
            pTooltip="Acercar"
          />
          <p-button
            label="Reset"
            (onClick)="resetZoom()"
            [text]="true"
            severity="secondary"
            size="small"
            pTooltip="Restablecer zoom"
          />
        </div>
        }

        <!-- Contenido del preview -->
        <div class="flex-1 overflow-hidden bg-neutral-900 relative">
          @if (selectedDocument()?.document_url) {
          <div
            class="w-full h-full overflow-auto flex justify-center p-4"
            [style.align-items]="'flex-start'"
          >
            <div
              [style.transform]="'scale(' + documentZoomLevel() + ')'"
              [style.transform-origin]="'top center'"
              class="transition-transform duration-200"
              style="width: 100%; min-height: 100%;"
            >
              <iframe
                [src]="getDocumentUrl() | safeUrl"
                class="w-full h-[800px] border-0 bg-white rounded-sm"
                title="Preview del documento"
              ></iframe>
            </div>
          </div>
          } @else {
          <div
            class="flex flex-col items-center justify-center h-full p-8 text-center"
          >
            <i class="pi pi-file text-6xl text-gray-400 mb-4"></i>
            <h4 class="text-xl font-semibold text-white mb-2">
              No hay documento adjunto
            </h4>
            <p class="text-gray-400 mb-6">
              Puedes adjuntar un documento PDF a esta solicitud
            </p>
            <p-button
              label="Adjuntar archivo"
              icon="pi pi-upload"
              severity="info"
              (onClick)="openCompleteDialog(selectedDocument()!)"
            />
          </div>
          }
        </div>
      </div>
    </div>
    }

    <!-- Overlay para cerrar el panel al hacer clic fuera -->
    @if (showDocumentPreview()) {
    <div
      class="fixed inset-0 bg-black/50 z-[1199]"
      (click)="showDocumentPreview.set(false)"
    ></div>
    }

    <!-- Diálogo de Confirmación de Rechazo -->
    <p-dialog
      [(visible)]="showRejectionDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      (onHide)="rejectionComment.set('')"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-exclamation-triangle text-red-400"></i>
          <span class="text-lg font-semibold text-white"
            >Confirmar Rechazo</span
          >
        </div>
      </ng-template>

      <div class="space-y-4 pt-4">
        <p class="text-gray-300">
          Por favor, indica el motivo del rechazo de esta solicitud de
          documento.
        </p>
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">
            Motivo de Rechazo <span class="text-red-400">*</span>
          </label>
          <textarea
            pTextarea
            [(ngModel)]="rejectionComment"
            rows="4"
            placeholder="Escribe el motivo del rechazo..."
            class="w-full"
            maxlength="500"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            {{ rejectionComment().length }}/500 caracteres
          </p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            [outlined]="true"
            (onClick)="showRejectionDialog.set(false)"
          />
          <p-button
            label="Confirmar Rechazo"
            severity="danger"
            icon="pi pi-times"
            [disabled]="!rejectionComment().trim()"
            (onClick)="confirmRejection()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class DocumentRequestsComponent {
  public service = inject(DocumentRequestsService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dashboardStore = inject(DashboardStore);
  private http = inject(HttpClient);
  private domSanitizer = inject(DomSanitizer);

  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  // Signals for dialogs
  public showDetailsDialog = signal(false);
  public showCompleteDialog = signal(false);
  public selectedDocument = signal<DocumentRequest | null>(null);

  // Signals for document preview
  public showDocumentPreview = signal(false);
  public documentZoomLevel = signal(1);

  // Upload signals
  public selectedFile = signal<File | null>(null);
  public isUploading = signal(false);

  // Rejection dialog signals
  public showRejectionDialog = signal(false);
  public rejectionComment = signal('');
  public documentToReject = signal<DocumentRequest | null>(null);

  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Completada', value: 'completed' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  // Excluded types - they have their own dedicated sections
  private readonly excludedTypes = ['timelog_correction', 'uniform_request'];

  // Base filtered documents (excluding special types)
  private baseDocuments = computed(() =>
    this.service
      .value()
      .filter((d) => !this.excludedTypes.includes(d.document_type))
  );

  public totalCount = computed(() => this.baseDocuments().length);
  public pendingCount = computed(
    () => this.baseDocuments().filter((d) => d.status === 'pending').length
  );
  public completedCount = computed(
    () => this.baseDocuments().filter((d) => d.status === 'completed').length
  );
  public rejectedCount = computed(
    () => this.baseDocuments().filter((d) => d.status === 'rejected').length
  );

  public filteredDocuments = computed(() => {
    let docs = this.baseDocuments();
    const search = this.searchText().toLowerCase();
    const status = this.selectedStatus();
    const range = this.dateRange();

    if (search) {
      docs = docs.filter(
        (d) =>
          d.employee?.first_name.toLowerCase().includes(search) ||
          d.employee?.father_name.toLowerCase().includes(search) ||
          this.getDocumentTypeLabel(d.document_type)
            .toLowerCase()
            .includes(search)
      );
    }
    if (status) {
      docs = docs.filter((d) => d.status === status);
    }
    if (range && range[0] && range[1]) {
      const start = range[0].getTime();
      const end = range[1].getTime();
      docs = docs.filter((d) => {
        const time = new Date(d.created_at).getTime();
        return time >= start && time <= end;
      });
    }
    return docs;
  });

  // Filter event handlers
  onSearchChange(value: string): void {
    this.searchText.set(value);
  }

  onStatusChange(value: string | null): void {
    this.selectedStatus.set(value);
  }

  onDateRangeChange(value: Date[] | null): void {
    this.dateRange.set(value);
  }

  onClearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.dateRange.set(null);
  }

  getDocumentTypeLabel(type: string): string {
    const types: Record<string, string> = {
      work_certificate: 'Constancia Laboral',
      work_letter: 'Carta de Trabajo',
      salary_certificate: 'Constancia Salarial',
      employment_certificate: 'Certificación Laboral',
      social_security: 'Ficha Seguro Social',
      timelog_correction: 'Omisión de Marcación',
      uniform_request: 'Solicitud de Uniforme',
      other: 'Otro',
    };
    return types[type] || type;
  }

  getTimelogTypeLabel(type: string): string {
    const types: Record<string, string> = {
      entry: 'Entrada',
      lunch_start: 'Inicio Almuerzo',
      lunch_end: 'Fin Almuerzo',
      exit: 'Salida',
    };
    return types[type] || type;
  }

  getDocumentStatusLabel(status: string): string {
    return getStatusLabel(status);
  }

  getDocumentStatusSeverity(status: string): TagSeverity {
    return getStatusSeverity(status);
  }

  viewDetails(document: DocumentRequest): void {
    this.selectedDocument.set(document);
    this.showDetailsDialog.set(true);
  }

  openCompleteDialog(document: DocumentRequest): void {
    this.selectedDocument.set(document);
    this.selectedFile.set(null);
    this.showCompleteDialog.set(true);
  }

  // Document management methods
  public openDocument(): void {
    if (this.selectedDocument()?.document_url) {
      this.showDocumentPreview.set(true);
    }
  }

  public closeDocumentPreview(): void {
    this.showDocumentPreview.set(false);
  }

  public zoomIn(): void {
    this.documentZoomLevel.update((v) => Math.min(v + 0.25, 2));
  }

  public zoomOut(): void {
    this.documentZoomLevel.update((v) => Math.max(v - 0.25, 0.5));
  }

  public resetZoom(): void {
    this.documentZoomLevel.set(1);
  }

  public getDocumentUrl(): string {
    return this.selectedDocument()?.document_url || '';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFileSelect(event: any) {
    if (event.files && event.files.length > 0) {
      this.selectedFile.set(event.files[0]);
    }
  }

  async completeDocument() {
    const doc = this.selectedDocument();
    const file = this.selectedFile();
    const currentEmployee = this.dashboardStore.currentEmployee();

    if (!doc || !file || !currentEmployee) return;

    this.isUploading.set(true);

    try {
      // 1. Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        '_'
      )}`;
      const filePath = `document-requests/${doc.id}/${fileName}`;
      const bucketName = 'employee-documents'; // Changed to 'documents' as per plan

      const formData = new FormData();
      formData.append('file', file);

      await firstValueFrom(
        this.http.post(
          `${getEnv(
            'ENV_SUPABASE_URL'
          )}/storage/v1/object/${bucketName}/${filePath}`,
          formData
        )
      );

      // 2. Construct Public URL
      const documentUrl = `${getEnv(
        'ENV_SUPABASE_URL'
      )}/storage/v1/object/public/${bucketName}/${filePath}`;

      // 3. Update Request Record
      await firstValueFrom(
        this.http.patch(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/document_requests?id=eq.${
            doc.id
          }`,
          {
            status: 'completed',
            processed_by: currentEmployee.id,
            processed_at: new Date().toISOString(),
            document_url: documentUrl,
          }
        )
      );

      // 4. Notify Employee
      await this.notifyEmployee(doc, 'completed');

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Solicitud completada y documento adjuntado',
      });

      this.showCompleteDialog.set(false);
      this.service.reload();
    } catch (error) {
      console.error('Error completing request:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Fallo al procesar la solicitud',
      });
    } finally {
      this.isUploading.set(false);
    }
  }

  private async notifyEmployee(document: DocumentRequest, status: 'completed') {
    const data = {
      employee_id: document.employee_id,
      type: 'document_completed',
      title: 'Solicitud de Documento Completada',
      message: `Tu solicitud de ${this.getDocumentTypeLabel(
        document.document_type
      )} ha sido completada. Puedes descargar el documento adjunto.`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    try {
      await firstValueFrom(
        this.http.post(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/hr_messages`,
          data
        )
      );
    } catch (e) {
      console.error('Error sending notification', e);
    }
  }

  /**
   * Updates document request status directly from the dialog buttons
   */
  updateDocumentStatusFromDialog(status: 'pending' | 'completed') {
    const document = this.selectedDocument();
    if (!document) return;

    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) return;

    const updateData: Record<string, unknown> = { status };

    // Only set processed fields for completed status
    if (status === 'completed') {
      updateData['processed_by'] = currentEmployee.id;
      updateData['processed_at'] = new Date().toISOString();
    } else {
      // Reset processed fields when reverting to pending
      updateData['processed_by'] = null;
      updateData['processed_at'] = null;
    }

    this.http
      .patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/document_requests?id=eq.${
          document.id
        }`,
        updateData
      )
      .subscribe({
        next: async () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Solicitud ${
              status === 'pending' ? 'marcada como pendiente' : 'completada'
            }`,
          });
          this.service.reload();
          // Update local signal
          this.selectedDocument.update((d) => (d ? { ...d, status } : null));
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Fallo al actualizar',
          }),
      });
  }

  /**
   * Opens the rejection dialog
   */
  openRejectionDialog(document: DocumentRequest): void {
    this.documentToReject.set(document);
    this.rejectionComment.set('');
    this.showRejectionDialog.set(true);
  }

  /**
   * Confirms rejection with the comment
   */
  async confirmRejection(): Promise<void> {
    const comment = this.rejectionComment().trim();
    const document = this.documentToReject();
    if (!comment || !document) return;

    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) return;

    this.showRejectionDialog.set(false);

    try {
      await firstValueFrom(
        this.http.patch(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/document_requests?id=eq.${
            document.id
          }`,
          {
            status: 'rejected',
            processed_by: currentEmployee.id,
            processed_at: new Date().toISOString(),
            rejection_comment: comment,
          }
        )
      );

      this.messageService.add({
        severity: 'warn',
        summary: 'Rechazada',
        detail: 'La solicitud ha sido rechazada',
      });

      this.service.reload();

      // Update local signal if viewing details
      if (this.selectedDocument()?.id === document.id) {
        this.selectedDocument.update((d) =>
          d ? { ...d, status: 'rejected', rejection_comment: comment } : null
        );
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo rechazar la solicitud',
      });
    }
  }
}
