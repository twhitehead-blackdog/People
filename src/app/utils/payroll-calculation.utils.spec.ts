import {
  biweeklySalary,
  hourlySalary,
  calculateISR,
  calculateDeductions,
  calculateDebtDeductions,
  calculateEmployeePayroll,
  calculatePeriodDates,
  generateYearPeriods,
  isHoliday,
  type DeductionRule,
  type DebtForPeriod,
  type AttendanceSummary,
} from './payroll-calculation.utils';

// ============================================
// SALARIOS
// ============================================

describe('biweeklySalary', () => {
  it('should divide monthly salary by 2', () => {
    expect(biweeklySalary(1000)).toBe(500);
    expect(biweeklySalary(1500)).toBe(750);
    expect(biweeklySalary(2400)).toBe(1200);
  });

  it('should handle zero salary', () => {
    expect(biweeklySalary(0)).toBe(0);
  });

  it('should round to 2 decimals', () => {
    expect(biweeklySalary(1001)).toBe(500.5);
    expect(biweeklySalary(999)).toBe(499.5);
  });
});

describe('hourlySalary', () => {
  it('should divide monthly salary by monthly hours', () => {
    expect(hourlySalary(2080, 208)).toBe(10);
  });

  it('should use default 208 hours', () => {
    expect(hourlySalary(2080)).toBe(10);
  });

  it('should handle zero hours', () => {
    expect(hourlySalary(1000, 0)).toBe(0);
  });
});

// ============================================
// ISR - IMPUESTO SOBRE LA RENTA
// ============================================

describe('calculateISR', () => {
  it('should return 0 for income below exemption ($11,000 annual)', () => {
    // biweekly $350 → monthly $700 → annual with XIII $9,100 → below $11,000
    expect(calculateISR(350)).toBe(0);
  });

  it('should calculate 15% bracket correctly', () => {
    // biweekly $1,000 → monthly $2,000 → annual gross with XIII $26,000
    // CSS: $26,000 * 9.75% = $2,535
    // SE: $26,000 * 1.25% = $325
    // Taxable: $26,000 - $2,535 - $325 = $23,140
    // ISR: ($23,140 - $11,000) * 15% = $12,140 * 0.15 = $1,821
    // Per period: $1,821 / 24 = $75.88
    const isr = calculateISR(1000);
    expect(isr).toBeGreaterThan(0);
    expect(isr).toBeLessThan(200);
  });

  it('should calculate 25% bracket correctly for high income', () => {
    // biweekly $3,000 → monthly $6,000 → annual gross with XIII $78,000
    // CSS: $78,000 * 9.75% = $7,605
    // SE: $78,000 * 1.25% = $975
    // Taxable: $78,000 - $7,605 - $975 = $69,420
    // ISR bracket 1: ($50,000 - $11,000) * 15% = $5,850
    // ISR bracket 2: ($69,420 - $50,000) * 25% = $4,855
    // Total annual ISR: $10,705
    // Per period: $10,705 / 24 ≈ $446.04
    const isr = calculateISR(3000);
    expect(isr).toBeGreaterThan(400);
    expect(isr).toBeLessThan(500);
  });

  it('should return 0 for zero income', () => {
    expect(calculateISR(0)).toBe(0);
  });

  it('should return 0 for negative income', () => {
    expect(calculateISR(-100)).toBe(0);
  });
});

// ============================================
// DEDUCCIONES
// ============================================

const STANDARD_DEDUCTIONS: DeductionRule[] = [
  { name: 'Seguro Social (CSS)', value: 9.75, min_salary: 0, income_tax: false, calculation_type: 'percentage', applies_to: 'regular', is_employer_portion: false, employer_value: 0 },
  { name: 'Seguro Educativo', value: 1.25, min_salary: 0, income_tax: false, calculation_type: 'percentage', applies_to: 'regular', is_employer_portion: false, employer_value: 0 },
  { name: 'Impuesto sobre la Renta', value: 0, min_salary: 0, income_tax: true, calculation_type: 'percentage', applies_to: 'regular', is_employer_portion: false, employer_value: 0 },
  { name: 'CSS Patronal', value: 0, min_salary: 0, income_tax: false, calculation_type: 'percentage', applies_to: 'regular', is_employer_portion: true, employer_value: 12.25 },
  { name: 'SE Patronal', value: 0, min_salary: 0, income_tax: false, calculation_type: 'percentage', applies_to: 'regular', is_employer_portion: true, employer_value: 1.50 },
  { name: 'Riesgo Profesional', value: 0, min_salary: 0, income_tax: false, calculation_type: 'percentage', applies_to: 'regular', is_employer_portion: true, employer_value: 1.62 },
];

describe('calculateDeductions', () => {
  it('should apply CSS and SE for regular employees', () => {
    const gross = 1000; // biweekly
    const { employee } = calculateDeductions(gross, 2000, STANDARD_DEDUCTIONS, 'regular');

    expect(employee['Seguro Social (CSS)']).toBe(97.5);
    expect(employee['Seguro Educativo']).toBe(12.5);
  });

  it('should calculate ISR for regular employees with sufficient income', () => {
    const gross = 1500;
    const { employee } = calculateDeductions(gross, 3000, STANDARD_DEDUCTIONS, 'regular');

    expect(employee['Impuesto sobre la Renta']).toBeGreaterThan(0);
  });

  it('should return empty deductions for honorarios', () => {
    const { employee, employer } = calculateDeductions(1500, 3000, STANDARD_DEDUCTIONS, 'honorarios');

    expect(Object.keys(employee)).toHaveLength(0);
    expect(Object.keys(employer)).toHaveLength(0);
  });

  it('should calculate employer portions', () => {
    const { employer } = calculateDeductions(1000, 2000, STANDARD_DEDUCTIONS, 'regular');

    expect(employer['CSS Patronal']).toBe(122.5);
    expect(employer['SE Patronal']).toBe(15);
    expect(employer['Riesgo Profesional']).toBe(16.2);
  });
});

// ============================================
// PRÉSTAMOS
// ============================================

describe('calculateDebtDeductions', () => {
  it('should deduct installment amount', () => {
    const debts: DebtForPeriod[] = [
      { id: '1', description: 'Préstamo empresa', installment_amount: 100, balance: 500 },
    ];
    const result = calculateDebtDeductions(debts);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(100);
  });

  it('should not deduct more than balance', () => {
    const debts: DebtForPeriod[] = [
      { id: '1', description: 'Última cuota', installment_amount: 100, balance: 50 },
    ];
    const result = calculateDebtDeductions(debts);
    expect(result[0].amount).toBe(50);
  });

  it('should skip debts with zero balance', () => {
    const debts: DebtForPeriod[] = [
      { id: '1', description: 'Pagado', installment_amount: 100, balance: 0 },
    ];
    const result = calculateDebtDeductions(debts);
    expect(result).toHaveLength(0);
  });

  it('should handle multiple debts', () => {
    const debts: DebtForPeriod[] = [
      { id: '1', description: 'Banco', installment_amount: 200, balance: 1000 },
      { id: '2', description: 'Empresa', installment_amount: 50, balance: 300 },
    ];
    const result = calculateDebtDeductions(debts);
    expect(result).toHaveLength(2);
    expect(result.reduce((s, d) => s + d.amount, 0)).toBe(250);
  });
});

// ============================================
// CÁLCULO COMPLETO
// ============================================

describe('calculateEmployeePayroll', () => {
  const emptyAttendance: AttendanceSummary = {
    worked_hours_payment: 0,
    sunday_payment: 0,
    holiday_payment: 0,
    overtime_payment: 0,
    late_hours_payment: 0,
    absence_hours_payment: 0,
    compensatory_hours_payment: 0,
  };

  it('should calculate a basic regular payroll', () => {
    const result = calculateEmployeePayroll(
      { monthly_salary: 2000, payroll_type: 'regular' },
      emptyAttendance,
      STANDARD_DEDUCTIONS,
      [],
    );

    expect(result.base_salary).toBe(1000);
    expect(result.gross_income).toBe(1000);
    expect(result.total_deductions).toBeGreaterThan(0);
    expect(result.net_pay).toBeLessThan(1000);
    expect(result.employer_cost).toBeGreaterThan(0);
  });

  it('should have zero deductions for honorarios', () => {
    const result = calculateEmployeePayroll(
      { monthly_salary: 2000, payroll_type: 'honorarios' },
      emptyAttendance,
      STANDARD_DEDUCTIONS,
      [],
    );

    expect(result.base_salary).toBe(1000);
    expect(result.total_deductions).toBe(0);
    expect(result.net_pay).toBe(1000);
    expect(result.employer_cost).toBe(0);
  });

  it('should add sunday premium to income', () => {
    const result = calculateEmployeePayroll(
      { monthly_salary: 2000, payroll_type: 'honorarios' },
      { ...emptyAttendance, sunday_payment: 50 },
      STANDARD_DEDUCTIONS,
      [],
    );

    expect(result.sunday_amount).toBe(50);
    expect(result.gross_income).toBe(1050);
    expect(result.net_pay).toBe(1050);
  });

  it('should subtract late penalties from gross income', () => {
    const result = calculateEmployeePayroll(
      { monthly_salary: 2000, payroll_type: 'honorarios' },
      { ...emptyAttendance, late_hours_payment: 30 },
      STANDARD_DEDUCTIONS,
      [],
    );

    expect(result.late_amount).toBe(30);
    expect(result.gross_income).toBe(970);
  });

  it('should subtract absences from gross income (reduces deduction base)', () => {
    const withAbsence = calculateEmployeePayroll(
      { monthly_salary: 2000, payroll_type: 'regular' },
      { ...emptyAttendance, absence_hours_payment: 200 },
      STANDARD_DEDUCTIONS,
      [],
    );
    const withoutAbsence = calculateEmployeePayroll(
      { monthly_salary: 2000, payroll_type: 'regular' },
      emptyAttendance,
      STANDARD_DEDUCTIONS,
      [],
    );

    // Absence reduces gross income
    expect(withAbsence.absence_amount).toBe(200);
    expect(withAbsence.gross_income).toBe(800); // 1000 - 200
    // Deductions should be lower when absent (calculated on lower gross)
    expect(withAbsence.total_deductions).toBeLessThan(withoutAbsence.total_deductions);
  });

  it('should deduct loan installments', () => {
    const debts: DebtForPeriod[] = [
      { id: '1', description: 'Préstamo', installment_amount: 150, balance: 500 },
    ];
    const result = calculateEmployeePayroll(
      { monthly_salary: 2000, payroll_type: 'honorarios' },
      emptyAttendance,
      STANDARD_DEDUCTIONS,
      debts,
    );

    expect(result.total_debt).toBe(150);
    expect(result.net_pay).toBe(850);
  });
});

// ============================================
// GENERACIÓN DE PERÍODOS
// ============================================

describe('calculatePeriodDates', () => {
  it('should generate first period (corte 10)', () => {
    const period = calculatePeriodDates(2026, 3, 1); // Marzo 2026, primera quincena

    expect(period.period_number).toBe(1);
    expect(period.month).toBe(3);
    expect(period.year).toBe(2026);
    expect(period.title).toBe('Primera de Marzo 2026');

    // Período 1: 26 feb → 10 mar
    expect(period.start_date.getDate()).toBe(26);
    expect(period.start_date.getMonth()).toBe(1); // Feb = 1
    expect(period.end_date.getDate()).toBe(10);
    expect(period.end_date.getMonth()).toBe(2); // Mar = 2

    // 15 de marzo 2026 es domingo → ajusta al sábado 14
    expect(period.payment_date.getDate()).toBe(14);
    expect(period.payment_date.getMonth()).toBe(2);
  });

  it('should generate second period (corte 25)', () => {
    const period = calculatePeriodDates(2026, 3, 2);

    expect(period.period_number).toBe(2);
    expect(period.title).toBe('Segunda de Marzo 2026');

    // Período 2: 11 mar → 25 mar
    expect(period.start_date.getDate()).toBe(11);
    expect(period.end_date.getDate()).toBe(25);

    // Pago el 30 de marzo
    expect(period.payment_date.getDate()).toBe(30);
  });

  it('should adjust payment date if Sunday', () => {
    // 15 de marzo 2026 es domingo
    const period = calculatePeriodDates(2026, 3, 1, 10, 25, 15, 30, true);
    // Debería pagar el sábado 14
    expect(period.payment_date.getDate()).toBe(14);
  });

  it('should handle January (wraps to December prev year)', () => {
    const period = calculatePeriodDates(2026, 1, 1);
    // Start: 26 dic 2025
    expect(period.start_date.getFullYear()).toBe(2025);
    expect(period.start_date.getMonth()).toBe(11); // Dec = 11
    expect(period.start_date.getDate()).toBe(26);
  });
});

describe('generateYearPeriods', () => {
  it('should generate 24 periods for a year', () => {
    const periods = generateYearPeriods(2026);
    expect(periods).toHaveLength(24);
  });

  it('should alternate between period 1 and 2', () => {
    const periods = generateYearPeriods(2026);
    expect(periods[0].period_number).toBe(1);
    expect(periods[1].period_number).toBe(2);
    expect(periods[2].period_number).toBe(1);
  });
});

// ============================================
// FERIADOS
// ============================================

describe('isHoliday', () => {
  const holidays = [
    { date: '2026-01-01', is_recurring: true },
    { date: '2026-02-17', is_recurring: false },
  ];

  it('should detect exact date match', () => {
    expect(isHoliday('2026-01-01', holidays)).toBe(true);
    expect(isHoliday('2026-02-17', holidays)).toBe(true);
  });

  it('should detect recurring holiday in different year', () => {
    expect(isHoliday('2027-01-01', holidays)).toBe(true);
  });

  it('should NOT detect non-recurring holiday in different year', () => {
    expect(isHoliday('2027-02-17', holidays)).toBe(false);
  });

  it('should return false for non-holidays', () => {
    expect(isHoliday('2026-06-15', holidays)).toBe(false);
  });
});
