import { Injectable, inject, computed, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DashboardStore } from '../../stores/dashboard.store';
import { EmployeePortalApiService } from './employee-portal-api.service';
import { OrganizationService } from '../../services/organization.service';

// NOTA: No usar providedIn:'root' porque depende de DashboardStore (scope del layout del portal).
// Se provee explícitamente en EmployeePortalComponent para compartir el injector correcto.
@Injectable()
export class EmployeePortalProfileService {
  private messageService = inject(MessageService);
  private store = inject(DashboardStore);
  private employeePortalApi = inject(EmployeePortalApiService);
  private organizationService = inject(OrganizationService);

  public currentEmployee = computed(() => this.store.currentEmployee());

  // Edit mode for personal data
  public editMode = signal(false);
  public editEmail = signal('');
  public editWorkEmail = signal('');
  public editPhone = signal('');
  public editAddress = signal('');
  public savingPersonalData = signal(false);

  public toggleEditMode(): void {
    if (!this.editMode()) {
      // Entrar en modo edición - cargar valores actuales
      const emp = this.currentEmployee();
      this.editEmail.set(emp?.email || '');
      this.editWorkEmail.set(emp?.work_email || '');
      this.editPhone.set(emp?.phone_number || '');
      this.editAddress.set(emp?.address || '');
    }
    this.editMode.update((v) => !v);
  }

  public cancelEdit(): void {
    this.editMode.set(false);
    this.editEmail.set('');
    this.editWorkEmail.set('');
    this.editPhone.set('');
    this.editAddress.set('');
  }

  public async savePersonalData(): Promise<void> {
    if (!this.currentEmployee()?.id) return;

    this.savingPersonalData.set(true);
    try {
      const updateData: any = {};
      if (this.editEmail()) updateData.email = this.editEmail();
      if (this.editWorkEmail()) updateData.work_email = this.editWorkEmail();
      if (this.editPhone()) updateData.phone_number = this.editPhone();
      if (this.editAddress()) updateData.address = this.editAddress();

      const companyId = this.organizationService.getCurrentCompanyId();
      await this.employeePortalApi.updateEmployeeProfile(
        this.currentEmployee()!.id,
        updateData,
        companyId || undefined
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Datos actualizados',
        detail: 'Tus datos personales han sido actualizados correctamente',
      });

      // Recargar datos del empleado
      this.store.employees.fetchItems();
      this.editMode.set(false);
    } catch (error: any) {
      console.error('Error updating personal data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron actualizar los datos',
      });
    } finally {
      this.savingPersonalData.set(false);
    }
  }
}
