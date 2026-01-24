import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputOtpModule } from 'primeng/inputotp';
import { ScreenLockService } from '../../services/screen-lock.service';

@Component({
  selector: 'pt-salary-pin-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ReactiveFormsModule,
    InputOtpModule,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      header="Verificar Identidad"
      styleClass="salary-pin-dialog"
      [style]="{ width: '24rem' }"
      (onHide)="onHide()"
    >
      <div class="flex flex-col items-center pt-4 pb-2">
        <div class="mb-6 text-center">
          <div
            class="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4"
          >
            <i class="pi pi-lock text-3xl text-amber-500"></i>
          </div>
          <p class="text-gray-300">Ingresa tu PIN para visualizar el salario</p>
        </div>

        <form
          [formGroup]="pinForm"
          (ngSubmit)="onSubmit()"
          class="flex flex-col items-center w-full"
        >
          <div class="mb-6 relative w-full flex justify-center">
            <p-inputOtp
              formControlName="pin"
              [length]="6"
              [integerOnly]="true"
              styleClass="otp-custom-salary"
              (onCompleted)="onSubmit()"
            >
            </p-inputOtp>

            @if (error()) {
            <div class="absolute -bottom-6 left-0 right-0 text-center">
              <span class="text-red-400 text-xs animate-pulse">{{
                error()
              }}</span>
            </div>
            }
          </div>

          <div class="flex flex-col gap-2 w-full mt-2">
            <button
              pButton
              type="submit"
              label="Verificar"
              class="p-button-primary w-full"
              [disabled]="!pinForm.valid || isValidating()"
              [loading]="isValidating()"
            ></button>
            <button
              pButton
              type="button"
              label="Cancelar"
              class="p-button-text p-button-secondary w-full"
              (click)="onCancel()"
            ></button>
          </div>
        </form>
      </div>
    </p-dialog>
  `,
  styles: [
    `
      :host ::ng-deep .otp-custom-salary .p-inputotp-input {
        @apply w-10 h-12 text-xl bg-neutral-800 border-neutral-700 text-white focus:border-amber-500 transition-all rounded-lg;
      }
    `,
  ],
})
export class SalaryPinDialogComponent {
  private screenLockService = inject(ScreenLockService);

  @Input() visible = false;
  @Input() employee: any = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() unlocked = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  pinForm = new FormGroup({
    pin: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  error = signal<string | null>(null);
  isValidating = signal(false);

  async onSubmit() {
    if (this.pinForm.invalid) return;

    this.isValidating.set(true);
    this.error.set(null);

    const pin = this.pinForm.get('pin')?.value || '';

    // Ensure service has the correct employee context for TOTP validation
    if (this.employee) {
      this.screenLockService.setCurrentEmployee(this.employee);
    }

    // Small delay to simulate processing and give better UX
    await new Promise((resolve) => setTimeout(resolve, 300));

    const success = await this.screenLockService.unlockScreen(pin);

    this.isValidating.set(false);

    if (success) {
      this.unlocked.emit();
      this.closeDialog();
    } else {
      this.error.set('PIN Incorrecto');
      this.pinForm.get('pin')?.setValue('');
      // Auto clear error after 3s
      setTimeout(() => this.error.set(null), 3000);
    }
  }

  onCancel() {
    this.cancelled.emit();
    this.closeDialog();
  }

  onHide() {
    if (this.visible) {
      this.visibleChange.emit(false);
    }
    this.resetForm();
  }

  private closeDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  private resetForm() {
    this.pinForm.reset();
    this.error.set(null);
    this.isValidating.set(false);
  }
}
