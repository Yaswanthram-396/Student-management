import { apiRequest } from './api';
import type {
  AcademicClassResponse,
  AcademicClassesListResponse,
  SchoolConfig,
  SubjectResponse,
  SubjectsListResponse,
  TeacherResponse,
  BulkUploadBatch,
  AnnouncementResponse,
  AnnouncementsListResponse,
  CalendarEventResponse,
  CalendarEventsListResponse,
  DeleteSuccessResponse,
  ExamResponse,
  ResultsResponse,
  AnalyticsResponse,
  SectionResponse,
  SectionsListResponse,
  DailySummaryResponse,
  ClassAttendanceDetailResponse,
} from '../types/principal';

export const principalApi = {
  // ── Configuration ────────────────────────────────────────────────────────────
  getConfig: () =>
    apiRequest<SchoolConfig>('GET', '/principal/configuration/'),

  updateConfig: (body: Partial<Omit<SchoolConfig, 'school_id' | 'subdomain'>>) =>
    apiRequest<SchoolConfig>('PATCH', '/principal/configuration/', body),

  // ── Classes ──────────────────────────────────────────────────────────────────
  getClasses: () =>
    apiRequest<AcademicClassesListResponse>('GET', '/classes/'),

  createClass: (body: {
    name: string;
    display_order: number;
  }) => apiRequest<AcademicClassResponse>('POST', '/principal/classes/', body),

  updateClass: (classId: string, body: {
    name?: string;
    display_order?: number;
  }) => apiRequest<AcademicClassResponse>('PATCH', `/principal/classes/${classId}/`, body),

  deleteClass: (classId: string) =>
    apiRequest<DeleteSuccessResponse>('DELETE', `/principal/classes/${classId}/`),

  // ── Subjects ─────────────────────────────────────────────────────────────────
  getSubjects: () =>
    apiRequest<SubjectsListResponse>('GET', '/subjects/'),

  createSubject: (body: {
    name: string;
    code: string;
    is_active: boolean;
  }) => apiRequest<SubjectResponse>('POST', '/principal/subjects/', body),

  updateSubject: (subjectId: string, body: {
    name?: string;
    code?: string;
    is_active?: boolean;
  }) => apiRequest<SubjectResponse>('PATCH', `/principal/subjects/${subjectId}/`, body),

  deleteSubject: (subjectId: string) =>
    apiRequest<DeleteSuccessResponse>('DELETE', `/principal/subjects/${subjectId}/`),

  // ── Teachers ─────────────────────────────────────────────────────────────────
  createTeacher: (body: {
    name: string;
    mobile_number: string;
    username: string;
    password: string;
    primary_subject_id: string;
    assigned_section_ids: string[];
  }) => apiRequest<TeacherResponse>('POST', '/principal/teachers/', body),

  getTeachers: (params?: { search?: string; subject_id?: string; section_id?: string }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return apiRequest<TeacherResponse[]>('GET', `/principal/teachers/${qs}`);
  },

  updateTeacher: (id: string, body: {
    name?: string;
    mobile_number?: string;
    primary_subject_id?: string;
    assigned_section_ids?: string[];
  }) => apiRequest<TeacherResponse>('PATCH', `/principal/teachers/${id}/`, body),

  bulkUploadTeachers: (formData: FormData) =>
    apiRequest<BulkUploadBatch>('POST', '/principal/teachers/bulk-upload/', formData, true),

  getTeacherBulkUploadStatus: (batchId: string) =>
    apiRequest<BulkUploadBatch>('GET', `/principal/teachers/bulk-upload/${batchId}/`),

  // ── Student bulk upload ───────────────────────────────────────────────────────
  bulkUploadStudents: (formData: FormData) =>
    apiRequest<BulkUploadBatch>('POST', '/principal/students/bulk-upload/', formData, true),

  getBulkUploadStatus: (batchId: string) =>
    apiRequest<BulkUploadBatch>('GET', `/principal/students/bulk-upload/${batchId}/`),

  // ── Announcements ─────────────────────────────────────────────────────────────
  createAnnouncement: (body: {
    title: string;
    body: string;
    audience: 'SCHOOL' | 'CLASS' | 'SECTION';
    class_ids?: string[];
    section_ids?: string[];
    publish_now: boolean;
  }) => apiRequest<AnnouncementResponse>('POST', '/principal/announcements/', body),

  getAnnouncements: (params?: { audience?: 'SCHOOL' | 'CLASS' | 'SECTION'; published_after?: string }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return apiRequest<AnnouncementsListResponse>('GET', `/announcements/${qs}`);
  },

  // ── Calendar events ───────────────────────────────────────────────────────────
  createCalendarEvent: (body: {
    title: string;
    event_type: 'HOLIDAY' | 'EXAM' | 'EVENT';
    start_date: string;
    end_date: string;
    description?: string;
    visible_to: string[];
  }) => apiRequest<CalendarEventResponse>('POST', '/principal/calendar-events/', body),

  getCalendarEvents: (params?: {
    event_type?: 'HOLIDAY' | 'EXAM' | 'EVENT';
    start_date?: string;
    end_date?: string;
    month?: number;
    year?: number;
  }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return apiRequest<CalendarEventsListResponse>('GET', `/calendar-events/${qs}`);
  },

  updateCalendarEvent: (eventId: string, body: {
    title?: string;
    event_type?: 'HOLIDAY' | 'EXAM' | 'EVENT';
    start_date?: string;
    end_date?: string;
    description?: string;
    visible_to?: string[];
  }) => apiRequest<CalendarEventResponse>('PATCH', `/principal/calendar-events/${eventId}/`, body),

  deleteCalendarEvent: (eventId: string) =>
    apiRequest<DeleteSuccessResponse>('DELETE', `/principal/calendar-events/${eventId}/`),

  // ── Sections ──────────────────────────────────────────────────────────────────
  getSections: (params?: { class_id?: string }) => {
    const qs = params?.class_id ? `?class_id=${params.class_id}` : '';
    return apiRequest<SectionsListResponse>('GET', `/sections/${qs}`);
  },

  createSection: (body: {
    class_id: string;
    name: string;
    class_teacher_id?: string | null;
    parent_query_enabled: boolean;
  }) => apiRequest<SectionResponse>('POST', '/principal/sections/', body),

  updateSection: (sectionId: string, body: {
    name?: string;
    class_teacher_id?: string | null;
    parent_query_enabled?: boolean;
  }) =>
    apiRequest<SectionResponse>('PATCH', `/principal/sections/${sectionId}/`, body),

  deleteSection: (sectionId: string) =>
    apiRequest<DeleteSuccessResponse>('DELETE', `/principal/sections/${sectionId}/`),

  // ── Attendance ────────────────────────────────────────────────────────────────
  getAttendanceDailySummary: (params?: { date?: string }) => {
    const qs = params?.date ? `?date=${params.date}` : '';
    return apiRequest<DailySummaryResponse>('GET', `/principal/attendance/daily-summary/${qs}`);
  },

  getAttendanceClassDetail: (classId: string, params?: { date?: string }) => {
    const qs = params?.date ? `?date=${params.date}` : '';
    return apiRequest<ClassAttendanceDetailResponse>('GET', `/principal/attendance/classes/${classId}/${qs}`);
  },

  // ── Exams ─────────────────────────────────────────────────────────────────────
  createExam: (body: {
    name: string;
    start_date: string;
    end_date: string;
    class_ids: string[];
    section_ids: string[];
    subjects: { subject_id: string; max_marks: number; pass_marks: number }[];
  }) => apiRequest<ExamResponse>('POST', '/principal/exams/', body),

  getExams: (params?: { status?: string; class_id?: string; section_id?: string }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return apiRequest<ExamResponse[]>('GET', `/principal/exams/${qs}`);
  },

  // ── Results ───────────────────────────────────────────────────────────────────
  getResults: (params: {
    exam_id?: string;
    class_id?: string;
    section_id?: string;
    subject_id?: string;
    student_id?: string;
  }) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return apiRequest<ResultsResponse>('GET', `/principal/results/${qs ? `?${qs}` : ''}`);
  },

  // ── Analytics ─────────────────────────────────────────────────────────────────
  getAnalytics: (params?: {
    class_id?: string;
    section_id?: string;
    subject_id?: string;
    teacher_id?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const qs = params
      ? Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
      : '';
    return apiRequest<AnalyticsResponse>('GET', `/principal/analytics/${qs ? `?${qs}` : ''}`);
  },
};
