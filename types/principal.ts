// School Configuration
export interface SchoolConfig {
  school_id: number;
  attendance_frequency: 'ONCE' | 'TWICE';
  whatsapp_absent_automation_enabled: boolean;
  parent_query_enabled: boolean;
  subdomain: string;
}

// Teacher
export interface TeacherSection {
  id: number;
  class_name: string;
  section_name: string;
}

export interface TeacherResponse {
  id: number;
  user: { id: number; username: string; role: string };
  name: string;
  mobile_number: string;
  primary_subject: { id: number; name: string };
  assigned_sections: TeacherSection[];
}

// Student bulk upload
export interface BulkUploadBatch {
  batch_id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total_rows: number;
  success_count: number;
  error_count: number;
  error_report_url?: string;
}

// Announcements
export interface AnnouncementResponse {
  id: number;
  title: string;
  body: string;
  audience: 'SCHOOL' | 'CLASS' | 'SECTION';
  published_at: string;
  attachments: string[];
}

// Calendar events
export interface CalendarEventResponse {
  id: number;
  title: string;
  event_type: 'HOLIDAY' | 'EXAM' | 'EVENT';
  start_date: string;
  end_date: string;
  description?: string;
  visible_to: ('TEACHER' | 'STUDENT' | 'PARENT')[];
}

// Exams
export interface ExamSubject {
  subject_id: number;
  subject_name: string;
  max_marks: number;
  pass_marks: number;
}

export interface ExamResponse {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'PUBLISHED';
  subjects: ExamSubject[];
}

// Results
export interface StudentSubjectResult {
  subject_id: number;
  subject_name: string;
  marks_obtained: number;
  max_marks: number;
}

export interface StudentResult {
  student_id: number;
  student_name: string;
  roll_number: string;
  total_marks: number;
  max_marks: number;
  percentage: number;
  rank: number;
  subjects: StudentSubjectResult[];
}

export interface ResultSummary {
  student_count: number;
  average_percentage: number;
  highest_percentage: number;
  lowest_percentage: number;
}

export interface ResultsResponse {
  filters: { exam_id?: number; class_id?: number; section_id?: number };
  summary: ResultSummary;
  results: StudentResult[];
}

// Analytics
export interface AnalyticsResponse {
  class_performance_trends: any[];
  subject_wise_analysis: any[];
  teacher_effectiveness: any[];
  student_growth_tracking: any[];
}

// Auth — standard DRF simple-jwt response shape
export interface LoginResponse {
  access: string;
  refresh: string;
  role: 'PRINCIPAL' | 'TEACHER' | 'PARENT';
  user: { id: number; name: string };
}
