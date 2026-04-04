import { signalStore } from '@ngrx/signals';
import { RecruitmentRule } from '../models';
import { withCustomEntities } from './entities.feature';

export const RecruitmentRulesStore = signalStore({ providedIn: 'root' },
  withCustomEntities<RecruitmentRule>({
    name: 'recruitment_rules',
    query: 'id,company_id,name,description,target_role,field_to_check,match_type,match_value,score_points,is_active,priority,created_at,updated_at',
    order: 'priority.desc,name.asc',
  })
);
