import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { BranchesStore } from '../stores/branches.store';
import { CompaniesStore } from '../stores/companies.store';
import { BranchesFormComponent } from './branches-form.component';

describe('BranchesFormComponent', () => {
  let component: BranchesFormComponent;
  let fixture: ComponentFixture<BranchesFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        BranchesStore,
        CompaniesStore,
        MessageService,
        DynamicDialogRef,
        ConfirmationService,
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
      imports: [BranchesFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BranchesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
