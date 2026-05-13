// ── Shared primitives ────────────────────────────────────────────────────────

export type AnalyticsStatus = 'CREATED' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
export type RiskLabel = 'SAFE' | 'WATCH' | 'ALERT';
export type PerformanceLabel =
  | 'EXCEPTIONAL'
  | 'ABOVE_AVERAGE'
  | 'AVERAGE'
  | 'BELOW_AVERAGE'
  | 'NEEDS_ATTENTION';
export type DifficultyTag = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionStatus = 'C' | 'W' | 'U';

// ── Exam management ───────────────────────────────────────────────────────────

export interface AnalyticsExam {
  id: string;
  exam_name: string;
  exam_date: string;
  analytics_status: AnalyticsStatus;
}

export interface ListExamsResponse {
  success: boolean;
  exams: AnalyticsExam[];
}

export interface CreateExamRequest {
  exam_name: string;
  class_id?: string;
  section_id?: string;
}

export interface CreateExamResponse {
  id: string;
  exam_name: string;
  analytics_status: AnalyticsStatus;
  academic_class: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  created_at: string;
}

export interface UploadExamResponse {
  success: boolean;
  exam_id: string;
  exam_name: string;
  exam_date: string;
  analytics_status: AnalyticsStatus;
  students_saved: number;
  skipped_count: number;
  subjects: { subject_name: string; total_questions: number }[];
  skipped: { row_number: number; student_id: string; reason: string }[];
}

export type LegacyUploadResponse = UploadExamResponse;

// ── Exam overview ─────────────────────────────────────────────────────────────

export interface SubjectAvg {
  subject_id: string;
  subject_name: string;
  avg: number;
  max_marks: number;
}

export interface TopStudent {
  student_id: string;
  name: string;
  student_ref_id: string;
  total_marks: number;
  rank: number;
}

export interface ExamOverviewBase {
  exam: {
    id: string;
    exam_name: string;
    exam_date: string;
    analytics_status: AnalyticsStatus;
    type: 'CLASS' | 'SECTION';
  };
  top_students: TopStudent[];
}

export interface ExamOverviewClass extends ExamOverviewBase {
  exam: ExamOverviewBase['exam'] & { type: 'CLASS' };
  class_avgs: SubjectAvg[];
  sections: { section_id: string; section_name: string; avg: number }[];
}

export interface ExamOverviewSection extends ExamOverviewBase {
  exam: ExamOverviewBase['exam'] & { type: 'SECTION' };
  section: { id: string; name: string };
  subject_avgs: SubjectAvg[];
}

export type ExamOverviewResponse = ExamOverviewClass | ExamOverviewSection;

// ── Question stats ────────────────────────────────────────────────────────────

export interface QuestionStat {
  q_no: number;
  correct_count: number;
  wrong_count: number;
  unattempted_count?: number;
  skip_count?: number;
  difficulty_tag: DifficultyTag;
  difficulty_index: number;
  has_key_error: boolean;
}

export interface QuestionStatWithDiscrimination extends QuestionStat {
  discrimination_index: number;
}

export interface QuestionStatsResponse {
  exam: { id: string; exam_name: string };
  subject: { id: string; name: string };
  total_questions: number;
  questions: QuestionStat[];
}

export interface SectionQuestionStatsResponse extends QuestionStatsResponse {
  section: { id: string; name: string };
}

export interface StudentInQuestion {
  student_id: string;
  student_ref_id: string;
  name: string;
}

export interface QuestionStudentsResponse {
  exam: { id: string; exam_name: string };
  subject: { id: string; name: string };
  q_no: number;
  students: {
    correct: StudentInQuestion[];
    wrong: StudentInQuestion[];
    unattempted: StudentInQuestion[];
  };
}

// ── Legacy dashboard / screen endpoints ──────────────────────────────────────

export interface AnalyticsDashboardResponse {
  success: boolean;
  exam?: {
    id: string;
    exam_name: string;
    exam_date?: string;
    analytics_status: AnalyticsStatus;
  };
  message?: string;
  subject_summary?: {
    subject_id?: string;
    subject_name: string;
    total_questions: number;
    school_avg: number;
    top_scorer: {
      name: string;
      student_ref_id: string;
      marks: number;
      class_name: string;
      section_name: string;
    } | null;
  }[];
  class_comparison?: {
    labels: string[];
    datasets: { subject: string; data: number[] }[];
  };
  exams: AnalyticsExam[];
}

export interface ClassAnalyticsDetailResponse {
  success: boolean;
  class_name: string;
  exam: { id: string; exam_name: string; exam_date: string };
  sections: {
    section_id: string;
    section_name: string;
    student_count: number;
    subjects: {
      subject_id?: string;
      subject_name: string;
      avg_marks: number;
      median_marks: number;
      std_dev: number;
      at_risk_count: number;
      top_scorer: {
        name: string;
        student_ref_id: string;
        marks: number;
      } | null;
    }[];
  }[];
}

export interface SectionHeatmapResponse {
  success: boolean;
  class_name: string;
  section_name: string;
  section_id: string;
  subject_name: string;
  total_questions: number;
  exam: { id: string; exam_name: string; exam_date: string };
  questions: QuestionStat[];
}

export interface SectionQuestionDetailResponse {
  success: boolean;
  class_name: string;
  section_name: string;
  section_id: string;
  subject_name: string;
  q_no: number;
  exam: { id: string; exam_name: string; exam_date: string };
  question: QuestionStatWithDiscrimination;
}

// ── Section detail ────────────────────────────────────────────────────────────

export interface SectionSubjectDetail {
  subject_id: string;
  subject_name: string;
  section_avg: number;
  class_avg: number;
  delta: number;
}

export interface SectionDetailResponse {
  exam: { id: string; exam_name: string };
  section: { id: string; name: string };
  subjects: SectionSubjectDetail[];
}

// ── Section students (legacy endpoint) ───────────────────────────────────────

export interface SectionStudent {
  student_id: string;
  student_ref_id: string;
  name: string;
  maths_pct: number;
  physics_pct: number;
  chem_pct: number;
  total_pct: number;
  subject_risk: Record<string, RiskLabel>;
  overall_risk: RiskLabel;
}

export interface SectionStudentsResponse {
  success: boolean;
  class_name: string;
  section_name: string;
  section_id: string;
  exam: { id: string; exam_name: string; exam_date: string };
  students: SectionStudent[];
}

// ── Student summary ───────────────────────────────────────────────────────────

export interface StudentSubjectSummary {
  subject_name: string;
  subject_id?: string;
  total_marks: number;
  max_marks: number;
  percentage: number;
  exam_rank: number;
  correct: number;
  wrong: number;
  unattempted: number;
  risk_label: RiskLabel;
  performance_label: PerformanceLabel;
  z_score: number;
}

export interface StudentSummaryResponse {
  success: boolean;
  student: {
    student_id: string;
    student_ref_id: string;
    name: string;
    class_name: string;
    section_name: string;
  };
  exam: { id: string; exam_name: string; exam_date: string };
  exams: AnalyticsExam[];
  subjects: StudentSubjectSummary[];
  overall_risk: RiskLabel;
}

// ── Student subject drill-down ────────────────────────────────────────────────

export interface StudentSubjectResponse {
  success: boolean;
  student: {
    student_id: string;
    student_ref_id: string;
    name: string;
    class_name: string;
    section_name: string;
  };
  exam: { id: string; exam_name: string; exam_date: string };
  subject_name: string;
  result: {
    total_marks: number;
    max_marks: number;
    percentage: number;
    exam_rank: number;
    correct: number;
    wrong: number;
    unattempted: number;
    risk_label: RiskLabel;
    performance_label: PerformanceLabel;
    z_score: number;
  };
  questions: { q_no: number; status: QuestionStatus }[];
}
