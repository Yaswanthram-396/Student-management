// Auth
export interface AuthTokens {
  access: string
  refresh: string
}

// School
export interface School {
  id: number
  name: string
  subdomain: string
  contact_email: string
  contact_phone: string
  address?: string
  logo?: string
}

// Configuration
export interface Configuration {
  attendance_frequency: 'ONCE' | 'TWICE'
  parent_query_enabled: boolean
  whatsapp_absent_automation_enabled: boolean
}

// Class
export interface SchoolClass {
  id: number
  name: string
  sections?: Section[]
  section_count?: number
  teacher_count?: number
}

// Section
export interface Section {
  id: number
  name: string
  class_id: number
  class_name?: string
  class_teacher?: Teacher | null
  student_count?: number
}

// Subject
export interface Subject {
  id: number
  name: string
  code?: string
}

// Teacher
export interface Teacher {
  id: number
  name: string
  email?: string
  phone?: string
  subjects?: Subject[]
  sections?: Section[]
  user?: {
    id: number
    username: string
    email: string
  }
}

// Student
export interface Student {
  id: number
  name: string
  roll_number?: string
  admission_number?: string
  section?: Section
  class_name?: string
  section_name?: string
  parent_phone?: string
  gender?: string
}

// Announcement
export interface Announcement {
  id: number
  title: string
  body: string
  audience: 'SCHOOL' | 'CLASS' | 'SECTION'
  publish_now: boolean
  created_at: string
  updated_at?: string
  class_id?: number
  section_id?: number
}

// Calendar Event
export interface CalendarEvent {
  id: number
  title: string
  date: string
  event_type: 'HOLIDAY' | 'EXAM' | 'EVENT'
  description?: string
}

// Attendance
export interface AttendanceSectionSummary {
  section_id: number
  section_name: string
  class_name: string
  present_count: number
  absent_count: number
  total_students: number
  attendance_pct: number
}

export interface AttendanceDailySummary {
  date: string
  sections: AttendanceSectionSummary[]
}

export interface AttendanceClassDetail {
  class_id: number
  class_name: string
  date: string
  sections: AttendanceSectionSummary[]
}

// Exam / Analytics
export type ExamStatus = 'CREATED' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

export interface Exam {
  id: number
  name: string
  status: ExamStatus
  class_id?: number
  section_id?: number
  class_name?: string
  created_at?: string
}

export interface ExamOverview {
  id: number
  name: string
  status: ExamStatus
  class_averages?: { subject: string; average: number }[]
  sections?: SectionPerformance[]
  top_students?: StudentPerformance[]
}

export interface SectionPerformance {
  section_id: number
  section_name: string
  class_name?: string
  average?: number
  pass_count?: number
  fail_count?: number
  total?: number
}

export interface StudentPerformance {
  student_id: number
  student_name: string
  total_marks?: number
  percentage?: number
  rank?: number
}

export interface SectionStudents {
  section_id: number
  section_name: string
  students: Student[]
}

// API pagination
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
