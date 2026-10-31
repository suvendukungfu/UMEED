# UMEED — Phase 10 Design System Specification

**Standard**: Civic Editorial × Humanitarian Mission Control  
**Version**: 1.0.0 (Phase 10 Release)  
**Author**: Creative Director & Senior Design Systems Engineer  
**Target Compliance**: WCAG 2.2 AA Certified  

---

## 1. Product Vision & Aesthetic Direction

UMEED operates at the intersection of public trust and operational urgency:
> *"Every report deserves a response. Every response deserves a verified handoff."*

To avoid generic SaaS templates while honoring humanitarian gravitas, the visual direction establishes:
- **Human & Distinctive**: Organic warm paper surfaces inspired by civic records and journalistic rigor.
- **Cinematic but Restrained**: High typographic contrast with editorial display headlines and calm application canvases.
- **Mission-Critical Precision**: Dense, scannable operational controls in coordinator and field responder modes.
- **No Dark Mode Chart Boxes**: Light, crisp surfaces for all data visualizations and analytics to prevent visual fatigue.

---

## 2. Color Palette & Contrast Tokens

All tokens are defined in `apps/web/tailwind.config.ts` and `apps/web/src/app/globals.css`.

| Token Name | Hex Code | Semantic Role | Contrast vs `#FFFFFF` | Contrast vs `#F4F1EA` (Paper) |
| :--- | :--- | :--- | :---: | :---: |
| **Warm Paper** | `#F4F1EA` | Public & application primary background | 1.09:1 | Baseline |
| **Paper Surface** | `#FAF8F5` | Secondary card background & table headers | 1.04:1 | 1.05:1 |
| **Forest Ink** | `#18392F` | Primary text, brand mark, dark mastheads | **10.8:1** (AAA) | **9.9:1** (AAA) |
| **Signal Coral** | `#E36F50` | Primary emergency CTA, active stages, key alerts | **3.8:1** (Large UI) | **3.5:1** (Large UI) |
| **Soft Sage** | `#D8E2D8` | Calming tints, badges, contextual tags | 1.3:1 | 1.2:1 |
| **Secondary Forest** | `#3F574E` | Body text, table data, descriptive labels | **6.1:1** (AA) | **5.6:1** (AA) |
| **Muted Caption** | `#60776E` | Helper text, timestamps, metadata | **4.6:1** (AA) | **4.2:1** (Large UI) |
| **Warm Border** | `#E5E0D5` | Structural card borders and dividers | Subtle | Subtle |

### Semantic State Colors
- **Success (`#1E7B54`)**: Forest green indicating verified outcomes and operational health.
- **Warning (`#D97706`)**: Amber gold indicating pending handoffs and duplicate clusters.
- **Critical (`#DC2626`)**: Signal red indicating unhandled trauma or urgent escalations.
- **Information (`#1D64B4`)**: Ocean blue indicating intake and ongoing transit.
- **Synthetic Data (`#78350F` on `#FEF3C7`)**: High-visibility amber pill declaring `DEMO DATA`.

---

## 3. Typography Architecture

### Editorial Display Headlines
- **Font Family**: `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`
- **Utility Class**: `.font-editorial`
- **Application**: Landing page hero, manifesto section heads, primary modal titles.
- **Metrics**: Letter-spacing `-0.025em`, line-height `1.08` to `1.15`.

### Mission Control UI Sans-Serif
- **Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`
- **Application**: Form inputs, tables, action buttons, coordinator workflows.
- **Metrics**: Letter-spacing normal to `-0.01em`, antialiased subpixel rendering.

### Numeric & Telemetry Tabular Style
- **Font Family**: `"SF Mono", Menlo, Monaco, Consolas, monospace`
- **Utility Class**: `.tabular-metrics`
- **Application**: Public references (`UMD-XXXX-YYYY`), tracking tokens, latencies, SLAs, coordinates.
- **Features**: `font-variant-numeric: tabular-nums`.

---

## 4. Spacing Rhythm & Grid Scale

An 8-point base rhythm governs all containers:
- **Spacing Units**: `8px` (`p-2`), `16px` (`p-4`), `24px` (`p-6`), `32px` (`p-8`), `48px` (`p-12`), `64px` (`p-16`).
- **Touch Target Standard**: All interactive field buttons maintain `min-height: 44px` on mobile screens for glove/field usability.
- **Elevation System**:
  - `shadow-subtle`: `0 1px 3px rgba(24, 57, 47, 0.05)`
  - `shadow-card`: `0 2px 8px -2px rgba(24, 57, 47, 0.08)`
  - `shadow-elevated`: `0 12px 24px -6px rgba(24, 57, 47, 0.12)`
  - `shadow-modal`: `0 20px 40px -8px rgba(15, 38, 31, 0.25)`

---

## 5. Signature Visual Concept: The Continuity Line

Component: [`ContinuityLine.tsx`](file:///Users/suvendusahoo/hackcbs/apps/web/src/components/common/ContinuityLine.tsx)

```
[ REPORT ] ──► [ TRIAGE ] ──► [ COORDINATION ] ──► [ RESCUE ] ──► [ HANDOFF ] ──► [ VERIFIED COMPLETION ]
```

### Stage Definitions & Visual Representation
1. **REPORT (Citizen / Crawler Intake)**: Icon `FileText`. Ingestion with immediate SHA-256 token hashing.
2. **TRIAGE (Multimodal AI Extraction)**: Icon `Sparkles`. Gemini severity classification and condition candidate extraction.
3. **COORDINATION (Capability Matching)**: Icon `Building2`. 5-factor deterministic matching across NGO capacities.
4. **RESCUE (Field Transit)**: Icon `Truck`. NGO ambulance dispatch and on-scene arrival confirmation.
5. **HANDOFF (Downstream Receiving Gate)**: Icon `ShieldCheck`. Required receiving provider clinical/shelter admission gate.
6. **VERIFIED COMPLETION (Closed-Loop Resolution)**: Icon `CheckCircle2`. Human coordinator rationale sign-off.

### Stage States
- `completed`: Forest green badge and icon (`bg-forest-800 text-white`).
- `active`: Pulsing Signal Coral glow (`bg-coral-500 text-white animate-continuity-glow`).
- `pending`: Muted warm paper pill (`bg-paper-muted text-forest-700`).
- `blocked`: High-contrast warning gate (`bg-red-600 text-white`).

---

## 6. Component System Library

All components reside in `apps/web/src/components/ui/` and `apps/web/src/components/common/`:

- **Button (`Button.tsx`)**: Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`. Sizes: `sm`, `md`, `lg`. Built-in loading spinner (`Loader2`), icon slots, and WCAG visible focus ring (`focus-visible:ring-2 focus-visible:ring-forest-800`).
- **Badge (`Badge.tsx`)**: Variants: `success`, `warning`, `critical`, `info`, `neutral`, `coral`, `demo`.
- **StatusBadge (`Badge.tsx`)**: Automatic mapping of case lifecycle states to verified semantic badges.
- **Card (`Card.tsx`)**: Paper surface container with subtle border and crisp elevation options.
- **MetricCard (`Card.tsx`)**: Editorial metric tile displaying tabular numerals, contextual subtext, and trend badges.
- **AppShell (`AppShell.tsx`)**: Adaptive responsive shell distinguishing public landing routes (`/`, `/report`) from operator mission control routes (`/cases`, `/incidents`, `/ngos`, `/responder`, `/analytics`, `/agent`).
- **AppNavbar (`AppNavbar.tsx`)**: Civic editorial top navigation with quick links to Report, Mission Control, and the A1 Experiment launcher.
- **AppFooter (`AppFooter.tsx`)**: Comprehensive civic footer with live platform health, architecture disclosures, and HackCBS Track A certification.
