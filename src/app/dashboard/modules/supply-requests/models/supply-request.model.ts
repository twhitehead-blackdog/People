import { DocumentRequest } from '../../document-requests/models/document-request.model';

export interface SupplyRequestMetadata {
  area: string;
  supply_description: string;
  supply_reason: string;
  branch_id?: string | null;
}

export interface SupplyRequest extends DocumentRequest {
  metadata: SupplyRequestMetadata;
}
