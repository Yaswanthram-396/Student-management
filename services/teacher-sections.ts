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
  getStudents: (sectionId: string) =>
    apiRequest<SectionStudentsResponse>('GET', `/teacher/sections/${sectionId}/students/`),
};
