import { apiGet, apiPost, apiPatch, apiDelete, apiPostForm } from './client'
import type {
  School,
  Configuration,
  SchoolClass,
  Section,
  Subject,
  Teacher,
  CreateTeacherData,
  UpdateTeacherData,
  BulkUploadStatus,
  SectionStudent,
  StudentDetailResponse,
  StudentAttendanceHistory,
  Announcement,
  CreateAnnouncementData,
  CalendarEvent,
  CalendarEventsResponse,
  CreateCalendarEventData,
  AttendanceDailySummary,
  AttendanceClassDetail,
  PaginatedResponse,
} from '../types'

// ── School ─────────────────────────────────────────────────────────────────────
export const getSchool = (): Promise<School> =>
  apiGet('/school/')

// ── Configuration ──────────────────────────────────────────────────────────────
export const getConfiguration = (): Promise<Configuration> =>
  apiGet('/principal/configuration/')

export const updateConfiguration = (
  data: Partial<Pick<Configuration, 'attendance_frequency' | 'whatsapp_absent_automation_enabled' | 'parent_query_enabled'>>
): Promise<Configuration> =>
  apiPatch('/principal/configuration/', data)

// ── School logo ────────────────────────────────────────────────────────────────
export const uploadSchoolLogo = (file: File): Promise<{ logo: string }> => {
  const fd = new FormData()
  fd.append('logo', file)
  return apiPostForm('/principal/school/logo/', fd)
}

export const deleteSchoolLogo = (): Promise<{ logo: null }> =>
  apiDelete('/principal/school/logo/')

// ── Classes ────────────────────────────────────────────────────────────────────
// Shared endpoint — returns paginated list
export const getClasses = async (): Promise<SchoolClass[]> => {
  const res: PaginatedResponse<SchoolClass> = await apiGet('/classes/')
  return res.results
}

export const createClass = (data: { name: string; display_order?: number }): Promise<SchoolClass> =>
  apiPost('/principal/classes/', data)

export const updateClass = (id: string, data: { name?: string; display_order?: number }): Promise<SchoolClass> =>
  apiPatch(`/principal/classes/${id}/`, data)

export const deleteClass = (id: string): Promise<{ success: boolean; message: string }> =>
  apiDelete(`/principal/classes/${id}/`)

// ── Sections ───────────────────────────────────────────────────────────────────
export const getSections = async (classId?: string): Promise<Section[]> => {
  const query = classId ? `?class_id=${classId}` : ''
  const res: PaginatedResponse<Section> = await apiGet(`/principal/sections/${query}`)
  return res.results
}

export const createSection = (data: {
  class_id: string
  name: string
  class_teacher_id?: string | null
  parent_query_enabled?: boolean
}): Promise<Section> =>
  apiPost('/principal/sections/', data)

export const updateSection = (id: string, data: {
  name?: string
  class_teacher_id?: string | null
  parent_query_enabled?: boolean
}): Promise<Section> =>
  apiPatch(`/principal/sections/${id}/`, data)

export const deleteSection = (id: string): Promise<{ success: boolean; message: string }> =>
  apiDelete(`/principal/sections/${id}/`)

// ── Subjects ───────────────────────────────────────────────────────────────────
// Shared endpoint
export const getSubjects = async (): Promise<Subject[]> => {
  const res: PaginatedResponse<Subject> = await apiGet('/subjects/')
  return res.results
}

export const createSubject = (data: { name: string; code?: string; is_active?: boolean }): Promise<Subject> =>
  apiPost('/principal/subjects/', data)

export const updateSubject = (id: string, data: { name?: string; code?: string; is_active?: boolean }): Promise<Subject> =>
  apiPatch(`/principal/subjects/${id}/`, data)

export const deleteSubject = (id: string): Promise<{ success: boolean; message: string }> =>
  apiDelete(`/principal/subjects/${id}/`)

// ── Teachers ───────────────────────────────────────────────────────────────────
export interface TeacherFilters {
  search?: string
  subject_id?: string
  section_id?: string
}

export const getTeachers = async (filters?: TeacherFilters): Promise<Teacher[]> => {
  const params = new URLSearchParams()
  if (filters?.search)     params.set('search',     filters.search)
  if (filters?.subject_id) params.set('subject_id', filters.subject_id)
  if (filters?.section_id) params.set('section_id', filters.section_id)
  const query = params.toString() ? `?${params.toString()}` : ''
  const res: PaginatedResponse<Teacher> = await apiGet(`/principal/teachers/${query}`)
  return res.results
}

export const createTeacher = (data: CreateTeacherData): Promise<Teacher> =>
  apiPost('/principal/teachers/', data)

export const updateTeacher = (id: string, data: UpdateTeacherData): Promise<Teacher> =>
  apiPatch(`/principal/teachers/${id}/`, data)

export const bulkUploadTeachers = (file: File): Promise<BulkUploadStatus> => {
  const fd = new FormData()
  fd.append('csv_file', file)   // field name per spec
  return apiPostForm('/principal/teachers/bulk-upload/', fd)
}

export const getBulkUploadStatus = (batchId: string): Promise<BulkUploadStatus> =>
  apiGet(`/principal/teachers/bulk-upload/${batchId}/`)

export const assignTeacherSections = (
  id: string,
  data: { subject_id: string; section_ids: string[] }
): Promise<{
  message: string
  teacher_id: string
  primary_subject: { id: string; name: string }
  assigned_sections: { id: string; class: string; name: string }[]
}> =>
  apiPost(`/principal/teachers/${id}/assign-sections/`, data)

// ── Students bulk upload ────────────────────────────────────────────────────────
export const bulkUploadStudents = (file: File): Promise<BulkUploadStatus> => {
  const fd = new FormData()
  fd.append('csv_file', file)
  return apiPostForm('/principal/students/bulk-upload/', fd)
}

export const getStudentBulkUploadStatus = (batchId: string): Promise<BulkUploadStatus> =>
  apiGet(`/principal/students/bulk-upload/${batchId}/`)

// ── Shared student / section endpoints ────────────────────────────────────────
export const getSectionStudents = async (sectionId: string): Promise<SectionStudent[]> => {
  const res: PaginatedResponse<SectionStudent> = await apiGet(`/sections/${sectionId}/students/`)
  return res.results
}

export const getStudentDetail = (studentId: string, date?: string): Promise<StudentDetailResponse> => {
  const query = date ? `?date=${date}` : ''
  return apiGet(`/students/${studentId}/${query}`)
}

export const getStudentAttendanceHistory = (
  studentId: string,
  params?: { date_from?: string; date_to?: string; slot?: string; status?: string }
): Promise<StudentAttendanceHistory> => {
  const qs = new URLSearchParams()
  if (params?.date_from) qs.set('date_from', params.date_from)
  if (params?.date_to)   qs.set('date_to',   params.date_to)
  if (params?.slot)      qs.set('slot',       params.slot)
  if (params?.status)    qs.set('status',     params.status)
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return apiGet(`/principal/students/${studentId}/attendance/${query}`)
}

// ── Announcements ──────────────────────────────────────────────────────────────
// List via shared endpoint (principal sees all school announcements)
export const getAnnouncements = async (filters?: {
  audience?: 'SCHOOL' | 'CLASS' | 'SECTION'
}): Promise<Announcement[]> => {
  const params = new URLSearchParams()
  if (filters?.audience) params.set('audience', filters.audience)
  const query = params.toString() ? `?${params.toString()}` : ''
  const res: PaginatedResponse<Announcement> = await apiGet(`/announcements/${query}`)
  return res.results
}

export const createAnnouncement = (data: CreateAnnouncementData): Promise<Announcement> =>
  apiPost('/principal/announcements/', data)

export const updateAnnouncement = (
  id: string,
  data: Partial<CreateAnnouncementData>
): Promise<Announcement> =>
  apiPatch(`/principal/announcements/${id}/`, data)

export const deleteAnnouncement = (id: string): Promise<void> =>
  apiDelete(`/principal/announcements/${id}/`)

// ── Calendar events ────────────────────────────────────────────────────────────
export const getCalendarEvents = (filters?: {
  month?: number
  year?: number
  event_type?: string
}): Promise<CalendarEventsResponse> => {
  const params = new URLSearchParams()
  if (filters?.month)      params.set('month',      String(filters.month))
  if (filters?.year)       params.set('year',        String(filters.year))
  if (filters?.event_type) params.set('event_type',  filters.event_type)
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiGet(`/calendar-events/${query}`)  // shared read endpoint
}

export const createCalendarEvent = (data: CreateCalendarEventData): Promise<CalendarEvent> =>
  apiPost('/principal/calendar-events/', data)

export const updateCalendarEvent = (
  id: string,
  data: Partial<CreateCalendarEventData>
): Promise<CalendarEvent> =>
  apiPatch(`/principal/calendar-events/${id}/`, data)

export const deleteCalendarEvent = (id: string): Promise<{ success: boolean; message: string }> =>
  apiDelete(`/principal/calendar-events/${id}/`)

// ── Attendance ──────────────────────────────────────────────────────────────────
export const getAttendanceDailySummary = (date?: string): Promise<AttendanceDailySummary> => {
  const query = date ? `?date=${date}` : ''
  return apiGet(`/principal/attendance/daily-summary/${query}`)
}

export const getAttendanceClassDetail = (classId: string, date?: string): Promise<AttendanceClassDetail> => {
  const query = date ? `?date=${date}` : ''
  return apiGet(`/principal/attendance/classes/${classId}/${query}`)
}

// ── Profile pic ────────────────────────────────────────────────────────────────
export const uploadProfilePic = (file: File): Promise<{ profile_pic_url: string }> => {
  const fd = new FormData()
  fd.append('profile_pic', file)
  return apiPostForm('/principal/profile/pic/', fd)
}
