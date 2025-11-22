import { useState, useCallback } from 'react';
import { useAuth as useAuthContext } from '@/contexts/auth-context';
import { LoginRequest, SignUpRequest } from '../_components/_types';
import { authApi } from '../_components/_api';

export const useLogin = () => {
  const { login } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ email, password }: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Login failed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

export const useSignup = () => {
  const { signup } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ email, password, firstName, lastName, role }: SignUpRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await signup(email, password, firstName, lastName, role || 'patient');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Signup failed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signup]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

export const useGoogleLogin = () => {
  const { loginWithGoogle } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Google login failed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loginWithGoogle]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

export const useGoogleSignup = () => {
  const { signupWithGoogle } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ role }: { role: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      await signupWithGoogle(role);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Google signup failed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signupWithGoogle]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

export const useLogout = () => {
  const { logout } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.logout();
      logout();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Logout failed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

export const useRefreshToken = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.refreshToken();
      localStorage.setItem('authToken', data.token);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Token refresh failed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, mutateAsync: mutate, isLoading, error };
};
