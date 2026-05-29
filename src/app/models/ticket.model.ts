// ───────────────────────────────────────────────────────────────────
// Tickets multi-departamento (IT, Operaciones, Contabilidad, RRHH)
// ───────────────────────────────────────────────────────────────────

export type TicketDepartment = 'it' | 'operations' | 'accounting' | 'hr';
export type TicketStatus     = 'open' | 'in_process' | 'resolved' | 'cancelled';
export type TicketPriority   = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  department: TicketDepartment;
  category: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  branch_id: string | null;
  company_id: string | null;
  requester_id: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  branch?: { id: string; name: string } | null;
  requester?: { id: string; first_name: string; father_name: string } | null;
  assignee?:  { id: string; first_name: string; father_name: string } | null;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  author_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
  author?: { first_name: string; father_name: string } | null;
}

// ── Metadata visual por departamento ────────────────────────────────
export interface DepartmentMeta {
  id:       TicketDepartment;
  label:    string;
  icon:     string;
  color:    string;
  accent:   string;
  route:    string;
  permission: string;
}

export const DEPARTMENTS: Record<TicketDepartment, DepartmentMeta> = {
  it: {
    id: 'it', label: 'IT / Soporte Técnico',
    icon: 'pi-desktop', color: 'text-blue-400', accent: 'blue',
    route: 'tickets-it', permission: 'tickets_it',
  },
  operations: {
    id: 'operations', label: 'Operaciones',
    icon: 'pi-cog', color: 'text-emerald-400', accent: 'emerald',
    route: 'tickets-operations', permission: 'tickets_operations',
  },
  accounting: {
    id: 'accounting', label: 'Contabilidad',
    icon: 'pi-dollar', color: 'text-amber-400', accent: 'amber',
    route: 'tickets-accounting', permission: 'tickets_accounting',
  },
  hr: {
    id: 'hr', label: 'Recursos Humanos',
    icon: 'pi-users', color: 'text-purple-400', accent: 'purple',
    route: 'tickets-hr', permission: 'tickets_hr',
  },
};

export const DEPARTMENT_LIST: DepartmentMeta[] =
  (Object.keys(DEPARTMENTS) as TicketDepartment[]).map(k => DEPARTMENTS[k]);

// ── Categorías por departamento ─────────────────────────────────────
export interface CategoryDef {
  value: string;
  label: string;
  icon:  string;
  description: string;
}

export const CATEGORIES_BY_DEPT: Record<TicketDepartment, CategoryDef[]> = {
  it: [
    { value: 'hardware', label: 'Hardware',          icon: 'pi-desktop', description: 'PC, impresora, pantalla, teclado, mouse, equipo físico' },
    { value: 'software', label: 'Software / Acceso', icon: 'pi-key',     description: 'Programa que no abre, acceso a sistema, contraseña' },
    { value: 'network',  label: 'Red / Internet',    icon: 'pi-wifi',    description: 'Sin conexión, internet lento, problemas de red' },
    { value: 'other',    label: 'Otro',              icon: 'pi-wrench',  description: 'Cualquier otro problema técnico' },
  ],
  operations: [
    { value: 'supply',      label: 'Insumos / Material',   icon: 'pi-box',        description: 'Faltan insumos, repuestos, material de trabajo' },
    { value: 'maintenance', label: 'Mantenimiento',        icon: 'pi-wrench',     description: 'Reparaciones, infraestructura, mobiliario' },
    { value: 'logistics',   label: 'Logística / Entrega',  icon: 'pi-truck',      description: 'Despachos, entregas, transporte interno' },
    { value: 'process',     label: 'Procesos / Calidad',   icon: 'pi-list-check', description: 'Mejoras o fallas en procesos operativos' },
    { value: 'other',       label: 'Otro',                 icon: 'pi-ellipsis-h', description: 'Cualquier otro tema operativo' },
  ],
  accounting: [
    { value: 'invoice', label: 'Facturación',           icon: 'pi-file',          description: 'Facturas, notas de crédito, ajustes' },
    { value: 'payment', label: 'Pago / Cobro',          icon: 'pi-dollar',        description: 'Pagos pendientes, cobros, reembolsos' },
    { value: 'expense', label: 'Gastos / Reembolsos',   icon: 'pi-credit-card',   description: 'Caja chica, viáticos, reembolsos' },
    { value: 'tax',     label: 'Impuestos / Reportes',  icon: 'pi-percentage',    description: 'ITBMS, retenciones, reportes fiscales' },
    { value: 'other',   label: 'Otro',                  icon: 'pi-ellipsis-h',    description: 'Cualquier otro tema contable' },
  ],
  hr: [
    { value: 'payroll',  label: 'Planilla / Pago',       icon: 'pi-money-bill', description: 'Pagos, descuentos, bonos' },
    { value: 'vacation', label: 'Vacaciones / Permisos', icon: 'pi-calendar',   description: 'Solicitudes, saldos, días libres' },
    { value: 'document', label: 'Documentos / Cartas',   icon: 'pi-file',       description: 'Constancias, cartas de trabajo, identificación' },
    { value: 'benefits', label: 'Beneficios',            icon: 'pi-gift',       description: 'Seguro, vales, beneficios laborales' },
    { value: 'other',    label: 'Otro',                  icon: 'pi-ellipsis-h', description: 'Cualquier otro tema de RRHH' },
  ],
};

export const STATUS_META: Record<TicketStatus, { label: string; severity: 'warn' | 'info' | 'success' | 'secondary'; icon: string }> = {
  open:       { label: 'Abierto',    severity: 'warn',      icon: 'pi-circle-fill' },
  in_process: { label: 'En Proceso', severity: 'info',      icon: 'pi-cog' },
  resolved:   { label: 'Resuelto',   severity: 'success',   icon: 'pi-check-circle' },
  cancelled:  { label: 'Cancelado',  severity: 'secondary', icon: 'pi-times-circle' },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; severity: 'danger' | 'warn' | 'info' | 'secondary'; description: string; color: string }> = {
  urgent: { label: 'Urgente', severity: 'danger',    description: 'Paraliza operaciones',           color: 'text-red-400'    },
  high:   { label: 'Alta',    severity: 'warn',      description: 'Impide trabajar con normalidad', color: 'text-amber-400'  },
  medium: { label: 'Media',   severity: 'info',      description: 'Afecta parcialmente',            color: 'text-blue-400'   },
  low:    { label: 'Baja',    severity: 'secondary', description: 'Puede esperar',                  color: 'text-gray-400'   },
};

// ── Legacy alias (mientras existan referencias a it-ticket.model) ───
/** @deprecated usar Ticket */
export type ItTicket = Ticket;
/** @deprecated usar TicketStatus */
export type ItTicketStatus = TicketStatus;
/** @deprecated usar TicketPriority */
export type ItTicketPriority = TicketPriority;
/** @deprecated usar string (categorías ahora son por depto) */
export type ItTicketCategory = string;
