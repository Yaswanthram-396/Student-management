import { apiRequest } from './api';

export type CalendarEventType = 'HOLIDAY' | 'EXAM' | 'EVENT';

export interface CalendarEvent {
  id: string;
  title: string;
  event_type: CalendarEventType;
  start_date: string;
  end_date: string;
  description: string;
  visible_to: string[];
}

interface CalendarEventsResponse {
  count: number;
  results: CalendarEvent[];
}

export const calendarApi = {
  getEvents: (params?: {
    event_type?: CalendarEventType;
    start_date?: string;
    end_date?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.event_type) qs.set('event_type', params.event_type);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const query = qs.toString();
    return apiRequest<CalendarEventsResponse>(
      'GET',
      `/calendar-events/${query ? `?${query}` : ''}`,
    );
  },
};
