import { apiRequest } from "./api";

export interface Section {
  id: string;
  class_name: string;
  section_name: string;
  is_class_teacher: boolean;
  student_count: number;
}

export interface Student {
  id: string;
  name: string;
  roll_number: string;
  admission_number: string;
}

export interface AttendanceRecord {
  student_id: string;
  student_name: string;
  status: "PRESENT" | "ABSENT";
}

export interface AttendanceSession {
  id: string;
  section_id: string;
  date: string;
  slot: "MORNING" | "AFTERNOON";
  taken_by: { id: string; name: string };
  confirmed_at: string | null;
  records: AttendanceRecord[];
}

export interface HomeworkItem {
  id: string;
  section_id: string;
  subject: { id: string; name: string };
  description: string;
  deadline: string | null;
}

export interface StudyMaterial {
  id: string;
  section_id: string;
  subject: { id: string; name: string };
  title: string;
  description: string;
  material_date: string;
  file_url: string | null;
  uploaded_by: { id: string; name: string };
}

export interface AnnouncementItem {
  id: string;
  title: string;
  audience: string;
  section_id: string;
  published_at: string | null;
  attachments: {
    id: string;
    filename: string;
    content_type: string;
    file_url: string | null;
  }[];
}

export interface ParentQuery {
  id: string;
  subject: string;
  message: string;
  status: "OPEN" | "REPLIED" | "CLOSED";
  parent: { id: string; name: string };
  student: { id: string; name: string };
  section_id: string;
  created_at: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

function buildQS(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [
    string,
    string,
  ][];
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries).toString();
}

export const teacherApi = {
  getSections: () =>
    apiRequest<{ count: number; results: Section[] }>(
      "GET",
      "/teacher/sections/",
    ),

  getSectionStudents: (sectionId: string) =>
    apiRequest<{ count: number; results: Student[] }>(
      "GET",
      `/teacher/sections/${sectionId}/students/`,
    ),

  createAttendanceSession: (body: {
    section_id: string;
    date: str[]
    slot: "MORNING" | "AFTERNOON";
  }) =>
    apiRequest<AttendanceSession>(
      "POST",
      "/teacher/attendance-sessions/",
      body,
    ),

  updateAttendanceRecords: (
    sessionId: string,
    records: Array<{ student_id: string; status: "PRESENT" | "ABSENT" }>,
  ) =>
    apiRequest<{ session_id: string; records: AttendanceRecord[] }>(
      "PUT",
      `/teacher/attendance-sessions/${sessionId}/students/`,
      { records },
    ),

  confirmAttendanceSession: (sessionId: string) =>
    apiRequest<{
      session_id: string;
      confirmed_at: string;
      absent_count: number;
      notification_logs_created: number;
    }>("POST", `/teacher/attendance-sessions/${sessionId}/confirm/`),

  createAnnouncement: (body: {
    section_id: string;
    title: string;
    body: string;
    publish_now?: boolean;
  }) => apiRequest<AnnouncementItem>("POST", "/teacher/announcements/", body),

  getStudyMaterials: (params?: { section_id?: string; subject_id?: string }) =>
    apiRequest<{ count: number; results: StudyMaterial[] }>(
      "GET",
      `/teacher/study-materials/${buildQS(params ?? {})}`,
    ),

  createStudyMaterial: (formData: FormData) =>
    apiRequest<StudyMaterial>(
      "POST",
      "/teacher/study-materials/",
      formData,
      true,
    ),

  getHomework: (params?: {
    section_id?: string;
    subject_id?: string;
    deadline_from?: string;
    deadline_to?: string;
  }) =>
    apiRequest<{ count: number; results: HomeworkItem[] }>(
      "GET",
      `/teacher/homework/${buildQS(params ?? {})}`,
    ),

  createHomework: (body: {
    section_id: string;
    subject_id: string;
    description: string;
    deadline: string;
  }) => apiRequest<HomeworkItem>("POST", "/teacher/homework/", body),

  getParentQueries: (params?: { status?: string; section_id?: string }) =>
    apiRequest<{ count: number; results: ParentQuery[] }>(
      "GET",
      `/teacher/parent-queries/${buildQS(params ?? {})}`,
    ),

  replyToParentQuery: (queryId: string, message: string) =>
    apiRequest<{
      id: string;
      query_id: string;
      sender_id: string;
      message: string;
      query_status: string;
      created_at: string;
    }>("POST", `/teacher/parent-queries/${queryId}/replies/`, { message }),

  getSubjects: () =>
    apiRequest<{ count: number; results: SubjectItem[] }>("GET", "/subjects/"),

  updateProfilePic: (formData: FormData) =>
    apiRequest<{ profile_pic_url: string }>(
      "PATCH",
      "/teacher/profile/pic/",
      formData,
      true,
    ),
};
