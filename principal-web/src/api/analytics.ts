import { apiGet, apiPost, apiPostForm } from './client'
import type {
  AnalyticsExam,
  ExamOverviewResponse,
  SectionDetailResponse,
  PaginatedResponse,
} from '../types'

// List exams — class_id is an optional UUID filter
export const listExams = async (classId?: string): Promise<AnalyticsExam[]> => {
  const query = classId ? `?class_id=${classId}` : ''
  const res: { success: boolean; exams?: AnalyticsExam[]; results?: AnalyticsExam[] } =
    await apiGet(`/analytics/exams/${query}`)
  return res.exams ?? res.results ?? []
}

export const getExamOverview = (examId: string): Promise<ExamOverviewResponse> =>
  apiGet(`/analytics/exams/${examId}/overview/`)

export const getSectionDetail = (
  examId: string,
  sectionId: string
): Promise<SectionDetailResponse> =>
  apiGet(`/analytics/exams/${examId}/sections/${sectionId}/`)

export interface CreateExamData {
  exam_name: string
  class_id?: string
  section_id?: string
}

export const createExam = (data: CreateExamData): Promise<AnalyticsExam> =>
  apiPost('/analytics/exams/', data)

export const uploadExamFile = (examId: string, file: File): Promise<unknown> => {
  const fd = new FormData()
  fd.append('csv_file', file)
  return apiPostForm(`/analytics/exams/${examId}/upload/`, fd)
}
