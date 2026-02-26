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
      tooltip:
        '⏰ Tiempo Compensatorio: Permite al empleado solicitar tiempo libre a cambio de horas extras que ya trabajó.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'gestiones-card-disabilities',
      tooltip:
        '📋 Incapacidades: Registra ausencias por enfermedad. Se adjunta el certificado médico y RRHH lo revisa.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'gestiones-card-vacations',
      tooltip:
        '🏖️ Vacaciones: Solicita días de vacaciones para un empleado. Se indica el período y el motivo.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'gestiones-card-documents',
      tooltip:
        '📄 Documentos: Solicita cartas de trabajo, constancias laborales u otros documentos oficiales a RRHH.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'gestiones-card-timelog_correction',
      tooltip:
        '⚠️ Omisión de Marcación: Reporta cuando un empleado olvidó marcar entrada o salida para que RRHH lo corrija.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'gestiones-card-uniform_request',
      tooltip:
        '👕 Uniforme: Solicita prendas de uniforme nuevas indicando tipo, talla y cantidad. ¡Selecciona una tarjeta para comenzar!',
      tooltipPosition: 'top',
      requireClick: false,
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
      tooltip:
        '👤 Abre la lista, selecciona al empleado y presiona "Confirmar". El tutorial avanzará automáticamente.',
      tooltipPosition: 'top',
      requireClick: false,
      advanceOnClickOf: 'gestiones-employee-confirm',
    },
    {
      id: 'disabilities-start-date',
      tooltip:
        '📅 Selecciona la fecha en que inició la incapacidad según el certificado médico.',
      tooltipPosition: 'right',
      requireClick: false,
    },
    {
      id: 'disabilities-end-date',
      tooltip:
        '📅 Selecciona la fecha en que termina la incapacidad según el certificado.',
      tooltipPosition: 'left',
      requireClick: false,
    },
    {
      id: 'disabilities-description',
      tooltip:
        '📝 Escribe el diagnóstico o motivo de la incapacidad. Esto ayuda a RRHH a clasificarla.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'disabilities-file',
      tooltip:
        '📎 Adjunta una foto o PDF del certificado médico. Es obligatorio para que RRHH pueda aprobar.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'disabilities-submit',
      tooltip:
        '🚀 Revisa los datos y envía la solicitud. RRHH la revisará y te notificará.',
      tooltipPosition: 'top',
      requireClick: false,
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
      tooltip:
        '👤 Abre la lista, selecciona al empleado y presiona "Confirmar". El tutorial avanzará automáticamente.',
      tooltipPosition: 'top',
      requireClick: false,
      advanceOnClickOf: 'gestiones-employee-confirm',
    },
    {
      id: 'vacations-start-date',
      tooltip:
        '📅 Selecciona el primer día de vacaciones. El empleado no trabajará a partir de esta fecha.',
      tooltipPosition: 'right',
      requireClick: false,
    },
    {
      id: 'vacations-end-date',
      tooltip:
        '📅 Selecciona el último día de vacaciones. El empleado regresa al día siguiente.',
      tooltipPosition: 'left',
      requireClick: false,
    },
    {
      id: 'vacations-reason',
      tooltip:
        '📝 Puedes agregar un motivo o notas adicionales. Este campo es opcional.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'vacations-submit',
      tooltip:
        '🚀 Envía la solicitud de vacaciones. RRHH la revisará y notificará la decisión.',
      tooltipPosition: 'top',
      requireClick: false,
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
      tooltip:
        '👤 Abre la lista, selecciona al empleado y presiona "Confirmar". El tutorial avanzará automáticamente.',
      tooltipPosition: 'top',
      requireClick: false,
      advanceOnClickOf: 'gestiones-employee-confirm',
    },
    {
      id: 'documents-type',
      tooltip:
        '📄 Elige el tipo de documento: carta de trabajo, constancia laboral, u otro documento oficial.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'documents-reason',
      tooltip:
        '📝 Indica para qué necesitas el documento (ej: trámite bancario, visa, etc.).',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'documents-date',
      tooltip:
        '📅 Selecciona la fecha límite en que necesitas el documento listo.',
      tooltipPosition: 'right',
      requireClick: false,
    },
    {
      id: 'documents-submit',
      tooltip:
        '🚀 Envía la solicitud. RRHH preparará el documento y te notificará cuando esté listo.',
      tooltipPosition: 'top',
      requireClick: false,
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
      tooltip:
        '👤 Abre la lista, selecciona al empleado y presiona "Confirmar". El tutorial avanzará automáticamente.',
      tooltipPosition: 'top',
      requireClick: false,
      advanceOnClickOf: 'gestiones-employee-confirm',
    },
    {
      id: 'compensatory-type',
      tooltip:
        '⏰ Elige si el empleado compensará por horas (salir temprano) o por días completos (día libre).',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'compensatory-dates',
      tooltip:
        '📅 Selecciona cuándo tomará el compensatorio. Si es por horas, indica fecha y rango horario.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'compensatory-reason',
      tooltip:
        '📝 Describe brevemente el motivo de la solicitud. Este campo es opcional.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'compensatory-submit',
      tooltip:
        '🚀 Envía la solicitud. RRHH verificará las horas extras y aprobará o rechazará.',
      tooltipPosition: 'top',
      requireClick: false,
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
      tooltip:
        '👤 Abre la lista, selecciona al empleado y presiona "Confirmar". El tutorial avanzará automáticamente.',
      tooltipPosition: 'top',
      requireClick: false,
      advanceOnClickOf: 'gestiones-employee-confirm',
    },
    {
      id: 'timelog-correction-date',
      tooltip:
        '📅 Selecciona el día en que ocurrió la omisión de marcación.',
      tooltipPosition: 'right',
      requireClick: false,
    },
    {
      id: 'timelog-correction-type',
      tooltip:
        '⏰ Indica qué marcación faltó: entrada, salida, inicio de almuerzo o fin de almuerzo.',
      tooltipPosition: 'left',
      requireClick: false,
    },
    {
      id: 'timelog-correction-reason',
      tooltip:
        '📝 Explica por qué no se realizó la marcación (ej: olvidó marcar, problemas con el reloj, etc.).',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'timelog-correction-file',
      tooltip:
        '📎 Si tienes evidencia de respaldo (foto, captura), puedes adjuntarla aquí. Es opcional.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'timelog-correction-submit',
      tooltip:
        '🚀 Envía el reporte. RRHH revisará y corregirá la marcación del empleado.',
      tooltipPosition: 'top',
      requireClick: false,
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
      tooltip:
        '👤 Abre la lista, selecciona al empleado y presiona "Confirmar". El tutorial avanzará automáticamente.',
      tooltipPosition: 'top',
      requireClick: false,
      advanceOnClickOf: 'gestiones-employee-confirm',
    },
    {
      id: 'uniform-item-type',
      tooltip:
        '👕 Selecciona qué prenda necesita el empleado (camisa, pantalón, zapatos, etc.).',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'uniform-size',
      tooltip:
        '📏 Elige la talla correcta del empleado para esta prenda.',
      tooltipPosition: 'right',
      requireClick: false,
    },
    {
      id: 'uniform-quantity',
      tooltip:
        '🔢 Indica cuántas unidades de esta prenda se necesitan.',
      tooltipPosition: 'left',
      requireClick: false,
    },
    {
      id: 'uniform-notes',
      tooltip:
        '📝 Agrega notas adicionales si es necesario (ej: color específico, urgencia). Es opcional.',
      tooltipPosition: 'top',
      requireClick: false,
    },
    {
      id: 'uniform-submit',
      tooltip:
        '🚀 Envía la solicitud de uniforme. RRHH gestionará el pedido.',
      tooltipPosition: 'top',
      requireClick: false,
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
