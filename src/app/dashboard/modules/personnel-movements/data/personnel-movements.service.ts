import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { addDays, format } from 'date-fns';
import {
  Employee,
  EmployeeLateRecord,
  TimeoffData,
} from '../../../../models';
import { ApiUrlService } from '../../../../services/api-url.service';
import { OrganizationService } from '../../../../services/organization.service';
import { BranchesStore } from '../../../../stores/branches.store';
import { EmployeesStore } from '../../../../stores/employees.store';
import {
  aggregateDailyBranches,
  inferMovementsForEmployee,
} from '../utils/movement-inference.utils';
import { buildBranchHistory } from '../utils/branch-history.utils';
import {
  consolidateIncidencias,
  DisabilityRow,
} from '../utils/incidencias.utils';
import { mapMetasToBranches } from '../utils/metas-mapping.utils';
import {
  BranchHistoryEntry,
  Incidencia,
  IncidenciaType,
  MetaBranchView,
  MetaRaw,
  MovementsSummary,
  PersonnelMovement,
} from '../models/personnel-movements.model';

interface TimelogRow {
  id: string;
  employee_id: string;
  branch_id: string | null;
  punched_at: string;
  type: string;
}

interface MetasApiResponse {
  data: MetaRaw[];
  updatedAt: string;
}

type BranchWithOdoo = {
  id: string;
  name: string;
  short_name?: string;
  odoo_analytic_id?: number | null;
};

@Injectable({ providedIn: 'root' })
export class PersonnelMovementsService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);
  private employeesStore = inject(EmployeesStore);
  private branchesStore = inject(BranchesStore);

  // -------------------- Filters (writable signals) --------------------
  public readonly dateFrom = signal<Date>(this.defaultFrom());
  public readonly dateTo = signal<Date>(new Date());
  public readonly employeeId = signal<string | null>(null);
  public readonly originBranchId = signal<string | null>(null);
  public readonly destinationBranchId = signal<string | null>(null);
  public readonly currentBranchId = signal<string | null>(null);
  public readonly incidenciaType = signal<IncidenciaType | null>(null);
  public readonly movementMinDays = signal<number>(1);
  public readonly onlyMetAchieved = signal<boolean>(false);

  private defaultFrom(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }

  public resetFilters(): void {
    this.dateFrom.set(this.defaultFrom());
    this.dateTo.set(new Date());
    this.employeeId.set(null);
    this.originBranchId.set(null);
    this.destinationBranchId.set(null);
    this.currentBranchId.set(null);
    this.incidenciaType.set(null);
    this.movementMinDays.set(1);
    this.onlyMetAchieved.set(false);
  }

  // -------------------- Dedicated branches-with-odoo resource --------
  // BranchesStore doesn't include odoo_analytic_id in its query, so we
  // fetch a slim branches list here that also includes the mapping column.
  public branchesWithOdooResource = httpResource<BranchWithOdoo[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;
    const params = new HttpParams()
      .set('select', 'id,name,short_name,odoo_analytic_id')
      .set('company_id', `eq.${companyId}`)
      .set('order', 'name.asc');
    return {
      url: this.apiUrl.build('rest/v1/branches'),
      params,
    };
  });

  // -------------------- Timelogs in range ----------------------------
  public timelogsResource = httpResource<TimelogRow[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;
    const from = format(this.dateFrom(), 'yyyy-MM-dd');
    const toExclusive = format(addDays(this.dateTo(), 1), 'yyyy-MM-dd');
    const params = new HttpParams()
      .set('select', 'id,employee_id,branch_id,punched_at,type')
      .set('company_id', `eq.${companyId}`)
      .set('and', `(punched_at.gte.${from}T00:00:00-05:00,punched_at.lt.${toExclusive}T00:00:00-05:00)`)
      .set('order', 'punched_at.asc')
      .set('limit', '50000');
    return {
      url: this.apiUrl.build('rest/v1/timelogs'),
      params,
      headers: { Range: '0-49999' },
    };
  });

  // -------------------- Late records in range ------------------------
  public lateRecordsResource = httpResource<EmployeeLateRecord[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;
    const from = format(this.dateFrom(), 'yyyy-MM-dd');
    const to = format(this.dateTo(), 'yyyy-MM-dd');
    const params = new HttpParams()
      .set('select', '*')
      .set('company_id', `eq.${companyId}`)
      .set('timelog_date', `gte.${from}`)
      .append('timelog_date', `lte.${to}`)
      .set('order', 'timelog_date.desc');
    return {
      url: this.apiUrl.build('rest/v1/employee_late_records'),
      params,
    };
  });

  // -------------------- Disabilities overlapping the range -----------
  public disabilitiesResource = httpResource<DisabilityRow[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;
    const from = format(this.dateFrom(), 'yyyy-MM-dd');
    const to = format(this.dateTo(), 'yyyy-MM-dd');
    const params = new HttpParams()
      .set('select', 'id,employee_id,start_date,end_date,reason,status')
      .set('company_id', `eq.${companyId}`)
      .set('start_date', `lte.${to}`)
      .append('end_date', `gte.${from}`)
      .set('order', 'start_date.desc');
    return {
      url: this.apiUrl.build('rest/v1/employee_disabilities'),
      params,
    };
  });

  // -------------------- Unjustified timeoffs (is_approved=false) -----
  public unjustifiedTimeoffsResource = httpResource<TimeoffData[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;
    const from = format(this.dateFrom(), 'yyyy-MM-dd');
    const to = format(this.dateTo(), 'yyyy-MM-dd');
    const params = new HttpParams()
      .set('select', 'id,type_id,employee_id,date_from,date_to,is_approved,company_id')
      .set('company_id', `eq.${companyId}`)
      .set('is_approved', 'eq.false')
      .set('date_from', `lte.${to}`)
      .append('date_from', `gte.${from}`)
      .set('order', 'date_from.desc');
    return {
      url: this.apiUrl.build('rest/v1/timeoffs'),
      params,
    };
  });

  // -------------------- Metas (proxied via server.ts) ----------------
  public metasResource = httpResource<MetasApiResponse>(() => ({
    url: '/api/metas',
  }));

  // -------------------- Loading/error aggregate ----------------------
  public isLoading = computed(
    () =>
      this.timelogsResource.isLoading() ||
      this.lateRecordsResource.isLoading() ||
      this.disabilitiesResource.isLoading() ||
      this.unjustifiedTimeoffsResource.isLoading() ||
      this.branchesWithOdooResource.isLoading(),
  );

  // -------------------- Derived: branch name map ---------------------
  public branchNameMap = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const b of this.branchesStore.entities()) {
      map.set(b.id, b.name);
    }
    return map;
  });

  // -------------------- Derived: employees map -----------------------
  private employeesById = computed<Map<string, Employee>>(() => {
    const map = new Map<string, Employee>();
    for (const e of this.employeesStore.employeesList()) map.set(e.id, e as Employee);
    return map;
  });

  // -------------------- Derived: movements (all, unfiltered) ---------
  public movementsAll = computed<PersonnelMovement[]>(() => {
    const timelogs = this.timelogsResource.value() ?? [];
    if (timelogs.length === 0) return [];
    const dailyMap = aggregateDailyBranches(timelogs);
    const minDays = this.movementMinDays();
    const branchMap = this.branchNameMap();
    const results: PersonnelMovement[] = [];
    for (const e of this.employeesStore.employeesList()) {
      const daily = dailyMap.get(e.id);
      if (!daily || daily.length === 0) continue;
      results.push(...inferMovementsForEmployee(e as Employee, daily, branchMap, minDays));
    }
    results.sort((a, b) => b.startDate.localeCompare(a.startDate));
    return results;
  });

  // -------------------- Derived: history for selected employee -------
  public historyForSelected = computed<BranchHistoryEntry[]>(() => {
    const empId = this.employeeId();
    if (!empId) return [];
    const timelogs = this.timelogsResource.value() ?? [];
    const daily = aggregateDailyBranches(timelogs).get(empId);
    if (!daily) return [];
    const emp = this.employeesById().get(empId);
    if (!emp) return [];
    return buildBranchHistory(emp, daily, this.branchNameMap());
  });

  /** History for ALL employees — used only for the Excel export. */
  public historyAll = computed<BranchHistoryEntry[]>(() => {
    const timelogs = this.timelogsResource.value() ?? [];
    if (timelogs.length === 0) return [];
    const dailyMap = aggregateDailyBranches(timelogs);
    const branchMap = this.branchNameMap();
    const rows: BranchHistoryEntry[] = [];
    for (const e of this.employeesStore.employeesList()) {
      const daily = dailyMap.get(e.id);
      if (!daily) continue;
      rows.push(...buildBranchHistory(e as Employee, daily, branchMap));
    }
    rows.sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName) || a.startDate.localeCompare(b.startDate),
    );
    return rows;
  });

  // -------------------- Derived: incidencias -------------------------
  public incidenciasAll = computed<Incidencia[]>(() =>
    consolidateIncidencias(
      this.lateRecordsResource.value() ?? [],
      this.disabilitiesResource.value() ?? [],
      this.unjustifiedTimeoffsResource.value() ?? [],
      this.employeesById(),
      this.branchNameMap(),
    ),
  );

  // -------------------- Derived: metas enriched ----------------------
  public metasEnriched = computed<MetaBranchView[]>(() => {
    const metas = this.metasResource.value()?.data ?? [];
    const branches = this.branchesWithOdooResource.value() ?? [];
    return mapMetasToBranches(
      metas,
      branches,
      this.employeesStore.employeesList() as Employee[],
      this.movementsAll(),
    );
  });

  // -------------------- Derived: summary -----------------------------
  public summary = computed<MovementsSummary>(() => {
    const movements = this.movementsAll();
    const incidencias = this.incidenciasAll();
    const branches = this.branchesStore.entities();
    const metas = this.metasEnriched();
    const employees = this.employeesStore.activeEmployees();

    const perBranch = new Map<
      string,
      { branchId: string; branchName: string; movementsOut: number; movementsIn: number; incidencias: number; personnelCount: number }
    >();
    for (const b of branches) {
      perBranch.set(b.id, {
        branchId: b.id,
        branchName: b.name,
        movementsOut: 0,
        movementsIn: 0,
        incidencias: 0,
        personnelCount: 0,
      });
    }
    for (const e of employees) {
      if (!e.branch_id) continue;
      const slot = perBranch.get(e.branch_id);
      if (slot) slot.personnelCount += 1;
    }
    for (const m of movements) {
      if (m.originBranchId) {
        const slot = perBranch.get(m.originBranchId);
        if (slot) slot.movementsOut += 1;
      }
      if (m.destinationBranchId) {
        const slot = perBranch.get(m.destinationBranchId);
        if (slot) slot.movementsIn += 1;
      }
    }
    for (const i of incidencias) {
      if (i.branchId) {
        const slot = perBranch.get(i.branchId);
        if (slot) slot.incidencias += 1;
      }
    }

    const employeesMoved = new Set(movements.map((m) => m.employeeId)).size;
    const branchesWithMetaAchieved = metas.filter((m) => m.achievedTier !== null).length;

    return {
      totalMovements: movements.length,
      totalIncidencias: incidencias.length,
      employeesMoved,
      branchesWithMetaAchieved,
      perBranch: Array.from(perBranch.values()).sort((a, b) =>
        a.branchName.localeCompare(b.branchName),
      ),
    };
  });

  public reloadAll(): void {
    this.timelogsResource.reload();
    this.lateRecordsResource.reload();
    this.disabilitiesResource.reload();
    this.unjustifiedTimeoffsResource.reload();
    this.branchesWithOdooResource.reload();
    this.metasResource.reload();
  }
}
