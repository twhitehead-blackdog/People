import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Survey,
  SurveyStatus,
  SURVEY_STATUS_OPTIONS,
  SURVEY_CATEGORY_OPTIONS,
} from '../../models';
import { SurveyService } from '../../services/survey.service';
import { OrganizationService } from '../../services/organization.service';
import { ApiUrlService } from '../../services/api-url.service';

interface SimpleEmployee {
  id: string;
  first_name: string;
  father_name: string;
}

@Component({
  selector: 'pt-survey-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    SelectModule,
    InputTextModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    DialogModule,
    CheckboxModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="p-4">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white m-0">Encuestas HR</h2>
          <p class="text-neutral-400 mt-1 mb-0">Crea, administra y analiza encuestas para tu equipo</p>
        </div>
        <p-button
          label="Nueva Encuesta"
          icon="pi pi-plus"
          (onClick)="router.navigate(['/admin/surveys/new'])"
          severity="warn"
        />
      </div>

      <!-- Filters -->
      <div class="flex flex-col md:flex-row gap-3 mb-4">
        <div class="flex-1">
          <span class="p-input-icon-left w-full">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              placeholder="Buscar por título..."
              class="w-full"
            />
          </span>
        </div>
        <p-select
          [options]="statusOptions"
          [ngModel]="selectedStatus()"
          (ngModelChange)="onStatusFilterChange($event)"
          optionLabel="label"
          optionValue="value"
          placeholder="Todos los estados"
          [showClear]="true"
          styleClass="w-full md:w-48"
        />
        <p-select
          [options]="categoryOptions"
          [ngModel]="selectedCategory()"
          (ngModelChange)="selectedCategory.set($event)"
          optionLabel="label"
          optionValue="value"
          placeholder="Todas las categorías"
          [showClear]="true"
          styleClass="w-full md:w-48"
        />
      </div>

      <!-- Table -->
      @if (surveysResource.isLoading()) {
        <div class="flex justify-center py-12">
          <i class="pi pi-spin pi-spinner text-4xl text-amber-400"></i>
        </div>
      } @else {
        <p-table
          [value]="filteredSurveys()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          [stripedRows]="true"
          styleClass="p-datatable-sm"
          [tableStyle]="{ 'min-width': '60rem' }"
        >
          <ng-template #header>
            <tr>
              <th pSortableColumn="title">Título <p-sortIcon field="title" /></th>
              <th>Categoría</th>
              <th pSortableColumn="status">Estado <p-sortIcon field="status" /></th>
              <th>Respuestas</th>
              <th pSortableColumn="created_at">Creada <p-sortIcon field="created_at" /></th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template #body let-survey>
            <tr>
              <td>
                <div class="font-medium text-white">{{ survey.title }}</div>
                @if (survey.description) {
                  <div class="text-xs text-neutral-400 mt-1 truncate max-w-xs">{{ survey.description }}</div>
                }
              </td>
              <td>
                @if (survey.category) {
                  <span class="text-sm text-neutral-300">{{ getCategoryLabel(survey.category) }}</span>
                } @else {
                  <span class="text-neutral-500">—</span>
                }
              </td>
              <td>
                <p-tag
                  [value]="getStatusLabel(survey.status)"
                  [severity]="getStatusSeverity(survey.status)"
                  [icon]="getStatusIcon(survey.status)"
                />
              </td>
              <td>
                <span class="text-sm">
                  {{ survey.completed_count ?? 0 }} / {{ survey.assignments_count ?? 0 }}
                </span>
              </td>
              <td>
                <span class="text-sm text-neutral-400">{{ formatDate(survey.created_at) }}</span>
              </td>
              <td>
                <div class="flex gap-1">
                  @if (survey.status === 'draft') {
                    <p-button
                      icon="pi pi-pencil"
                      [rounded]="true"
                      [text]="true"
                      severity="info"
                      pTooltip="Editar"
                      (onClick)="router.navigate(['/admin/surveys/edit', survey.id])"
                    />
                    <p-button
                      icon="pi pi-play"
                      [rounded]="true"
                      [text]="true"
                      severity="success"
                      pTooltip="Activar"
                      (onClick)="onActivate(survey)"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="true"
                      [text]="true"
                      severity="danger"
                      pTooltip="Eliminar"
                      (onClick)="onDelete(survey)"
                    />
                  }
                  @if (survey.status === 'active') {
                    <p-button
                      icon="pi pi-chart-bar"
                      [rounded]="true"
                      [text]="true"
                      severity="warn"
                      pTooltip="Ver resultados"
                      (onClick)="router.navigate(['/admin/surveys/results', survey.id])"
                    />
                    <p-button
                      icon="pi pi-user-plus"
                      [rounded]="true"
                      [text]="true"
                      severity="info"
                      pTooltip="Asignar empleados"
                      (onClick)="onAssign(survey)"
                    />
                    <p-button
                      icon="pi pi-lock"
                      [rounded]="true"
                      [text]="true"
                      severity="warn"
                      pTooltip="Cerrar"
                      (onClick)="onClose(survey)"
                    />
                  }
                  @if (survey.status === 'closed') {
                    <p-button
                      icon="pi pi-chart-bar"
                      [rounded]="true"
                      [text]="true"
                      severity="warn"
                      pTooltip="Ver resultados"
                      (onClick)="router.navigate(['/admin/surveys/results', survey.id])"
                    />
                    <p-button
                      icon="pi pi-inbox"
                      [rounded]="true"
                      [text]="true"
                      severity="secondary"
                      pTooltip="Archivar"
                      (onClick)="onArchive(survey)"
                    />
                  }
                  @if (survey.status === 'archived') {
                    <p-button
                      icon="pi pi-chart-bar"
                      [rounded]="true"
                      [text]="true"
                      severity="warn"
                      pTooltip="Ver resultados"
                      (onClick)="router.navigate(['/admin/surveys/results', survey.id])"
                    />
                  }
                  <p-button
                    icon="pi pi-copy"
                    [rounded]="true"
                    [text]="true"
                    severity="secondary"
                    pTooltip="Duplicar"
                    (onClick)="onDuplicate(survey)"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="6" class="text-center py-8 text-neutral-400">
                <i class="pi pi-inbox text-4xl mb-3 block"></i>
                No se encontraron encuestas
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>

    <!-- Employee Assignment Dialog -->
    <p-dialog
      [(visible)]="showAssignDialog"
      header="Asignar Empleados"
      [modal]="true"
      [style]="{ width: '500px' }"
    >
      @if (assignSurvey(); as s) {
        <p class="text-sm text-neutral-400 mb-3">Encuesta: <strong class="text-white">{{ s.title }}</strong></p>
      }
      <div class="mb-3">
        <input
          pInputText
          [ngModel]="empSearch()"
          (ngModelChange)="empSearch.set($event)"
          placeholder="Buscar empleado..."
          class="w-full"
        />
      </div>
      <div class="max-h-80 overflow-y-auto space-y-1">
        @for (emp of filteredEmployees(); track emp.id) {
          <label class="flex items-center gap-2 p-2 rounded hover:bg-neutral-700/50 cursor-pointer"
            [class.opacity-50]="isAlreadyAssigned(emp.id)"
          >
            <p-checkbox
              [ngModel]="isEmployeeSelected(emp.id)"
              (ngModelChange)="toggleEmployee(emp)"
              [binary]="true"
              [disabled]="isAlreadyAssigned(emp.id)"
            />
            <span class="text-sm text-white">{{ emp.first_name }} {{ emp.father_name }}</span>
            @if (isAlreadyAssigned(emp.id)) {
              <span class="text-xs text-neutral-500 ml-auto">Ya asignado</span>
            }
          </label>
        }
      </div>
      <ng-template #footer>
        <p-button label="Cancelar" severity="secondary" (onClick)="showAssignDialog = false" />
        <p-button
          label="Asignar"
          icon="pi pi-user-plus"
          severity="warn"
          [outlined]="true"
          (onClick)="assignSelectedEmployees(false)"
          [loading]="assigning()"
          [disabled]="selectedEmployeeIds().size === 0"
        />
        <p-button
          label="Asignar y Notificar"
          icon="pi pi-send"
          severity="warn"
          (onClick)="assignSelectedEmployees(true)"
          [loading]="assigning()"
          [disabled]="selectedEmployeeIds().size === 0"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class SurveyListComponent {
  router = inject(Router);
  private surveyService = inject(SurveyService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private orgService = inject(OrganizationService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  surveysResource = this.surveyService.surveysResource;

  searchTerm = signal('');
  selectedStatus = signal<SurveyStatus | ''>('');
  selectedCategory = signal<string | null>(null);

  // Employee assignment dialog
  showAssignDialog = false;
  assignSurvey = signal<Survey | null>(null);
  assigning = signal(false);
  allEmployees = signal<SimpleEmployee[]>([]);
  existingAssignedIds = signal<Set<string>>(new Set());
  empSearch = signal('');
  selectedEmployeeIds = signal<Set<string>>(new Set());
  employeesLoaded = signal(false);

  filteredEmployees = computed(() => {
    const employees = this.allEmployees();
    const search = this.empSearch().toLowerCase();
    if (!search) return employees;
    return employees.filter(e =>
      `${e.first_name} ${e.father_name}`.toLowerCase().includes(search)
    );
  });

  statusOptions = SURVEY_STATUS_OPTIONS;
  categoryOptions = SURVEY_CATEGORY_OPTIONS;

  filteredSurveys = computed(() => {
    let surveys = this.surveysResource.value() ?? [];
    const search = this.searchTerm().toLowerCase();
    const category = this.selectedCategory();

    if (search) {
      surveys = surveys.filter(s =>
        s.title.toLowerCase().includes(search) ||
        (s.description?.toLowerCase().includes(search))
      );
    }
    if (category) {
      surveys = surveys.filter(s => s.category === category);
    }
    return surveys;
  });

  onStatusFilterChange(status: SurveyStatus | '' | null): void {
    const val = status ?? '';
    this.selectedStatus.set(val);
    this.surveyService.statusFilter.set(val);
  }

  getStatusLabel(status: string): string {
    return SURVEY_STATUS_OPTIONS.find(o => o.value === status)?.label ?? status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      draft: 'secondary',
      active: 'success',
      closed: 'warn',
      archived: 'info',
    };
    return map[status] ?? 'secondary';
  }

  getStatusIcon(status: string): string {
    return SURVEY_STATUS_OPTIONS.find(o => o.value === status)?.icon ?? '';
  }

  getCategoryLabel(category: string): string {
    return SURVEY_CATEGORY_OPTIONS.find(o => o.value === category)?.label ?? category;
  }

  formatDate(date?: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-PA', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  onActivate(survey: Survey): void {
    this.confirmationService.confirm({
      message: `¿Activar la encuesta "${survey.title}"? Los empleados asignados podrán verla.`,
      header: 'Activar Encuesta',
      icon: 'pi pi-play',
      acceptLabel: 'Activar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          await this.surveyService.activateSurvey(survey.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Encuesta activada',
            detail: 'La encuesta está disponible para los empleados.',
          });
        } catch {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo activar la encuesta.' });
        }
      },
    });
  }

  onClose(survey: Survey): void {
    this.confirmationService.confirm({
      message: `¿Cerrar la encuesta "${survey.title}"? No se aceptarán más respuestas.`,
      header: 'Cerrar Encuesta',
      icon: 'pi pi-lock',
      acceptLabel: 'Cerrar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          await this.surveyService.closeSurvey(survey.id);
          this.messageService.add({ severity: 'success', summary: 'Encuesta cerrada', detail: 'No se aceptarán más respuestas.' });
        } catch {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cerrar la encuesta.' });
        }
      },
    });
  }

  onArchive(survey: Survey): void {
    this.confirmationService.confirm({
      message: `¿Archivar la encuesta "${survey.title}"?`,
      header: 'Archivar Encuesta',
      icon: 'pi pi-inbox',
      acceptLabel: 'Archivar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          await this.surveyService.updateSurvey(survey.id, { status: 'archived' });
          this.messageService.add({ severity: 'success', summary: 'Encuesta archivada' });
        } catch {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo archivar.' });
        }
      },
    });
  }

  onDelete(survey: Survey): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la encuesta "${survey.title}"? Esta acción no se puede deshacer.`,
      header: 'Eliminar Encuesta',
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.surveyService.deleteSurvey(survey.id);
          this.messageService.add({ severity: 'success', summary: 'Encuesta eliminada' });
        } catch {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar.' });
        }
      },
    });
  }

  onDuplicate(survey: Survey): void {
    this.confirmationService.confirm({
      message: `¿Duplicar la encuesta "${survey.title}"? Se creará una copia como borrador con todas las preguntas.`,
      header: 'Duplicar Encuesta',
      icon: 'pi pi-copy',
      acceptLabel: 'Duplicar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          const companyId = this.orgService.getCurrentCompanyId();
          if (!companyId) return;
          const newSurvey = await this.surveyService.duplicateSurvey(survey.id, companyId);
          this.messageService.add({
            severity: 'success',
            summary: 'Encuesta duplicada',
            detail: `Se creó "${newSurvey.title}" como borrador.`,
          });
          this.router.navigate(['/admin/surveys/edit', newSurvey.id]);
        } catch {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo duplicar la encuesta.' });
        }
      },
    });
  }

  async onAssign(survey: Survey): Promise<void> {
    this.assignSurvey.set(survey);
    this.empSearch.set('');
    this.selectedEmployeeIds.set(new Set());
    this.showAssignDialog = true;

    // Load existing assignments to disable already-assigned employees
    try {
      const assignments = await this.surveyService.getAssignments(survey.id);
      this.existingAssignedIds.set(new Set(assignments.map(a => a.employee_id)));
    } catch {
      this.existingAssignedIds.set(new Set());
    }

    await this.loadEmployees();
  }

  private async loadEmployees(): Promise<void> {
    if (this.employeesLoaded()) return;
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;
    try {
      const url = this.apiUrl.build('rest/v1/employees', {
        company_id: `eq.${companyId}`,
        is_active: 'eq.true',
        select: 'id,first_name,father_name',
        order: 'first_name.asc',
      });
      const employees = await firstValueFrom(this.http.get<SimpleEmployee[]>(url));
      this.allEmployees.set(employees ?? []);
      this.employeesLoaded.set(true);
    } catch (e) {
      console.error('Error loading employees:', e);
    }
  }

  isEmployeeSelected(empId: string): boolean {
    return this.selectedEmployeeIds().has(empId);
  }

  isAlreadyAssigned(empId: string): boolean {
    return this.existingAssignedIds().has(empId);
  }

  toggleEmployee(emp: SimpleEmployee): void {
    this.selectedEmployeeIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(emp.id)) {
        newSet.delete(emp.id);
      } else {
        newSet.add(emp.id);
      }
      return newSet;
    });
  }

  async assignSelectedEmployees(notify: boolean): Promise<void> {
    const survey = this.assignSurvey();
    const companyId = this.orgService.getCurrentCompanyId();
    if (!survey || !companyId) return;

    const ids = Array.from(this.selectedEmployeeIds());
    if (ids.length === 0) return;

    this.assigning.set(true);
    try {
      await this.surveyService.assignEmployees(survey.id, ids, companyId);
      if (notify) {
        await this.surveyService.notifyEmployeesOfSurvey(survey.id, survey.title, ids, companyId);
      }
      this.messageService.add({
        severity: 'success',
        summary: `${ids.length} empleado(s) asignado(s)`,
        detail: notify ? 'Se enviaron notificaciones.' : undefined,
      });
      this.showAssignDialog = false;
      this.surveyService.refresh();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo asignar empleados.' });
    } finally {
      this.assigning.set(false);
    }
  }
}
