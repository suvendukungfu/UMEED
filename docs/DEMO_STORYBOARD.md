# UMEED Demonstration Storyboard & Synthetic Data Strategy

**System**: UMEED (Closed-Loop Social Distress Assistance Platform)  
**Hackathon**: HackCBS 9.0  
**Context**: Evaluator Demonstration & Closed-Loop Verification  
**Status**: Specification & Demonstration Walkthrough  

> [!IMPORTANT]
> **Synthetic Data Disclosure**: All incidents, citizen reports, NGO profiles, contact numbers, and case histories presented in this storyboard and associated fixtures are **100% synthetic**. They were engineered exclusively for functional software evaluation and contain no real beneficiary identities, phone numbers, or actual rescue statistics.

---

## 1. Demonstration Narrative Overview

The HackCBS 9.0 demonstration showcases why UMEED is fundamentally different from traditional distress report apps:
**Most platforms end at reporting; UMEED guarantees closed-loop accountability and handles multi-cycle recursive care.**

```
┌────────────────────────────────────────────────────────────────────────┐
│                   HACKCBS 9.0 EVALUATION ARC                           │
├─────────────────┬──────────────────┬─────────────────┬─────────────────┤
│    STAGE 1      │     STAGE 2      │     STAGE 3     │     STAGE 4     │
│  Multi-Channel  │ Multimodal Triage│   First-Cycle   │ Recursive Cycle │
│     Intake      │  & Verification  │  Intervention   │  & Resolution   │
├─────────────────┼──────────────────┼─────────────────┼─────────────────┤
│ Citizen submits │ Gemini extracts  │ First-response  │ Secondary NGO   │
│ injured stray   │ trauma, urgency  │ NGO bandages on │ handles surgery │
│ report & GPS    │ & landmarks      │ scene; marks    │ & hospitalization│
│                 │                  │ "Follow-up Req" │ Case verified!  │
└─────────────────┴──────────────────┴─────────────────┴─────────────────┘
```

---

## 2. Three Canonical Synthetic Fixtures

### Fixture 1: Injured Animal Report (Stray Canine Trauma)

- **Fixture ID**: `SYNTH-INCIDENT-2026-001`
- **Subject**: Canine (Stray Dog)
- **Observed Distress**: Compound hind leg fracture, bleeding, unable to move out of oncoming traffic near road divider.
- **Location**: Outer Ring Road, Near Madhuban Chowk Flyover, Pitampura, North West Delhi.
- **Coordinates**: Lat `28.6972`, Lon `77.1350`
- **Initial Urgency**: `critical` (Subject in active traffic hazard)

```json
{
  "schema_version": "1.0.0",
  "source_type": "citizen_report",
  "source_reference": "SYNTH-CITIZEN-REF-001",
  "source_url": null,
  "reported_at": "2026-10-31T09:15:00.000Z",
  "incident_type": "injured_animal",
  "subject_type": "animal",
  "description": "Stray canine lying on road divider near Madhuban Chowk. Bleeding heavily from right hind leg after being hit by a vehicle. Whimpering in extreme pain.",
  "evidence": [
    {
      "type": "image",
      "url": "https://storage.umeed-synthetic.local/fixtures/canine_trauma_01.webp",
      "timestamp": "2026-10-31T09:14:10.000Z",
      "metadata": {
        "is_synthetic": true,
        "simulated_camera": "Mobile 12MP",
        "description": "Synthetic demonstration image of injured stray canine"
      }
    }
  ],
  "location": {
    "latitude": 28.6972,
    "longitude": 77.1350,
    "address": "Outer Ring Road, Pillar 342, Madhuban Chowk, Pitampura",
    "district": "North West Delhi",
    "confidence": 0.96
  },
  "severity": {
    "level": "critical",
    "confidence": 0.94,
    "reasoning": [
      "Subject immobile near heavy vehicular traffic",
      "Open compound fracture visible on limb",
      "Immediate bleeding observed"
    ]
  },
  "freshness": "current_confirmed_by_source",
  "missing_information": [],
  "requires_human_review": true
}
```

---

### Fixture 2: Abandoned Elderly Person Needing Urgent Assistance

- **Fixture ID**: `SYNTH-INCIDENT-2026-002`
- **Subject**: Vulnerable Senior Citizen (~75 years old)
- **Observed Distress**: Severe dehydration, disorientation, hypothermia symptoms in open bus shelter, unable to recall home address.
- **Location**: Bus Shelter near Kashmere Gate Metro Station Gate 3, North Delhi.
- **Coordinates**: Lat `28.6675`, Lon `77.2285`
- **Initial Urgency**: `high`

```json
{
  "schema_version": "1.0.0",
  "source_type": "citizen_report",
  "source_reference": "SYNTH-CITIZEN-REF-002",
  "source_url": null,
  "reported_at": "2026-10-31T11:30:00.000Z",
  "incident_type": "abandoned_elderly_person",
  "subject_type": "person",
  "description": "Elderly gentleman sitting on concrete bench at Kashmere Gate bus shelter for over 24 hours. Appears disoriented, visibly shivering, no warm clothing or food.",
  "evidence": [
    {
      "type": "image",
      "url": "https://storage.umeed-synthetic.local/fixtures/elderly_care_01.webp",
      "timestamp": "2026-10-31T11:28:45.000Z",
      "metadata": {
        "is_synthetic": true,
        "description": "Synthetic demonstration image of disoriented senior citizen"
      }
    }
  ],
  "location": {
    "latitude": 28.6675,
    "longitude": 77.2285,
    "address": "Kashmere Gate Metro Gate 3 Bus Shelter, Lothian Road",
    "district": "North Delhi",
    "confidence": 0.92
  },
  "severity": {
    "level": "high",
    "confidence": 0.89,
    "reasoning": [
      "Vulnerable senior exposed to cold weather",
      "Signs of dehydration and mental disorientation",
      "No guardian or shelter accessible"
    ]
  },
  "freshness": "current_confirmed_by_source",
  "missing_information": ["subject_name", "emergency_contact"],
  "requires_human_review": true
}
```

---

### Fixture 3: Homeless-Person Welfare & Medical Request

- **Fixture ID**: `SYNTH-INCIDENT-2026-003`
- **Subject**: Unhoused Individual
- **Observed Distress**: Severe diabetic foot ulceration requiring medical dressing and clean clothing.
- **Location**: Under Yamuna Bazar Flyover, Central/North Delhi Border.
- **Coordinates**: Lat `28.6590`, Lon `77.2340`
- **Initial Urgency**: `medium`

```json
{
  "schema_version": "1.0.0",
  "source_type": "social_media_discovery",
  "source_reference": "SYNTH-SOCIAL-POST-9912",
  "source_url": "https://social-sim.umeed.local/posts/9912",
  "reported_at": "2026-10-31T13:00:00.000Z",
  "incident_type": "medical_assistance",
  "subject_type": "person",
  "description": "Unhoused individual near Yamuna Bazar requires wound dressing for an infected foot lesion and clean bedding. Subject is conscious and requesting medical help.",
  "evidence": [
    {
      "type": "image",
      "url": "https://storage.umeed-synthetic.local/fixtures/homeless_welfare_01.webp",
      "timestamp": "2026-10-31T12:45:00.000Z",
      "metadata": {
        "is_synthetic": true,
        "description": "Synthetic demonstration image of infected foot lesion"
      }
    }
  ],
  "location": {
    "latitude": 28.6590,
    "longitude": 77.2340,
    "address": "Pillar 12, Yamuna Bazar Flyover, Ring Road",
    "district": "Central Delhi",
    "confidence": 0.88
  },
  "severity": {
    "level": "medium",
    "confidence": 0.85,
    "reasoning": [
      "Chronic infected wound requiring antiseptic dressing",
      "Subject sheltered under bridge, non-immediate life threat"
    ]
  },
  "freshness": "potentially_recent",
  "missing_information": ["exact_name"],
  "requires_human_review": true
}
```

---

## 3. The Two-Cycle Recursive Assistance Demonstration

Here is the complete step-by-step evaluator walkthrough illustrating UMEED's hallmark capability: **Recursive Assistance Loops**.

### Cycle 1: First-Aid Triage & On-Scene Stabilization

1. **Intake**: Bystander submits Fixture 1 (Canine compound fracture in Pitampura). Tracking code `UMD-CAN-7101` issued.
2. **Coordinator Verification**: Coordinator reviews Gemini triage output (`critical`, bleeding, traffic hazard). Approves case.
3. **Capability-Aware Matching**:
   - Matching Engine queries registered NGOs in North West Delhi.
   - **NGO 1**: *"Jan Seva Animal Emergency Ambulance [Synthetic]"* (Capabilities: `animal_rescue`, `first_aid`, `field_ambulance`; Distance: 1.8 km; Status: `available`). Match Score: **0.94**.
   - Coordinator assigns case to NGO 1.
4. **Field Response**:
   - NGO 1 accepts assignment, marks `En Route` (10:02 AM), marks `Arrived on Scene` (10:14 AM).
   - Responder moves dog out of traffic, administers analgesic pain relief, applies tourniquet and antiseptic splint dressing.
5. **Partial Outcome & Follow-Up Requirement**:
   - Responder logs into portal at 10:28 AM.
   - Selects: *"Primary Intervention Delivered: Field Splinting & Pain Management"*.
   - **Crucial Decision**: The responder toggles:
     `[x] Follow-Up Required: Advanced Inpatient Surgery & Orthopaedic Pinning`.
   - Notes: *"Fracture is unstable. Canine requires X-ray and surgical pin placement. Field ambulance does not have an operating theatre."*
   - Uploads photo of splinted dog.
   - Submits record. State transitions to: `FOLLOW_UP_REQUIRED`.

### Cycle 2: Secondary Matching & Specialized Hospitalization

6. **Recursive Loop Initiation**:
   - The UMEED engine detects `FOLLOW_UP_REQUIRED` and automatically generates Secondary Assistance Cycle #2.
   - The matching criteria dynamically adjust:
     - **Disqualified**: First-aid responders and field ambulances (already completed).
     - **Required Capability**: `veterinary_surgery` + `inpatient_shelter`.
     - **Excluded**: NGO 1 (to free their ambulance for new field emergencies).
2. **Secondary NGO Matching**:
   - **NGO 2**: *"Delhi Veterinary Surgical Trust & Shelter [Synthetic]"* (Capabilities: `veterinary_surgery`, `inpatient_rehabilitation`; Distance: 4.2 km; Operating Theatre: `Available`). Match Score: **0.91**.
   - Coordinator confirms secondary dispatch. State advances to: `MATCHING` → `RESPONDERS_CONTACTED` (Cycle 2).
3. **Surgery & Final Resolution**:
   - NGO 2 accepts and dispatches hospital transport.
   - Canine is admitted to animal hospital, receives surgical pinning, and enters recovery kennel.
   - NGO 2 uploads post-op verification photo and marks: `[x] Case Fully Resolved`.
4. **Closed-Loop Audit**:
   - Case advances to `RESOLVED`.
   - Immutable audit trail records both cycles:
     - Cycle 1: Citizen Report → Coordinator → NGO 1 (First Aid) → Follow-up Triggered.
     - Cycle 2: Secondary Matching → NGO 2 (Surgery) → Hospitalization → Final Verified Closure.
   - Citizen enters `UMD-CAN-7101` on tracker and sees: *"Your reported distress has been fully resolved. The dog has received emergency surgery and is safely rehabilitating at Delhi Veterinary Surgical Trust [Synthetic]."*
