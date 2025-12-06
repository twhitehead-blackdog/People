import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { Button } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PetsStore } from '../stores/pets.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { AdoptionApplication } from '../models';

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
    ToastModule,
  ],
  template: `
    <p-toast />
    <div class="adoption-form-container">
      <p-card>
        <ng-template pTemplate="header">
          <div class="form-header">
            <h1>Solicitud de Adopción</h1>
            @if (pet()) {
            <p class="subtitle">Adoptando a: {{ pet()!.name }}</p>
            }
          </div>
        </ng-template>

        @if (pet()) {
        <form [formGroup]="adoptionForm" (ngSubmit)="onSubmit()">
          <div class="form-section">
            <h3>Información Personal</h3>
            <div class="form-grid">
              <div class="form-field">
                <label>Nombre Completo *</label>
                <input type="text" pInputText formControlName="applicant_name" />
                @if (adoptionForm.get('applicant_name')?.invalid && adoptionForm.get('applicant_name')?.touched) {
                <small class="error">El nombre es requerido</small>
                }
              </div>
              <div class="form-field">
                <label>Email *</label>
                <input type="email" pInputText formControlName="applicant_email" />
                @if (adoptionForm.get('applicant_email')?.invalid && adoptionForm.get('applicant_email')?.touched) {
                <small class="error">Email inválido</small>
                }
              </div>
              <div class="form-field">
                <label>Teléfono *</label>
                <input type="tel" pInputText formControlName="applicant_phone" />
                @if (adoptionForm.get('applicant_phone')?.invalid && adoptionForm.get('applicant_phone')?.touched) {
                <small class="error">El teléfono es requerido</small>
                }
              </div>
              <div class="form-field">
                <label>Cédula</label>
                <input type="text" pInputText formControlName="applicant_document_id" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Dirección</h3>
            <div class="form-field">
              <label>Dirección Completa *</label>
              <textarea
                pTextarea
                formControlName="applicant_address"
                rows="3"
              ></textarea>
              @if (adoptionForm.get('applicant_address')?.invalid && adoptionForm.get('applicant_address')?.touched) {
              <small class="error">La dirección es requerida</small>
              }
            </div>
          </div>

          <div class="form-section">
            <h3>Información sobre el Hogar</h3>
            <div class="form-field">
              <label>Motivo de Adopción</label>
              <textarea
                pTextarea
                formControlName="reason_for_adoption"
                rows="3"
                placeholder="Cuéntanos por qué quieres adoptar esta mascota..."
              ></textarea>
            </div>
            <div class="form-field">
              <label>Situación de Vivienda</label>
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
              <label for="has_other_pets">¿Tiene otras mascotas?</label>
            </div>
            @if (adoptionForm.get('has_other_pets')?.value) {
            <div class="form-field">
              <label>Información sobre otras mascotas</label>
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
              <label for="has_children">¿Tiene niños?</label>
            </div>
            @if (adoptionForm.get('has_children')?.value) {
            <div class="form-field">
              <label>Información sobre los niños</label>
              <textarea
                pTextarea
                formControlName="children_info"
                rows="2"
                placeholder="Edades y cantidad de niños..."
              ></textarea>
            </div>
            }
          </div>

          <div class="form-actions">
            <p-button
              label="Cancelar"
              severity="secondary"
              (onClick)="goBack()"
            />
            <p-button
              label="Enviar Solicitud"
              type="submit"
              [disabled]="adoptionForm.invalid || isSubmitting()"
              [loading]="isSubmitting()"
            />
          </div>
        </form>
        } @else {
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner" style="font-size: 2rem;"></i>
          <p>Cargando información de la mascota...</p>
        </div>
        }
      </p-card>
    </div>
  `,
  styles: [
    `
      .adoption-form-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        background: #ffffff;
      }

      .form-header {
        padding: 1.5rem;
        text-align: center;
        background: #18181b;
      }

      .form-header h1 {
        color: #fbbf24;
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }

      .subtitle {
        color: #9ca3af;
        font-size: 1.125rem;
      }

      .form-section {
        margin-bottom: 2rem;
      }

      .form-section h3 {
        color: #ffffff;
        font-size: 1.25rem;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid rgba(251, 191, 36, 0.3);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .form-field label {
        color: #d1d5db;
        font-weight: 500;
        font-size: 0.875rem;
      }

      .checkbox-field {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
      }

      .error {
        color: #ef4444;
        font-size: 0.75rem;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 2rem;
      }

      .loading-state {
        text-align: center;
        padding: 3rem;
        color: #9ca3af;
      }

      ::ng-deep .p-card {
        background: #18181b;
        border: 2px solid rgba(251, 191, 36, 0.3);
        border-radius: 0.75rem;
      }

      ::ng-deep .p-card-body {
        padding: 2rem;
      }

      ::ng-deep .form-actions p-button button {
        transition: all 0.3s ease !important;
      }

      ::ng-deep .form-actions p-button[style*='#fbbf24'] button:hover:not(:disabled),
      ::ng-deep .form-actions p-button button[style*='#fbbf24']:hover:not(:disabled) {
        background: #000000 !important;
        color: #fbbf24 !important;
      }
    `,
  ],
})
export class AdoptionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);
  public petsStore = inject(PetsStore);
  public applicationsStore = inject(AdoptionApplicationsStore);

  public pet = signal<any>(null);
  public isSubmitting = signal(false);

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
    const petId = this.route.snapshot.paramMap.get('id');
    if (petId) {
      const pet = this.petsStore.entities().find((p) => p.id === petId);
      if (pet) {
        this.pet.set(pet);
      } else {
        this.petsStore.selectEntity(petId);
        const selectedPet = this.petsStore.selectedEntity();
        if (selectedPet) {
          this.pet.set(selectedPet);
        }
      }
    }
  }

  public onSubmit(): void {
    if (this.adoptionForm.invalid || !this.pet()) {
      return;
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
}

