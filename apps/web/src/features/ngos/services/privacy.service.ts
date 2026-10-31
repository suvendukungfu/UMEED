import { NGODocument, SanitizedPublicNGO } from "../types";

/**
 * Sanitizes an NGO document for public directory listings.
 * Enforces privacy boundaries:
 * 1. Omit direct phone numbers, emergency numbers, and coordinator personal names.
 * 2. Omit internal verification audit evidence, examiner notes, and staff IDs.
 * 3. Preserve public service capabilities, operational districts, and verification badge.
 */
export function sanitizeNGOForPublic(ngo: NGODocument): SanitizedPublicNGO {
  const { contact: _contact, verification_evidence: _evidence, ...safeDoc } = ngo;

  const hasPublicContact = Boolean(ngo.contact && (ngo.contact.email || ngo.contact.phone));

  return {
    ...safeDoc,
    public_contact_available: hasPublicContact,
    verification_badge: ngo.verification_status,
  };
}

/**
 * Returns full NGO operational record for authorized coordinator inspection.
 */
export function sanitizeNGOForCoordinator(ngo: NGODocument): NGODocument {
  return ngo;
}
