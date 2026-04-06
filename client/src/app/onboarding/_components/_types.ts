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
    latitude: number;
    longitude: number;
  }



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
    specializationIds: number[];
    qualifications: string[];
    experienceYears: number;
    address: string;
    image?: File;
    feePkr?: number;
    consultationModes: string[];
    openingTime?: string;
    closingTime?: string;
    availableDays: string[];
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

  export interface ManufacturerFormValues {
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

  export interface MedicalStoreFormValues {
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
    latitude: string;
    longitude: string;
  }
  