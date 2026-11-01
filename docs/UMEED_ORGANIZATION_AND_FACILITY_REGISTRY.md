# UMEED — Organization and Facility Registry Specification
**Version**: 2.0.0  
**Classification**: Data Architecture Standard  

---

## 1. Registry Architecture

The UMEED Registry decouples the legal/operating organizations from the physical service facilities where humanitarian care or shelter is delivered.

```
+---------------------------------------+
|          ORGANIZATION ENTITY          |
|  - legalName, kind, darpanId          |
|  - isUmeedPartner (true/false)        |
|  - verificationState                  |
+---------------------------------------+
                   |
                   | 1:N Verified Relationships
                   v
+---------------------------------------+
|         PROVIDER RELATIONSHIP         |
|  - relationshipType: OPERATED_BY,     |
|    MANAGED_BY, GOVERNMENT_CONTROLLED  |
+---------------------------------------+
                   |
                   v
+---------------------------------------+
|       SERVICE FACILITY ENTITY         |
|  - facilityName, facilityType         |
|  - location: Point [lng, lat]         |
|  - capacity (beds/kennels/slots)      |
|  - isReferralDestinationOnly          |
+---------------------------------------+
```

---

## 2. Delhi Baseline Facilities

The platform includes seed records for Delhi NCR facilities, preserving strict statutory provenance:

1. **Friendicoes SECA Emergency Shelter** (`fac_defence_colony_animal_hospital`)
   - Type: `VETERINARY_HOSPITAL`
   - Operator: `org_friendicoes_seca` (`OPERATED_BY`)
   - Verification: `SOURCE_VERIFIED`
   - Location: Defence Colony, South Delhi (GPS direct: `[77.2345, 28.5714]`)

2. **Sanjay Gandhi Animal Care Centre (SGACC)** (`fac_sgacc_raja_garden`)
   - Type: `ANIMAL_SHELTER`
   - Operator: `org_sgacc_society` (`OPERATED_BY`)
   - Location: Raja Garden, West Delhi (`[77.1215, 28.6534]`)

3. **JPN Apex Trauma Centre, AIIMS** (`fac_aiims_jpn_trauma_centre`)
   - Type: `TRAUMA_CENTRE`
   - Controlling Agency: `gov_aiims_new_delhi` (`GOVERNMENT_CONTROLLED`)
   - Operating Mode: `isReferralDestinationOnly = true` (Public emergency referral destination; not an NGO partner)
   - Location: Safdarjung Enclave, Ring Road, South Delhi (`[77.1952, 28.5678]`)

4. **DUSIB Rain Basera Night Shelters** (`fac_dusib_kashmere_gate_shelter`, `fac_dusib_sarai_kale_khan`)
   - Type: `NIGHT_SHELTER`
   - Funding Agency: `gov_dusib_delhi` (`GOVERNMENT_CONTROLLED`)
   - Management Agencies: AAA (`org_aashray_adhikar_abhiyan`) and Prayas (`org_prayas_jac_society`) via statutory tenders

---

## 3. Data Provenance Schema

Every facility and organization record must track verifiable source provenance:
```ts
interface DataProvenance {
  sourceName: string;
  sourceUrl: string;
  sourceType: "OFFICIAL_GOVERNMENT" | "ORGANIZATION_OFFICIAL" | "AUTHORIZED_DIRECTORY" | "OTHER_PUBLIC_SOURCE";
  retrievedAt: string;
  lastReviewedAt?: string;
  verificationMethod: string;
  reviewerId?: string;
  evidenceReference?: string;
  conflictNotes?: string;
}
```
Records must never be overwritten with unverified synthetic data.
