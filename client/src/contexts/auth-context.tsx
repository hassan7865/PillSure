"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useCustomToast } from '@/hooks/use-custom-toast';
import { getErrorMessage } from '@/lib/error-utils';
import { AuthContextType } from '@/app/auth/_components/_types';
import { User } from '@/lib/types';
import { authApi } from '@/app/auth/_components/_api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to get onboarding path based on role
const getOnboardingPath = (role: string | undefined): string | null => {
  switch (role?.toLowerCase()) {
    case 'patient':
      return '/onboarding/patient';
    case 'doctor':
      return '/onboarding/doctor';
    case 'hospital':
      return '/onboarding/hospital';
    default:
      return null;
  }
};

const getPostOnboardingPath = (role: string | undefined): string => {
  if (typeof window !== 'undefined') {
    const returnUrl = sessionStorage.getItem('returnUrl');
    if (returnUrl) {
      sessionStorage.removeItem('returnUrl');
      return returnUrl;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlReturnPath = urlParams.get('returnUrl');
    if (urlReturnPath) {
      return urlReturnPath;
    }
  }
  
  switch (role?.toLowerCase()) {
    case 'patient':
      return '/';
    case 'doctor':
      return '/dashboard/doctor';
    case 'hospital':
      return '/dashboard/hospital';
    default:
      return '/';
  }
};



const AuthProviderContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showWelcomeBack, showError, showSuccess } = useCustomToast();
  const router = useRouter();


  useEffect(() => {
    // Check for existing token in localStorage
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.login({ email, password });
      
      setToken(response.token);
      setUser(response.user);
      
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Show welcome back toast
      showWelcomeBack(response.user.firstName);
      
      if(!response.user.isOnboardingComplete) {
        const role = response.user.role?.toLowerCase();

        const onboardingPath = getOnboardingPath(role);
        if (onboardingPath) {
          router.push(onboardingPath);
        }
      } else {
        router.push(getPostOnboardingPath(response.user.role));
      }
   
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showError('Login Failed', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string, role: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.signup({ 
        email, 
        password, 
        firstName, 
        lastName, 
        role 
      });
      
      setToken(response.token);
      setUser(response.user);
      
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Show success toast
      showSuccess('Account Created', `Welcome ${response.user.firstName}! Your account has been created successfully.`);
      
      // For new users, always redirect to onboarding
      const onboardingPath = getOnboardingPath(response.user.role);
      if (onboardingPath) {
        router.push(onboardingPath);
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showError('Signup Failed', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const response = await authApi.googleLogin({
        idToken: await user.getIdToken(),
        email: user.email!,
      });
      
      setToken(response.token);
      setUser(response.user);
      
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Show welcome back toast
      showWelcomeBack(response.user.firstName);
      
      // Always redirect to onboarding first, regardless of completion status
      if(!response.user.isOnboardingComplete) {
        const role = response.user.role?.toLowerCase();

        const onboardingPath = getOnboardingPath(role);
        if (onboardingPath) {
          router.push(onboardingPath);
        }
      } else {
        router.push(getPostOnboardingPath(response.user.role));
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showError('Google Login Failed', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signupWithGoogle = async (role: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Split the display name into first and last name
      const nameParts = (user.displayName || user.email!).split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const response = await authApi.googleSignup({
        idToken: await user.getIdToken(),
        email: user.email!,
        firstName: firstName,
        lastName: lastName,
        role: role,
      });
      
      setToken(response.token);
      setUser(response.user);
      
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Show success toast
      showSuccess('Account Created', `Welcome ${response.user.firstName}! Your account has been created successfully.`);
      
      // For new users, always redirect to onboarding
      const onboardingPath = getOnboardingPath(response.user.role);
      if (onboardingPath) {
        router.push(onboardingPath);
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showError('Google Signup Failed', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      // Call logout API
      await authApi.logout();
      
      // Clear local state
      setUser(null);
      setToken(null);
      
      // Clear localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } catch (err: any) {
      console.error('Logout error:', err);
      // Still clear local state even if API call fails
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    loginWithGoogle,
    signupWithGoogle,
    logout,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProviderContent>{children}</AuthProviderContent>;
};
