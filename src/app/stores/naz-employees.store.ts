import { computed } from '@angular/core';
import { signalStore, withComputed, withHooks } from '@ngrx/signals';
import { NazEmployee } from '../models';
import { withCustomEntities } from './entities.feature';

export const NazEmployeesStore = signalStore(
  withCustomEntities<NazEmployee>({
    name: 'naz_employees',
    query:
      'id,employee_number,first_name,middle_name,father_name,mother_name,birth_date,gender,start_date,monthly_salary,document_id,end_date,email,work_email,phone_number,is_active,uniform_size,branch_id,department_id,position_id,bank,account_number,bank_account_type,created_at,qr_code,code_uri,branch:naz_branches(id, name, short_name),department:naz_departments(id, name),position:naz_positions(id, name), address,full_name,hourly_salary',
    detailsQuery:
      '*, branch:naz_branches(*), department:naz_departments(*), position:naz_positions(*)',
  }),
  withComputed((state) => {
    const employeesList = computed(() =>
      state
        .entities()
        .map((item) => ({
          ...item,
          full_name: item.full_name || `${item.first_name} ${item.middle_name || ''} ${item.father_name} ${item.mother_name || ''}`.trim(),
          short_name: `${item.first_name} ${item.father_name}`,
        }))
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
    );
    const activeEmployees = computed(() =>
      employeesList().filter((x) => x.is_active)
    );
    return {
      employeesList,
      activeEmployees,
    };
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

