import {
  IOrganizationRepository,
  getOrganizationRepository,
  IServiceLocationRepository,
  getServiceLocationRepository,
} from "../repositories";
import { Organization, ServiceLocation } from "../types";
import { logger } from "@/lib/logging";

export const SEED_ORGANIZATIONS: Organization[] = [
  {
    organizationId: "NGO-DELHI-001",
    name: "Jan Seva Animal Emergency Ambulance",
    organizationType: "TRUST",
    verificationStatus: "OPERATIONALLY_VERIFIED",
    registrationDetails: {
      registrationNumber: "DL/2024/0981",
      registrationAuthority: "Delhi Registrar of Societies",
      registrationDate: "2024-03-15",
    },
    serviceCategories: ["injured_animal", "veterinary_care", "animal_ambulance"],
    serviceSubcategories: ["canine_emergency", "avian_rescue", "fracture_stabilization"],
    serviceAreas: ["North West Delhi", "North Delhi", "West Delhi", "Rohini", "Pitampura"],
    operationalStatus: "ACTIVE",
    publicContactChannels: {
      phone: "+91-11-5555-0101",
      email: "dispatch@janseva-delhi.org",
      emergencyPhone: "+91-98765-01101",
      website: "https://janseva-delhi.org",
      coordinatorName: "Dr. Rajesh Sharma",
      isPhoneVerified: true,
    },
    reliabilityMetrics: {
      successfulResponses: 38,
      eligibleResolvedAttempts: 40,
      averageResponseMinutes: 18,
      sampleSize: 40,
      categoryMetrics: {
        injured_animal: { successfulResponses: 30, eligibleResolvedAttempts: 31 },
      },
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-10-31T00:00:00.000Z",
    lastVerifiedAt: "2026-10-25T10:00:00.000Z",
  },
  {
    organizationId: "NGO-DELHI-002",
    name: "Delhi Veterinary Surgical Trust & Shelter",
    organizationType: "SOCIETY",
    verificationStatus: "OPERATIONALLY_VERIFIED",
    registrationDetails: {
      registrationNumber: "DL/2023/1142",
      registrationAuthority: "NGO-DARPAN",
      registrationDate: "2023-08-20",
    },
    serviceCategories: ["injured_animal", "abandoned_animal", "animal_shelter"],
    serviceSubcategories: ["trauma_surgery", "inpatient_shelter"],
    serviceAreas: ["North Delhi", "Central Delhi", "Civil Lines"],
    operationalStatus: "ACTIVE",
    publicContactChannels: {
      phone: "+91-11-5555-0102",
      email: "care@delhivetcare.org",
      emergencyPhone: "+91-98765-01102",
      website: "https://delhivetcare.org",
      coordinatorName: "Dr. Ananya Roy",
      isPhoneVerified: true,
    },
    reliabilityMetrics: {
      successfulResponses: 25,
      eligibleResolvedAttempts: 28,
      averageResponseMinutes: 32,
      sampleSize: 28,
      categoryMetrics: {},
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-10-31T00:00:00.000Z",
    lastVerifiedAt: "2026-10-20T14:30:00.000Z",
  },
  {
    organizationId: "NGO-DELHI-003",
    name: "Delhi Homeless Care & Medical Transit Foundation",
    organizationType: "SECTION_8",
    verificationStatus: "OPERATIONALLY_VERIFIED",
    registrationDetails: {
      registrationNumber: "DL/2022/3321",
      registrationAuthority: "Ministry of Corporate Affairs",
      registrationDate: "2022-02-10",
    },
    serviceCategories: [
      "homeless_person",
      "medical_assistance",
      "medical_transport",
      "shelter_assistance",
    ],
    serviceSubcategories: ["street_medicine", "emergency_shelter", "winter_transit"],
    serviceAreas: ["Central Delhi", "North Delhi", "New Delhi", "Kashmere Gate", "Daryaganj"],
    operationalStatus: "ACTIVE",
    publicContactChannels: {
      phone: "+91-11-5555-0103",
      email: "dispatch@delhihomelesscare.org",
      emergencyPhone: "+91-98765-01103",
      website: "https://delhihomelesscare.org",
      coordinatorName: "Sunil Verma",
      isPhoneVerified: true,
    },
    reliabilityMetrics: {
      successfulResponses: 52,
      eligibleResolvedAttempts: 55,
      averageResponseMinutes: 20,
      sampleSize: 55,
      categoryMetrics: {
        homeless_person: { successfulResponses: 35, eligibleResolvedAttempts: 36 },
        medical_transport: { successfulResponses: 17, eligibleResolvedAttempts: 19 },
      },
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-10-31T00:00:00.000Z",
    lastVerifiedAt: "2026-10-28T09:00:00.000Z",
  },
  {
    organizationId: "NGO-DELHI-004",
    name: "Prerna Senior Dignity Alliance",
    organizationType: "TRUST",
    verificationStatus: "OPERATIONALLY_VERIFIED",
    registrationDetails: {
      registrationNumber: "DL/2021/0543",
      registrationAuthority: "Delhi Registrar of Societies",
      registrationDate: "2021-11-05",
    },
    serviceCategories: [
      "abandoned_elderly_person",
      "geriatric_care",
      "shelter_assistance",
    ],
    serviceSubcategories: ["old_age_shelter", "elderly_first_aid"],
    serviceAreas: ["South Delhi", "South East Delhi", "Lajpat Nagar", "Saket"],
    operationalStatus: "ACTIVE",
    publicContactChannels: {
      phone: "+91-11-5555-0104",
      email: "helpline@prerna-elders.org",
      emergencyPhone: "+91-98765-01104",
      website: "https://prerna-elders.org",
      coordinatorName: "Meenakshi Sundaram",
      isPhoneVerified: true,
    },
    reliabilityMetrics: {
      successfulResponses: 19,
      eligibleResolvedAttempts: 20,
      averageResponseMinutes: 25,
      sampleSize: 20,
      categoryMetrics: {},
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-10-31T00:00:00.000Z",
    lastVerifiedAt: "2026-10-15T12:00:00.000Z",
  },
  {
    organizationId: "NGO-DELHI-005",
    name: "Capital Food & Ration Relief",
    organizationType: "SOCIETY",
    verificationStatus: "OPERATIONALLY_VERIFIED",
    registrationDetails: {
      registrationNumber: "DL/2020/7812",
      registrationAuthority: "Registrar of Societies",
      registrationDate: "2020-04-18",
    },
    serviceCategories: ["food_assistance"],
    serviceSubcategories: ["community_kitchen", "ration_distribution"],
    serviceAreas: ["Shahdara", "East Delhi", "North East Delhi"],
    operationalStatus: "ACTIVE",
    publicContactChannels: {
      phone: "+91-11-5555-0105",
      email: "kitchen@capitalrelief.org",
      emergencyPhone: null,
      website: "https://capitalrelief.org",
      coordinatorName: "Harpreet Singh",
      isPhoneVerified: true,
    },
    reliabilityMetrics: {
      successfulResponses: 45,
      eligibleResolvedAttempts: 50,
      averageResponseMinutes: 40,
      sampleSize: 50,
      categoryMetrics: {},
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-10-31T00:00:00.000Z",
    lastVerifiedAt: "2026-10-10T16:00:00.000Z",
  },
  {
    organizationId: "NGO-DELHI-006",
    name: "Suspended Relief Foundation",
    organizationType: "SOCIETY",
    verificationStatus: "SUSPENDED",
    registrationDetails: {
      registrationNumber: "DL/2019/0011",
      registrationAuthority: "Registrar of Societies",
      registrationDate: "2019-04-01",
    },
    serviceCategories: ["injured_animal"],
    serviceSubcategories: [],
    serviceAreas: ["South Delhi", "Vasant Kunj"],
    operationalStatus: "SUSPENDED",
    publicContactChannels: {
      phone: "+91-11-5555-0108",
      email: "info@suspendedaid.org",
      emergencyPhone: null,
      website: null,
      coordinatorName: null,
      isPhoneVerified: false,
    },
    reliabilityMetrics: {
      successfulResponses: 4,
      eligibleResolvedAttempts: 10,
      averageResponseMinutes: 120,
      sampleSize: 10,
      categoryMetrics: {},
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-10-31T00:00:00.000Z",
    lastVerifiedAt: "2026-05-10T10:00:00.000Z",
  },
];

export const SEED_SERVICE_LOCATIONS: ServiceLocation[] = [
  {
    serviceLocationId: "LOC-DELHI-001",
    providerId: "NGO-DELHI-001",
    name: "Jan Seva Emergency Response Depot - Pitampura",
    address: "Plot 12, District Centre, Netaji Subhash Place, Pitampura, Delhi",
    district: "North West Delhi",
    ward: "Ward 55 Pitampura",
    location: {
      type: "Point",
      coordinates: [77.135, 28.6972], // [lng, lat]
    },
    supportedServices: ["injured_animal", "veterinary_care", "animal_ambulance"],
    serviceArea: {
      states: ["Delhi"],
      districts: ["North West Delhi", "North Delhi", "West Delhi"],
      wards: ["Ward 55 Pitampura", "Ward 56 Rohini", "Ward 57 Shalimar Bagh"],
      radiusKm: 25,
      coversAllDelhi: false,
      acceptsOutOfArea: false,
    },
    operatingHours: "24x7 Emergency",
    operationalStatus: "ACTIVE",
    capacity: 10,
    occupiedCapacity: 2,
    availableCapacity: 8,
    availabilityStatus: "CONFIRMED_AVAILABLE",
    lastAvailabilityConfirmedAt: "2026-10-30T10:00:00.000Z",
    lastVerifiedAt: "2026-10-25T10:00:00.000Z",
  },
  {
    serviceLocationId: "LOC-DELHI-002",
    providerId: "NGO-DELHI-002",
    name: "Delhi Veterinary Surgical Clinic - Civil Lines",
    address: "18 Rajpur Road, Civil Lines, Delhi",
    district: "North Delhi",
    ward: "Ward 12 Civil Lines",
    location: {
      type: "Point",
      coordinates: [77.2255, 28.6782],
    },
    supportedServices: ["injured_animal", "abandoned_animal", "animal_shelter"],
    serviceArea: {
      states: ["Delhi"],
      districts: ["North Delhi", "Central Delhi"],
      wards: ["Ward 12 Civil Lines", "Ward 13 Kashmere Gate"],
      radiusKm: 20,
      coversAllDelhi: false,
      acceptsOutOfArea: false,
    },
    operatingHours: "08:00 - 22:00",
    operationalStatus: "ACTIVE",
    capacity: 15,
    occupiedCapacity: 12,
    availableCapacity: 3,
    availabilityStatus: "LIMITED_CONFIRMED",
    lastAvailabilityConfirmedAt: "2026-10-29T14:00:00.000Z",
    lastVerifiedAt: "2026-10-20T14:30:00.000Z",
  },
  {
    serviceLocationId: "LOC-DELHI-003",
    providerId: "NGO-DELHI-003",
    name: "Delhi Homeless Care Base - Kashmere Gate",
    address: "ISBT Ring Road, Kashmere Gate, Delhi",
    district: "North Delhi",
    ward: "Ward 13 Kashmere Gate",
    location: {
      type: "Point",
      coordinates: [77.23, 28.667],
    },
    supportedServices: [
      "homeless_person",
      "medical_assistance",
      "medical_transport",
      "shelter_assistance",
    ],
    serviceArea: {
      states: ["Delhi"],
      districts: ["North Delhi", "Central Delhi", "New Delhi"],
      wards: ["Ward 13 Kashmere Gate", "Ward 14 Chandni Chowk"],
      radiusKm: 30,
      coversAllDelhi: true,
      acceptsOutOfArea: true,
    },
    operatingHours: "24x7 Emergency",
    operationalStatus: "ACTIVE",
    capacity: 50,
    occupiedCapacity: 20,
    availableCapacity: 30,
    availabilityStatus: "CONFIRMED_AVAILABLE",
    lastAvailabilityConfirmedAt: "2026-10-31T08:00:00.000Z",
    lastVerifiedAt: "2026-10-28T09:00:00.000Z",
  },
  {
    serviceLocationId: "LOC-DELHI-004",
    providerId: "NGO-DELHI-004",
    name: "Prerna Senior Dignity Home - Lajpat Nagar",
    address: "Block C, Lajpat Nagar IV, New Delhi",
    district: "South Delhi",
    ward: "Ward 85 Lajpat Nagar",
    location: {
      type: "Point",
      coordinates: [77.243, 28.568],
    },
    supportedServices: [
      "abandoned_elderly_person",
      "geriatric_care",
      "shelter_assistance",
    ],
    serviceArea: {
      states: ["Delhi"],
      districts: ["South Delhi", "South East Delhi"],
      wards: ["Ward 85 Lajpat Nagar"],
      radiusKm: 20,
      coversAllDelhi: false,
      acceptsOutOfArea: false,
    },
    operatingHours: "09:00 - 20:00",
    operationalStatus: "ACTIVE",
    capacity: 25,
    occupiedCapacity: 25,
    availableCapacity: 0,
    availabilityStatus: "NO_CAPACITY",
    lastAvailabilityConfirmedAt: "2026-10-31T09:00:00.000Z",
    lastVerifiedAt: "2026-10-15T12:00:00.000Z",
  },
  {
    serviceLocationId: "LOC-DELHI-005",
    providerId: "NGO-DELHI-005",
    name: "Capital Relief Kitchen - Anand Vihar",
    address: "Road 56, Anand Vihar, Delhi",
    district: "East Delhi",
    ward: "Ward 40 Anand Vihar",
    location: {
      type: "Point",
      coordinates: [77.315, 28.647],
    },
    supportedServices: ["food_assistance"],
    serviceArea: {
      states: ["Delhi"],
      districts: ["East Delhi", "Shahdara"],
      wards: ["Ward 40 Anand Vihar"],
      radiusKm: 15,
      coversAllDelhi: false,
      acceptsOutOfArea: false,
    },
    operatingHours: "07:00 - 21:00",
    operationalStatus: "ACTIVE",
    capacity: 200,
    occupiedCapacity: 100,
    availableCapacity: 100,
    availabilityStatus: "CONFIRMED_AVAILABLE",
    lastAvailabilityConfirmedAt: "2026-10-30T15:00:00.000Z",
    lastVerifiedAt: "2026-10-10T16:00:00.000Z",
  },
];

export async function seedEngineFixtures(
  orgRepo?: IOrganizationRepository,
  locRepo?: IServiceLocationRepository
): Promise<{ orgsSeeded: number; locationsSeeded: number }> {
  const oRepo = orgRepo || getOrganizationRepository();
  const lRepo = locRepo || getServiceLocationRepository();

  let orgsSeeded = 0;
  for (const org of SEED_ORGANIZATIONS) {
    const existing = await oRepo.findById(org.organizationId);
    if (!existing) {
      await oRepo.create(org);
      orgsSeeded++;
    }
  }

  let locationsSeeded = 0;
  for (const loc of SEED_SERVICE_LOCATIONS) {
    const existing = await lRepo.findById(loc.serviceLocationId);
    if (!existing) {
      await lRepo.create(loc);
      locationsSeeded++;
    }
  }

  logger.info("Engine fixtures seeded successfully", "ENGINE_SEED", {
    orgsSeeded,
    locationsSeeded,
  });

  return { orgsSeeded, locationsSeeded };
}
