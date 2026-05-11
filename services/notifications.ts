import { apiRequest } from './api';

export type NotificationType =
  | 'ANNOUNCEMENT_PUBLISHED'
  | 'HOMEWORK_ASSIGNED'
  | 'STUDY_MATERIAL_UPLOADED'
  | 'ATTENDANCE_ABSENT'
  | 'PARENT_QUERY_RECEIVED'
  | 'QUERY_REPLY_RECEIVED'
  | 'CALENDAR_EVENT_CREATED'
  | 'BULK_UPLOAD_COMPLETE';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  count: number;
  unread_count: number;
  results: AppNotification[];
}

interface UnreadCountResponse {
  count: number;
}

interface MarkReadResponse {
  marked_read: number;
}

export const notificationsApi = {
  getAll: (unreadOnly = false) =>
    apiRequest<NotificationsResponse>(
      'GET',
      `/notifications/${unreadOnly ? '?unread=true' : ''}`,
    ),

  getUnreadCount: () =>
    apiRequest<UnreadCountResponse>('GET', '/notifications/unread-count/'),

  markRead: (ids?: string[]) =>
    apiRequest<MarkReadResponse>('POST', '/notifications/read/', ids?.length ? { ids } : {}),
};
