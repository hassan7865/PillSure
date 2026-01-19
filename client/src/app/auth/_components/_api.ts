import api from '@/lib/interceptor';
import { AuthResponseData, GoogleAuthRequest, GoogleLoginRequest, LoginRequest, SignUpRequest } from './_types';
import { extractApiData } from '@/lib/api-utils';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponseData> => {
    const response = await api.post('/auth/login', data);
    return extractApiData(response);
  },

  signup: async (data: SignUpRequest): Promise<AuthResponseData> => {
    const response = await api.post('/auth/register', data);
    return extractApiData(response);
  },

  googleLogin: async (data: GoogleLoginRequest): Promise<AuthResponseData> => {
    const response = await api.post('/auth/google-login', data);
    return extractApiData(response);
  },

  googleSignup: async (data: GoogleAuthRequest): Promise<AuthResponseData> => {
    const response = await api.post('/auth/register', {
      email: data.email,
      password: '', // Empty password for Google users
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isGoogle: true,
    });
    return extractApiData(response);
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  refreshToken: async (): Promise<{ token: string }> => {
    const response = await api.post('/auth/refresh');
    return extractApiData(response);
  },
};

export default api;