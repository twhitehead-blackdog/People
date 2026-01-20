import { TutorialConfig } from '../../services/tutorial-guide.service';

/**
 * Tutorial configurations for Branch Manager Gestiones
 * Interactive mode: user clicks to advance, short tooltips
 *
 * FLOW: Each step highlights an element, user clicks it to advance.
 * For employee selection:
 * - Step 1: Highlight dropdown, user clicks to open and select
 * - Step 2: Highlight confirm button (appears after selection)
 * The spotlight polls for the confirm button to appear.
 */

/**
 * Intro tutorial - shows all 6 gestiones in order:
 * Compensatorio → Incapacidades → Vacaciones → Documentos → Omisión de Marcación → Uniforme
 * Then prompts user to select one
 */
export const GESTIONES_TUTORIAL_INTRO: TutorialConfig = {
  id: 'gestiones-intro',
  name: 'Introducción a Gestiones',
  steps: [
    {
      id: 'gestiones-card-compensatory',
      tooltip: '⏰ Para compensar horas extras trabajadas',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-card-disabilities',
      tooltip: '📋 Para registrar ausencias por enfermedad',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-card-vacations',
      tooltip: '🏖️ Para solicitar días de vacaciones',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-card-documents',
      tooltip: '📄 Para cartas de trabajo y constancias',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-card-timelog_correction',
      tooltip: '⚠️ Para corregir marcaciones de asistencia',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-card-uniform_request',
      tooltip: '👕 Para solicitar uniformes de trabajo',
      tooltipPosition: 'bottom',
      isPrompt: true, // Last step - shows "selecciona una"
    },
  ],
  chainToSelection: true,
};

/**
 * Disabilities tutorial - step by step
 */
export const DISABILITIES_TUTORIAL: TutorialConfig = {
  id: 'disabilities-tutorial',
  name: 'Incapacidad',
  steps: [
    {
      id: 'gestiones-employee-select',
      tooltip: '👤 Abre y selecciona un empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma para continuar',
      tooltipPosition: 'right',
    },
    {
      id: 'disabilities-start-date',
      tooltip: '📅 ¿Cuándo inició la incapacidad?',
      tooltipPosition: 'right',
    },
    {
      id: 'disabilities-end-date',
      tooltip: '📅 ¿Cuándo termina?',
      tooltipPosition: 'left',
    },
    {
      id: 'disabilities-description',
      tooltip: '📝 Describe el diagnóstico',
      tooltipPosition: 'top',
    },
    {
      id: 'disabilities-file',
      tooltip: '📎 Sube el certificado médico',
      tooltipPosition: 'top',
    },
    {
      id: 'disabilities-submit',
      tooltip: '🚀 ¡Listo! Envía la solicitud',
      tooltipPosition: 'top',
    },
  ],
};

/**
 * Vacations tutorial
 */
export const VACATIONS_TUTORIAL: TutorialConfig = {
  id: 'vacations-tutorial',
  name: 'Vacaciones',
  steps: [
    {
      id: 'gestiones-employee-select',
      tooltip: '👤 Abre y selecciona un empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma para continuar',
      tooltipPosition: 'right',
    },
    {
      id: 'vacations-start-date',
      tooltip: '📅 Primer día de vacaciones',
      tooltipPosition: 'right',
    },
    {
      id: 'vacations-end-date',
      tooltip: '📅 Último día de vacaciones',
      tooltipPosition: 'left',
    },
    {
      id: 'vacations-reason',
      tooltip: '📝 Agrega un motivo (opcional)',
      tooltipPosition: 'top',
    },
    {
      id: 'vacations-submit',
      tooltip: '🚀 ¡Listo! Solicita las vacaciones',
      tooltipPosition: 'top',
    },
  ],
};

/**
 * Documents tutorial
 */
export const DOCUMENTS_TUTORIAL: TutorialConfig = {
  id: 'documents-tutorial',
  name: 'Documentos',
  steps: [
    {
      id: 'gestiones-employee-select',
      tooltip: '👤 Abre y selecciona un empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma para continuar',
      tooltipPosition: 'right',
    },
    {
      id: 'documents-type',
      tooltip: '📄 ¿Qué documento necesitas?',
      tooltipPosition: 'bottom',
    },
    {
      id: 'documents-reason',
      tooltip: '📝 ¿Para qué lo necesitas?',
      tooltipPosition: 'top',
    },
    {
      id: 'documents-date',
      tooltip: '📅 ¿Para cuándo lo necesitas?',
      tooltipPosition: 'right',
    },
    {
      id: 'documents-submit',
      tooltip: '🚀 ¡Listo! Envía la solicitud',
      tooltipPosition: 'top',
    },
  ],
};

/**
 * Compensatory tutorial
 */
export const COMPENSATORY_TUTORIAL: TutorialConfig = {
  id: 'compensatory-tutorial',
  name: 'Tiempo Compensatorio',
  steps: [
    {
      id: 'gestiones-employee-select',
      tooltip: '👤 Abre y selecciona un empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma para continuar',
      tooltipPosition: 'right',
    },
    {
      id: 'compensatory-type',
      tooltip: '⏰ ¿Compensar horas o días?',
      tooltipPosition: 'bottom',
    },
    {
      id: 'compensatory-dates',
      tooltip: '📅 Elige cuándo tomarlo',
      tooltipPosition: 'bottom',
    },
    {
      id: 'compensatory-reason',
      tooltip: '📝 Describe el motivo',
      tooltipPosition: 'top',
    },
    {
      id: 'compensatory-submit',
      tooltip: '🚀 ¡Envía la solicitud!',
      tooltipPosition: 'top',
    },
  ],
};

/**
 * Timelog Correction (Omisión de Marcación) tutorial
 */
export const TIMELOG_CORRECTION_TUTORIAL: TutorialConfig = {
  id: 'timelog-correction-tutorial',
  name: 'Omisión de Marcación',
  steps: [
    {
      id: 'gestiones-employee-select',
      tooltip: '👤 Abre y selecciona un empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma para continuar',
      tooltipPosition: 'right',
    },
    {
      id: 'timelog-correction-date',
      tooltip: '📅 ¿Qué día ocurrió el error?',
      tooltipPosition: 'right',
    },
    {
      id: 'timelog-correction-type',
      tooltip: '⏰ ¿Qué marcación fue incorrecta?',
      tooltipPosition: 'left',
    },
    {
      id: 'timelog-correction-reason',
      tooltip: '📝 Explica qué pasó',
      tooltipPosition: 'top',
    },
    {
      id: 'timelog-correction-file',
      tooltip: '📎 Adjunta evidencia (opcional)',
      tooltipPosition: 'top',
    },
    {
      id: 'timelog-correction-submit',
      tooltip: '🚀 ¡Envía la corrección!',
      tooltipPosition: 'top',
    },
  ],
};

/**
 * Uniform Request (Solicitud de Uniforme) tutorial
 */
export const UNIFORM_REQUEST_TUTORIAL: TutorialConfig = {
  id: 'uniform-request-tutorial',
  name: 'Solicitud de Uniforme',
  steps: [
    {
      id: 'gestiones-employee-select',
      tooltip: '👤 Abre y selecciona un empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma para continuar',
      tooltipPosition: 'right',
    },
    {
      id: 'uniform-item-type',
      tooltip: '👕 ¿Qué prenda necesitas?',
      tooltipPosition: 'bottom',
    },
    {
      id: 'uniform-size',
      tooltip: '📏 Selecciona la talla',
      tooltipPosition: 'right',
    },
    {
      id: 'uniform-quantity',
      tooltip: '🔢 ¿Cuántas unidades?',
      tooltipPosition: 'left',
    },
    {
      id: 'uniform-notes',
      tooltip: '📝 Agrega notas (opcional)',
      tooltipPosition: 'top',
    },
    {
      id: 'uniform-submit',
      tooltip: '🚀 ¡Solicita el uniforme!',
      tooltipPosition: 'top',
    },
  ],
};

/** Map of tutorial configs by gestión type */
export const GESTIONES_TUTORIALS: Record<string, TutorialConfig> = {
  intro: GESTIONES_TUTORIAL_INTRO,
  disabilities: DISABILITIES_TUTORIAL,
  vacations: VACATIONS_TUTORIAL,
  documents: DOCUMENTS_TUTORIAL,
  compensatory: COMPENSATORY_TUTORIAL,
  timelog_correction: TIMELOG_CORRECTION_TUTORIAL,
  uniform_request: UNIFORM_REQUEST_TUTORIAL,
};
