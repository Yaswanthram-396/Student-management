import { apiRequest } from './api';
import type { UploadAsset } from './upload';
import { appendAssetToFormData } from './upload';

export interface StudyMaterial {
  id: string;
  section_id: string;
  subject: { id: string; name: string };
  title: string;
  description: string;
  material_date: string;
  file_url: string | null;
  uploaded_by: { id: string; name: string };
}

interface MaterialsListResponse {
  count: number;
  results: StudyMaterial[];
}

export interface CreateMaterialPayload {
  section_id: string;
  subject_id: string;
  title: string;
  description: string;
  material_date: string;
  file: UploadAsset;
}

export const teacherMaterialsApi = {
  getAll: (params?: { section_id?: string; subject_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.section_id) qs.set('section_id', params.section_id);
    if (params?.subject_id) qs.set('subject_id', params.subject_id);
    const query = qs.toString();
    return apiRequest<MaterialsListResponse>(
      'GET',
      `/teacher/study-materials/${query ? `?${query}` : ''}`,
    );
  },

  create: async (payload: CreateMaterialPayload) => {
    const formData = new FormData();
    formData.append('section_id', payload.section_id);
    formData.append('subject_id', payload.subject_id);
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    formData.append('material_date', payload.material_date);
    await appendAssetToFormData(formData, 'file', payload.file, 'material');
    return apiRequest<StudyMaterial>('POST', '/teacher/study-materials/', formData, true);
  },
};
