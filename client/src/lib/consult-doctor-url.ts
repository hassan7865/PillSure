/**
 * Navigate to Find Doctors with the same drug-category → specialization filter as RAG uses server-side.
 */
const SEARCH_DOCTOR = "/search-doctor";

export type ConsultDoctorMedicineCategory = {
  drugCategoryId?: number | null;
  drugCategory?: string | null;
};

/** Prefer `drugCategoryId` when present (stable); fall back to category name. */
export function buildConsultDoctorUrl(
  medicineOrCategory?: ConsultDoctorMedicineCategory | string | null
): string {
  if (medicineOrCategory == null) {
    return SEARCH_DOCTOR;
  }
  if (typeof medicineOrCategory === "string") {
    const name = medicineOrCategory.trim();
    if (!name) return SEARCH_DOCTOR;
    return `${SEARCH_DOCTOR}?drugCategory=${encodeURIComponent(name)}`;
  }
  const id = medicineOrCategory.drugCategoryId;
  if (id != null && id > 0) {
    return `${SEARCH_DOCTOR}?drugCategoryId=${id}`;
  }
  const name = medicineOrCategory.drugCategory?.trim();
  if (!name) return SEARCH_DOCTOR;
  return `${SEARCH_DOCTOR}?drugCategory=${encodeURIComponent(name)}`;
}
