import { apiRequest } from './api';

export interface Subject {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface SubjectsResponse {
  count: number;
  results: Subject[];
}

export const subjectsApi = {
  getAll: () => apiRequest<SubjectsResponse>('GET', '/subjects/'),
};
