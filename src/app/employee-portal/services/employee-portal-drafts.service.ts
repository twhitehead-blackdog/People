import { Injectable } from '@angular/core';

const PREFIX = 'ep_draft_';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface DraftEntry {
  data: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class EmployeePortalDraftsService {
  /**
   * Saves a draft to localStorage with debounce-safe namespaced key.
   */
  saveDraft(key: string, data: any): void {
    const entry: DraftEntry = {
      data,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // localStorage full or unavailable - silently fail
    }
  }

  /**
   * Loads a draft from localStorage. Returns null if expired or not found.
   */
  loadDraft<T = any>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;

      const entry: DraftEntry = JSON.parse(raw);

      // Check expiry
      if (Date.now() - entry.timestamp > MAX_AGE_MS) {
        this.clearDraft(key);
        return null;
      }

      return entry.data as T;
    } catch {
      return null;
    }
  }

  /**
   * Clears a specific draft.
   */
  clearDraft(key: string): void {
    localStorage.removeItem(PREFIX + key);
  }

  /**
   * Checks if a valid (non-expired) draft exists.
   */
  hasDraft(key: string): boolean {
    return this.loadDraft(key) !== null;
  }

  /**
   * Clears all expired drafts (housekeeping).
   */
  clearExpired(): void {
    const now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (!fullKey?.startsWith(PREFIX)) continue;

      try {
        const raw = localStorage.getItem(fullKey);
        if (!raw) continue;
        const entry: DraftEntry = JSON.parse(raw);
        if (now - entry.timestamp > MAX_AGE_MS) {
          localStorage.removeItem(fullKey);
        }
      } catch {
        // Corrupted entry - remove it
        if (fullKey) localStorage.removeItem(fullKey);
      }
    }
  }
}
