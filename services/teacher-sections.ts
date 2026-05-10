import { apiRequest } from './api';

export interface TeacherSection {
  id: string;
  class_name: string;
  section_name: string;
  is_class_teacher: boolean;
  student_count: number;
}

interface SectionsResponse {
  count: number;
  results: TeacherSection[];
}

export const teacherSectionsApi = {
  getSections: () => apiRequest<SectionsResponse>('GET', '/teacher/sections/'),
};
