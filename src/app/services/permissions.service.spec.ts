import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardStore } from '../stores/dashboard.store';
import { PositionsStore } from '../stores/positions.store';
import { EmployeesStore } from '../stores/employees.store';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;

  // Mock stores
  const mockDashboardStore = {
    employees: {
      entities: signal([
        {
          id: 'emp1',
          first_name: 'John',
          father_name: 'Doe',
          is_active: true,
          work_email: 'john@example.com',
          position_id: 'pos1',
          position: {
            id: 'pos1',
            name: 'Admin Pos',
            admin: true,
            schedule_admin: true,
            schedule_approver: true,
          },
          branch: { name: 'Branch 1' },
        },
        {
          id: 'emp2',
          first_name: 'Jane',
          father_name: 'Smith',
          is_active: true,
          work_email: 'jane@example.com',
          position_id: 'pos2',
          position: {
            id: 'pos2',
            name: 'Employee Pos',
            admin: false,
            schedule_admin: false,
            schedule_approver: false,
          },
        },
      ]),
    },
    testMode: {
      isSupportUser: jest.fn().mockReturnValue(false),
    },
    currentEmployee: signal(null),
  };

  const mockPositionsStore = {
    editItem: jest.fn().mockReturnValue(of(null)),
  };

  const mockEmployeesStore = {
    editItem: jest.fn().mockReturnValue(of(null)),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PermissionsService,
        { provide: DashboardStore, useValue: mockDashboardStore },
        { provide: PositionsStore, useValue: mockPositionsStore },
        { provide: EmployeesStore, useValue: mockEmployeesStore },
      ],
    });
    service = TestBed.inject(PermissionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return all permission definitions', () => {
    const defs = service.getPermissionDefinitions();
    expect(defs.length).toBeGreaterThan(0);
    expect(defs.find((d) => d.key === 'admin')).toBeDefined();
  });

  it('should build user profiles correctly', () => {
    const profiles = service.allUserProfiles();
    expect(profiles.length).toBe(2);

    const adminProfile = profiles.find((p) => p.employeeId === 'emp1');
    expect(adminProfile).toBeDefined();
    expect(adminProfile?.permissions.admin).toBe(true);
    expect(adminProfile?.userType).toBe('admin');

    const empProfile = profiles.find((p) => p.employeeId === 'emp2');
    expect(empProfile).toBeDefined();
    expect(empProfile?.permissions.admin).toBe(false);
    expect(empProfile?.userType).toBe('employee');
  });

  it('should have deprecated updatePositionPermissions that does nothing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    await service.updatePositionPermissions('pos1', { admin: false });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
