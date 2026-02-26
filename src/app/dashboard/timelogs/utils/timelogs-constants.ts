/**
 * IDs de tipos de permisos/feriados que NO deberían tener marcaciones
 */
export const RESTRICTED_TIMEOFF_TYPE_IDS = [
  'c01dff8f-ce0d-498f-a473-46418576e589',
  '4983c002-7c5d-4440-a4f2-52f61acdd67a',
  '3d07f626-d58f-4203-bac5-f6e35557e0ad',
  'd3fdaf49-2c3e-4293-bf6d-3ae2d4b7bbdf',
  'e7e63bb4-ca86-4091-85fa-c4da16545b49',
  'f2d92995-96a0-414f-b64a-9823db776745',
];

/**
 * IDs de schedules que son permisos/feriados y NO deberían tener marcaciones
 */
export const RESTRICTED_SCHEDULE_IDS = [
  '3d07f626-d58f-4203-bac5-f6e35557e0ad', // Feriado
  '4983c002-7c5d-4440-a4f2-52f61acdd67a', // Incapacidad
  'c01dff8f-ce0d-498f-a473-46418576e589', // Dia Libre
  'd3fdaf49-2c3e-4293-bf6d-3ae2d4b7bbdf', // Licencia maternidad
  'e7e63bb4-ca86-4091-85fa-c4da16545b49', // Vacaciones
  'f2d92995-96a0-414f-b64a-9823db776745', // Compensatorio
  '37707c00-8f6f-4065-9975-b3ef37fe98d7', // Licencia de maternidad
];

/**
 * Nombres de schedules que indican permisos/feriados (sin importar mayúsculas)
 */
export const RESTRICTED_SCHEDULE_NAMES = [
  'feriado',
  'dia libre',
  'día libre',
  'vacaciones',
  'licencia',
  'incapacidad',
  'compensatorio',
  'maternidad',
  'paternidad',
];
