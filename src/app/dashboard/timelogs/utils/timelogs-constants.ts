/**
 * IDs de tipos de permisos/feriados (tabla `timeoff_types`) que NO deberían
 * tener marcaciones — si las hay, se marca el día como `scheduleError`.
 *
 * IMPORTANTE: el array original tenía 6 UUIDs, pero 5 de ellos eran de la
 * tabla `schedules`, no de `timeoff_types` — eran un copy-paste error y
 * nunca llegaban a matchear. Verificado en DB el 2026-05-29.
 *
 * Se excluye 'Compensatorio' a pesar de existir como timeoff_type, porque
 * el flag `compensatory_type === 'hours'` se trata aparte (el empleado SÍ
 * debe trabajar). Compensatorio por día completo sí está aquí — el filtro
 * de `compensatory_type` lo discrimina.
 */
export const RESTRICTED_TIMEOFF_TYPE_IDS = [
  'f2d92995-96a0-414f-b64a-9823db776745', // Compensatorio
  '0d9b06bb-9148-4a4a-b135-6835871ad9d1', // Duelo
  '10135044-08d0-4b09-810a-1f1d21e24a64', // Licencia por enfermedad
  '1cc657a7-5ed7-420e-94d4-2dc45d1f70eb', // Licencia por maternidad
  '79edf190-0cd0-4f9a-b774-a0ff7ff625ff', // Matrimonio
  'e1cb97e9-9f86-4c28-a715-a7fc6703a036', // Riesgo profesional
  '7eb62e15-2f24-4537-bd30-b5ebfea104bd', // Vacaciones
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

/**
 * IDs de schedules que cuentan en el resumen del empleado (cuadritos del top
 * de la pantalla de timelogs).
 *
 * IMPORTANTE: estos UUIDs deben quedarse sincronizados con la DB. Hoy se usan
 * en `timelogs.component.ts:employeeSummaryCounts()` y reemplazan el matching
 * anterior por nombre (que se rompía silenciosamente si alguien renombraba el
 * schedule en Supabase, ej. "A. Injus" → "Ausencia Injustificada").
 *
 * Verificado en DB (consulta del 2026-05-29).
 */
export const SUMMARY_SCHEDULE_IDS = {
  /** Certificados médicos: CM, Incapacidad */
  certMedicos: [
    '1ea59347-8faf-4f7e-a943-31aca2a17ea6', // CM
    '24cc6616-de66-4b09-9d92-43e57a2cc7c8', // Incapacidad
  ],
  /** Ausencia injustificada / Ausencia */
  injustificada: [
    'c983a3dc-d4b7-43cf-8fea-ad585e5dd1bb', // A. Injus
    'ccdfd0ca-8a1c-4076-8bab-71537b5f548b', // AUSENCIA
  ],
  /** Ausencia justificada */
  justificada: [
    '78bb5045-d107-41b1-87e4-c11985788964', // A. Justificada
  ],
  /** Permisos aprobados (hay 2 IDs con el mismo nombre en DB) */
  permiso: [
    '4716174b-a74f-4165-b1a2-ae05eb5d767f', // Permiso
    'e5d853ea-20ef-4163-aa1b-57dcb537443e', // Permiso (duplicado)
  ],
  /** Compensatorio (día completo) */
  compensatorio: [
    'f2d92995-96a0-414f-b64a-9823db776745', // Compensatorio
  ],
} as const;

/** Set para lookup O(1) — todas las categorías combinadas (útil para early-exit). */
export const ALL_SUMMARY_SCHEDULE_IDS: Set<string> = new Set([
  ...SUMMARY_SCHEDULE_IDS.certMedicos,
  ...SUMMARY_SCHEDULE_IDS.injustificada,
  ...SUMMARY_SCHEDULE_IDS.justificada,
  ...SUMMARY_SCHEDULE_IDS.permiso,
  ...SUMMARY_SCHEDULE_IDS.compensatorio,
]);
