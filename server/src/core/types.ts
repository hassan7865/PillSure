export enum UserRole {
  PATIENT = 'patient',
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  PHARMACIST = 'pharmacist',
  HOSPITAL = 'hospital',
  MANUFACTURER = 'manufacturer',
  MEDICAL_STORE = 'medical_store',
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

import { Request } from "express";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  idToken: string;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  isGoogle?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
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

// Onboarding Types
export interface PatientOnboardingRequest {
  gender: 'male' | 'female' | 'other';
  mobile: string;
  dateOfBirth: string;
  address: string;
  bloodGroup?: string; // Optional field
  hasCovid?: boolean;
  pastMedicalHistory?: string[];
  surgicalHistory?: string;
  allergies?: string;
}

export interface DoctorOnboardingRequest {
  gender: 'male' | 'female' | 'other';
  mobile: string;
  specializationIds: number[];
  qualifications: string[];
  experienceYears: number;
  address: string;
  image?: string;
  feePkr?: number;
  consultationModes: string[];
  openingTime?: string;
  closingTime?: string;
  availableDays: string[];
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

export interface ManufacturerOnboardingRequest {
  legalName: string;
  shortName?: string;
  addressLine: string;
  city: string;
  province?: string;
  postalCode?: string;
  phone: string;
  licenseNumber: string;
  website?: string;
  email?: string;
}

export interface MedicalStoreOnboardingRequest {
  storeName: string;
  addressLine: string;
  city: string;
  province?: string;
  postalCode?: string;
  phone: string;
  licenseNumber?: string;
  website?: string;
  email?: string;
  openingTime?: string;
  closingTime?: string;
latitude?: number;
  longitude?: number;
}
export interface ManufacturerMedicineImportItem {
  medicineName?: string;
  categoryName?: string;
  wholesalePrice: number | string;
  moq?: number;
  listedQuantity?: number;
  prescriptionRequired?: boolean;
}

export interface ManufacturerMedicinesImportRequest {
  items: ManufacturerMedicineImportItem[];
}

export interface OnboardingResponse {
  success: boolean;
  message: string;
  onboardingStep?: number;
  isOnboardingComplete?: boolean;
}


export interface ApiResponse<T = any> {
  data?: T;
  status: 'success' | 'error';
  error?: string;
  message?: string;
}
