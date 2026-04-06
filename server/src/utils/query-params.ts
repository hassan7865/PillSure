import { Request } from "express";
import { BadRequestError } from "../middleware/error.handler";
import type { AppError } from "../middleware/error.handler";
export function parsePageLimitQuery(
  req: Request,
  opts: { pageDefault?: number; limitDefault: number },
): { page: number; limit: number } {
  const pageDefault = opts.pageDefault ?? 1;
  const { limitDefault } = opts;
  const rawPage = parseInt(String(req.query.page ?? pageDefault), 10);
  const rawLimit = parseInt(String(req.query.limit ?? limitDefault), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : pageDefault;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : limitDefault;
  return { page, limit };
}

type QueryParseFail = { ok: false; error: AppError };
type QueryParseOk<T> = { ok: true; value: T };

export function parseOptionalIntInRange(
  raw: string | undefined,
  min: number,
  max: number,
  label: string,
): QueryParseOk<number | undefined> | QueryParseFail {
  if (raw === undefined) return { ok: true, value: undefined };
  const parsed = parseInt(String(raw), 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    return {
      ok: false,
      error: BadRequestError(`${label} must be an integer between ${min} and ${max}`),
    };
  }
  return { ok: true, value: parsed };
}

export function parseOptionalPositiveInt(
  raw: string | undefined,
  label: string,
): QueryParseOk<number | undefined> | QueryParseFail {
  if (raw === undefined) return { ok: true, value: undefined };
  const parsed = parseInt(String(raw), 10);
  if (isNaN(parsed) || parsed < 1) {
    return {
      ok: false,
      error: BadRequestError(`${label} must be an integer greater than 0`),
    };
  }
  return { ok: true, value: parsed };
}
export function parseIntInRangeOrDefault(
  raw: string | undefined,
  defaultValue: number,
  min: number,
  max: number,
  label: string,
): QueryParseOk<number> | QueryParseFail {
  if (raw === undefined || raw === "") {
    return { ok: true, value: defaultValue };
  }
  const parsed = parseInt(String(raw), 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    return {
      ok: false,
      error: BadRequestError(`${label} must be between ${min} and ${max}`),
    };
  }
  return { ok: true, value: parsed };
}
