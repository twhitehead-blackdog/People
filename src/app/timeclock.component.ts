import { NgClass } from '@angular/common';
import { HttpClient, httpResource, HttpResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { format, getHours, getMinutes, getSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import * as OTPAuth from 'otpauth';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputOtp } from 'primeng/inputotp';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { catchError, EMPTY, firstValueFrom, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Branch,
  Company,
  Employee,
  EmployeeSchedule,
  NazBranch,
  NazCompany,
  NazSchedule,
  Schedule,
  TimeLog,
  TimelogType,
} from './models';
import { TrimPipe } from './pipes/trim.pipe';
import { ApiUrlService } from './services/api-url.service';
import { DiagnosticService } from './services/diagnostic.service';
import { IpMonitorService } from './services/ip-monitor.service';
import { OrganizationService } from './services/organization.service';
import { TimeSyncService } from './services/time-sync.service';
import {
  initAudioContext,
  playFailureSound,
  playLateSound,
  playSuccessSound,
} from './timeclock/timeclock-audio.utils';
import {
  calculateEntryDelay,
  calculateExitDifference,
  calculateLunchExcess,
  calculateStreak,
  formatTimeDifference,
  getAvailableTypes,
  getNextTimelogType,
  getPanamaNowParts,
} from './timeclock/timeclock-calculations.utils';
import { getEnv } from './utils/env.utils';

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
          <p class="text-center w-full">{{ message.message }}</p>
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
      [ngClass]="{
        'naz-theme': isNazCompany(),
        'blackdog-theme': isBlackDogCompany(),
        'timeclock-mobile-kiosk': isMobileKiosk()
      }"
      style="width: 100%; position: relative; min-height: 100vh; overflow-y: auto; overflow-x: hidden;"
    >
      @if (!isKioskMode() || isIPValid() || isNazCompany()) {
      <div
        class="flex flex-col gap-2 sm:gap-3 md:gap-4 items-center px-4 sm:px-6 md:px-8 relative z-10 timeclock-content"
        style="max-width: 100%; width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem 0.5rem;"
      >
        @if (isKioskMode()) {
        <img
          [src]="isNazCompany() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
          class="h-6 sm:h-8 md:h-10 w-auto object-contain drop-shadow-2xl relative z-10 mb-1 sm:mb-2 flex-shrink-0"
          style="max-width: 90%; height: auto;"
        />
        }
        <p-card class="w-full max-w-lg mx-auto timeclock-card relative z-10">
          <ng-template #title>
            <div
              class="flex flex-col gap-1.5 sm:gap-2 md:gap-2.5 items-center px-2 py-1"
            >
              <div
                class="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-100 text-center w-full break-words"
              >
                Reloj de Marcación
              </div>
              <!-- Clock Display inside card -->
              <div
                class="flex flex-col items-center gap-0.5 sm:gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2 sm:px-3 md:px-5 py-1.5 sm:py-2 md:py-2.5 border shadow-lg clock-display w-full mt-1"
                [ngClass]="
                  isBlackDogCompany()
                    ? 'border-yellow-500/40'
                    : 'border-gray-500/40'
                "
              >
                <div
                  class="text-lg sm:text-xl md:text-2xl lg:text-3xl font-mono font-bold clock-time break-words text-center"
                  [ngClass]="
                    isBlackDogCompany() ? 'text-yellow-400' : 'text-gray-300'
                  "
                >
                  {{ formattedTime() }}
                </div>
                <div
                  class="text-[10px] sm:text-xs md:text-sm text-gray-300 text-center break-words px-1"
                >
                  {{ formattedDate() }}
                </div>
              </div>
            </div>
          </ng-template>
          <ng-template #subtitle>
            <div
              class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[#d2d2d2] text-[10px] sm:text-xs md:text-sm font-semibold text-center px-2 py-1"
            >
              <div class="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                <i
                  [ngClass]="
                    isBlackDogCompany()
                      ? 'pi pi-building text-yellow-400 text-xs sm:text-sm flex-shrink-0'
                      : 'pi pi-building text-gray-400 text-xs sm:text-sm flex-shrink-0'
                  "
                ></i>
                <i
                  [ngClass]="
                    isBlackDogCompany()
                      ? 'pi pi-user text-yellow-400 text-xs sm:text-sm flex-shrink-0'
                      : 'pi pi-user text-gray-400 text-xs sm:text-sm flex-shrink-0'
                  "
                ></i>
              </div>
              <span class="flex-shrink-0"
                >Seleccione la sucursal y empleado</span
              >
            </div>
          </ng-template>
          <form
            [formGroup]="form"
            class="flex flex-col gap-2.5 sm:gap-3 md:gap-4 items-center w-full"
            (keydown.enter)="onEnterKey($event)"
          >
            @if (!form.get('company_id')?.value) {
            <div class="input-container w-full">
              <p-select
                formControlName="company_id"
                [options]="currentCompaniesResource()"
                placeholder="Seleccionar empresa"
                optionLabel="name"
                optionValue="id"
                filter
                filterBy="name"
                class="w-full"
                [styleClass]="'w-full'"
              />
            </div>
            } @if (form.get('company_id')?.value) {
            <div class="input-container w-full">
              <p-select
                formControlName="branch_id"
                [options]="currentBranchesResource()"
                placeholder="Seleccionar sucursal"
                optionValue="id"
                optionLabel="name"
                filter
                filterBy="name"
                class="w-full"
                [styleClass]="'w-full'"
                [disabled]="!canChangeBranch()"
              />
              @if (!canChangeBranch() && form.get('branch_id')?.value) {
              <p class="text-xs text-gray-400 mt-1 text-center">
                Sucursal detectada automáticamente por IP
              </p>
              }
            </div>
            }
            <div
              class="input-container w-full"
              [ngClass]="{
                'error-border':
                  form.get('employee')?.invalid && form.get('employee')?.touched
              }"
            >
              <p-select
                formControlName="employee"
                [options]="currentEmployeesResource()"
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
            <div
              class="w-full flex flex-col gap-0.5 sm:gap-1 items-center justify-center px-2"
            >
              <label
                class="text-gray-300 font-medium text-[11px] sm:text-xs md:text-sm text-center mb-1"
              >
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
            <div class="w-full flex justify-center items-center px-2">
              <p-button
                [disabled]="
                  form.invalid || isProcessing() || !form.get('employee')?.value
                "
                [loading]="isProcessing()"
                (onClick)="validateOtp()"
                [label]="isProcessing() ? 'Procesando...' : 'Marcar'"
                [icon]="
                  isProcessing()
                    ? 'pi pi-spin pi-spinner'
                    : 'pi pi-check-circle'
                "
                [size]="'large'"
                rounded
                [styleClass]="'mark-button w-full sm:w-auto'"
                [style]="{
                  background:
                    form.invalid || !form.get('employee')?.value
                      ? 'linear-gradient(135deg, #5d5d5d 0%, #4a4a4a 100%)'
                      : isBlackDogCompany()
                      ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  border: 'none',
                  'box-shadow':
                    form.invalid || !form.get('employee')?.value
                      ? 'none'
                      : isBlackDogCompany()
                      ? '0 4px 15px rgba(251, 191, 36, 0.4)'
                      : '0 4px 15px rgba(107, 114, 128, 0.4)'
                }"
              />
            </div>

            <!-- Validation Messages -->
            @if (form.get('employee')?.invalid && form.get('employee')?.touched)
            {
            <div
              class="text-gray-400 text-[11px] sm:text-xs text-center w-full mt-1 px-2"
            >
              Debe seleccionar un empleado para continuar.
            </div>
            }
          </form>
        </p-card>
      </div>
      } @else {
      <!-- Mensaje de acceso restringido en modo kiosko -->
      <div
        class="flex flex-col gap-3 sm:gap-4 items-center px-4 sm:px-6 md:px-8 relative z-10"
        style="max-width: 100%; width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem 0.5rem;"
      >
        <img
          [src]="isNazCompany() ? 'images/Naz_Logo.jpg' : 'images/blackdog.png'"
          class="h-6 sm:h-8 md:h-10 w-auto object-contain drop-shadow-2xl relative z-10 mb-1 sm:mb-2"
        />
        <p-card class="w-full timeclock-card relative z-10">
          <ng-template pTemplate="title">
            <div class="flex flex-col gap-3 items-center">
              <div class="relative">
                <div
                  class="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center shadow-lg shadow-red-500/20 border border-red-500/30 animate-pulse"
                >
                  <i
                    class="pi pi-exclamation-triangle text-red-400 text-3xl md:text-4xl drop-shadow-lg"
                  ></i>
                </div>
                <div
                  class="absolute inset-0 w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-500/10 animate-ping"
                ></div>
              </div>
              <h1
                class="text-xl md:text-2xl font-semibold text-white m-0 text-center"
              >
                Acceso Restringido
              </h1>
            </div>
          </ng-template>
          <div class="space-y-4 text-gray-300 text-center">
            <p class="text-base md:text-lg text-white font-medium">
              Dirección IP no autorizada
            </p>
            <p class="text-sm md:text-base leading-relaxed">
              Tu dirección IP actual no está autorizada para usar el modo
              kiosko.
            </p>
            @if (currentIP()) {
            <div
              class="mt-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700"
            >
              <p class="text-xs text-gray-400 mb-1">IP detectada:</p>
              <p
                class="text-sm text-red-400 font-mono font-semibold text-center"
              >
                {{ currentIP() }}
              </p>
            </div>
            }
            <p class="text-xs md:text-sm text-gray-400 italic">
              Si cambias de red o tu IP cambia, el acceso será bloqueado
              automáticamente.
            </p>
          </div>
        </p-card>
      </div>
      }
    </div>`,
  styles: `
    .animated-gradient-container {
      position: relative;
      min-height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s ease;
    }

    :host-context(html.dark) .animated-gradient-container {
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 25%, #000000 50%, #0d0d0d 75%, #2a2a2a 100%);
    }

    :host-context(html.light) .animated-gradient-container {
      background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 25%, #fafafa 50%, #ffffff 75%, #f0f0f0 100%);
    }
    
    /* Beautiful custom scrollbar */
    .animated-gradient-container::-webkit-scrollbar {
      width: 10px;
    }
    
    :host-context(html.dark) .animated-gradient-container::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
      margin: 10px 0;
    }

    :host-context(html.light) .animated-gradient-container::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 10px;
      margin: 10px 0;
    }
    
    :host-context(html.dark) .animated-gradient-container::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(107, 114, 128, 0.6) 0%, rgba(107, 114, 128, 0.4) 100%);
      border-radius: 10px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      box-shadow: 0 0 10px rgba(107, 114, 128, 0.3);
      transition: all 0.3s ease;
    }

    :host-context(html.light) .animated-gradient-container::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(107, 114, 128, 0.4) 0%, rgba(107, 114, 128, 0.3) 100%);
      border-radius: 10px;
      border: 2px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 0 10px rgba(107, 114, 128, 0.2);
      transition: all 0.3s ease;
    }
    
    :host-context(html.dark) .animated-gradient-container::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(107, 114, 128, 0.8) 0%, rgba(107, 114, 128, 0.6) 100%);
      box-shadow: 0 0 15px rgba(107, 114, 128, 0.5);
    }

    :host-context(html.light) .animated-gradient-container::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(107, 114, 128, 0.6) 0%, rgba(107, 114, 128, 0.5) 100%);
      box-shadow: 0 0 15px rgba(107, 114, 128, 0.3);
    }
    
    .animated-gradient-container::-webkit-scrollbar-thumb:active {
      background: linear-gradient(180deg, rgba(107, 114, 128, 1) 0%, rgba(107, 114, 128, 0.8) 100%);
    }
    
    /* Firefox scrollbar */
    .animated-gradient-container {
      scrollbar-width: thin;
      scrollbar-color: rgba(107, 114, 128, 0.6) rgba(0, 0, 0, 0.3);
    }
    
    .timeclock-content {
      flex-shrink: 0;
    }

    /* Versión móvil modo kiosko: logo más grande, controles táctiles más grandes */
    .timeclock-mobile-kiosk .timeclock-content img {
      height: 4rem !important;
      max-height: 80px !important;
    }
    .timeclock-mobile-kiosk .timeclock-content {
      padding: 1.5rem 0.75rem !important;
      gap: 1rem !important;
    }
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-card-body,
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-card-content {
      padding: 1.25rem !important;
    }
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-select,
    .timeclock-mobile-kiosk .timeclock-card ::ng-deep .p-inputotp {
      min-height: 3rem;
    }
    .timeclock-mobile-kiosk .mark-button ::ng-deep .p-button {
      min-height: 3.5rem;
      font-size: 1.125rem;
    }
    
    @media (max-width: 640px) {
      .timeclock-content {
        padding: 0.75rem 0.25rem !important;
      }
    }
    
    @media (max-height: 700px) {
      .timeclock-content {
        padding: 0.5rem 0.25rem !important;
      }
    }
    
    @media (max-height: 600px) {
      .timeclock-content {
        padding: 0.25rem 0.25rem !important;
      }
    }
    
    
    .timeclock-card {
      border: 2px solid rgba(107, 114, 128, 0.5) !important;
      border-radius: 12px !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(107, 114, 128, 0.2) !important;
      backdrop-filter: blur(10px);
      background: rgba(38, 38, 38, 0.95) !important;
      animation: cardEntrance 0.25s ease-out;
    }
    
    @media (max-width: 640px) {
      .timeclock-card ::ng-deep .p-card-body {
        padding: 0.75rem !important;
      }
      
      .timeclock-card ::ng-deep .p-card-title {
        padding: 0.5rem 0.75rem !important;
        overflow: visible !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      .timeclock-card ::ng-deep .p-card-subtitle {
        padding: 0.5rem 0.75rem !important;
        overflow: visible !important;
        min-height: auto !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      .timeclock-card ::ng-deep .p-card-title *,
      .timeclock-card ::ng-deep .p-card-subtitle * {
        position: relative !important;
        z-index: 1 !important;
      }
      
      .timeclock-card ::ng-deep .p-card-subtitle .flex {
        flex-wrap: wrap !important;
        justify-content: center !important;
        gap: 0.5rem !important;
      }
      
      .timeclock-card ::ng-deep .p-card-subtitle .flex > div {
        flex-shrink: 0 !important;
      }
      
      .timeclock-card ::ng-deep .p-card-subtitle span {
        display: inline-block !important;
        text-align: center !important;
        line-height: 1.4 !important;
      }
    }
    
    @media (min-width: 641px) and (max-width: 1024px) {
      .timeclock-card ::ng-deep .p-card-body {
        padding: 1.25rem !important;
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
      border: 1px solid rgba(107, 114, 128, 0.5) !important;
    }
    
    .clock-time {
      text-shadow: 0 0 10px rgba(107, 114, 128, 0.8);
      animation: clockPulse 2s ease-in-out infinite;
    }
    
    @keyframes clockPulse {
      0%, 100% {
        text-shadow: 0 0 10px rgba(107, 114, 128, 0.8);
      }
      50% {
        text-shadow: 0 0 20px rgba(107, 114, 128, 1), 0 0 30px rgba(107, 114, 128, 0.6);
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
      border: 2px solid rgba(107, 114, 128, 0.5) !important;
    }
    
    .timeclock-card ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(107, 114, 128, 0.8) !important;
      box-shadow: 0 0 10px rgba(107, 114, 128, 0.3) !important;
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
      min-width: 36px !important;
      max-width: 48px !important;
      height: 40px !important;
      font-size: 0.95rem !important;
      border: 2px solid rgba(107, 114, 128, 0.5) !important;
      border-radius: 8px !important;
      background: rgba(31, 41, 55, 0.8) !important;
      color: #9ca3af !important;
      font-weight: bold !important;
      flex: 0 0 auto !important;
    }
    
    .timeclock-card ::ng-deep .p-inputotp-input:focus {
      border-color: rgba(107, 114, 128, 0.9) !important;
      box-shadow: 0 0 15px rgba(107, 114, 128, 0.4) !important;
      outline: none !important;
    }
    
    .timeclock-card ::ng-deep .p-inputotp-input:not(:placeholder-shown) {
      border-color: rgba(107, 114, 128, 0.7) !important;
    }
    
    @media (max-width: 640px) {
      .timeclock-card ::ng-deep .p-inputotp {
        gap: 0.375rem !important;
      }
      
      .timeclock-card ::ng-deep .p-inputotp-input {
        min-width: 30px !important;
        max-width: 36px !important;
        height: 36px !important;
        font-size: 0.8125rem !important;
      }
    }
    
    @media (min-width: 641px) and (max-width: 1024px) {
      .timeclock-card ::ng-deep .p-inputotp-input {
        min-width: 38px !important;
        max-width: 44px !important;
        height: 42px !important;
        font-size: 0.9rem !important;
      }
    }
    
    .input-container ::ng-deep .p-select {
      width: 100%;
    }
    
    .input-container ::ng-deep .p-select .p-select-trigger {
      padding: 0.5rem 0.75rem;
      min-height: 42px;
      font-size: 0.875rem;
    }
    
    @media (max-width: 640px) {
      .input-container ::ng-deep .p-select .p-select-trigger {
        padding: 0.45rem 0.65rem;
        min-height: 40px;
        font-size: 0.8125rem;
      }
    }
    
    @media (min-width: 641px) and (max-width: 1024px) {
      .input-container ::ng-deep .p-select .p-select-trigger {
        padding: 0.55rem 0.8rem;
        min-height: 44px;
        font-size: 0.9rem;
      }
    }
    
    .timeclock-card ::ng-deep .mark-button {
      margin: 0 auto !important;
      display: block !important;
    }
    
    .timeclock-card ::ng-deep .mark-button.w-full {
      width: 100% !important;
    }
    
    .timeclock-card ::ng-deep .mark-button.w-full button {
      width: 100% !important;
    }
    
    .timeclock-card ::ng-deep .mark-button button {
      margin: 0 auto !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      flex-direction: row !important;
      padding: 0.625rem 1.5rem !important;
      font-size: 0.875rem !important;
    }
    
    @media (max-width: 640px) {
      .timeclock-card ::ng-deep .mark-button button {
        padding: 0.5rem 1.25rem !important;
        font-size: 0.8125rem !important;
        min-height: 42px !important;
      }
    }
    
    @media (min-width: 641px) and (max-width: 1024px) {
      .timeclock-card ::ng-deep .mark-button button {
        padding: 0.75rem 1.75rem !important;
        font-size: 0.9rem !important;
      }
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
      box-shadow: 0 6px 25px rgba(107, 114, 128, 0.6) !important;
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

    /* ============================================
       TEMA NAZ - ESTILOS MINIMALISTAS PREMIUM
       ============================================ */
    
    /* Fondo Naz - negro con animación de lava lamp plateada */
    .naz-theme .animated-gradient-container {
      /* Background handled by theme service */
      position: relative;
      overflow: hidden;
    }

    /* Animación de lava lamp plateada para timeclock Naz */
    .naz-theme .animated-gradient-container::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.5) 0%,
          rgba(255, 255, 255, 0.6) 2%,
          rgba(229, 226, 223, 0.65) 4%,
          rgba(198, 194, 191, 0.55) 6%,
          transparent 8%,
          transparent 12%,
          rgba(198, 194, 191, 0.5) 14%,
          rgba(229, 226, 223, 0.6) 16%,
          rgba(255, 255, 255, 0.55) 18%,
          transparent 20%
        ),
        linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.6) 0%,
          rgba(229, 226, 223, 0.7) 25%,
          rgba(198, 194, 191, 0.6) 50%,
          rgba(229, 226, 223, 0.65) 75%,
          rgba(255, 255, 255, 0.55) 100%
        );
      animation: silverLavaFlow 25s ease-in-out infinite;
      z-index: 0;
      filter: blur(25px);
      pointer-events: none;
    }

    .naz-theme .animated-gradient-container::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(
          -45deg,
          rgba(229, 226, 223, 0.55) 0%,
          rgba(255, 255, 255, 0.65) 2%,
          rgba(198, 194, 191, 0.6) 4%,
          rgba(229, 226, 223, 0.5) 6%,
          transparent 8%,
          transparent 12%,
          rgba(255, 255, 255, 0.55) 14%,
          rgba(198, 194, 191, 0.65) 16%,
          rgba(229, 226, 223, 0.6) 18%,
          transparent 20%
        ),
        linear-gradient(
          -135deg,
          rgba(198, 194, 191, 0.7) 0%,
          rgba(229, 226, 223, 0.75) 30%,
          rgba(255, 255, 255, 0.65) 60%,
          rgba(198, 194, 191, 0.6) 100%
        );
      animation: silverLavaFlow 30s ease-in-out infinite reverse;
      z-index: 0;
      filter: blur(30px);
      pointer-events: none;
    }

    @keyframes silverLavaFlow {
      0% {
        transform: translate(-20%, -20%) rotate(0deg) scale(1);
        opacity: 0.9;
      }
      25% {
        transform: translate(10%, 5%) rotate(5deg) scale(1.1);
        opacity: 1;
      }
      50% {
        transform: translate(5%, 15%) rotate(-3deg) scale(0.95);
        opacity: 0.85;
      }
      75% {
        transform: translate(-10%, 8%) rotate(4deg) scale(1.05);
        opacity: 0.95;
      }
      100% {
        transform: translate(-20%, -20%) rotate(0deg) scale(1);
        opacity: 0.9;
      }
    }

    /* ============================================
       TEMA BLACK DOG - ESTILOS AMARILLOS
       ============================================ */
    
    /* Aplicar colores amarillos cuando es Black Dog */
    .blackdog-theme .timeclock-card {
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(251, 191, 36, 0.2) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-card-body {
      background: rgba(38, 38, 38, 0.95) !important;
      border-radius: 12px !important;
    }
    
    .blackdog-theme .clock-display {
      border: 1px solid rgba(251, 191, 36, 0.5) !important;
    }
    
    .blackdog-theme .clock-time {
      color: #fbbf24 !important;
      text-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
      animation: clockPulseYellow 2s ease-in-out infinite;
    }
    
    @keyframes clockPulseYellow {
      0%, 100% {
        text-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
      }
      50% {
        text-shadow: 0 0 20px rgba(251, 191, 36, 1), 0 0 30px rgba(251, 191, 36, 0.6);
      }
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-select .p-select-trigger {
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-select:focus-within .p-select-trigger {
      border-color: rgba(251, 191, 36, 0.8) !important;
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-inputotp-input {
      border: 2px solid rgba(251, 191, 36, 0.5) !important;
      color: #fbbf24 !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-inputotp-input:focus {
      border-color: rgba(251, 191, 36, 0.9) !important;
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.4) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-inputotp-input:not(:placeholder-shown) {
      border-color: rgba(251, 191, 36, 0.7) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .p-button:not(:disabled):hover {
      box-shadow: 0 6px 25px rgba(251, 191, 36, 0.6) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .mark-button button {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
      box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4) !important;
    }
    
    .blackdog-theme .timeclock-card ::ng-deep .mark-button button:disabled {
      background: linear-gradient(135deg, #5d5d5d 0%, #4a4a4a 100%) !important;
      box-shadow: none !important;
    }
    
    /* Scrollbar amarillo para Black Dog */
    .blackdog-theme .animated-gradient-container::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.6) 0%, rgba(251, 191, 36, 0.4) 100%);
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
    }
    
    .blackdog-theme .animated-gradient-container::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0.6) 100%);
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
    }
    
    .blackdog-theme .animated-gradient-container::-webkit-scrollbar-thumb:active {
      background: linear-gradient(180deg, rgba(251, 191, 36, 1) 0%, rgba(251, 191, 36, 0.8) 100%);
    }
    
    .blackdog-theme .animated-gradient-container {
      scrollbar-color: rgba(251, 191, 36, 0.6) rgba(0, 0, 0, 0.3);
    }
    
    /* Iconos amarillos para Black Dog */
    .blackdog-theme .pi-building,
    .blackdog-theme .pi-user {
      color: #fbbf24 !important;
    }

  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeclockComponent implements OnDestroy {
  private message = inject(MessageService);
  private confirmation = inject(ConfirmationService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private router = inject(Router);
  private ipMonitor = inject(IpMonitorService);
  private organizationService = inject(OrganizationService);
  private timeSync = inject(TimeSyncService);
  private destroyRef = inject(DestroyRef);
  private diagnosticService = inject(DiagnosticService);
  private readonly DISPLAY_TIMEZONE = 'America/Panama';
  // Get IP address - try multiple methods to get real IP even from localhost
  public currentIP = signal<string>('127.0.0.1');
  public isProcessing = signal<boolean>(false);
  public showKeypad = signal<boolean>(false);
  public currentTime = signal<Date>(new Date());
  public availableTypes = signal<Array<{ value: string; label: string }>>([]);
  public isKioskMode = signal<boolean>(false);
  public isMobileKiosk = signal<boolean>(false);
  public isIPValid = signal<boolean>(true);
  // Usar el servicio de organización como fuente principal
  public isNazCompany = computed(() => this.organizationService.isNaz());
  public isBlackDogCompany = computed(() =>
    this.organizationService.isBlackDog()
  );
  // Ya no hay tablas naz_*, todo es por company_id
  private employeesTable = computed(() => 'employees');

  private injector = inject(Injector);
  private timeInterval: any;

  // Update time every second
  constructor() {
    // Detectar organización desde URL
    const urlParams = new URLSearchParams(window.location.search);
    const orgParam = urlParams.get('org');
    if (orgParam === 'naz' || orgParam === 'blackdog') {
      this.organizationService.setOrganization(orgParam as 'naz' | 'blackdog');
    }

    // Detectar si está en modo kiosko y si es versión móvil
    const isKioskRoute = this.router.url.includes('/timeclock-kiosk');
    this.isKioskMode.set(isKioskRoute);
    this.isMobileKiosk.set(this.router.url.includes('/timeclock-kiosk-mobile'));

    // Sincronizar reloj con hora del servidor (sin tocar DB).
    // Esto evita depender del reloj/zona horaria del dispositivo.
    this.timeSync.init();

    this.timeInterval = setInterval(() => {
      this.currentTime.set(this.timeSync.now());
    }, 1000);

    // Initialize available types
    this.availableTypes.set(this.types);

    // Try to get real IP address using multiple methods
    this.detectIP();

    // Si está en modo kiosko y NO es Naz, monitorear la IP continuamente
    if (isKioskRoute && !this.isNazCompany()) {
      this.setupKioskModeMonitoring();
    } else if (isKioskRoute && this.isNazCompany()) {
      // Para Naz, siempre considerar la IP como válida
      this.isIPValid.set(true);
    }

    // Monitorear errores de recursos httpResource
    effect(() => {
      const companiesError = this.companiesResource.error();
      const branchesError = this.branchesResource.error();
      const employeesError = this.employeesResource.error();

      if (companiesError) {
        this.diagnosticService.addHttpResourceError(
          this.apiUrl.build('rest/v1/companies'),
          companiesError,
          'companiesResource'
        );
      }

      if (branchesError) {
        this.diagnosticService.addHttpResourceError(
          this.apiUrl.build('rest/v1/branches'),
          branchesError,
          'branchesResource'
        );
      }

      if (employeesError) {
        this.diagnosticService.addHttpResourceError(
          this.apiUrl.build('rest/v1/employees'),
          employeesError,
          'employeesResource'
        );
      }
    });

    // Auto-select company and branch when data loads
    effect(
      () => {
        const isNaz = this.isNazCompany();
        const companies = this.currentCompaniesResource();
        const branches = this.currentBranchesResource();

        // Auto-select company if not already selected
        if (
          companies &&
          companies.length > 0 &&
          !this.form.get('company_id')?.value
        ) {
          let targetCompany: Company | NazCompany | undefined;

          if (isNaz) {
            // For Naz: auto-select "Naz" company
            targetCompany = companies.find((c: Company) =>
              c.name.toLowerCase().includes('naz')
            ) as Company | undefined;
          } else {
            // For Black Dog: auto-select "Black Dog Panamá" company
            // First try exact match for "Black Dog Panamá"
            targetCompany = companies.find((c: Company) => {
              const name = c.name.toLowerCase();
              return (
                name === 'black dog panamá' ||
                name === 'blackdog panamá' ||
                name === 'black dog panama' ||
                name === 'blackdog panama'
              );
            }) as Company | undefined;

            // If not found, try partial matches with both "black dog" and "panamá"
            if (!targetCompany) {
              targetCompany = companies.find((c: Company) => {
                const name = c.name.toLowerCase();
                return (
                  (name.includes('black dog') || name.includes('blackdog')) &&
                  (name.includes('panamá') || name.includes('panama'))
                );
              }) as Company | undefined;
            }

            // Last resort: just look for "black dog" or "blackdog"
            if (!targetCompany) {
              targetCompany = companies.find((c: Company) => {
                const name = c.name.toLowerCase();
                return name.includes('black dog') || name.includes('blackdog');
              }) as Company | undefined;
            }
          }

          if (targetCompany) {
            this.form.get('company_id')?.setValue(targetCompany.id);
          }
        }

        // Auto-select branch if not already selected
        const selectedCompanyId = this.form.get('company_id')?.value;
        if (
          branches &&
          branches.length > 0 &&
          !this.form.get('branch_id')?.value
        ) {
          if (isNaz) {
            // For Naz: auto-select "Calle 50" branch
            const calle50Branch = branches.find((b: Branch) => {
              const name = b.name.toLowerCase();
              return (
                (name.includes('calle 50') || name.includes('calle50')) &&
                b.company_id === selectedCompanyId
              );
            }) as Branch | undefined;
            if (calle50Branch) {
              this.form.get('branch_id')?.setValue(calle50Branch.id);
            }
          } else {
            // For Black Dog: auto-select branch by IP if found
            const currentIP = this.getIP();
            if (currentIP && currentIP !== '127.0.0.1') {
              // Find branch matching the IP
              const matchingBranch = branches.find(
                (b: Branch) => b.ip === currentIP
              );
              if (matchingBranch) {
                this.form.get('branch_id')?.setValue(matchingBranch.id);
              }
            }
          }
        }
      },
      { injector: this.injector }
    );

    // Auto-detect timelog type when employee is selected
    this.form.get('employee')?.valueChanges.subscribe((employee) => {
      this.onEmployeeSelected(employee);
    });

    // Clear employee selection when company changes
    effect(
      () => {
        const companyId = this.form.get('company_id')?.value;
        if (companyId) {
          this.form.get('employee')?.reset();
        }
      },
      { injector: this.injector }
    );
  }

  /**
   * Configura el monitoreo de IP en modo kiosko
   */
  private setupKioskModeMonitoring(): void {
    // Suscribirse al estado de validez de la IP
    this.ipMonitor.isIPValid
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isValid) => {
        this.isIPValid.set(isValid);

        if (!isValid) {
          // Mostrar alerta cuando la IP no es válida
          this.message.add({
            severity: 'error',
            summary: 'Acceso Restringido',
            detail:
              'La dirección IP no está autorizada para usar el modo kiosko. El acceso ha sido bloqueado.',
            life: 0, // No desaparece automáticamente
            closable: true,
          });
        } else {
          // Limpiar mensajes de error si la IP vuelve a ser válida
          this.message.clear();
        }
      });

    // También suscribirse a cambios de IP para detectar cambios de red
    this.ipMonitor.currentIP
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ip) => {
        if (ip) {
          this.currentIP.set(ip);
        }
      });

    // Resetear formulario cuando cambia la organización
    effect(() => {
      const isNaz = this.isNazCompany();
      // Resetear empleado, branch y company cuando cambia la organización
      // Esto evita usar valores de una organización en la otra
      this.form.get('employee')?.reset();
      this.form.get('branch_id')?.reset();
      this.form.get('company_id')?.reset();
      this.form.get('otp')?.reset();
    });
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    // Detener monitoreo de IP si está activo
    if (this.isKioskMode()) {
      this.ipMonitor.stopMonitoring();
    }
  }

  // Detect IP address using multiple methods
  private detectIP() {
    // Method 1: Try WebRTC (works even from localhost)
    this.getIPViaWebRTC()
      .then((ip) => {
        if (ip && ip !== '127.0.0.1' && ip !== '::1') {
          this.currentIP.set(ip);
          return;
        }

        // Method 2: Try ipify.org (may have CORS issues in dev)
        this.getIPViaHttp()
          .then((ip) => {
            if (ip && ip !== '127.0.0.1') {
              this.currentIP.set(ip);
            }
          })
          .catch(() => {
            // Method 3: Try alternative service
            this.getIPViaAlternative()
              .then((ip) => {
                if (ip && ip !== '127.0.0.1') {
                  this.currentIP.set(ip);
                }
              })
              .catch(() => {
                // Keep default 127.0.0.1 if all methods fail
              });
          });
      })
      .catch(() => {
        // If WebRTC fails, try HTTP methods
        this.getIPViaHttp()
          .then((ip) => {
            if (ip && ip !== '127.0.0.1') {
              this.currentIP.set(ip);
            }
          })
          .catch(() => {
            this.getIPViaAlternative()
              .then((ip) => {
                if (ip && ip !== '127.0.0.1') {
                  this.currentIP.set(ip);
                }
              })
              .catch(() => {
                // Keep default
              });
          });
      });
  }

  // Method 1: Get IP via WebRTC (works from localhost)
  private getIPViaWebRTC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const RTCPeerConnection =
        (window as any).RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;

      if (!RTCPeerConnection) {
        reject(new Error('WebRTC not supported'));
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      const ips: string[] = [];

      pc.createDataChannel('');

      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const match = candidate.match(
            /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/
          );
          if (match) {
            const ip = match[1];
            if (
              ips.indexOf(ip) === -1 &&
              !ip.startsWith('127.') &&
              ip !== '::1'
            ) {
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
      this.http
        .get<{ ip: string }>('https://api.ipify.org?format=json', {
          headers: { Accept: 'application/json' },
        })
        .subscribe({
          next: (data) => resolve(data.ip),
          error: () => reject(new Error('HTTP method failed')),
        });
    });
  }

  // Method 3: Get IP via alternative service
  private getIPViaAlternative(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http
        .get<{ ip: string }>('https://api64.ipify.org?format=json', {
          headers: { Accept: 'application/json' },
        })
        .subscribe({
          next: (data) => resolve(data.ip),
          error: () => reject(new Error('Alternative method failed')),
        });
    });
  }

  // Update available types based on last timelog
  private updateAvailableTypes(lastType: string | null) {
    this.availableTypes.set(getAvailableTypes(lastType, this.types));
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
    return formatInTimeZone(
      this.currentTime(),
      this.DISPLAY_TIMEZONE,
      'h:mm:ss aaa'
    );
  });

  // Format date for display
  formattedDate = computed(() => {
    const date = toZonedTime(this.currentTime(), this.DISPLAY_TIMEZONE);
    return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  });

  // Get IP - always returns a valid IP (localhost in dev)
  public getIP = computed(() => {
    return this.currentIP() || '127.0.0.1';
  });

  public validIP = computed(() => {
    // Naz no tiene validación de IP
    if (this.isNazCompany()) return true;

    const ip = this.getIP();
    // If IP is localhost (dev fallback), always allow
    if (ip === '127.0.0.1') return true;
    const branches = this.currentBranchesResource();
    if (!branches) return true;
    return branches.some((branch: Branch | NazBranch) => branch.ip === ip);
  });

  public types = Object.entries(TimelogType).map(([key, value]) => ({
    value: key,
    label: value,
  }));

  public companiesResource = httpResource<Company[]>(() => ({
    url: this.apiUrl.build('rest/v1/companies'),
    method: 'GET',
    params: {
      select: 'id,name',
      order: 'name',
    },
  }));

  public branchesResource = httpResource<Branch[]>(() => ({
    url: this.apiUrl.build('rest/v1/branches'),
    method: 'GET',
    params: {
      select: 'id,name,ip,company_id',
      order: 'name',
    },
  }));

  // Computed signals to select the correct resource based on organization
  // Ya no se usan tablas naz_*, todo es por company_id
  public currentCompaniesResource = computed<Company[] | undefined>(() => {
    return this.companiesResource.value();
  });

  public currentBranchesResource = computed<Branch[] | undefined>(() => {
    const branches = this.branchesResource.value();
    if (!branches) return undefined;

    // Filtrar branches por company_id actual si está disponible
    const companyId = this.organizationService.getCurrentCompanyId();
    if (companyId) {
      return branches.filter((b) => b.company_id === companyId);
    }
    return branches;
  });

  // Determinar si se puede cambiar la sucursal (solo si es oficina central)
  public canChangeBranch = computed(() => {
    const currentIP = this.getIP();
    if (!currentIP || currentIP === '127.0.0.1') {
      return true; // Permitir cambio si no se puede detectar la IP
    }

    const branches = this.currentBranchesResource();
    if (!branches || branches.length === 0) {
      return true; // Permitir cambio si no hay sucursales cargadas
    }

    // Buscar la sucursal que coincide con la IP actual
    const matchingBranch = branches.find(
      (b: Branch | NazBranch) => b.ip === currentIP
    );

    if (!matchingBranch) {
      return true; // Permitir cambio si no hay sucursal que coincida con la IP
    }

    // Verificar si la sucursal es oficina central
    const branchName = matchingBranch.name.toLowerCase();
    const isCentralOffice =
      branchName.includes('oficina central') ||
      branchName.includes('central') ||
      branchName.includes('oficina');

    return isCentralOffice;
  });

  // Separate resources for regular employees and Naz employees
  public employeesResource = httpResource<Partial<Employee>[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: 'id,first_name,father_name,code_uri',
      order: 'father_name',
      is_active: 'eq.true',
    };

    // Filtrar por company_id siempre (ya no hay tablas naz_*)
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: this.apiUrl.build('rest/v1/employees'),
      method: 'GET',
      params,
    };
  });

  // Computed to select employees - ya no se usan tablas naz_*
  public currentEmployeesResource = computed<Partial<Employee>[] | undefined>(
    () => {
      const employees = this.employeesResource.value();

      if (!employees) return undefined;

      // Deduplicar por id para evitar empleados duplicados
      const uniqueEmployees = new Map<string, Partial<Employee>>();
      employees.forEach((emp) => {
        if (emp.id && !uniqueEmployees.has(emp.id)) {
          uniqueEmployees.set(emp.id, emp);
        }
      });

      return Array.from(uniqueEmployees.values());
    }
  );

  // Get last timelog for an employee today to determine next type
  private getLastTimelog(employeeId: string): Observable<TimeLog | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = `${today}T00:00:00`;
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: 'id,type,created_at',
      employee_id: `eq.${employeeId}`,
      created_at: `gte.${todayStart}`,
      order: 'created_at.desc',
      limit: '1',
    };

    // Filtrar por company_id
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    const url = this.apiUrl.build('rest/v1/timelogs', params);
    return this.http.get<TimeLog[]>(url).pipe(
      map((timelogs) => {
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

  // Delegates to pure function
  private getNextTimelogType(lastType: string | null): string {
    return getNextTimelogType(lastType);
  }

  // Get employee schedule for today
  private getEmployeeSchedule(
    employeeId: string
  ): Observable<EmployeeSchedule | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: '*,schedule:schedules(*)',
      employee_id: `eq.${employeeId}`,
      start_date: `lte.${today}`,
      end_date: `gte.${today}`,
    };

    // Filtrar por company_id
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return this.http
      .get<EmployeeSchedule[]>(
        this.apiUrl.build('rest/v1/employee_schedules'),
        { params }
      )
      .pipe(
        map((schedules) =>
          schedules && schedules.length > 0 ? schedules[0] : null
        ),
        catchError((error) => {
          console.error('Error getting employee schedule:', error);
          return of(null);
        })
      );
  }

  private calculateDelay(
    entryTime: Date,
    schedule: Schedule | NazSchedule | undefined
  ): number | null {
    return calculateEntryDelay(entryTime, schedule);
  }

  private formatTimeDifference(minutes: number): string {
    return formatTimeDifference(minutes);
  }

  // Get lunch_start timelog for today
  private getLunchStartTimelog(employeeId: string): Observable<TimeLog | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: 'id,type,created_at',
      employee_id: `eq.${employeeId}`,
      type: 'eq.lunch_start',
      and: `(created_at.gte.${todayStart},created_at.lte.${todayEnd})`,
      order: 'created_at.desc',
      limit: '1',
    };

    // Filtrar por company_id
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    const url = this.apiUrl.build('rest/v1/timelogs', params);
    return this.http.get<TimeLog[]>(url).pipe(
      map((timelogs) => {
        if (!timelogs || timelogs.length === 0) {
          return null;
        }
        const lunchStartLog = timelogs[0];
        const logDate = format(
          new Date(lunchStartLog.created_at),
          'yyyy-MM-dd'
        );
        return logDate === today ? lunchStartLog : null;
      }),
      catchError(() => of(null))
    );
  }

  private calculateLunchEndDifference(
    lunchEndTime: Date,
    lunchStartTime: Date | null,
    _schedule: Schedule | NazSchedule | undefined | null
  ): { exceededMinutes: number; shouldShowWarning: boolean } | null {
    return calculateLunchExcess(lunchEndTime, lunchStartTime);
  }

  private calculateExitDifference(
    exitTime: Date,
    schedule: Schedule | NazSchedule | undefined
  ): { minutes: number; isEarly: boolean } | null {
    return calculateExitDifference(exitTime, schedule);
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
    // Inicializar audio con interacción del usuario
    initAudioContext();
    
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
        },
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
      const firstInput = document.querySelector(
        '.p-inputotp-input'
      ) as HTMLInputElement;
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

    const isNaz = this.isNazCompany();
    const serviceCompanyId = this.organizationService.getCurrentCompanyId();

    // Validar que los datos sean correctos para la organización
    if (!employee || !employee.id) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor seleccione un empleado',
      });
      return;
    }

    if (!branch_id) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor seleccione una sucursal',
      });
      return;
    }

    // Ya no hay tablas naz_*, todo es por company_id en tablas compartidas
    // Para Black Dog, usar el del servicio o formulario
    let finalCompanyId: string | null = null;

    if (isNaz) {
      // Para Naz, priorizar el company_id del formulario (que es de naz_companies)
      // Si no hay, buscar en la lista de naz_companies
      finalCompanyId = company_id || null;

      if (!finalCompanyId) {
        const companies = this.currentCompaniesResource();
        if (companies && companies.length > 0) {
          // Buscar la compañía "Naz" en companies
          const nazCompany = companies.find((c: Company) =>
            c.name.toLowerCase().includes('naz')
          ) as Company | undefined;

          if (nazCompany) {
            finalCompanyId = nazCompany.id;
            // Auto-seleccionar en el formulario
            this.form.get('company_id')?.setValue(nazCompany.id);
          }
        }
      }
    } else {
      // Para Black Dog, usar el del servicio o formulario
      finalCompanyId = company_id || serviceCompanyId || null;
    }

    if (!finalCompanyId) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor seleccione una compañía',
      });
      return;
    }

    // Verificar que el empleado, branch y company sean de las tablas correctas
    const employees = this.currentEmployeesResource();
    const branches = this.currentBranchesResource();
    const companies = this.currentCompaniesResource();

    // Verificar que el empleado seleccionado esté en la lista correcta
    if (employees && !employees.some((e) => e.id === employee.id)) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'El empleado seleccionado no es válido para esta organización. Por favor, seleccione un empleado válido.',
      });
      this.form.get('employee')?.reset();
      return;
    }

    // Verificar que el branch esté en la lista correcta
    if (branches && !branches.some((b) => b.id === branch_id)) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'La sucursal seleccionada no es válida para esta organización. Por favor, seleccione una sucursal válida.',
      });
      this.form.get('branch_id')?.reset();
      return;
    }

    // Verificar que el company esté en la lista correcta (solo si hay lista cargada)
    if (
      companies &&
      companies.length > 0 &&
      !companies.some((c) => c.id === finalCompanyId)
    ) {
      // Solo log en desarrollo
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.warn('[Timeclock] Company ID no encontrado en lista:', {
          finalCompanyId,
          companiesList: companies.map((c) => ({ id: c.id, name: c.name })),
          isNaz,
        });
      }
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: `La compañía seleccionada (${finalCompanyId.substring(
          0,
          8
        )}...) no es válida para esta organización. Por favor, seleccione una compañía válida de la lista.`,
      });
      this.form.get('company_id')?.reset();
      return;
    }

    if (employee?.code_uri) {
      const totp = OTPAuth.URI.parse(employee.code_uri);
      const validation = totp.validate({ token: otp });
      if (validation === null) {
        this.isProcessing.set(false);
        // Reproducir sonido de error
        playFailureSound();
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Código incorrecto',
        });
        this.form.get('otp')?.reset();
        return;
      }

      const employeeName =
        `${employee.first_name} ${employee.father_name}`.trim();

      // Log de depuración antes de procesar
      console.log('📝 Intentando marcar timelog:', {
        isNaz: this.isNazCompany(),
        employee_id: employee.id,
        branch_id: branch_id,
        company_id: finalCompanyId,
        type,
        employeeName,
        tableName: 'timelogs',
      });

      this.processTimelog(
        employee.id,
        branch_id,
        finalCompanyId,
        type,
        employeeName
      );
    } else {
      this.isProcessing.set(false);
    }
  }

  private processTimelog(
    employeeId: string,
    branchId: string,
    companyId: string,
    type: string,
    employeeName: string
  ) {
    // Validar IP normalmente
    const invalidValue = !this.validIP();

    // Asegurar que el company_id sea correcto para la organización actual
    const serviceCompanyId = this.organizationService.getCurrentCompanyId();
    const finalCompanyId = companyId || serviceCompanyId;

    // Validar que branch_id y company_id sean válidos
    if (!branchId || !finalCompanyId) {
      this.isProcessing.set(false);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: `Por favor seleccione una sucursal y compañía válidas. Branch: ${branchId}, Company: ${finalCompanyId}, Service Company: ${serviceCompanyId}`,
      });
      return;
    }

    // Usar RPC para procesar todo en una sola transacción
    this.http
      .post<{
        success: boolean;
        timelog_id?: string;
        delay?: number | null;
        exitDiff?: { minutes: number; isEarly: boolean } | null;
        lunchEndDiff?: number | null;
        lunchExceededMinutes?: number | null;
        schedule?: {
          id: string;
          name: string;
          entry_time: string;
          exit_time: string;
          day_off: boolean;
          minutes_tolerance: number;
        } | null;
        hasSchedule?: boolean;
        isDayOff?: boolean;
        error?: string;
        error_code?: string;
      }>(
        this.apiUrl.build('rest/v1/rpc/process_timelog'),
        {
          p_employee_id: employeeId,
          p_company_id: finalCompanyId,
          p_branch_id: branchId,
          p_type: type,
          p_ip: this.getIP(),
          p_invalid_ip: invalidValue,
        },
        { observe: 'response' }
      )
      .pipe(
        catchError((error) => {
          this.isProcessing.set(false);
          // Reproducir sonido de error
          playFailureSound();
          const isNaz = this.isNazCompany();
          console.error('Error al procesar timelog:', error);

          let errorMessage = 'Algo salió mal, intente nuevamente';

          // Manejar errores específicos
          if (error?.status === 409) {
            errorMessage = `Error: El empleado (${employeeId.substring(
              0,
              8
            )}...), sucursal (${branchId.substring(
              0,
              8
            )}...) o compañía (${finalCompanyId.substring(
              0,
              8
            )}...) seleccionados no existen. Verifique que los datos sean correctos para ${
              isNaz ? 'Naz' : 'Black Dog'
            }.`;
          } else if (error?.status === 422) {
            const details =
              error?.error?.details ||
              error?.error?.message ||
              'Los datos proporcionados no son válidos';
            errorMessage = `Error: ${details}. Por favor, verifique la información.`;
          } else if (error?.error?.message) {
            errorMessage = `Error: ${error.error.message}`;
          } else if (error?.message) {
            errorMessage = `Error: ${error.message}`;
          }

          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 10000,
          });

          // Resetear el formulario si hay un error de constraint (409)
          if (error?.status === 409) {
            this.form.get('employee')?.reset();
            this.form.get('branch_id')?.reset();
            this.form.get('company_id')?.reset();
            this.form.get('otp')?.reset();
          }

          return EMPTY;
        })
      )
      .subscribe({
        next: (
          response: HttpResponse<{
            success: boolean;
            timelog_id?: string;
            delay?: number | null;
            exitDiff?: { minutes: number; isEarly: boolean } | null;
            lunchEndDiff?: number | null;
            lunchExceededMinutes?: number | null;
            schedule?: {
              id: string;
              name: string;
              entry_time: string;
              exit_time: string;
              day_off: boolean;
              minutes_tolerance: number;
            } | null;
            hasSchedule?: boolean;
            isDayOff?: boolean;
            error?: string;
            error_code?: string;
          }>
        ) => {
          const result = response.body;
          if (!result) {
            this.isProcessing.set(false);
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Respuesta inválida del servidor (sin body).',
              life: 10000,
            });
            return;
          }

          // Verificar si la RPC retornó error
          if (!result.success) {
            this.isProcessing.set(false);
            // Reproducir sonido de error
            playFailureSound();
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: result.error || 'Error al procesar la marcación',
              life: 10000,
            });
            return;
          }

          // Hora oficial: header Date del servidor. Fallback: reloj sincronizado por offset.
          const dateHeader = response.headers.get('Date');
          const serverHeaderMs = dateHeader
            ? new Date(dateHeader).getTime()
            : NaN;
          const officialTime = Number.isNaN(serverHeaderMs)
            ? this.timeSync.now()
            : new Date(serverHeaderMs);

          const typeLabel =
            this.types.find((t) => t.value === type)?.label || type;
          
          // Calcular tardanza en el cliente (desde el primer segundo)
          let delayMinutes = 0;
          let isLate = false;
          
          if (type === 'entry' && result.schedule?.entry_time && !result.isDayOff) {
            // Parsear hora de entrada del horario (formato HH:mm:ss)
            const entryTimeParts = result.schedule.entry_time.split(':');
            const scheduledHour = parseInt(entryTimeParts[0], 10);
            const scheduledMinute = parseInt(entryTimeParts[1], 10);
            const scheduledSecond = parseInt(entryTimeParts[2] || '0', 10);
            
            // Obtener hora actual en zona de Panamá
            const nowInPanama = toZonedTime(officialTime, this.DISPLAY_TIMEZONE);
            const currentHour = getHours(nowInPanama);
            const currentMinute = getMinutes(nowInPanama);
            const currentSecond = getSeconds(nowInPanama);
            
            // Calcular diferencia en segundos
            const scheduledTotalSeconds = scheduledHour * 3600 + scheduledMinute * 60 + scheduledSecond;
            const currentTotalSeconds = currentHour * 3600 + currentMinute * 60 + currentSecond;
            const diffSeconds = currentTotalSeconds - scheduledTotalSeconds;
            
            // Si llegó después de la hora programada (desde el primer segundo)
            if (diffSeconds > 0) {
              isLate = true;
              delayMinutes = Math.floor(diffSeconds / 60);
            }
          }
          
          const isVeryLate = delayMinutes >= 60; // Más de 1 hora tarde

          let message = `<div style="text-align: center;">
            <div style="margin-bottom: 0.5rem;"><b>${typeLabel}</b> registrada exitosamente a las <b>${formatInTimeZone(
            officialTime,
            this.DISPLAY_TIMEZONE,
            'h:mm:ss aaa'
          )}</b></div>`;

          // Agregar mensaje de tardanza si aplica
          if (isLate && type === 'entry') {
            const hoursLate = Math.floor(delayMinutes / 60);
            const minutesLate = delayMinutes % 60;
            let timeStr = '';
            if (hoursLate > 0 && minutesLate > 0) {
              timeStr = `${hoursLate} hora${hoursLate > 1 ? 's' : ''} y ${minutesLate} minuto${minutesLate !== 1 ? 's' : ''}`;
            } else if (hoursLate > 0) {
              timeStr = `${hoursLate} hora${hoursLate > 1 ? 's' : ''}`;
            } else if (minutesLate > 0) {
              timeStr = `${minutesLate} minuto${minutesLate !== 1 ? 's' : ''}`;
            } else {
              timeStr = 'menos de 1 minuto';
            }
            
            message += `<div style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(251, 191, 36, 0.2); border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.5);">
              <div style="color: #fbbf24; font-weight: bold; margin-bottom: 0.25rem;">
                <i class="pi pi-clock" style="margin-right: 0.5rem;"></i>Llegó tarde
              </div>
              <div style="color: #fcd34d;">Tardanza: ${timeStr}</div>
            </div>`;

            // Mensaje especial si es más de 1 hora tarde
            if (isVeryLate) {
              message += `<div style="margin-top: 0.5rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.2); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.5);">
                <div style="color: #f87171; font-weight: bold; margin-bottom: 0.25rem;">
                  <i class="pi pi-exclamation-triangle" style="margin-right: 0.5rem;"></i>Atención
                </div>
                <div style="color: #fca5a5; font-size: 0.9rem;">Tardanza mayor a 1 hora. Por favor verifique con el gerente si el horario está configurado correctamente.</div>
              </div>`;
            }
          }

          message += `</div>`;

          // Nota: El tiempo excedido ya se acumuló en la RPC, no necesitamos llamar a increment_lunch_exceeded_minutes

          // Mostrar diálogo con sonido apropiado
          this.showConfirmationDialogWithSound(message, isLate, employeeId);
        },
        error: () => {
          this.isProcessing.set(false);
        },
      });
  }

  // Mostrar diálogo de confirmación
  private showConfirmationDialog(message: string): void {
    this.showConfirmationDialogWithSound(message, false);
  }

  // Mostrar diálogo de confirmación con sonido según tardanza
  private showConfirmationDialogWithSound(message: string, isLate: boolean, employeeId?: string): void {
    this.isProcessing.set(false);
    // Reproducir sonido según si llegó tarde o no
    if (isLate) {
      playLateSound();
    } else {
      playSuccessSound(employeeId);
    }
    this.confirmation.confirm({
      message,
      key: 'confirm1',
      header: isLate ? 'Registrado con Tardanza' : 'Éxito',
      icon: isLate ? 'pi pi-clock' : 'pi pi-check',
      acceptLabel: 'Aceptar',
      rejectVisible: false,
      accept: () => {
        this.form.get('otp')?.reset();
        this.form.get('employee')?.reset();
        this.showKeypad.set(false);
        // Solo validar IP si NO es Naz
        if (!this.isNazCompany() && !this.validIP()) {
          this.alertInvalidIP();
        }
      },
    });
  }

  // Audio delegated to timeclock-audio.utils.ts

  private async calculateAndShowStreak(employeeId: string): Promise<number> {
    try {
      const timelogsUrl = this.apiUrl.build('rest/v1/timelogs', {
        employee_id: `eq.${employeeId}`,
        type: 'eq.entry',
        order: 'created_at.desc',
        limit: '100',
      });
      const anonKey = getEnv('ENV_SUPABASE_API_KEY');
      const headers = {
        apikey: anonKey!,
        Authorization: `Bearer ${anonKey}`,
      };

      const timelogs = await firstValueFrom(
        this.http.get<TimeLog[]>(timelogsUrl, { headers }).pipe(
          catchError(() => of([])),
          map((logs) => logs || [])
        )
      );

      if (!timelogs.length) return 0;

      const schedulesUrl = this.apiUrl.build('rest/v1/employee_schedules', {
        employee_id: `eq.${employeeId}`,
        select: '*,schedule:schedules(*)',
        order: 'start_date.desc',
        limit: '100',
      });
      const schedules = await firstValueFrom(
        this.http.get<EmployeeSchedule[]>(schedulesUrl, { headers }).pipe(
          catchError(() => of([])),
          map((scheds) => scheds || [])
        )
      );

      return calculateStreak(timelogs, schedules);
    } catch {
      return 0;
    }
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
