// Shared sub-types
export interface ParentSchool {
  id: string;
  name: string;
}

export interface AcademicClass {
  id: string;
  name: string;
}

export interface ParentSection {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface PersonRef {
  id: string;
  name: string;
}

// Profile & Students
export interface ParentStudent {
  id: string;
  user_id: string;
  name: string;
  roll_number: string;
  is_parent_query_disabled?: boolean;
  academic_class: AcademicClass;
  section: ParentSection;
}

export interface ParentStudentDetail extends ParentStudent {
  admission_number: string;
  user_id: string;
}

export interface ParentProfile {
  id: string;
  name: string;
  mobile_number: string;
  phone_number?: string;
  school: ParentSchool;
  students: ParentStudent[];
  profile_pic_url: string | null;
}

export interface StudentsListResponse {
  count: number;
  results: ParentStudentDetail[];
}

export interface ProfilePicResponse {
  profile_pic_url: string;
}

// Attendance
export interface AttendanceRecord {
  date: string;
  slot: "MORNING" | "AFTERNOON";
  status: "PRESENT" | "ABSENT" | "LATE";
  confirmed_at: string;
}

export interface AttendanceSummary {
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface AttendanceResponse {
  count: number;
  results: AttendanceRecord[];
  summary: AttendanceSummary;
}

// Announcements
export interface AnnouncementAttachment {
  id: string;
  filename: string;
  content_type: string;
  file_url: string;
}

export interface ParentAnnouncement {
  id: string;
  title: string;
  body: string;
  author_role: "PRINCIPAL" | "TEACHER";
  audience: "SCHOOL" | "CLASS" | "SECTION";
  published_at: string;
  attachments: AnnouncementAttachment[];
}

export interface AnnouncementsResponse {
  count: number;
  results: ParentAnnouncement[];
}

// Study Materials
export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  material_date: string;
  file_url: string;
  uploaded_by: PersonRef;
}

export interface StudyMaterialsResponse {
  count: number;
  results: StudyMaterial[];
}

// Homework
export interface HomeworkItem {
  id: string;
  subject: Subject;
  description: string;
  deadline: string;
  assigned_by: PersonRef;
  file_url?: string;
}

export interface HomeworkResponse {
  count: number;
  results: HomeworkItem[];
}

// Calendar Events
export interface ParentCalendarEvent {
  id: string;
  title: string;
  event_type: "HOLIDAY" | "EXAM" | "EVENT";
  start_date: string;
  end_date: string;
  description?: string;
}

export interface CalendarEventsResponse {
  count: number;
  results: ParentCalendarEvent[];
}
