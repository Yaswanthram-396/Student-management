import { apiGet, apiPost, apiPostForm } from './client'
import type { Exam, ExamOverview, SectionPerformance, SectionStudents } from '../types'

export const listExams = (classId?: number): Promise<Exam[]> => {
  const query = classId ? `?class_id=${classId}` : ''
  return apiGet(`/analytics/exams/${query}`)
}

export const getExamOverview = (examId: number): Promise<ExamOverview> =>
  apiGet(`/analytics/exams/${examId}/overview/`)

export const getSectionDetail = (
  examId: number,
  sectionId: number
): Promise<SectionPerformance> =>
  apiGet(`/analytics/exams/${examId}/sections/${sectionId}/`)

export const getSectionStudents = (
  sectionId: number,
  examId?: number
): Promise<SectionStudents> => {
  const query = examId ? `?exam_id=${examId}` : ''
  return apiGet(`/analytics/section/${sectionId}/${query}`)
}

export interface CreateExamData {
  name: string
  class_id?: number
  section_id?: number
}

export const createExam = (data: CreateExamData): Promise<Exam> =>
  apiPost('/analytics/exams/', data)

export const uploadExam = (examId: number, file: File): Promise<unknown> => {
  const fd = new FormData()
  fd.append('file', file)
  return apiPostForm(`/analytics/exams/${examId}/upload/`, fd)
}
