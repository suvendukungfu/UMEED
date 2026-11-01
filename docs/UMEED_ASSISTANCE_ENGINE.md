# UMEED — Core Assistance and Matching Engine Specification
**Version**: 2.0.0  
**Classification**: Core Engine Specification  

---

## 1. Multi-Stage Matching Architecture

The Core Assistance Engine resolves assistance requirements through a multi-stage filtering and scoring pipeline:

```
[ All Registered Entities in DB ]
               |
               v Stage 1: Partner Eligibility Filter
[ Accredited UMEED Partners (isUmeedPartner: true, ACTIVE) ]
               |
               v Stage 2: Service Capability Hard Filter
[ Matches Incident Category & Subject (e.g. injured_animal, stray_dog) ]
               |
               v Stage 3: Geographic Boundary & Radius Filter
[ Operating District Match OR Within Service Radius (Haversine Distance) ]
               |
               v Stage 4: Capacity & Workload Filter
[ Available Responders > 0 & Capacity Status !== FULL ]
               |
               v Stage 5: Multi-Factor Ranking Engine
[ Ranked Candidates with Explainable Score Rationale ]
               |
               v Stage 6: Time-Bound Wave Outreach
[ Top N Candidates Dispatched via Notification Outbox ]
```

---

## 2. Multi-Factor Scoring Formula

Every eligible candidate is assigned an explainable score between 0 and 100:

$$\text{FinalScore} = 0.35 \cdot S_{\text{capability}} + 0.25 \cdot S_{\text{geo}} + 0.20 \cdot S_{\text{capacity}} + 0.20 \cdot S_{\text{reliability}}$$

Where:
- $S_{\text{capability}}$: Direct category match (100) + specialised capability bonus (e.g. animal ambulance with hydraulic winch).
- $S_{\text{geo}}$: Based on geodesic distance:
  - Inside operational district: base 80 + distance proximity bonus (up to 20).
  - Outside district but within service radius: linear degradation from 80 to 20 based on km distance.
- $S_{\text{capacity}}$: `HIGH` (100), `MODERATE` (75), `NEAR_CAPACITY` (40), `UNKNOWN` (20), `FULL` (0 — disqualified).
- $S_{\text{reliability}}$: Historical response rate and SLA compliance ratio.

---

## 3. Escalation & Watchdog Cycles

When no suitable partner accepts within the configured SLA window:
1. Wave 1 expires (`OUTREACH_TIMEOUT`).
2. Wave 2 candidates are dispatched if available.
3. If max cycles (default 3) are reached or zero candidates exist, requirement transitions immediately to `HUMAN_REVIEW` with an alert event to the humanitarian coordinator.
4. The system never silently closes or assigns cases to unverified partners.
