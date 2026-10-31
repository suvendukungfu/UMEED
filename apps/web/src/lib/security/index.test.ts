import { describe, it, expect } from "vitest";
import { sanitizeString, scrubPII } from "./index";

describe("Security & Privacy Utilities", () => {
  it("strips script tags and inline event handlers from user text", () => {
    const raw = "Help needed <script>alert('xss')</script> at gate <img src=x onerror='alert(1)'>";
    const sanitized = sanitizeString(raw);
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("onerror");
  });

  it("redacts email addresses and telephone numbers from beneficiary text", () => {
    const raw = "Contact helper Ramesh at ramesh@example.org or call +91 9876543210 immediately";
    const scrubbed = scrubPII(raw);
    expect(scrubbed).toContain("[REDACTED_EMAIL]");
    expect(scrubbed).toContain("[REDACTED_PHONE]");
    expect(scrubbed).not.toContain("ramesh@example.org");
    expect(scrubbed).not.toContain("9876543210");
  });
});

