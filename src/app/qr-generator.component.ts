import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as OTPAuth from 'otpauth';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import QRCode from 'qrcode';
import { Employee } from './models';

@Component({
  selector: 'pt-qr-generator',
  imports: [CardModule, ButtonModule, DropdownModule, FormsModule],
  template: `<div class="flex h-screen items-center justify-center w-full">
    <div class="w-full px-6 lg:w-1/3">
      <p-card header="Creacion de codigo QR">
        <div class="input-container">
          <label for="employee">Empleado</label>
          <p-dropdown
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
        <p-button (onClick)="generateQrCode()" [disabled]="!employee()"
          >Click</p-button
        >
      </p-card>
    </div>
  </div> `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrGeneratorComponent {
  public employee = model<Employee>();
  private http = inject(HttpClient);
  public employees = httpResource<Partial<Employee>[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
    method: 'GET',
    params: {
      select: 'id,first_name,father_name',
      order: 'father_name',
      is_active: 'eq.true',
    },
  }));

  generateQrCode() {
    if (!this.employee()) {
      return;
    }
    const totp = new OTPAuth.TOTP({
      issuer: 'Peopletrak Blackdog',
      label: `${this.employee()!.first_name.trim()} ${this.employee()!.father_name.trim()}`,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const uri = totp.toString();

    QRCode.toDataURL(uri, (error, qrUrl) => {
      if (error) {
        console.error(error);
        return;
      }

      this.http
        .patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
          {
            qr_code: qrUrl,
            code_uri: uri,
          },
          {
            params: {
              id: `eq.${this.employee()!.id}`,
            },
          }
        )
        .subscribe();
    });
  }
}
