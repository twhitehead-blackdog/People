/**
 * Persistencia de "Vistas" (combinaciones de filtros guardadas) en
 * localStorage. Sin tocar Supabase para mantener riesgo bajo.
 */

export interface TimelogSavedView {
  id: string;
  name: string;
  createdAt: string;  // ISO
  filters: TimelogSavedViewFilters;
}

export interface TimelogSavedViewFilters {
  /** Si es null, usar el default del componente al cargar (mes actual). */
  dateRange: { start: string; end: string } | null;
  employeeId?: string;
  branchId?: string;
  employeeSearch?: string;
  onlyDelayed: boolean;
  onlyErrors: boolean;
  onlyEarlyExit: boolean;
  onlyLunchExceeded: boolean;
  onlyWithMarcaciones: boolean;
  onlyProblems: boolean;
  delayRange?: string | null;
  lunchExceededRange?: string | null;
  delayToleranceMinutes?: number;
}

const STORAGE_KEY = 'timelogs-saved-views';
const MAX_VIEWS = 20;

export function loadSavedViews(): TimelogSavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidView);
  } catch {
    return [];
  }
}

export function saveSavedViews(views: TimelogSavedView[]): void {
  try {
    const trimmed = views.slice(0, MAX_VIEWS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* full / disabled localStorage, ignorar */
  }
}

export function addView(view: TimelogSavedView): TimelogSavedView[] {
  const all = loadSavedViews();
  // Si ya existe una con el mismo nombre, la reemplaza (idempotente)
  const filtered = all.filter((v) => v.name.trim() !== view.name.trim());
  const next = [view, ...filtered].slice(0, MAX_VIEWS);
  saveSavedViews(next);
  return next;
}

export function removeView(id: string): TimelogSavedView[] {
  const all = loadSavedViews();
  const next = all.filter((v) => v.id !== id);
  saveSavedViews(next);
  return next;
}

function isValidView(x: any): x is TimelogSavedView {
  return (
    x &&
    typeof x === 'object' &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.createdAt === 'string' &&
    typeof x.filters === 'object'
  );
}

export function generateViewId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
