export type TimeOffType = {
  id: string;
  name: string;
};

export type TimeOff = {
  id: string;
  type_id: string;
  type?: TimeOffType;
  employee_id: string;
  employee?: import('./employee.model').Employee;
  date_from: Date;
  date_to: Date;
  notes: string[];
  is_approved: boolean;
  created_by?: string;
};
