import { apiRequest } from './api';

export interface SchoolConfiguration {
  attendance_frequency: 'ONCE' | 'TWICE';
  whatsapp_absent_automation_enabled: boolean;
  parent_query_enabled: boolean;
}

export interface SchoolDetails {
  id: string;
  name: string;
  subdomain: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  configuration: SchoolConfiguration;
}

export const schoolApi = {
  getSchool: () => apiRequest<SchoolDetails>('GET', '/school/'),
};
