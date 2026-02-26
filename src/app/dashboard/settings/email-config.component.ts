import { CommonModule } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../../services/api-url.service';

interface SmtpSetting {
  key: string;
  value: string;
}

@Component({
  selector: 'pt-email-config',
  imports: [
    CommonModule,
    FormsModule,
    Button,
    InputText,
    Select,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <div class="flex flex-col gap-4">
      <h3
        class="text-lg font-bold text-white flex items-center gap-2 border-b border-neutral-700 pb-2"
      >
        <i class="pi pi-server text-blue-400"></i>
        Configuración del Servidor SMTP
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Host -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-300"
            >Servidor SMTP *</label
          >
          <input
            pInputText
            [(ngModel)]="smtpHost"
            placeholder="smtp-mail.outlook.com"
            [disabled]="saving()"
          />
        </div>

        <!-- Port -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-300">Puerto *</label>
          <p-select
            [options]="portOptions"
            [(ngModel)]="smtpPort"
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccionar puerto"
            [disabled]="saving()"
            styleClass="w-full"
          />
        </div>

        <!-- User -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-300"
            >Usuario SMTP (email) *</label
          >
          <input
            pInputText
            [(ngModel)]="smtpUser"
            placeholder="correo@outlook.com"
            type="email"
            [disabled]="saving()"
          />
        </div>

        <!-- Noreply Email -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-300"
            >Correo Remitente</label
          >
          <input
            pInputText
            [(ngModel)]="smtpNoreplyEmail"
            placeholder="(usa el usuario SMTP si está vacío)"
            type="email"
            [disabled]="saving()"
          />
        </div>

        <!-- Noreply Name -->
        <div class="flex flex-col gap-1 md:col-span-2">
          <label class="text-xs font-medium text-gray-300"
            >Nombre del Remitente</label
          >
          <input
            pInputText
            [(ngModel)]="smtpNoreplyName"
            placeholder="People - RRHH"
            [disabled]="saving()"
          />
        </div>
      </div>

      <!-- Password notice -->
      <div
        class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
      >
        <div class="flex items-start gap-2">
          <i class="pi pi-lock text-amber-400 mt-0.5"></i>
          <p class="text-sm text-gray-300 m-0">
            La contraseña SMTP se configura en la variable de entorno
            <code class="bg-neutral-700 px-1 rounded">ENV_SMTP_PASSWORD</code>
            del servidor por seguridad. No se almacena en la base de datos.
          </p>
        </div>
      </div>

      <!-- Validation errors -->
      @if (!isValid() && (smtpHost() || smtpUser())) {
      <div class="text-xs text-red-400">
        @if (!smtpHost().trim()) {
        <p class="m-0">* El servidor SMTP es requerido</p>
        } @if (!smtpUser().trim()) {
        <p class="m-0">* El usuario SMTP es requerido</p>
        }
      </div>
      }

      <!-- Save button -->
      <div class="flex justify-end">
        <p-button
          label="Guardar Configuración SMTP"
          icon="pi pi-save"
          [loading]="saving()"
          [disabled]="!isValid()"
          (click)="saveSmtpConfig()"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailConfigComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);

  public smtpHost = signal('smtp-mail.outlook.com');
  public smtpPort = signal(587);
  public smtpUser = signal('');
  public smtpNoreplyEmail = signal('');
  public smtpNoreplyName = signal('People - RRHH');
  public saving = signal(false);

  public portOptions = [
    { label: '587 (STARTTLS - Recomendado)', value: 587 },
    { label: '465 (SSL directo)', value: 465 },
    { label: '25 (Sin cifrado)', value: 25 },
  ];

  public isValid = computed(
    () =>
      !!this.smtpHost().trim() &&
      this.smtpPort() >= 1 &&
      this.smtpPort() <= 65535 &&
      !!this.smtpUser().trim()
  );

  public smtpSettingsResource = httpResource<SmtpSetting[]>(() => ({
    url: this.apiUrl.build('rest/v1/settings', {
      select: 'key,value',
      key: 'in.(smtp_host,smtp_port,smtp_user,smtp_noreply_email,smtp_noreply_name)',
    }),
    method: 'GET',
  }));

  constructor() {
    effect(() => {
      const settings = this.smtpSettingsResource.value();
      if (settings && settings.length > 0) {
        const get = (k: string) => settings.find((s) => s.key === k)?.value;
        if (get('smtp_host')) this.smtpHost.set(get('smtp_host')!);
        if (get('smtp_port'))
          this.smtpPort.set(parseInt(get('smtp_port')!));
        if (get('smtp_user')) this.smtpUser.set(get('smtp_user')!);
        if (get('smtp_noreply_email'))
          this.smtpNoreplyEmail.set(get('smtp_noreply_email')!);
        if (get('smtp_noreply_name'))
          this.smtpNoreplyName.set(get('smtp_noreply_name')!);
      }
    });
  }

  public async saveSmtpConfig(): Promise<void> {
    this.saving.set(true);
    try {
      const keys = [
        { key: 'smtp_host', value: this.smtpHost().trim() },
        { key: 'smtp_port', value: String(this.smtpPort()) },
        { key: 'smtp_user', value: this.smtpUser().trim() },
        { key: 'smtp_noreply_email', value: this.smtpNoreplyEmail().trim() },
        { key: 'smtp_noreply_name', value: this.smtpNoreplyName().trim() },
      ];

      for (const item of keys) {
        const url = this.apiUrl.build('rest/v1/settings', {
          key: `eq.${item.key}`,
        });
        await firstValueFrom(this.http.patch(url, { value: item.value }));
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Configuración SMTP guardada correctamente',
      });
      this.smtpSettingsResource.reload();
    } catch (error: any) {
      console.error('Error saving SMTP config:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          error?.error?.message ||
          'No se pudo guardar la configuración SMTP',
      });
    } finally {
      this.saving.set(false);
    }
  }
}
