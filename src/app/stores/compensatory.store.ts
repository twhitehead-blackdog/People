import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

export interface CompensatoryRequest {
  id: string;
  employee_id: string;
  company_id?: string;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    work_email: string;
    position?: { name: string };
    branch?: { name: string };
  };
  date_from: string;
  date_to: string;
  hours?: number;
  reason?: string;
  compensatory_type?: 'hours' | 'days';
  compensatory_amount?: number;
  review_status?: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  registered_by?: string;
  registered_at?: string;
  rejection_comment?: string;
  is_approved: boolean;
  created_at: string;
  notes?: string[] | string;
  // Campos para documento físico
  physical_document_path?: string;
  physical_document_name?: string;
  physical_document_uploaded_at?: string;
}

type State = {
  requests: CompensatoryRequest[];
  selectedRequest: CompensatoryRequest | null;
  loading: boolean;
  searchText: string;
  selectedStatus: string | null;
  dateRange: Date[] | null;
  showFilters: boolean;
  employeeOvertimeHours: number;
  employeeOvertimeDays: Array<{
    day: string;
    overtimeHours: number;
    entryTime?: string;
    exitTime?: string;
    totalHours?: number;
  }>;
  isLoadingOvertimeHours: boolean;
};

const initialState: State = {
  requests: [],
  selectedRequest: null,
  loading: false,
  searchText: '',
  selectedStatus: null,
  dateRange: null,
  showFilters: false,
  employeeOvertimeHours: 0,
  employeeOvertimeDays: [],
  isLoadingOvertimeHours: false,
};

export const CompensatoryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    // Solicitudes filtradas (lógica básica sin dependencias del service)
    filteredRequests: computed(() => {
      let requests = store.requests();

      // Filtro por búsqueda básico (solo campos directos)
      const search = store.searchText().toLowerCase();
      if (search) {
        requests = requests.filter((r) => {
          const employeeName = r.employee ? `${r.employee.first_name || ''} ${r.employee.father_name || ''}`.toLowerCase() : '';
          const email = r.employee?.work_email?.toLowerCase() || '';
          const reason = r.reason?.toLowerCase() || '';
          return (
            employeeName.includes(search) ||
            email.includes(search) ||
            reason.includes(search)
          );
        });
      }

      // Filtro por estado
      const status = store.selectedStatus();
      if (status) {
        if (status === 'pending') {
          requests = requests.filter(
            (r) =>
              r.review_status === 'pending' ||
              (!r.review_status && !r.is_approved)
          );
        } else if (status === 'approved') {
          requests = requests.filter((r) => r.is_approved === true);
        } else if (status === 'rejected') {
          requests = requests.filter(
            (r) => r.review_status === 'rejected' || r.rejection_comment
          );
        }
      }

      // Filtro por rango de fechas
      const dateRange = store.dateRange();
      if (dateRange && dateRange.length === 2) {
        const startDate = dateRange[0];
        const endDate = dateRange[1];
        requests = requests.filter((r) => {
          const requestStart = new Date(r.date_from);
          return requestStart >= startDate && requestStart <= endDate;
        });
      }

      return requests;
    }),

    // Estadísticas
    totalCount: computed(() => store.requests().length),
    pendingCount: computed(() =>
      store.requests().filter(
        (r) =>
          r.review_status === 'pending' ||
          (!r.review_status && !r.is_approved)
      ).length
    ),
    approvedCount: computed(() =>
      store.requests().filter((r) => r.is_approved === true).length
    ),
    rejectedCount: computed(() =>
      store.requests().filter(
        (r) => r.review_status === 'rejected' || r.rejection_comment
      ).length
    ),

    // Filtros activos
    hasActiveFilters: computed(() => !!(
      store.searchText() ||
      store.selectedStatus() ||
      store.dateRange()
    )),
  })),
  withMethods((store) => ({
    // Cargar solicitudes (datos serán proporcionados por el service)
    setRequests: (requests: CompensatoryRequest[]) => {
      patchState(store, { requests, loading: false });
    },

    // Actualizar filtros
    updateFilters: (filters: Partial<Pick<State, 'searchText' | 'selectedStatus' | 'dateRange'>>) => {
      patchState(store, filters);
    },

    // Limpiar filtros
    clearFilters: () => {
      patchState(store, {
        searchText: '',
        selectedStatus: null,
        dateRange: null,
      });
    },

    // Seleccionar solicitud
    selectRequest: (request: CompensatoryRequest | null) => {
      patchState(store, { selectedRequest: request });
    },

    // Toggle filtros
    toggleFilters: () => {
      patchState(store, { showFilters: !store.showFilters() });
    },

    // Cargar horas extras de empleado
    loadEmployeeOvertime: async (employeeId: string) => {
      patchState(store, { isLoadingOvertimeHours: true });
      try {
        // Esta lógica se implementará en el service
        patchState(store, {
          employeeOvertimeHours: 0,
          employeeOvertimeDays: [],
          isLoadingOvertimeHours: false
        });
      } catch (error) {
        patchState(store, { isLoadingOvertimeHours: false });
      }
    },

    // Actualizar solicitud (para refresh después de cambios)
    updateRequest: (updatedRequest: CompensatoryRequest) => {
      const currentRequests = store.requests();
      const index = currentRequests.findIndex(r => r.id === updatedRequest.id);
      if (index !== -1) {
        const newRequests = [...currentRequests];
        newRequests[index] = updatedRequest;
        patchState(store, { requests: newRequests });
      }
    },

    // Recargar datos (llamado desde el service)
    reload: () => {
      patchState(store, { loading: true });
    },
  }))
);