export interface DataProvenance {
  sourceName: string;
  sourceUrl: string;
  sourceType:
    | "OFFICIAL_GOVERNMENT"
    | "ORGANIZATION_OFFICIAL"
    | "AUTHORIZED_DIRECTORY"
    | "OTHER_PUBLIC_SOURCE";
  retrievedAt: string; // ISO 8601
  lastReviewedAt?: string;
  verificationMethod: string;
  reviewerId?: string;
  evidenceReference?: string;
  conflictNotes?: string;
}

export type EntityKind = "LEGAL_ORGANIZATION" | "GOVERNMENT_AGENCY";

export type FacilityType =
  | "VETERINARY_HOSPITAL"
  | "ANIMAL_SHELTER"
  | "NIGHT_SHELTER"
  | "TRAUMA_CENTRE"
  | "FEEDING_CENTRE"
  | "REFERRAL_DESTINATION";

export type ProviderRelationshipType =
  | "OPERATED_BY"
  | "MANAGED_BY"
  | "FUNDED_BY"
  | "GOVERNMENT_CONTROLLED"
  | "REFERRAL_DESTINATION"
  | "INDEPENDENTLY_OPERATED";

export type OperationalVerificationState =
  | "DISCOVERED"
  | "SOURCE_VERIFIED"
  | "CONTACT_VERIFIED"
  | "PARTNER_APPLIED"
  | "UNDER_REVIEW"
  | "PARTNER_ONBOARDED"
  | "CAPACITY_CONFIRMED"
  | "NEEDS_REVIEW"
  | "SUSPENDED"
  | "REJECTED"
  | "STALE";

export interface GeospatialLocation {
  address: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  geo: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  coordinateSource: "GPS_DIRECT" | "GEOCODED_STREET" | "OFFICIAL_GAZETTE" | "PIN_CENTROID_APPROX";
  geocodingMethod: string;
  retrievalTimestamp: string;
  accuracyMetres?: number;
  isApproximate: boolean;
  isEntranceVerified: boolean;
  humanVerificationStatus: "VERIFIED" | "UNVERIFIED" | "FLAGGED_INACCURATE";
}

/**
 * Normalized Domain Entity: Organization (Legal or Operational Entity)
 */
export interface OrganizationEntity {
  id: string; // e.g. org_friendicoes_seca
  legalName: string;
  commonName: string;
  kind: EntityKind;
  registrationNumber?: string | null;
  registrationAuthority?: string | null;
  registrationDate?: string | null;
  darpanId?: string | null;
  officialWebsite?: string | null;
  publicContact: {
    email?: string | null;
    phone?: string | null;
    emergencyPhone?: string | null;
    address?: string | null;
  };
  verificationState: OperationalVerificationState;
  provenance: DataProvenance;
  isUmeedPartner: boolean; // MUST be explicitly onboarded, never assumed from public data
  partnerOnboardedAt?: string | null;
  partnerTermsAcceptedVersion?: string | null;
  authorizedRepresentativeId?: string | null;
  supportedCategories: string[];
  operationalDistricts: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Normalized Domain Entity: Service Facility (Physical place of service/handoff)
 */
export interface ServiceFacilityEntity {
  id: string; // e.g. fac_delhi_defence_colony_shelter
  facilityName: string;
  facilityType: FacilityType;
  location: GeospatialLocation;
  capacity: {
    totalUnits: number;
    unitType: "BEDS" | "ANIMAL_KENNELS" | "ICU_SLOTS" | "MEALS_PER_DAY";
    confirmedCapacity?: number;
    lastConfirmedAt?: string;
  };
  operatingHours: string;
  emergencyAccess24x7: boolean;
  phone?: string | null;
  provenance: DataProvenance;
  verificationState: OperationalVerificationState;
  isReferralDestinationOnly: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Provider Relationship Entity linking Organization and Facility
 */
export interface ProviderFacilityRelationship {
  relationshipId: string;
  organizationId: string;
  facilityId: string;
  relationshipType: ProviderRelationshipType;
  verifiedAt: string;
  verifierRole: string;
  contractReference?: string | null;
  active: boolean;
}

