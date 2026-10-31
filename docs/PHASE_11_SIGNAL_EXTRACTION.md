# UMEED Discovery Intelligence — Distress Signal Extraction & AI Classification Specification

**Phase**: 11  
**Track**: HackCBS 9.0 — Meko Track A  
**Status**: VERIFIED & OPERATIONAL  
**Author**: Senior AI Systems Engineer  

---

## 1. Overview & Extraction Principles

The Distress Signal Extraction pipeline converts unstructured, untrusted public web pages and announcements into structured, de-duplicated, and categorized **Discovery Candidates**.

### Key System Guardrails:
1. **Passive Data Boundary**: Crawled web pages are treated strictly as untrusted external data. Text from scraped sources is never executed, cannot invoke internal tools, and is shielded from prompt injection attacks.
2. **Deterministic Baseline + AI Enhancement**: System incorporates a deterministic heuristic classification engine that executes offline or when Gemini keys are unconfigured, providing 100% operational resilience.
3. **Canonical Taxonomy Alignment**: Extracted categories map strictly into the 8 canonical values of `@umeed/contracts` [`IncidentTypeSchema`](file:///Users/suvendusahoo/hackcbs%20/packages/contracts/src/incident.ts):
   - `injured_animal`
   - `abandoned_animal`
   - `homeless_person`
   - `abandoned_elderly_person`
   - `medical_assistance`
   - `food_assistance`
   - `shelter_assistance`
   - `other`

---

## 2. Extraction Pipeline Stages

1. **Title & Excerpt Extraction**: OpenGraph tags (`og:title`, `og:description`), HTML title tags, and cleaned body excerpts bounded to 1,000 characters.
2. **SHA-256 Fingerprint Deduplication**: Deterministic hash generated over normalized text. Exact duplicates are recorded in crawl run metrics and skipped without creating duplicate candidates.
3. **Geospatial Location Detection & Privacy Coarsening**:
   - Matches 11 Delhi revenue districts and notable localities (Rohini, Kashmere Gate, Saket, Dwarka, Paharganj, Okhla, Seelampur, etc.).
   - Protects beneficiary privacy by mapping to district centroids and rounding to 2 decimal places (~1.1 km area representation). Exact personal coordinates or residential addresses are strictly omitted.
4. **Distress Scoring & Classification**:
   - Analyzes distress keywords (fractures, hit-and-run, hypothermia, cold wave exposure, senior abandonment, food insecurity).
   - Produces a **Signal Score** from `0` to `100` and assigns a **Signal Relevance** grade:
     - `strong_candidate` (Score ≥ 80): Immediate coordinator attention recommended.
     - `possible_signal` (Score 50–79): Potential humanitarian need requiring verification.
     - `low` (Score < 50): Informational or unconfirmed public post.
5. **Prompt Injection Defense**:
   - If calling Google Gemini 2.5 Flash, external text is quarantined inside `<untrusted_web_content>` tags.
   - System instructions explicitly forbid following commands, revealing secrets, or escaping JSON output boundaries.
   - Gemini outputs are parsed and validated via a strict Zod schema; malformed outputs fall back instantly to heuristic classification.

---

## 3. Discovery Candidate Data Contract

```typescript
export interface DiscoveryCandidate {
  candidateId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  canonicalUrl: string;
  sourceTitle: string;
  sourcePublishedAt: string | null;
  discoveredAt: string;
  fetchedAt: string;
  contentHash: string; // SHA-256
  excerpt: string;
  summary: string;
  candidateCategory: IncidentType;
  extractedLocationText: string | null;
  approximateLocation: {
    latitude: number | null;
    longitude: number | null;
    district: string | null;
    state: string | null;
  };
  locationPrecision: LocationPrecision;
  locationConfidence: number;
  signalScore: number;
  signalRelevance: SignalRelevance;
  classificationReasons: string[];
  extractionVersion: string;
  reviewStatus: CandidateReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  incidentReference: string | null;
  duplicateGroupId: string | null;
  isSynthetic: boolean;
}
```
