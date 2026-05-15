import { analyticsApi } from './analyticsApi';
import type { ExamOverviewClass, ExamOverviewSection, PerformanceLabel, QuestionStatus, RiskLabel, SectionStudent } from '../types/analytics';

// ── Types (unchanged — all screens import these) ──────────────────────────────

export type AnalyticsStatus = 'CREATED' | 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
export type ExamType = 'CLASS' | 'SECTION';
export type DifficultyTag = 'EASY' | 'MEDIUM' | 'HARD';
export type AnswerGroup = 'correct' | 'wrong' | 'unattempted';

export interface Exam {
  id: string;
  exam_name: string;
  exam_date: string;
  analytics_status: AnalyticsStatus;
  type: ExamType;
}

export interface SubjectAvg {
  subject_id: string;
  subject_name: string;
  avg: number;
  max_marks: number;
}

export interface SectionAvg {
  section_id: string;
  section_name: string;
  avg: number;
}

export interface TopStudent {
  student_id: string;
  name: string;
  student_ref_id: string;
  total_marks: number;
  rank: number;
}

export interface ExamOverview {
  exam: Exam;
  role_view: 'STAFF';
  class_avgs: SubjectAvg[];
  sections: SectionAvg[];
  top_students: TopStudent[];
}

export interface SectionSubjectDetail {
  subject_id: string;
  subject_name: string;
  section_avg: number;
  class_avg: number;
  delta: number;
}

export interface TeacherSectionStudentSubject {
  subject_id?: string;
  subject_name: string;
  subject_percentage: number;
}

export interface TeacherSectionStudent {
  student_id: string;
  student_ref_id: string;
  name: string;
  subject_details: TeacherSectionStudentSubject[];
  total_pct: number;
  subject_risk: Record<string, RiskLabel>;
  overall_risk: RiskLabel;
}

export interface QuestionStat {
  q_no: number;
  correct_count: number;
  wrong_count: number;
  unattempted_count: number;
  difficulty_tag: DifficultyTag;
  difficulty_index: number;
  has_key_error: boolean;
}

export interface QuestionStudent {
  student_id: string;
  student_ref_id: string;
  name: string;
}

export interface QuestionStudents {
  correct: QuestionStudent[];
  wrong: QuestionStudent[];
  unattempted: QuestionStudent[];
}

export interface SubjectQuestionSet {
  exam: Pick<Exam, 'id' | 'exam_name'>;
  subject: { id: string; name: string };
  total_questions: number;
  questions: QuestionStat[];
}

// ── Normalisation helpers ─────────────────────────────────────────────────────

// Backend returns 'RUNNING'; screens expect 'PROCESSING'
function mapStatus(status: string): AnalyticsStatus {
  if (status === 'RUNNING') return 'PROCESSING';
  return status as AnalyticsStatus;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /analytics/exams/?class_id=<uuid>
 * Returns exams for the teacher's class. Pass classId to filter by specific class.
 */
export async function fetchTeacherExams(classId?: string): Promise<Exam[]> {
  const data = await analyticsApi.listExams(classId);
  const exams = data.exams ?? data.results ?? [];

  return exams.map(exam => ({
    id: exam.id,
    exam_name: exam.exam_name,
    exam_date: exam.exam_date ?? '',
    analytics_status: mapStatus(exam.analytics_status),
    type: (exam.type ?? 'CLASS') as ExamType,
  }));
}

/**
 * GET /analytics/exams/{examId}/overview/
 * Normalises both CLASS and SECTION exam shapes into a single ExamOverview.
 */
export async function fetchTeacherExamOverview(examId: string): Promise<ExamOverview> {
  const data = await analyticsApi.getExamOverview(examId);

  let class_avgs: SubjectAvg[];
  let sections: SectionAvg[];

  if (data.exam.type === 'CLASS') {
    const d = data as ExamOverviewClass;
    class_avgs = d.class_avgs ?? [];
    sections = (d.sections ?? []).map(s => ({
      section_id: s.section_id,
      section_name: s.section_name,
      avg: s.avg ?? 0,
    }));
  } else {
    // SECTION exam — avgs are under subject_avgs, no sections list
    const d = data as ExamOverviewSection;
    class_avgs = d.subject_avgs ?? [];
    sections = [];
  }

  return {
    exam: {
      id: data.exam.id,
      exam_name: data.exam.exam_name,
      exam_date: data.exam.exam_date ?? '',
      analytics_status: mapStatus(data.exam.analytics_status),
      type: data.exam.type as ExamType,
    },
    role_view: 'STAFF',
    class_avgs,
    sections,
    top_students: (data.top_students ?? []).map((s, idx) => ({
      student_id: s.student_id,
      name: s.name,
      student_ref_id: s.student_ref_id,
      total_marks: s.total_marks,
      rank: s.rank ?? idx + 1,
    })),
  };
}

/**
 * GET /analytics/exams/{examId}/sections/{sectionId}/
 * Returns per-subject comparison (section avg vs class avg) for the section.
 */
export async function fetchTeacherSectionDetail(
  examId: string,
  sectionId: string,
): Promise<SectionSubjectDetail[]> {
  const data = await analyticsApi.getSectionDetail(examId, sectionId);
  return (data.subjects ?? []).map(s => ({
    subject_id: s.subject_id,
    subject_name: s.subject_name,
    section_avg: s.section_avg ?? 0,
    class_avg: s.class_avg ?? 0,
    delta: s.delta ?? 0,
  }));
}

function normalizeStudentSubjects(student: SectionStudent): TeacherSectionStudentSubject[] {
  if (student.subject_details?.length) {
    return student.subject_details.map(subject => ({
      subject_id: subject.subject_id,
      subject_name: subject.subject_name,
      subject_percentage: subject.subject_percentage ?? 0,
    }));
  }

  return [
    { subject_name: 'MATHS', subject_percentage: student.maths_pct },
    { subject_name: 'PHYSICS', subject_percentage: student.physics_pct },
    { subject_name: 'CHEMISTRY', subject_percentage: student.chem_pct },
  ].filter((subject): subject is TeacherSectionStudentSubject => subject.subject_percentage !== undefined);
}

/**
 * GET /analytics/section/{sectionId}/?exam_id={examId}
 * Returns section students with per-subject percentages and risk labels.
 */
export async function fetchTeacherSectionStudents(
  examId: string,
  sectionId: string,
): Promise<TeacherSectionStudent[]> {
  const data = await analyticsApi.getSectionStudents(sectionId, examId);

  return (data.students ?? [])
    .map(student => ({
      student_id: student.student_id,
      student_ref_id: student.student_ref_id,
      name: student.name,
      subject_details: normalizeStudentSubjects(student),
      total_pct: student.total_pct ?? 0,
      subject_risk: student.subject_risk ?? {},
      overall_risk: student.overall_risk,
    }))
    .sort((a, b) => b.total_pct - a.total_pct);
}

/**
 * GET /analytics/exams/{examId}/sections/{sectionId}/subjects/{subjectId}/questions/
 * OR GET /analytics/exams/{examId}/subjects/{subjectId}/questions/
 * Returns question-level stats for a subject, optionally scoped to a section.
 */
export async function fetchTeacherSubjectQuestions(
  examId: string,
  subjectId: string,
  sectionId?: string,
): Promise<SubjectQuestionSet> {
  const data = sectionId
    ? await analyticsApi.getSectionQuestionStats(examId, sectionId, subjectId)
    : await analyticsApi.getClassQuestionStats(examId, subjectId);

  return {
    exam: { id: data.exam.id, exam_name: data.exam.exam_name },
    subject: { id: data.subject.id, name: data.subject.name },
    total_questions: data.total_questions,
    questions: (data.questions ?? []).map(q => ({
      q_no: q.q_no,
      correct_count: q.correct_count,
      wrong_count: q.wrong_count,
      // Backend uses either unattempted_count or skip_count
      unattempted_count: q.unattempted_count ?? (q as any).skip_count ?? 0,
      difficulty_tag: q.difficulty_tag as DifficultyTag,
      difficulty_index: q.difficulty_index,
      has_key_error: q.has_key_error,
    })),
  };
}

/**
 * GET /analytics/exams/{examId}/sections/{sectionId}/subjects/{subjectId}/questions/{qNo}/students/
 * OR GET /analytics/exams/{examId}/subjects/{subjectId}/questions/{qNo}/students/
 * Returns which students answered a question correctly / wrongly / skipped it.
 */
export async function fetchTeacherQuestionStudents(
  examId?: string,
  subjectId?: string,
  qNo?: number,
  sectionId?: string,
): Promise<QuestionStudents> {
  if (!examId || !subjectId || qNo === undefined) {
    return { correct: [], wrong: [], unattempted: [] };
  }

  const data = sectionId
    ? await analyticsApi.getSectionQuestionStudents(examId, sectionId, subjectId, qNo)
    : await analyticsApi.getClassQuestionStudents(examId, subjectId, qNo);

  const students = data.students ?? { correct: [], wrong: [], unattempted: [] };
  return {
    correct: students.correct ?? [],
    wrong: students.wrong ?? [],
    unattempted: students.unattempted ?? [],
  };
}

// ── Student subject drill-down ─────────────────────────────────────────────────

export interface StudentSubjectDrilldown {
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

/**
 * GET /analytics/student/{studentId}/subject/{subjectId}/?exam_id={examId}
 * Returns per-question status + result summary for one student/subject pair.
 */
export async function fetchStudentSubjectDrilldown(
  studentId: string,
  subjectId: string,
  examId: string,
): Promise<StudentSubjectDrilldown> {
  const data = await analyticsApi.getStudentSubject(studentId, subjectId, examId);
  return {
    student: data.student,
    exam: data.exam,
    subject_name: data.subject_name,
    result: {
      total_marks: data.result.total_marks,
      max_marks: data.result.max_marks,
      percentage: data.result.percentage,
      exam_rank: data.result.exam_rank,
      correct: data.result.correct,
      wrong: data.result.wrong,
      unattempted: data.result.unattempted,
      risk_label: data.result.risk_label,
      performance_label: data.result.performance_label,
      z_score: data.result.z_score,
    },
    questions: (data.questions ?? []).map(q => ({ q_no: q.q_no, status: q.status })),
  };
}
