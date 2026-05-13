export type AnalyticsStatus = "CREATED" | "PENDING" | "PROCESSING" | "DONE" | "FAILED";
export type ExamType = "CLASS" | "SECTION";
export type DifficultyTag = "EASY" | "MEDIUM" | "HARD";
export type AnswerGroup = "correct" | "wrong" | "unattempted";

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
  role_view: "STAFF";
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
  exam: Pick<Exam, "id" | "exam_name">;
  subject: { id: string; name: string };
  total_questions: number;
  questions: QuestionStat[];
}

const DUMMY_EXAMS: Exam[] = [
  {
    id: "exam-001",
    exam_name: "Unit Test 1",
    exam_date: "2026-04-15",
    analytics_status: "DONE",
    type: "CLASS",
  },
  {
    id: "exam-002",
    exam_name: "Mid-Term 2026",
    exam_date: "2026-03-10",
    analytics_status: "DONE",
    type: "CLASS",
  },
  {
    id: "exam-003",
    exam_name: "Section Quiz",
    exam_date: "2026-02-20",
    analytics_status: "PROCESSING",
    type: "SECTION",
  },
  {
    id: "exam-004",
    exam_name: "Annual Exam",
    exam_date: "2026-01-05",
    analytics_status: "FAILED",
    type: "CLASS",
  },
];

const DUMMY_OVERVIEWS: Record<string, ExamOverview> = {
  "exam-001": {
    exam: DUMMY_EXAMS[0],
    role_view: "STAFF",
    class_avgs: [
      { subject_id: "maths", subject_name: "Maths", avg: 62.5, max_marks: 80 },
      { subject_id: "physics", subject_name: "Physics", avg: 28.0, max_marks: 40 },
      { subject_id: "english", subject_name: "English", avg: 71.2, max_marks: 80 },
      { subject_id: "chemistry", subject_name: "Chemistry", avg: 33.5, max_marks: 40 },
    ],
    sections: [
      { section_id: "sec-a", section_name: "A", avg: 64.2 },
      { section_id: "sec-b", section_name: "B", avg: 58.7 },
    ],
    top_students: [
      { student_id: "st1", name: "Aarav Mehta", student_ref_id: "S001", total_marks: 148, rank: 1 },
      { student_id: "st2", name: "Priya Sharma", student_ref_id: "S014", total_marks: 142, rank: 2 },
      { student_id: "st3", name: "Rohan Patel", student_ref_id: "S027", total_marks: 138, rank: 3 },
      { student_id: "st4", name: "Ananya Reddy", student_ref_id: "S033", total_marks: 135, rank: 4 },
      { student_id: "st5", name: "Kabir Singh", student_ref_id: "S041", total_marks: 131, rank: 5 },
    ],
  },
  "exam-002": {
    exam: DUMMY_EXAMS[1],
    role_view: "STAFF",
    class_avgs: [
      { subject_id: "maths", subject_name: "Maths", avg: 55.0, max_marks: 80 },
      { subject_id: "physics", subject_name: "Physics", avg: 31.5, max_marks: 40 },
      { subject_id: "english", subject_name: "English", avg: 68.0, max_marks: 80 },
      { subject_id: "biology", subject_name: "Biology", avg: 36.0, max_marks: 40 },
    ],
    sections: [
      { section_id: "sec-a", section_name: "A", avg: 72.1 },
      { section_id: "sec-b", section_name: "B", avg: 61.4 },
      { section_id: "sec-c", section_name: "C", avg: 55.8 },
    ],
    top_students: [
      { student_id: "st2", name: "Priya Sharma", student_ref_id: "S014", total_marks: 220, rank: 1 },
      { student_id: "st1", name: "Aarav Mehta", student_ref_id: "S001", total_marks: 215, rank: 2 },
      { student_id: "st6", name: "Meera Iyer", student_ref_id: "S009", total_marks: 208, rank: 3 },
    ],
  },
};

const DUMMY_SECTION_DETAILS: Record<string, Record<string, SectionSubjectDetail[]>> = {
  "exam-001": {
    "sec-a": [
      { subject_id: "maths", subject_name: "Maths", section_avg: 66.8, class_avg: 62.5, delta: 4.3 },
      { subject_id: "physics", subject_name: "Physics", section_avg: 30.5, class_avg: 28.0, delta: 2.5 },
      { subject_id: "english", subject_name: "English", section_avg: 69.2, class_avg: 71.2, delta: -2.0 },
      { subject_id: "chemistry", subject_name: "Chemistry", section_avg: 34.8, class_avg: 33.5, delta: 1.3 },
    ],
    "sec-b": [
      { subject_id: "maths", subject_name: "Maths", section_avg: 58.1, class_avg: 62.5, delta: -4.4 },
      { subject_id: "physics", subject_name: "Physics", section_avg: 25.2, class_avg: 28.0, delta: -2.8 },
      { subject_id: "english", subject_name: "English", section_avg: 73.1, class_avg: 71.2, delta: 1.9 },
      { subject_id: "chemistry", subject_name: "Chemistry", section_avg: 32.1, class_avg: 33.5, delta: -1.4 },
    ],
  },
};

const QUESTION_BANK: QuestionStat[] = [
  { q_no: 1, correct_count: 18, wrong_count: 3, unattempted_count: 0, difficulty_tag: "EASY", difficulty_index: 85.7, has_key_error: false },
  { q_no: 2, correct_count: 12, wrong_count: 8, unattempted_count: 1, difficulty_tag: "MEDIUM", difficulty_index: 57.1, has_key_error: false },
  { q_no: 3, correct_count: 7, wrong_count: 11, unattempted_count: 3, difficulty_tag: "HARD", difficulty_index: 33.3, has_key_error: false },
  { q_no: 4, correct_count: 10, wrong_count: 6, unattempted_count: 5, difficulty_tag: "MEDIUM", difficulty_index: 47.6, has_key_error: true },
  { q_no: 5, correct_count: 16, wrong_count: 4, unattempted_count: 1, difficulty_tag: "EASY", difficulty_index: 76.2, has_key_error: false },
  { q_no: 6, correct_count: 6, wrong_count: 13, unattempted_count: 2, difficulty_tag: "HARD", difficulty_index: 28.6, has_key_error: false },
];

const STUDENTS: QuestionStudent[] = [
  { student_id: "st1", student_ref_id: "S001", name: "Aarav Mehta" },
  { student_id: "st2", student_ref_id: "S014", name: "Priya Sharma" },
  { student_id: "st3", student_ref_id: "S027", name: "Rohan Patel" },
  { student_id: "st4", student_ref_id: "S033", name: "Ananya Reddy" },
  { student_id: "st5", student_ref_id: "S041", name: "Kabir Singh" },
  { student_id: "st6", student_ref_id: "S009", name: "Meera Iyer" },
];

export const fetchTeacherExams = async (): Promise<Exam[]> => DUMMY_EXAMS;

export const fetchTeacherExamOverview = async (examId: string): Promise<ExamOverview> => {
  const data = DUMMY_OVERVIEWS[examId];
  if (!data) throw new Error(`No overview found for exam ${examId}`);
  return data;
};

export const fetchTeacherSectionDetail = async (
  examId: string,
  sectionId: string
): Promise<SectionSubjectDetail[]> => {
  const existing = DUMMY_SECTION_DETAILS[examId]?.[sectionId];
  if (existing) return existing;

  const overview = DUMMY_OVERVIEWS[examId];
  return overview.class_avgs.map((subject, index) => {
    const delta = index % 2 === 0 ? 2.4 : -1.8;
    const classAvg = (subject.avg / subject.max_marks) * 100;

    return {
      subject_id: subject.subject_id,
      subject_name: subject.subject_name,
      section_avg: Math.max(0, Math.min(100, classAvg + delta)),
      class_avg: classAvg,
      delta,
    };
  });
};

export const fetchTeacherSubjectQuestions = async (
  examId: string,
  subjectId: string,
  sectionId?: string
): Promise<SubjectQuestionSet> => {
  const overview = await fetchTeacherExamOverview(examId);
  const subject = overview.class_avgs.find((item) => item.subject_id === subjectId);
  if (!subject) throw new Error(`No subject found for ${subjectId}`);

  const sectionOffset = sectionId ? 1 : 0;

  return {
    exam: { id: overview.exam.id, exam_name: overview.exam.exam_name },
    subject: { id: subject.subject_id, name: subject.subject_name },
    total_questions: QUESTION_BANK.length,
    questions: QUESTION_BANK.map((question, index) => ({
      ...question,
      correct_count: Math.max(0, question.correct_count - sectionOffset * (index % 2)),
      wrong_count: question.wrong_count + sectionOffset * (index % 2),
    })),
  };
};

export const fetchTeacherQuestionStudents = async (
  examId?: string,
  subjectId?: string,
  qNo?: number,
  sectionId?: string
): Promise<QuestionStudents> => {
  void examId;
  void subjectId;
  void qNo;
  void sectionId;

  return {
    correct: STUDENTS.slice(0, 3),
    wrong: STUDENTS.slice(3, 5),
    unattempted: STUDENTS.slice(5),
  };
};
