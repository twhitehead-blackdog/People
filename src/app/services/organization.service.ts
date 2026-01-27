import { computed, inject, Injectable } from '@angular/core';
import { NazContextService } from './naz-context.service';
import { NazInvariantService } from './naz-invariant.service';

/**
 * STRICTLY NAZ-ONLY
 * Refactored to forbid any multi-tenant switching.
 */
export type Organization = 'naz'; // Removed 'blackdog'

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private nazContext = inject(NazContextService);
  private invariant = inject(NazInvariantService);

  // === IMMUTABLE SIGNALS ===

  // Always true for Naz
  public isNaz = computed(() => true);

  // Always false for anything else. Legacy support.
  public isBlackDog = computed(() => false);

  // === GETTERS ===

  public get currentOrganization(): Organization {
    return 'naz';
  }

  public getCurrentCompanyId(): string {
    return this.nazContext.getId();
  }

  /**
   * @deprecated Used for legacy reactivity. Always returns Naz ID.
   */
  public get currentCompanyId$() {
    return this.nazContext.companyId;
  }

  public get currentOrganization$() {
    // Mock signal to satisfy interface if needed, or return static signal
    return computed(() => 'naz' as Organization);
  }

  // === NO-OPS / THROWERS for Legacy Methods ===

  constructor() {
    console.log('[OrganizationService] Enforcing Single-Tenant Mode (NAZ).');
  }

  setOrganization(org: any): void {
    console.warn('[Security] Attempt to switch organization blocked.');
    this.invariant.assertNazContext({ organization: org }, 'SwitchOrgAttempt');
  }

  /**
   * Legacy method for waiting IDs. Now resolves immediately as we Fail-Hard on startup.
   */
  public async waitForCompanyIds(): Promise<void> {
    return Promise.resolve();
  }

  // Helpers for migration compatibility
  public getNazCompanyId(): string {
    return this.nazContext.getId();
  }

  public getBlackdogCompanyId(): string | null {
    return null; // Does not exist in this context
  }
}
