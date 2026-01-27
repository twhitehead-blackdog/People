import {
  mapCompensatoryToRequest,
  mapDisabilityToRequest,
  mapVacationToRequest,
} from './employee-requests.mapper';

describe('Employee Requests Mapper', () => {
  it('should map Vacation data to EmployeeRequest', () => {
    const raw = {
      id: 'v1',
      start_date: '2023-01-01',
      end_date: '2023-01-05',
      employee_id: 'emp1',
    };

    const result = mapVacationToRequest(raw);

    expect(result.id).toBe('v1');
    expect(result.type).toBe('VACACIONES');
    expect(result.is_request).toBe(true);
    expect(result.approved_by).toBe('RRHH');
    expect(result.color).toBe('purple');
    expect(result.tooltip).toContain('VACACIONES aprobado por RRHH');
    expect(result.tooltip).toContain('01/01/2023 - 05/01/2023');
  });

  it('should map Disability data to EmployeeRequest', () => {
    const raw = {
      id: 'd1',
      start_date: '2023-02-10',
      end_date: '2023-02-12',
      employee_id: 'emp2',
    };

    const result = mapDisabilityToRequest(raw);

    expect(result.type).toBe('INCAPACIDAD');
    expect(result.color).toBe('red');
    expect(result.tooltip).toContain('INCAPACIDAD aprobado por RRHH');
    expect(result.tooltip).toContain('10/02/2023 - 12/02/2023');
  });

  it('should map Compensatory (hours) data to EmployeeRequest', () => {
    const raw = {
      id: 'c1',
      date_from: '2023-03-20',
      date_to: '2023-03-20',
      compensatory_type: 'hours',
      employee_id: 'emp3',
    };

    const result = mapCompensatoryToRequest(raw);

    expect(result.type).toBe('COMPENSATORIO');
    expect(result.color).toBe('green');
    expect(result.tooltip).toContain('COMPENSATORIO aprobado por RRHH');
    expect(result.tooltip).toContain('20/03/2023');
  });
});
