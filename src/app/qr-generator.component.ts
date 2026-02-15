import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { Employee } from './models';
import { QrService } from './services/qr.service';
import { getEnv } from './utils/env.utils';

@Component({
  selector: 'pt-qr-generator',
  imports: [CardModule, ButtonModule, DropdownModule, FormsModule],
  template: `<div class="flex h-screen items-center justify-center w-full">
    <div class="w-full px-6 lg:w-1/3">
      <p-card header="Creacion de codigo QR">
        <div class="input-container">
          <label for="employee">Empleado</label>
          <p-dropdown
            inputId="employee"
            [(ngModel)]="employee"
            [options]="employees.value()"
            placeholder="Seleccionar empleado"
            filter
            filterBy="first_name,father_name"
          >
            <ng-template pTemplate="selectedItem" let-selected>
              {{ selected.father_name }}, {{ selected.first_name }}
            </ng-template>
            <ng-template let-item pTemplate="item">
              {{ item.father_name }}, {{ item.first_name }}
            </ng-template>
          </p-dropdown>
        </div>
        <canvas id="canvas"></canvas>
        <p-button
          (onClick)="generateQrCode()"
          [disabled]="!employee() || generating()"
          [loading]="generating()"
          >Generar QR</p-button
        >
      </p-card>
    </div>
  </div> `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrGeneratorComponent {
  public employee = model<Employee>();
  private qrService = inject(QrService);
  public generating = signal(false);

  public employees = httpResource<Partial<Employee>[]>(() => ({
    url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employees`,
    method: 'GET',
    params: {
      select: 'id,first_name,father_name',
      order: 'father_name',
      is_active: 'eq.true',
    },
  }));

  generateQrCode() {
    const emp = this.employee();
    if (!emp) {
      return;
    }

    this.generating.set(true);
    this.qrService.generateQrCode(emp as Employee).subscribe({
      next: (result) => {
        this.generating.set(false);
        console.log('✅ QR generado correctamente:', result.code_uri);
      },
      error: (err) => {
        this.generating.set(false);
        console.error('❌ Error generando QR:', err);
      },
    });
  }
}

