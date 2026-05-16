// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  access: string
  refresh: string
}

// ── Shared list wrapper ───────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number
  results: T[]
}

// ── School ────────────────────────────────────────────────────────────────────
export interface SchoolConfiguration {
  attendance_frequency: 'ONCE' | 'TWICE'
  whatsapp_absent_automation_enabled: boolean
  parent_query_enabled: boolean
}

export interface School {
  id: string
  name: string
  subdomain: string
  address: string
  contact_email: string
  contact_phone: string
  is_active: boolean
  configuration: SchoolConfiguration
}

// ── Configuration (principal-specific) ───────────────────────────────────────
export interface Configuration {
  school_id: string
  attendance_frequency: 'ONCE' | 'TWICE'
  whatsapp_absent_automation_enabled: boolean
  parent_query_enabled: boolean
  subdomain: string
}

// ── Academic Class ────────────────────────────────────────────────────────────
export interface SchoolClass {
  id: string
  name: string
  display_order: number
}

// ── Section ───────────────────────────────────────────────────────────────────
export interface SectionClassTeacher {
  id: string
  name: string
}

export interface Section {
  id: string
  name: string
  academic_class: {
    id: string
    name: string
  }
  class_teacher: SectionClassTeacher | null
  parent_query_enabled?: boolean
}

// ── Subject ───────────────────────────────────────────────────────────────────
export interface Subject {
  id: string
  name: string
  code?: string
  is_active: boolean
}

// ── Teacher ───────────────────────────────────────────────────────────────────
export interface TeacherAssignedSection {
  id: string
  class_name: string
  section_name: string
}

export interface Teacher {
  id: string
  name: string
  mobile_number: string
  user: {
    id: string
    username: string
    role: 'TEACHER'
  }
  primary_subject: {
    id: string
    name: string
  } | null
  assigned_sections: TeacherAssignedSection[]
}

export interface CreateTeacherData {
  name: string
  mobile_number: string
  username: string
  password: string
  primary_subject_id?: string
  assigned_section_ids?: string[]
}

export interface UpdateTeacherData {
  name?: string
  mobile_number?: string
  primary_subject_id?: string
  assigned_section_ids?: string[]
}

// ── Bulk upload ───────────────────────────────────────────────────────────────
export interface BulkUploadStatus {
  batch_id: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  total_rows: number
  success_count: number
  error_count: number
  error_report_url?: string
}

// ── Student (from shared /sections/{id}/students/) ────────────────────────────
export interface SectionStudent {
  id: string
  user_id: string
  name: string
  roll_number: string
  admission_number: string
  academic_class: { id: string; name: string }
  section: { id: string; name: string }
}

// ── Student detail (from /students/{id}/) ─────────────────────────────────────
export type DayAttendanceStatus = 'PRESENT' | 'ABSENT' | 'PARTIAL' | 'NOT_MARKED'

export interface StudentDetailResponse {
  student: {
    id: string
    user_id: string
    name: string
    roll_number: string
    admission_number: string
    academic_class: { id: string; name: string }
    section: { id: string; name: string }
  }
  attendance: {
    date: string
    status: DayAttendanceStatus
    present_count: number
    absent_count: number
    records: {
      slot: 'MORNING' | 'AFTERNOON'
      status: 'PRESENT' | 'ABSENT'
      confirmed_at: string
    }[]
  }
}

// ── Announcement ──────────────────────────────────────────────────────────────
export interface AnnouncementAttachment {
  id: string
  filename: string
  content_type: string
  file_url: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  author_role: string
  audience: 'SCHOOL' | 'CLASS' | 'SECTION'
  published_at: string | null
  attachments: AnnouncementAttachment[]
}

export interface CreateAnnouncementData {
  title: string
  body: string
  audience: 'SCHOOL' | 'CLASS' | 'SECTION'
  class_ids?: string[]
  section_ids?: string[]
  publish_now: boolean
}

// ── Calendar Event ────────────────────────────────────────────────────────────
export type CalendarEventType = 'HOLIDAY' | 'EXAM' | 'EVENT'
export type CalendarVisibleTo = 'TEACHER' | 'STUDENT' | 'PARENT'

export interface CalendarEvent {
  id: string
  title: string
  event_type: CalendarEventType
  start_date: string
  end_date: string
  description?: string
  visible_to: CalendarVisibleTo[]
}

export interface CreateCalendarEventData {
  title: string
  event_type: CalendarEventType
  start_date: string
  end_date: string
  description?: string
  visible_to: CalendarVisibleTo[]
}

export interface CalendarEventsResponse {
  today: string
  count: number
  results: CalendarEvent[]
}

// ── Attendance ────────────────────────────────────────────────────────────────
export interface AttendanceClassSummary {
  class_id: string
  class_name: string
  total_students: number
  present_count: number
  absent_count: number
  attendance_percentage: number
}

export interface AttendanceDailySummary {
  date: string
  classes: AttendanceClassSummary[]
}

export interface AttendanceStudentEntry {
  id: string
  name: string
  section?: string
}

export interface AttendanceSectionDetail {
  section_id: string
  section_name: string
  total_students: number
  present_count: number
  absent_count: number
  attendance_percentage: number
  present_students: AttendanceStudentEntry[]
  absent_students: AttendanceStudentEntry[]
}

export interface AttendanceClassDetail {
  date: string
  class_id: string
  class_name: string
  total_students: number
  present_count: number
  absent_count: number
  attendance_percentage: number
  present_students: AttendanceStudentEntry[]
  absent_students: AttendanceStudentEntry[]
  sections: AttendanceSectionDetail[]
}

// ── Student attendance history ────────────────────────────────────────────────
export interface StudentAttendanceRecord {
  date: string
  slot: 'MORNING' | 'AFTERNOON'
  status: 'PRESENT' | 'ABSENT'
  confirmed_at: string
}

export interface StudentAttendanceHistory {
  count: number
  results: StudentAttendanceRecord[]
  summary: {
    present_count: number
    absent_count: number
    attendance_percentage: number
  }
}

// ── Analytics / Exams ─────────────────────────────────────────────────────────
export type AnalyticsStatus = 'CREATED' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

export interface AnalyticsExam {
  id: string
  exam_name: string
  exam_date: string
  analytics_status: AnalyticsStatus
  type?: 'CLASS' | 'SECTION'
  academic_class?: { id: string; name: string } | null
}

export interface SubjectAvg {
  subject_id: string
  subject_name: string
  avg: number
  max_marks: number
}

export interface SectionAvg {
  section_id: string
  section_name: string
  avg: number
}

export interface TopStudent {
  student_id: string
  name: string
  student_ref_id: string
  total_marks: number
  rank: number
}

export interface ExamOverviewResponse {
  exam: {
    id: string
    exam_name: string
    exam_date: string
    analytics_status: AnalyticsStatus
    type: 'CLASS' | 'SECTION'
  }
  role_view: string
  class_avgs?: SubjectAvg[]
  subject_avgs?: SubjectAvg[]
  sections?: SectionAvg[]
  top_students?: TopStudent[]
}

export interface SectionDetailResponse {
  exam: { id: string; exam_name: string }
  section: { id: string; name: string }
  subjects: {
    subject_id: string
    subject_name: string
    section_avg: number
    class_avg: number
    delta: number
  }[]
}
