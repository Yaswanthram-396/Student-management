import { apiRequest } from "../../services/api";
import { storage } from "../../services/storage";

const USE_DUMMY_DATA = false; // Toggle this to false to use the real API

export async function getStudentSummary(student_id: string, exam_id: string) {
  if (USE_DUMMY_DATA) {
    return Promise.resolve({
      success: true,
      student: {
        student_id: student_id,
        student_ref_id: "STU-001",
        name: "Dummy Student",
        class_name: "Class 10",
        section_name: "A",
      },
      exam: {
        id: exam_id,
        exam_name: "Mid Term Exam",
        exam_date: "2023-10-15T00:00:00Z",
        analytics_status: "COMPLETED",
      },
      exams: [
        {
          id: exam_id,
          exam_name: "Mid Term Exam",
          exam_date: "2023-10-15T00:00:00Z",
          analytics_status: "COMPLETED",
        },
      ],
      subjects: [
        {
          subject_name: "Mathematics",
          total_marks: 85,
          max_marks: 100,
          percentage: 85,
          exam_rank: 5,
          correct: 35,
          wrong: 10,
          unattempted: 5,
          risk_label: "SAFE",
          performance_label: "ABOVE_AVERAGE",
          z_score: 1.2,
        },
        {
          subject_name: "Science",
          total_marks: 60,
          max_marks: 100,
          percentage: 60,
          exam_rank: 15,
          correct: 25,
          wrong: 15,
          unattempted: 10,
          risk_label: "WATCH",
          performance_label: "AVERAGE",
          z_score: -0.1,
        },
      ],
      overall_risk: "SAFE",
    });
  }
  return apiRequest(
    "GET",
    `/analytics/student/${student_id}/?exam_id=${exam_id}`,
  );
}

export async function getSubjectDrilldown(
  student_id: string,
  subject_id: string,
  exam_id: string,
) {
  if (USE_DUMMY_DATA) {
    return Promise.resolve({
      success: true,
      student: {
        student_id: student_id,
        name: "Dummy Student",
        class_name: "Class 10",
        section_name: "A",
      },
      exam: {
        id: exam_id,
        exam_name: "Mid Term Exam",
        exam_date: "2023-10-15T00:00:00Z",
        analytics_status: "COMPLETED",
      },
      subject_name: subject_id,
      result: {
        subject_name: subject_id,
        total_marks: 85,
        max_marks: 100,
        percentage: 85,
        exam_rank: 5,
        correct: 35,
        wrong: 10,
        unattempted: 5,
        risk_label: "SAFE",
        performance_label: "ABOVE_AVERAGE",
        z_score: 1.2,
      },
      questions: Array.from({ length: 50 }, (_, i) => ({
        q_no: i + 1,
        status: i < 35 ? "C" : i < 45 ? "W" : "U",
      })),
    });
  }
  return apiRequest(
    "GET",
    `/analytics/student/${student_id}/subject/${subject_id}/?exam_id=${exam_id}`,
  );
}

export async function getStudentExamsTimeline(student_id: string) {
  if (USE_DUMMY_DATA) {
    return Promise.resolve({
      success: true,
      student: {
        student_id: student_id,
        student_ref_id: "STU-001",
        name: "Dummy Student",
        class_name: "Class 10",
        section_name: "A",
      },
      exams: [
        {
          id: "exam-1",
          exam_name: "Unit Test 1",
          exam_date: "2023-08-15T00:00:00Z",
          total_marks: 240,
          overall_risk: "SAFE",
          subjects: [
            {
              subject_id: "sub-math",
              subject_name: "Mathematics",
              marks: 80,
              max_marks: 100,
              risk_label: "SAFE",
            },
            {
              subject_id: "sub-sci",
              subject_name: "Science",
              marks: 75,
              max_marks: 100,
              risk_label: "SAFE",
            },
            {
              subject_id: "sub-eng",
              subject_name: "English",
              marks: 85,
              max_marks: 100,
              risk_label: "SAFE",
            },
          ],
        },
        {
          id: "exam-2",
          exam_name: "Mid Term Exam",
          exam_date: "2023-10-15T00:00:00Z",
          total_marks: 255,
          overall_risk: "WATCH",
          subjects: [
            {
              subject_id: "sub-math",
              subject_name: "Mathematics",
              marks: 85,
              max_marks: 100,
              risk_label: "SAFE",
            },
            {
              subject_id: "sub-sci",
              subject_name: "Science",
              marks: 60,
              max_marks: 100,
              risk_label: "WATCH",
            },
            {
              subject_id: "sub-eng",
              subject_name: "English",
              marks: 90,
              max_marks: 100,
              risk_label: "SAFE",
            },
          ],
        },
      ],
    });
  }
  // DEBUG — remove after confirming token + ID are correct
  const token = await storage.getAccessToken();
  console.log("[analyticsApi] getStudentExamsTimeline called");
  console.log("[analyticsApi]   student_id :", student_id);
  console.log("[analyticsApi]   token      :", token ? `${token.slice(0, 20)}...` : "MISSING");
  return apiRequest("GET", `/analytics/student/${student_id}/exams/`);
}
