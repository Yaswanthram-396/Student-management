import { apiRequest } from './api';
import type { UploadAsset } from './upload';
import { appendAssetToFormData } from './upload';

export interface AnnouncementAttachment {
  id?: string;
  filename: string;
  url?: string | null;
  content_type?: string;
  file_url?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body?: string;
  author_role?: string;
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
  attachments?: UploadAsset[];
}

export interface UpdateAnnouncementPayload {
  section_id?: string;
  title?: string;
  body?: string;
  publish_now?: boolean;
  attachments?: UploadAsset[];
}

interface AnnouncementsListResponse {
  count: number;
  results: Announcement[];
}

interface DeleteAnnouncementResponse {
  success?: boolean;
  details?: string;
}

async function buildAnnouncementFormData(
  payload: CreateAnnouncementPayload | UpdateAnnouncementPayload,
) {
  const formData = new FormData();
  if (payload.section_id !== undefined) formData.append('section_id', payload.section_id);
  if (payload.title !== undefined) formData.append('title', payload.title);
  if (payload.body !== undefined) formData.append('body', payload.body);
  if (payload.publish_now !== undefined) formData.append('publish_now', String(payload.publish_now));
  for (const asset of payload.attachments ?? []) {
    await appendAssetToFormData(formData, 'attachments', asset, asset.name ?? 'announcement-attachment');
  }
  return formData;
}

function withoutAttachments<T extends CreateAnnouncementPayload | UpdateAnnouncementPayload>(payload: T) {
  const { attachments: _attachments, ...jsonPayload } = payload;
  return jsonPayload;
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

  create: async (payload: CreateAnnouncementPayload) => {
    if (!payload.attachments?.length) {
      return apiRequest<Announcement>('POST', '/teacher/announcements/', withoutAttachments(payload));
    }

    const formData = await buildAnnouncementFormData(payload);
    return apiRequest<Announcement>('POST', '/teacher/announcements/', formData, true);
  },

  update: async (announcementId: string, payload: UpdateAnnouncementPayload) => {
    if (!payload.attachments?.length) {
      return apiRequest<Announcement>(
        'PATCH',
        `/teacher/announcements/${announcementId}/`,
        withoutAttachments(payload),
      );
    }

    const formData = await buildAnnouncementFormData(payload);
    return apiRequest<Announcement>('PATCH', `/teacher/announcements/${announcementId}/`, formData, true);
  },

  delete: (announcementId: string) =>
    apiRequest<DeleteAnnouncementResponse>('DELETE', `/teacher/announcements/${announcementId}/`),
};
