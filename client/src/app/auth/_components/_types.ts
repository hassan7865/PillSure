import { User } from "@/lib/types";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  isGoogle?: boolean;
}

export interface GoogleAuthRequest {
  idToken: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface GoogleLoginRequest {
  idToken: string;
  email: string;
}

export interface AuthResponseData {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isGoogle?: boolean;
    onboardingStep?: number;
    isOnboardingComplete?: boolean;
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signupWithGoogle: (role: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export interface LoginFormProps {
  onSwitchToSignUp: () => void;
}


export interface SignUpProps {
  onSwitchToLogin: () => void;
  role?: string;
}

export interface SignUpFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}
