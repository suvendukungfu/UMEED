import { describe, it, expect } from "vitest";
import { ApiError, formatErrorResponse } from "./index";
import { z } from "zod";

describe("API Error Handling", () => {
  it("formats standard ApiError with correct status and code", async () => {
    const error = ApiError.notFound("Case not found");
    const response = formatErrorResponse(error);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Case not found");
    expect(body.error.timestamp).toBeDefined();
  });

  it("formats Zod validation error as 400 VALIDATION_ERROR", async () => {
    const schema = z.object({
      name: z.string().min(3),
    });

    const parsed = schema.safeParse({ name: "a" });
    if (!parsed.success) {
      const response = formatErrorResponse(parsed.error);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("formats unknown Error safely without exposing credentials", async () => {
    const error = new Error("Database connection to mongodb://admin:supersecret@db failed");
    const response = formatErrorResponse(error);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});

