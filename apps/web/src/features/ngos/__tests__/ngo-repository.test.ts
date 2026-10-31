import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { InMemoryNGORepository } from "../repositories/memory-ngo.repository";
import { MongoNGORepository } from "../repositories/mongo-ngo.repository";
import { getNGORepository, setNGORepository } from "../repositories";
import { resetEnvCache } from "@/lib/config/env";
import { NGODocument } from "../types";

describe("NGO Repository Layer Architecture & Dual Implementation", () => {
  let memoryRepo: InMemoryNGORepository;
  const originalEnv = { ...process.env };

  const sampleNgo: NGODocument = {
    _id: "test-ngo-001",
    ngo_id: "NGO-REPO-001",
    organisation_name: "Rohini Stray Animal Aid",
    alternate_names: ["RSAA"],
    registration_number: "DL/2024/1199",
    registration_authority: "NGO-DARPAN",
    registration_date: "2024-01-01",
    organisation_type: "TRUST",
    service_categories: ["injured_animal"],
    supported_subject_types: ["animal"],
    assistance_capabilities: ["animal_first_aid"],
    specialised_services: [],
    operational_states: ["Delhi"],
    operational_districts: ["North West Delhi"],
    service_areas: ["Rohini Sector 14"],
    headquarters_location: {
      address: "Sector 14, Rohini",
      district: "North West Delhi",
      state: "Delhi",
      latitude: 28.7041,
      longitude: 77.1025,
      geo: {
        type: "Point",
        coordinates: [77.1025, 28.7041], // Strictly [longitude, latitude] GeoJSON ordering
      },
    },
    service_radius_km: 15,
    availability_status: "AVAILABLE",
    capacity_status: "HIGH",
    accepting_assignments: true,
    operating_hours: "24x7",
    service_constraints: [],
    active_cases: 0,
    max_concurrent_cases: 5,
    registration_status: "REGISTERED",
    verification_status: "OPERATIONALLY_VERIFIED",
    last_verified_at: "2026-10-01T00:00:00.000Z",
    verification_source: "Audit",
    verification_evidence: [],
    assignment_history: {
      total_assignments: 5,
      accepted_assignments: 5,
      completed_interventions: 5,
      rejected_assignments: 0,
      average_response_minutes: 20,
      sample_size: 5,
    },
    contact: {
      phone: "+91-11-2700-0001",
      email: "help@rsaa.org",
      emergency_phone: null,
      coordinator_name: null,
      is_phone_verified: false,
    },
    source_type: "manual_entry",
    source_reference: "manual",
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    memoryRepo = new InMemoryNGORepository();
    setNGORepository(null);
    resetEnvCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setNGORepository(null);
    resetEnvCache();
  });

  describe("InMemoryNGORepository Implementation", () => {
    it("stores and retrieves NGO with GeoJSON [longitude, latitude] ordering", async () => {
      const created = await memoryRepo.create(sampleNgo);
      expect(created.headquarters_location.geo?.coordinates[0]).toBe(77.1025); // Longitude
      expect(created.headquarters_location.geo?.coordinates[1]).toBe(28.7041); // Latitude

      const retrieved = await memoryRepo.findById(created.ngo_id);
      expect(retrieved?.organisation_name).toBe("Rohini Stray Animal Aid");
    });

    it("enforces unique registration number check in memory", async () => {
      await memoryRepo.create(sampleNgo);

      const duplicateReg = {
        ...sampleNgo,
        _id: "test-ngo-002",
        ngo_id: "NGO-REPO-002",
        organisation_name: "Different Name",
      };

      await expect(memoryRepo.create(duplicateReg)).rejects.toThrow(/duplicate key error/);
    });

    it("finds nearby NGOs using geospatial Haversine calculations", async () => {
      await memoryRepo.create(sampleNgo);

      // Coordinates ~1km away in Rohini
      const nearby = await memoryRepo.findNearby(
        { longitude: 77.1050, latitude: 28.7050 },
        2000 // 2km radius
      );
      expect(nearby.length).toBe(1);
      expect(nearby[0].ngo_id).toBe(sampleNgo.ngo_id);

      // Coordinates ~25km away in South Delhi
      const farAway = await memoryRepo.findNearby(
        { longitude: 77.2185, latitude: 28.5244 },
        2000 // 2km radius
      );
      expect(farAway.length).toBe(0);
    });
  });

  describe("Repository Selection & Production Safety", () => {
    it("safely falls back to InMemoryNGORepository in development when MONGODB_URI is unconfigured", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      delete process.env.MONGODB_URI;
      resetEnvCache();

      const repo = getNGORepository();
      expect(repo).toBeInstanceOf(InMemoryNGORepository);
    });

    it("fails closed in production mode when MONGODB_URI is missing or contains placeholder", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      (process.env as Record<string, string | undefined>).COORDINATOR_API_KEY = "valid-prod-key-for-test-32chars!";
      delete process.env.MONGODB_URI;
      resetEnvCache();

      expect(() => getNGORepository()).toThrow(
        /Production environment requires a configured MongoDB Atlas cluster/
      );
    });
  });

  describe("MongoNGORepository Unit Verification (Mocked Db)", () => {
    it("initializes MongoDB indexes using correct collection specifications", async () => {
      const createdIndexes: Array<{ spec: unknown; options: unknown }> = [];
      const mockCollection = {
        createIndex: async (spec: unknown, options: unknown) => {
          createdIndexes.push({ spec, options });
          return "idx_created";
        },
      };
      const mockDb = {
        collection: () => mockCollection,
      } as unknown as import("mongodb").Db;

      const mongoRepo = new MongoNGORepository(mockDb);
      await mongoRepo.initIndexes();

      expect(createdIndexes.length).toBe(6);
      // Index 1: ngo_id unique
      expect(createdIndexes[0].options).toMatchObject({ unique: true, name: "idx_ngo_id_unique" });
      // Index 6: 2dsphere on headquarters_location.geo
      expect(createdIndexes[5].spec).toEqual({ "headquarters_location.geo": "2dsphere" });
    });
  });
});

