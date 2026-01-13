import { computed } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogService } from 'primeng/dynamicdialog';
import { PermissionsService } from '../../services/permissions.service';
import { PermissionEditorDialogComponent } from './permission-editor-dialog.component';
import { PermissionsManagementComponent } from './permissions-management.component';

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
          dashboard_access: true,
        },
        userType: 'admin' as const,
        sources: {
          admin: 'position',
          schedule_admin: 'position',
          schedule_approver: 'position',
          dashboard_access: 'position',
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
          dashboard_access: false,
        },
        userType: 'employee' as const,
        sources: {
          admin: 'position',
          schedule_admin: 'position',
          schedule_approver: 'position',
          dashboard_access: 'position',
        } as const,
        isSupportUser: false,
        testMode: false,
      },
    ]),
  };

  const mockDialogService = {
    open: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionsManagementComponent],
      providers: [
        { provide: PermissionsService, useValue: mockPermissionsService },
        { provide: DialogService, useValue: mockDialogService },
      ],
    }).compileComponents();

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

  it('should open editor dialog when edit is clicked', () => {
    const profile = mockPermissionsService.allUserProfiles()[0];
    component.openEditor(profile);
    expect(mockDialogService.open).toHaveBeenCalledWith(
      PermissionEditorDialogComponent,
      expect.objectContaining({
        header: expect.stringContaining('Permisos: Manager'),
        data: expect.objectContaining({
          positionId: 'p1',
        }),
      })
    );
  });
});
