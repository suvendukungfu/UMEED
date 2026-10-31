import { INGORepository } from "../repositories";
import { NGODocument } from "../types";

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  match_type?: "REGISTRATION_NUMBER" | "NAME_AND_DISTRICT";
  existing_ngo_id?: string;
  reason?: string;
}

/**
 * Normalizes an organization name for fuzzy duplicate comparison.
 * Strips common legal suffixes (Trust, Society, NGO, Foundation, etc.) and punctuation.
 */
export function normalizeOrganisationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(trust|society|foundation|samiti|ngo|association|welfare|delhi|india|regd|ltd)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Evaluates whether a candidate NGO matches an already registered organisation.
 */
export async function detectDuplicateNGO(
  candidate: {
    organisation_name: string;
    registration_number?: string | null;
    operational_districts: string[];
  },
  repo: INGORepository
): Promise<DuplicateCheckResult> {
  // 1. Check exact Registration Number (NGO-DARPAN / Trust Registration)
  if (candidate.registration_number && candidate.registration_number.trim()) {
    const existingByReg = await repo.findByRegistrationNumber(candidate.registration_number);
    if (existingByReg) {
      return {
        is_duplicate: true,
        match_type: "REGISTRATION_NUMBER",
        existing_ngo_id: existingByReg.ngo_id,
        reason: `Existing organisation '${existingByReg.organisation_name}' matches registration number '${candidate.registration_number}'.`,
      };
    }
  }

  // 2. Check Name + District overlap
  const normCandidate = normalizeOrganisationName(candidate.organisation_name);
  if (!normCandidate) {
    return { is_duplicate: false };
  }

  const { ngos } = await repo.list({ limit: 500 });
  for (const existing of ngos) {
    const normExisting = normalizeOrganisationName(existing.organisation_name);
    const normAlternates = existing.alternate_names.map(normalizeOrganisationName);

    const nameMatches =
      normCandidate === normExisting ||
      normAlternates.includes(normCandidate) ||
      (normCandidate.length > 5 &&
        normExisting.length > 5 &&
        (normCandidate.includes(normExisting) || normExisting.includes(normCandidate)));

    if (nameMatches) {
      // Check district overlap
      const hasDistrictOverlap = candidate.operational_districts.some((d) =>
        existing.operational_districts.some((ed) => ed.toLowerCase() === d.toLowerCase())
      );
      if (hasDistrictOverlap) {
        return {
          is_duplicate: true,
          match_type: "NAME_AND_DISTRICT",
          existing_ngo_id: existing.ngo_id,
          reason: `Organisation '${existing.organisation_name}' is already registered in an overlapping operational district.`,
        };
      }
    }
  }

  return { is_duplicate: false };
}
