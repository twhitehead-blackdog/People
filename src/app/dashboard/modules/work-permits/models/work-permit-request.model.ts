import {
  HrRequestBase,
  HrRequestWithDateRange,
} from '../../shared/models/hr-request-base.model';

/**
 * Work permit request model extending base HR request interface.
 */
export interface WorkPermitRequest extends HrRequestBase, HrRequestWithDateRange {
  permit_type: string;
  start_time?: string | null;
  end_time?: string | null;
  equivalent_value?: number | null;
  equivalent_unit?: 'hours' | 'days' | null;
  observations: string | null;
  document_url?: string | null;
  created_by_employee?: {
    id: string;
    first_name: string;
    father_name: string;
  };
}
