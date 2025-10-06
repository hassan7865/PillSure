import api from '@/lib/interceptor';
import { AuthResponseData, GoogleAuthRequest, GoogleLoginRequest, LoginRequest, SignUpRequest } from './_types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponseData> => {
    const response = await api.post('/auth/login', data);
    return response.data.data;
  },

  signup: async (data: SignUpRequest): Promise<AuthResponseData> => {
    const response = await api.post('/auth/register', data);
    return response.data.data;
  },

  googleLogin: async (data: GoogleLoginRequest): Promise<AuthResponseData> => {
    const response = await api.post('/auth/google-login', data);
    return response.data.data;
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
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  refreshToken: async (): Promise<{ token: string }> => {
    const response = await api.post('/auth/refresh');
    return response.data.data;
  },
};

export default api;