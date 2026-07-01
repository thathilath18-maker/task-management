export interface Employee {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  department_id: string | null;
  avatar_url: string | null;
  role: 'admin' | 'manager' | 'employee';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  departments?: Department;
}

export interface Department {
  id: string;
  name: string;
  name_en: string | null;
  name_lo: string | null;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface TaskStatus {
  id: string;
  name: string;
  name_en: string | null;
  name_lo: string | null;
  color: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface TaskGroup {
  id: string;
  name: string;
  name_en: string | null;
  name_lo: string | null;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status_id: string | null;
  group_id: string | null;
  department_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string | null;
  end_date: string | null;
  progress_percentage: number;
  solution: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  task_statuses?: TaskStatus;
  task_groups?: TaskGroup;
  departments?: Department;
  employees?: Employee;
  task_checklists?: TaskChecklist[];
  task_comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  employee_id: string;
  comment: string;
  comment_type: 'general' | 'solution' | 'update';
  created_at: string;
  employees?: Employee;
}

export interface TaskChecklist {
  id: string;
  task_id: string;
  item_text: string;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface TaskProgressLog {
  id: string;
  task_id: string;
  employee_id: string;
  log_date: string;
  progress_percentage: number;
  note: string | null;
  created_at: string;
  employees?: Employee;
}

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  is_active: boolean;
  is_public: boolean;
  share_token: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  survey_questions?: SurveyQuestion[];
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'checkbox' | 'rating';
  options: { id: string; text: string; points: number }[];
  sort_order: number;
  is_required: boolean;
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  total_score: number;
  answers: { question_id: string; selected_options: string[] }[];
  submitted_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  employee_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  employees?: Employee;
}

export interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface FilterState {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  employeeId?: string;
  statusId?: string;
  groupId?: string;
  priority?: string;
  search?: string;
}