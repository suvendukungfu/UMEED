import crypto from "crypto";
import {
  NGOSchema,
  NGODocument,
} from "@umeed/contracts";
import { INGORepository, getNGORepository } from "../repositories";
import { NGOFilterOptions, ImportValidationReport } from "../types";
import { detectDuplicateNGO } from "./duplicate.service";
import { NGOImportService } from "./csv-import.service";
import { seedDemoNGOs } from "./seed.service";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export class NGOService {
  private repo: INGORepository;

  constructor(repo?: INGORepository) {
    this.repo = repo || getNGORepository();
  }

  /**
   * Register a new NGO manually.
   * Performs schema validation and duplicate detection.
   */
  async createNGO(rawPayload: unknown): Promise<NGODocument> {
    const parseResult = NGOSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw ApiError.badRequest("Invalid NGO document schema", details);
    }

    const payload: NGODocument = parseResult.data;

    // Duplicate check
    const dupCheck = await detectDuplicateNGO(
      {
        organisation_name: payload.organisation_name,
        registration_number: payload.registration_number,
        operational_districts: payload.operational_districts,
      },
      this.repo
    );

    if (dupCheck.is_duplicate) {
      throw ApiError.conflict(
        `Duplicate organisation detected: ${dupCheck.reason}`,
        { existing_ngo_id: dupCheck.existing_ngo_id }
      );
    }

    const created = await this.repo.create(payload);
    logger.info("NGO created successfully", "NGO_SERVICE", {
      ngo_id: created.ngo_id,
      name: created.organisation_name,
    });
    return created;
  }

  /**
   * Retrieve NGO by internal _id or public ngo_id.
   */
  async getNGOById(idOrNgoId: string): Promise<NGODocument | null> {
    return this.repo.findById(idOrNgoId);
  }

  /**
   * List NGOs with filter, search, and pagination.
   */
  async listNGOs(
    filter?: NGOFilterOptions
  ): Promise<{ ngos: NGODocument[]; total: number }> {
    return this.repo.list(filter);
  }

  /**
   * Update NGO profile or verification details.
   */
  async updateNGO(
    idOrNgoId: string,
    updates: Partial<NGODocument>
  ): Promise<NGODocument> {
    const existing = await this.repo.findById(idOrNgoId);
    if (!existing) {
      throw ApiError.notFound(`Organisation ${idOrNgoId} not found`);
    }

    const updated = await this.repo.update(idOrNgoId, updates);
    if (!updated) {
      throw ApiError.internal(`Failed to update organisation ${idOrNgoId}`);
    }

    logger.info("NGO updated successfully", "NGO_SERVICE", {
      ngo_id: updated.ngo_id,
      updated_fields: Object.keys(updates),
    });
    return updated;
  }

  /**
   * Batch import organisations from CSV.
   */
  async importFromCsv(
    csvContent: string,
    options?: { isDemoOnly?: boolean; sourceReference?: string }
  ): Promise<ImportValidationReport> {
    const importer = new NGOImportService(this.repo);
    return importer.importFromCsv(csvContent, options);
  }

  /**
   * Seed demo data if the repository contains zero organisations.
   */
  async seedDemoNGOsIfEmpty(): Promise<number> {
    const { total } = await this.repo.list({ limit: 1 });
    if (total === 0) {
      return seedDemoNGOs(this.repo);
    }
    return 0;
  }
}

