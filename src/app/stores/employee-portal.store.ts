import { computed } from '@angular/core';
import { addDays, endOfMonth, startOfToday } from 'date-fns';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

type EmployeePortalViewMode = 'calendar' | 'table';

type DocumentFormState = {
  type: string;
  customType: string;
  reason: string;
  requiredDate: Date | null;
  submitting: boolean;
};

type ComplaintFormState = {
  category: string;
  text: string;
  allowContact: boolean;
  contactMethod: string;
  submitting: boolean;
};

type TimeRange = {
  startDate: Date | null;
  endDate: Date | null;
  reason: string;
};

type VacationFormState = TimeRange & {
  submitting: boolean;
};

type CompensatoryFormState = TimeRange & {
  type: 'hours' | 'days';
  submitting: boolean;
  showTutorial: boolean;
  compensatoryDate: Date | null;
  compensatoryTimeStart: Date | null;
  compensatoryTimeEnd: Date | null;
  selectedOvertimeDays: string[];
  manualOvertimeDates: Date[];
  newOvertimeDate: Date | null;
};

type EmployeePortalState = {
  activeSection: string;
  dateRange: Date[];
  calendarMonth: Date;
  timelogViewMode: EmployeePortalViewMode;
  conversationDialogVisible: boolean;
  selectedComplaintId: string | null;
  replyMessage: string;
  sendingReply: boolean;
  showSalary: boolean;
  documentForm: DocumentFormState;
  complaintForm: ComplaintFormState;
  vacationForm: VacationFormState;
  compensatoryForm: CompensatoryFormState;
};

const initialDateRange: Date[] = [addDays(new Date(), -7), endOfMonth(new Date())];

const initialState: EmployeePortalState = {
  activeSection: 'dashboard',
  dateRange: initialDateRange,
  calendarMonth: startOfToday(),
  timelogViewMode: 'table',
  conversationDialogVisible: false,
  selectedComplaintId: null,
  replyMessage: '',
  sendingReply: false,
  showSalary: false,
  documentForm: {
    type: 'work_letter',
    customType: '',
    reason: '',
    requiredDate: null,
    submitting: false,
  },
  complaintForm: {
    category: 'work_environment',
    text: '',
    allowContact: false,
    contactMethod: 'email',
    submitting: false,
  },
  vacationForm: {
    startDate: null,
    endDate: null,
    reason: '',
    submitting: false,
  },
  compensatoryForm: {
    startDate: null,
    endDate: null,
    reason: '',
    submitting: false,
    showTutorial: false,
    type: 'hours',
    compensatoryDate: null,
    compensatoryTimeStart: null,
    compensatoryTimeEnd: null,
    selectedOvertimeDays: [],
    manualOvertimeDates: [],
    newOvertimeDate: null,
  },
};

const roundToHour = (date: Date | null): Date | null => {
  if (!date) {
    return null;
  }
  const rounded = new Date(date);
  rounded.setMinutes(0, 0, 0);
  return rounded;
};

export const EmployeePortalStore = signalStore({ providedIn: 'root' },
  withState(initialState),
  withComputed((state) => ({
    // Solo mantener computed para valores derivados o transformados
    canSubmitDocument: computed(() => {
      const { type, customType, reason } = state.documentForm();
      const trimmedReason = reason.trim();
      if (!trimmedReason || trimmedReason.length < 10) {
        return false;
      }
      if (type === 'other') {
        return customType.trim().length > 0;
      }
      return true;
    }),
    canSubmitComplaint: computed(() => state.complaintForm().text.trim().length >= 10),
    // Transforma array a Set para facilitar operaciones
    selectedOvertimeDays: computed(
      () => new Set(state.compensatoryForm().selectedOvertimeDays)
    ),
  })),
  withMethods((state) => ({
    setActiveSection(section: string) {
      patchState(state, { activeSection: section });
    },
    setDateRange(range: Date[]) {
      patchState(state, { dateRange: [...range] });
    },
    setCalendarMonth(month: Date) {
      patchState(state, { calendarMonth: month });
    },
    setTimelogViewMode(mode: EmployeePortalViewMode) {
      patchState(state, { timelogViewMode: mode });
    },
    openConversation(complaintId: string) {
      patchState(state, {
        conversationDialogVisible: true,
        selectedComplaintId: complaintId,
      });
    },
    closeConversation() {
      patchState(state, {
        conversationDialogVisible: false,
        selectedComplaintId: null,
        replyMessage: '',
      });
    },
    setReplyMessage(message: string) {
      patchState(state, { replyMessage: message });
    },
    setSendingReply(value: boolean) {
      patchState(state, { sendingReply: value });
    },
    toggleShowSalary() {
      patchState(state, { showSalary: !state.showSalary() });
    },
    setShowSalary(value: boolean) {
      patchState(state, { showSalary: value });
    },
    setDocumentType(value: string) {
      patchState(state, {
        documentForm: {
          ...state.documentForm(),
          type: value,
        },
      });
    },
    setCustomDocumentType(value: string) {
      patchState(state, {
        documentForm: {
          ...state.documentForm(),
          customType: value,
        },
      });
    },
    setDocumentReason(value: string) {
      patchState(state, {
        documentForm: {
          ...state.documentForm(),
          reason: value,
        },
      });
    },
    setDocumentRequiredDate(value: Date | null) {
      patchState(state, {
        documentForm: {
          ...state.documentForm(),
          requiredDate: value,
        },
      });
    },
    setSubmittingDocument(value: boolean) {
      patchState(state, {
        documentForm: {
          ...state.documentForm(),
          submitting: value,
        },
      });
    },
    resetDocumentForm() {
      patchState(state, {
        documentForm: {
          type: 'work_letter',
          customType: '',
          reason: '',
          requiredDate: null,
          submitting: false,
        },
      });
    },
    setComplaintCategory(value: string) {
      patchState(state, {
        complaintForm: {
          ...state.complaintForm(),
          category: value,
        },
      });
    },
    setComplaintText(value: string) {
      patchState(state, {
        complaintForm: {
          ...state.complaintForm(),
          text: value,
        },
      });
    },
    setAllowContact(value: boolean) {
      patchState(state, {
        complaintForm: {
          ...state.complaintForm(),
          allowContact: value,
        },
      });
    },
    setContactMethod(value: string) {
      patchState(state, {
        complaintForm: {
          ...state.complaintForm(),
          contactMethod: value,
        },
      });
    },
    setSubmittingComplaint(value: boolean) {
      patchState(state, {
        complaintForm: {
          ...state.complaintForm(),
          submitting: value,
        },
      });
    },
    setVacationStartDate(value: Date | null) {
      patchState(state, {
        vacationForm: {
          ...state.vacationForm(),
          startDate: value,
        },
      });
    },
    setVacationEndDate(value: Date | null) {
      patchState(state, {
        vacationForm: {
          ...state.vacationForm(),
          endDate: value,
        },
      });
    },
    setVacationReason(value: string) {
      patchState(state, {
        vacationForm: {
          ...state.vacationForm(),
          reason: value,
        },
      });
    },
    setSubmittingVacation(value: boolean) {
      patchState(state, {
        vacationForm: {
          ...state.vacationForm(),
          submitting: value,
        },
      });
    },
    resetVacationForm() {
      patchState(state, {
        vacationForm: {
          startDate: null,
          endDate: null,
          reason: '',
          submitting: false,
        },
      });
    },
    setCompensatoryStartDate(value: Date | null) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          startDate: value,
        },
      });
    },
    setCompensatoryEndDate(value: Date | null) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          endDate: value,
        },
      });
    },
    setCompensatoryType(value: 'hours' | 'days') {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          type: value,
        },
      });
    },
    setCompensatoryReason(value: string) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          reason: value,
        },
      });
    },
    setSubmittingCompensatory(value: boolean) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          submitting: value,
        },
      });
    },
    setShowTutorialDialog(value: boolean) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          showTutorial: value,
        },
      });
    },
    setCompensatoryDate(value: Date | null) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          compensatoryDate: value,
        },
      });
    },
    setCompensatoryTimeStart(value: Date | null) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          compensatoryTimeStart: roundToHour(value),
        },
      });
    },
    setCompensatoryTimeEnd(value: Date | null) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          compensatoryTimeEnd: roundToHour(value),
        },
      });
    },
    toggleOvertimeDay(day: string) {
      const currentDays = new Set(state.compensatoryForm().selectedOvertimeDays);
      if (currentDays.has(day)) {
        currentDays.delete(day);
      } else {
        currentDays.add(day);
      }
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          selectedOvertimeDays: Array.from(currentDays),
        },
      });
    },
    setManualOvertimeDates(dates: Date[]) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          manualOvertimeDates: dates,
        },
      });
    },
    setNewOvertimeDate(value: Date | null) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          newOvertimeDate: value,
        },
      });
    },
  }))
);
