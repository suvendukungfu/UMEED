# UMEED Discovery Intelligence — Open Source Data Catalog & Registry Specification

**Phase**: 11  
**Track**: HackCBS 9.0 — Meko Track A  
**Status**: VERIFIED & OPERATIONAL  
**Author**: Data Integration Engineer  

---

## 1. Registry Purpose & Scope

The Discovery Source Registry (`/discovery/sources`) catalogues approved public sources authorized for automated discovery crawls. It strictly prohibits arbitrary internet scrapers by enforcing an explicit source whitelist and licensing verification.

---

## 2. Seed Approved Public Sources

The system seeds 5 realistic, approved sources with verifiable licenses and robots policies:

| Source ID | Name | Domain | Type | License | Owner | Status |
|---|---|---|---|---|---|---|
| `src_ogd_delhi_shelter` | Open Government Data (data.gov.in) — Delhi Shelters | `data.gov.in` | Open Dataset | Government Open Data License (India) | MeitY | Approved / Healthy |
| `src_delhi_animal_welfare` | Delhi Animal Welfare Public Rescue Feed | `delhianimalwelfare.org` | RSS Feed | CC BY 4.0 International | Delhi Animal Welfare Network | Approved / Healthy |
| `src_dusib_delhi_alerts` | DUSIB Winter Relief & Emergency Sanctuaries | `delhishelterboard.in` | Approved HTML | Public Domain Government Info | Delhi Urban Shelter Improvement Board | Approved / Healthy |
| `src_goonj_relief_bulletin` | Goonj Community Assistance Bulletins | `goonj.org` | RSS Feed | Public Educational Attribution | Goonj Foundation | Approved / Healthy |
| `src_synthetic_test_source` | UMEED Controlled Discovery Canary (DEMO) | `demo.umeed.internal` | RSS Feed | UMEED Synthetic Benchmark | UMEED Engineering | Approved / DEMO DATA |

---

## 3. Source Onboarding & Lifecycle Workflow

Every new source undergoes an 8-step compliance lifecycle:

1. **Submission**: Operator inputs Name, Domain, Homepage URL, Feed/Sitemap URL, and Description.
2. **SSRF Pre-Validation**: Domain is tested against SSRF guard (rejects private IPs, loopbacks, internal hostnames).
3. **Robots.txt Inspection**: Pre-checks target domain's `/robots.txt` for disallow directives affecting `UMEED-DiscoveryBot`.
4. **License & Terms Check**: Verifies that content license permits automated retrieval and reference.
5. **Crawl Budget Allocation**: Sets `maxPagesPerRun` (default: 10) and `requestsPerMinute` (default: 10).
6. **Coordinator Approval**: Requires authorized coordinator credential (`x-coordinator-key` or session) to activate.
7. **Health Tracking**: Automatically tracks `lastCrawledAt`, `lastSuccessAt`, `lastErrorAt`, and `consecutiveFailures`.
8. **Pause / Resume**: Operators can instantly pause any source encountering upstream issues without losing registry history.

