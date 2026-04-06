import { or, ilike, SQL, AnyColumn } from "drizzle-orm";
export function buildSearchConditions(
  searchTerm: string | undefined,
  fields: (SQL | AnyColumn)[]
): SQL | undefined {
  if (!searchTerm || !searchTerm.trim()) {
    return undefined;
  }

  const trimmedTerm = `%${searchTerm.trim()}%`;
  const conditions = fields.map((field) => ilike(field, trimmedTerm));
  
  return conditions.length > 0 ? or(...conditions) : undefined;
}
