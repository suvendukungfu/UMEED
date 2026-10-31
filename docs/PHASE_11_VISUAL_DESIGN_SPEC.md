# UMEED Discovery Intelligence — Visual Design & Brand Specification

**Phase**: 11  
**Track**: HackCBS 9.0 — Meko Track A  
**Status**: VERIFIED & OPERATIONAL  
**Author**: Creative Director & Staff Frontend Engineer  

---

## 1. Aesthetic Identity: Civic Editorial × Humanitarian Intelligence

UMEED rejects both generic neon SaaS dashboards and sensationalized disaster imagery. The visual system balances the gravitas of a humanitarian mission control with the dignity of an investigative broadsheet.

### Palette Architecture:
- **Warm Paper (`#F4F1EA`)**: Background surfaces providing high optical comfort and warm humanitarian warmth.
- **Paper Surface (`#FFFFFF` / `#FAF8F5`)**: Elevated card backgrounds with subtle borders (`#E5E0D5`).
- **Forest Ink (`#18392F`)**: Deep green-black typography, headers, and mission-control sidebars.
- **Signal Coral (`#E36F50`)**: High-priority alert states, action CTAs, and active radar blips.
- **Soft Sage (`#D8E2D8`)**: Subdued secondary badges, status accents, and radar sweep circles.
- **Deep Forest (`#0D201A` / `#081410`)**: Mission control sidebar and dark radar surfaces.

---

## 2. Original Vector Visual Assets

All visual assets in Phase 11 are original, custom-crafted SVG illustrations designed specifically for UMEED without external hotlinking or unlicensed stock photography:

1. **`HeroIllustration.tsx`**: Radial humanitarian intelligence architecture diagram showing:
   - Central UMEED hub
   - Public Signal Discovery antenna
   - Gemini 2.5 Flash Multimodal Triage node
   - Meko Shared Memory loop node
   - Field Responder Ambulance dispatch node
   - Receiving Hospital / Shelter Handoff Gate
2. **`DiscoveryRadarVisual.tsx`**: High-contrast radar scope displaying:
   - Polar coordinate sweeps in Forest and Coral
   - Active signal blips mapped to Delhi districts (NW-Rohini, N-Kashmere Gate, SE-Okhla, SW-Dwarka)
   - Real-time signal relevance score badges (`Score 88`, `Score 92`, `Score 84`)

---

## 3. Responsive & Accessible Motion Guidelines

- **Restrained Transitions**: Standard interactive transitions are bounded to 150ms–200ms (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Reduced Motion Support**: All radar pulses and ping animations gracefully honor `prefers-reduced-motion: reduce`.
- **Contrast Ratios**: All text elements exceed WCAG 2.1 AA requirements (minimum 4.5:1 on light paper backgrounds, and > 7:1 on dark forest panels).
