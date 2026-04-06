export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationResult {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
export function normalizePage(page: unknown, defaultPage = 1): number {
  if (page === undefined || page === null) return defaultPage;
  const n = typeof page === "number" ? page : Number(page);
  if (!Number.isFinite(n)) return defaultPage;
  return Math.max(1, Math.floor(n));
}
export function normalizeLimit(
  limit: unknown,
  opts: { defaultLimit: number; max: number; min?: number },
): number {
  const min = opts.min ?? 1;
  const { max, defaultLimit } = opts;
  const fallback = Math.min(max, Math.max(min, defaultLimit));
  if (limit === undefined || limit === null) return fallback;
  const n = typeof limit === "number" ? limit : Number(limit);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
