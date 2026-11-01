import {
  ServiceFacilityEntity,
  OrganizationEntity,
  ProviderFacilityRelationship,
} from "@umeed/contracts";
import {
  IFacilityRepository,
  IOrganizationEntityRepository,
  IProviderRelationshipRepository,
  getFacilityRepository,
  getOrganizationEntityRepository,
  getProviderRelationshipRepository,
  FacilityFilterOptions,
} from "../repositories";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/logging";

export class FacilityService {
  constructor(
    private facilityRepo: IFacilityRepository = getFacilityRepository(),
    private orgRepo: IOrganizationEntityRepository = getOrganizationEntityRepository(),
    private relRepo: IProviderRelationshipRepository = getProviderRelationshipRepository()
  ) {}

  async seedFromNormalizedFileIfEmpty(): Promise<void> {
    const { total } = await this.facilityRepo.list({ limit: 1 });
    if (total > 0) {
      return;
    }

    const possiblePaths = [
      path.resolve(process.cwd(), "data/seeds/delhi_normalized_entities.json"),
      path.resolve(process.cwd(), "../data/seeds/delhi_normalized_entities.json"),
      path.resolve(process.cwd(), "../../data/seeds/delhi_normalized_entities.json"),
      path.resolve(__dirname, "../../../../../data/seeds/delhi_normalized_entities.json"),
    ];

    let rawData = "";
    for (const p of possiblePaths) {
      try {
        rawData = await fs.readFile(p, "utf-8");
        break;
      } catch {
        // continue search
      }
    }

    if (!rawData) {
      logger.warn("Normalized seed file delhi_normalized_entities.json could not be loaded", "FACILITY_SERVICE");
      return;
    }

    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed.facilities)) {
        for (const f of parsed.facilities) {
          await this.facilityRepo.create(f);
        }
      }
      if (Array.isArray(parsed.organizations)) {
        for (const o of parsed.organizations) {
          await this.orgRepo.create(o);
        }
      }
      if (Array.isArray(parsed.providerRelationships)) {
        for (const r of parsed.providerRelationships) {
          await this.relRepo.create(r);
        }
      }
      logger.info(
        `Seeded ${parsed.facilities?.length || 0} facilities and ${parsed.organizations?.length || 0} organizations`,
        "FACILITY_SERVICE"
      );
    } catch (err: any) {
      logger.error("Failed to parse and seed normalized entities", err, "FACILITY_SERVICE");
    }
  }

  async listFacilities(filter?: FacilityFilterOptions) {
    await this.seedFromNormalizedFileIfEmpty();
    return this.facilityRepo.list(filter);
  }

  async getFacilityById(id: string) {
    await this.seedFromNormalizedFileIfEmpty();
    return this.facilityRepo.findById(id);
  }

  async findNearbyFacilities(coords: [number, number], maxDistanceMeters: number) {
    await this.seedFromNormalizedFileIfEmpty();
    return this.facilityRepo.findNearby(coords, maxDistanceMeters);
  }

  async listOrganizations(filter?: { isUmeedPartner?: boolean; district?: string }) {
    await this.seedFromNormalizedFileIfEmpty();
    return this.orgRepo.list(filter);
  }

  async getOrganizationById(id: string) {
    await this.seedFromNormalizedFileIfEmpty();
    return this.orgRepo.findById(id);
  }

  async getRelationshipsForFacility(facilityId: string) {
    await this.seedFromNormalizedFileIfEmpty();
    return this.relRepo.findByFacility(facilityId);
  }
}
