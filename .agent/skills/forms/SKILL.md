---
name: forms
description: Patrones de formularios reactivos en People. Úsala al crear o modificar formularios.
---

# Forms Skill

Esta skill te guía en la creación de formularios en People.

## Patrón Básico con Signals

```typescript
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule, ...],
  ...
})
export class MyFormComponent {
  // Estado del formulario
  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);

  // FormGroup tradicional
  readonly form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    amount: new FormControl<number | null>(null, [Validators.min(0)])
  });

  // Computed para validación
  readonly isValid = computed(() => this.form.valid);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    this.submitError.set(null);

    try {
      await this.submitData(this.form.value);
      this.form.reset();
    } catch (error) {
      this.submitError.set('Error al guardar');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
```

## Template del Formulario

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <!-- Input de texto -->
  <div class="field">
    <label for="name">Nombre *</label>
    <input
      pInputText
      id="name"
      formControlName="name"
      [ngClass]="{'ng-invalid ng-dirty': form.get('name')?.invalid && form.get('name')?.touched}"
    />
    @if (form.get('name')?.invalid && form.get('name')?.touched) {
    <small class="p-error">El nombre es requerido</small>
    }
  </div>

  <!-- Select -->
  <div class="field">
    <label for="branch">Sucursal</label>
    <p-select
      formControlName="branch_id"
      [options]="branches()"
      optionLabel="name"
      optionValue="id"
      placeholder="Seleccione..."
    />
  </div>

  <!-- Date picker -->
  <div class="field">
    <label for="date">Fecha</label>
    <p-datepicker
      formControlName="date"
      dateFormat="dd/mm/yy"
      [showIcon]="true"
    />
  </div>

  <!-- Botón submit -->
  <p-button
    type="submit"
    label="Guardar"
    [loading]="isSubmitting()"
    [disabled]="form.invalid || isSubmitting()"
  />
</form>
```

## Formularios Dinámicos

```typescript
// Campos que aparecen según condición
readonly showExtraFields = computed(() =>
  this.form.get('type')?.value === 'special'
);

// Agregar/quitar validadores dinámicamente
ngOnInit() {
  this.form.get('type')?.valueChanges.subscribe(type => {
    const extraField = this.form.get('extraField');
    if (type === 'special') {
      extraField?.setValidators([Validators.required]);
    } else {
      extraField?.clearValidators();
    }
    extraField?.updateValueAndValidity();
  });
}
```

## Validaciones Personalizadas

```typescript
// Validador de rango de fechas
function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('start_date')?.value;
  const end = control.get('end_date')?.value;

  if (start && end && new Date(start) > new Date(end)) {
    return { dateRange: 'La fecha de inicio debe ser anterior a la fecha fin' };
  }
  return null;
}

// Uso
readonly form = new FormGroup({
  start_date: new FormControl(''),
  end_date: new FormControl('')
}, { validators: dateRangeValidator });
```

## Formularios con Archivos

```typescript
// Manejo de file upload
readonly selectedFile = signal<File | null>(null);

onFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    this.selectedFile.set(input.files[0]);
  }
}

async uploadFile(file: File): Promise<string> {
  const path = `documents/${Date.now()}_${file.name}`;
  const url = await this.storageService.upload('bucket', path, file);
  return url;
}
```

## Reset y Valores Iniciales

```typescript
// Setear valores iniciales (modo edición)
populateForm(data: MyData): void {
  this.form.patchValue({
    name: data.name,
    email: data.email,
    amount: data.amount
  });
}

// Reset completo
resetForm(): void {
  this.form.reset();
  this.selectedFile.set(null);
  this.submitError.set(null);
}
```

## PrimeNG Components

```typescript
// Imports comunes para formularios
imports: [
  ReactiveFormsModule,
  InputTextModule, // pInputText
  SelectModule, // p-select
  CalendarModule, // p-datepicker
  InputNumberModule, // p-inputNumber
  TextareaModule, // p-textarea
  CheckboxModule, // p-checkbox
  RadioButtonModule, // p-radioButton
  FileUploadModule, // p-fileUpload
  ButtonModule, // p-button
  MessageModule, // p-message (errores)
];
```
