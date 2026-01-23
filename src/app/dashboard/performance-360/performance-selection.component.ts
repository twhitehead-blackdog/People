import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { AuditForm } from '../../models';
import { OrganizationService } from '../../services/organization.service';
import { Performance360Service } from '../../services/performance-360.service';
import { BranchesStore } from '../../stores/branches.store';
import { DashboardStore } from '../../stores/dashboard.store';

@Component({
  selector: 'pt-performance-selection',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    Button,
    DropdownModule,
    FormsModule,
    ProgressSpinnerModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <div class="p-4 max-w-4xl mx-auto space-y-6">
      <p-toast></p-toast>
      <div class="flex items-center gap-4 mb-6">
        <p-button
          icon="pi pi-arrow-left"
          [rounded]="true"
          [text]="true"
          (onClick)="goBack()"
        ></p-button>
        <h1 class="text-2xl font-bold text-white m-0">Nueva Auditoría</h1>
      </div>

      @if (performanceService.activeFormsResource.isLoading()) {
      <div class="flex justify-center p-8">
        <p-progressSpinner strokeWidth="4"></p-progressSpinner>
      </div>
      } @else {
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Branch Selection -->
        <p-card
          header="1. Seleccionar Sucursal"
          styleClass="h-full bg-surface-900 border-surface-700"
        >
          <div class="p-fluid">
            <p-dropdown
              [options]="branchesStore.entities()"
              [(ngModel)]="selectedBranchId"
              optionLabel="name"
              optionValue="id"
              placeholder="Seleccione Sucursal"
              styleClass="w-full"
            ></p-dropdown>
          </div>
        </p-card>

        <!-- Unit Selection (Unidades dinámicas desde formularios activos) -->
        <p-card
          header="2. Seleccionar Tipo de Evaluación"
          styleClass="h-full bg-surface-900 border-surface-700"
        >
          <div class="grid grid-cols-1 gap-4">
            @for (form of availableForms(); track form.id) {
            <div
              (click)="selectForm(form)"
              [class.ring-2]="selectedForm()?.id === form.id"
              [class.ring-primary-500]="selectedForm()?.id === form.id"
              class="p-4 rounded-lg bg-surface-800 border border-surface-600 cursor-pointer hover:bg-surface-700 transition-all flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <i
                  [class]="getFormIcon(form.business_unit)"
                  class="text-2xl text-primary-400"
                ></i>
                <div>
                  <h3 class="font-bold text-white">{{ form.title }}</h3>
                  <p class="text-sm text-gray-400">
                    {{ form.business_unit }} • v{{ form.version }}
                  </p>
                </div>
              </div>
              @if (selectedForm()?.id === form.id) {
              <i class="pi pi-check-circle text-primary-500 text-xl"></i>
              }
            </div>
            } @empty {
            <p class="text-gray-500 text-center py-4">
              No hay formularios activos disponibles.
            </p>
            }
          </div>
        </p-card>
      </div>

      <div class="flex justify-end pt-4">
        <p-button
          label="Iniciar Auditoría"
          icon="pi pi-play"
          [disabled]="!canStart()"
          [loading]="isCreating()"
          (onClick)="startAudit()"
          styleClass="bg-primary-500 border-primary-500 hover:bg-primary-600 px-8 py-3"
        ></p-button>
      </div>
      }
    </div>
  `,
})
export class PerformanceSelectionComponent {
  private router = inject(Router);
  public branchesStore = inject(BranchesStore);
  public performanceService = inject(Performance360Service);
  private dashboardStore = inject(DashboardStore);
  private messageService = inject(MessageService);
  private organizationService = inject(OrganizationService);

  // Usar variables regulares para ngModel (no signals)
  selectedBranchId: string | null = null;
  selectedForm = signal<AuditForm | null>(null);
  isCreating = signal(false);

  constructor() {
    console.log('========================================');
    console.log('[PerformanceSelection] *** COMPONENT CONSTRUCTOR CALLED ***');
    console.log('[PerformanceSelection] Component is being initialized');
    console.log(
      '[PerformanceSelection] Current employee:',
      this.dashboardStore.currentEmployee()
    );
    console.log(
      '[PerformanceSelection] Current employee ID:',
      this.dashboardStore.currentEmployee()?.id
    );
    console.log(
      '[PerformanceSelection] Current employee position:',
      this.dashboardStore.currentEmployee()?.position
    );
    console.log(
      '[PerformanceSelection] Company ID:',
      this.organizationService.getCurrentCompanyId()
    );
    console.log(
      '[PerformanceSelection] Active forms loading:',
      this.performanceService.activeFormsResource.isLoading()
    );
    console.log(
      '[PerformanceSelection] Active forms value:',
      this.performanceService.activeFormsResource.value()
    );
    console.log(
      '[PerformanceSelection] Branches:',
      this.branchesStore.entities()
    );
    console.log('========================================');
  }

  // Formularios activos disponibles
  availableForms = computed(() => {
    return this.performanceService.activeFormsResource.value() || [];
  });

  goBack() {
    this.router.navigate(['/admin/performance']);
  }

  selectForm(form: AuditForm) {
    this.selectedForm.set(form);
  }

  canStart() {
    return this.selectedBranchId && this.selectedForm();
  }

  getFormIcon(businessUnit: string): string {
    switch (businessUnit?.toLowerCase()) {
      case 'petshop':
        return 'pi pi-shopping-bag';
      case 'grooming':
        return 'pi pi-heart';
      case 'clinica':
        return 'pi pi-box';
      default:
        return 'pi pi-file';
    }
  }

  async startAudit() {
    const form = this.selectedForm();
    const branchId = this.selectedBranchId;
    const auditorId = this.dashboardStore.currentEmployee()?.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!form || !branchId || !auditorId || !companyId) return;

    this.isCreating.set(true);

    try {
      // Crear la evaluación en el backend
      const evaluation = await this.performanceService.createEvaluation(
        branchId,
        form.id,
        form.version,
        auditorId,
        companyId
      );

      // Navegar al formulario de evaluación con el ID real
      this.router.navigate(['/admin/performance/evaluate', evaluation.id], {
        queryParams: { formId: form.id },
      });
    } catch (error) {
      console.error('Error creando evaluación:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo iniciar la auditoría. Intente nuevamente.',
      });
    } finally {
      this.isCreating.set(false);
    }
  }
}
