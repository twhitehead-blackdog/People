export type Company = {
  id: string;
  name: string;
  address: string;
  phone_number: string;
  ruc?: string;
  is_active: boolean;
  created_at?: Date;
};

export type Branch = {
  id: string;
  name: string;
  short_name: string;
  address: string;
  is_active: boolean;
  created_at?: Date;
  ip: string;
  company_id?: string;
};

export type Department = {
  id: string;
  name: string;
  created_at?: Date;
};

export type UniformSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL';

export type Position = {
  id: string;
  name: string;
  department_id: string;
  department?: Department;
  created_at?: Date;
  schedule_admin: boolean;
  admin: boolean;
  schedule_approver: boolean;
  default_view?: string;
  available_for_job_fair?: boolean;
  // NUEVO: Permisos de frontend por módulo/submódulo (JSON)
  frontend_permissions?: string | Record<string, unknown>;
};

// ============================================
// SISTEMA NAZ — empresas paralelas
// ============================================

export type NazCompany = {
  id: string;
  name: string;
  address?: string;
  phone_number?: string;
  is_active: boolean;
  created_at?: Date;
};

export type NazBranch = {
  id: string;
  name: string;
  short_name?: string;
  address?: string;
  is_active: boolean;
  ip?: string;
  company_id?: string;
  company?: NazCompany;
  created_at?: Date;
};

export type NazDepartment = {
  id: string;
  name: string;
  created_at?: Date;
};

export type NazPosition = {
  id: string;
  name: string;
  department_id: string;
  department?: NazDepartment;
  schedule_admin: boolean;
  admin: boolean;
  schedule_approver: boolean;
  created_at?: Date;
};
