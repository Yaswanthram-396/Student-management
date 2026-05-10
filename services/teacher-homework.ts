import { apiRequest } from './api';

export interface HomeworkSubject {
  id: string;
  name: string;
}

export interface Homework {
  id: string;
  section_id: string;
  subject: HomeworkSubject;
  description: string;
  deadline: string;
}

export interface CreateHomeworkPayload {
  section_id: string;
  subject_id: string;
  description: string;
  deadline: string; // ISO 8601
}

interface HomeworkListResponse {
  count: number;
  results: Homework[];
}

export const teacherHomeworkApi = {
  getAll: (params?: { section_id?: string; subject_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.section_id) qs.set('section_id', params.section_id);
    if (params?.subject_id) qs.set('subject_id', params.subject_id);
    const query = qs.toString();
    return apiRequest<HomeworkListResponse>(
      'GET',
      `/teacher/homework/${query ? `?${query}` : ''}`,
    );
  },

  create: (payload: CreateHomeworkPayload) =>
    apiRequest<Homework>('POST', '/teacher/homework/', payload),
};
