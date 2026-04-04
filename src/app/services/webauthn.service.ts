import { inject, Injectable } from '@angular/core';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApiUrlService } from './api-url.service';

export interface FingerprintStatus {
  hasCredential: boolean;
  deviceName?: string;
}

@Injectable({ providedIn: 'root' })
export class WebAuthnService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  isSupported(): boolean {
    return browserSupportsWebAuthn();
  }

  async getCredentialStatus(employeeId: string): Promise<FingerprintStatus> {
    return firstValueFrom(
      this.http.get<FingerprintStatus>(
        this.apiUrl.build(`api/webauthn/credential-status/${employeeId}`)
      )
    );
  }

  async registerFingerprint(employeeId: string, deviceName = 'Kensington VeriMark'): Promise<void> {
    // 1. Get registration options from server (requires admin auth via interceptor)
    const options = await firstValueFrom(
      this.http.post<any>(
        this.apiUrl.build('api/webauthn/registration-options'),
        { employeeId }
      )
    );

    // 2. Trigger browser WebAuthn registration (employee places finger)
    const registrationResponse = await startRegistration({ optionsJSON: options });

    // 3. Send response to server for verification
    await firstValueFrom(
      this.http.post<{ success: boolean }>(
        this.apiUrl.build('api/webauthn/registration-verify'),
        { employeeId, deviceName, response: registrationResponse }
      )
    );
  }

  async deleteCredential(employeeId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<{ success: boolean }>(
        this.apiUrl.build(`api/webauthn/credential/${employeeId}`)
      )
    );
  }

  /** Called from the timeclock kiosk. Returns true if authentication succeeded. */
  async authenticateFingerprint(employeeId: string): Promise<boolean> {
    // 1. Get authentication options (public endpoint, no auth needed)
    const options = await firstValueFrom(
      this.http.post<any>(
        this.apiUrl.build('api/webauthn/authentication-options'),
        { employeeId }
      )
    );

    // 2. Trigger browser WebAuthn (employee places finger on reader)
    const authResponse = await startAuthentication({ optionsJSON: options });

    // 3. Verify with server
    const result = await firstValueFrom(
      this.http.post<{ success: boolean }>(
        this.apiUrl.build('api/webauthn/authentication-verify'),
        { employeeId, response: authResponse }
      )
    );

    return result.success;
  }
}
