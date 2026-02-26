export const UNIFORM_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

export const GENDER_OPTIONS = [
  { label: 'Masculino', value: 'M' },
  { label: 'Femenino', value: 'F' },
];

export const ACCOUNT_TYPES = ['Ahorros', 'Corriente'];

export const COUNTRY_CODES = [
  { label: '+507', value: '+507' }, // Panama (default)
  { label: '+1', value: '+1' }, // USA/Canada
  { label: '+52', value: '+52' }, // Mexico
  { label: '+57', value: '+57' }, // Colombia
  { label: '+51', value: '+51' }, // Peru
  { label: '+56', value: '+56' }, // Chile
  { label: '+54', value: '+54' }, // Argentina
  { label: '+58', value: '+58' }, // Venezuela
  { label: '+593', value: '+593' }, // Ecuador
  { label: '+595', value: '+595' }, // Paraguay
  { label: '+591', value: '+591' }, // Bolivia
  { label: '+506', value: '+506' }, // Costa Rica
  { label: '+504', value: '+504' }, // Honduras
  { label: '+502', value: '+502' }, // Guatemala
  { label: '+503', value: '+503' }, // El Salvador
  { label: '+505', value: '+505' }, // Nicaragua
];

export const EMERGENCY_CONTACT_RELATIONSHIPS = [
  'Pareja',
  'Familiar',
  'Amigo',
  'Padre',
  'Madre',
  'Hermano',
  'Hermana',
  'Hijo',
  'Hija',
  'Otro',
];

export const EMPLOYEE_SELECT_QUERY =
  'id,first_name,father_name, middle_name, mother_name, document_id, email, phone_number, work_phone_number, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, birth_date, start_date, end_date, branch_id, department_id, position_id, gender, uniform_size, is_active, company_id, work_email, monthly_salary, hourly_salary, qr_code, code_uri, bank, account_number, bank_account_type, week_hours, use_timelog, total_lunch_exceeded_minutes';

export const FIELD_LABELS: Record<string, string> = {
  first_name: 'Nombre',
  father_name: 'Apellido Paterno',
  document_id: 'Cedula de Identidad',
  gender: 'Sexo',
  branch_id: 'Sucursal',
  department_id: 'Area',
  position_id: 'Cargo',
  start_date: 'Fecha de Inicio',
  company_id: 'Empresa',
};
