import { apiGet, apiPost, apiPostForm } from './client'
import type {
  AnalyticsExam,
  ExamOverviewResponse,
  SectionDetailResponse,
  SectionStudentsAnalyticsResponse,
  SectionHeatmapResponse,
  QuestionDetailResponse,
  StudentSummaryAnalyticsResponse,
  StudentSubjectAnalyticsResponse,
} from '../types'

// ── Exam management ───────────────────────────────────────────────────────────

export const listExams = async (classId?: string): Promise<AnalyticsExam[]> => {
  const query = classId ? `?class_id=${classId}` : ''
  const res: { success: boolean; exams?: AnalyticsExam[]; results?: AnalyticsExam[] } =
    await apiGet(`/analytics/exams/${query}`)
  return res.exams ?? res.results ?? []
}

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

// ── Exam overview ─────────────────────────────────────────────────────────────

export const getExamOverview = (examId: string): Promise<ExamOverviewResponse> =>
  apiGet(`/analytics/exams/${examId}/overview/`)

// ── Section drill-down ────────────────────────────────────────────────────────

/** GET /analytics/exams/{examId}/sections/{sectionId}/
 *  Returns per-subject section_avg vs class_avg comparison. */
export const getSectionDetail = (
  examId: string,
  sectionId: string,
): Promise<SectionDetailResponse> =>
  apiGet(`/analytics/exams/${examId}/sections/${sectionId}/`)

/** GET /analytics/section/{sectionId}/?exam_id=
 *  Returns student list with per-subject percentages and risk labels. */
export const getSectionStudents = (
  sectionId: string,
  examId: string,
): Promise<SectionStudentsAnalyticsResponse> =>
  apiGet(`/analytics/section/${sectionId}/?exam_id=${examId}`)

/** GET /analytics/section/{sectionId}/subject/{subjectId}/heatmap/?exam_id=
 *  Returns per-question difficulty stats for a section + subject. */
export const getSectionHeatmap = (
  sectionId: string,
  subjectId: string,
  examId: string,
): Promise<SectionHeatmapResponse> =>
  apiGet(`/analytics/section/${sectionId}/subject/${subjectId}/heatmap/?exam_id=${examId}`)

/** GET /analytics/section/{sectionId}/subject/{subjectId}/question/{qNo}/?exam_id=
 *  Returns detail for a single question including discrimination_index. */
export const getQuestionDetail = (
  sectionId: string,
  subjectId: string,
  qNo: number,
  examId: string,
): Promise<QuestionDetailResponse> =>
  apiGet(`/analytics/section/${sectionId}/subject/${subjectId}/question/${qNo}/?exam_id=${examId}`)

// ── Student drill-down ────────────────────────────────────────────────────────

/** GET /analytics/student/{studentId}/?exam_id=
 *  Returns full student summary with per-subject marks, rank, risk. */
export const getStudentSummary = (
  studentId: string,
  examId: string,
): Promise<StudentSummaryAnalyticsResponse> =>
  apiGet(`/analytics/student/${studentId}/?exam_id=${examId}`)

/** GET /analytics/student/{studentId}/subject/{subjectId}/?exam_id=
 *  Returns per-question C/W/U breakdown for one student + subject. */
export const getStudentSubject = (
  studentId: string,
  subjectId: string,
  examId: string,
): Promise<StudentSubjectAnalyticsResponse> =>
  apiGet(`/analytics/student/${studentId}/subject/${subjectId}/?exam_id=${examId}`)
