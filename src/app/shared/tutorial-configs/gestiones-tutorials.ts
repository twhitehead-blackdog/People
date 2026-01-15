import { TutorialConfig } from '../../services/tutorial-guide.service';

/**
 * Tutorial configurations for Branch Manager Gestiones
 * Interactive mode: user clicks to advance, short tooltips
 */

/**
 * Intro tutorial - shows all 4 gestiones in order:
 * Compensatorio → Incapacidades → Vacaciones → Documentos
 */
export const GESTIONES_TUTORIAL_INTRO: TutorialConfig = {
  id: 'gestiones-intro',
  name: 'Introducción a Gestiones',
  steps: [
    {
      id: 'gestiones-card-compensatory',
      tooltip: '⏰ Tiempo Compensatorio - para horas extras trabajadas',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-card-disabilities',
      tooltip: '📋 Incapacidades - registrar ausencias médicas',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-card-vacations',
      tooltip: '🏖️ Vacaciones - solicitar días libres',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-card-documents',
      tooltip: '📄 Documentos - cartas y constancias',
      tooltipPosition: 'bottom',
      isPrompt: true, // Last step - user selects one
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
      tooltip: '👤 Selecciona al empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma y continúa',
      tooltipPosition: 'right',
    },
    {
      id: 'disabilities-start-date',
      tooltip: '📅 Fecha de inicio de la incapacidad',
      tooltipPosition: 'right',
    },
    {
      id: 'disabilities-end-date',
      tooltip: '📅 Fecha de fin',
      tooltipPosition: 'left',
    },
    {
      id: 'disabilities-description',
      tooltip: '📝 Describe el motivo',
      tooltipPosition: 'top',
    },
    {
      id: 'disabilities-file',
      tooltip: '📎 Adjunta el certificado médico',
      tooltipPosition: 'top',
    },
    {
      id: 'disabilities-submit',
      tooltip: '🚀 ¡Envía la solicitud!',
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
      tooltip: '👤 Selecciona al empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma y continúa',
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
      tooltip: '📝 Motivo (opcional)',
      tooltipPosition: 'top',
    },
    {
      id: 'vacations-submit',
      tooltip: '🚀 ¡Solicita las vacaciones!',
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
      tooltip: '👤 Selecciona al empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma y continúa',
      tooltipPosition: 'right',
    },
    {
      id: 'documents-type',
      tooltip: '📄 Elige el tipo de documento',
      tooltipPosition: 'bottom',
    },
    {
      id: 'documents-reason',
      tooltip: '📝 Explica para qué lo necesitas',
      tooltipPosition: 'top',
    },
    {
      id: 'documents-date',
      tooltip: '📅 ¿Para cuándo lo necesitas?',
      tooltipPosition: 'right',
    },
    {
      id: 'documents-submit',
      tooltip: '🚀 ¡Envía la solicitud!',
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
      tooltip: '👤 Selecciona al empleado',
      tooltipPosition: 'bottom',
    },
    {
      id: 'gestiones-employee-confirm',
      tooltip: '✅ Confirma y continúa',
      tooltipPosition: 'right',
    },
    {
      id: 'compensatory-type',
      tooltip: '⏰ ¿Por horas o por días?',
      tooltipPosition: 'bottom',
    },
    {
      id: 'compensatory-dates',
      tooltip: '📅 Selecciona las fechas',
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

/** Map of tutorial configs by gestión type */
export const GESTIONES_TUTORIALS: Record<string, TutorialConfig> = {
  intro: GESTIONES_TUTORIAL_INTRO,
  disabilities: DISABILITIES_TUTORIAL,
  vacations: VACATIONS_TUTORIAL,
  documents: DOCUMENTS_TUTORIAL,
  compensatory: COMPENSATORY_TUTORIAL,
};
