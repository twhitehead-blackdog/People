import { , ChangeDetectionStrategy } from '@angular/core';
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
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PetsStore } from '../stores/pets.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { AdoptionApplication } from '../models';
import { AuthWrapperService } from '../auth/auth-wrapper.service';

@Component({
  selector: 'pt-adoption-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    ProgressBarModule,
    ToastModule,
  ],
  template: `
    <p-toast />
    <div class="adoption-form-container">
      <!-- Hero Header -->
      <div class="form-hero">
        <div class="hero-content">
          <div class="hero-icon">ðŸ¾</div>
          <h1 class="hero-title">{{ isEditMode() ? 'Editar Solicitud de AdopciÃ³n' : 'Solicitud de AdopciÃ³n' }}</h1>
          @if (pet()) {
          <div class="pet-info-badge">
            <span class="pet-emoji">{{ pet()!.species === 'dog' ? 'ðŸ•' : pet()!.species === 'cat' ? 'ðŸˆ' : 'ðŸ¾' }}</span>
            <span class="pet-name">{{ pet()!.name }}</span>
          </div>
          }
        </div>
        <div class="hero-decoration"></div>
      </div>

      <!-- Progress Bar and Step Indicators -->
      <div class="wizard-progress-container">
        <div class="progress-bar-wrapper">
          <p-progressBar [value]="progressPercentage()" [showValue]="false" />
          <div class="progress-text">{{ Math.round(progressPercentage()) }}%</div>
        </div>
        <div class="step-indicators">
          @for (step of [1, 2, 3, 4]; track step) {
            <div 
              class="step-indicator"
              [class.completed]="step < currentStep()"
              [class.active]="step === currentStep()"
              [class.pending]="step > currentStep()"
            >
              <div class="step-number">
                @if (step < currentStep()) {
                  âœ“
                } @else {
                  {{ step }}
                }
              </div>
              <div class="step-label">
                @if (step === 1) { Personal }
                @else if (step === 2) { DirecciÃ³n }
                @else if (step === 3) { Hogar }
                @else { Resumen }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Form Card -->
      <div class="form-card">
        @if (pet()) {
        <form [formGroup]="adoptionForm" (ngSubmit)="onSubmit()">
          <!-- Carousel Container -->
          <div class="wizard-carousel">
            <!-- BotÃ³n Cancelar (esquina superior izquierda) -->
            <button 
              class="carousel-arrow carousel-arrow-cancel"
              (click)="goBack()"
              type="button"
              title="Cancelar"
            >
              <i class="pi pi-times"></i>
            </button>

            <!-- Flecha Izquierda -->
            @if (currentStep() > 1) {
              <button 
                class="carousel-arrow carousel-arrow-left"
                (click)="previousStep()"
                type="button"
                title="Paso anterior"
              >
                <i class="pi pi-chevron-left"></i>
              </button>
            }

            <!-- Contenedor de Pasos -->
            <div class="wizard-steps-container">
              <!-- Paso Anterior (si existe) -->
              @if (currentStep() > 1) {
                <div class="wizard-step-preview wizard-step-prev" [class.step-1]="currentStep() === 2" [class.step-2]="currentStep() === 3" [class.step-3]="currentStep() === 4">
                  <div class="step-preview-content">
                    @if (currentStep() === 2) {
                      <div class="step-preview-header">
                        <div class="section-icon">ðŸ‘¤</div>
                        <h4>InformaciÃ³n Personal</h4>
                      </div>
                      <div class="step-preview-info">
                        <p>{{ adoptionForm.get('applicant_name')?.value || 'Sin completar' }}</p>
                        <p>{{ adoptionForm.get('applicant_email')?.value || 'Sin completar' }}</p>
                      </div>
                    } @else if (currentStep() === 3) {
                      <div class="step-preview-header">
                        <div class="section-icon">ðŸ“</div>
                        <h4>DirecciÃ³n</h4>
                      </div>
                      <div class="step-preview-info">
                        <p>{{ adoptionForm.get('applicant_address')?.value || 'Sin completar' }}</p>
                      </div>
                    } @else if (currentStep() === 4) {
                      <div class="step-preview-header">
                        <div class="section-icon">ðŸ¡</div>
                        <h4>InformaciÃ³n del Hogar</h4>
                      </div>
                      <div class="step-preview-info">
                        <p>{{ adoptionForm.get('living_situation')?.value ? getLivingSituationLabel(adoptionForm.get('living_situation')?.value) : 'Sin completar' }}</p>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Paso Actual -->
              <div class="wizard-step-active">
                <!-- Paso 1: InformaciÃ³n Personal -->
                @if (currentStep() === 1) {
                <div class="form-section-card wizard-step">
            <div class="section-header">
              <div class="section-icon">ðŸ‘¤</div>
              <h3>InformaciÃ³n Personal</h3>
            </div>
            <div class="form-grid">
              <div class="form-field">
                <label>
                  <span class="label-icon">ðŸ“</span>
                  Nombre Completo *
                </label>
                <input type="text" pInputText formControlName="applicant_name" placeholder="Tu nombre completo" />
                @if (adoptionForm.get('applicant_name')?.invalid && adoptionForm.get('applicant_name')?.touched) {
                <small class="error">El nombre es requerido</small>
                }
              </div>
              <div class="form-field">
                <label>
                  <span class="label-icon">ðŸ“§</span>
                  Email *
                </label>
                <input type="email" pInputText formControlName="applicant_email" placeholder="tu@email.com" />
                @if (adoptionForm.get('applicant_email')?.invalid && adoptionForm.get('applicant_email')?.touched) {
                <small class="error">Email invÃ¡lido</small>
                }
              </div>
              <div class="form-field">
                <label>
                  <span class="label-icon">ðŸ“±</span>
                  TelÃ©fono *
                </label>
                <input 
                  type="tel" 
                  pInputText 
                  formControlName="applicant_phone" 
                  placeholder="+507 6123-4567"
                  (input)="onPhoneInput($event)"
                  (focus)="onPhoneFocus($event)"
                />
                @if (adoptionForm.get('applicant_phone')?.invalid && adoptionForm.get('applicant_phone')?.touched) {
                <small class="error">El telÃ©fono es requerido</small>
                }
              </div>
              <div class="form-field">
                <label>
                  <span class="label-icon">ðŸ†”</span>
                  CÃ©dula
                </label>
                <input type="text" pInputText formControlName="applicant_document_id" placeholder="Opcional" />
              </div>
            </div>
          </div>
          }

          <!-- Paso 2: DirecciÃ³n -->
          @if (currentStep() === 2) {
          <div class="form-section-card wizard-step">
            <div class="section-header">
              <div class="section-icon">ðŸ“</div>
              <h3>DirecciÃ³n</h3>
            </div>
            <div class="form-field">
              <label>
                <span class="label-icon">ðŸ </span>
                DirecciÃ³n Completa *
              </label>
              <textarea
                pTextarea
                formControlName="applicant_address"
                rows="3"
                placeholder="Calle, nÃºmero, barrio, ciudad..."
              ></textarea>
              @if (adoptionForm.get('applicant_address')?.invalid && adoptionForm.get('applicant_address')?.touched) {
              <small class="error">La direcciÃ³n es requerida</small>
              }
            </div>
          </div>
          }

          <!-- Paso 3: InformaciÃ³n sobre el Hogar -->
          @if (currentStep() === 3) {
          <div class="form-section-card wizard-step">
            <div class="section-header">
              <div class="section-icon">ðŸ¡</div>
              <h3>InformaciÃ³n sobre el Hogar</h3>
            </div>
            <div class="form-field">
              <label>
                <span class="label-icon">ðŸ’­</span>
                Motivo de AdopciÃ³n
              </label>
              <textarea
                pTextarea
                formControlName="reason_for_adoption"
                rows="3"
                placeholder="CuÃ©ntanos por quÃ© quieres adoptar esta mascota..."
              ></textarea>
            </div>
            <div class="form-field">
              <label>
                <span class="label-icon">ðŸ˜ï¸</span>
                SituaciÃ³n de Vivienda
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
                <span class="label-icon">ðŸ¾</span>
                Â¿Tiene otras mascotas?
              </label>
            </div>
            @if (adoptionForm.get('has_other_pets')?.value) {
            <div class="form-field checkbox-child">
              <label>
                <span class="label-icon">ðŸ“‹</span>
                InformaciÃ³n sobre otras mascotas
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
                <span class="label-icon">ðŸ‘¶</span>
                Â¿Tiene niÃ±os?
              </label>
            </div>
            @if (adoptionForm.get('has_children')?.value) {
            <div class="form-field checkbox-child">
              <label>
                <span class="label-icon">ðŸ“‹</span>
                InformaciÃ³n sobre los niÃ±os
              </label>
              <textarea
                pTextarea
                formControlName="children_info"
                rows="2"
                placeholder="Edades y cantidad de niÃ±os..."
              ></textarea>
            </div>
            }
          </div>
          }

          <!-- Paso 4: Resumen/RevisiÃ³n -->
          @if (currentStep() === 4) {
          <div class="summary-section wizard-step">
            <div class="summary-header">
              <div class="section-icon">ðŸ“‹</div>
              <h3>Resumen de tu Solicitud</h3>
              <p class="summary-subtitle">Revisa toda la informaciÃ³n antes de enviar</p>
            </div>

            <!-- InformaciÃ³n de la Mascota -->
            <div class="summary-card">
              <div class="summary-card-header">
                <h4>Mascota</h4>
              </div>
              <div class="summary-content">
                <div class="summary-item">
                  <span class="summary-label">Nombre:</span>
                  <span class="summary-value">{{ pet()?.name }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Especie:</span>
                  <span class="summary-value">{{ pet()?.species === 'dog' ? 'Perro' : pet()?.species === 'cat' ? 'Gato' : 'Otro' }}</span>
                </div>
              </div>
            </div>

            <!-- InformaciÃ³n Personal -->
            <div class="summary-card">
              <div class="summary-card-header">
                <h4>InformaciÃ³n Personal</h4>
                <p-button
                  label="Editar"
                  icon="pi pi-pencil"
                  [text]="true"
                  severity="secondary"
                  (onClick)="goToStep(1)"
                  [style]="{ fontSize: '0.875rem' }"
                />
              </div>
              <div class="summary-content">
                <div class="summary-item">
                  <span class="summary-label">Nombre:</span>
                  <span class="summary-value">{{ adoptionForm.get('applicant_name')?.value || 'N/A' }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Email:</span>
                  <span class="summary-value">{{ adoptionForm.get('applicant_email')?.value || 'N/A' }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">TelÃ©fono:</span>
                  <span class="summary-value">{{ adoptionForm.get('applicant_phone')?.value || 'N/A' }}</span>
                </div>
                @if (adoptionForm.get('applicant_document_id')?.value) {
                <div class="summary-item">
                  <span class="summary-label">CÃ©dula:</span>
                  <span class="summary-value">{{ adoptionForm.get('applicant_document_id')?.value }}</span>
                </div>
                }
              </div>
            </div>

            <!-- DirecciÃ³n -->
            <div class="summary-card">
              <div class="summary-card-header">
                <h4>DirecciÃ³n</h4>
                <p-button
                  label="Editar"
                  icon="pi pi-pencil"
                  [text]="true"
                  severity="secondary"
                  (onClick)="goToStep(2)"
                  [style]="{ fontSize: '0.875rem' }"
                />
              </div>
              <div class="summary-content">
                <div class="summary-item">
                  <span class="summary-label">DirecciÃ³n:</span>
                  <span class="summary-value">{{ adoptionForm.get('applicant_address')?.value || 'N/A' }}</span>
                </div>
              </div>
            </div>

            <!-- InformaciÃ³n del Hogar -->
            <div class="summary-card">
              <div class="summary-card-header">
                <h4>InformaciÃ³n del Hogar</h4>
                <p-button
                  label="Editar"
                  icon="pi pi-pencil"
                  [text]="true"
                  severity="secondary"
                  (onClick)="goToStep(3)"
                  [style]="{ fontSize: '0.875rem' }"
                />
              </div>
              <div class="summary-content">
                @if (adoptionForm.get('reason_for_adoption')?.value) {
                <div class="summary-item">
                  <span class="summary-label">Motivo de AdopciÃ³n:</span>
                  <span class="summary-value">{{ adoptionForm.get('reason_for_adoption')?.value }}</span>
                </div>
                }
                @if (adoptionForm.get('living_situation')?.value) {
                <div class="summary-item">
                  <span class="summary-label">SituaciÃ³n de Vivienda:</span>
                  <span class="summary-value">{{ getLivingSituationLabel(adoptionForm.get('living_situation')?.value) }}</span>
                </div>
                }
                <div class="summary-item">
                  <span class="summary-label">Tiene otras mascotas:</span>
                  <span class="summary-value">{{ adoptionForm.get('has_other_pets')?.value ? 'SÃ­' : 'No' }}</span>
                </div>
                @if (adoptionForm.get('has_other_pets')?.value && adoptionForm.get('other_pets_info')?.value) {
                <div class="summary-item">
                  <span class="summary-label">InformaciÃ³n sobre otras mascotas:</span>
                  <span class="summary-value">{{ adoptionForm.get('other_pets_info')?.value }}</span>
                </div>
                }
                <div class="summary-item">
                  <span class="summary-label">Tiene niÃ±os:</span>
                  <span class="summary-value">{{ adoptionForm.get('has_children')?.value ? 'SÃ­' : 'No' }}</span>
                </div>
                @if (adoptionForm.get('has_children')?.value && adoptionForm.get('children_info')?.value) {
                <div class="summary-item">
                  <span class="summary-label">InformaciÃ³n sobre los niÃ±os:</span>
                  <span class="summary-value">{{ adoptionForm.get('children_info')?.value }}</span>
                </div>
                }
              </div>
            </div>
          </div>
          }
              </div>

              <!-- Paso Siguiente (si existe) -->
              @if (currentStep() < 4) {
                <div class="wizard-step-preview wizard-step-next" [class.step-2]="currentStep() === 1" [class.step-3]="currentStep() === 2" [class.step-4]="currentStep() === 3">
                  <div class="step-preview-content">
                    @if (currentStep() === 1) {
                      <div class="step-preview-header">
                        <div class="section-icon">ðŸ“</div>
                        <h4>DirecciÃ³n</h4>
                      </div>
                      <div class="step-preview-info">
                        <p>Paso siguiente</p>
                      </div>
                    } @else if (currentStep() === 2) {
                      <div class="step-preview-header">
                        <div class="section-icon">ðŸ¡</div>
                        <h4>InformaciÃ³n del Hogar</h4>
                      </div>
                      <div class="step-preview-info">
                        <p>Paso siguiente</p>
                      </div>
                    } @else if (currentStep() === 3) {
                      <div class="step-preview-header">
                        <div class="section-icon">ðŸ“‹</div>
                        <h4>Resumen</h4>
                      </div>
                      <div class="step-preview-info">
                        <p>Revisa tu solicitud</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Flecha Derecha o BotÃ³n de ConfirmaciÃ³n -->
            @if (currentStep() < 4) {
              <button 
                class="carousel-arrow carousel-arrow-right"
                (click)="nextStep()"
                type="button"
                title="Paso siguiente"
              >
                <i class="pi pi-chevron-right"></i>
              </button>
            }
            @if (currentStep() === 4) {
              <button 
                class="carousel-arrow carousel-arrow-confirm"
                type="submit"
                title="Confirmar y enviar solicitud"
                [disabled]="adoptionForm.invalid || isSubmitting()"
              >
                @if (isSubmitting()) {
                  <i class="pi pi-spin pi-spinner"></i>
                } @else {
                  <i class="pi pi-check"></i>
                }
              </button>
            }
          </div>

        </form>
        } @else {
        <div class="loading-state">
          <div class="loading-spinner">
            <i class="pi pi-spin pi-spinner"></i>
          </div>
          <p>Cargando informaciÃ³n de la mascota...</p>
        </div>
        }
      </div>
    </div>

    <!-- DiÃ¡logo de Solicitud Existente -->
    <p-dialog
      [visible]="showExistingApplicationDialog()"
      (visibleChange)="showExistingApplicationDialog.set($event)"
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
        max-width: 1400px;
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
        border-radius: 1.5rem;
        padding: 2.5rem;
        margin-bottom: 2rem;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
        transform: translateY(0);
      }

      .form-section-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 5px;
        height: 100%;
        background: linear-gradient(to bottom, #fbbf24 0%, #f59e0b 100%);
        transform: scaleY(1);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 1.5rem 0 0 1.5rem;
      }

      .form-section-card:hover {
        border-color: #fbbf24;
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 8px 12px -4px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
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
        content: 'âš ï¸';
        font-size: 0.875rem;
      }

      /* Wizard Progress Bar */
      .wizard-progress-container {
        margin: 2rem 0;
        padding: 1.5rem;
        background: #ffffff;
        border-radius: 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .progress-bar-wrapper {
        position: relative;
        margin-bottom: 2rem;
      }

      .progress-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-weight: 700;
        font-size: 0.875rem;
        color: #000000;
        z-index: 10;
      }

      .step-indicators {
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
      }

      .step-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        position: relative;
      }

      .step-indicator:not(:last-child)::after {
        content: '';
        position: absolute;
        top: 20px;
        left: 60%;
        width: 80%;
        height: 2px;
        background: #e5e7eb;
        z-index: 0;
      }

      .step-indicator.completed:not(:last-child)::after {
        background: #fbbf24;
      }

      .step-number {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1rem;
        position: relative;
        z-index: 1;
        transition: all 0.3s ease;
      }

      .step-indicator.completed .step-number {
        background: #fbbf24;
        color: #000000;
      }

      .step-indicator.active .step-number {
        background: #fbbf24;
        color: #000000;
        box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.2);
        transform: scale(1.1);
      }

      .step-indicator.pending .step-number {
        background: #e5e7eb;
        color: #6b7280;
      }

      .step-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #6b7280;
        text-align: center;
      }

      .step-indicator.completed .step-label,
      .step-indicator.active .step-label {
        color: #000000;
      }

      /* Wizard Carousel Container */
      .wizard-carousel {
        position: relative;
        display: block;
        min-height: 600px;
        margin: 2rem auto;
        padding: 0 100px;
        overflow: visible;
        width: 100%;
        max-width: 1200px;
      }

      .wizard-steps-container {
        position: relative;
        width: 100%;
        max-width: 900px;
        min-height: 600px;
        margin: 0 auto;
        perspective: 1500px;
        overflow-y: auto;
        overflow-x: hidden;
      }

      /* Scrollbar personalizado - mÃ¡s discreto */
      .wizard-steps-container::-webkit-scrollbar {
        width: 6px;
      }

      .wizard-steps-container::-webkit-scrollbar-track {
        background: transparent;
      }

      .wizard-steps-container::-webkit-scrollbar-thumb {
        background: rgba(209, 213, 219, 0.3);
        border-radius: 3px;
        transition: background 0.2s ease;
      }

      .wizard-steps-container::-webkit-scrollbar-thumb:hover {
        background: rgba(209, 213, 219, 0.5);
      }

      /* Para Firefox - scrollbar mÃ¡s delgado y transparente */
      .wizard-steps-container {
        scrollbar-width: thin;
        scrollbar-color: rgba(209, 213, 219, 0.3) transparent;
      }

      /* Carousel Arrows */
      .carousel-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        border: 4px solid #ffffff;
        color: #000000;
        font-size: 1.75rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        box-shadow: 0 6px 20px rgba(251, 191, 36, 0.5), 0 0 0 0 rgba(251, 191, 36, 0.4);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .carousel-arrow:hover {
        transform: translateY(-50%) scale(1.15);
        box-shadow: 0 8px 30px rgba(251, 191, 36, 0.7), 0 0 0 8px rgba(251, 191, 36, 0.2);
        background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%);
      }

      .carousel-arrow:active {
        transform: translateY(-50%) scale(1.05);
        box-shadow: 0 4px 15px rgba(251, 191, 36, 0.5);
      }

      .carousel-arrow-left {
        left: 10px;
      }

      .carousel-arrow-right {
        right: 10px;
      }

      .carousel-arrow-cancel {
        top: 20px;
        left: 10px;
        transform: translateY(0);
      }

      .carousel-arrow-cancel:hover {
        transform: scale(1.15);
        box-shadow: 0 8px 30px rgba(251, 191, 36, 0.7), 0 0 0 8px rgba(251, 191, 36, 0.2);
        background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%);
      }

      .carousel-arrow-cancel:active {
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(251, 191, 36, 0.5);
      }

      .carousel-arrow-confirm {
        right: 10px;
      }

      .carousel-arrow-confirm:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .carousel-arrow-confirm:disabled:hover {
        transform: translateY(-50%);
        box-shadow: 0 6px 20px rgba(251, 191, 36, 0.5), 0 0 0 0 rgba(251, 191, 36, 0.4);
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      }

      .carousel-arrow i {
        font-weight: 900;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
      }

      /* Active Step Container - Fixed Position */
      .wizard-step-active {
        position: absolute;
        left: 50%;
        top: 0;
        transform: translateX(-50%);
        z-index: 3;
        width: 100%;
        max-width: 900px;
        opacity: 1;
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Step Preview (Previous/Next) - Fixed Positions */
      .wizard-step-preview {
        position: absolute;
        top: 0;
        width: 75%;
        max-width: 675px;
        opacity: 0.35;
        pointer-events: none;
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1;
      }

      .wizard-step-prev {
        left: 0;
        transform: translateX(-100%) scale(0.8) rotateY(20deg);
      }

      .wizard-step-next {
        right: 0;
        transform: translateX(100%) scale(0.8) rotateY(-20deg);
      }

      .step-preview-content {
        background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);
        border: 2px solid #e5e7eb;
        border-radius: 1.25rem;
        padding: 2rem;
        box-shadow: 0 8px 20px -5px rgba(0, 0, 0, 0.1);
        min-height: 300px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .step-preview-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .step-preview-header .section-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }

      .step-preview-header h4 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #1f2937;
      }

      .step-preview-info {
        color: #6b7280;
        font-size: 0.9375rem;
        line-height: 1.6;
      }

      .step-preview-info p {
        margin: 0.5rem 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Wizard Step Transitions - Pasarela Style */
      .wizard-step {
        position: relative;
        background: #ffffff;
        border-radius: 1.5rem;
        padding: 2.5rem;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
        border: 2px solid #f3f4f6;
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateY(0);
        margin-bottom: 0;
        will-change: transform, opacity;
        min-height: 500px;
      }

      .wizard-step-active .wizard-step {
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 8px 12px -4px rgba(0, 0, 0, 0.15);
        border-color: #fbbf24;
        transform: scale(1);
        min-height: auto;
      }

      /* Summary section (step 4) - dentro del carousel */
      .summary-section {
        margin: 0;
        max-width: 100%;
        width: 100%;
      }

      .wizard-step:hover {
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 8px 12px -4px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
        border-color: #fbbf24;
      }

      .wizard-step::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 5px;
        height: 100%;
        background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
        border-radius: 1.5rem 0 0 1.5rem;
      }


      /* Summary View */
      .summary-section {
        animation: fadeInDown 0.4s ease-out;
      }

      .summary-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .summary-subtitle {
        color: #6b7280;
        font-size: 0.9375rem;
        margin-top: 0.5rem;
      }

      .summary-card {
        background: #f9fafb;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        border: 1px solid #e5e7eb;
        transition: all 0.3s ease;
      }

      .summary-card:hover {
        border-color: #fbbf24;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .summary-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .summary-card-header h4 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: #000000;
      }

      .summary-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid #e5e7eb;
      }

      .summary-item:last-child {
        border-bottom: none;
      }

      .summary-label {
        font-weight: 600;
        color: #6b7280;
        font-size: 0.9375rem;
        min-width: 150px;
      }

      .summary-value {
        color: #000000;
        font-weight: 500;
        font-size: 0.9375rem;
        text-align: right;
        flex: 1;
        word-break: break-word;
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
        border-radius: 0.375rem;
        transition: all 0.3s ease;
        width: 22px;
        height: 22px;
      }

      ::ng-deep .p-checkbox .p-checkbox-box.p-highlight {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        border-color: #fbbf24;
      }

      ::ng-deep .p-checkbox .p-checkbox-box.p-highlight .p-checkbox-icon {
        color: #000000 !important;
        font-weight: 900 !important;
        font-size: 0.875rem !important;
        display: block !important;
        opacity: 1 !important;
      }

      ::ng-deep .p-checkbox .p-checkbox-box .p-checkbox-icon {
        color: #ffffff;
        font-size: 0.875rem;
        font-weight: 900;
        display: block;
      }

      ::ng-deep .p-checkbox .p-checkbox-box:not(.p-highlight) .p-checkbox-icon {
        display: none;
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

      /* Estilos para el diÃ¡logo de solicitud existente */
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

        /* Carousel Responsive */
        .wizard-carousel {
          padding: 0 60px;
          min-height: 500px;
        }

        .carousel-arrow {
          width: 52px;
          height: 52px;
          font-size: 1.5rem;
        }

        .carousel-arrow-left {
          left: 5px;
        }

        .carousel-arrow-right {
          right: 5px;
        }

        .carousel-arrow-cancel {
          top: 15px;
          left: 5px;
        }

        .carousel-arrow-confirm {
          right: 5px;
        }

        .wizard-step-preview {
          width: 70%;
          max-width: 630px;
          opacity: 0.25;
        }

        .wizard-step-prev {
          left: 0;
          transform: translateX(-100%) scale(0.75) rotateY(25deg);
        }

        .wizard-step-next {
          right: 0;
          transform: translateX(100%) scale(0.75) rotateY(-25deg);
        }

        .wizard-step-active {
          max-width: 100%;
        }

        .step-preview-content {
          padding: 1.5rem;
          min-height: 250px;
        }

        .step-preview-header h4 {
          font-size: 1rem;
        }

        .step-preview-info {
          font-size: 0.875rem;
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

  // Wizard state
  public currentStep = signal<number>(1);
  public readonly totalSteps = 4;
  public progressPercentage = computed(() => (this.currentStep() / this.totalSteps) * 100);
  public completedSteps = computed(() => Math.max(0, this.currentStep() - 1));
  
  // Expose Math to template
  public readonly Math = Math;

  constructor() {
    // Escuchar cambios en selectedEntity del store
    effect(() => {
      const selectedPet = this.petsStore.selectedEntity();
      if (selectedPet && this.petId && selectedPet.id === this.petId && (!this.pet() || this.pet()!.id !== selectedPet.id)) {
        this.pet.set(selectedPet);
        // Validar cuando se carga la mascota de forma asÃ­ncrona
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
    // Verificar si estamos en modo ediciÃ³n
    this.applicationIdToEdit = this.route.snapshot.queryParamMap.get('edit');
    
    if (this.petId) {
      const pet = this.petsStore.entities().find((p) => p.id === this.petId);
      if (pet) {
        this.pet.set(pet);
        // Si estamos en modo ediciÃ³n, cargar la solicitud existente
        if (this.applicationIdToEdit) {
          this.loadApplicationForEdit();
        } else {
          // Solo validar si no estamos editando
          this.validatePetAvailability();
          this.validateDuplicateApplication();
        }
      } else {
        // Si no estÃ¡ en el store, seleccionar para cargar los detalles
        this.petsStore.selectEntity(this.petId);
        // El effect se encargarÃ¡ de actualizar pet cuando se cargue
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
        detail: 'Esta mascota ya no estÃ¡ disponible para adopciÃ³n'
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
      // Guardar la solicitud existente y mostrar el diÃ¡logo
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
    // Solo permitir envÃ­o desde el paso de resumen (paso 4)
    if (this.currentStep() !== 4) {
      return;
    }

    if (this.adoptionForm.invalid || !this.pet()) {
      // Si el formulario es invÃ¡lido, validar todo y mostrar errores
      this.markStepAsTouched(1);
      this.markStepAsTouched(2);
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    // Verificar que la mascota sigue disponible (doble verificaciÃ³n)
    if (!this.pet()!.is_available) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Mascota no disponible',
        detail: 'Esta mascota ya no estÃ¡ disponible para adopciÃ³n'
      });
      this.router.navigate(['/adoptions']);
      return;
    }

    // Si estamos en modo ediciÃ³n, actualizar la solicitud existente
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
            summary: 'Ã‰xito',
            detail: 'Solicitud de adopciÃ³n actualizada correctamente',
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

    // Verificar duplicados solo si no estamos editando (por si acaso cambiÃ³ algo entre carga y envÃ­o)
    const user = this.authWrapper.currentUser();
    if (user?.email) {
      const existingApp = this.applicationsStore.entities().find(
        app => app.pet_id === this.pet()!.id && 
              app.applicant_email === user.email &&
              app.status !== 'rejected' &&
              app.id !== this.applicationIdToEdit // Excluir la solicitud que estamos editando
      );

      if (existingApp) {
        // Mostrar diÃ¡logo en lugar de solo toast
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
          summary: 'Ã‰xito',
          detail: 'Solicitud de adopciÃ³n enviada correctamente',
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

  public getLivingSituationLabel(value: string): string {
    const option = this.livingSituationOptions.find(opt => opt.value === value);
    return option?.label || value;
  }

  // Wizard navigation methods
  public nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep() < this.totalSteps) {
        this.currentStep.set(this.currentStep() + 1);
      }
    }
  }

  public previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  public goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  public validateCurrentStep(): boolean {
    const step = this.currentStep();
    this.markStepAsTouched(step);

    switch (step) {
      case 1:
        // Validar InformaciÃ³n Personal
        return this.isStepValid(1);
      case 2:
        // Validar DirecciÃ³n
        return this.isStepValid(2);
      case 3:
        // InformaciÃ³n del Hogar - todos opcionales, siempre vÃ¡lido
        return true;
      case 4:
        // Resumen - validar todo
        return this.adoptionForm.valid;
      default:
        return false;
    }
  }

  public isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        // InformaciÃ³n Personal: nombre, email, telÃ©fono requeridos
        const nameControl = this.adoptionForm.get('applicant_name');
        const emailControl = this.adoptionForm.get('applicant_email');
        const phoneControl = this.adoptionForm.get('applicant_phone');
        return !!(
          nameControl?.valid &&
          emailControl?.valid &&
          phoneControl?.valid
        );
      case 2:
        // DirecciÃ³n: direcciÃ³n requerida
        const addressControl = this.adoptionForm.get('applicant_address');
        return addressControl?.valid ?? false;
      case 3:
        // InformaciÃ³n del Hogar - todos opcionales
        return true;
      default:
        return false;
    }
  }

  public markStepAsTouched(step: number): void {
    switch (step) {
      case 1:
        this.adoptionForm.get('applicant_name')?.markAsTouched();
        this.adoptionForm.get('applicant_email')?.markAsTouched();
        this.adoptionForm.get('applicant_phone')?.markAsTouched();
        break;
      case 2:
        this.adoptionForm.get('applicant_address')?.markAsTouched();
        break;
      case 3:
        // No hay campos requeridos en el paso 3
        break;
    }
  }

  // Phone formatting methods
  public onPhoneFocus(event: any): void {
    const input = event.target as HTMLInputElement;
    const currentValue = this.adoptionForm.get('applicant_phone')?.value || '';
    
    // Si el campo estÃ¡ vacÃ­o, prellenar con +507 
    if (!currentValue || currentValue.trim() === '') {
      this.adoptionForm.get('applicant_phone')?.setValue('+507 ');
      // Mover el cursor al final
      setTimeout(() => {
        input.setSelectionRange(6, 6);
      }, 0);
    }
  }

  public onPhoneInput(event: any): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    
    // Remover todo excepto nÃºmeros y el prefijo +507
    const digits = value.replace(/[^\d+]/g, '');
    
    // Asegurar que empiece con +507
    if (!value.startsWith('+507')) {
      // Si no empieza con +507, agregarlo
      if (digits.startsWith('507')) {
        value = '+507 ' + digits.substring(3);
      } else if (digits.startsWith('+507')) {
        value = '+507 ' + digits.substring(4);
      } else {
        value = '+507 ' + digits;
      }
    } else {
      // Ya tiene +507, solo formatear los dÃ­gitos restantes
      const phoneDigits = digits.substring(4); // Remover +507
      if (phoneDigits.length <= 4) {
        value = '+507 ' + phoneDigits;
      } else if (phoneDigits.length <= 8) {
        value = '+507 ' + phoneDigits.substring(0, 4) + '-' + phoneDigits.substring(4);
      } else {
        // Limitar a 8 dÃ­gitos despuÃ©s de +507
        value = '+507 ' + phoneDigits.substring(0, 4) + '-' + phoneDigits.substring(4, 8);
      }
    }
    
    // Actualizar el valor del formulario
    this.adoptionForm.get('applicant_phone')?.setValue(value, { emitEvent: false });
    
    // Mantener la posiciÃ³n del cursor
    const cursorPosition = input.selectionStart || 0;
    setTimeout(() => {
      const newPosition = Math.min(cursorPosition, value.length);
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  }

  public formatPhoneNumber(value: string): string {
    if (!value) return '+507 ';
    
    // Remover todo excepto nÃºmeros
    const digits = value.replace(/[^\d]/g, '');
    
    // Si no empieza con 507, agregarlo
    if (!digits.startsWith('507')) {
      return '+507 ' + digits.substring(0, 4) + (digits.length > 4 ? '-' + digits.substring(4, 8) : '');
    }
    
    // Ya tiene 507, formatear
    const phoneDigits = digits.substring(3); // Remover 507
    if (phoneDigits.length <= 4) {
      return '+507 ' + phoneDigits;
    } else {
      return '+507 ' + phoneDigits.substring(0, 4) + '-' + phoneDigits.substring(4, 8);
    }
  }
}




