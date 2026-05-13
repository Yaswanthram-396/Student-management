// import api from "./api"; // Uncomment and remove dummy data when backend is ready

export interface Exam {
  id: string;
  exam_name: string;
  exam_date: string;
  analytics_status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  type: "CLASS" | "SECTION";
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
  role_view: string;
  class_avgs: SubjectAvg[];
  sections: SectionAvg[];
  top_students: TopStudent[];
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────

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
    analytics_status: "PENDING",
    type: "SECTION",
  },
  {
    id: "exam-004",
    exam_name: "Annual Exam",
    exam_date: "2026-01-05",
    analytics_status: "DONE",
    type: "CLASS",
  },
];

const DUMMY_OVERVIEWS: Record<string, ExamOverview> = {
  "exam-001": {
    exam: DUMMY_EXAMS[0],
    role_view: "STAFF",
    class_avgs: [
      { subject_id: "s1", subject_name: "MATHS",   avg: 62.5, max_marks: 80 },
      { subject_id: "s2", subject_name: "PHYSICS",  avg: 28.0, max_marks: 40 },
      { subject_id: "s3", subject_name: "ENGLISH",  avg: 71.2, max_marks: 80 },
      { subject_id: "s4", subject_name: "CHEMISTRY",avg: 33.5, max_marks: 40 },
    ],
    sections: [
      { section_id: "sec-a", section_name: "A", avg: 64.2 },
      { section_id: "sec-b", section_name: "B", avg: 58.7 },
    ],
    top_students: [
      { student_id: "st1", name: "Aarav Mehta",   student_ref_id: "S001", total_marks: 148, rank: 1 },
      { student_id: "st2", name: "Priya Sharma",  student_ref_id: "S014", total_marks: 142, rank: 2 },
      { student_id: "st3", name: "Rohan Patel",   student_ref_id: "S027", total_marks: 138, rank: 3 },
      { student_id: "st4", name: "Ananya Reddy",  student_ref_id: "S033", total_marks: 135, rank: 4 },
      { student_id: "st5", name: "Kabir Singh",   student_ref_id: "S041", total_marks: 131, rank: 5 },
    ],
  },
  "exam-002": {
    exam: DUMMY_EXAMS[1],
    role_view: "STAFF",
    class_avgs: [
      { subject_id: "s1", subject_name: "MATHS",   avg: 55.0, max_marks: 80 },
      { subject_id: "s2", subject_name: "PHYSICS",  avg: 31.5, max_marks: 40 },
      { subject_id: "s3", subject_name: "ENGLISH",  avg: 68.0, max_marks: 80 },
      { subject_id: "s4", subject_name: "CHEMISTRY",avg: 29.0, max_marks: 40 },
      { subject_id: "s5", subject_name: "BIOLOGY",  avg: 36.0, max_marks: 40 },
    ],
    sections: [
      { section_id: "sec-a", section_name: "A", avg: 72.1 },
      { section_id: "sec-b", section_name: "B", avg: 61.4 },
      { section_id: "sec-c", section_name: "C", avg: 55.8 },
    ],
    top_students: [
      { student_id: "st2", name: "Priya Sharma",  student_ref_id: "S014", total_marks: 220, rank: 1 },
      { student_id: "st1", name: "Aarav Mehta",   student_ref_id: "S001", total_marks: 215, rank: 2 },
      { student_id: "st6", name: "Meera Iyer",    student_ref_id: "S009", total_marks: 208, rank: 3 },
    ],
  },
  "exam-003": {
    exam: DUMMY_EXAMS[2],
    role_view: "STAFF",
    class_avgs: [],
    sections: [{ section_id: "sec-a", section_name: "A", avg: 0 }],
    top_students: [],
  },
  "exam-004": {
    exam: DUMMY_EXAMS[3],
    role_view: "STAFF",
    class_avgs: [
      { subject_id: "s1", subject_name: "MATHS",    avg: 70.0, max_marks: 100 },
      { subject_id: "s2", subject_name: "PHYSICS",   avg: 65.0, max_marks: 100 },
      { subject_id: "s3", subject_name: "ENGLISH",   avg: 80.0, max_marks: 100 },
      { subject_id: "s4", subject_name: "CHEMISTRY", avg: 58.0, max_marks: 100 },
    ],
    sections: [
      { section_id: "sec-a", section_name: "A", avg: 76.5 },
      { section_id: "sec-b", section_name: "B", avg: 68.2 },
    ],
    top_students: [
      { student_id: "st3", name: "Rohan Patel",   student_ref_id: "S027", total_marks: 382, rank: 1 },
      { student_id: "st5", name: "Kabir Singh",   student_ref_id: "S041", total_marks: 371, rank: 2 },
      { student_id: "st4", name: "Ananya Reddy",  student_ref_id: "S033", total_marks: 365, rank: 3 },
      { student_id: "st7", name: "Divya Nair",    student_ref_id: "S052", total_marks: 358, rank: 4 },
    ],
  },
};

// ─── Service Functions ────────────────────────────────────────────────────────

/** Simulates network delay */
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const fetchTeacherExams = async (): Promise<Exam[]> => {
  await delay(600);
  // Real API: const response = await api.get<{ success: boolean; exams: Exam[] }>("/analytics/exams/");
  // return response.data.exams || [];
  return DUMMY_EXAMS;
};

export const fetchTeacherExamOverview = async (examId: string): Promise<ExamOverview> => {
  await delay(400);
  // Real API: const response = await api.get<ExamOverview>(`/analytics/exams/${examId}/overview/`);
  // return response.data;
  const data = DUMMY_OVERVIEWS[examId];
  if (!data) throw new Error(`No overview found for exam ${examId}`);
  return data;
};
