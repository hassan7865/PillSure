/**
 * Navigate to Find Doctors. Legacy drug-category query params were removed.
 */
const SEARCH_DOCTOR = "/search-doctor";

/** @deprecated Kept for call-site compatibility; always returns `/search-doctor`. */
export function buildConsultDoctorUrl(_ignored?: unknown): string {
  return SEARCH_DOCTOR;
}
