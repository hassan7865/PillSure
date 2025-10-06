import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth as useAuthContext } from '@/contexts/auth-context';
import { LoginRequest, SignUpRequest } from '../_components/_types';
import { authApi } from '../_components/_api';

export const useLogin = () => {
  const { login } = useAuthContext();
  
  return useMutation({
    mutationFn: ({ email, password }: LoginRequest) =>
      login(email, password),
  });
};

export const useSignup = () => {
  const { signup } = useAuthContext();
  
  return useMutation({
    mutationFn: ({ email, password, firstName, lastName, role }: SignUpRequest) =>
      signup(email, password, firstName, lastName, role || 'patient'),
  });
};

export const useGoogleLogin = () => {
  const { loginWithGoogle } = useAuthContext();
  
  return useMutation({
    mutationFn: () => loginWithGoogle(),
  });
};

export const useGoogleSignup = () => {
  const { signupWithGoogle } = useAuthContext();
  
  return useMutation({
    mutationFn: ({ role }: { role: string }) => signupWithGoogle(role),
  });
};

export const useLogout = () => {
  const { logout } = useAuthContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
      logout();
    },
  });
};

export const useRefreshToken = () => {
  return useMutation({
    mutationFn: () => authApi.refreshToken(),
    onSuccess: (data) => {
      localStorage.setItem('authToken', data.token);
    },
  });
};
