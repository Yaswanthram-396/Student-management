import type {
  AnnouncementResponse,
  AttendanceSessionRequest,
  AttendanceSessionResponse,
  ConfirmAttendanceSessionResponse,
  CreateAnnouncementRequest,
  CreateHomeworkRequest,
  ExamMarksResponse,
  GetHomeworkParams,
  HomeworkListResponse,
  HomeworkResponse,
  ParentQueryListResponse,
  ReplyToQueryRequest,
  SubjectListResponse,
  GetStudyMaterialParams,
  StudyMaterialResponse,
  StudyMaterialListResponse,
  TeacherSectionsResponse,
  TeacherStudentsResponse,
  UpdateAttendanceRecordsResponse,
} from "../types/teacher";
import { apiRequest } from "./api";

export const teacherApi = {
  getSubjects: () =>
    apiRequest<SubjectListResponse>("GET", "/subjects/"),
  getSections: () =>
    apiRequest<TeacherSectionsResponse>("GET", "/teacher/sections/"),
  getSectionStudents: (sectionId: string) =>
    apiRequest<TeacherStudentsResponse>(
      "GET",
      `/teacher/sections/${sectionId}/students/`,
    ),
  createAttendanceSession: (body: AttendanceSessionRequest) =>
    apiRequest<AttendanceSessionResponse>(
      "POST",
      "/teacher/attendance-sessions/",
      body,
    ),
  updateAttendanceRecords: (
    sessionId: string,
    body: UpdateAttendanceRecordsRequest,
  ) =>
    apiRequest<UpdateAttendanceRecordsResponse>(
      "PUT",
      `/teacher/attendance-sessions/${sessionId}/students/`,
      body,
    ),
  confirmAttendanceSession: (sessionId: string) =>
    apiRequest<ConfirmAttendanceSessionResponse>(
      "POST",
      `/teacher/attendance-sessions/${sessionId}/confirm/`,
    ),
  createAnnouncement: (body: CreateAnnouncementRequest) =>
    apiRequest<AnnouncementResponse>(
      "POST",
      "/teacher/announcements/",
      body,
    ),
  getHomework: (params: GetHomeworkParams) => {
    const query = new URLSearchParams();
    if (params.section_id) query.append("section_id", params.section_id);
    if (params.subject_id) query.append("subject_id", params.subject_id);
    if (params.deadline_from) query.append("deadline_from", params.deadline_from);
    if (params.deadline_to) query.append("deadline_to", params.deadline_to);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<HomeworkListResponse>("GET", `/teacher/homework/${qs}`);
  },
  createHomework: (body: CreateHomeworkRequest) =>
    apiRequest<HomeworkResponse>("POST", "/teacher/homework/", body),
  getExamMarks: (examId: string) =>
    apiRequest<ExamMarksResponse>("GET", `/teacher/exams/${examId}/marks/`),
  updateExamMarks: (examId: string, body: any) =>
    apiRequest<ExamMarksResponse>("PUT", `/teacher/exams/${examId}/marks/`, body),
  getParentQueries: (params: { section_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params.section_id) query.append("section_id", params.section_id);
    if (params.status) query.append("status", params.status);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<ParentQueryListResponse>("GET", `/teacher/parent-queries/${qs}`);
  },
  replyToParentQuery: (queryId: string, body: ReplyToQueryRequest) =>
    apiRequest<any>("POST", `/teacher/parent-queries/${queryId}/replies/`, body),
  getStudyMaterials: (params: GetStudyMaterialParams) => {
    const query = new URLSearchParams();
    if (params.section_id) query.append("section_id", params.section_id);
    if (params.subject_id) query.append("subject_id", params.subject_id);
    if (params.date_from) query.append("date_from", params.date_from);
    if (params.date_to) query.append("date_to", params.date_to);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<StudyMaterialListResponse>("GET", `/teacher/study-materials/${qs}`);
  },
  createStudyMaterial: (data: FormData) =>
    apiRequest<StudyMaterialResponse>("POST", "/teacher/study-materials/", data, true),
};
