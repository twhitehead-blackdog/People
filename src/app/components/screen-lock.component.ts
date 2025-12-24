import { Component, inject, signal } from '@angular/core';
import { InputOtp } from 'primeng/inputotp';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ScreenLockService } from '../services/screen-lock.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'pt-screen-lock',
  standalone: true,
  imports: [InputOtp, Button, Card, ReactiveFormsModule],
  template: `
    @if (screenLockService.isLocked()) {
    <div class="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center">
      <p-card class="w-full max-w-md mx-4">
        <ng-template pTemplate="header">
          <div class="text-center p-4">
            <i class="pi pi-lock text-6xl text-yellow-400 mb-4"></i>
            <h2 class="text-2xl font-bold text-white mb-2">Pantalla Bloqueada</h2>
            <p class="text-gray-400">Ingrese su PIN del autenticador para continuar</p>
          </div>
        </ng-template>
        
        <form [formGroup]="unlockForm" (ngSubmit)="onUnlock()" class="space-y-4">
          <div class="flex flex-col items-center gap-2">
            <label class="text-gray-300 font-medium text-sm mb-2">
              PIN del Autenticador
            </label>
            <p-inputOtp
              formControlName="pin"
              [length]="6"
              [integerOnly]="true"
              styleClass="p-inputotp-input"
              (keydown.enter)="onUnlock()"
            />
          </div>
          
          @if (errorMessage()) {
          <div class="text-red-400 text-sm text-center">
            {{ errorMessage() }}
          </div>
          }
          
          <div class="flex justify-center">
            <p-button
              type="submit"
              label="Desbloquear"
              icon="pi pi-unlock"
              [loading]="isUnlocking()"
              [disabled]="unlockForm.invalid"
              styleClass="w-full"
            />
          </div>
        </form>
      </p-card>
    </div>
    }
  `,
  styles: `
    ::ng-deep .p-inputotp {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 0.5rem !important;
      width: 100% !important;
      margin: 0 auto !important;
    }
    
    ::ng-deep .p-inputotp-input {
      width: auto !important;
      min-width: 36px !important;
      max-width: 48px !important;
      height: 40px !important;
      font-size: 0.95rem !important;
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
      border-radius: 8px !important;
      background: rgba(31, 41, 55, 0.8) !important;
      color: #fbbf24 !important;
      font-weight: bold !important;
    }
    
    ::ng-deep .p-inputotp-input:focus {
      border-color: rgba(251, 191, 36, 0.9) !important;
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.4) !important;
      outline: none !important;
    }
  `,
})
export class ScreenLockComponent {
  public screenLockService = inject(ScreenLockService);
  
  public unlockForm = new FormGroup({
    pin: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });
  
  public isUnlocking = signal<boolean>(false);
  public errorMessage = signal<string>('');
  
  async onUnlock(): Promise<void> {
    if (this.unlockForm.invalid) {
      return;
    }
    
    this.isUnlocking.set(true);
    this.errorMessage.set('');
    
    const pin = this.unlockForm.get('pin')?.value || '';
    const success = await this.screenLockService.unlockScreen(pin);
    
    if (success) {
      this.unlockForm.reset();
      this.errorMessage.set('');
    } else {
      this.errorMessage.set('PIN incorrecto. Por favor, intente nuevamente.');
      this.unlockForm.get('pin')?.reset();
    }
    
    this.isUnlocking.set(false);
  }
}

