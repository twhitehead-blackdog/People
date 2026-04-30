import type { Employee } from './employee.model';

export type DeviceStatus = 'available' | 'assigned' | 'maintenance' | 'retired';
export type DeviceType =
  | 'laptop'
  | 'desktop'
  | 'monitor'
  | 'keyboard'
  | 'mouse'
  | 'printer'
  | 'scanner'
  | 'phone'
  | 'tablet'
  | 'headset'
  | 'webcam'
  | 'other';

export interface Device {
  id: string;
  company_id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  device_type: DeviceType;
  status: DeviceStatus;
  purchase_date?: Date | string | null;
  warranty_expiry?: Date | string | null;
  notes?: string | null;
  cost?: number | null;
  last_maintenance_date?: Date | string | null;
  branch_id?: string | null;
  branch?: { id: string; name: string } | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export type DeviceAssignmentStatus = 'active' | 'returned' | 'lost' | 'damaged';

export interface DeviceAssignment {
  id: string;
  company_id: string;
  device_id: string;
  device?: Device;
  employee_id: string;
  employee?: Partial<Employee>;
  assigned_by: string;
  assignedByEmployee?: Partial<Employee>;
  assigned_date: Date | string;
  return_date?: Date | string | null;
  status: DeviceAssignmentStatus;
  // Confirmación por el empleado
  employee_confirmed: boolean;
  employee_confirmed_at?: Date | string | null;
  employee_signature_url?: string | null;
  employee_notes?: string | null;
  // Condiciones al entregar
  condition_notes?: string | null;
  accessories_included?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Opciones para los selectores
export const DEVICE_TYPE_OPTIONS: { label: string; value: DeviceType; icon: string }[] = [
  { label: 'Laptop', value: 'laptop', icon: 'pi pi-laptop' },
  { label: 'Desktop', value: 'desktop', icon: 'pi pi-desktop' },
  { label: 'Monitor', value: 'monitor', icon: 'pi pi-desktop' },
  { label: 'Teclado', value: 'keyboard', icon: 'pi pi-keyboard' },
  { label: 'Mouse', value: 'mouse', icon: 'pi pi-mouse' },
  { label: 'Impresora', value: 'printer', icon: 'pi pi-print' },
  { label: 'Escáner', value: 'scanner', icon: 'pi pi-scan' },
  { label: 'Teléfono', value: 'phone', icon: 'pi pi-phone' },
  { label: 'Tablet', value: 'tablet', icon: 'pi pi-tablet' },
  { label: 'Audífonos', value: 'headset', icon: 'pi pi-headphones' },
  { label: 'Cámara Web', value: 'webcam', icon: 'pi pi-video' },
  { label: 'Otro', value: 'other', icon: 'pi pi-ellipsis-h' },
];

export const DEVICE_STATUS_OPTIONS: { label: string; value: DeviceStatus; severity: string }[] = [
  { label: 'Disponible', value: 'available', severity: 'success' },
  { label: 'Asignado', value: 'assigned', severity: 'info' },
  { label: 'Mantenimiento', value: 'maintenance', severity: 'warn' },
  { label: 'Retirado', value: 'retired', severity: 'secondary' },
];

export const DEVICE_ASSIGNMENT_STATUS_OPTIONS: { label: string; value: DeviceAssignmentStatus; severity: string }[] = [
  { label: 'Activo', value: 'active', severity: 'success' },
  { label: 'Devuelto', value: 'returned', severity: 'secondary' },
  { label: 'Perdido', value: 'lost', severity: 'danger' },
  { label: 'Dañado', value: 'damaged', severity: 'warn' },
];
