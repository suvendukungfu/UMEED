/**
 * Security utilities for input sanitization and PII protection.
 */

/**
 * Strips potentially malicious HTML script tags or dangerous attributes from user input.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .trim();
}

/**
 * Redacts phone numbers and email addresses to protect vulnerable individuals' PII
 * before transmitting to external analytics or shared agent memory.
 */
export function scrubPII(text: string): string {
  // Redact emails
  const scrubbedEmails = text.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[REDACTED_EMAIL]"
  );
  // Redact Indian 10-digit mobile numbers or international telephone formats
  return scrubbedEmails.replace(
    /(?:\+?91[\s-]?)?[6-9]\d{9}\b/g,
    "[REDACTED_PHONE]"
  );
}

