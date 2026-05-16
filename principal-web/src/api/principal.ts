import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiPostForm } from './client'
import type {
  School,
  Configuration,
  SchoolClass,
  Section,
  Teacher,
  Subject,
  Student,
  Announcement,
  CalendarEvent,
  AttendanceDailySummary,
  AttendanceClassDetail,
} from '../types'

// School
export const getSchool = (): Promise<School> => apiGet('/school/')

// Configuration
export const getConfiguration = (): Promise<Configuration> => apiGet('/principal/configuration/')
export const updateConfiguration = (data: Partial<Configuration>): Promise<Configuration> =>
  apiPatch('/principal/configuration/', data)

// Classes
export const getClasses = (): Promise<SchoolClass[]> => apiGet('/principal/classes/')
export const createClass = (data: { name: string }): Promise<SchoolClass> =>
  apiPost('/principal/classes/', data)
export const updateClass = (id: number, data: { name: string }): Promise<SchoolClass> =>
  apiPut(`/principal/classes/${id}/`, data)
export const deleteClass = (id: number): Promise<void> => apiDelete(`/principal/classes/${id}/`)

// Sections
export const getSections = (classId?: number): Promise<Section[]> => {
  const query = classId ? `?class_id=${classId}` : ''
  return apiGet(`/principal/sections/${query}`)
}
export const getAllSections = (): Promise<Section[]> => apiGet('/principal/sections/')
export const createSection = (data: { name: string; class_id: number }): Promise<Section> =>
  apiPost('/principal/sections/', data)
export const updateSection = (id: number, data: { name: string }): Promise<Section> =>
  apiPut(`/principal/sections/${id}/`, data)
export const deleteSection = (id: number): Promise<void> => apiDelete(`/principal/sections/${id}/`)

// Teachers
export interface TeacherFilters {
  search?: string
  subject_id?: number
  section_id?: number
}
export const getTeachers = (filters?: TeacherFilters): Promise<Teacher[]> => {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.subject_id) params.set('subject_id', String(filters.subject_id))
  if (filters?.section_id) params.set('section_id', String(filters.section_id))
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiGet(`/principal/teachers/${query}`)
}
export interface CreateTeacherData {
  name: string
  email?: string
  phone?: string
  password?: string
  subjects?: number[]
}
export const createTeacher = (data: CreateTeacherData): Promise<Teacher> =>
  apiPost('/principal/teachers/', data)
export const updateTeacher = (id: number, data: Partial<CreateTeacherData>): Promise<Teacher> =>
  apiPut(`/principal/teachers/${id}/`, data)
export const deleteTeacher = (id: number): Promise<void> => apiDelete(`/principal/teachers/${id}/`)
export const bulkUploadTeachers = (file: File): Promise<unknown> => {
  const fd = new FormData()
  fd.append('file', file)
  return apiPostForm('/principal/teachers/bulk-upload/', fd)
}
export const getTeacherAssignedSections = (id: number): Promise<{ sections: Section[] }> =>
  apiGet(`/principal/teachers/${id}/assign-sections/`)
export const assignTeacherSections = (
  id: number,
  data: { section_ids: number[] }
): Promise<unknown> => apiPost(`/principal/teachers/${id}/assign-sections/`, data)

// Subjects
export const getSubjects = (): Promise<Subject[]> => apiGet('/principal/subjects/')
export const createSubject = (data: { name: string; code?: string }): Promise<Subject> =>
  apiPost('/principal/subjects/', data)
export const updateSubject = (id: number, data: { name: string; code?: string }): Promise<Subject> =>
  apiPut(`/principal/subjects/${id}/`, data)
export const deleteSubject = (id: number): Promise<void> => apiDelete(`/principal/subjects/${id}/`)

// Announcements
export const getAnnouncements = (): Promise<Announcement[]> => apiGet('/principal/announcements/')
export const createAnnouncement = (data: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>): Promise<Announcement> =>
  apiPost('/principal/announcements/', data)
export const updateAnnouncement = (id: number, data: Partial<Announcement>): Promise<Announcement> =>
  apiPut(`/principal/announcements/${id}/`, data)
export const deleteAnnouncement = (id: number): Promise<void> => apiDelete(`/principal/announcements/${id}/`)

// Calendar
export const getCalendarEvents = (): Promise<CalendarEvent[]> => apiGet('/principal/calendar/')
export const createCalendarEvent = (data: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> =>
  apiPost('/principal/calendar/', data)
export const updateCalendarEvent = (id: number, data: Partial<CalendarEvent>): Promise<CalendarEvent> =>
  apiPut(`/principal/calendar/${id}/`, data)
export const deleteCalendarEvent = (id: number): Promise<void> => apiDelete(`/principal/calendar/${id}/`)

// Attendance
export const getAttendanceDailySummary = (date: string): Promise<AttendanceDailySummary> =>
  apiGet(`/principal/attendance/daily-summary/?date=${date}`)
export const getAttendanceClassDetail = (classId: number, date: string): Promise<AttendanceClassDetail> =>
  apiGet(`/principal/attendance/classes/${classId}/?date=${date}`)

// Students
export const getSectionStudents = (sectionId: number): Promise<Student[]> =>
  apiGet(`/sections/${sectionId}/students/`)
export const getStudent = (studentId: number): Promise<Student> =>
  apiGet(`/students/${studentId}/`)
