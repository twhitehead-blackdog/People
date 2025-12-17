import { CommonModule } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { FileUploadModule } from 'primeng/fileupload';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { firstValueFrom } from 'rxjs';
import { EmailService } from '../services/email.service';
import { PositionsStore } from '../stores/positions.store';

@Component({
  selector: 'pt-job-fair-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Card,
    Button,
    InputText,
    InputNumber,
    Textarea,
    MultiSelectModule,
    ToggleSwitch,
    FileUploadModule,
    ToastModule,
  ],
  providers: [PositionsStore, MessageService, ConfirmationService],
  template: `
    <p-toast />
    <div
      class="min-h-screen job-fair-background flex items-center justify-center p-4 py-12"
    >
      <div class="w-full max-w-5xl">
        <!-- Header con información de la empresa -->
        <div class="text-center mb-10 animate-fade-in">
          <div class="logo-container mb-6">
            <img
              src="images/blackdog.png"
              alt="Black Dog Logo"
              class="h-16 sm:h-20 md:h-24 mx-auto mb-4 sm:mb-6 drop-shadow-2xl animate-logo-float"
            />
          </div>
          <div class="badge-container mb-6">
            <span class="job-fair-badge">
              <i class="pi pi-star-fill mr-2"></i>
              Feria Virtual de Empleo
            </span>
          </div>
          <h1
            class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent animate-gradient"
          >
            Únete a Nuestro Equipo
          </h1>
          <p
            class="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-200 mb-3 sm:mb-4 font-light px-2"
          >
            En Black Dog estamos creciendo y queremos que tú seas parte de
            nuestro desarrollo en Panamá
          </p>
          <div class="max-w-3xl mx-auto">
            <p
              class="text-sm sm:text-base md:text-lg text-gray-300 mb-4 sm:mb-6 leading-relaxed px-2"
            >
              Te invitamos a nuestra
              <strong class="text-amber-400">Feria Virtual de Empleo</strong>,
              donde podrás conocer las oportunidades laborales que tenemos para
              ti, aprender más sobre nuestra empresa y dar el siguiente paso en
              tu carrera profesional.
            </p>
            <div class="highlight-box mb-4 sm:mb-6">
              <p
                class="text-base sm:text-lg md:text-xl text-white font-semibold"
              >
                <i class="pi pi-bolt text-amber-400 mr-2"></i>
                ¿Quieres formar parte de un equipo innovador y en constante
                expansión?
              </p>
              <p class="text-sm sm:text-base md:text-lg text-gray-200 mt-2">
                No te pierdas esta oportunidad. ¡Inscríbete ahora y sé parte del
                crecimiento de Black Dog en Panamá!
              </p>
            </div>
            <div class="info-badge-container">
              <div class="info-badge">
                <i class="pi pi-calendar text-amber-400 mr-2"></i>
                <span>Las personas serán contactadas y atendidas por cita</span>
              </div>
              @if (jobFairStartDate() || jobFairEndDate()) {
              <div class="info-badge">
                <i class="pi pi-calendar text-amber-400 mr-2"></i>
                <span>
                  @if (jobFairStartDate() && jobFairEndDate()) {
                    Duración de la feria: del
                    {{ formatInterviewDate(jobFairStartDate()!) }} al
                    {{ formatInterviewDate(jobFairEndDate()!) }}
                  } @else if (jobFairStartDate()) {
                    La feria inicia el
                    {{ formatInterviewDate(jobFairStartDate()!) }}
                  } @else if (jobFairEndDate()) {
                    La feria termina el
                    {{ formatInterviewDate(jobFairEndDate()!) }}
                  }
                </span>
              </div>
              }
            </div>
          </div>
        </div>

        <!-- Mensaje si la feria está desactivada -->
        @if (!jobFairEnabled() && !isSuccess()) {
        <p-card class="job-fair-card animate-slide-up">
          <div class="text-center py-12">
            <i class="pi pi-ban text-6xl text-red-400 mb-4"></i>
            <h2 class="text-3xl font-bold text-white mb-4">
              Feria de Empleo Temporalmente Cerrada
            </h2>
            <p class="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              Lo sentimos, la Feria Virtual de Empleo se encuentra temporalmente
              cerrada. Por favor, intenta nuevamente más tarde o contacta con
              Recursos Humanos para más información.
            </p>
            <p-button
              label="Volver al Inicio"
              icon="pi pi-home"
              (click)="goToLogin()"
              class="mt-4"
            />
          </div>
        </p-card>
        }

        <!-- Formulario - Solo mostrar si la feria está activa y no hay éxito -->
        @if (jobFairEnabled() && !isSuccess()) {
        <p-card class="job-fair-card animate-slide-up">
          <ng-template #title>
            <div class="flex items-center gap-3">
              <div class="icon-wrapper">
                <i class="pi pi-briefcase text-2xl"></i>
              </div>
              <div>
                <h2
                  class="text-white text-lg sm:text-xl md:text-2xl font-bold m-0"
                >
                  Formulario de Aplicación
                </h2>
                <p class="text-gray-400 text-xs sm:text-sm m-0 mt-1">
                  Completa tus datos y únete a nuestro equipo
                </p>
              </div>
            </div>
          </ng-template>

          <form [formGroup]="applicationForm" (ngSubmit)="onSubmit()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <!-- Nombre -->
              <div>
                <label
                  for="first_name"
                  class="block text-sm font-medium text-gray-300 mb-2"
                >
                  Nombre <span class="text-red-400">*</span>
                </label>
                <input
                  pInputText
                  id="first_name"
                  formControlName="first_name"
                  placeholder="Tu nombre"
                  class="w-full"
                  [class.ng-invalid]="
                    applicationForm.get('first_name')?.invalid &&
                    applicationForm.get('first_name')?.touched
                  "
                />
                @if ( applicationForm.get('first_name')?.invalid &&
                applicationForm.get('first_name')?.touched ) {
                <small class="text-red-400">El nombre es requerido</small>
                }
              </div>

              <!-- Apellido -->
              <div>
                <label
                  for="last_name"
                  class="block text-sm font-medium text-gray-300 mb-2"
                >
                  Apellido <span class="text-red-400">*</span>
                </label>
                <input
                  pInputText
                  id="last_name"
                  formControlName="last_name"
                  placeholder="Tu apellido"
                  class="w-full"
                  [class.ng-invalid]="
                    applicationForm.get('last_name')?.invalid &&
                    applicationForm.get('last_name')?.touched
                  "
                />
                @if ( applicationForm.get('last_name')?.invalid &&
                applicationForm.get('last_name')?.touched ) {
                <small class="text-red-400">El apellido es requerido</small>
                }
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <!-- Email -->
              <div>
                <label
                  for="email"
                  class="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email <span class="text-red-400">*</span>
                </label>
                <input
                  pInputText
                  type="email"
                  id="email"
                  formControlName="email"
                  placeholder="tu@email.com"
                  class="w-full"
                  [class.ng-invalid]="
                    applicationForm.get('email')?.invalid &&
                    applicationForm.get('email')?.touched
                  "
                />
                @if ( applicationForm.get('email')?.invalid &&
                applicationForm.get('email')?.touched ) {
                <small class="text-red-400">Ingresa un email válido</small>
                }
              </div>

              <!-- Teléfono -->
              <div>
                <label
                  for="phone_number"
                  class="block text-sm font-medium text-gray-300 mb-2"
                >
                  Teléfono <span class="text-red-400">*</span>
                </label>
                <input
                  pInputText
                  id="phone_number"
                  formControlName="phone_number"
                  placeholder="(+507) 6666-6666"
                  class="w-full"
                  (input)="formatPhoneNumber($event)"
                  (focus)="onPhoneFocus($event)"
                  maxlength="17"
                  [class.ng-invalid]="
                    applicationForm.get('phone_number')?.invalid &&
                    applicationForm.get('phone_number')?.touched
                  "
                />
                @if ( applicationForm.get('phone_number')?.invalid &&
                applicationForm.get('phone_number')?.touched ) {
                <small class="text-red-400">El teléfono es requerido</small>
                }
              </div>
            </div>

            <!-- Lugar de Residencia -->
            <div class="mb-4">
              <label
                for="residence"
                class="block text-sm font-medium text-gray-300 mb-2"
              >
                Lugar de Residencia <span class="text-red-400">*</span>
              </label>
              <input
                pInputText
                id="residence"
                formControlName="residence"
                placeholder="Ej: Panamá, San Francisco..."
                class="w-full"
                [class.ng-invalid]="
                  applicationForm.get('residence')?.invalid &&
                  applicationForm.get('residence')?.touched
                "
              />
              @if ( applicationForm.get('residence')?.invalid &&
              applicationForm.get('residence')?.touched ) {
              <small class="text-red-400"
                >El lugar de residencia es requerido</small
              >
              }
            </div>

            <!-- Laborando Actualmente y Aspiración Salarial -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <!-- Laborando Actualmente -->
              <div>
                <label
                  for="currently_working"
                  class="block text-sm font-medium text-gray-300 mb-2"
                >
                  ¿Estás laborando actualmente?
                </label>
                <p-toggleSwitch
                  formControlName="currently_working"
                  id="currently_working"
                  class="block"
                />
              </div>

              <!-- Aspiración Salarial -->
              <div>
                <label
                  for="salary_expectation"
                  class="block text-sm font-medium text-gray-300 mb-2"
                >
                  Aspiración Salarial (Opcional)
                </label>
                <p-inputNumber
                  id="salary_expectation"
                  formControlName="salary_expectation"
                  mode="decimal"
                  [min]="0"
                  [max]="999999.99"
                  [minFractionDigits]="2"
                  [maxFractionDigits]="2"
                  placeholder="B/. 800.00"
                  prefix="B/. "
                  class="w-full"
                  [useGrouping]="true"
                />
              </div>
            </div>

            <!-- Posiciones (múltiples selecciones) -->
            <div class="mb-4">
              <label
                for="position_ids"
                class="block text-sm font-medium text-gray-300 mb-2"
              >
                Vacantes a las que aspiras <span class="text-red-400">*</span>
              </label>
              <p-multiSelect
                id="position_ids"
                formControlName="position_ids"
                [options]="availablePositions()"
                optionLabel="name"
                optionValue="id"
                placeholder="Selecciona una o más vacantes"
                [showClear]="true"
                [filter]="true"
                filterBy="name"
                [maxSelectedLabels]="3"
                selectedItemsLabel="{0} vacantes seleccionadas"
                class="w-full"
                [class.ng-invalid]="
                  applicationForm.get('position_ids')?.invalid &&
                  applicationForm.get('position_ids')?.touched
                "
                appendTo="body"
              />
              @if ( applicationForm.get('position_ids')?.invalid &&
              applicationForm.get('position_ids')?.touched ) {
              <small class="text-red-400"
                >Debes seleccionar al menos una vacante</small
              >
              }
            </div>

            <!-- Hoja de Vida -->
            <div class="mb-4">
              <label
                for="resume"
                class="block text-sm font-medium text-gray-300 mb-2"
              >
                Hoja de Vida (CV) <span class="text-red-400">*</span>
              </label>
              <p-fileUpload
                #fileUpload
                mode="basic"
                name="resume"
                accept=".pdf,.doc,.docx"
                maxFileSize="5000000"
                [auto]="false"
                chooseLabel="Seleccionar archivo"
                (onSelect)="onFileSelect($event)"
                (onClear)="onFileClear()"
                [disabled]="isSubmitting()"
              />
              @if (selectedFile()) {
              <div class="mt-2 text-sm text-gray-400">
                <i class="pi pi-file"></i>
                {{ selectedFile()?.name }}
                ({{ formatFileSize(selectedFile()?.size || 0) }})
              </div>
              } @if ( !selectedFile() && applicationForm.get('resume')?.invalid
              && applicationForm.get('resume')?.touched ) {
              <small class="text-red-400">Debes adjuntar tu hoja de vida</small>
              }
            </div>

            <!-- Información Adicional -->
            <div class="mb-4">
              <label
                for="additional_info"
                class="block text-sm font-medium text-gray-300 mb-2"
              >
                Información Adicional (Opcional)
              </label>
              <textarea
                pTextarea
                id="additional_info"
                formControlName="additional_info"
                rows="4"
                placeholder="Cuéntanos sobre ti, tu experiencia, por qué quieres trabajar con nosotros..."
                class="w-full"
              ></textarea>
            </div>

            <!-- Botones -->
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end">
              <p-button
                label="Cancelar"
                icon="pi pi-times"
                severity="secondary"
                (click)="onCancel()"
                [disabled]="isSubmitting()"
                class="w-full sm:w-auto min-h-[44px]"
              />
              <p-button
                type="submit"
                label="Enviar Aplicación"
                icon="pi pi-send"
                [loading]="isSubmitting()"
                [disabled]="applicationForm.invalid"
                class="w-full sm:w-auto min-h-[44px]"
              />
            </div>
          </form>
        </p-card>
        }

        <!-- Mensaje de éxito -->
        @if (isSuccess()) {
        <p-card class="mt-4">
          <div class="text-center py-8">
            <i class="pi pi-check-circle text-6xl text-green-400 mb-4"></i>
            <h2 class="text-2xl font-bold text-white mb-2">
              ¡Aplicación Enviada Exitosamente!
            </h2>
            <p class="text-gray-300 mb-4">
              Gracias por tu interés en formar parte de Black Dog. Hemos
              recibido tu aplicación y la revisaremos pronto.
            </p>
            <p class="text-gray-400 text-sm">
              Te contactaremos por email o teléfono para coordinar una cita de
              entrevista.
            </p>
            <p-button
              label="Volver al Inicio"
              icon="pi pi-home"
              (click)="goToLogin()"
              class="mt-4"
            />
          </div>
        </p-card>
        }
      </div>
    </div>
  `,
  styles: `
    .job-fair-background {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #1e293b 75%, #0f172a 100%);
      background-size: 400% 400%;
      animation: gradient-shift 15s ease infinite;
      position: relative;
    }


    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slide-up {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes logo-float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    @keyframes gradient {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    .animate-fade-in {
      animation: fade-in 0.8s ease-out;
    }

    .animate-slide-up {
      animation: slide-up 0.8s ease-out 0.2s both;
    }

    .animate-logo-float {
      animation: logo-float 3s ease-in-out infinite;
    }

    .animate-gradient {
      background-size: 200% 200%;
      animation: gradient 3s ease infinite;
    }

    .logo-container {
      filter: drop-shadow(0 10px 30px rgba(251, 191, 36, 0.3));
    }

    .job-fair-badge {
      display: inline-block;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #000;
      padding: 0.75rem 1.5rem;
      border-radius: 50px;
      font-weight: 700;
      font-size: 1rem;
      box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .highlight-box {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
      border: 2px solid rgba(251, 191, 36, 0.3);
      border-radius: 16px;
      padding: 2rem;
    }

    .info-badge-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
      margin-top: 1.5rem;
    }

    .info-badge {
      display: inline-flex;
      align-items: center;
      background: rgba(30, 30, 30, 0.95);
      border: 2px solid rgba(251, 191, 36, 0.5);
      border-radius: 12px;
      padding: 1rem 1.5rem;
      color: #f3f4f6;
      font-size: 1rem;
      font-weight: 500;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3),
                  0 0 0 1px rgba(251, 191, 36, 0.2);
      min-width: fit-content;
      transition: all 0.3s ease;
    }

    .info-badge:hover {
      border-color: rgba(251, 191, 36, 0.7);
      background: rgba(40, 40, 40, 0.95);
      box-shadow: 0 6px 20px rgba(251, 191, 36, 0.2),
                  0 0 0 1px rgba(251, 191, 36, 0.3);
      transform: translateY(-2px);
    }

    .info-badge i {
      font-size: 1.1rem;
    }

    @media (min-width: 768px) {
      .info-badge-container {
        flex-direction: row;
        justify-content: center;
        flex-wrap: wrap;
      }
    }

    .job-fair-card {
      background: rgba(20, 20, 20, 0.95) !important;
      border: 2px solid rgba(251, 191, 36, 0.2) !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
                  0 0 0 1px rgba(251, 191, 36, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
      border-radius: 24px !important;
    }

    .icon-wrapper {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
    }

    .icon-wrapper i {
      color: #000 !important;
    }

    ::ng-deep .p-card .p-card-title {
      color: white !important;
      padding: 1.5rem 1.5rem 1rem 1.5rem !important;
    }

    ::ng-deep .p-card .p-card-body {
      padding: 1.5rem !important;
    }

    ::ng-deep .p-inputtext,
    ::ng-deep .p-textarea,
    ::ng-deep .p-select {
      background: rgba(30, 30, 30, 0.9) !important;
      border: 2px solid rgba(100, 100, 100, 0.3) !important;
      color: white !important;
      border-radius: 12px !important;
      padding: 0.75rem 1rem !important;
      transition: all 0.3s ease !important;
    }

    ::ng-deep .p-inputtext:hover,
    ::ng-deep .p-textarea:hover,
    ::ng-deep .p-select:hover {
      border-color: rgba(251, 191, 36, 0.5) !important;
    }

    ::ng-deep .p-inputtext:focus,
    ::ng-deep .p-textarea:focus,
    ::ng-deep .p-select:focus {
      border-color: #fbbf24 !important;
      box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.2) !important;
      background: rgba(40, 40, 40, 0.95) !important;
    }

    /* Espacio entre el botón de limpiar (X) y la flecha del dropdown en los selects */
    ::ng-deep #position_id.p-select .p-select-clear-icon {
      margin-right: 0.75rem !important;
    }

    ::ng-deep #position_id.p-select .p-select-trigger {
      display: flex !important;
      align-items: center !important;
      gap: 0.5rem !important;
    }

    ::ng-deep .p-fileupload-basic {
      background: rgba(30, 30, 30, 0.9) !important;
      border: 2px dashed rgba(251, 191, 36, 0.4) !important;
      border-radius: 12px !important;
      padding: 1rem !important;
      transition: all 0.3s ease !important;
    }

    ::ng-deep .p-fileupload-basic:hover {
      border-color: rgba(251, 191, 36, 0.7) !important;
      background: rgba(40, 40, 40, 0.95) !important;
    }

    ::ng-deep .p-fileupload-basic .p-button {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
      border: none !important;
      color: #000 !important;
      font-weight: 600 !important;
      border-radius: 10px !important;
      padding: 0.75rem 1.5rem !important;
      transition: all 0.3s ease !important;
      box-shadow: 0 4px 15px rgba(251, 191, 36, 0.3) !important;
    }

    ::ng-deep .p-fileupload-basic .p-button:hover {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(251, 191, 36, 0.5) !important;
    }

    ::ng-deep .p-button.p-button-primary {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
      border: none !important;
      color: white !important;
      font-weight: 600 !important;
      padding: 0.875rem 2rem !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4) !important;
      transition: all 0.3s ease !important;
    }

    ::ng-deep .p-button.p-button-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6) !important;
    }

    ::ng-deep .p-button.p-button-secondary {
      background: rgba(60, 60, 60, 0.8) !important;
      border: 1px solid rgba(100, 100, 100, 0.5) !important;
      color: white !important;
    }

    ::ng-deep .p-button.p-button-secondary:hover {
      background: rgba(80, 80, 80, 0.9) !important;
      border-color: rgba(150, 150, 150, 0.7) !important;
    }

    label {
      font-weight: 600;
      color: #e5e7eb;
      margin-bottom: 0.5rem;
      display: block;
    }

    small {
      display: block;
      margin-top: 0.25rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobFairFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private positionsStore = inject(PositionsStore);
  private destroyRef = inject(DestroyRef);
  private emailService = inject(EmailService);

  public selectedFile = signal<File | null>(null);
  public isSubmitting = signal<boolean>(false);
  public isSuccess = signal<boolean>(false);
  public jobFairEnabled = signal<boolean>(true);
  public jobFairStartDate = signal<Date | null>(null);
  public jobFairEndDate = signal<Date | null>(null);

  // API para verificar el estado de la feria y fecha de entrevistas
  private jobFairSettingsApi = httpResource<any[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
    method: 'GET',
    params: {
      select: '*',
      key: `in.(job_fair_enabled,job_fair_start_date,job_fair_end_date)`,
    },
  }));

  // Posiciones disponibles para la feria de empleo
  public availablePositions = computed(() => {
    const allPositions = this.positionsStore.entities();

    // Si no hay posiciones cargadas, retornar array vacío
    if (allPositions.length === 0) {
      console.log('No hay posiciones cargadas aún');
      return [];
    }

    // Filtrar solo las posiciones que están disponibles para la feria de empleo
    // Si available_for_job_fair es null o undefined, asumir que está disponible (true por defecto)
    const availablePositions = allPositions.filter(
      (pos) => pos.available_for_job_fair !== false
    );

    console.log('Total de posiciones cargadas:', allPositions.length);
    console.log(
      'Posiciones disponibles para feria:',
      availablePositions.length
    );
    console.log(
      'Posiciones disponibles:',
      availablePositions.map((p) => p.name)
    );

    // Lista específica de nombres de posiciones que deben aparecer
    const relevantPositionNames = [
      // Gerencia
      'gerente de tienda',
      'gerente de sucursal',
      'gerente',
      'subgerente de tienda',
      'subgerente de sucursal',
      'subgerente',
      // Ventas
      'asesor de venta',
      'asesor de ventas',
      'asesor',
      'vendedor',
      'ventas',
      // Servicios
      'veterinario',
      'estilista',
      'peluquero',
      // Administrativos - Contabilidad
      'contabilidad',
      'contador',
      'asistente de contabilidad',
      // Administrativos - Recursos Humanos
      'recursos humanos',
      'rrhh',
      'asistente de recursos humanos',
      'asistente de rrhh',
      // Administrativos - Logística
      'logística',
      'logistica',
      'logistico',
      // Administrativos - Mercadeo
      'mercadeo',
      'marketing',
      'mercadólogo',
      // Administrativos - Finanzas
      'finanzas',
      'financiero',
      'asistente de finanzas',
      // Administrativos - General
      'administrativo',
      'asistente administrativo',
      // Operativos
      'ayudante',
      'ayudante general',
      'auxiliar',
    ];

    // Palabras clave adicionales para búsqueda flexible
    const keywords = [
      // Gerencia
      'gerente',
      'subgerente',
      // Ventas
      'asesor',
      'venta',
      'vendedor',
      // Servicios
      'veterinario',
      'estilista',
      'peluquero',
      // Administrativos
      'contabilidad',
      'contador',
      'recursos humanos',
      'rrhh',
      'logística',
      'logistica',
      'logistico',
      'mercadeo',
      'marketing',
      'mercadólogo',
      'finanzas',
      'financiero',
      'administrativo',
      // Operativos
      'ayudante',
      'auxiliar',
    ];

    // Normalizar nombres para comparación (sin acentos, minúsculas)
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    // Filtrar posiciones que:
    // 1. Coincidan exactamente con algún nombre relevante (normalizado)
    // 2. O contengan alguna palabra clave
    const filtered = availablePositions.filter((pos) => {
      const normalizedName = normalize(pos.name);

      // Verificar coincidencia exacta con nombres relevantes
      const exactMatch = relevantPositionNames.some(
        (relevantName) => normalizedName === normalize(relevantName)
      );

      // Verificar si contiene alguna palabra clave
      const keywordMatch = keywords.some((keyword) =>
        normalizedName.includes(normalize(keyword))
      );

      return exactMatch || keywordMatch;
    });

    console.log(
      'Posiciones filtradas:',
      filtered.length,
      filtered.map((p) => p.name)
    );

    // Para la feria de empleo, mostrar solo las posiciones disponibles (available_for_job_fair = true)
    // Si hay posiciones filtradas, priorizarlas ordenándolas primero
    let result: typeof availablePositions;
    if (filtered.length > 0) {
      // Combinar: primero las filtradas (relevantes), luego las demás disponibles
      const filteredIds = new Set(filtered.map((p) => p.id));
      const others = availablePositions.filter((p) => !filteredIds.has(p.id));
      result = [...filtered, ...others];
      console.log(
        'Posiciones que se mostrarán (filtradas primero):',
        result.length
      );
    } else {
      // Si no hay coincidencias, mostrar todas las posiciones disponibles para feria
      console.log(
        'No se encontraron coincidencias, mostrando todas las posiciones disponibles:',
        availablePositions.length
      );
      result = availablePositions;
    }

    // Ordenar alfabéticamente de A a Z por nombre
    return result.sort((a, b) => {
      const nameA = a.name.toLowerCase().trim();
      const nameB = b.name.toLowerCase().trim();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  });

  public applicationForm: FormGroup = this.fb.group({
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone_number: ['', [Validators.required]],
    residence: ['', [Validators.required]],
    currently_working: [false],
    salary_expectation: [null],
    position_ids: [[], [this.atLeastOneValidator]], // Array de IDs, al menos uno requerido
    additional_info: [''],
    resume: [null, [Validators.required]], // Requerido
  });

  // Validador personalizado para asegurar que se seleccione al menos una posición
  private atLeastOneValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value = control.value;
    if (!value || !Array.isArray(value) || value.length === 0) {
      return { required: true };
    }
    return null;
  }

  constructor() {
    // Cargar posiciones inmediatamente
    this.positionsStore.reloadItems();

    // Cargar el estado de la feria y fecha de entrevistas desde settings
    effect(() => {
      const settings = this.jobFairSettingsApi.value();
      if (settings && settings.length > 0) {
        const enabledSetting = settings.find(
          (s) => s.key === 'job_fair_enabled'
        );
        if (enabledSetting) {
          this.jobFairEnabled.set(enabledSetting.value === 'true');
        } else {
          // Por defecto, si no existe el setting, asumir que está activa
          this.jobFairEnabled.set(true);
        }

        // Cargar rango de fechas de la feria
        const startDateSetting = settings.find(
          (s) => s.key === 'job_fair_start_date'
        );
        const endDateSetting = settings.find(
          (s) => s.key === 'job_fair_end_date'
        );

        if (startDateSetting && startDateSetting.value) {
          const date = this.parseLocalDateString(startDateSetting.value);
          if (date && !isNaN(date.getTime())) {
            this.jobFairStartDate.set(date);
          }
        }

        if (endDateSetting && endDateSetting.value) {
          const date = this.parseLocalDateString(endDateSetting.value);
          if (date && !isNaN(date.getTime())) {
            this.jobFairEndDate.set(date);
          }
        }
      } else {
        // Por defecto, si no existe el setting, asumir que está activa
        this.jobFairEnabled.set(true);
      }
    });
  }

  ngOnInit() {
    // Asegurar que las posiciones se carguen al inicializar
    // Esperar un momento para que el store se inicialice
    setTimeout(() => {
      if (this.positionsStore.entities().length === 0) {
        console.log('Cargando posiciones desde ngOnInit...');
        this.positionsStore.reloadItems();
      } else {
        console.log(
          'Posiciones ya cargadas:',
          this.positionsStore.entities().length
        );
      }
    }, 100);
  }

  onFileSelect(event: any) {
    const file = event.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(file.type)) {
        this.messageService.add({
          severity: 'error',
          summary: 'Archivo inválido',
          detail: 'Solo se permiten archivos PDF, DOC o DOCX',
        });
        return;
      }

      // Validar tamaño (5MB máximo)
      if (file.size > 5000000) {
        this.messageService.add({
          severity: 'error',
          summary: 'Archivo muy grande',
          detail: 'El archivo no debe exceder 5MB',
        });
        return;
      }

      this.selectedFile.set(file);
      this.applicationForm.patchValue({ resume: file });
    }
  }

  onFileClear() {
    this.selectedFile.set(null);
    this.applicationForm.patchValue({ resume: null });
  }

  onPhoneFocus(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value || '';
    // Si el campo está vacío, agregar el prefijo (+507)
    if (!value || value.trim() === '') {
      input.value = '(+507) ';
      this.applicationForm.patchValue({ phone_number: '(+507) ' });
    }
  }

  formatPhoneNumber(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value || '';

    // Remover todo excepto números
    const numbers = value.replace(/\D/g, '');

    // Si empieza con 507, removerlo porque ya está en el prefijo
    let cleanNumbers = numbers;
    if (numbers.startsWith('507')) {
      cleanNumbers = numbers.substring(3);
    }

    // Limitar a 8 dígitos (formato panameño)
    if (cleanNumbers.length > 8) {
      cleanNumbers = cleanNumbers.substring(0, 8);
    }

    // Formatear: (+507) XXXX-XXXX
    let formatted = '(+507) ';
    if (cleanNumbers.length > 0) {
      if (cleanNumbers.length <= 4) {
        formatted += cleanNumbers;
      } else {
        formatted +=
          cleanNumbers.substring(0, 4) + '-' + cleanNumbers.substring(4);
      }
    }

    // Actualizar el valor del input y del formulario
    input.value = formatted;
    this.applicationForm.patchValue({ phone_number: formatted });

    // Mover el cursor al final
    setTimeout(() => {
      input.setSelectionRange(formatted.length, formatted.length);
    }, 0);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatInterviewDate(date: Date): string {
    // Asegurar que la fecha se formatee usando componentes locales
    const localDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Panama', // Forzar zona horaria de Panamá
    };
    return localDate.toLocaleDateString('es-PA', options);
  }

  /**
   * Verifica si ya existe una aplicación con el mismo email o teléfono
   */
  async checkDuplicateApplication(
    email: string,
    phoneNumber: string
  ): Promise<{
    isDuplicate: boolean;
    message: string;
  }> {
    try {
      // Limpiar el teléfono para comparación (remover espacios, guiones, paréntesis)
      const cleanPhone = phoneNumber.replace(/\D/g, '').replace(/^507/, '');

      // Verificar por email
      const emailCheck = await firstValueFrom(
        this.http.get<any[]>(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_applications`,
          {
            params: {
              select: 'id,email,phone_number',
              email: `eq.${email}`,
            },
          }
        )
      );

      if (emailCheck && emailCheck.length > 0) {
        return {
          isDuplicate: true,
          message: `Ya existe una aplicación registrada con el correo electrónico "${email}". Por favor verifica tu información o contacta con Recursos Humanos si crees que esto es un error.`,
        };
      }

      // Verificar por teléfono (comparar números limpios)
      const phoneCheck = await firstValueFrom(
        this.http.get<any[]>(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_applications`,
          {
            params: {
              select: 'id,email,phone_number',
            },
          }
        )
      );

      if (phoneCheck && phoneCheck.length > 0) {
        // Comparar números de teléfono limpiados
        const duplicateByPhone = phoneCheck.find((app) => {
          if (!app.phone_number) return false;
          const appCleanPhone = app.phone_number
            .replace(/\D/g, '')
            .replace(/^507/, '');
          return appCleanPhone === cleanPhone;
        });

        if (duplicateByPhone) {
          return {
            isDuplicate: true,
            message: `Ya existe una aplicación registrada con el número de teléfono "${phoneNumber}". Por favor verifica tu información o contacta con Recursos Humanos si crees que esto es un error.`,
          };
        }
      }

      return { isDuplicate: false, message: '' };
    } catch (error: any) {
      console.error('Error verificando duplicados:', error);
      // Si hay error en la verificación, permitir continuar pero mostrar advertencia
      return { isDuplicate: false, message: '' };
    }
  }

  async onSubmit() {
    // Verificar que la feria esté activa
    if (!this.jobFairEnabled()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Feria Cerrada',
        detail:
          'La Feria de Empleo se encuentra temporalmente cerrada. Por favor intenta nuevamente más tarde.',
      });
      return;
    }

    if (this.applicationForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    // Verificar duplicados antes de proceder
    const email = this.applicationForm.value.email?.trim();
    const phoneNumber = this.applicationForm.value.phone_number?.trim();

    if (email || phoneNumber) {
      const duplicateCheck = await this.checkDuplicateApplication(
        email || '',
        phoneNumber || ''
      );

      if (duplicateCheck.isDuplicate) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Aplicación duplicada',
          detail: duplicateCheck.message,
        });
        return;
      }
    }

    this.isSubmitting.set(true);

    // 1. Subir archivo a Supabase Storage (si existe)
    let resumeUrl: string | null = null;
    let resumeFilename: string | null = null;

    if (this.selectedFile()) {
      try {
        const resumeResult = await this.uploadResume(this.selectedFile()!);
        resumeUrl = resumeResult.url;
        resumeFilename = resumeResult.path.split('/').pop() || null;
      } catch (uploadError: any) {
        console.error('Error uploading resume:', uploadError);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al subir CV',
          detail:
            'No se pudo subir tu hoja de vida. Por favor intenta nuevamente.',
        });
        this.isSubmitting.set(false);
        return;
      }
    }

    // 2. Obtener IDs y nombres de las posiciones seleccionadas
    const positionIds = this.applicationForm.value.position_ids || [];
    const selectedPositions = this.availablePositions().filter((p) =>
      positionIds.includes(p.id)
    );
    const positionNames = selectedPositions.map((p) => p.name).join(', ');
    // Mantener position_id para compatibilidad (primera posición seleccionada)
    const firstPositionId = positionIds.length > 0 ? positionIds[0] : null;

    // 3. Crear aplicación en la base de datos
    // Usar la misma lógica que el formulario de incapacidades: confiar en el interceptor
    const applicationData = {
      first_name: this.applicationForm.value.first_name,
      last_name: this.applicationForm.value.last_name,
      email: this.applicationForm.value.email,
      phone_number: this.applicationForm.value.phone_number,
      province: this.applicationForm.value.residence || null,
      corregimiento: null,
      currently_working: this.applicationForm.value.currently_working || false,
      salary_expectation: this.applicationForm.value.salary_expectation || null,
      position_id: firstPositionId, // Mantener por compatibilidad
      position_ids: positionIds, // Array de IDs de posiciones
      position_name: positionNames, // Nombres separados por coma
      resume_url: resumeUrl,
      resume_filename: resumeFilename,
      additional_info: this.applicationForm.value.additional_info || null,
      status: 'pending',
    };

    // Usar .subscribe() directamente como en uploadDisability() - confiar en el interceptor
    // NO pasar headers explícitos, el interceptor los agregará automáticamente
    console.log('📤 Enviando aplicación:', applicationData);
    console.log(
      '🔗 URL:',
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_applications`
    );

    this.http
      .post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_applications`,
        applicationData
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          console.log('✅ Aplicación creada exitosamente:', response);

          // 4. Enviar notificaciones (opcional, puede fallar sin afectar el éxito)
          this.sendNotifications(applicationData).catch((err) => {
            console.warn('Error enviando notificaciones:', err);
          });

          this.isSuccess.set(true);
          this.messageService.add({
            severity: 'success',
            summary: '¡Éxito!',
            detail: 'Tu aplicación ha sido enviada correctamente',
          });
          this.isSubmitting.set(false);
        },
        error: (error: any) => {
          console.error('❌ Error submitting application:', error);
          console.error('❌ Error status:', error?.status);
          console.error('❌ Error message:', error?.message);
          console.error('❌ Error error:', error?.error);
          console.error('❌ Error completo:', JSON.stringify(error, null, 2));

          this.isSuccess.set(false);

          let errorMessage =
            'Hubo un error al enviar tu aplicación. Por favor intenta nuevamente.';

          if (error?.status === 401) {
            errorMessage =
              'Error de autenticación (401). Esto puede indicar que las políticas RLS no están configuradas correctamente. Por favor ejecuta el script SQL: database/migrations/recreate-job-applications-table.sql';
          } else if (error?.status === 400) {
            // Error 400 puede ser por columnas faltantes en la base de datos
            const errorMsg = error?.error?.message || '';
            if (
              errorMsg.includes('Could not find') &&
              (errorMsg.includes('column') ||
                errorMsg.includes('corregimiento') ||
                errorMsg.includes('province'))
            ) {
              errorMessage =
                'Error: Faltan columnas en la base de datos. Por favor ejecuta la migración SQL: database/migrations/add-fields-to-job-applications.sql en el SQL Editor de Supabase para agregar los campos: province, corregimiento, currently_working, salary_expectation';
            } else {
              errorMessage =
                error?.error?.message || error?.message || errorMessage;
            }
          } else if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.message) {
            errorMessage = error.message;
          } else if (error?.error?.error) {
            errorMessage = error.error.error;
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
          });
          this.isSubmitting.set(false);
        },
      });
  }

  private async uploadResume(
    file: File
  ): Promise<{ url: string; path: string }> {
    const timestamp = Date.now();
    // Mejorar sanitización: remover caracteres especiales y espacios, mantener solo alfanuméricos, guiones y puntos
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_') // Reemplazar múltiples guiones bajos por uno solo
      .replace(/^_+|_+$/g, '') // Remover guiones bajos al inicio y final
      .replace(/ /g, '_'); // Reemplazar espacios por guiones bajos
    const fileName = `${timestamp}_${sanitizedName}`;
    const filePath = `job-applications/${fileName}`;

    try {
      // Priorizar Service Role Key para bypass RLS, sino usar API Key pública
      // El Service Role Key bypassa todas las políticas RLS
      const serviceRoleKey = process.env['ENV_SUPABASE_SERVICE_ROLE_KEY'];
      const apiKey = process.env['ENV_SUPABASE_ANON_KEY'] || process.env['ENV_SUPABASE_API_KEY'] || '';
      const storageKey = serviceRoleKey || apiKey;

      if (!storageKey) {
        throw new Error('No se encontró ninguna clave de Supabase configurada');
      }

      // Upload to Supabase Storage using REST API
      // Si usamos Service Role Key, bypassa RLS automáticamente
      // Si usamos API Key pública, necesita que el bucket sea público y tenga políticas RLS correctas
      await firstValueFrom(
        this.http.post(
          `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/job-applications/${fileName}`,
          file, // Enviar el archivo directamente como binario
          {
            headers: {
              apikey: storageKey,
              Authorization: `Bearer ${storageKey}`,
              'Content-Type': file.type || 'application/octet-stream',
              'x-upsert': 'true', // Permite sobrescribir si el archivo ya existe
            },
          }
        )
      );

      // Get public URL for the uploaded file (mismo formato que incapacidades)
      const publicUrl = `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/public/job-applications/${fileName}`;

      return {
        url: publicUrl,
        path: filePath,
      };
    } catch (uploadError: any) {
      // Usar el mismo manejo de errores que el módulo de incapacidades
      console.error('Error uploading file to storage:', uploadError);
      const errorDetail =
        uploadError?.error?.message ||
        uploadError?.error?.error ||
        uploadError?.message ||
        'No se pudo subir el archivo. Verifica que el bucket existe y tiene las políticas correctas.';
      throw new Error(errorDetail);
    }
  }

  private async sendNotifications(applicationData: any): Promise<void> {
    // 1. Enviar email de confirmación al candidato
    const candidateEmail = applicationData.email;
    const candidateName = `${applicationData.first_name} ${applicationData.last_name}`;

    const emailSubject =
      'Confirmación de recepción – Feria de Empleo Black Dog';

    // Obtener la URL base de la aplicación para el logo
    const appUrl = process.env['ENV_APP_URL'] || window.location.origin;
    const logoUrl = `${appUrl}/images/blackdog.png`;

    // Plantilla HTML del email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1a1a1a; padding: 30px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${logoUrl}" alt="Black Dog Logo" style="max-width: 150px; height: auto;">
          </div>
          
          <h2 style="color: #FBBF24; margin-top: 0; margin-bottom: 20px;">
            Confirmación de recepción – Feria de Empleo Black Dog
          </h2>
          
          <p style="color: #e5e7eb; margin-bottom: 15px;">
            Estimado/a <strong>${candidateName}</strong>,
          </p>
          
          <p style="color: #e5e7eb; margin-bottom: 15px;">
            Gracias por postular a la Feria de Trabajo de Black Dog. Hemos recibido su información correctamente y será evaluada por nuestro equipo de Reclutamiento.
          </p>
          
          <p style="color: #e5e7eb; margin-bottom: 15px;">
            En caso de cumplir con los requisitos del puesto, nos estaremos comunicando con usted para coordinar los siguientes pasos del proceso.
          </p>
          
          <p style="color: #e5e7eb; margin-bottom: 15px;">
            Agradecemos su interés en formar parte de Black Dog y le deseamos el mayor de los éxitos.
          </p>
          
          <p style="color: #e5e7eb; margin-top: 30px; margin-bottom: 5px;">
            Atentamente,
          </p>
          <p style="color: #FBBF24; font-weight: bold; margin-top: 5px;">
            Equipo de Reclutamiento<br>
            Black Dog
          </p>
        </div>
      </body>
      </html>
    `;

    // Versión texto plano del email
    const emailText = `Confirmación de recepción – Feria de Empleo Black Dog

Estimado/a ${candidateName},

Gracias por postular a la Feria de Trabajo de Black Dog. Hemos recibido su información correctamente y será evaluada por nuestro equipo de Reclutamiento.

En caso de cumplir con los requisitos del puesto, nos estaremos comunicando con usted para coordinar los siguientes pasos del proceso.

Agradecemos su interés en formar parte de Black Dog y le deseamos el mayor de los éxitos.

Atentamente,

Equipo de Reclutamiento
Black Dog`;

    try {
      await firstValueFrom(
        this.emailService.sendEmail({
          to: candidateEmail,
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
          fromEmail: undefined, // Usará el correo noreply configurado en el servidor
          fromName: 'Black Dog - Feria de Empleo', // Nombre personalizado para la feria
        })
      );
      console.log(
        '✅ Email de confirmación enviado al candidato:',
        candidateEmail
      );
    } catch (error: any) {
      console.error('❌ Error enviando email de confirmación:', error);
      // No fallar el proceso completo si el email falla
      // El formulario ya se guardó en la BD, solo falló la notificación
    }

    // 2. (Opcional) Enviar notificación interna a RRHH
    // Esto se puede mantener como estaba o también enviar por email
    const recipients = [
      'lia@blackdogpanama.com',
      'mercadeo@blackdogpanama.com',
    ];

    const internalMessage = `Nueva aplicación de trabajo recibida:

Nombre: ${applicationData.first_name} ${applicationData.last_name}
Email: ${applicationData.email}
Teléfono: ${applicationData.phone_number}
Vacante: ${applicationData.position_name}
Fecha: ${new Date().toLocaleString('es-PA')}

Revisa la aplicación en el sistema de gestión.`;

    // Por ahora mantener el log, se puede implementar email interno después
    console.log('Notificación interna:', internalMessage);
    // TODO: Opcional - Enviar email interno a RRHH también
  }

  onCancel() {
    this.router.navigate(['/login']);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  // Parsear string YYYY-MM-DD a Date en zona horaria local (no UTC)
  private parseLocalDateString(dateString: string): Date | null {
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
    const day = parseInt(parts[2], 10);
    
    // Crear fecha en hora local (no UTC)
    return new Date(year, month, day);
  }
}
