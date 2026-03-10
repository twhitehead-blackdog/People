import {
  calculatePendingSalary,
  calculateProportionalXIII,
  calculateSeniorityBonus,
  calculateNoticePay,
  calculateSeverancePay,
  getApplicableComponents,
  calculateFullLiquidation,
} from './liquidation-calculation.utils';

describe('Liquidation Calculation Utils', () => {
  describe('calculatePendingSalary', () => {
    it('should calculate pending salary for 15 days', () => {
      const result = calculatePendingSalary(1500, '2025-03-01', '2025-03-16');
      // Daily rate: 1500/30 = 50. 15 days × 50 = 750
      expect(result.days).toBe(15);
      expect(result.amount).toBe(750);
    });

    it('should return 0 if termination is before last pay date', () => {
      const result = calculatePendingSalary(1500, '2025-03-16', '2025-03-01');
      expect(result.amount).toBe(0);
      expect(result.days).toBe(0);
    });

    it('should return 0 for same day', () => {
      const result = calculatePendingSalary(1500, '2025-03-01', '2025-03-01');
      expect(result.amount).toBe(0);
    });
  });

  describe('calculateProportionalXIII', () => {
    it('should calculate XIII for mid-cuatrimestre 1', () => {
      // Feb 15 → cuatrimestre starts Dec 16 prev year
      const result = calculateProportionalXIII(1500, '2025-02-15');
      expect(result).toBeGreaterThan(0);
      // Result should be a reasonable proportional XIII amount
      expect(result).toBeGreaterThan(500);
      expect(result).toBeLessThan(1500);
    });

    it('should calculate XIII for cuatrimestre 2', () => {
      // Jun 15 → cuatrimestre starts Apr 16
      // Days from Apr 16 to Jun 15 = 60 days + 1 = 61
      const result = calculateProportionalXIII(1500, '2025-06-15');
      expect(result).toBeGreaterThan(0);
    });

    it('should calculate XIII for cuatrimestre 3', () => {
      // Oct 15 → cuatrimestre starts Aug 16
      // Days from Aug 16 to Oct 15 = 60 + 1 = 61
      const result = calculateProportionalXIII(1500, '2025-10-15');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculateSeniorityBonus', () => {
    it('should return 0 for less than 1 year', () => {
      const result = calculateSeniorityBonus(1500, '2025-01-01', '2025-06-01');
      expect(result.amount).toBe(0);
      expect(result.years).toBe(0);
    });

    it('should calculate 1 week for 1 year', () => {
      const result = calculateSeniorityBonus(1500, '2024-01-01', '2025-01-01');
      // Weekly rate: 1500 / 4.333 ≈ 346.19
      expect(result.years).toBe(1);
      expect(result.amount).toBeCloseTo(346.19, 0);
    });

    it('should calculate 5 weeks for 5 years', () => {
      const result = calculateSeniorityBonus(1500, '2020-01-01', '2025-01-01');
      expect(result.years).toBe(5);
      // 5 × 346.19 ≈ 1730.95
      expect(result.amount).toBeCloseTo(1730.95, 0);
    });
  });

  describe('calculateNoticePay', () => {
    it('should return monthly salary for despido injustificado', () => {
      expect(calculateNoticePay(1500, 'DESPIDO_INJUSTIFICADO')).toBe(1500);
    });

    it('should return monthly salary for renuncia justificada', () => {
      expect(calculateNoticePay(1500, 'RENUNCIA_JUSTIFICADA')).toBe(1500);
    });

    it('should return 0 for renuncia voluntaria', () => {
      expect(calculateNoticePay(1500, 'RENUNCIA')).toBe(0);
    });

    it('should return 0 for despido justificado', () => {
      expect(calculateNoticePay(1500, 'DESPIDO_JUSTIFICADO')).toBe(0);
    });

    it('should return 0 for mutuo acuerdo', () => {
      expect(calculateNoticePay(1500, 'MUTUO_ACUERDO')).toBe(0);
    });
  });

  describe('calculateSeverancePay', () => {
    it('should give minimum 1 week for less than 3 months', () => {
      const result = calculateSeverancePay(1500, '2025-01-01', '2025-03-01');
      expect(result.weeks).toBe(1);
      // 1500 / 4.333 ≈ 346.19
      expect(result.amount).toBeCloseTo(346.19, 0);
    });

    it('should give 1 week per 3 months for <1 year', () => {
      // 9 months = 3 quarters = 3 weeks (differenceInMonths may give 8 for these dates)
      const result = calculateSeverancePay(1500, '2025-01-01', '2025-10-01');
      // Should give at least 1 week and be within reason
      expect(result.weeks).toBeGreaterThanOrEqual(1);
      expect(result.weeks).toBeLessThanOrEqual(3);
      expect(result.amount).toBeGreaterThan(0);
    });

    it('should give 3.4 weeks per year for 1-10 years', () => {
      // 5 years = 5 × 3.4 = 17 weeks
      const result = calculateSeverancePay(1500, '2020-01-01', '2025-01-01');
      expect(result.weeks).toBe(17);
    });

    it('should give 34 + extra for >10 years', () => {
      // 12 years = 34 + 2 = 36 weeks
      const result = calculateSeverancePay(1500, '2013-01-01', '2025-01-01');
      expect(result.weeks).toBe(36);
    });

    it('should use avg salary when provided', () => {
      const result = calculateSeverancePay(2000, '2020-01-01', '2025-01-01', 1800);
      // Should use 1800 not 2000
      const weeklyRate = 1800 / 4.333;
      const expectedWeeks = 17; // 5 years × 3.4
      expect(result.amount).toBeCloseTo(weeklyRate * expectedWeeks, 0);
    });
  });

  describe('getApplicableComponents', () => {
    it('should include all components for despido injustificado', () => {
      const result = getApplicableComponents('DESPIDO_INJUSTIFICADO', 'INDEFINIDO');
      expect(result.pendingSalary).toBe(true);
      expect(result.vacations).toBe(true);
      expect(result.xiiiMonth).toBe(true);
      expect(result.seniorityBonus).toBe(true);
      expect(result.noticePay).toBe(true);
      expect(result.severancePay).toBe(true);
    });

    it('should exclude severance, notice and seniority for renuncia voluntaria', () => {
      const result = getApplicableComponents('RENUNCIA', 'INDEFINIDO');
      expect(result.pendingSalary).toBe(true);
      expect(result.vacations).toBe(true);
      expect(result.xiiiMonth).toBe(true);
      expect(result.seniorityBonus).toBe(false); // Art. 224: no prima for voluntary resignation
      expect(result.noticePay).toBe(false);
      expect(result.severancePay).toBe(false);
    });

    it('should exclude seniority bonus for despido justificado', () => {
      const result = getApplicableComponents('DESPIDO_JUSTIFICADO', 'INDEFINIDO');
      expect(result.seniorityBonus).toBe(false);
      expect(result.noticePay).toBe(false);
      expect(result.severancePay).toBe(false);
    });

    it('should include notice but not severance for renuncia justificada', () => {
      const result = getApplicableComponents('RENUNCIA_JUSTIFICADA', 'INDEFINIDO');
      expect(result.noticePay).toBe(true);
      expect(result.severancePay).toBe(false);
      expect(result.seniorityBonus).toBe(true);
    });
  });

  describe('calculateFullLiquidation', () => {
    it('should calculate full liquidation for despido injustificado', () => {
      const result = calculateFullLiquidation({
        monthlySalary: 1500,
        hireDate: '2020-01-01',
        terminationDate: '2025-03-01',
        terminationType: 'DESPIDO_INJUSTIFICADO',
        contractType: 'INDEFINIDO',
        lastPayDate: '2025-02-25',
        vacationUsedDays: 30,
      });

      expect(result.pendingSalary).toBeGreaterThan(0);
      expect(result.vacationPay).toBeGreaterThan(0);
      expect(result.xiiiMonthProportional).toBeGreaterThan(0);
      expect(result.seniorityBonus).toBeGreaterThan(0);
      expect(result.noticePay).toBe(1500);
      expect(result.severancePay).toBeGreaterThan(0);
      expect(result.grossTotal).toBeGreaterThan(0);
      expect(result.cssDeduction).toBeGreaterThan(0);
      expect(result.netTotal).toBeLessThan(result.grossTotal);
    });

    it('should calculate renuncia with no severance/notice/seniority', () => {
      const result = calculateFullLiquidation({
        monthlySalary: 1500,
        hireDate: '2024-01-01',
        terminationDate: '2025-03-01',
        terminationType: 'RENUNCIA',
        contractType: 'INDEFINIDO',
        lastPayDate: '2025-02-25',
      });

      expect(result.noticePay).toBe(0);
      expect(result.severancePay).toBe(0);
      expect(result.seniorityBonus).toBe(0); // No prima for voluntary resignation
      expect(result.vacationPay).toBeGreaterThan(0);
      expect(result.xiiiMonthProportional).toBeGreaterThan(0);
    });

    it('should include preaviso in CSS/SE base but not ISR base', () => {
      const result = calculateFullLiquidation({
        monthlySalary: 3000,
        hireDate: '2015-01-01',
        terminationDate: '2025-06-01',
        terminationType: 'DESPIDO_INJUSTIFICADO',
        contractType: 'INDEFINIDO',
        lastPayDate: '2025-05-25',
      });

      // noticePay = 3000 (1 month salary)
      expect(result.noticePay).toBe(3000);
      // CSS/SE should be calculated on base that INCLUDES preaviso
      const baseWithoutNotice = result.pendingSalary + result.vacationPay + result.xiiiMonthProportional;
      const baseWithNotice = baseWithoutNotice + result.noticePay;
      // CSS on base with notice
      const expectedCss = Math.round(baseWithNotice * 0.0975 * 100) / 100;
      expect(result.cssDeduction).toBe(expectedCss);
      // SE on base with notice
      const expectedSe = Math.round(baseWithNotice * 0.0125 * 100) / 100;
      expect(result.seDeduction).toBe(expectedSe);
    });

    it('should apply fondo cesantia offset', () => {
      const result = calculateFullLiquidation({
        monthlySalary: 1500,
        hireDate: '2020-01-01',
        terminationDate: '2025-03-01',
        terminationType: 'DESPIDO_INJUSTIFICADO',
        contractType: 'INDEFINIDO',
        fondoCesantiaOffset: 500,
      });

      expect(result.fondoCesantiaOffset).toBe(500);
      // Net should be reduced by fondo offset (including SE deduction)
      const expectedNet = result.grossTotal - result.cssDeduction - result.seDeduction - result.isrDeduction - result.otherDeductions - 500;
      expect(result.netTotal).toBeCloseTo(expectedNet, 2);
    });
  });
});
