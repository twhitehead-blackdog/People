import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import * as OTPAuth from 'otpauth';
import { getEmployeePermission } from '../utils/permission.utils';

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
    // Cargar estado persistido
    this.loadState();

    // Monitorear actividad del usuario
    this.setupActivityMonitoring();
  }

  /**
   * Carga el estado desde localStorage
   */
  private loadState(): void {
    try {
      const savedEnabled = localStorage.getItem('sl_enabled');
      const savedLocked = localStorage.getItem('sl_locked');
      const savedTimeout = localStorage.getItem('sl_timeout');

      if (savedEnabled !== null) this.isEnabled.set(savedEnabled === 'true');
      if (savedLocked !== null) this.isLocked.set(savedLocked === 'true');
      if (savedTimeout !== null)
        this.lockTimeout.set(parseInt(savedTimeout, 10));

      console.log('[ScreenLock] State loaded', {
        enabled: this.isEnabled(),
        locked: this.isLocked(),
        timeout: this.lockTimeout(),
      });
    } catch (e) {
      console.error('[ScreenLock] Error loading state', e);
    }
  }

  /**
   * Guarda el estado actual en localStorage
   */
  private saveState(): void {
    try {
      localStorage.setItem('sl_enabled', this.isEnabled().toString());
      localStorage.setItem('sl_locked', this.isLocked().toString());
      localStorage.setItem('sl_timeout', this.lockTimeout().toString());
    } catch (e) {
      console.error('[ScreenLock] Error saving state', e);
    }
  }

  /**
   * Configura el monitoreo de actividad del usuario
   */
  private setupActivityMonitoring(): void {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
    ];

    let throttleTimer: any;

    events.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          if (!this.isLocked() && !throttleTimer) {
            throttleTimer = setTimeout(() => {
              this.lastActivity.set(new Date());
              this.resetInactivityTimer();
              throttleTimer = null;
            }, 1000);
          }
        },
        { passive: true }
      );
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
  public enable(employee: any, timeoutMinutes = 15): void {
    console.log('[ScreenLock] enable() called', {
      employeeId: employee?.id,
      timeoutMinutes,
    });
    this.isEnabled.set(true);
    if (employee) {
      this.currentEmployee.set(employee);
    }
    this.lockTimeout.set(timeoutMinutes * 60 * 1000);
    this.lastActivity.set(new Date());
    this.saveState();
    this.resetInactivityTimer();
    console.log(
      '[ScreenLock] enable() completed, isEnabled:',
      this.isEnabled()
    );
  }

  /**
   * Establece el empleado actual (usado para re-sincronizar tras reload)
   */
  public setCurrentEmployee(employee: any): void {
    if (employee) {
      this.currentEmployee.set(employee);
      console.log('[ScreenLock] currentEmployee synced', {
        employeeId: employee.id,
      });
    }
  }

  /**
   * Habilita y bloquea la pantalla inmediatamente
   */
  public enableAndLock(employee: any, timeoutMinutes = 15): void {
    this.enable(employee, timeoutMinutes);
    this.lockScreen();
  }

  /**
   * Deshabilita el bloqueo de pantalla
   */
  public disable(): void {
    console.log('[ScreenLock] disable() called');
    this.isEnabled.set(false);
    this.isLocked.set(false);
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.saveState();
    this.lastActivity.set(new Date());
    console.log(
      '[ScreenLock] disable() completed, isEnabled:',
      this.isEnabled()
    );
  }

  /**
   * Bloquea la pantalla
   */
  public lockScreen(): void {
    if (this.isEnabled()) {
      console.log('[ScreenLock] lockScreen() triggered');
      this.isLocked.set(true);
      this.saveState();
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

    console.log('[ScreenLock] unlockScreen() attempt', {
      hasEmployee: !!employee,
      hasCodeUri: !!employee?.code_uri,
      pinLength: pin?.length,
    });

    if (!employee || !employee.code_uri) {
      console.log(
        '[ScreenLock] unlockScreen() -> false (missing employee or code_uri)'
      );
      return false;
    }

    try {
      const totp = OTPAuth.URI.parse(employee.code_uri);
      const validation = totp.validate({ token: pin });

      if (validation !== null) {
        this.isLocked.set(false);
        this.saveState();
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
    console.log('[ScreenLock] canUseScreenLock() checking', {
      employee: employee?.id || employee?.work_email,
      position: employee?.position?.name,
      admin: employee?.position?.admin,
    });
    if (!employee || !employee.position) {
      console.log(
        '[ScreenLock] canUseScreenLock() -> false (no employee or position)'
      );
      return false;
    }

    const positionName = employee.position.name?.toLowerCase() || '';
    // Permitir a Gerente/Subgerente de Tienda y Admins
    const result =
      positionName.includes('gerente de tienda') ||
      positionName.includes('subgerente') ||
      getEmployeePermission(employee, 'admin');
    console.log('[ScreenLock] canUseScreenLock() ->', result, { positionName });
    return result;
  }
}
