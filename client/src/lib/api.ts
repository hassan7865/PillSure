import api from './interceptor';
import { LoginRequest, SignUpRequest, GoogleAuthRequest, GoogleLoginRequest, AuthResponse } from './types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  signup: async (data: SignUpRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  googleLogin: async (data: GoogleLoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/google-login', data);
    return response.data;
  },

  googleSignup: async (data: GoogleAuthRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', {
      email: data.email,
      password: '', // Empty password for Google users
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isGoogle: true,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  refreshToken: async (): Promise<{ token: string }> => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
};

export default api;