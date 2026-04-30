import { Component, ElementRef, EventEmitter, inject, Input, OnDestroy, Output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { DpFingerprintService } from '../services/dp-fingerprint.service';

const FINGER_LABELS = [
  'Pulgar derecho', 'Índice derecho', 'Medio derecho', 'Anular derecho', 'Meñique derecho',
  'Pulgar izquierdo', 'Índice izquierdo', 'Medio izquierdo', 'Anular izquierdo', 'Meñique izquierdo',
];

const MIN_FINGERS_REQUIRED = 3;

@Component({
  selector: 'app-dp-enroll-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  template: `
<p-dialog
  [(visible)]="visible"
  [modal]="true"
  [closable]="!capturing() && !selfMode"
  [draggable]="false"
  [resizable]="false"
  [style]="{ width: '720px', maxWidth: '96vw', maxHeight: '94vh' }"
  [contentStyle]="{ overflowY: 'auto', padding: '0 14px 12px 14px' }"
  [header]="selfMode ? (employeeName ? 'Hola ' + firstName(employeeName) + ', registra tus huellas' : 'Registra tus huellas') : 'Registrar huellas — DigitalPersona'"
  (onHide)="onClose()"
>
  <div class="dp-enroll-root">
    @if (state() === 'no-lite-client') {
      <div class="p-3 rounded-lg border border-yellow-500/40 bg-yellow-500/5">
        <p class="m-0 mb-2 font-semibold text-yellow-300">Lite Client no detectado</p>
        <p class="m-0 text-xs mb-2">Instala primero el driver y luego el Lite Client.</p>
        <div class="flex gap-2">
          <p-button label="Driver" icon="pi pi-download" size="small" severity="secondary"
                    (onClick)="downloadDriver()" />
          <p-button label="Lite Client" icon="pi pi-download" size="small" severity="warn"
                    (onClick)="downloadInstaller()" />
        </div>
      </div>
    } @else if (state() === 'no-device') {
      <div class="p-3 rounded-lg border border-red-500/40 bg-red-500/5">
        <p class="m-0 font-semibold text-red-300">Lector no detectado</p>
        <p class="m-0 text-xs">Conecta el lector U.are.U 4500 vía USB.</p>
      </div>
    } @else {
      @if (selfMode) {
        <div class="self-banner">
          <div class="self-banner__icon"><i class="pi pi-shield"></i></div>
          <div>
            <p class="self-banner__title">Registro obligatorio</p>
            <p class="self-banner__sub">Para marcar con huella, registra <strong>3 dedos</strong> distintos. Solo te tomará un minuto.</p>
          </div>
        </div>
      }

      <!-- Step dots: 3 fingers required (solo selfMode) -->
      @if (selfMode) {
        <div class="step-dots">
          @for (i of [0,1,2]; track i) {
            <div class="step-dot" [class.step-dot--done]="enrolledFingers().length > i" [class.step-dot--active]="enrolledFingers().length === i">
              @if (enrolledFingers().length > i) { <i class="pi pi-check"></i> } @else { {{ i+1 }} }
            </div>
          }
        </div>
        <p class="step-dots-label">
          @if (enrolledFingers().length === 0) { Empieza con tu <strong>primer dedo</strong> }
          @else if (enrolledFingers().length === 1) { Ahora un <strong>segundo dedo</strong> distinto }
          @else if (enrolledFingers().length === 2) { Último: tu <strong>tercer dedo</strong> }
          @else { ¡Listo! Has registrado los 3 dedos }
        </p>
      }

      <p class="hand-picker-title hand-picker-title--top">Selecciona el dedo a registrar</p>

      <div class="enroll-grid">
        <div class="enroll-grid__left">

      <!-- Hand picker — silueta vectorizada con dedos clickeables -->
      <div class="hand-picker">

        <div class="hands-row">
          <!-- Mano izquierda (silueta espejada via scaleX(-1)) -->
          <div class="hand-block">
            <p class="hand-label">Mano Izquierda</p>
            <svg viewBox="0 0 832 1004" class="hand-svg flip">
              <!-- Palma (no clickeable) -->
              <path class="silhouette palm" d="M421.74 865.53 c4.93 -1.26 16.23 -4.57 25.19 -7.53 c25.01 -8.16 28.87 -9.06 43.03 -9.59 c14.79 -0.54 17.84 0 36.22 7.26 c15.06 5.83 19.19 6.90 27.61 6.90 c5.11 0 8.52 -0.63 15.51 -3.05 c27.88 -9.59 46.53 -31.74 59.44 -70.83 c10.76 -32.54 23.22 -99.07 27.61 -147.48 c1.43 -16.68 0.63 -38.82 -1.79 -48.14 c-5.02 -19.10 -18.11 -36.85 -32.81 -44.20 c-8.34 -4.12 -13.09 -4.93 -23.85 -3.68 c-22.50 2.42 -27.79 0 -42.86 -20.17 c-12.19 -16.32 -17.39 -20.62 -26.99 -22.32 c-4.84 -0.90 -13.99 1.43 -25.19 6.54 c-19.10 8.61 -21.07 9.23 -29.94 9.32 c-10.67 0.09 -12.91 -1.26 -24.57 -13.72 c-8.97 -9.68 -14.34 -13.54 -18.74 -13.54 c-3.68 0 -10.58 4.30 -18.20 11.30 c-9.50 8.79 -14.34 11.12 -22.77 11.12 c-5.11 0 -7.71 -0.63 -13.90 -3.14 c-10.94 -4.57 -14.61 -4.03 -20.62 2.87 c-5.56 6.28 -11.48 22.50 -13.45 36.85 c-2.33 17.39 5.65 32.54 20.98 39.72 c3.14 1.43 15.33 5.02 27.52 8.07 c36.40 8.97 60.61 17.21 83.65 28.78 c39.99 19.90 60.70 40.61 67.96 67.96 c1.79 6.72 2.06 9.77 2.06 25.55 c0 15.96 -0.27 18.74 -2.06 25.55 c-3.41 12.37 -6.72 18.20 -14.88 26.45 c-5.29 5.38 -8.97 8.16 -13.54 10.40 c-6.19 3.05 -6.37 3.05 -18.83 3.05 c-12.55 0 -12.64 0 -18.83 -3.05 c-8.88 -4.39 -20.26 -15.96 -25.28 -25.64 c-7.35 -14.43 -10.13 -28.33 -10.13 -52 c0 -26.09 -1.97 -41.96 -6.54 -53.34 c-8.25 -20.26 -26.36 -35.14 -41.33 -33.89 c-10.13 0.81 -21.16 8.88 -26.45 19.28 c-1.43 2.96 -4.93 12.01 -7.71 20.08 c-2.78 8.07 -6.90 18.38 -9.23 22.77 c-3.77 7.35 -5.47 9.41 -18.56 22.41 c-15.51 15.42 -18.02 19.10 -20.17 29.41 c-1.34 6.63 -0.09 14.61 4.12 26.90 c5.29 15.06 27.17 63.39 34.07 75.04 c5.29 9.06 16.23 20.89 23.13 25.01 c16.32 9.77 30.57 11.66 51.10 6.72z" />
              <!-- Path coords sorted by visual finger position. Reassigned after user feedback. -->
              <!-- Path A (M289.50 707.83) → THUMB izq (idx 5) -->
              <path class="silhouette finger" [class.enrolled]="isEnrolled(5)" [class.selected]="fingerIndex() === 5"
                    (click)="selectFinger(5)"
                    d="M289.50 707.83 c3.77 -3.23 5.02 -7.53 3.77 -12.64 c-0.63 -2.24 -4.57 -11.03 -8.88 -19.46 c-5.83 -11.48 -8.61 -18.20 -10.94 -26.18 c-2.24 -7.98 -4.93 -14.52 -10.58 -25.55 c-4.12 -8.16 -10.40 -21.25 -13.72 -29.14 c-9.86 -22.86 -16.68 -31.11 -31.74 -38.19 c-13.72 -6.46 -36.76 -11.48 -47.07 -10.22 c-16.77 2.06 -28.06 13.81 -24.57 25.46 c2.42 8.43 8.07 15.15 33.98 40.88 c17.03 16.86 28.24 28.78 34.07 36.31 c12.91 16.41 27.70 30.66 46.80 45.10 c23.49 17.66 23.85 17.84 28.87 13.63z" />
              <!-- Path B (M654.58 476.70) → PINKY izq (idx 9) -->
              <path class="silhouette finger" [class.enrolled]="isEnrolled(9)" [class.selected]="fingerIndex() === 9"
                    (click)="selectFinger(9)"
                    d="M654.58 476.70 c4.57 -3.05 8.61 -9.06 10.76 -15.69 c1.43 -4.57 2.06 -10.04 2.69 -23.04 c0.90 -18.20 1.34 -20.53 7.44 -39.63 c7.80 -24.12 10.58 -38.64 10.67 -54.96 c0.09 -11.74 -1.08 -17.93 -4.93 -25.37 c-4.39 -8.70 -14.52 -15.78 -20.89 -14.61 c-4.21 0.81 -10.13 5.11 -13 9.41 c-4.93 7.35 -6.37 13.63 -17.03 76.74 c-5.74 33.98 -5.56 52 0.54 71.37 c4.57 14.34 15.24 21.52 23.76 15.78z" />
              <!-- Path C (M350.11 440.84) → INDEX izq (idx 6) -->
              <path class="silhouette finger" [class.enrolled]="isEnrolled(6)" [class.selected]="fingerIndex() === 6"
                    (click)="selectFinger(6)"
                    d="M350.11 440.84 c5.38 -5.65 6.28 -9.68 6.19 -27.97 c-0.09 -20.89 -2.60 -37.48 -12.01 -78.45 c-6.72 -29.05 -8.34 -38.19 -11.66 -66.79 c-1.52 -12.82 -3.77 -27.97 -5.02 -33.62 c-8.16 -37.83 -25.37 -63.57 -39.63 -59.35 c-13.54 4.12 -20.89 16.94 -20.89 36.49 c0.09 23.58 7.53 57.11 32.01 143.54 c13.45 47.52 27.43 79.52 38.19 87.32 c5.29 3.86 8.25 3.59 12.82 -1.17z" />
              <!-- Path D (M546.37 430.35) → RING izq (idx 8) -->
              <path class="silhouette finger" [class.enrolled]="isEnrolled(8)" [class.selected]="fingerIndex() === 8"
                    (click)="selectFinger(8)"
                    d="M546.37 430.35 c6.46 -7.17 8.61 -13.81 13.90 -43.93 c8.07 -45.28 10.85 -70.83 11.48 -107.59 c0.72 -37.48 -1.70 -55.41 -9.50 -71.28 c-6.54 -13.27 -18.65 -23.76 -25.82 -22.41 c-7.26 1.34 -14.79 11.92 -19.37 27.34 c-5.56 18.29 -6.37 31.92 -3.23 52.63 c2.51 16.77 2.06 24.66 -2.60 41.24 c-5.47 19.10 -6.72 27.97 -6.81 45.10 c-0.09 36.13 10.04 68.77 24.39 79.17 c8.07 5.92 12.10 5.83 17.57 -0.27z" />
              <!-- Path E (M433.05 413.32) → MIDDLE izq (idx 7) -->
              <path class="silhouette finger" [class.enrolled]="isEnrolled(7)" [class.selected]="fingerIndex() === 7"
                    (click)="selectFinger(7)"
                    d="M433.05 413.32 c7.53 -9.50 12.64 -26.18 15.24 -49.31 c1.26 -11.21 3.59 -70.20 3.59 -91.90 c0 -33.17 -5.20 -91.99 -9.59 -108.48 c-3.41 -12.64 -10.13 -21.79 -19.37 -26.45 c-6.63 -3.32 -10.49 -3.41 -16.59 -0.36 c-8.52 4.21 -13.18 11.74 -17.21 27.70 c-5.47 21.52 -5.74 39 -0.90 66.34 c3.50 19.81 3.41 30.57 -0.27 44.92 c-3.77 14.52 -4.39 20.35 -2.87 30.03 c2.51 16.94 15.42 64.55 23.31 86.34 c6.63 18.29 9.59 23.76 14.17 25.91 c2.51 1.26 3.05 1.26 5.38 -0.09z" />
            </svg>
          </div>

          <!-- Mano derecha (silueta original) -->
          <div class="hand-block">
            <p class="hand-label">Mano Derecha</p>
            <svg viewBox="0 0 832 1004" class="hand-svg">
              <path class="silhouette palm" d="M421.74 865.53 c4.93 -1.26 16.23 -4.57 25.19 -7.53 c25.01 -8.16 28.87 -9.06 43.03 -9.59 c14.79 -0.54 17.84 0 36.22 7.26 c15.06 5.83 19.19 6.90 27.61 6.90 c5.11 0 8.52 -0.63 15.51 -3.05 c27.88 -9.59 46.53 -31.74 59.44 -70.83 c10.76 -32.54 23.22 -99.07 27.61 -147.48 c1.43 -16.68 0.63 -38.82 -1.79 -48.14 c-5.02 -19.10 -18.11 -36.85 -32.81 -44.20 c-8.34 -4.12 -13.09 -4.93 -23.85 -3.68 c-22.50 2.42 -27.79 0 -42.86 -20.17 c-12.19 -16.32 -17.39 -20.62 -26.99 -22.32 c-4.84 -0.90 -13.99 1.43 -25.19 6.54 c-19.10 8.61 -21.07 9.23 -29.94 9.32 c-10.67 0.09 -12.91 -1.26 -24.57 -13.72 c-8.97 -9.68 -14.34 -13.54 -18.74 -13.54 c-3.68 0 -10.58 4.30 -18.20 11.30 c-9.50 8.79 -14.34 11.12 -22.77 11.12 c-5.11 0 -7.71 -0.63 -13.90 -3.14 c-10.94 -4.57 -14.61 -4.03 -20.62 2.87 c-5.56 6.28 -11.48 22.50 -13.45 36.85 c-2.33 17.39 5.65 32.54 20.98 39.72 c3.14 1.43 15.33 5.02 27.52 8.07 c36.40 8.97 60.61 17.21 83.65 28.78 c39.99 19.90 60.70 40.61 67.96 67.96 c1.79 6.72 2.06 9.77 2.06 25.55 c0 15.96 -0.27 18.74 -2.06 25.55 c-3.41 12.37 -6.72 18.20 -14.88 26.45 c-5.29 5.38 -8.97 8.16 -13.54 10.40 c-6.19 3.05 -6.37 3.05 -18.83 3.05 c-12.55 0 -12.64 0 -18.83 -3.05 c-8.88 -4.39 -20.26 -15.96 -25.28 -25.64 c-7.35 -14.43 -10.13 -28.33 -10.13 -52 c0 -26.09 -1.97 -41.96 -6.54 -53.34 c-8.25 -20.26 -26.36 -35.14 -41.33 -33.89 c-10.13 0.81 -21.16 8.88 -26.45 19.28 c-1.43 2.96 -4.93 12.01 -7.71 20.08 c-2.78 8.07 -6.90 18.38 -9.23 22.77 c-3.77 7.35 -5.47 9.41 -18.56 22.41 c-15.51 15.42 -18.02 19.10 -20.17 29.41 c-1.34 6.63 -0.09 14.61 4.12 26.90 c5.29 15.06 27.17 63.39 34.07 75.04 c5.29 9.06 16.23 20.89 23.13 25.01 c16.32 9.77 30.57 11.66 51.10 6.72z" />
              <!-- Path A (M289.50 707.83) → THUMB der (idx 0) -->
              <path class="silhouette finger" [class.enrolled]="isEnrolled(0)" [class.selected]="fingerIndex() === 0"
                    (click)="selectFinger(0)"
                    d="M289.50 707.83 c3.77 -3.23 5.02 -7.53 3.77 -12.64 c-0.63 -2.24 -4.57 -11.03 -8.88 -19.46 c-5.83 -11.48 -8.61 -18.20 -10.94 -26.18 c-2.24 -7.98 -4.93 -14.52 -10.58 -25.55 c-4.12 -8.16 -10.40 -21.25 -13.72 -29.14 c-9.86 -22.86 -16.68 -31.11 -31.74 -38.19 c-13.72 -6.46 -36.76 -11.48 -47.07 -10.22 c-16.77 2.06 -28.06 13.81 -24.57 25.46 c2.42 8.43 8.07 15.15 33.98 40.88 c17.03 16.86 28.24 28.78 34.07 36.31 c12.91 16.41 27.70 30.66 46.80 45.10 c23.49 17.66 23.85 17.84 28.87 13.63z" />
              <!-- Path B (M654.58 476.70) → PINKY der (idx 4) -->
              <path class="silhouette finger" [class.enrolled]="isEnrolled(4)" [class.selected]="fingerIndex() === 4"
                    (click)="selectFinger(4)"
                    d="M654.58 476.70 c4.57 -3.05 8.61 -9.06 10.76 -15.69 c1.43 -4.57 2.06 -10.04 2.69 -23.04 c0.90 -18.20 1.34 -20.53 7.44 -39.63 c7.80 -24.12 10.58 -38.64 10.67 -54.96 c0.09 -11.74 -1.08 -17.93 -4.93 -25.37 c-4.39 -8.70 -14.52 -15.78 -20.89 -14.61 c-4.21 0.81 -10.13 5.11 -13 9.41 c-4.93 7.35 -6.37 13.63 -17.03 76.74 c-5.74 33.98 -5.56 52 0.54 71.37 c4.57 14.34 15.24 21.52 23.76 15.78z" />
              <!-- Path C (M350.11 440.84) → INDEX der (idx 1) -->
              <path class="silhouette finger" [class.enrolled]="isEnrolled(1)" [class.selected]="fingerIndex() === 1"
                    (click)="selectFinger(1)"
                    d="M350.11 440.84 c5.38 -5.65 6.28 -9.68 6.19 -27.97 c-0.09 -20.89 -2.60 -37.48 -12.01 -78.45 c-6.72 -29.05 -8.34 -38.19 -11.66 -66.79 c-1.52 -12.82 -3.77 -27.97 -5.02 -33.62 c-8.16 -37.83 -25.37 -63.57 -39.63 -59.35 c-13.54 4.12 -20.89 16.94 -20.89 36.49 c0.09 23.58 7.53 57.11 32.01 143.54 c13.45 47.52 27.43 79.52 38.19 87.32 c5.29 3.86 8.25 3.59 12.82 -1.17z" />
              <!-- Path D (M546.37 430.35) → RING der (idx 3) -->
              <path class="silhouette finger" [class.enrolled]="isEnrolled(3)" [class.selected]="fingerIndex() === 3"
                    (click)="selectFinger(3)"
                    d="M546.37 430.35 c6.46 -7.17 8.61 -13.81 13.90 -43.93 c8.07 -45.28 10.85 -70.83 11.48 -107.59 c0.72 -37.48 -1.70 -55.41 -9.50 -71.28 c-6.54 -13.27 -18.65 -23.76 -25.82 -22.41 c-7.26 1.34 -14.79 11.92 -19.37 27.34 c-5.56 18.29 -6.37 31.92 -3.23 52.63 c2.51 16.77 2.06 24.66 -2.60 41.24 c-5.47 19.10 -6.72 27.97 -6.81 45.10 c-0.09 36.13 10.04 68.77 24.39 79.17 c8.07 5.92 12.10 5.83 17.57 -0.27z" />
              <!-- Path E (M433.05 413.32) → MIDDLE der (idx 2) -->
              <path class="silhouette finger" [class.enrolled]="isEnrolled(2)" [class.selected]="fingerIndex() === 2"
                    (click)="selectFinger(2)"
                    d="M433.05 413.32 c7.53 -9.50 12.64 -26.18 15.24 -49.31 c1.26 -11.21 3.59 -70.20 3.59 -91.90 c0 -33.17 -5.20 -91.99 -9.59 -108.48 c-3.41 -12.64 -10.13 -21.79 -19.37 -26.45 c-6.63 -3.32 -10.49 -3.41 -16.59 -0.36 c-8.52 4.21 -13.18 11.74 -17.21 27.70 c-5.47 21.52 -5.74 39 -0.90 66.34 c3.50 19.81 3.41 30.57 -0.27 44.92 c-3.77 14.52 -4.39 20.35 -2.87 30.03 c2.51 16.94 15.42 64.55 23.31 86.34 c6.63 18.29 9.59 23.76 14.17 25.91 c2.51 1.26 3.05 1.26 5.38 -0.09z" />
            </svg>
          </div>
        </div>

        <p class="hand-picker-hint">
          Seleccionado: <strong>{{ FINGER_LABELS[fingerIndex()] }}</strong>
          @if (isEnrolled(fingerIndex())) { <span class="warn-badge">se sobrescribirá</span> }
        </p>
      </div>

        </div><!-- /enroll-grid__left -->

        <div class="enroll-grid__right">

      <!-- Webcam preview (anti-fraude) — solo en modo self desde timeclock -->
      @if (selfMode) {
      <div class="webcam-block" [class.webcam-block--ok]="webcamReady()">
        <div class="webcam-frame">
          <video #webcamVideo autoplay muted playsinline class="webcam-video"></video>
          @if (lastPhotoB64()) {
            <img [src]="'data:image/jpeg;base64,' + lastPhotoB64()" class="webcam-snap" />
          }
          <div class="webcam-overlay">
            <i class="pi pi-camera"></i>
            <span>{{ webcamReady() ? 'Listo' : 'Activando cámara...' }}</span>
          </div>
        </div>
        <p class="webcam-hint">Tu rostro queda registrado junto con cada huella para verificación.</p>
      </div>
      }

      <!-- Capture scanner -->
      <div class="capture-stage">
        <div class="capture-scanner" [class.capture-scanner--active]="capturing()">
          <div class="capture-ring"></div>
          <div class="capture-ring capture-ring--2"></div>
          <div class="capture-beam"></div>
          <i class="pi pi-fingerprint capture-fp"></i>
        </div>
        <div class="capture-samples">
          @for (i of [0,1,2,3]; track i) {
            <div class="sample-pip" [class.sample-pip--done]="samples().length > i"></div>
          }
        </div>
        <p class="capture-msg">
          @if (capturing()) { {{ qualityMsg() || 'Coloca tu dedo en el lector' }} }
          @else if (samples().length === 4) { Muestras completas. Guardando... }
          @else if (samples().length === 0) { Coloca tu dedo en el lector }
          @else { Levanta y vuelve a colocar el dedo ({{ samples().length }}/4) }
        </p>
      </div>

        </div><!-- /enroll-grid__right -->
      </div><!-- /enroll-grid -->
    }
  </div>

  <ng-template pTemplate="footer">
    @if (state() !== 'no-lite-client' && state() !== 'no-device') {
      @if (enrolledFingers().length >= minRequired) {
        <p-button label="Terminar" icon="pi pi-check-circle" size="small" severity="success"
                  (onClick)="onClose()" />
      } @else if (!selfMode) {
        <p-button label="Cancelar" icon="pi pi-times" size="small" severity="secondary"
                  [text]="true" (onClick)="onClose()" />
      }
    }
  </ng-template>
</p-dialog>
  `,
  styles: [`
    .enroll-progress {
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px 14px; border-radius: 14px;
      background: linear-gradient(135deg, rgba(99,179,237,0.08), rgba(52,211,153,0.05));
      border: 1px solid rgba(255,255,255,0.06);
    }
    .enroll-progress-text { font-size: 13px; color: #cbd5e1; display: flex; align-items: center; gap: 8px; }
    .enroll-progress-text strong { font-size: 18px; color: #fff; font-weight: 700; }
    .ok-badge { background: rgba(52,211,153,0.2); color: #34d399; font-size: 11px; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
    .enroll-progress-bar { height: 4px; background: rgba(255,255,255,0.05); border-radius: 999px; overflow: hidden; }
    .enroll-progress-fill { height: 100%; background: linear-gradient(90deg, #63b3ed, #34d399); transition: width 0.3s; border-radius: 999px; }

    .dp-enroll-root { display: flex; flex-direction: column; gap: 10px; color: #cbd5e1; font-size: 13px; }
    .enroll-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
    .enroll-grid__left, .enroll-grid__right { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    @media (max-width: 600px) { .enroll-grid { grid-template-columns: 1fr; } }
    .hand-picker { display: flex; flex-direction: column; gap: 6px; align-items: center; }
    .hand-picker-title { margin: 0; font-size: 12px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.6px; text-align: center; }
    .hand-picker-title--top { margin-bottom: 4px; }
    .hand-picker-hint {
      margin: 0; font-size: 12px; color: #cbd5e1; text-align: center;
      padding: 4px 10px; border-radius: 999px;
      background: rgba(99,179,237,0.08);
      border: 1px solid rgba(99,179,237,0.15);
      align-self: center;
    }
    .hand-picker-hint strong { color: #fff; }
    /* Center the dialog header */
    :host ::ng-deep .p-dialog .p-dialog-header { justify-content: center; }
    :host ::ng-deep .p-dialog .p-dialog-header .p-dialog-title { text-align: center; flex: none; }
    .warn-badge { background: rgba(251,191,36,0.18); color: #fbbf24; font-size: 11px; padding: 2px 8px; border-radius: 999px; margin-left: 6px; }
    .hands-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .hand-block {
      display: flex; flex-direction: column; gap: 4px; padding: 8px;
      border: 1px solid rgba(255,255,255,0.06); border-radius: 14px;
      background: rgba(255,255,255,0.02);
      align-items: center;
      transition: border-color 0.15s, background 0.15s;
    }
    .hand-block:hover { border-color: rgba(99,179,237,0.18); background: rgba(99,179,237,0.03); }
    .hand-label { margin: 0; font-size: 10px; color: #64748b; font-weight: 600; text-align: center; letter-spacing: 0.6px; text-transform: uppercase; }
    .hand-svg { width: 100%; max-width: 110px; height: auto; display: block; }
    .hand-svg.flip { transform: scaleX(-1); }
    .silhouette { transition: fill 0.15s; }
    .silhouette.palm { fill: rgba(255,255,255,0.14); pointer-events: none; }
    .silhouette.finger { fill: rgba(255,255,255,0.14); cursor: pointer; }
    .silhouette.finger:hover { fill: rgba(99,179,237,0.65); }
    .silhouette.finger.enrolled { fill: rgba(52,211,153,0.65); }
    .silhouette.finger.selected { fill: #63b3ed; filter: drop-shadow(0 0 6px rgba(99,179,237,0.5)); }
    .silhouette.finger.enrolled.selected { fill: #34d399; filter: drop-shadow(0 0 6px rgba(52,211,153,0.5)); }

    /* Webcam */
    .webcam-block { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .webcam-frame {
      position: relative; width: 180px; height: 135px;
      border-radius: 14px; overflow: hidden;
      background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08);
    }
    .webcam-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: block; }
    .webcam-snap { position: absolute; right: 6px; bottom: 6px; width: 56px; height: 42px; border-radius: 6px; border: 1.5px solid #34d399; object-fit: cover; box-shadow: 0 2px 6px rgba(0,0,0,0.5); }
    .webcam-overlay {
      position: absolute; top: 6px; left: 6px;
      display: flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 600;
      background: rgba(0,0,0,0.5); color: #94a3b8;
    }
    .webcam-block--ok .webcam-overlay { color: #34d399; }
    .webcam-overlay i { font-size: 11px; }
    .webcam-hint { margin: 0; font-size: 11px; color: #94a3b8; text-align: center; }

    /* Self-mode banner */
    .self-banner {
      display: flex; align-items: center; gap: 14px; padding: 14px 16px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.04));
      border: 1px solid rgba(251,191,36,0.3);
    }
    .self-banner__icon {
      width: 42px; height: 42px; flex-shrink: 0; border-radius: 12px;
      background: rgba(251,191,36,0.2); color: #fbbf24;
      display: flex; align-items: center; justify-content: center; font-size: 22px;
    }
    .self-banner__title { margin: 0; font-weight: 700; color: #fff; font-size: 14px; }
    .self-banner__sub { margin: 2px 0 0; font-size: 12px; color: #cbd5e1; line-height: 1.4; }

    /* Step dots */
    .step-dots { display: flex; justify-content: center; gap: 12px; margin: 4px auto 2px; }
    .step-dot {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: #64748b;
      background: rgba(255,255,255,0.04);
      border: 2px solid rgba(255,255,255,0.08);
      transition: all 0.25s;
    }
    .step-dot--active {
      color: #fff; background: rgba(99,179,237,0.2);
      border-color: #63b3ed; box-shadow: 0 0 0 4px rgba(99,179,237,0.15);
    }
    .step-dot--done {
      color: #fff; background: linear-gradient(135deg, #34d399, #10b981); border-color: #34d399;
    }
    .step-dots-label { text-align: center; font-size: 13px; color: #cbd5e1; margin: 0; }
    .step-dots-label strong { color: #fff; }

    /* Capture stage — animated scanner */
    .capture-stage {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 16px 12px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(99,179,237,0.06), rgba(99,179,237,0.02));
      border: 1px solid rgba(99,179,237,0.18);
    }
    .capture-scanner {
      position: relative; width: 90px; height: 90px;
      display: flex; align-items: center; justify-content: center;
    }
    .capture-ring {
      position: absolute; inset: 0; border-radius: 50%;
      border: 2px solid rgba(99,179,237,0.25);
    }
    .capture-ring--2 { inset: 7px; border-color: rgba(99,179,237,0.15); }
    .capture-fp { font-size: 2.6rem; color: #63b3ed; filter: drop-shadow(0 0 6px rgba(99,179,237,0.5)); z-index: 2; }
    .capture-beam {
      position: absolute; inset: 14px; border-radius: 50%; overflow: hidden; z-index: 1;
    }
    .capture-beam::before {
      content: ''; position: absolute; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, transparent, rgba(99,179,237,0.9), transparent);
      box-shadow: 0 0 10px rgba(99,179,237,0.8); top: 50%; opacity: 0;
    }
    .capture-scanner--active .capture-ring { animation: cap-spin 2s linear infinite; border-top-color: transparent; border-color: rgba(99,179,237,0.6); }
    .capture-scanner--active .capture-ring--2 { animation: cap-spin 2s linear infinite reverse; border-bottom-color: transparent; border-color: rgba(99,179,237,0.4); }
    .capture-scanner--active .capture-beam::before { animation: cap-beam 1.4s ease-in-out infinite; }
    @keyframes cap-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes cap-beam { 0% { top: 0; opacity: 0; } 10%, 90% { opacity: 1; } 50% { top: 100%; opacity: 1; } 100% { top: 0; opacity: 0; } }

    .capture-samples { display: flex; gap: 6px; }
    .sample-pip {
      width: 28px; height: 6px; border-radius: 999px;
      background: rgba(255,255,255,0.08); transition: all 0.3s;
    }
    .sample-pip--done { background: linear-gradient(90deg, #63b3ed, #34d399); box-shadow: 0 0 8px rgba(99,179,237,0.5); }
    .capture-msg { margin: 0; text-align: center; font-size: 13px; color: #cbd5e1; min-height: 1.2em; }
  `],
})
export class DpEnrollDialogComponent implements OnDestroy {
  @Input() employeeId: string | null = null;
  @Input() employeeName: string | null = null;
  @Input() selfMode = false;
  @Input() set show(v: boolean) {
    this.visible = v;
    if (v) this.open();
  }
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<void>();

  private dp = inject(DpFingerprintService);
  private msg = inject(MessageService);

  visible = false;
  state = signal<'idle' | 'ready' | 'no-lite-client' | 'no-device' | 'error'>('idle');
  fingerIndex = signal(1);
  samples = signal<string[]>([]);
  capturing = signal(false);
  saving = signal(false);
  qualityMsg = signal('');
  enrolledFingers = signal<number[]>([]);
  webcamReady = signal(false);
  lastPhotoB64 = signal<string | null>(null);
  @ViewChild('webcamVideo') webcamVideo?: ElementRef<HTMLVideoElement>;
  private webcamStream: MediaStream | null = null;

  readonly FINGER_LABELS = FINGER_LABELS;
  get minRequired(): number { return this.selfMode ? MIN_FINGERS_REQUIRED : 1; }
  readonly Math = Math;

  isEnrolled(idx: number): boolean { return this.enrolledFingers().includes(idx); }

  firstName(full?: string | null): string {
    if (!full) return '';
    return full.split(/\s+/)[0];
  }

  private subs: Subscription[] = [];

  async open() {
    this.samples.set([]);
    this.qualityMsg.set('');
    await this.refreshEnrolled();
    const s = await this.dp.init();
    this.state.set(s as any);
    this.subs.push(this.dp.quality$.subscribe(q => this.qualityMsg.set(q.message)));
    this.subs.push(this.dp.error$.subscribe(e => this.msg.add({ severity: 'error', summary: 'Lector', detail: e })));

    // Auto-captura: el SDK queda en startAcquisition continua, samples llegan secuencialmente.
    // No reiniciamos startCapture entre muestras (eso causaba que el lector dejara de detectar después del 1er dedo).
    this.subs.push(this.dp.sample$.subscribe(({ sampleB64 }) => {
      if (this.saving()) return;
      const next = [...this.samples(), sampleB64];
      this.samples.set(next);
      if (next.length >= 4) {
        this.capturing.set(false);
        this.dp.stopCapture().then(() => this.save());
      }
    }));

    if (s === 'ready') await this.startContinuousCapture();

    // Webcam solo en modo self (desde timeclock) — admin enrolando desde perfil NO usa cámara
    if (this.selfMode) this.startWebcam();
  }

  private async startWebcam() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    try {
      this.webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }, audio: false,
      });
      // Asegurar que el video element exista (puede tomar un tick por *ngIf interno)
      setTimeout(() => {
        if (this.webcamVideo?.nativeElement && this.webcamStream) {
          this.webcamVideo.nativeElement.srcObject = this.webcamStream;
          this.webcamReady.set(true);
        }
      }, 100);
    } catch (e: any) {
      this.msg.add({ severity: 'warn', summary: 'Cámara', detail: 'No se pudo acceder a la cámara web', life: 4000 });
    }
  }

  private capturePhoto(): string | null {
    const v = this.webcamVideo?.nativeElement;
    if (!v || !this.webcamReady()) return null;
    try {
      const c = document.createElement('canvas');
      c.width = v.videoWidth || 320;
      c.height = v.videoHeight || 240;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.7);
      const b64 = dataUrl.split(',')[1] || null;
      if (b64) this.lastPhotoB64.set(b64);
      return b64;
    } catch { return null; }
  }

  private stopWebcam() {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(t => t.stop());
      this.webcamStream = null;
    }
    this.webcamReady.set(false);
  }

  private async startContinuousCapture() {
    if (this.saving() || this.samples().length >= 4) return;
    // Asegurar estado limpio: el SDK puede quejarse si llamamos startAcquisition mientras está activa
    try { await this.dp.stopCapture(); } catch {}
    await new Promise((r) => setTimeout(r, 120));
    this.capturing.set(true);
    this.qualityMsg.set('');
    try {
      await this.dp.startCapture();
    } catch (e: any) {
      this.capturing.set(false);
      // Reintento corto
      setTimeout(async () => {
        try { await this.dp.startCapture(); this.capturing.set(true); } catch {}
      }, 400);
    }
  }

  private async refreshEnrolled() {
    if (!this.employeeId) { this.enrolledFingers.set([]); return; }
    try {
      const s = await this.dp.getEnrollmentStatus(this.employeeId);
      this.enrolledFingers.set(s.fingers || []);
      // Suggest next non-enrolled finger as default
      const next = [1, 2, 6, 7, 0, 5, 3, 8, 4, 9].find(i => !s.fingers?.includes(i));
      if (next != null) this.fingerIndex.set(next);
    } catch {
      this.enrolledFingers.set([]);
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private cleanup() {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.dp.stopCapture().catch(() => {});
    this.stopWebcam();
  }

  async selectFinger(i: number) {
    if (this.fingerIndex() === i) return;
    this.fingerIndex.set(i);
    // Si había captura en curso o muestras parciales, las descartamos para empezar limpio en el nuevo dedo
    this.samples.set([]);
    this.qualityMsg.set('');
    if (this.capturing()) {
      try { await this.dp.stopCapture(); } catch {}
      this.capturing.set(false);
    }
    setTimeout(() => this.startContinuousCapture(), 200);
  }

  async captureOne() {
    this.capturing.set(true);
    this.qualityMsg.set('');
    try {
      const sample = await this.dp.captureOne(30000);
      this.samples.set([...this.samples(), sample]);
    } catch (e: any) {
      this.msg.add({ severity: 'warn', summary: 'Captura', detail: e?.message || 'No se capturó la huella' });
    } finally {
      this.capturing.set(false);
    }
  }

  reset() { this.samples.set([]); }

  async save() {
    if (!this.employeeId || this.samples().length < 1) return;
    this.saving.set(true);
    try {
      // Solo capturar foto en self-mode (desde timeclock con cámara)
      const photo = this.selfMode ? this.capturePhoto() : null;
      const r = this.selfMode
        ? await this.dp.enrollSelf(this.employeeId, this.fingerIndex(), this.samples(), photo || undefined)
        : await this.dp.enroll(this.employeeId, this.fingerIndex(), this.samples(), photo || undefined);
      if (!r.success) throw new Error(r.error || 'No se guardó');
      const finger = FINGER_LABELS[this.fingerIndex()];
      this.msg.add({ severity: 'success', summary: 'Dedo guardado', detail: finger });
      this.saved.emit();
      this.samples.set([]);
      await this.refreshEnrolled();

      if (this.enrolledFingers().length < this.minRequired) {
        this.msg.add({
          severity: 'info',
          summary: 'Falta más dedos',
          detail: `Registra al menos ${this.minRequired - this.enrolledFingers().length} dedo(s) más.`,
          life: 4000,
        });
        // Sugerir el siguiente dedo no enrolado para auto-selección
        const next = [1, 2, 6, 7, 0, 5, 3, 8, 4, 9].find(i => !this.enrolledFingers().includes(i));
        if (next != null) this.fingerIndex.set(next);
        // Reiniciar captura para el siguiente dedo
        setTimeout(() => this.startContinuousCapture(), 400);
      } else {
        this.msg.add({ severity: 'success', summary: '¡Listo!', detail: 'Has completado el enrolamiento. Ya puedes marcar con huella.', life: 5000 });
        if (this.selfMode) {
          this.completed.emit();
          setTimeout(() => this.onClose(), 1500);
        } else {
          // Admin: permitir más dedos opcionalmente, reiniciar captura
          setTimeout(() => this.startContinuousCapture(), 400);
        }
      }
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.message || 'No se pudo guardar' });
    } finally {
      this.saving.set(false);
    }
  }

  downloadInstaller() { window.open('/api/dp/lite-client-installer', '_blank'); }
  downloadDriver() { window.open('/api/dp/driver', '_blank'); }

  onClose() {
    this.cleanup();
    this.visible = false;
    this.closed.emit();
  }
}
