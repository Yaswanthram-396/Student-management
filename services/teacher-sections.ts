import { apiRequest } from './api';

export interface TeacherSection {
  id: string;
  class_id: string;
  class_name: string;
  section_name: string;
  is_class_teacher: boolean;
  student_count: number;
}

interface TeacherSectionApiItem {
  id: string;
  class_id?: string;
  class_name?: string;
  section_name?: string;
  name?: string;
  academic_class?: {
    id: string;
    name: string;
  };
  is_class_teacher: boolean;
  student_count: number;
}

interface RawSectionsResponse {
  count: number;
  results: TeacherSectionApiItem[];
}

interface SectionsResponse {
  count: number;
  results: TeacherSection[];
}

// Used by attendance screen (simpler shape, legacy endpoint)
export interface SectionStudent {
  id: string;
  name: string;
  roll_number: string;
  admission_number: string;
}

interface SectionStudentsResponse {
  count: number;
  results: SectionStudent[];
}

// Richer student shape returned by GET /api/v1/sections/{id}/students/
export interface SectionStudentDetail {
  id: string;
  user_id: string;
  name: string;
  roll_number: string;
  admission_number: string;
  academic_class: { id: string; name: string };
  section: { id: string; name: string };
}

interface SectionStudentDetailResponse {
  count: number;
  results: SectionStudentDetail[];
}

export const teacherSectionsApi = {
  getSections: async (): Promise<SectionsResponse> => {
    const data = await apiRequest<RawSectionsResponse>('GET', '/teacher/sections/');

    return {
      count: data.count,
      results: data.results.map((section) => ({
        id: section.id,
        class_id: section.class_id ?? section.academic_class?.id ?? '',
        class_name: section.class_name ?? section.academic_class?.name ?? '',
        section_name: section.section_name ?? section.name ?? '',
        is_class_teacher: section.is_class_teacher,
        student_count: section.student_count,
      })),
    };
  },
  // Used by attendance
  getStudents: (sectionId: string) =>
    apiRequest<SectionStudentsResponse>('GET', `/teacher/sections/${sectionId}/students/`),
  // Richer list used by the students roster screen
  getSectionStudentDetails: (sectionId: string) =>
    apiRequest<SectionStudentDetailResponse>('GET', `/sections/${sectionId}/students/`),
};
