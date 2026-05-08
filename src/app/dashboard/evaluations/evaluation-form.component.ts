import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { DashboardStore } from '../../stores/dashboard.store';
import {
  EmployeeEvaluation,
  EvaluationResponse,
  EvaluationSection,
  EvaluationType,
  VERDICT_OPTIONS,
} from './evaluations.models';

@Component({
  selector: 'pt-evaluation-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    Select,
    DatePicker,
    InputText,
    Textarea,
    ToastModule,
    DatePipe,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    .doc-page { max-width: 920px; margin: 0 auto; padding: 1.5rem; color: #e5e5e5; }
    /* Mobile: rediseño completo de cards, ratings y secciones */
    @media (max-width: 768px) {
      .doc-page { padding: 0.85rem 0.85rem 9rem; }

      /* Ocultar header branded en mobile - ya está en el header de la app */
      .doc-header { display: none; }

      /* Mostrar mini-header compacto con info esencial */
      .mobile-mini-header { display: block !important; }

      /* Secciones más compactas */
      .doc-section { padding: 0.85rem 0.75rem; border-radius: 0.6rem; margin-bottom: 0.6rem; }
      .section-header { padding-bottom: 0.5rem; margin-bottom: 0.6rem; gap: 0.5rem; }
      .section-roman { width: 1.5rem; height: 1.5rem; font-size: 0.7rem; }
      .section-title { font-size: 0.95rem; line-height: 1.2; }
      .section-desc { font-size: 0.7rem; margin-top: 0.15rem; }

      /* Info grid: 1 columna en mobile */
      .info-grid { grid-template-columns: 1fr; gap: 0.6rem; }
      .info-field label { font-size: 0.65rem; }

      /* Question card: layout vertical claro */
      .question-card { padding: 0.75rem; margin-bottom: 0.6rem; border-radius: 0.6rem; }
      .question-head { gap: 0.6rem; margin-bottom: 0.6rem; }
      .question-icon {
        width: 2rem; height: 2rem; border-radius: 0.4rem;
        background: rgba(245,158,11,0.1); display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .question-icon i { font-size: 0.95rem; color: #f59e0b; }
      .valor-badge { font-size: 0.6rem; padding: 0.05rem 0.4rem; }
      .question-name { font-size: 0.88rem; line-height: 1.25; }
      .question-desc { font-size: 0.7rem; line-height: 1.45; margin-top: 0.2rem; }

      /* Rating buttons: stack en grid 2x2 o 1 columna para que sean grandes */
      .rating-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.25rem; }
      .rating-option {
        padding: 0.55rem 0.15rem; min-height: 3rem;
        flex-direction: column; gap: 0.1rem;
      }
      .rating-num { font-size: 1.1rem; }
      .rating-text { font-size: 0.55rem; line-height: 1; text-align: center; word-break: break-word; }

      /* Yes/No: stacked grandes */
      .yn-row { flex-direction: column; gap: 0.5rem; }
      .yn-option { font-size: 0.9rem; padding: 0.85rem; min-height: 2.75rem; justify-content: center; }

      /* Comentario más pequeño */
      .comment-input { font-size: 0.8rem; padding: 0.45rem 0.6rem; min-height: 2rem; }

      /* Summary 2x2 compacto */
      .summary-grid { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
      .summary-cell { padding: 0.65rem 0.5rem; }
      .summary-value { font-size: 1.3rem; }
      .summary-label { font-size: 0.6rem; }

      /* Final score block sticky abajo del header en mobile */
      .final-score-block { padding: 0.85rem; gap: 0.85rem; flex-direction: row; }
      .final-score-num { font-size: 2.2rem; }
      .final-score-label { font-size: 0.95rem; }
      .final-score-pct { font-size: 0.65rem; margin-top: 0.15rem; }

      /* Firmas en una columna */
      .signature-grid { grid-template-columns: 1fr; gap: 0.85rem; }
      .signature-input { font-size: 1.05rem; }

      /* Conclusion fields */
      .conclusion-field label { font-size: 0.75rem; }
      .conclusion-field textarea { font-size: 0.85rem; padding: 0.55rem; min-height: 3.5rem; }

      /* Scale legend más compacto y vertical */
      .scale-legend {
        font-size: 0.65rem; padding: 0.5rem 0.6rem; line-height: 1.5;
      }
      .scale-legend span { display: block; margin-left: 0 !important; padding: 0.05rem 0; }

      /* Footer */
      .doc-footer { font-size: 0.6rem; padding: 0.75rem 0; }

      /* Action bar fija abajo: principal completa + secundarios chicos */
      .actions-bar {
        position: fixed; bottom: 0; left: 0; right: 0;
        margin: 0; border-radius: 0;
        border-bottom: 0; border-left: 0; border-right: 0;
        border-top: 1px solid #262626;
        padding: 0.75rem 1rem 0.85rem;
        flex-direction: column; gap: 0.5rem;
        background: rgba(10, 10, 10, 0.98);
        backdrop-filter: blur(12px);
      }
      /* Botón principal full-width grande */
      .actions-bar ::ng-deep .p-button {
        width: 100%; font-size: 0.95rem;
        padding: 0.85rem 1rem; min-height: 3rem;
      }
      .actions-bar ::ng-deep .p-button-label { font-size: 0.95rem; font-weight: 600; }
      /* Auto-save status pill */
      .autosave-pill {
        position: fixed; top: 0.6rem; right: 0.6rem;
        background: rgba(0, 0, 0, 0.85);
        border: 1px solid #262626;
        border-radius: 1rem; padding: 0.3rem 0.65rem;
        font-size: 0.65rem; color: #a3a3a3;
        display: flex; align-items: center; gap: 0.3rem;
        z-index: 50;
      }
      .autosave-pill.saving { color: #fbbf24; border-color: rgba(245,158,11,0.3); }
      .autosave-pill.saved { color: #4ade80; border-color: rgba(45,106,79,0.3); }
    }
    /* Pill desktop: top-right de la página */
    @media (min-width: 769px) {
      .autosave-pill {
        margin-left: auto;
        background: rgba(38, 38, 38, 0.5);
        border: 1px solid #262626;
        border-radius: 1rem; padding: 0.3rem 0.7rem;
        font-size: 0.7rem; color: #a3a3a3;
        display: inline-flex; align-items: center; gap: 0.3rem;
      }
      .autosave-pill.saving { color: #fbbf24; }
      .autosave-pill.saved { color: #4ade80; }
    }

    /* Dispositivos muy chicos */
    @media (max-width: 380px) {
      .rating-row { grid-template-columns: repeat(5, 1fr); }
      .rating-text { font-size: 0.5rem; }
      .summary-grid { grid-template-columns: 1fr 1fr; }
    }
    @media print {
      @page { size: letter; margin: 1.2cm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print, .actions-bar, .p-toast, .p-confirm-dialog, .p-overlay, p-button, .p-component-overlay { display: none !important; }
      html, body { background: #fff !important; color: #1a1a1a !important; font-family: 'Inter', system-ui, sans-serif; }
      .doc-page { max-width: none; padding: 0; margin: 0; color: #1a1a1a !important; }
      .doc-header {
        background: #fff !important; border: none !important; border-top: 4px solid #d97706 !important;
        border-bottom: 1px solid #e5e5e5 !important; border-radius: 0 !important;
        padding: 1rem 0 1.25rem !important; margin-bottom: 0.75rem !important;
        page-break-after: avoid;
      }
      .doc-header::before { display: none !important; }
      .doc-brand { color: #d97706 !important; font-size: 0.65rem !important; }
      .doc-title { color: #1a1a1a !important; font-size: 1.5rem !important; }
      .doc-subtitle { color: #404040 !important; font-size: 1.1rem !important; }
      .doc-confidential { color: #737373 !important; font-size: 0.65rem !important; }
      .doc-section {
        background: #fff !important; border: 1px solid #e5e5e5 !important;
        border-radius: 0.5rem !important; padding: 1rem !important;
        margin-bottom: 0.75rem !important; box-shadow: none !important;
        page-break-inside: avoid; color: #1a1a1a !important;
      }
      .section-header { border-bottom: 1px solid #e5e5e5 !important; padding-bottom: 0.5rem !important; margin-bottom: 0.75rem !important; }
      .section-roman { background: #d97706 !important; color: #fff !important; }
      .section-title { color: #1a1a1a !important; font-size: 1rem !important; }
      .section-desc { color: #525252 !important; }
      .info-field label { color: #525252 !important; }
      .info-field input, .info-field .p-select-label, .info-field .p-datepicker input,
      .signature-input, input, textarea {
        background: transparent !important; color: #1a1a1a !important;
        border: none !important; border-bottom: 1px solid #d4d4d4 !important;
        border-radius: 0 !important; padding: 0.25rem 0 !important;
      }
      .scale-legend { background: #f9fafb !important; border: 1px solid #e5e5e5 !important; color: #404040 !important; font-size: 0.7rem !important; }
      .scale-legend strong { color: #1a1a1a !important; }
      .question-card {
        background: #fff !important; border: 1px solid #e5e5e5 !important;
        page-break-inside: avoid; padding: 0.65rem !important; margin-bottom: 0.4rem !important;
      }
      .question-icon { color: #d97706 !important; font-size: 1.1rem !important; }
      .valor-badge { color: #d97706 !important; background: #fff7ed !important; border: 1px solid #fed7aa !important; }
      .question-name { color: #1a1a1a !important; font-size: 0.85rem !important; }
      .question-desc { color: #525252 !important; font-size: 0.7rem !important; }
      .rating-row { gap: 0.25rem !important; }
      .rating-option {
        background: #fff !important; border: 1px solid #d4d4d4 !important;
        padding: 0.35rem 0.2rem !important;
      }
      .rating-option.sel {
        background: #fffbeb !important; border-width: 2px !important;
      }
      .rating-num { font-size: 1rem !important; }
      .rating-text { color: #525252 !important; font-size: 0.6rem !important; }
      .comment-input { background: transparent !important; border: 1px solid #e5e5e5 !important; color: #1a1a1a !important; padding: 0.3rem !important; font-size: 0.75rem !important; }
      .yn-option { background: #fff !important; border: 1px solid #d4d4d4 !important; color: #404040 !important; padding: 0.5rem !important; }
      .yn-option.sel-yes { background: #ecfdf5 !important; border-color: #2D6A4F !important; color: #2D6A4F !important; }
      .yn-option.sel-no { background: #fef2f2 !important; border-color: #A32D2D !important; color: #A32D2D !important; }
      .summary-cell {
        background: #fff !important; border: 1px solid #e5e5e5 !important;
      }
      .summary-value { color: #d97706 !important; font-size: 1.4rem !important; }
      .summary-label { color: #525252 !important; }
      .final-score-block {
        background: #fffbeb !important; border: 2px solid var(--accent, #d97706) !important;
        page-break-inside: avoid;
      }
      .final-score-num { color: var(--accent, #d97706) !important; font-size: 3rem !important; }
      .final-score-pct { color: #525252 !important; }
      .progress-bar-bg { background: #e5e5e5 !important; }
      .progress-bar-fill { background: #d97706 !important; }
      .signature-input {
        font-style: italic !important; font-family: 'Brush Script MT', cursive !important;
        font-size: 1.1rem !important; border-bottom: 1px solid #525252 !important;
      }
      .doc-footer { color: #737373 !important; font-size: 0.6rem !important; padding-top: 0.5rem !important; border-top: 1px solid #e5e5e5 !important; }
      .conclusion-field textarea { min-height: auto !important; }
    }
    .doc-header {
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 1rem; padding: 2rem; margin-bottom: 1rem;
      text-align: center; position: relative; overflow: hidden;
    }
    .doc-header::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #2D6A4F, #C8860A, #E08C00, #A32D2D);
    }
    .doc-brand { font-size: 0.7rem; letter-spacing: 0.3rem; color: #f59e0b; font-weight: 700; margin-bottom: 0.5rem; }
    .doc-title { font-size: 1.6rem; font-weight: 700; color: white; margin-bottom: 0.3rem; }
    .doc-subtitle { font-size: 1.1rem; color: #d4d4d4; margin-bottom: 0.5rem; }
    .doc-confidential { font-size: 0.7rem; color: #737373; letter-spacing: 0.1rem; text-transform: uppercase; }
    .doc-section {
      background: #171717; border: 1px solid #262626; border-radius: 0.75rem;
      padding: 1.5rem; margin-bottom: 1rem;
    }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .info-field label {
      display: block; font-size: 0.7rem; color: #737373; text-transform: uppercase;
      letter-spacing: 0.05rem; margin-bottom: 0.3rem; font-weight: 600;
    }
    .info-field input, .info-field .p-select, .info-field .p-datepicker {
      width: 100%; background: #0a0a0a; border: 1px solid #262626; color: white;
    }
    .section-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #262626; }
    .section-roman {
      width: 2rem; height: 2rem; border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #000; font-weight: 800; font-size: 0.9rem;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .section-title { font-size: 1.1rem; font-weight: 700; color: white; }
    .section-desc { font-size: 0.8rem; color: #a3a3a3; margin-top: 0.2rem; }
    .scale-legend {
      background: rgba(38, 38, 38, 0.4); border: 1px solid #262626;
      padding: 0.6rem 0.8rem; border-radius: 0.5rem; font-size: 0.75rem;
      margin-bottom: 0.85rem; color: #a3a3a3;
    }
    .scale-legend strong { color: white; }
    .question-card {
      background: rgba(23, 23, 23, 0.6); border: 1px solid #262626;
      border-radius: 0.6rem; padding: 1rem; margin-bottom: 0.75rem;
    }
    .question-card:hover { border-color: #404040; }
    .question-head { display: flex; gap: 0.85rem; margin-bottom: 0.75rem; }
    .question-icon { font-size: 1.6rem; flex-shrink: 0; line-height: 1; }
    .valor-badge {
      display: inline-block; font-size: 0.65rem; color: #fbbf24;
      background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 0.1rem 0.5rem; border-radius: 0.25rem; margin-bottom: 0.3rem;
      font-weight: 600;
    }
    .question-name { font-weight: 600; color: white; font-size: 0.95rem; }
    .question-desc { font-size: 0.78rem; color: #a3a3a3; margin-top: 0.25rem; line-height: 1.5; }
    .rating-row { display: flex; gap: 0.5rem; }
    .rating-option {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 0.65rem 0.4rem; border-radius: 0.5rem;
      background: rgba(38, 38, 38, 0.5);
      border: 1px solid rgba(82, 82, 82, 0.4);
      cursor: pointer; transition: all 0.15s ease;
    }
    .rating-option:hover { background: rgba(64, 64, 64, 0.6); transform: translateY(-1px); }
    .rating-option.sel { background: rgba(15, 15, 15, 0.95); border-width: 2px; }
    .rating-num { font-size: 1.4rem; font-weight: 800; line-height: 1; }
    .rating-text { font-size: 0.7rem; color: #a3a3a3; margin-top: 0.2rem; }
    .comment-input {
      width: 100%; margin-top: 0.6rem; padding: 0.5rem 0.75rem;
      background: rgba(10, 10, 10, 0.6); border: 1px solid #262626;
      border-radius: 0.4rem; color: white; font-size: 0.85rem; resize: vertical; min-height: 2rem;
    }
    .yn-row { display: flex; gap: 0.6rem; margin-top: 0.5rem; }
    .yn-option {
      flex: 1; padding: 0.85rem 1rem; border-radius: 0.5rem;
      border: 1px solid rgba(82, 82, 82, 0.4); cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      background: rgba(38, 38, 38, 0.5); transition: all 0.15s;
      font-weight: 600; font-size: 0.9rem;
    }
    .yn-option:hover { background: rgba(64, 64, 64, 0.6); }
    .yn-option.sel-yes { background: rgba(45, 106, 79, 0.25); border-color: #2D6A4F; color: #4ade80; }
    .yn-option.sel-no { background: rgba(163, 45, 45, 0.25); border-color: #A32D2D; color: #f87171; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; }
    .summary-cell {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02));
      border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 0.6rem;
      padding: 1rem; text-align: center;
    }
    .summary-value { font-size: 1.8rem; font-weight: 800; color: #fbbf24; line-height: 1; }
    .summary-label { font-size: 0.7rem; color: #a3a3a3; margin-top: 0.4rem; text-transform: uppercase; letter-spacing: 0.05rem; }
    .progress-bar-bg { height: 0.5rem; background: #262626; border-radius: 1rem; overflow: hidden; margin-top: 0.5rem; }

    /* Mobile mini-header (compacto, solo info esencial) */
    .mobile-mini-header {
      display: none;
      background: linear-gradient(135deg, #171717, #0a0a0a);
      border: 1px solid #262626; border-radius: 0.75rem;
      padding: 0.85rem 1rem; margin-bottom: 0.6rem;
    }
    .mobile-mini-header .mh-name { font-size: 1.1rem; font-weight: 700; color: white; line-height: 1.2; }
    .mobile-mini-header .mh-meta {
      display: flex; flex-wrap: wrap; gap: 0.35rem 0.85rem; margin-top: 0.4rem;
      font-size: 0.72rem; color: #a3a3a3;
    }
    .mobile-mini-header .mh-meta i { margin-right: 0.2rem; color: #f59e0b; }
    .mobile-mini-header .mh-type {
      display: inline-block; font-size: 0.6rem; color: #f59e0b;
      background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3);
      padding: 0.1rem 0.5rem; border-radius: 0.25rem; margin-bottom: 0.3rem;
      letter-spacing: 0.05rem; font-weight: 600; text-transform: uppercase;
    }

    /* Ocultar el bloque grande de Header Info en mobile, mostrar el compacto */
    @media (max-width: 768px) {
      .desktop-info-grid { display: none !important; }
      .mobile-meta-edit { display: block !important; }
    }
    @media (min-width: 769px) {
      .mobile-meta-edit { display: none !important; }
    }
    .final-score-block {
      display: flex; align-items: center; gap: 1.5rem;
      background: linear-gradient(135deg, rgba(0,0,0,0.4), rgba(255,255,255,0.02));
      border: 2px solid var(--accent, #f59e0b);
      border-radius: 0.75rem; padding: 1.25rem 1.5rem; margin-bottom: 1rem;
    }
    .final-score-num {
      font-size: 3.5rem; font-weight: 800; line-height: 1;
      color: var(--accent, #f59e0b); flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }
    .final-score-info { flex: 1; }
    .final-score-label { font-size: 1.3rem; font-weight: 700; }
    .final-score-pct { font-size: 0.8rem; color: #a3a3a3; margin-top: 0.3rem; letter-spacing: 0.03rem; }
    @media (max-width: 640px) {
      .final-score-block { padding: 1rem; gap: 1rem; }
      .final-score-num { font-size: 2.5rem; }
      .final-score-label { font-size: 1rem; }
      .final-score-pct { font-size: 0.7rem; }
    }
    .progress-bar-fill {
      height: 100%; background: linear-gradient(90deg, #f59e0b, #d97706);
      transition: width 0.3s ease;
    }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 0.5rem; }
    .signature-field label {
      display: block; font-size: 0.75rem; color: #a3a3a3; margin-bottom: 0.3rem;
      text-transform: uppercase; letter-spacing: 0.05rem; font-weight: 600;
    }
    .signature-input {
      width: 100%; padding: 0.7rem 0.85rem;
      background: #0a0a0a; border: 1px solid #404040;
      border-radius: 0.4rem; color: white; font-size: 0.95rem;
      font-style: italic; font-family: 'Brush Script MT', cursive, sans-serif;
    }
    .signature-input::placeholder { color: #525252; font-style: normal; }
    .doc-footer {
      text-align: center; font-size: 0.7rem; color: #525252;
      letter-spacing: 0.1rem; margin-top: 1.5rem; padding-top: 1rem;
      border-top: 1px solid #262626; text-transform: uppercase;
    }
    .conclusion-field { margin-top: 0.85rem; }
    .conclusion-field label { display: block; font-size: 0.8rem; color: #d4d4d4; margin-bottom: 0.3rem; font-weight: 600; }
    .conclusion-field textarea {
      width: 100%; background: rgba(10, 10, 10, 0.6); border: 1px solid #262626;
      border-radius: 0.4rem; padding: 0.6rem 0.75rem; color: white; font-size: 0.85rem;
      min-height: 4rem; resize: vertical;
    }
    .actions-bar {
      position: sticky; bottom: 0; z-index: 10;
      background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(8px);
      padding: 0.85rem; border-radius: 0.75rem; border: 1px solid #262626;
      display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;
      margin-top: 1rem;
    }
  `],
  template: `
    <p-toast />
    <div class="doc-page">
      <div class="flex items-center justify-between mb-3 gap-2">
        <p-button icon="pi pi-arrow-left" label="Volver" [text]="true" size="small" (onClick)="back()" />
        @if (autosaveState() !== 'idle' && !isReadOnly()) {
          <div class="autosave-pill" [class.saving]="autosaveState() === 'saving' || autosaveState() === 'pending'" [class.saved]="autosaveState() === 'saved'">
            @switch (autosaveState()) {
              @case ('pending') { <i class="pi pi-clock"></i> Cambios pendientes… }
              @case ('saving') { <i class="pi pi-spin pi-spinner"></i> Guardando borrador… }
              @case ('saved') { <i class="pi pi-check"></i> Borrador guardado }
            }
          </div>
        }
        <div class="text-xs text-gray-500">{{ isNew() ? 'Nueva evaluación' : 'Editar evaluación' }}</div>
      </div>

      <!-- Document Header (BlackDog branded) -->
      <div class="doc-header">
        <div class="doc-brand">BLACKDOG</div>
        <div class="doc-title">Evaluación de Desempeño</div>
        <div class="doc-subtitle">{{ currentType()?.name || 'Selecciona el tipo' }}</div>
        <div class="doc-confidential">Evaluación confidencial · Uso interno</div>
      </div>

      <!-- Type & Employee selectors (only when new) -->
      @if (isNew()) {
      <div class="doc-section">
        <div class="info-grid">
          <div class="info-field">
            <label>Tipo de evaluación *</label>
            <p-select
              [options]="typeOptions()"
              [(ngModel)]="selectedTypeId"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar tipo…"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div class="info-field">
            <label>Colaborador *</label>
            <p-select
              [options]="employeeOptions()"
              [(ngModel)]="selectedEmployeeId"
              optionLabel="label"
              optionValue="value"
              [filter]="true"
              filterBy="label"
              placeholder="Buscar empleado…"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
        </div>
      </div>
      }

      <!-- Header Info -->
      @if (currentType()) {
      <!-- Mobile mini-header: compacto con info esencial -->
      <div class="mobile-mini-header">
        <div class="mh-type">{{ currentType()!.name }}</div>
        <div class="mh-name">{{ selectedEmployeeName() || 'Sin colaborador' }}</div>
        <div class="mh-meta">
          @if (selectedEmployeeBranch()) {
            <span><i class="pi pi-map-marker"></i>{{ selectedEmployeeBranch() }}</span>
          }
          @if (periodLabel()) {
            <span><i class="pi pi-calendar"></i>{{ periodLabel() }}</span>
          }
          @if (evaluatorName()) {
            <span><i class="pi pi-user"></i>{{ evaluatorName() }}</span>
          }
        </div>
      </div>

      <!-- Desktop: form con todos los campos editables -->
      <div class="doc-section desktop-info-grid">
        <div class="info-grid">
          <div class="info-field">
            <label>Nombre del colaborador</label>
            <input pInputText readonly [value]="selectedEmployeeName()" placeholder="Selecciona empleado" class="w-full" />
          </div>
          <div class="info-field">
            <label>Tienda / Sede</label>
            <input pInputText readonly [value]="selectedEmployeeBranch()" placeholder="—" class="w-full" />
          </div>
          <div class="info-field">
            <label>Período evaluado</label>
            <input pInputText [(ngModel)]="periodLabel" placeholder="Ej. Ene – Jun 2026" class="w-full" />
          </div>
          <div class="info-field">
            <label>Fecha de evaluación</label>
            <p-datepicker [(ngModel)]="evaluationDate" dateFormat="dd/mm/yy" [showIcon]="true" styleClass="w-full" appendTo="body" />
          </div>
          <div class="info-field">
            <label>Evaluado por *</label>
            <p-select
              [options]="evaluatorOptions()"
              [(ngModel)]="selectedEvaluatorId"
              (onChange)="onEvaluatorChange($event)"
              optionLabel="name"
              optionValue="value"
              [filter]="true"
              filterBy="name"
              placeholder="Seleccionar evaluador (Administración)"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div class="info-field">
            <label>Cargo del evaluador</label>
            <input pInputText readonly [value]="evaluatorPosition()" placeholder="Se llena automáticamente" class="w-full" />
          </div>
        </div>
      </div>

      <!-- Mobile: botón compacto para abrir/editar metadata -->
      <div class="doc-section mobile-meta-edit md:hidden" style="display:none">
        <p-button
          label="Editar período / evaluador"
          icon="pi pi-pencil"
          [text]="true"
          size="small"
          (onClick)="showMobileMeta.set(!showMobileMeta())"
          styleClass="w-full"
        />
        @if (showMobileMeta()) {
        <div class="info-grid mt-3">
          <div class="info-field">
            <label>Período evaluado</label>
            <input pInputText [(ngModel)]="periodLabel" placeholder="Ej. Ene – Jun 2026" class="w-full" />
          </div>
          <div class="info-field">
            <label>Fecha de evaluación</label>
            <p-datepicker [(ngModel)]="evaluationDate" dateFormat="dd/mm/yy" [showIcon]="true" styleClass="w-full" appendTo="body" />
          </div>
          <div class="info-field">
            <label>Evaluado por *</label>
            <p-select
              [options]="evaluatorOptions()"
              [(ngModel)]="selectedEvaluatorId"
              (onChange)="onEvaluatorChange($event)"
              optionLabel="name"
              optionValue="value"
              [filter]="true"
              filterBy="name"
              placeholder="Seleccionar"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
        </div>
        }
      </div>

      <!-- Sections -->
      @for (section of (currentType()!.sections || []); track section.id; let secIdx = $index) {
      <div class="doc-section">
        <div class="section-header">
          <div class="section-roman">{{ romanNumeral(secIdx + 1) }}</div>
          <div>
            <div class="section-title">{{ section.name }}</div>
            @if (section.description) {
            <div class="section-desc">{{ section.description }}</div>
            }
          </div>
        </div>

        @if (section.question_type === 'rating' && currentType()) {
        <div class="scale-legend">
          <strong>Escala de desempeño:</strong>
          @for (lbl of currentType()!.rating_labels; track $index) {
            <span class="ml-2">
              <span class="font-bold" [style.color]="currentType()!.rating_colors[$index]">{{ $index + 1 }}</span> – {{ lbl }}
            </span>
          }
        </div>
        } @else if (section.question_type === 'yes_no') {
        <div class="scale-legend"><strong>Sí / No</strong></div>
        }

        @for (q of (section.questions || []); track q.id) {
        <div class="question-card">
          <div class="question-head">
            <div class="question-icon"><i [class]="q.icon || 'pi pi-circle-fill'"></i></div>
            <div class="flex-1 min-w-0">
              @if (q.valor_label) {
                <div class="valor-badge">Valor · {{ q.valor_label }}</div>
              }
              <div class="question-name">{{ q.name }}</div>
              <div class="question-desc">{{ q.description }}</div>
            </div>
          </div>

          @if (section.question_type === 'rating' && currentType()) {
          <div class="rating-row">
            @for (lbl of currentType()!.rating_labels; track $index; let ri = $index) {
              <div
                class="rating-option"
                [class.sel]="getResponse(q.id).rating === ri + 1"
                [style.border-color]="getResponse(q.id).rating === ri + 1 ? currentType()!.rating_colors[ri] : ''"
                (click)="setRating(q.id, ri + 1)"
              >
                <div class="rating-num" [style.color]="currentType()!.rating_colors[ri]">{{ ri + 1 }}</div>
                <div class="rating-text">{{ lbl }}</div>
              </div>
            }
          </div>
          <textarea
            class="comment-input"
            rows="1"
            placeholder="Comentarios opcionales…"
            [ngModel]="getResponse(q.id).comment || ''"
            (ngModelChange)="setComment(q.id, $event)"
          ></textarea>
          } @else if (section.question_type === 'yes_no') {
          <div class="yn-row">
            <div
              class="yn-option"
              [class.sel-yes]="getResponse(q.id).yes_no === true"
              (click)="setYesNo(q.id, true)"
            >
              <i class="pi pi-check"></i> Sí — Cumple
            </div>
            <div
              class="yn-option"
              [class.sel-no]="getResponse(q.id).yes_no === false"
              (click)="setYesNo(q.id, false)"
            >
              <i class="pi pi-times"></i> No — No cumple
            </div>
          </div>
          } @else if (section.question_type === 'text') {
          <textarea
            class="comment-input"
            rows="3"
            placeholder="Escribe la respuesta…"
            [ngModel]="getResponse(q.id).text_response || ''"
            (ngModelChange)="setText(q.id, $event)"
          ></textarea>
          }
        </div>
        }
      </div>
      }

      <!-- Resumen + Score Final -->
      <div class="doc-section final-summary">
        <div class="section-header">
          <div class="section-title" style="margin-left: 0;">Resumen de Evaluación</div>
        </div>

        @if (finalScore() != null && finalLabel(); as lbl) {
        <div class="final-score-block" [style.--accent]="lbl.color">
          <div class="final-score-num">{{ finalScore() }}</div>
          <div class="final-score-info">
            <div class="final-score-label" [style.color]="lbl.color">{{ lbl.text }}</div>
            <div class="final-score-pct">{{ finalScorePct() }}%  ·  Score final ponderado</div>
          </div>
        </div>
        }

        <div class="summary-grid">
          <div class="summary-cell">
            <div class="summary-value">{{ valuesAvg() ?? '—' }}</div>
            <div class="summary-label">Prom. Valores</div>
          </div>
          <div class="summary-cell">
            <div class="summary-value">{{ competenciesAvg() ?? '—' }}</div>
            <div class="summary-label">Prom. Competencias</div>
          </div>
          <div class="summary-cell">
            <div class="summary-value">{{ suitabilityCount() || '—' }}</div>
            <div class="summary-label">Aprobados Idoneidad</div>
          </div>
          <div class="summary-cell">
            <div class="summary-value">{{ progressDone() }}/{{ totalQuestions() }}</div>
            <div class="summary-label">Criterios evaluados</div>
          </div>
        </div>
        <div class="mt-3">
          <div class="flex justify-between text-xs mb-1 text-gray-400">
            <span>Progreso</span><span>{{ progressPct() }}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" [style.width.%]="progressPct()"></div>
          </div>
        </div>
      </div>

      <!-- Conclusiones -->
      <div class="doc-section">
        <div class="section-header">
          <div class="section-roman">IV</div>
          <div>
            <div class="section-title">Conclusiones y Plan de Acción</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-field">
            <label>Veredicto general</label>
            <p-select
              [options]="verdictOptions"
              [(ngModel)]="verdict"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar…"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div class="info-field">
            <label>Próxima revisión</label>
            <p-datepicker [(ngModel)]="nextReviewDate" dateFormat="dd/mm/yy" [showIcon]="true" styleClass="w-full" appendTo="body" />
          </div>
        </div>

        <div class="conclusion-field">
          <label>Fortalezas destacadas</label>
          <textarea [(ngModel)]="strengths" rows="3" placeholder="Describe las áreas donde el colaborador sobresale…"></textarea>
        </div>
        <div class="conclusion-field">
          <label>Áreas de mejora y compromisos</label>
          <textarea [(ngModel)]="areasToImprove" rows="3" placeholder="Detalla los aspectos a desarrollar y las acciones concretas acordadas…"></textarea>
        </div>
        <div class="conclusion-field">
          <label>Comentarios del colaborador</label>
          <textarea [(ngModel)]="employeeComments" rows="3" placeholder="Espacio para que el colaborador exprese su perspectiva sobre la evaluación…"></textarea>
        </div>
      </div>

      <!-- Firmas -->
      <div class="doc-section">
        <div class="section-header">
          <div class="section-title" style="margin-left: 0;">Firmas</div>
        </div>
        <div class="signature-grid">
          <div class="signature-field">
            <label>Firma del evaluador</label>
            <input pInputText [(ngModel)]="evaluatorSignature" placeholder="Nombre y firma" class="signature-input" />
          </div>
          <div class="signature-field">
            <label>Firma del colaborador</label>
            <input pInputText [(ngModel)]="employeeSignature" placeholder="Nombre y firma" class="signature-input" />
          </div>
        </div>
      </div>

      <div class="doc-footer">Documento confidencial · BlackDog Panamá</div>

      <div class="actions-bar no-print">
        @if (!isReadOnly()) {
          <p-button
            [label]="progressPct() === 100 ? 'Marcar como completada' : 'Continuar — ' + progressPct() + '% completado'"
            [icon]="progressPct() === 100 ? 'pi pi-check' : 'pi pi-save'"
            [severity]="progressPct() === 100 ? 'success' : 'info'"
            [loading]="saving()"
            [disabled]="progressPct() < 100"
            (onClick)="save('completed')"
          />
          <div class="flex gap-2 w-full">
            <p-button label="Volver" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" (onClick)="back()" styleClass="flex-1" />
            <p-button label="Guardar borrador" icon="pi pi-save" severity="info" [text]="true" [loading]="saving()" (onClick)="save('draft')" styleClass="flex-1" />
          </div>
        } @else {
          <div class="flex gap-2 w-full">
            <p-button label="Volver" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" (onClick)="back()" styleClass="flex-1" />
            @if (!isNew()) {
              <p-button label="Imprimir / PDF" icon="pi pi-print" severity="info" [outlined]="true" (onClick)="generateSummary()" styleClass="flex-1" />
            }
          </div>
        }
      </div>
      } @else if (loadingType()) {
      <div class="doc-section">
        <div class="flex items-center gap-2 text-gray-400 p-4">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando plantilla…</span>
        </div>
      </div>
      }
    </div>
  `,
})
export class EvaluationFormComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private message = inject(MessageService);
  private orgService = inject(OrganizationService);
  private dashboardStore = inject(DashboardStore);

  public verdictOptions = VERDICT_OPTIONS;

  public id = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  public isNew = computed(() => this.id() === null);

  // Form state
  public selectedTypeId = signal<string | null>(null);
  public selectedEmployeeId = signal<string | null>(null);
  public periodLabel = signal<string>('');
  public evaluationDate = signal<Date>(new Date());
  public evaluatorName = signal<string>('');
  public evaluatorPosition = signal<string>('');
  public verdict = signal<string | null>(null);
  public nextReviewDate = signal<Date | null>(null);
  public strengths = signal<string>('');
  public areasToImprove = signal<string>('');
  public employeeComments = signal<string>('');
  public evaluatorSignature = signal<string>('');
  public employeeSignature = signal<string>('');
  public selectedEvaluatorId = signal<string | null>(null);
  public responses = signal<Map<string, EvaluationResponse>>(new Map());

  public currentStatus = signal<'draft' | 'completed' | 'archived'>('draft');
  public isPrintMode = signal<boolean>(this.route.snapshot.queryParamMap.get('print') === '1');
  public isReadOnly = computed(() => this.currentStatus() === 'completed' || this.isPrintMode());
  public showMobileMeta = signal<boolean>(false);
  public autosaveState = signal<'idle' | 'pending' | 'saving' | 'saved'>('idle');
  private autosaveTimer: any = null;
  private hasUserInteracted = false;

  public saving = signal(false);

  // Resources
  public typesResource = httpResource<EvaluationType[]>(() => ({
    url: this.apiUrl.build('rest/v1/evaluation_types', {
      select: 'id,name,description,rating_scale,rating_labels,rating_colors,is_active,target_position_ids',
      is_active: 'eq.true',
      order: 'name.asc',
    }),
  }));

  public typeDetailResource = httpResource<EvaluationType[]>(() => {
    const tid = this.selectedTypeId();
    if (!tid) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/evaluation_types', {
        select:
          'id,name,description,rating_scale,rating_labels,rating_colors,sections:evaluation_sections(id,name,description,question_type,sort_order,questions:evaluation_questions(id,name,description,icon,valor_label,sort_order))',
        id: `eq.${tid}`,
      }),
    };
  });

  public existingEvalResource = httpResource<any[]>(() => {
    const id = this.id();
    if (!id) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/employee_evaluations', {
        select:
          'id,employee_id,evaluation_type_id,evaluator_id,evaluator_name,evaluator_position,period_label,evaluation_date,verdict,next_review_date,strengths,areas_to_improve,employee_comments,status,responses:evaluation_responses(id,question_id,rating,yes_no,text_response,comment)',
        id: `eq.${id}`,
      }),
    };
  });

  public loadingType = computed(() => this.typeDetailResource.isLoading());

  public currentType = computed<EvaluationType | null>(() => {
    const arr = this.typeDetailResource.value();
    if (!arr || arr.length === 0) return null;
    const t = arr[0];
    if (t.sections) {
      t.sections = t.sections
        .map((s) => ({
          ...s,
          questions: (s.questions || []).slice().sort((a, b) => a.sort_order - b.sort_order),
        }))
        .sort((a, b) => a.sort_order - b.sort_order);
    }
    return t;
  });

  public typeOptions = computed(() =>
    (this.typesResource.value() || []).map((t) => ({ value: t.id, label: t.name }))
  );

  public employeeOptions = computed(() => {
    // Filtrar por posiciones objetivo del template seleccionado
    const tid = this.selectedTypeId();
    const types = this.typesResource.value() || [];
    const selectedType = types.find((t) => t.id === tid);
    const targetPos = selectedType?.target_position_ids || [];
    return (this.dashboardStore.employees.entities() as Employee[])
      .filter((e: any) => e.is_active)
      .filter((e: any) => {
        if (!targetPos.length) return true; // sin filtro = todos
        return targetPos.includes(e.position_id);
      })
      .map((e: any) => {
        const name = `${e.first_name} ${e.father_name || ''}`.trim();
        const num = e.employee_number ? ` (${e.employee_number})` : '';
        return { value: e.id, label: `${name}${num}` };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  // Evaluadores: solo personal del departamento Administración
  public evaluatorOptions = computed(() =>
    (this.dashboardStore.employees.entities() as any[])
      .filter((e) => e.is_active)
      .filter((e) => {
        const dept = (e.department?.name || '').toLowerCase();
        return dept.includes('administr');
      })
      .map((e) => {
        const name = `${e.first_name} ${e.father_name || ''}`.trim();
        return {
          value: e.id,
          label: `${name}${e.position?.name ? ' — ' + e.position.name : ''}`,
          name,
          position: e.position?.name || '',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  public selectedEmployee = computed(() => {
    const id = this.selectedEmployeeId();
    if (!id) return null;
    return (this.dashboardStore.employees.entities() as any[]).find((e) => e.id === id) || null;
  });

  public selectedEmployeeName = computed(() => {
    const e = this.selectedEmployee();
    if (!e) return '';
    return `${e.first_name} ${e.father_name || ''} ${e.mother_name || ''}`.trim();
  });

  public selectedEmployeeBranch = computed(() => {
    return this.selectedEmployee()?.branch?.name || '';
  });

  // Compute summaries
  private allRatingResponsesByType(qType: 'rating' | 'yes_no') {
    const sections = this.currentType()?.sections || [];
    const ids = sections
      .filter((s) => s.question_type === qType)
      .flatMap((s) => (s.questions || []).map((q) => q.id));
    return ids
      .map((qid) => this.responses().get(qid))
      .filter((r): r is EvaluationResponse => !!r);
  }

  public valuesAvg = computed(() => {
    const sections = this.currentType()?.sections || [];
    const valSection = sections.find((s) => s.name?.toLowerCase().includes('valor'));
    if (!valSection || valSection.question_type !== 'rating') return null;
    const ids = (valSection.questions || []).map((q) => q.id);
    const ratings = ids.map((id) => this.responses().get(id)?.rating).filter((n): n is number => !!n);
    if (!ratings.length) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  });

  public competenciesAvg = computed(() => {
    const sections = this.currentType()?.sections || [];
    const compSection = sections.find((s) => s.name?.toLowerCase().includes('competencia'));
    if (!compSection || compSection.question_type !== 'rating') return null;
    const ids = (compSection.questions || []).map((q) => q.id);
    const ratings = ids.map((id) => this.responses().get(id)?.rating).filter((n): n is number => !!n);
    if (!ratings.length) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  });

  public suitabilityCount = computed(() => {
    const sections = this.currentType()?.sections || [];
    const idoSection = sections.find((s) => s.question_type === 'yes_no');
    if (!idoSection) return null;
    const ids = (idoSection.questions || []).map((q) => q.id);
    const answered = ids.map((id) => this.responses().get(id)?.yes_no).filter((v) => v !== undefined && v !== null);
    if (!answered.length) return null;
    const yes = answered.filter((v) => v === true).length;
    return `${yes}/${ids.length}`;
  });

  public totalQuestions = computed(() => {
    const sections = this.currentType()?.sections || [];
    return sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0);
  });

  public progressDone = computed(() => {
    const sections = this.currentType()?.sections || [];
    let count = 0;
    for (const s of sections) {
      for (const q of s.questions || []) {
        const r = this.responses().get(q.id);
        if (!r) continue;
        if (s.question_type === 'rating' && r.rating != null) count++;
        else if (s.question_type === 'yes_no' && r.yes_no != null) count++;
        else if (s.question_type === 'text' && r.text_response) count++;
      }
    }
    return count;
  });

  public progressPct = computed(() => {
    const total = this.totalQuestions();
    if (!total) return 0;
    return Math.round((this.progressDone() / total) * 100);
  });

  constructor() {
    // Cuando carga la evaluación existente, hidratar el formulario
    effect(() => {
      const arr = this.existingEvalResource.value();
      if (!arr || arr.length === 0) return;
      const e = arr[0];
      this.selectedTypeId.set(e.evaluation_type_id);
      this.selectedEmployeeId.set(e.employee_id);
      this.periodLabel.set(e.period_label || '');
      this.evaluationDate.set(e.evaluation_date ? new Date(e.evaluation_date) : new Date());
      this.evaluatorName.set(e.evaluator_name || '');
      this.evaluatorPosition.set(e.evaluator_position || '');
      this.verdict.set(e.verdict || null);
      this.nextReviewDate.set(e.next_review_date ? new Date(e.next_review_date) : null);
      this.strengths.set(e.strengths || '');
      this.areasToImprove.set(e.areas_to_improve || '');
      this.employeeComments.set(e.employee_comments || '');
      this.evaluatorSignature.set(e.evaluator_signature || '');
      this.employeeSignature.set(e.employee_signature || '');
      this.selectedEvaluatorId.set(e.evaluator_id || null);
      this.currentStatus.set(e.status || 'draft');
      const map = new Map<string, EvaluationResponse>();
      for (const r of e.responses || []) {
        map.set(r.question_id, r);
      }
      this.responses.set(map);
    });

    // Auto-save: cada vez que cambia algo relevante, guarda como borrador 2s después
    effect(() => {
      // Suscribirse a todos los signals que importan
      this.responses();
      this.periodLabel();
      this.evaluatorName();
      this.evaluatorPosition();
      this.strengths();
      this.areasToImprove();
      this.employeeComments();
      this.evaluatorSignature();
      this.employeeSignature();
      this.verdict();
      this.selectedEvaluatorId();
      this.selectedTypeId();
      this.selectedEmployeeId();
      // Solo después de la primera interacción real
      if (!this.hasUserInteracted) {
        this.hasUserInteracted = true;
        return;
      }
      if (this.isReadOnly()) return;
      if (!this.selectedTypeId() || !this.selectedEmployeeId()) return;
      this.scheduleAutosave();
    });

    // Beforeunload: si hay cambios sin guardar, advertir al usuario
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  private handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (this.autosaveState() === 'pending' || this.autosaveState() === 'saving') {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  private scheduleAutosave() {
    this.autosaveState.set('pending');
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.doAutosave(), 1500);
  }

  private async doAutosave() {
    if (this.isReadOnly()) return;
    if (!this.selectedTypeId() || !this.selectedEmployeeId()) return;
    this.autosaveState.set('saving');
    try {
      await this.save('draft', /*silent*/ true);
      this.autosaveState.set('saved');
      setTimeout(() => {
        if (this.autosaveState() === 'saved') this.autosaveState.set('idle');
      }, 2500);
    } catch {
      this.autosaveState.set('idle');
    }
  }

  public getResponse(questionId: string): EvaluationResponse {
    return this.responses().get(questionId) || { question_id: questionId };
  }

  private updateResponse(questionId: string, patch: Partial<EvaluationResponse>) {
    const map = new Map(this.responses());
    map.set(questionId, { ...this.getResponse(questionId), ...patch });
    this.responses.set(map);
  }

  public setRating(questionId: string, rating: number) {
    this.updateResponse(questionId, { rating });
  }
  public setYesNo(questionId: string, val: boolean) {
    this.updateResponse(questionId, { yes_no: val });
  }
  public setText(questionId: string, val: string) {
    this.updateResponse(questionId, { text_response: val });
  }
  public setComment(questionId: string, val: string) {
    this.updateResponse(questionId, { comment: val });
  }

  public romanNumeral(n: number): string {
    return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n - 1] ?? `${n}`;
  }

  public onEvaluatorChange(event: { value: string }) {
    const opts = this.evaluatorOptions();
    const sel = opts.find((o) => o.value === event.value);
    if (sel) {
      this.evaluatorName.set(sel.name);
      this.evaluatorPosition.set(sel.position);
    }
  }

  public generateSummary() {
    // Abre el diálogo de impresión del browser (Save as PDF)
    window.print();
  }

  public back() {
    this.router.navigate(['/admin/hr/evaluations']);
  }

  public async save(status: 'draft' | 'completed', silent = false) {
    if (!this.selectedTypeId() || !this.selectedEmployeeId()) {
      if (!silent) this.message.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona el tipo y el colaborador' });
      return;
    }
    if (!silent) this.saving.set(true);
    try {
      const companyId = this.orgService.getCurrentCompanyId();
      const currentEmpId = this.dashboardStore.currentEmployee()?.id;
      const payload: Partial<EmployeeEvaluation> = {
        employee_id: this.selectedEmployeeId()!,
        evaluation_type_id: this.selectedTypeId()!,
        evaluator_id: this.selectedEvaluatorId() || currentEmpId || null,
        evaluator_name: this.evaluatorName(),
        evaluator_position: this.evaluatorPosition(),
        period_label: this.periodLabel(),
        evaluation_date: this.evaluationDate().toISOString().slice(0, 10),
        verdict: this.verdict() || undefined,
        next_review_date: this.nextReviewDate()?.toISOString().slice(0, 10) || null,
        strengths: this.strengths(),
        areas_to_improve: this.areasToImprove(),
        employee_comments: this.employeeComments(),
        evaluator_signature: this.evaluatorSignature(),
        employee_signature: this.employeeSignature(),
        status,
        values_avg: this.valuesAvg() != null ? Number(this.valuesAvg()) : undefined,
        competencies_avg: this.competenciesAvg() != null ? Number(this.competenciesAvg()) : undefined,
        suitability_count: this.suitabilityCount() || undefined,
        overall_score: this.computeOverall(),
        company_id: companyId,
      };

      let evalId = this.id();
      if (evalId) {
        await firstValueFrom(
          this.http.patch(
            this.apiUrl.build('rest/v1/employee_evaluations', { id: `eq.${evalId}` }),
            payload,
            { headers: { Prefer: 'return=minimal' } }
          )
        );
      } else {
        const created = await firstValueFrom(
          this.http.post<EmployeeEvaluation[]>(
            this.apiUrl.build('rest/v1/employee_evaluations'),
            payload,
            { headers: { Prefer: 'return=representation' } }
          )
        );
        evalId = created?.[0]?.id || null;
        if (!evalId) throw new Error('No se obtuvo ID de la evaluación creada');
        this.id.set(evalId);
      }

      // Replace responses
      await firstValueFrom(
        this.http.delete(
          this.apiUrl.build('rest/v1/evaluation_responses', { evaluation_id: `eq.${evalId}` })
        )
      );
      const respPayloads = Array.from(this.responses().values())
        .filter((r) => r.rating != null || r.yes_no != null || r.text_response || r.comment)
        .map((r) => ({
          evaluation_id: evalId,
          question_id: r.question_id,
          rating: r.rating ?? null,
          yes_no: r.yes_no ?? null,
          text_response: r.text_response ?? null,
          comment: r.comment ?? null,
        }));
      if (respPayloads.length > 0) {
        await firstValueFrom(
          this.http.post(
            this.apiUrl.build('rest/v1/evaluation_responses'),
            respPayloads,
            { headers: { Prefer: 'return=minimal' } }
          )
        );
      }

      if (!silent) this.message.add({ severity: 'success', summary: status === 'completed' ? 'Evaluación completada' : 'Borrador guardado' });
      if (status === 'completed') {
        setTimeout(() => this.router.navigate(['/admin/hr/evaluations']), 800);
      }
    } catch (err: any) {
      console.error('Error saving evaluation', err);
      if (!silent) {
        this.message.add({
          severity: 'error',
          summary: 'Error al guardar',
          detail: err?.error?.message || err?.message || 'Intenta de nuevo',
        });
      }
      throw err;
    } finally {
      if (!silent) this.saving.set(false);
    }
  }

  public ngOnDestroy() {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  private computeOverall(): number | undefined {
    return this.finalScore() ?? undefined;
  }

  // Score final unificado: promedio simple de TODAS las preguntas de rating
  // (todas valen igual). Idoneidad acta como gate adicional via finalLabel.
  public finalScore = computed<number | null>(() => {
    const sections = this.currentType()?.sections || [];
    const ratings: number[] = [];
    for (const s of sections) {
      if (s.question_type !== 'rating') continue;
      for (const q of s.questions || []) {
        const r = this.responses().get(q.id)?.rating;
        if (r != null) ratings.push(r);
      }
    }
    if (!ratings.length) return null;
    return Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2));
  });

  // 1 = peor, scale = mejor. Conversión a 0-100 donde mayor = mejor.
  public finalScorePct = computed<number | null>(() => {
    const score = this.finalScore();
    if (score == null) return null;
    const scale = this.currentType()?.rating_scale || 4;
    // 1 → 0%, scale → 100%
    return Math.round(((score - 1) / (scale - 1)) * 100);
  });

  public finalLabel = computed<{ text: string; color: string } | null>(() => {
    const s = this.finalScore();
    if (s == null) return null;
    const colors = this.currentType()?.rating_colors || ['#A32D2D', '#E08C00', '#C8860A', '#2D6A4F'];
    const labels = this.currentType()?.rating_labels || ['No cumple', 'Debe mejorar', 'Cumple', 'Excede'];
    // 1 → idx 0, ..., 4 → idx 3 (redondeo al más cercano)
    const idx = Math.min(Math.max(Math.round(s) - 1, 0), labels.length - 1);
    return { text: labels[idx], color: colors[idx] };
  });
}
