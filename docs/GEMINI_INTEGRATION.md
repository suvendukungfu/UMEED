# UMEED Gemini Multimodal Incident Triage Engine — Technical Specification

**System**: UMEED (AI-Powered Social Distress Discovery & Coordination)  
**Component**: Phase 3 Multimodal AI Triage Engine  
**Package**: `@google/genai@2.32.0`  
**Status**: IMPLEMENTED & VERIFIED  

---

## 1. Architectural Overview

The UMEED AI Triage Engine utilizes Google Gemini Multimodal models (`gemini-2.5-flash` by default, with `gemini-1.5-flash` and `gemini-2.5-pro` supported) to assist human coordinators in reviewing incoming citizen reports and crawler discoveries.

```
                      CITIZEN / CRAWLER REPORT
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ POST /api/incidents/  │
                     │        ingest         │
                     └──────────┬────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │ Atomic Persistence                            │ Fail-Soft AI Triage
        ▼                                               ▼
┌──────────────┐                             ┌────────────────────────┐
│  MongoDB /   │                             │  GeminiTriageService   │
│  In-Memory   │                             │   (Multimodal API)     │
└──────────────┘                             └──────────┬─────────────┘
        ▲                                               │ Structured JSON
        │                                               ▼
        │                              ┌────────────────────────────────┐
        │                              │ Zod Validation via             │
        │                              │ GeminiTriageOutputSchema       │
        │                              └────────┬──────────────┬────────┘
        │                                       │ Valid        │ Invalid / Error
        │                                       ▼              ▼
        │                              ┌────────────────┐ ┌─────────────┐
        │                              │ SUCCESS        │ │ MANUAL_     │
        │                              │ Analysis Doc   │ │ REVIEW_REQ  │
        │                              └────────┬───────┘ └──────┬──────┘
        │                                       │                │
        └───────────────────────────────────────┴────────────────┘
                                                │
                                                ▼
                               ┌─────────────────────────────────┐
                               │ Human Coordinator Split UI      │
                               │ /incidents Review Workspace     │
                               │ [Confirm | Override | Reject]   │
                               └─────────────────────────────────┘
```

---

## 2. Core Principles & Non-Negotiable Invariants

1. **AI is an Assistant, Never the Final Authority**:
   - Triage models suggest urgency and categorize observable facts.
   - Dispatch of first responders and assistance approval remain exclusively human responsibilities.
   - All triage results enforce `urgency.requires_human_review: true`.

2. **Zero-Harm Data Boundaries**:
   - Visual understanding only extracts directly observable physical facts.
   - **Prohibited Inferences**:
     - No medical or veterinary clinical diagnosis.
     - No facial recognition or personal identity extraction.
     - No inference of homelessness or poverty from clothes or appearance alone.
     - No claims regarding the authenticity, provenance, or manipulation of photographic media.

3. **Fail-Soft Operational Continuity**:
   - If Gemini is unconfigured (`GEMINI_API_KEY` missing), rate-limited (HTTP 429), times out (15s default), or returns non-compliant output, the system generates a well-formed `MANUAL_REVIEW_REQUIRED` triage record.
   - Incident persistence and citizen tracking are **never aborted or blocked** by AI service availability.

---

## 3. Module Structure (`apps/web/src/lib/ai/gemini/`)

| File | Purpose |
| ------ | --------- |
| `models.ts` | Supported Gemini models (`gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-2.5-pro`) and default configuration. |
| `schemas.ts` | Strict Zod structured output schema (`GeminiTriageOutputSchema`), bounding enum types, array sizes, and confidence numbers. |
| `prompts.ts` | System prompt instruction with explicit ethical guardrails, allowed categories, and prompt injection defenses. |
| `client.ts` | Factory for initializing Google Gen AI SDK client (`@google/genai`) using server environment variables. |
| `errors.ts` | Typed exception hierarchy (`GeminiConfigError`, `GeminiQuotaError`, `GeminiTimeoutError`, `GeminiValidationError`, etc.). |
| `triage.service.ts` | Principal triage orchestrator: payload building, multimodal image inline attachment, timeout racing, and fail-soft fallback. |
| `evaluation.ts` | 9-scenario synthetic evaluation benchmark runner computing schema validity, accuracy, and safety metrics. |
| `index.ts` | Clean public barrel re-exporting the entire AI triage engine module. |

---

## 4. Structured Output Contract

Gemini returns structured JSON enforced by `responseMimeType: "application/json"` and validated by `GeminiTriageOutputSchema`:

```typescript
export interface GeminiTriageOutput {
  incident_category: IncidentType;
  subject_type: IncidentSubjectType;
  observable_evidence: Array<{
    observation: string;
    evidence_reference: string;
    confidence: number; // 0.0 - 1.0
  }>;
  possible_assistance: string[];
  urgency_recommendation: {
    level: "unconfirmed" | "routine" | "elevated" | "urgent" | "emergency_review";
    reasoning: string[];
    requires_human_review: true;
  };
  location_candidates: string[];
  missing_information: string[];
  limitations: string[];
  model_metadata?: {
    model_id: string;
    prompt_version: string;
    latency_ms?: number;
  };
}
```

---

## 5. API Endpoints

### 5.1 POST `/api/incidents/:publicReference/triage`

Coordinator-authenticated on-demand trigger to execute or re-run multimodal AI triage for an incident.

- **Headers**: `x-coordinator-key: <key>`
- **Response**:

```json
{
  "status": "success",
  "data": {
    "public_reference": "UMD-4DB9-473D",
    "triage_analysis": { ... }
  }
}
```

### 5.2 POST `/api/incidents/:publicReference/review`

Coordinator-authenticated human review decision recording.

- **Headers**: `x-coordinator-key: <key>`
- **Request Body**:

```json
{
  "decision": "CONFIRM", // "CONFIRM" | "OVERRIDE" | "REJECT" | "REQUEST_INFO" | "ESCALATE"
  "reason": "Verified photographic evidence and confirmed distress priority.",
  "reviewer_id": "coord_staff_01",
  "override_category": "medical_assistance", // Optional
  "override_urgency": "urgent" // Optional
}
```

- **Response**: Sanitized coordinator incident record with updated status and audit trail.

### 5.3 GET `/api/ai/evaluation`

Coordinator-authenticated benchmark evaluation runner executing the 9 synthetic validation scenarios.

- **Headers**: `x-coordinator-key: <key>`
- **Response**:

```json
{
  "status": "success",
  "data": {
    "total_scenarios": 9,
    "schema_valid_rate": 1.0,
    "category_accuracy": 0.89,
    "false_emergency_escalation_rate": 0.0,
    "missing_information_extraction_rate": 1.0,
    "grounding_in_evidence_rate": 1.0,
    "failure_handling_rate": 1.0,
    "timestamp": "2026-10-31T14:15:00.000Z",
    "scenario_results": [ ... ]
  }
}
```
