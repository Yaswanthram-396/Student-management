export interface TeacherSection {
  id: string;
  class_name: string;
  section_name: string;
  is_class_teacher: boolean;
  student_count: number;
}

export interface TeacherSectionsResponse {
  count: number;
  results: TeacherSection[];
}

export interface TeacherStudent {
  id: string;
  name: string;
  roll_number: string;
  admission_number: string;
}

export interface TeacherStudentsResponse {
  count: number;
  results: TeacherStudent[];
}

export type AttendanceSlot = "MORNING" | "AFTERNOON";
export type AttendanceStatus = "PRESENT" | "ABSENT";

export interface AttendanceSessionRequest {
  section_id: string;
  date: string;
  slot: AttendanceSlot;
}

export interface AttendanceSessionRecord {
  student_id: string;
  student_name?: string;
  status: AttendanceStatus;
}

export interface AttendanceSessionResponse {
  id: string;
  section_id: string;
  date: string;
  slot: AttendanceSlot;
  taken_by: {
    id: string;
    name: string;
  };
  confirmed_at: string | null;
  records: AttendanceSessionRecord[];
}

export interface UpdateAttendanceRecordsRequest {
  records: Array<{
    student_id: string;
    status: AttendanceStatus;
  }>;
}

export interface UpdateAttendanceRecordsResponse {
  session_id: string;
  records: AttendanceSessionRecord[];
}

export interface ConfirmAttendanceSessionResponse {
  session_id: string;
  confirmed_at: string;
  absent_count: number;
  notification_logs_created: number;
}

export interface CreateAnnouncementRequest {
  section_id: string;
  title: string;
  body: string;
  publish_now: boolean;
}

export interface AnnouncementResponse {
  id: string;
  title: string;
  audience: string;
  section_id: string;
  published_at: string;
  attachments: any[];
}

export interface HomeworkSubject {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface SubjectListResponse {
  count: number;
  results: HomeworkSubject[];
}

export interface HomeworkResponse {
  id: string;
  section_id: string;
  subject: HomeworkSubject;
  description: string;
  deadline: string;
}

export interface CreateHomeworkRequest {
  section_id: string;
  subject_id: string;
  description: string;
  deadline: string;
}

export interface GetHomeworkParams {
  section_id?: string;
  subject_id?: string;
  deadline_from?: string;
  deadline_to?: string;
}

export interface HomeworkListResponse {
  count: number;
  results: HomeworkResponse[];
}

export interface ExamMarksResponse {}

export interface ParentQuery {
  id: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  parent: {
    id: string;
    name: string;
  };
  student: {
    id: string;
    name: string;
  };
  section_id: string;
  created_at: string;
}

export interface ParentQueryListResponse {
  count: number;
  results: ParentQuery[];
}

export interface ReplyToQueryRequest {
  message: string;
  mark_answered: boolean;
}

export interface GetStudyMaterialParams {
  section_id?: string;
  subject_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface StudyMaterialResponse {
  id: string;
  section_id: string;
  subject: {
    id: string;
    name: string;
  };
  title: string;
  description: string;
  material_date: string;
  file_url: string;
  uploaded_by: {
    id: string;
    name: string;
  };
}

export interface StudyMaterialListResponse {
  count: number;
  results: StudyMaterialResponse[];
}
