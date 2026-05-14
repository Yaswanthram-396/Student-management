import { apiRequest, apiRequestText } from './api';
import type {
  AnalyticsDashboardResponse,
  ClassAnalyticsDetailResponse,
  CreateExamRequest,
  CreateExamResponse,
  ExamOverviewResponse,
  LegacyUploadResponse,
  ListExamsResponse,
  QuestionStatsResponse,
  QuestionStudentsResponse,
  SectionDetailResponse,
  SectionHeatmapResponse,
  SectionQuestionDetailResponse,
  SectionQuestionStatsResponse,
  SectionStudentsResponse,
  StudentSubjectResponse,
  StudentSummaryResponse,
  UploadExamResponse,
} from '../types/analytics';

function buildQuery(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return '';
  return `?${new URLSearchParams(entries as [string, string][]).toString()}`;
}

export const analyticsApi = {
  // ── Exam management ─────────────────────────────────────────────────────────

  listExams: () =>
    apiRequest<ListExamsResponse>('GET', '/analytics/exams/'),

  createExam: (body: CreateExamRequest) =>
    apiRequest<CreateExamResponse>('POST', '/analytics/exams/', body),

  uploadExam: (examId: string, formData: FormData) =>
    apiRequest<UploadExamResponse>(
      'POST',
      `/analytics/exams/${examId}/upload/`,
      formData,
      true,
    ),

  legacyUpload: (formData: FormData) =>
    apiRequest<LegacyUploadResponse>(
      'POST',
      '/analytics/upload/',
      formData,
      true,
    ),

  // ── Exam overview ───────────────────────────────────────────────────────────

  getExamOverview: (examId: string) =>
    apiRequest<ExamOverviewResponse>('GET', `/analytics/exams/${examId}/overview/`),

  getDashboard: (examId?: string) =>
    apiRequest<AnalyticsDashboardResponse>(
      'GET',
      `/analytics/dashboard/${buildQuery({ exam_id: examId })}`,
    ),

  getClassDetail: (classId: string, examId: string) =>
    apiRequest<ClassAnalyticsDetailResponse>(
      'GET',
      `/analytics/class/${classId}/?exam_id=${examId}`,
    ),

  // ── Class-level question stats ───────────────────────────────────────────────

  getClassQuestionStats: (examId: string, subjectId: string) =>
    apiRequest<QuestionStatsResponse>(
      'GET',
      `/analytics/exams/${examId}/subjects/${subjectId}/questions/`,
    ),

  getClassQuestionStudents: (examId: string, subjectId: string, qNo: number) =>
    apiRequest<QuestionStudentsResponse>(
      'GET',
      `/analytics/exams/${examId}/subjects/${subjectId}/questions/${qNo}/students/`,
    ),

  // ── Section-level endpoints ─────────────────────────────────────────────────

  getSectionDetail: (examId: string, sectionId: string) =>
    apiRequest<SectionDetailResponse>(
      'GET',
      `/analytics/exams/${examId}/sections/${sectionId}/`,
    ),

  getSectionQuestionStats: (examId: string, sectionId: string, subjectId: string) =>
    apiRequest<SectionQuestionStatsResponse>(
      'GET',
      `/analytics/exams/${examId}/sections/${sectionId}/subjects/${subjectId}/questions/`,
    ),

  getSectionQuestionStudents: (
    examId: string,
    sectionId: string,
    subjectId: string,
    qNo: number,
  ) =>
    apiRequest<QuestionStudentsResponse>(
      'GET',
      `/analytics/exams/${examId}/sections/${sectionId}/subjects/${subjectId}/questions/${qNo}/students/`,
    ),

  getSectionHeatmap: (sectionId: string, subjectId: string, examId: string) =>
    apiRequest<SectionHeatmapResponse>(
      'GET',
      `/analytics/section/${sectionId}/subject/${subjectId}/heatmap/?exam_id=${examId}`,
    ),

  getSectionQuestionDetail: (
    sectionId: string,
    subjectId: string,
    qNo: number,
    examId: string,
  ) =>
    apiRequest<SectionQuestionDetailResponse>(
      'GET',
      `/analytics/section/${sectionId}/subject/${subjectId}/question/${qNo}/?exam_id=${examId}`,
    ),

  // ── Section students (legacy endpoint used by Screen 3) ─────────────────────

  getSectionStudents: (sectionId: string, examId: string) =>
    apiRequest<SectionStudentsResponse>(
      'GET',
      `/analytics/section/${sectionId}/?exam_id=${examId}`,
    ),

  // ── Student screens ─────────────────────────────────────────────────────────

  getStudentSummary: (studentId: string, examId: string) =>
    apiRequest<StudentSummaryResponse>(
      'GET',
      `/analytics/student/${studentId}/?exam_id=${examId}`,
    ),

  getStudentSubject: (studentId: string, subjectId: string, examId: string) =>
    apiRequest<StudentSubjectResponse>(
      'GET',
      `/analytics/student/${studentId}/subject/${subjectId}/?exam_id=${examId}`,
    ),

  // ── CSV template ────────────────────────────────────────────────────────────

  getTemplate: () =>
    apiRequestText('GET', '/analytics/template/'),

  seed: () =>
    apiRequest<UploadExamResponse>('POST', '/analytics/seed/'),
};
