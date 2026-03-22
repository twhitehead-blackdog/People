import { Component, inject, signal, ElementRef, viewChild, OnInit, input, Pipe, PipeTransform, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '@auth0/auth0-angular';

@Pipe({ name: 'md', standalone: true, pure: true })
export class MdPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);
  transform(text: string): SafeHtml {
    const html = text
      // Escape HTML to prevent XSS
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // **bold**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // *italic*
      .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
      // ══ section headers
      .replace(/^(═+.+?═+)$/gm, '<span class="md-sep">$1</span>')
      // ▸ headers
      .replace(/^(▸\s*.+)$/gm, '<span class="md-h">$1</span>')
      // Numbered steps  1. 2. 3.
      .replace(/^(\d+\.\s.+)$/gm, '<span class="md-step">$1</span>')
      // Bullet • and -
      .replace(/^[•\-]\s+(.+)$/gm, '<span class="md-bullet">• $1</span>')
      // Line breaks
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function greeting(name?: string): string {
  const hour = new Date().getHours();
  const saludo = hour >= 5 && hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  return name ? `¡${saludo}, ${name}! 👋` : `¡${saludo}! 👋`;
}

@Component({
  selector: 'pt-chat-widget',
  standalone: true,
  imports: [FormsModule, NgClass, MdPipe],
  host: { '(document:click)': 'onDocClick($event)', '(document:keydown.escape)': 'onEsc()' },
  template: `
    <!-- Toggle button -->
    <button class="chat-toggle" (click)="toggleOpen()" [class.active]="open()" title="People Assistant">
      @if (!open()) {
        <img src="/favicon.png" class="toggle-favicon" alt="People Assistant" />
        @if (hasUnread()) { <span class="unread-dot"></span> }
      } @else {
        <i class="pi pi-times"></i>
      }
    </button>

    <!-- Chat panel -->
    @if (open()) {
      <div class="chat-panel">
        <!-- Header -->
        <div class="chat-header">
          <div class="chat-avatar"><img src="/favicon.png" alt="BD" /></div>
          <div class="chat-header-info">
            <span class="chat-title">People Assistant</span>
            <span class="chat-sub">IA · RRHH Black Dog Panamá</span>
          </div>
          <button class="chat-clear" (click)="clearChat()" title="Nueva conversación">
            <i class="pi pi-refresh"></i>
          </button>
        </div>

        <!-- Messages -->
        <div class="chat-messages" #messagesEl>
          @for (msg of messages(); track $index) {
            <div class="chat-msg" [class.user]="msg.role === 'user'" [class.bot]="msg.role === 'assistant'">
              @if (msg.role === 'assistant') {
                <div class="bot-icon"><img src="/favicon.png" alt="BD" /></div>
              }
              <div class="msg-bubble" [innerHTML]="msg.role === 'assistant' ? (msg.content | md) : msg.content"></div>
            </div>
          }
          @if (loading()) {
            <div class="chat-msg bot">
              <div class="bot-icon">🐾</div>
              <div class="msg-bubble typing"><span></span><span></span><span></span></div>
            </div>
          }
          <!-- Suggestions shown after welcome only -->
          @if (messages().length === 1 && !loading()) {
            <div class="chat-suggestions">
              @for (s of suggestions; track s) {
                <button class="suggestion-btn" (click)="sendSuggestion(s)">
                  <i class="pi pi-arrow-right"></i> {{ s }}
                </button>
              }
            </div>
          }
        </div>

        <!-- Input -->
        <form class="chat-input" (submit)="send($event)">
          <input
            #inputEl
            type="text"
            [(ngModel)]="input"
            name="msg"
            placeholder="Pregunta algo..."
            autocomplete="off"
            [disabled]="loading()"
          />
          <button type="submit" [disabled]="loading() || !input.trim()">
            <i class="pi pi-send"></i>
          </button>
        </form>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
    }

    /* ── Toggle Button ── */
    .chat-toggle {
      position: relative;
      width: 52px; height: 52px; border-radius: 50%;
      background: #f7b104; color: #000; border: none;
      font-size: 1.25rem; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(247,177,4,0.5);
      transition: all 0.25s cubic-bezier(.34,1.56,.64,1);
      &:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(247,177,4,0.6); }
      &.active { background: #111; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
    }
    .toggle-favicon {
      width: 30px; height: 30px; object-fit: contain; border-radius: 50%;
    }
    .unread-dot {
      position: absolute; top: 6px; right: 6px;
      width: 10px; height: 10px; border-radius: 50%;
      background: #ef4444; border: 2px solid #0f0f0f;
    }

    /* ── Panel ── */
    .chat-panel {
      position: absolute; bottom: 64px; right: 0;
      width: 440px; height: 600px;
      background: #0a0a0a; border: 1px solid #1e1e1e;
      border-radius: 16px; display: flex; flex-direction: column;
      box-shadow: 0 16px 50px rgba(0,0,0,0.7);
      overflow: hidden;
      animation: panel-in .2s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes panel-in {
      from { opacity: 0; transform: translateY(10px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }

    /* ── Header ── */
    .chat-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px; border-bottom: 1px solid #1a1a1a;
      background: #060606; flex-shrink: 0;
    }
    .chat-avatar { font-size: 1.6rem; line-height: 1; flex-shrink: 0;
      img { width: 32px; height: 32px; object-fit: contain; border-radius: 6px; } }
    .chat-header-info { flex: 1; min-width: 0; }
    .chat-title { font-size: 0.875rem; font-weight: 700; color: #fff; display: block; }
    .chat-sub { font-size: 0.6rem; color: #3f3f3f; letter-spacing: 0.02em; }
    .chat-clear {
      background: none; border: none; color: #333; cursor: pointer;
      padding: 6px; border-radius: 8px; font-size: 0.8rem;
      transition: all 0.15s; flex-shrink: 0;
      &:hover { color: #777; background: #141414; }
    }

    /* ── Messages ── */
    .chat-messages {
      flex: 1; overflow-y: auto; padding: 14px 12px;
      display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin; scrollbar-color: #1a1a1a transparent;
    }
    .chat-msg { display: flex; gap: 8px; align-items: flex-end; }
    .chat-msg.user { flex-direction: row-reverse; }
    .bot-icon { font-size: 1rem; flex-shrink: 0; margin-bottom: 2px;
      img { width: 22px; height: 22px; object-fit: contain; border-radius: 4px; } }

    .msg-bubble {
      max-width: 82%; padding: 10px 13px; border-radius: 12px;
      font-size: 0.775rem; line-height: 1.55; white-space: pre-wrap; word-break: break-word;
    }
    .user .msg-bubble {
      background: #f7b104; color: #000; font-weight: 500;
      border-bottom-right-radius: 3px;
    }
    .bot .msg-bubble {
      background: #111; color: #ddd;
      border: 1px solid #1e1e1e; border-bottom-left-radius: 3px;
      strong { color: #f7b104; font-weight: 700; }
      em { color: #aaa; font-style: italic; }
      .md-h { color: #f7b104; font-weight: 700; display: block; margin-top: 4px; }
      .md-sep { color: #333; font-size: 0.65rem; display: block; margin: 4px 0; }
      .md-step { display: block; padding-left: 4px; color: #ccc; }
      .md-bullet { display: block; padding-left: 8px; color: #ccc;
        &::before { content: ''; }
      }
    }

    /* ── Typing dots ── */
    .typing {
      display: flex; gap: 4px; padding: 10px 14px; align-items: center;
      span {
        width: 6px; height: 6px; border-radius: 50%; background: #333;
        animation: bounce 1.4s infinite;
        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.4s; }
      }
    }
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    /* ── Suggestions ── */
    .chat-suggestions {
      display: flex; flex-direction: column; gap: 5px; margin-top: 2px;
      padding-left: 32px;
    }
    .suggestion-btn {
      background: #0f0f0f; border: 1px solid #1e1e1e; border-radius: 8px;
      color: #888; font-size: 0.7rem; padding: 7px 10px;
      cursor: pointer; text-align: left; transition: all 0.15s;
      display: flex; align-items: center; gap: 6px;
      i { font-size: 0.6rem; color: #f7b104; }
      &:hover { background: #141414; border-color: #f7b104; color: #e0e0e0; }
    }

    /* ── Input ── */
    .chat-input {
      display: flex; gap: 8px; padding: 10px 12px;
      border-top: 1px solid #1a1a1a; background: #060606; flex-shrink: 0;
      input {
        flex: 1; background: #111; border: 1px solid #222;
        border-radius: 10px; color: #eee; font-size: 0.775rem;
        padding: 9px 13px; outline: none; transition: border-color 0.15s;
        &:focus { border-color: #f7b104; }
        &::placeholder { color: #333; }
        &:disabled { opacity: 0.4; }
      }
      button {
        width: 38px; height: 38px; border-radius: 10px;
        background: #f7b104; color: #000; border: none;
        cursor: pointer; display: flex; align-items: center;
        justify-content: center; font-size: 0.9rem;
        transition: all 0.15s; flex-shrink: 0;
        &:hover:not(:disabled) { background: #e0a103; }
        &:disabled { opacity: 0.25; cursor: default; }
      }
    }

    /* ── Mobile ── */
    @media (max-width: 640px) {
      :host { bottom: 16px; right: 16px; }
      .chat-panel {
        width: calc(100vw - 32px);
        height: 75vh;
        right: -8px;
        bottom: 60px;
        border-radius: 14px;
      }
    }
  `],
})
export class ChatWidgetComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly elRef = inject(ElementRef);
  private readonly messagesEl = viewChild<ElementRef>('messagesEl');
  private readonly inputEl = viewChild<ElementRef>('inputEl');

  employeeName = input<string | undefined>(undefined);

  readonly open = signal(false);
  readonly loading = signal(false);
  readonly hasUnread = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  input = '';
  private storageKey = 'chat_history_default';
  private openKey = 'chat_open_state';
  private initialized = false;

  readonly suggestions = [
    '¿Cuántos empleados activos hay hoy?',
    '¿Quién faltó hoy?',
    '¿Cómo agrego un empleado nuevo?',
    '¿Dónde veo las marcaciones de hoy?',
    '¿Cómo funciona la nómina?',
  ];

  // Close on click outside
  onDocClick(event: Event): void {
    if (this.open() && !this.elRef.nativeElement.contains(event.target)) {
      this.open.set(false);
      sessionStorage.setItem(this.openKey, 'false');
    }
  }

  // Close on Escape
  onEsc(): void {
    if (this.open()) {
      this.open.set(false);
      sessionStorage.setItem(this.openKey, 'false');
    }
  }

  ngOnInit(): void {
    // Restore open state across tab navigations
    const savedOpen = sessionStorage.getItem(this.openKey);
    if (savedOpen === 'true') {
      this.open.set(true);
      setTimeout(() => { this.scrollBottom(); this.inputEl()?.nativeElement?.focus(); }, 200);
    }

    this.auth.user$.subscribe(user => {
      if (user?.sub) {
        this.storageKey = `chat_history_${btoa(user.sub).slice(0, 16)}`;
        this.openKey = `chat_open_${btoa(user.sub).slice(0, 16)}`;
        // Restore open state with user-specific key
        const userOpen = sessionStorage.getItem(this.openKey);
        if (userOpen === 'true' && !this.open()) {
          this.open.set(true);
        }
      }
      if (!this.initialized) {
        this.initialized = true;
        this.loadOrInit();
      }
    });
  }

  private loadOrInit(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed: ChatMessage[] = JSON.parse(saved);
        if (parsed?.length > 0) {
          this.messages.set(parsed);
          if (parsed.length > 1) this.hasUnread.set(true);
          return;
        }
      }
    } catch { /* ignore */ }
    this.resetWelcome();
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.messages().slice(-40)));
    } catch { /* ignore */ }
  }

  private resetWelcome(): void {
    const name = this.employeeName();
    this.messages.set([{
      role: 'assistant',
      content: `${greeting(name)} Soy el asistente de RRHH de Black Dog Panamá.\n\nPuedo ayudarte con:\n• Datos en tiempo real: empleados, presentes, ausentes\n• Navegación paso a paso por cualquier menú\n• Nómina, horarios, marcaciones, permisos\n• Cualquier consulta de RRHH\n\n¿En qué te puedo ayudar hoy?`,
    }]);
    this.saveHistory();
  }

  toggleOpen(): void {
    const next = !this.open();
    this.open.set(next);
    sessionStorage.setItem(this.openKey, String(next));
    if (next) {
      this.hasUnread.set(false);
      setTimeout(() => { this.scrollBottom(); this.inputEl()?.nativeElement?.focus(); }, 150);
    }
  }

  clearChat(): void {
    this.resetWelcome();
    setTimeout(() => { this.scrollBottom(); this.inputEl()?.nativeElement?.focus(); }, 50);
  }

  sendSuggestion(text: string): void {
    this.input = text;
    this.send();
  }

  send(event?: Event): void {
    event?.preventDefault();
    const msg = this.input.trim();
    if (!msg || this.loading()) return;

    this.input = '';
    this.messages.update(m => [...m, { role: 'user', content: msg }]);
    this.saveHistory();
    this.loading.set(true);
    this.scrollBottom();

    const history = this.messages().slice(1, -1);

    this.http.post<{ reply: string }>('/api/chat', {
      message: msg,
      history,
      employeeName: this.employeeName(),
    }).subscribe({
      next: (res) => {
        this.messages.update(m => [...m, { role: 'assistant', content: res.reply }]);
        this.loading.set(false);
        this.saveHistory();
        this.scrollBottom();
        // Refocus input so user can keep typing
        setTimeout(() => this.inputEl()?.nativeElement?.focus(), 80);
      },
      error: () => {
        this.messages.update(m => [...m, {
          role: 'assistant',
          content: 'Hubo un error al contactar el asistente. Intenta de nuevo.',
        }]);
        this.loading.set(false);
        setTimeout(() => this.inputEl()?.nativeElement?.focus(), 80);
      },
    });
  }

  private scrollBottom(): void {
    setTimeout(() => {
      const el = this.messagesEl()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 60);
  }
}
