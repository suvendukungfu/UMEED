import { z, ZodSchema } from "zod";
import { ApiError } from "@/lib/errors";

/**
 * Validates request body with a Zod schema or throws a formatted ApiError.
 */
export async function validateRequestBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw ApiError.badRequest("Invalid JSON in request body");
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

/**
 * Validates search params against a Zod schema.
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): T {
  const params: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    params[key] = val;
  });

  const result = schema.safeParse(params);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

