import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { addDays, endOfMonth, startOfHour, startOfToday } from 'date-fns';

type EmployeePortalViewMode = 'calendar' | 'table';

type DocumentFormState = {
  type: string;
  customType: string;
  reason: string;
  requiredDate: Date | null;
  submitting: boolean;
};

type TimeRange = {
  startDate: Date | null;
  endDate: Date | null;
  reason: string;
};

type VacationFormState = TimeRange & {
  selectedFile: File | null;
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
  compensatoryFile: File | null;
  selectedEmployeeId: string | null;
};

export type NotificationFilter = 'all' | 'unread' | 'requests' | 'approvals';

type EmployeePortalState = {
  activeSection: string;
  dateRange: Date[];
  calendarMonth: Date;
  timelogViewMode: EmployeePortalViewMode;
  conversationDialogVisible: boolean;
  replyMessage: string;
  sendingReply: boolean;
  showSalary: boolean;
  showSalaryPinDialog: boolean;
  documentForm: DocumentFormState;
  vacationForm: VacationFormState;
  compensatoryForm: CompensatoryFormState;
  notificationFilter: NotificationFilter;
};

const initialDateRange: Date[] = [
  addDays(new Date(), -7),
  endOfMonth(new Date()),
];

const initialState: EmployeePortalState = {
  activeSection: 'dashboard',
  dateRange: initialDateRange,
  calendarMonth: startOfToday(),
  timelogViewMode: 'table',
  conversationDialogVisible: false,
  replyMessage: '',
  sendingReply: false,
  showSalary: false,
  showSalaryPinDialog: false,
  documentForm: {
    type: 'work_letter',
    customType: '',
    reason: '',
    requiredDate: null,
    submitting: false,
  },
  vacationForm: {
    startDate: null,
    endDate: null,
    reason: '',
    selectedFile: null,
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
    compensatoryFile: null,
    selectedEmployeeId: null,
  },
  notificationFilter: 'all' as NotificationFilter,
};

const roundToHour = (date: Date | null): Date | null => {
  if (!date) {
    return null;
  }
  return startOfHour(date);
};

export const EmployeePortalStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => ({
    // Solo mantener computed para valores derivados o transformados
    canSubmitDocument: computed(() => {
      const { type, customType, reason, requiredDate } = state.documentForm();
      const trimmedReason = reason.trim();
      if (!trimmedReason || trimmedReason.length < 10) {
        return false;
      }
      if (!requiredDate) {
        return false;
      }
      if (type === 'other') {
        return customType.trim().length > 0;
      }
      return true;
    }),
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
    closeConversation() {
      patchState(state, {
        conversationDialogVisible: false,
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
      // If currently showing, just hide it
      if (state.showSalary()) {
        patchState(state, { showSalary: false });
      } else {
        // If hidden, we need authentication -> open dialog
        patchState(state, { showSalaryPinDialog: true });
      }
    },
    setShowSalary(value: boolean) {
      patchState(state, { showSalary: value });
    },
    openSalaryPinDialog() {
      patchState(state, { showSalaryPinDialog: true });
    },
    closeSalaryPinDialog() {
      patchState(state, { showSalaryPinDialog: false });
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
    setVacationFile(value: File | null) {
      patchState(state, {
        vacationForm: {
          ...state.vacationForm(),
          selectedFile: value,
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
          selectedFile: null,
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
      const currentDays = new Set(
        state.compensatoryForm().selectedOvertimeDays
      );
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
    setCompensatoryFile(value: File | null) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          compensatoryFile: value,
        },
      });
    },

    setSelectedEmployeeId(value: string | null) {
      patchState(state, {
        compensatoryForm: {
          ...state.compensatoryForm(),
          selectedEmployeeId: value,
        },
      });
    },
    setNotificationFilter(filter: NotificationFilter) {
      patchState(state, { notificationFilter: filter });
    },
  }))
);
