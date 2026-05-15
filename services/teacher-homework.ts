import { apiRequest } from './api';
import type { UploadAsset } from './upload';
import { appendAssetToFormData } from './upload';

export interface HomeworkSubject {
  id: string;
  name: string;
}

export interface HomeworkAttachment {
  url: string;
  filename: string;
}

export interface Homework {
  id: string;
  section_id: string;
  subject: HomeworkSubject;
  description: string;
  deadline: string;
  attachments?: HomeworkAttachment[];
}

export interface CreateHomeworkPayload {
  section_id: string;
  subject_id: string;
  description: string;
  deadline: string; // ISO 8601
  files?: UploadAsset[];
}

interface HomeworkListResponse {
  count: number;
  results: Homework[];
}

export const teacherHomeworkApi = {
  getAll: (params?: { section_id?: string; subject_id?: string; deadline_from?: string; deadline_to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.section_id) qs.set('section_id', params.section_id);
    if (params?.subject_id) qs.set('subject_id', params.subject_id);
    if (params?.deadline_from) qs.set('deadline_from', params.deadline_from);
    if (params?.deadline_to) qs.set('deadline_to', params.deadline_to);
    const query = qs.toString();
    return apiRequest<HomeworkListResponse>(
      'GET',
      `/teacher/homework/${query ? `?${query}` : ''}`,
    );
  },

  create: async (payload: CreateHomeworkPayload) => {
    if (!payload.files?.length) {
      const { files: _files, ...jsonPayload } = payload;
      return apiRequest<Homework>('POST', '/teacher/homework/', jsonPayload);
    }

    const formData = new FormData();
    formData.append('section_id', payload.section_id);
    formData.append('subject_id', payload.subject_id);
    formData.append('description', payload.description);
    formData.append('deadline', payload.deadline);
    for (const file of payload.files) {
      await appendAssetToFormData(formData, 'files', file, file.name ?? 'homework-attachment');
    }

    return apiRequest<Homework>('POST', '/teacher/homework/', formData, true);
  },
};
