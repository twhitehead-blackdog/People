import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PermissionsStore } from '../core/permissions/permissions.store';
import { DashboardStore } from '../stores/dashboard.store';
import { PositionsStore } from '../stores/positions.store';
import { ApiUrlService } from './api-url.service';
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
            dashboard_access: true,
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
            dashboard_access: false,
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

  const mockPermissionsStore = {
    load: jest.fn(),
    can: jest.fn().mockReturnValue(false),
    reset: jest.fn(),
  };

  const mockHttp = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockApiUrl = {
    build: jest
      .fn()
      .mockImplementation((endpoint) => `https://api.com/${endpoint}`),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PermissionsService,
        { provide: DashboardStore, useValue: mockDashboardStore },
        { provide: PositionsStore, useValue: mockPositionsStore },
        { provide: PermissionsStore, useValue: mockPermissionsStore },
        { provide: HttpClient, useValue: mockHttp },
        { provide: ApiUrlService, useValue: mockApiUrl },
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
    expect(defs.find((d) => d.key === 'dashboard.access')).toBeDefined();
  });

  it('should build user profiles correctly', () => {
    const profiles = service.allUserProfiles();
    expect(profiles.length).toBe(2);

    const adminProfile = profiles.find((p) => p.employeeId === 'emp1');
    expect(adminProfile).toBeDefined();
    // Admin position grants ALL permissions
    expect(adminProfile?.permissions['dashboard.access']).toBe(true);
    expect(adminProfile?.permissions['admin.users']).toBe(true);
    expect(adminProfile?.userType).toBe('admin');

    const empProfile = profiles.find((p) => p.employeeId === 'emp2');
    expect(empProfile).toBeDefined();
    expect(empProfile?.permissions['dashboard.access']).toBe(false);
    expect(empProfile?.userType).toBe('employee');
  });

  it('should delegate updatePositionPermissions to PositionsStore', async () => {
    await service.updatePositionPermissions('pos1', {
      admin: false,
      dashboard_access: true,
      schedule_admin: true,
      schedule_approver: false,
    });
    expect(mockPositionsStore.editItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pos1',
        admin: false,
        dashboard_access: true,
        schedule_admin: true,
        schedule_approver: false,
      })
    );
  });

  it('should load user permissions when requested', async () => {
    const emp = mockDashboardStore.employees.entities()[0]; // admin
    // Mock REST response for employee_permissions
    mockHttp.get.mockReturnValue(of([]));

    await service.loadUserPermissions(emp as any);

    expect(mockHttp.get).toHaveBeenCalledWith(
      expect.stringContaining('employee_permissions')
    );
    expect(mockPermissionsStore.load).toHaveBeenCalledWith(emp.position, []);
  });

  it('should fetch user overrides from employee_permissions table', async () => {
    const mockResponse = [
      { permission_key: 'payroll.read', allowed: true, expires_at: null },
    ];
    mockHttp.get.mockReturnValue(of(mockResponse));

    const result = await service.fetchUserOverrides('emp1');

    expect(result.length).toBe(1);
    expect(result[0].permissionKey).toBe('payroll.read');
    expect(result[0].granted).toBe(true);
  });

  it('should save user override via set_employee_permission RPC', async () => {
    mockHttp.post.mockReturnValue(of(null));

    await service.saveUserOverride('emp1', 'payroll.read', true, 'Necesita acceso temporal');

    expect(mockHttp.post).toHaveBeenCalledWith(
      expect.stringContaining('rpc/set_employee_permission'),
      {
        p_employee_id: 'emp1',
        p_key: 'payroll.read',
        p_allowed: true,
        p_reason: 'Necesita acceso temporal',
      }
    );
  });

  it('should check permissions via store', () => {
    service.canCurrentUser('dashboard.access');
    expect(mockPermissionsStore.can).toHaveBeenCalledWith('dashboard.access');
  });
});
