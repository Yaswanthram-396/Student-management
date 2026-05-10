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
  audience: string;
  section_id: string;
  published_at: string | null;
  attachments: AnnouncementAttachment[];
}

export interface CreateAnnouncementPayload {
  section_id: string;
  title: string;
  body: string;
  publish_now?: boolean;
}

export const teacherAnnouncementsApi = {
  create: (payload: CreateAnnouncementPayload) =>
    apiRequest<Announcement>('POST', '/teacher/announcements/', payload),
};
