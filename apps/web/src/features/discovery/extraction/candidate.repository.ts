import {
  DiscoveryCandidate,
  CandidateReviewStatus,
  IncidentType,
} from "@umeed/contracts";
import { getDb, isMongoConfigured } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export interface CandidateFilter {
  status?: CandidateReviewStatus;
  category?: IncidentType;
  district?: string;
  isSynthetic?: boolean;
}

export interface ICandidateRepository {
  listCandidates(filter?: CandidateFilter): Promise<DiscoveryCandidate[]>;
  getById(candidateId: string): Promise<DiscoveryCandidate | null>;
  findByContentHash(hash: string): Promise<DiscoveryCandidate | null>;
  create(candidate: DiscoveryCandidate): Promise<DiscoveryCandidate>;
  updateReview(
    candidateId: string,
    update: {
      status: CandidateReviewStatus;
      reviewedBy: string;
      notes?: string;
      incidentReference?: string;
    }
  ): Promise<DiscoveryCandidate | null>;
  countByStatus(): Promise<Record<string, number>>;
}

export const SEED_DISCOVERY_CANDIDATES: DiscoveryCandidate[] = [
  {
    candidateId: "cand_delhi_001_rohini_bull",
    sourceId: "src_delhi_animal_welfare",
    sourceName: "Delhi Animal Welfare & Stray Rescue Public Feed",
    sourceUrl: "https://delhianimalwelfare.org/alerts/injured-bull-rohini-sec16",
    canonicalUrl: "https://delhianimalwelfare.org/alerts/injured-bull-rohini-sec16",
    sourceTitle: "Injured stray bull requiring orthopedic support in Rohini Sector 16",
    sourcePublishedAt: "2026-10-31T19:30:00Z",
    discoveredAt: "2026-10-31T20:15:00Z",
    fetchedAt: "2026-10-31T20:15:00Z",
    contentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    excerpt: "Severe trauma reported in Rohini Sector 16 near central market. Animal is non-ambulatory with visible leg injury after traffic accident. Immediate hydraulic ambulance required.",
    summary: "Public report of an injured bull with suspected fracture in Sector 16 Rohini requiring animal ambulance dispatch.",
    candidateCategory: "injured_animal",
    extractedLocationText: "Rohini Sector 16, North West Delhi",
    approximateLocation: {
      latitude: 28.73,
      longitude: 77.12,
      district: "North West Delhi",
      state: "Delhi NCR",
    },
    locationPrecision: "approximate_district",
    locationConfidence: 0.9,
    signalScore: 88,
    signalRelevance: "strong_candidate",
    classificationReasons: ["Explicit animal fracture terminology", "High-confidence North West Delhi geographic reference"],
    extractionVersion: "1.0.0",
    reviewStatus: "new",
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    incidentReference: null,
    duplicateGroupId: null,
    isSynthetic: true,
  },
  {
    candidateId: "cand_delhi_002_kashmere_elderly",
    sourceId: "src_dusib_delhi_alerts",
    sourceName: "DUSIB Winter Relief & Emergency Sanctuary Announcements",
    sourceUrl: "https://delhishelterboard.in/notices/kashmere-gate-isbt-winter-intake",
    canonicalUrl: "https://delhishelterboard.in/notices/kashmere-gate-isbt-winter-intake",
    sourceTitle: "Abandoned elderly citizen exposed to cold wave outside Kashmere Gate ISBT Ring Road",
    sourcePublishedAt: "2026-10-31T18:45:00Z",
    discoveredAt: "2026-10-31T19:30:00Z",
    fetchedAt: "2026-10-31T19:30:00Z",
    contentHash: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    excerpt: "Frail senior citizen sitting under flyover pillars without warm blankets or family accompaniment. Requires immediate geriatric intake and medical evaluation.",
    summary: "Public distress signal concerning abandoned elderly citizen exposed to nocturnal cold near Kashmere Gate.",
    candidateCategory: "abandoned_elderly_person",
    extractedLocationText: "Kashmere Gate ISBT, North Delhi",
    approximateLocation: {
      latitude: 28.69,
      longitude: 77.22,
      district: "North Delhi",
      state: "Delhi NCR",
    },
    locationPrecision: "approximate_district",
    locationConfidence: 0.95,
    signalScore: 92,
    signalRelevance: "strong_candidate",
    classificationReasons: ["Critical winter vulnerability keywords", "Frail senior citizen mention without shelter"],
    extractionVersion: "1.0.0",
    reviewStatus: "under_review",
    reviewedBy: "coord_sharma",
    reviewedAt: "2026-10-31T20:00:00Z",
    reviewNotes: "Dispatched outreach team to verify identity and offer night shelter admission.",
    incidentReference: null,
    duplicateGroupId: null,
    isSynthetic: true,
  },
  {
    candidateId: "cand_delhi_003_saket_puppies",
    sourceId: "src_delhi_animal_welfare",
    sourceName: "Delhi Animal Welfare & Stray Rescue Public Feed",
    sourceUrl: "https://delhianimalwelfare.org/alerts/abandoned-litter-saket",
    canonicalUrl: "https://delhianimalwelfare.org/alerts/abandoned-litter-saket",
    sourceTitle: "Litter of abandoned newborn puppies near Saket Metro Station construction area",
    sourcePublishedAt: "2026-10-31T16:00:00Z",
    discoveredAt: "2026-10-31T17:15:00Z",
    fetchedAt: "2026-10-31T17:15:00Z",
    contentHash: "185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969",
    excerpt: "Four stray puppies abandoned in cardboard box near metro exit. Mother not spotted for 24 hours. Cold exposure risk high.",
    summary: "Urgent puppy foster intake needed near Saket Metro Station.",
    candidateCategory: "abandoned_animal",
    extractedLocationText: "Saket, South Delhi",
    approximateLocation: {
      latitude: 28.54,
      longitude: 77.2,
      district: "South Delhi",
      state: "Delhi NCR",
    },
    locationPrecision: "approximate_district",
    locationConfidence: 0.85,
    signalScore: 78,
    signalRelevance: "possible_signal",
    classificationReasons: ["Litter abandonment without maternal care", "Immediate hypothermia risk"],
    extractionVersion: "1.0.0",
    reviewStatus: "verified",
    reviewedBy: "coord_sharma",
    reviewedAt: "2026-10-31T18:00:00Z",
    reviewNotes: "Verified via South Delhi stray animal volunteer group.",
    incidentReference: "UMD-DISC-003",
    duplicateGroupId: null,
    isSynthetic: true,
  },
  {
    candidateId: "cand_delhi_004_okhla_food",
    sourceId: "src_goonj_relief_bulletin",
    sourceName: "Goonj Community Assistance & Seasonal Relief Bulletins",
    sourceUrl: "https://goonj.org/bulletins/okhla-dry-ration-request",
    canonicalUrl: "https://goonj.org/bulletins/okhla-dry-ration-request",
    sourceTitle: "Emergency dry ration and blanket appeal for migrant informal workers in Okhla Phase 2",
    sourcePublishedAt: "2026-10-31T15:00:00Z",
    discoveredAt: "2026-10-31T16:00:00Z",
    fetchedAt: "2026-10-31T16:00:00Z",
    contentHash: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
    excerpt: "Over 40 informal migrant worker families impacted by seasonal factory closure experiencing food insecurity. Emergency dry rations and woollens requested.",
    summary: "Community nutrition and blanket relief alert in Okhla industrial area.",
    candidateCategory: "food_assistance",
    extractedLocationText: "Okhla Phase 2, South East Delhi",
    approximateLocation: {
      latitude: 28.56,
      longitude: 77.28,
      district: "South East Delhi",
      state: "Delhi NCR",
    },
    locationPrecision: "approximate_district",
    locationConfidence: 0.88,
    signalScore: 74,
    signalRelevance: "possible_signal",
    classificationReasons: ["Food insecurity and blanket shortage documented"],
    extractionVersion: "1.0.0",
    reviewStatus: "new",
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    incidentReference: null,
    duplicateGroupId: null,
    isSynthetic: true,
  },
  {
    candidateId: "cand_delhi_005_dwarka_homeless",
    sourceId: "src_ogd_delhi_shelter",
    sourceName: "Open Government Data (data.gov.in) — Delhi Night Shelters",
    sourceUrl: "https://data.gov.in/feed/dwarka-sector-10-shelter-status",
    canonicalUrl: "https://data.gov.in/feed/dwarka-sector-10-shelter-status",
    sourceTitle: "Dwarka Sector 10 transit camp reached maximum capacity; temporary tents needed",
    sourcePublishedAt: "2026-10-31T14:30:00Z",
    discoveredAt: "2026-10-31T15:30:00Z",
    fetchedAt: "2026-10-31T15:30:00Z",
    contentHash: "2c624232cdd221771294dfbb310aca000a0df6ac9b66b0d199bf41e418646a9b",
    excerpt: "Night sanctuary overflow in Sector 10 Dwarka. 35 individuals queued outside without beds. Coordinated redirection or auxiliary tent deployment requested.",
    summary: "Night shelter overflow requiring inter-NGO shelter coordination in Dwarka.",
    candidateCategory: "shelter_assistance",
    extractedLocationText: "Dwarka Sector 10, South West Delhi",
    approximateLocation: {
      latitude: 28.59,
      longitude: 77.05,
      district: "South West Delhi",
      state: "Delhi NCR",
    },
    locationPrecision: "approximate_district",
    locationConfidence: 0.92,
    signalScore: 84,
    signalRelevance: "strong_candidate",
    classificationReasons: ["Night shelter capacity deficit", "Direct cold wave impact on unsheltered citizens"],
    extractionVersion: "1.0.0",
    reviewStatus: "new",
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    incidentReference: null,
    duplicateGroupId: null,
    isSynthetic: true,
  },
  {
    candidateId: "cand_delhi_006_paharganj_medical",
    sourceId: "src_dusib_delhi_alerts",
    sourceName: "DUSIB Winter Relief & Emergency Sanctuary Announcements",
    sourceUrl: "https://delhishelterboard.in/alerts/paharganj-mobile-health",
    canonicalUrl: "https://delhishelterboard.in/alerts/paharganj-mobile-health",
    sourceTitle: "Acute non-emergency respiratory distress observed among pavement dwellers in Paharganj",
    sourcePublishedAt: "2026-10-31T12:00:00Z",
    discoveredAt: "2026-10-31T13:00:00Z",
    fetchedAt: "2026-10-31T13:00:00Z",
    contentHash: "9834876dcfb05cb167a5c24953eba58c4ac89b1adf57f28f2f9d09af107ee8f0",
    excerpt: "Multiple pavement dwellers near New Delhi Railway Station experiencing bronchitis and unaddressed chest congestion due to smog and cold.",
    summary: "Medical van outreach needed for homeless individuals with respiratory symptoms in Paharganj.",
    candidateCategory: "medical_assistance",
    extractedLocationText: "Paharganj, New Delhi",
    approximateLocation: {
      latitude: 28.61,
      longitude: 77.21,
      district: "New Delhi",
      state: "Delhi NCR",
    },
    locationPrecision: "approximate_district",
    locationConfidence: 0.89,
    signalScore: 81,
    signalRelevance: "strong_candidate",
    classificationReasons: ["Acute respiratory distress in vulnerable population"],
    extractionVersion: "1.0.0",
    reviewStatus: "new",
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    incidentReference: null,
    duplicateGroupId: null,
    isSynthetic: true,
  },
];

export class InMemoryCandidateRepository implements ICandidateRepository {
  private candidates = new Map<string, DiscoveryCandidate>();

  constructor() {
    for (const c of SEED_DISCOVERY_CANDIDATES) {
      this.candidates.set(c.candidateId, { ...c });
    }
  }

  async listCandidates(filter?: CandidateFilter): Promise<DiscoveryCandidate[]> {
    let list = Array.from(this.candidates.values());

    if (filter?.status) {
      list = list.filter((c) => c.reviewStatus === filter.status);
    }
    if (filter?.category) {
      list = list.filter((c) => c.candidateCategory === filter.category);
    }
    if (filter?.district) {
      list = list.filter(
        (c) => c.approximateLocation.district?.toLowerCase() === filter.district?.toLowerCase()
      );
    }
    if (filter?.isSynthetic !== undefined) {
      list = list.filter((c) => c.isSynthetic === filter.isSynthetic);
    }

    return list.sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());
  }

  async getById(candidateId: string): Promise<DiscoveryCandidate | null> {
    const c = this.candidates.get(candidateId);
    return c ? { ...c } : null;
  }

  async findByContentHash(hash: string): Promise<DiscoveryCandidate | null> {
    for (const c of this.candidates.values()) {
      if (c.contentHash === hash) return { ...c };
    }
    return null;
  }

  async create(candidate: DiscoveryCandidate): Promise<DiscoveryCandidate> {
    this.candidates.set(candidate.candidateId, { ...candidate });
    return { ...candidate };
  }

  async updateReview(
    candidateId: string,
    update: {
      status: CandidateReviewStatus;
      reviewedBy: string;
      notes?: string;
      incidentReference?: string;
    }
  ): Promise<DiscoveryCandidate | null> {
    const existing = this.candidates.get(candidateId);
    if (!existing) return null;

    const updated: DiscoveryCandidate = {
      ...existing,
      reviewStatus: update.status,
      reviewedBy: update.reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewNotes: update.notes ?? existing.reviewNotes,
      incidentReference: update.incidentReference ?? existing.incidentReference,
    };

    this.candidates.set(candidateId, updated);
    return { ...updated };
  }

  async countByStatus(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {
      total: this.candidates.size,
      new: 0,
      under_review: 0,
      verified: 0,
      rejected: 0,
      duplicate: 0,
      converted_to_incident: 0,
    };

    for (const c of this.candidates.values()) {
      if (counts[c.reviewStatus] !== undefined) {
        counts[c.reviewStatus]++;
      }
    }
    return counts;
  }
}

export class MongoCandidateRepository implements ICandidateRepository {
  private collectionName = "discovery_candidates";

  async listCandidates(filter?: CandidateFilter): Promise<DiscoveryCandidate[]> {
    const db = await getDb();
    const query: Record<string, unknown> = {};

    if (filter?.status) query.reviewStatus = filter.status;
    if (filter?.category) query.candidateCategory = filter.category;
    if (filter?.district) query["approximateLocation.district"] = filter.district;
    if (filter?.isSynthetic !== undefined) query.isSynthetic = filter.isSynthetic;

    const docs = await db
      .collection(this.collectionName)
      .find(query)
      .sort({ discoveredAt: -1 })
      .toArray();

    return docs.map((d: any) => {
      const { _id, ...rest } = d;
      return rest as DiscoveryCandidate;
    });
  }

  async getById(candidateId: string): Promise<DiscoveryCandidate | null> {
    const db = await getDb();
    const doc = await db.collection(this.collectionName).findOne({ candidateId });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest as DiscoveryCandidate;
  }

  async findByContentHash(hash: string): Promise<DiscoveryCandidate | null> {
    const db = await getDb();
    const doc = await db.collection(this.collectionName).findOne({ contentHash: hash });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest as DiscoveryCandidate;
  }

  async create(candidate: DiscoveryCandidate): Promise<DiscoveryCandidate> {
    const db = await getDb();
    await db.collection(this.collectionName).insertOne({ ...candidate });
    return candidate;
  }

  async updateReview(
    candidateId: string,
    update: {
      status: CandidateReviewStatus;
      reviewedBy: string;
      notes?: string;
      incidentReference?: string;
    }
  ): Promise<DiscoveryCandidate | null> {
    const db = await getDb();
    const now = new Date().toISOString();
    const setUpdates: Record<string, unknown> = {
      reviewStatus: update.status,
      reviewedBy: update.reviewedBy,
      reviewedAt: now,
    };
    if (update.notes !== undefined) setUpdates.reviewNotes = update.notes;
    if (update.incidentReference !== undefined) setUpdates.incidentReference = update.incidentReference;

    const res = await db.collection(this.collectionName).findOneAndUpdate(
      { candidateId },
      { $set: setUpdates },
      { returnDocument: "after" }
    );
    if (!res) return null;
    const { _id, ...rest } = res;
    return rest as DiscoveryCandidate;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const db = await getDb();
    const counts: Record<string, number> = {
      total: 0,
      new: 0,
      under_review: 0,
      verified: 0,
      rejected: 0,
      duplicate: 0,
      converted_to_incident: 0,
    };

    const agg = await db
      .collection(this.collectionName)
      .aggregate([{ $group: { _id: "$reviewStatus", count: { $sum: 1 } } }])
      .toArray();

    for (const item of agg) {
      if (counts[item._id] !== undefined) {
        counts[item._id] = item.count;
      }
      counts.total += item.count;
    }

    return counts;
  }
}

export function getCandidateRepository(): ICandidateRepository {
  if ((globalThis as any)._umeedCandidateRepo) {
    return (globalThis as any)._umeedCandidateRepo;
  }

  const env = getServerEnv();
  let instance: ICandidateRepository;
  if (isMongoConfigured(env.MONGODB_URI)) {
    instance = new MongoCandidateRepository();
    logger.info("Using MongoDB Atlas Candidate Repository", "DISCOVERY_CANDIDATE_REPO");
  } else {
    instance = new InMemoryCandidateRepository();
    logger.warn("Using InMemoryCandidateRepository (DEMO / EPHEMERAL)", "DISCOVERY_CANDIDATE_REPO");
  }

  (globalThis as any)._umeedCandidateRepo = instance;
  return instance;
}

export function setCandidateRepository(repo: ICandidateRepository | null): void {
  (globalThis as any)._umeedCandidateRepo = repo;
}
