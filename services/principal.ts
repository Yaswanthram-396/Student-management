import { apiRequest } from './api';
import type {
  SchoolConfig,
  TeacherResponse,
  BulkUploadBatch,
  AnnouncementResponse,
  CalendarEventResponse,
  ExamResponse,
  ResultsResponse,
  AnalyticsResponse,
} from '../types/principal';

export const principalApi = {
  // ── Configuration ────────────────────────────────────────────────────────────
  getConfig: () =>
    apiRequest<SchoolConfig>('GET', '/principal/configuration/'),

  updateConfig: (body: Partial<Omit<SchoolConfig, 'school_id' | 'subdomain'>>) =>
    apiRequest<SchoolConfig>('PATCH', '/principal/configuration/', body),

  // ── Teachers ─────────────────────────────────────────────────────────────────
  createTeacher: (body: {
    name: string;
    mobile_number: string;
    username: string;
    password: string;
    primary_subject_id: number;
    assigned_section_ids: number[];
  }) => apiRequest<TeacherResponse>('POST', '/principal/teachers/', body),

  getTeachers: (params?: { search?: string; subject_id?: number; section_id?: number }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return apiRequest<TeacherResponse[]>('GET', `/principal/teachers/${qs}`);
  },

  updateTeacher: (id: number, body: {
    name?: string;
    mobile_number?: string;
    primary_subject_id?: number;
    assigned_section_ids?: number[];
  }) => apiRequest<TeacherResponse>('PATCH', `/principal/teachers/${id}/`, body),

  // ── Student bulk upload ───────────────────────────────────────────────────────
  bulkUploadStudents: (formData: FormData) =>
    apiRequest<BulkUploadBatch>('POST', '/principal/students/bulk-upload/', formData, true),

  getBulkUploadStatus: (batchId: number) =>
    apiRequest<BulkUploadBatch>('GET', `/principal/students/bulk-upload/${batchId}/`),

  // ── Announcements ─────────────────────────────────────────────────────────────
  createAnnouncement: (body: {
    title: string;
    body: string;
    audience: 'SCHOOL' | 'CLASS' | 'SECTION';
    class_ids?: number[];
    section_ids?: number[];
    publish_now: boolean;
  }) => apiRequest<AnnouncementResponse>('POST', '/principal/announcements/', body),

  getAnnouncements: () =>
    apiRequest<AnnouncementResponse[]>('GET', '/principal/announcements/'),

  // ── Calendar events ───────────────────────────────────────────────────────────
  createCalendarEvent: (body: {
    title: string;
    event_type: 'HOLIDAY' | 'EXAM' | 'EVENT';
    start_date: string;
    end_date: string;
    description?: string;
    visible_to: string[];
  }) => apiRequest<CalendarEventResponse>('POST', '/principal/calendar-events/', body),

  getCalendarEvents: () =>
    apiRequest<CalendarEventResponse[]>('GET', '/principal/calendar-events/'),

  // ── Exams ─────────────────────────────────────────────────────────────────────
  createExam: (body: {
    name: string;
    start_date: string;
    end_date: string;
    class_ids: number[];
    section_ids: number[];
    subjects: { subject_id: number; max_marks: number; pass_marks: number }[];
  }) => apiRequest<ExamResponse>('POST', '/principal/exams/', body),

  getExams: (params?: { status?: string; class_id?: number; section_id?: number }) => {
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
    exam_id?: number;
    class_id?: number;
    section_id?: number;
    subject_id?: number;
    student_id?: number;
  }) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return apiRequest<ResultsResponse>('GET', `/principal/results/${qs ? `?${qs}` : ''}`);
  },

  // ── Analytics ─────────────────────────────────────────────────────────────────
  getAnalytics: (params?: {
    class_id?: number;
    section_id?: number;
    subject_id?: number;
    teacher_id?: number;
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
