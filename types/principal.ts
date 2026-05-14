import type { UserRole } from "./auth";

// School Configuration
export interface SchoolConfig {
  school_id: string;
  attendance_frequency: "ONCE" | "TWICE";
  whatsapp_absent_automation_enabled: boolean;
  parent_query_enabled: boolean;
  subdomain: string;
}

// Teacher
export interface TeacherSection {
  id: string;
  class_name: string;
  section_name: string;
}

export interface TeacherResponse {
  id: string;
  user: { id: string; username: string; role: string };
  name: string;
  phone_number: string;
  primary_subject?: { id: string; name: string } | null;
  assigned_sections: TeacherSection[];
}

export interface TeachersListResponse {
  count: number;
  results: TeacherResponse[];
}

// Student bulk upload
export interface BulkUploadBatch {
  batch_id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  total_rows: number;
  success_count: number;
  error_count: number;
  error_report_url?: string;
}

// Announcements
export interface AnnouncementAttachment {
  id: string;
  filename: string;
  content_type: string;
  file_url: string;
}

export interface AnnouncementResponse {
  id: string;
  title: string;
  body: string;
  author_role: "PRINCIPAL" | "TEACHER";
  audience: "SCHOOL" | "CLASS" | "SECTION";
  published_at: string;
  attachments: AnnouncementAttachment[];
}

export interface AnnouncementsListResponse {
  count: number;
  results: AnnouncementResponse[];
}

// Calendar events
export interface CalendarEventResponse {
  id: string;
  title: string;
  event_type: "HOLIDAY" | "EXAM" | "EVENT";
  start_date: string;
  end_date: string;
  description?: string;
  visible_to: ("TEACHER" | "STUDENT" | "PARENT")[];
}

export interface CalendarEventsListResponse {
  today: string;
  count: number;
  results: CalendarEventResponse[];
}

export interface DeleteSuccessResponse {
  success: boolean;
  message: string;
}

// Classes
export interface AcademicClassResponse {
  id: string;
  name: string;
  display_order: number;
}

export interface AcademicClassesListResponse {
  count: number;
  results: AcademicClassResponse[];
}

// Subjects
export interface SubjectResponse {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface SubjectsListResponse {
  count: number;
  results: SubjectResponse[];
}

// Exams
export interface ExamSubject {
  subject_id: string;
  subject_name: string;
  max_marks: number;
  pass_marks: number;
}

export interface ExamResponse {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "DRAFT" | "PUBLISHED";
  subjects: ExamSubject[];
}

// Results
export interface StudentSubjectResult {
  subject_id: string;
  subject_name: string;
  marks_obtained: number;
  max_marks: number;
}

export interface StudentResult {
  student_id: string;
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
  filters: { exam_id?: string; class_id?: string; section_id?: string };
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

export interface PrincipalFeatureUnavailableResponse {
  success?: boolean;
  code: string;
  details: string;
}

// Sections
export interface SectionResponse {
  id: string;
  name: string;
  academic_class: { id: string; name: string };
  class_teacher: { id: string; name: string } | null;
  parent_query_enabled: boolean;
}

export interface SectionsListResponse {
  count: number;
  results: SectionResponse[];
}

// Students
export interface StudentProfileSummary {
  id: string;
  user_id: string;
  name: string;
  roll_number: string;
  admission_number: string;
  academic_class: { id: string; name: string };
  section: { id: string; name: string };
}

export interface SectionStudentsListResponse {
  count: number;
  results: StudentProfileSummary[];
}

export interface StudentAttendanceRecord {
  slot: "MORNING" | "AFTERNOON";
  status: "PRESENT" | "ABSENT";
  confirmed_at: string;
}

export interface StudentAttendanceStatus {
  date: string;
  status: "PRESENT" | "ABSENT" | "PARTIAL" | "NOT_MARKED";
  present_count: number;
  absent_count: number;
  records: StudentAttendanceRecord[];
}

export interface StudentDetailResponse {
  student: StudentProfileSummary;
  attendance: StudentAttendanceStatus;
}

// Attendance
export interface ClassAttendanceSummary {
  class_id: string;
  class_name: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface DailySummaryResponse {
  date: string;
  classes: ClassAttendanceSummary[];
}

export interface StudentAttendanceEntry {
  id: string;
  name: string;
  section?: string;
}

export interface SectionAttendanceDetail {
  section_id: string;
  section_name: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
  present_students: StudentAttendanceEntry[];
  absent_students: StudentAttendanceEntry[];
}

export interface ClassAttendanceDetailResponse {
  date: string;
  class_id: string;
  class_name: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
  present_students: StudentAttendanceEntry[];
  absent_students: StudentAttendanceEntry[];
  sections: SectionAttendanceDetail[];
}

// Auth — standard DRF simple-jwt response shape
export interface LoginResponse {
  access: string;
  refresh: string;

  user: {
    id: string;
    username: string;
    phone_number: string;
    email: string;
    role: UserRole;
  };
}
