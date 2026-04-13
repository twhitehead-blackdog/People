import { Employee } from '../../../../models';
import {
  MetaBranchView,
  MetaRaw,
  PersonnelMovement,
} from '../models/personnel-movements.model';

export interface BranchWithOdoo {
  id: string;
  name: string;
  short_name?: string;
  odoo_analytic_id?: number | null;
}

/** Determine the highest tier achieved (percentage >= 100) per meta record. */
function highestAchievedTier(
  m: MetaRaw,
): { tier: MetaBranchView['achievedTier']; pct: number } {
  const tiers: { key: MetaBranchView['achievedTier']; pct: number }[] = [
    { key: 'oro', pct: m.porcentajeOro ?? 0 },
    { key: 'alta', pct: m.porcentajeAlta ?? 0 },
    { key: 'promedio', pct: m.porcentajePromedio ?? 0 },
    { key: 'baja', pct: m.porcentajeBaja ?? 0 },
  ];
  for (const t of tiers) {
    if ((t.pct ?? 0) >= 100) return { tier: t.key, pct: t.pct };
  }
  // None reached — return the highest percentage value for display.
  const maxPct = Math.max(
    m.porcentajeOro ?? 0,
    m.porcentajeAlta ?? 0,
    m.porcentajePromedio ?? 0,
    m.porcentajeBaja ?? 0,
  );
  return { tier: null, pct: maxPct };
}

/**
 * Map metas (Odoo) to branches (Supabase) via branches.odoo_analytic_id,
 * enrich with personnel (by employee.branch_id === branch.id) and movement
 * counts for the current period.
 */
export function mapMetasToBranches(
  metas: MetaRaw[],
  branches: BranchWithOdoo[],
  employees: Pick<Employee, 'id' | 'first_name' | 'father_name' | 'branch_id' | 'is_active'>[],
  movements: PersonnelMovement[],
): MetaBranchView[] {
  const branchByAnalytic = new Map<number, { id: string; name: string }>();
  for (const b of branches) {
    if (b.odoo_analytic_id != null) {
      branchByAnalytic.set(b.odoo_analytic_id, { id: b.id, name: b.name });
    }
  }

  const personnelByBranch = new Map<string, { employeeId: string; employeeName: string }[]>();
  for (const e of employees) {
    if (!e.is_active || !e.branch_id) continue;
    const list = personnelByBranch.get(e.branch_id) ?? [];
    list.push({
      employeeId: e.id,
      employeeName: `${e.first_name} ${e.father_name}`.trim(),
    });
    personnelByBranch.set(e.branch_id, list);
  }

  const movementsInOrOutByBranch = new Map<string, number>();
  for (const m of movements) {
    if (m.originBranchId) {
      movementsInOrOutByBranch.set(
        m.originBranchId,
        (movementsInOrOutByBranch.get(m.originBranchId) ?? 0) + 1,
      );
    }
    if (m.destinationBranchId && m.destinationBranchId !== m.originBranchId) {
      movementsInOrOutByBranch.set(
        m.destinationBranchId,
        (movementsInOrOutByBranch.get(m.destinationBranchId) ?? 0) + 1,
      );
    }
  }

  return metas.map((m) => {
    const mapped = branchByAnalytic.get(m.analyticAccountId);
    const branchId = mapped?.id ?? null;
    const branchName = mapped?.name ?? m.odooName;
    const { tier, pct } = highestAchievedTier(m);
    return {
      analyticAccountId: m.analyticAccountId,
      odooName: m.odooName,
      branchId,
      branchName,
      achievedTier: tier,
      topPercentage: Math.round(pct * 100) / 100,
      ventasActuales: m.ventasActuales ?? 0,
      estadoGeneral: m.estadoGeneral ?? '',
      personnel: branchId ? personnelByBranch.get(branchId) ?? [] : [],
      movementsCount: branchId ? movementsInOrOutByBranch.get(branchId) ?? 0 : 0,
    };
  });
}
