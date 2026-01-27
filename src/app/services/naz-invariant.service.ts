import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NazInvariantService {
  private _nazCompanyId: string | null = null;

  constructor() {}

  /**
   * Sets the authoritative Naz Company ID.
   * Can only be set once by NazContextService.
   */
  setNazId(id: string) {
    if (this._nazCompanyId && this._nazCompanyId !== id) {
      throw new Error(
        'CRITICAL: Attempted to overwrite immutable NAZ ID. Security breach suspected.'
      );
    }
    this._nazCompanyId = id;
  }

  getNazIdOrThrow(): string {
    if (!this._nazCompanyId) {
      throw new Error(
        'CRITICAL: NAZ Context not initialized. Check Env Variables.'
      );
    }
    return this._nazCompanyId;
  }

  /**
   * Targeted assertion for Domain Objects.
   * Checks if `company_id` matches the expected Naz scope.
   */
  assertNazContext(
    data: any,
    context: string = 'Unknown',
    depth: number = 0
  ): void {
    if (!data || typeof data !== 'object' || depth > 3) return;

    // Direct check
    if ('company_id' in data) {
      const id = data.company_id;
      if (id && id !== this.getNazIdOrThrow()) {
        throw new Error(
          `SECURITY VIOLATION [${context}]: Found data with foreign company_id: ${id}. Expected: ${this._nazCompanyId}`
        );
      }
    }

    // Recursive check for Arrays
    if (Array.isArray(data)) {
      data.forEach((item, index) =>
        this.assertNazContext(item, `${context}[${index}]`, depth + 1)
      );
      return;
    }

    // Targeted Recursive check for specific objects (Optimization)
    // Only drill down into known containers or generic responses
    const keysToCheck = ['data', 'items', 'employee', 'schedule', 'timelog'];
    keysToCheck.forEach((key) => {
      if (key in data) {
        this.assertNazContext(data[key], `${context}.${key}`, depth + 1);
      }
    });
  }
}
