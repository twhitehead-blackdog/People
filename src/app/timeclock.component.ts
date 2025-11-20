import { NgClass } from '@angular/common';
import { HttpClient, httpResource, HttpParams } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { format, differenceInMinutes } from 'date-fns';
import * as OTPAuth from 'otpauth';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputOtp } from 'primeng/inputotp';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { catchError, EMPTY, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Branch, Company, Employee, TimelogType, EmployeeSchedule, Schedule, TimeLog, TimeLogEnum } from './models';
import { TrimPipe } from './pipes/trim.pipe';

@Component({
  selector: 'pt-timeclock',
  imports: [
    InputOtp,
    Select,
    Button,
    ReactiveFormsModule,
    Toast,
    Card,
    ConfirmDialogModule,
    TrimPipe,
    NgClass,
  ],
  providers: [ConfirmationService],
  template: `<p-confirmDialog key="confirm1">
      <ng-template #message let-message>
        <div
          class="flex flex-col items-center w-full gap-4 dark:border-surface-700"
        >
          <i [ngClass]="message.icon" class="!text-6xl text-orange-500"></i>
          <div [innerHTML]="message.message" class="text-center w-full"></div>
        </div>
      </ng-template>
    </p-confirmDialog>
    <p-confirmDialog key="confirm2">
      <ng-template #message let-message>
        <div
          class="flex flex-col items-center w-full gap-4 dark:border-surface-700"
        >
          <i [ngClass]="message.icon" class="!text-6xl text-orange-500"></i>
          <p>{{ message.message }}</p>
        </div>
      </ng-template>
    </p-confirmDialog>
    <p-toast />
      <div
        class="flex flex-col items-center justify-center animated-gradient-container"
        style="width: 100%; position: relative; min-height: 100vh; overflow-y: auto; overflow-x: hidden;"
      >
      <div
        class="flex flex-col gap-2 md:gap-3 lg:gap-4 items-center px-3 md:px-6 relative z-10 timeclock-content"
        style="max-width: 600px; width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 0;"
      >
        <img src="images/blackdog.png" class="h-12 md:h-16 lg:h-20 w-auto object-contain drop-shadow-2xl relative z-10" />
        <p-card class="w-full timeclock-card relative z-10">
          <ng-template #title>
            <div class="flex flex-col gap-1 md:gap-2 items-center">
              <div class="text-base md:text-lg lg:text-xl font-bold text-gray-100 text-center">Reloj de Marcación</div>
              <!-- Clock Display inside card -->
              <div class="flex flex-col items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-lg px-3 md:px-5 py-1.5 md:py-2 border border-yellow-500/40 shadow-lg clock-display">
                <div class="text-xl md:text-2xl lg:text-3xl font-mono font-bold text-yellow-400 clock-time">
                  {{ formattedTime() }}
                </div>
                <div class="text-xs md:text-sm text-gray-300">
                  {{ formattedDate() }}
                </div>
              </div>
            </div>
          </ng-template>
          <ng-template #subtitle>
            <div class="flex items-center justify-center gap-2 text-[#d2d2d2] text-xs md:text-sm font-semibold text-center">
              <i class="pi pi-building text-yellow-400"></i>
              <i class="pi pi-user text-yellow-400"></i>
              <span>Seleccione la sucursal y empleado</span>
            </div>
          </ng-template>
          <form [formGroup]="form" class="flex flex-col gap-3 md:gap-4 items-center w-full" (keydown.enter)="onEnterKey($event)">
            @if (!form.get('company_id')?.value) {
              <div class="input-container w-full">
              <p-select
                formControlName="company_id"
                [options]="companiesResource.value()"
                placeholder="Seleccionar empresa"
                optionLabel="name"
                optionValue="id"
                filter
                filterBy="name"
                  class="w-full"
                  [styleClass]="'w-full'"
              />
            </div>
            }
            <div class="input-container w-full">
              <p-select
                formControlName="branch_id"
                [options]="branchesResource.value()"
                placeholder="Seleccionar sucursal"
                optionValue="id"
                optionLabel="name"
                filter
                filterBy="name"
                class="w-full"
                [styleClass]="'w-full'"
              />
            </div>
            <div class="input-container w-full" [ngClass]="{'error-border': form.get('employee')?.invalid && form.get('employee')?.touched}">
              <p-select
                formControlName="employee"
                [options]="employeesResource.value()"
                placeholder="Seleccionar empleado"
                filter
                filterBy="first_name,father_name"
                class="w-full"
                [styleClass]="'w-full'"
              >
                <ng-template #selectedItem let-selected>
                  {{ selected.father_name | trim }},
                  {{ selected.first_name | trim }}
                </ng-template>
                <ng-template let-item #item>
                  {{ item.father_name | trim }}, {{ item.first_name | trim }}
                </ng-template>
              </p-select>
            </div>
            <div class="input-container w-full">
              <p-select
                formControlName="type"
                placeholder="Seleccionar tipo"
                [options]="availableTypes()"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                [styleClass]="'w-full'"
              />
            </div>
            
            <!-- PIN Input Section -->
            <div class="w-full flex flex-col gap-0.5 items-center justify-center">
              <label class="text-gray-300 font-medium text-xs md:text-sm text-center" style="margin-bottom: 3px;">
                Ingrese su PIN
              </label>
              <div class="w-full flex justify-center items-center">
            <p-inputOtp
                  #otpInput
              formControlName="otp"
              [length]="6"
              [integerOnly]="true"
                  (keydown.enter)="onEnterKey($event)"
                  (input)="onOtpInput($event)"
                  styleClass="p-inputotp-input"
            />
              </div>
            </div>

            <!-- Submit Button -->
            <div class="w-full flex justify-center items-center">
            <p-button
                [disabled]="form.invalid || isProcessing() || !form.get('employee')?.value"
                [loading]="isProcessing()"
              (onClick)="validateOtp()"
                [label]="isProcessing() ? 'Procesando...' : 'Marcar'"
                [icon]="isProcessing() ? 'pi pi-spin pi-spinner' : 'pi pi-check-circle'"
              size="large"
              rounded
                [styleClass]="'mark-button'"
                [style]="{'background': form.invalid || !form.get('employee')?.value ? 'linear-gradient(135deg, #5d5d5d 0%, #4a4a4a 100%)' : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 'border': 'none', 'box-shadow': form.invalid || !form.get('employee')?.value ? 'none' : '0 4px 15px rgba(251, 191, 36, 0.4)'}"
              />
            </div>
            
            <!-- Validation Messages -->
            @if (form.get('employee')?.invalid && form.get('employee')?.touched) {
              <div class="text-gray-400 text-xs text-center w-full mt-1">
                Debe seleccionar un empleado para continuar.
              </div>
            }
          </form>
        </p-card>
      </div>
    </div>`,
  styles: `
    .animated-gradient-container {
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 25%, #000000 50%, #0d0d0d 75%, #2a2a2a 100%);
      position: relative;
      min-height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* Beautiful custom scrollbar */
    .animated-gradient-container::-webkit-scrollbar {
      width: 10px;
    }
    
    .animated-gradient-container::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
      margin: 10px 0;
    }
    
    .animated-gradient-container::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.6) 0%, rgba(251, 191, 36, 0.4) 100%);
      border-radius: 10px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
      transition: all 0.3s ease;
    }
    
    .animated-gradient-container::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0.6) 100%);
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
    }
    
    .animated-gradient-container::-webkit-scrollbar-thumb:active {
      background: linear-gradient(180deg, rgba(251, 191, 36, 1) 0%, rgba(251, 191, 36, 0.8) 100%);
    }
    
    /* Firefox scrollbar */
    .animated-gradient-container {
      scrollbar-width: thin;
      scrollbar-color: rgba(251, 191, 36, 0.6) rgba(0, 0, 0, 0.3);
    }
    
    .timeclock-content {
      transform-origin: center;
      flex-shrink: 0;
    }
    
    @media (max-height: 800px) {
      .timeclock-content {
        transform: scale(0.9);
      }
    }
    
    @media (max-height: 700px) {
      .timeclock-content {
        transform: scale(0.8);
      }
    }
    
    @media (max-height: 600px) {
      .timeclock-content {
        transform: scale(0.75);
      }
    }
    
    @media (max-width: 767px) {
      .animated-gradient-container {
        padding: 0;
      }
      
      @media (max-height: 900px) {
        .timeclock-content {
          transform: scale(0.85);
        }
      }
      
      @media (max-height: 700px) {
        .timeclock-content {
          transform: scale(0.75);
        }
      }
      
      @media (max-height: 600px) {
        .timeclock-content {
          transform: scale(0.65);
        }
      }
    }
    
    
    .timeclock-card {
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
      border-radius: 12px !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(251, 191, 36, 0.2) !important;
      backdrop-filter: blur(10px);
      background: rgba(17, 24, 39, 0.95) !important;
      animation: cardEntrance 0.25s ease-out;
    }
    
    @media (max-width: 767px) {
      .timeclock-card ::ng-deep .p-card-body {
        padding: 1rem !important;
      }
      
      .timeclock-card ::ng-deep .p-card-title {
        padding: 0.75rem !important;
      }
      
    }
    
    /* Desactivar animaciones solo si el usuario explícitamente prefiere movimiento reducido */
    @media (prefers-reduced-motion: reduce) {
      .clock-time {
        animation: none !important;
      }
      
      .timeclock-card {
        animation: none !important;
      }
    }
    
    @keyframes cardEntrance {
      from {
        opacity: 0;
        transform: scale(1.03);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    .clock-display {
      border: 1px solid rgba(251, 191, 36, 0.5) !important;
    }
    
    .clock-time {
      text-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
      animation: clockPulse 2s ease-in-out infinite;
    }
    
    @keyframes clockPulse {
      0%, 100% {
        text-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
      }
      50% {
        text-shadow: 0 0 20px rgba(251, 191, 36, 1), 0 0 30px rgba(251, 191, 36, 0.6);
      }
    }
    
    .timeclock-card ::ng-deep .p-card {
      border-radius: 12px !important;
      border: none !important;
    }
    
    .timeclock-card ::ng-deep .p-card-body {
      border-radius: 12px !important;
    }
    
    .timeclock-card ::ng-deep .p-select {
      border-radius: 8px !important;
    }
    
    .timeclock-card ::ng-deep .p-select .p-select-trigger {
      border-radius: 8px !important;
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
    }
    
    .timeclock-card ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(251, 191, 36, 0.8) !important;
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3) !important;
    }
    
    .error-border ::ng-deep .p-select .p-select-trigger {
      border-color: rgba(239, 68, 68, 0.5) !important;
    }
    
    .error-border ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(239, 68, 68, 0.8) !important;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.3) !important;
    }
    
    .timeclock-card ::ng-deep .p-inputotp {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 0.5rem !important;
      width: 100% !important;
      margin: 0 auto !important;
    }
    
    .timeclock-card ::ng-deep .p-inputotp-input {
      width: auto !important;
      min-width: 32px !important;
      max-width: 45px !important;
      height: 38px !important;
      font-size: 0.95rem !important;
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
      border-radius: 8px !important;
      background: rgba(31, 41, 55, 0.8) !important;
      color: #fbbf24 !important;
      font-weight: bold !important;
      flex: 0 0 auto !important;
    }
    
    .timeclock-card ::ng-deep .p-inputotp-input:focus {
      border-color: rgba(251, 191, 36, 0.9) !important;
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.4) !important;
      outline: none !important;
    }
    
    .timeclock-card ::ng-deep .p-inputotp-input:not(:placeholder-shown) {
      border-color: rgba(251, 191, 36, 0.7) !important;
    }
    
    @media (max-width: 768px) {
      .timeclock-card ::ng-deep .p-inputotp-input {
        min-width: 28px !important;
        max-width: 38px !important;
        height: 35px !important;
        font-size: 0.85rem !important;
      }
    }
    
    .input-container ::ng-deep .p-select {
      width: 100%;
    }
    
    .input-container ::ng-deep .p-select .p-select-trigger {
      padding: 0.4rem 0.65rem;
      min-height: 38px;
      font-size: 0.875rem;
    }
    
    @media (max-width: 768px) {
      .input-container ::ng-deep .p-select .p-select-trigger {
        padding: 0.5rem 0.7rem;
        min-height: 40px;
        font-size: 0.85rem;
      }
    }
    
    .timeclock-card ::ng-deep .mark-button {
      margin: 0 auto !important;
      display: block !important;
      width: auto !important;
    }
    
    .timeclock-card ::ng-deep .mark-button button {
      margin: 0 auto !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      flex-direction: row !important;
    }
    
    .timeclock-card ::ng-deep .p-button {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    .timeclock-card ::ng-deep .p-button .p-button-content {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      flex-direction: row !important;
    }
    
    .timeclock-card ::ng-deep .p-button .p-button-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0 !important;
      line-height: 1 !important;
      font-size: 1rem !important;
      position: relative !important;
      top: -2px !important;
    }
    
    .timeclock-card ::ng-deep .p-button .p-button-label {
      display: inline-flex !important;
      align-items: center !important;
      line-height: 1 !important;
    }
    
    .timeclock-card ::ng-deep .p-button .p-button-icon-left {
      margin-right: 0.5rem !important;
    }
    
    .timeclock-card ::ng-deep .p-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .timeclock-card ::ng-deep .p-button:not(:disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(251, 191, 36, 0.6) !important;
      filter: brightness(1.1);
    }
    
    .timeclock-card ::ng-deep .p-button:not(:disabled):active {
      transform: translateY(0);
    }
    
    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    
    .timeclock-card ::ng-deep .p-button[loading] .p-button-icon,
    .timeclock-card ::ng-deep .p-button .pi-spinner {
      animation: rotate 0.6s linear infinite;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeclockComponent implements OnDestroy {
  private message = inject(MessageService);
  private confirmation = inject(ConfirmationService);
  private http = inject(HttpClient);
  // Get IP address - try multiple methods to get real IP even from localhost
  public currentIP = signal<string>('127.0.0.1');
  public isProcessing = signal<boolean>(false);
  public showKeypad = signal<boolean>(false);
  public currentTime = signal<Date>(new Date());
  public availableTypes = signal<Array<{value: string, label: string}>>([]);

  private injector = inject(Injector);
  private timeInterval: any;

  // Update time every second
  constructor() {
    this.timeInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
    
    // Initialize available types
    this.availableTypes.set(this.types);
    
    // Try to get real IP address using multiple methods
    this.detectIP();
    
    // Auto-select company and branch when data loads
    effect(() => {
      const companies = this.companiesResource.value();
      const branches = this.branchesResource.value();
      
      // Auto-select "Black Dog Panamá" company if found
      if (companies && companies.length > 0 && !this.form.get('company_id')?.value) {
        // First try exact match for "Black Dog Panamá"
        let blackDogCompany = companies.find(c => {
          const name = c.name.toLowerCase();
          return name === 'black dog panamá' || 
                 name === 'blackdog panamá' ||
                 name === 'black dog panama' ||
                 name === 'blackdog panama';
        });
        
        // If not found, try partial matches with both "black dog" and "panamá"
        if (!blackDogCompany) {
          blackDogCompany = companies.find(c => {
            const name = c.name.toLowerCase();
            return (name.includes('black dog') || name.includes('blackdog')) &&
                   (name.includes('panamá') || name.includes('panama'));
          });
        }
        
        // Last resort: just look for "black dog" or "blackdog"
        if (!blackDogCompany) {
          blackDogCompany = companies.find(c => {
            const name = c.name.toLowerCase();
            return name.includes('black dog') || name.includes('blackdog');
          });
        }
        
        if (blackDogCompany) {
          this.form.get('company_id')?.setValue(blackDogCompany.id);
        }
      }
      
      // Auto-select branch by IP if found (after company is selected)
      const selectedCompanyId = this.form.get('company_id')?.value;
      if (branches && branches.length > 0 && !this.form.get('branch_id')?.value) {
        const currentIP = this.getIP();
        if (currentIP && currentIP !== '127.0.0.1') {
          // Find branch matching the IP
          const matchingBranch = branches.find(b => b.ip === currentIP);
          if (matchingBranch) {
            this.form.get('branch_id')?.setValue(matchingBranch.id);
          }
        }
      }
    }, { injector: this.injector });

    // Auto-detect timelog type when employee is selected
    this.form.get('employee')?.valueChanges.subscribe(employee => {
      this.onEmployeeSelected(employee);
    });
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  // Detect IP address using multiple methods
  private detectIP() {
    // Method 1: Try WebRTC (works even from localhost)
    this.getIPViaWebRTC().then(ip => {
      if (ip && ip !== '127.0.0.1' && ip !== '::1') {
        this.currentIP.set(ip);
        return;
      }
      
      // Method 2: Try ipify.org (may have CORS issues in dev)
      this.getIPViaHttp().then(ip => {
        if (ip && ip !== '127.0.0.1') {
          this.currentIP.set(ip);
        }
      }).catch(() => {
        // Method 3: Try alternative service
        this.getIPViaAlternative().then(ip => {
          if (ip && ip !== '127.0.0.1') {
            this.currentIP.set(ip);
          }
        }).catch(() => {
          // Keep default 127.0.0.1 if all methods fail
        });
      });
    }).catch(() => {
      // If WebRTC fails, try HTTP methods
      this.getIPViaHttp().then(ip => {
        if (ip && ip !== '127.0.0.1') {
          this.currentIP.set(ip);
        }
      }).catch(() => {
        this.getIPViaAlternative().then(ip => {
          if (ip && ip !== '127.0.0.1') {
            this.currentIP.set(ip);
          }
        }).catch(() => {
          // Keep default
        });
      });
    });
  }

  // Method 1: Get IP via WebRTC (works from localhost)
  private getIPViaWebRTC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const RTCPeerConnection = (window as any).RTCPeerConnection || 
                                (window as any).webkitRTCPeerConnection || 
                                (window as any).mozRTCPeerConnection;
      
      if (!RTCPeerConnection) {
        reject(new Error('WebRTC not supported'));
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      const ips: string[] = [];
      
      pc.createDataChannel('');
      
      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);
          if (match) {
            const ip = match[1];
            if (ips.indexOf(ip) === -1 && !ip.startsWith('127.') && ip !== '::1') {
              ips.push(ip);
            }
          }
        } else {
          // All candidates received
          if (ips.length > 0) {
            pc.close();
            resolve(ips[0]);
          } else {
            pc.close();
            reject(new Error('No IP found'));
          }
        }
      };

      pc.createOffer()
        .then((offer: any) => pc.setLocalDescription(offer))
        .catch((err: any) => {
          pc.close();
          reject(err);
        });

      // Timeout after 3 seconds
      setTimeout(() => {
        if (ips.length > 0) {
          pc.close();
          resolve(ips[0]);
        } else {
          pc.close();
          reject(new Error('WebRTC timeout'));
        }
      }, 3000);
    });
  }

  // Method 2: Get IP via HTTP (ipify.org)
  private getIPViaHttp(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get<{ ip: string }>('https://api.ipify.org?format=json', {
        headers: { 'Accept': 'application/json' }
      }).subscribe({
        next: (data) => resolve(data.ip),
        error: () => reject(new Error('HTTP method failed'))
      });
    });
  }

  // Method 3: Get IP via alternative service
  private getIPViaAlternative(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get<{ ip: string }>('https://api64.ipify.org?format=json', {
        headers: { 'Accept': 'application/json' }
      }).subscribe({
        next: (data) => resolve(data.ip),
        error: () => reject(new Error('Alternative method failed'))
      });
    });
  }

  // Update available types based on last timelog
  private updateAvailableTypes(lastType: string | null) {
    const allTypes = this.types;
    if (!lastType) {
      // No previous log today, show all types
      this.availableTypes.set(allTypes);
      return;
    }

    // Filter types based on last log
    // Allow exit at any point after entry (for emergencies)
    let filtered: Array<{value: string, label: string}> = [];
    
    switch (lastType) {
      case 'entry':
        // Can do lunch_start or exit (for emergencies)
        filtered = allTypes.filter(t => t.value === 'lunch_start' || t.value === 'exit');
        break;
      case 'lunch_start':
        // Can do lunch_end or exit (for emergencies)
        filtered = allTypes.filter(t => t.value === 'lunch_end' || t.value === 'exit');
        break;
      case 'lunch_end':
        // Can do exit next
        filtered = allTypes.filter(t => t.value === 'exit');
        break;
      case 'exit':
        // Can start new day with entry
        filtered = allTypes.filter(t => t.value === 'entry');
        break;
      default:
        filtered = allTypes;
    }

    this.availableTypes.set(filtered.length > 0 ? filtered : allTypes);
  }

  // Add number to OTP from keypad
  addNumberToOtp(num: string) {
    const currentOtp = this.form.get('otp')?.value || '';
    if (currentOtp.length < 6) {
      this.form.get('otp')?.setValue(currentOtp + num);
    }
  }

  // Delete last number from OTP
  deleteFromOtp() {
    const currentOtp = this.form.get('otp')?.value || '';
    if (currentOtp.length > 0) {
      this.form.get('otp')?.setValue(currentOtp.slice(0, -1));
    }
  }

  // Clear OTP
  clearOtp() {
    this.form.get('otp')?.setValue('');
  }

  // Format time for display (12-hour format with AM/PM)
  formattedTime = computed(() => {
    return format(this.currentTime(), 'h:mm:ss aaa');
  });

  // Format date for display
  formattedDate = computed(() => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const date = this.currentTime();
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  });

  // Get IP - always returns a valid IP (localhost in dev)
  public getIP = computed(() => {
    return this.currentIP() || '127.0.0.1';
  });

  public validIP = computed(() => {
    const ip = this.getIP();
    // If IP is localhost (dev fallback), always allow
    if (ip === '127.0.0.1') return true;
    return this.branchesResource
      .value()
      ?.some((branch) => branch.ip === ip) ?? true;
  });

  public types = Object.entries(TimelogType).map(([key, value]) => ({
    value: key,
    label: value,
  }));

  public companiesResource = httpResource<Company[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/companies`,
    method: 'GET',
    params: {
      select: '*',
      order: 'name',
    },
  }));

  public branchesResource = httpResource<Branch[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/branches`,
    method: 'GET',
    params: {
      select: '*',
      order: 'name',
    },
  }));

  public employeesResource = httpResource<Partial<Employee>[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
    method: 'GET',
    params: {
      select: 'id,first_name,father_name,code_uri',
      order: 'father_name',
      is_active: 'eq.true',
    },
  }));

  // Get last timelog for an employee today to determine next type
  private getLastTimelog(employeeId: string): Observable<TimeLog | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = `${today}T00:00:00`;
    
    return this.http.get<TimeLog[]>(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`,
      {
        params: {
          select: 'id,type,created_at',
          employee_id: `eq.${employeeId}`,
          created_at: `gte.${todayStart}`,
          order: 'created_at.desc',
          limit: '1',
        },
      }
    ).pipe(
      map(timelogs => {
        if (!timelogs || timelogs.length === 0) {
          return null;
        }
        const lastLog = timelogs[0];
        // Verify it's from today
        const logDate = format(new Date(lastLog.created_at), 'yyyy-MM-dd');
        return logDate === today ? lastLog : null;
      }),
      catchError(() => of(null))
    );
  }


  // Determine next timelog type based on last entry
  private getNextTimelogType(lastType: string | null): string {
    if (!lastType) {
      return 'entry'; // First entry of the day
    }
    
    // Determine next type in sequence
    switch (lastType) {
      case 'entry':
        return 'lunch_start';
      case 'lunch_start':
        return 'lunch_end';
      case 'lunch_end':
        return 'exit';
      case 'exit':
        return 'entry'; // New day starts (shouldn't happen if we filter by today)
      default:
        return 'entry';
    }
  }

  // Get employee schedule for today
  private getEmployeeSchedule(employeeId: string): Observable<EmployeeSchedule | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.http.get<EmployeeSchedule[]>(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
      {
        params: {
          select: '*,schedule:schedules(*)',
          employee_id: `eq.${employeeId}`,
          start_date: `lte.${today}`,
          end_date: `gte.${today}`,
        },
      }
    ).pipe(
      map(schedules => schedules && schedules.length > 0 ? schedules[0] : null),
      catchError((error) => {
        console.error('Error getting employee schedule:', error);
        return of(null);
      })
    );
  }

  // Calculate if entry is late
  private calculateDelay(entryTime: Date, schedule: Schedule | undefined): number | null {
    if (!schedule || !schedule.entry_time || schedule.day_off) {
      return null;
    }

    const entryTimeStr = format(entryTime, 'HH:mm:ss');
    const scheduleTimeStr = typeof schedule.entry_time === 'string' 
      ? schedule.entry_time 
      : format(new Date(schedule.entry_time), 'HH:mm:ss');

    const entryParts = entryTimeStr.split(':');
    const scheduleParts = scheduleTimeStr.split(':');

    const entryDate = new Date();
    entryDate.setHours(+entryParts[0], +entryParts[1], +entryParts[2] || 0, 0);

    const scheduleDate = new Date();
    scheduleDate.setHours(+scheduleParts[0], +scheduleParts[1], +scheduleParts[2] || 0, 0);

    const delay = differenceInMinutes(entryDate, scheduleDate);

    if (delay > (schedule.minutes_tolerance || 0)) {
      return delay;
    }

    return null;
  }

  // Format minutes to hours and minutes
  private formatTimeDifference(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return `${hours} ${hours === 1 ? 'hora' : 'horas'} y ${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  // Get lunch_start timelog for today
  private getLunchStartTimelog(employeeId: string): Observable<TimeLog | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;
    
    const url = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs?select=id,type,created_at&employee_id=eq.${employeeId}&type=eq.lunch_start&created_at=gte.${todayStart}&created_at=lte.${todayEnd}&order=created_at.desc&limit=1`;
    
    return this.http.get<TimeLog[]>(url).pipe(
      map(timelogs => {
        if (!timelogs || timelogs.length === 0) {
          return null;
        }
        const lunchStartLog = timelogs[0];
        const logDate = format(new Date(lunchStartLog.created_at), 'yyyy-MM-dd');
        return logDate === today ? lunchStartLog : null;
      }),
      catchError(() => of(null))
    );
  }

  // Calculate if lunch end is late based on actual lunch start time and schedule
  private calculateLunchEndDifference(lunchEndTime: Date, lunchStartTime: Date | null, schedule: Schedule | undefined): number | null {
    if (!schedule || schedule.day_off) {
      return null;
    }

    // If we have the actual lunch start time, verify duration first
    if (lunchStartTime) {
      const actualDuration = differenceInMinutes(lunchEndTime, lunchStartTime);
      const expectedDuration = 60; // 1 hour lunch duration
      
      // If they returned less than 1 hour after starting lunch, don't show late warning
      // (they're still within the lunch period)
      if (actualDuration < expectedDuration) {
        return null; // Don't show late warning if they're still within lunch time
      }
      
      // If they took at least 1 hour, then check if they're late from scheduled time
      if (schedule.lunch_end_time) {
        const lunchEndTimeStr = format(lunchEndTime, 'HH:mm:ss');
        const scheduleTimeStr = typeof schedule.lunch_end_time === 'string' 
          ? schedule.lunch_end_time 
          : format(new Date(schedule.lunch_end_time), 'HH:mm:ss');

        const lunchEndParts = lunchEndTimeStr.split(':');
        const scheduleParts = scheduleTimeStr.split(':');

        const lunchEndDate = new Date();
        lunchEndDate.setHours(+lunchEndParts[0], +lunchEndParts[1], +lunchEndParts[2] || 0, 0);

        const scheduleDate = new Date();
        scheduleDate.setHours(+scheduleParts[0], +scheduleParts[1], +scheduleParts[2] || 0, 0);

        const difference = differenceInMinutes(lunchEndDate, scheduleDate);

        // Only return positive difference (late), ignore early returns
        return difference > 0 ? difference : null;
      }
    }

    // Fallback: compare with schedule if no lunch_start found
    if (schedule.lunch_end_time) {
      const lunchEndTimeStr = format(lunchEndTime, 'HH:mm:ss');
      const scheduleTimeStr = typeof schedule.lunch_end_time === 'string' 
        ? schedule.lunch_end_time 
        : format(new Date(schedule.lunch_end_time), 'HH:mm:ss');

      const lunchEndParts = lunchEndTimeStr.split(':');
      const scheduleParts = scheduleTimeStr.split(':');

      const lunchEndDate = new Date();
      lunchEndDate.setHours(+lunchEndParts[0], +lunchEndParts[1], +lunchEndParts[2] || 0, 0);

      const scheduleDate = new Date();
      scheduleDate.setHours(+scheduleParts[0], +scheduleParts[1], +scheduleParts[2] || 0, 0);

      const difference = differenceInMinutes(lunchEndDate, scheduleDate);

      // Only return positive difference (late), ignore early returns
      return difference > 0 ? difference : null;
    }

    return null;
  }

  // Calculate if exit is early or late
  private calculateExitDifference(exitTime: Date, schedule: Schedule | undefined): { minutes: number; isEarly: boolean } | null {
    if (!schedule || !schedule.exit_time || schedule.day_off) {
      return null;
    }

    const exitTimeStr = format(exitTime, 'HH:mm:ss');
    const scheduleTimeStr = typeof schedule.exit_time === 'string' 
      ? schedule.exit_time 
      : format(new Date(schedule.exit_time), 'HH:mm:ss');

    const exitParts = exitTimeStr.split(':');
    const scheduleParts = scheduleTimeStr.split(':');

    const exitDate = new Date();
    exitDate.setHours(+exitParts[0], +exitParts[1], +exitParts[2] || 0, 0);

    const scheduleDate = new Date();
    scheduleDate.setHours(+scheduleParts[0], +scheduleParts[1], +scheduleParts[2] || 0, 0);

    const difference = differenceInMinutes(exitDate, scheduleDate);

    // If difference is negative, exited early; if positive, exited late
    if (Math.abs(difference) > (schedule.minutes_tolerance || 0)) {
      return {
        minutes: Math.abs(difference),
        isEarly: difference < 0
      };
    }

    return null;
  }

  public form = new FormGroup({
    company_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    branch_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    employee: new FormControl<Employee | undefined>(undefined, {
      validators: [Validators.required],
      nonNullable: true,
    }),
    type: new FormControl<string>('entry', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    otp: new FormControl('', {
      validators: [Validators.required, Validators.minLength(6)],
      nonNullable: true,
    }),
  });

  @ViewChild('otpInput') otpInput?: ElementRef;

  onEnterKey(event: KeyboardEvent) {
    event.preventDefault();
    if (this.form.valid) {
      this.validateOtp();
    }
  }

  onEmployeeSelected(employee: Employee | undefined) {
    if (employee?.id) {
      this.getLastTimelog(employee.id).subscribe({
        next: (lastTimelog) => {
          const nextType = this.getNextTimelogType(lastTimelog?.type || null);
          this.updateAvailableTypes(lastTimelog?.type || null);
          this.form.get('type')?.setValue(nextType);
          // Focus OTP input when employee is selected
          this.focusOtpInput();
        },
        error: () => {
          // Default to entry if error
          this.updateAvailableTypes(null);
          this.form.get('type')?.setValue('entry');
          // Focus OTP input when employee is selected
          this.focusOtpInput();
        }
      });
    } else {
      this.updateAvailableTypes(null);
    }
  }

  onOtpInput(event: any) {
    // Auto-advance to next input when a digit is entered
    const target = event.target;
    if (target && target.value && target.nextElementSibling) {
      target.nextElementSibling.focus();
    }
  }

  focusOtpInput() {
    // Focus first OTP input when employee is selected
    setTimeout(() => {
      const firstInput = document.querySelector('.p-inputotp-input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }


  validateOtp() {
    if (this.isProcessing()) return;
    
    this.isProcessing.set(true);
    const { employee, otp, branch_id, company_id, type } =
      this.form.getRawValue();
    if (employee?.code_uri) {
      const totp = OTPAuth.URI.parse(employee.code_uri);
      const validation = totp.validate({ token: otp });
      if (validation === null) {
        this.isProcessing.set(false);
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Código incorrecto',
        });
        this.form.get('otp')?.reset();
        return;
      }
      
      const employeeName = `${employee.first_name} ${employee.father_name}`.trim();
      this.processTimelog(employee.id, branch_id, company_id, type, employeeName);
    } else {
      this.isProcessing.set(false);
    }
  }

  private processTimelog(employeeId: string, branchId: string, companyId: string, type: string, employeeName: string) {
    const now = new Date();
      this.http
        .post(`${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`, {
        employee_id: employeeId,
        branch_id: branchId,
        company_id: companyId,
          type,
        ip: this.getIP(),
          invalid_ip: !this.validIP(),
        })
        .pipe(
        switchMap(() => {
          // Check timing based on type
          if (type === 'entry') {
            return this.getEmployeeSchedule(employeeId).pipe(
              map(schedule => {
                const delay = this.calculateDelay(now, schedule?.schedule);
                return { delay, exitDiff: null, schedule, lunchEndDiff: null };
              }),
              catchError(() => of({ delay: null, exitDiff: null, schedule: null, lunchEndDiff: null }))
            );
          } else if (type === 'exit') {
            return this.getEmployeeSchedule(employeeId).pipe(
              map(schedule => {
                const exitDiff = this.calculateExitDifference(now, schedule?.schedule);
                return { delay: null, exitDiff, schedule, lunchEndDiff: null };
              }),
              catchError(() => of({ delay: null, exitDiff: null, schedule: null, lunchEndDiff: null }))
            );
          } else if (type === 'lunch_end') {
            return this.getEmployeeSchedule(employeeId).pipe(
              switchMap(schedule => {
                if (!schedule) {
                  return of({ delay: null, exitDiff: null, schedule: null, lunchEndDiff: null });
                }
                return this.getLunchStartTimelog(employeeId).pipe(
                  map(lunchStartLog => {
                    const lunchStartTime = lunchStartLog ? new Date(lunchStartLog.created_at) : null;
                    const lunchEndDiff = this.calculateLunchEndDifference(now, lunchStartTime, schedule?.schedule);
                    return { delay: null, exitDiff: null, schedule, lunchEndDiff };
                  }),
                  catchError(() => {
                    // If error getting lunch_start, just use schedule comparison
                    const lunchEndDiff = this.calculateLunchEndDifference(now, null, schedule?.schedule);
                    return of({ delay: null, exitDiff: null, schedule, lunchEndDiff });
                  })
                );
              }),
              catchError(() => of({ delay: null, exitDiff: null, schedule: null, lunchEndDiff: null }))
            );
          }
          return of({ delay: null, exitDiff: null, schedule: null, lunchEndDiff: null });
        }),
        catchError(() => {
          this.isProcessing.set(false);
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Algo salió mal, intente nuevamente',
            });
            return EMPTY;
          })
        )
        .subscribe({
        next: (result) => {
          const typeLabel = this.types.find(t => t.value === type)?.label || type;
          let message = `<div style="text-align: center;">
            <div style="margin-bottom: 0.5rem;"><b>${typeLabel}</b> registrada exitosamente a las <b>${format(
            now,
            'h:mm:ss aaa'
          )}</b></div>
          </div>`;
          
          // Add late warning for entry if applicable
          if (result.delay !== null && result.delay !== undefined) {
            const delayFormatted = this.formatTimeDifference(result.delay);
            message += `<br><div style="color: #ef4444; font-weight: bold; text-align: center;">😱 Marcaste tarde: ${delayFormatted} de retraso</div>`;
          } else if (type === 'entry' && result.schedule === null) {
            message += `<br><div style="color: #6b7280; font-style: italic; text-align: center;">ℹ️ No se encontró horario configurado para hoy</div>`;
          } else if (type === 'entry' && result.schedule?.schedule?.day_off) {
            message += `<br><div style="color: #6b7280; font-style: italic; text-align: center;">ℹ️ Día libre</div>`;
          } else if (type === 'entry') {
            message += `<br><div style="color: #10b981; font-weight: bold; text-align: center;">✓ Marcaste a tiempo</div>`;
          }
          
          // Add early/late warning for exit if applicable
          if (result.exitDiff !== null && result.exitDiff !== undefined) {
            const diffFormatted = this.formatTimeDifference(result.exitDiff.minutes);
            if (result.exitDiff.isEarly) {
              message += `<br><div style="color: #f59e0b; font-weight: bold; text-align: center;">😱 Saliste antes: ${diffFormatted} antes de la hora programada</div>`;
            } else {
              message += `<br><div style="color: #10b981; font-weight: bold; text-align: center;">✓ Saliste después: ${diffFormatted} después de la hora programada</div>`;
            }
          } else if (type === 'exit' && result.schedule === null) {
            message += `<br><div style="color: #6b7280; font-style: italic; text-align: center;">ℹ️ No se encontró horario configurado para hoy</div>`;
          } else if (type === 'exit' && result.schedule?.schedule?.day_off) {
            message += `<br><div style="color: #6b7280; font-style: italic; text-align: center;">ℹ️ Día libre</div>`;
          } else if (type === 'exit') {
            message += `<br><div style="color: #10b981; font-weight: bold; text-align: center;">✓ Saliste a tiempo</div>`;
          }
          
          // Check lunch time for lunch_end
          if (type === 'lunch_end' && result.schedule?.schedule) {
            const lunchEndDiff = result.lunchEndDiff !== null && result.lunchEndDiff !== undefined ? result.lunchEndDiff : null;
            if (lunchEndDiff !== null && lunchEndDiff > 0) {
              const diffFormatted = this.formatTimeDifference(lunchEndDiff);
              message += `<br><div style="color: #f59e0b; font-weight: bold; text-align: center;">⚠️ Regresaste tarde del almuerzo: ${diffFormatted} después de la hora programada</div>`;
            } else {
              message += `<br><div style="color: #10b981; font-weight: bold; text-align: center;">✓ Regresaste a tiempo del almuerzo</div>`;
            }
          }
          
          this.isProcessing.set(false);
            this.confirmation.confirm({
            message,
              key: 'confirm1',
              header: 'Éxito',
              icon: 'pi pi-check',
              acceptLabel: 'Aceptar',
              rejectVisible: false,
              accept: () => {
                this.form.get('otp')?.reset();
                this.form.get('employee')?.reset();
              this.showKeypad.set(false);
                if (!this.validIP()) {
                  this.alertInvalidIP();
                }
              },
            });
          },
        error: () => {
          this.isProcessing.set(false);
        }
        });
  }

  private alertInvalidIP() {
    this.confirmation.confirm({
      message: `La IP actual no coincide con la IP de ninguna sucursal, por favor verifique con Recursos Humanos`,
      header: 'Advertencia',
      key: 'confirm2',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Aceptar',
      rejectVisible: false,
    });
  }
}
