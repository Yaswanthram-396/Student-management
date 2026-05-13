import { apiRequest } from './api';

export type QueryStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

export interface QueryPerson {
  id: string;
  name: string;
}

export interface ParentQuery {
  id: string;
  subject: string;
  message: string;
  status: QueryStatus;
  parent: QueryPerson;
  student: QueryPerson;
  section_id: string;
  created_at: string;
}

export interface QueryReplyItem {
  id: string;
  sender_id: string;
  sender_role: 'TEACHER' | 'PARENT' | 'ADMIN';
  message: string;
  created_at: string;
}

export interface QueryDetail extends ParentQuery {
  assigned_teacher: QueryPerson;
  replies: QueryReplyItem[];
}

export interface QueryReplyResponse {
  id: string;
  query_id: string;
  sender_id: string;
  message: string;
  query_status: QueryStatus;
  created_at: string;
}

interface QueriesListResponse {
  count: number;
  results: ParentQuery[];
}

export const teacherQueriesApi = {
  getAll: (params?: { status?: QueryStatus; section_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.section_id) qs.set('section_id', params.section_id);
    const query = qs.toString();
    return apiRequest<QueriesListResponse>(
      'GET',
      `/teacher/parent-queries/${query ? `?${query}` : ''}`,
    );
  },

  getDetail: (queryId: string) =>
    apiRequest<QueryDetail>('GET', `/teacher/parent-queries/${queryId}/`),

  reply: (queryId: string, message: string, markAnswered = false) =>
    apiRequest<QueryReplyResponse>('POST', `/teacher/parent-queries/${queryId}/replies/`, {
      message,
      mark_answered: markAnswered,
    }),

  close: (queryId: string) =>
    apiRequest<{ id: string; status: QueryStatus }>(
      'POST',
      `/teacher/parent-queries/${queryId}/close/`,
    ),
};
