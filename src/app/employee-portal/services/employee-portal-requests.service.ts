import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { endOfDay, startOfDay } from 'date-fns';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { DashboardStore } from '../../stores/dashboard.store';

export type UnifiedRequest = {
  id: string;
  request_type:
    | 'compensatory'
    | 'disability'
    | 'document'
    | 'complaint'
    | 'vacation';
  created_at: string | Date;
  status: string;
  title: string;
  description?: string;
  originalData: any;
};

// NOTA: No usar providedIn:'root' porque depende de DashboardStore (scope del layout del portal).
// Se provee explícitamente en EmployeePortalComponent para compartir el injector correcto.
@Injectable()
export class EmployeePortalRequestsService {
  private store = inject(DashboardStore);
  private organizationService = inject(OrganizationService);
  private apiUrl = inject(ApiUrlService);

  public currentEmployee = computed(() => this.store.currentEmployee());

  // APIs para todas las solicitudes
  public compensatoryTimeoffsApi = httpResource<any[]>(
    () => {
      if (!this.currentEmployee()?.id) return undefined;
      const companyId = this.organizationService.getCurrentCompanyId();

      if (!companyId) {
        return undefined;
      }

      // ID del tipo de timeoff "Compensatorio"
      const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';

      const baseUrl = this.apiUrl.build('rest/v1/timeoffs');
      const select = `*,type:timeoff_types(id,name)`;

      let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
      url += `&employee_id=eq.${this.currentEmployee()!.id}`;
      url += `&type_id=eq.${compensatoryTypeId}`;
      url += `&order=date_from.desc`;

      return {
        url,
        method: 'GET',
      };
    },
    {
      defaultValue: [],
    }
  );

  public vacationTimeoffsApi = httpResource<any[]>(
    () => {
      if (!this.currentEmployee()?.id) return undefined;
      const companyId = this.organizationService.getCurrentCompanyId();

      if (!companyId) {
        return undefined;
      }

      // ID del tipo de timeoff "Vacaciones"
      const vacationTypeId = '00000000-0000-0000-0000-000000000001';

      const baseUrl = this.apiUrl.build('rest/v1/timeoffs');
      const select = `*,type:timeoff_types(id,name)`;

      let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
      url += `&employee_id=eq.${this.currentEmployee()!.id}`;
      url += `&type_id=eq.${vacationTypeId}`;
      url += `&order=date_from.desc`;

      return {
        url,
        method: 'GET',
      };
    },
    {
      defaultValue: [],
    }
  );

  public documentRequestsApi = httpResource<any[]>(
    () => {
      if (!this.currentEmployee()?.id) return undefined;
      const companyId = this.organizationService.getCurrentCompanyId();

      if (!companyId) {
        return undefined;
      }

      // Construir URL manualmente para filtrar a través de employee.company_id
      const baseUrl = this.apiUrl.build('rest/v1/document_requests');
      const select = `*,employee:employees(id,company_id)`;

      let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
      url += `&employee_id=eq.${this.currentEmployee()!.id}`;
      url += `&employee.company_id=eq.${companyId}`;
      url += `&order=created_at.desc`;

      return {
        url,
        method: 'GET',
      };
    },
    {
      defaultValue: [],
    }
  );

  public complaintsApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/complaints'),
      method: 'GET',
      params: {
        select: '*',
        creator_employee_id: `eq.${this.currentEmployee()!.id}`,
        order: 'updated_at.desc',
      },
    };
  });

  public disabilitiesApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/employee_disabilities'),
      method: 'GET',
      params: {
        select: '*',
        employee_id: `eq.${this.currentEmployee()!.id}`,
        order: 'created_at.desc',
      },
    };
  });

  // Computed: Todas las solicitudes de tiempo compensatorio (sin filtrar)
  public allCompensatoryRequests = computed(() => {
    if (this.compensatoryTimeoffsApi.status() === 'error') {
      return [];
    }
    return this.compensatoryTimeoffsApi.value() ?? [];
  });

  // Computed: Todas las solicitudes de vacaciones
  public allVacationRequests = computed(() => {
    if (this.vacationTimeoffsApi.status() === 'error') {
      return [];
    }
    const requests = this.vacationTimeoffsApi.value() ?? [];
    return [...requests].sort((a, b) => {
      const dateA = new Date(a.date_from).getTime();
      const dateB = new Date(b.date_from).getTime();
      return dateB - dateA;
    });
  });

  // Computed: Todas las solicitudes de documentos
  public allDocumentRequests = computed(
    () => this.documentRequestsApi.value() ?? []
  );

  // Computed: Todas las quejas
  public allComplaints = computed(() => {
    return this.complaintsApi.value() ?? [];
  });

  // Computed: Todas las incapacidades
  public allDisabilities = computed(() => this.disabilitiesApi.value() ?? []);

  // Signals para filtros de todas las solicitudes
  public allRequestsFilterStatus = signal<string | null>(null);
  public allRequestsFilterType = signal<string | null>(null);
  public allRequestsFilterDateRange = signal<Date[] | null>(null);
  public allRequestsFilterSearch = signal<string>('');
  public allRequestsSortBy = signal<'date' | 'status' | 'type'>('date');
  public allRequestsSortOrder = signal<'asc' | 'desc'>('desc');
  public selectedSortOption = signal<any>({
    label: 'Fecha (Más reciente)',
    by: 'date',
    order: 'desc',
  });
  public filtersExpanded = signal<boolean>(false);

  // Mantener filtros antiguos para compatibilidad con sección de tiempo compensatorio
  public compensatoryFilterStatus = signal<string | null>(null);
  public compensatoryFilterType = signal<string | null>(null);
  public compensatoryFilterDateRange = signal<Date[] | null>(null);
  public compensatoryFilterSearch = signal<string>('');
  public compensatorySortBy = signal<'date' | 'status' | 'amount'>('date');
  public compensatorySortOrder = signal<'asc' | 'desc'>('desc');

  // Opciones para filtros
  public allRequestsStatusOptions = [
    { label: 'Todos los estados', value: null },
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobado', value: 'approved' },
    { label: 'En Registro', value: 'in_registry' },
    { label: 'Completado', value: 'completed' },
    { label: 'Rechazado', value: 'rejected' },
  ];

  public allRequestsTypeOptions = [
    { label: 'Todos los tipos', value: null },
    { label: 'Tiempo Compensatorio', value: 'compensatory' },
    { label: 'Incapacidad', value: 'disability' },
    { label: 'Documento', value: 'document' },
    { label: 'Sugerencia', value: 'complaint' },
    { label: 'Vacaciones', value: 'vacation' },
  ];

  public allRequestsSortOptions = [
    {
      label: 'Fecha (Más reciente)',
      by: 'date' as const,
      order: 'desc' as const,
    },
    {
      label: 'Fecha (Más antiguo)',
      by: 'date' as const,
      order: 'asc' as const,
    },
    { label: 'Estado', by: 'status' as const, order: 'asc' as const },
    { label: 'Tipo', by: 'type' as const, order: 'asc' as const },
  ];

  public compensatoryStatusOptions = [
    { label: 'Todos los estados', value: null },
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobado', value: 'approved' },
    { label: 'En Registro', value: 'in_registry' },
    { label: 'Rechazado', value: 'rejected' },
  ];

  public compensatoryTypeOptions = [
    { label: 'Todos los tipos', value: null },
    { label: 'Por Horas', value: 'hours' },
    { label: 'Por Días', value: 'days' },
  ];

  public compensatorySortOptions = [
    {
      label: 'Fecha (Más reciente)',
      by: 'date' as const,
      order: 'desc' as const,
    },
    {
      label: 'Fecha (Más antiguo)',
      by: 'date' as const,
      order: 'asc' as const,
    },
    { label: 'Estado', by: 'status' as const, order: 'asc' as const },
    {
      label: 'Cantidad (Mayor)',
      by: 'amount' as const,
      order: 'desc' as const,
    },
    { label: 'Cantidad (Menor)', by: 'amount' as const, order: 'asc' as const },
  ];

  // Helper: Obtener estado unificado para cualquier tipo de solicitud
  private getUnifiedRequestStatus(request: any, type: string): string {
    if (type === 'compensatory') {
      if (request.is_approved === true) return 'approved';
      if (request.review_status === 'approved') return 'in_registry';
      if (request.rejection_comment || request.review_status === 'rejected')
        return 'rejected';
      return 'pending';
    } else if (type === 'disability') {
      return request.status || 'pending';
    } else if (type === 'document') {
      return request.status || 'pending';
    } else if (type === 'complaint') {
      return request.status || 'pending';
    } else if (type === 'vacation') {
      if (request.is_approved === true) return 'approved';
      if (request.review_status === 'approved') return 'in_registry';
      if (request.rejection_comment || request.review_status === 'rejected')
        return 'rejected';
      return 'pending';
    }
    return 'pending';
  }

  // Helper: Obtener label del estado unificado
  public getUnifiedStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      in_registry: 'En Registro',
      completed: 'Completado',
      in_review: 'En Revisión',
      closed: 'Cerrado',
      resolved: 'Resuelto',
    };
    return labels[status] || status;
  }

  // Helper: Obtener label del tipo de solicitud
  public getRequestTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      compensatory: 'Tiempo Compensatorio',
      disability: 'Incapacidad',
      document: 'Documento',
      complaint: 'Sugerencia',
      vacation: 'Vacaciones',
    };
    return labels[type] || type;
  }

  // Helper: Obtener label del tipo de documento
  public getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      work_letter: 'Carta de Trabajo',
      salary_certificate: 'Certificado de Salario',
      employment_certificate: 'Certificado de Empleo',
      other: 'Otro',
    };
    return labels[type] || type;
  }

  // Helper: Obtener label de categoría de queja
  public getComplaintCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      work_environment: 'Ambiente Laboral',
      harassment: 'Acoso o Discriminación',
      safety: 'Seguridad',
      management: 'Supervisión/Gerencia',
      benefits: 'Beneficios',
      other: 'Otro',
    };
    return labels[category] || category;
  }

  // Computed: Unificar todas las solicitudes en un solo array
  public allRequestsUnified = computed((): UnifiedRequest[] => {
    const requests: UnifiedRequest[] = [];

    // Tiempo compensatorio
    const compensatory = this.allCompensatoryRequests();
    compensatory.forEach((req: any) => {
      requests.push({
        id: req.id,
        request_type: 'compensatory',
        created_at: req.created_at,
        status: this.getUnifiedRequestStatus(req, 'compensatory'),
        title: `Tiempo Compensatorio ${
          req.compensatory_type === 'days' ? 'Días' : 'Horas'
        }`,
        description: req.reason || '',
        originalData: req,
      });
    });

    // Vacaciones
    const vacations = this.allVacationRequests();
    vacations.forEach((req: any) => {
      requests.push({
        id: req.id,
        request_type: 'vacation',
        created_at: req.created_at,
        status: this.getUnifiedRequestStatus(req, 'vacation'),
        title: 'Solicitud de Vacaciones',
        description: req.reason || '',
        originalData: req,
      });
    });

    // Incapacidades
    const disabilities = this.allDisabilities();
    disabilities.forEach((req: any) => {
      requests.push({
        id: req.id,
        request_type: 'disability',
        created_at: req.created_at,
        status: this.getUnifiedRequestStatus(req, 'disability'),
        title: 'Incapacidad Médica',
        description: req.diagnosis || req.notes || '',
        originalData: req,
      });
    });

    // Solicitudes de documentos
    const documents = this.allDocumentRequests();
    documents.forEach((req: any) => {
      requests.push({
        id: req.id,
        request_type: 'document',
        created_at: req.created_at,
        status: this.getUnifiedRequestStatus(req, 'document'),
        title: `Solicitud de ${this.getDocumentTypeLabel(req.document_type)}`,
        description: req.reason || req.custom_document_type || '',
        originalData: req,
      });
    });

    // Quejas
    const complaints = this.allComplaints();
    complaints.forEach((req: any) => {
      requests.push({
        id: req.id,
        request_type: 'complaint',
        created_at: req.created_at,
        status: this.getUnifiedRequestStatus(req, 'complaint'),
        title: `Sugerencia - ${this.getComplaintCategoryLabel(req.category)}`,
        description: req.complaint || '',
        originalData: req,
      });
    });

    return requests;
  });

  // Computed: Solicitudes unificadas filtradas y ordenadas (para Mis Solicitudes)
  public filteredAllRequests = computed(() => {
    let requests = [...this.allRequestsUnified()];

    // Filtro por estado
    const statusFilter = this.allRequestsFilterStatus();
    if (statusFilter) {
      requests = requests.filter((r) => {
        if (statusFilter === 'pending') {
          return r.status === 'pending';
        } else if (statusFilter === 'approved') {
          return r.status === 'approved';
        } else if (statusFilter === 'rejected') {
          return r.status === 'rejected';
        } else if (statusFilter === 'in_registry') {
          return r.status === 'in_registry';
        } else if (statusFilter === 'completed') {
          return r.status === 'completed';
        }
        return true;
      });
    }

    // Filtro por tipo de solicitud
    const typeFilter = this.allRequestsFilterType();
    if (typeFilter) {
      requests = requests.filter((r) => r.request_type === typeFilter);
    }

    // Filtro por rango de fechas
    const dateRange = this.allRequestsFilterDateRange();
    if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      const startDate = startOfDay(dateRange[0]);
      const endDate = endOfDay(dateRange[1]);
      requests = requests.filter((r) => {
        const requestDate = new Date(r.created_at);
        return requestDate >= startDate && requestDate <= endDate;
      });
    }

    // Filtro por búsqueda de texto
    const searchText = this.allRequestsFilterSearch().toLowerCase();
    if (searchText) {
      requests = requests.filter((r) => {
        const title = r.title?.toLowerCase() || '';
        const description = r.description?.toLowerCase() || '';
        return title.includes(searchText) || description.includes(searchText);
      });
    }

    // Ordenamiento
    const sortBy = this.allRequestsSortBy();
    const sortOrder = this.allRequestsSortOrder();

    requests.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === 'status') {
        const statusOrder: Record<string, number> = {
          pending: 1,
          approved: 2,
          in_registry: 3,
          completed: 4,
          rejected: 5,
        };
        comparison =
          (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      } else if (sortBy === 'type') {
        comparison = a.request_type.localeCompare(b.request_type);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return requests;
  });

  // Computed: Solicitudes de tiempo compensatorio filtradas y ordenadas
  public myCompensatoryRequests = computed(() => {
    let requests = [...this.allCompensatoryRequests()];

    // Filtro por estado
    const statusFilter = this.compensatoryFilterStatus();
    if (statusFilter) {
      requests = requests.filter((r) => {
        if (statusFilter === 'pending') {
          return (
            r.review_status === 'pending' ||
            (!r.review_status && !r.is_approved)
          );
        } else if (statusFilter === 'approved') {
          return r.is_approved === true;
        } else if (statusFilter === 'rejected') {
          return r.rejection_comment || r.review_status === 'rejected';
        } else if (statusFilter === 'in_registry') {
          return r.review_status === 'approved' && !r.is_approved;
        }
        return true;
      });
    }

    // Filtro por tipo
    const typeFilter = this.compensatoryFilterType();
    if (typeFilter) {
      requests = requests.filter((r) => r.compensatory_type === typeFilter);
    }

    // Filtro por rango de fechas
    const dateRange = this.compensatoryFilterDateRange();
    if (dateRange && dateRange.length === 2) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      requests = requests.filter((r) => {
        const requestDate = new Date(r.date_from);
        return requestDate >= startDate && requestDate <= endDate;
      });
    }

    // Filtro por búsqueda de texto (motivo)
    const searchText = this.compensatoryFilterSearch().toLowerCase();
    if (searchText) {
      requests = requests.filter((r) => {
        const reason = r.reason?.toLowerCase() || '';
        return reason.includes(searchText);
      });
    }

    // Ordenamiento
    const sortBy = this.compensatorySortBy();
    const sortOrder = this.compensatorySortOrder();

    requests.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === 'status') {
        const statusA = this.getRequestStatusOrder(a);
        const statusB = this.getRequestStatusOrder(b);
        comparison = statusA - statusB;
      } else if (sortBy === 'amount') {
        const amountA = a.compensatory_amount || a.hours || 0;
        const amountB = b.compensatory_amount || b.hours || 0;
        comparison = amountA - amountB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return requests;
  });

  // Helper para ordenar por estado
  private getRequestStatusOrder(request: any): number {
    if (request.is_approved === true) return 1; // Aprobado primero
    if (request.review_status === 'approved') return 2; // En registro
    if (
      request.review_status === 'pending' ||
      (!request.review_status && !request.is_approved)
    )
      return 3; // Pendiente
    if (request.rejection_comment || request.review_status === 'rejected')
      return 4; // Rechazado
    return 5;
  }

  // Métodos para limpiar filtros
  public clearAllRequestsFilters(): void {
    this.allRequestsFilterStatus.set(null);
    this.allRequestsFilterType.set(null);
    this.allRequestsFilterDateRange.set(null);
    this.allRequestsFilterSearch.set('');
    this.allRequestsSortBy.set('date');
    this.allRequestsSortOrder.set('desc');
    this.selectedSortOption.set(this.allRequestsSortOptions[0]);
  }

  public clearCompensatoryFilters(): void {
    this.compensatoryFilterStatus.set(null);
    this.compensatoryFilterType.set(null);
    this.compensatoryFilterDateRange.set(null);
    this.compensatoryFilterSearch.set('');
    this.compensatorySortBy.set('date');
    this.compensatorySortOrder.set('desc');
    this.selectedSortOption.set(this.compensatorySortOptions[0]);
  }

  // Método para cambiar ordenamiento de todas las solicitudes
  public onAllRequestsSortChange(option: any): void {
    if (option && option.by) {
      this.allRequestsSortBy.set(option.by);
      this.allRequestsSortOrder.set(option.order);
      this.selectedSortOption.set(option);
    }
  }

  public onCompensatorySortChange(option: any): void {
    if (option && option.by) {
      this.compensatorySortBy.set(option.by);
      this.compensatorySortOrder.set(option.order);
      this.selectedSortOption.set(option);
    }
  }

  // Helper para contar filtros activos
  public getActiveFiltersCount(): number {
    let count = 0;
    if (this.allRequestsFilterStatus()) count++;
    if (this.allRequestsFilterType()) count++;
    if (this.allRequestsFilterDateRange()) count++;
    if (this.allRequestsFilterSearch()) count++;
    return count;
  }

  // Computed: Verificar si hay filtros activos
  public canClearAllRequestsFilters = computed(() => {
    return !!(
      this.allRequestsFilterStatus() ||
      this.allRequestsFilterType() ||
      this.allRequestsFilterDateRange() ||
      this.allRequestsFilterSearch()
    );
  });

  // Método para recargar todas las solicitudes
  public reloadAllRequests(): void {
    if (
      this.compensatoryTimeoffsApi &&
      typeof this.compensatoryTimeoffsApi.reload === 'function' &&
      this.compensatoryTimeoffsApi.status() !== 'error'
    ) {
      this.compensatoryTimeoffsApi.reload();
    }
    if (
      this.vacationTimeoffsApi &&
      typeof this.vacationTimeoffsApi.reload === 'function' &&
      this.vacationTimeoffsApi.status() !== 'error'
    ) {
      this.vacationTimeoffsApi.reload();
    }
    if (
      this.documentRequestsApi &&
      typeof this.documentRequestsApi.reload === 'function'
    ) {
      this.documentRequestsApi.reload();
    }
    if (this.complaintsApi && typeof this.complaintsApi.reload === 'function') {
      this.complaintsApi.reload();
    }
    if (
      this.disabilitiesApi &&
      typeof this.disabilitiesApi.reload === 'function'
    ) {
      this.disabilitiesApi.reload();
    }
  }
}
