import { apiRequest } from './api';

export interface AnnouncementAttachment {
  id: string;
  filename: string;
  content_type: string;
  file_url: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author_role: string;
  audience: string;
  section_id?: string;
  published_at: string | null;
  attachments: AnnouncementAttachment[];
}

export interface GetAnnouncementsParams {
  audience?: 'SCHOOL' | 'CLASS' | 'SECTION';
  published_after?: string;
}

export interface CreateAnnouncementPayload {
  section_id: string;
  title: string;
  body: string;
  publish_now?: boolean;
}

interface AnnouncementsListResponse {
  count: number;
  results: Announcement[];
}

export const teacherAnnouncementsApi = {
  getAll: (params?: GetAnnouncementsParams) => {
    const qs = new URLSearchParams();
    if (params?.audience) qs.set('audience', params.audience);
    if (params?.published_after) qs.set('published_after', params.published_after);
    const query = qs.toString();
    return apiRequest<AnnouncementsListResponse>(
      'GET',
      `/announcements/${query ? `?${query}` : ''}`,
    );
  },

  create: (payload: CreateAnnouncementPayload) =>
    apiRequest<Announcement>('POST', '/teacher/announcements/', payload),
};
