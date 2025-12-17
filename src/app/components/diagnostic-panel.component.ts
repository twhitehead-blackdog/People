import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ScrollPanel } from 'primeng/scrollpanel';
import { Tag } from 'primeng/tag';
import { Subject, takeUntil } from 'rxjs';
import { DiagnosticService, DiagnosticError } from '../services/diagnostic.service';

@Component({
  selector: 'pt-diagnostic-panel',
  standalone: true,
  imports: [CommonModule, Card, Button, ScrollPanel, Tag],
  template: `
    @if (isVisible) {
      <div
        class="fixed bottom-4 right-4 z-[9999] w-full max-w-2xl max-h-[80vh] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl"
        style="box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);"
      >
        <div class="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <div class="flex items-center gap-3">
            <h3 class="text-white font-bold text-lg">🔍 Diagnóstico de Errores</h3>
            <p-tag
              [value]="errorCount.toString()"
              severity="danger"
              [rounded]="true"
            />
          </div>
          <div class="flex items-center gap-2">
            <p-button
              icon="pi pi-bug"
              [text]="true"
              [rounded]="true"
              severity="secondary"
              (click)="testErrorCapture()"
              title="Probar captura de errores"
            />
            <p-button
              icon="pi pi-refresh"
              [text]="true"
              [rounded]="true"
              severity="secondary"
              (click)="checkServices()"
              title="Verificar servicios"
            />
            <p-button
              icon="pi pi-trash"
              [text]="true"
              [rounded]="true"
              severity="secondary"
              (click)="clearErrors()"
              title="Limpiar errores"
            />
            <p-button
              icon="pi pi-times"
              [text]="true"
              [rounded]="true"
              severity="secondary"
              (click)="close()"
              title="Cerrar"
            />
          </div>
        </div>

        <p-scrollPanel [style]="{ width: '100%', height: 'calc(80vh - 120px)' }">
          <div class="p-4 space-y-3">
            @if (errors.length === 0) {
              <div class="text-center py-8 text-gray-400">
                <i class="pi pi-check-circle text-4xl mb-2"></i>
                <p>No hay errores registrados</p>
              </div>
            } @else {
              @for (error of errors; track error.id) {
                <div
                  class="bg-gray-800 border-l-4 rounded p-3"
                  [ngClass]="{
                    'border-red-500': error.type === 'http' || error.type === 'network',
                    'border-yellow-500': error.type === 'console' || error.type === 'auth',
                    'border-blue-500': error.type === 'supabase',
                    'border-gray-500': error.type === 'other'
                  }"
                >
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <p-tag
                          [value]="error.type.toUpperCase()"
                          [severity]="getSeverity(error.type)"
                          [rounded]="true"
                          styleClass="text-xs"
                        />
                        <span class="text-xs text-gray-400">
                          {{ error.timestamp | date: 'HH:mm:ss' }}
                        </span>
                      </div>
                      <p class="text-white text-sm font-medium mb-1">
                        {{ error.message }}
                      </p>
                      @if (error.url) {
                        <p class="text-xs text-gray-400 mb-1 break-all">
                          <i class="pi pi-link mr-1"></i>
                          {{ error.url }}
                        </p>
                      }
                      @if (error.status) {
                        <p class="text-xs text-gray-400">
                          Status: <span class="font-mono">{{ error.status }}</span>
                        </p>
                      }
                    </div>
                  </div>
                  @if (error.details) {
                    <details class="mt-2">
                      <summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                        Ver detalles
                      </summary>
                      <pre class="mt-2 p-2 bg-gray-900 rounded text-xs text-gray-300 overflow-auto max-h-40">{{
                        formatDetails(error.details)
                      }}</pre>
                    </details>
                  }
                </div>
              }
            }
          </div>
        </p-scrollPanel>

        <div class="p-3 border-t border-gray-700 bg-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div class="flex items-center gap-4">
            <span>HTTP: {{ getErrorCount('http') }}</span>
            <span>Console: {{ getErrorCount('console') }}</span>
            <span>Network: {{ getErrorCount('network') }}</span>
            <span>Auth: {{ getErrorCount('auth') }}</span>
            <span>Supabase: {{ getErrorCount('supabase') }}</span>
          </div>
          <div>
            <span>Presiona <kbd class="px-1 py-0.5 bg-gray-700 rounded">Ctrl+Shift+D</kbd> para abrir/cerrar</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    kbd {
      font-family: monospace;
      font-size: 0.75rem;
    }
  `],
})
export class DiagnosticPanelComponent implements OnInit, OnDestroy {
  private diagnosticService = inject(DiagnosticService);
  private destroy$ = new Subject<void>();

  isVisible = false;
  errors: DiagnosticError[] = [];
  errorCount = 0;
  serviceStatus = {
    supabase: false,
    backend: false,
    auth0: false,
  };

  ngOnInit(): void {
    // Suscribirse a cambios de visibilidad
    this.diagnosticService.isVisible$
      .pipe(takeUntil(this.destroy$))
      .subscribe(visible => {
        this.isVisible = visible;
      });

    // Suscribirse a errores
    this.diagnosticService.errors$
      .pipe(takeUntil(this.destroy$))
      .subscribe(errors => {
        this.errors = errors;
        this.errorCount = errors.length;
      });

    // Agregar listener de teclado
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyPress);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyPress);
    }
  }

  private handleKeyPress = (event: KeyboardEvent): void => {
    // Ctrl+Shift+D para abrir/cerrar
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      this.diagnosticService.toggleVisibility();
    }
  };

  close(): void {
    this.diagnosticService.hide();
  }

  clearErrors(): void {
    this.diagnosticService.clearErrors();
  }

  async checkServices(): Promise<void> {
    this.serviceStatus = await this.diagnosticService.checkServices();
  }

  testErrorCapture(): void {
    // Probar captura de diferentes tipos de errores
    this.diagnosticService.addHttpError(
      'https://test.example.com/api/test',
      404,
      'Test: Error HTTP 404',
      { test: true }
    );
    this.diagnosticService.addNetworkError(
      'https://test.example.com/api/test',
      'Test: Error de red',
      { test: true }
    );
    this.diagnosticService.addSupabaseError(
      'Test: Error de Supabase',
      'https://test.supabase.co/rest/v1/test',
      { test: true }
    );
    this.diagnosticService.addAuthError(
      'Test: Error de Auth0',
      { test: true }
    );
    this.diagnosticService.addConsoleError(
      'Test: Error de consola',
      { test: true },
      'Test stack trace'
    );
  }

  getErrorCount(type: DiagnosticError['type']): number {
    return this.errors.filter(e => e.type === type).length;
  }

  getSeverity(type: DiagnosticError['type']): 'success' | 'info' | 'warn' | 'danger' {
    switch (type) {
      case 'http':
      case 'network':
        return 'danger';
      case 'auth':
      case 'console':
        return 'warn';
      case 'supabase':
        return 'info';
      default:
        return 'info';
    }
  }

  formatDetails(details: any): string {
    if (typeof details === 'string') {
      return details;
    }
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }
}

