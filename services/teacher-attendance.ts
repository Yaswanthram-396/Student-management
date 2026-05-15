import { apiRequest } from './api';

export type AttendanceStatus = 'PRESENT' | 'ABSENT';
export type AttendanceSlot   = 'MORNING' | 'AFTERNOON';
export type DayAttendanceStatus = 'PRESENT' | 'ABSENT' | 'PARTIAL' | 'NOT_MARKED';

// ── Student detail ────────────────────────────────────────────────────────────
export interface StudentDetailResponse {
  student: {
    id: string;
    user_id: string;
    name: string;
    roll_number: string;
    admission_number: string;
    academic_class: { id: string; name: string };
    section: { id: string; name: string };
  };
  attendance: {
    date: string;
    status: DayAttendanceStatus;
    present_count: number;
    absent_count: number;
    records: { slot: AttendanceSlot; status: AttendanceStatus; confirmed_at: string }[];
  };
}

// ── Student attendance history ────────────────────────────────────────────────
export interface StudentAttendanceRecord {
  date: string;
  slot: AttendanceSlot;
  status: AttendanceStatus;
  confirmed_at: string;
}

export interface StudentAttendanceHistoryParams {
  date_from?: string;
  date_to?: string;
  slot?: AttendanceSlot;
  status?: AttendanceStatus;
}

export interface StudentAttendanceHistoryResponse {
  count: number;
  results: StudentAttendanceRecord[];
  summary: {
    present_count: number;
    absent_count: number;
    attendance_percentage: number;
  };
}

export interface AttendanceRecord {
  student_id: string;
  student_name: string;
  status: AttendanceStatus | null;
}

export interface AttendanceSession {
  id: string;
  section_id: string;
  date: string;
  slot: AttendanceSlot;
  taken_by: { id: string; name: string };
  confirmed_at: string | null;
  records: AttendanceRecord[];
}

export interface MarkAttendanceResponse {
  session_id: string;
  records: AttendanceRecord[];
}

export interface ConfirmResponse {
  session_id: string;
  confirmed_at: string;
  absent_count: number;
  notification_logs_created: number;
}

export const teacherAttendanceApi = {
  getOrCreateSession: (section_id: string, date: string, slot: AttendanceSlot) =>
    apiRequest<AttendanceSession>('POST', '/teacher/attendance-sessions/', {
      section_id,
      date,
      slot,
    }),

  markAttendance: (
    session_id: string,
    records: { student_id: string; status: AttendanceStatus }[],
  ) =>
    apiRequest<MarkAttendanceResponse>(
      'PUT',
      `/teacher/attendance-sessions/${session_id}/students/`,
      { records },
    ),

  confirmSession: (session_id: string) =>
    apiRequest<ConfirmResponse>(
      'POST',
      `/teacher/attendance-sessions/${session_id}/confirm/`,
    ),

  // GET /api/v1/students/{student_id}/?date=YYYY-MM-DD
  getStudentDetail: (studentId: string, date?: string) =>
    apiRequest<StudentDetailResponse>(
      'GET',
      `/students/${studentId}/${date ? `?date=${date}` : ''}`,
    ),

  // GET /api/v1/teacher/students/{student_id}/attendance/
  getStudentAttendanceHistory: (studentId: string, params?: StudentAttendanceHistoryParams) => {
    const qs = new URLSearchParams();
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to)   qs.set('date_to',   params.date_to);
    if (params?.slot)      qs.set('slot',       params.slot);
    if (params?.status)    qs.set('status',     params.status);
    const query = qs.toString();
    return apiRequest<StudentAttendanceHistoryResponse>(
      'GET',
      `/teacher/students/${studentId}/attendance/${query ? `?${query}` : ''}`,
    );
  },
};
