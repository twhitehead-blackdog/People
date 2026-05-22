import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { firstValueFrom } from 'rxjs';
import * as OTPAuth from 'otpauth';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { SupabaseRealtimeService } from '../services/supabase-realtime.service';
import { KioskVersusComponent } from './kiosk-versus.component';

interface IncomingChallenge {
  matchId: string;
  code: string;
  hostName: string;
  branchName: string;
  hostEmployeeId: string;
  createdAt: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}
interface QuizScore {
  id: string;
  employee_id: string;
  score: number;
  total: number;
  duration_ms: number | null;
  played_at: string;
  employee?: { first_name: string; father_name: string; branch_id?: string };
}
interface LeaderboardRow {
  employee_id: string;
  name: string;
  branch: string;
  best_score: number; // cumulative total
  total_score: number;
  plays: number;
  avg_seconds: number;
}

@Component({
  selector: 'pt-kiosk-extras',
  standalone: true,
  imports: [CommonModule, Button, Dialog, KioskVersusComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Botón CTA esquina superior derecha — pill animado con texto y pulse -->
    @if (showCTA()) {
      <button
        type="button"
        class="kiosk-extras-cta"
        (click)="open()"
        title="Quiz de mascotas y ranking"
      >
        <span class="kiosk-extras-cta__pulse"></span>
        <span class="kiosk-extras-cta__icon">🐕</span>
        <span class="kiosk-extras-cta__text">
          <span class="kiosk-extras-cta__title">Quiz Mascotas</span>
          <span class="kiosk-extras-cta__sub">¡Juega y ranking!</span>
        </span>
        <i class="pi pi-chevron-right kiosk-extras-cta__arrow"></i>
      </button>
    }

    <!-- Challenge broadcast banner: alguien creó una sala en otro kiosk -->
    @if (incomingChallenge(); as ch) {
      <div class="kx-challenge-banner" role="alert">
        <button class="kx-challenge-close" (click)="dismissChallenge()" title="Ignorar">
          <i class="pi pi-times"></i>
        </button>
        <div class="kx-challenge-icon">⚡</div>
        <div class="kx-challenge-text">
          <div class="kx-challenge-title">¡Reto 1v1!</div>
          <div class="kx-challenge-detail">
            <strong>{{ ch.hostName }}</strong>
            @if (ch.branchName) { <span> de <strong>{{ ch.branchName }}</strong></span> }
            te está retando
          </div>
          <div class="kx-challenge-code">Sala {{ ch.code }}</div>
        </div>
        <button class="kx-challenge-accept" (click)="acceptChallenge(ch)">
          <i class="pi pi-check-circle"></i>
          <span>Aceptar</span>
        </button>
      </div>
    }

    <p-dialog
      header="🏆 Black Dog Kiosk"
      [(visible)]="visible"
      modal
      [dismissableMask]="true"
      [style]="{ width: 'min(720px, 96vw)', maxHeight: '90vh' }"
    >
      <!-- Banner instructivo arriba -->
      <div class="kx-hero-banner">
        <div class="kx-hero-banner__icon">🎮</div>
        <div class="kx-hero-banner__text">
          <strong>¡Juega aquí!</strong>
          <span>Toca <span class="kx-hero-banner__highlight">Jugar Quiz</span> abajo para empezar. Cambia a otras pestañas para ver ranking y partidas recientes.</span>
        </div>
      </div>

      <!-- Tabs (Quiz primero como acción principal) -->
      <div class="kx-tabs">
        <button class="kx-tab kx-tab--play" [class.active]="tab() === 'quiz'" (click)="tab.set('quiz')">
          <i class="pi pi-play-circle"></i>
          <span>Jugar Quiz</span>
          @if (tab() !== 'quiz') {
            <span class="kx-tab__badge">¡AQUÍ!</span>
          }
        </button>
        <button class="kx-tab kx-tab--versus" [class.active]="tab() === 'versus'" (click)="tab.set('versus')">
          <i class="pi pi-bolt"></i>
          <span>1v1 Versus</span>
          @if (tab() !== 'versus') {
            <span class="kx-tab__badge kx-tab__badge--new">NUEVO</span>
          }
        </button>
        <button class="kx-tab" [class.active]="tab() === 'leaderboard'" (click)="tab.set('leaderboard')">
          <i class="pi pi-trophy"></i>
          <span>Ranking</span>
        </button>
        <button class="kx-tab" [class.active]="tab() === 'recent'" (click)="tab.set('recent')">
          <i class="pi pi-history"></i>
          <span>Recientes</span>
        </button>
      </div>

      <!-- ====== VERSUS ====== -->
      @if (tab() === 'versus') {
        <div class="kx-tab-body">
          <pt-kiosk-versus
            [activeRoute]="tab() === 'versus' && visible()"
            [incomingCode]="versusIncomingCode()"
            [incomingHostName]="versusIncomingHostName()"
            [incomingBranchName]="versusIncomingBranchName()"
            (consumedIncomingCode)="versusIncomingCode.set('')"
          />
        </div>
      }

      <!-- ====== LEADERBOARD ====== -->
      @if (tab() === 'leaderboard') {
        <div class="kx-tab-body">
          <div class="text-xs text-gray-400 italic mb-3">Top 10 jugadores · mejor puntaje en quiz de mascotas</div>
          @if (leaderboard().length === 0) {
            <div class="kx-empty">
              <i class="pi pi-trophy text-4xl text-gray-600"></i>
              <p>Aún nadie ha jugado. ¡Sé el primero!</p>
            </div>
          }
          @for (row of leaderboard(); track row.employee_id; let i = $index) {
            <div class="kx-row" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
              <span class="kx-rank">
                @if (i === 0) { 🥇 }
                @else if (i === 1) { 🥈 }
                @else if (i === 2) { 🥉 }
                @else { {{ i + 1 }} }
              </span>
              <div class="kx-row-info">
                <div class="kx-row-name">{{ row.name }}</div>
                <div class="kx-row-meta">{{ row.branch }} · {{ row.plays }} {{ row.plays === 1 ? 'día' : 'días' }} · mejor {{ row.best_score }}/10</div>
              </div>
              <div class="kx-row-score">
                <span class="text-lg font-bold text-amber-300">{{ row.total_score }}</span>
                <span class="text-xs text-gray-500">pts</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- ====== QUIZ ====== -->
      @if (tab() === 'quiz') {
        <div class="kx-tab-body">
          @if (!quizActive()) {
            <div class="kx-quiz-intro">
              <span class="kx-quiz-emoji">🐕</span>
              <h3 class="kx-quiz-title">Quiz de Mascotas</h3>
              <p class="kx-quiz-subtitle">10 preguntas aleatorias sobre perros y gatos.<br/>Sin tiempo límite, pero te cronometramos.</p>

              <div class="kx-quiz-field">
                <label class="kx-quiz-label">Selecciona tu nombre</label>
                <select
                  class="kx-select"
                  [value]="quizSelectedEmpId() ?? ''"
                  (change)="onEmpChange($event)"
                >
                  <option value="">— Elige tu nombre —</option>
                  @for (e of employeeList(); track e.id) {
                    <option [value]="e.id">{{ e.first_name }} {{ e.father_name }}</option>
                  }
                </select>
              </div>

              @if (!alreadyPlayedToday()) {
                <div class="kx-quiz-field">
                  <label class="kx-quiz-label">Código del Authenticator</label>
                  <input
                    type="text"
                    inputmode="numeric"
                    maxlength="6"
                    pattern="[0-9]*"
                    class="kx-pin-input"
                    [value]="quizPin()"
                    (input)="onPinInput($event)"
                    placeholder="••••••"
                  />
                </div>
              }

              @if (quizError()) {
                <div class="kx-error">{{ quizError() }}</div>
              }
              @if (!alreadyPlayedToday()) {
                <button class="kx-primary-btn" (click)="startQuiz()" [disabled]="loading()">
                  @if (loading()) { Cargando… } @else { <i class="pi pi-play"></i> Empezar }
                </button>
                <div class="kx-quiz-hint">
                  Usa el código actual de tu Google Authenticator <span class="kx-dot">·</span> rotativo cada 30 s
                </div>
              }
            </div>
          } @else if (!quizFinished()) {
            <div class="kx-quiz-running">
              <div class="kx-quiz-header">
                <span class="text-sm text-gray-400">Pregunta {{ currentIdx() + 1 }} de {{ quizQuestions().length }}</span>
                <span class="text-sm font-bold text-amber-300">Score: {{ correctCount() }}</span>
              </div>
              <div class="kx-progress"><div class="kx-progress-fill" [style.width.%]="(currentIdx() / quizQuestions().length) * 100"></div></div>

              <!-- Timer 10s -->
              <div class="kx-timer" [class.urgent]="timeLeft() <= 5 && !answered()">
                <div class="kx-timer-bar">
                  <div class="kx-timer-fill" [style.width.%]="(timeLeft()/15)*100"></div>
                </div>
                <span class="kx-timer-num">{{ timeLeft() }}s</span>
              </div>

              @if (currentQ(); as q) {
                <h4 class="text-xl text-white font-bold mt-4 mb-4 leading-snug">{{ q.question }}</h4>
                <div class="flex flex-col gap-2">
                  @for (opt of q.options; track $index) {
                    <button
                      class="kx-opt"
                      [class.correct]="answered() && $index === q.correct_index"
                      [class.wrong]="answered() && selectedIdx() === $index && $index !== q.correct_index"
                      [disabled]="answered()"
                      (click)="answer($index)"
                    >
                      <span class="kx-opt-letter">{{ ['A','B','C'][$index] }}</span>
                      <span>{{ opt }}</span>
                    </button>
                  }
                </div>
                @if (answered() && selectedIdx() === null) {
                  <div class="kx-timeout">⏱️ ¡Se acabó el tiempo!</div>
                }
                @if (answered() && q.explanation) {
                  <div class="kx-explanation">💡 {{ q.explanation }}</div>
                }
                @if (answered()) {
                  <button class="kx-primary-btn mt-4 w-full" (click)="nextQuestion()">
                    @if (currentIdx() === quizQuestions().length - 1) { Ver resultado <i class="pi pi-flag"></i> }
                    @else { Siguiente <i class="pi pi-arrow-right"></i> }
                  </button>
                }
                <button class="kx-report-btn" (click)="reportQuestion(q.id)" [disabled]="reportedIds().has(q.id)">
                  @if (reportedIds().has(q.id)) {
                    <i class="pi pi-check"></i> Pregunta reportada
                  } @else {
                    🚩 Reportar pregunta (mal o loca)
                  }
                </button>
              }
            </div>
          } @else {
            <div class="kx-quiz-finish">
              <span class="text-6xl">{{ finishEmoji() }}</span>
              <h3 class="text-2xl font-bold text-white mt-3">{{ finishTitle() }}</h3>
              <div class="kx-score-big">
                <span>{{ correctCount() }}</span>
                <span class="text-sm text-gray-400">/{{ quizQuestions().length }}</span>
              </div>
              <p class="text-sm text-gray-400">Tiempo: {{ formatDuration() }}</p>
              <button class="kx-primary-btn mt-4" (click)="resetQuiz()">Otra partida</button>
            </div>
          }
        </div>
      }

      <!-- ====== RECIENTES ====== -->
      @if (tab() === 'recent') {
        <div class="kx-tab-body">
          <div class="text-xs text-gray-400 italic mb-3">Últimas 15 partidas en esta sucursal</div>
          @for (s of recentScores(); track s.id) {
            <div class="kx-row">
              <span class="kx-rank">{{ s.employee?.first_name?.[0] }}{{ s.employee?.father_name?.[0] }}</span>
              <div class="kx-row-info">
                <div class="kx-row-name">{{ s.employee?.first_name }} {{ s.employee?.father_name }}</div>
                <div class="kx-row-meta">{{ formatRelative(s.played_at) }} · {{ s.duration_ms ? (s.duration_ms / 1000 | number:'1.0-0') + 's' : '—' }}</div>
              </div>
              <div class="kx-row-score">
                <span class="text-lg font-bold text-amber-300">{{ s.score }}</span>
                <span class="text-xs text-gray-500">/{{ s.total }}</span>
              </div>
            </div>
          } @empty {
            <div class="kx-empty"><p>Sin partidas todavía</p></div>
          }
        </div>
      }
    </p-dialog>
  `,
  styles: [`
    .kiosk-extras-cta {
      position: fixed;
      top: 76px;
      right: 16px;
      z-index: 50;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px 10px 12px;
      border-radius: 999px;
      border: 1px solid rgba(251, 191, 36, 0.4);
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 60%, #d97706 100%);
      color: #111;
      cursor: pointer;
      backdrop-filter: blur(8px);
      box-shadow:
        0 10px 28px rgba(251, 191, 36, 0.45),
        0 0 0 4px rgba(251, 191, 36, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
      animation: kx-cta-bounce 2.5s ease-in-out infinite;
      overflow: hidden;
    }
    .kiosk-extras-cta:hover {
      transform: translateY(-2px) scale(1.04);
      box-shadow:
        0 16px 36px rgba(251, 191, 36, 0.6),
        0 0 0 6px rgba(251, 191, 36, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.4);
      animation: none;
    }
    .kiosk-extras-cta:active { transform: translateY(0) scale(0.98); }

    .kiosk-extras-cta__icon {
      font-size: 22px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      transition: transform 0.3s;
    }
    .kiosk-extras-cta:hover .kiosk-extras-cta__icon {
      transform: rotate(-10deg) scale(1.15);
    }

    .kiosk-extras-cta__text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.1;
      text-align: left;
    }
    .kiosk-extras-cta__title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.3px;
      color: #111;
      text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
    }
    .kiosk-extras-cta__sub {
      font-size: 10px;
      font-weight: 600;
      color: rgba(17, 17, 17, 0.7);
      margin-top: 1px;
    }
    .kiosk-extras-cta__arrow {
      font-size: 12px;
      color: #111;
      opacity: 0.8;
      transition: transform 0.2s;
    }
    .kiosk-extras-cta:hover .kiosk-extras-cta__arrow {
      transform: translateX(3px);
      opacity: 1;
    }

    /* Pulse ring de fondo para llamar la atención */
    .kiosk-extras-cta__pulse {
      position: absolute;
      inset: 0;
      border-radius: 999px;
      animation: kx-cta-pulse 2.5s ease-out infinite;
      pointer-events: none;
    }
    @keyframes kx-cta-pulse {
      0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); }
      80%, 100% { box-shadow: 0 0 0 14px rgba(251, 191, 36, 0); }
    }
    @keyframes kx-cta-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    /* Mobile: compactar texto pero mantener visible */
    @media (max-width: 480px) {
      .kiosk-extras-cta { padding: 9px 12px 9px 10px; }
      .kiosk-extras-cta__icon { font-size: 18px; }
      .kiosk-extras-cta__title { font-size: 11px; }
      .kiosk-extras-cta__sub { font-size: 9px; }
    }

    /* Banner CTA superior */
    .kx-hero-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      margin-bottom: 12px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(245, 158, 11, 0.06));
      border: 1px solid rgba(251, 191, 36, 0.35);
      backdrop-filter: blur(8px);
    }
    .kx-hero-banner__icon {
      font-size: 28px;
      flex-shrink: 0;
      animation: kx-hero-bounce 2s ease-in-out infinite;
    }
    @keyframes kx-hero-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    .kx-hero-banner__text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      color: rgba(255, 255, 255, 0.85);
      font-size: 12px;
      line-height: 1.4;
    }
    .kx-hero-banner__text strong {
      color: #fbbf24;
      font-size: 14px;
      font-weight: 800;
    }
    .kx-hero-banner__highlight {
      color: #fde047;
      font-weight: 700;
      background: rgba(251, 191, 36, 0.15);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .kx-tabs {
      display: flex; gap: 4px; padding: 4px;
      background: rgba(0, 0, 0, 0.3); border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 16px;
    }
    .kx-tab {
      flex: 1; padding: 8px 12px; border-radius: 8px;
      font-size: 13px; font-weight: 600;
      color: rgba(255, 255, 255, 0.55);
      background: transparent; border: none; cursor: pointer;
      transition: all 0.2s;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      position: relative;
    }
    .kx-tab:hover { color: rgba(251, 191, 36, 0.9); background: rgba(251, 191, 36, 0.06); }
    .kx-tab.active { color: #111; background: linear-gradient(135deg, #fbbf24, #f59e0b); box-shadow: 0 4px 12px rgba(251, 191, 36, 0.35); }
    .kx-tab i { font-size: 14px; }

    /* Tab "Jugar Quiz" enfatizada */
    .kx-tab--play:not(.active) {
      animation: kx-play-glow 2s ease-in-out infinite;
      color: #fbbf24;
    }
    @keyframes kx-play-glow {
      0%, 100% { background: rgba(251, 191, 36, 0.05); }
      50% { background: rgba(251, 191, 36, 0.15); }
    }
    .kx-tab__badge {
      position: absolute;
      top: -6px; right: -2px;
      font-size: 9px; font-weight: 800;
      background: #ef4444;
      color: #fff;
      padding: 2px 6px;
      border-radius: 999px;
      letter-spacing: 0.5px;
      animation: kx-badge-shake 1.5s ease-in-out infinite;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.5);
    }
    @keyframes kx-badge-shake {
      0%, 100% { transform: rotate(-8deg) scale(1); }
      50% { transform: rotate(8deg) scale(1.1); }
    }
    .kx-tab__badge--new { background: #8b5cf6; box-shadow: 0 2px 6px rgba(139, 92, 246, 0.5); }
    .kx-tab--versus:not(.active) {
      color: #c4b5fd;
      background: rgba(139, 92, 246, 0.06);
    }
    .kx-tab--versus.active { color: #ddd6fe; background: rgba(139, 92, 246, 0.18); }

    /* ====== Challenge broadcast banner ====== */
    .kx-challenge-banner {
      position: fixed;
      top: 16px; left: 50%; transform: translateX(-50%);
      z-index: 100002;
      display: flex; align-items: center; gap: 14px;
      padding: 14px 18px 14px 20px;
      min-width: 380px; max-width: min(560px, 94vw);
      background: linear-gradient(135deg, #1e1b4b 0%, #3b0764 100%);
      border: 1px solid rgba(139, 92, 246, 0.5);
      border-radius: 14px;
      box-shadow: 0 16px 48px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset;
      animation: kxChallengeIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes kxChallengeIn {
      from { opacity: 0; transform: translate(-50%, -32px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    .kx-challenge-icon {
      font-size: 2.2rem;
      filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.8));
      animation: kxChallengePulse 1.2s ease-in-out infinite;
    }
    @keyframes kxChallengePulse {
      0%, 100% { transform: scale(1) rotate(-6deg); }
      50% { transform: scale(1.18) rotate(6deg); }
    }
    .kx-challenge-text { flex: 1; min-width: 0; }
    .kx-challenge-title {
      font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.08em; color: #fbbf24;
    }
    .kx-challenge-detail {
      font-size: 0.95rem; color: #f3f4f6; margin-top: 2px; line-height: 1.25;
    }
    .kx-challenge-detail strong { color: #fde68a; }
    .kx-challenge-code {
      margin-top: 4px; font-family: 'Orbitron', monospace; font-size: 0.75rem;
      letter-spacing: 0.2em; color: #c4b5fd;
    }
    .kx-challenge-accept {
      flex-shrink: 0;
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 18px; border-radius: 10px;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: #1f1408; font-weight: 800; font-size: 0.95rem;
      border: none; cursor: pointer;
      box-shadow: 0 4px 16px rgba(251, 191, 36, 0.45);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kx-challenge-accept:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(251, 191, 36, 0.6); }
    .kx-challenge-accept:active { transform: translateY(0); }
    .kx-challenge-close {
      position: absolute; top: 6px; right: 8px;
      width: 24px; height: 24px;
      background: transparent; border: none; cursor: pointer;
      color: #9ca3af; font-size: 12px;
    }
    .kx-challenge-close:hover { color: #f3f4f6; }
    @media (max-width: 540px) {
      .kx-challenge-banner { min-width: 0; width: calc(100vw - 24px); }
    }

    .kx-tab-body { max-height: 60vh; overflow-y: auto; padding: 0 4px; }

    .kx-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 8px;
      transition: all 0.15s;
    }
    .kx-row:hover { background: rgba(255, 255, 255, 0.05); }
    .kx-row.gold { background: linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.04)); border-color: rgba(251, 191, 36, 0.3); }
    .kx-row.silver { background: linear-gradient(135deg, rgba(192, 192, 192, 0.08), rgba(255, 255, 255, 0.02)); border-color: rgba(192, 192, 192, 0.2); }
    .kx-row.bronze { background: linear-gradient(135deg, rgba(205, 127, 50, 0.1), rgba(160, 90, 35, 0.04)); border-color: rgba(205, 127, 50, 0.25); }
    .kx-rank {
      flex-shrink: 0; width: 36px; height: 36px;
      display: inline-flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.3); border-radius: 50%;
      font-weight: 700; color: #fbbf24; font-size: 14px;
    }
    .kx-row-info { flex: 1; min-width: 0; }
    .kx-row-name { font-size: 14px; font-weight: 600; color: #fff; }
    .kx-row-meta { font-size: 11px; color: rgba(255, 255, 255, 0.45); margin-top: 2px; }
    .kx-row-score { text-align: right; }

    .kx-empty {
      text-align: center; padding: 40px 16px;
      color: rgba(255, 255, 255, 0.4);
    }
    .kx-empty p { margin-top: 12px; font-size: 14px; }

    /* Timer 10s */
    .kx-timer {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
      padding: 6px 10px;
      background: rgba(255,255,255,0.04);
      border-radius: 10px;
      border: 1px solid rgba(251,191,36,0.15);
      transition: all 0.25s;
    }
    .kx-timer-bar {
      flex: 1;
      height: 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 999px;
      overflow: hidden;
    }
    .kx-timer-fill {
      height: 100%;
      background: linear-gradient(90deg, #34d399, #fbbf24);
      border-radius: 999px;
      transition: width 1s linear;
    }
    .kx-timer-num {
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 14px;
      color: #fbbf24;
      min-width: 36px;
      text-align: right;
    }
    .kx-timer.urgent {
      border-color: rgba(248,113,113,0.45);
      animation: kxPulse 0.5s ease-in-out infinite alternate;
    }
    .kx-timer.urgent .kx-timer-fill { background: linear-gradient(90deg, #f87171, #ef4444); }
    .kx-timer.urgent .kx-timer-num { color: #f87171; }
    @keyframes kxPulse {
      from { box-shadow: 0 0 0 0 rgba(248,113,113,0.0); }
      to   { box-shadow: 0 0 0 6px rgba(248,113,113,0.18); }
    }
    .kx-timeout {
      margin-top: 12px;
      padding: 10px;
      background: rgba(248,113,113,0.12);
      border: 1px solid rgba(248,113,113,0.3);
      border-radius: 10px;
      color: #fca5a5;
      text-align: center;
      font-weight: 600;
      font-size: 13px;
    }

    /* Report button */
    .kx-report-btn {
      margin-top: 14px;
      width: 100%;
      padding: 9px 12px;
      background: rgba(255,255,255,0.03);
      border: 1px dashed rgba(248,113,113,0.35);
      border-radius: 10px;
      color: rgba(248,113,113,0.85);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .kx-report-btn:hover:not(:disabled) {
      background: rgba(248,113,113,0.1);
      border-color: rgba(248,113,113,0.6);
      color: #fca5a5;
    }
    .kx-report-btn:disabled {
      opacity: 0.5;
      cursor: default;
      color: #6ee7b7;
      border-color: rgba(110,231,183,0.3);
    }

    /* Quiz intro — timeclock style */
    .kx-quiz-intro {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px 16px 24px;
      max-width: 320px;
      margin: 0 auto;
    }
    .kx-quiz-emoji {
      font-size: 56px;
      line-height: 1;
      filter: drop-shadow(0 4px 12px rgba(251, 191, 36, 0.4));
    }
    .kx-quiz-title {
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      margin: 14px 0 6px;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .kx-quiz-subtitle {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.65);
      margin: 0 0 22px;
      line-height: 1.5;
    }
    .kx-quiz-field {
      width: 100%;
      max-width: 280px;
      margin: 0 auto 14px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    .kx-quiz-label {
      font-size: 11px;
      color: rgba(251, 191, 36, 0.85);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
      margin-bottom: 8px;
      text-align: center;
    }
    .kx-pin-input, .kx-select {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-radius: 14px;
      color: #fff;
      font-family: inherit;
      font-size: 15px;
      text-align: center;
      transition: all 0.2s;
      backdrop-filter: blur(8px);
    }
    .kx-pin-input {
      font-size: 28px;
      letter-spacing: 10px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      padding-left: 26px;
    }
    .kx-pin-input::placeholder {
      color: rgba(251, 191, 36, 0.25);
      letter-spacing: 10px;
    }
    .kx-select {
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23fbbf24' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 16px center;
      padding-right: 40px;
    }
    .kx-select option { background: #1f2937; color: #fff; padding: 8px; }
    .kx-pin-input:focus, .kx-select:focus {
      outline: none;
      border-color: rgba(251, 191, 36, 0.7);
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.15);
    }
    .kx-quiz-hint {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 14px;
      font-style: italic;
    }
    .kx-quiz-hint .kx-dot { color: rgba(251, 191, 36, 0.6); margin: 0 4px; }
    .kx-primary-btn {
      margin-top: 8px;
      padding: 14px 32px;
      min-width: 200px;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: #111;
      border: none;
      border-radius: 14px;
      font-weight: 800;
      font-size: 15px;
      letter-spacing: 0.02em;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s;
      box-shadow: 0 8px 24px rgba(251, 191, 36, 0.4);
    }
    .kx-primary-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(251, 191, 36, 0.5);
    }
    .kx-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .kx-error {
      color: #f87171;
      font-size: 12px;
      margin-top: 8px;
      background: rgba(239, 68, 68, 0.1);
      padding: 6px 10px;
      border-radius: 8px;
    }

    /* Quiz running */
    .kx-quiz-header { display: flex; justify-content: space-between; }
    .kx-progress { height: 4px; background: rgba(255, 255, 255, 0.06); border-radius: 999px; overflow: hidden; margin-top: 8px; }
    .kx-progress-fill { height: 100%; background: linear-gradient(90deg, #fbbf24, #f59e0b); transition: width 0.3s; }

    .kx-opt {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 2px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
    }
    .kx-opt:hover:not(:disabled) {
      background: rgba(251, 191, 36, 0.08);
      border-color: rgba(251, 191, 36, 0.3);
    }
    .kx-opt:disabled { cursor: default; }
    .kx-opt.correct {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.08));
      border-color: rgba(34, 197, 94, 0.5);
      color: #86efac;
    }
    .kx-opt.wrong {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.08));
      border-color: rgba(239, 68, 68, 0.5);
      color: #fca5a5;
    }
    .kx-opt-letter {
      flex-shrink: 0; width: 28px; height: 28px;
      display: inline-flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      font-weight: 700; font-size: 13px;
    }
    .kx-explanation {
      margin-top: 14px;
      padding: 12px 14px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.03));
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 10px;
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
      line-height: 1.5;
    }

    /* Quiz finish */
    .kx-quiz-finish { text-align: center; padding: 24px 16px; }
    .kx-score-big {
      margin: 16px 0;
      font-size: 4rem;
      font-weight: 800;
      background: linear-gradient(135deg, #fde047, #f59e0b);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  `],
})
export class KioskExtrasComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);
  private realtime = inject(SupabaseRealtimeService);

  public visible = signal(false);

  /** CTA siempre visible — el bloqueo histórico de dropdowns era ciclo DI, no este botón */
  public showCTA = computed(() => true);
  public tab = signal<'leaderboard' | 'quiz' | 'recent' | 'versus'>('leaderboard');
  public loading = signal(false);

  // === Challenge broadcast (reto entrante de otro kiosk) ===
  public incomingChallenge = signal<IncomingChallenge | null>(null);
  public versusIncomingCode = signal<string>('');
  public versusIncomingHostName = signal<string>('');
  public versusIncomingBranchName = signal<string>('');
  /** IDs de matches que el usuario descartó manualmente, no volver a mostrar */
  private dismissedChallengeIds = new Set<string>();
  /** Cache mínima de empleado/sucursal para resolver nombres del reto */
  private branchNameCache = new Map<string, string>();
  /** Suscripción persistente a kiosk_versus_matches para detectar retos */
  private versusMatchesSig = this.realtime.subscribeToTable('kiosk_versus_matches');

  constructor() {
    effect(() => {
      const batch = this.versusMatchesSig();
      if (!batch) return;
      for (const ev of batch.events) {
        const rec: any = ev.record;
        if (!rec) continue;
        // Solo nos interesan INSERT con status='waiting' Y UPDATEs que cambien el status
        if (ev.type === 'INSERT' && rec.status === 'waiting') {
          // No mostrar retos viejos (más de 90s) al re-subscribirnos
          const ageMs = Date.now() - new Date(rec.created_at).getTime();
          if (ageMs > 90_000) continue;
          this.maybeShowChallenge(rec).catch(() => {});
        } else if (ev.type === 'UPDATE') {
          const cur = this.incomingChallenge();
          if (cur && cur.matchId === rec.id && rec.status !== 'waiting') {
            // La sala ya no está abierta — alguien más entró o se canceló
            this.incomingChallenge.set(null);
          }
        }
      }
    });
  }

  private async maybeShowChallenge(match: any): Promise<void> {
    if (this.dismissedChallengeIds.has(match.id)) return;
    // No reemplazar un reto ya visible (que el usuario decida sobre el primero)
    if (this.incomingChallenge()) return;
    try {
      const hostName = await this.resolveEmployeeName(match.host_employee_id);
      const branchName = match.host_branch_id ? await this.resolveBranchName(match.host_branch_id) : '';
      // Re-chequear que la sala siga abierta (status pudo cambiar mientras resolvíamos)
      if (this.incomingChallenge()) return;
      this.incomingChallenge.set({
        matchId: match.id,
        code: match.code,
        hostName: hostName || 'Compañero',
        branchName,
        hostEmployeeId: match.host_employee_id,
        createdAt: match.created_at,
      });
      // Auto-dismiss después de 90s si nadie hace nada (la sala probablemente ya expiró)
      setTimeout(() => {
        const cur = this.incomingChallenge();
        if (cur && cur.matchId === match.id) this.incomingChallenge.set(null);
      }, 90_000);
    } catch (e) {
      console.error('[kiosk-extras] maybeShowChallenge error', e);
    }
  }

  private async resolveEmployeeName(empId: string | null): Promise<string> {
    if (!empId) return '';
    try {
      const url = this.apiUrl.build('rest/v1/employees', {
        id: `eq.${empId}`, select: 'first_name,father_name', limit: 1,
      });
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      if (rows && rows[0]) return `${rows[0].first_name} ${rows[0].father_name}`.trim();
    } catch {}
    return '';
  }

  private async resolveBranchName(branchId: string | null): Promise<string> {
    if (!branchId) return '';
    const cached = this.branchNameCache.get(branchId);
    if (cached !== undefined) return cached;
    try {
      const url = this.apiUrl.build('rest/v1/branches', {
        id: `eq.${branchId}`, select: 'name,short_name', limit: 1,
      });
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      const name = rows?.[0]?.short_name || rows?.[0]?.name || '';
      this.branchNameCache.set(branchId, name);
      return name;
    } catch {
      this.branchNameCache.set(branchId, '');
      return '';
    }
  }

  public dismissChallenge(): void {
    const cur = this.incomingChallenge();
    if (cur) this.dismissedChallengeIds.add(cur.matchId);
    this.incomingChallenge.set(null);
  }

  public acceptChallenge(ch: IncomingChallenge): void {
    // Pasar info del reto al componente versus para que muestre la pantalla
    // accept-challenge con lista de empleados (1 tap = se une).
    this.versusIncomingHostName.set(ch.hostName);
    this.versusIncomingBranchName.set(ch.branchName);
    this.versusIncomingCode.set(ch.code);
    this.incomingChallenge.set(null);
    this.tab.set('versus');
    this.visible.set(true);
  }

  // Leaderboard
  public leaderboard = signal<LeaderboardRow[]>([]);
  public recentScores = signal<QuizScore[]>([]);

  // Quiz state
  public quizActive = signal(false);
  public quizFinished = signal(false);
  public quizQuestions = signal<QuizQuestion[]>([]);
  public currentIdx = signal(0);
  public selectedIdx = signal<number | null>(null);
  public answered = signal(false);
  public correctCount = signal(0);
  public quizStartTime = 0;
  public quizDurationMs = signal(0);
  public quizPin = signal('');
  public quizError = signal('');
  public quizEmployeeId = signal<string | null>(null);
  public quizSelectedEmpId = signal<string | null>(null);
  public employeeList = signal<any[]>([]);
  public alreadyPlayedToday = signal(false);
  public reportedIds = signal<Set<string>>(new Set());

  public async reportQuestion(questionId: string): Promise<void> {
    if (this.reportedIds().has(questionId)) return;
    try {
      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/kiosk_quiz_reports'), {
          question_id: questionId,
          employee_id: this.quizEmployeeId(),
          reason: 'reported_from_kiosk',
        }, { headers: { Prefer: 'return=minimal' } })
      );
      const next = new Set(this.reportedIds());
      next.add(questionId);
      this.reportedIds.set(next);
    } catch (e) {
      console.error('Error reporting question', e);
    }
  }
  public timeLeft = signal(10);
  private timerHandle: any = null;

  private startTimer(): void {
    this.stopTimer();
    this.timeLeft.set(15);
    this.timerHandle = setInterval(() => {
      const t = this.timeLeft() - 1;
      this.timeLeft.set(t);
      if (t <= 0) {
        this.stopTimer();
        if (!this.answered()) {
          // Timeout: marcar como respondida sin selección
          this.selectedIdx.set(null);
          this.answered.set(true);
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  public async onEmpChange(ev: Event): Promise<void> {
    const v = (ev.target as HTMLSelectElement).value;
    this.quizSelectedEmpId.set(v || null);
    this.quizError.set('');
    this.alreadyPlayedToday.set(false);
    if (!v) return;
    // Verificar inmediatamente si ya jugó hoy (zona Panama)
    try {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' });
      const dateStr = fmt.format(now); // YYYY-MM-DD
      const startOfDay = `${dateStr}T00:00:00-05:00`;
      const url = this.apiUrl.build('rest/v1/kiosk_quiz_scores', {
        employee_id: `eq.${v}`,
        played_at: `gte.${startOfDay}`,
        select: 'id',
        limit: 1,
      });
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      if (rows && rows.length > 0) {
        this.alreadyPlayedToday.set(true);
        this.quizError.set('Ya jugaste hoy 🐾 Intenta nuevamente mañana.');
      }
    } catch {}
  }

  public currentQ = computed(() => this.quizQuestions()[this.currentIdx()]);

  public finishEmoji = computed(() => {
    const score = this.correctCount();
    const total = this.quizQuestions().length;
    const pct = (score / total) * 100;
    if (pct === 100) return '🏆';
    if (pct >= 80) return '🌟';
    if (pct >= 60) return '🎉';
    if (pct >= 40) return '🐾';
    return '🐕';
  });
  public finishTitle = computed(() => {
    const score = this.correctCount();
    const total = this.quizQuestions().length;
    const pct = (score / total) * 100;
    if (pct === 100) return '¡Perfecto!';
    if (pct >= 80) return '¡Excelente!';
    if (pct >= 60) return '¡Bien jugado!';
    if (pct >= 40) return 'Sigue practicando';
    return 'A repasar mascotas';
  });

  ngOnInit(): void {
    this.loadLeaderboard();
    this.loadRecent();
    this.loadEmployees();
  }

  private async loadEmployees(): Promise<void> {
    try {
      const companyId = this.orgService.getCurrentCompanyId();
      const params: any = {
        is_active: 'eq.true',
        select: 'id,first_name,father_name',
        order: 'first_name.asc',
        limit: 500,
      };
      if (companyId) params.company_id = `eq.${companyId}`;
      const url = this.apiUrl.build('rest/v1/employees', params);
      const list = await firstValueFrom(this.http.get<any[]>(url));
      this.employeeList.set(list ?? []);
    } catch (e) {
      console.error('Error cargando empleados', e);
    }
  }

  public open(): void {
    // Al abrir, ir directo a la pestaña de jugar — es la acción principal
    this.tab.set('quiz');
    this.visible.set(true);
    this.loadLeaderboard();
  }

  public onPinInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value.replace(/[^0-9]/g, '').slice(0, 6);
    this.quizPin.set(v);
    this.quizError.set('');
  }

  public async startQuiz(): Promise<void> {
    const empId = this.quizSelectedEmpId();
    const pin = this.quizPin();
    if (!empId) {
      this.quizError.set('Selecciona tu nombre primero');
      return;
    }
    if (pin.length !== 6) {
      this.quizError.set('El código debe ser de 6 dígitos');
      return;
    }
    this.loading.set(true);
    try {
      // Cargar empleado con code_uri para validar TOTP
      const empUrl = this.apiUrl.build('rest/v1/employees', {
        id: `eq.${empId}`,
        is_active: 'eq.true',
        select: 'id,first_name,father_name,branch_id,company_id,code_uri',
        limit: 1,
      });
      const emps = await firstValueFrom(this.http.get<any[]>(empUrl));
      if (!emps || emps.length === 0) {
        this.quizError.set('Empleado no encontrado');
        return;
      }
      const emp = emps[0];
      if (!emp.code_uri) {
        this.quizError.set('No tienes Authenticator configurado. Pídele a tu gerente que te ayude a configurarlo.');
        return;
      }
      // Validar TOTP
      try {
        const totp = OTPAuth.URI.parse(emp.code_uri);
        const valid = (totp as any).validate({ token: pin, window: 1 });
        if (valid === null) {
          this.quizError.set('Código inválido. Verifica tu Google Authenticator (cambia cada 30s).');
          return;
        }
      } catch (e) {
        this.quizError.set('Error validando código. Intenta de nuevo.');
        return;
      }
      this.quizEmployeeId.set(emp.id);
      (this as any)._employeeData = emp;

      // Verificar que no haya jugado hoy (zona Panama)
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Panama' }));
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const checkUrl = this.apiUrl.build('rest/v1/kiosk_quiz_scores', {
        employee_id: `eq.${emp.id}`,
        played_at: `gte.${startOfDay}`,
        select: 'id',
        limit: 1,
      });
      const playedToday = await firstValueFrom(this.http.get<any[]>(checkUrl));
      if (playedToday && playedToday.length > 0) {
        this.quizError.set('Ya jugaste hoy. Vuelve mañana 🐾');
        return;
      }

      // Cargar 10 preguntas aleatorias
      const qUrl = this.apiUrl.build('rest/v1/kiosk_quiz_questions', {
        active: 'eq.true',
        select: 'id,question,options,correct_index,explanation',
        limit: 600,
      });
      const allQs = await firstValueFrom(this.http.get<QuizQuestion[]>(qUrl));
      if (!allQs || allQs.length === 0) {
        this.quizError.set('No hay preguntas disponibles');
        return;
      }
      const shuffled = [...allQs].sort(() => Math.random() - 0.5).slice(0, 10);
      this.quizQuestions.set(shuffled);
      this.currentIdx.set(0);
      this.correctCount.set(0);
      this.selectedIdx.set(null);
      this.answered.set(false);
      this.quizActive.set(true);
      this.quizFinished.set(false);
      this.quizStartTime = Date.now();
      this.startTimer();
    } catch (e: any) {
      this.quizError.set('Error al cargar: ' + (e?.message || 'desconocido'));
    } finally {
      this.loading.set(false);
    }
  }

  public answer(idx: number): void {
    if (this.answered()) return;
    this.stopTimer();
    this.selectedIdx.set(idx);
    this.answered.set(true);
    if (idx === this.currentQ()?.correct_index) {
      this.correctCount.update((c) => c + 1);
    }
  }

  public nextQuestion(): void {
    if (this.currentIdx() < this.quizQuestions().length - 1) {
      this.currentIdx.update((i) => i + 1);
      this.selectedIdx.set(null);
      this.answered.set(false);
      this.startTimer();
    } else {
      this.finishQuiz();
    }
  }

  private async finishQuiz(): Promise<void> {
    this.stopTimer();
    const duration = Date.now() - this.quizStartTime;
    this.quizDurationMs.set(duration);
    this.quizFinished.set(true);

    // Guardar score
    const emp = (this as any)._employeeData;
    if (emp) {
      try {
        await firstValueFrom(
          this.http.post(this.apiUrl.build('rest/v1/kiosk_quiz_scores'), {
            employee_id: emp.id,
            branch_id: emp.branch_id,
            company_id: emp.company_id,
            score: this.correctCount(),
            total: this.quizQuestions().length,
            duration_ms: duration,
          }, { headers: { Prefer: 'return=minimal' } })
        );
      } catch (e) {
        console.error('No se pudo guardar el score', e);
      }
    }
    // Refresh leaderboard
    this.loadLeaderboard();
    this.loadRecent();
  }

  public resetQuiz(): void {
    this.stopTimer();
    this.quizActive.set(false);
    this.quizFinished.set(false);
    this.quizQuestions.set([]);
    this.currentIdx.set(0);
    this.correctCount.set(0);
    this.selectedIdx.set(null);
    this.answered.set(false);
    this.quizPin.set('');
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  public formatDuration(): string {
    const s = Math.floor(this.quizDurationMs() / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  public formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return `hace ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
  }

  private async loadLeaderboard(): Promise<void> {
    try {
      const url = this.apiUrl.build('rest/v1/kiosk_quiz_scores', {
        select: 'employee_id,score,duration_ms,employee:employees!kiosk_quiz_scores_employee_id_fkey(first_name,father_name,branch:branches(name))',
        order: 'score.desc',
        limit: 200,
      });
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      if (!rows) return;
      const byEmp = new Map<string, LeaderboardRow>();
      for (const r of rows) {
        const id = r.employee_id;
        const cur = byEmp.get(id);
        const name = `${r.employee?.first_name || ''} ${r.employee?.father_name || ''}`.trim() || '—';
        const branch = r.employee?.branch?.name || '—';
        if (!cur) {
          byEmp.set(id, {
            employee_id: id,
            name,
            branch,
            best_score: r.score,
            total_score: r.score,
            plays: 1,
            avg_seconds: Math.round((r.duration_ms || 0) / 1000),
          });
        } else {
          cur.plays++;
          cur.total_score += r.score;
          if (r.score > cur.best_score) cur.best_score = r.score;
          cur.avg_seconds = Math.round((cur.avg_seconds * (cur.plays - 1) + (r.duration_ms || 0) / 1000) / cur.plays);
        }
      }
      // Acumulativo: ordenar por total_score desc, luego avg_seconds asc
      const list = Array.from(byEmp.values()).sort((a, b) => b.total_score - a.total_score || a.avg_seconds - b.avg_seconds).slice(0, 10);
      this.leaderboard.set(list);
    } catch (e) {
      console.error('Error cargando leaderboard', e);
    }
  }

  private async loadRecent(): Promise<void> {
    try {
      const url = this.apiUrl.build('rest/v1/kiosk_quiz_scores', {
        select: 'id,employee_id,score,total,duration_ms,played_at,employee:employees!kiosk_quiz_scores_employee_id_fkey(first_name,father_name)',
        order: 'played_at.desc',
        limit: 15,
      });
      const rows = await firstValueFrom(this.http.get<QuizScore[]>(url));
      this.recentScores.set(rows || []);
    } catch (e) {
      console.error('Error cargando recientes', e);
    }
  }
}
