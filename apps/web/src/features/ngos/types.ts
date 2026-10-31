import {
  NGODocument,
  SanitizedPublicNGO,
  VerificationStatus,
  AvailabilityStatus,
  CapacityStatus,
  OrganisationType,
} from "@umeed/contracts";
import { IncidentType, IncidentSubjectType } from "@umeed/contracts";

export type {
  NGODocument,
  SanitizedPublicNGO,
  VerificationStatus,
  AvailabilityStatus,
  CapacityStatus,
  OrganisationType,
};

export interface NGOFilterOptions {
  service_category?: IncidentType;
  supported_subject_type?: IncidentSubjectType;
  operational_district?: string;
  verification_status?: VerificationStatus;
  availability_status?: AvailabilityStatus;
  capacity_status?: CapacityStatus;
  accepting_assignments?: boolean;
  search_query?: string;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
}

export interface NGOCsvRow {
  organisation_name: string;
  alternate_names?: string;
  registration_number?: string;
  registration_authority?: string;
  registration_date?: string;
  organisation_type?: string;
  service_categories: string; // Comma or semicolon-separated
  supported_subject_types: string; // Comma-separated (person, animal)
  assistance_capabilities?: string;
  specialised_services?: string;
  operational_districts: string; // Comma-separated
  address?: string;
  district?: string;
  latitude?: string;
  longitude?: string;
  service_radius_km?: string;
  availability_status?: string;
  capacity_status?: string;
  operating_hours?: string;
  phone?: string;
  email?: string;
  emergency_phone?: string;
  coordinator_name?: string;
  verification_status?: string;
  verification_source?: string;
  max_concurrent_cases?: string;
}

export interface ImportErrorDetail {
  row: number;
  organisation_name?: string;
  field?: string;
  error: string;
}

export interface ImportValidationReport {
  total_rows: number;
  valid_rows: number;
  imported_count: number;
  skipped_duplicates_count: number;
  error_count: number;
  errors: ImportErrorDetail[];
  duplicates: Array<{
    row: number;
    organisation_name: string;
    existing_ngo_id: string;
    match_reason: string;
  }>;
  created_ngo_ids: string[];
}
