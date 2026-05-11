import { apiRequest } from './api';

export interface ProfilePicResponse {
  profile_pic_url: string;
}

export const teacherProfileApi = {
  uploadProfilePic: (uri: string, mimeType: string) => {
    const formData = new FormData();
    formData.append('profile_pic', {
      uri,
      type: mimeType || 'image/jpeg',
      name: 'profile_pic.jpg',
    } as any);
    return apiRequest<ProfilePicResponse>(
      'PATCH',
      '/teacher/profile/pic/',
      formData,
      true,
    );
  },
};
