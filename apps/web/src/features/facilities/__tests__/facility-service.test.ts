import { describe, it, expect, beforeEach } from "vitest";
import { FacilityService } from "../services/facility.service";
import {
  InMemoryFacilityRepository,
  InMemoryOrganizationEntityRepository,
  InMemoryProviderRelationshipRepository,
} from "../repositories";

describe("Phase 1 Remediation: Facility and Organization Normalized Service", () => {
  let facilityRepo: InMemoryFacilityRepository;
  let orgRepo: InMemoryOrganizationEntityRepository;
  let relRepo: InMemoryProviderRelationshipRepository;
  let service: FacilityService;

  beforeEach(() => {
    facilityRepo = new InMemoryFacilityRepository();
    orgRepo = new InMemoryOrganizationEntityRepository();
    relRepo = new InMemoryProviderRelationshipRepository();
    service = new FacilityService(facilityRepo, orgRepo, relRepo);
  });

  it("seeds and lists normalized Delhi facilities cleanly from source data", async () => {
    const { facilities, total } = await service.listFacilities();
    expect(total).toBeGreaterThanOrEqual(4);
    expect(facilities.length).toBeGreaterThanOrEqual(4);

    const traumaCentre = facilities.find((f) => f.id === "fac_aiims_jpn_trauma_centre");
    expect(traumaCentre).toBeDefined();
    expect(traumaCentre?.isReferralDestinationOnly).toBe(true);
    expect(traumaCentre?.facilityType).toBe("TRAUMA_CENTRE");
  });

  it("filters facilities accurately by operational district", async () => {
    const { facilities } = await service.listFacilities({ district: "South Delhi" });
    expect(facilities.length).toBeGreaterThan(0);
    for (const f of facilities) {
      expect(f.location.district.toLowerCase()).toBe("south delhi");
    }
  });

  it("filters facilities by facility type (VETERINARY_HOSPITAL)", async () => {
    const { facilities } = await service.listFacilities({ facilityType: "VETERINARY_HOSPITAL" });
    expect(facilities.length).toBeGreaterThan(0);
    for (const f of facilities) {
      expect(f.facilityType).toBe("VETERINARY_HOSPITAL");
    }
  });

  it("maintains strict organizational decoupling: AIIMS is a public institution, not an NGO", async () => {
    const orgs = await service.listOrganizations();
    expect(orgs.length).toBeGreaterThanOrEqual(4);

    const aiims = orgs.find((o) => o.id === "gov_aiims_new_delhi");
    expect(aiims).toBeDefined();
    expect(aiims?.kind).toBe("GOVERNMENT_AGENCY");
    expect(aiims?.isUmeedPartner).toBe(false); // Zero-False-Partnership Principle
  });

  it("executes geospatial proximity queries within radius", async () => {
    // Connaught place coords: [77.2167, 28.6315]
    // Search within 10 km (10,000 meters)
    const nearby = await service.findNearbyFacilities([77.2167, 28.6315], 10000);
    expect(nearby.length).toBeGreaterThan(0);
  });
});
