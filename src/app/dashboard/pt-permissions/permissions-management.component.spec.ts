import { computed } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { DialogService } from 'primeng/dynamicdialog';
import { DeviceService } from '../../services/device.service';
import { PermissionsService } from '../../services/permissions.service';
import { PermissionEditorDialogComponent } from './permission-editor-dialog.component';
import { PermissionsManagementComponent } from './permissions-management.component';
import { DashboardStore } from '../../stores/dashboard.store';

describe('PermissionsManagementComponent', () => {
  let component: PermissionsManagementComponent;
  let fixture: ComponentFixture<PermissionsManagementComponent>;

  const mockPermissionsService = {
    getPermissionDefinitions: jest
      .fn()
      .mockReturnValue([{ key: 'admin', label: 'Admin', severity: 'danger' }]),
    allUserProfiles: computed(() => [
      {
        employeeId: '1',
        employeeName: 'User One',
        positionId: 'p1',
        positionName: 'Manager',
        branchName: 'Main',
        permissions: {
          admin: true,
          schedule_admin: false,
          schedule_approver: false,
          view_salaries: false,
        },
        userType: 'admin' as const,
        sources: {
          admin: 'position',
          schedule_admin: 'position',
          schedule_approver: 'position',
          view_salaries: 'position',
        } as const,
        isSupportUser: false,
        testMode: false,
      },
      {
        employeeId: '2',
        employeeName: 'User Two',
        positionId: 'p2',
        positionName: 'Worker',
        branchName: 'Main',
        permissions: {
          admin: false,
          schedule_admin: false,
          schedule_approver: false,
          view_salaries: false,
        },
        userType: 'employee' as const,
        sources: {
          admin: 'position',
          schedule_admin: 'position',
          schedule_approver: 'position',
          view_salaries: 'position',
        } as const,
        isSupportUser: false,
        testMode: false,
      },
    ]),
  };

  const mockDialogService = {
    open: jest.fn().mockReturnValue({ onClose: new Subject() }),
  };

  const mockDeviceService = {
    isDesktop: jest.fn().mockReturnValue(true),
  };

  const mockDashboardStore = {
    employees: { reloadItems: jest.fn() },
    positions: { reloadItems: jest.fn() },
    testMode: { isSupportUser: jest.fn().mockReturnValue(false) },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionsManagementComponent],
      providers: [
        { provide: PermissionsService, useValue: mockPermissionsService },
        { provide: DeviceService, useValue: mockDeviceService },
        { provide: DashboardStore, useValue: mockDashboardStore },
      ],
    })
      .overrideComponent(PermissionsManagementComponent, {
        set: {
          providers: [{ provide: DialogService, useValue: mockDialogService }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PermissionsManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter profiles based on search term', () => {
    component.searchTerm.set('One');
    fixture.detectChanges();
    const filtered = component.filteredProfiles();
    expect(filtered.length).toBe(1);
    expect(filtered[0].employeeName).toBe('User One');
  });

  it('should open employee editor dialog when edit is clicked', () => {
    const profile = component.profiles()[0];
    component.openEmployeeEditor(profile);
    expect(mockDialogService.open).toHaveBeenCalledWith(
      PermissionEditorDialogComponent,
      expect.objectContaining({
        header: expect.stringContaining('Permisos: User One'),
        data: expect.objectContaining({
          mode: 'employee',
          employeeId: '1',
          positionId: 'p1',
        }),
      })
    );
  });
});
