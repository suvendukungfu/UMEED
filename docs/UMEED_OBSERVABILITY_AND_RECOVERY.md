# UMEED — Observability, Structured Logging, and Disaster Recovery
**Version**: 2.0.0  
**Classification**: Operational Engineering Standard  

---

## 1. Structured Logging Standards

All application logs are emitted as single-line JSON objects to stdout/stderr:

```json
{
  "level": "info",
  "message": "Outreach wave initiated successfully",
  "context": "OUTREACH_SERVICE",
  "timestamp": "2026-11-01T08:30:00.000Z",
  "metadata": {
    "requirementId": "req_123",
    "attemptsCount": 3,
    "deadline": "2026-11-01T09:00:00.000Z"
  }
}
```

### Logging Rules:
1. **Zero Raw PII**: Beneficiary phone numbers are masked (`+91987***`).
2. **Correlation Context**: Every request context carries a correlation ID (`x-request-id`).
3. **Structured Context Tagging**: Always specify domain context (e.g., `AUTH`, `INGESTION`, `MATCHING`, `OUTREACH`).

---

## 2. Health & Readiness Probe Architecture

Endpoint: `GET /api/health`

### Probes:
- **Liveness**: Process is running, accepting HTTP traffic.
- **Readiness**: MongoDB connection pool active and authenticated.
- **Dependency Checks**:
  - Database (`configured`, `connected`)
  - AI Engine (`configured`, `model: "gemini-2.5-flash"`)
  - Core Assistance Engine (`status: "operational"`)

---

## 3. Backup & Disaster Recovery Runbook

1. **Continuous Backup**: Automated MongoDB Atlas continuous snapshots with point-in-time recovery (PITR).
2. **Recovery Time Objective (RTO)**: < 15 minutes to restore state from Atlas snapshot.
3. **Recovery Point Objective (RPO)**: < 1 minute data loss window via oplog replay.
4. **Disaster Recovery Rehearsal**: Semi-annual restore rehearsals into isolated staging clusters.
