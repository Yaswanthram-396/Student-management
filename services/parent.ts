import { apiRequest } from './api';
import type {
  ParentProfile,
  StudentsListResponse,
  AttendanceResponse,
  AnnouncementsResponse,
  StudyMaterialsResponse,
  HomeworkResponse,
  CalendarEventsResponse,
  ProfilePicResponse,
} from '../types/parent';

function buildQs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries).toString();
}

export const parentApi = {
  // ── Profile ───────────────────────────────────────────────────────────────────
  getProfile: () =>
    apiRequest<ParentProfile>('GET', '/parent/profile/'),

  updateProfilePic: (formData: FormData) =>
    apiRequest<ProfilePicResponse>('PATCH', '/parent/profile/pic/', formData, true),

  // ── Students ──────────────────────────────────────────────────────────────────
  getStudents: () =>
    apiRequest<StudentsListResponse>('GET', '/parent/students/'),

  // ── Attendance ────────────────────────────────────────────────────────────────
  getAttendance: (studentId: string, params?: {
    date_from?: string;
    date_to?: string;
    slot?: string;
    status?: string;
  }) => {
    const qs = params ? buildQs(params as Record<string, string | undefined>) : '';
    return apiRequest<AttendanceResponse>('GET', `/parent/students/${studentId}/attendance/${qs}`);
  },

  // ── Announcements ─────────────────────────────────────────────────────────────
  getAnnouncements: (studentId: string) =>
    apiRequest<AnnouncementsResponse>('GET', `/parent/students/${studentId}/announcements/`),

  // ── Study Materials ───────────────────────────────────────────────────────────
  getStudyMaterials: (studentId: string, params?: {
    subject_id?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const qs = params ? buildQs(params as Record<string, string | undefined>) : '';
    return apiRequest<StudyMaterialsResponse>('GET', `/parent/students/${studentId}/study-materials/${qs}`);
  },

  // ── Homework ──────────────────────────────────────────────────────────────────
  getHomework: (studentId: string, params?: {
    subject_id?: string;
    deadline_from?: string;
    deadline_to?: string;
  }) => {
    const qs = params ? buildQs(params as Record<string, string | undefined>) : '';
    return apiRequest<HomeworkResponse>('GET', `/parent/students/${studentId}/homework/${qs}`);
  },

  // ── Calendar Events ───────────────────────────────────────────────────────────
  getCalendarEvents: (studentId: string, params?: {
    event_type?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const qs = params ? buildQs(params as Record<string, string | undefined>) : '';
    return apiRequest<CalendarEventsResponse>('GET', `/parent/students/${studentId}/calendar-events/${qs}`);
  },
};
