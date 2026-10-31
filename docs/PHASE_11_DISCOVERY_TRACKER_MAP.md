# UMEED Discovery Intelligence — Discovery Tracker & Geospatial Map Specification

**Phase**: 11  
**Track**: HackCBS 9.0 — Meko Track A  
**Status**: VERIFIED & OPERATIONAL  
**Author**: Senior Geospatial & Full-Stack Engineer  

---

## 1. Overview & Map Architecture

The Discovery Tracker and Geospatial Map provides coordinators with a live operational overview of all detected public distress signals across the National Capital Territory of Delhi.

### Tech Stack & Components:
- **Renderer**: MapLibre GL JS (open-source WebGL vector/raster client engine).
- **Tile Layer**: OpenStreetMap raster tiles with full attribution (`&copy; OpenStreetMap contributors`).
- **Client Boundary**: Dynamically imported client-side component (`DiscoveryMap.tsx`) with WebGL fallback and accessible table view.
- **Privacy Standard**: All markers render approximate district centroids rounded to 2 decimal places. No private residential coordinates or individual citizen addresses are mapped.

---

## 2. Interactive Map Capabilities

1. **Center & Default Bounds**: Default view centered on Delhi NCR (`[77.2090, 28.6139]`, zoom `10.2`).
2. **Auto-fit Bounds**: Dynamically fits viewport bounds when candidates are loaded or filtered.
3. **Color-Coded Visual Markers**:
   - **Signal Coral (`#E36F50`)**: Strong Candidates (Score ≥ 80).
   - **Signal Amber (`#F59E0B`)**: Possible Signals (Score 50–79).
   - **Forest Ink (`#18392F`)**: Verified / Ingested Incidents.
4. **Interactive Popups**: Clicking any pin displays candidate title, approximate district, score, and an inspection trigger.
5. **Two-Way Synchronization**: Clicking a row in the candidate table highlights and centers the corresponding pin on the map; selecting a pin on the map opens the candidate detail inspection drawer.

---

## 3. Coordinator Verification & Ingestion Gate

A candidate is never automatically an active incident. The coordinator workflow:

1. **Inspect Provenance**: Coordinator reviews original source title, extracted excerpt, source URL, and SHA-256 fingerprint.
2. **Review Action**:
   - `Verify Signal`: Marks candidate as `verified`.
   - `Reject`: Marks candidate as `rejected` (false positive / commercial spam).
   - `Convert to Incident`: Calls `POST /api/discovery/candidates/:id/convert-to-incident`.
3. **Conversion Pipeline**:
   - Ingests into canonical `IncidentService` with `source_type: "social_media_discovery"`.
   - Requires `requires_human_review: true` so the newly created incident enters human review gate.
   - Links the generated public reference (e.g. `UMD-FEA5-18C9`) back to the candidate record.
   - Idempotent: Subsequent calls safely return existing incident reference with `idempotent: true`.

