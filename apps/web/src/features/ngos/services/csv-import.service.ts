import crypto from "crypto";
import {
  IncidentType,
  IncidentSubjectType,
  IncidentTypeSchema,
  IncidentSubjectTypeSchema,
  NGODocument,
  VerificationStatus,
} from "@umeed/contracts";
import { INGORepository } from "../repositories";
import { ImportValidationReport, ImportErrorDetail } from "../types";
import { detectDuplicateNGO, normalizeOrganisationName } from "./duplicate.service";

/**
 * Robust RFC 4180-compliant CSV line parser.
 */
export function parseCsvRows(csvContent: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // Skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * CSV Import Service for NGO Intelligence Registry.
 */
export class NGOImportService {
  private repo: INGORepository;

  constructor(repo: INGORepository) {
    this.repo = repo;
  }

  async importFromCsv(
    csvContent: string,
    options: {
      sourceReference?: string;
      isDemoOnly?: boolean;
    } = {}
  ): Promise<ImportValidationReport> {
    const rawRows = parseCsvRows(csvContent);
    if (rawRows.length < 2) {
      return {
        total_rows: 0,
        valid_rows: 0,
        imported_count: 0,
        skipped_duplicates_count: 0,
        error_count: 1,
        errors: [{ row: 1, error: "CSV file must contain a header row and at least one data row" }],
        duplicates: [],
        created_ngo_ids: [],
      };
    }

    const headers = rawRows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, "_").trim());
    const dataRows = rawRows.slice(1);

    const report: ImportValidationReport = {
      total_rows: dataRows.length,
      valid_rows: 0,
      imported_count: 0,
      skipped_duplicates_count: 0,
      error_count: 0,
      errors: [],
      duplicates: [],
      created_ngo_ids: [],
    };

    // Tracking within the current batch to prevent intra-batch duplicate collisions
    const seenRegNumbers = new Set<string>();
    const seenNames = new Set<string>();

    for (let idx = 0; idx < dataRows.length; idx++) {
      const rowNum = idx + 2; // Accounting for 1-based index and header
      const rowValues = dataRows[idx];

      const rowMap: Record<string, string> = {};
      headers.forEach((h, colIdx) => {
        rowMap[h] = rowValues[colIdx] || "";
      });

      const name = (rowMap["organisation_name"] || rowMap["name"] || "").trim();
      if (!name) {
        report.error_count++;
        report.errors.push({ row: rowNum, error: "Missing required column 'organisation_name'" });
        continue;
      }

      // Parse and validate Service Categories
      const rawCategories = (rowMap["service_categories"] || rowMap["categories"] || "")
        .split(/[;,]/)
        .map((c) => c.trim().toLowerCase())
        .filter((c) => c.length > 0);

      const validCategories: IncidentType[] = [];
      const invalidCategories: string[] = [];

      for (const cat of rawCategories) {
        const parsed = IncidentTypeSchema.safeParse(cat);
        if (parsed.success) {
          validCategories.push(parsed.data);
        } else {
          invalidCategories.push(cat);
        }
      }

      if (validCategories.length === 0) {
        report.error_count++;
        report.errors.push({
          row: rowNum,
          organisation_name: name,
          field: "service_categories",
          error: `No valid service categories found. Provided: [${rawCategories.join(", ")}]. Must match valid incident types.`,
        });
        continue;
      }

      // Parse Supported Subject Types
      const rawSubjects = (rowMap["supported_subject_types"] || rowMap["subject_types"] || "person,animal")
        .split(/[;,]/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);

      const validSubjects: IncidentSubjectType[] = [];
      for (const s of rawSubjects) {
        const parsed = IncidentSubjectTypeSchema.safeParse(s);
        if (parsed.success && !validSubjects.includes(parsed.data)) {
          validSubjects.push(parsed.data);
        }
      }

      if (validSubjects.length === 0) {
        validSubjects.push("person", "animal");
      }

      // Parse Operational Districts
      const rawDistricts = (rowMap["operational_districts"] || rowMap["districts"] || "Delhi NCR")
        .split(/[;,]/)
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      const regNumber = (rowMap["registration_number"] || rowMap["darpan_id"] || "").trim() || null;

      // Check intra-batch duplicate collisions
      if (regNumber) {
        const cleanReg = regNumber.toLowerCase();
        if (seenRegNumbers.has(cleanReg)) {
          report.skipped_duplicates_count++;
          report.duplicates.push({
            row: rowNum,
            organisation_name: name,
            existing_ngo_id: "INTRA_BATCH_DUPLICATE",
            match_reason: `Duplicate registration number '${regNumber}' appeared earlier in this import.`,
          });
          continue;
        }
        seenRegNumbers.add(cleanReg);
      }

      const normName = normalizeOrganisationName(name);
      if (seenNames.has(normName)) {
        report.skipped_duplicates_count++;
        report.duplicates.push({
          row: rowNum,
          organisation_name: name,
          existing_ngo_id: "INTRA_BATCH_DUPLICATE",
          match_reason: `Organisation '${name}' appeared earlier in this import batch.`,
        });
        continue;
      }
      seenNames.add(normName);

      // Check database duplicate collision
      const dbDup = await detectDuplicateNGO(
        {
          organisation_name: name,
          registration_number: regNumber,
          operational_districts: rawDistricts,
        },
        this.repo
      );

      if (dbDup.is_duplicate) {
        report.skipped_duplicates_count++;
        report.duplicates.push({
          row: rowNum,
          organisation_name: name,
          existing_ngo_id: dbDup.existing_ngo_id || "UNKNOWN",
          match_reason: dbDup.reason || "Matched existing organisation in database",
        });
        continue;
      }

      // Coordinates validation
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (rowMap["latitude"] && rowMap["longitude"]) {
        const lat = parseFloat(rowMap["latitude"]);
        const lon = parseFloat(rowMap["longitude"]);
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          latitude = lat;
          longitude = lon;
        }
      }

      // Invariant: Never automatically promote imported records to OPERATIONALLY_VERIFIED
      let verificationStatus: VerificationStatus = "PUBLICLY_LISTED";
      if (regNumber) {
        verificationStatus = "REGISTRATION_CHECKED";
      }

      const nowIso = new Date().toISOString();
      const ngoId = `NGO-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

      const ngoDoc: NGODocument = {
        _id: crypto.randomUUID(),
        ngo_id: ngoId,
        organisation_name: name,
        alternate_names: (rowMap["alternate_names"] || "")
          .split(/[;,]/)
          .map((a) => a.trim())
          .filter(Boolean),
        registration_number: regNumber,
        registration_authority: rowMap["registration_authority"] || "NGO-DARPAN",
        registration_date: rowMap["registration_date"] || null,
        organisation_type: "TRUST",
        service_categories: validCategories,
        supported_subject_types: validSubjects,
        assistance_capabilities: (rowMap["assistance_capabilities"] || rowMap["capabilities"] || "")
          .split(/[;,]/)
          .map((c) => c.trim())
          .filter(Boolean),
        specialised_services: [],
        operational_states: ["Delhi"],
        operational_districts: rawDistricts,
        service_areas: [],
        headquarters_location: {
          address: rowMap["address"] || null,
          district: rowMap["district"] || rawDistricts[0] || null,
          state: "Delhi",
          latitude,
          longitude,
          geo:
            latitude !== null && longitude !== null
              ? {
                  type: "Point",
                  coordinates: [longitude, latitude],
                }
              : null,
        },
        service_radius_km: parseFloat(rowMap["service_radius_km"]) || 20,
        availability_status: "AVAILABLE",
        capacity_status: "HIGH",
        accepting_assignments: true,
        operating_hours: rowMap["operating_hours"] || "24x7",
        service_constraints: [],
        active_cases: 0,
        max_concurrent_cases: parseInt(rowMap["max_concurrent_cases"] || "5", 10) || 5,
        registration_status: regNumber ? "REGISTERED" : "PENDING_CHECK",
        verification_status: verificationStatus,
        last_verified_at: null,
        verification_source: rowMap["verification_source"] || "CSV_IMPORT",
        verification_evidence: [],
        assignment_history: {
          total_assignments: 0,
          accepted_assignments: 0,
          completed_interventions: 0,
          rejected_assignments: 0,
          average_response_minutes: null,
          sample_size: 0,
        },
        contact: {
          phone: rowMap["phone"] || null,
          email: rowMap["email"] || null,
          emergency_phone: rowMap["emergency_phone"] || null,
          coordinator_name: rowMap["coordinator_name"] || null,
          is_phone_verified: false,
        },
        source_type: "csv_import",
        source_reference: options.sourceReference || `csv_${Date.now()}`,
        is_demo: options.isDemoOnly ?? false,
        created_at: nowIso,
        updated_at: nowIso,
      };

      try {
        await this.repo.create(ngoDoc);
        report.valid_rows++;
        report.imported_count++;
        report.created_ngo_ids.push(ngoDoc.ngo_id);
      } catch (insertErr) {
        report.error_count++;
        report.errors.push({
          row: rowNum,
          organisation_name: name,
          error: insertErr instanceof Error ? insertErr.message : "Failed to persist NGO document",
        });
      }
    }

    return report;
  }
}

