import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { JobApplication } from '../models';
import { DashboardStore } from '../stores/dashboard.store';
import { JobApplicationsStore } from '../stores/job-applications.store';

@Component({
  selector: 'pt-job-application-detail',
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    Card,
    Tag,
    Button,
    InputText,
    Textarea,
    Select,
    DatePicker,
    ToastModule,
  ],
  providers: [MessageService],
  // JobApplicationsStore ahora está en app.config.ts
  template: `
    <p-toast />
    <div class="space-y-4">
      <!-- Información Personal -->
      <p-card>
        <ng-template #title>
          <div class="flex items-center justify-between">
            <h3 class="m-0">Información Personal</h3>
            <p-tag
              [value]="getStatusLabel(application()?.status || 'pending')"
              [severity]="getStatusSeverity(application()?.status || 'pending')"
            />
          </div>
        </ng-template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
            <p class="text-white">{{ application()?.first_name }} {{ application()?.last_name }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <p class="text-white">{{ application()?.email }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
            <p class="text-white">{{ application()?.phone_number }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Vacante</label>
            <p class="text-white">
              {{ application()?.position_name || application()?.position?.name || 'N/A' }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Fecha de Aplicación</label>
            <p class="text-white">{{ application()?.created_at | date : 'full' }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Estado Actual</label>
            <p-tag
              [value]="getStatusLabel(application()?.status || 'pending')"
              [severity]="getStatusSeverity(application()?.status || 'pending')"
            />
          </div>
        </div>
      </p-card>

      <!-- Información Adicional -->
      @if (application()?.additional_info) {
      <p-card>
        <ng-template #title>
          <h3 class="m-0">Información Adicional</h3>
        </ng-template>
        <p class="text-white whitespace-pre-wrap">{{ application()?.additional_info }}</p>
      </p-card>
      }

      <!-- CV -->
      @if (application()?.resume_url) {
      <p-card>
        <ng-template #title>
          <h3 class="m-0">Hoja de Vida</h3>
        </ng-template>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-300 mb-2">
              <i class="pi pi-file mr-2"></i>
              {{ application()?.resume_filename || 'CV.pdf' }}
            </p>
          </div>
          <p-button
            label="Descargar CV"
            icon="pi pi-download"
            (onClick)="downloadResume()"
            severity="info"
          />
        </div>
      </p-card>
      }

      <!-- Gestión -->
      <p-card>
        <ng-template #title>
          <h3 class="m-0">Gestión de Aplicación</h3>
        </ng-template>
        <form [formGroup]="managementForm" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="status" class="block text-sm font-medium text-gray-300 mb-2">
                Estado
              </label>
              <p-select
                id="status"
                formControlName="status"
                [options]="statusOptions"
                optionLabel="label"
                optionValue="value"
                appendTo="body"
              />
            </div>
            <div>
              <label for="interview_date" class="block text-sm font-medium text-gray-300 mb-2">
                Fecha de Entrevista
              </label>
              <p-datepicker
                id="interview_date"
                formControlName="interview_date"
                iconDisplay="input"
                [showIcon]="true"
                appendTo="body"
                placeholder="Seleccionar fecha"
              />
            </div>
          </div>
          <div>
            <label for="notes" class="block text-sm font-medium text-gray-300 mb-2">
              Notas Internas
            </label>
            <textarea
              pTextarea
              id="notes"
              formControlName="notes"
              rows="4"
              placeholder="Agregar notas sobre esta aplicación..."
              class="w-full"
            ></textarea>
          </div>
          <div class="flex gap-2 justify-end">
            <p-button
              label="Cancelar"
              severity="secondary"
              (onClick)="close()"
            />
            <p-button
              label="Guardar Cambios"
              (onClick)="saveChanges()"
              [loading]="isSaving()"
            />
          </div>
        </form>
      </p-card>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobApplicationDetailComponent implements OnInit {
  private config = inject(DynamicDialogConfig);
  private ref = inject(DynamicDialogRef);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private jobApplicationsStore = inject(JobApplicationsStore);

  public application = signal<JobApplication | null>(null);
  public isSaving = signal(false);

  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Revisada', value: 'reviewed' },
    { label: 'Contactada', value: 'contacted' },
    { label: 'Rechazada', value: 'rejected' },
    { label: 'Contratada', value: 'hired' },
  ];

  public managementForm = new FormGroup({
    status: new FormControl<JobApplication['status']>('pending', [Validators.required]),
    interview_date: new FormControl<Date | null>(null),
    notes: new FormControl<string>(''),
  });

  ngOnInit() {
    const app = this.config.data?.application as JobApplication;
    if (app) {
      this.application.set(app);
      this.managementForm.patchValue({
        status: app.status,
        interview_date: app.interview_date ? new Date(app.interview_date) : null,
        notes: app.notes || '',
      });
    }
  }

  async saveChanges() {
    if (this.managementForm.invalid || !this.application()) {
      return;
    }

    this.isSaving.set(true);

    try {
      const formValue = this.managementForm.value;
      const updateData: any = {
        status: formValue.status,
        notes: formValue.notes || null,
      };

      if (formValue.interview_date) {
        updateData.interview_date = formValue.interview_date.toISOString();
      }

      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_applications?id=eq.${this.application()!.id}`,
          updateData
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: 'Los cambios se han guardado correctamente',
      });

      // Recargar aplicaciones
      this.jobApplicationsStore.reloadItems();

      // Cerrar diálogo
      this.close();
    } catch (error: any) {
      console.error('Error saving changes:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron guardar los cambios',
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  async downloadResume() {
    const app = this.application();
    if (!app?.resume_url) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get(app.resume_url, { responseType: 'blob' })
      );

      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = app.resume_filename || `CV_${app.first_name}_${app.last_name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.messageService.add({
        severity: 'success',
        summary: 'Descarga iniciada',
        detail: 'El CV se está descargando',
      });
    } catch (error: any) {
      console.error('Error downloading resume:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo descargar el CV',
      });
    }
  }

  close() {
    this.ref.close();
  }

  getStatusLabel(status: JobApplication['status']): string {
    const labels: Record<JobApplication['status'], string> = {
      pending: 'Pendiente',
      reviewed: 'Revisada',
      contacted: 'Contactada',
      rejected: 'Rechazada',
      hired: 'Contratada',
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: JobApplication['status']): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severities: Record<JobApplication['status'], 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      pending: 'warn',
      reviewed: 'info',
      contacted: 'info',
      rejected: 'danger',
      hired: 'success',
    };
    return severities[status] || 'secondary';
  }
}

