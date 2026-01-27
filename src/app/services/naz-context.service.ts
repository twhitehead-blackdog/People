import { Injectable, signal } from '@angular/core';
import { getEnv } from '../utils/env.utils';
import { NazInvariantService } from './naz-invariant.service';

@Injectable({
  providedIn: 'root',
})
export class NazContextService {
  // Immutable signal for company ID
  private _companyId = signal<string | null>(null);
  public readonly companyId = this._companyId.asReadonly();

  constructor(private invariant: NazInvariantService) {
    this.initializeContext();
  }

  private initializeContext() {
    console.log('[NazContext] Initializing Strict Security Context...');

    const envId = getEnv('ENV_NAZ_COMPANY_ID');

    if (!envId) {
      const errorMsg =
        'CRITICAL ERROR: ENV_NAZ_COMPANY_ID is not defined. Application cannot start.';
      console.error(errorMsg);
      // Fail hard - In a real browser, this stops the app effectively if called in APP_INITIALIZER
      // We can also throw an error to trigger global error handler
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    // Initialize Invariant Service
    this.invariant.setNazId(envId);

    // Set immutable signal
    this._companyId.set(envId);

    console.log('[NazContext] Security Context Locker: ACTIVE');
    console.log(`[NazContext] ID: ${envId}`);
  }

  /**
   * Returns the ID directly. Useful for synchronous checks.
   */
  getId(): string {
    const id = this._companyId();
    if (!id) {
      // Should be unreachable if constructor ran, but safe is safe
      throw new Error('Naz Context lost or not initialized.');
    }
    return id;
  }
}
