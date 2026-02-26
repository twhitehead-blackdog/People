/**
 * Logger seguro para producción
 * Oculta información sensible cuando NODE_ENV === 'production'
 */

import { getEnv } from './env.utils';

const isDevelopment = getEnv('NODE_ENV') !== 'production';
const isProduction = !isDevelopment;

/**
 * Logger que solo muestra información sensible en desarrollo
 */
export const logger = {
  /**
   * Log de información general (solo en desarrollo)
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log de advertencias (siempre visible, pero sin datos sensibles)
   */
  warn: (message: string, ...args: any[]): void => {
    if (isProduction) {
      // En producción, solo mostrar el mensaje sin datos sensibles
      console.warn(message);
    } else {
      console.warn(message, ...args);
    }
  },

  /**
   * Log de errores (siempre visible, pero sin detalles sensibles en producción)
   */
  error: (message: string, error?: any): void => {
    if (isProduction) {
      // En producción, solo mostrar el mensaje genérico
      console.error(message);
      if (error && error.message) {
        console.error('Error:', error.message);
      }
    } else {
      // En desarrollo, mostrar todo
      console.error(message, error);
    }
  },

  /**
   * Log de información de debug (solo en desarrollo)
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log seguro de datos sensibles (nunca muestra datos completos)
   */
  safeLog: (message: string, data?: Record<string, any>): void => {
    if (isDevelopment && data) {
      // En desarrollo, mostrar datos parcialmente ocultos
      const safeData = Object.keys(data).reduce((acc, key) => {
        const value = data[key];
        if (typeof value === 'string' && value.length > 3) {
          acc[key] = `${value.substring(0, 3)}***`;
        } else if (typeof value === 'object' && value !== null) {
          acc[key] = '[Object]';
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      console.log(message, safeData);
    } else if (isProduction) {
      // En producción, solo el mensaje
      console.log(message);
    }
  },
};
