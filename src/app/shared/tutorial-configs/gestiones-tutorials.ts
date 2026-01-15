import { TutorialConfig } from '../../services/tutorial-guide.service';

/**
 * Tutorial configurations for Branch Manager Gestiones
 * Interactive mode: user clicks to advance, short tooltips
 */

/**
 * Intro tutorial - shows all 4 gestiones in order:
 * Compensatorio → Incapacidades → Vacaciones → Documentos
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
      tooltip: '👤 Busca y selecciona al empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma para continuar',
      tooltipPosition: 'left',
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
      tooltip: '👤 Busca y selecciona al empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma para continuar',
      tooltipPosition: 'left',
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
      tooltip: '👤 Busca y selecciona al empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma para continuar',
      tooltipPosition: 'left',
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
      tooltip: '👤 Busca y selecciona al empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma para continuar',
      tooltipPosition: 'left',
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
      tooltip: '🚀 ¡Listo! Envía la solicitud',
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
};
