// Route parity inventory test helper
export const ALL_BACKEND_ROUTES = [
  // Auth (4)
  { method: "POST", path: "/v1/auth/sign-in" },
  { method: "POST", path: "/v1/auth/sign-out" },
  { method: "GET", path: "/v1/auth/session" },
  { method: "POST", path: "/v1/auth/switch-org" },

  // Incidents (5)
  { method: "POST", path: "/v1/incidents/ingest" },
  { method: "GET", path: "/v1/incidents" },
  { method: "GET", path: "/v1/incidents/:publicReference" },
  { method: "POST", path: "/v1/incidents/:publicReference/review" },
  { method: "POST", path: "/v1/incidents/:publicReference/triage" },
  { method: "GET", path: "/v1/evidence/preview/:publicReference/:index" },

  // Cases (7)
  { method: "GET", path: "/v1/cases" },
  { method: "POST", path: "/v1/cases" },
  { method: "GET", path: "/v1/cases/:caseReference" },
  { method: "POST", path: "/v1/cases/:caseReference/resolve" },
  { method: "POST", path: "/v1/cases/:caseReference/match" },
  { method: "POST", path: "/v1/cases/:caseReference/assignments" },
  { method: "POST", path: "/v1/cases/:caseReference/reopen" },
  { method: "POST", path: "/v1/cases/:caseReference/follow-up" },

  // Responders & Assignments (7)
  { method: "GET", path: "/v1/assignments" },
  { method: "GET", path: "/v1/responders/assignments" },
  { method: "POST", path: "/v1/assignments/:assignmentId/accept" },
  { method: "POST", path: "/v1/assignments/:assignmentId/reject" },
  { method: "POST", path: "/v1/assignments/:assignmentId/en-route" },
  { method: "POST", path: "/v1/assignments/:assignmentId/arrived" },
  { method: "POST", path: "/v1/assignments/:assignmentId/interventions" },
  { method: "POST", path: "/v1/assignments/:assignmentId/request-info" },

  // Assistance Engine (15)
  { method: "GET", path: "/v1/assistance/metrics" },
  { method: "POST", path: "/v1/assistance/watchdog/scan" },
  { method: "POST", path: "/v1/assistance/requirements/:requirementId/match" },
  { method: "POST", path: "/v1/assistance/requirements/:requirementId/outreach/first-wave" },
  { method: "POST", path: "/v1/assistance/requirements/:requirementId/escalate" },
  { method: "POST", path: "/v1/assistance/requirements/:requirementId/resolve" },
  { method: "POST", path: "/v1/assistance/outreach/:attemptId/acknowledge" },
  { method: "POST", path: "/v1/assistance/outreach/:attemptId/accept" },
  { method: "POST", path: "/v1/assistance/outreach/:attemptId/reject" },
  { method: "POST", path: "/v1/assistance/assignments/:assignmentId/start-work" },
  { method: "POST", path: "/v1/assistance/assignments/:assignmentId/progress" },
  { method: "POST", path: "/v1/assistance/cases/:caseId/close" },
  { method: "POST", path: "/v1/assistance/cases/:caseId/supplemental" },
  { method: "GET", path: "/v1/assistance/cases/:caseId/events" },
  { method: "GET", path: "/v1/assistance/providers/nearby" },
  { method: "GET", path: "/v1/assistance/queue/overdue" },
  { method: "GET", path: "/v1/assistance/queue/human-review" },

  // NGOs (7)
  { method: "GET", path: "/v1/ngos" },
  { method: "POST", path: "/v1/ngos" },
  { method: "GET", path: "/v1/ngos/:ngoId" },
  { method: "PATCH", path: "/v1/ngos/:ngoId" },
  { method: "POST", path: "/v1/ngos/import" },
  { method: "POST", path: "/v1/ngos/seed-real" },
  { method: "GET", path: "/v1/ngos/matches/:incidentReference" },
  { method: "GET", path: "/v1/ngo/metrics" },

  // Facilities & Geo (2)
  { method: "GET", path: "/v1/facilities" },
  { method: "GET", path: "/v1/geo/pincode" },

  // Discovery (10)
  { method: "GET", path: "/v1/discovery/sources" },
  { method: "POST", path: "/v1/discovery/sources" },
  { method: "POST", path: "/v1/discovery/sources/:sourceId/approve" },
  { method: "POST", path: "/v1/discovery/sources/:sourceId/pause" },
  { method: "GET", path: "/v1/discovery/candidates" },
  { method: "GET", path: "/v1/discovery/candidates/:candidateId" },
  { method: "POST", path: "/v1/discovery/candidates/:candidateId/review" },
  { method: "POST", path: "/v1/discovery/candidates/:candidateId/convert-to-incident" },
  { method: "POST", path: "/v1/discovery/crawl/run" },
  { method: "GET", path: "/v1/discovery/crawl/runs" },
  { method: "GET", path: "/v1/discovery/map" },

  // AI & Context Learning (4)
  { method: "POST", path: "/v1/ai/evaluation" },
  { method: "POST", path: "/v1/context-learning/experiment-a1" },
  { method: "GET", path: "/v1/context-learning/memories" },
  { method: "POST", path: "/v1/context-learning/promote" },

  // Admin & Notifications & Health (5)
  { method: "POST", path: "/v1/admin/organizations/:orgId/verify" },
  { method: "GET", path: "/v1/admin/diagnostics" },
  { method: "POST", path: "/v1/notifications/process" },
  { method: "GET", path: "/health" },
  { method: "GET", path: "/ready" },
];
