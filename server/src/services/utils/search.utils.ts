/**
 * Utility functions for search/filter operations
 */
import { or, ilike, SQL, AnyColumn } from "drizzle-orm";

/**
 * Build search conditions for text fields
 * @param searchTerm - Search term to match
 * @param fields - Array of SQL expressions or columns to search in
 * @returns SQL condition or undefined if searchTerm is empty
 */
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
