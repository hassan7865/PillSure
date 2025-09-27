// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

// API Request/Response Types
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

export interface AuthResponse {
  success: boolean;
  message: string;
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

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isGoogle?: boolean;
  onboardingStep?: number;
  isOnboardingComplete?: boolean;
}

//  Doctor Types
export type Doctor = {
  id: number;
  name: string;
  specialization: string;
  experience: number;
  fee: number;
  rating: number;
  image: string;
};


// Auth Context Types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string, role: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signupWithGoogle: (role: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// =============================================================================
// ONBOARDING TYPES
// =============================================================================

export interface PatientOnboardingRequest {
  gender: 'male' | 'female' | 'other';
  mobile: string;
  dateOfBirth: string;
  address: string;
  bloodGroup: string;
  hasCovid?: boolean;
  pastMedicalHistory?: string[];
  surgicalHistory?: string;
  allergies?: string;
}

export interface DoctorOnboardingRequest {
  gender: 'male' | 'female' | 'other';
  mobile: string;
  specializationIds: string[];
  qualifications: string[];
  experienceYears: number;
  address: string;
  image?: string;
  feePkr?: number;
  consultationModes: string[];
}

export interface HospitalOnboardingRequest {
  hospitalName: string;
  hospitalAddress: string;
  hospitalContactNo: string;
  hospitalEmail: string;
  websiteHospital?: string;
  licenseNo: string;
  adminName: string;
}

export interface OnboardingResponse {
  success: boolean;
  message: string;
  onboardingStep?: number;
  isOnboardingComplete?: boolean;
}

export interface OnboardingStatus {
  onboardingStep: number;
  isOnboardingComplete: boolean;
}

// =============================================================================
// FORM TYPES
// =============================================================================

// Auth Form Types
export interface SignUpFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  onSwitchToSignUp: () => void;
}

// Onboarding Form Types
export interface PatientFormValues {
  gender: 'male' | 'female' | 'other';
  mobile: string;
  dateOfBirth: string;
  address: string;
  bloodGroup: string;
  hasCovid?: boolean;
  pastMedicalHistory?: string[];
  surgicalHistory?: string;
  allergies?: string;
}

export interface DoctorFormValues {
  gender: 'male' | 'female' | 'other';
  mobile: string;
  specializationIds: string[];
  qualifications: string[];
  experienceYears: number;
  address: string;
  image?: File;
  feePkr?: number;
  consultationModes: string[];
}

export interface HospitalFormValues {
  hospitalName: string;
  hospitalAddress: string;
  hospitalContactNo: string;
  hospitalEmail: string;
  websiteHospital?: string;
  licenseNo: string;
  adminName: string;
}

// =============================================================================
// PRODUCT & UI TYPES
// =============================================================================

export interface Product {
  imageUrl: string;
  name: string;
  priceRange?: string;
  originalPrice?: number;
  currentPrice?: number;
  features?: string[];
  onSale?: boolean;
  discount?: number;
  rating?: number;
  reviews?: number;
  isInStock?: boolean;
  category?: string;
  description?: string;
}

export interface DealProduct {
  imageUrl: string;
  name: string;
  priceRange: string;
  features: string[];
  onSale?: boolean;
}

export interface SpecialOffer {
  fromPrice: string;
  title: string;
  description: string;
  imageUrl: string;
  textColor: string; // Tailwind text color (e.g. "text-white")
  buttonColor: string; // Tailwind bg color (e.g. "bg-blue-900")
}

export interface CategoryCardProps {
  title: string;
  imageSrc: string;
  subCategories: string[];
}

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================

export interface SignUpProps {
  onSwitchToLogin: () => void;
  role?: string;
}