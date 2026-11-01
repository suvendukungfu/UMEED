# UMEED — Partner Onboarding and Operational Readiness
**Version**: 2.0.0  
**Classification**: Partner Operations Manual  

---

## 1. The 12-Step Partner Onboarding Pipeline

To ensure that only verified, legitimate organizations receive dispatched cases, UMEED enforces a 12-step verification and accreditation pipeline:

```
[ Step 1: Legal Identity & Authorized Representative Verification ]
       |
       v
[ Step 2: Statutory Registration (Societies Act / Trust / Sec 8 / Darpan ID) ]
       |
       v
[ Step 3: Verified Service Capabilities Declaration (Categories & Ambulances) ]
       |
       v
[ Step 4: Geographic Service Coverage (Wards & Operating Districts) ]
       |
       v
[ Step 5: Depot & Physical Facility Entrance GPS Verification ]
       |
       v
[ Step 6: Initial Capacity & Fleet Declaration ]
       |
       v
[ Step 7: Document Upload (Registration Certificate, 12A/80G, FCRA if applicable) ]
       |
       v
[ Step 8: Formal Application Submission ]
       |
       v
[ Step 9: Sanctions & Background Verification Check ]
       |
       v
[ Step 10: Humanitarian Coordinator Field Audit ]
       |
       v
[ Step 11: Platform Administrator Formal Sign-Off (POST /api/admin/organizations/[id]/verify) ]
       |
       v
[ Step 12: Active Matching Eligibility (`isUmeedPartner: true`, `CAPACITY_CONFIRMED`) ]
```

---

## 2. Hard Eligibility Disqualification Filters

The Core Assistance Engine enforces strict disqualification rules:

An organization is immediately disqualified from receiving outreach if any of the following apply:
1. `isUmeedPartner !== true` (Public discovery records or unapproved applications).
2. `verificationState !== "PARTNER_ONBOARDED"` and `verificationState !== "CAPACITY_CONFIRMED"`.
3. `accountState === "SUSPENDED"` or organizational suspension active.
4. Organization does not support the required incident category.
5. Location is outside the declared service radius from the organization's depot.
6. Capacity is reported as `FULL` with 0 available responders.
7. Active capacity declaration has expired (> 7 days without renewal).
