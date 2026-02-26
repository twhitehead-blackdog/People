import { Injectable, isDevMode } from '@angular/core';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private currentLogLevel: LogLevel = isDevMode() ? LogLevel.DEBUG : LogLevel.ERROR;

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, error?: any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${message}`, error, ...args);
      // En producción, aquí se podría enviar a un servicio externo como Sentry
      // if (!isDevMode() && error) {
      //   this.sendToErrorTracking(message, error);
      // }
    }
  }

  // Método para integrar con servicios de error tracking (Sentry, etc)
  // private sendToErrorTracking(message: string, error: any): void {
  //   // Implementación futura
  // }
}




