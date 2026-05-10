import { apiRequest } from './api';

export type AttendanceStatus = 'PRESENT' | 'ABSENT';
export type AttendanceSlot = 'MORNING' | 'AFTERNOON';

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
};
