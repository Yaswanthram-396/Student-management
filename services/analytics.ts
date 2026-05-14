import { apiRequest } from './api';

export type AnalyticsStatus = 'CREATED' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
export type RiskLabel = 'SAFE' | 'WATCH' | 'ALERT';
export type ExamType = 'CLASS' | 'SECTION';

export interface ExamSummary {
  id: string;
  exam_name: string;
  exam_date: string | null;
  analytics_status: AnalyticsStatus;
  type: ExamType;
}

export interface TopStudent {
  student_id: string;
  name: string;
  total_pct: number;
  overall_risk: RiskLabel;
}

export interface SubjectAvg {
  subject_name: string;
  avg_pct: number;
}

export interface ExamOverview {
  exam: ExamSummary;
  role_view: string;
  // CLASS exam
  class_avgs?: Record<string, number>;
  sections?: Array<{ id: string; name: string; student_count: number; avg_pct: number }>;
  // SECTION exam
  section?: { id: string; name: string };
  subject_avgs?: SubjectAvg[];
  top_students?: TopStudent[];
}

export interface SectionStudent {
  student_id: string;
  student_ref_id: string;
  name: string;
  maths_pct: number | null;
  physics_pct: number | null;
  chem_pct: number | null;
  total_pct: number;
  subject_risk: Record<string, RiskLabel>;
  overall_risk: RiskLabel;
}

export interface SectionDetail {
  class_name: string;
  section_name: string;
  section_id: string;
  exam: { id: string; exam_name: string; exam_date: string | null };
  students: SectionStudent[];
}

export interface StudentSubjectResult {
  subject_id: string;
  subject_name: string;
  total_marks: number;
  max_marks: number;
  correct: number;
  wrong: number;
  unattempted: number;
  risk_label: RiskLabel;
}

export interface StudentResult {
  total_marks: number;
  overall_risk: RiskLabel;
  subjects: StudentSubjectResult[];
}

export interface StudentSummaryResponse {
  student_results?: StudentResult;
  // overview may return flat structure
  total_marks?: number;
  overall_risk?: RiskLabel;
  subjects?: StudentSubjectResult[];
}

export const analyticsApi = {
  getExams: () =>
    apiRequest<{ success: boolean; exams: ExamSummary[] }>('GET', '/analytics/exams/'),

  getExamOverview: (examId: string) =>
    apiRequest<ExamOverview>('GET', `/analytics/exams/${examId}/overview/`),

  getSectionDetail: (examId: string, sectionId: string) =>
    apiRequest<SectionDetail>('GET', `/analytics/exams/${examId}/sections/${sectionId}/`),

  getStudentSummary: (studentId: string, examId: string) =>
    apiRequest<StudentSummaryResponse>('GET', `/analytics/student/${studentId}/?exam_id=${examId}`),
};
