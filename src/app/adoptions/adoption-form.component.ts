import { Component, inject, signal, OnInit, AfterViewInit, effect } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { Button } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PetsStore } from '../stores/pets.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { AdoptionApplication } from '../models';
import { AuthWrapperService } from '../auth/auth-wrapper.service';

@Component({
  selector: 'pt-adoption-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    Button,
    InputTextModule,
    Textarea,
    CheckboxModule,
    DropdownModule,
    DialogModule,
    TagModule,
    ToastModule,
  ],
  template: `
    <p-toast />
    <div class="adoption-form-container">
      <!-- Hero Header -->
      <div class="form-hero">
        <div class="hero-content">
          <div class="hero-icon">🐾</div>
          <h1 class="hero-title">{{ isEditMode() ? 'Editar Solicitud de Adopción' : 'Solicitud de Adopción' }}</h1>
          @if (pet()) {
          <div class="pet-info-badge">
            <span class="pet-emoji">{{ pet()!.species === 'dog' ? '🐕' : pet()!.species === 'cat' ? '🐈' : '🐾' }}</span>
            <span class="pet-name">{{ pet()!.name }}</span>
          </div>
          }
        </div>
        <div class="hero-decoration"></div>
      </div>

      <!-- Form Card -->
      <div class="form-card">
        @if (pet()) {
        <form [formGroup]="adoptionForm" (ngSubmit)="onSubmit()">
          <!-- Sección 1: Información Personal -->
          <div class="form-section-card">
            <div class="section-header">
              <div class="section-icon">👤</div>
              <h3>Información Personal</h3>
            </div>
            <div class="form-grid">
              <div class="form-field">
                <label>
                  <span class="label-icon">📝</span>
                  Nombre Completo *
                </label>
                <input type="text" pInputText formControlName="applicant_name" placeholder="Tu nombre completo" />
                @if (adoptionForm.get('applicant_name')?.invalid && adoptionForm.get('applicant_name')?.touched) {
                <small class="error">El nombre es requerido</small>
                }
              </div>
              <div class="form-field">
                <label>
                  <span class="label-icon">📧</span>
                  Email *
                </label>
                <input type="email" pInputText formControlName="applicant_email" placeholder="tu@email.com" />
                @if (adoptionForm.get('applicant_email')?.invalid && adoptionForm.get('applicant_email')?.touched) {
                <small class="error">Email inválido</small>
                }
              </div>
              <div class="form-field">
                <label>
                  <span class="label-icon">📱</span>
                  Teléfono *
                </label>
                <input type="tel" pInputText formControlName="applicant_phone" placeholder="+507 6123-4567" />
                @if (adoptionForm.get('applicant_phone')?.invalid && adoptionForm.get('applicant_phone')?.touched) {
                <small class="error">El teléfono es requerido</small>
                }
              </div>
              <div class="form-field">
                <label>
                  <span class="label-icon">🆔</span>
                  Cédula
                </label>
                <input type="text" pInputText formControlName="applicant_document_id" placeholder="Opcional" />
              </div>
            </div>
          </div>

          <!-- Sección 2: Dirección -->
          <div class="form-section-card">
            <div class="section-header">
              <div class="section-icon">📍</div>
              <h3>Dirección</h3>
            </div>
            <div class="form-field">
              <label>
                <span class="label-icon">🏠</span>
                Dirección Completa *
              </label>
              <textarea
                pTextarea
                formControlName="applicant_address"
                rows="3"
                placeholder="Calle, número, barrio, ciudad..."
              ></textarea>
              @if (adoptionForm.get('applicant_address')?.invalid && adoptionForm.get('applicant_address')?.touched) {
              <small class="error">La dirección es requerida</small>
              }
            </div>
          </div>

          <!-- Sección 3: Información sobre el Hogar -->
          <div class="form-section-card">
            <div class="section-header">
              <div class="section-icon">🏡</div>
              <h3>Información sobre el Hogar</h3>
            </div>
            <div class="form-field">
              <label>
                <span class="label-icon">💭</span>
                Motivo de Adopción
              </label>
              <textarea
                pTextarea
                formControlName="reason_for_adoption"
                rows="3"
                placeholder="Cuéntanos por qué quieres adoptar esta mascota..."
              ></textarea>
            </div>
            <div class="form-field">
              <label>
                <span class="label-icon">🏘️</span>
                Situación de Vivienda
              </label>
              <p-dropdown
                [options]="livingSituationOptions"
                formControlName="living_situation"
                placeholder="Seleccione..."
              />
            </div>
            <div class="form-field checkbox-field">
              <p-checkbox
                formControlName="has_other_pets"
                binary="true"
                inputId="has_other_pets"
              />
              <label for="has_other_pets">
                <span class="label-icon">🐾</span>
                ¿Tiene otras mascotas?
              </label>
            </div>
            @if (adoptionForm.get('has_other_pets')?.value) {
            <div class="form-field">
              <label>
                <span class="label-icon">📋</span>
                Información sobre otras mascotas
              </label>
              <textarea
                pTextarea
                formControlName="other_pets_info"
                rows="2"
                placeholder="Describe las mascotas que tienes..."
              ></textarea>
            </div>
            }
            <div class="form-field checkbox-field">
              <p-checkbox
                formControlName="has_children"
                binary="true"
                inputId="has_children"
              />
              <label for="has_children">
                <span class="label-icon">👶</span>
                ¿Tiene niños?
              </label>
            </div>
            @if (adoptionForm.get('has_children')?.value) {
            <div class="form-field">
              <label>
                <span class="label-icon">📋</span>
                Información sobre los niños
              </label>
              <textarea
                pTextarea
                formControlName="children_info"
                rows="2"
                placeholder="Edades y cantidad de niños..."
              ></textarea>
            </div>
            }
          </div>

          <!-- Botones de Acción -->
          <div class="form-actions">
            <p-button
              label="Cancelar"
              severity="secondary"
              icon="pi pi-times"
              (onClick)="goBack()"
            />
            <p-button
              [label]="isEditMode() ? 'Actualizar Solicitud' : 'Enviar Solicitud'"
              type="submit"
              [icon]="isEditMode() ? 'pi pi-check' : 'pi pi-send'"
              [disabled]="adoptionForm.invalid || isSubmitting()"
              [loading]="isSubmitting()"
              [style]="{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                border: 'none',
                color: '#000000',
                fontWeight: 'bold',
                padding: '0.75rem 2rem',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)'
              }"
            />
          </div>
        </form>
        } @else {
        <div class="loading-state">
          <div class="loading-spinner">
            <i class="pi pi-spin pi-spinner"></i>
          </div>
          <p>Cargando información de la mascota...</p>
        </div>
        }
      </div>
    </div>

    <!-- Diálogo de Solicitud Existente -->
    <p-dialog
      [(visible)]="showExistingApplicationDialog()"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: '500px' }"
      header="Solicitud Existente"
    >
      @if (existingApplication()) {
        <div class="existing-application-dialog">
          <p class="dialog-message">
            <strong>Ya tienes una solicitud para esta mascota:</strong>
          </p>
          <div class="application-info">
            <div class="info-row">
              <span class="info-label">Estado:</span>
              <p-tag 
                [value]="getStatusLabel(existingApplication()!.status)"
                [severity]="getStatusSeverity(existingApplication()!.status)"
              />
            </div>
            <div class="info-row">
              <span class="info-label">Fecha:</span>
              <span class="info-value">{{ formatDate(existingApplication()!.created_at) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mascota:</span>
              <span class="info-value">{{ pet()?.name || 'N/A' }}</span>
            </div>
          </div>
          <div class="dialog-actions">
            <p-button
              label="Ver mi solicitud"
              icon="pi pi-user"
              (onClick)="goToMyApplications()"
              [style]="{
                background: '#fbbf24',
                border: 'none',
                color: '#000000',
                fontWeight: 'bold',
                marginRight: '0.5rem'
              }"
            />
            <p-button
              label="Ver mascota"
              icon="pi pi-eye"
              severity="secondary"
              (onClick)="viewPetFromDialog()"
            />
          </div>
        </div>
      }
    </p-dialog>
  `,
  styles: [
    `
      .adoption-form-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
        background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 20%);
        min-height: 100vh;
      }

      /* Hero Header */
      .form-hero {
        position: relative;
        background: linear-gradient(135deg, #000000 0%, #374151 50%, #000000 100%);
        border-radius: 1.5rem;
        padding: 3rem 2rem;
        margin-bottom: 2rem;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        animation: fadeInDown 0.6s ease-out;
      }

      .form-hero::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -20%;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 70%);
        border-radius: 50%;
        animation: pulse 4s ease-in-out infinite;
      }

      .form-hero::after {
        content: '';
        position: absolute;
        bottom: -30%;
        left: -10%;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%);
        border-radius: 50%;
        animation: pulse 5s ease-in-out infinite;
      }

      .hero-content {
        position: relative;
        z-index: 1;
        text-align: center;
      }

      .hero-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: bounce 2s ease-in-out infinite;
        display: inline-block;
      }

      .hero-title {
        color: #fbbf24;
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0 0 1rem 0;
        text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
        letter-spacing: 0.05em;
      }

      .pet-info-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        background: rgba(251, 191, 36, 0.2);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(251, 191, 36, 0.4);
        border-radius: 2rem;
        padding: 0.75rem 1.5rem;
        margin-top: 1rem;
      }

      .pet-emoji {
        font-size: 1.5rem;
      }

      .pet-name {
        color: #fbbf24;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .hero-decoration {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%);
        animation: shimmer 3s linear infinite;
      }

      /* Form Card */
      .form-card {
        background: #ffffff;
        border-radius: 1.5rem;
        border: 1px solid #e5e7eb;
        padding: 2.5rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        animation: fadeInUp 0.6s ease-out 0.2s both;
      }

      /* Section Cards */
      .form-section-card {
        background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);
        border: 2px solid #e5e7eb;
        border-radius: 1rem;
        padding: 2rem;
        margin-bottom: 2rem;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .form-section-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(to bottom, #fbbf24 0%, #f59e0b 100%);
        transform: scaleY(0);
        transition: transform 0.3s ease;
      }

      .form-section-card:hover {
        border-color: #fbbf24;
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.15);
        transform: translateY(-2px);
      }

      .form-section-card:hover::before {
        transform: scaleY(1);
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .section-icon {
        font-size: 2rem;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
      }

      .section-header h3 {
        color: #000000;
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }

      .form-field label {
        color: #000000;
        font-weight: 600;
        font-size: 0.9375rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .label-icon {
        font-size: 1.125rem;
      }

      .checkbox-field {
        flex-direction: row;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        transition: all 0.3s ease;
      }

      .checkbox-field:hover {
        background: #f3f4f6;
        border-color: #fbbf24;
      }

      .checkbox-field label {
        font-weight: 600;
        color: #000000;
        cursor: pointer;
        margin: 0;
      }

      .error {
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .error::before {
        content: '⚠️';
        font-size: 0.875rem;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 2px solid #e5e7eb;
      }

      .loading-state {
        text-align: center;
        padding: 4rem 2rem;
        color: #6b7280;
      }

      .loading-spinner {
        font-size: 3rem;
        color: #fbbf24;
        margin-bottom: 1rem;
      }

      /* Animations */
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 0.3;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(1.1);
        }
      }

      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }

      /* Estilos para inputs y textareas */
      ::ng-deep .p-inputtext,
      ::ng-deep .p-textarea {
        background: #ffffff;
        border: 2px solid #d1d5db;
        color: #000000;
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
        transition: all 0.3s ease;
      }

      ::ng-deep .p-inputtext:hover,
      ::ng-deep .p-textarea:hover {
        border-color: #9ca3af;
      }

      ::ng-deep .p-inputtext:enabled:focus,
      ::ng-deep .p-textarea:enabled:focus {
        border-color: #fbbf24;
        box-shadow: 0 0 0 0.2rem rgba(251, 191, 36, 0.2);
        outline: none;
      }

      /* Estilos para dropdowns */
      ::ng-deep .p-dropdown {
        background: #ffffff;
        border: 2px solid #d1d5db;
        color: #000000;
        border-radius: 0.5rem;
        transition: all 0.3s ease;
      }

      ::ng-deep .p-dropdown:not(.p-disabled):hover {
        border-color: #9ca3af;
      }

      ::ng-deep .p-dropdown:not(.p-disabled).p-focus {
        border-color: #fbbf24;
        box-shadow: 0 0 0 0.2rem rgba(251, 191, 36, 0.2);
      }

      /* Estilos para multiselect */
      ::ng-deep .p-multiselect {
        background: #ffffff;
        border: 2px solid #d1d5db;
        color: #000000;
        border-radius: 0.5rem;
        transition: all 0.3s ease;
      }

      ::ng-deep .p-multiselect:not(.p-disabled):hover {
        border-color: #9ca3af;
      }

      ::ng-deep .p-multiselect:not(.p-disabled).p-focus {
        border-color: #fbbf24;
        box-shadow: 0 0 0 0.2rem rgba(251, 191, 36, 0.2);
      }

      /* Estilos para checkbox */
      ::ng-deep .p-checkbox .p-checkbox-box {
        border: 2px solid #d1d5db;
        background: #ffffff;
        border-radius: 0.25rem;
        transition: all 0.3s ease;
      }

      ::ng-deep .p-checkbox .p-checkbox-box.p-highlight {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        border-color: #fbbf24;
      }

      /* Estilos para botones */
      ::ng-deep .form-actions p-button button {
        transition: all 0.3s ease !important;
        border-radius: 0.5rem !important;
      }

      ::ng-deep .form-actions p-button[style*='gradient'] button:hover:not(:disabled) {
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(251, 191, 36, 0.5) !important;
      }

      ::ng-deep .form-actions p-button[severity='secondary'] button {
        background: #e5e7eb !important;
        border: none !important;
        color: #374151 !important;
      }

      ::ng-deep .form-actions p-button[severity='secondary'] button:hover:not(:disabled) {
        background: #d1d5db !important;
        color: #000000 !important;
        transform: translateY(-2px) !important;
      }

      /* Estilos para el diálogo de solicitud existente */
      .existing-application-dialog {
        padding: 1rem 0;
      }

      .dialog-message {
        margin-bottom: 1.5rem;
        color: #374151;
        font-size: 1rem;
        line-height: 1.6;
      }

      .dialog-message strong {
        color: #000000;
        font-weight: 700;
      }

      .application-info {
        background: #f9fafb;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        border: 1px solid #e5e7eb;
      }

      .info-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .info-row:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }

      .info-label {
        font-weight: 600;
        color: #6b7280;
        font-size: 0.9375rem;
      }

      .info-value {
        color: #000000;
        font-weight: 500;
        font-size: 0.9375rem;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
      }

      @media (max-width: 768px) {
        .adoption-form-container {
          padding: 1rem;
        }

        .dialog-actions {
          flex-direction: column;
        }

        .dialog-actions p-button {
          width: 100%;
        }

        .form-hero {
          padding: 2rem 1.5rem;
        }

        .hero-title {
          font-size: 1.75rem;
        }

        .hero-icon {
          font-size: 3rem;
        }

        .form-card {
          padding: 1.5rem;
        }

        .form-section-card {
          padding: 1.5rem;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .form-actions {
          flex-direction: column;
        }

        .form-actions p-button {
          width: 100%;
        }
      }
    `,
  ],
})
export class AdoptionFormComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private viewportScroller = inject(ViewportScroller);
  public petsStore = inject(PetsStore);
  public applicationsStore = inject(AdoptionApplicationsStore);
  private authWrapper = inject(AuthWrapperService);

  public pet = signal<any>(null);
  public isSubmitting = signal(false);
  public existingApplication = signal<AdoptionApplication | null>(null);
  public showExistingApplicationDialog = signal(false);
  private petId: string | null = null;
  private applicationIdToEdit: string | null = null;
  public isEditMode = signal(false);

  constructor() {
    // Escuchar cambios en selectedEntity del store
    effect(() => {
      const selectedPet = this.petsStore.selectedEntity();
      if (selectedPet && this.petId && selectedPet.id === this.petId && (!this.pet() || this.pet()!.id !== selectedPet.id)) {
        this.pet.set(selectedPet);
        // Validar cuando se carga la mascota de forma asíncrona
        setTimeout(() => {
          if (this.applicationIdToEdit) {
            this.loadApplicationForEdit();
          } else {
            this.validatePetAvailability();
            this.validateDuplicateApplication();
          }
        }, 100);
      }
    });
  }

  public livingSituationOptions = [
    { label: 'Casa propia', value: 'casa_propia' },
    { label: 'Casa alquilada', value: 'casa_alquilada' },
    { label: 'Apartamento propio', value: 'apartamento_propio' },
    { label: 'Apartamento alquilado', value: 'apartamento_alquilado' },
    { label: 'Otro', value: 'otro' },
  ];

  public adoptionForm: FormGroup = this.fb.group({
    applicant_name: ['', Validators.required],
    applicant_email: ['', [Validators.required, Validators.email]],
    applicant_phone: ['', Validators.required],
    applicant_address: ['', Validators.required],
    applicant_document_id: [''],
    reason_for_adoption: [''],
    has_other_pets: [false],
    other_pets_info: [''],
    has_children: [false],
    children_info: [''],
    living_situation: [''],
  });

  ngOnInit(): void {
    this.petId = this.route.snapshot.paramMap.get('id');
    // Verificar si estamos en modo edición
    this.applicationIdToEdit = this.route.snapshot.queryParamMap.get('edit');
    
    if (this.petId) {
      const pet = this.petsStore.entities().find((p) => p.id === this.petId);
      if (pet) {
        this.pet.set(pet);
        // Si estamos en modo edición, cargar la solicitud existente
        if (this.applicationIdToEdit) {
          this.loadApplicationForEdit();
        } else {
          // Solo validar si no estamos editando
          this.validatePetAvailability();
          this.validateDuplicateApplication();
        }
      } else {
        // Si no está en el store, seleccionar para cargar los detalles
        this.petsStore.selectEntity(this.petId);
        // El effect se encargará de actualizar pet cuando se cargue
      }
    }
  }

  private loadApplicationForEdit(): void {
    if (!this.applicationIdToEdit) return;

    const application = this.applicationsStore.entities().find(
      app => app.id === this.applicationIdToEdit
    );

    if (application) {
      this.isEditMode.set(true);
      this.existingApplication.set(application);
      // Prellenar el formulario con los datos de la solicitud
      this.adoptionForm.patchValue({
        applicant_name: application.applicant_name,
        applicant_email: application.applicant_email,
        applicant_phone: application.applicant_phone,
        applicant_address: application.applicant_address,
        applicant_document_id: application.applicant_document_id || '',
        reason_for_adoption: application.reason_for_adoption || '',
        has_other_pets: application.has_other_pets || false,
        other_pets_info: application.other_pets_info || '',
        has_children: application.has_children || false,
        children_info: application.children_info || '',
        living_situation: application.living_situation || '',
      });
    } else {
      // Si no se encuentra la solicitud, mostrar error y redirigir
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo encontrar la solicitud para editar'
      });
      setTimeout(() => {
        this.router.navigate(['/adoptions/profile']);
      }, 2000);
    }
  }

  private validatePetAvailability(): void {
    if (this.pet() && !this.pet()!.is_available) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Mascota no disponible',
        detail: 'Esta mascota ya no está disponible para adopción'
      });
      setTimeout(() => {
        this.router.navigate(['/adoptions']);
      }, 2000);
    }
  }

  private validateDuplicateApplication(): void {
    const user = this.authWrapper.currentUser();
    if (!user?.email || !this.pet()) {
      return;
    }

    const existingApp = this.applicationsStore.entities().find(
      app => app.pet_id === this.pet()!.id && 
            app.applicant_email === user.email &&
            app.status !== 'rejected' // Permitir nueva solicitud si fue rechazada
    );

    if (existingApp) {
      // Guardar la solicitud existente y mostrar el diálogo
      this.existingApplication.set(existingApp);
      this.showExistingApplicationDialog.set(true);
    }
  }

  ngAfterViewInit(): void {
    // Scroll al inicio cuando se carga el componente
    setTimeout(() => {
      this.viewportScroller.scrollToPosition([0, 0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  public onSubmit(): void {
    if (this.adoptionForm.invalid || !this.pet()) {
      return;
    }

    // Verificar que la mascota sigue disponible (doble verificación)
    if (!this.pet()!.is_available) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Mascota no disponible',
        detail: 'Esta mascota ya no está disponible para adopción'
      });
      this.router.navigate(['/adoptions']);
      return;
    }

    // Si estamos en modo edición, actualizar la solicitud existente
    if (this.isEditMode() && this.applicationIdToEdit) {
      const existingApp = this.existingApplication();
      if (!existingApp) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo encontrar la solicitud para editar'
        });
        return;
      }

      this.isSubmitting.set(true);
      const formValue = this.adoptionForm.value;
      const updatedApplication: AdoptionApplication = {
        ...existingApp,
        applicant_name: formValue.applicant_name,
        applicant_email: formValue.applicant_email,
        applicant_phone: formValue.applicant_phone,
        applicant_address: formValue.applicant_address,
        applicant_document_id: formValue.applicant_document_id || undefined,
        reason_for_adoption: formValue.reason_for_adoption || undefined,
        has_other_pets: formValue.has_other_pets,
        other_pets_info: formValue.other_pets_info || undefined,
        has_children: formValue.has_children,
        children_info: formValue.children_info || undefined,
        living_situation: formValue.living_situation || undefined,
      };

      this.applicationsStore.editItem(updatedApplication).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Solicitud de adopción actualizada correctamente',
          });
          setTimeout(() => {
            this.router.navigate(['/adoptions/profile']);
          }, 2000);
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
      return;
    }

    // Verificar duplicados solo si no estamos editando (por si acaso cambió algo entre carga y envío)
    const user = this.authWrapper.currentUser();
    if (user?.email) {
      const existingApp = this.applicationsStore.entities().find(
        app => app.pet_id === this.pet()!.id && 
              app.applicant_email === user.email &&
              app.status !== 'rejected' &&
              app.id !== this.applicationIdToEdit // Excluir la solicitud que estamos editando
      );

      if (existingApp) {
        // Mostrar diálogo en lugar de solo toast
        this.existingApplication.set(existingApp);
        this.showExistingApplicationDialog.set(true);
        return;
      }
    }

    this.isSubmitting.set(true);

    const formValue = this.adoptionForm.value;
    const application: Partial<AdoptionApplication> = {
      pet_id: this.pet()!.id,
      applicant_name: formValue.applicant_name,
      applicant_email: formValue.applicant_email,
      applicant_phone: formValue.applicant_phone,
      applicant_address: formValue.applicant_address,
      applicant_document_id: formValue.applicant_document_id || undefined,
      reason_for_adoption: formValue.reason_for_adoption || undefined,
      has_other_pets: formValue.has_other_pets,
      other_pets_info: formValue.other_pets_info || undefined,
      has_children: formValue.has_children,
      children_info: formValue.children_info || undefined,
      living_situation: formValue.living_situation || undefined,
      status: 'pending',
    };

    this.applicationsStore.createItem(application as AdoptionApplication).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Solicitud de adopción enviada correctamente',
        });
        setTimeout(() => {
          this.router.navigate(['/adoptions']);
        }, 2000);
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  public goBack(): void {
    this.router.navigate(['/adoptions']);
  }

  public goToMyApplications(): void {
    this.showExistingApplicationDialog.set(false);
    this.router.navigate(['/adoptions/profile']);
  }

  public viewPetFromDialog(): void {
    this.showExistingApplicationDialog.set(false);
    if (this.pet()) {
      this.router.navigate(['/adoptions/mascota', this.pet()!.id]);
    }
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      completed: 'Completada',
    };
    return labels[status] || status;
  }

  public getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    const severities: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | undefined> = {
      pending: 'warn',
      approved: 'success',
      rejected: 'danger',
      completed: 'info',
    };
    return severities[status] || 'secondary';
  }

  public formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

