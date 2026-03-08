import {
  calculateVacationAccrual,
  calculateDailyRate,
  calculateVacationPayment,
  calculateAvailableDays,
  calculateProportionalVacation,
} from './vacation-calculation.utils';

describe('Vacation Calculation Utils', () => {
  describe('calculateVacationAccrual', () => {
    it('should return 0 days for less than 1 month worked', () => {
      const result = calculateVacationAccrual('2025-01-01', '2025-01-15');
      expect(result.monthsWorked).toBe(0);
      expect(result.accruedDays).toBe(0);
      expect(result.completedPeriods).toBe(0);
    });

    it('should calculate 30 days for exactly 11 months', () => {
      // Use dates that reliably give 11 months with differenceInMonths
      const result = calculateVacationAccrual('2024-01-15', '2024-12-15');
      expect(result.monthsWorked).toBe(11);
      expect(result.completedPeriods).toBe(1);
      expect(result.accruedDays).toBe(30);
    });

    it('should calculate 60 days for 22 months (2 periods)', () => {
      const result = calculateVacationAccrual('2023-01-01', '2024-11-01');
      expect(result.completedPeriods).toBe(2);
      expect(result.accruedDays).toBe(60);
    });

    it('should calculate proportional days for partial period', () => {
      // 14 months = 1 complete period (11 months) + 3 remaining months
      const result = calculateVacationAccrual('2024-01-01', '2025-03-01');
      expect(result.completedPeriods).toBe(1);
      expect(result.accruedDays).toBe(30);
      // Proportional: (3/11) * 30 = 8.18
      expect(result.proportionalDays).toBeCloseTo(8.18, 1);
      expect(result.totalDays).toBeCloseTo(38.18, 1);
    });

    it('should handle Date objects', () => {
      const result = calculateVacationAccrual(
        new Date(2024, 0, 1),
        new Date(2024, 10, 1)
      );
      expect(result.monthsWorked).toBe(10);
      expect(result.completedPeriods).toBe(0);
    });

    it('should return 0 for negative duration', () => {
      const result = calculateVacationAccrual('2025-06-01', '2025-01-01');
      expect(result.monthsWorked).toBe(0);
      expect(result.accruedDays).toBe(0);
    });

    it('should calculate correctly for 3 years worked', () => {
      // 36 months = 3 complete periods (33 months) + 3 remaining
      const result = calculateVacationAccrual('2022-01-01', '2025-01-01');
      expect(result.completedPeriods).toBe(3);
      expect(result.accruedDays).toBe(90);
    });
  });

  describe('calculateDailyRate', () => {
    it('should calculate daily rate as salary / 30', () => {
      expect(calculateDailyRate(1500)).toBeCloseTo(50, 2);
      expect(calculateDailyRate(3000)).toBeCloseTo(100, 2);
    });

    it('should return 0 for zero or negative salary', () => {
      expect(calculateDailyRate(0)).toBe(0);
      expect(calculateDailyRate(-100)).toBe(0);
    });
  });

  describe('calculateVacationPayment', () => {
    it('should calculate total payment', () => {
      // 15 days at $50/day = $750
      expect(calculateVacationPayment(15, 50)).toBe(750);
    });

    it('should return 0 for zero days', () => {
      expect(calculateVacationPayment(0, 50)).toBe(0);
    });

    it('should return 0 for zero rate', () => {
      expect(calculateVacationPayment(15, 0)).toBe(0);
    });
  });

  describe('calculateAvailableDays', () => {
    it('should return accrued minus used', () => {
      expect(calculateAvailableDays(30, 10)).toBe(20);
    });

    it('should not return negative', () => {
      expect(calculateAvailableDays(10, 15)).toBe(0);
    });
  });

  describe('calculateProportionalVacation', () => {
    it('should calculate proportional days minus used', () => {
      // Use dates that give a clear 11-month period
      const accrual = calculateVacationAccrual('2024-01-01', '2024-12-01');
      const result = calculateProportionalVacation('2024-01-01', '2024-12-01', 5);
      expect(result.proportionalDays).toBe(Math.round((accrual.totalDays - 5) * 100) / 100);
    });

    it('should include proportional days from partial period', () => {
      // 14 months: 30 accrued + ~8.18 proportional = ~38.18. Used = 0
      const result = calculateProportionalVacation('2024-01-01', '2025-03-01', 0);
      expect(result.proportionalDays).toBeCloseTo(38.18, 1);
    });
  });
});
