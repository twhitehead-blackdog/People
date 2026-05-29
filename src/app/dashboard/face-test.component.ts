import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { FaceRecognitionService } from '../services/face-recognition.service';
import { MobileBottomNavComponent, MobileNavTab } from '../shared/components/mobile-bottom-nav.component';

const FRAMES_TO_CAPTURE = 3;
const FRAME_INTERVAL_MS = 700;
const PREFLIGHT_INTERVAL_MS = 250;

interface PreflightChecks {
  faceDetected: boolean;
  centered: boolean;          // bbox centered (±15% of frame width)
  largeEnough: boolean;       // bbox ≥ 180px
  frontal: boolean;           // |yaw|<0.20 && |pitch|<0.20
  sharp: boolean;             // blur variance > 60
  wellLit: boolean;           // brightness 60-200
  score: number;              // detection confidence
}

@Component({
  selector: 'pt-face-test',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Select, ToastModule, CheckboxModule, TabsModule, TagModule, MobileBottomNavComponent],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast position="top-right" />

    @if (isMobile()) {
      <!-- ═══════════════════════════════════════════════ MOBILE LAYOUT ═══ -->
      <div class="ftm-app">
        <header class="ftm-header">
          <div class="ftm-header__title">
            <h1>
              @if (mobileMode() === 'verify') { Verificar }
              @else if (mobileMode() === 'enroll') { Enrolar }
              @else if (mobileMode() === 'audit') { Auditoría }
              @else if (mobileMode() === 'list') { Enrolados }
            </h1>
            <span class="ftm-header__sub">
              <i class="pi" [class.pi-check-circle]="cfHealth().ok" [class.pi-times-circle]="!cfHealth().ok"
                [style.color]="cfHealth().ok ? '#22c55e' : '#ef4444'"></i>
              CompreFace · {{ enrolledCount() }} enrolados
            </span>
          </div>
        </header>

        <!-- Init state (camera not loaded yet) -->
        @if (!face.modelsLoaded()) {
          <div class="ftm-init">
            @if (face.loading()) {
              <i class="pi pi-spin pi-spinner"></i>
              <p>Cargando…</p>
            } @else {
              <i class="pi pi-camera"></i>
              <p>Permití acceso a la cámara</p>
              <button class="ftm-cta" (click)="init()">
                <i class="pi pi-play"></i> Iniciar
              </button>
            }
          </div>
        } @else {
          <!-- Camera SIEMPRE montada en modo verify y enroll (mismo flujo de captura) -->
          <div class="ftm-camera" [class.ftm-camera--hidden]="mobileMode() === 'audit' || mobileMode() === 'list'">
            <video #video autoplay playsinline muted></video>
            <div class="ftm-camera__oval" [class.ftm-camera__oval--ok]="preflightReady()"></div>

            <div class="ftm-chips">
              <span class="ftm-chip" [class.ftm-chip--ok]="preflight().faceDetected">
                <i class="pi" [class.pi-check]="preflight().faceDetected" [class.pi-search]="!preflight().faceDetected"></i>
                Rostro
              </span>
              <span class="ftm-chip" [class.ftm-chip--ok]="preflight().centered && preflight().largeEnough">
                <i class="pi" [class.pi-check]="preflight().centered && preflight().largeEnough" [class.pi-arrows-h]="!(preflight().centered && preflight().largeEnough)"></i>
                Posición
              </span>
              <span class="ftm-chip" [class.ftm-chip--ok]="preflight().wellLit && preflight().sharp">
                <i class="pi" [class.pi-check]="preflight().wellLit && preflight().sharp" [class.pi-sun]="!(preflight().wellLit && preflight().sharp)"></i>
                Calidad
              </span>
              @if (mobileMode() === 'enroll') {
                <span class="ftm-chip ftm-chip--info"><i class="pi pi-user-plus"></i>Modo enrolar</span>
              }
            </div>

            @if (captureProgress() > 0) {
              <div class="ftm-camera__overlay">
                <div class="ftm-progress">{{ captureProgress() }} / {{ totalFrames }}</div>
              </div>
            }
            @if (challenge()) {
              <div class="ftm-camera__challenge">{{ challenge() }}</div>
            }
          </div>

          <!-- Audit / List como full-screen overlay encima de cámara (que sigue corriendo) -->
          @if (mobileMode() === 'audit' || mobileMode() === 'list') {
            <div class="ftm-panel">
              <div class="ftm-panel__head">
                <button class="ftm-icon-btn" (click)="setMobileMode('verify')"><i class="pi pi-arrow-left"></i></button>
                <h2>
                  @if (mobileMode() === 'audit') { Auditoría }
                  @else if (mobileMode() === 'list') { Enrolados ({{ enrollments().length }}) }
                </h2>
                <button class="ftm-icon-btn" (click)="refreshStats(); loadEnrollments()"><i class="pi pi-refresh"></i></button>
              </div>

              @if (mobileMode() === 'list') {
                @if (enrollments().length === 0) {
                  <div class="ftm-empty"><i class="pi pi-users"></i><span>Nadie enrolado</span></div>
                } @else {
                  <div class="ftm-thumbs">
                    @for (en of enrollments(); track en.id) {
                      <div class="ftm-thumb">
                        <div class="ftm-thumb__img">
                          @if (en.image) { <img [src]="en.image" [alt]="en.name" /> } @else { <i class="pi pi-user"></i> }
                        </div>
                        <div class="ftm-thumb__body">
                          <div class="ftm-thumb__name">{{ en.name }}</div>
                          <div class="ftm-thumb__date">{{ en.createdAt | date:'dd/MM HH:mm' }}</div>
                        </div>
                        <button class="ftm-icon-btn ftm-icon-btn--danger" (click)="deleteEnrollment(en.id)" title="Eliminar">
                          <i class="pi pi-trash"></i>
                        </button>
                      </div>
                    }
                  </div>
                }
              }

              @if (mobileMode() === 'audit') {
                @if (securityAlerts().length > 0) {
                  <div class="ftm-alerts">
                    <h3>Alertas ({{ openAlertsCount() }})</h3>
                    @for (alert of securityAlerts(); track alert.id) {
                      <div class="ftm-alert" [attr.data-severity]="alert.severity" [class.ftm-alert--ack]="alert.acknowledged_at">
                        <div class="ftm-alert__type">{{ alert.alert_type }}</div>
                        <p>{{ alert.message }}</p>
                        @if (!alert.acknowledged_at) {
                          <div class="ftm-alert__actions">
                            @if (alert.alert_type === 'gdpr_action_required' && alert.employee_id) {
                              <button class="ftm-mini-btn ftm-mini-btn--danger" (click)="resolveGdpr(alert)">
                                <i class="pi pi-trash"></i> Borrar
                              </button>
                            }
                            @if (alert.alert_type === 'stale_enrolment' && alert.employee_id) {
                              <button class="ftm-mini-btn" (click)="reEnrolFromAlert(alert); ackAlert(alert.id)">
                                <i class="pi pi-camera"></i> Re-enrolar
                              </button>
                            }
                            <button class="ftm-mini-btn" (click)="ackAlert(alert.id)"><i class="pi pi-check"></i> Visto</button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
                <h3 class="ftm-section-h">Últimos intentos</h3>
                @if (recentAttempts().length === 0) {
                  <div class="ftm-empty"><i class="pi pi-inbox"></i><span>Sin actividad</span></div>
                } @else {
                  <div class="ftm-audit-list">
                    @for (a of recentAttempts(); track a.id) {
                      <div class="ftm-audit-row">
                        <p-tag [value]="resultLabelShort(a.result)" [severity]="resultSeverity(a.result)" />
                        <div class="ftm-audit-row__body">
                          @if (a.matched_employee_id) { <strong>{{ employeeName(a.matched_employee_id) }}</strong> }
                          <span>{{ a.created_at | date:'dd/MM HH:mm:ss' }}</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          }

          <!-- Bottom bar: cambia según mode (enroll vs verify) — la cámara siempre está atrás -->
          @if (mobileMode() === 'enroll') {
            <div class="ftm-bottom ftm-bottom--enroll">
              <div class="ftm-enroll-row">
                <p-select [options]="employees()" optionLabel="short_name" optionValue="id"
                  [ngModel]="selectedEmployeeId()" (ngModelChange)="selectedEmployeeId.set($event)"
                  placeholder="Seleccioná empleado" [filter]="true"
                  filterBy="short_name,employee_number" showClear appendTo="body" styleClass="w-full" />
              </div>
              <label class="ftm-consent">
                <p-checkbox [ngModel]="consentAccepted()" (ngModelChange)="consentAccepted.set($event)" [binary]="true" />
                <span>Autorizo uso de rostro biométrico</span>
              </label>
              <button class="ftm-cta ftm-cta--xl"
                [disabled]="!canEnroll() || busy() || !preflightReady()"
                (click)="enroll()">
                @if (busy()) {
                  <i class="pi pi-spin pi-spinner"></i>
                  <span>{{ challenge() || 'Capturando…' }}</span>
                } @else if (!preflightReady()) {
                  <i class="pi pi-info-circle"></i>
                  <span>Acomodate frente a la cámara</span>
                } @else if (!selectedEmployeeId()) {
                  <i class="pi pi-user"></i>
                  <span>Seleccioná empleado</span>
                } @else if (!consentAccepted()) {
                  <i class="pi pi-info-circle"></i>
                  <span>Confirmá el consentimiento</span>
                } @else {
                  <i class="pi pi-camera"></i>
                  <span>Capturar 3 templates</span>
                }
              </button>
              <button class="ftm-secondary-btn" (click)="setMobileMode('verify')">
                <i class="pi pi-arrow-left"></i> Volver a verificar
              </button>
            </div>
          } @else if (mobileMode() === 'verify') {
            <div class="ftm-bottom">
              @if (verifyResult(); as r) {
                <div class="ftm-result" [attr.data-result]="r.result">
                  <div class="ftm-result__icon">
                    <i class="pi"
                      [class.pi-check-circle]="r.result === 'matched'"
                      [class.pi-exclamation-triangle]="r.result === 'ambiguous' || r.result === 'photo_suspected'"
                      [class.pi-times-circle]="r.result !== 'matched' && r.result !== 'ambiguous' && r.result !== 'photo_suspected'"></i>
                  </div>
                  <div class="ftm-result__body">
                    <strong>{{ resultLabel(r.result, r.name) }}</strong>
                    @if (r.similarity != null) {
                      <span>{{ (r.similarity * 100) | number:'1.0-0' }}% similitud</span>
                    }
                  </div>
                </div>
              }
              <button class="ftm-cta ftm-cta--xl"
                [disabled]="!face.modelsLoaded() || busy() || !preflightReady()"
                (click)="verify()">
                @if (busy()) {
                  <i class="pi pi-spin pi-spinner"></i>
                  <span>{{ challenge() || 'Procesando…' }}</span>
                } @else if (!preflightReady()) {
                  <i class="pi pi-info-circle"></i>
                  <span>Acomodate frente a la cámara</span>
                } @else {
                  <i class="pi pi-eye"></i>
                  <span>Verificar</span>
                }
              </button>
            </div>
          }
        }
        <!-- Bottom Nav (estilo People app) -->
        <pt-mobile-bottom-nav
          [tabs]="mobileTabs()"
          [activeTab]="mobileMode()"
          (tabChange)="setMobileMode($any($event))"
        />
      </div>
    } @else {
    <!-- ═══════════════════════════════════════════════ DESKTOP LAYOUT ═══ -->
    <div class="ft-container">
      <!-- ── HEADER ── -->
      <header class="ft-header">
        <div class="ft-header__brand">
          <div class="ft-logo"><i class="pi pi-id-card"></i></div>
          <div>
            <h1>Reconocimiento Biométrico</h1>
            <p>CompreFace · ArcFace · Multi-frame</p>
          </div>
        </div>
        <div class="ft-header__stats">
          <div class="ft-stat" [class.ft-stat--ok]="cfHealth().ok" [class.ft-stat--err]="!cfHealth().ok">
            <i class="pi" [class.pi-check-circle]="cfHealth().ok" [class.pi-times-circle]="!cfHealth().ok"></i>
            <span class="ft-stat__label">Engine</span>
            <span class="ft-stat__value">{{ cfHealth().ok ? cfHealth().latency_ms + 'ms' : 'OFF' }}</span>
          </div>
          <div class="ft-stat">
            <i class="pi pi-users"></i>
            <span class="ft-stat__label">Enrolados</span>
            <span class="ft-stat__value">{{ enrolledCount() }}</span>
          </div>
          <div class="ft-stat" [class.ft-stat--ok]="myEnrolment()" [class.ft-stat--warn]="!myEnrolment()">
            <i class="pi" [class.pi-user-plus]="!myEnrolment()" [class.pi-verified]="myEnrolment()"></i>
            <span class="ft-stat__label">Mi rostro</span>
            <span class="ft-stat__value">{{ myEnrolment() ? myEnrolment()!.templates_count + ' templates' : 'No enrolado' }}</span>
          </div>
        </div>
      </header>

      <!-- ── MAIN GRID ── -->
      <div class="ft-grid">
        <!-- LEFT: Camera + Preflight -->
        <section class="ft-camera-section">
          @if (!face.modelsLoaded()) {
            <div class="ft-init">
              @if (face.loading()) {
                <i class="pi pi-spin pi-spinner ft-init__spinner"></i>
                <p>Cargando modelos faciales…</p>
              } @else {
                <i class="pi pi-camera ft-init__icon"></i>
                <p>Permite acceso a la cámara para empezar</p>
                <p-button label="Iniciar cámara" icon="pi pi-play" (onClick)="init()" size="large" />
              }
            </div>
          } @else {
            <!-- Camera viewport -->
            <div class="ft-camera">
              <video #video autoplay playsinline muted></video>
              <div class="ft-camera__oval"
                [class.ft-camera__oval--ok]="preflight().faceDetected"></div>

              <!-- Badges superpuestos -->
              <div class="ft-camera__badges">
                <span class="ft-badge"
                  [class.ft-badge--ok]="preflight().faceDetected"
                  [class.ft-badge--err]="!preflight().faceDetected">
                  <i class="pi" [class.pi-user]="preflight().faceDetected" [class.pi-search]="!preflight().faceDetected"></i>
                  {{ preflight().faceDetected ? 'Rostro detectado' : 'Buscando rostro' }}
                </span>
              </div>

              <!-- Progress overlay durante captura -->
              @if (captureProgress() > 0) {
                <div class="ft-camera__progress">
                  <div class="ft-progress-circle">
                    <span>{{ captureProgress() }}/{{ totalFrames }}</span>
                  </div>
                </div>
              }

              <!-- Mensaje grande de challenge -->
              @if (challenge()) {
                <div class="ft-camera__challenge">
                  <span>{{ challenge() }}</span>
                </div>
              }
            </div>

            <!-- Pre-flight checklist -->
            <div class="ft-preflight">
              <h3>Calidad de captura</h3>
              <div class="ft-checks">
                <div class="ft-check" [class.ft-check--ok]="preflight().faceDetected">
                  <i class="pi" [class.pi-check]="preflight().faceDetected" [class.pi-times]="!preflight().faceDetected"></i>
                  <span>Rostro visible</span>
                </div>
                <div class="ft-check" [class.ft-check--ok]="preflight().centered">
                  <i class="pi" [class.pi-check]="preflight().centered" [class.pi-times]="!preflight().centered"></i>
                  <span>Centrado en el óvalo</span>
                </div>
                <div class="ft-check" [class.ft-check--ok]="preflight().largeEnough">
                  <i class="pi" [class.pi-check]="preflight().largeEnough" [class.pi-times]="!preflight().largeEnough"></i>
                  <span>Acercate más</span>
                </div>
                <div class="ft-check" [class.ft-check--ok]="preflight().frontal">
                  <i class="pi" [class.pi-check]="preflight().frontal" [class.pi-times]="!preflight().frontal"></i>
                  <span>De frente</span>
                </div>
                <div class="ft-check" [class.ft-check--ok]="preflight().sharp">
                  <i class="pi" [class.pi-check]="preflight().sharp" [class.pi-times]="!preflight().sharp"></i>
                  <span>Enfocado</span>
                </div>
                <div class="ft-check" [class.ft-check--ok]="preflight().wellLit">
                  <i class="pi" [class.pi-check]="preflight().wellLit" [class.pi-times]="!preflight().wellLit"></i>
                  <span>Buena luz</span>
                </div>
              </div>
              <div class="ft-readiness" [class.ft-readiness--ok]="preflightReady()">
                <i class="pi" [class.pi-check-circle]="preflightReady()" [class.pi-info-circle]="!preflightReady()"></i>
                <span>{{ preflightReady() ? 'Listo para capturar' : 'Ajustá la posición' }}</span>
              </div>
            </div>
          }
        </section>

        <!-- RIGHT: Actions tabs -->
        <section class="ft-actions">
          <p-tabs value="verify" styleClass="ft-tabs">
            <p-tablist>
              <p-tab value="verify"><i class="pi pi-verified mr-2"></i>Verificar</p-tab>
              <p-tab value="enroll"><i class="pi pi-user-plus mr-2"></i>Enrolar</p-tab>
              @if (isAdmin()) { <p-tab value="audit"><i class="pi pi-shield mr-2"></i>Auditoría</p-tab> }
              <p-tab value="list"><i class="pi pi-list mr-2"></i>Lista</p-tab>
            </p-tablist>
            <p-tabpanels>
            <!-- TAB: Verificar -->
            <p-tabpanel value="verify">
              <div class="ft-panel">
                <p class="ft-panel__desc">
                  Capturamos 3 frames en 2 segundos. El servidor exige que el mismo empleado
                  aparezca en mínimo 2 frames y que las imágenes tengan variación natural (anti-foto).
                </p>

                <p-button
                  label="Verificar identidad"
                  icon="pi pi-eye"
                  size="large"
                  styleClass="w-full"
                  severity="success"
                  [disabled]="!face.modelsLoaded() || busy() || !preflightReady()"
                  [loading]="busy()"
                  (onClick)="verify()"
                />

                @if (!preflightReady() && face.modelsLoaded()) {
                  <p class="ft-hint">Acomodate frente a la cámara antes de empezar.</p>
                }

                @if (verifyResult(); as r) {
                  <div class="ft-result"
                    [class.ft-result--ok]="r.result === 'matched'"
                    [class.ft-result--warn]="r.result === 'ambiguous' || r.result === 'photo_suspected'"
                    [class.ft-result--err]="r.result !== 'matched' && r.result !== 'ambiguous' && r.result !== 'photo_suspected'">
                    <div class="ft-result__title">
                      <i class="pi"
                        [class.pi-check-circle]="r.result === 'matched'"
                        [class.pi-exclamation-triangle]="r.result === 'ambiguous' || r.result === 'photo_suspected'"
                        [class.pi-times-circle]="r.result !== 'matched' && r.result !== 'ambiguous' && r.result !== 'photo_suspected'"></i>
                      <span>{{ resultLabel(r.result, r.name) }}</span>
                    </div>
                    @if (r.similarity != null) {
                      <div class="ft-result__meta">
                        <div><span>Similitud</span><strong>{{ (r.similarity * 100) | number:'1.1-1' }}%</strong></div>
                        @if (r.margin != null) { <div><span>Margen</span><strong>{{ (r.margin * 100) | number:'1.1-1' }}%</strong></div> }
                        @if (r.metrics?.frames_voting_winner != null) {
                          <div><span>Frames coincidentes</span><strong>{{ r.metrics.frames_voting_winner }}/{{ totalFrames }}</strong></div>
                        }
                        @if (r.metrics?.anti_photo_passed != null) {
                          <div><span>Anti-foto</span><strong>{{ r.metrics.anti_photo_passed ? '✓' : '✗' }}</strong></div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </p-tabpanel>

            <!-- TAB: Enrolar -->
            <p-tabpanel value="enroll">
              <div class="ft-panel">
                <p class="ft-panel__desc">
                  Capturamos 3 templates de la cara. Movéte ligeramente entre frames
                  (gesto natural) para que el sistema aprenda variaciones.
                </p>

                <p-select [options]="employees()" optionLabel="short_name" optionValue="id"
                  [ngModel]="selectedEmployeeId()" (ngModelChange)="selectedEmployeeId.set($event)"
                  placeholder="Seleccioná un empleado" [filter]="true"
                  filterBy="short_name,employee_number" showClear appendTo="body" styleClass="w-full" />

                <label class="ft-consent">
                  <p-checkbox [ngModel]="consentAccepted()" (ngModelChange)="consentAccepted.set($event)"
                    [binary]="true" inputId="consent" />
                  <span>El empleado autorizó el uso de su rostro como dato biométrico para marcación.</span>
                </label>

                <p-button
                  label="Capturar 3 templates"
                  icon="pi pi-camera"
                  size="large"
                  styleClass="w-full"
                  [disabled]="!canEnroll() || busy() || !preflightReady()"
                  [loading]="busy()"
                  (onClick)="enroll()"
                />
              </div>
            </p-tabpanel>

            <!-- TAB: Auditoría (admin only) -->
            @if (isAdmin()) {
              <p-tabpanel value="audit">
                <div class="ft-panel">
                  <!-- Alertas de seguridad arriba -->
                  @if (securityAlerts().length > 0) {
                    <div class="ft-alerts">
                      <h4>🚨 Alertas abiertas ({{ openAlertsCount() }})</h4>
                      @for (alert of securityAlerts(); track alert.id) {
                        <div class="ft-alert" [attr.data-severity]="alert.severity"
                          [class.ft-alert--ack]="alert.acknowledged_at">
                          <div class="ft-alert__head">
                            <p-tag [value]="alert.alert_type" [severity]="alertSeverity(alert.severity)" />
                            <span class="ft-alert__time">{{ alert.created_at | date:'dd/MM HH:mm' }}</span>
                          </div>
                          <p class="ft-alert__msg">{{ alert.message }}</p>
                          @if (!alert.acknowledged_at) {
                            <div class="ft-alert__actions">
                              @if (alert.alert_type === 'gdpr_action_required' && alert.employee_id) {
                                <button type="button" class="ft-alert__btn" (click)="resolveGdpr(alert)">
                                  <i class="pi pi-trash"></i> Borrar de CompreFace + Resolver
                                </button>
                              }
                              @if (alert.alert_type === 'stale_enrolment' && alert.employee_id) {
                                <button type="button" class="ft-alert__btn ft-alert__btn--secondary" (click)="reEnrolFromAlert(alert); ackAlert(alert.id)">
                                  <i class="pi pi-camera"></i> Re-enrolar
                                </button>
                              }
                              <button type="button" class="ft-alert__btn ft-alert__btn--secondary" (click)="ackAlert(alert.id)">
                                <i class="pi pi-check"></i> Marcar revisado
                              </button>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }

                  <p class="ft-panel__desc">Últimos 20 intentos de verificación en tu empresa.</p>
                  @if (recentAttempts().length === 0) {
                    <div class="ft-empty">
                      <i class="pi pi-inbox"></i>
                      <span>Sin actividad aún</span>
                    </div>
                  } @else {
                    <div class="ft-audit">
                      @for (a of recentAttempts(); track a.id) {
                        <div class="ft-audit-row" [attr.data-result]="a.result">
                          <div class="ft-audit-row__time">{{ a.created_at | date:'dd/MM HH:mm:ss' }}</div>
                          <div class="ft-audit-row__result">
                            <p-tag [value]="resultLabelShort(a.result)" [severity]="resultSeverity(a.result)" />
                          </div>
                          <div class="ft-audit-row__meta">
                            @if (a.matched_employee_id) { {{ employeeName(a.matched_employee_id) }} }
                            @if (a.best_distance != null) { · sim {{ ((1 - a.best_distance) * 100) | number:'1.0-0' }}% }
                            @if (a.margin != null) { · margen {{ (a.margin * 100) | number:'1.0-0' }}% }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </p-tabpanel>
            }

            <!-- TAB: Enrolados -->
            <p-tabpanel value="list">
              <div class="ft-panel">
                <div class="ft-panel__head">
                  <span>{{ enrollments().length }} rostros activos</span>
                  <button type="button" class="ft-refresh" (click)="loadEnrollments()">
                    <i class="pi" [class.pi-refresh]="!loadingEnrollments()" [class.pi-spin]="loadingEnrollments()" [class.pi-spinner]="loadingEnrollments()"></i>
                  </button>
                </div>
                @if (enrollments().length === 0) {
                  <div class="ft-empty">
                    <i class="pi pi-users"></i>
                    <span>Nadie enrolado todavía</span>
                  </div>
                } @else {
                  <div class="ft-grid-thumbs">
                    @for (en of enrollments(); track en.id) {
                      <div class="ft-thumb">
                        <div class="ft-thumb__img">
                          @if (en.image) { <img [src]="en.image" [alt]="en.name" /> }
                          @else { <i class="pi pi-user"></i> }
                        </div>
                        <div class="ft-thumb__name" [title]="en.name">{{ en.name }}</div>
                        <div class="ft-thumb__date">{{ en.createdAt | date:'dd/MM HH:mm' }}</div>
                        <button type="button" class="ft-thumb__del" (click)="deleteEnrollment(en.id)" title="Eliminar">
                          <i class="pi pi-trash"></i>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            </p-tabpanel>
            </p-tabpanels>
          </p-tabs>
        </section>
      </div>
    </div>
    }
  `,
  styles: [`
    .ft-container { padding: 1rem 1.25rem; max-width: 1280px; margin: 0 auto; color: #e5e7eb; }
    /* Header */
    .ft-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(8,145,178,0.10), rgba(124,58,237,0.10)); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; margin-bottom: 1rem; }
    .ft-header__brand { display: flex; align-items: center; gap: 0.85rem; }
    .ft-logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #06b6d4, #8b5cf6); display: grid; place-items: center; color: white; font-size: 1.4rem; }
    .ft-header__brand h1 { margin: 0; font-size: 1.15rem; font-weight: 700; color: #f9fafb; }
    .ft-header__brand p { margin: 0.1rem 0 0; font-size: 0.75rem; color: #94a3b8; }
    .ft-header__stats { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .ft-stat { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; font-size: 0.78rem; }
    .ft-stat i { font-size: 0.95rem; color: #94a3b8; }
    .ft-stat__label { color: #94a3b8; }
    .ft-stat__value { color: #f1f5f9; font-weight: 600; }
    .ft-stat--ok i { color: #10b981; }
    .ft-stat--err i { color: #ef4444; }
    .ft-stat--warn i { color: #f59e0b; }

    /* Grid */
    .ft-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
    @media (max-width: 900px) { .ft-grid { grid-template-columns: 1fr; } }

    /* Init state */
    .ft-init { aspect-ratio: 4/3; display: grid; place-items: center; gap: 0.75rem; background: #0f172a; border: 1px dashed rgba(255,255,255,0.15); border-radius: 16px; text-align: center; padding: 2rem; }
    .ft-init__icon, .ft-init__spinner { font-size: 2.4rem; color: #06b6d4; }

    /* Camera */
    .ft-camera-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .ft-camera { position: relative; aspect-ratio: 4/3; border-radius: 16px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.08); }
    .ft-camera video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
    .ft-camera__oval { position: absolute; inset: 0; margin: auto; width: 55%; height: 78%; border-radius: 50%; border: 4px solid rgba(255,255,255,0.35); box-shadow: 0 0 0 9999px rgba(0,0,0,0.45); pointer-events: none; transition: border-color .2s, box-shadow .2s; }
    .ft-camera__oval--ok { border-color: #10b981; box-shadow: 0 0 0 9999px rgba(0,0,0,0.45), 0 0 40px rgba(16,185,129,0.4); }
    .ft-camera__badges { position: absolute; top: 0.6rem; left: 0.6rem; display: flex; gap: 0.4rem; }
    .ft-badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.6rem; border-radius: 8px; font-size: 0.7rem; font-weight: 600; backdrop-filter: blur(4px); }
    .ft-badge--ok { background: rgba(16,185,129,0.85); color: white; }
    .ft-badge--err { background: rgba(239,68,68,0.85); color: white; }
    .ft-camera__progress { position: absolute; top: 0; right: 0; bottom: 0; left: 0; display: grid; place-items: center; background: rgba(0,0,0,0.35); }
    .ft-progress-circle { width: 96px; height: 96px; border-radius: 50%; background: rgba(245,158,11,0.95); color: #fff; display: grid; place-items: center; font-size: 1.4rem; font-weight: 800; box-shadow: 0 8px 30px rgba(245,158,11,0.4); animation: pulse 1s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
    .ft-camera__challenge { position: absolute; left: 0; right: 0; bottom: 0; padding: 1rem; background: linear-gradient(to top, rgba(0,0,0,0.85), transparent); text-align: center; }
    .ft-camera__challenge span { color: #fde68a; font-weight: 700; font-size: 1.05rem; }

    /* Preflight */
    .ft-preflight { background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 0.85rem; }
    .ft-preflight h3 { margin: 0 0 0.6rem; font-size: 0.85rem; color: #f1f5f9; font-weight: 600; }
    .ft-checks { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.4rem 0.8rem; margin-bottom: 0.6rem; }
    .ft-check { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #94a3b8; transition: color .2s; }
    .ft-check i { width: 16px; height: 16px; border-radius: 4px; display: grid; place-items: center; font-size: 0.7rem; background: rgba(239,68,68,0.2); color: #ef4444; }
    .ft-check--ok { color: #f1f5f9; }
    .ft-check--ok i { background: rgba(16,185,129,0.2); color: #10b981; }
    .ft-readiness { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.7rem; background: rgba(15,23,42,0.8); border-radius: 8px; font-size: 0.8rem; font-weight: 600; color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
    .ft-readiness--ok { color: #10b981; border-color: rgba(16,185,129,0.3); }

    /* Actions / Tabs */
    .ft-actions { display: flex; flex-direction: column; gap: 0.75rem; }
    :host ::ng-deep .ft-tabs .p-tabview-nav { background: transparent; border: none; gap: 0.25rem; }
    :host ::ng-deep .ft-tabs .p-tabview-nav-link { background: rgba(15,23,42,0.5); border-radius: 8px 8px 0 0; color: #94a3b8 !important; padding: 0.6rem 0.8rem !important; font-size: 0.8rem !important; }
    :host ::ng-deep .ft-tabs .p-tabview-nav-link.p-tabview-selected, :host ::ng-deep .ft-tabs .p-tabview-nav-link[aria-selected="true"] { background: rgba(15,23,42,0.95); color: #f1f5f9 !important; }
    :host ::ng-deep .ft-tabs .p-tabview-panels { background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 0 12px 12px 12px; padding: 1rem; }

    .ft-panel { display: flex; flex-direction: column; gap: 0.8rem; }
    .ft-panel__desc { font-size: 0.78rem; color: #94a3b8; margin: 0; line-height: 1.5; }
    .ft-panel__head { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #cbd5e1; }
    .ft-refresh { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
    .ft-refresh:hover { background: rgba(255,255,255,0.06); }

    .ft-consent { display: flex; align-items: start; gap: 0.5rem; font-size: 0.75rem; color: #cbd5e1; cursor: pointer; line-height: 1.5; }
    .ft-hint { font-size: 0.75rem; color: #f59e0b; margin: 0; text-align: center; }

    /* Result */
    .ft-result { padding: 0.85rem; border-radius: 10px; border: 1px solid; }
    .ft-result--ok { background: rgba(16,185,129,0.10); border-color: rgba(16,185,129,0.40); }
    .ft-result--warn { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.40); }
    .ft-result--err { background: rgba(239,68,68,0.10); border-color: rgba(239,68,68,0.40); }
    .ft-result__title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 0.95rem; }
    .ft-result--ok .ft-result__title { color: #34d399; }
    .ft-result--warn .ft-result__title { color: #fbbf24; }
    .ft-result--err .ft-result__title { color: #fca5a5; }
    .ft-result__meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem 1rem; margin-top: 0.6rem; font-size: 0.72rem; }
    .ft-result__meta > div { display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .ft-result__meta span { color: #94a3b8; }
    .ft-result__meta strong { color: #f1f5f9; font-weight: 600; }

    /* Audit */
    .ft-audit { display: flex; flex-direction: column; gap: 0.3rem; max-height: 420px; overflow-y: auto; }
    .ft-audit-row { display: grid; grid-template-columns: 110px 110px 1fr; align-items: center; gap: 0.5rem; padding: 0.45rem 0.65rem; background: rgba(0,0,0,0.25); border-radius: 7px; font-size: 0.72rem; }
    .ft-audit-row__time { color: #94a3b8; font-variant-numeric: tabular-nums; }
    .ft-audit-row__meta { color: #cbd5e1; font-size: 0.7rem; }

    /* Thumbs grid */
    .ft-grid-thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.6rem; max-height: 460px; overflow-y: auto; }
    .ft-thumb { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; overflow: hidden; position: relative; }
    .ft-thumb__img { aspect-ratio: 4/3; background: #000; display: grid; place-items: center; color: #475569; font-size: 1.6rem; }
    .ft-thumb__img img { width: 100%; height: 100%; object-fit: cover; }
    .ft-thumb__name { padding: 0.4rem 0.5rem 0.1rem; font-size: 0.72rem; color: #f1f5f9; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ft-thumb__date { padding: 0 0.5rem 0.4rem; font-size: 0.65rem; color: #94a3b8; }
    .ft-thumb__del { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); border: none; color: #fca5a5; padding: 4px 6px; border-radius: 5px; cursor: pointer; opacity: 0; transition: opacity .15s; }
    .ft-thumb:hover .ft-thumb__del { opacity: 1; }
    .ft-thumb__del:hover { background: rgba(239,68,68,0.7); color: white; }

    .ft-empty { display: grid; place-items: center; gap: 0.5rem; padding: 2rem; color: #64748b; text-align: center; }
    .ft-empty i { font-size: 1.8rem; }

    /* Security alerts */
    .ft-alerts { margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .ft-alerts h4 { margin: 0 0 0.6rem; font-size: 0.85rem; color: #fbbf24; font-weight: 600; }
    .ft-alert { padding: 0.6rem 0.75rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 8px; margin-bottom: 0.4rem; }
    .ft-alert[data-severity="high"] { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.30); }
    .ft-alert[data-severity="info"] { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.25); }
    .ft-alert--ack { opacity: 0.45; }
    .ft-alert__head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.35rem; }
    .ft-alert__time { font-size: 0.65rem; color: #94a3b8; font-variant-numeric: tabular-nums; }
    .ft-alert__msg { margin: 0 0 0.4rem; font-size: 0.78rem; color: #cbd5e1; line-height: 1.4; }
    .ft-alert__actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .ft-alert__btn { background: rgba(239,68,68,0.20); color: #fca5a5; border: 1px solid rgba(239,68,68,0.35); padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.72rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem; }
    .ft-alert__btn:hover { background: rgba(239,68,68,0.30); }
    .ft-alert__btn--secondary { background: rgba(100,116,139,0.20); color: #cbd5e1; border-color: rgba(100,116,139,0.35); }
    .ft-alert__btn--secondary:hover { background: rgba(100,116,139,0.30); }

    /* ═══════════════════════════════ MOBILE LAYOUT (palette People) ═══ */
    .ftm-app { display: flex; flex-direction: column; height: 100dvh; max-height: 100dvh; background: #0a0a0a; color: #fff; overflow: hidden; padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px)); }
    .ftm-header { padding: 0.75rem 1rem; background: #0a0a0a; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .ftm-header__title h1 { margin: 0; font-size: 1.05rem; font-weight: 600; color: #fff; letter-spacing: -0.01em; }
    .ftm-header__sub { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; color: #71717a; margin-top: 2px; }
    .ftm-icon-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #fff; width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; cursor: pointer; font-size: 1rem; -webkit-tap-highlight-color: transparent; }
    .ftm-icon-btn:active { transform: scale(0.95); }
    .ftm-icon-btn--danger { color: #fca5a5; background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.30); width: 36px; height: 36px; font-size: 0.9rem; }

    /* Camera (fullbleed) */
    .ftm-camera { flex: 1; position: relative; background: #000; overflow: hidden; min-height: 0; }
    .ftm-camera video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
    .ftm-camera__oval { position: absolute; inset: 0; margin: auto; width: 75%; height: 60%; border-radius: 50%; border: 3px solid rgba(255,255,255,0.30); box-shadow: 0 0 0 9999px rgba(0,0,0,0.45); pointer-events: none; transition: border-color .2s, box-shadow .2s; }
    .ftm-camera__oval--ok { border-color: #fbbf24; box-shadow: 0 0 0 9999px rgba(0,0,0,0.45), 0 0 40px rgba(251,191,36,0.4); }
    .ftm-chips { position: absolute; top: 0.75rem; left: 0.75rem; right: 0.75rem; display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .ftm-chip { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.65rem; background: rgba(0,0,0,0.70); backdrop-filter: blur(6px); border-radius: 999px; font-size: 0.72rem; color: #71717a; border: 1px solid rgba(255,255,255,0.06); }
    .ftm-chip i { font-size: 0.78rem; }
    .ftm-chip--ok { color: #fbbf24; background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.30); }
    .ftm-chip--info { color: #93c5fd; background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.30); }
    .ftm-camera__overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: grid; place-items: center; }
    .ftm-progress { width: 110px; height: 110px; border-radius: 50%; background: #fbbf24; display: grid; place-items: center; font-size: 1.5rem; font-weight: 800; color: #0a0a0a; box-shadow: 0 8px 40px rgba(251,191,36,0.5); animation: pulse 1s ease-in-out infinite; }
    .ftm-camera__challenge { position: absolute; left: 0; right: 0; bottom: 0.6rem; text-align: center; padding: 0.4rem 1rem; color: #fbbf24; font-weight: 700; font-size: 0.95rem; text-shadow: 0 1px 6px rgba(0,0,0,0.8); }

    .ftm-camera--hidden { display: none; }

    /* Bottom action area (above bottom-nav) */
    .ftm-bottom { padding: 0.85rem 1rem 1rem; background: #0a0a0a; border-top: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 0.55rem; }
    .ftm-bottom--enroll { gap: 0.5rem; }
    .ftm-enroll-row { display: flex; gap: 0.4rem; }
    .ftm-secondary-btn { background: transparent; border: 1px solid rgba(255,255,255,0.10); color: #a1a1aa; padding: 0.5rem; border-radius: 10px; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; -webkit-tap-highlight-color: transparent; }
    .ftm-secondary-btn:active { background: rgba(255,255,255,0.05); }

    /* Panel overlay (audit/list) — encima de la cámara, sobre la bottom-nav */
    .ftm-panel { position: fixed; inset: 0; top: 60px; bottom: calc(56px + env(safe-area-inset-bottom, 0px)); background: #0a0a0a; z-index: 50; overflow-y: auto; padding: 1rem; }
    .ftm-cta { width: 100%; padding: 0.95rem 1.25rem; border-radius: 12px; background: #fbbf24; color: #0a0a0a; font-size: 1rem; font-weight: 700; border: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; transition: opacity .15s, transform .15s; -webkit-tap-highlight-color: transparent; }
    .ftm-cta:active { transform: scale(0.98); opacity: 0.9; }
    .ftm-cta:disabled { background: #27272a; color: #71717a; cursor: not-allowed; }
    .ftm-cta i { font-size: 1.1rem; }
    .ftm-cta--xl { padding: 1.15rem; font-size: 1.05rem; letter-spacing: 0.01em; }
    .ftm-cta--full { width: 100%; }

    /* Result card mobile */
    .ftm-result { display: flex; align-items: center; gap: 0.7rem; padding: 0.65rem 0.85rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: #18181b; }
    .ftm-result[data-result="matched"] { border-color: rgba(34,197,94,0.45); background: rgba(34,197,94,0.10); }
    .ftm-result[data-result="ambiguous"], .ftm-result[data-result="photo_suspected"] { border-color: rgba(251,191,36,0.45); background: rgba(251,191,36,0.10); }
    .ftm-result[data-result^="un"], .ftm-result[data-result^="no_"], .ftm-result[data-result="error"], .ftm-result[data-result="nonce_invalid"], .ftm-result[data-result="rate_limited"], .ftm-result[data-result="liveness_failed"] { border-color: rgba(239,68,68,0.45); background: rgba(239,68,68,0.10); }
    .ftm-result__icon i { font-size: 1.6rem; }
    .ftm-result[data-result="matched"] .ftm-result__icon i { color: #22c55e; }
    .ftm-result[data-result="ambiguous"] .ftm-result__icon i, .ftm-result[data-result="photo_suspected"] .ftm-result__icon i { color: #fbbf24; }
    .ftm-result:not([data-result="matched"]):not([data-result="ambiguous"]):not([data-result="photo_suspected"]) .ftm-result__icon i { color: #ef4444; }
    .ftm-result__body { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; }
    .ftm-result__body strong { font-size: 0.9rem; color: #fff; }
    .ftm-result__body span { font-size: 0.72rem; color: #71717a; }

    /* Init / panel */
    .ftm-init { flex: 1; display: grid; place-items: center; gap: 0.85rem; padding: 2rem; text-align: center; background: #0a0a0a; }
    .ftm-init i { font-size: 2.5rem; color: #fbbf24; }
    .ftm-init p { color: #71717a; font-size: 0.88rem; margin: 0; }
    .ftm-panel__head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.85rem; }
    .ftm-panel__head h2 { margin: 0; flex: 1; font-size: 1rem; color: #fff; }
    .ftm-form { display: flex; flex-direction: column; gap: 0.7rem; }
    .ftm-consent { display: flex; align-items: flex-start; gap: 0.55rem; font-size: 0.78rem; color: #d4d4d8; line-height: 1.4; cursor: pointer; padding: 0.6rem; background: #18181b; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
    .ftm-hint { font-size: 0.72rem; color: #71717a; margin: 0; padding: 0.4rem 0.6rem; }
    .ftm-empty { display: grid; place-items: center; gap: 0.5rem; padding: 3rem 1rem; color: #52525b; text-align: center; }
    .ftm-empty i { font-size: 2rem; }
    .ftm-section-h { font-size: 0.82rem; color: #a1a1aa; margin: 1rem 0 0.5rem; font-weight: 600; }

    .ftm-thumbs { display: flex; flex-direction: column; gap: 0.45rem; }
    .ftm-thumb { display: flex; align-items: center; gap: 0.7rem; padding: 0.55rem; background: #18181b; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
    .ftm-thumb__img { width: 52px; height: 52px; border-radius: 10px; overflow: hidden; background: #000; display: grid; place-items: center; flex-shrink: 0; color: #52525b; }
    .ftm-thumb__img img { width: 100%; height: 100%; object-fit: cover; }
    .ftm-thumb__body { flex: 1; min-width: 0; }
    .ftm-thumb__name { font-size: 0.88rem; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ftm-thumb__date { font-size: 0.7rem; color: #71717a; }

    .ftm-alerts { margin-bottom: 0.85rem; }
    .ftm-alerts h3 { font-size: 0.85rem; color: #fbbf24; margin: 0 0 0.5rem; font-weight: 600; }
    .ftm-alert { padding: 0.7rem; background: #18181b; border: 1px solid rgba(251,191,36,0.30); border-radius: 12px; margin-bottom: 0.4rem; }
    .ftm-alert[data-severity="high"] { border-color: rgba(239,68,68,0.40); }
    .ftm-alert[data-severity="info"] { border-color: rgba(59,130,246,0.30); }
    .ftm-alert--ack { opacity: 0.45; }
    .ftm-alert__type { font-size: 0.7rem; color: #fbbf24; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.35rem; }
    .ftm-alert p { font-size: 0.8rem; color: #d4d4d8; margin: 0 0 0.5rem; line-height: 1.4; }
    .ftm-alert__actions { display: flex; gap: 0.4rem; }
    .ftm-mini-btn { background: rgba(255,255,255,0.04); color: #d4d4d8; border: 1px solid rgba(255,255,255,0.10); padding: 0.4rem 0.7rem; border-radius: 8px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .ftm-mini-btn--danger { background: rgba(239,68,68,0.15); color: #fca5a5; border-color: rgba(239,68,68,0.35); }

    .ftm-audit-list { display: flex; flex-direction: column; gap: 0.35rem; }
    .ftm-audit-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.7rem; background: #18181b; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
    .ftm-audit-row__body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .ftm-audit-row__body strong { font-size: 0.78rem; color: #fff; }
    .ftm-audit-row__body span { font-size: 0.7rem; color: #71717a; font-variant-numeric: tabular-nums; }

    /* Fallback responsive del desktop layout para tablets en landscape */
    @media (max-width: 1024px) and (min-width: 769px) {
      .ft-grid { grid-template-columns: 1fr; }
      .ft-header { flex-direction: column; align-items: stretch; }
    }
  `],
})
export class FaceTestComponent implements OnDestroy {
  public face = inject(FaceRecognitionService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);
  private store = inject(DashboardStore);
  private msg = inject(MessageService);

  public readonly totalFrames = FRAMES_TO_CAPTURE;

  private videoRef = viewChild<ElementRef<HTMLVideoElement>>('video');
  private stream: MediaStream | null = null;
  private preflightHandle: any = null;
  private statsHandle: any = null;

  public selectedEmployeeId = signal<string | null>(null);
  public consentAccepted = signal(false);
  public busy = signal(false);
  public challenge = signal<string>('');
  public captureProgress = signal<number>(0);

  public preflight = signal<PreflightChecks>({
    faceDetected: false, centered: false, largeEnough: false, frontal: false, sharp: false, wellLit: false, score: 0,
  });
  public preflightReady = computed(() => {
    const p = this.preflight();
    return p.faceDetected && p.centered && p.largeEnough && p.frontal && p.sharp && p.wellLit;
  });

  public cfHealth = signal<{ ok: boolean; latency_ms: number; subjects: number }>({ ok: false, latency_ms: 0, subjects: 0 });
  public enrolledCount = signal<number>(0);
  public myEnrolment = signal<{ created_at: string; templates_count: number } | null>(null);
  public isAdmin = signal<boolean>(false);
  public recentAttempts = signal<any[]>([]);
  public securityAlerts = signal<any[]>([]);
  public openAlertsCount = computed(() => this.securityAlerts().filter(a => !a.acknowledged_at).length);

  // Mobile layout state
  public isMobile = signal<boolean>(typeof window !== 'undefined' && window.innerWidth <= 768);
  public mobileMode = signal<'verify' | 'enroll' | 'audit' | 'list'>('verify');
  public mobileMenuOpen = signal<boolean>(false);
  private resizeListener = () => this.isMobile.set(window.innerWidth <= 768);

  public mobileTabs = computed<MobileNavTab[]>(() => {
    const tabs: MobileNavTab[] = [
      { id: 'verify', label: 'Verificar', icon: 'pi pi-verified' },
      { id: 'enroll', label: 'Enrolar',   icon: 'pi pi-user-plus' },
    ];
    if (this.isAdmin()) {
      tabs.push({ id: 'audit', label: 'Auditoría', icon: 'pi pi-shield', badge: this.openAlertsCount() });
    }
    tabs.push({ id: 'list', label: 'Lista', icon: 'pi pi-list' });
    return tabs;
  });

  public verifyResult = signal<{
    result: string;
    name: string | null;
    similarity: number | null;
    margin: number | null;
    metrics?: any;
  } | null>(null);
  public consecutiveFailures = signal<number>(0);
  public showPinFallback = computed(() => this.consecutiveFailures() >= 3);

  public employees = computed(() =>
    this.store.employees.employeesList()
      .filter((e: any) => e.is_active)
      .sort((a: any, b: any) => (a.short_name || '').localeCompare(b.short_name || ''))
  );

  public canEnroll = computed(() =>
    this.face.modelsLoaded() && !!this.selectedEmployeeId() && this.consentAccepted()
  );

  public enrollments = signal<Array<{ id: string; employeeId: string; name: string; image: string | null; createdAt: string }>>([]);
  public loadingEnrollments = signal(false);

  constructor() {
    this.store.employees.fetchItems();
    this.loadEnrollments();
    this.refreshStats();
    this.statsHandle = setInterval(() => this.refreshStats(), 15000);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeListener);
    }
  }

  public setMobileMode(m: 'verify' | 'enroll' | 'audit' | 'list'): void {
    this.mobileMode.set(m);
  }
  public toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }


  public employeeName(id: string): string {
    const e: any = this.employees().find((x: any) => x.id === id);
    return e?.short_name || id.slice(0, 8);
  }

  public resultLabel(result: string, name: string | null): string {
    switch (result) {
      case 'matched': return `Identificado: ${name || ''}`;
      case 'ambiguous': return 'Coincidencia ambigua — varios candidatos';
      case 'photo_suspected': return 'Posible foto estática — movete naturalmente';
      case 'unknown': return 'Sin coincidencia confiable';
      case 'liveness_failed': return 'Liveness falló';
      case 'rate_limited': return 'Demasiados intentos, esperá';
      case 'nonce_invalid': return 'Sesión expirada — reintentar';
      case 'no_enrolments': return 'Nadie enrolado aún';
      case 'no_face': return 'No se detectó rostro en los frames';
      default: return `Error (${result})`;
    }
  }
  public resultLabelShort(result: string): string {
    return ({ matched: 'match', ambiguous: 'ambiguo', photo_suspected: 'foto?', unknown: 'unknown',
      liveness_failed: 'liveness', rate_limited: 'rate', nonce_invalid: 'nonce', no_face: 'no face',
      no_enrolments: 'no enrol', error: 'error' } as any)[result] || result;
  }
  public resultSeverity(result: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' {
    if (result === 'matched') return 'success';
    if (result === 'ambiguous' || result === 'photo_suspected') return 'warn';
    if (result === 'rate_limited' || result === 'no_enrolments') return 'secondary';
    return 'danger';
  }
  public alertSeverity(sev: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' {
    if (sev === 'high') return 'danger';
    if (sev === 'warn') return 'warn';
    return 'info';
  }

  public async ackAlert(alertId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(
        this.apiUrl.build('rest/v1/rpc/face_security_alert_ack'),
        { p_alert_id: alertId },
      ));
      this.msg.add({ severity: 'info', summary: 'Alerta', detail: 'Marcada como revisada' });
      this.refreshStats();
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'No se pudo marcar' });
    }
  }

  /** Click en alerta stale_enrolment → ir a enrolar ese empleado */
  public reEnrolFromAlert(alert: any): void {
    if (!alert.employee_id) return;
    this.selectedEmployeeId.set(alert.employee_id);
    this.consentAccepted.set(false);
    if (this.isMobile()) {
      this.setMobileMode('enroll');
    } else {
      // Desktop: scroll to enroll tab — not strictly needed, ya está en el tab
    }
    this.msg.add({
      severity: 'info',
      summary: 'Re-enrolar',
      detail: `${this.employeeName(alert.employee_id)} seleccionado. Confirmá consentimiento y capturá.`,
    });
  }

  public async resolveGdpr(alert: any): Promise<void> {
    if (!alert.employee_id) return;
    const callerEmail = this.store.currentEmployee()?.work_email;
    if (!callerEmail) return;
    try {
      const res: any = await firstValueFrom(this.http.post(
        this.apiUrl.build('functions/v1/face-cleanup'),
        { caller_email: callerEmail, employee_id: alert.employee_id, alert_id: alert.id },
      ));
      this.msg.add({
        severity: 'success',
        summary: 'GDPR',
        detail: `${res.cf_faces_deleted} templates borrados de CompreFace · ${res.enrolments_deactivated} enrolments`,
      });
      this.refreshStats();
      this.loadEnrollments();
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.error?.error || 'Cleanup falló' });
    }
  }

  public async refreshStats(): Promise<void> {
    const callerEmail = this.store.currentEmployee()?.work_email;
    if (!callerEmail) return;
    try {
      const stats: any = await firstValueFrom(this.http.post(
        this.apiUrl.build('functions/v1/face-stats'),
        { caller_email: callerEmail },
      ));
      this.cfHealth.set(stats.cf_health || { ok: false, latency_ms: 0, subjects: 0 });
      this.enrolledCount.set(stats.enrolled_count || 0);
      this.myEnrolment.set(stats.my_enrolment || null);
      this.isAdmin.set(!!stats.is_admin);
      this.recentAttempts.set(stats.recent_attempts || []);

      // Cargar alertas si es admin
      if (stats.is_admin) {
        try {
          const companyId = this.org.getCurrentCompanyId();
          const alerts = await firstValueFrom(this.http.post<any[]>(
            this.apiUrl.build('rest/v1/rpc/face_security_alerts_recent'),
            { p_company_id: companyId, p_limit: 30 },
          ));
          this.securityAlerts.set(alerts || []);
        } catch { this.securityAlerts.set([]); }
      }
    } catch { /* silent */ }
  }

  public async loadEnrollments(): Promise<void> {
    this.loadingEnrollments.set(true);
    try {
      const companyId = this.org.getCurrentCompanyId();
      if (!companyId) { this.enrollments.set([]); return; }
      const rows = await firstValueFrom(this.http.post<any[]>(
        this.apiUrl.build('rest/v1/rpc/face_enrollments_list_company'),
        { p_company_id: companyId },
      ));
      const emps = this.employees();
      this.enrollments.set((rows || []).map(r => {
        const e: any = emps.find((x: any) => x.id === r.employee_id);
        return {
          id: r.id, employeeId: r.employee_id,
          name: e?.short_name || (r.employee_id?.slice(0, 8) ?? '—'),
          image: r.reference_image || null,
          createdAt: r.created_at,
        };
      }));
    } catch {
      this.enrollments.set([]);
    } finally {
      this.loadingEnrollments.set(false);
    }
  }

  public async deleteEnrollment(id: string): Promise<void> {
    try {
      const callerEmail = this.store.currentEmployee()?.work_email;
      if (!callerEmail) return;
      await firstValueFrom(this.http.post(
        this.apiUrl.build('functions/v1/face-deactivate'),
        { caller_email: callerEmail, enrollment_id: id, reason: 'manual_delete' },
      ));
      this.msg.add({ severity: 'info', summary: 'Eliminado', detail: 'Enrolamiento desactivado.' });
      this.loadEnrollments();
      this.refreshStats();
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.error?.error || 'No se pudo eliminar.' });
    }
  }

  public async init(): Promise<void> {
    await this.face.loadModels();
    await this.startCamera();
    this.startPreflightLoop();
  }

  private async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 }, audio: false });
      const v = this.videoRef()?.nativeElement;
      if (v) { v.srcObject = this.stream; await v.play().catch(() => {}); }
    } catch {
      this.msg.add({ severity: 'error', summary: 'Cámara', detail: 'No se pudo acceder a la cámara. Revisa permisos.' });
    }
  }

  /** Loop de pre-flight: corre detect() + qualityCheck() y actualiza el panel de calidad en vivo. */
  private startPreflightLoop(): void {
    if (this.preflightHandle) return;
    this.preflightHandle = setInterval(async () => {
      const v = this.videoRef()?.nativeElement;
      if (!v || v.readyState < 2 || this.busy()) return;
      const d = await this.face.detect(v);
      if (!d) {
        this.preflight.set({ faceDetected: false, centered: false, largeEnough: false, frontal: false, sharp: false, wellLit: false, score: 0 });
        return;
      }
      const q = this.face.qualityCheck(v, d);
      const frameW = v.videoWidth || 1280;
      const cx = d.box.x + d.box.width / 2;
      const centered = Math.abs(cx - frameW / 2) < frameW * 0.18;
      const bbox = Math.min(d.box.width, d.box.height);
      this.preflight.set({
        faceDetected: true,
        centered,
        largeEnough: bbox >= 180,
        frontal: Math.abs(d.yaw) < 0.20 && Math.abs(d.pitch) < 0.25,
        sharp: q.metrics.blurVariance >= 60,
        wellLit: q.metrics.brightness >= 50 && q.metrics.brightness <= 220,
        score: d.detectionScore,
      });
    }, PREFLIGHT_INTERVAL_MS);
  }

  private captureFrame(v: HTMLVideoElement, maxSide = 720, quality = 0.9): string | null {
    try {
      const w = v.videoWidth, h = v.videoHeight;
      if (!w || !h) return null;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      const cw = Math.round(w * scale), ch = Math.round(h * scale);
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, cw, ch);
      return c.toDataURL('image/jpeg', quality);
    } catch { return null; }
  }

  private captureThumbnailMirrored(v: HTMLVideoElement): string | null {
    try {
      const w = 200, h = 150;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.7);
    } catch { return null; }
  }

  private async captureMultiFrame(v: HTMLVideoElement, n: number = FRAMES_TO_CAPTURE): Promise<string[]> {
    const frames: string[] = [];
    for (let i = 0; i < n; i++) {
      this.captureProgress.set(i + 1);
      if (i > 0) await sleep(FRAME_INTERVAL_MS);
      const f = this.captureFrame(v);
      if (f) frames.push(f);
    }
    this.captureProgress.set(0);
    return frames;
  }

  /**
   * Compute pixel-level motion between consecutive frames at a low resolution.
   * Returns mean motion score (0-255 scale). Static photo: ~0-1. Real person: ~5+.
   */
  private async computeMotionScore(framesBase64: string[]): Promise<number> {
    if (framesBase64.length < 2) return 0;
    const greys: Uint8Array[] = [];
    const size = 64; // 64x64 grayscale comparison
    for (const f of framesBase64) {
      const img = new Image();
      img.src = f;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('load')); });
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const grey = new Uint8Array(size * size);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        grey[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }
      greys.push(grey);
    }
    let totalDiff = 0;
    let pairs = 0;
    for (let p = 1; p < greys.length; p++) {
      const a = greys[p - 1], b = greys[p];
      let diff = 0;
      for (let k = 0; k < a.length; k++) diff += Math.abs(a[k] - b[k]);
      totalDiff += diff / a.length;
      pairs++;
    }
    return pairs > 0 ? totalDiff / pairs : 0;
  }

  // ───────── ENROL ─────────
  public async enroll(): Promise<void> {
    const v = this.videoRef()?.nativeElement;
    const empId = this.selectedEmployeeId();
    const callerEmail = this.store.currentEmployee()?.work_email;
    if (!v || !empId) return;
    if (!callerEmail) { this.msg.add({ severity: 'error', summary: 'Sesión', detail: 'No se pudo identificar al usuario.' }); return; }
    if (!this.consentAccepted()) { this.msg.add({ severity: 'warn', summary: 'Consentimiento', detail: 'Confirmá el consentimiento.' }); return; }
    if (!this.preflightReady()) { this.msg.add({ severity: 'warn', summary: 'Calidad', detail: 'Ajustá la posición antes de capturar.' }); return; }

    this.busy.set(true);
    try {
      this.challenge.set('Preparate — 3 fotos en 2 segundos');
      for (let i = 3; i > 0; i--) { this.challenge.set(`En ${i}…`); await sleep(450); }

      this.challenge.set('Movete ligeramente entre las fotos');
      const frames = await this.captureMultiFrame(v);
      if (frames.length === 0) {
        this.msg.add({ severity: 'error', summary: 'Captura', detail: 'No se pudo capturar imagen.' });
        return;
      }

      this.challenge.set('Subiendo a CompreFace…');
      const thumbnail = this.captureThumbnailMirrored(v);
      const res: any = await firstValueFrom(this.http.post(
        this.apiUrl.build('functions/v1/face-enroll'),
        {
          caller_email: callerEmail,
          employee_id: empId,
          images: frames,
          reference_image: thumbnail,
          consent_accepted: true,
        },
      ));
      const empName = this.employees().find((e: any) => e.id === empId)?.short_name || 'empleado';
      this.msg.add({
        severity: res.templates_failed > 0 ? 'warn' : 'success',
        summary: 'Enrolado',
        detail: `${empName}: ${res.templates_uploaded}/${frames.length} templates`
          + (res.failures ? ` (fallos: ${res.failures.slice(0, 2).join('; ')})` : ''),
        life: 6000,
      });
      this.consentAccepted.set(false);
      this.loadEnrollments();
      this.refreshStats();
    } catch (e: any) {
      const body = e?.error;
      const reason = body?.error || 'No se pudo enrolar.';
      const detail = body?.detail || body?.message
        || (Array.isArray(body?.reasons) ? body.reasons.slice(0, 2).join('; ') : '');
      this.msg.add({ severity: 'error', summary: 'Error', detail: `${reason}${detail ? ' — ' + detail : ''}` });
    } finally {
      this.busy.set(false);
      this.challenge.set('');
      this.captureProgress.set(0);
    }
  }

  // ───────── VERIFY ─────────
  public async verify(): Promise<void> {
    const v = this.videoRef()?.nativeElement;
    const callerEmail = this.store.currentEmployee()?.work_email;
    if (!v) return;
    if (!callerEmail) { this.msg.add({ severity: 'error', summary: 'Sesión', detail: 'No se pudo identificar al usuario.' }); return; }
    if (!this.preflightReady()) { this.msg.add({ severity: 'warn', summary: 'Calidad', detail: 'Ajustá la posición antes de verificar.' }); return; }

    this.busy.set(true);
    this.verifyResult.set(null);

    try {
      // 1) Nonce
      let nonce: string;
      try {
        const resp: any = await firstValueFrom(this.http.post(
          this.apiUrl.build('functions/v1/face-issue-nonce'),
          { caller_email: callerEmail, kiosk_id: null },
        ));
        nonce = resp.nonce;
        if (!nonce) throw new Error('no_nonce');
      } catch (e: any) {
        this.msg.add({ severity: 'warn', summary: 'Nonce', detail: e?.error?.error || 'nonce_failed' });
        return;
      }

      // 2) Capturar 3 frames
      this.challenge.set('Mirá a la cámara');
      await sleep(300);
      const frames = await this.captureMultiFrame(v);
      if (frames.length < 2) {
        this.verifyResult.set({ result: 'no_face', name: null, similarity: null, margin: null });
        return;
      }

      // 3) Compute motion score on client (anti-photo signal)
      const motionScore = await this.computeMotionScore(frames);

      // 4) Server
      this.challenge.set('Verificando…');
      const res: any = await firstValueFrom(this.http.post(
        this.apiUrl.build('functions/v1/face-verify'),
        {
          caller_email: callerEmail,
          nonce, images: frames,
          motion_score: motionScore,
          kiosk_id: null, branch_id: null,
          captured_at: new Date().toISOString(),
        },
      ));

      const empName = res.matched_employee_id
        ? (this.employees().find((e: any) => e.id === res.matched_employee_id)?.short_name || null)
        : null;
      this.verifyResult.set({
        result: res.result,
        name: empName,
        similarity: res.similarity ?? null,
        margin: res.margin ?? null,
        metrics: res.metrics,
      });
      if (res.result === 'matched') {
        this.consecutiveFailures.set(0);
      } else {
        this.consecutiveFailures.update(n => n + 1);
      }
      this.refreshStats();
    } catch (e: any) {
      const body = e?.error;
      const status = e?.status;
      const reason = body?.result || body?.error || 'error';
      this.verifyResult.set({
        result: status === 429 ? 'rate_limited' : String(reason),
        name: null, similarity: null, margin: null,
        metrics: body?.metrics,
      });
    } finally {
      this.busy.set(false);
      this.challenge.set('');
      this.captureProgress.set(0);
    }
  }

  ngOnDestroy(): void {
    if (this.preflightHandle) clearInterval(this.preflightHandle);
    if (this.statsHandle) clearInterval(this.statsHandle);
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.resizeListener);
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
