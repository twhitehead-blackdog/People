import { inject, Injectable } from '@angular/core';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { getEnv } from '../utils/env.utils';

export interface CredentialDevice {
  id: string;
  credential_id: string;
  device_name: string;
  registered_by: string;
  created_at: string;
}

export interface FingerprintStatus {
  hasCredential: boolean;
  deviceName?: string;
  credentials: CredentialDevice[];
}



@Injectable({ providedIn: 'root' })
export class WebAuthnService {
  private http = inject(HttpClient);

  // WebAuthn endpoints live on the Express server (same origin as the app),
  // NOT on Supabase. Use window.location.origin to always point to the right host.
  private get base(): string {
    if (typeof window !== 'undefined') return window.location.origin;
    return (getEnv('ENV_APP_URL') || 'http://localhost:4200').replace(/\/$/, '');
  }

  private url(path: string): string {
    return `${this.base}/${path}`;
  }

  isSupported(): boolean {
    return browserSupportsWebAuthn();
  }

  async getCredentialStatus(employeeId: string): Promise<FingerprintStatus> {
    return firstValueFrom(
      this.http.get<FingerprintStatus>(this.url(`api/webauthn/credential-status/${employeeId}`))
    );
  }

  async registerFingerprint(employeeId: string, deviceName = 'WebAuthn'): Promise<void> {
    const options = await firstValueFrom(
      this.http.post<any>(this.url('api/webauthn/registration-options'), { employeeId })
    );
    const registrationResponse = await startRegistration({ optionsJSON: options });
    await firstValueFrom(
      this.http.post<{ success: boolean }>(
        this.url('api/webauthn/registration-verify'),
        { employeeId, deviceName, response: registrationResponse }
      )
    );
  }

  async deleteCredential(employeeId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<{ success: boolean }>(this.url(`api/webauthn/credential/${employeeId}`))
    );
  }

  async deleteSingleCredential(credentialDbId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<{ success: boolean }>(this.url(`api/webauthn/credential-single/${credentialDbId}`))
    );
  }

  /** Self-service registration from any device (public endpoint, no admin auth needed). */
  async registerFingerprintSelf(employeeId: string, deviceName?: string): Promise<void> {
    const options = await firstValueFrom(
      this.http.post<any>(this.url('api/webauthn/registration-options-self'), { employeeId })
    );
    const registrationResponse = await startRegistration({ optionsJSON: options });
    await firstValueFrom(
      this.http.post<{ success: boolean }>(
        this.url('api/webauthn/registration-verify-self'),
        { employeeId, deviceName, response: registrationResponse }
      )
    );
  }

  /** Called from the timeclock kiosk. Returns true if authentication succeeded. */
  async authenticateFingerprint(employeeId: string): Promise<boolean> {
    const options = await firstValueFrom(
      this.http.post<any>(this.url('api/webauthn/authentication-options'), { employeeId })
    );
    const authResponse = await startAuthentication({ optionsJSON: options });
    const result = await firstValueFrom(
      this.http.post<{ success: boolean }>(
        this.url('api/webauthn/authentication-verify'),
        { employeeId, response: authResponse }
      )
    );
    return result.success;
  }
}
