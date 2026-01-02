import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'pt-employee-portal-compensatory-tutorial-dialog',
  standalone: true,
  imports: [DialogModule, Button],
  template: `
    <p-dialog
      [visible]="visible()"
      (onHide)="onClose()"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [draggable]="false"
      [resizable]="false"
      [closable]="true"
      [header]="'¿Cómo solicitar tiempo compensatorio?'"
    >
      <div class="tutorial-content">
        <!-- Introducción -->
        <div class="mb-6 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-cyan-400 text-2xl mt-1"></i>
            <div>
              <h3 class="text-lg font-semibold text-white mb-2">
                ¿Qué es el tiempo compensatorio?
              </h3>
              <p class="text-gray-300 text-sm leading-relaxed">
                El tiempo compensatorio te permite tomar descanso equivalente a las horas extras que
                has trabajado. Por ejemplo, si trabajaste 2 horas extras, puedes solicitar 2 horas
                de descanso compensatorio.
              </p>
            </div>
          </div>
        </div>

        <!-- Paso 1 -->
        <div class="mb-6 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
          <div class="flex items-start gap-3 mb-3">
            <div
              class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0"
            >
              <span class="text-cyan-400 font-bold">1</span>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-white mb-2">
                Selecciona el Tipo de Solicitud
              </h3>
              <div class="space-y-3 text-gray-300 text-sm">
                <div class="flex items-start gap-2">
                  <i class="pi pi-clock text-cyan-400 mt-1"></i>
                  <div>
                    <strong class="text-white">Por Horas:</strong> Usa esta opción cuando necesites
                    tomar tiempo compensatorio por horas específicas (ej: 2 horas, 4 horas). Debes
                    seleccionar:
                    <ul class="list-disc list-inside mt-2 ml-2 space-y-1 text-gray-400">
                      <li>La fecha en que deseas tomar el compensatorio</li>
                      <li>La hora de inicio</li>
                      <li>La hora de fin</li>
                    </ul>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <i class="pi pi-calendar text-cyan-400 mt-1"></i>
                  <div>
                    <strong class="text-white">Por Días:</strong> Usa esta opción cuando necesites
                    tomar uno o más días completos de descanso compensatorio. Debes seleccionar:
                    <ul class="list-disc list-inside mt-2 ml-2 space-y-1 text-gray-400">
                      <li>Fecha de inicio del período de descanso</li>
                      <li>Fecha de fin del período de descanso</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Paso 2 -->
        <div class="mb-6 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
          <div class="flex items-start gap-3 mb-3">
            <div
              class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0"
            >
              <span class="text-cyan-400 font-bold">2</span>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-white mb-2">
                Selecciona las Fechas y Horas
              </h3>
              <div class="space-y-2 text-gray-300 text-sm">
                <p>
                  <strong class="text-white">Para solicitudes por horas:</strong> Selecciona la fecha
                  y el rango de horas exactas que deseas tomar. El sistema calculará automáticamente
                  cuántas horas estás solicitando.
                </p>
                <p>
                  <strong class="text-white">Para solicitudes por días:</strong> Selecciona el rango
                  de fechas completo. Puedes seleccionar desde un día hasta varios días
                  consecutivos.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Paso 3 -->
        <div class="mb-6 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
          <div class="flex items-start gap-3 mb-3">
            <div
              class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0"
            >
              <span class="text-cyan-400 font-bold">3</span>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-white mb-2">Agrega un Motivo (Opcional)</h3>
              <p class="text-gray-300 text-sm">
                Puedes agregar un motivo o descripción para tu solicitud. Esto ayuda a RRHH a
                entender mejor tu solicitud. Por ejemplo: "Necesito tiempo para asuntos personales",
                "Tengo una cita médica", etc.
              </p>
            </div>
          </div>
        </div>

        <!-- Proceso de Revisión -->
        <div class="mb-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
          <div class="flex items-start gap-3">
            <i class="pi pi-check-circle text-blue-400 text-2xl mt-1"></i>
            <div>
              <h3 class="text-lg font-semibold text-white mb-2">
                ¿Qué pasa después de enviar mi solicitud?
              </h3>
              <ol class="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                <li>
                  <strong class="text-white">Revisión de RRHH:</strong> El departamento de Recursos
                  Humanos revisará tu solicitud y verificará que tengas horas extras disponibles
                  acumuladas.
                </li>
                <li>
                  <strong class="text-white">Aprobación o Rechazo:</strong> RRHH te notificará si tu
                  solicitud fue aprobada o rechazada. Si es rechazada, te explicarán el motivo.
                </li>
                <li>
                  <strong class="text-white">Registro:</strong> Una vez aprobada, tu solicitud será
                  registrada en el sistema y podrás disfrutar de tu tiempo compensatorio.
                </li>
              </ol>
            </div>
          </div>
        </div>

        <!-- Consejos adicionales -->
        <div class="p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
          <div class="flex items-start gap-3">
            <i class="pi pi-lightbulb text-green-400 text-xl mt-1"></i>
            <div>
              <h3 class="text-base font-semibold text-white mb-2">Consejos útiles</h3>
              <ul class="list-disc list-inside space-y-1 text-gray-300 text-sm">
                <li>Solicita con anticipación para facilitar la planificación</li>
                <li>Verifica que tengas horas extras antes de solicitar</li>
                <li>Revisa el estado de tus solicitudes en la sección "Mis Solicitudes"</li>
                <li>Contacta a RRHH si tienes dudas sobre tus horas extras disponibles</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <ng-template #footer>
        <div class="flex justify-end">
          <p-button
            label="Entendido"
            icon="pi pi-check"
            (onClick)="onClose()"
            severity="success"
            [rounded]="true"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePortalCompensatoryTutorialDialogComponent {
  // Inputs
  public visible = input.required<boolean>();

  // Outputs
  public close = output<void>();

  public onClose(): void {
    this.close.emit();
  }
}
