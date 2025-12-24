import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as OTPAuth from 'otpauth';

@Injectable({
  providedIn: 'root',
})
export class ScreenLockService {
  private http = inject(HttpClient);
  
  // Estado del bloqueo
  public isLocked = signal<boolean>(false);
  public isEnabled = signal<boolean>(false);
  public lockTimeout = signal<number>(15 * 60 * 1000); // 15 minutos por defecto
  
  // Empleado actual para validar PIN
  private currentEmployee = signal<any>(null);
  
  // Timer de inactividad
  private inactivityTimer: any = null;
  private lastActivity = signal<Date>(new Date());
  
  constructor() {
    // Monitorear actividad del usuario
    this.setupActivityMonitoring();
  }
  
  /**
   * Configura el monitoreo de actividad del usuario
   */
  private setupActivityMonitoring(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        if (!this.isLocked()) {
          this.lastActivity.set(new Date());
          this.resetInactivityTimer();
        }
      }, { passive: true });
    });
  }
  
  /**
   * Reinicia el timer de inactividad
   */
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    if (this.isEnabled() && !this.isLocked()) {
      this.inactivityTimer = setTimeout(() => {
        this.lockScreen();
      }, this.lockTimeout());
    }
  }
  
  /**
   * Habilita el bloqueo de pantalla
   */
  public enable(employee: any, timeoutMinutes: number = 15): void {
    this.isEnabled.set(true);
    this.currentEmployee.set(employee);
    this.lockTimeout.set(timeoutMinutes * 60 * 1000);
    this.lastActivity.set(new Date());
    this.resetInactivityTimer();
  }
  
  /**
   * Deshabilita el bloqueo de pantalla
   */
  public disable(): void {
    this.isEnabled.set(false);
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.unlockScreen();
  }
  
  /**
   * Bloquea la pantalla
   */
  public lockScreen(): void {
    if (this.isEnabled()) {
      this.isLocked.set(true);
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }
    }
  }
  
  /**
   * Desbloquea la pantalla con PIN del autenticador
   */
  public async unlockScreen(pin: string): Promise<boolean> {
    const employee = this.currentEmployee();
    
    if (!employee || !employee.code_uri) {
      return false;
    }
    
    try {
      const totp = OTPAuth.URI.parse(employee.code_uri);
      const validation = totp.validate({ token: pin });
      
      if (validation !== null) {
        this.isLocked.set(false);
        this.lastActivity.set(new Date());
        this.resetInactivityTimer();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error validando PIN:', error);
      return false;
    }
  }
  
  /**
   * Verifica si el usuario puede usar el bloqueo de pantalla
   */
  public canUseScreenLock(employee: any): boolean {
    if (!employee || !employee.position) {
      return false;
    }
    
    const positionName = employee.position.name?.toLowerCase() || '';
    // Permitir a Gerente de Tienda y Admins
    return positionName.includes('gerente de tienda') || employee.position?.admin === true;
  }
}

