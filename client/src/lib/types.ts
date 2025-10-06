// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

// API Request/Response Types


// Standardized API Response Type
export interface ApiResponse<T = any> {
  data?: T;
  status: 'success' | 'error';
  error?: string;
  message?: string;
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


// =============================================================================
// ONBOARDING TYPES
// =============================================================================



export interface OnboardingResponseData {
  onboardingStep: number;
  isOnboardingComplete: boolean;
}

// =============================================================================
// FORM TYPES
// =============================================================================

// Auth Form Types


// Onboarding Form Types

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