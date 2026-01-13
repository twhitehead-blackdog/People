import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SelectModule } from 'primeng/select';
import { catchError, EMPTY } from 'rxjs';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';

@Component({
  selector: 'pt-add-employee-to-branch-dialog',
  imports: [SelectModule, Button, FormsModule],
  template: `
    <div class="flex flex-col gap-4">
      <div class="input-container">
        <label for="employee">Buscar empleado</label>
        <p-select
          inputId="employee"
          [(ngModel)]="selectedEmployee"
          [options]="availableEmployees()"
          optionValue="id"
          placeholder="Selecciona un empleado"
          filter
          filterBy="first_name,father_name"
          appendTo="body"
          [showClear]="true"
        >
          <ng-template pTemplate="selectedItem" let-selected>
            {{ selected?.father_name }}, {{ selected?.first_name }}
            @if(selected?.branch) {
            <span class="text-xs text-gray-400 ml-2">
              ({{ selected.branch.name }})
            </span>
            }
          </ng-template>
          <ng-template let-item pTemplate="item">
            <div class="flex items-center justify-between">
              <span>{{ item.father_name }}, {{ item.first_name }}</span>
              @if(item.branch) {
              <span class="text-xs text-gray-400 ml-2">
                {{ item.branch.name }}
              </span>
              }
            </div>
          </ng-template>
        </p-select>
      </div>

      @if(selectedEmployeeData()) {
      <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
        <p class="text-sm text-gray-300 mb-2">
          <strong>Empleado seleccionado:</strong>
          {{ selectedEmployeeData()?.father_name }},
          {{ selectedEmployeeData()?.first_name }}
        </p>
        <p class="text-sm text-gray-300 mb-2">
          <strong>Sucursal actual:</strong>
          {{ selectedEmployeeData()?.branch?.name || 'Sin asignar' }}
        </p>
        <p class="text-sm text-amber-400 font-semibold">
          <strong>Pasará a sucursal:</strong> {{ targetBranchName() }}
        </p>
      </div>
      } @if(canSelectBranch) {
      <div class="input-container">
        <label for="branch">Seleccionar sucursal</label>
        <p-select
          inputId="branch"
          [(ngModel)]="selectedBranch"
          [options]="store.branches.entities()"
          optionValue="id"
          optionLabel="name"
          placeholder="Selecciona una sucursal"
          appendTo="body"
          filter
          [showClear]="true"
        />
        @if(initialBranchId && !selectedBranch()) {
        <p class="text-xs text-gray-400 mt-1">
          Por defecto: {{ initialBranchName }}
        </p>
        }
      </div>
      }

      <div class="flex justify-end gap-2 mt-4">
        <p-button
          label="Cancelar"
          severity="secondary"
          outlined
          rounded
          (onClick)="dialogRef.close()"
        />
        <p-button
          label="Confirmar"
          rounded
          [disabled]="!selectedEmployee() || !targetBranchId()"
          [loading]="loading()"
          (onClick)="confirmAdd()"
        />
      </div>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEmployeeToBranchDialogComponent {
  public selectedEmployee = signal<string | null>(null);
  public loading = signal(false);
  private http = inject(HttpClient);
  private message = inject(MessageService);
  private organizationService = inject(OrganizationService);
  public dialogRef = inject(DynamicDialogRef);
  private dialog = inject(DynamicDialogConfig);
  public employeesStore = inject(EmployeesStore);
  public store = inject(DashboardStore);
  private destroyRef = inject(DestroyRef);
  private apiUrl = inject(ApiUrlService);

  public canSelectBranch = this.dialog.data?.canSelectBranch || false;
  public initialBranchId = this.dialog.data?.branchId || null;
  public initialBranchName = this.dialog.data?.branchName || '';
  public selectedBranch = signal<string | null>(this.initialBranchId);

  public isHRDepartment = computed(() => {
    const currentEmp = this.store.currentEmployee();
    const deptName = currentEmp?.department?.name?.toLowerCase() || '';
    return (
      deptName.includes('recursos humanos') ||
      deptName.includes('rrhh') ||
      deptName.includes('hr')
    );
  });

  public targetBranchId = computed(() => {
    if (!this.canSelectBranch) {
      return this.initialBranchId;
    }
    return this.selectedBranch() || this.initialBranchId;
  });

  public targetBranchName = computed(() => {
    if (!this.canSelectBranch) {
      return this.initialBranchName;
    }
    const branchId = this.selectedBranch();
    if (branchId) {
      const branch = this.store.branches
        .entities()
        .find((b) => b.id === branchId);
      return branch?.name || this.initialBranchName;
    }
    return this.initialBranchName;
  });

  public availableEmployees = computed(() => {
    const targetBranch = this.targetBranchId();
    return this.employeesStore
      .employeesList()
      .filter(
        (emp) =>
          emp.is_active && (!targetBranch || emp.branch_id !== targetBranch)
      );
  });

  public selectedEmployeeData = computed(() => {
    const empId = this.selectedEmployee();
    if (!empId) return null;
    return this.employeesStore.employeesList().find((e) => e.id === empId);
  });

  confirmAdd() {
    const employeeId = this.selectedEmployee();
    const branchId = this.targetBranchId();
    if (!employeeId || !branchId) {
      return;
    }

    this.loading.set(true);

    const companyId = this.organizationService.getCurrentCompanyId();
    const params: { id: string; company_id?: string } = {
      id: `eq.${employeeId}`,
    };

    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    this.http
      .patch(
        this.apiUrl.build('rest/v1/employees'),
        { branch_id: branchId },
        { params }
      )
      .pipe(
        catchError((error) => {
          console.error(error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cambiar la sucursal del empleado',
          });
          this.loading.set(false);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.message.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Empleado añadido a la sucursal correctamente',
          });
          this.employeesStore.reloadItems();
          this.dialogRef.close(true);
        },
      });
  }
}
