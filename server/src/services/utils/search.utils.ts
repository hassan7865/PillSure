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

/**
 * Build case-insensitive search conditions for multiple string fields
 * @param searchTerm - Search term to match
 * @param fieldExpressions - Array of SQL expressions (can include CONCAT expressions)
 * @returns SQL condition or undefined if searchTerm is empty
 */
export function buildCaseInsensitiveSearch(
  searchTerm: string | undefined,
  fieldExpressions: SQL[]
): SQL | undefined {
  if (!searchTerm || !searchTerm.trim()) {
    return undefined;
  }

  const trimmedTerm = `%${searchTerm.trim()}%`;
  const conditions = fieldExpressions.map((field) => 
    sql`LOWER(${field}) LIKE LOWER(${trimmedTerm})`
  );
  
  return conditions.length > 0 ? or(...conditions) : undefined;
}
