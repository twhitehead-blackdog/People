import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private readonly DEVICE_ID_KEY = 'naz_device_id';
  private readonly KIOSK_TOKEN_KEY = 'naz_kiosk_token';

  // Signals for reactive UI
  public deviceId = signal<string | null>(null);
  public isKioskAuthorized = signal<boolean>(false);

  constructor() {
    this.initializeDevice();
  }

  private initializeDevice() {
    // 1. Load or Generate Device UUID
    let id = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(this.DEVICE_ID_KEY, id);
    }
    this.deviceId.set(id);

    // 2. Check Existing Token
    const token = localStorage.getItem(this.KIOSK_TOKEN_KEY);
    this.isKioskAuthorized.set(!!token);
    // TODO: Add validateToken() to check expiry against backend
  }

  public getDeviceId(): string {
    return this.deviceId()!; // Guaranteed by constructor
  }

  /**
   * Enrollment Logic (Mocked Backend Handshake)
   */
  public registerDevice(enrollmentCode: string): boolean {
    // Mock Validation: simple '123456' for now
    if (enrollmentCode === '123456') {
      const mockToken = `kiosk_token_${Date.now()}_${crypto.randomUUID()}`;
      localStorage.setItem(this.KIOSK_TOKEN_KEY, mockToken);
      this.isKioskAuthorized.set(true);
      return true;
    }
    return false;
  }

  /**
   * Admin Exit Logic
   */
  public exitKiosk(adminPin: string): boolean {
    // Mock Validation: Admin PIN '9999'
    if (adminPin === '9999') {
      localStorage.removeItem(this.KIOSK_TOKEN_KEY);
      this.isKioskAuthorized.set(false);
      // Audit Log would go here
      return true;
    }
    return false;
  }
}
